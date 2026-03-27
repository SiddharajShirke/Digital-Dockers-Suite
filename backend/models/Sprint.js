const mongoose = require('mongoose');

const sprintSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a sprint name']
    },
    goal: String,
    startDate: Date,
    endDate: Date,
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'future', 'active', 'closed'],
        default: 'future'
    },
    // Metrics
    committedPoints: { type: Number, default: 0 },
    completedPoints: { type: Number, default: 0 },
    velocity: { type: Number, default: 0 },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    tasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    // AI sprint formation
    aiPlan: {
        projectName: String,
        projectIdea: String,
        teamType: String,
        technicalNodes: [{
            name: String,
            focusArea: String,
            members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            tasks: [{
                // Store task definition since it doesn't exist in DB yet
                title: String,
                description: String,
                priority: String,
                estimatedTime: Number,
                requiredSkills: [String],
                
                assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                assigneeName: String,
                fitScore: Number,
                aiReasoning: String,
                specializationMatch: String
            }]
        }],
        reasoning: String,
        generatedAt: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date
    },
    // Reminder Settings (Phase 4)
    reminderSettings: {
        enabled: { type: Boolean, default: true },
        intervalsDays: { type: [Number], default: [5, 2, 1] }
    },
    // Useful for reordering in the backlog list if needed, but usually calculated
    boardIndex: Number
}, {
    timestamps: true
});

module.exports = mongoose.model('Sprint', sprintSchema);
