import React, { useState, useEffect, useCallback } from 'react';
import { Select, Spin, Empty, Row, Col, Card, Statistic } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useProject } from '../../context/ProjectContext';
import { useThemeMode } from '../../context/ThemeContext';
import taskService from '../../services/taskService';
import './ScrumBoard.css';

/**
 * ScrumBoard - Sprint-based task board view
 * 
 * Features:
 * - Sprint selector dropdown
 * - Displays tasks only from selected sprint
 * - Drag-and-drop between status columns
 * - Sprint progress metrics
 * - Auto-defaults to active sprint
 * 
 * @component
 */
const ScrumBoard = () => {
    const { currentProject, sprints, activeSprint, selectedSprintId, setSelectedSprintId, syncTrigger } = useProject();
    const { mode } = useThemeMode();
    const isDark = mode === 'dark';

    // State Management
    const [tasks, setTasks] = useState({});
    const [loading, setLoading] = useState(false);
    const [refreshTrigger] = useState(0);
    const [sprintMetrics, setSprintMetrics] = useState({
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
    });

    // Board column configuration - reused from Kanban
    const COLUMNS = {
        'TODO': {
            name: 'To Do',
            color: isDark ? '#8b949e' : '#626f86',
            bgColor: isDark ? '#1c2128' : '#f8f9fa',
            dragBgColor: isDark ? 'rgba(56, 139, 253, 0.14)' : '#deebff',
        },
        'IN_PROGRESS': {
            name: 'In Progress',
            color: isDark ? '#58a6ff' : '#0052cc',
            bgColor: isDark ? '#1c2128' : '#f8f9fa',
            dragBgColor: isDark ? 'rgba(56, 139, 253, 0.14)' : '#deebff',
        },
        'DONE': {
            name: 'Done',
            color: isDark ? '#3fb950' : '#216e4e',
            bgColor: isDark ? '#1c2128' : '#f8f9fa',
            dragBgColor: isDark ? 'rgba(63, 185, 80, 0.16)' : '#dffcf0',
        },
    };

    /**
     * Initialize with active sprint if no selection exists
     */
    useEffect(() => {
        if (selectedSprintId === 'general' && activeSprint) {
            // If it's general, we stay general. 
            // But if we want to auto-select active on first load:
            // setSelectedSprintId(activeSprint._id);
        }
    }, [activeSprint, selectedSprintId]);

    const loadSprintTasks = useCallback(async () => {
        if (!selectedSprintId && !currentProject) return;
        setLoading(true);
        try {
            // Fetch tasks for the selected sprint OR all tasks for project if general
            const sprintTasks = selectedSprintId === 'general' 
                ? await taskService.getTasksByProject(currentProject._id)
                : await taskService.getTasksBySprint(selectedSprintId);

            // Group tasks by status
            const groupedTasks = {
                TODO: [],
                IN_PROGRESS: [],
                DONE: [],
            };

            sprintTasks.forEach(task => {
                const status = task.status?.toUpperCase() || 'TODO';
                if (groupedTasks[status]) {
                    groupedTasks[status].push(task);
                }
            });

            setTasks(groupedTasks);

            // Calculate metrics
            const completed = groupedTasks.DONE.length;
            const inProgress = groupedTasks.IN_PROGRESS.length;
            const todo = groupedTasks.TODO.length;
            const total = sprintTasks.length;

            setSprintMetrics({
                total,
                completed,
                inProgress,
                todo,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
        } catch (error) {
            console.error('Failed to load sprint tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedSprintId, currentProject]);

    useEffect(() => {
        if (selectedSprintId && currentProject) {
            loadSprintTasks();
        }
    }, [selectedSprintId, currentProject, refreshTrigger, loadSprintTasks, syncTrigger]);


    /**
     * Handle task drag and drop
     */
    const handleDragEnd = useCallback(async (result) => {
        const { source, destination, draggableId } = result;

        // No-op if dropped outside valid area
        if (!destination) return;

        // No-op if dropped in same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return;

        // Extract status from column ID
        const newStatus = destination.droppableId.toUpperCase();
        const taskId = draggableId;

        // Optimistic UI update
        const taskToMove = [
            ...(tasks.TODO || []),
            ...(tasks.IN_PROGRESS || []),
            ...(tasks.DONE || []),
        ].find(t => t._id === taskId);

        if (taskToMove) {
            // Update local state
            const oldStatus = taskToMove.status.toUpperCase();
            setTasks(prev => ({
                ...prev,
                [oldStatus]: prev[oldStatus].filter(t => t._id !== taskId),
                [newStatus]: [
                    ...prev[newStatus],
                    { ...taskToMove, status: newStatus.toLowerCase() }
                ],
            }));

            // Update backend
            try {
                await taskService.updateTask(taskId, {
                    status: newStatus.toLowerCase()
                });
            } catch (error) {
                console.error('Failed to update task status:', error);
                // Reload to revert
                loadSprintTasks();
            }
        }
    }, [tasks, loadSprintTasks]);

    /**
     * Get selected sprint details
     */
    const getCurrentSprintDetails = () => {
        if (selectedSprintId === 'general') return { name: 'General (Project Wide)', status: 'Active' };
        return sprints.find(s => s._id === selectedSprintId);
    };

    if (loading && Object.values(tasks).every(col => col.length === 0)) {
        return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }} />;
    }

    const currentSprint = getCurrentSprintDetails();

    return (
        <div className="scrum-board-container">
            {/* Sprint Header Section */}
            <div className="scrum-board-header">
                <div className="sprint-selector-section">
                    <label>Select Sprint:</label>
                    <Select
                        value={selectedSprintId}
                        onChange={setSelectedSprintId}
                        style={{ width: 300 }}
                        placeholder="Select a sprint"
                    >
                        <Select.Option value="general">🌐 General (Project Wide)</Select.Option>
                        {sprints.map(sprint => (
                            <Select.Option key={sprint._id} value={sprint._id}>
                                🏃 {sprint.name} ({sprint.status})
                            </Select.Option>
                        ))}
                    </Select>
                </div>

                {currentSprint && (
                    <div className="sprint-details">
                        <span className="sprint-name">{currentSprint.name}</span>
                        <span className={`sprint-status status-${currentSprint.status.toLowerCase()}`}>
                            {currentSprint.status}
                        </span>
                    </div>
                )}
            </div>

            {/* Sprint Metrics */}
            {currentSprint && (
                <Card className="sprint-metrics-card">
                    <Row gutter={[24, 0]}>
                        <Col xs={24} sm={12} md={6}>
                            <Statistic
                                title="Total Tasks"
                                value={sprintMetrics.total}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Statistic
                                title="To Do"
                                value={sprintMetrics.todo}
                                styles={{ content: { color: isDark ? '#8b949e' : '#626f86' } }}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Statistic
                                title="In Progress"
                                value={sprintMetrics.inProgress}
                                styles={{ content: { color: isDark ? '#58a6ff' : '#0052cc' } }}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Statistic
                                title="Completed"
                                value={sprintMetrics.completed}
                                suffix={`/ ${sprintMetrics.total}`}
                                styles={{ content: { color: isDark ? '#3fb950' : '#216e4e' } }}
                            />
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Scrum Board */}
            {sprintMetrics.total === 0 ? (
                <Empty
                    description="No tasks in this sprint"
                    style={{ marginTop: 40 }}
                />
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="scrum-board">
                        {Object.entries(COLUMNS).map(([statusKey, columnConfig]) => (
                            <Droppable key={statusKey} droppableId={statusKey}>
                                {(provided, snapshot) => (
                                    <div
                                        className={`scrum-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            backgroundColor: snapshot.isDraggingOver
                                                ? columnConfig.dragBgColor
                                                : columnConfig.bgColor,
                                            ...provided.droppableProps.style,
                                        }}
                                    >
                                        {/* Column Header */}
                                        <div className="scrum-column-header">
                                            <div className="column-title">
                                                <span
                                                    className="column-dot"
                                                    style={{ backgroundColor: columnConfig.color }}
                                                />
                                                <span className="column-name">{columnConfig.name}</span>
                                            </div>
                                            <span className="column-count">
                                                {tasks[statusKey]?.length || 0}
                                            </span>
                                        </div>

                                        {/* Tasks */}
                                        <div className="scrum-tasks">
                                            {(tasks[statusKey] || []).map((task, index) => (
                                                <Draggable
                                                    key={task._id}
                                                    draggableId={task._id}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`scrum-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                                        >
                                                            {/* Task Key */}
                                                            <div className="scrum-card-key">
                                                                <span className="task-key-badge" style={{ backgroundColor: columnConfig.color }}>
                                                                    {task.key || `TASK-${task._id.slice(0, 6)}`}
                                                                </span>
                                                            </div>

                                                            {/* Task Title */}
                                                            <div className="scrum-card-title">
                                                                {task.title}
                                                            </div>

                                                            {/* Task Metadata */}
                                                            <div className="scrum-card-footer">
                                                                {task.priority && (
                                                                    <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                                                                        {task.priority}
                                                                    </span>
                                                                )}
                                                                {task.assignee && (
                                                                    <span className="assignee">
                                                                        {task.assignee.name?.split(' ')[0]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </DragDropContext>
            )}
        </div>
    );
};

export default ScrumBoard;
