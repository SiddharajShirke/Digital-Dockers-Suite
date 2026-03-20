/**
 * Monthly Progress Data Structure & Utilities
 * Tracks planned vs completed work on a month-by-month basis
 */

/**
 * Generate mock monthly progress data
 * Shows what was planned, completed, and carried over each month
 */
export const generateMonthlyProgressData = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Helper to create month key
    const getMonthKey = (monthOffset) => {
        const d = new Date(currentYear, currentMonth + monthOffset, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // Helper to get month display name
    const getMonthDisplay = (monthOffset) => {
        const d = new Date(currentYear, currentMonth + monthOffset, 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return {
        months: [
            {
                key: getMonthKey(-3),
                display: getMonthDisplay(-3),
                isPast: true,
                planned: [
                    {
                        id: 'epic-1',
                        name: 'Authentication System',
                        storyPoints: 8,
                        completed: true,
                        assignee: 'John Doe',
                        completedDate: '2025-10-15'
                    },
                    {
                        id: 'epic-2',
                        name: 'User Onboarding Flow',
                        storyPoints: 5,
                        completed: true,
                        assignee: 'Jane Smith',
                        completedDate: '2025-10-20'
                    },
                    {
                        id: 'epic-3',
                        name: 'Dashboard UI Components',
                        storyPoints: 8,
                        completed: true,
                        assignee: 'Mike Johnson',
                        completedDate: '2025-10-25'
                    }
                ],
                carried_over: [],
                notes: 'Strong start. Team velocity: 21 points'
            },
            {
                key: getMonthKey(-2),
                display: getMonthDisplay(-2),
                isPast: true,
                planned: [
                    {
                        id: 'epic-4',
                        name: 'Real-time Notifications',
                        storyPoints: 8,
                        completed: true,
                        assignee: 'Sarah Wilson',
                        completedDate: '2025-11-10'
                    },
                    {
                        id: 'epic-5',
                        name: 'Analytics Dashboard',
                        storyPoints: 13,
                        completed: false,
                        assignee: 'Bob Harris',
                        plannedDate: '2025-11-15'
                    }
                ],
                carried_over: [
                    {
                        id: 'epic-5',
                        name: 'Analytics Dashboard',
                        storyPoints: 13,
                        reason: 'Scope increased due to stakeholder feedback'
                    }
                ],
                notes: 'Analytics pushed due to requirement changes. 8/21 points completed (38%)'
            },
            {
                key: getMonthKey(-1),
                display: getMonthDisplay(-1),
                isPast: true,
                planned: [
                    {
                        id: 'epic-5',
                        name: 'Analytics Dashboard',
                        storyPoints: 13,
                        completed: true,
                        assignee: 'Bob Harris',
                        completedDate: '2025-12-18'
                    },
                    {
                        id: 'epic-6',
                        name: 'Export & Reporting',
                        storyPoints: 5,
                        completed: true,
                        assignee: 'Alice Brown',
                        completedDate: '2025-12-22'
                    },
                    {
                        id: 'epic-7',
                        name: 'Performance Optimization',
                        storyPoints: 8,
                        completed: false,
                        assignee: 'Charlie Davis',
                        plannedDate: '2025-12-28'
                    }
                ],
                carried_over: [
                    {
                        id: 'epic-7',
                        name: 'Performance Optimization',
                        storyPoints: 8,
                        reason: 'Complex database optimization required'
                    }
                ],
                notes: 'Holiday slowdown. Completed 18/26 points (69%)'
            },
            {
                key: getMonthKey(0),
                display: getMonthDisplay(0),
                isPast: false,
                planned: [
                    {
                        id: 'epic-7',
                        name: 'Performance Optimization',
                        storyPoints: 8,
                        completed: false,
                        status: 'IN_PROGRESS',
                        assignee: 'Charlie Davis',
                        progress: 60
                    },
                    {
                        id: 'epic-8',
                        name: 'Mobile Responsive Design',
                        storyPoints: 13,
                        completed: false,
                        status: 'IN_PROGRESS',
                        assignee: 'Diana Prince',
                        progress: 40
                    },
                    {
                        id: 'epic-9',
                        name: 'API Rate Limiting',
                        storyPoints: 5,
                        completed: false,
                        status: 'PLANNED',
                        assignee: 'Eric Roberts'
                    }
                ],
                carried_over: [],
                notes: 'Current month. On track for 26 points completion'
            },
            {
                key: getMonthKey(1),
                display: getMonthDisplay(1),
                isPast: false,
                planned: [
                    {
                        id: 'epic-10',
                        name: 'Advanced Search Filters',
                        storyPoints: 8,
                        status: 'PLANNED',
                        assignee: 'Fiona Green'
                    },
                    {
                        id: 'epic-11',
                        name: 'User Preferences & Settings',
                        storyPoints: 5,
                        status: 'PLANNED',
                        assignee: 'George Lee'
                    },
                    {
                        id: 'epic-12',
                        name: 'Email Notification System',
                        storyPoints: 8,
                        status: 'PLANNED',
                        assignee: 'Hannah Martinez'
                    }
                ],
                carried_over: [],
                notes: 'Planned: 21 story points'
            },
            {
                key: getMonthKey(2),
                display: getMonthDisplay(2),
                isPast: false,
                planned: [
                    {
                        id: 'epic-13',
                        name: 'Third-party Integrations',
                        storyPoints: 13,
                        status: 'PLANNED',
                        assignee: 'Isaac Cohen'
                    },
                    {
                        id: 'epic-14',
                        name: 'Admin Dashboard',
                        storyPoints: 8,
                        status: 'PLANNED',
                        assignee: 'Julia Stewart'
                    }
                ],
                carried_over: [],
                notes: 'Planned: 21 story points'
            }
        ]
    };
};

/**
 * Calculate monthly progress metrics
 */
export const calculateMonthlyMetrics = (month) => {
    const plannedPoints = month.planned.reduce((sum, item) => sum + item.storyPoints, 0);
    const completedPoints = month.planned
        .filter(item => item.completed)
        .reduce((sum, item) => sum + item.storyPoints, 0);
    const inProgressPoints = month.planned
        .filter(item => item.status === 'IN_PROGRESS')
        .reduce((sum, item) => sum + item.storyPoints, 0);

    const completionPercentage = plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0;

    return {
        plannedPoints,
        completedPoints,
        inProgressPoints,
        remainingPoints: plannedPoints - completedPoints - inProgressPoints,
        completionPercentage,
        taskCount: month.planned.length,
        completedCount: month.planned.filter(item => item.completed).length,
        carriedOverCount: month.carried_over.length
    };
};

/**
 * Generate AI insights for monthly trends
 */
export const generateMonthlyAIInsights = (monthsData) => {
    const insights = [];

    for (let i = 0; i < monthsData.months.length; i++) {
        const month = monthsData.months[i];
        const metrics = calculateMonthlyMetrics(month);

        if (month.isPast && i > 0) {
            const prevMonth = monthsData.months[i - 1];
            const prevMetrics = calculateMonthlyMetrics(prevMonth);

            // Velocity trend
            if (metrics.completedPoints < prevMetrics.completedPoints * 0.8) {
                insights.push({
                    month: month.key,
                    type: 'warning',
                    message: `Velocity dip: ${metrics.completedPoints} vs ${prevMetrics.completedPoints} points. Check for blockers.`
                });
            }

            // Carried over tasks
            if (month.carried_over.length > 0) {
                const totalCarried = month.carried_over.reduce((sum, item) => sum + item.storyPoints, 0);
                insights.push({
                    month: month.key,
                    type: 'info',
                    message: `${month.carried_over.length} task(s) (${totalCarried} points) moved to next month.`
                });
            }

            // Strong performance
            if (metrics.completionPercentage >= 80) {
                insights.push({
                    month: month.key,
                    type: 'success',
                    message: `${metrics.completionPercentage}% completion rate. Strong execution!`
                });
            }
        }

        // Current & future month insights
        if (!month.isPast) {
            if (metrics.inProgressPoints > 0) {
                const progressAvg = month.planned
                    .filter(item => item.status === 'IN_PROGRESS')
                    .reduce((sum, item) => sum + (item.progress || 0), 0) / 
                    month.planned.filter(item => item.status === 'IN_PROGRESS').length;
                
                insights.push({
                    month: month.key,
                    type: 'info',
                    message: `${metrics.inProgressPoints} points in progress (${Math.round(progressAvg)}% avg).`
                });
            }
        }
    }

    return insights;
};

/**
 * Get velocity trend (completed points over last N months)
 */
export const getVelocityTrend = (monthsData, months = 3) => {
    const pastMonths = monthsData.months.filter(m => m.isPast).slice(-months);
    return pastMonths.map(month => ({
        month: month.display,
        velocity: calculateMonthlyMetrics(month).completedPoints
    }));
};

/**
 * Calculate team capacity planning for future months
 */
export const calculateCapacityUtilization = (monthsData) => {
    const avgVelocity = monthsData.months
        .filter(m => m.isPast)
        .reduce((sum, m) => sum + calculateMonthlyMetrics(m).completedPoints, 0) /
        monthsData.months.filter(m => m.isPast).length;

    const futureMonths = monthsData.months.filter(m => !m.isPast);
    return {
        averageVelocity: Math.round(avgVelocity),
        futureCapacity: futureMonths.map(month => ({
            month: month.display,
            plannedPoints: month.planned.reduce((sum, item) => sum + item.storyPoints, 0),
            capacityUtilization: Math.round((month.planned.reduce((sum, item) => sum + item.storyPoints, 0) / avgVelocity) * 100)
        }))
    };
};
