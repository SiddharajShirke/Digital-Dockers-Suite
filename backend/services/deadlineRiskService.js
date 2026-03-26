const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const EmployeeCV = require('../models/EmployeeCV');
const nvidiaLLM = require('./nvidiaLLMService');

/**
 * ============================================================================
 * DEADLINE RISK SERVICE (PHASE 3)
 * ============================================================================
 * Detects tasks at risk of missing deadlines and uses NVIDIA NIM to propose
 * re-allocations to other engineers with available capacity and the right skills.
 */

class DeadlineRiskService {

    /**
     * Scan a sprint or project for tasks at risk of missing deadlines.
     * Criteria: Due within 48 hours AND not 'done'.
     * @param {string} projectId 
     * @returns {Array} List of at-risk tasks
     */
    static async getAtRiskTasks(projectId) {
        const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);

        const tasks = await Task.find({
            project: projectId,
            status: { $ne: 'done' },
            dueDate: { 
                $exists: true, 
                $lte: fortyEightHoursFromNow 
            }
        }).populate('assignedTo', 'fullName email')
          .sort('dueDate');

        return tasks;
    }

    /**
     * Generate a Re-allocation Proposal for a specific at-risk task.
     * Uses NVIDIA NIM to find the best alternative assignee.
     * @param {string} taskId
     * @returns {Object} { before (current state), after (proposed state), aiReasoning }
     */
    static async generateReallocationProposal(taskId) {
        // 1. Fetch Task
        const task = await Task.findById(taskId)
            .populate('project')
            .populate('assignedTo', 'fullName');

        if (!task) throw new Error('Task not found');
        if (task.status === 'done') throw new Error('Task is already completed');

        const projectId = task.project._id;
        const currentAssignees = task.assignedTo.map(u => u._id.toString());

        // 2. Fetch Project Members (excluding current assignees)
        const project = await Project.findById(projectId).populate('members');
        if (!project) throw new Error('Project not found');

        const candidateMembers = project.members.filter(m => !currentAssignees.includes(m._id.toString()));

        if (candidateMembers.length === 0) {
            throw new Error('No other team members available for re-allocation in this project.');
        }

        // 3. Fetch CVs for candidates
        const candidateIds = candidateMembers.map(m => m._id);
        const cvs = await EmployeeCV.find({ 
            user: { $in: candidateIds },
            status: 'parsed' 
        }).populate('user');

        const candidateProfiles = [];
        for (const member of candidateMembers) {
            const cv = cvs.find(c => c.user._id.toString() === member._id.toString());
            const capacity = member.profileInfo?.capacityHoursPerSprint || 40;

            // Compute REAL workload: sum of estimatedTime on all open tasks for this user
            const openTasks = await Task.find({
                assignedTo: member._id,
                status: { $nin: ['done', 'completed', 'cancelled'] }
            });
            const actualWorkload = openTasks.reduce((sum, t) => sum + (t.estimatedTime || 4), 0);

            candidateProfiles.push({
                _id: member._id,
                fullName: member.fullName,
                role: member.role,
                skills: cv ? cv.extractedData?.skills : (member.profileInfo?.skills || []),
                primaryDomain: cv ? cv.extractedData?.primaryDomain : 'unknown',
                experienceYears: cv ? cv.extractedData?.totalYearsExperience : 0,
                availableCapacity: Math.max(0, capacity - actualWorkload),
                currentTaskCount: openTasks.length
            });
        }

        // 4. Generate AI Proposal Prompt
        const systemPrompt = `You are an Emergency Re-allocation AI.
A task is at risk of missing its deadline. You must select the BEST single candidate from the provided roster to take over or assist with the task.

Selection factors:
1. Skill match (most important)
2. Available capacity
3. Domain expertise

You MUST return ONLY valid JSON:
{
  "proposedAssigneeName": "Exact name of the selected employee",
  "reasoning": "A 2-3 sentence explanation of why they are the best fit, citing their skills and capacity."
}`;

        const candidatesString = candidateProfiles.map(c => 
            `- ${c.fullName} | Skills: ${(c.skills||[]).join(', ')} | Available Capacity: ${c.availableCapacity}h`
        ).join('\n');

        const userMessage = `TASK AT RISK:
Title: ${task.title}
Required Skills: ${(task.tags||[]).join(', ')}
Est. Remaining Time: ${task.estimatedTime || 4}h
Current Assignees: ${task.assignedTo.map(u => u.fullName).join(', ')}

CANDIDATE ROSTER:
${candidatesString}

Choose the best candidate to re-allocate this task to.`;

        // 5. Call LLM
        const llmResponse = await nvidiaLLM.chat(systemPrompt, userMessage, {
            temperature: 0.1,
            max_tokens: 1000
        });

        // 6. Parse Response
        let proposedAssigneeName;
        let reasoning;
        try {
            const cleaned = llmResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            proposedAssigneeName = parsed.proposedAssigneeName;
            reasoning = parsed.reasoning;
        } catch (error) {
            throw new Error(`AI Proposal Failed to Parse: ${error.message}`);
        }

        const selectedCandidate = candidateProfiles.find(c => c.fullName === proposedAssigneeName);
        if (!selectedCandidate) {
            throw new Error(`AI proposed an invalid candidate name: ${proposedAssigneeName}`);
        }

        // 7. Format Proposal
        const proposal = {
            taskId: task._id,
            taskTitle: task.title,
            dueDate: task.dueDate,
            before: {
                assignedToNames: task.assignedTo.map(u => u.fullName)
            },
            after: {
                proposedAssigneeId: selectedCandidate._id,
                proposedAssigneeName: selectedCandidate.fullName
            },
            aiReasoning: reasoning,
            generatedAt: new Date()
        };

        return proposal;
    }

    /**
     * Executes the approved re-allocation proposal
     */
    static async approveReallocation(taskId, newAssigneeId, managerId) {
        const task = await Task.findById(taskId);
        if (!task) throw new Error('Task not found');

        task.assignedTo = [newAssigneeId]; // Replace assignees. Alternatively, could push to array.
        task.history.push({
            field: 'assignedTo',
            newValue: newAssigneeId.toString(),
            updatedBy: managerId,
            reason: 'AI Emergency Re-allocation',
            timestamp: new Date()
        });

        await task.save();
        
        // Populate for return
        await task.populate('assignedTo', 'fullName email avatar');
        
        return task;
    }
}

module.exports = DeadlineRiskService;
