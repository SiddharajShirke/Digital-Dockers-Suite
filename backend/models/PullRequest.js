const mongoose = require('mongoose');

const pullRequestSchema = new mongoose.Schema({
    prNumber: { type: Number, required: true },
    repoId: { type: String, required: true }, // Using String (owner/repo) or ObjectId if you have a Repository model
    author: { type: String, required: true },
    title: { type: String },
    url: { type: String }, // GitHub PR URL
    branch: { type: String }, // Source branch name
    status: {
        type: String,
        enum: ['PENDING', 'PASS', 'BLOCK', 'OVERRIDDEN', 'WARN'],
        default: 'PENDING'
    },
    healthScore: {
        current: { type: Number, default: 0 },
        delta: { type: Number, default: 0 }
    },
    filesChanged: [String], // Array of file paths modified in this PR
    digitalDockersTaskId: { type: String },
    analysisResults: {
        lint: {
            errors: { type: Number, default: 0 },
            warnings: { type: Number, default: 0 },
            rawOutput: String
        },
        complexity: {
            healthScoreDelta: { type: Number, default: 0 },
            fileChanges: [{
                file: String,
                beforeHealth: Number,
                afterHealth: Number,
                complexity: Number,
                additions: Number,
                deletions: Number,
                loc: Number,
                riskScore: Number,
                lintErrors: Number,
                lintWarnings: Number,
                securityIssues: Number,
                codeSmells: Number
            }]
        },
        ticketAlignment: {
            aligned: { type: Boolean, default: false },
            confidence: Number,
            explanation: String
        },
        aiScan: {
            verdict: { type: String, enum: ['GOOD', 'RISKY', 'BAD', 'PENDING'], default: 'PENDING' },
            categories: {
                security: Number,
                correctness: Number,
                maintainability: Number,
                performance: Number,
                testing: Number
            },
            provider: { type: String, default: 'none' },
            model: { type: String, default: 'none' },
            fallbackUsed: { type: Boolean, default: false },
            generatedAt: Date,
            findings: [{
                file: String,
                lineRange: [Number],
                message: String,
                suggestion: String,
                debtImpact: { type: String, enum: ['adds', 'neutral', 'reduces'] },
                severity: Number,
                confidence: { type: String, enum: ['low', 'medium', 'high'] }
            }]
        }
    },
    blockReasons: [String],
    overrideReason: String,
    overrideBy: String,
}, {
    timestamps: true
});

module.exports = mongoose.model('PullRequest', pullRequestSchema);
