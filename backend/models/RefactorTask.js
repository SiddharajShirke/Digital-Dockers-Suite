const mongoose = require('mongoose');

const refactorTaskSchema = new mongoose.Schema({
    digitalDockersTaskId: { type: String, required: true, unique: true },
    digitalDockersTaskUrl: { type: String },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodebaseFile' },
    status: {
        type: String,
        enum: ['OPEN', 'IN_PROGRESS', 'DONE'],
        default: 'OPEN'
    },
    sla: Date,
    assignee: String,
    priority: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        default: 'MEDIUM'
    },
    riskScoreAtCreation: Number,
    syncedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('RefactorTask', refactorTaskSchema);
