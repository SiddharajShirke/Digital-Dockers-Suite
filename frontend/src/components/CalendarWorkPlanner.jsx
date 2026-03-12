import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Space, Tag, Empty, Row, Col, DatePicker, Modal, Select, message, Tooltip, Popconfirm, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './CalendarWorkPlanner.css';

const CalendarWorkPlanner = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [workItems, setWorkItems] = useState([
        {
            id: 1,
            date: '2026-01-10',
            title: 'Complete API Integration',
            priority: 'high',
            status: 'in-progress',
            duration: '4h',
            assignee: 'You'
        },
        {
            id: 2,
            date: '2026-01-10',
            title: 'Code Review Sprint Tasks',
            priority: 'medium',
            status: 'pending',
            duration: '2h',
            assignee: 'John'
        },
        {
            id: 3,
            date: '2026-01-11',
            title: 'Frontend Testing',
            priority: 'high',
            status: 'completed',
            duration: '3h',
            assignee: 'Sarah'
        },
        {
            id: 4,
            date: '2026-01-12',
            title: 'Database Optimization',
            priority: 'medium',
            status: 'pending',
            duration: '5h',
            assignee: 'Mike'
        },
        {
            id: 5,
            date: '2026-01-13',
            title: 'Team Standup & Planning',
            priority: 'low',
            status: 'pending',
            duration: '1h',
            assignee: 'Team'
        }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        priority: 'medium',
        duration: '2h',
        assignee: ''
    });

    // Get work items for selected date
    const selectedDateStr = selectedDate.format('YYYY-MM-DD');
    const todayWorkItems = useMemo(() => {
        return workItems.filter(item => item.date === selectedDateStr);
    }, [workItems, selectedDateStr]);

    // Calculate work summary for month
    const monthWorkSummary = useMemo(() => {
        const month = selectedDate.format('YYYY-MM');
        const monthItems = workItems.filter(item => item.date.startsWith(month));
        return {
            total: monthItems.length,
            completed: monthItems.filter(i => i.status === 'completed').length,
            pending: monthItems.filter(i => i.status === 'pending').length,
            inProgress: monthItems.filter(i => i.status === 'in-progress').length
        };
    }, [workItems, selectedDate]);

    // Get days with work for calendar marking
    const daysWithWork = useMemo(() => {
        const days = {};
        workItems.forEach(item => {
            const date = item.date;
            if (!days[date]) days[date] = [];
            days[date].push(item);
        });
        return days;
    }, [workItems]);

    const handleAddWork = () => {
        if (!formData.title.trim()) {
            message.warning('Please enter work title');
            return;
        }

        const newWork = {
            id: Math.max(...workItems.map(i => i.id), 0) + 1,
            date: selectedDateStr,
            title: formData.title,
            priority: formData.priority,
            duration: formData.duration,
            status: 'pending',
            assignee: formData.assignee || 'You'
        };

        setWorkItems([...workItems, newWork]);
        setFormData({ title: '', priority: 'medium', duration: '2h', assignee: '' });
        setIsModalOpen(false);
        message.success(`Work added for ${selectedDate.format('MMM DD, YYYY')}`);
    };

    const handleDeleteWork = (id) => {
        setWorkItems(workItems.filter(item => item.id !== id));
        message.success('Work item removed');
    };

    const handleToggleStatus = (id) => {
        setWorkItems(workItems.map(item => {
            if (item.id === id) {
                const statuses = ['pending', 'in-progress', 'completed'];
                const currentIndex = statuses.indexOf(item.status);
                const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                return { ...item, status: nextStatus };
            }
            return item;
        }));
    };

    const getPriorityColor = (priority) => {
        const colors = { high: 'red', medium: 'orange', low: 'green' };
        return colors[priority] || 'default';
    };

    const getStatusIcon = (status) => {
        if (status === 'completed') return <CheckOutlined style={{ color: '#52c41a' }} />;
        if (status === 'in-progress') return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
        return <span style={{ color: '#999' }}>●</span>;
    };

    const renderCalendar = () => {
        const startDate = selectedDate.startOf('month').startOf('week');
        const endDate = selectedDate.endOf('month').endOf('week');
        const weeks = [];
        let currentDate = startDate.clone();

        while (currentDate.isBefore(endDate)) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const date = currentDate.clone();
                const dateStr = date.format('YYYY-MM-DD');
                const dayWorkItems = daysWithWork[dateStr] || [];
                const isSelected = date.format('YYYY-MM-DD') === selectedDateStr;
                const isCurrentMonth = date.month() === selectedDate.month();

                week.push(
                    <div
                        key={dateStr}
                        className={`calendar-day ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                        onClick={() => setSelectedDate(date)}
                    >
                        <div className="day-number">{date.date()}</div>
                        <div className="day-work">
                            {dayWorkItems.length > 0 && (
                                <Badge count={dayWorkItems.length} style={{ backgroundColor: '#1890ff' }} />
                            )}
                        </div>
                    </div>
                );
                currentDate.add(1, 'day');
            }
            weeks.push(
                <div key={`week-${currentDate.format('YYYY-MM-DD')}`} className="calendar-week">
                    {week}
                </div>
            );
        }

        return weeks;
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="calendar-work-planner">
            {/* Header */}
            <div className="planner-header">
                <div>
                    <h1>📅 Daily Work Planner</h1>
                    <p>Plan and track work on a day-by-day basis</p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setIsModalOpen(true)}
                >
                    Add Work
                </Button>
            </div>

            {/* Month Overview Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card className="summary-card">
                        <div className="summary-value">{monthWorkSummary.total}</div>
                        <div className="summary-label">Total Work Items</div>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="summary-card success">
                        <div className="summary-value">{monthWorkSummary.completed}</div>
                        <div className="summary-label">Completed</div>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="summary-card warning">
                        <div className="summary-value">{monthWorkSummary.inProgress}</div>
                        <div className="summary-label">In Progress</div>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="summary-card info">
                        <div className="summary-value">{monthWorkSummary.pending}</div>
                        <div className="summary-label">Pending</div>
                    </Card>
                </Col>
            </Row>

            {/* Calendar & Work Items Grid */}
            <Row gutter={[24, 24]}>
                {/* Calendar */}
                <Col xs={24} lg={14}>
                    <Card className="calendar-card" title={<span><CalendarOutlined /> {selectedDate.format('MMMM YYYY')}</span>}>
                        <div className="calendar-header">
                            <Button.Group>
                                <Button
                                    onClick={() => setSelectedDate(selectedDate.subtract(1, 'month'))}
                                >
                                    ← Prev
                                </Button>
                                <Button onClick={() => setSelectedDate(dayjs())}>Today</Button>
                                <Button
                                    onClick={() => setSelectedDate(selectedDate.add(1, 'month'))}
                                >
                                    Next →
                                </Button>
                            </Button.Group>
                        </div>

                        <div className="calendar-weekdays">
                            {weekDays.map(day => (
                                <div key={day} className="weekday">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="calendar-days">
                            {renderCalendar()}
                        </div>

                        <div className="calendar-legend">
                            <span><Badge color="#1890ff" text="Has work items" /></span>
                            <span><Badge color="#f5f5f5" text="No work scheduled" /></span>
                        </div>
                    </Card>
                </Col>

                {/* Selected Date Work Items */}
                <Col xs={24} lg={10}>
                    <Card className="work-items-card" title={<span><CalendarOutlined /> {selectedDate.format('dddd, MMMM DD, YYYY')}</span>}>
                        {todayWorkItems.length > 0 ? (
                            <div className="work-items-list">
                                {todayWorkItems.map(item => (
                                    <div key={item.id} className={`work-item ${item.status}`}>
                                        <div className="work-item-header">
                                            <div className="work-item-status">
                                                <button
                                                    className="status-btn"
                                                    onClick={() => handleToggleStatus(item.id)}
                                                    title="Click to change status"
                                                >
                                                    {getStatusIcon(item.status)}
                                                </button>
                                            </div>
                                            <div className="work-item-content">
                                                <div className="work-item-title">{item.title}</div>
                                                <div className="work-item-meta">
                                                    <Tag color={getPriorityColor(item.priority)}>
                                                        {item.priority}
                                                    </Tag>
                                                    <Tag>{item.duration}</Tag>
                                                    <Tag>👤 {item.assignee}</Tag>
                                                </div>
                                            </div>
                                            <Popconfirm
                                                title="Delete work item?"
                                                onConfirm={() => handleDeleteWork(item.id)}
                                                okText="Delete"
                                                cancelText="Cancel"
                                            >
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                />
                                            </Popconfirm>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No work scheduled"
                                style={{ marginTop: 20, marginBottom: 20 }}
                            >
                                <Button type="primary" onClick={() => setIsModalOpen(true)}>
                                    + Add Work
                                </Button>
                            </Empty>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Add Work Modal */}
            <Modal
                title={`Add Work for ${selectedDate.format('MMM DD, YYYY')}`}
                open={isModalOpen}
                onOk={handleAddWork}
                onCancel={() => setIsModalOpen(false)}
                width={500}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Work Title *</label>
                        <Input
                            placeholder="e.g., Complete API Integration"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Priority</label>
                        <Select
                            value={formData.priority}
                            onChange={(val) => setFormData({ ...formData, priority: val })}
                            options={[
                                { label: '🔴 High', value: 'high' },
                                { label: '🟠 Medium', value: 'medium' },
                                { label: '🟢 Low', value: 'low' }
                            ]}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Duration</label>
                        <Input
                            placeholder="e.g., 2h, 30m, 1.5h"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Assignee</label>
                        <Select
                            placeholder="Select assignee"
                            value={formData.assignee || undefined}
                            onChange={(val) => setFormData({ ...formData, assignee: val })}
                            options={[
                                { label: 'You', value: 'You' },
                                { label: 'John', value: 'John' },
                                { label: 'Sarah', value: 'Sarah' },
                                { label: 'Mike', value: 'Mike' },
                                { label: 'Team', value: 'Team' }
                            ]}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CalendarWorkPlanner;
