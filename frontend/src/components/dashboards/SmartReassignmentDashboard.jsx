import React, { useState, useEffect } from 'react';
import {
    Card, Button, Table, Modal, Spin, message, Badge, Tooltip,
    Row, Col, Statistic, Tag, Space, Alert, Divider, Progress
} from 'antd';
import {
    CheckCircleOutlined, WarningOutlined, UserOutlined,
    TeamOutlined, RiseOutlined, LoadingOutlined, ThunderboltOutlined,
    SwapOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const SmartReassignmentDashboard = ({ sprintId }) => {
    const [loading, setLoading] = useState(false);
    const [teamAnalysis, setTeamAnalysis] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showRecommendationModal, setShowRecommendationModal] = useState(false);
    const [currentRecommendation, setCurrentRecommendation] = useState(null);
    const [approving, setApproving] = useState(false);
    const [requiresConfirmation, setRequiresConfirmation] = useState(false);

    // Fetch team analysis and recommendations
    const fetchAnalysis = async () => {
        try {
            setLoading(true);

            // Get team workload analysis (works with or without sprintId)
            const analysisRes = await api.get('/reassignment/team/analysis', {
                params: { sprintId: sprintId || '' }
            });

            setTeamAnalysis(analysisRes.data.data);
            console.log('Team analysis loaded:', analysisRes.data.data);

            // Get batch recommendations for overloaded employees
            try {
                const recRes = await api.post('/reassignment/batch-analyze', {
                    sprintId: sprintId || ''
                });

                setRecommendations(recRes.data.data?.reassignmentOpportunities || []);
                console.log('Recommendations loaded:', recRes.data.data?.reassignmentOpportunities);
            } catch (recError) {
                // If user doesn't have permission to see recommendations, just show team analysis
                if (recError.response?.status === 403) {
                    console.log('User does not have permission to view reassignment recommendations');
                    setRecommendations([]);
                } else {
                    throw recError;
                }
            }
        } catch (error) {
            console.error('Error fetching analysis:', error);
            message.error('Failed to fetch workload analysis: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Get recommendation for a specific task
    const getTaskRecommendation = async (taskId) => {
        try {
            setLoading(true);
            const res = await api.get(`/reassignment/${taskId}/recommend`);

            if (!res.data.success) {
                message.warning(res.data.message);
                return;
            }

            setCurrentRecommendation(res.data.data);
            setShowRecommendationModal(true);
        } catch (error) {
            console.error('Error getting recommendation:', error);
            message.error('Failed to get recommendation');
        } finally {
            setLoading(false);
        }
    };

    // Execute reassignment
    const handleReassign = async () => {
        if (!currentRecommendation) return;

        try {
            setApproving(true);

            const response = await api.post(
                `/reassignment/${selectedTask._id}/execute`,
                {
                    newAssigneeId: currentRecommendation.recommendation.employeeId,
                    requiresConfirmation
                }
            );

            if (response.data.success) {
                message.success('Task reassigned successfully!');
                setShowRecommendationModal(false);
                setCurrentRecommendation(null);
                setRequiresConfirmation(false);
                fetchAnalysis(); // Refresh data
            } else if (response.data.requiresConfirmation) {
                setRequiresConfirmation(true);
                message.info('High-priority task requires confirmation');
            }
        } catch (error) {
            console.error('Error executing reassignment:', error);
            message.error(error.response?.data?.message || 'Failed to execute reassignment');
        } finally {
            setApproving(false);
        }
    };

    useEffect(() => {
        fetchAnalysis();
    }, [sprintId]);

    const overloadedColumns = [
        {
            title: 'Employee Name',
            dataIndex: ['name'],
            key: 'name',
            render: (text) => (
                <Space>
                    <UserOutlined />
                    <strong>{text}</strong>
                </Space>
            )
        },
        {
            title: 'Role',
            dataIndex: ['role'],
            key: 'role',
            render: (role) => <Tag color="blue">{role}</Tag>
        },
        {
            title: 'Workload',
            dataIndex: ['workloadPercentage'],
            key: 'workload',
            render: (percentage) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Progress
                        percent={percentage}
                        status={percentage > 80 ? 'exception' : percentage > 60 ? 'active' : 'normal'}
                        size="small"
                        format={(percent) => `${percent}%`}
                    />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                        {`${percentage}% of capacity`}
                    </span>
                </Space>
            ),
            width: 150
        },
        {
            title: 'Tasks Assigned',
            dataIndex: ['assignedTasks'],
            key: 'tasks',
            render: (tasks) => (
                <Badge count={tasks} showZero style={{ backgroundColor: '#ff4d4f' }} />
            )
        },
        {
            title: 'Hours',
            dataIndex: ['assignedHours'],
            key: 'hours',
            render: (hours) => <span>{hours}h</span>
        }
    ];

    const recommendationColumns = [
        {
            title: 'Task',
            dataIndex: ['taskTitle'],
            key: 'task',
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'Current Assignee',
            dataIndex: ['currentAssignee', 'name'],
            key: 'assignee',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <span>{text}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                        {record.currentAssignee.workloadPercentage}% overloaded
                    </span>
                </Space>
            )
        },
        {
            title: 'Recommended Employee',
            dataIndex: ['recommendation', 'name'],
            key: 'recommended',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                        {text}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                        Workload: {record.recommendation.currentWorkloadPercentage}%
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                        Skills: {record.recommendation.skillMatchPercentage}% match
                    </span>
                </Space>
            )
        },
        {
            title: 'Score',
            dataIndex: ['score'],
            key: 'score',
            render: (score) => (
                <Tooltip title={`Recommendation confidence: ${score}%`}>
                    <Tag color={score > 80 ? 'green' : score > 60 ? 'orange' : 'red'}>
                        {score}%
                    </Tag>
                </Tooltip>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<SwapOutlined />}
                    onClick={() => {
                        setSelectedTask({ _id: record.taskId });
                        getTaskRecommendation(record.taskId);
                    }}
                >
                    Review & Reassign
                </Button>
            )
        }
    ];

    if (loading && !teamAnalysis) {
        return (
            <Card>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            </Card>
        );
    }

    const summary = teamAnalysis?.summary || {};
    const overloaded = teamAnalysis?.details?.overloaded || [];
    const balanced = teamAnalysis?.details?.balanced || [];
    const underutilized = teamAnalysis?.details?.underutilized || [];
    const totalMembers = summary.totalEmployees || 0;

    return (
        <div style={{ padding: '24px' }}>
            {/* No data message */}
            {!loading && totalMembers === 0 && (
                <Card
                    style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: '#8c8c8c'
                    }}
                >
                    <TeamOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>No team data available</p>
                    <p style={{ fontSize: '14px', color: '#bfbfbf' }}>
                        Make sure there's an active sprint with assigned tasks and team members
                    </p>
                    <Button type="primary" onClick={fetchAnalysis} style={{ marginTop: '16px' }}>
                        Refresh
                    </Button>
                </Card>
            )}

            {/* Data content */}
            {totalMembers > 0 && (<Card
                title={
                    <Space>
                        <ThunderboltOutlined style={{ color: '#1890ff' }} />
                        <span>Smart Reassignment Assistant</span>
                    </Space>
                }
                extra={
                    <Button type="primary" onClick={fetchAnalysis} loading={loading}>
                        Refresh Analysis
                    </Button>
                }
                style={{ marginBottom: '24px' }}
            >
                {/* Summary Statistics */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Statistic
                            title="Team Size"
                            value={summary.totalEmployees || 0}
                            prefix={<TeamOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Statistic
                            title="Average Workload"
                            value={summary.avgWorkload || 0}
                            suffix="%"
                            valueStyle={{
                                color: summary.avgWorkload > 60 ? '#ff4d4f' : '#52c41a'
                            }}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Statistic
                            title="Overloaded"
                            value={summary.overloadedCount || 0}
                            prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Statistic
                            title="Opportunities"
                            value={recommendations.length}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Col>
                </Row>

                <Divider />

                {/* Alert for overloaded team */}
                {summary.overloadedCount > 0 && (
                    <Alert
                        message="Team Imbalance Detected"
                        description={`${summary.overloadedCount} team member(s) are overloaded. Use reassignment recommendations to balance workload.`}
                        type="warning"
                        icon={<WarningOutlined />}
                        showIcon
                        style={{ marginBottom: '24px' }}
                    />
                )}

                {/* Overloaded Team Members */}
                <h3 style={{ marginTop: '24px' }}>
                    <Badge count={overloaded.length} style={{ marginRight: '8px' }} />
                    Overloaded Team Members ({'>'}60%)
                </h3>
                <Table
                    dataSource={overloaded}
                    columns={overloadedColumns}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    rowKey="employeeId"
                    style={{ marginBottom: '24px' }}
                />

                {/* Balanced Team Members */}
                {balanced.length > 0 && (
                    <>
                        <h3 style={{ marginTop: '24px' }}>
                            <Badge count={balanced.length} style={{ marginRight: '8px' }} color="green" />
                            Balanced Workload (35-60%)
                        </h3>
                        <Table
                            dataSource={balanced}
                            columns={overloadedColumns}
                            pagination={{ pageSize: 5 }}
                            size="small"
                            rowKey="employeeId"
                            style={{ marginBottom: '24px' }}
                        />
                    </>
                )}

                {/* Underutilized Team Members */}
                {underutilized.length > 0 && (
                    <>
                        <h3 style={{ marginTop: '24px' }}>
                            <Badge count={underutilized.length} style={{ marginRight: '8px' }} color="blue" />
                            Underutilized ({`<`}35%)
                        </h3>
                        <Table
                            dataSource={underutilized}
                            columns={overloadedColumns}
                            pagination={{ pageSize: 5 }}
                            size="small"
                            rowKey="employeeId"
                        />
                    </>
                )}
            </Card>
            )}

            {/* Reassignment Opportunities */}
            {recommendations.length > 0 && (
                <Card
                    title={
                        <Space>
                            <RiseOutlined style={{ color: '#52c41a' }} />
                            <span>Reassignment Opportunities ({recommendations.length})</span>
                        </Space>
                    }
                    style={{ marginBottom: '24px' }}
                >
                    <Table
                        dataSource={recommendations}
                        columns={recommendationColumns}
                        pagination={{ pageSize: 10 }}
                        size="small"
                        rowKey="taskId"
                    />
                </Card>
            )}

            {/* Recommendation Modal */}
            <Modal
                title="Review Reassignment Recommendation"
                open={showRecommendationModal}
                onCancel={() => {
                    setShowRecommendationModal(false);
                    setCurrentRecommendation(null);
                    setRequiresConfirmation(false);
                }}
                footer={[
                    <Button key="cancel" onClick={() => setShowRecommendationModal(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={approving}
                        onClick={handleReassign}
                    >
                        {requiresConfirmation ? 'Confirm & Reassign' : 'Reassign Task'}
                    </Button>
                ]}
                width={700}
            >
                {currentRecommendation && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        {/* Reason */}
                        <Alert
                            message="Recommendation Reason"
                            description={currentRecommendation.reason}
                            type="info"
                            showIcon
                        />

                        <Divider />

                        {/* Current Assignee */}
                        <div>
                            <h4>Current Assignee</h4>
                            <Space direction="vertical" size={0}>
                                <span><strong>{currentRecommendation.currentAssignee.name}</strong></span>
                                <Progress
                                    percent={currentRecommendation.currentAssignee.workloadPercentage}
                                    status="exception"
                                    format={(percent) => `${percent}% Overloaded`}
                                />
                            </Space>
                        </div>

                        <Divider />

                        {/* Recommended Employee */}
                        <div>
                            <h4>Recommended Employee</h4>
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                <Space>
                                    <strong>{currentRecommendation.recommendation.name}</strong>
                                    <Tag color="blue">{currentRecommendation.recommendation.role}</Tag>
                                </Space>
                                <Progress
                                    percent={currentRecommendation.recommendation.currentWorkloadPercentage}
                                    format={(percent) => `${percent}% Current Workload`}
                                />
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                    Skills: {currentRecommendation.recommendation.skillMatchPercentage}% match
                                </span>
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                    Recommendation Score: <Tag color="green">{currentRecommendation.score}%</Tag>
                                </span>
                            </Space>
                        </div>

                        <Divider />

                        {/* All Candidates */}
                        {currentRecommendation.allCandidates && currentRecommendation.allCandidates.length > 1 && (
                            <div>
                                <h4>Other Candidates</h4>
                                <Table
                                    dataSource={currentRecommendation.allCandidates.slice(1)}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', key: 'name' },
                                        {
                                            title: 'Score',
                                            dataIndex: 'score',
                                            key: 'score',
                                            render: (score) => <Tag>{score}%</Tag>
                                        },
                                        {
                                            title: 'Workload',
                                            dataIndex: 'workloadPercentage',
                                            key: 'workload',
                                            render: (wl) => `${wl}%`
                                        }
                                    ]}
                                    pagination={false}
                                    size="small"
                                />
                            </div>
                        )}

                        {/* High Priority Confirmation */}
                        {requiresConfirmation && (
                            <Alert
                                message="High Priority Task"
                                description="This is a high-priority task. Please confirm the reassignment."
                                type="warning"
                                showIcon
                            />
                        )}
                    </Space>
                )}
            </Modal>
        </div>
    );
};

export default SmartReassignmentDashboard;
