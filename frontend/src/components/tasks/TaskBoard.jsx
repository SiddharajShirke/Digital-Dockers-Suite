import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, Typography, Tag, Avatar, Space, Button, Empty, message, Select, Segmented, Grid, Tooltip, Input, Progress, Dropdown, Badge } from 'antd';
import { ClockCircleOutlined, FilterOutlined, DownloadOutlined, PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import { useThemeMode } from '../../context/ThemeContext';
import taskService from '../../services/taskService';
import IssueDetailDrawer from '../work/IssueDetailDrawer';
import CreateIssueModal from './CreateIssueModal';
import './TaskBoard.css';

const { Text, Title } = Typography;

const TaskBoard = () => {
    const { currentProject, activeSprint, selectedSprintId } = useProject();
    const { mode } = useThemeMode();
    const isDark = mode === 'dark';
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [boardData, setBoardData] = useState({});
    const [searchFilter, setSearchFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Mobile View State
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [mobileStatusFilter, setMobileStatusFilter] = useState('todo');
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const COLUMNS = {
        todo: {
            title: 'To Do',
            status: 'todo',
            wipLimit: null,
            color: isDark ? '#1c2128' : '#f8f9fa',
            dragColor: isDark ? 'rgba(56, 139, 253, 0.14)' : '#deebff',
            headerColor: isDark ? '#8b949e' : '#6B7280',
        },
        in_progress: {
            title: 'In Progress',
            status: 'in_progress',
            wipLimit: 5,
            color: isDark ? '#1c2128' : '#f8f9fa',
            dragColor: isDark ? 'rgba(56, 139, 253, 0.14)' : '#deebff',
            headerColor: isDark ? '#60A5FA' : '#3B82F6',
        },
        review: {
            title: 'In Review',
            status: 'review',
            wipLimit: 3,
            color: isDark ? '#1c2128' : '#f8f9fa',
            dragColor: isDark ? 'rgba(124, 58, 237, 0.16)' : '#F3E8FF',
            headerColor: isDark ? '#A78BFA' : '#7C3AED',
        },
        done: {
            title: 'Done',
            status: 'done',
            wipLimit: null,
            color: isDark ? '#1c2128' : '#f8f9fa',
            dragColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
            headerColor: isDark ? '#34D399' : '#10B981',
        },
    };

    // ── Quick filter options as visible pills ─────────────────────────
    const PRIORITY_PILLS = [
        { key: 'all', label: 'All' },
        { key: 'highest', label: '↑↑ Critical' },
        { key: 'high', label: '↑ High' },
        { key: 'medium', label: '~ Medium' },
        { key: 'low', label: '↓ Low' },
    ];

    useEffect(() => {
        if (currentProject) {
            loadBoardIssues();
        } else {
            setBoardData({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProject, selectedSprintId]);

    const loadBoardIssues = async () => {
        try {
            const params = { projectId: currentProject._id };
            if (selectedSprintId && selectedSprintId !== 'general') {
                params.sprintId = selectedSprintId;
            }
            const data = await taskService.getTasks(params);
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

            {/* Filters Section – Visible pill buttons */}
            <div className="kanban-filters">
                <Input.Search
                    placeholder="Search board"
                    style={{ width: 250 }}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    allowClear
                />

                {/* Priority quick-filter pills */}
                <div className="filter-pills">
                    {PRIORITY_PILLS.map(pill => (
                        <button
                            key={pill.key}
                            type="button"
                            className={`filter-pill ${priorityFilter === pill.key ? 'active' : ''}`}
                            onClick={() => setPriorityFilter(pill.key)}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>

                {/* Active filter chips */}
                {(priorityFilter !== 'all' || searchFilter) && (
                    <div className="active-filters">
                        {priorityFilter !== 'all' && (
                            <Tag
                                closable
                                onClose={() => setPriorityFilter('all')}
                                style={{ borderRadius: 12, fontSize: 11 }}
                                color="blue"
                            >
                                Priority: {PRIORITY_PILLS.find(p => p.key === priorityFilter)?.label}
                            </Tag>
                        )}
                        {searchFilter && (
                            <Tag
                                closable
                                onClose={() => setSearchFilter('')}
                                style={{ borderRadius: 12, fontSize: 11 }}
                                color="blue"
                            >
                                Search: "{searchFilter}"
                            </Tag>
                        )}
                        <Button
                            type="link"
                            size="small"
                            onClick={() => { setPriorityFilter('all'); setSearchFilter(''); }}
                            style={{ fontSize: 11, padding: 0, height: 'auto' }}
                        >
                            Clear all
                        </Button>
                    </div>
                )}

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
                            const col = COLUMNS[columnId];
                            const wipExceeded = col.wipLimit && filteredIssues.length > col.wipLimit;
                            return (
                                <div key={columnId} className={`kanban-column ${wipExceeded ? 'wip-exceeded' : ''}`}>
                                    {/* Column Header with WIP */}
                                    <div
                                        className="column-header"
                                        style={{ borderTopColor: col.headerColor }}
                                    >
                                        <div className="column-title">
                                            <span className="column-name">{col.title}</span>
                                            {/* WIP count badge */}
                                            {col.wipLimit ? (
                                                <Tooltip title={wipExceeded ? `Over WIP limit (${col.wipLimit})!` : `WIP limit: ${col.wipLimit}`}>
                                                    <span
                                                        className="wip-badge"
                                                        style={{
                                                            color: wipExceeded ? '#DC2626' : col.headerColor,
                                                            background: wipExceeded
                                                                ? 'rgba(220,38,38,0.1)'
                                                                : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'),
                                                            fontWeight: wipExceeded ? 700 : 600,
                                                        }}
                                                    >
                                                        {filteredIssues.length}/{col.wipLimit}
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                <Badge
                                                    count={filteredIssues.length}
                                                    style={{ backgroundColor: col.headerColor }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Tasks Container */}
                                    <Droppable droppableId={columnId}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`column-tasks ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${filteredIssues.length === 0 ? 'empty-drop-zone' : ''}`}
                                                style={{
                                                    backgroundColor: snapshot.isDraggingOver
                                                        ? col.dragColor
                                                        : col.color,
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
                                                        <InboxOutlined style={{ fontSize: 28, opacity: 0.3, marginBottom: 6 }} />
                                                        <Text type="secondary" style={{ fontSize: 12 }}>No tasks</Text>
                                                        <Text type="secondary" style={{ fontSize: 11, opacity: 0.6 }}>Drag issues here</Text>
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

// ─── Priority helpers ────────────────────────────────────────────────────────
const PRIORITY_BADGE_CLASS = {
    highest: 'priority-badge priority-highest',
    critical: 'priority-badge priority-critical',
    high: 'priority-badge priority-high',
    medium: 'priority-badge priority-medium',
    low: 'priority-badge priority-low',
    lowest: 'priority-badge priority-lowest',
};

const PRIORITY_LABEL = {
    highest: '↑↑ Highest',
    critical: '!! Critical',
    high: '↑ High',
    medium: '~ Medium',
    low: '↓ Low',
    lowest: '↓↓ Lowest',
};

// ─── Kanban Card Component ────────────────────────────────────────────────────
const KanbanCard = ({ issue, isDragging }) => {
    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date();
    const priority = (issue.priority || 'medium').toLowerCase();

    // Deterministic avatar color from issue id
    const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
    const avatarColor = AVATAR_COLORS[(issue._id?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

    // Progress: use subtasks completion ratio if available, else 0
    const totalSubs = issue.subtasks?.length || 0;
    const doneSubs = issue.subtasks?.filter(s => s.status === 'done' || s.completed).length || 0;
    const progress = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : (issue.progress ?? 0);

    // Three-dot menu items
    const menuItems = [
        { key: 'edit', label: 'Edit issue' },
        { key: 'assign', label: 'Assign to me' },
        { type: 'divider' },
        { key: 'delete', label: <span style={{ color: '#EF4444' }}>Delete</span> },
    ];

    return (
        <div
            className={`kanban-card ${isDragging ? 'dragging' : ''}`}
            style={{
                boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.25)' : undefined,
            }}
        >
            {/* ── Row 1: Priority badge + Issue key + three-dot menu ── */}
            <div className="card-top-row">
                {/* Priority badge */}
                <span className={PRIORITY_BADGE_CLASS[priority] || 'priority-badge priority-medium'}>
                    <span className="priority-dot" />
                    {PRIORITY_LABEL[priority] || priority}
                </span>

                {/* Issue key */}
                <span className="card-issue-key">
                    {issue.key || `TASK-${issue._id?.slice(-4).toUpperCase()}`}
                </span>

                {/* Three-dot menu — appears on hover via CSS */}
                <span
                    className="card-menu-btn"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Dropdown
                        menu={{ items: menuItems }}
                        trigger={['click']}
                        placement="bottomRight"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<span style={{ fontSize: 16, lineHeight: 1 }}>⋯</span>}
                            style={{ padding: '0 4px', minWidth: 24, height: 24 }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Dropdown>
                </span>
            </div>

            {/* ── Row 2: Title with full-text tooltip ── */}
            <Tooltip title={issue.title} placement="top" mouseEnterDelay={0.5}>
                <div className="card-title">
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#172B4D',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {issue.title}
                    </Text>
                </div>
            </Tooltip>

            {/* ── Labels ── */}
            {issue.labels && issue.labels.length > 0 && (
                <div className="card-labels">
                    {issue.labels.slice(0, 2).map((label, idx) => (
                        <Tag key={idx} style={{ fontSize: 10, border: 'none', borderRadius: 4, margin: 0 }}>
                            {label}
                        </Tag>
                    ))}
                    {issue.labels.length > 2 && (
                        <Tag style={{ fontSize: 10 }}>+{issue.labels.length - 2}</Tag>
                    )}
                </div>
            )}

            {/* ── Row 3: Footer — due date | story points | assignee ── */}
            <div className="card-footer">
                {/* Due date */}
                <div className="footer-left">
                    {issue.dueDate ? (
                        <Tooltip title={`Due: ${new Date(issue.dueDate).toLocaleDateString()}`}>
                            <Tag
                                icon={<span style={{ marginRight: 3 }}>📅</span>}
                                style={{
                                    fontSize: 11,
                                    margin: 0,
                                    background: isOverdue ? '#FEF2F2' : '#F3F4F6',
                                    color: isOverdue ? '#DC2626' : '#6B7280',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                }}
                            >
                                {new Date(issue.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Tag>
                        </Tooltip>
                    ) : (
                        <span style={{ width: 1 }} />
                    )}

                    {/* Story points */}
                    {issue.storyPoints != null && (
                        <Tooltip title="Story Points">
                            <span className="card-story-points">
                                <span style={{ marginRight: 2 }}>🔹</span>
                                {issue.storyPoints}
                            </span>
                        </Tooltip>
                    )}
                </div>

                {/* Assignee avatars */}
                <div className="footer-right">
                    {issue.assignedTo && issue.assignedTo.length > 0 ? (
                        <Tooltip title={issue.assignedTo.map(u => u.fullName || u.name).join(', ')}>
                            <Avatar.Group max={{ count: 2 }} size="small">
                                {issue.assignedTo.map(assignee => (
                                    <Avatar
                                        key={assignee._id}
                                        size="small"
                                        style={{ backgroundColor: avatarColor, fontSize: 10 }}
                                    >
                                        {(assignee.fullName || assignee.name || 'U')?.[0]?.toUpperCase()}
                                    </Avatar>
                                ))}
                            </Avatar.Group>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Unassigned">
                            <Avatar size="small" style={{ backgroundColor: '#E5E7EB', color: '#9CA3AF', fontSize: 10 }}>?</Avatar>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* ── Progress bar at very bottom ── */}
            {(progress > 0 || totalSubs > 0) && (
                <div className="card-progress-bar-wrap">
                    <Tooltip title={`${progress}% complete${totalSubs > 0 ? ` (${doneSubs}/${totalSubs} subtasks)` : ''}`}>
                        <div className="card-progress-bar-track">
                            <div
                                className="card-progress-bar-fill"
                                style={{
                                    width: `${progress}%`,
                                    background: progress === 100 ? '#10B981' : '#3B82F6',
                                }}
                            />
                        </div>
                    </Tooltip>
                </div>
            )}
        </div>
    );
};

export default TaskBoard;

