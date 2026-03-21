const mongoose = require('mongoose');

const issueHistorySchema = new mongoose.Schema({
    issueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    field: {
        type: String,
        required: true
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reason: String,
    comment: String
}, {
    timestamps: true
});

// Index for faster history retrieval
issueHistorySchema.index({ issueId: 1, createdAt: 1 });

module.exports = mongoose.model('IssueHistory', issueHistorySchema);
