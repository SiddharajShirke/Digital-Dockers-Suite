const jwt = require('jsonwebtoken');
const NotificationService = require('../services/notificationService');

/**
 * WebSocket Event Handlers for Real-time Notifications
 * Manages socket connections and real-time notification delivery
 */

class WebSocketNotificationHandler {
    constructor(io) {
        this.io = io;
        this.notificationService = new NotificationService(io);
        this.userConnections = new Map(); // userId -> Set of socketIds
    }

    /**
     * Initialize WebSocket event handlers
     */
    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`[WebSocket] New connection: ${socket.id}`);

            // Authenticate user
            socket.on('notification:authenticate', (data, callback) => {
                this.authenticateUser(socket, data, callback);
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            // Handle reconnect
            socket.on('notification:reconnect', (data, callback) => {
                this.handleReconnect(socket, data, callback);
            });

            // Mark notification as read
            socket.on('notification:read', async (data) => {
                if (socket.userId) {
                    await this.notificationService.markAsRead(data.notificationId, socket.userId);
                }
            });

            // Mark all as read
            socket.on('notification:readAll', async () => {
                if (socket.userId) {
                    await this.notificationService.markAllAsRead(socket.userId);
                }
            });

            // Archive notification
            socket.on('notification:archive', async (data) => {
                if (socket.userId) {
                    await this.notificationService.archiveNotification(data.notificationId, socket.userId);
                }
            });

            // Get notification feed
            socket.on('notification:fetch', async (data, callback) => {
                if (socket.userId) {
                    const feed = await this.notificationService.getNotificationFeed(socket.userId, data.limit || 5);
                    if (callback) callback(feed);
                }
            });

            // Heartbeat to keep connection alive
            socket.on('notification:ping', (callback) => {
                if (callback) callback({ status: 'pong', timestamp: Date.now() });
            });
        });

        console.log('[WebSocket] Notification handlers initialized');
    }

    /**
     * Authenticate user connection
     * @param {Object} socket - Socket instance
     * @param {Object} data - Authentication data (token)
     * @param {Function} callback - Callback function
     */
    async authenticateUser(socket, data, callback) {
        try {
            const token = socket.token || data.token;
            if (!token) {
                throw new Error('Token required');
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.join(`user:${decoded.id}`); // Join user-specific room

            // Register socket
            this.notificationService.registerUserSocket(decoded.id, socket.id);

            // Get current unread count and initial feed
            const unreadCount = await this.getUnreadCount(decoded.id);
            const feed = await this.notificationService.getNotificationFeed(decoded.id, 5);

            console.log(`[WebSocket] User ${decoded.id} authenticated via socket ${socket.id}`);

            if (callback) {
                callback({
                    success: true,
                    userId: decoded.id,
                    unreadCount,
                    feed: feed.notifications
                });
            }
        } catch (error) {
            console.error('[WebSocket] Authentication error:', error.message);
            if (callback) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle socket disconnect
     * @param {Object} socket - Socket instance
     */
    handleDisconnect(socket) {
        if (socket.userId) {
            this.notificationService.unregisterUserSocket(socket.userId, socket.id);
            console.log(`[WebSocket] User ${socket.userId} disconnected from socket ${socket.id}`);
        }
    }

    /**
     * Handle reconnection
     * @param {Object} socket - Socket instance
     * @param {Object} data - Reconnection data
     * @param {Function} callback - Callback function
     */
    async handleReconnect(socket, data, callback) {
        try {
            if (socket.userId && data.lastNotificationId) {
                // Fetch notifications since last one
                const Notification = require('../models/Notification');
                const newNotifications = await Notification.find({
                    recipient: socket.userId,
                    _id: { $gt: data.lastNotificationId },
                    isArchived: false
                })
                .populate('sender', 'name avatar email')
                .sort({ createdAt: -1 })
                .lean();

                if (callback) {
                    callback({
                        success: true,
                        newNotifications
                    });
                }
            }
        } catch (error) {
            console.error('[WebSocket] Reconnect error:', error);
            if (callback) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Get unread count for user
     * @param {string} userId - User ID
     */
    async getUnreadCount(userId) {
        const Notification = require('../models/Notification');
        return Notification.getUnreadCount(userId);
    }

    /**
     * Emit notification to specific user
     * @param {string} userId - User ID
     * @param {Object} notificationData - Notification object
     */
    async emitToUser(userId, notificationData) {
        this.io.to(`user:${userId}`).emit('notification:new', notificationData);
    }

    /**
     * Emit notification to multiple users
     * @param {Array<string>} userIds - Array of user IDs
     * @param {Object} notificationData - Notification object
     */
    async emitToUsers(userIds, notificationData) {
        userIds.forEach(userId => {
            this.emitToUser(userId, notificationData);
        });
    }

    /**
     * Get notification service
     */
    getNotificationService() {
        return this.notificationService;
    }
}

module.exports = WebSocketNotificationHandler;
