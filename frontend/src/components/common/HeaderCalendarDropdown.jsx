import React, { useState, useMemo } from 'react';
import { Dropdown, Button, Card, Tag, Empty, Space, List, Badge, Tooltip } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import './HeaderCalendarDropdown.css';

// Mock work items for today and upcoming
const workItems = [
    { id: 1, date: dayjs(), title: 'Complete API Integration', priority: 'high', status: 'in-progress' },
    { id: 2, date: dayjs(), title: 'Code Review Sprint Tasks', priority: 'medium', status: 'pending' },
    { id: 3, date: dayjs().add(1, 'day'), title: 'Frontend Testing', priority: 'high', status: 'pending' },
    { id: 4, date: dayjs().add(2, 'days'), title: 'Database Optimization', priority: 'medium', status: 'pending' },
    { id: 5, date: dayjs().add(3, 'days'), title: 'Team Standup', priority: 'low', status: 'pending' }
];

const HeaderCalendarDropdown = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(dayjs());

    const todayWorkItems = useMemo(() => {
        return workItems.filter(item => item.date.isSame(dayjs(), 'day'));
    }, []);

    const upcomingWorkItems = useMemo(() => {
        return workItems.filter(item => item.date.isAfter(dayjs(), 'day')).slice(0, 3);
    }, []);

    const getPriorityColor = (priority) => {
        const colors = { high: 'red', medium: 'orange', low: 'green' };
        return colors[priority] || 'default';
    };

    const getStatusIcon = (status) => {
        if (status === 'completed') return '✓';
        if (status === 'in-progress') return '⟳';
        return '●';
    };

    const miniCalendarDays = () => {
        const startDate = selectedDate.startOf('month').startOf('week');
        const endDate = selectedDate.endOf('month').endOf('week');
        const days = [];
        let currentDate = startDate.clone();

        while (currentDate.isBefore(endDate)) {
            days.push(currentDate.clone());
            currentDate = currentDate.add(1, 'day');
        }

        return days;
    };

    const calendarContent = (
        <div className="header-calendar-dropdown">
            {/* Mini Calendar */}
            <div className="mini-calendar">
                <div className="calendar-header">
                    <span className="month-year">{selectedDate.format('MMMM YYYY')}</span>
                    <div className="nav-buttons">
                        <Button
                            type="text"
                            size="small"
                            onClick={() => setSelectedDate(selectedDate.subtract(1, 'month'))}
                            icon="←"
                        />
                        <Button
                            type="text"
                            size="small"
                            onClick={() => setSelectedDate(dayjs())}
                        >
                            Today
                        </Button>
                        <Button
                            type="text"
                            size="small"
                            onClick={() => setSelectedDate(selectedDate.add(1, 'month'))}
                            icon="→"
                        />
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="weekdays">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={`weekday-${idx}`} className="weekday">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="days-grid">
                    {miniCalendarDays().map((day, idx) => {
                        const isCurrentMonth = day.month() === selectedDate.month();
                        const isToday = day.isSame(dayjs(), 'day');
                        const hasWork = workItems.some(item => item.date.isSame(day, 'day'));

                        return (
                            <div
                                key={idx}
                                className={`day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                                onClick={() => navigate('/dashboard/work-planner')}
                            >
                                <span className="day-number">{day.date()}</span>
                                {hasWork && <div className="work-indicator"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Today's Work */}
            <div className="work-section">
                <div className="section-header">
                    <ClockCircleOutlined /> Today
                    <Badge count={todayWorkItems.length} style={{ backgroundColor: '#1890ff' }} />
                </div>
                {todayWorkItems.length > 0 ? (
                    <List
                        size="small"
                        dataSource={todayWorkItems}
                        renderItem={(item) => (
                            <List.Item
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                onClick={() => navigate('/dashboard/work-planner')}
                            >
                                <Tooltip title={item.title}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                                        <span className="status-icon">{getStatusIcon(item.status)}</span>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.title}
                                        </span>
                                        <Tag color={getPriorityColor(item.priority)} style={{ fontSize: '10px', margin: 0 }}>
                                            {item.priority}
                                        </Tag>
                                    </div>
                                </Tooltip>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No work today" style={{ margin: '8px 0' }} />
                )}
            </div>

            {/* Upcoming Work */}
            <div className="work-section">
                <div className="section-header">
                    <CalendarOutlined /> Upcoming
                    <Badge count={upcomingWorkItems.length} style={{ backgroundColor: '#faad14' }} />
                </div>
                {upcomingWorkItems.length > 0 ? (
                    <List
                        size="small"
                        dataSource={upcomingWorkItems}
                        renderItem={(item) => (
                            <List.Item
                                style={{ padding: '6px 8px', fontSize: '11px' }}
                                onClick={() => navigate('/dashboard/work-planner')}
                            >
                                <Tooltip title={`${item.date.format('MMM DD')} - ${item.title}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                                        <Tag color="blue" style={{ fontSize: '10px', margin: 0, minWidth: '50px' }}>
                                            {item.date.format('MMM DD')}
                                        </Tag>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.title}
                                        </span>
                                    </div>
                                </Tooltip>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No upcoming work" style={{ margin: '8px 0' }} />
                )}
            </div>

            {/* Footer */}
            <div className="calendar-footer">
                <Button
                    type="primary"
                    block
                    size="small"
                    onClick={() => navigate('/dashboard/work-planner')}
                >
                    View Full Planner
                </Button>
            </div>
        </div>
    );

    return (
        <Dropdown
            popupRender={() => calendarContent}
            trigger={['click']}
            placement="bottomRight"
        >
            <Button
                type="text"
                icon={<CalendarOutlined style={{ fontSize: '18px' }} />}
                title="Work Planner"
                style={{
                    height: '40px',
                    width: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#262626'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(24, 144, 255, 0.08)';
                    e.currentTarget.style.color = '#1890ff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.12)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#262626';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                {todayWorkItems.length > 0 && (
                    <Badge
                        count={todayWorkItems.length}
                        style={{
                            backgroundColor: '#ff4d4f',
                            position: 'absolute',
                            top: -2,
                            right: -6
                        }}
                    />
                )}
            </Button>
        </Dropdown>
    );
};

export default HeaderCalendarDropdown;
