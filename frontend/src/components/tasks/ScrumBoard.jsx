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
    const { currentProject, sprints, activeSprint } = useProject();
    const { mode } = useThemeMode();
    const isDark = mode === 'dark';

    // State Management
    const [selectedSprint, setSelectedSprint] = useState(null);
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
     * Initialize with active sprint
     */
    useEffect(() => {
        if (activeSprint) {
            setSelectedSprint(activeSprint._id);
        } else if (sprints.length > 0) {
            setSelectedSprint(sprints[0]._id);
        }
    }, [sprints, activeSprint]);

    const loadSprintTasks = useCallback(async () => {
        if (!selectedSprint) return;
        setLoading(true);
        try {
            // Fetch tasks for the selected sprint
            const sprintTasks = await taskService.getTasksBySprint(selectedSprint);

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
    }, [selectedSprint]);

    /**
     * Load sprint tasks and calculate metrics
     */
    useEffect(() => {
        if (selectedSprint && currentProject) {
            loadSprintTasks();
        }
    }, [selectedSprint, currentProject, refreshTrigger, loadSprintTasks]);

    /**
     * Reload when sprints data changes (when tasks are created/updated)
     */
    useEffect(() => {
        if (selectedSprint && sprints.length > 0) {
            // Auto-reload tasks when sprint data updates
            loadSprintTasks();
        }
    }, [sprints, selectedSprint, loadSprintTasks]);


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
        return sprints.find(s => s._id === selectedSprint);
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
                        value={selectedSprint}
                        onChange={setSelectedSprint}
                        style={{ width: 250 }}
                        placeholder="Select a sprint"
                        options={sprints.map(sprint => ({
                            label: `${sprint.name} (${sprint.status})`,
                            value: sprint._id,
                        }))}
                    />
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
