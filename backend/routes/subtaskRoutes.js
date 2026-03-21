/**
 * ============================================================================
 * SUBTASK ROUTES
 * ============================================================================
 * 
 * REST API endpoints for managing sub-tasks and parent-child relationships
 * 
 * Endpoints:
 * POST   /api/work-items/:parentId/subtasks
 * GET    /api/work-items/:parentId/subtasks
 * GET    /api/work-items/:id/hierarchy
 * POST   /api/work-items/:childId/move/:newParentId
 * POST   /api/work-items/:childId/detach
 * PATCH  /api/work-items/:id/status
 * DELETE /api/work-items/:id/validate-delete
 * POST   /api/work-items/:parentId/subtasks/bulk-status
 * GET    /api/work-items/:id/story-points
 */

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const WorkItemService = require('../services/workItemService');
const workLogController = require('../controllers/workLogController');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middlewares/authMiddleware');

// Middleware: Ensure user is authenticated (using centralized middleware)

// ============================================================================
// POST /api/work-items/:parentId/subtasks
// ============================================================================
/**
 * Create a new sub-task under a parent work item
 * 
 * Request Body:
 * {
 *   "title": "Task name",
 *   "description": "Details",
 *   "priority": "high",
 *   "assignedTo": ["user-id"],
 *   "storyPoints": 5
 * }
 * 
 * Response: 201 Created
 * {
 *   "success": true,
 *   "subtask": { ... }
 * }
 */
router.post('/:parentId/subtasks', protect, asyncHandler(async (req, res) => {
    const { parentId } = req.params;
    const { title, description, priority, assignedTo, storyPoints } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Subtask title is required'
        });
    }

    try {
        const subtask = await WorkItemService.createSubtask(
            parentId,
            {
                title: title.trim(),
                description,
                priority,
                assignedTo,
                storyPoints
            },
            req.user._id
        );

        res.status(201).json({
            success: true,
            subtask
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// GET /api/work-items/:parentId/subtasks
// ============================================================================
/**
 * Get all sub-tasks of a parent work item
 * 
 * Query Parameters:
 * - skip: number (default 0)
 * - limit: number (default 50)
 * - status: string (optional, filter by status)
 * - sortBy: string (default 'createdAt')
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "children": [...],
 *     "total": 10,
 *     "skip": 0,
 *     "limit": 50,
 *     "hasMore": false
 *   }
 * }
 */
router.get('/:parentId/subtasks', protect, asyncHandler(async (req, res) => {
    const { parentId } = req.params;
    const { skip = 0, limit = 50, status, sortBy = 'createdAt' } = req.query;

    try {
        const result = await WorkItemService.getChildren(parentId, {
            skip: parseInt(skip),
            limit: parseInt(limit),
            status,
            sortBy
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// GET /api/work-items/:id/hierarchy
// ============================================================================
/**
 * Get complete hierarchy (parent + children) for a work item
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "hierarchy": {
 *     "item": { ... },
 *     "parent": { ... } or null,
 *     "children": [ ... ]
 *   }
 * }
 */
router.get('/:id/hierarchy', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const hierarchy = await WorkItemService.getHierarchy(id);

        res.status(200).json({
            success: true,
            hierarchy
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// PATCH /api/work-items/:id/status
// ============================================================================
/**
 * Update work item status and auto-update parent if needed
 * 
 * Request Body:
 * {
 *   "status": "in_progress"
 * }
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "child": { ... },
 *     "parent": { ... } or null
 *   }
 * }
 */
router.patch('/:id/status', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Status must be one of: ${validStatuses.join(', ')}`
        });
    }

    try {
        const result = await WorkItemService.updateChildStatus(id, status, req.user._id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// POST /api/work-items/:childId/move/:newParentId
// ============================================================================
/**
 * Move a sub-task to a different parent
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "subtask": { ... }
 * }
 */
router.post('/:childId/move/:newParentId', protect, asyncHandler(async (req, res) => {
    const { childId, newParentId } = req.params;

    try {
        // Validate relationship
        const { valid, errors } = await WorkItemService.validateParentChildRelationship(
            newParentId,
            childId
        );

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid parent-child relationship',
                errors
            });
        }

        const subtask = await WorkItemService.moveChild(childId, newParentId, req.user._id);

        res.status(200).json({
            success: true,
            subtask
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// POST /api/work-items/:childId/detach
// ============================================================================
/**
 * Detach a sub-task from its parent (make it standalone)
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "item": { ... }
 * }
 */
router.post('/:childId/detach', protect, asyncHandler(async (req, res) => {
    const { childId } = req.params;

    try {
        const item = await WorkItemService.moveChild(childId, null, req.user._id);

        res.status(200).json({
            success: true,
            item
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// DELETE /api/work-items/:id/validate-delete
// ============================================================================
/**
 * Validate if a work item can be deleted (checks for children)
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "canDelete": true,
 *   "childCount": 0
 * }
 * 
 * OR
 * 
 * {
 *   "success": true,
 *   "canDelete": false,
 *   "childCount": 3,
 *   "message": "This item has 3 children..."
 * }
 */
router.delete('/:id/validate-delete', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const item = await Task.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Work item not found'
            });
        }

        const childCount = await Task.countDocuments({ parentTask: id });

        if (childCount > 0) {
            return res.status(200).json({
                success: true,
                canDelete: false,
                childCount,
                message: `Cannot delete: This item has ${childCount} child(ren). Delete or move children first.`
            });
        }

        res.status(200).json({
            success: true,
            canDelete: true,
            childCount: 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// DELETE /api/work-items/:id (with cascade handling)
// ============================================================================
/**
 * Delete a work item (with validation)
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "message": "Work item deleted successfully"
 * }
 */
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const deletedItem = await WorkItemService.deleteWorkItem(id, req.user._id);

        res.status(200).json({
            success: true,
            message: 'Work item deleted successfully',
            deletedItem
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// POST /api/work-items/:parentId/subtasks/bulk-status
// ============================================================================
/**
 * Bulk update status for all children of a parent
 * 
 * Request Body:
 * {
 *   "status": "done"
 * }
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "updated": 5,
 *     "total": 5
 *   }
 * }
 */
router.post('/:parentId/subtasks/bulk-status', protect, asyncHandler(async (req, res) => {
    const { parentId } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Status must be one of: ${validStatuses.join(', ')}`
        });
    }

    try {
        const result = await WorkItemService.bulkUpdateChildrenStatus(
            parentId,
            status,
            req.user._id
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// GET /api/work-items/:id/story-points
// ============================================================================
/**
 * Get story point breakdown for a work item (own + children)
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "storyPoints": {
 *     "own": 8,
 *     "children": 13,
 *     "total": 21,
 *     "hasChildren": true
 *   }
 * }
 */
router.get('/:id/story-points', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const storyPoints = await WorkItemService.calculateStoryPoints(id);

        res.status(200).json({
            success: true,
            storyPoints
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// POST /api/work-items/validate-relationship
// ============================================================================
/**
 * Validate a parent-child relationship before creating/moving
 * 
 * Request Body:
 * {
 *   "parentId": "...",
 *   "childId": "..."
 * }
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "valid": true,
 *   "errors": []
 * }
 */
router.post('/validate-relationship', protect, asyncHandler(async (req, res) => {
    const { parentId, childId } = req.body;

    if (!parentId || !childId) {
        return res.status(400).json({
            success: false,
            message: 'parentId and childId are required'
        });
    }

    try {
        const result = await WorkItemService.validateParentChildRelationship(parentId, childId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}));

// ============================================================================
// WORK LOG ROUTES (Relocated from workLogRoutes.js)
// ============================================================================

// Timer endpoints
router.post('/:id/work-logs/start', protect, workLogController.startTimer);
router.post('/:id/work-logs/stop', protect, workLogController.stopTimer);

// Manual log endpoints
router.post('/:id/work-logs', protect, workLogController.createManualLog);
router.get('/:id/work-logs', protect, workLogController.getWorkLogs);

// Time summary for work item
router.get('/:id/time-summary', protect, workLogController.getTimeSummary);

module.exports = router;
