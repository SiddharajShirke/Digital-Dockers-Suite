import React, { useState, useEffect } from 'react';
import {
    Card, Button, Form, Select, Table, Space, 
    Typography, message, Spin, Tag, Avatar,
    Popconfirm, Row, Col, Alert
} from 'antd';
import {
    RobotOutlined, SwapOutlined, WarningOutlined,
    CheckCircleOutlined, ArrowRightOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import aiArchitectService from '../../services/aiArchitectService';
import projectService from '../../services/projectService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ReallocationProposalPanel = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [atRiskTasks, setAtRiskTasks] = useState([]);
    
    // Loading states
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [generatingProposalId, setGeneratingProposalId] = useState(null);
    const [approving, setApproving] = useState(false);
    
    // Result state
    const [activeProposal, setActiveProposal] = useState(null);

    // Initial load: Fetch Projects
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoadingProjects(true);
            const data = await projectService.getProjects();
            // getProjects returns response.data from axios — could be array directly or {data: [...]}
            const projectList = Array.isArray(data) ? data : (data.data || []);
            setProjects(projectList);
        } catch (error) {
            message.error('Failed to load projects');
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleProjectChange = async (projectId) => {
        setSelectedProject(projectId);
        setActiveProposal(null);
        try {
            setLoadingTasks(true);
            const data = await aiArchitectService.getAtRiskTasks(projectId);
            setAtRiskTasks(data.data || []);
        } catch (error) {
            message.error('Failed to load at-risk tasks');
            setAtRiskTasks([]);
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleGenerateProposal = async (task) => {
        try {
            setGeneratingProposalId(task._id);
            const response = await aiArchitectService.generateReallocationProposal(task._id);
            setActiveProposal(response.data);
            message.success('AI Re-allocation Proposal generated');
        } catch (error) {
            message.error('Failed to generate proposal: ' + (error.response?.data?.message || error.message));
        } finally {
            setGeneratingProposalId(null);
        }
    };

    const handleApproveReallocation = async () => {
        if (!activeProposal) return;
        try {
            setApproving(true);
            await aiArchitectService.approveReallocation(
                activeProposal.taskId, 
                activeProposal.after.proposedAssigneeId
            );
            message.success('Task re-allocated successfully!');
            setActiveProposal(null);
            // Refresh list
            if (selectedProject) {
                handleProjectChange(selectedProject);
            }
        } catch (error) {
            message.error('Approval failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setApproving(false);
        }
    };

    // Table Columns for At-Risk Tasks
    const columns = [
        {
            title: 'Task',
            key: 'task',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>[{record.key}] {record.title}</Text>
                    <Space size="small">
                        <Tag color="volcano">{record.priority || 'medium'}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>Est: {record.estimatedTime || 4}h</Text>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Current Assignees',
            key: 'assignees',
            render: (_, record) => (
                <Avatar.Group maxCount={3}>
                    {(record.assignedTo || []).map(u => (
                        <Avatar key={u._id} style={{ backgroundColor: '#87d068' }}>
                            {u.fullName?.charAt(0) || '?'}
                        </Avatar>
                    ))}
                </Avatar.Group>
            )
        },
        {
            title: 'Due Date',
            key: 'dueDate',
            render: (_, record) => {
                const due = dayjs(record.dueDate);
                const isOverdue = due.isBefore(dayjs());
                return (
                    <Text type={isOverdue ? 'danger' : 'warning'}>
                        <ClockCircleOutlined /> {due.format('MMM D, HH:mm')}
                        {isOverdue && ' (Overdue)'}
                    </Text>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button 
                    type="primary" 
                    ghost 
                    size="small"
                    icon={<RobotOutlined />}
                    loading={generatingProposalId === record._id}
                    onClick={() => handleGenerateProposal(record)}
                >
                    Ask AI for Help
                </Button>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Card style={{ marginBottom: 24 }}>
                <Form layout="vertical">
                    <Form.Item label="Select Project to Scan for Deadline Risks">
                        <Select 
                            placeholder="Select Project" 
                            onChange={handleProjectChange}
                            loading={loadingProjects}
                            value={selectedProject}
                            style={{ maxWidth: 400 }}
                        >
                            {projects.map(p => (
                                <Option key={p._id} value={p._id}>{p.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Card>

            {selectedProject && (
                <Card 
                    title={
                        <Space>
                            <WarningOutlined style={{ color: '#faad14' }} /> 
                            At-Risk Tasks (Due within 48h)
                        </Space>
                    }
                    style={{ marginBottom: 24 }}
                >
                    <Table 
                        columns={columns} 
                        dataSource={atRiskTasks} 
                        rowKey="_id"
                        loading={loadingTasks}
                        pagination={false}
                        locale={{ emptyText: 'No urgent or overdue tasks found for this project. Great job!' }}
                    />
                </Card>
            )}

            {activeProposal && (
                <Card 
                    title={
                        <Space>
                            <RobotOutlined style={{ color: '#722ed1' }} /> 
                            AI Re-allocation Proposal for "{activeProposal.taskTitle}"
                        </Space>
                    }
                    style={{ borderColor: '#d3adf7', background: '#f9f0ff' }}
                >
                    <Row gutter={24} align="middle">
                        <Col span={9}>
                            <Card size="small" title="Before" style={{ background: '#fff' }}>
                                <Text strong>Currently Assigned:</Text>
                                <ul>
                                    {(activeProposal.before?.assignedToNames || []).map((name, i) => (
                                        <li key={i}>{name}</li>
                                    ))}
                                </ul>
                            </Card>
                        </Col>
                        
                        <Col span={6} style={{ textAlign: 'center' }}>
                            <SwapOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                        </Col>

                        <Col span={9}>
                            <Card size="small" title={<Text type="success">After (Proposed)</Text>} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                                <Text strong>New Assignee:</Text>
                                <div style={{ marginTop: 8 }}>
                                    <Avatar style={{ backgroundColor: '#52c41a', marginRight: 8 }}>
                                        {activeProposal.after?.proposedAssigneeName?.charAt(0)}
                                    </Avatar>
                                    <Text>{activeProposal.after?.proposedAssigneeName}</Text>
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    <Alert
                        message="AI Reasoning"
                        description={activeProposal.aiReasoning}
                        type="info"
                        showIcon
                        icon={<RobotOutlined />}
                        style={{ marginTop: 24, marginBottom: 24 }}
                    />

                    <div style={{ textAlign: 'right' }}>
                        <Button 
                            style={{ marginRight: 12 }} 
                            onClick={() => setActiveProposal(null)}
                        >
                            Discard Proposal
                        </Button>
                        <Popconfirm 
                            title="Execute this re-allocation?" 
                            onConfirm={handleApproveReallocation} 
                            okText="Yes" 
                            cancelText="No"
                        >
                            <Button 
                                type="primary" 
                                style={{ backgroundColor: '#52c41a' }}
                                icon={<CheckCircleOutlined />}
                                loading={approving}
                            >
                                Approve Re-allocation
                            </Button>
                        </Popconfirm>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ReallocationProposalPanel;
