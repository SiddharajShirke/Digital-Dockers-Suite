const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    // Jira: Issue Key (e.g. PROJ-123). Will be auto-generated in controller.
    key: {
        type: String,
        unique: true,
        sparse: true
    },
    title: {
        type: String,
        required: [true, 'Please add a task title']
    },
    description: String, // Rich text content
    issueType: {
        type: String,
        enum: ['story', 'task', 'bug', 'epic', 'subtask'],
        default: 'task'
    },
    priority: {
        type: String,
        enum: ['lowest', 'low', 'medium', 'high', 'highest'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'review', 'done', 'blocked'],
        default: 'todo'
    },
    storyPoints: Number,

    // Relations
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    sprint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sprint'
    },
    epic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Epic'
    },
    parentTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task', // For subtasks (max nesting = 1 level)
        validate: {
            validator: async function(parentId) {
                if (!parentId) return true; // parentTask is optional
                const parentTask = await mongoose.model('Task').findById(parentId);
                // Ensure parent is not a subtask (no nesting beyond 1 level)
                if (parentTask && parentTask.parentTask) {
                    throw new Error('Subtasks cannot have subtasks (max nesting depth = 1)');
                }
                // Ensure parent is not an epic
                if (parentTask && parentTask.issueType === 'epic') {
                    throw new Error('Epics cannot be parents of subtasks');
                }
                return true;
            },
            message: 'Invalid parent task configuration'
        }
    },

    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Dates
    dueDate: Date,
    startDate: Date,

    estimatedTime: Number, // in hours

    // Original Fields (Keeping for compatibility or AI features)
    aiSuggestions: {
        timeBreakdown: [{
            phase: String,
            duration: Number,
            description: String
        }],
        dependencies: [String],
        recommendedAssignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        complexity: String
    },
    linkedMeeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting'
    },
    // We can deprecate linkedProject in favor of 'project' but keeping for safety if used elsewhere
    linkedProject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },

    tags: [String],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    attachments: [String], // URLs
    labels: [String], // Jira-style labels
    history: [{
        field: String,
        oldValue: String,
        newValue: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    completedAt: Date, // For velocity calculation
    completedPoints: Number, // Snapshot of points when completed

    // AI Architect Fields
    specializationMatch: String, // Reason for assignment based on CV/Resume
    fitScore: Number, // 0 to 1 score of skill overlap
}, {
    timestamps: true
});

// ============================================================================
// INDEXES for Performance Optimization
// ============================================================================

// Index for finding children by parent
taskSchema.index({ parentTask: 1, project: 1 });

// Index for finding tasks by project and status (common query)
taskSchema.index({ project: 1, status: 1 });

// Index for sprint board queries
taskSchema.index({ sprint: 1, status: 1 });

// Index for epic queries
taskSchema.index({ epic: 1 });

// Index for assignee queries
taskSchema.index({ assignedTo: 1, project: 1 });

// Compound index for parent-child hierarchy with status
taskSchema.index({ parentTask: 1, status: 1 });

// ============================================================================
// PRE-SAVE VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate before saving:
 * 1. Subtasks must have a parent
 * 2. Epics cannot have a parent
 * 3. Max nesting depth = 1 (no sub-sub-tasks)
 */
taskSchema.pre('save', async function() {
    // Validation 1: Subtasks must have a parent
    if (this.issueType === 'subtask' && !this.parentTask) {
        throw new Error('Subtasks must have a parent work item');
    }

    // Validation 2: Epics cannot have a parent
    if (this.issueType === 'epic' && this.parentTask) {
        throw new Error('Epics cannot be subtasks');
    }

    // Validation 3: Non-subtasks with a parent should have issueType = 'subtask'
    if (this.parentTask && this.issueType !== 'subtask') {
        this.issueType = 'subtask'; // Auto-correct for consistency
    }

    // Validation 4: Max nesting depth = 1
    if (this.parentTask) {
        const parentTask = await mongoose.model('Task').findById(this.parentTask);
        if (parentTask && parentTask.parentTask) {
            throw new Error('Subtasks cannot have subtasks (max nesting depth = 1)');
        }
        if (parentTask && parentTask.issueType === 'epic') {
            throw new Error('Epics cannot be parents of subtasks');
        }
    }
});

// ============================================================================
// SCHEMA METHODS for Parent-Child Operations
// ============================================================================

/**
 * Get all children of this task
 * @returns {Promise<Array>} Array of child tasks
 */
taskSchema.methods.getChildren = function() {
    return mongoose.model('Task').find({ parentTask: this._id })
        .populate('assignedTo reporter assignedBy')
        .sort({ createdAt: 1 });
};

/**
 * Get parent task
 * @returns {Promise<Object>} Parent task document
 */
taskSchema.methods.getParent = function() {
    if (!this.parentTask) return null;
    return mongoose.model('Task').findById(this.parentTask)
        .populate('assignedTo reporter assignedBy');
};

/**
 * Calculate total story points from children
 * @returns {Promise<Number>} Sum of children's story points
 */
taskSchema.methods.calculateChildrenStoryPoints = async function() {
    const children = await this.getChildren();
    return children.reduce((sum, child) => sum + (child.storyPoints || 0), 0);
};

/**
 * Check if all children are done
 * @returns {Promise<Boolean>}
 */
taskSchema.methods.allChildrenDone = async function() {
    const children = await this.getChildren();
    return children.length > 0 && children.every(child => child.status === 'done');
};

/**
 * Check if any child is in progress
 * @returns {Promise<Boolean>}
 */
taskSchema.methods.anyChildInProgress = async function() {
    const children = await this.getChildren();
    return children.some(child => child.status === 'in_progress');
};

/**
 * Count total children
 * @returns {Promise<Number>}
 */
taskSchema.methods.countChildren = function() {
    return mongoose.model('Task').countDocuments({ parentTask: this._id });
};

module.exports = mongoose.model('Task', taskSchema);
