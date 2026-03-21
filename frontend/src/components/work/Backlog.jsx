import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, Button, Typography, Tag, Avatar, Space, Modal, theme, Empty, Input, message } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import taskService from '../../services/taskService';
import sprintService from '../../services/sprintService';
import IssueDetailDrawer from './IssueDetailDrawer';

const { Text, Title } = Typography;

const Backlog = () => {
    const { currentProject, sprints, refreshBoard } = useProject();
    const [backlogIssues, setBacklogIssues] = useState([]);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
    const [allTasks, setAllTasks] = useState([]);

    // Sprint Form
    const [sprintName, setSprintName] = useState('');
    const [sprintGoal, setSprintGoal] = useState('');

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const loadAllTasks = async () => {
        try {
            const data = await taskService.getTasks({ projectId: currentProject._id });
            setAllTasks(data);
        } catch {
            // console.error("Failed to load tasks", error);
        }
    };

    useEffect(() => {
        if (currentProject) {
            loadAllTasks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProject]);

    // Derived state update when allTasks or sprints change
    useEffect(() => {
        // Filter strictly for backlog (no sprint assigned)
        setBacklogIssues(allTasks.filter(t => !t.sprint));
    }, [allTasks, sprints]);

    const handleCreateSprint = async () => {
        if (!sprintName) return;
        try {
            await sprintService.createSprint({
                name: sprintName,
                goal: sprintGoal,
                projectId: currentProject._id
            });
            message.success('Sprint created');
            setIsCreateSprintModalOpen(false);
            setSprintName('');
            setSprintGoal('');
            refreshBoard(); // Refresh sprints in context
        } catch {
            message.error('Failed to create sprint');
        }
    };

    const handleStartSprint = async (sprintId) => {
        try {
            await sprintService.startSprint(sprintId);
            message.success('Sprint started!');
            refreshBoard();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to start sprint');
        }
    };

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        // Optimistic Update
        const targetSprintId = destination.droppableId === 'backlog' ? null : destination.droppableId;

        // Update local state first for speed
        const updatedTasks = allTasks.map(t => {
            if (t._id === draggableId) {
                return { ...t, sprint: targetSprintId };
            }
            return t;
        });
        setAllTasks(updatedTasks);

        try {
            await taskService.updateTask(draggableId, { sprint: targetSprintId });
            refreshBoard(); // Sync context
        } catch {
            message.error('Failed to move issue');
            loadAllTasks(); // Revert on error
        }
    };

    // Helper to get issues for a specific sprint
    const getSprintIssues = (sprintId) => {
        return allTasks.filter(t => t.sprint && (t.sprint._id === sprintId || t.sprint === sprintId));
    };

    if (!currentProject) return <Empty description="Select a project" />;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <Title level={3}>Backlog</Title>
                    <Text type="secondary">{currentProject.name} ({currentProject.key})</Text>
                </div>
                <Button type="primary" onClick={() => setIsCreateSprintModalOpen(true)}>Create Sprint</Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                {sprints.map(sprint => (
                    <Card
                        key={sprint._id}
                        style={{ marginBottom: 24, background: colorBgContainer }}
                        styles={{ body: { padding: 24 } }}
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space orientation="vertical" size={0}>
                                    <Space>
                                        <Text strong>{sprint.name}</Text>
                                        <Tag color={sprint.status === 'active' ? 'green' : 'default'}>{sprint.status}</Tag>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'Planned'} • {getSprintIssues(sprint._id).length} issues
                                    </Text>
                                </Space>
                                <Space>
                                    {sprint.status !== 'closed' && (
                                        <Button size="small" onClick={() => handleStartSprint(sprint._id)}>
                                            {sprint.status === 'active' ? 'Complete Sprint' : 'Start Sprint'}
                                        </Button>
                                    )}
                                    <Button type="text" icon={<EllipsisOutlined />} />
                                </Space>
                            </div>
                        }
                    >
                        <Droppable droppableId={sprint._id}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    style={{
                                        background: snapshot.isDraggingOver ? '#f4f5f7' : 'transparent',
                                        padding: 8,
                                        minHeight: 50
                                    }}
                                >
                                    {getSprintIssues(sprint._id).map((issue, index) => (
                                        <Draggable key={issue._id} draggableId={issue._id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => setSelectedIssue(issue)}
                                                    style={{
                                                        padding: '12px 16px',
                                                        marginBottom: 8,
                                                        background: 'white',
                                                        border: '1px solid #dfe1e6',
                                                        borderRadius: 4,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        ...provided.draggableProps.style
                                                    }}
                                                >
                                                    <Space>
                                                        <Tag color="blue">{issue.issueType}</Tag>
                                                        <Text type="secondary" style={{ width: 80 }}>{issue.key}</Text>
                                                        <Text>{issue.title}</Text>
                                                    </Space>
                                                    <Space>
                                                        <Tag color={issue.priority === 'high' ? 'red' : 'orange'}>{issue.priority}</Tag>
                                                        <Avatar size="small" style={{ backgroundColor: '#0052CC' }}>{issue.assignedTo?.[0]?.fullName?.[0]}</Avatar>
                                                        <div style={{ background: '#dfe1e6', borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>
                                                            {issue.storyPoints || '-'}
                                                        </div>
                                                    </Space>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </Card>
                ))}

                {/* Backlog Section */}
                <Card
                    title={<Text strong>Backlog ({backlogIssues.length} issues)</Text>}
                    variant="borderless"
                    style={{ background: 'transparent' }}
                    styles={{ body: { padding: 0 } }}
                >
                    <Droppable droppableId="backlog">
                        {(provided, snapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                style={{
                                    background: snapshot.isDraggingOver ? 'rgba(0,0,0,0.02)' : 'transparent',
                                    padding: 8,
                                    minHeight: 100
                                }}
                            >
                                {backlogIssues.map((issue, index) => (
                                    <Draggable key={issue._id} draggableId={issue._id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                onClick={() => setSelectedIssue(issue)}
                                                style={{
                                                    padding: '12px 16px',
                                                    marginBottom: 8,
                                                    background: 'white',
                                                    border: '1px solid #dfe1e6',
                                                    borderRadius: 4,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer',
                                                    ...provided.draggableProps.style
                                                }}
                                            >
                                                <Space>
                                                    <Tag color="blue">{issue.issueType}</Tag>
                                                    <Text type="secondary" style={{ width: 80 }}>{issue.key}</Text>
                                                    <Text>{issue.title}</Text>
                                                </Space>
                                                <Space>
                                                    <Tag color={issue.priority === 'high' ? 'red' : 'orange'}>{issue.priority}</Tag>
                                                    <Avatar size="small" style={{ backgroundColor: '#5E6C84' }}>{issue.assignedTo?.[0]?.fullName?.[0]}</Avatar>
                                                    <div style={{ background: '#dfe1e6', borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>
                                                        {issue.storyPoints || '-'}
                                                    </div>
                                                </Space>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </Card>
            </DragDropContext>

            <IssueDetailDrawer
                open={!!selectedIssue}
                issue={selectedIssue}
                onClose={() => {
                    setSelectedIssue(null);
                    loadAllTasks(); // Refresh on close if edits happened
                }}
            />

            <Modal title="Create Sprint" open={isCreateSprintModalOpen} onOk={handleCreateSprint} onCancel={() => setIsCreateSprintModalOpen(false)}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Input placeholder="Sprint Name" value={sprintName} onChange={e => setSprintName(e.target.value)} />
                    <Input placeholder="Sprint Goal" value={sprintGoal} onChange={e => setSprintGoal(e.target.value)} />
                </Space>
            </Modal>
        </div>
    );
};

export default Backlog;
