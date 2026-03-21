const asyncHandler = require('express-async-handler');
const workLogService = require('../services/workLogService');
const timeReportingService = require('../services/timeReportingService');
const WorkLog = require('../models/WorkLog');

/**
 * Work Log Controller
 * Handles HTTP requests for work logging
 */

/**
 * @desc    Start a timer on a work item
 * @route   POST /api/work-items/:id/work-logs/start
 * @access  Private
 */
const startTimer = asyncHandler(async (req, res) => {
    const { id: workItemId } = req.params;
    const userId = req.user.id;
    const { description } = req.body;

    const result = await workLogService.startTimer(workItemId, userId, description);
    res.status(200).json(result);
});

/**
 * @desc    Stop a running timer
 * @route   POST /api/work-items/:id/work-logs/stop
 * @access  Private
 */
const stopTimer = asyncHandler(async (req, res) => {
    const { id: workItemId } = req.params;
    const userId = req.user.id;

    const result = await workLogService.stopTimer(workItemId, userId);
    res.status(200).json(result);
});

/**
 * @desc    Create a manual work log entry
 * @route   POST /api/work-items/:id/work-logs
 * @access  Private
 */
const createManualLog = asyncHandler(async (req, res) => {
    const { id: workItemId } = req.params;
    const userId = req.user.id;
    const {
        startTime,
        endTime,
        description,
        billable,
        roundingRule,
        tags
    } = req.body;

    // Validate required fields
    if (!startTime || !endTime) {
        res.status(400);
        throw new Error('startTime and endTime are required');
    }

    const result = await workLogService.createManualLog(
        workItemId,
        userId,
        startTime,
        endTime,
        description,
        { billable, roundingRule, tags }
    );

    res.status(201).json(result);
});

/**
 * @desc    Get all work logs for a work item
 * @route   GET /api/work-items/:id/work-logs
 * @access  Private
 */
const getWorkLogs = asyncHandler(async (req, res) => {
    const { id: workItemId } = req.params;
    const { userId, status, logType, dateFrom, dateTo } = req.query;

    const result = await workLogService.getWorkLogs(workItemId, {
        userId,
        status,
        logType,
        dateFrom,
        dateTo
    });

    res.status(200).json(result);
});

/**
 * @desc    Get a specific work log
 * @route   GET /api/work-logs/:id
 * @access  Private
 */
const getWorkLog = asyncHandler(async (req, res) => {
    const { id: workLogId } = req.params;

    const workLog = await WorkLog.findById(workLogId)
        .populate('userId', 'fullName email avatar')
        .populate('approvedBy', 'fullName')
        .populate('workItemId', 'title key');

    if (!workLog) {
        res.status(404);
        throw new Error('Work log not found');
    }

    res.status(200).json({
        success: true,
        data: workLog
    });
});

/**
 * @desc    Update a work log
 * @route   PATCH /api/work-logs/:id
 * @access  Private
 */
const updateWorkLog = asyncHandler(async (req, res) => {
    const { id: workLogId } = req.params;
    const userId = req.user.id;
    const { description, durationMinutes, tags, billable, reason } = req.body;

    const result = await workLogService.updateWorkLog(workLogId, userId, {
        description,
        durationMinutes,
        tags,
        billable,
        reason
    });

    res.status(200).json(result);
});

/**
 * @desc    Delete a work log
 * @route   DELETE /api/work-logs/:id
 * @access  Private
 */
const deleteWorkLog = asyncHandler(async (req, res) => {
    const { id: workLogId } = req.params;

    const result = await workLogService.deleteWorkLog(workLogId);
    res.status(200).json(result);
});

/**
 * @desc    Get running timer for current user
 * @route   GET /api/users/me/timer
 * @access  Private
 */
const getRunningTimer = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await workLogService.getRunningTimer(userId);
    res.status(200).json(result);
});

/**
 * @desc    Stop all running timers for current user
 * @route   POST /api/users/me/timers/stop
 * @access  Private
 */
const stopUserTimers = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await workLogService.stopUserTimers(userId);
    res.status(200).json(result);
});

/**
 * @desc    Get time summary for a work item
 * @route   GET /api/work-items/:id/time-summary
 * @access  Private
 */
const getTimeSummary = asyncHandler(async (req, res) => {
    const { id: workItemId } = req.params;

    const result = await workLogService.getTimeSummary(workItemId);
    res.status(200).json(result);
});

/**
 * @desc    Approve a work log (admin only)
 * @route   POST /api/work-logs/:id/approve
 * @access  Private/Admin
 */
const approveWorkLog = asyncHandler(async (req, res) => {
    const { id: workLogId } = req.params;
    const approverId = req.user.id;
    const { notes } = req.body;

    // Check if user is admin/manager
    if (!['admin', 'Project Manager', 'Technical Lead'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Permission denied');
    }

    const result = await workLogService.approveWorkLog(workLogId, approverId, notes);
    res.status(200).json(result);
});

/**
 * @desc    Get time report
 * @route   GET /api/reports/time
 * @access  Private
 */
const getTimeReport = asyncHandler(async (req, res) => {
    const { type = 'user', userId, projectId, sprintId, startDate, endDate, days } = req.query;

    let result;

    if (type === 'user') {
        const uid = userId || req.user.id;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        result = await timeReportingService.getUserTimeReport(uid, start, end);
    } else if (type === 'project' && projectId) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        result = await timeReportingService.getProjectTimeReport(projectId, start, end);
    } else if (type === 'sprint' && sprintId) {
        result = await timeReportingService.getSprintTimeReport(sprintId);
    } else if (type === 'parent' && userId) {
        result = await timeReportingService.getParentTaskTimeReport(userId);
    } else if (type === 'dashboard' && projectId) {
        const periodDays = parseInt(days) || 7;
        result = await timeReportingService.getDashboardSummary(projectId, periodDays);
    } else {
        res.status(400);
        throw new Error('Invalid report type or missing parameters');
    }

    res.status(200).json(result);
});

module.exports = {
    startTimer,
    stopTimer,
    createManualLog,
    getWorkLogs,
    getWorkLog,
    updateWorkLog,
    deleteWorkLog,
    getRunningTimer,
    stopUserTimers,
    getTimeSummary,
    approveWorkLog,
    getTimeReport
};
