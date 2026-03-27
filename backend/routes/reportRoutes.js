const express = require('express');
const router = express.Router();
const { 
    getProjectMetrics,
    getSprintMetrics,
    generateProjectReport, 
    generateSprintReport, 
    exportReport, 
    generateReport, 
    getReports 
} = require('../controllers/reportController');
const workLogController = require('../controllers/workLogController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/data/project/:projectId', protect, getProjectMetrics);
router.get('/data/sprint/:sprintId', protect, getSprintMetrics);

router.post('/generate/project/:projectId', protect, generateProjectReport);
router.post('/generate/sprint/:sprintId', protect, generateSprintReport);
router.post('/export', protect, exportReport);

// Legacy routes
router.post('/generate', protect, generateReport);
router.get('/', protect, getReports);
router.get('/time', protect, workLogController.getTimeReport);

module.exports = router;
