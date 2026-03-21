const mongoose = require('mongoose');

/**
 * SpaceActivity Model
 * Logs all actions in a Space for audit trail and activity feeds
 */
const spaceActivitySchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: true,
      index: true
    },
    
    // Activity details
    activityType: {
      type: String,
      enum: [
        'SPACE_CREATED',
        'SPACE_UPDATED',
        'SPACE_ARCHIVED',
        'CONTENT_ADDED',
        'CONTENT_EDITED',
        'CONTENT_DELETED',
        'CONTENT_REVERTED',
        'MEMBER_ADDED',
        'MEMBER_REMOVED',
        'MEMBER_ROLE_CHANGED',
        'COMMENT_ADDED',
        'COMMENT_DELETED',
        'SPACE_SHARED',
        'SPACE_UNSHARED'
      ],
      required: true
    },
    
    // Actor
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Affected resources
    affectedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contentVersion: Number,
    commentId: mongoose.Schema.Types.ObjectId,
    
    // Details
    description: String,
    changes: mongoose.Schema.Types.Mixed, // What changed (for audit trail)
    metadata: mongoose.Schema.Types.Mixed, // Additional context
    
    // IP & device tracking
    ipAddress: String,
    userAgent: String
  },
  {
    timestamps: true,
    collection: 'space_activities'
  }
);

// Indexes
spaceActivitySchema.index({ space: 1, createdAt: -1 });
spaceActivitySchema.index({ actor: 1, createdAt: -1 });
spaceActivitySchema.index({ activityType: 1 });
spaceActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-expire after 30 days

module.exports = mongoose.model('SpaceActivity', spaceActivitySchema);
