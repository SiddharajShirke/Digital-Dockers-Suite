/**
 * Mock data generator for Jira-style dashboard
 * Generates realistic test data for "For You", Recent Activity, and Due Date features
 */

export const generateMockForYouData = () => {
    const now = new Date();

    
    // Assigned to You
    const assignedIssues = [
        {
            key: 'PROJ-101',
            title: 'Fix authentication flow in OAuth2 integration',
            status: 'in_progress',
            assignee: 'You',
            dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            key: 'PROJ-87',
            title: 'Design new dashboard layout for mobile',
            status: 'review',
            assignee: 'You',
            dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            key: 'PROJ-142',
            title: 'Optimize database query performance',
            status: 'todo',
            assignee: 'You',
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            key: 'PROJ-65',
            title: 'Write unit tests for API endpoints',
            status: 'in_progress',
            assignee: 'You',
            dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            key: 'PROJ-203',
            title: 'Update documentation for new features',
            status: 'todo',
            assignee: 'You',
            dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];

    // Recently Viewed
    const recentlyViewed = [
        {
            key: 'PROJ-45',
            title: 'API rate limiting implementation',
            viewedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            status: 'in_progress'
        },
        {
            key: 'PROJ-88',
            title: 'User profile customization feature',
            viewedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'review'
        },
        {
            key: 'PROJ-156',
            title: 'Security audit findings resolution',
            viewedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress'
        }
    ];

    // Recently Updated
    const recentlyUpdated = [
        {
            key: 'PROJ-98',
            title: 'Real-time notifications system',
            updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
            status: 'done'
        },
        {
            key: 'PROJ-112',
            title: 'Implement dark mode toggle',
            updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
            status: 'review'
        },
        {
            key: 'PROJ-77',
            title: 'Refactor component architecture',
            updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress'
        }
    ];

    return {
        assignedIssues,
        recentlyViewed,
        recentlyUpdated
    };
};

export const generateMockActivityData = () => {
    const now = new Date();
    const users = [
        { name: 'Sarah Chen', initials: 'SC', avatarColor: '#ff7a45' },
        { name: 'Marcus Johnson', initials: 'MJ', avatarColor: '#0052cc' },
        { name: 'Emma Davis', initials: 'ED', avatarColor: '#00875a' },
        { name: 'Alex Rodriguez', initials: 'AR', avatarColor: '#626f86' }
    ];

    const activities = [
        {
            type: 'status_changed',
            user: users[0],
            issueKey: 'PROJ-98',
            newStatus: 'done',
            timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString()
        },
        {
            type: 'comment_added',
            user: users[1],
            issueKey: 'PROJ-87',
            timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
            description: 'Added design review feedback'
        },
        {
            type: 'issue_updated',
            user: users[2],
            issueKey: 'PROJ-142',
            timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
            description: 'Updated task description'
        },
        {
            type: 'sprint_started',
            user: users[3],
            sprintName: 'Sprint 12',
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
            type: 'issue_moved',
            user: users[0],
            issueKey: 'PROJ-65',
            destination: 'In Review',
            timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
            type: 'issue_created',
            user: users[1],
            issueKey: 'PROJ-220',
            timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
        }
    ];

    return activities;
};

export const generateMockUpcomingTasks = () => {
    const now = new Date();

    const upcomingTasks = [
        {
            key: 'PROJ-101',
            title: 'Fix authentication flow in OAuth2 integration',
            dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            priority: 'high'
        },
        {
            key: 'PROJ-87',
            title: 'Design new dashboard layout for mobile',
            dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'review',
            priority: 'medium'
        },
        {
            key: 'PROJ-65',
            title: 'Write unit tests for API endpoints',
            dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            priority: 'medium'
        },
        {
            key: 'PROJ-50',
            title: 'Deploy to staging environment',
            dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'todo',
            priority: 'high'
        }
    ];

    const unscheduledTasks = [
        {
            key: 'PROJ-142',
            title: 'Optimize database query performance',
            status: 'todo',
            priority: 'medium'
        },
        {
            key: 'PROJ-203',
            title: 'Update documentation for new features',
            status: 'todo',
            priority: 'low'
        },
        {
            key: 'PROJ-167',
            title: 'Setup CI/CD pipeline',
            status: 'in_progress',
            priority: 'high'
        }
    ];

    return {
        upcomingTasks,
        unscheduledTasks
    };
};
