const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const EmployeeCV = require('../models/EmployeeCV');
const nvidiaLLM = require('./nvidiaLLMService');

/**
 * ============================================================================
 * AI SPRINT ARCHITECT SERVICE (IDEA → FULL GENERATION)
 * ============================================================================
 * Automates building a project from scratch:
 * 1. Takes a "Project Idea" and "Team Type"
 * 2. Scans all available parsed CVs in the company
 * 3. AI generates the necessary Tasks, Clusters Teams (nodes), and Assigns Tasks
 * 4. Saves as a Draft Sprint
 * 5. On Approval, creates the Project, Tasks, and goes live with Reminders.
 */

class AISprintArchitectService {

    /**
     * Generate a Draft Sprint from a raw Idea
     */
    static async generateSprintFromIdea(sprintName, projectIdea, teamType, dateRange, intervalsDays) {
        try {
            console.log(`🤖 [AI Architect] Designing new sprint from idea: "${sprintName}"`);

            // 1. Fetch available workforce (All users with parsed CVs or default profiles)
            const employees = await this._getAllAvailableEmployees();

            if (employees.length === 0) {
                throw new Error("No employee profiles found in the system. Please add users and upload CVs first.");
            }

            // 2. Format Context and Prompt
            const systemPrompt = this._buildIdeaArchitectPrompt(teamType);
            const userMessage = this._buildIdeaUserData(employees, projectIdea);

            console.log(`🧠 [AI Architect] Deconstructing Idea and matching against ${employees.length} engineers...`);

            // 3. Call NVIDIA NIM
            const llmResponse = await nvidiaLLM.chat(systemPrompt, userMessage, {
                temperature: 0.3, // Slightly higher temp for creative task generation
                max_tokens: 4000
            });

            // 4. Parse and validate JSON
            const sprintPlanData = this._parseLLMResponse(llmResponse);

            // 5. Build the AI Plan Structure
            console.log('🔗 [AI Architect] Preparing Database Draft...');
            const mappedNodes = await this._mapIdeaPlanToNodes(sprintPlanData, employees);

            // 6. Create Draft Sprint
            const draftSprint = new Sprint({
                name: sprintName || 'AI Generated Sprint',
                goal: projectIdea,
                status: 'draft',
                // Project isn't created yet; we only link upon approval
                aiPlan: {
                    projectIdea,
                    teamType,
                    technicalNodes: mappedNodes,
                    reasoning: sprintPlanData.reasoning,
                    generatedAt: new Date()
                },
                reminderSettings: {
                    enabled: true,
                    intervalsDays: intervalsDays || [5, 2, 1]
                }
            });

            await draftSprint.save();

            console.log(`✅ [AI Architect] Idea Draft created successfully! ID: ${draftSprint._id}`);
            return draftSprint;

        } catch (error) {
            console.error('❌ [AI Architect] Error generating sprint from idea:', error);
            throw error;
        }
    }

    static async _getAllAvailableEmployees() {
        const users = await User.find({ isActive: true });
        const cvs = await EmployeeCV.find({ status: 'parsed' }).populate('user');

        return users.map(u => {
            const cv = cvs.find(c => c.user && c.user._id.toString() === u._id.toString());
            return {
                _id: u._id,
                fullName: u.fullName,
                role: u.role,
                skills: cv ? cv.extractedData?.skills : (u.profileInfo?.skills || []),
                primaryDomain: cv ? cv.extractedData?.primaryDomain : 'unknown',
                experienceYears: cv ? cv.extractedData?.totalYearsExperience : 0,
                capacityHours: u.profileInfo?.capacityHoursPerSprint || 40
            };
        });
    }

    static _buildIdeaArchitectPrompt(teamType) {
        return `You are an elite AI Engineering Manager & Architect. 
Your objective: Take a high-level "Project Idea", breakdown the exact technical Tasks required to build it, and form an optimal team from the provided roster of employees.

Constraints & Rules:
1. Analyze the Project Idea and the requested Team Type ("${teamType}").
2. GENERATE TASKS: Break the idea down into 5 to 10 logical, specific tasks.
3. FORM NODES: Group the best-fitting employees into "Technical Nodes" (e.g. "Backend Setup", "UI/UX", "Marketing & Growth" depending on teamType). Do NOT include employees whose skills do not match the required tasks.
4. ASSIGN TASKS: Assign EVERY generated task to ONE specific employee from the nodes based on a strong skill match.

Use this EXACT JSON schema (only output valid JSON):

{
  "reasoning": "A 1-paragraph summary explaining your strategy, task breakdown, and why you formed the nodes this way.",
  "technicalNodes": [
    {
      "name": "Node Name (e.g., 'Core Backend')",
      "focusArea": "What this sub-team builds",
      "members": [
        {
          "employeeName": "Exact Full Name of the employee from the roster",
          "tasks": [
            {
              "title": "Clear task title",
              "description": "Short 1 sentence description of what to do",
              "priority": "high", 
              "estimatedTime": 8,
              "requiredSkills": ["Node.js", "MongoDB"],
              "reasoning": "Why this specific person gets this task based on their CV"
            }
          ]
        }
      ]
    }
  ]
}`;
    }

    static _buildIdeaUserData(employees, projectIdea) {
        const employeesString = employees.map(e =>
            `- ${e.fullName} | Role: ${e.role} | Exp: ${e.experienceYears}y | Cap: ${e.capacityHours}h | Skills: ${(e.skills || []).join(', ')}`
        ).join('\n');

        return `RAW PROJECT IDEA:
"${projectIdea}"

AVAILABLE COMPANY ROSTER:
${employeesString}

Break down the idea into tasks, form nodes from the best members, and assign them in JSON format.`;
    }

    static _parseLLMResponse(llmResponse) {
        try {
            // Robust extraction: isolate the first `{` and last `}` 
            // Llama 3 is sometimes chatty even when told to output ONLY JSON.
            const firstBrace = llmResponse.indexOf('{');
            const lastBrace = llmResponse.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonStr = llmResponse.substring(firstBrace, lastBrace + 1);
                return JSON.parse(jsonStr);
            }

            // Fallback for array-based or perfectly clean JSON
            const cleaned = llmResponse
                .replace(/```json\n?/gi, '')
                .replace(/```\n?/g, '')
                .trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('LLM JSON Parsing failed. Raw response:', llmResponse);
            throw new Error('Failed to parse the LLM sprint plan (invalid JSON format).');
        }
    }

    static async _mapIdeaPlanToNodes(plan, employees) {
        const technicalNodes = [];

        for (const node of plan.technicalNodes) {
            const memberIdsForNode = [];
            const taskRefsForNode = [];

            for (const member of node.members) {
                const user = employees.find(e => e.fullName === member.employeeName);
                if (!user) continue;

                if (!memberIdsForNode.includes(user._id)) {
                    memberIdsForNode.push(user._id);
                }

                for (const t of member.tasks) {
                    // Compute a dynamic fit score just to show in UI
                    let fitScore = 0.5; // default fallback
                    if (user.skills && t.requiredSkills) {
                        const overlap = t.requiredSkills.filter(reqSkill =>
                            user.skills.some(userSkill => userSkill.toLowerCase().includes(reqSkill.toLowerCase()))
                        ).length;
                        fitScore = t.requiredSkills.length > 0 ? (overlap / t.requiredSkills.length) : 0.8;
                        // cap at 0.95 for realism
                        fitScore = Math.min(fitScore + 0.2, 0.95);
                    }

                    taskRefsForNode.push({
                        title: t.title,
                        description: t.description,
                        priority: t.priority || 'medium',
                        estimatedTime: t.estimatedTime || 4,
                        requiredSkills: t.requiredSkills || [],
                        assignedTo: user._id,
                        fitScore: fitScore,
                        aiReasoning: t.reasoning
                    });
                }
            }

            technicalNodes.push({
                name: node.name,
                focusArea: node.focusArea,
                members: memberIdsForNode,
                tasks: taskRefsForNode
            });
        }

        return technicalNodes;
    }

    /**
     * Approves a Draft Sprint
     * 1. Creates a NEW Project based on the Sprint Name/Idea
     * 2. Creates the actual Task documents
     * 3. Changes Sprint status from draft -> active, attaches Project & Tasks
     */
    static async approveSprintFromIdea(sprintId, managerId) {
        const sprint = await Sprint.findById(sprintId);
        if (!sprint || sprint.status !== 'draft') {
            throw new Error('Invalid sprint or not in draft status.');
        }

        console.log(`✅ [AI Architect] Approving and Materializing Idea Sprint: ${sprintId}`);

        // 1. Gather all unique users included in this sprint
        const uniqueMemberIds = new Set();
        const aiPlan = sprint.aiPlan;

        if (aiPlan?.technicalNodes) {
            aiPlan.technicalNodes.forEach(node => {
                node.members.forEach(mId => uniqueMemberIds.add(mId.toString()));
            });
        }

        // Always include the manager
        uniqueMemberIds.add(managerId.toString());

        // 2. Generate a clean, unique project key (must be 2-10 chars)
        const cleanName = sprint.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const words = cleanName.split(/\s+/).filter(Boolean);
        let rawKey;
        if (words.length >= 2) {
            // Multi-word: use initials (e.g., "Task Master" → "TM")
            rawKey = words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
        } else {
            // Single-word: use first 4 chars (e.g., "ATOMBOMB" → "ATOM")
            rawKey = (words[0] || 'AIPR').toUpperCase().substring(0, 4);
        }
        // Ensure minimum 2 chars
        if (rawKey.length < 2) rawKey = rawKey + 'X';
        let projectKey = rawKey;
        const existingProject = await Project.findOne({ key: projectKey });
        if (existingProject) {
            projectKey = projectKey.substring(0, 3) + Math.floor(Math.random() * 900 + 100);
        }

        // 3. Create Project with all fields needed for Reallocation + Reminders
        const newProject = await Project.create({
            name: sprint.name,
            key: projectKey,
            description: aiPlan.projectIdea,
            lead: managerId,
            defaultAssignee: managerId,
            projectType: 'scrum',
            members: Array.from(uniqueMemberIds).map(id => id),
            nextIssueNumber: 1
        });

        console.log(`📦 [AI Architect] Project created: ${newProject.name} (${newProject.key})`);

        // 4. Calculate sprint end date for task due dates
        const sprintEndDate = sprint.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // default 2 weeks

        // 5. Materialize Tasks
        const createdTaskIds = [];
        let issueCounter = 1;

        if (aiPlan.technicalNodes) {
            for (let node of aiPlan.technicalNodes) {
                if (node.tasks) {
                    for (let tData of node.tasks) {
                        if (!tData.title) continue;

                        const storyPoints = Math.max(1, Math.ceil((tData.estimatedTime || 4) / 2));

                        const newTask = await Task.create({
                            title: tData.title,
                            description: tData.description,
                            project: newProject._id,
                            sprint: sprint._id,
                            key: `${projectKey}-${issueCounter}`, 
                            issueType: tData.type?.toLowerCase() || 'task',
                            priority: tData.priority || 'medium',
                            estimatedTime: tData.estimatedTime || 4,
                            storyPoints: storyPoints, // Added storyPoints back
                            tags: tData.requiredSkills || [], // Changed requiredSkills to tags
                            assignedTo: tData.assignedTo ? [tData.assignedTo] : [], // Safely cast to array
                            assignedBy: managerId, // Added back
                            reporter: managerId, // Added back
                            status: 'todo', // Added back
                            dueDate: sprintEndDate, // Added back
                            fitScore: tData.fitScore,
                            aiReasoning: tData.aiReasoning || tData.reasoning,
                            history: [] // Initialize history as empty array
                        });

                        // Add history for initial AI assignment
                        newTask.history.push({
                            field: 'assignedTo',
                            newValue: tData.assignedTo ? (typeof tData.assignedTo === 'object' ? tData.assignedTo.toString() : tData.assignedTo) : 'Unassigned',
                            updatedBy: managerId,
                            reason: 'AI Sprint Architect Auto-Generation',
                            timestamp: new Date()
                        });
                        await newTask.save(); // Save the task after pushing history

                        createdTaskIds.push(newTask._id);
                        
                        // We do NOT need to set tData.task because the schema for Sprint -> aiPlan -> tasks 
                        // DOES NOT have a `task` field anymore based on Sprint.js.
                        // The tasks are linked via the Sprint.tasks array.
                        
                        issueCounter++;
                    }
                }
            }
        }

        // 6. Update project's issue counter
        newProject.nextIssueNumber = issueCounter;
        await newProject.save();

        // 7. Finalize Sprint
        sprint.project = newProject._id;
        sprint.tasks = createdTaskIds;
        sprint.status = 'active';
        sprint.startDate = sprint.startDate || new Date();
        sprint.endDate = sprintEndDate;
        sprint.aiPlan.approvedBy = managerId;
        sprint.aiPlan.approvedAt = new Date();

        sprint.markModified('aiPlan');
        await sprint.save();

        console.log(`🚀 [AI Architect] Sprint approved! ${createdTaskIds.length} tasks with keys ${projectKey}-1 to ${projectKey}-${issueCounter - 1}`);
        return sprint;
    }
}

module.exports = AISprintArchitectService;
