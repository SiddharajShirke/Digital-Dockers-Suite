import React from 'react';
import { Card, Progress, Typography, Divider } from 'antd';
import { BulbOutlined, WarningOutlined } from '@ant-design/icons';
import SprintCard from './SprintCard';

const { Title, Text } = Typography;

/**
 * MonthColumn Component
 * Represents a vertical Kanban column for a specific month in the roadmap.
 * Contains "COMPLETED", "PLANNED / IN PROGRESS", and "CARRIED OVER" sections.
 */
const MonthColumn = ({ monthData, aiInsight }) => {
    const { 
        month, 
        totalPointsPlanned = 0, 
        completedPoints = 0, 
        projects = [] 
    } = monthData;

    // Calculate overall month progress
    const progressPercent = totalPointsPlanned > 0 
        ? Math.round((completedPoints / totalPointsPlanned) * 100) 
        : 0;

    let progressColor = '#1890ff'; // Blue default
    if (progressPercent === 100) progressColor = '#52c41a'; // Green finished
    else if (progressPercent < 50 && new Date(month) < new Date()) progressColor = '#faad14'; // Yellow warning for past months

    // Extract all sprints from all projects in this month
    const allSprints = [];
    projects.forEach(p => {
        (p.sprints || []).forEach(s => {
            allSprints.push({ ...s, projectName: p.projectName, projectOrigin: p.origin });
        });
    });

    // Categorize sprints
    const completedSprints = allSprints.filter(s => 
        s.status === 'CLOSED' || parseInt(s.progress) === 100
    );
    
    // Sprint carries over if its project origin notes "carry-over" OR it has incomplete points and its endDate is past.
    // The backend `project.origin` flag sets "X carry-over sprint(s)" if true.
    const carriedOverSprints = allSprints.filter(s => {
        if (completedSprints.includes(s)) return false;
        
        const isOverdue = s.endDate && new Date(s.endDate) < new Date();
        const hasIncomplete = parseInt(s.progress || 0) < 100;
        return (isOverdue && hasIncomplete && s.status !== 'CLOSED') || (s.projectOrigin && s.projectOrigin.includes('carry-over'));
    });

    const plannedSprints = allSprints.filter(s => 
        !completedSprints.includes(s) && !carriedOverSprints.includes(s)
    );
    const totalSprints = allSprints.length;

    return (
        <Card className="month-column-card" style={{ borderTop: `4px solid ${progressColor}` }}>
            <div className="month-header">
                <div className="month-kicker">Monthly execution snapshot</div>
                <div className="month-title-row">
                    <Title level={4} style={{ margin: 0 }}>{month}</Title>
                    <div className="month-badge" style={{ backgroundColor: progressColor }}>
                        {projects.length} Projects
                    </div>
                </div>
                
                <div className="month-progress-text">
                    <Text strong style={{ color: progressColor, fontSize: 16 }}>
                        {progressPercent}%
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>Completed</Text>
                </div>

                <div className="month-points-info">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {completedPoints} / {totalPointsPlanned} story points delivered
                    </Text>
                </div>

                <Progress 
                    percent={progressPercent} 
                    showInfo={false} 
                    strokeColor={progressColor}
                    className="month-progress-bar" 
                />

                <div className="month-stats-grid">
                    <div className="month-stat-tile">
                        <span className="month-stat-label">Projects</span>
                        <span className="month-stat-value">{projects.length}</span>
                    </div>
                    <div className="month-stat-tile">
                        <span className="month-stat-label">Sprints</span>
                        <span className="month-stat-value">{totalSprints}</span>
                    </div>
                    <div className="month-stat-tile">
                        <span className="month-stat-label">Completed</span>
                        <span className="month-stat-value">{completedPoints} pts</span>
                    </div>
                </div>
            </div>

            {aiInsight && (
                <div className="month-insight-box">
                    <div className="month-insight-title">
                        <BulbOutlined />
                        <span>AI insight</span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {aiInsight}
                    </Text>
                </div>
            )}

            <div className="month-body-scroll">
                {completedSprints.length > 0 && (
                    <div className="sprint-section">
                        <Divider titlePlacement="start" className="section-divider">
                            <span className="section-divider-label section-divider-label-completed">
                                COMPLETED ({completedSprints.length})
                            </span>
                        </Divider>
                        <div className="sprint-cards-container">
                            {completedSprints.map((sprint, idx) => (
                                <SprintCard key={`complete-${idx}`} sprint={sprint} type="completed" />
                            ))}
                        </div>
                    </div>
                )}

                {plannedSprints.length > 0 && (
                    <div className="sprint-section">
                        <Divider titlePlacement="start" className="section-divider">
                            <span className="section-divider-label section-divider-label-active">
                                PLANNED & ACTIVE ({plannedSprints.length})
                            </span>
                        </Divider>
                        <div className="sprint-cards-container">
                            {plannedSprints.map((sprint, idx) => (
                                <SprintCard key={`planned-${idx}`} sprint={sprint} type="in_progress" />
                            ))}
                        </div>
                    </div>
                )}

                {carriedOverSprints.length > 0 && (
                    <div className="sprint-section carry-over-section">
                        <Divider titlePlacement="start" className="section-divider">
                            <span className="section-divider-label section-divider-label-carry">
                                <WarningOutlined style={{ marginRight: 4 }} /> CARRIED OVER ({carriedOverSprints.length})
                            </span>
                        </Divider>
                        <div className="sprint-cards-container">
                            {carriedOverSprints.map((sprint, idx) => (
                                <SprintCard key={`carried-${idx}`} sprint={sprint} type="carried_over" />
                            ))}
                        </div>
                    </div>
                )}

                {allSprints.length === 0 && (
                    <div className="empty-month-state">
                        <Text type="secondary">No sprints scheduled</Text>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MonthColumn;
