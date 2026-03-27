import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, Button, Select, Table, Tag, Avatar, Space, Empty, message, Typography, Row, Col, Divider, Input, Checkbox } from 'antd';
import { PlusOutlined, BugOutlined, CheckCircleOutlined, FileTextOutlined, HolderOutlined, SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import taskService from '../../services/taskService';
import CreateIssueModal from '../tasks/CreateIssueModal';
import './BacklogPage.css';

const { Title, Text } = Typography;

const ISSUE_TYPE_ICONS = {
    bug:     <BugOutlined style={{ color: '#EF4444' }} />,
    task:    <CheckCircleOutlined style={{ color: '#3B82F6' }} />,
    story:   <FileTextOutlined style={{ color: '#10B981' }} />,
    feature: <FileTextOutlined style={{ color: '#3B82F6' }} />,
    epic:    <FileTextOutlined style={{ color: '#F59E0B' }} />,
};

// Returns a CSS class for priority badges (design-system.css)
const getPriorityClass = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    return `priority-badge priority-${p}`;
};

const PRIORITY_LABEL = {
    highest: '↑↑ Highest',
    critical: '!! Critical',
    high:    '↑ High',
    medium:  '~ Medium',
    low:     '↓ Low',
    lowest:  '↓↓ Lowest',
};

// Returns a CSS class for status badges (design-system.css)
const getStatusClass = (status) => {
    const s = (status || 'todo').toLowerCase().replace(' ', '_');
    return `status-badge status-${s}`;
};

const STATUS_LABEL = {
    todo:        'To Do',
    backlog:     'Backlog',
    in_progress: 'In Progress',
    review:      'In Review',
    in_review:   'In Review',
    done:        'Done',
    completed:   'Completed',
    blocked:     'Blocked',
    cancelled:   'Cancelled',
};


const BacklogPage = () => {
    const { currentProject, sprints, activeSprint, syncTrigger } = useProject();
    const [backlogIssues, setBacklogIssues] = useState([]);
    const [sprintIssues, setSprintIssues] = useState([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState(null);
    const [epicFilter, setEpicFilter] = useState(null);
    const [, setLoading] = useState(false);
    const [selectedIssueIds, setSelectedIssueIds] = useState(new Set());

    const toggleSelection = (issueId) => {
        setSelectedIssueIds(prev => {
            const next = new Set(prev);
            if (next.has(issueId)) next.delete(issueId);
            else next.add(issueId);
            return next;
        });
    };

    const toggleAllBacklog = (e) => {
        if (e.target.checked) {
            const newSet = new Set(selectedIssueIds);
            filteredBacklogIssues.forEach(i => newSet.add(i._id));
            setSelectedIssueIds(newSet);
        } else {
            const newSet = new Set(selectedIssueIds);
            filteredBacklogIssues.forEach(i => newSet.delete(i._id));
            setSelectedIssueIds(newSet);
        }
    };

    const toggleAllSprint = (e) => {
        if (e.target.checked) {
            const newSet = new Set(selectedIssueIds);
            filteredSprintIssues.forEach(i => newSet.add(i._id));
            setSelectedIssueIds(newSet);
        } else {
            const newSet = new Set(selectedIssueIds);
            filteredSprintIssues.forEach(i => newSet.delete(i._id));
            setSelectedIssueIds(newSet);
        }
    };

    const totalSprintPoints = sprintIssues.reduce((sum, issue) => sum + (Number(issue.storyPoints) || 0), 0);

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
    }, [currentProject, activeSprint, sprints, syncTrigger]);

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
        const isCompleted = ['done', 'completed', 'cancelled'].includes((issue.status || issue.issueStatus || '').toLowerCase());
        const priority = (issue.priority || 'medium').toLowerCase();
        const status   = (issue.status  || issue.issueStatus || 'todo').toLowerCase();

        return (
            <Draggable draggableId={issue._id} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`issue-row ${snapshot.isDragging ? 'dragging' : ''}`}
                        style={{
                            ...provided.draggableProps.style,
                            backgroundColor: snapshot.isDragging ? '#EFF6FF' : 'transparent',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            marginBottom: '6px',
                            border: `1px solid ${snapshot.isDragging ? '#3B82F6' : '#E5E7EB'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isCompleted ? 0.65 : 1,
                            transition: 'box-shadow 0.15s, border-color 0.15s, background-color 0.15s',
                            boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.12)' : 'none',
                        }}
                    >
                        {/* Drag handle */}
                        <div {...provided.dragHandleProps} style={{ cursor: 'grab', padding: '0 4px', color: '#9CA3AF', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                            <HolderOutlined style={{ fontSize: 16 }} />
                        </div>

                        {/* Checkbox */}
                        <div className="flex-shrink-0 mr-1">
                            <Checkbox 
                                checked={selectedIssueIds.has(issue._id)} 
                                onChange={() => toggleSelection(issue._id)} 
                            />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center w-full gap-2 md:gap-3 overflow-hidden py-0.5">
                            {/* Mobile top row */}
                            <div className="flex items-center justify-between md:hidden w-full">
                                <div className="flex items-center gap-2">
                                    {ISSUE_TYPE_ICONS[issue.issueType?.toLowerCase()] || ISSUE_TYPE_ICONS.task}
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>
                                        {issue.key || `ISSUE-${issue._id?.slice(-4).toUpperCase()}`}
                                    </span>
                                </div>
                                {issue.priority && (
                                    <span className={getPriorityClass(issue.priority)}>
                                        <span className="priority-dot" />
                                        {PRIORITY_LABEL[priority] || issue.priority}
                                    </span>
                                )}
                            </div>

                            {/* Desktop: Icon + key */}
                            <div className="hidden md:flex items-center gap-2 w-36 shrink-0">
                                {ISSUE_TYPE_ICONS[issue.issueType?.toLowerCase()] || ISSUE_TYPE_ICONS.task}
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>
                                    {issue.key || `ISSUE-${issue._id?.slice(-4).toUpperCase()}`}
                                </span>
                            </div>

                            {/* Title */}
                            <div className="min-w-0 flex-1">
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: '#172B4D',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: '1.5',
                                        textDecoration: isCompleted ? 'line-through' : 'none',
                                    }}
                                    title={issue.title}
                                >
                                    {issue.title}
                                </div>
                            </div>

                            {/* Desktop: Priority badge + Status badge */}
                            <div className="hidden md:flex items-center gap-2 shrink-0">
                                {issue.priority && (
                                    <span className={getPriorityClass(issue.priority)}>
                                        <span className="priority-dot" />
                                        {PRIORITY_LABEL[priority] || issue.priority}
                                    </span>
                                )}
                                {issue.status && (
                                    <span className={getStatusClass(issue.status)}>
                                        {STATUS_LABEL[status] || issue.status}
                                    </span>
                                )}
                            </div>

                            {/* Desktop: Story Points & Due Date */}
                            <div className="hidden lg:flex items-center gap-3 shrink-0 text-xs text-gray-500 min-w-[90px] justify-end">
                                {issue.storyPoints != null && (
                                    <div style={{ background: '#E5E7EB', padding: '2px 6px', borderRadius: 10, fontWeight: 600, color: '#374151' }}>
                                        {issue.storyPoints}
                                    </div>
                                )}
                                {issue.dueDate && (
                                    <div className="flex items-center gap-1" style={{ color: new Date(issue.dueDate) < new Date() ? '#DC2626' : 'inherit' }}>
                                        <CalendarOutlined />
                                        <span>{new Date(issue.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                )}
                            </div>

                            {/* Assignee */}
                            <div className="flex justify-start md:justify-end w-full md:w-auto shrink-0 min-w-[40px]">
                                {issue.assignedTo && issue.assignedTo.length > 0 ? (
                                    <Avatar.Group max={{ count: 2 }} size="small">
                                        {issue.assignedTo.map(assignee => (
                                            <Avatar
                                                key={assignee._id}
                                                size="small"
                                                title={assignee.fullName || assignee.name}
                                                style={{ backgroundColor: '#3B82F6', fontSize: 10 }}
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
                                <div className="flex items-center gap-2">
                                    <Checkbox 
                                        onChange={toggleAllBacklog} 
                                        checked={filteredBacklogIssues.length > 0 && filteredBacklogIssues.every(i => selectedIssueIds.has(i._id))}
                                        indeterminate={filteredBacklogIssues.some(i => selectedIssueIds.has(i._id)) && !filteredBacklogIssues.every(i => selectedIssueIds.has(i._id))}
                                    />
                                    <Text strong>
                                        Backlog ({filteredBacklogIssues.length})
                                    </Text>
                                    {selectedIssueIds.size > 0 && (
                                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                            {selectedIssueIds.size} selected
                                        </Text>
                                    )}
                                </div>
                            }
                            style={{ height: '100%' }}
                            styles={{ body: { maxHeight: '600px', overflowY: 'auto' } }}
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
                                        <Checkbox 
                                            onChange={toggleAllSprint} 
                                            checked={filteredSprintIssues.length > 0 && filteredSprintIssues.every(i => selectedIssueIds.has(i._id))}
                                            indeterminate={filteredSprintIssues.some(i => selectedIssueIds.has(i._id)) && !filteredSprintIssues.every(i => selectedIssueIds.has(i._id))}
                                        />
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
                                        {activeSprint && totalSprintPoints > 0 && (
                                            <Tag color="purple" style={{ margin: 0, borderRadius: 12 }}>
                                                {totalSprintPoints} pts allocated
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
