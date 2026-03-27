const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getRoadmapData, generateInsights } = require('../controllers/roadmapController');

// GET /api/roadmap — Full roadmap payload with drill-down metrics
router.get('/', protect, getRoadmapData);

// POST /api/roadmap/insights — On-demand NVIDIA AI Insights (with optional project filter)
router.post('/insights', protect, generateInsights);

module.exports = router;
