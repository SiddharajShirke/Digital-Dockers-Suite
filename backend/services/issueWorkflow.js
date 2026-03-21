/**
 * ============================================================================
 * ISSUE WORKFLOW ENGINE
 * ============================================================================
 * 
 * Implements Jira-like issue workflow:
 * - Status validation
 * - Allowed transitions
 * - Business rules enforcement
 * - History tracking
 * 
 * @module issueWorkflow
 */

const Task = require('../models/Task');
const IssueHistory = require('../models/IssueHistory'); // Assuming this exists

// ============================================================================
// WORKFLOW STATE MACHINE
// ============================================================================

/**
 * Allowed status transitions
 * Maps current status -> array of allowed next statuses
 */
const WORKFLOW = {
    BACKLOG: ['TODO', 'BLOCKED'],
    TODO: ['IN_PROGRESS', 'BLOCKED', 'BACKLOG'],
    IN_PROGRESS: ['IN_REVIEW', 'BLOCKED', 'TODO'],
    IN_REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
    BLOCKED: ['TODO', 'IN_PROGRESS', 'BACKLOG'],
    DONE: ['IN_PROGRESS'], // Can reopen from done
};

// Normalize status naming (handle both snake_case and UPPERCASE)
function normalizeStatus(status) {
    return status.toUpperCase().replace('-', '_');
}

/**
 * Check if transition is allowed
 * 
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {Object} { allowed: boolean, message: string }
 */
function validateTransition(currentStatus, newStatus) {
    const current = normalizeStatus(currentStatus);
    const next = normalizeStatus(newStatus);

    if (!WORKFLOW[current]) {
        return {
            allowed: false,
            message: `Unknown status: ${currentStatus}`,
            code: 'INVALID_STATUS',
        };
    }

    if (!WORKFLOW[next]) {
        return {
            allowed: false,
            message: `Unknown status: ${newStatus}`,
            code: 'INVALID_STATUS',
        };
    }

    if (current === next) {
        return {
            allowed: false,
            message: 'Issue is already in this status',
            code: 'SAME_STATUS',
        };
    }

    const allowed = WORKFLOW[current].includes(next);

    return {
        allowed,
        message: allowed
            ? 'Transition allowed'
            : `Cannot transition from ${current} to ${next}`,
        code: allowed ? 'OK' : 'INVALID_TRANSITION',
        allowedTransitions: WORKFLOW[current],
    };
}

/**
 * Move issue to a new status
 * 
 * This is THE core function for drag & drop
 * 
 * Rules:
 * 1. Validate transition is allowed
 * 2. Track who made the change and when
 * 3. If transitioning to IN_PROGRESS:
 *    - Set startDate if not already set
 * 4. If transitioning to DONE:
 *    - Set completedDate
 *    - Optional: require completion comment
 * 5. If reopening from DONE:
 *    - Reset completedDate
 *    - Optionally add back to sprint
 * 
 * @param {string} issueId
 * @param {string} newStatus
 * @param {string} userId - User making the change
 * @param {Object} options - { comment, reason, sprintId }
 * @returns {Promise<Object>} Updated issue with history
 */
async function moveIssueToStatus(issueId, newStatus, userId, options = {}) {
    try {
        // Step 1: Fetch issue
        const issue = await Task.findById(issueId).populate('assignedTo', 'name email');

        if (!issue) {
            throw new Error(`Issue not found: ${issueId}`);
        }

        // Step 2: Validate transition
        const validation = validateTransition(issue.status, newStatus);

        if (!validation.allowed) {
            const error = new Error(validation.message);
            error.code = validation.code;
            error.allowedTransitions = validation.allowedTransitions;
            throw error;
        }

        const normalizedNewStatus = normalizeStatus(newStatus).toLowerCase();
        const oldStatus = issue.status;

        // Step 3: Apply status-specific logic
        const updateData = {
            status: normalizedNewStatus,
            statusChangedAt: new Date(),
            statusChangedBy: userId,
        };

        // Rule: Starting work
        if (normalizedNewStatus === 'in_progress' && !issue.startDate) {
            updateData.startDate = new Date();
        }

        // Rule: Completing issue
        if (normalizedNewStatus === 'done') {
            updateData.completedDate = new Date();
            if (options.comment) {
                updateData.completionComment = options.comment;
            }
        }

        // Rule: Reopening from done
        if (oldStatus === 'done' && normalizedNewStatus !== 'done') {
            updateData.completedDate = null;
            updateData.completionComment = null;
        }

        // Rule: Blocking issue
        if (normalizedNewStatus === 'blocked' && options.reason) {
            updateData.blockedReason = options.reason;
            updateData.blockedAt = new Date();
        }

        // Rule: Unblocking
        if (oldStatus === 'blocked' && normalizedNewStatus !== 'blocked') {
            updateData.blockedReason = null;
            updateData.blockedAt = null;
        }

        // Step 4: Update issue
        const updatedIssue = await Task.findByIdAndUpdate(
            issueId,
            updateData,
            { new: true }
        ).populate('assignedTo', 'name email');

        // Step 5: Record history
        const history = new IssueHistory({
            issueId,
            field: 'status',
            oldValue: oldStatus,
            newValue: normalizedNewStatus,
            changedBy: userId,
            reason: options.reason,
            comment: options.comment,
        });
        await history.save();

        // Step 6: Return with metadata
        return {
            issue: updatedIssue,
            history: {
                field: 'status',
                oldValue: oldStatus,
                newValue: normalizedNewStatus,
                timestamp: updateData.statusChangedAt,
                changedBy: userId,
            },
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Batch move multiple issues to same status
 * Useful for: "Mark all as done", sprint completion, etc.
 * 
 * @param {Array<string>} issueIds
 * @param {string} newStatus
 * @param {string} userId
 * @returns {Promise<Object>} { succeeded: [], failed: [] }
 */
async function batchMoveIssues(issueIds, newStatus, userId) {
    const results = {
        succeeded: [],
        failed: [],
    };

    for (const issueId of issueIds) {
        try {
            const result = await moveIssueToStatus(issueId, newStatus, userId);
            results.succeeded.push({
                issueId,
                newStatus,
                timestamp: result.history.timestamp,
            });
        } catch (error) {
            results.failed.push({
                issueId,
                newStatus,
                error: error.message,
                code: error.code,
            });
        }
    }

    return results;
}

/**
 * Get issue workflow state
 * Returns current status and valid next transitions
 * 
 * @param {string} issueId
 * @returns {Promise<Object>}
 */
async function getIssueWorkflowState(issueId) {
    try {
        const issue = await Task.findById(issueId);

        if (!issue) {
            throw new Error('Issue not found');
        }

        const currentStatus = normalizeStatus(issue.status);
        const allowedTransitions = WORKFLOW[currentStatus] || [];

        return {
            issueId,
            key: issue.key,
            currentStatus,
            allowedTransitions,
            canReopen: currentStatus === 'DONE',
            startDate: issue.startDate,
            completedDate: issue.completedDate,
            timeSpent: calculateTimeSpent(issue),
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Get issue workflow history
 * Returns all status changes with timestamps
 * 
 * @param {string} issueId
 * @returns {Promise<Array>}
 */
async function getIssueWorkflowHistory(issueId) {
    try {
        const history = await IssueHistory.find({
            issueId,
            field: 'status',
        })
            .populate('changedBy', 'name email')
            .sort({ createdAt: 1 });

        return history.map((record) => ({
            oldStatus: record.oldValue,
            newStatus: record.newValue,
            changedBy: record.changedBy?.name || 'Unknown',
            timestamp: record.createdAt,
            reason: record.reason,
        }));
    } catch (error) {
        throw error;
    }
}

/**
 * Helper: Calculate time spent on issue
 * From startDate to completedDate (or now)
 * 
 * @param {Object} issue
 * @returns {string} Formatted time (e.g., "2d 3h")
 */
function calculateTimeSpent(issue) {
    if (!issue.startDate) return 'Not started';

    const endDate = issue.completedDate || new Date();
    const diffMs = endDate - new Date(issue.startDate);

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * Check if issue can be transitioned by a user
 * In production, implement proper permissions
 * 
 * Rules:
 * - Project lead can move any issue
 * - Assignee can move their own issues
 * - Others cannot move issues
 * 
 * @param {string} issueId
 * @param {string} userId
 * @param {string} newStatus
 * @returns {Promise<Object>} { allowed: boolean, reason: string }
 */
async function canUserMoveIssue(issueId, userId, newStatus) {
    try {
        const issue = await Task.findById(issueId).populate('assignedTo', '_id');
        const project = await issue.populate('project');

        // Project lead can always move
        if (project.lead._id.toString() === userId) {
            return { allowed: true };
        }

        // Issue assignee can move
        const isAssignee = issue.assignedTo.some((u) => u._id.toString() === userId);
        if (isAssignee) {
            // But cannot move directly to DONE without review
            if (newStatus.toUpperCase() === 'DONE') {
                return {
                    allowed: false,
                    reason: 'Assignee must move to IN_REVIEW first, not directly to DONE',
                };
            }
            return { allowed: true };
        }

        return {
            allowed: false,
            reason: 'User does not have permission to move this issue',
        };
    } catch (error) {
        throw error;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    WORKFLOW,
    validateTransition,
    moveIssueToStatus,
    batchMoveIssues,
    getIssueWorkflowState,
    getIssueWorkflowHistory,
    canUserMoveIssue,
    calculateTimeSpent,
};
