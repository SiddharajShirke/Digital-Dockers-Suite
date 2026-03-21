const mongoose = require('mongoose');

/**
 * Repository Model
 * Stores metadata about analyzed GitHub repositories
 */
const repositorySchema = new mongoose.Schema({
    owner: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true  // owner/repo format
    },
    url: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        default: 'main'
    },
    metadata: {
        stars: { type: Number, default: 0 },
        forks: { type: Number, default: 0 },
        language: { type: String },
        size: { type: Number, default: 0 },  // in KB
        lastCommit: { type: Date },
        totalFiles: { type: Number, default: 0 },
        analyzedFiles: { type: Number, default: 0 },
        description: { type: String }
    },
    analysisStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending'
    },
    analysisProgress: {
        stage: { type: String },  // 'fetching_files', 'analyzing_complexity', 'computing_churn', 'storing_data'
        percentage: { type: Number, default: 0 },
        filesProcessed: { type: Number, default: 0 },
        currentFile: { type: String },
        errors: [String]
    },
    lastAnalyzed: {
        type: Date
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    settings: {
        includePatterns: { type: [String], default: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.py'] },
        excludePatterns: { type: [String], default: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js'] },
        complexityThreshold: { type: Number, default: 10 },
        churnPeriodDays: { type: Number, default: 90 }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
repositorySchema.index({ userId: 1, lastAnalyzed: -1 });
repositorySchema.index({ fullName: 1 }, { unique: true });
repositorySchema.index({ analysisStatus: 1 });

// Virtual for display name
repositorySchema.virtual('displayName').get(function () {
    return `${this.owner}/${this.name}`;
});

// Method to check if refresh is allowed (5 min cooldown)
repositorySchema.methods.canRefresh = function () {
    if (!this.lastAnalyzed) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastAnalyzed < fiveMinutesAgo;
};

// Method to get time until refresh allowed
repositorySchema.methods.refreshCooldown = function () {
    if (!this.lastAnalyzed) return 0;
    const cooldownEnd = new Date(this.lastAnalyzed.getTime() + 5 * 60 * 1000);
    const remaining = cooldownEnd - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));  // seconds
};

module.exports = mongoose.model('Repository', repositorySchema);
