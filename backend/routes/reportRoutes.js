const express = require('express');
const router = express.Router();
const { generateReport, getReports } = require('../controllers/reportController');
const workLogController = require('../controllers/workLogController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/generate', protect, generateReport);
router.get('/', protect, getReports);
router.get('/time', protect, workLogController.getTimeReport);

module.exports = router;
