const mongoose = require('mongoose');

/**
 * ============================================================================
 * EMPLOYEE CV MODEL
 * ============================================================================
 * Stores uploaded CV files (GridFS reference) and their parsed/extracted data.
 * The LLM extracts structured skill, experience, and education data from
 * raw PDF text for use in AI-powered team formation and task matching.
 */

const employeeCVSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    originalFilename: {
        type: String,
        required: true
    },
    // GridFS file reference for the original PDF
    gridFSFileId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    // Local file path fallback
    filePath: {
        type: String,
        default: null
    },
    // Raw text extracted from the PDF
    parsedText: {
        type: String,
        default: ''
    },
    // LLM-extracted structured data
    extractedData: {
        skills: [String],
        experience: [{
            title: String,
            company: String,
            years: Number,
            description: String
        }],
        education: [{
            degree: String,
            institution: String,
            year: String
        }],
        summary: String,
        totalYearsExperience: Number,
        primaryDomain: {
            type: String,
            enum: ['backend', 'frontend', 'fullstack', 'devops', 'cloud', 'data', 'ml_ai', 'mobile', 'security', 'qa', 'design', 'marketing', 'sales', 'management', 'other'],
            default: 'other'
        }
    },
    // Fit scores computed per task (populated during sprint formation)
    fitScores: [{
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        },
        score: {
            type: Number,
            min: 0,
            max: 1
        },
        reasoning: String,
        computedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['uploaded', 'parsing', 'parsed', 'error'],
        default: 'uploaded'
    },
    errorMessage: String,
    parsedAt: Date
}, {
    timestamps: true
});

// Multiple CVs per user are allowed (append-only history)
employeeCVSchema.index({ user: 1 }, { unique: false });

module.exports = mongoose.model('EmployeeCV', employeeCVSchema);
