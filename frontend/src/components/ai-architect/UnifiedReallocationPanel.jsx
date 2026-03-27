import React, { useState } from 'react';
import {
    Card, Button, Row, Col, Table, Typography, Spin, Tag,
    Alert, Space, Progress, Collapse, Badge, Popconfirm, message, Divider,
    Tooltip, Result, Empty
} from 'antd';
import {
    RobotOutlined, PlayCircleOutlined, SwapOutlined, CheckCircleOutlined,
    ClockCircleOutlined, FundOutlined, TeamOutlined, ArrowRightOutlined,
    ExclamationCircleOutlined, SyncOutlined, WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import aiArchitectService from '../../services/aiArchitectService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * UnifiedReallocationPanel
 * ─────────────────────────────────────────────────────────
 * 4-step workflow:
 *  Step 1: Analyze → loads all projects + sprints overview
 *  Step 2: User picks a project or sprint → Reallocate
 *  Step 3: AI proposal shown (task, priority, level, assignee, hours, reasoning)
 *  Step 4: Execute → DB updates, cross-tab sync
 */
const UnifiedReallocationPanel = () => {
    // ── State ──
    const [phase, setPhase] = useState('idle'); // idle | overview | proposal | done
    const [loading, setLoading] = useState(false);
    const [overview, setOverview] = useState([]);
    const [proposal, setProposal] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    // ── Step 1: Load Overview ──
    const handleAnalyze = async () => {
        try {
            setLoading(true);
            const res = await aiArchitectService.getWorkloadOverview();
            setOverview(res.data || []);
            setPhase('overview');
            setProposal(null);
        } catch (err) {
            message.error('Failed to load workload overview: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Trigger AI Reallocation ──
    const handleReallocate = async (projectId, sprintId = null) => {
        try {
            setLoading(true);
            setPhase('loading_proposal');
            const res = await aiArchitectService.generateUnifiedReallocation(projectId, sprintId);
            setProposal(res.data);
            setSelectedRows(res.data?.reallocations || []);
            setPhase('proposal');
            message.success('AI optimization plan generated!');
        } catch (err) {
            message.error('AI analysis failed: ' + (err.response?.data?.message || err.message));
            setPhase('overview');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 4: Execute ──
    const handleExecute = async () => {
        try {
            setExecuting(true);
            const res = await aiArchitectService.executeUnifiedReallocation(selectedRows);
            message.success(res.message || 'Reallocation applied successfully!');
            setPhase('done');
        } catch (err) {
            message.error('Execution failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setExecuting(false);
        }
    };

    const handleReset = () => {
        setPhase('idle');
        setOverview([]);
        setProposal(null);
        setSelectedRows([]);
    };

    // ── Helpers ──
    const daysColor = (days) => {
        if (days === null || days === undefined) return 'default';
        if (days <= 0) return 'error';
        if (days <= 3) return 'warning';
        return 'success';
    };

    const priorityColor = { highest: 'red', high: 'volcano', medium: 'gold', low: 'blue', lowest: 'cyan' };

    // ── Proposal table columns ──
    const proposalColumns = [
        {
            title: 'Task',
            dataIndex: 'taskTitle',
            key: 'task',
            width: '20%',
            render: (title, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 13 }}>{title}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.sprintName}</Text>
                </Space>
            )
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 90,
            render: (p) => <Tag color={priorityColor[p] || 'default'}>{p?.toUpperCase() || 'MEDIUM'}</Tag>
        },
        {
            title: 'Level',
            dataIndex: 'taskLevel',
            key: 'level',
            width: 80,
            render: (l) => <Tag>{l || 'task'}</Tag>
        },
        {
            title: 'Current → New Assignee',
            key: 'assignee',
            width: '22%',
            render: (_, r) => {
                const isChanged = r.previousAssigneeId?.toString() !== r.newAssigneeId?.toString();
                if (!isChanged) {
                    return <Tag color="default">{r.newAssignee}</Tag>;
                }
                return (
                    <Space>
                        <Tag color="default">{r.previousAssignee || 'Unassigned'}</Tag>
                        <ArrowRightOutlined style={{ color: '#1890ff' }} />
                        <Tag color="success">{r.newAssignee}</Tag>
                    </Space>
                );
            }
        },
        {
            title: 'Est. Hours',
            dataIndex: 'estimatedHours',
            key: 'hours',
            width: 90,
            render: (h) => <Text strong>{h || '?'}h</Text>
        },
        {
            title: 'New Due Date',
            dataIndex: 'newDueDate',
            key: 'due',
            width: 110,
            render: (d) => d ? <Text type="secondary">{dayjs(d).format('MMM D, YYYY')}</Text> : <Text type="secondary">—</Text>
        },
        {
            title: 'AI Reasoning',
            dataIndex: 'reasoning',
            key: 'reason',
            render: (text) => <Paragraph style={{ margin: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{text}</Paragraph>
        }
    ];

    // ── Phase: Idle ──
    if (phase === 'idle') {
        return (
            <Card style={{ textAlign: 'center', padding: '48px 0' }}>
                <FundOutlined style={{ fontSize: 56, color: '#722ed1', marginBottom: 16 }} />
                <Title level={4}>AI Task Reallocation</Title>
                <Paragraph type="secondary" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
                    Analyze all active projects and sprints. Our AI will suggest a smart reallocation plan —
                    reassigning tasks based on CV specializations, workload balance, and deadlines.
                </Paragraph>
                <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    loading={loading}
                    onClick={handleAnalyze}
                    style={{ background: 'linear-gradient(90deg,#722ed1,#1890ff)', border: 'none', padding: '0 32px' }}
                >
                    Analyze All Projects
                </Button>
            </Card>
        );
    }

    // ── Phase: Loading Proposal ──
    if (phase === 'loading_proposal' || (loading && phase !== 'overview')) {
        return (
            <Card style={{ textAlign: 'center', padding: '64px 0' }}>
                <Spin size="large" />
                <br /><br />
                <Title level={5} style={{ color: '#722ed1' }}>AI is analyzing workload distribution...</Title>
                <Paragraph type="secondary">Matching tasks to skills from CV database. This may take 15–30 seconds.</Paragraph>
            </Card>
        );
    }

    // ── Phase: Done ──
    if (phase === 'done') {
        return (
            <Card>
                <Result
                    status="success"
                    title="Reallocation Executed Successfully"
                    subTitle="Task assignments, story points, due dates, and sprint memberships have been updated. All dashboard tabs will reflect the changes."
                    extra={[
                        <Button type="primary" key="new" onClick={handleReset}>Start New Analysis</Button>,
                        <Button key="back" onClick={() => setPhase('proposal')}>View Proposal</Button>
                    ]}
                />
            </Card>
        );
    }

    // ── Phase: Overview ──
    if (phase === 'overview') {
        return (
            <div>
                <Card style={{ marginBottom: 16 }}>
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>
                                <FundOutlined /> Workload Overview — {overview.length} Projects
                            </Title>
                            <Text type="secondary">Select a project or sprint to generate the AI optimization plan.</Text>
                        </Col>
                        <Col>
                            <Space>
                                <Button onClick={handleAnalyze} icon={<SyncOutlined />} loading={loading}>Refresh</Button>
                                <Button onClick={handleReset}>Reset</Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                <Collapse accordion expandIconPlacement="end">
                    {overview.map(project => {
                        const totalTasks = project.sprints.reduce((s, sp) => s + sp.taskTotal, 0);
                        const doneTasks = project.sprints.reduce((s, sp) => s + sp.taskDone, 0);
                        const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

                        return (
                            <Panel
                                key={project._id}
                                header={
                                    <Row align="middle" gutter={16} style={{ width: '100%' }}>
                                        <Col flex="auto">
                                            <Text strong style={{ fontSize: 15 }}>{project.name}</Text>
                                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>({project.key})</Text>
                                        </Col>
                                        <Col>
                                            <Space>
                                                <Tag color="purple">{project.sprints.length} sprints</Tag>
                                                <Tag color="blue">{totalTasks} tasks</Tag>
                                                <Tag color="green">{pct}% done</Tag>
                                            </Space>
                                        </Col>
                                        <Col>
                                            <Button
                                                type="primary"
                                                ghost
                                                size="small"
                                                icon={<RobotOutlined />}
                                                onClick={(e) => { e.stopPropagation(); handleReallocate(project._id); }}
                                                loading={loading}
                                            >
                                                Optimize All Sprints
                                            </Button>
                                        </Col>
                                    </Row>
                                }
                            >
                                {project.sprints.length === 0 ? (
                                    <Empty description="No sprints found for this project." />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {project.sprints.map(sprint => {
                                            const spPct = sprint.taskTotal ? Math.round((sprint.taskDone / sprint.taskTotal) * 100) : 0;
                                            const isOverdue = sprint.daysRemaining !== null && sprint.daysRemaining < 0;

                                            return (
                                                <Card key={sprint._id} size="small" style={{ borderLeft: `4px solid ${isOverdue ? '#ff4d4f' : sprint.daysRemaining <= 3 ? '#faad14' : '#52c41a'}` }}>
                                                    <Row align="middle" gutter={8}>
                                                        <Col flex="auto">
                                                            <Text strong>{sprint.name}</Text>
                                                            <Space style={{ marginLeft: 12 }} size="small">
                                                                <Tag color={sprint.status === 'active' ? 'green' : 'default'}>{sprint.status}</Tag>
                                                                <Tag color={daysColor(sprint.daysRemaining)}>
                                                                    <ClockCircleOutlined />{' '}
                                                                    {sprint.daysRemaining === null
                                                                        ? 'No due date'
                                                                        : sprint.daysRemaining <= 0
                                                                            ? `${Math.abs(sprint.daysRemaining)}d overdue`
                                                                            : `${sprint.daysRemaining}d remaining`}
                                                                </Tag>
                                                            </Space>
                                                        </Col>
                                                        <Col style={{ minWidth: 180 }}>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                {sprint.taskDone}/{sprint.taskTotal} done · {sprint.donePoints}/{sprint.totalPoints} pts
                                                            </Text>
                                                            <Progress percent={spPct} size="small" showInfo={false} style={{ margin: '4px 0 0' }} />
                                                        </Col>
                                                        <Col>
                                                            <Button
                                                                size="small"
                                                                type="primary"
                                                                icon={<SwapOutlined />}
                                                                onClick={() => handleReallocate(project._id, sprint._id)}
                                                                loading={loading}
                                                            >
                                                                Reallocate
                                                            </Button>
                                                        </Col>
                                                    </Row>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </Panel>
                        );
                    })}
                </Collapse>
            </div>
        );
    }

    // ── Phase: Proposal ──
    if (phase === 'proposal' && proposal) {
        const scope = proposal.sprintScope === 'single' ? 'Sprint' : 'All Sprints';

        return (
            <div>
                <Card style={{ marginBottom: 16 }}>
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>
                                <RobotOutlined style={{ color: '#722ed1' }} /> AI Optimization Proposal
                            </Title>
                            <Text type="secondary">
                                Project: <Text strong>{proposal.projectName}</Text> · Scope: {scope} · {proposal.reallocations?.length || 0} task changes proposed
                            </Text>
                        </Col>
                        <Col>
                            <Space>
                                <Button onClick={() => setPhase('overview')}>← Back to Overview</Button>
                                <Popconfirm
                                    title="Execute this reallocation plan?"
                                    description={`This will update ${selectedRows.length} task(s) in the database immediately.`}
                                    onConfirm={handleExecute}
                                    okText="Execute"
                                    cancelText="Cancel"
                                    okButtonProps={{ danger: false }}
                                >
                                    <Button
                                        type="primary"
                                        icon={<CheckCircleOutlined />}
                                        loading={executing}
                                        disabled={selectedRows.length === 0}
                                        style={{ background: '#52c41a', border: 'none' }}
                                    >
                                        Execute Reallocation ({selectedRows.length})
                                    </Button>
                                </Popconfirm>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                <Alert
                    type="info"
                    showIcon
                    icon={<RobotOutlined />}
                    message="Global Strategy"
                    description={proposal.globalStrategy || proposal.reasoning || 'AI has analyzed workload and CV specializations to generate this plan.'}
                    style={{ marginBottom: 16 }}
                />

                <Card bodyStyle={{ padding: 0 }}>
                    <Table
                        rowKey={r => r.taskId || r.id}
                        dataSource={proposal.reallocations || []}
                        columns={proposalColumns}
                        pagination={{ pageSize: 15 }}
                        rowSelection={{
                            selectedRowKeys: selectedRows.map(r => r.taskId || r.id),
                            onChange: (_, rows) => setSelectedRows(rows),
                            getCheckboxProps: () => ({})
                        }}
                        scroll={{ x: 900 }}
                        locale={{ emptyText: 'No reallocation changes proposed — the sprint is already well-balanced!' }}
                    />
                </Card>
            </div>
        );
    }

    return null;
};

export default UnifiedReallocationPanel;
