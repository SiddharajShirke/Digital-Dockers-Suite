import { Card, Row, Col, Tag, Space, Tooltip, Empty } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './EpicTimeline.css';

const EpicTimeline = ({ epics, timeRange }) => {
    if (!epics || epics.length === 0) {
        return <Empty description="No epics to display" />;
    }

    // Calculate month range for timeline
    const now = dayjs();
    const getMonthRange = () => {
        let start, end;

        if (timeRange === '6months') {
            start = now.startOf('month');
            end = now.add(6, 'months').endOf('month');
        } else if (timeRange === '12months') {
            start = now.startOf('month');
            end = now.add(12, 'months').endOf('month');
        } else {
            // All time
            const dates = epics.flatMap(e => [
                dayjs(e.start_date + '-01'),
                dayjs(e.end_date + '-01')
            ]);
            start = dayjs.min(...dates).startOf('month');
            end = dayjs.max(...dates).endOf('month');
        }

        return { start, end };
    };

    const { start: startMonth, end: endMonth } = getMonthRange();
    const monthsDiff = endMonth.diff(startMonth, 'months');

    // Generate month headers
    const months = [];
    for (let i = 0; i <= monthsDiff; i++) {
        months.push(startMonth.add(i, 'months'));
    }

    // Status colors
    const statusColors = {
        PLANNED: '#8c8c8c',
        IN_PROGRESS: '#1890ff',
        DONE: '#52c41a'
    };

    const statusLabels = {
        PLANNED: 'Planned',
        IN_PROGRESS: 'In Progress',
        DONE: 'Done'
    };

    // Calculate bar position and width
    const calculateBarStyle = (epic) => {
        const epicStart = dayjs(epic.start_date + '-01');
        const epicEnd = dayjs(epic.end_date + '-01').add(1, 'months');

        const startOffset = epicStart.diff(startMonth, 'months', true);
        const duration = epicEnd.diff(epicStart, 'months', true);

        const leftPercent = (startOffset / monthsDiff) * 100;
        const widthPercent = (duration / monthsDiff) * 100;

        return {
            left: `${Math.max(0, leftPercent)}%`,
            width: `${Math.max(2, widthPercent)}%`
        };
    };

    return (
        <div className="epic-timeline-container">
            {/* Timeline Header */}
            <div className="timeline-header">
                <div className="epic-name-column">Epic Name</div>
                <div className="timeline-months">
                    {months.map((month, idx) => (
                        <div key={idx} className="month-header">
                            <span className="month-name">{month.format('MMM')}</span>
                            <span className="year-name">{month.format('YY')}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Epic Rows */}
            {epics.map((epic) => (
                <Card
                    key={epic._id}
                    className="epic-row"
                    style={{ marginBottom: 16 }}
                >
                    <Row gutter={[16, 0]} align="middle">
                        {/* Epic Info */}
                        <Col xs={24} md={6} className="epic-info">
                            <div className="epic-title">{epic.name}</div>
                            <Space size="small" style={{ marginTop: 8 }}>
                                <Tag
                                    color={statusColors[epic.status]}
                                    style={{ margin: 0 }}
                                >
                                    {statusLabels[epic.status]}
                                </Tag>
                            </Space>
                            {epic.description && (
                                <p className="epic-description">{epic.description}</p>
                            )}
                            {epic.owner && (
                                <div className="epic-owner">
                                    <UserOutlined /> {epic.owner}
                                </div>
                            )}
                        </Col>

                        {/* Timeline Bar */}
                        <Col xs={24} md={18} className="epic-timeline">
                            <div className="timeline-track">
                                <div
                                    className="epic-bar"
                                    style={{
                                        ...calculateBarStyle(epic),
                                        backgroundColor: statusColors[epic.status]
                                    }}
                                >
                                    <Tooltip title={`${epic.start_date} → ${epic.end_date}`}>
                                        <span className="bar-label">
                                            <CalendarOutlined /> {epic.start_date}
                                        </span>
                                    </Tooltip>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card>
            ))}
        </div>
    );
};

export default EpicTimeline;
