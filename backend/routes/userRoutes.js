const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole } = require('../controllers/userController');
const { getOrgTree } = require('../controllers/orgController');
const workLogController = require('../controllers/workLogController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/org-tree', getOrgTree);

// Allow all authenticated users to get user list (needed for chat)
router.get('/', getUsers);

// Timer endpoints
router.get('/me/timer', workLogController.getRunningTimer);
router.post('/me/timers/stop', workLogController.stopUserTimers);

// Admin-only routes
router.use(admin);

router.put('/:id/role', updateUserRole);

module.exports = router;
