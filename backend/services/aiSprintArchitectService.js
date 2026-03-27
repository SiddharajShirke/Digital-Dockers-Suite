const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const EmployeeCV = require('../models/EmployeeCV');
const nvidiaLLM = require('./nvidiaLLMService');

/**
 * ============================================================================
 * AI SPRINT ARCHITECT SERVICE (V4 - MULTI-SPRINT GEN)
 * ============================================================================
 * Automates building a project lifecycle from scratch:
 * 1. Takes a "Project Vision" and "Team Types"
 * 2. Scans all available parsed CVs in the company
 * 3. AI generates MULTIPLE SPINTS, clusters teams, and assigns tasks
 * 4. Saves as separate Draft Sprints
 * 5. On Approval, creates the Project (if new) and live Tasks.
 */

class AISprintArchitectService {

    /**
     * Generate Draft Sprints from a raw Idea
     */
    static async generateSprintFromIdea(projectName, projectIdea, teamTypes, dateRange, intervalsDays) {
        try {
            console.log(`🤖 [AI Architect] Designing multi-sprint plan for Project: "${projectName}"`);

            // 1. Fetch available workforce
            const employees = await this._getAllAvailableEmployees();

            if (employees.length === 0) {
                throw new Error("No employee profiles found in the system. Please add users and upload CVs first.");
            }

            // 2. Format Context and Prompt
            const teamTypesStr = Array.isArray(teamTypes) ? teamTypes.join(', ') : (teamTypes || 'Technical / Full Stack');
            const systemPrompt = this._buildIdeaArchitectPrompt(teamTypesStr);
            const userMessage = this._buildIdeaUserData(employees, projectIdea, projectName);

            console.log(`🧠 [AI Architect] Deconstructing vision across ${employees.length} engineers for ${teamTypesStr} domains...`);

            // 3. Call NVIDIA NIM
            const llmResponse = await nvidiaLLM.chat(systemPrompt, userMessage, {
                temperature: 0.3, 
                max_tokens: 4096
            });

            // 4. Parse JSON
            const result = this._parseLLMResponse(llmResponse);
            const sprintPlans = result.sprints || [];

            console.log(`🔗 [AI Architect] Preparing ${sprintPlans.length} Database Draft Sprints...`);

            const createdSprints = [];

            // 5. Build Sprints
            for (let i = 0; i < sprintPlans.length; i++) {
                const planData = sprintPlans[i];
                const mappedNodes = await this._mapIdeaPlanToNodes(planData, employees);

                // Create Draft Sprint
                const draftSprint = new Sprint({
                    name: planData.name || `${projectName} - Phase ${i + 1}`,
                    goal: projectIdea,
                    status: 'draft',
                    aiPlan: {
                        projectName,
                        projectIdea,
                        teamType: teamTypesStr,
                        technicalNodes: mappedNodes,
                        reasoning: planData.reasoning,
                        generatedAt: new Date()
                    },
                    reminderSettings: {
                        enabled: true,
                        intervalsDays: intervalsDays || [5, 2, 1]
                    }
                });

                await draftSprint.save();
                createdSprints.push(draftSprint);
            }

            console.log(`✅ [AI Architect] ${createdSprints.length} Draft Sprints created!`);
            return createdSprints;

        } catch (error) {
            console.error('❌ [AI Architect] Error in multi-sprint generation:', error);
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

    static _buildIdeaArchitectPrompt(teamTypes) {
        return `You are an elite AI Engineering Manager & Architect. 
Your objective: Take a "Project Vision" and break it down into an end-to-end lifecycle of MULTIPLE SPRINTS (usually 2-4).
Target Disciplines: ${teamTypes}.

Rules:
1. SPAN THE LIFECYCLE: Create logical Phases (Sprints).
2. UNIQUE NAMES: Give each sprint a distinct name (e.g. "Phase 1: API Foundation").
3. TASKS: 4-8 specific tasks per sprint.
4. NODES: Group employees by focus area.
5. ASSIGN: Match tasks to people by skills.

Output EXCLUSIVELY this JSON structure:
{
  "projectReasoning": "Strategy summary",
  "sprints": [
    {
      "name": "Sprint Name",
      "reasoning": "Sprint strategy",
      "technicalNodes": [
        {
          "name": "Node Name",
          "focusArea": "Focus",
          "members": [
            {
              "employeeName": "Exact Name",
              "tasks": [
                {
                  "title": "Task title",
                  "description": "Desc",
                  "priority": "high", 
                  "estimatedTime": 8,
                  "requiredSkills": ["A", "B"],
                  "specializationReasoning": "Explicit reason why this person's CV/Resume specialization makes them the perfect fit for this specific task."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;
    }

    static _buildIdeaUserData(employees, projectIdea, projectName) {
        const roster = employees.map(e =>
            `- ${e.fullName} | Role: ${e.role} | Skills: ${(e.skills || []).slice(0, 10).join(', ')}`
        ).join('\n');

        return `PROJECT: "${projectName}"\ VISION: "${projectIdea}"\n\nROSTER (Based on CV/Resume Parsed Data):\n${roster}\n\nGenerate multiple sprints in JSON. Focus heavily on 'specializationReasoning' for each assignment based on the roster skills.`;
    }

    static _parseLLMResponse(llmResponse) {
        try {
            const firstBrace = llmResponse.indexOf('{');
            const lastBrace = llmResponse.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                return JSON.parse(llmResponse.substring(firstBrace, lastBrace + 1));
            }
            return JSON.parse(llmResponse.trim());
        } catch (error) {
            console.error('LLM Parsing Error:', llmResponse);
            throw new Error('Invalid AI response format.');
        }
    }

    static async _mapIdeaPlanToNodes(plan, employees) {
        const nodes = [];
        for (const node of plan.technicalNodes) {
            const memberIds = [];
            const taskRefs = [];
            for (const member of node.members) {
                const user = employees.find(e => e.fullName === member.employeeName);
                if (!user) continue;
                if (!memberIds.includes(user._id)) memberIds.push(user._id);

                for (const t of member.tasks) {
                    taskRefs.push({
                        title: t.title,
                        description: t.description,
                        priority: t.priority || 'medium',
                        estimatedTime: t.estimatedTime || 4,
                        requiredSkills: t.requiredSkills || [],
                        assignedTo: user._id,
                        assigneeName: user.fullName,
                        fitScore: 0.85,
                        specializationMatch: t.specializationReasoning || t.reasoning
                    });
                }
            }
            nodes.push({ name: node.name, focusArea: node.focusArea, members: memberIds, tasks: taskRefs });
        }
        return nodes;
    }

    static async approveSprintFromIdea(sprintId, managerId) {
        const sprint = await Sprint.findById(sprintId);
        if (!sprint || sprint.status !== 'draft') throw new Error('Invalid draft sprint.');

        const aiPlan = sprint.aiPlan;
        const uniqueMemberIds = new Set([managerId.toString()]);
        (aiPlan.technicalNodes || []).forEach(n => n.members.forEach(mId => uniqueMemberIds.add(mId.toString())));

        // Determine Project
        const targetProjectName = aiPlan.projectName || sprint.name;
        let project = await Project.findOne({
            $or: [
                { name: targetProjectName },
                { description: aiPlan.projectIdea }
            ]
        });

        if (!project) {
            const cleanName = sprint.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            let pKey = cleanName.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().substring(0, 4);
            if (pKey.length < 2) pKey += 'X';
            
            // Ensure uniqueness
            let uniqueKey = pKey;
            let counter = 1;
            while (await Project.exists({ key: uniqueKey })) {
                uniqueKey = `${pKey.substring(0, 3)}${counter}`;
                counter++;
            }
            
            project = await Project.create({
                name: targetProjectName,
                key: uniqueKey,
                description: aiPlan.projectIdea,
                lead: managerId,
                defaultAssignee: managerId,
                members: Array.from(uniqueMemberIds),
                nextIssueNumber: 1
            });
        } else {
            const existingMemberIds = project.members.map(m => m.toString());
            uniqueMemberIds.forEach(mId => {
                if (!existingMemberIds.includes(mId.toString())) {
                    project.members.push(mId);
                }
            });
            await project.save();
        }

        // Materialize Tasks
        const taskIds = [];
        let curCount = project.nextIssueNumber;
        const endDate = sprint.endDate || new Date(Date.now() + 1209600000);

        for (const node of (aiPlan.technicalNodes || [])) {
            for (const t of (node.tasks || [])) {
                const newTask = await Task.create({
                    title: t.title,
                    description: t.description,
                    project: project._id,
                    sprint: sprint._id,
                    key: `${project.key}-${curCount}`,
                    priority: t.priority || 'medium',
                    estimatedTime: t.estimatedTime || 4,
                    storyPoints: Math.ceil(t.estimatedTime / 4),
                    tags: t.requiredSkills || [],
                    assignedTo: t.assignedTo ? [t.assignedTo] : [],
                    reporter: managerId,
                    status: 'todo',
                    dueDate: endDate,
                    fitScore: t.fitScore,
                    specializationMatch: t.specializationMatch || t.aiReasoning
                });
                taskIds.push(newTask._id);
                curCount++;
            }
        }

        project.nextIssueNumber = curCount;
        await project.save();

        sprint.project = project._id;
        sprint.tasks = taskIds;
        sprint.status = 'active';
        sprint.startDate = new Date();
        sprint.endDate = endDate;
        sprint.aiPlan.approvedBy = managerId;
        sprint.aiPlan.approvedAt = new Date();
        await sprint.save();

        return sprint;
    }

    /**
     * ══════════════════════════════════════════════════════════
     * UNIFIED REALLOCATION — Step 1: All Projects Overview
     * ══════════════════════════════════════════════════════════
     */
    static async getAllProjectsOverview() {
        const projects = await Project.find({}).sort({ createdAt: -1 });
        const now = new Date();

        const overview = await Promise.all(projects.map(async (project) => {
            const sprints = await Sprint.find({ project: project._id });

            const sprintDetails = await Promise.all(sprints.map(async (sprint) => {
                const tasks = await Task.find({ sprint: sprint._id });
                const done = tasks.filter(t => t.status === 'done').length;
                const remaining = tasks.length - done;
                const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
                const donePoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
                const daysRemaining = sprint.endDate
                    ? Math.ceil((new Date(sprint.endDate) - now) / (1000 * 60 * 60 * 24))
                    : null;

                return {
                    _id: sprint._id,
                    name: sprint.name,
                    status: sprint.status,
                    startDate: sprint.startDate,
                    endDate: sprint.endDate,
                    daysRemaining,
                    taskTotal: tasks.length,
                    taskDone: done,
                    taskRemaining: remaining,
                    totalPoints,
                    donePoints
                };
            }));

            return {
                _id: project._id,
                name: project.name,
                key: project.key,
                description: project.description,
                sprints: sprintDetails
            };
        }));

        return overview;
    }

    /**
     * ══════════════════════════════════════════════════════════
     * UNIFIED REALLOCATION — Step 2: Generate AI Proposal
     * ══════════════════════════════════════════════════════════
     */
    static async generateUnifiedReallocation(projectId, sprintId) {
        const project = await Project.findById(projectId);
        if (!project) throw new Error('Project not found');

        let sprints = [];
        if (sprintId) {
            const sp = await Sprint.findById(sprintId);
            if (sp) sprints = [sp];
        } else {
            sprints = await Sprint.find({ project: projectId });
        }

        const employees = await this._getAllAvailableEmployees();
        const now = new Date();
        const taskContextBySprint = [];

        for (const sprint of sprints) {
            const tasks = await Task.find({ sprint: sprint._id }).populate('assignedTo', 'fullName');
            const daysRemaining = sprint.endDate
                ? Math.ceil((new Date(sprint.endDate) - now) / (1000 * 60 * 60 * 24))
                : 'unknown';

            taskContextBySprint.push({
                sprintId: sprint._id,
                sprintName: sprint.name,
                sprintStatus: sprint.status,
                dueDate: sprint.endDate,
                daysRemaining,
                tasks: tasks.map(t => ({
                    taskId: t._id.toString(), // Consistent key
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    issueType: t.issueType,
                    storyPoints: t.storyPoints || 0,
                    estimatedTime: t.estimatedTime || 0,
                    assignee: t.assignedTo?.[0]?.fullName || 'Unassigned',
                    assigneeId: t.assignedTo?.[0]?._id ? t.assignedTo[0]._id.toString() : null
                }))
            });
        }

        const systemPrompt = `You are an elite Senior Engineering Manager and Sprint Optimizer.
Analyze the project sprints, their tasks, and the employee roster (from CVs/Resumes).
Your goal: produce a comprehensive optimization plan for ALL tasks in the scope (excluding DONE).

OPTIMIZATION GOALS:
1. LOAD BALANCING: If an engineer has too many high-priority tasks, move some to available peers.
2. SKILL MATCHING: If a task's required skills matched better with another engineer's CV skills, REALLOCATE it.
3. DEADLINE SAFETY: Ensure tasks are assigned to engineers with the capacity to meet the due date.

CRITICAL: 
1. Use the EXACT literal hex string taskId provided in the input. 
2. Use the EXACT literal hex string newAssigneeId from the roster.
3. If no change is needed, still return the entry with the original IDs.
4. DO NOT be conservative; if you see a better fit or a workload imbalance, ACT on it.

Output EXCLUSIVELY this JSON, no markdown, no explanation:
{
  "globalStrategy": "Overall optimization summary focusing on efficiency and balance",
  "reallocations": [
    {
      "taskId": "hex_id_from_input",
      "taskTitle": "Task title",
      "sprintId": "sprint_id",
      "sprintName": "Sprint name",
      "priority": "high/medium/low",
      "taskLevel": "task",
      "previousAssignee": "Old name or Unassigned",
      "previousAssigneeId": "hex_id or null",
      "newAssignee": "Exact name from roster or current team",
      "newAssigneeId": "hex_id_from_roster",
      "estimatedHours": 8,
      "newDueDate": "ISO date",
      "reasoning": "Explicit reason why this change (or keeping it) is optimal for the project."
    }
  ]
}`;

        const userMessage = `PROJECT: "${project.name}"
GOAL: "${project.description || 'Deliver successfully'}"

SPRINTS AND TASKS:
${JSON.stringify(taskContextBySprint, null, 2)}

FULL EMPLOYEE ROSTER (skills from CVs):
${JSON.stringify(employees.map(e => ({
    id: e._id,
    name: e.fullName,
    role: e.role,
    skills: (e.skills || []).slice(0, 12),
    domain: e.primaryDomain,
    experienceYears: e.experienceYears,
    capacityHours: e.capacityHours
})), null, 2)}

Generate the unified reallocation JSON.`;

        const llmResponse = await nvidiaLLM.chat(systemPrompt, userMessage, {
            temperature: 0.4,
            max_tokens: 4096
        });

        console.log(`📡 [AI Architect] Raw Reallocation Response received. Length: ${llmResponse.length}`);
        // Log a sample for debugging
        console.log(`📄 [AI Architect] Sample Response: ${llmResponse.substring(0, 500)}...`);

        const result = this._parseLLMResponse(llmResponse);
        return {
            projectId,
            projectName: project.name,
            sprintScope: sprintId ? 'single' : 'all',
            ...result
        };
    }

    /**
     * ══════════════════════════════════════════════════════════
     * UNIFIED REALLOCATION — Step 3: Execute
     * ══════════════════════════════════════════════════════════
     */
    static async executeReallocation(reallocations) {
        console.log(`🚀 [AI Architect] Executing Unified Reallocation for ${reallocations.length} items...`);
        const updatedTasks = [];
        const sprintMemberMap = {};

        for (const item of reallocations) {
            const actualTaskId = item.taskId || item.id; // Support both naming variants 
            
            if (!actualTaskId) {
                console.warn('⚠️ [AI Architect] Missing taskId/id in reallocation item:', item);
                continue;
            }
            
            const task = await Task.findById(actualTaskId);
            if (!task) {
                console.warn(`⚠️ [AI Architect] Task not found for ID: ${item.taskId}`);
                continue;
            }
            if (task.status === 'done') {
                console.log(`⏩ [AI Architect] Skipping DONE task: ${task.title}`);
                continue;
            }

            console.log(`📍 [AI Architect] Reallocating Task: ${task.title} (${task.key})`);

            // Update Assignee
            if (item.newAssigneeId) {
                try {
                    const newId = new mongoose.Types.ObjectId(item.newAssigneeId);
                    task.assignedTo = [newId];
                    // Note: assigneeName is not in schema but we can track specialization
                    console.log(`   └─> New Assignee: ${item.newAssignee} (${item.newAssigneeId})`);
                    
                    if (item.sprintId) {
                        if (!sprintMemberMap[item.sprintId]) sprintMemberMap[item.sprintId] = new Set();
                        sprintMemberMap[item.sprintId].add(item.newAssigneeId.toString());
                    }
                } catch (castError) {
                    console.error(`❌ [AI Architect] Invalid newAssigneeId format: ${item.newAssigneeId}`);
                }
            }

            // Update Estimates
            if (item.estimatedHours) {
                task.storyPoints = Math.ceil(item.estimatedHours / 4);
                task.estimatedTime = item.estimatedHours;
            }

            // Update Due Date
            if (item.newDueDate) {
                task.dueDate = new Date(item.newDueDate);
            }

            // Update Priority
            if (item.priority) {
                task.priority = item.priority.toLowerCase();
            }

            task.specializationMatch = `[Unified Reallocation] ${item.reasoning}`;
            
            try {
                await task.save();
                updatedTasks.push(task);
                console.log(`   ✅ [AI Architect] Saved ${task.key}`);
            } catch (saveError) {
                console.error(`❌ [AI Architect] Failed to save task ${task.key}:`, saveError.message);
            }
        }

        // Update sprint membership for newly added members
        for (const [sprintId, memberSet] of Object.entries(sprintMemberMap)) {
            const sprint = await Sprint.findById(sprintId);
            if (!sprint) continue;
            const existingMembers = (sprint.aiPlan?.technicalNodes || [])
                .flatMap(n => (n.members || []).map(m => m.toString()));
            for (const memberId of memberSet) {
                if (!existingMembers.includes(memberId) && sprint.aiPlan?.technicalNodes?.length > 0) {
                    sprint.aiPlan.technicalNodes[0].members.push(memberId);
                }
            }
            await sprint.save();
        }

        return updatedTasks;
    }
}

module.exports = AISprintArchitectService;
