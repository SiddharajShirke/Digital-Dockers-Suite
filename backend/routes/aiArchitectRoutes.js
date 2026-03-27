const express = require('express');
const router = express.Router();
const {
    uploadCV,
    getCVStatus,
    getUserCVData,
    getAllCVs,
    retryParsing,
    deleteCV,
    generateDraftSprint,
    getDraftSprint,
    approveSprint,
    rejectSprint,
    getAtRiskTasks,
    generateReallocationProposal,
    approveReallocation,
    getWorkloadOverview,
    generateUnifiedReallocation,
    executeUnifiedReallocation,
    getReminderSettings,
    updateReminderSettings
} = require('../controllers/aiArchitectController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * ============================================================================
 * AI ARCHITECT ROUTES
 * ============================================================================
 */

// --- Phase 1: CV Management ---
router.post('/cv/upload', protect, ...uploadCV);
router.get('/cv/all', protect, getAllCVs);
router.get('/cv/:userId/status', protect, getCVStatus);
router.get('/cv/:userId', protect, getUserCVData);
router.post('/cv/:cvId/retry', protect, retryParsing);
router.delete('/cv/:cvId', protect, deleteCV);

// --- Phase 2: AI Sprint Formation ---
router.post('/sprint/generate', protect, generateDraftSprint);
router.get('/sprint/:sprintId', protect, getDraftSprint);
router.post('/sprint/:sprintId/approve', protect, approveSprint);
router.delete('/sprint/:sprintId/reject', protect, rejectSprint);

// --- Phase 3: Emergency Re-allocation ---
router.get('/reallocation/risks/:projectId', protect, getAtRiskTasks);
router.post('/reallocation/propose/:taskId', protect, generateReallocationProposal);
router.post('/reallocation/approve/:taskId', protect, approveReallocation);

// --- Unified Reallocation ---
router.get('/reallocate/overview', protect, getWorkloadOverview);
router.post('/reallocate/generate', protect, generateUnifiedReallocation);
router.post('/reallocate/execute', protect, executeUnifiedReallocation);

// --- Phase 4: Automated Reminders ---
router.get('/sprint/:sprintId/reminders', protect, getReminderSettings);
router.put('/sprint/:sprintId/reminders', protect, updateReminderSettings);

module.exports = router;
