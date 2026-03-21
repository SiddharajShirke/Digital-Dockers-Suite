const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');

// @desc    Get all teams with aggregated stats
// @route   GET /api/teams
// @access  Private
const getTeams = asyncHandler(async (req, res) => {
    const teams = await Team.find({ isActive: true })
        .populate('lead', 'fullName email profileInfo.avatar')
        .populate('members', 'fullName email profileInfo.avatar')
        .lean();

    // Compute aggregates for each team
    const teamsWithStats = await Promise.all(teams.map(async (team) => {
        // Get all project IDs for this team
        const projectIds = team.projects || [];

        // Aggregate task stats for team's projects
        const taskStats = await Task.aggregate([
            {
                $match: {
                    project: { $in: projectIds.map(id => new mongoose.Types.ObjectId(id)) }
                }
            },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Count active sprints
        const activeSprints = await Sprint.countDocuments({
            project: { $in: projectIds },
            status: { $in: ['active', 'future'] }
        });

        const stats = taskStats[0] || { totalTasks: 0, completedTasks: 0 };
        const completionRate = stats.totalTasks > 0
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
            : 0;

        return {
            ...team,
            stats: {
                totalTasks: stats.totalTasks,
                completedTasks: stats.completedTasks,
                completionRate,
                activeSprints,
                activeProjects: projectIds.length
            }
        };
    }));

    res.json(teamsWithStats);
});

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Private
const getTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id)
        .populate('lead', 'fullName email profileInfo.avatar role')
        .populate('members', 'fullName email profileInfo.avatar role')
        .populate('projects', 'name key description');

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    res.json(team);
});

// @desc    Get detailed metrics for a team
// @route   GET /api/teams/:id/metrics
// @access  Private
const getTeamMetrics = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id).lean();

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    const projectIds = (team.projects || []).map(id => new mongoose.Types.ObjectId(id));

    // If no projects, return empty metrics
    if (projectIds.length === 0) {
        return res.json({
            teamId: team._id,
            teamName: team.name,
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
            avgVelocity: 0,
            velocityTrend: [],
            taskDistribution: { todo: 0, in_progress: 0, review: 0, done: 0 },
            activeSprints: 0,
            teamMembers: team.members?.length || 0
        });
    }

    // Task statistics aggregation
    const taskStats = await Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
            $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
                todoTasks: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
                inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                reviewTasks: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } }
            }
        }
    ]);

    // Velocity trend - get completed sprints with their metrics
    const velocityTrend = await Sprint.aggregate([
        {
            $match: {
                project: { $in: projectIds },
                status: 'closed'
            }
        },
        { $sort: { endDate: -1 } },
        { $limit: 5 },
        {
            $project: {
                name: 1,
                committedPoints: 1,
                completedPoints: 1,
                velocity: 1,
                startDate: 1,
                endDate: 1
            }
        },
        { $sort: { endDate: 1 } } // Re-sort ascending for chart
    ]);

    // Average velocity from completed sprints
    const avgVelocityResult = await Sprint.aggregate([
        {
            $match: {
                project: { $in: projectIds },
                status: 'closed'
            }
        },
        {
            $group: {
                _id: null,
                avgVelocity: { $avg: '$completedPoints' },
                totalSprints: { $sum: 1 }
            }
        }
    ]);

    // Count active sprints
    const activeSprints = await Sprint.countDocuments({
        project: { $in: projectIds },
        status: { $in: ['active', 'future'] }
    });

    const stats = taskStats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        todoTasks: 0,
        inProgressTasks: 0,
        reviewTasks: 0
    };

    const velocityStats = avgVelocityResult[0] || { avgVelocity: 0 };

    res.json({
        teamId: team._id,
        teamName: team.name,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        completionRate: stats.totalTasks > 0
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
            : 0,
        avgVelocity: Math.round(velocityStats.avgVelocity || 0),
        velocityTrend: velocityTrend.map(sprint => ({
            name: sprint.name,
            committed: sprint.committedPoints || 0,
            completed: sprint.completedPoints || 0
        })),
        taskDistribution: {
            todo: stats.todoTasks,
            in_progress: stats.inProgressTasks,
            review: stats.reviewTasks,
            done: stats.completedTasks
        },
        activeSprints,
        teamMembers: team.members?.length || 0,
        activeProjects: projectIds.length
    });
});

// @desc    Get global metrics (all teams combined)
// @route   GET /api/teams/metrics/global
// @access  Private
const getGlobalMetrics = asyncHandler(async (req, res) => {
    // Task statistics across all projects
    const taskStats = await Task.aggregate([
        {
            $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
                todoTasks: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
                inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                reviewTasks: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } }
            }
        }
    ]);

    // Velocity trend from all completed sprints
    const velocityTrend = await Sprint.aggregate([
        { $match: { status: 'closed' } },
        { $sort: { endDate: -1 } },
        { $limit: 5 },
        {
            $project: {
                name: 1,
                committedPoints: 1,
                completedPoints: 1
            }
        },
        { $sort: { endDate: 1 } }
    ]);

    // Average velocity
    const avgVelocityResult = await Sprint.aggregate([
        { $match: { status: 'closed' } },
        {
            $group: {
                _id: null,
                avgVelocity: { $avg: '$completedPoints' }
            }
        }
    ]);

    // Count active sprints
    const activeSprints = await Sprint.countDocuments({
        status: { $in: ['active', 'future'] }
    });

    // Count teams and members
    const teamCount = await Team.countDocuments({ isActive: true });
    const teams = await Team.find({ isActive: true }, 'members');
    const uniqueMembers = new Set();
    teams.forEach(t => t.members?.forEach(m => uniqueMembers.add(m.toString())));

    const stats = taskStats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        todoTasks: 0,
        inProgressTasks: 0,
        reviewTasks: 0
    };

    const velocityStats = avgVelocityResult[0] || { avgVelocity: 0 };

    res.json({
        teamId: null,
        teamName: 'All Teams',
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        completionRate: stats.totalTasks > 0
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
            : 0,
        avgVelocity: Math.round(velocityStats.avgVelocity || 0),
        velocityTrend: velocityTrend.map(sprint => ({
            name: sprint.name,
            committed: sprint.committedPoints || 0,
            completed: sprint.completedPoints || 0
        })),
        taskDistribution: {
            todo: stats.todoTasks,
            in_progress: stats.inProgressTasks,
            review: stats.reviewTasks,
            done: stats.completedTasks
        },
        activeSprints,
        teamMembers: uniqueMembers.size,
        totalTeams: teamCount
    });
});

// @desc    Create team
// @route   POST /api/teams
// @access  Private/Admin
const createTeam = asyncHandler(async (req, res) => {
    const { name, description, lead, members, projects, icon, color } = req.body;

    const team = await Team.create({
        name,
        description,
        lead,
        members: members || [],
        projects: projects || [],
        icon,
        color
    });

    const populatedTeam = await Team.findById(team._id)
        .populate('lead', 'fullName email profileInfo.avatar')
        .populate('members', 'fullName email profileInfo.avatar');

    res.status(201).json(populatedTeam);
});

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private/Admin
const updateTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    const updatedTeam = await Team.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
        .populate('lead', 'fullName email profileInfo.avatar')
        .populate('members', 'fullName email profileInfo.avatar');

    res.json(updatedTeam);
});

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private/Admin
const deleteTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    await team.deleteOne();
    res.json({ message: 'Team removed' });
});

// @desc    Update team members
// @route   PUT /api/teams/:id/members
// @access  Private/Admin
const updateTeamMembers = asyncHandler(async (req, res) => {
    const { members, action } = req.body;
    // action: 'set' (replace all), 'add' (add members), 'remove' (remove members)

    const team = await Team.findById(req.params.id);

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    let newMembers = [...(team.members || []).map(m => m.toString())];

    if (action === 'set') {
        // Replace all members
        newMembers = members || [];
    } else if (action === 'add') {
        // Add new members
        members?.forEach(memberId => {
            if (!newMembers.includes(memberId)) {
                newMembers.push(memberId);
            }
        });
    } else if (action === 'remove') {
        // Remove members
        newMembers = newMembers.filter(m => !members?.includes(m));
    }

    // Ensure lead is always in members list
    if (team.lead && !newMembers.includes(team.lead.toString())) {
        newMembers.push(team.lead.toString());
    }

    team.members = newMembers;
    await team.save();

    const updatedTeam = await Team.findById(team._id)
        .populate('lead', 'fullName email profileInfo.avatar role')
        .populate('members', 'fullName email profileInfo.avatar role');

    res.json(updatedTeam);
});

// @desc    Get all users for team assignment
// @route   GET /api/teams/users/available
// @access  Private/Admin
const getAvailableUsers = asyncHandler(async (req, res) => {
    const User = require('../models/User');

    const users = await User.find({ isActive: true })
        .select('fullName email role profileInfo.avatar')
        .sort('fullName');

    res.json(users);
});

module.exports = {
    getTeams,
    getTeam,
    getTeamMetrics,
    getGlobalMetrics,
    createTeam,
    updateTeam,
    deleteTeam,
    updateTeamMembers,
    getAvailableUsers
};
