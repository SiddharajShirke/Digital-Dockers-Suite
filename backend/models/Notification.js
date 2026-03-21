const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores real-time notifications for users
 * Supports read/unread status and priority levels
 */
const notificationSchema = mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'issue_created',
            'issue_assigned',
            'issue_status_changed',
            'issue_commented',
            'task_completed',
            'sprint_started',
            'sprint_completed',
            'mention',
            'document_shared',
            'meeting_scheduled',
            'project_added',
            'team_invite',
            'deadline_reminder',
            'ai_insight'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    entityType: {
        type: String,
        enum: ['issue', 'project', 'sprint', 'user', 'document', 'meeting', 'epic'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    entityKey: String, // e.g., PROJ-101
    icon: String, // emoji or icon identifier
    actionUrl: String, // URL to navigate when clicked
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    metadata: {
        projectId: mongoose.Schema.Types.ObjectId,
        projectName: String,
        userName: String,
        userAvatar: String,
        additionalInfo: mongoose.Schema.Types.Mixed
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for unread count
notificationSchema.virtual('isNew').get(function() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.createdAt > fiveMinutesAgo && !this.isRead;
});

// Methods
notificationSchema.methods.markAsRead = async function() {
    this.isRead = true;
    return this.save();
};

notificationSchema.methods.archive = async function() {
    this.isArchived = true;
    return this.save();
};

notificationSchema.statics.createNotification = async function(
    recipientId,
    senderId,
    type,
    title,
    description,
    entityType,
    entityId,
    options = {}
) {
    return this.create({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        description,
        entityType,
        entityId,
        entityKey: options.entityKey,
        icon: options.icon,
        actionUrl: options.actionUrl,
        priority: options.priority || 'medium',
        metadata: options.metadata || {},
        expiresAt: options.expiresAt
    });
};

notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({
        recipient: userId,
        isRead: false,
        isArchived: false
    });
};

notificationSchema.statics.getRecentNotifications = async function(userId, limit = 10) {
    return this.find({
        recipient: userId,
        isArchived: false
    })
    .populate('sender', 'name avatar email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Notification', notificationSchema);
