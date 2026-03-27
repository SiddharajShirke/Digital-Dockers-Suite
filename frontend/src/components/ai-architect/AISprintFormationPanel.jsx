import React, { useState } from 'react';
import {
    Card, Button, Form, Select, Input, DatePicker, Space,
    Typography, message, Steps, Spin, Tag, List, Avatar,
    Popconfirm, Badge, Row, Col, Alert, Tooltip, Collapse, Empty, Tabs
} from 'antd';
import { motion } from 'framer-motion';
import {
    RobotOutlined, ThunderboltOutlined, CheckCircleOutlined,
    CloseCircleOutlined, NodeIndexOutlined, RocketOutlined,
    InfoCircleOutlined, TeamOutlined, UserOutlined, DeploymentUnitOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import aiArchitectService from '../../services/aiArchitectService';
import { useProject } from '../../context/ProjectContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const AISprintFormationPanel = () => {
    const { refreshProjects, switchProject } = useProject();
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();

    // Loading states
    const [generating, setGenerating] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    // Result state (now an array)
    const [draftSprints, setDraftSprints] = useState([]);

    // Step 1: Submit Form to Generate Sprints
    const handleGenerate = async (values) => {
        if (!values.projectIdea) {
            return message.warning('Please provide a project vision.');
        }

        const dateRangeStr = values.dateRange
            ? `${values.dateRange[0].format('MMM D, YYYY')} - ${values.dateRange[1].format('MMM D, YYYY')}`
            : 'Unspecified Date Range';

        const payload = {
            projectName: values.projectName || 'AI Project ' + dayjs().format('MMM D'),
            projectIdea: values.projectIdea,
            teamType: values.teamType || ['Technical (Full Stack web/mobile)'],
            dateRange: dateRangeStr,
            intervalsDays: values.intervalsDays || [5, 2, 1]
        };

        try {
            setGenerating(true);
            const response = await aiArchitectService.generateDraftSprint(payload);
            const sprints = response?.data || [];
            
            if (sprints.length === 0) throw new Error("AI did not generate any sprint phases. Try a clearer project vision.");
            
            setDraftSprints(sprints);
            message.success(`AI has generated ${sprints.length} project phases!`);
            setCurrentStep(1);
        } catch (error) {
            message.error('Failed to generate draft: ' + (error?.response?.data?.message || error.message));
        } finally {
            setGenerating(false);
        }
    };

    // Step 2: Approve All Sprints
    const handleApproveAll = async () => {
        if (!draftSprints.length) return;
        try {
            setApproving(true);
            let firstProjectId = null;

            for (const sprint of draftSprints) {
                const result = await aiArchitectService.approveSprint(sprint._id);
                if (!firstProjectId) firstProjectId = result?.data?.project || result?.project;
            }

            console.log(`🚀 [AI Architect] All phases approved. Fetching fresh project list...`);
            const freshProjects = await refreshProjects();
            
            if (firstProjectId) {
                console.log(`🎯 [AI Architect] Switching context to newly created project: ${firstProjectId}`);
                await switchProject(firstProjectId, freshProjects);
            }

            message.success('All Blueprint Phases Approved! Project is now live.');
            setCurrentStep(2);
        } catch (error) {
            message.error('Approval failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setApproving(false);
        }
    };

    // Step 2: Reject All Sprints
    const handleRejectAll = async () => {
        if (!draftSprints.length) return;
        try {
            setRejecting(true);
            for (const sprint of draftSprints) {
                await aiArchitectService.rejectSprint(sprint._id);
            }
            message.info('Blueprint discarded.');
            setDraftSprints([]);
            setCurrentStep(0);
        } catch (error) {
            message.error('Rejection failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setRejecting(false);
        }
    };

    // ----------------------------------------------------
    // RENDER HELPER COMPONENTS
    // ----------------------------------------------------

    const renderConfigurationForm = () => (
        <Card title={<Space><ThunderboltOutlined style={{ color: '#1890ff' }} /> Design Multi-Phase Project Blueprint</Space>}>
            <Alert
                message="End-to-End AI Architect"
                description="Describe your vision. The AI will generate a complete project lifecycle of multiple sprints, matching skills across all selected disciplines."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />
            <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ intervalsDays: [5, 2, 1], teamType: ['Technical (Full Stack web/mobile)'] }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label="Project Name"
                            name="projectName"
                            rules={[{ required: true, message: 'Project name is required' }]}
                        >
                            <Input placeholder="e.g. Next-Gen Mobile E-Commerce App" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Target Team Disciplines"
                            name="teamType"
                            rules={[{ required: true, message: 'Select at least one discipline.' }]}
                        >
                            <Select mode="multiple" placeholder="Select team flavors" style={{ width: '100%' }}>
                                <Option value="Technical (Full Stack web/mobile)">Technical (Full Stack)</Option>
                                <Option value="Marketing & Advertisement">Marketing & Ads</Option>
                                <Option value="Data Science & Analytics">Data Science & Analytics</Option>
                                <Option value="Creative & Design">Creative / Design</Option>
                                <Option value="Legal & Compliance">Legal & Compliance</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    label="Project Vision (What are we building?)"
                    name="projectIdea"
                    rules={[{ required: true, message: 'Provide the vision for the AI.' }]}
                >
                    <Input.TextArea
                        rows={5}
                        placeholder="e.g. Build a highly responsive iOS application for our shoe store... (The AI will split this into multiple development phases/sprints automatically)"
                    />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label="Lifecycle Date Range"
                            name="dateRange"
                            rules={[{ required: true, message: 'Date range is required' }]}
                        >
                            <RangePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="AI Email Reminder Sequence"
                            name="intervalsDays"
                        >
                            <Select mode="tags" style={{ width: '100%' }}>
                                <Option value={7}>7 Days Before</Option>
                                <Option value={5}>5 Days Before</Option>
                                <Option value={2}>2 Days Before</Option>
                                <Option value={1}>1 Day Before</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<RobotOutlined />}
                        loading={generating}
                        block
                        size="large"
                        style={{ background: 'linear-gradient(90deg, #1890ff 0%, #722ed1 100%)', border: 'none' }}
                    >
                        {generating ? 'AI is architecting full lifecycle...' : 'Generate Multi-Phase Blueprint'}
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );

    const renderSprintPhases = () => {
        if (!draftSprints.length) return <Empty description="No draft blueprint found" />;

        return (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Card style={{ borderColor: '#d3adf7', background: '#f9f0ff' }}>
                    <Title level={5}><InfoCircleOutlined /> Project Vision: {draftSprints[0].aiPlan.projectIdea}</Title>
                    <Text type="secondary">The AI hasn't only generated tasks; it has partitioned your vision into {draftSprints.length} distinct execution phases.</Text>
                </Card>

                <Title level={4}><TeamOutlined /> Multi-Phase Execution Plan</Title>

                <Collapse defaultActiveKey={['0']} accordion ghost expandIconPosition="end">
                    {draftSprints.map((sprint, idx) => (
                        <Panel 
                            header={
                                <Space>
                                    <Badge count={idx + 1} style={{ backgroundColor: '#722ed1' }} />
                                    <Text strong>{sprint.name}</Text>
                                    <Tag color="purple">{sprint.aiPlan.technicalNodes?.length} Nodes</Tag>
                                </Space>
                            } 
                            key={idx}
                            style={{ background: '#fff', marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}
                        >
                            <div style={{ padding: '0 12px' }}>
                                <Paragraph italic style={{ color: '#595959', borderLeft: '3px solid #d9d9d9', paddingLeft: 12 }}>
                                    {sprint.aiPlan.reasoning}
                                </Paragraph>
                                
                                <List
                                    header={<Text strong>Team Partitioning & Nodes</Text>}
                                    dataSource={sprint.aiPlan.technicalNodes}
                                    renderItem={(node) => (
                                        <List.Item>
                                            <Card 
                                                size="small" 
                                                style={{ width: '100%', background: '#fafafa', border: 'none' }} 
                                                title={<Space><NodeIndexOutlined style={{ color: '#1890ff' }} /> {node.name}</Space>} 
                                                extra={<Tag color="blue">{node.focusArea}</Tag>}
                                            >
                                                <Collapse ghost accordion className="task-review-collapse">
                                                    {node.tasks?.map((task, tIdx) => (
                                                        <Panel 
                                                            header={
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                                    <Space>
                                                                        <DeploymentUnitOutlined style={{ color: '#52c41a' }} />
                                                                        <Text strong>{task.title}</Text>
                                                                    </Space>
                                                                    <Tag color={task.fitScore >= 0.8 ? 'success' : 'warning'}>Match: {(task.fitScore * 100).toFixed(0)}%</Tag>
                                                                </div>
                                                            }
                                                            key={tIdx}
                                                            style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 4, marginBottom: 8 }}
                                                        >
                                                            <Tabs 
                                                                defaultActiveKey="1" 
                                                                size="small"
                                                                items={[
                                                                    {
                                                                        key: '1',
                                                                        label: 'Mission Details',
                                                                        children: (
                                                                            <div style={{ padding: '8px 4px' }}>
                                                                                <Paragraph>{task.description}</Paragraph>
                                                                                <Space wrap>
                                                                                    <Tag icon={<ThunderboltOutlined />} color="volcano">{task.priority.toUpperCase()}</Tag>
                                                                                    <Tag icon={<RobotOutlined />} color="blue">{task.estimatedTime} Hours Estimated</Tag>
                                                                                </Space>
                                                                            </div>
                                                                        )
                                                                    },
                                                                    {
                                                                        key: '2',
                                                                        label: `Assigned Expert${task.assigneeName ? `: ${task.assigneeName}` : ''}`,
                                                                        children: (
                                                                            <div style={{ padding: '8px 4px' }}>
                                                                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px', background: 'linear-gradient(135deg, #f6ffed 0%, #f0f5ff 100%)', borderRadius: 8, border: '1px solid #d9f7be' }}>
                                                                                    <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: task.fitScore >= 0.8 ? '#52c41a' : '#fa8c16', flexShrink: 0 }} />
                                                                                    <div style={{ flex: 1 }}>
                                                                                        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                                                                                            {task.assigneeName || 'Unassigned Expert'}
                                                                                        </Text>
                                                                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                                                                            Assigned to: <Text code>{task.title}</Text>
                                                                                        </Text>

                                                                                        {task.requiredSkills?.length > 0 && (
                                                                                            <div style={{ marginBottom: 10 }}>
                                                                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Required Skills:</Text>
                                                                                                <Space wrap size={[4, 4]}>
                                                                                                    {task.requiredSkills.map((skill, sIdx) => (
                                                                                                        <Tag key={sIdx} color="geekblue" style={{ fontSize: 11 }}>{skill}</Tag>
                                                                                                    ))}
                                                                                                </Space>
                                                                                            </div>
                                                                                        )}

                                                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                                                                            <Tag color={task.fitScore >= 0.8 ? 'success' : 'warning'} style={{ margin: 0 }}>
                                                                                                Fit Score: {(task.fitScore * 100).toFixed(0)}%
                                                                                            </Tag>
                                                                                            <Tag icon={<RobotOutlined />} color="blue" style={{ margin: 0 }}>
                                                                                                {task.estimatedTime}h Estimated
                                                                                            </Tag>
                                                                                        </div>

                                                                                        {task.specializationMatch && (
                                                                                            <div style={{ marginTop: 8, padding: '10px 12px', background: '#fff', borderLeft: '4px solid #52c41a', borderRadius: 4 }}>
                                                                                                <Text style={{ color: '#237804', fontSize: 13 }}>
                                                                                                    <ThunderboltOutlined /> <strong>Why this expert:</strong> {task.specializationMatch}
                                                                                                </Text>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    }
                                                                ]}
                                                            />
                                                        </Panel>
                                                    ))}
                                                </Collapse>
                                            </Card>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        </Panel>
                    ))}
                </Collapse>

                <Card>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <div>
                            <Text strong>Complete Lifecycle Review Required</Text>
                            <br />
                            <Text type="secondary">Approving will instantiate all {draftSprints.length} phases as a single Project entity.</Text>
                        </div>
                        <Space>
                            <Popconfirm title="Discard entire blueprint?" onConfirm={handleRejectAll} okText="Yes" cancelText="No">
                                <Button danger loading={rejecting} icon={<CloseCircleOutlined />}>Reject All</Button>
                            </Popconfirm>
                            <Popconfirm title="Approve and Launch Project Lifecycle?" onConfirm={handleApproveAll} okText="Yes" cancelText="No">
                                <Button type="primary" style={{ backgroundColor: '#52c41a' }} loading={approving} icon={<CheckCircleOutlined />}>
                                    Approve & Launch All Phases
                                </Button>
                            </Popconfirm>
                        </Space>
                    </Space>
                </Card>
            </Space>
        );
    };

    const renderSuccess = () => (
        <Card style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
            <Title level={3}>Project Lifecycle Deployed!</Title>
            <Paragraph>
                Successfully instantiated all phases. Your technical, marketing, and analytical nodes have been notified of their upcoming tasks.
            </Paragraph>
            <Button type="primary" onClick={() => { setCurrentStep(0); setDraftSprints([]); form.resetFields(); }}>
                Design Another Project
            </Button>
        </Card>
    );

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Steps
                current={currentStep}
                style={{ marginBottom: 32 }}
                items={[
                    { title: 'A.I. Design', description: 'Lifecycle Architecting' },
                    { title: 'Human Review', description: 'Phase Confimation' },
                    { title: 'Liftoff', description: 'Lifecycle Deployed' }
                ]}
            />

            {generating && (
                <Card style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" />
                    <Title level={4} style={{ marginTop: 24 }}>NVIDIA LLM is Architecting Full Lifecycle...</Title>
                    <Paragraph type="secondary">
                        Partitioning your vision into distinct phases, profiling all CVs, and generating end-to-end task flows.
                    </Paragraph>
                </Card>
            )}

            {!generating && currentStep === 0 && renderConfigurationForm()}
            {!generating && currentStep === 1 && renderSprintPhases()}
            {!generating && currentStep === 2 && renderSuccess()}
        </div>
    );
};

export default AISprintFormationPanel;
