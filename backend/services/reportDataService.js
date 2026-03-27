const mongoose = require('mongoose');
const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const WorkLog = require('../models/WorkLog');
const User = require('../models/User');

class ReportDataService {
    /**
     * Aggregates comprehensive data for a full Project Report
     * @param {string} projectId 
     * @returns {object} Aggregated project data
     */
    async getProjectReportData(projectId) {
        const project = await Project.findById(projectId).populate('lead members', 'fullName email role profileInfo');
        if (!project) throw new Error('Project not found');

        const sprints = await Sprint.find({ project: projectId }).sort('startDate');
        const tasks = await Task.find({ project: projectId })
            .populate('assignedTo reporter', 'fullName email role')
            .populate('sprint', 'name status startDate endDate');

        // Extract and compute metrics
        const velocityTrend = sprints.filter(s => s.status === 'closed').map(s => ({
            name: s.name,
            committed: s.committedPoints || 0,
            completed: s.completedPoints || 0,
            velocity: s.velocity || 0
        }));

        const statusDistribution = {
            todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0
        };
        const assigneeWorkload = {};

        tasks.forEach(task => {
            if (statusDistribution[task.status] !== undefined) {
                statusDistribution[task.status]++;
            } else {
                statusDistribution[task.status] = 1;
            }

            // Assignee Workload
            if (task.assignedTo && task.assignedTo.length > 0) {
                const assignee = task.assignedTo[0];
                if (!assigneeWorkload[assignee._id]) {
                    assigneeWorkload[assignee._id] = {
                        name: assignee.fullName,
                        tasksAssigned: 0,
                        storyPoints: 0,
                        tasksCompleted: 0
                    };
                }
                assigneeWorkload[assignee._id].tasksAssigned++;
                assigneeWorkload[assignee._id].storyPoints += (task.storyPoints || 0);
                if (task.status === 'done') assigneeWorkload[assignee._id].tasksCompleted++;
            }
        });

        return {
            reportType: 'PROJECT',
            project: {
                id: project._id,
                name: project.name,
                key: project.key,
                type: project.projectType,
                lead: project.lead ? project.lead.fullName : 'Unassigned',
                totalMembers: project.members.length
            },
            metrics: {
                totalSprints: sprints.length,
                totalTasks: tasks.length,
                statusDistribution,
                velocityTrend,
                assigneeWorkload: Object.values(assigneeWorkload)
            },
            sprints: sprints.map(s => ({
                id: s._id,
                name: s.name,
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
                completedPoints: s.completedPoints
            })),
            tasks: tasks.map(t => ({
                id: t._id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                issueType: t.issueType,
                storyPoints: t.storyPoints,
                sprint: t.sprint ? t.sprint.name : 'Backlog',
                assignee: t.assignedTo?.[0]?.fullName || 'Unassigned'
            }))
        };
    }

    /**
     * Aggregates comprehensive data for a single Sprint Report
     * @param {string} sprintId 
     * @returns {object} Aggregated sprint data
     */
    async getSprintReportData(sprintId) {
        const sprint = await Sprint.findById(sprintId).populate('project');
        if (!sprint) throw new Error('Sprint not found');

        const tasks = await Task.find({ sprint: sprintId })
            .populate('assignedTo reporter', 'fullName email role');
        
        const taskIds = tasks.map(t => t._id);
        const worklogs = await WorkLog.find({ workItemId: { $in: taskIds } }).populate('userId', 'fullName');

        const statusDistribution = {
            todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0
        };
        const assigneeWorkload = {};
        let totalCommitted = 0;
        let totalCompleted = 0;

        tasks.forEach(task => {
            if (statusDistribution[task.status] !== undefined) {
                statusDistribution[task.status]++;
            }
            totalCommitted += (task.storyPoints || 0);
            if (task.status === 'done') {
                totalCompleted += (task.storyPoints || 0);
            }

            // Assignee Workload
            if (task.assignedTo && task.assignedTo.length > 0) {
                const assignee = task.assignedTo[0];
                if (!assigneeWorkload[assignee._id]) {
                    assigneeWorkload[assignee._id] = {
                        name: assignee.fullName,
                        tasksAssigned: 0,
                        storyPoints: 0,
                        tasksCompleted: 0,
                        hoursLogged: 0
                    };
                }
                assigneeWorkload[assignee._id].tasksAssigned++;
                assigneeWorkload[assignee._id].storyPoints += (task.storyPoints || 0);
                if (task.status === 'done') assigneeWorkload[assignee._id].tasksCompleted++;
            }
        });

        // Compute hours from worklogs
        worklogs.forEach(log => {
            if (log.userId && assigneeWorkload[log.userId._id]) {
                const hours = (log.durationMinutes || 0) / 60;
                assigneeWorkload[log.userId._id].hoursLogged += hours;
            }
        });

        return {
            reportType: 'SPRINT',
            project: {
                id: sprint.project._id,
                name: sprint.project.name,
                key: sprint.project.key
            },
            sprint: {
                id: sprint._id,
                name: sprint.name,
                status: sprint.status,
                startDate: sprint.startDate,
                endDate: sprint.endDate,
                goal: sprint.goal,
                committedPoints: sprint.committedPoints || totalCommitted,
                completedPoints: sprint.completedPoints || totalCompleted
            },
            metrics: {
                totalTasks: tasks.length,
                statusDistribution,
                assigneeWorkload: Object.values(assigneeWorkload)
            },
            tasks: tasks.map(t => ({
                id: t._id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                issueType: t.issueType,
                storyPoints: t.storyPoints,
                estimatedTime: t.estimatedTime,
                assignee: t.assignedTo?.[0]?.fullName || 'Unassigned',
                hoursLogged: worklogs.filter(w => w.workItemId.toString() === t._id.toString()).reduce((sum, w) => sum + (w.durationMinutes || 0)/60, 0)
            }))
        };
    }
}

module.exports = new ReportDataService();
