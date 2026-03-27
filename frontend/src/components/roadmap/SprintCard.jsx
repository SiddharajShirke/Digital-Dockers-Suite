import React, { useState } from 'react';
import { Card, Tag, Progress, Collapse, Avatar, Typography } from 'antd';
import { 
    CheckCircleOutlined, ThunderboltOutlined, ClockCircleOutlined, 
    WarningOutlined, RightOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * SprintCard Component
 * Represents a specific sprint (or epic) inside the MonthColumn.
 * Clicking it expands to show the underlying tasks.
 */
const SprintCard = ({ sprint, type }) => {
    // Type styling ('completed', 'in_progress', 'carried_over')
    let borderLeftColor = '#d9d9d9';
    let icon = <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    let statusText = sprint.status || 'PLANNED';
    let statusColor = 'default';

    if (type === 'completed' || sprint.status === 'CLOSED' || parseInt(sprint.progress) === 100) {
        borderLeftColor = '#52c41a'; // Green
        icon = <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        statusText = 'DONE';
        statusColor = 'success';
    } else if (type === 'carried_over') {
        borderLeftColor = '#faad14'; // Yellow
        icon = <WarningOutlined style={{ color: '#faad14' }} />;
        statusColor = 'warning';
    } else if (sprint.status === 'ACTIVE') {
        borderLeftColor = '#1890ff'; // Blue
        icon = <ThunderboltOutlined style={{ color: '#1890ff' }} />;
        statusColor = 'processing';
    }

    const HeaderContent = (
        <div className="sprint-card-header">
            <div className="sprint-card-title-row">
                <Text strong className="sprint-title">{sprint.sprintName || 'Unnamed Sprint'}</Text>
                <span className="sprint-points-badge">{sprint.totalPoints}pt</span>
            </div>
            <div className="sprint-card-meta">
                <Tag color={statusColor} bordered={false} className="sprint-card-status">{statusText}</Tag>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Progress 
                        percent={parseInt(sprint.progress) || 0} 
                        steps={5} 
                        size="small" 
                        showInfo={false} 
                        strokeColor={borderLeftColor}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>{sprint.progress}</Text>
                </div>
            </div>
        </div>
    );

    // If no tasks, we still show the card, just not expandable or empty content
    const taskCount = sprint.tasks?.length || 0;

    return (
        <div className="sprint-card-wrapper" style={{ borderLeft: `4px solid ${borderLeftColor}` }}>
            <Collapse
                ghost
                expandIconPosition="end"
                expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} style={{ color: '#bfbfbf', fontSize: 12 }} />}
                items={[{
                    key: '1',
                    label: HeaderContent,
                    children: (
                        <div className="sprint-tasks-list">
                            {taskCount > 0 ? (
                                sprint.tasks.map((task, idx) => (
                                    <div key={idx} className="task-mini-row">
                                        <div className="task-mini-main">
                                            <span className="task-mini-id">{task.taskId}</span>
                                            <span className="task-mini-title">{task.title}</span>
                                        </div>
                                        <div className="task-mini-meta">
                                            <Tag color="blue" bordered={false} style={{ margin: 0, fontSize: 10 }}>{task.points}pt</Tag>
                                            <Avatar size={20} style={{ backgroundColor: '#f0f0f0', color: '#595959', fontSize: 10, marginLeft: 4 }}>
                                                {task.assignee ? task.assignee.substring(0, 1).toUpperCase() : '?'}
                                            </Avatar>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>No tasks attached to this sprint.</Text>
                            )}
                        </div>
                    )
                }]}
            />
        </div>
    );
};

export default SprintCard;
