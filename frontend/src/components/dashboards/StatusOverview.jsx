import { Card, Row, Col, Typography, Empty, Progress, Skeleton, Space, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, BgColorsOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const StatusOverview = ({ stats }) => {
    if (!stats) {
        return (
            <Card
                title="📊 Status Overview"
                style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0'
                }}
            >
                <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
        );
    }

    const backlogCount = stats.statusBreakdown?.todo || 0;
    const inProgressCount = stats.statusBreakdown?.in_progress || 0;
    const reviewCount = stats.statusBreakdown?.review || 0;
    const doneCount = stats.statusBreakdown?.done || 0;
    const totalCount = backlogCount + inProgressCount + reviewCount + doneCount;

    // Fallback: if total is 0 but we have sprint data, calculate from sprint
    const displayTotalCount = totalCount > 0 ? totalCount : (stats.totalTasks || 0);
    const displayDoneCount = totalCount > 0 ? doneCount : (stats.issuesDone || 0);
    const completionRate = displayTotalCount > 0 ? Math.round((displayDoneCount / displayTotalCount) * 100) : (stats.sprintProgress || 0);

    // Status breakdown with color coding
    const statusRows = [
        {
            label: 'To Do',
            count: backlogCount,
            color: '#dfe1e6',
            textColor: '#626f86',
            icon: '●'
        },
        {
            label: 'In Progress',
            count: inProgressCount,
            color: '#0052cc',
            textColor: '#0052cc',
            icon: '●'
        },
        {
            label: 'In Review',
            count: reviewCount,
            color: '#ff5630',
            textColor: '#ff5630',
            icon: '●'
        },
        {
            label: 'Done',
            count: doneCount,
            color: '#00875a',
            textColor: '#00875a',
            icon: '●'
        }
    ];

    const metrics = [
        {
            label: 'Total Issues',
            value: displayTotalCount,
            icon: FileTextOutlined,
            color: '#0052cc'
        },
        {
            label: 'Done',
            value: displayDoneCount,
            icon: CheckCircleOutlined,
            color: '#00875a'
        },
        {
            label: 'In Progress',
            value: inProgressCount,
            icon: ClockCircleOutlined,
            color: '#0052cc'
        }
    ];

    const getProgressColor = (rate) => {
        if (rate >= 80) return '#00875a';
        if (rate >= 50) return '#0052cc';
        if (rate >= 25) return '#ffab00';
        return '#ff5630';
    };

    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileTextOutlined style={{ fontSize: 13 }} />
                    <Text strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Status Overview
                    </Text>
                </div>
            }
            style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderRadius: 8,
                border: '1px solid #f0f0f0'
            }}
            styles={{ body: { padding: '10px' } }}
        >
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">

                {/* SECTION 1: Sprint Completion */}
                <div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tooltip title="Percentage of tasks marked as done in the current sprint">
                            <Text strong style={{ fontSize: 11, color: '#262626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Sprint Progress
                            </Text>
                        </Tooltip>
                        <Text style={{ fontSize: 20, fontWeight: 700, color: getProgressColor(completionRate) }}>
                            {completionRate}%
                        </Text>
                    </div>
                    <Progress
                        percent={completionRate}
                        strokeColor={getProgressColor(completionRate)}
                        format={() => null}
                        status={completionRate === 100 ? 'success' : 'normal'}
                        size={{ height: 6 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
                        {displayDoneCount} of {displayTotalCount} issues completed
                    </Text>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#f0f0f0' }}></div>

                {/* SECTION 2: Status Breakdown */}
                <div>
                    <Text strong style={{ fontSize: 11, color: '#262626', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
                        Status Distribution
                    </Text>
                    <Space orientation="vertical" style={{ width: '100%' }} size="small">
                        {statusRows.map((status) => {
                            const percentage = totalCount > 0 ? Math.round((status.count / totalCount) * 100) : 0;
                            return (
                                <Tooltip
                                    key={status.label}
                                    title={`${status.count} issues • ${percentage}% of total`}
                                >
                                    <div
                                        style={{
                                            padding: '10px 0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            borderRadius: 4,
                                            paddingLeft: 8,
                                            paddingRight: 8,
                                            marginLeft: -8,
                                            marginRight: -8,
                                            ':hover': {
                                                backgroundColor: '#fafafa'
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#fafafa';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ color: status.color, fontSize: 12, fontWeight: 600 }}>
                                                {status.icon}
                                            </span>
                                            <Text style={{ fontSize: 12, fontWeight: 500, color: '#262626', minWidth: 80 }}>
                                                {status.label}
                                            </Text>
                                            <Text strong style={{ fontSize: 12, color: status.textColor, minWidth: 30 }}>
                                                {status.count}
                                            </Text>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    height: '4px',
                                                    backgroundColor: '#f0f0f0',
                                                    borderRadius: 2,
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        backgroundColor: status.color,
                                                        width: `${percentage}%`,
                                                        transition: 'width 0.3s ease'
                                                    }}></div>
                                                </div>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 11, minWidth: 30, textAlign: 'right' }}>
                                                {percentage}%
                                            </Text>
                                        </div>
                                    </div>
                                </Tooltip>
                            );
                        })}
                    </Space>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#f0f0f0' }}></div>

                {/* SECTION 3: Key Metrics */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#262626', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 10 }}>
                        Key Metrics
                    </Text>
                    <Row gutter={[10, 10]}>
                        {metrics.map((metric) => {
                            const Icon = metric.icon;
                            return (
                                <Col xs={24} sm={8} key={metric.label}>
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            backgroundColor: '#fafafa',
                                            borderRadius: 8,
                                            border: '1px solid #f0f0f0',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                                            e.currentTarget.style.borderColor = '#d9d9d9';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#fafafa';
                                            e.currentTarget.style.borderColor = '#f0f0f0';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <Icon style={{ color: metric.color, fontSize: 13 }} />
                                            <Text type="secondary" style={{ fontSize: 10, fontWeight: 500 }}>
                                                {metric.label}
                                            </Text>
                                        </div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: metric.color, lineHeight: 1 }}>
                                            {metric.value}
                                        </div>
                                    </div>
                                </Col>
                            );
                        })}
                    </Row>
                </div>

            </Space>
        </Card>
    );
};

export default StatusOverview;

