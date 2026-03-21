const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/**
 * Notification Service
 * Handles all notification-related business logic
 * Integrates with WebSocket for real-time delivery
 */

class NotificationService {
    constructor(io) {
        this.io = io; // Socket.io instance
        this.userSockets = new Map(); // Track user socket connections
    }

    /**
     * Register user socket connection for real-time notifications
     * @param {string} userId - User ID
     * @param {string} socketId - Socket ID
     */
    registerUserSocket(userId, socketId) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socketId);
        console.log(`[Notification] User ${userId} connected via socket ${socketId}`);
    }

    /**
     * Unregister user socket connection
     * @param {string} userId - User ID
     * @param {string} socketId - Socket ID
     */
    unregisterUserSocket(userId, socketId) {
        if (this.userSockets.has(userId)) {
            this.userSockets.get(userId).delete(socketId);
            if (this.userSockets.get(userId).size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Create and send a notification
     * @param {Object} notificationData - Notification details
     * @returns {Promise<Object>} Created notification
     */
    async createNotification(notificationData) {
        try {
            const {
                recipientId,
                senderId,
                type,
                title,
                description,
                entityType,
                entityId,
                options = {}
            } = notificationData;

            // Create notification in database
            const notification = await Notification.createNotification(
                recipientId,
                senderId,
                type,
                title,
                description,
                entityType,
                entityId,
                options
            );

            // Populate sender info
            const populatedNotification = await notification.populate('sender', 'name avatar email');

            // Send real-time notification if user is online
            await this.sendRealtimeNotification(recipientId, populatedNotification);

            // Emit unread count update
            await this.updateUnreadCount(recipientId);

            return populatedNotification;
        } catch (error) {
            console.error('[Notification] Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Send real-time notification via WebSocket
     * @param {string} userId - Recipient user ID
     * @param {Object} notification - Notification object
     */
    async sendRealtimeNotification(userId, notification) {
        if (this.io && this.userSockets.has(userId)) {
            const socketIds = Array.from(this.userSockets.get(userId));
            socketIds.forEach(socketId => {
                this.io.to(socketId).emit('notification:new', {
                    id: notification._id,
                    type: notification.type,
                    title: notification.title,
                    description: notification.description,
                    icon: notification.icon,
                    actionUrl: notification.actionUrl,
                    priority: notification.priority,
                    sender: notification.sender,
                    entityKey: notification.entityKey,
                    createdAt: notification.createdAt,
                    isNew: true
                });
            });
        }
    }

    /**
     * Update unread notification count for user
     * @param {string} userId - User ID
     */
    async updateUnreadCount(userId) {
        try {
            const unreadCount = await Notification.getUnreadCount(userId);
            
            if (this.io && this.userSockets.has(userId)) {
                const socketIds = Array.from(this.userSockets.get(userId));
                socketIds.forEach(socketId => {
                    this.io.to(socketId).emit('notification:unreadCount', {
                        unreadCount
                    });
                });
            }
        } catch (error) {
            console.error('[Notification] Error updating unread count:', error);
        }
    }

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     */
    async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findById(notificationId);
            if (notification && notification.recipient.toString() === userId) {
                await notification.markAsRead();
                await this.updateUnreadCount(userId);
                
                // Broadcast read status
                if (this.io && this.userSockets.has(userId)) {
                    const socketIds = Array.from(this.userSockets.get(userId));
                    socketIds.forEach(socketId => {
                        this.io.to(socketId).emit('notification:marked-read', {
                            notificationId
                        });
                    });
                }
            }
        } catch (error) {
            console.error('[Notification] Error marking as read:', error);
        }
    }

    /**
     * Mark all notifications as read for user
     * @param {string} userId - User ID
     */
    async markAllAsRead(userId) {
        try {
            await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );
            await this.updateUnreadCount(userId);
            
            // Broadcast update
            if (this.io && this.userSockets.has(userId)) {
                const socketIds = Array.from(this.userSockets.get(userId));
                socketIds.forEach(socketId => {
                    this.io.to(socketId).emit('notification:all-marked-read', {});
                });
            }
        } catch (error) {
            console.error('[Notification] Error marking all as read:', error);
        }
    }

    /**
     * Archive notification
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     */
    async archiveNotification(notificationId, userId) {
        try {
            const notification = await Notification.findById(notificationId);
            if (notification && notification.recipient.toString() === userId) {
                await notification.archive();
                await this.updateUnreadCount(userId);
                
                // Broadcast archive status
                if (this.io && this.userSockets.has(userId)) {
                    const socketIds = Array.from(this.userSockets.get(userId));
                    socketIds.forEach(socketId => {
                        this.io.to(socketId).emit('notification:archived', {
                            notificationId
                        });
                    });
                }
            }
        } catch (error) {
            console.error('[Notification] Error archiving notification:', error);
        }
    }

    /**
     * Get notifications with pagination
     * @param {string} userId - User ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     */
    async getNotifications(userId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const [notifications, total, unreadCount] = await Promise.all([
                Notification.find({
                    recipient: userId,
                    isArchived: false
                })
                .populate('sender', 'name avatar email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
                Notification.countDocuments({
                    recipient: userId,
                    isArchived: false
                }),
                Notification.getUnreadCount(userId)
            ]);

            return {
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                unreadCount
            };
        } catch (error) {
            console.error('[Notification] Error fetching notifications:', error);
            throw error;
        }
    }

    /**
     * Get notification summary/feed
     * @param {string} userId - User ID
     * @param {number} limit - Number of recent notifications
     */
    async getNotificationFeed(userId, limit = 5) {
        try {
            const [recent, unreadCount] = await Promise.all([
                Notification.getRecentNotifications(userId, limit),
                Notification.getUnreadCount(userId)
            ]);

            return {
                notifications: recent,
                unreadCount
            };
        } catch (error) {
            console.error('[Notification] Error fetching notification feed:', error);
            throw error;
        }
    }

    /**
     * Broadcast notification to multiple users
     * @param {Array<string>} userIds - Array of user IDs
     * @param {Object} notificationData - Notification data
     */
    async broadcastNotification(userIds, notificationData) {
        try {
            const promises = userIds.map(userId => 
                this.createNotification({
                    ...notificationData,
                    recipientId: userId
                })
            );
            
            return Promise.all(promises);
        } catch (error) {
            console.error('[Notification] Error broadcasting notification:', error);
            throw error;
        }
    }

    /**
     * Delete old notifications (cleanup)
     * @param {number} daysOld - Delete notifications older than N days
     */
    async cleanupOldNotifications(daysOld = 30) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
            const result = await Notification.deleteMany({
                createdAt: { $lt: cutoffDate },
                isArchived: true
            });
            console.log(`[Notification] Cleaned up ${result.deletedCount} old notifications`);
            return result;
        } catch (error) {
            console.error('[Notification] Error cleaning up notifications:', error);
        }
    }

    /**
     * Get notification statistics
     * @param {string} userId - User ID
     */
    async getNotificationStats(userId) {
        try {
            const unreadCount = await Notification.getUnreadCount(userId);
            const totalCount = await Notification.countDocuments({
                recipient: userId,
                isArchived: false
            });
            
            const byType = await Notification.aggregate([
                {
                    $match: {
                        recipient: mongoose.Types.ObjectId(userId),
                        isArchived: false
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                unreadCount,
                totalCount,
                byType: Object.fromEntries(byType.map(t => [t._id, t.count]))
            };
        } catch (error) {
            console.error('[Notification] Error getting statistics:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;
