import React, { useState } from 'react';
import {
    Card, Button, Form, Select, Input, DatePicker, Space,
    Typography, message, Steps, Spin, Tag, List, Avatar,
    Popconfirm, Badge, Row, Col, Alert, Tooltip
} from 'antd';
import { motion } from 'framer-motion';
import {
    RobotOutlined, ThunderboltOutlined, CheckCircleOutlined,
    CloseCircleOutlined, NodeIndexOutlined, RocketOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import aiArchitectService from '../../services/aiArchitectService';
import { useProject } from '../../context/ProjectContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AISprintFormationPanel = () => {
    const { refreshProjects, switchProject } = useProject();
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();

    // Loading states
    const [generating, setGenerating] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    // Result state
    const [draftSprint, setDraftSprint] = useState(null);

    // Step 1: Submit Form to Generate Sprint
    const handleGenerate = async (values) => {
        if (!values.projectIdea) {
            return message.warning('Please provide a project idea.');
        }

        const dateRangeStr = values.dateRange
            ? `${values.dateRange[0].format('MMM D, YYYY')} - ${values.dateRange[1].format('MMM D, YYYY')}`
            : 'Unspecified Date Range';

        const payload = {
            sprintName: values.sprintName || 'AI Sprint ' + dayjs().format('MMM D'),
            projectIdea: values.projectIdea,
            teamType: values.teamType || 'Technical / Full Stack',
            dateRange: dateRangeStr,
            intervalsDays: values.intervalsDays || [5, 2, 1]
        };

        try {
            setGenerating(true);
            const response = await aiArchitectService.generateDraftSprint(payload);
            message.success('AI has generated a full Draft Blueprint from your idea!');
            const sprintId = response?.data?._id || response?.data?.data?._id || response?._id;
            if (!sprintId) throw new Error("Could not find Sprint ID in the API response.");
            await fetchDraftDetails(sprintId);
            setCurrentStep(1);
        } catch (error) {
            message.error('Failed to generate draft: ' + (error?.response?.data?.message || error.message));
        } finally {
            setGenerating(false);
        }
    };

    const fetchDraftDetails = async (sprintId) => {
        try {
            const res = await aiArchitectService.getDraftSprint(sprintId);
            setDraftSprint(res.data);
        } catch (error) {
            message.error('Failed to load draft details');
        }
    };

    // Step 2: Approve Sprint
    const handleApprove = async () => {
        if (!draftSprint) return;
        try {
            setApproving(true);
            const result = await aiArchitectService.approveSprint(draftSprint._id);

            // Extract new project ID from the approved sprint
            const newProjectId = result?.data?.project || result?.project;

            // Refresh global project list so new project appears in all views
            await refreshProjects();

            // Auto-switch to the new project so Summary/Board/Backlog/Roadmap/Reports load its data
            if (newProjectId) {
                switchProject(newProjectId);
            }

            message.success('Blueprint Approved! Project, Sprint, and Tasks are now live across all tabs.');
            setCurrentStep(2);
        } catch (error) {
            message.error('Approval failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setApproving(false);
        }
    };

    // Step 2: Reject Sprint
    const handleReject = async () => {
        if (!draftSprint) return;
        try {
            setRejecting(true);
            await aiArchitectService.rejectSprint(draftSprint._id);
            message.info('Blueprint discarded. Try generating again with a clearer idea.');
            setDraftSprint(null);
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
        <Card title={<Space><ThunderboltOutlined style={{ color: '#1890ff' }} /> Design New Project Blueprint</Space>}>
            <Alert
                message="Project Idea Setup"
                description="Describe what you want to build. The AI will cross-reference this against all employee CVs in the system, break it down into explicit tasks, assign them to newly formed technical nodes, and schedule automated deadline reminders."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />
            <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ intervalsDays: [5, 2, 1] }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label="Project / Sprint Name"
                            name="sprintName"
                            rules={[{ required: true, message: 'Sprint name is required' }]}
                        >
                            <Input placeholder="e.g. Next-Gen Mobile E-Commerce App" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Target Team Type"
                            name="teamType"
                            rules={[{ required: true, message: 'Please specify the domain flavor.' }]}
                        >
                            <Select placeholder="Select team flavor">
                                <Option value="Technical (Full Stack web/mobile)">Technical (Full Stack)</Option>
                                <Option value="Marketing & Advertisement">Marketing & Ads</Option>
                                <Option value="Data Science & Analytics">Data Science & Analytics</Option>
                                <Option value="Creative & Design">Creative / Design</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    label="Project Idea (What are we building?)"
                    name="projectIdea"
                    rules={[{ required: true, message: 'Provide the vision for the AI.' }]}
                >
                    <Input.TextArea
                        rows={4}
                        placeholder="e.g. Build a highly responsive iOS application for our shoe store that uses Apple Pay. It should have a minimalist white-and-red UI and connect to our existing MongoDB product catalog backend."
                    />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label="Sprint Date Range"
                            name="dateRange"
                            rules={[{ required: true, message: 'Date range is required' }]}
                        >
                            <RangePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="AI Email Reminder Sequence (Days Before Due)"
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
                        {generating ? 'AI is tearing down idea & profiling employees...' : 'Generate Blueprint from Idea'}
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const renderDraftReview = () => {
        if (!draftSprint || !draftSprint.aiPlan) return null;

        const { aiPlan } = draftSprint;

        return (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Card
                    title={<Space><RobotOutlined style={{ color: '#722ed1' }} /> Blueprint Strategy Overview</Space>}
                    style={{ borderColor: '#d3adf7', background: '#f9f0ff' }}
                >
                    <Title level={5}>Core Idea: {aiPlan.projectIdea}</Title>
                    <Text italic>{aiPlan.reasoning}</Text>
                </Card>

                <Title level={4}>Interactive AI Team Blueprint</Title>

                <div style={{ padding: '24px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                    >
                        {/* ROOT */}
                        <motion.div variants={itemVariants} style={{ position: 'relative' }}>
                            <Card size="small" style={{ borderColor: '#1890ff', borderLeft: '4px solid #1890ff', boxShadow: '0 2px 8px rgba(24,144,255,0.15)' }}>
                                <Space>
                                    <Avatar size="large" style={{ backgroundColor: '#1890ff' }} icon={<RocketOutlined />} />
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>ROOT PROJECT</Text>
                                        <div style={{ fontSize: 18, fontWeight: 'bold' }}>{aiPlan.projectIdea}</div>
                                    </div>
                                </Space>
                            </Card>
                            {/* Vertical line connecting root to children */}
                            <div style={{ position: 'absolute', left: 24, top: '100%', width: 2, height: 24, background: '#d9d9d9' }} />
                        </motion.div>

                        <div style={{ paddingLeft: 24, position: 'relative' }}>
                            {/* Vertical continuous line for the nodes */}
                            <div style={{ position: 'absolute', left: 24, top: 0, bottom: 20, width: 2, background: '#d9d9d9' }} />

                            {aiPlan.technicalNodes?.map((node, i) => {
                                const isLastNode = i === aiPlan.technicalNodes.length - 1;

                                return (
                                    <motion.div key={i} variants={itemVariants} style={{ position: 'relative', marginBottom: isLastNode ? 0 : 32 }}>
                                        {/* Horizontal connector to Node */}
                                        <div style={{ position: 'absolute', left: 0, top: 24, width: 24, height: 2, background: '#d9d9d9' }} />

                                        <div style={{ paddingLeft: 24 }}>
                                            <Card
                                                size="small"
                                                title={<Space><NodeIndexOutlined style={{ color: '#fa8c16' }} /> {node.name} Node</Space>}
                                                extra={<Tag color="cyan">{node.focusArea}</Tag>}
                                                style={{ borderColor: '#ffd591', borderLeft: '4px solid #fa8c16' }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                                                    {node.tasks?.map((tRef, j) => {
                                                        const isLastTask = j === node.tasks.length - 1;
                                                        const user = tRef.assignedTo || {};
                                                        const scoreColor = tRef.fitScore >= 0.8 ? 'success' : (tRef.fitScore >= 0.5 ? 'warning' : 'error');

                                                        return (
                                                            <div key={j} style={{ position: 'relative', paddingLeft: 24 }}>
                                                                {/* Vertical sub-line for tasks */}
                                                                {!isLastTask && <div style={{ position: 'absolute', left: 0, top: 20, bottom: -24, width: 2, background: '#e8e8e8' }} />}
                                                                {/* Horizontal sub-connector */}
                                                                <div style={{ position: 'absolute', left: 0, top: 20, width: 16, height: 2, background: '#e8e8e8' }} />

                                                                <Card size="small" style={{ background: '#fafafa', borderColor: '#e8e8e8' }}>
                                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                                        <div style={{ flexShrink: 0 }}>
                                                                            <Tooltip title={`Skill Fit: ${((tRef.fitScore || 0) * 100).toFixed(0)}%`}>
                                                                                <Badge dot status={scoreColor}>
                                                                                    <Avatar style={{ backgroundColor: '#87d068' }}>{user.fullName?.charAt(0) || '?'}</Avatar>
                                                                                </Badge>
                                                                            </Tooltip>
                                                                        </div>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <Space style={{ marginBottom: 4 }}>
                                                                                <Text strong>{user.fullName}</Text>
                                                                                <Text type="secondary" style={{ fontSize: 12 }}>({user.role || 'Engineer'})</Text>
                                                                            </Space>
                                                                            <div>
                                                                                <Text strong style={{ color: '#262626' }}>{tRef.title}</Text>
                                                                                <div style={{ marginTop: 4 }}>
                                                                                    <Space wrap size="small">
                                                                                        <Tag bordered={false} color={tRef.priority === 'high' ? 'red' : 'default'}>{tRef.priority}</Tag>
                                                                                        <Text type="secondary" style={{ fontSize: 12 }}>{tRef.estimatedTime}h</Text>
                                                                                    </Space>
                                                                                </div>
                                                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                                                                    {tRef.description}
                                                                                </Text>
                                                                                <div style={{ marginTop: 8, padding: '4px 8px', background: '#f9f0ff', borderRadius: 4 }}>
                                                                                    <Text type="secondary" style={{ fontSize: 12, color: '#531dab' }}>
                                                                                        <RobotOutlined /> AI Note: {tRef.aiReasoning}
                                                                                    </Text>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>

                <Card>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <div>
                            <Text strong>Human-in-the-Loop Review Required</Text>
                            <br />
                            <Text type="secondary">Review the visually mapped hierarchy. If approved, a new Project & Sprint will be created, and tasks assigned.</Text>
                        </div>
                        <Space>
                            <Popconfirm title="Discard this blueprint entirely?" onConfirm={handleReject} okText="Yes" cancelText="No">
                                <Button danger loading={rejecting} icon={<CloseCircleOutlined />}>Reject & Discard</Button>
                            </Popconfirm>
                            <Popconfirm title="Approve Blueprint and Create Project?" onConfirm={handleApprove} okText="Yes" cancelText="No">
                                <Button type="primary" style={{ backgroundColor: '#52c41a' }} loading={approving} icon={<CheckCircleOutlined />}>
                                    Approve & Launch
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
            <Title level={3}>Blueprint Executed Successfully!</Title>
            <Paragraph>
                The AI-generated blueprint was approved.
                A new Project Wrapper and Sprint have been instantiated, and the exact Tasks generated by the LLM have been logged to the database and assigned to your engineers.
                Configured email reminders are now live.
            </Paragraph>
            <Button type="primary" onClick={() => { setCurrentStep(0); setDraftSprint(null); form.resetFields(); }}>
                Design Another Idea
            </Button>
        </Card>
    );

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Steps
                current={currentStep}
                style={{ marginBottom: 32 }}
                items={[
                    { title: 'A.I. Design', description: 'Idea Input & Rules' },
                    { title: 'Human Review', description: 'Blueprint Adjustments' },
                    { title: 'Liftoff', description: 'Project Deployed' }
                ]}
            />

            {generating && (
                <Card style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" />
                    <Title level={4} style={{ marginTop: 24 }}>NVIDIA LLM is Architecting your Vision...</Title>
                    <Paragraph type="secondary">
                        Deconstructing your raw idea into distinct tasks, profiling all company CVs, matching technical skills, and forming optimized team nodes.
                    </Paragraph>
                </Card>
            )}

            {!generating && currentStep === 0 && renderConfigurationForm()}
            {!generating && currentStep === 1 && renderDraftReview()}
            {!generating && currentStep === 2 && renderSuccess()}
        </div>
    );
};

export default AISprintFormationPanel;
