import { Drawer, Typography, Descriptions, Tag, Space, Avatar, Divider, Tabs, Button, Input, List, message, Select, Grid, Card, Timeline, Tooltip, Empty, Popconfirm, Spin, Modal } from 'antd';
import {
    CloseOutlined,
    LinkOutlined,
    PaperClipOutlined,
    ShareAltOutlined,
    MoreOutlined,
    ClockCircleOutlined,
    BulbOutlined,
    CalendarOutlined,
    BranchesOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    LoadingOutlined,
    CheckOutlined,
    RobotOutlined
} from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import taskService from '../../services/taskService';
import userService from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import SubTaskPanel from '../SubTaskPanel';
import WorkLogPanel from '../work-logs/WorkLogPanel';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

/**
 * ============================================================================
 * WORKFLOW VALIDATION & RULES
 * ============================================================================
 * Defines allowed status transitions for Jira-like workflow
 */
const WORKFLOW_RULES = {
    'todo': ['in_progress'],
    'in_progress': ['review', 'todo'],
    'review': ['in_progress', 'done'],
    'done': ['in_progress'] // Allow reopening
};

/**
 * Validates if a status transition is allowed
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
    if (currentStatus === newStatus) return true;
    return WORKFLOW_RULES[currentStatus]?.includes(newStatus) || false;
};

/**
 * Formats relative time (e.g., "2 minutes ago")
 */
const formatRelativeTime = (date) => {
    if (!date) return 'unknown';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
};

const IssueDetailDrawer = ({ open, onClose, issue }) => {
    const { user } = useAuth();
    const [currentIssue, setCurrentIssue] = useState(issue);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingField, setLoadingField] = useState(null);
    const [users, setUsers] = useState([]);
    const screens = useBreakpoint();
    const isMobile = !screens.sm;
    const originalIssueRef = useRef(issue);

    useEffect(() => {
        setCurrentIssue(issue);
        originalIssueRef.current = issue;
    }, [issue]);

    useEffect(() => {
        if (open) {
            fetchUsers();
        }
    }, [open]);

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    if (!currentIssue) return null;

    /**
     * ========================================================================
     * OPTIMISTIC UI UPDATE - Inline Editing
     * ========================================================================
     * 1. Update local state immediately (optimistic)
     * 2. Call API in background
     * 3. If API fails, revert to original state
     */
    const handleUpdate = async (field, value) => {
        // Validate workflow rules for status changes
        if (field === 'status') {
            if (!isValidStatusTransition(currentIssue.status, value)) {
                message.warning(`Cannot transition from ${currentIssue.status} to ${value}`);
                return;
            }
        }

        // Save original state for rollback
        const originalValue = currentIssue[field];
        
        // Optimistic update: update UI immediately
        setCurrentIssue(prev => ({
            ...prev,
            [field]: value,
            updatedAt: new Date().toISOString() // Update timestamp
        }));

        setLoadingField(field);

        try {
            // API call in background
            const updated = await taskService.updateTask(currentIssue._id, { 
                [field]: value 
            });
            
            // Sync with server response
            setCurrentIssue(updated);
            message.success(`${field} updated`);
        } catch (error) {
            // Rollback on error
            setCurrentIssue(prev => ({
                ...prev,
                [field]: originalValue,
                updatedAt: originalIssueRef.current.updatedAt
            }));
            message.error(`Failed to update ${field}`);
            console.error('Update error:', error);
        } finally {
            setLoadingField(null);
        }
    };

    /**
     * ========================================================================
     * COMMENTS - Simple Text-based
     * ========================================================================
     * User types comment → Submit → Append to issue.comments → Display
     * No threading, no reactions, no edit (MVP)
     */
    const handleAddComment = async () => {
        if (!comment.trim()) return;
        
        setSending(true);
        try {
            // Call API to add comment
            const updated = await taskService.addComment(currentIssue._id, {
                text: comment.trim(),
                user: user._id
            });

            // Update UI with new comments
            setCurrentIssue(prev => ({
                ...prev,
                comments: updated.comments || [
                    ...prev.comments || [],
                    {
                        _id: Date.now(),
                        text: comment,
                        user: user,
                        timestamp: new Date().toISOString()
                    }
                ],
                updatedAt: new Date().toISOString()
            }));

            setComment('');
            message.success('Comment added');
        } catch (error) {
            console.error('Failed to add comment:', error);
            message.error('Failed to add comment');
        } finally {
            setSending(false);
        }
    };



    // Delete handler - only for creator or admin
    const canDelete = user?.role === 'admin' ||
        currentIssue.assignedBy?._id === user?._id ||
        currentIssue.assignedBy === user?._id;

    const handleDelete = async () => {
        try {
            await taskService.deleteTask(currentIssue._id);
            message.success('Task deleted');
            onClose();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to delete task');
        }
    };

    const items = [
        {
            label: 'Status',
            children: (
                <Select
                    value={currentIssue.status}
                    onChange={v => handleUpdate('status', v)}
                    options={[
                        { value: 'todo', label: 'To Do' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'review', label: 'In Review' },
                        { value: 'done', label: 'Done' }
                    ]}
                    size="small"
                    style={{ width: 120 }}
                    disabled={loadingField === 'status'}
                />
            )
        },
        {
            label: 'Priority',
            children: (
                <Select
                    value={currentIssue.priority}
                    onChange={v => handleUpdate('priority', v)}
                    options={[
                        { value: 'low', label: '🟢 Low' },
                        { value: 'medium', label: '🟡 Medium' },
                        { value: 'high', label: '🟠 High' },
                        { value: 'critical', label: '🔴 Critical' }
                    ]}
                    size="small"
                    style={{ width: 120 }}
                    disabled={loadingField === 'priority'}
                />
            )
        },
        {
            label: 'Assignee',
            children: (
                <Select
                    mode="multiple"
                    value={currentIssue.assignedTo?.map(u => u._id || u) || []}
                    onChange={v => handleUpdate('assignedTo', v)}
                    style={{ width: '100%', minWidth: 150 }}
                    size="small"
                    placeholder="Unassigned"
                    optionFilterProp="label"
                    disabled={loadingField === 'assignedTo'}
                    loading={loadingField === 'assignedTo'}
                >
                    {users.map(u => (
                        <Select.Option key={u._id} value={u._id} label={u.fullName}>
                            <Space>
                                <Avatar size="small" style={{ backgroundColor: '#0052CC' }}>
                                    {u.fullName?.[0]}
                                </Avatar>
                                {u.fullName}
                            </Space>
                        </Select.Option>
                    ))}
                </Select>
            )
        },
        {
            label: 'Reporter',
            children: <Space>
                <Avatar size="small" style={{ backgroundColor: '#5E6C84' }}>
                    {currentIssue.reporter?.fullName?.[0]}
                </Avatar>
                {currentIssue.reporter?.fullName || 'Unknown'}
            </Space>
        },
        {
            label: 'Sprint',
            children: currentIssue.sprint?.name || 'Backlog'
        },
        {
            label: 'Story Points',
            children: (
                <Input
                    type="number"
                    style={{ width: 60 }}
                    value={currentIssue.storyPoints}
                    onChange={e => {
                        const val = e.target.value;
                        if (val && val !== String(currentIssue.storyPoints)) {
                            handleUpdate('storyPoints', parseInt(val) || 0);
                        }
                    }}
                    size="small"
                    disabled={loadingField === 'storyPoints'}
                />
            )
        },
        {
            label: 'Due Date',
            children: currentIssue.dueDate
                ? new Date(currentIssue.dueDate).toLocaleDateString()
                : <Text type="secondary">Not set</Text>
        }
    ];

    return (
        <Drawer
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Space>
                        <Tag color="blue">{currentIssue.issueType?.toUpperCase()}</Tag>
                        <Text type="secondary">{currentIssue.key}</Text>
                        <LinkOutlined />
                    </Space>
                    <Space>
                        <Button icon={<ShareAltOutlined />} size="small">Share</Button>
                        {canDelete && (
                            <Popconfirm
                                title="Delete this task?"
                                description="This action cannot be undone."
                                onConfirm={handleDelete}
                                okText="Delete"
                                okType="danger"
                                cancelText="Cancel"
                                icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                            >
                                <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
                            </Popconfirm>
                        )}
                        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
                    </Space>
                </div>
            }
            placement="right"
            width={isMobile ? '100%' : 640}
            onClose={onClose}
            open={open}
            closable={false}
            mask={false}
            styles={{ header: { padding: '12px 24px' } }}
        >
            <div style={{ paddingBottom: 24 }}>
                <Title level={4} style={{ marginBottom: 16 }}>
                    {currentIssue.title}
                </Title>

                <Space style={{ marginBottom: 20 }} wrap>
                    <Button icon={<PaperClipOutlined />} size="small">Attach</Button>
                    <Button icon={<LinkOutlined />} size="small">Link Issue</Button>
                </Space>

                <div style={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
                    <div>
                        <Title level={5}>Description</Title>
                        <Paragraph
                            style={{ minHeight: 60, color: '#172b4d', whiteSpace: 'pre-wrap' }}
                        >
                            {currentIssue.description || <Text type="secondary">No description</Text>}
                        </Paragraph>

                        <Tabs defaultActiveKey="1" items={[
                            {
                                key: '1',
                                label: `Comments (${currentIssue.comments?.length || 0})`,
                                children: (
                                    <>
                                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                            <Avatar style={{ backgroundColor: '#0052CC' }}>
                                                {user?.fullName?.[0]}
                                            </Avatar>
                                            <div style={{ flex: 1 }}>
                                                <TextArea
                                                    placeholder="Add a comment..."
                                                    autoSize={{ minRows: 2, maxRows: 6 }}
                                                    value={comment}
                                                    onChange={e => setComment(e.target.value)}
                                                    disabled={sending}
                                                />
                                                {comment && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <Button 
                                                            type="primary" 
                                                            size="small" 
                                                            onClick={handleAddComment} 
                                                            loading={sending} 
                                                            style={{ marginRight: 8 }}
                                                        >
                                                            {sending ? 'Posting...' : 'Post'}
                                                        </Button>
                                                        <Button size="small" type="text" onClick={() => setComment('')}>Cancel</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Comments List */}
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={currentIssue.comments || []}
                                            locale={{ emptyText: 'No comments yet. Start the conversation!' }}
                                            renderItem={(item) => (
                                                <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                                                    <List.Item.Meta
                                                        avatar={<Avatar size="small" style={{ backgroundColor: '#5E6C84' }}>
                                                            {item.user?.fullName?.[0] || 'U'}
                                                        </Avatar>}
                                                        title={
                                                            <Space size="small">
                                                                <Text strong>{item.user?.fullName || 'Unknown'}</Text>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                                    {formatRelativeTime(item.timestamp)}
                                                                </Text>
                                                            </Space>
                                                        }
                                                        description={
                                                            <div style={{ marginTop: 4, color: '#262626', whiteSpace: 'pre-wrap' }}>
                                                                {item.text}
                                                            </div>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </>
                                ),
                            },
                            {
                                key: '2',
                                label: 'Sub-Tasks',
                                children: (
                                    <SubTaskPanel
                                        parentTaskId={currentIssue._id}
                                        parentTask={currentIssue}
                                        onTaskUpdate={(updatedIssue) => {
                                            setCurrentIssue(updatedIssue);
                                        }}
                                    />
                                )
                            },
                            {
                                key: '3',
                                label: 'Time Logs',
                                children: (
                                    <WorkLogPanel 
                                        workItemId={currentIssue._id}
                                        onTimeUpdated={() => {
                                            // Refresh issue data if needed
                                        }}
                                    />
                                )
                            },
                            {
                                key: '4',
                                label: 'History',
                                children: (
                                    (currentIssue.history && currentIssue.history.length > 0) ?
                                        <Timeline
                                            items={(currentIssue.history || []).reverse().map((h, idx) => ({
                                                key: idx,
                                                color: 'blue',
                                                children: (
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {formatRelativeTime(h.timestamp)}
                                                        </Text>
                                                        <div style={{ marginTop: 4, fontSize: 12 }}>
                                                            <Text strong>{h.updatedBy?.fullName || 'User'}</Text> changed <Text code>{h.field}</Text> from <Text delete>{h.oldValue}</Text> to <Text underline>{h.newValue}</Text>
                                                        </div>
                                                    </div>
                                                )
                                            }))}
                                        /> :
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No history yet" />
                                )
                            }
                        ]} />
                    </div>

                    <Divider />

                    <div>
                        <Descriptions column={1} layout="horizontal" items={items} size="small" />
                        <Divider />
                        <div style={{ fontSize: 12, color: '#6B778C' }}>
                            <Space direction="vertical" size={0}>
                                <Text type="secondary">Created {currentIssue.createdAt ? new Date(currentIssue.createdAt).toLocaleDateString() : 'unknown'}</Text>
                                <Text type="secondary">
                                    Updated {currentIssue.updatedAt ? formatRelativeTime(currentIssue.updatedAt) : 'unknown'}
                                </Text>
                            </Space>
                        </div>
                    </div>
                </div>
            </div>
        </Drawer>
    );
};

export default IssueDetailDrawer;

