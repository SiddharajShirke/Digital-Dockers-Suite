import React, { useState, useMemo } from 'react';
import { Dropdown, Button, Tag, Empty, Badge, Tooltip } from 'antd';
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
                    <div className="calendar-work-list">
                        {todayWorkItems.map((item) => (
                            <div
                                key={item.id}
                                className="calendar-work-item"
                                onClick={() => navigate('/dashboard/work-planner')}
                                style={{ cursor: 'pointer', padding: '8px 4px' }}
                            >
                                <Tooltip title={item.title}>
                                    <div className="calendar-work-row">
                                        <span className="status-icon">{getStatusIcon(item.status)}</span>
                                        <span className="calendar-work-title">
                                            {item.title}
                                        </span>
                                        <Tag color={getPriorityColor(item.priority)} className="calendar-priority-tag">
                                            {item.priority}
                                        </Tag>
                                    </div>
                                </Tooltip>
                            </div>
                        ))}
                    </div>
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
                    <div className="calendar-work-list">
                        {upcomingWorkItems.map((item) => (
                            <div
                                key={item.id}
                                className="calendar-work-item compact"
                                onClick={() => navigate('/dashboard/work-planner')}
                                style={{ cursor: 'pointer', padding: '8px 4px' }}
                            >
                                <Tooltip title={`${item.date.format('MMM DD')} - ${item.title}`}>
                                    <div className="calendar-work-row">
                                        <Tag color="blue" className="calendar-date-tag">
                                            {item.date.format('MMM DD')}
                                        </Tag>
                                        <span className="calendar-work-title">
                                            {item.title}
                                        </span>
                                    </div>
                                </Tooltip>
                            </div>
                        ))}
                    </div>
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
                icon={<CalendarOutlined className="header-calendar-trigger-icon" />}
                title="Work Planner"
                className="header-calendar-trigger"
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
