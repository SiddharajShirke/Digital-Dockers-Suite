const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * Notification Controller
 * Handles HTTP endpoints for notification management
 */

// @desc Get notifications for authenticated user
// @route GET /api/notifications
// @access Private
const getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    const userId = req.user.id;

    const query = {
        recipient: userId,
        isArchived: false
    };

    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
        Notification.find(query)
            .populate('sender', 'name avatar email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Notification.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: {
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
});

// @desc Get notification feed (recent notifications)
// @route GET /api/notifications/feed
// @access Private
const getNotificationFeed = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;
    const userId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
        Notification.getRecentNotifications(userId, parseInt(limit)),
        Notification.getUnreadCount(userId)
    ]);

    res.json({
        success: true,
        data: {
            notifications,
            unreadCount
        }
    });
});

// @desc Get unread notification count
// @route GET /api/notifications/unread/count
// @access Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
        success: true,
        data: {
            unreadCount
        }
    });
});

// @desc Mark notification as read
// @route PUT /api/notifications/:id/read
// @access Private
const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== userId) {
        res.status(403);
        throw new Error('Not authorized to update this notification');
    }

    await notification.markAsRead();

    res.json({
        success: true,
        data: { notification }
    });
});

// @desc Mark all notifications as read
// @route PUT /api/notifications/read/all
// @access Private
const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await Notification.updateMany(
        { recipient: userId, isRead: false, isArchived: false },
        { isRead: true }
    );

    res.json({
        success: true,
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

// @desc Archive notification
// @route PUT /api/notifications/:id/archive
// @access Private
const archiveNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== userId) {
        res.status(403);
        throw new Error('Not authorized to archive this notification');
    }

    await notification.archive();

    res.json({
        success: true,
        data: { notification }
    });
});

// @desc Archive multiple notifications
// @route PUT /api/notifications/archive/bulk
// @access Private
const archiveMultiple = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        res.status(400);
        throw new Error('Invalid notification IDs');
    }

    const result = await Notification.updateMany(
        {
            _id: { $in: notificationIds },
            recipient: userId
        },
        { isArchived: true }
    );

    res.json({
        success: true,
        data: {
            archivedCount: result.modifiedCount
        }
    });
});

// @desc Delete notification
// @route DELETE /api/notifications/:id
// @access Private
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== userId) {
        res.status(403);
        throw new Error('Not authorized to delete this notification');
    }

    await Notification.findByIdAndDelete(id);

    res.json({
        success: true,
        message: 'Notification deleted successfully'
    });
});

// @desc Get notification statistics
// @route GET /api/notifications/stats
// @access Private
const getStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [unreadCount, totalCount, byType] = await Promise.all([
        Notification.getUnreadCount(userId),
        Notification.countDocuments({
            recipient: userId,
            isArchived: false
        }),
        Notification.aggregate([
            {
                $match: {
                    recipient: new mongoose.Types.ObjectId(userId),
                    isArchived: false
                }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    res.json({
        success: true,
        data: {
            unreadCount,
            totalCount,
            byType: Object.fromEntries(byType.map(t => [t._id, t.count]))
        }
    });
});

module.exports = {
    getNotifications,
    getNotificationFeed,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    archiveMultiple,
    deleteNotification,
    getStats
};
