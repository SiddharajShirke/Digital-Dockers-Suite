const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const User = require('../models/User');

/**
 * ============================================================================
 * ROADMAP AGGREGATION SERVICE (V3 - Project/Sprint Driven)
 * ============================================================================
 * Dynamically computes all roadmap data from the same Source of Truth as the
 * 'View All Projects' tab. Data flows: Projects -> Sprints -> Tasks.
 *
 * Capacity baseline: 8 story points per team member per month (configurable).
 */

const BASE_CAPACITY_PER_PERSON = Number(process.env.ROADMAP_CAPACITY_PER_PERSON) || 8;

/**
 * Get the start of a month for a given date
 */
function startOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the end of a month for a given date
 */
function endOfMonth(date) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Generate month buckets for a given range
 */
function generateMonthBuckets(rangeStart, rangeEnd) {
    const buckets = [];
    const cursor = startOfMonth(rangeStart);
    const limit = endOfMonth(rangeEnd);

    while (cursor <= limit) {
        const monthStart = new Date(cursor);
        const monthEnd = endOfMonth(cursor);
        const label = monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        buckets.push({ start: monthStart, end: monthEnd, label });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
}

/**
 * Helper to fetch system capacity
 */
async function getSystemCapacity() {
    const userCount = await User.countDocuments();
    return Math.max(userCount, 1) * BASE_CAPACITY_PER_PERSON;
}

/**
 * 1. KPI HEADER
 */
async function buildKPIHeader() {
    const now = new Date();
    const activeClosedSprints = await Sprint.find({ status: { $regex: /^(closed|active)$/i } }).sort({ endDate: -1 }).lean();

    if (activeClosedSprints.length === 0) {
        return {
            averageVelocity: 0,
            lastMonthVelocity: 0,
            estimatedBurndownMonths: 0,
            onTimeDeliveryPercentage: 0
        };
    }

    const sprintIds = activeClosedSprints.map(s => s._id);
    const sprintTasks = await Task.find({ sprint: { $in: sprintIds } }).lean();
    
    // Calculate total points dynamically from tasks
    const tasksBySprint = {};
    sprintTasks.forEach(t => {
        const sid = t.sprint?.toString();
        if (sid) {
            if (!tasksBySprint[sid]) tasksBySprint[sid] = [];
            tasksBySprint[sid].push(t);
        }
    });

    // Decorate sprints with dynamically calculated mathematically precise points
    const decorated = activeClosedSprints.map(s => {
        const tasks = tasksBySprint[s._id.toString()] || [];
        const totalPts = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const compPts = tasks.filter(t => (t.status || '').toLowerCase() === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        
        // Define when this sprint "ended" or is active
        const effectiveEnd = s.endDate ? new Date(s.endDate) : (s.createdAt ? new Date(s.createdAt) : now);
        
        return { ...s, calculatedTotal: totalPts, calculatedCompleted: compPts, effectiveEnd };
    });

    // 1. Avg Velocity (Points per sprint over the last 10 sprints)
    const recentSprints = decorated.slice(0, 10);
    const totalRecentPoints = recentSprints.reduce((sum, s) => sum + s.calculatedCompleted, 0);
    const averageVelocity = recentSprints.length > 0 ? Math.round(totalRecentPoints / recentSprints.length) : 0;

    // 2. Last Month Velocity (Sum of completed points in sprints that ended/were active in the last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const lastMonthSprints = decorated.filter(s => s.effectiveEnd >= thirtyDaysAgo && s.effectiveEnd <= now);
    const lastMonthVelocity = lastMonthSprints.reduce((sum, s) => sum + s.calculatedCompleted, 0);

    // 3. Est Burndown (Global)
    // Avg Velocity is PER SPRINT. Monthly Velocity = AvgVelocity * 2.
    const allRemainingTasks = await Task.find({ status: { $nin: ['done', 'completed'] } });
    const totalRemainingPoints = allRemainingTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    const estimatedBurndownMonths = averageVelocity > 0 ? Math.ceil(totalRemainingPoints / (averageVelocity * 2)) : 0;

    // 4. On-Time Delivery
    const closedOnly = decorated.filter(s => s.status?.toLowerCase() === 'closed');
    const pool = closedOnly.length > 0 ? closedOnly : decorated;
    const onTimeSprints = pool.filter(s => s.calculatedTotal > 0 && s.calculatedCompleted === s.calculatedTotal);
    const onTimeDeliveryPercentage = pool.length > 0 ? Math.round((onTimeSprints.length / pool.length) * 100) : 0;

    return { averageVelocity, lastMonthVelocity, estimatedBurndownMonths, onTimeDeliveryPercentage };
}

/**
 * 2. VELOCITY TREND (Historical)
 */
async function buildVelocityTrend(pastMonths) {
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setMonth(rangeStart.getMonth() - pastMonths);

    const buckets = generateMonthBuckets(rangeStart, now);
    const teamCapacity = await getSystemCapacity();

    // Find all closed & active sprints overlapping the range
    const closedSprints = await Sprint.find({
        status: { $regex: /^(closed|active)$/i },
        $or: [
            { endDate: { $gte: startOfMonth(rangeStart), $lte: endOfMonth(now) } },
            { startDate: { $gte: startOfMonth(rangeStart), $lte: endOfMonth(now) } }
        ]
    }).lean();

    const sprintIds = closedSprints.map(s => s._id);
    const sprintTasks = await Task.find({ sprint: { $in: sprintIds }, status: 'done' }).lean();
    
    const completedTasksBySprint = {};
    sprintTasks.forEach(t => {
        const sid = t.sprint?.toString();
        if (sid) {
            if (!completedTasksBySprint[sid]) completedTasksBySprint[sid] = [];
            completedTasksBySprint[sid].push(t);
        }
    });

    return buckets.map(bucket => {
        const monthSprints = closedSprints.filter(s => s.endDate >= bucket.start && s.endDate <= bucket.end);
        
        const completedPoints = monthSprints.reduce((sum, s) => {
            const tasks = completedTasksBySprint[s._id.toString()] || [];
            const sprintCompletedPts = tasks.reduce((tsum, t) => tsum + (t.storyPoints || 0), 0);
            return sum + sprintCompletedPts;
        }, 0);

        return { month: bucket.label, completedPoints, teamCapacity };
    });
}

/**
 * 3. FUTURE CAPACITY (Forecast)
 */
async function buildFutureCapacity(futureMonths) {
    const now = new Date();
    const futureStart = new Date(now);
    futureStart.setMonth(futureStart.getMonth() + 1);
    const futureEnd = new Date(now);
    futureEnd.setMonth(futureEnd.getMonth() + futureMonths);

    const buckets = generateMonthBuckets(futureStart, futureEnd);
    const teamCapacity = await getSystemCapacity();

    // Future sprints overlapping future months
    const futureSprints = await Sprint.find({
        status: { $regex: /^(future|draft|active)$/i },
        $or: [
            { startDate: { $gte: startOfMonth(futureStart), $lte: endOfMonth(futureEnd) } },
            { endDate: { $gte: startOfMonth(futureStart), $lte: endOfMonth(futureEnd) } }
        ]
    }).lean();

    // We need the committed tasks for these future sprints
    const sprintIds = futureSprints.map(s => s._id);
    const plannedTasks = await Task.find({ sprint: { $in: sprintIds }, status: { $ne: 'done' } }).lean();

    return buckets.map(bucket => {
        const monthSprints = futureSprints.filter(s => s.startDate >= bucket.start && s.startDate <= bucket.end);
        const activeSprintIds = monthSprints.map(s => s._id.toString());
        
        const monthTasks = plannedTasks.filter(t => t.sprint && activeSprintIds.includes(t.sprint.toString()));
        const plannedPoints = monthTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        
        const utilizationRate = teamCapacity > 0 ? Math.round((plannedPoints / teamCapacity) * 100) : 0;
        const overload = Math.max(0, utilizationRate - 100);

        return { month: bucket.label, plannedPoints, teamCapacity, utilizationRate, overload };
    });
}

/**
 * 4. MONTHLY PROGRESS (CORE DRILL-DOWN)
 * Month -> Project -> Sprint -> Tasks
 */
async function buildMonthlyProgress(pastMonths, futureMonths) {
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setMonth(rangeStart.getMonth() - pastMonths);
    const rangeEnd = new Date(now);
    rangeEnd.setMonth(rangeEnd.getMonth() + futureMonths);

    const buckets = generateMonthBuckets(rangeStart, rangeEnd);

    // 1. Fetch All Projects (Same root as View All Projects tab)
    const projects = await Project.find({}).lean();
    if (!projects.length) return [];

    // 2. Fetch All Sprints for these projects falling in range
    const sprints = await Sprint.find({
        $or: [
            { startDate: { $gte: startOfMonth(rangeStart), $lte: endOfMonth(rangeEnd) } },
            { endDate: { $gte: startOfMonth(rangeStart), $lte: endOfMonth(rangeEnd) } }
        ]
    }).lean();

    // 3. Fetch All Tasks for these sprints
    const sprintIds = sprints.map(s => s._id);
    const allTasks = await Task.find({ sprint: { $in: sprintIds } })
        .populate('assignedTo', 'name email')
        .lean();

    // Group tasks by sprint
    const tasksBySprint = {};
    allTasks.forEach(t => {
        const sid = t.sprint.toString();
        if (!tasksBySprint[sid]) tasksBySprint[sid] = [];
        tasksBySprint[sid].push(t);
    });

    // Process each month bucket
    const monthlyProgress = buckets.map(bucket => {
        const monthSprints = sprints.filter(s => {
            const start = s.startDate ? new Date(s.startDate) : new Date(s.createdAt || now);
            const end = s.endDate ? new Date(s.endDate) : new Date(start);
            // Overlaps if sprint starts before bucket ends AND ends after bucket starts
            return start <= bucket.end && end >= bucket.start;
        });

        if (monthSprints.length === 0) return null;

        // Group month sprints by Project
        const sprintsByProject = {};
        monthSprints.forEach(ms => {
            const pid = ms.project?.toString();
            if (!pid) return; // Skip orphaned sprints
            if (!sprintsByProject[pid]) sprintsByProject[pid] = [];
            sprintsByProject[pid].push(ms);
        });

        // Map to Project Data Structure
        const builtProjects = [];
        let monthCompletedPoints = 0;
        let monthTotalPoints = 0;

        for (const [projectId, projectSprints] of Object.entries(sprintsByProject)) {
            const projectDoc = projects.find(p => p._id.toString() === projectId);
            if (!projectDoc) continue;

            let projCompletedPts = 0;
            let projTotalPts = 0;
            let carryOverCount = 0;

            const builtSprints = projectSprints.map(sprint => {
                const sprintTasks = tasksBySprint[sprint._id.toString()] || [];
                
                const sprintTotalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
                const sprintCompletedPoints = sprintTasks
                    .filter(t => t.status === 'done')
                    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

                projTotalPts += sprintTotalPoints;
                projCompletedPts += sprintCompletedPoints;

                // Carry over detection
                const isOverdue = sprint.endDate && new Date(sprint.endDate) < now;
                const hasIncomplete = sprintTotalPoints > sprintCompletedPoints;
                if (isOverdue && hasIncomplete && sprint.status !== 'closed') {
                    carryOverCount++;
                }

                return {
                    sprintId: sprint._id.toString(),
                    sprintName: sprint.name || 'Unnamed Sprint',
                    status: (sprint.status || 'draft').toUpperCase(),
                    startDate: sprint.startDate,
                    endDate: sprint.endDate,
                    progress: sprintTotalPoints > 0 ? Math.round((sprintCompletedPoints / sprintTotalPoints) * 100) + '%' : '0%',
                    completedPoints: sprintCompletedPoints,
                    totalPoints: sprintTotalPoints,
                    tasks: sprintTasks.map(t => ({
                        taskId: t.key || t._id.toString(),
                        title: t.title,
                        points: t.storyPoints || 0,
                        status: (t.status || 'todo').toUpperCase(),
                        assignee: (t.assignedTo && t.assignedTo.length > 0)
                            ? t.assignedTo[0].name || t.assignedTo[0].email || 'Unassigned'
                            : 'Unassigned'
                    }))
                };
            });

            monthCompletedPoints += projCompletedPts;
            monthTotalPoints += projTotalPts;

            builtProjects.push({
                projectId: projectDoc.key,
                projectName: projectDoc.name,
                projectType: (projectDoc.type || 'scrum').toUpperCase(),
                origin: carryOverCount > 0 ? `${carryOverCount} carry-over sprint(s)` : 'On track',
                projectProgress: projTotalPts > 0 ? Math.round((projCompletedPts / projTotalPts) * 100) + '%' : '0%',
                totalSprints: builtSprints.length,
                sprints: builtSprints
            });
        }

        if (builtProjects.length === 0) return null;

        return {
            month: bucket.label,
            statusTag: `${builtProjects.length} Active Project${builtProjects.length !== 1 ? 's' : ''}`,
            totalPointsPlanned: monthTotalPoints,
            completedPoints: monthCompletedPoints,
            projects: builtProjects
        };
    });

    return monthlyProgress.filter(m => m !== null);
}

/**
 * 5. UNIFIED CHART TIMELINE (Replaces 2 & 3 for Stacked Bar)
 * Computes a single timeline breaking points into Completed, Ongoing, and Planned.
 */
async function buildUnifiedChartTimeline(pastMonths, futureMonths) {
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setMonth(rangeStart.getMonth() - pastMonths);
    const rangeEnd = new Date(now);
    rangeEnd.setMonth(rangeEnd.getMonth() + futureMonths);

    const buckets = generateMonthBuckets(rangeStart, rangeEnd);
    const teamCapacity = await getSystemCapacity();

    // Fetch all sprints and filter overlaps
    const sprints = await Sprint.find({}).lean();
    const overlappingSprints = sprints.filter(s => {
        const start = s.startDate ? new Date(s.startDate) : new Date(s.createdAt || now);
        const end = s.endDate ? new Date(s.endDate) : new Date(start);
        return start <= endOfMonth(rangeEnd) && end >= startOfMonth(rangeStart);
    });

    const sprintIds = overlappingSprints.map(s => s._id);
    const overlappingTasks = await Task.find({ sprint: { $in: sprintIds } }).lean();

    // Global backlog for burndown calculations
    const allRemainingTasks = await Task.find({ status: { $nin: ['done', 'completed'] } }).lean();
    const totalRemainingPoints = allRemainingTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const tasksBySprint = {};
    overlappingTasks.forEach(t => {
        const sid = t.sprint?.toString();
        if (sid) {
            if (!tasksBySprint[sid]) tasksBySprint[sid] = [];
            tasksBySprint[sid].push(t);
        }
    });

    return buckets.map(bucket => {
        // Find sprints perfectly overlapping this specific month bucket
        const monthSprints = overlappingSprints.filter(s => {
            const start = s.startDate ? new Date(s.startDate) : new Date(s.createdAt || now);
            const end = s.endDate ? new Date(s.endDate) : new Date(start);
            return start <= bucket.end && end >= bucket.start;
        });

        let completedPoints = 0;
        let ongoingPoints = 0;
        let plannedPoints = 0;
        let onTimeCount = 0;

        monthSprints.forEach(s => {
            const stasks = tasksBySprint[s._id.toString()] || [];
            const sprintStatus = (s.status || '').toLowerCase();
            
            const sprintTotalPts = stasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const sprintCompletedPts = stasks.filter(t => (t.status || '').toLowerCase() === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0);

            if (sprintTotalPts > 0 && sprintCompletedPts === sprintTotalPts) {
                onTimeCount++;
            }

            stasks.forEach(t => {
                const taskStatus = (t.status || '').toLowerCase();
                const pts = t.storyPoints || 0;

                if (taskStatus === 'done' || taskStatus === 'completed') {
                    completedPoints += pts;
                } else if (sprintStatus === 'future' || sprintStatus === 'draft') {
                    plannedPoints += pts;
                } else {
                    ongoingPoints += pts;
                }
            });
        });

        const onTimeDeliveryPercentage = monthSprints.length > 0 ? Math.round((onTimeCount / monthSprints.length) * 100) : 0;
        
        // Calculate a "Local Burndown" estimate for THIS month's throughput vs GLOBAL backlog
        // Total remaining points must be fetched once globally for efficiency or at least be consistent
        const estimatedBurndownMonths = completedPoints > 0 ? Math.ceil(totalRemainingPoints / completedPoints) : 0;

        return {
            month: bucket.label,
            completedPoints,
            ongoingPoints,
            plannedPoints,
            onTimeDeliveryPercentage,
            estimatedBurndownMonths,
            teamCapacity
        };
    });
}

module.exports = {
    buildKPIHeader,
    buildVelocityTrend,
    buildFutureCapacity,
    buildMonthlyProgress,
    buildUnifiedChartTimeline
};
