const mongoose = require('mongoose');

const meetingSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a meeting title']
    },
    description: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    meetLink: {
        type: String,
        default: ''
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        default: 60 // minutes
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        email: String,
        name: String,
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        }
    }],
    transcript: {
        text: String,
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    summary: {
        overview: String,
        keyPoints: [String],
        decisions: [String],
        actionItems: [String],
        nextSteps: [String]
    },
    audioFile: {
        filename: String,
        filepath: String,
        mimetype: String,
        size: Number
    },
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    meetingType: {
        type: String,
        enum: ['google_meet', 'zoom', 'teams', 'mirotalk', 'other'],
        default: 'mirotalk'
    },
    calendarEventId: String,
    linkedTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }]
}, {
    timestamps: true
});

// Index for efficient queries
meetingSchema.index({ scheduledAt: -1 });
meetingSchema.index({ createdBy: 1, scheduledAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
