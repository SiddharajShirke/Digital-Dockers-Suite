import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, List, Avatar, Progress, Tag, Spin, Empty, message, Alert, Modal, theme } from 'antd';
import { RiseOutlined, FireOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useProject } from '../../context/ProjectContext';
import projectStatsService from '../../services/projectStatsService';
import searchService from '../../services/searchService';
import ForYouSection from './ForYouSection';
import UpcomingWorkCard from './UpcomingWorkCard';
import StatusOverview from './StatusOverview';
import TypesOfWorkCard from './TypesOfWorkCard';
import SprintBurndownChart from '../charts/SprintBurndownChart';
import SmartReassignmentDashboard from './SmartReassignmentDashboard';
import './dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const { Title, Text } = Typography;

const ProjectDashboard = () => {
    const { currentProject, sprints } = useProject();
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    // New state for Jira-style features
    const [forYouData, setForYouData] = useState(null);
    const [upcomingData, setUpcomingData] = useState(null);
    // Smart Reassignment modal state
    const [showReassignmentModal, setShowReassignmentModal] = useState(false);

    useEffect(() => {
        if (currentProject?._id) {
            loadDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProject, sprints]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load all data in parallel from database/API
            const [statsData, assignedTasks] = await Promise.all([
                projectStatsService.getProjectStats(currentProject._id),
                searchService.getAssignedToMe(10)
            ]);

            setStats(statsData);

            // Build ForYou section data from real database
            const forYouData = {
                assignedIssues: assignedTasks || []
            };
            setForYouData(forYouData);

            // Build upcoming tasks data from project stats
            const upcomingData = {
                upcomingTasks: (assignedTasks || []).filter(t => t.dueDate && new Date(t.dueDate) > new Date()),
                unscheduledTasks: (assignedTasks || []).filter(t => !t.dueDate)
            };
            setUpcomingData(upcomingData);

            // Load burndown if there's an active sprint
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            message.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    // Chart data configuration
    const statusChartData = stats ? {
        labels: ['To Do', 'In Progress', 'Review', 'Done'],
        datasets: [{
            data: [
                stats.statusBreakdown?.todo || 0,
                stats.statusBreakdown?.in_progress || 0,
                stats.statusBreakdown?.review || 0,
                stats.statusBreakdown?.done || 0
            ],
            backgroundColor: ['#dfe1e6', '#0052cc', '#ff5630', '#00875a'],
            borderWidth: 0,
        }]
    } : null;

    // Sprint velocity chart data - Shows progress across sprint
    const sprintVelocityData = stats && stats.activeSprint && stats.totalStoryPoints > 0 ? {
        labels: ['Planned', 'Completed', 'In Progress', 'Remaining'],
        datasets: [{
            label: 'Story Points',
            data: [
                stats.totalStoryPoints || 0,
                stats.completedStoryPoints || 0,
                stats.inProgressStoryPoints || 0,
                (stats.totalStoryPoints - stats.completedStoryPoints - stats.inProgressStoryPoints) || 0
            ],
            backgroundColor: ['#dfe1e6', '#00875a', '#0052cc', '#ff5630'],
            borderColor: ['#626f86', '#00875a', '#0052cc', '#ff5630'],
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            borderRadius: 4,
            pointRadius: 5,
            pointBackgroundColor: ['#626f86', '#00875a', '#0052cc', '#ff5630'],
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }]
    } : null;

    // Derived synchronized metrics
    const displayTotalCount = stats ? ((stats.statusBreakdown?.todo || 0) + (stats.statusBreakdown?.in_progress || 0) + (stats.statusBreakdown?.review || 0) + (stats.statusBreakdown?.done || 0)) || stats.totalTasks || 0 : 0;
    const displayDoneCount = stats ? (stats.statusBreakdown?.done || stats.issuesDone || 0) : 0;
    const syncedProgress = displayTotalCount > 0 ? Math.round((displayDoneCount / displayTotalCount) * 100) : (stats?.sprintProgress || 0);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Spin size="large" tip="Loading dashboard..." />
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <Title level={2}>Project Overview: {currentProject?.name || 'No Project Selected'}</Title>
                <Typography.Text type="secondary">
                    <span>Lead: {currentProject?.lead?.fullName ? currentProject.lead.fullName : (
                        <>Unassigned <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: '13px', marginLeft: 4, textDecoration: 'underline' }}>Assign</a></>
                    )}</span>
                    <span>•</span>
                    <span>Key: {currentProject?.key}</span>
                    <span>•</span>
                    <span>Type: {currentProject?.projectType || 'Scrum'}</span>
                </Typography.Text>
            </div>

            {/* For You Section */}
            {forYouData && (
                <div className="for-you-section" style={{ marginBottom: 32 }}>
                    <div className="for-you-title">👤 For You</div>
                    <ForYouSection assignedIssues={forYouData.assignedIssues} />
                </div>
            )}

            {/* KPI Metrics Section */}
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} lg={6}>
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ color: '#ff5630' }}>
                            <FireOutlined />
                        </div>
                        <div className="kpi-content">
                            <div className="kpi-label">Sprint Progress</div>
                            <div className="kpi-value">{syncedProgress}%</div>
                            <div className="kpi-progress">
                                <Progress
                                    percent={syncedProgress}
                                    showInfo={false}
                                    strokeColor="#ff5630"
                                    size="small"
                                />
                            </div>
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ color: '#00875a' }}>
                            <CheckCircleOutlined />
                        </div>
                        <div className="kpi-content">
                            <div className="kpi-label">Completed</div>
                            <div className="kpi-value">{displayDoneCount}</div>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 8 }}>
                                of {displayTotalCount} total
                            </div>
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ color: '#ffab00' }}>
                            <ClockCircleOutlined />
                        </div>
                        <div className="kpi-content">
                            <div className="kpi-label">Days Remaining</div>
                            <div className="kpi-value">{stats?.daysRemaining || 0}</div>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 8 }}>
                                in sprint
                            </div>
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ color: '#0052cc' }}>
                            <RiseOutlined />
                        </div>
                        <div className="kpi-content">
                            <div className="kpi-label">Velocity</div>
                            <div className="kpi-value">{stats?.velocity || 0}</div>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 8 }}>
                                points/day
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                {/* Main Content: Charts & Activity */}
                <Col xs={24} lg={16}>
                    {/* Sprint Burndown Chart */}
                    {stats?.activeSprint && (
                        <div style={{ marginBottom: 24 }}>
                            <SprintBurndownChart
                                sprintId={stats.activeSprint._id}
                                sprintName={stats.activeSprint.name}
                            />
                        </div>
                    )}
                    {!stats?.activeSprint && (
                        <Card style={{ marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <Empty description="No active sprint" />
                        </Card>
                    )}

                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <div className="chart-card">
                                <div className="ant-card-head">
                                    <Typography.Text strong>🎯 Issue Status</Typography.Text>
                                </div>
                                <div className="ant-card-body">
                                    <div className="chart-container">
                                        {statusChartData ? (
                                            <Doughnut data={statusChartData} options={{ maintainAspectRatio: false }} />
                                        ) : (
                                            <Empty description="No data" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="chart-card">
                                <div className="ant-card-head">
                                    <Typography.Text strong>� Sprint Velocity</Typography.Text>
                                </div>
                                <div className="ant-card-body">
                                    <div className="chart-container">
                                        {sprintVelocityData ? (
                                            <Line
                                                data={sprintVelocityData}
                                                options={{
                                                    maintainAspectRatio: false,
                                                    responsive: true,
                                                    plugins: {
                                                        legend: {
                                                            display: true,
                                                            position: 'top',
                                                        }
                                                    },
                                                    scales: {
                                                        y: {
                                                            beginAtZero: true
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <Empty description="No sprint data" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                    <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                        <Col xs={24}>
                            <Card
                                title={
                                    <div>
                                        <Typography.Text strong style={{ fontSize: '13px', color: token.colorText, fontWeight: 600 }}>
                                            Team workload
                                        </Typography.Text>
                                        <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginTop: 2 }}>
                                            Monitor the capacity of your team.{' '}
                                            <a href="#" onClick={(e) => {
                                                e.preventDefault();
                                                setShowReassignmentModal(true);
                                            }} style={{ color: token.colorPrimary, textDecoration: 'none', fontWeight: 500 }}>
                                                Reassign work items to get the right balance
                                            </a>
                                        </div>
                                    </div>
                                }
                                style={{
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    borderRadius: 8,
                                    border: `1px solid ${token.colorBorderSecondary}`
                                }}
                                styles={{ body: { padding: '16px 0' } }}
                            >
                                {stats?.workload?.length > 0 ? (
                                    <div>
                                        {/* Header Row */}
                                        <div style={{ display: 'flex', paddingLeft: 16, paddingRight: 16, marginBottom: 8, gap: 24 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Text type="secondary" strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: token.colorTextSecondary }}>
                                                    Assignee
                                                </Text>
                                            </div>
                                            <div style={{ flex: 1.5 }}>
                                                <Text type="secondary" strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: token.colorTextSecondary }}>
                                                    Work distribution
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Data Rows */}
                                        {stats.workload.map((item, idx) => {
                                            const maxPoints = Math.max(...stats.workload.map(w => w.points || 0), 1);
                                            const percentage = (item.points / maxPoints) * 100;
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        paddingLeft: 16,
                                                        paddingRight: 16,
                                                        paddingTop: 12,
                                                        paddingBottom: 12,
                                                        borderBottom: idx < stats.workload.length - 1 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                                                        alignItems: 'center',
                                                        gap: 24
                                                    }}
                                                >
                                                    {/* Assignee Column */}
                                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <Avatar
                                                            size={32}
                                                            style={{ backgroundColor: '#0052cc', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}
                                                        >
                                                            {item.name?.[0]?.toUpperCase()}
                                                        </Avatar>
                                                        <Text
                                                            ellipsis
                                                            style={{ fontSize: '13px', color: token.colorText, fontWeight: 500 }}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                    </div>

                                                    {/* Work Distribution Column */}
                                                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                height: '8px',
                                                                backgroundColor: '#dfe1e6',
                                                                borderRadius: '4px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    backgroundColor: '#626f86',
                                                                    width: `${percentage}%`,
                                                                    transition: 'width 0.3s ease',
                                                                    borderRadius: '4px'
                                                                }}></div>
                                                            </div>
                                                        </div>
                                                        <Text
                                                            strong
                                                            style={{ fontSize: '12px', color: token.colorText, minWidth: 60, textAlign: 'right', flexShrink: 0 }}
                                                        >
                                                            {item.points || 0} of {maxPoints || 0} pts ({Math.round(percentage)}%)
                                                        </Text>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8c8c8c' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>No workload data</Text>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    </Row>
                </Col>

                <Col xs={24} lg={8}>
                    {/* Status Overview */}
                    {stats && (
                        <div style={{ marginBottom: 24 }}>
                            <StatusOverview stats={stats} />
                        </div>
                    )}

                    {/* Types of Work */}
                    {currentProject?._id && (
                        <div style={{ marginBottom: 24 }}>
                            <TypesOfWorkCard projectId={currentProject._id} />
                        </div>
                    )}

                    {/* Upcoming & Unscheduled Work */}
                    {upcomingData && (
                        <div style={{ marginBottom: 24 }}>
                            <UpcomingWorkCard
                                upcomingTasks={upcomingData.upcomingTasks}
                                unscheduledTasks={upcomingData.unscheduledTasks}
                            />
                        </div>
                    )}
                </Col>
            </Row>

            {/* Smart Reassignment Modal */}
            <Modal
                title="Smart Reassignment Assistant"
                open={showReassignmentModal}
                onCancel={() => setShowReassignmentModal(false)}
                width={1200}
                footer={[
                    <button
                        key="close"
                        onClick={() => setShowReassignmentModal(false)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #d9d9d9',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        Close
                    </button>
                ]}
                styles={{ body: { padding: 0 } }}
            >
                <SmartReassignmentDashboard sprintId={stats?.activeSprint?._id} />
            </Modal>
        </div>
    );
};

export default ProjectDashboard;
