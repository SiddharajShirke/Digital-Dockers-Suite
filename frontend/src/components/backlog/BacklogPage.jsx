import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, Button, Select, Table, Tag, Avatar, Space, Empty, message, Typography, Row, Col, Divider, Input } from 'antd';
import { PlusOutlined, BugOutlined, CheckCircleOutlined, FileTextOutlined, HolderOutlined, SearchOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import taskService from '../../services/taskService';
import CreateIssueModal from '../tasks/CreateIssueModal';
import './BacklogPage.css';

const { Title, Text } = Typography;

const ISSUE_TYPE_ICONS = {
    bug: <BugOutlined style={{ color: '#ae2a19' }} />,
    task: <CheckCircleOutlined style={{ color: '#0052cc' }} />,
    story: <FileTextOutlined style={{ color: '#216e4e' }} />,
    feature: <FileTextOutlined style={{ color: '#0052cc' }} />,
    epic: <FileTextOutlined style={{ color: '#974f0c' }} />
};

const PRIORITY_COLORS = {
    highest: '#ae2a19',
    high: '#eb5757',
    medium: '#f59e0b',
    low: '#10b981',
    lowest: '#6b7280'
};

const BacklogPage = () => {
    const { currentProject, sprints, activeSprint } = useProject();
    const [backlogIssues, setBacklogIssues] = useState([]);
    const [sprintIssues, setSprintIssues] = useState([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState(null);
    const [epicFilter, setEpicFilter] = useState(null);
    const [, setLoading] = useState(false);

    const filteredBacklogIssues = useMemo(() => {
        return backlogIssues.filter(issue => {
            const matchesSearch = !searchText || issue.title?.toLowerCase().includes(searchText.toLowerCase()) || issue.key?.toLowerCase().includes(searchText.toLowerCase());
            return matchesSearch;
        });
    }, [backlogIssues, searchText]);

    const filteredSprintIssues = useMemo(() => {
        return sprintIssues.filter(issue => {
            const matchesSearch = !searchText || issue.title?.toLowerCase().includes(searchText.toLowerCase()) || issue.key?.toLowerCase().includes(searchText.toLowerCase());
            return matchesSearch;
        });
    }, [sprintIssues, searchText]);

    // Load issues on mount or when project/sprint changes
    useEffect(() => {
        if (currentProject?._id) {
            loadBacklogIssues();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProject, activeSprint, sprints]);

    const loadBacklogIssues = async () => {
        setLoading(true);
        try {
            const data = await taskService.getTasks({
                projectId: currentProject._id
            });

            // Separate into backlog and sprint issues
            const backlog = data.filter(issue => !issue.sprint);
            const sprint = data.filter(issue => issue.sprint?._id === activeSprint?._id);

            setBacklogIssues(backlog);
            setSprintIssues(sprint);
        } catch (error) {
            console.error('Failed to load issues:', error);
            message.error('Failed to load backlog');
        }
    };

    const handleDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId &&
            source.index === destination.index) return;

        const sourceSection = source.droppableId; // 'backlog' or 'sprint'
        const destSection = destination.droppableId;

        // Find the dragged issue
        const draggedIssue = [...backlogIssues, ...sprintIssues].find(i => i._id === draggableId);
        if (!draggedIssue) return;

        // Determine new sprint ID
        const newSprintId = destSection === 'sprint' ? activeSprint?._id : null;

        // Optimistic update
        if (sourceSection === 'backlog' && destSection === 'sprint') {
            setBacklogIssues(prev => prev.filter(i => i._id !== draggableId));
            setSprintIssues(prev => [...prev, { ...draggedIssue, sprint: activeSprint }]);
        } else if (sourceSection === 'sprint' && destSection === 'backlog') {
            setSprintIssues(prev => prev.filter(i => i._id !== draggableId));
            setBacklogIssues(prev => [...prev, { ...draggedIssue, sprint: null }]);
        }

        // API call
        try {
            await taskService.updateTask(draggableId, { sprint: newSprintId });
            message.success('Issue moved successfully');
        } catch (error) {
            console.error('Failed to move issue:', error);
            message.error('Failed to move issue');
            // Revert
            loadBacklogIssues();
        }
    };

    const IssueRow = ({ issue, index }) => {
        const isCompleted = ['done', 'completed'].includes((issue.status || issue.issueStatus || '').toLowerCase());

        return (
            <Draggable draggableId={issue._id} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`issue-row ${snapshot.isDragging ? 'dragging' : ''} ${isCompleted ? 'opacity-60 line-through' : ''}`}
                        style={{
                            ...provided.draggableProps.style,
                            backgroundColor: snapshot.isDragging ? '#f0f2f5' : 'transparent',
                            padding: '12px',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            border: '1px solid #e8e8e8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <div {...provided.dragHandleProps} style={{ cursor: 'grab', padding: '0 4px', color: '#bfbfbf' }}>
                            <HolderOutlined />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center w-full gap-2 md:gap-4 overflow-hidden py-1">
                            {/* Mobile Top Row: ID, Icon, Priority */}
                            <div className="flex items-center justify-between md:hidden w-full">
                                <div className="flex items-center gap-2">
                                    {ISSUE_TYPE_ICONS[issue.issueType?.toLowerCase()] || ISSUE_TYPE_ICONS.task}
                                    <Text strong style={{ fontSize: 12, color: '#0052cc' }}>
                                        {issue.key || `ISSUE-${issue._id?.slice(-4).toUpperCase()}`}
                                    </Text>
                                </div>
                                {issue.priority && (
                                    <Tag
                                        color={PRIORITY_COLORS[issue.priority?.toLowerCase()] || '#666'}
                                        style={{ fontSize: 11, margin: 0 }}
                                    >
                                        {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1).toLowerCase()}
                                    </Tag>
                                )}
                            </div>

                            {/* Desktop Left: Icon, ID */}
                            <div className="hidden md:flex items-center gap-3 w-32 shrink-0">
                                {ISSUE_TYPE_ICONS[issue.issueType?.toLowerCase()] || ISSUE_TYPE_ICONS.task}
                                <Text strong style={{ fontSize: 12, color: '#0052cc' }}>
                                    {issue.key || `ISSUE-${issue._id?.slice(-4).toUpperCase()}`}
                                </Text>
                            </div>

                            {/* Middle: Title */}
                            <div className="min-w-0 flex-1">
                                <div className="w-full" style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }} title={issue.title}>
                                    {issue.title}
                                </div>
                            </div>

                            {/* Desktop Right: Priority */}
                            <div className="hidden md:block w-24 shrink-0">
                                {issue.priority && (
                                    <Tag
                                        color={PRIORITY_COLORS[issue.priority?.toLowerCase()] || '#666'}
                                        style={{ fontSize: 11, margin: 0 }}
                                    >
                                        {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1).toLowerCase()}
                                    </Tag>
                                )}
                            </div>

                            {/* Right / Bottom Assignee */}
                            <div className="flex justify-start md:justify-end w-full md:w-32 shrink-0 border-t md:border-0 border-gray-100 pt-2 md:pt-0 mt-1 md:mt-0">
                                {issue.assignedTo && issue.assignedTo.length > 0 ? (
                                    <Avatar.Group maxCount={2} size="small">
                                        {issue.assignedTo.map(assignee => (
                                            <Avatar
                                                key={assignee._id}
                                                size="small"
                                                title={assignee.fullName || assignee.name}
                                            >
                                                {(assignee.fullName || assignee.name)?.[0]?.toUpperCase()}
                                            </Avatar>
                                        ))}
                                    </Avatar.Group>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12 }}>Unassigned</Text>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Draggable>
        );
    };

    if (!currentProject) {
        return <Empty description="Select a Project" />;
    }

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <Row align="middle" justify="space-between">
                    <Col>
                        <Title level={2} style={{ marginBottom: 0 }}>
                            {currentProject.name} - Backlog
                        </Title>
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateModalOpen(true)}
                        >
                            Create Issue
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* Create Issue Modal */}
            <CreateIssueModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onIssueCreated={() => {
                    loadBacklogIssues();
                    setCreateModalOpen(false);
                }}
            />

            {/* Filters */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <Input
                        placeholder="Search issues..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="w-full md:w-[250px]"
                    />
                    <Select placeholder="Assignee" className="w-full md:w-[150px]" allowClear onChange={setAssigneeFilter} value={assigneeFilter}>
                        <Select.Option value="1">John Doe</Select.Option>
                        <Select.Option value="2">Jane Smith</Select.Option>
                    </Select>
                    <Select placeholder="Epic" className="w-full md:w-[150px]" allowClear onChange={setEpicFilter} value={epicFilter}>
                        <Select.Option value="epic1">Frontend Overhaul</Select.Option>
                        <Select.Option value="epic2">Backend Performance</Select.Option>
                    </Select>
                </div>
            </div>

            {/* Main Content */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Row gutter={[32, 32]}>
                    {/* Backlog Section */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <Text strong>
                                    Backlog ({filteredBacklogIssues.length})
                                </Text>
                            }
                            style={{ height: '100%' }}
                            bodyStyle={{ maxHeight: '600px', overflowY: 'auto' }}
                        >
                            <Droppable droppableId="backlog">
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            backgroundColor: snapshot.isDraggingOver ? '#fafafa' : 'transparent',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        {filteredBacklogIssues.length === 0 ? (
                                            <Empty description="Your backlog is empty. Create an issue to get started." size="small" />
                                        ) : (
                                            filteredBacklogIssues.map((issue, index) => (
                                                <IssueRow
                                                    key={issue._id}
                                                    issue={issue}
                                                    index={index}
                                                />
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </Card>
                    </Col>

                    {/* Sprint Section */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <Text strong>
                                            {activeSprint?.name || 'No Active Sprint'} ({filteredSprintIssues.length})
                                        </Text>
                                        {activeSprint && (
                                            <Tag
                                                color={
                                                    activeSprint.status === 'active' ? '#52c41a' :
                                                        activeSprint.status === 'planning' ? '#1890ff' : '#999'
                                                }
                                                style={{ margin: 0 }}
                                            >
                                                {activeSprint.status}
                                            </Tag>
                                        )}
                                    </div>
                                    {activeSprint && (
                                        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                                            <Button size="small" type="default">Edit Dates</Button>
                                            <Button size="small" type="primary">Complete Sprint</Button>
                                        </div>
                                    )}
                                </div>
                            }
                            style={{ height: '100%' }}
                            styles={{ body: { maxHeight: '600px', overflowY: 'auto' } }}
                        >
                            {!activeSprint ? (
                                <Empty description="No active sprint selected" size="small" />
                            ) : (
                                <Droppable droppableId="sprint">
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                backgroundColor: snapshot.isDraggingOver ? '#deebff' : 'transparent',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            {filteredSprintIssues.length === 0 ? (
                                                <Empty description="Your sprint is empty. Create an issue to get started." size="small" />
                                            ) : (
                                                filteredSprintIssues.map((issue, index) => (
                                                    <IssueRow
                                                        key={issue._id}
                                                        issue={issue}
                                                        index={index}
                                                    />
                                                ))
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            )}
                        </Card>
                    </Col>
                </Row>
            </DragDropContext>
        </div>
    );
};

export default BacklogPage;
