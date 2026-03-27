const asyncHandler = require('express-async-handler');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
    const { name, key, type, description } = req.body;

    const projectExists = await Project.findOne({ key });
    if (projectExists) {
        res.status(400);
        throw new Error('Project key already exists');
    }

    const project = await Project.create({
        name,
        key,
        description,
        type,
        lead: req.user._id,
        members: [req.user._id] // Creator is a member by default
    });

    res.status(201).json(project);
});

// @desc    Get all projects (that user is a member of)
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
    // For now, return all projects or filter by membership
    // const projects = await Project.find({ members: req.user._id }); 
    const projects = await Project.find({}).sort({ createdAt: -1 }); // Newest first
    res.json(projects);
});

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
        .populate('lead', 'name email avatar')
        .populate('members', 'name email avatar');

    if (project) {
        res.json(project);
    } else {
        res.status(404);
        throw new Error('Project not found');
    }
});

// @desc    Get project statistics for dashboard
// @route   GET /api/projects/:id/stats
// @access  Private
const getProjectStats = asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    const { sprintId } = req.query;
    console.log(`\n📊 Loading stats for project: ${projectId} (Sprint: ${sprintId || 'default'})`);

    // Get specific sprint if requested, otherwise active sprint
    let targetSprint = null;
    if (sprintId && sprintId !== 'general') {
        targetSprint = await Sprint.findById(sprintId);
    } else if (!sprintId || sprintId === 'active') {
        targetSprint = await Sprint.findOne({
            project: projectId,
            status: 'active'
        });
    }

    // Get all tasks for this project
    const allProjectTasks = await Task.find({ project: projectId });
    
    // Filter tasks based on selected scope
    let filteredTasks = allProjectTasks;
    if (targetSprint) {
        filteredTasks = allProjectTasks.filter(t => t.sprint && t.sprint.toString() === targetSprint._id.toString());
        console.log(`✅ Focus Scope: Sprint "${targetSprint.name}"`);
    } else {
        console.log(`🌐 Focus Scope: Project-Wide (General)`);
    }

    // Calculate metrics
    const totalPoints = filteredTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const donePoints = filteredTasks
        .filter(t => t.status === 'done')
        .reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const inProgressPoints = filteredTasks
        .filter(t => t.status === 'in_progress')
        .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

    const issuesDoneCount = filteredTasks.filter(t => t.status === 'done').length;

    // Days remaining (only relevant if a sprint is selected)
    let daysRemaining = 0;
    if (targetSprint && targetSprint.endDate) {
        const today = new Date();
        const endDate = new Date(targetSprint.endDate);
        daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    }

    // Velocity from closed sprints (always project-wide context or most recent)
    const closedSprints = await Sprint.find({
        project: projectId,
        status: 'closed'
    }).sort({ endDate: -1 }).limit(5);

    const velocity = closedSprints.length > 0
        ? Math.round(closedSprints.reduce((acc, s) => acc + (s.completedPoints || 0), 0) / closedSprints.length)
        : 0;

    // Issue status breakdown
    const statusBreakdown = {
        todo: filteredTasks.filter(t => t.status === 'todo').length,
        in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
        review: filteredTasks.filter(t => t.status === 'review').length,
        done: filteredTasks.filter(t => t.status === 'done').length
    };

    // Workload by assignee (filtered by scope) — includes task titles
    const workload = [];
    const assigneeMap = new Map(); // userId -> { points, tasks: [title] }
    filteredTasks.filter(t => t.status !== 'done').forEach(task => {
        (task.assignedTo || []).forEach(userId => {
            if (!userId) return;
            const id = userId.toString();
            if (!assigneeMap.has(id)) {
                assigneeMap.set(id, { points: 0, tasks: [] });
            }
            const entry = assigneeMap.get(id);
            entry.points += (task.storyPoints || 1);
            entry.tasks.push(task.title || 'Untitled Task');
        });
    });

    for (const [userId, data] of assigneeMap) {
        const user = await User.findById(userId).select('fullName');
        if (user) {
            workload.push({ userId, name: user.fullName, points: data.points, tasks: data.tasks });
        }
    }

    // Upcoming and Unscheduled (for the whole team/sprint)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    fourteenDaysFromNow.setHours(23, 59, 59, 999);
    
    // Filter out 'done' tasks for the upcoming/unscheduled lists
    const activeFilteredTasks = filteredTasks.filter(t => t.status !== 'done');

    const upcomingTasks = activeFilteredTasks
        .filter(t => t.dueDate && new Date(t.dueDate) <= fourteenDaysFromNow && new Date(t.dueDate) >= startOfToday)
        .map(t => ({
            _id: t._id,
            key: t.key,
            title: t.title,
            dueDate: t.dueDate,
            priority: t.priority
        }));

    const unscheduledTasks = activeFilteredTasks
        .filter(t => !t.dueDate)
        .map(t => ({
            _id: t._id,
            key: t.key,
            title: t.title,
            priority: t.priority
        }));

    res.json({
        sprintProgress: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
        issuesDone: issuesDoneCount,
        daysRemaining,
        velocity,
        statusBreakdown,
        workload,
        totalTasks: filteredTasks.length,
        totalStoryPoints: totalPoints,
        completedStoryPoints: donePoints,
        inProgressStoryPoints: inProgressPoints,
        upcomingTasks,
        unscheduledTasks,
        activeSprint: targetSprint ? {
            _id: targetSprint._id,
            name: targetSprint.name,
            endDate: targetSprint.endDate
        } : null
    });
});

// Get work types distribution for a project
const getWorkTypes = asyncHandler(async (req, res) => {
    const projectId = req.params.id;

    // Get all tasks for this project
    const tasks = await Task.find({ project: projectId });

    // Group by issue type
    const typeMap = {
        'task': 0,
        'epic': 0,
        'story': 0,
        'bug': 0,
        'subtask': 0
    };

    tasks.forEach(task => {
        const type = task.issueType || 'task';
        if (typeMap.hasOwnProperty(type)) {
            typeMap[type]++;
        }
    });

    // Calculate totals and percentages
    const total = Object.values(typeMap).reduce((a, b) => a + b, 0);
    const workTypes = Object.entries(typeMap).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        rawType: type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

    res.json(workTypes);
});

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    getProjectStats,
    getWorkTypes
};
