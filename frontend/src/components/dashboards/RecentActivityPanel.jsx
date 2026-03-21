import { Card, Avatar, Typography, Empty, Tag } from 'antd';
import { CheckCircleOutlined, EditOutlined, UserAddOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';

const { Text } = Typography;

const RecentActivityPanel = ({ activities, maxHeight = 400 }) => {
    const formatTime = (date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch {
            return 'recently';
        }
    };

    const getActivityDescription = (activity) => {
        switch (activity.type) {
            case 'issue_created':
                return `created ${activity.issueKey}`;
            case 'issue_updated':
                return `updated ${activity.issueKey}`;
            case 'comment_added':
                return `commented on ${activity.issueKey}`;
            case 'status_changed':
                return `moved ${activity.issueKey} to ${activity.newStatus}`;
            case 'sprint_started':
                return `started ${activity.sprintName || 'sprint'}`;
            case 'issue_moved':
                return `moved ${activity.issueKey} to ${activity.destination}`;
            default:
                return activity.description || 'activity';
        }
    };

    return (
        <Card
            className="activity-panel"
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📝</span>
                    <span style={{ fontSize: 14, fontWeight: '600' }}>Recent Activity</span>
                </div>
            }
            hoverable
        >
            <div style={{ maxHeight, overflowY: 'auto', paddingRight: 8 }}>
                {activities && activities.length > 0 ? (
                    <div>
                        {activities.map((activity, idx) => (
                            <div
                                key={idx}
                                className="activity-item"
                                style={{
                                    padding: '12px 0',
                                    borderBottom: idx < activities.length - 1 ? '1px solid #eaeef2' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <Avatar
                                        size={32}
                                        style={{
                                            backgroundColor: activity.user?.avatarColor || '#0052cc',
                                            fontSize: 12,
                                            fontWeight: '700',
                                            flexShrink: 0
                                        }}
                                    >
                                        {activity.user?.initials || '?'}
                                    </Avatar>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ marginBottom: 4 }}>
                                            <Text strong style={{ fontSize: 13 }}>{activity.user?.name || 'User'}</Text>
                                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                                {getActivityDescription(activity)}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {formatTime(activity.timestamp || new Date())}
                                            </Text>
                                            {activity.type === 'status_changed' && (
                                                <Tag
                                                    style={{
                                                        background: '#d1fae5',
                                                        color: '#00875a',
                                                        border: 'none',
                                                        fontSize: '10px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    {activity.newStatus?.replace('_', ' ').toUpperCase()}
                                                </Tag>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty description="No recent activity" size="small" style={{ padding: '20px 0' }} />
                )}
            </div>
        </Card>
    );
};

export default RecentActivityPanel;
