const express = require('express');
const workLogController = require('../controllers/workLogController');
const { protect } = require('../middlewares/authMiddleware');
const { role } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * Work Log Routes
 * Mounted on /api/work-logs in server.js
 */

// Work log CRUD
router.get('/:id', protect, workLogController.getWorkLog);
router.patch('/:id', protect, workLogController.updateWorkLog);
router.delete('/:id', protect, workLogController.deleteWorkLog);

// Approval endpoint (admin only)
router.post('/:id/approve', protect, role('admin', 'manager'), workLogController.approveWorkLog);

module.exports = router;
