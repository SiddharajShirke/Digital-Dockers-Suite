const mongoose = require('mongoose');

/**
 * Space Model
 * Represents a collaborative workspace within a project
 * Supports multiple content types: Notes, Whiteboard, MindMap
 */
const spaceSchema = new mongoose.Schema(
  {
    // Basic info
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    // Ownership & tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Default content type for this space
    defaultContentType: {
      type: String,
      enum: ['TEXT', 'WHITEBOARD', 'MINDMAP'],
      default: 'TEXT'
    },
    
    // Collaboration settings
    isPublic: {
      type: Boolean,
      default: false // Only project members can access by default
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    maxCollaborators: {
      type: Number,
      default: 50
    },
    
    // Statistics
    contributorCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    versionCount: {
      type: Number,
      default: 0
    },
    
    // Status
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'spaces'
  }
);

// Indexes for efficient queries
spaceSchema.index({ project: 1, createdAt: -1 });
spaceSchema.index({ createdBy: 1 });
spaceSchema.index({ project: 1, isArchived: 1 });

module.exports = mongoose.model('Space', spaceSchema);
