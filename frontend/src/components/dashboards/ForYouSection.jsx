import { Card, Tag, Typography, Row, Col, Button, Empty } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Text, Title } = Typography;

const ForYouSection = ({ assignedIssues }) => {
    const getStatusColor = (status) => {
        const statusColors = {
            'todo': '#f3f4f6',
            'in_progress': '#dbeafe',
            'review': '#fed7aa',
            'done': '#d1fae5'
        };
        return statusColors[status] || '#f3f4f6';
    };

    const getStatusTextColor = (status) => {
        const textColors = {
            'todo': '#4b5563',
            'in_progress': '#0052cc',
            'review': '#d97706',
            'done': '#00875a'
        };
        return textColors[status] || '#4b5563';
    };

    const IssueItem = ({ item }) => (
        <div style={{
            padding: '8px 0',
            borderBottom: '1px solid #eaeef2',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderRadius: '4px',
            paddingLeft: '6px',
            paddingRight: '6px',
            marginLeft: '-6px',
            marginRight: '-6px'
        }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f8fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text
                    style={{
                        margin: 0,
                        background: '#dbeafe',
                        color: '#0052cc',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        flexShrink: 0
                    }}
                >
                    {item.key || 'TASK'}
                </Text>
                <Text ellipsis style={{ maxWidth: 150, fontSize: '12px', fontWeight: '500', flex: 1 }}>
                    {item.title}
                </Text>
            </div>
            <div style={{
                background: getStatusColor(item.status),
                color: getStatusTextColor(item.status),
                padding: '3px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '600',
                display: 'inline-block'
            }}>
                {item.status?.replace('_', ' ').toUpperCase() || 'TODO'}
            </div>
        </div>
    );

    return (
        <Row gutter={[24, 24]}>
            {/* Assigned to You */}
            <Col xs={24}>
                <Card
                    className="for-you-card"
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FireOutlined style={{ color: '#ff5630', fontSize: 13 }} />
                            <Text strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned to You</Text>
                        </div>
                    }
                    style={{
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0'
                    }}
                    styles={{ body: { padding: '10px' } }}
                >
                    {assignedIssues && assignedIssues.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                            {assignedIssues.map((item, idx) => (
                                <div key={idx} style={{ padding: '10px', backgroundColor: '#f6f8fa', borderRadius: '6px', border: '1px solid #eaeef2' }}>
                                    <IssueItem item={item} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            description={
                                <span>You're all caught up! Check the <Link to="/dashboard/backlog">Backlog</Link> for new work.</span>
                            }
                            size="small"
                            style={{ padding: '16px 0' }}
                        />
                    )}
                </Card>
            </Col>
        </Row>
    );
};

export default ForYouSection;
