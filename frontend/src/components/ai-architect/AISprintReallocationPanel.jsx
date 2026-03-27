import React, { useState, useEffect } from 'react';
import {
    Card, Button, Form, Select, Table, Space,
    Typography, message, Spin, Tag, Avatar,
    Popconfirm, Row, Col, Alert, Divider, Result
} from 'antd';
import {
    RobotOutlined, SwapOutlined, WarningOutlined,
    CheckCircleOutlined, ArrowRightOutlined, ClockCircleOutlined,
    RocketOutlined, TeamOutlined, FundOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import aiArchitectService from '../../services/aiArchitectService';
import projectService from '../../services/projectService';
import sprintService from '../../services/sprintService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * AISprintReallocationPanel
 * 
 * Allows managers to choose a project and one of its active/future sprints,
 * then triggers an AI analysis to see if tasks should be re-allocated 
 * for better efficiency or deadline mitigation.
 */
const AISprintReallocationPanel = () => {
    const [projects, setProjects] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedSprint, setSelectedSprint] = useState(null);
    
    // Loading states
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingSprints, setLoadingSprints] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [applying, setApplying] = useState(false);
    
    // Result state
    const [reallocationPlan, setReallocationPlan] = useState(null);
    const [hasApplied, setHasApplied] = useState(false);

    // Initial load: Fetch Projects
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoadingProjects(true);
                const data = await projectService.getProjects();
                const projectList = Array.isArray(data) ? data : (data.data || []);
                setProjects(projectList);
            } catch (error) {
                message.error('Failed to load projects');
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchProjects();
    }, []);

    const handleProjectChange = async (projectId) => {
        setSelectedProject(projectId);
        setSelectedSprint(null);
        setReallocationPlan(null);
        setHasApplied(false);
        try {
            setLoadingSprints(true);
            const data = await sprintService.getSprintsByProject(projectId);
            setSprints(data.data || []);
        } catch (error) {
            message.error('Failed to load sprints for this project');
            setSprints([]);
        } finally {
            setLoadingSprints(false);
        }
    };

    const handleSprintChange = (sprintId) => {
        setSelectedSprint(sprintId);
        setReallocationPlan(null);
        setHasApplied(false);
    };

    const handleAnalyze = async () => {
        if (!selectedSprint) return;
        try {
            setAnalyzing(true);
            setReallocationPlan(null);
            setHasApplied(false);
            const response = await aiArchitectService.generateSprintReallocation(selectedSprint);
            setReallocationPlan(response.data);
            message.success('AI optimization analysis complete!');
        } catch (error) {
            message.error('Analysis failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApplyOptimization = async () => {
        if (!reallocationPlan || !reallocationPlan.reallocations) return;
        try {
            setApplying(true);
            await aiArchitectService.applySprintReallocation(reallocationPlan.reallocations);
            message.success('Sprint successfully optimized!');
            setHasApplied(true);
        } catch (error) {
            message.error('Application failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setApplying(false);
        }
    };

    const reallocationColumns = [
        {
            title: 'Task Info',
            key: 'task',
            width: '25%',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{record.taskTitle}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.taskId}</Text>
                </Space>
            )
        },
        {
            title: 'Current Assignee',
            dataIndex: 'previousAssignee',
            key: 'prev',
            width: '15%',
            render: (name) => <Tag color="default">{name}</Tag>
        },
        {
            title: 'New Proposed Assignee',
            key: 'new',
            width: '20%',
            render: (_, record) => (
                <Space>
                    <Tag color="success">{record.newAssignee}</Tag>
                </Space>
            )
        },
        {
            title: 'AI Decision Reasoning',
            dataIndex: 'reasoning',
            key: 'reason',
            render: (text) => <Paragraph style={{ margin: 0, fontSize: 13 }}>{text}</Paragraph>
        }
    ];

    if (hasApplied) {
        return (
            <Card style={{ textAlign: 'center', padding: '40px 0' }}>
                <Result
                    status="success"
                    title="Optimization Successfully Applied"
                    subTitle="Tasks have been re-assigned. Board and Summary views have been synchronized."
                    extra={[
                        <Button type="primary" key="back" onClick={() => setHasApplied(false)}>
                            Optimize Another Sprint
                        </Button>
                    ]}
                />
            </Card>
        );
    }

    return (
        <div className="reallocation-panel">
            <Card style={{ marginBottom: 24 }}>
                <Title level={4}>
                    <SwapOutlined /> AI Sprint Optimization
                </Title>
                <Paragraph type="secondary">
                    Select a project and sprint to analyze task priorities and deadlines. 
                    AI will suggest reallocation of tasks to optimal team members based on their CV specializations.
                </Paragraph>
                
                <Row gutter={24}>
                    <Col span={10}>
                        <Form.Item label="Target Project" style={{ marginBottom: 0 }}>
                            <Select 
                                placeholder="Select Project" 
                                onChange={handleProjectChange}
                                loading={loadingProjects}
                                value={selectedProject}
                                style={{ width: '100%' }}
                                size="large"
                            >
                                {projects.map(p => (
                                    <Option key={p._id} value={p._id}>{p.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <Form.Item label="Select Sprint" style={{ marginBottom: 0 }}>
                            <Select 
                                placeholder="Select Sprint" 
                                onChange={handleSprintChange}
                                loading={loadingSprints}
                                value={selectedSprint}
                                style={{ width: '100%' }}
                                disabled={!selectedProject}
                                size="large"
                            >
                                {sprints.map(s => (
                                    <Option key={s._id} value={s._id}>{s.name} ({s.status})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={4}>
                        <Form.Item label=" " style={{ marginBottom: 0 }}>
                            <Button 
                                type="primary" 
                                block 
                                size="large"
                                icon={<RobotOutlined />}
                                onClick={handleAnalyze}
                                loading={analyzing}
                                disabled={!selectedSprint}
                            >
                                Analyze
                            </Button>
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {reallocationPlan && (
                <Card 
                    title={
                        <Space>
                            <RobotOutlined style={{ color: '#722ed1' }} />
                            <span>AI Proposal: {reallocationPlan.reallocations?.length || 0} Optimization Suggested</span>
                        </Space>
                    }
                    extra={<Tag color="purple">High Accuracy</Tag>}
                >
                    <Alert
                        message="Strategy Overview"
                        description={reallocationPlan.reasoning}
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Table 
                        columns={reallocationColumns} 
                        dataSource={reallocationPlan.reallocations} 
                        rowKey="taskId"
                        pagination={false}
                        bordered
                    />

                    <Divider />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">
                            <InfoCircleOutlined /> Once approved, tasks will be moved instantly and assignees will be notified.
                        </Text>
                        <Space>
                            <Button onClick={() => setReallocationPlan(null)}>Discard Plan</Button>
                            <Popconfirm
                                title="Apply changes to the sprint?"
                                description="This will update task assignments in the database."
                                onConfirm={handleApplyOptimization}
                                okText="Apply Changes"
                                cancelText="Cancel"
                            >
                                <Button 
                                    type="primary" 
                                    icon={<CheckCircleOutlined />} 
                                    loading={applying}
                                >
                                    Execute Reallocation
                                </Button>
                            </Popconfirm>
                        </Space>
                    </div>
                </Card>
            )}
            
            {!reallocationPlan && !analyzing && selectedSprint && (
                <Card style={{ textAlign: 'center', background: '#fafafa' }}>
                    <Empty
                        image={<FundOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                        description="Ready to analyze this sprint for better task distribution. Click 'Analyze' to begin."
                    />
                </Card>
            )}
        </div>
    );
};

export default AISprintReallocationPanel;
