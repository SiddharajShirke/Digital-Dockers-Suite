const asyncHandler = require('express-async-handler');
const Task = require('../models/Task');
const User = require('../models/User');
const { analyzeTask } = require('../services/openaiService');
const { createTaskCalendarEvent, updateTaskCalendarEvent, deleteTaskCalendarEvent, refreshAccessToken } = require('../services/googleCalendarService');
const WorkloadBalancingService = require('../services/workloadBalancingService');
const Project = require('../models/Project');

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
    const {
        title, description, deadline, assignedTo, priority,
        projectId, sprintId, epicId, issueType, storyPoints, parentTaskId, status, estimatedTime
    } = req.body;

    if (!title) {
        res.status(400);
        throw new Error('Please add a task title');
    }

    // Generate Issue Key if Project ID is provided
    let issueKey = undefined;
    if (projectId) {
        const project = await Project.findByIdAndUpdate(
            projectId,
            { $inc: { nextIssueNumber: 1 } },
            { new: true }
        );
        if (project) {
            issueKey = `${project.key}-${project.nextIssueNumber - 1}`;
        }
    }

    // AI Analysis (keep existing feature)
    const aiAnalysis = await analyzeTask(description || title, deadline);

    const task = await Task.create({
        title,
        description,
        priority: priority || aiAnalysis.priority || 'medium',
        status: status || 'todo',
        assignedTo: assignedTo || [req.user._id],
        assignedBy: req.user._id,
        reporter: req.user._id,
        dueDate: deadline,
        estimatedTime: estimatedTime || 5, // Default 5 hours if not provided

        // Jira Fields
        key: issueKey,
        project: projectId,
        sprint: sprintId,
        epic: epicId,
        issueType: issueType || 'task',
        storyPoints: storyPoints,
        parentTask: parentTaskId,

        aiSuggestions: {
            timeBreakdown: aiAnalysis?.timeBreakdown,
            dependencies: aiAnalysis?.dependencies
        }
    });

    // Google Calendar Integration
    if (task.dueDate && task.assignedTo && task.assignedTo.length > 0) {
        // ... (Keep existing calendar logic) ...
        for (const userId of task.assignedTo) {
            try {
                const user = await User.findById(userId);

                if (user && user.googleAccessToken) {
                    let accessToken = user.googleAccessToken;

                    // Check if token needs refresh
                    if (user.googleRefreshToken && user.googleTokenExpiry) {
                        const now = new Date();
                        const tokenExpiry = new Date(user.googleTokenExpiry);

                        if (tokenExpiry <= new Date(now.getTime() + 5 * 60 * 1000)) {
                            try {
                                const refreshed = await refreshAccessToken(user.googleRefreshToken);
                                accessToken = refreshed.access_token;
                                user.googleAccessToken = refreshed.access_token;
                                user.googleTokenExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
                                await user.save();
                            } catch (error) {
                                console.error(`Token refresh failed for user ${userId}:`, error.message);
                                continue;
                            }
                        }
                    }

                    // Create calendar event - safe check
                    try {
                        const eventId = await createTaskCalendarEvent(accessToken, {
                            title: task.key ? `[${task.key}] ${task.title}` : task.title,
                            description: task.description,
                            dueDate: task.dueDate
                        });

                        if (!task.calendarEventId) {
                            task.calendarEventId = eventId;
                            await task.save();
                        }

                        console.log(`✅ Calendar event created for user ${user.fullName}`);
                    } catch (calErr) {
                        console.error(`Calendar API Error: ${calErr.message}`);
                    }
                }
            } catch (error) {
                console.error(`Failed to create calendar event for user ${userId}:`, error.message);
            }
        }
    }

    await task.populate([
        { path: 'assignedTo', select: 'fullName email' },
        { path: 'assignedBy', select: 'fullName email' },
        { path: 'project' },
        { path: 'sprint' },
        { path: 'epic' }
    ]);

    // Send notifications to assigned users
    if (task.assignedTo && task.assignedTo.length > 0) {
        try {
            const notificationHandler = req.app.get('notificationHandler');
            if (notificationHandler) {
                const notificationService = notificationHandler.getNotificationService();
                
                for (const assignee of task.assignedTo) {
                    await notificationService.createNotification({
                        recipient: assignee._id,
                        sender: req.user._id,
                        type: 'TASK_ASSIGNED',
                        title: 'New Task Assigned',
                        description: `${task.title}${task.key ? ` (${task.key})` : ''}`,
                        entityType: 'Task',
                        entityId: task._id,
                        priority: task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low',
                        metadata: {
                            projectId: task.project?._id,
                            taskKey: task.key,
                            dueDate: task.dueDate
                        }
                    });
                }
            }
        } catch (notifError) {
            console.error('Error sending task notification:', notifError.message);
        }
    }

    // Emit socket event for real-time updates to Reports Dashboard
    const io = req.app.get('io');
    if (io && task.project) {
        io.to(`project:${task.project}`).emit('task:created', task);
    }

    // ============================================================================
    // AUTOMATIC WORKLOAD REBALANCING
    // ============================================================================
    // After task creation, trigger automatic workload rebalancing if task is assigned
    if (task.assignedTo && task.assignedTo.length > 0) {
        try {
            console.log('🔄 Triggering automatic workload rebalancing after task creation...');
            const rebalanceResults = await WorkloadBalancingService.rebalanceTeamWorkload(task.project);
            
            if (rebalanceResults.rebalanced > 0) {
                // Emit socket event for workload rebalancing
                if (io) {
                    io.emit('workload:rebalanced', {
                        message: `${rebalanceResults.rebalanced} tasks were automatically rebalanced`,
                        reassignments: rebalanceResults.reassignments,
                        timestamp: new Date(),
                        triggeredBy: 'auto-balance'
                    });
                }
                console.log(`✅ Auto-rebalancing complete: ${rebalanceResults.rebalanced} tasks reassigned`);
            }
        } catch (error) {
            console.error('Workload rebalancing error:', error.message);
            // Don't fail the request due to rebalancing errors
        }
    }

    res.status(201).json(task);
});

// @desc    Get all tasks (with filters)
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
    const { projectId, sprintId, epicId, status, assignedTo } = req.query;

    let query = {};

    // Specific filters
    if (projectId) query.project = projectId;
    if (sprintId) query.sprint = sprintId;
    if (epicId) query.epic = epicId;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    // If no specific project/sprint filters, apply default visibility rules
    // (Leaders see all, users see theirs, UNLESS they are viewing a specific project board they have access to)
    // For now, if projectId is NOT provided, fallback to "My Tasks" or "Admin View"
    if (!projectId && !sprintId && !epicId) {
        // simple role check (case insensitive mostly safe but strict here)
        const userRole = req.user.role;

        if (!['admin', 'Project Manager', 'Technical Lead'].includes(userRole)) {
            // Regular user -> Only show assigned or reported
            query.$or = [
                { assignedTo: req.user._id },
                { assignedBy: req.user._id },
                { reporter: req.user._id }
            ];
        }
    }

    const tasks = await Task.find(query)
        .populate('assignedTo', 'fullName email')
        .populate('assignedBy', 'fullName')
        .populate('project', 'name key icon')
        .populate('sprint', 'name status')
        .populate('epic', 'name color')
        .sort('-createdAt');

    res.status(200).json(tasks);
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const { canTransition } = require('./workflowController');
const automationService = require('../services/automationService');

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    // Check authorization - creator, assignees, admin, or project members can update (for demo)
    const isCreator = task.assignedBy ? task.assignedBy.toString() === req.user._id.toString() : false;
    const isAssignee = (task.assignedTo || []).some(id => id && id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';
    const isProjectManager = req.user.role === 'project_manager' || req.user.role === 'technical_lead';

    // Relaxed permissions for demo/team collaboration: project members can update
    if (!isCreator && !isAssignee && !isAdmin && !isProjectManager) {
        // Allow all authenticated users for demo purposes
        // In production, uncomment the line below for stricter auth:
        // if (!isCreator && !isAssignee && !isAdmin) {
        //     res.status(403);
        //     throw new Error('Not authorized to update this task');
        // }
    }

    // Workflow Validation
    if (req.body.status && req.body.status !== task.status) {
        if (!canTransition(task.status, req.body.status)) {
            res.status(400);
            throw new Error(`Invalid transition from ${task.status} to ${req.body.status}`);
        }
    }

    // Track History & Applied Changes
    const changes = {};
    const historyEntry = {
        updatedBy: req.user._id,
        timestamp: new Date()
    };
    let hasChanges = false;

    // Monitor specific fields
    const monitoredFields = ['status', 'priority', 'assignedTo', 'description', 'storyPoints', 'sprint'];
    monitoredFields.forEach(field => {
        if (req.body[field] !== undefined && JSON.stringify(req.body[field]) !== JSON.stringify(task[field])) {
            // For simplicity, just log string changes. For objects/arrays, simpler logging:
            const oldValue = typeof task[field] === 'object' ? JSON.stringify(task[field]) : task[field];
            const newValue = typeof req.body[field] === 'object' ? JSON.stringify(req.body[field]) : req.body[field];

            task.history.push({
                ...historyEntry,
                field,
                oldValue: String(oldValue),
                newValue: String(newValue)
            });
            changes[field] = req.body[field];
            hasChanges = true;
        }
    });

    // Special handling for Status Completion
    if (req.body.status === 'done' && task.status !== 'done') {
        task.completedAt = new Date();
        req.body.completedAt = task.completedAt;
    }

    // Apply updates
    const updatedTask = await Task.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('assignedTo', 'fullName email')
        .populate('assignedBy', 'fullName email')
        .populate('history.updatedBy', 'fullName');

    if (hasChanges) {
        automationService.emit('issue:updated', updatedTask, changes);
    }

    // Emit socket event for real-time updates to Reports Dashboard
    const io = req.app.get('io');
    if (io && updatedTask.project) {
        io.to(`project:${updatedTask.project}`).emit('task:updated', updatedTask);
    }

    // Google Calendar Integration - Update calendar event if dueDate changed
    if (req.body.dueDate && task.dueDate && task.calendarEventId) {
        // ... (Keep existing calendar logic for update)
        const oldDate = new Date(task.dueDate).getTime();
        const newDate = new Date(req.body.dueDate).getTime();

        if (oldDate !== newDate) {
            // Try to update calendar event for each assigned user
            for (const userId of updatedTask.assignedTo) {
                try {
                    const user = await User.findById(userId._id || userId);

                    if (user && user.googleAccessToken) {
                        await updateTaskCalendarEvent(user.googleAccessToken, task.calendarEventId, {
                            title: updatedTask.title,
                            description: updatedTask.description,
                            dueDate: updatedTask.dueDate
                        });
                    }
                } catch (error) {
                    console.error(`Failed to update calendar event:`, error.message);
                }
            }
        }
    }

    // ============================================================================
    // AUTOMATIC WORKLOAD REBALANCING
    // ============================================================================
    // If task assignment changed, trigger automatic workload rebalancing
    if (req.body.assignedTo && changes.assignedTo) {
        try {
            console.log('🔄 Triggering automatic workload rebalancing...');
            const rebalanceResults = await WorkloadBalancingService.rebalanceTeamWorkload(updatedTask.project);
            
            if (rebalanceResults.rebalanced > 0) {
                // Emit socket event for workload rebalancing
                if (io) {
                    io.emit('workload:rebalanced', {
                        message: `${rebalanceResults.rebalanced} tasks were automatically rebalanced`,
                        reassignments: rebalanceResults.reassignments,
                        timestamp: new Date(),
                        triggeredBy: 'auto-balance'
                    });
                }
                console.log(`✅ Auto-rebalancing complete: ${rebalanceResults.rebalanced} tasks reassigned`);
            }
        } catch (error) {
            console.error('Workload rebalancing error:', error.message);
            // Don't fail the request due to rebalancing errors
        }
    }

    res.status(200).json(updatedTask);
});

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const comment = {
        user: req.user._id,
        text: req.body.text,
        timestamp: new Date()
    };

    task.comments.push(comment);
    await task.save();

    const updatedTask = await Task.findById(req.params.id)
        .populate('comments.user', 'fullName avatar');

    res.status(201).json(updatedTask.comments);
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Creator or Admin only)
const deleteTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    // Only creator or admin can delete
    const isCreator = task.assignedBy ? task.assignedBy.toString() === req.user._id.toString() : false;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
        res.status(403);
        throw new Error('Not authorized to delete this task');
    }

    // Google Calendar Integration -Delete calendar event if exists
    if (task.calendarEventId && task.assignedTo) {
        for (const userId of task.assignedTo) {
            try {
                const user = await User.findById(userId);

                if (user && user.googleAccessToken) {
                    await deleteTaskCalendarEvent(user.googleAccessToken, task.calendarEventId);
                    console.log(`✅ Calendar event deleted for user ${user.fullName}`);
                }
            } catch (error) {
                console.error(`Failed to delete calendar event:`, error.message);
            }
        }
    }

    const projectId = task.project;
    await task.deleteOne();

    // Emit socket event for real-time updates to Reports Dashboard
    const io = req.app.get('io');
    if (io && projectId) {
        io.to(`project:${projectId}`).emit('task:deleted', req.params.id);
    }

    res.status(200).json({ message: 'Task deleted successfully', id: req.params.id });
});

// @desc    Get tasks assigned to current user
// @route   GET /api/tasks/assigned-to-me
// @access  Private
const getAssignedToMe = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const tasks = await Task.find({
        assignedTo: req.user._id,
        status: { $ne: 'done' }
    })
        .populate('project', 'name key')
        .sort({ priority: -1, updatedAt: -1 })
        .limit(parseInt(limit));

    res.json(tasks);
});

// @desc    Global search across tasks and projects
// @route   GET /api/tasks/search
// @access  Private
const globalSearch = asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query || query.length < 2) {
        return res.json({ tasks: [], projects: [] });
    }

    const searchRegex = new RegExp(query, 'i');

    const tasks = await Task.find({
        $or: [
            { key: searchRegex },
            { title: searchRegex },
            { description: searchRegex }
        ]
    })
        .populate('project', 'name key')
        .populate('assignedTo', 'fullName')
        .limit(10);

    const Project = require('../models/Project');
    const projects = await Project.find({
        $or: [
            { key: searchRegex },
            { name: searchRegex }
        ]
    }).limit(5);

    res.json({ tasks, projects });
});

module.exports = {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    addComment,
    getAssignedToMe,
    globalSearch
};
