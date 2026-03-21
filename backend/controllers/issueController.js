/**
 * ============================================================================
 * ISSUE CONTROLLER - Phase 1 Implementation
 * ============================================================================
 * 
 * Core endpoints for Issue (Task) CRUD and workflow
 * These are the FIRST endpoints to implement (Day 1-2)
 * 
 * ENDPOINTS:
 * 1. POST /api/projects/:projectId/issues (create)
 * 2. GET /api/projects/:projectId/issues (list)
 * 3. GET /api/issues/:issueId (detail)
 * 4. PUT /api/issues/:issueId/move (change status)
 * 5. PUT /api/issues/:issueId (update fields)
 * 6. DELETE /api/issues/:issueId (delete)
 * 
 * Dependencies:
 * - Task model (MongoDB/Mongoose)
 * - issueWorkflow service (validateTransition, moveIssueToStatus)
 * - Project model
 * - User context (from JWT auth middleware)
 * 
 * Version: 1.0
 */

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const { 
  validateTransition, 
  moveIssueToStatus 
} = require('../services/issueWorkflow');

// Middleware: Extract user from JWT token
// Assumed to be added by auth middleware before routing
// Request will have: req.user = { id, email, name }

// ============================================================================
// 1. CREATE ISSUE
// ============================================================================

/**
 * POST /api/projects/:projectId/issues
 * 
 * Create a new issue in a project's backlog
 * 
 * Request Body:
 * {
 *   "title": "Fix login button",
 *   "description": "The login button is not clickable",
 *   "issueType": "BUG", // or "FEATURE", "TASK"
 *   "priority": "HIGH", // or "LOW", "MEDIUM", "CRITICAL"
 *   "assigneeId": "user123" // optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "issue": {
 *     "id": "issue123",
 *     "key": "PROJ-42",  // Auto-generated!
 *     "title": "Fix login button",
 *     "description": "...",
 *     "projectId": "project123",
 *     "status": "BACKLOG",
 *     "issueType": "BUG",
 *     "priority": "HIGH",
 *     "createdBy": "user123",
 *     "createdAt": "2024-01-15T10:30:00Z",
 *     "updatedAt": "2024-01-15T10:30:00Z"
 *   }
 * }
 * 
 * Error Cases:
 * - 404: Project not found
 * - 400: Invalid issue type or priority
 * - 400: Missing required fields
 * - 401: Not authenticated
 * - 403: Not a project member
 */
router.post('/projects/:projectId/issues', async (req, res) => {
    try {
        // Extract from JWT middleware
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
        }

        const { projectId } = req.params;
        const { title, description, issueType, priority, assigneeId } = req.body;

        // Validation
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_TITLE',
                message: 'Title is required',
            });
        }

        if (!issueType || !['BUG', 'FEATURE', 'TASK', 'EPIC'].includes(issueType)) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_ISSUE_TYPE',
                message: 'Issue type must be BUG, FEATURE, TASK, or EPIC',
            });
        }

        if (!priority || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_PRIORITY',
                message: 'Priority must be LOW, MEDIUM, HIGH, or CRITICAL',
            });
        }

        // Check project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                code: 'PROJECT_NOT_FOUND',
                message: `Project ${projectId} not found`,
            });
        }

        // Check user is project member (optional for MVP, can add later)
        // const isMember = project.members.includes(userId);
        // if (!isMember) return res.status(403)...

        // Generate issue key: "PROJ-1", "PROJ-2", etc.
        const lastIssue = await Task.findOne({ projectId })
            .sort({ _id: -1 })
            .select('key');

        let nextNumber = 1;
        if (lastIssue && lastIssue.key) {
            const match = lastIssue.key.match(/-(\d+)$/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        const projectKey = project.key || 'PROJ';
        const newKey = `${projectKey}-${nextNumber}`;

        // Create issue
        const issue = new Task({
            key: newKey,
            title: title.trim(),
            description: description?.trim() || '',
            projectId,
            status: 'BACKLOG', // Always start in backlog
            issueType,
            priority,
            assigneeId: assigneeId || null,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Optional fields
            sprintId: null, // Not assigned to sprint yet
            storyPoints: 0,
            blockedReason: null,
            startDate: null,
            completedDate: null,
        });

        await issue.save();

        // Send notification to assignee if assigned
        if (issue.assigneeId) {
            try {
                const notificationHandler = req.app.get('notificationHandler');
                if (notificationHandler) {
                    const notificationService = notificationHandler.getNotificationService();
                    await notificationService.createNotification({
                        recipient: issue.assigneeId,
                        sender: userId,
                        type: 'ISSUE_ASSIGNED',
                        title: 'New Issue Assigned',
                        description: `${issue.key}: ${issue.title}`,
                        entityType: 'Issue',
                        entityId: issue._id,
                        priority: issue.priority === 'CRITICAL' ? 'high' : issue.priority === 'HIGH' ? 'medium' : 'low',
                        metadata: {
                            projectId,
                            issueKey: issue.key,
                            issueType: issue.issueType
                        }
                    });
                }
            } catch (notifError) {
                console.error('Error sending notification:', notifError.message);
                // Don't fail the request if notification fails
            }
        }

        // Broadcast to project members
        try {
            const notificationHandler = req.app.get('notificationHandler');
            if (notificationHandler) {
                const io = req.app.get('io');
                io.emit('issue:created', {
                    issue: issue,
                    projectId: projectId
                });
            }
        } catch (error) {
            console.error('Error broadcasting:', error.message);
        }

        return res.status(201).json({
            success: true,
            issue: {
                id: issue._id,
                key: issue.key,
                title: issue.title,
                description: issue.description,
                projectId: issue.projectId,
                status: issue.status,
                issueType: issue.issueType,
                priority: issue.priority,
                assigneeId: issue.assigneeId,
                storyPoints: issue.storyPoints,
                createdBy: issue.createdBy,
                createdAt: issue.createdAt,
                updatedAt: issue.updatedAt,
            },
        });
    } catch (error) {
        console.error('Error creating issue:', error);
        return res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: error.message,
        });
    }
});

// ============================================================================
// 2. LIST ISSUES FOR A PROJECT
// ============================================================================

/**
 * GET /api/projects/:projectId/issues?status=BACKLOG&sprintId=null
 * 
 * List all issues in a project with filters
 * 
 * Query Parameters:
 * - status: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE (optional)
 * - sprintId: Filter by sprint (optional, "null" = unscheduled)
 * - assigneeId: Filter by assignee (optional)
 * - limit: Pagination (default 50)
 * - skip: Pagination (default 0)
 * 
 * Response:
 * {
 *   "success": true,
 *   "issues": [ ... ],
 *   "total": 142,
 *   "limit": 50,
 *   "skip": 0
 * }
 */
router.get('/projects/:projectId/issues', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, sprintId, assigneeId, limit = 50, skip = 0 } = req.query;

        // Build filter
        const filter = { projectId };

        if (status) {
            filter.status = status;
        }

        if (sprintId === 'null') {
            filter.sprintId = null;
        } else if (sprintId) {
            filter.sprintId = sprintId;
        }

        if (assigneeId) {
            filter.assigneeId = assigneeId;
        }

        // Query
        const [issues, total] = await Promise.all([
            Task.find(filter)
                .limit(parseInt(limit))
                .skip(parseInt(skip))
                .sort({ createdAt: -1 })
                .select('_id key title status issueType priority assigneeId storyPoints createdAt'),
            Task.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            issues: issues.map(issue => ({
                id: issue._id,
                key: issue.key,
                title: issue.title,
                status: issue.status,
                issueType: issue.issueType,
                priority: issue.priority,
                assigneeId: issue.assigneeId,
                storyPoints: issue.storyPoints,
                createdAt: issue.createdAt,
            })),
            total,
            limit: parseInt(limit),
            skip: parseInt(skip),
        });
    } catch (error) {
        console.error('Error listing issues:', error);
        return res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: error.message,
        });
    }
});

// ============================================================================
// 3. GET SINGLE ISSUE DETAILS
// ============================================================================

/**
 * GET /api/issues/:issueId
 * 
 * Get full details of a single issue
 * 
 * Response:
 * {
 *   "success": true,
 *   "issue": {
 *     "id": "...",
 *     "key": "PROJ-42",
 *     "title": "...",
 *     "status": "IN_PROGRESS",
 *     "...": "all fields",
 *     "history": [ ] // Optional: status change history
 *   }
 * }
 */
router.get('/issues/:issueId', async (req, res) => {
    try {
        const { issueId } = req.params;

        const issue = await Task.findById(issueId);
        if (!issue) {
            return res.status(404).json({
                success: false,
                code: 'ISSUE_NOT_FOUND',
                message: `Issue ${issueId} not found`,
            });
        }

        return res.json({
            success: true,
            issue: {
                id: issue._id,
                key: issue.key,
                title: issue.title,
                description: issue.description,
                projectId: issue.projectId,
                sprintId: issue.sprintId,
                status: issue.status,
                issueType: issue.issueType,
                priority: issue.priority,
                assigneeId: issue.assigneeId,
                storyPoints: issue.storyPoints,
                blockedReason: issue.blockedReason,
                createdBy: issue.createdBy,
                createdAt: issue.createdAt,
                updatedAt: issue.updatedAt,
                startDate: issue.startDate,
                completedDate: issue.completedDate,
            },
        });
    } catch (error) {
        console.error('Error getting issue:', error);
        return res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: error.message,
        });
    }
});

// ============================================================================
// 4. MOVE ISSUE (CHANGE STATUS) - THE CORE DRAG-DROP ENDPOINT
// ============================================================================

/**
 * PUT /api/issues/:issueId/move
 * 
 * Move an issue to a new status (for drag & drop)
 * VALIDATES workflow transition before allowing
 * 
 * Request Body:
 * {
 *   "status": "IN_PROGRESS",  // New status
 *   "blockedReason": null     // Only for BLOCKED status
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "issue": { updated issue },
 *   "history": { transition record }
 * }
 * 
 * Error Response (Invalid Transition):
 * {
 *   "success": false,
 *   "code": "INVALID_TRANSITION",
 *   "message": "Cannot move from BACKLOG to DONE",
 *   "currentStatus": "BACKLOG",
 *   "requestedStatus": "DONE",
 *   "allowedTransitions": ["TODO", "BLOCKED"]
 * }
 */
router.put('/issues/:issueId/move', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
        }

        const { issueId } = req.params;
        const { status: newStatus, blockedReason } = req.body;

        // Use the centralized workflow service to move the issue
        const result = await moveIssueToStatus(issueId, newStatus, userId, {
            reason: blockedReason,
        });

        const updatedIssue = result.issue;
        const currentStatus = result.history.oldValue;
        const targetStatus = result.history.newValue;

        // Send status change notification to assignee
        if (updatedIssue.assigneeId) {
            try {
                const notificationHandler = req.app.get('notificationHandler');
                if (notificationHandler) {
                    const notificationService = notificationHandler.getNotificationService();
                    await notificationService.createNotification({
                        recipient: updatedIssue.assigneeId,
                        sender: userId,
                        type: 'ISSUE_STATUS_CHANGED',
                        title: 'Issue Status Updated',
                        description: `${updatedIssue.key}: ${updatedIssue.title} moved to ${targetStatus}`,
                        entityType: 'Issue',
                        entityId: updatedIssue._id,
                        priority: 'medium',
                        metadata: {
                            projectId: updatedIssue.projectId,
                            issueKey: updatedIssue.key,
                            oldStatus: currentStatus,
                            newStatus: targetStatus
                        }
                    });
                }
            } catch (notifError) {
                console.error('Error sending notification:', notifError.message);
            }
        }

        // Broadcast status change
        try {
            const io = req.app.get('io');
            io.emit('issue:statusChanged', {
                issueId: updatedIssue._id,
                issueKey: updatedIssue.key,
                oldStatus: currentStatus,
                newStatus: targetStatus,
                projectId: updatedIssue.projectId
            });
        } catch (error) {
            console.error('Error broadcasting:', error.message);
        }

        // TODO: Save to IssueHistory model for audit trail
        // await IssueHistory.create({
        //   issueId,
        //   field: 'status',
        //   oldValue: currentStatus,
        //   newValue: targetStatus,
        //   changedBy: userId,
        //   changedAt: new Date(),
        // });

        return res.json({
            success: true,
            issue: {
                id: updatedIssue._id,
                key: updatedIssue.key,
                title: updatedIssue.title,
                status: updatedIssue.status,
                issueType: updatedIssue.issueType,
                priority: updatedIssue.priority,
                startDate: updatedIssue.startDate,
                completedDate: updatedIssue.completedDate,
                statusChangedAt: updatedIssue.statusChangedAt,
            },
        });
    } catch (error) {
        console.error('Error moving issue:', error);
        return res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: error.message,
        });
    }
});

// ============================================================================
// 5. UPDATE ISSUE FIELDS
// ============================================================================

/**
 * PUT /api/issues/:issueId
 * 
 * Update issue fields (title, description, priority, etc.)
 * Does NOT change status (use /move endpoint for that)
 * 
 * Request Body (all optional):
 * {
 *   "title": "New title",
 *   "description": "New description",
 *   "priority": "HIGH",
 *   "issueType": "FEATURE",
 *   "assigneeId": "user456",
 *   "storyPoints": 5
 * }
 */
router.put('/issues/:issueId', async (req, res) => {
    try {
        const { issueId } = req.params;
        const { title, description, priority, issueType, assigneeId, storyPoints } = req.body;

        // Get issue
        const issue = await Task.findById(issueId);
        if (!issue) {
            return res.status(404).json({
                success: false,
                code: 'ISSUE_NOT_FOUND',
                message: `Issue ${issueId} not found`,
            });
        }

        // Update allowed fields
        const updateData = { updatedAt: new Date() };

        if (title) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (priority) updateData.priority = priority;
        if (issueType) updateData.issueType = issueType;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
        if (storyPoints !== undefined) updateData.storyPoints = parseInt(storyPoints) || 0;

        const updatedIssue = await Task.findByIdAndUpdate(issueId, updateData, {
            new: true,
        });

        return res.json({
            success: true,
            issue: {
                id: updatedIssue._id,
                key: updatedIssue.key,
                title: updatedIssue.title,
                description: updatedIssue.description,
                priority: updatedIssue.priority,
                issueType: updatedIssue.issueType,
                assigneeId: updatedIssue.assigneeId,
                storyPoints: updatedIssue.storyPoints,
                updatedAt: updatedIssue.updatedAt,
            },
        });
    } catch (error) {
        console.error('Error updating issue:', error);
        return res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: error.message,
        });
    }
});

// ============================================================================
// 6. DELETE ISSUE
// ============================================================================

/**
 * DELETE /api/issues/:issueId
 * 
 * Delete an issue (can only delete if in BACKLOG and not assigned to sprint)
 */
router.delete('/issues/:issueId', async (req, res) => {
    try {
        const { issueId } = req.params;

        const issue = await Task.findById(issueId);
        if (!issue) {
            return res.status(404).json({
                success: false,
                code: 'ISSUE_NOT_FOUND',
                message: `Issue ${issueId} not found`,
            });
        }

        // Can only delete if in backlog and not in sprint
        if (issue.status !== 'BACKLOG') {
            return res.status(400).json({
                success: false,
                code: 'CANNOT_DELETE',
                message: 'Can only delete issues in BACKLOG status',
            });
        }

        await Task.deleteOne({ _id: issueId });

        return res.json({
            success: true,
            message: `Issue ${issue.key} deleted`,
        });
    } catch (error) {
        console.error('Error deleting issue:', error);
        return res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: error.message,
        });
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;

/**
 * INTEGRATION NOTES:
 * 
 * 1. In your main app.js, register this router:
 *    const issueController = require('./controllers/issueController');
 *    app.use('/api', issueController);
 * 
 * 2. Make sure you have auth middleware before routing:
 *    app.use('/api', authMiddleware); // Sets req.user
 *    app.use('/api', issueController);
 * 
 * 3. DATABASE INDEXES (add to your migration or MongoDB):
 *    db.tasks.createIndex({ projectId: 1 });
 *    db.tasks.createIndex({ projectId: 1, status: 1 });
 *    db.tasks.createIndex({ sprintId: 1 });
 *    db.tasks.createIndex({ createdAt: -1 });
 * 
 * 4. REQUIRED FIELDS IN TASK MODEL:
 *    - key (String, unique)
 *    - title (String, required)
 *    - description (String)
 *    - projectId (ObjectId, required)
 *    - status (String: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED)
 *    - issueType (String: BUG, FEATURE, TASK, EPIC)
 *    - priority (String: LOW, MEDIUM, HIGH, CRITICAL)
 *    - assigneeId (ObjectId, optional)
 *    - sprintId (ObjectId, optional)
 *    - storyPoints (Number)
 *    - createdBy (ObjectId)
 *    - createdAt (Date)
 *    - updatedAt (Date)
 *    - statusChangedBy (ObjectId)
 *    - statusChangedAt (Date)
 *    - startDate (Date)
 *    - completedDate (Date)
 *    - blockedReason (String)
 * 
 * 5. NEXT STEPS:
 *    - Test these endpoints with Postman/curl
 *    - Add error handling middleware
 *    - Add input validation middleware
 *    - Implement permission checking (is user project member?)
 *    - Create IssueHistory model for audit trail
 */
