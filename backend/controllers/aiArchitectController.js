const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const EmployeeCV = require('../models/EmployeeCV');
const User = require('../models/User');
const CVParserService = require('../services/cvParserService');

/**
 * ============================================================================
 * AI ARCHITECT CONTROLLER
 * ============================================================================
 * Handles CV upload, parsing status, and CV data retrieval.
 * Phase 1 of the AI Project Architect feature.
 */

// ============================================================================
// MULTER SETUP – Local file storage for CVs
// ============================================================================
const uploadsDir = path.join(__dirname, '..', 'uploads', 'cvs');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

// ============================================================================
// CONTROLLERS
// ============================================================================

// @desc    Upload a CV for an employee
// @route   POST /api/ai-architect/cv/upload
// @access  Private
const uploadCV = [
    upload.single('cv'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            res.status(400);
            throw new Error('Please upload a CV file (PDF, DOC, or DOCX)');
        }

        const userId = req.body.userId || req.user._id;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            res.status(404);
            throw new Error('User not found');
        }

        // Create new CV record (append-only history)
        const cvRecord = await EmployeeCV.create({
            user: userId,
            originalFilename: req.file.originalname,
            filePath: req.file.path,
            status: 'uploaded'
        });

        console.log(`📤 CV uploaded for user ${user.fullName}: ${req.file.originalname}`);

        // Start async parsing (don't wait for it)
        CVParserService.parseAndExtract(cvRecord._id)
            .then(() => console.log(`✅ Background CV parsing complete for ${user.fullName}`))
            .catch(err => console.error(`❌ Background CV parsing failed for ${user.fullName}:`, err.message));

        res.status(201).json({
            success: true,
            message: 'CV uploaded successfully. Parsing in progress...',
            data: {
                cvId: cvRecord._id,
                userId: userId,
                filename: req.file.originalname,
                status: 'uploaded'
            }
        });
    })
];

// @desc    Get CV parsing status for a user
// @route   GET /api/ai-architect/cv/:userId/status
// @access  Private
const getCVStatus = asyncHandler(async (req, res) => {
    const cvRecord = await EmployeeCV.findOne({ user: req.params.userId });

    if (!cvRecord) {
        return res.json({
            success: true,
            data: {
                hasCV: false,
                status: null
            }
        });
    }

    res.json({
        success: true,
        data: {
            hasCV: true,
            cvId: cvRecord._id,
            status: cvRecord.status,
            filename: cvRecord.originalFilename,
            parsedAt: cvRecord.parsedAt,
            errorMessage: cvRecord.errorMessage,
            skillCount: cvRecord.extractedData?.skills?.length || 0
        }
    });
});

// @desc    Get full parsed CV data for a user
// @route   GET /api/ai-architect/cv/:userId
// @access  Private
const getUserCVData = asyncHandler(async (req, res) => {
    const cvRecord = await EmployeeCV.findOne({ user: req.params.userId })
        .populate('user', 'fullName email profileInfo role');

    if (!cvRecord) {
        res.status(404);
        throw new Error('No CV found for this user');
    }

    res.json({
        success: true,
        data: cvRecord
    });
});

// @desc    Get all uploaded CVs with their status
// @route   GET /api/ai-architect/cv/all
// @access  Private (Manager/Admin)
const getAllCVs = asyncHandler(async (req, res) => {
    const cvRecords = await EmployeeCV.find()
        .populate('user', 'fullName email profileInfo role')
        .sort({ updatedAt: -1 });

    res.json({
        success: true,
        data: cvRecords,
        count: cvRecords.length
    });
});

// @desc    Retry parsing a failed CV
// @route   POST /api/ai-architect/cv/:cvId/retry
// @access  Private
const retryParsing = asyncHandler(async (req, res) => {
    const cvRecord = await EmployeeCV.findById(req.params.cvId);

    if (!cvRecord) {
        res.status(404);
        throw new Error('CV record not found');
    }

    if (cvRecord.status === 'parsing') {
        res.status(400);
        throw new Error('CV is already being parsed');
    }

    // Reset and re-trigger parsing
    cvRecord.status = 'uploaded';
    cvRecord.errorMessage = undefined;
    await cvRecord.save();

    CVParserService.parseAndExtract(cvRecord._id)
        .then(() => console.log(`✅ Retry parsing complete for CV ${cvRecord._id}`))
        .catch(err => console.error(`❌ Retry parsing failed for CV ${cvRecord._id}:`, err.message));

    res.json({
        success: true,
        message: 'CV parsing retried. Check status for updates.'
    });
});

// @desc    Delete a CV record
// @route   DELETE /api/ai-architect/cv/:cvId
// @access  Private
const deleteCV = asyncHandler(async (req, res) => {
    const cvRecord = await EmployeeCV.findById(req.params.cvId);

    if (!cvRecord) {
        res.status(404);
        throw new Error('CV record not found');
    }

    // Delete file from filesystem
    if (cvRecord.filePath && fs.existsSync(cvRecord.filePath)) {
        fs.unlinkSync(cvRecord.filePath);
    }

    await EmployeeCV.findByIdAndDelete(req.params.cvId);

    res.json({
        success: true,
        message: 'CV deleted successfully'
    });
});

// ============================================================================
// PHASE 2: AI SPRINT FORMATION
// ============================================================================

const AISprintArchitectService = require('../services/aiSprintArchitectService');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

// @desc    Generate a Draft Sprint Plan from a Raw Idea
// @route   POST /api/ai-architect/sprint/generate
// @access  Private (Manager/Admin)
const generateDraftSprint = asyncHandler(async (req, res) => {
    const { sprintName, projectIdea, teamType, dateRange, intervalsDays } = req.body;

    if (!projectIdea) {
        res.status(400);
        throw new Error('Project idea is required to generate tasks.');
    }

    // Pass generation to the AI service
    const draftSprint = await AISprintArchitectService.generateSprintFromIdea(
        sprintName,
        projectIdea,
        teamType,
        dateRange,
        intervalsDays
    );

    res.status(201).json({
        success: true,
        message: 'AI Draft Sprint Plan generated successfully. Awaiting your approval.',
        data: draftSprint
    });
});

// @desc    Get an existing Draft Sprint Plan
// @route   GET /api/ai-architect/sprint/:sprintId
// @access  Private
const getDraftSprint = asyncHandler(async (req, res) => {
    const sprint = await Sprint.findById(req.params.sprintId)
        .populate({
            path: 'aiPlan.technicalNodes.members',
            select: 'fullName email profileInfo role avatar'
        })
        .populate({
            path: 'aiPlan.technicalNodes.tasks.assignedTo',
            select: 'fullName avatar'
        });

    if (!sprint) {
        res.status(404);
        throw new Error('Sprint not found');
    }

    res.json({
        success: true,
        data: sprint
    });
});

// @desc    Approve a Draft Sprint
// @route   POST /api/ai-architect/sprint/:sprintId/approve
// @access  Private (Manager/Admin)
const approveSprint = asyncHandler(async (req, res) => {
    const sprintId = req.params.sprintId;
    const userId = req.user._id;

    const activeSprint = await AISprintArchitectService.approveSprintFromIdea(sprintId, userId);

    res.json({
        success: true,
        message: 'Sprint & Project Created. Tasks have been assigned to engineers.',
        data: activeSprint
    });
});

// @desc    Reject/Delete a Draft Sprint
// @route   DELETE /api/ai-architect/sprint/:sprintId/reject
// @access  Private (Manager/Admin)
const rejectSprint = asyncHandler(async (req, res) => {
    const sprint = await Sprint.findById(req.params.sprintId);

    if (!sprint || sprint.status !== 'draft') {
        res.status(400);
        throw new Error('Invalid sprint or sprint is not in draft status');
    }

    // Unlink tasks
    await Task.updateMany(
        { sprint: sprint._id },
        { $unset: { sprint: "" } }
    );

    await Sprint.findByIdAndDelete(sprint._id);

    res.json({
        success: true,
        message: 'Draft Sprint rejected and deleted. Tasks returned to backlog.'
    });
});

// ============================================================================
// PHASE 3: EMERGENCY RE-ALLOCATION
// ============================================================================

const DeadlineRiskService = require('../services/deadlineRiskService');

// @desc    Get all at-risk tasks for a project
// @route   GET /api/ai-architect/reallocation/risks/:projectId
// @access  Private (Manager/Admin)
const getAtRiskTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const tasks = await DeadlineRiskService.getAtRiskTasks(projectId);

    res.json({
        success: true,
        count: tasks.length,
        data: tasks
    });
});

// @desc    Generate AI Re-allocation Proposal for a Task
// @route   POST /api/ai-architect/reallocation/propose/:taskId
// @access  Private (Manager/Admin)
const generateReallocationProposal = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const proposal = await DeadlineRiskService.generateReallocationProposal(taskId);

    res.status(201).json({
        success: true,
        message: 'Re-allocation proposal generated.',
        data: proposal
    });
});

// @desc    Approve and Execute Re-allocation
// @route   POST /api/ai-architect/reallocation/approve/:taskId
// @access  Private (Manager/Admin)
const approveReallocation = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { newAssigneeId } = req.body;
    const managerId = req.user._id;

    if (!newAssigneeId) {
        res.status(400);
        throw new Error('New assignee ID is required');
    }

    const updatedTask = await DeadlineRiskService.approveReallocation(taskId, newAssigneeId, managerId);

    // Provide system notification if handler exists
    try {
        const notificationHandler = req.app.get('notificationHandler');
        if (notificationHandler) {
            const notificationService = notificationHandler.getNotificationService();
            await notificationService.createNotification({
                recipient: newAssigneeId,
                sender: managerId,
                type: 'TASK_ASSIGNED',
                title: 'Emergency Task Re-allocation',
                description: `You have been assigned to "${updatedTask.title}" by the AI Architect to mitigate deadline risk.`,
                entityType: 'Task',
                entityId: updatedTask._id,
                priority: 'high'
            });
        }
    } catch (err) {
        console.error('Failed to notify new assignee:', err.message);
    }

    res.json({
        success: true,
        message: 'Task successfully re-allocated.',
        data: updatedTask
    });
});

// ============================================================================
// PHASE 4: AUTOMATED REMINDERS & NOTIFICATIONS
// ============================================================================

// @desc    Get reminder settings for a sprint
// @route   GET /api/ai-architect/sprint/:sprintId/reminders
// @access  Private (Manager/Admin)
const getReminderSettings = asyncHandler(async (req, res) => {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) {
        res.status(404);
        throw new Error('Sprint not found');
    }
    res.json({
        success: true,
        data: sprint.reminderSettings || { enabled: false, intervalsDays: [] }
    });
});

// @desc    Update reminder settings for a sprint
// @route   PUT /api/ai-architect/sprint/:sprintId/reminders
// @access  Private (Manager/Admin)
const updateReminderSettings = asyncHandler(async (req, res) => {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) {
        res.status(404);
        throw new Error('Sprint not found');
    }

    sprint.reminderSettings = {
        enabled: req.body.enabled,
        intervalsDays: req.body.intervalsDays
    };

    await sprint.save();

    res.json({
        success: true,
        message: 'Reminder settings updated successfully.',
        data: sprint.reminderSettings
    });
});

module.exports = {
    // Phase 1
    uploadCV,
    getCVStatus,
    getUserCVData,
    getAllCVs,
    retryParsing,
    deleteCV,
    // Phase 2
    generateDraftSprint,
    getDraftSprint,
    approveSprint,
    rejectSprint,
    // Phase 3
    getAtRiskTasks,
    generateReallocationProposal,
    approveReallocation,
    // Phase 4
    getReminderSettings,
    updateReminderSettings
};
