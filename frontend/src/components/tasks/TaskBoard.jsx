import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, Typography, Tag, Avatar, Space, Button, Empty, message, Select, Segmented, Grid, Tooltip, Input, Progress, Dropdown, Badge } from 'antd';
import { ClockCircleOutlined, FilterOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import taskService from '../../services/taskService';
import IssueDetailDrawer from '../work/IssueDetailDrawer';
import CreateIssueModal from './CreateIssueModal';
import './TaskBoard.css';

const { Text, Title } = Typography;

const COLUMNS = {
    'todo': { title: 'Backlog', status: 'todo', color: '#f8f9fa', headerColor: '#626f86', bgColor: '#fafbfc' },
    'in_progress': { title: 'In Progress', status: 'in_progress', color: '#f8f9fa', headerColor: '#0052cc', bgColor: '#deebff' },
    'review': { title: 'In Review', status: 'review', color: '#f8f9fa', headerColor: '#ae2a19', bgColor: '#ffeceb' },
    'done': { title: 'Done', status: 'done', color: '#f8f9fa', headerColor: '#216e4e', bgColor: '#dffcf0' }
};

const TaskBoard = () => {
    const { currentProject, activeSprint } = useProject();
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [boardData, setBoardData] = useState({});
    const [searchFilter, setSearchFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Mobile View State
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [mobileStatusFilter, setMobileStatusFilter] = useState('todo');
    const [createModalOpen, setCreateModalOpen] = useState(false);

    useEffect(() => {
        if (currentProject && activeSprint) {
            loadSprintIssues();
        } else {
            setBoardData({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProject, activeSprint]);

    const loadSprintIssues = async () => {
        try {
            const data = await taskService.getTasks({
                projectId: currentProject._id,
                sprintId: activeSprint._id
            });
            groupIssuesByStatus(data);
        } catch (error) {
            console.error("Failed to load board issues", error);
        }
    };

    const groupIssuesByStatus = (taskList) => {
        const grouped = {
            'todo': [],
            'in_progress': [],
            'review': [],
            'done': []
        };

        taskList.forEach(task => {
            const status = task.status || 'todo';
            if (grouped[status]) {
                grouped[status].push(task);
            } else {
                grouped['todo'].push(task);
            }
        });
        setBoardData(grouped);
    };

    const getFilteredIssues = (columnIssues) => {
        return columnIssues.filter(issue => {
            const matchesSearch = issue.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                                 issue.key.toLowerCase().includes(searchFilter.toLowerCase());
            const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
            return matchesSearch && matchesPriority;
        });
    };





    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        const startStatus = source.droppableId;
        const finishStatus = destination.droppableId;

        // Optimistic UI Update
        const newBoardData = { ...boardData };

        // Remove from source
        const [movedIssue] = newBoardData[startStatus].splice(source.index, 1);
        // Add to destination
        newBoardData[finishStatus].splice(destination.index, 0, movedIssue);

        setBoardData(newBoardData);

        // API Call
        try {
            await taskService.updateTask(draggableId, { status: finishStatus });
            message.success(`Task moved to ${COLUMNS[finishStatus].title}`);
        } catch (error) {
            console.error('Failed to update task status:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to update status';
            message.error(errorMsg);
            loadSprintIssues(); // Revert
        }
    };

    if (!currentProject) return <Empty description="Select a Project" />;
    if (!activeSprint) return <Empty description="No Active Sprint" />;

    return (
        <div className="kanban-board-container">
            {/* Header Section */}
            <div className="kanban-header">
                <div className="header-left">
                    <div className="header-title-section">
                        <Title level={2} style={{ marginBottom: 4, marginTop: 0 }}>
                            {currentProject.name}
                        </Title>
                        <div className="header-breadcrumb">
                            <Text type="secondary">{activeSprint.name} • Board</Text>
                        </div>
                    </div>
                </div>
                {!isMobile && (
                    <div className="header-right">
                        <span className="task-count-badge">
                            <Text type="secondary">{Object.values(boardData).flat().length} issues</Text>
                        </span>
                    </div>
                )}
            </div>

            {/* Filters Section */}
            <div className="kanban-filters">
                <Input.Search
                    placeholder="Search board"
                    style={{ width: 250 }}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    allowClear
                />
                <Select
                    placeholder="Epic"
                    style={{ width: 150 }}
                    options={[
                        { value: 'all', label: 'All Epics' },
                        { value: 'frontend', label: 'Frontend' },
                        { value: 'backend', label: 'Backend' }
                    ]}
                />
                <Select
                    placeholder="Type"
                    style={{ width: 120 }}
                    options={[
                        { value: 'all', label: 'All Types' },
                        { value: 'task', label: 'Task' },
                        { value: 'bug', label: 'Bug' },
                        { value: 'feature', label: 'Feature' }
                    ]}
                />
                <Dropdown
                    menu={{
                        items: [
                            { key: 'all', label: 'All' },
                            { key: 'high', label: 'High Priority' },
                            { key: 'medium', label: 'Medium Priority' },
                            { key: 'low', label: 'Low Priority' }
                        ],
                        onClick: (e) => setPriorityFilter(e.key)
                    }}
                >
                    <Button icon={<FilterOutlined />}>Quick filters</Button>
                </Dropdown>
                <div style={{ marginLeft: 'auto' }}>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalOpen(true)}
                    >
                        Create Issue
                    </Button>
                </div>
            </div>

            {isMobile ? (
                // MOBILE VIEW
                <div className="kanban-mobile">
                    <Segmented
                        block
                        options={Object.keys(COLUMNS).map(key => ({
                            label: `${COLUMNS[key].title} (${getFilteredIssues(boardData[key] || []).length})`,
                            value: key
                        }))}
                        value={mobileStatusFilter}
                        onChange={setMobileStatusFilter}
                    />

                    <div className="mobile-tasks-container">
                        {getFilteredIssues(boardData[mobileStatusFilter] || []).map(issue => (
                            <KanbanCard
                                key={issue._id}
                                issue={issue}
                                onClick={() => setSelectedIssue(issue)}
                            />
                        ))}
                        {getFilteredIssues(boardData[mobileStatusFilter] || []).length === 0 && (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" />
                        )}
                    </div>
                </div>
            ) : (
                // DESKTOP VIEW: Kanban Columns
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="kanban-board">
                        {Object.keys(COLUMNS).map(columnId => {
                            const filteredIssues = getFilteredIssues(boardData[columnId] || []);
                            return (
                                <div key={columnId} className="kanban-column">
                                    {/* Column Header */}
                                    <div
                                        className="column-header"
                                        style={{ borderTopColor: COLUMNS[columnId].headerColor }}
                                    >
                                        <div className="column-title">
                                            <span className="column-name">{COLUMNS[columnId].title}</span>
                                            <Badge 
                                                count={filteredIssues.length} 
                                                style={{ backgroundColor: COLUMNS[columnId].headerColor }}
                                            />
                                        </div>
                                    </div>

                                    {/* Tasks Container */}
                                    <Droppable droppableId={columnId}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`column-tasks ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                                style={{
                                                    backgroundColor: COLUMNS[columnId].color,
                                                }}
                                            >
                                                {filteredIssues.map((issue, index) => (
                                                    <Draggable
                                                        key={issue._id}
                                                        draggableId={issue._id}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => setSelectedIssue(issue)}
                                                            >
                                                                <KanbanCard
                                                                    issue={issue}
                                                                    isDragging={snapshot.isDragging}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                                {filteredIssues.length === 0 && (
                                                    <div className="empty-column">
                                                        <Text type="secondary">No tasks</Text>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}

            <IssueDetailDrawer
                open={!!selectedIssue}
                issue={selectedIssue}
                onClose={() => {
                    setSelectedIssue(null);
                    loadSprintIssues();
                }}
            />

            <CreateIssueModal 
                open={createModalOpen} 
                onClose={() => setCreateModalOpen(false)}
                onIssueCreated={() => {
                    loadSprintIssues();
                    setCreateModalOpen(false);
                }}
            />
        </div>
    );
};

// Kanban Card Component
const KanbanCard = ({ issue, isDragging }) => {
    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date();

    // Generate random color for the task key based on the issue ID
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#87CEEB'];
    const colorIndex = (issue._id?.charCodeAt(0) || 0) % colors.length;
    const keyColor = colors[colorIndex];

    return (
        <div
            className={`kanban-card ${isDragging ? 'dragging' : ''}`}
            style={{
                boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
            }}
        >
            {/* Card Key */}
            <div className="card-key">
                <span className="key-badge" style={{ backgroundColor: keyColor }}>
                    {issue.key || `TASK-${issue._id?.slice(-4).toUpperCase()}`}
                </span>
            </div>

            {/* Card Title */}
            <div className="card-title">
                <Text ellipsis={{ rows: 2, tooltip: true }} style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                    {issue.title}
                </Text>
            </div>

            {/* Card Labels/Tags */}
            {issue.labels && issue.labels.length > 0 && (
                <div className="card-labels">
                    {issue.labels.slice(0, 2).map((label, idx) => (
                        <Tag 
                            key={idx} 
                            style={{ 
                                fontSize: 10, 
                                backgroundColor: '#DCDCDC', 
                                color: '#262626',
                                border: 'none'
                            }}
                        >
                            {label}
                        </Tag>
                    ))}
                    {issue.labels.length > 2 && (
                        <Tag style={{ fontSize: 10 }}>+{issue.labels.length - 2}</Tag>
                    )}
                </div>
            )}

            {/* Card Footer */}
            <div className="card-footer">
                <div className="footer-left">
                    {issue.dueDate && (
                        <Tooltip title={`Due: ${new Date(issue.dueDate).toLocaleDateString()}`}>
                            <Tag
                                icon={<ClockCircleOutlined />}
                                color={isOverdue ? 'error' : 'default'}
                                style={{ fontSize: 10, margin: 0, marginRight: 4 }}
                            >
                                {new Date(issue.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Tag>
                        </Tooltip>
                    )}
                </div>
                <div className="footer-right">
                    {issue.assignedTo && issue.assignedTo.length > 0 && (
                        <Tooltip title={issue.assignedTo.map(u => u.fullName || u.name).join(', ')}>
                            <Avatar.Group maxCount={2} size="small" style={{ marginLeft: 8 }}>
                                {issue.assignedTo.map(assignee => (
                                    <Avatar
                                        key={assignee._id}
                                        size="small"
                                        style={{ 
                                            backgroundColor: keyColor,
                                            fontSize: 10
                                        }}
                                    >
                                        {(assignee.fullName || assignee.name || 'U')?.[0]?.toUpperCase()}
                                    </Avatar>
                                ))}
                            </Avatar.Group>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskBoard;
