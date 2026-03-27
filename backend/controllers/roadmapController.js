const asyncHandler = require('express-async-handler');
const roadmapService = require('../services/roadmapService');
const nvidiaLLMService = require('../services/nvidiaLLMService');

/**
 * ============================================================================
 * ROADMAP CONTROLLER
 * ============================================================================
 * GET /api/roadmap
 * 
 * Aggregates all roadmap data dynamically and optionally enriches with
 * NVIDIA NIM AI insights. Date range is fully configurable via query params.
 */

// @desc    Get full roadmap data payload
// @route   GET /api/roadmap
// @access  Private
const getRoadmapData = asyncHandler(async (req, res) => {
    const pastMonths = Number(req.query.pastMonths) || 12;
    const futureMonths = Number(req.query.futureMonths) || 3;

    // Run all aggregations in parallel for speed
    const [kpiHeader, chartTimeline, monthlyProgress] = await Promise.all([
        roadmapService.buildKPIHeader(),
        roadmapService.buildUnifiedChartTimeline(pastMonths, futureMonths),
        roadmapService.buildMonthlyProgress(pastMonths, futureMonths)
    ]);

    const payload = {
        kpiHeader,
        chartTimeline,
        monthlyProgress
    };

    res.json(payload);
});

// @desc    Generate targeted AI roadmap insights
// @route   POST /api/roadmap/insights
// @access  Private
const generateInsights = asyncHandler(async (req, res) => {
    const { projectId } = req.body;
    const pastMonths = 12;
    const futureMonths = 3;

    // Fetch baseline data
    const [kpiHeader, chartTimeline, monthlyProgress] = await Promise.all([
        roadmapService.buildKPIHeader(),
        roadmapService.buildUnifiedChartTimeline(pastMonths, futureMonths),
        roadmapService.buildMonthlyProgress(pastMonths, futureMonths)
    ]);

    let analyticsPayload = { kpiHeader, chartTimeline, monthlyProgress };

    // Filter math for project-specific insights Let's trim out un-related projects
    let projectNameStr = "All Projects (General Overview)";
    if (projectId && projectId !== 'general') {
        const filteredMonthly = monthlyProgress.map(bucket => {
            const matchedProjects = bucket.projects.filter(p => p.projectId === projectId);
            if (matchedProjects.length > 0) projectNameStr = matchedProjects[0].projectName;
            return {
                ...bucket,
                projects: matchedProjects
            };
        }).filter(bucket => bucket.projects.length > 0);

        analyticsPayload.monthlyProgress = filteredMonthly;
    }

    if (!process.env.NVIDIA_API_KEY) {
        return res.status(400).json({ message: 'NVIDIA API Key not configured.' });
    }

    const systemPrompt = `You are a rigorous, data-driven Agile Project Manager AI.
You will receive a JSON payload containing real project management metrics: KPI header with velocity data, a unified chart timeline charting completed, ongoing, and planned sprint points historically and into the future, and monthly progress broken down by projects and their sprints.

CURRENT ANALYSIS FOCAL POINT: ${projectNameStr}

Your job is to analyze this data and produce ONLY actionable, hyper-specific insights ${projectId !== 'general' ? 'strictly for this specific project' : 'across all projects'}.

RULES:
1. You MUST cite specific sprint names, point values, and percentages from the data.
2. NO generic advice like "communicate with your team". Every insight must reference concrete metrics.
3. Detect: carry-over sprint risks, overload warnings for future months, velocity anomalies, and on-time delivery trends.
4. You MUST respond with ONLY a valid JSON array — no markdown, no code fences.
5. Each object must have exactly: { "type": "success" | "warning" | "info", "message": "..." }
6. Return between 2 to 4 insights total.

Example:
[
  {"type":"warning","message":"Project 'Platform Redesign' has 2 active sprints but only completed 15/60 points (25%) this month. 'Sprint 3' is carrying 8 points of in-progress work past its end date."}
]`;

    try {
        const userMessage = JSON.stringify(analyticsPayload);

        const rawResponse = await nvidiaLLMService.chat(systemPrompt, userMessage, {
            temperature: 0.2,
            max_tokens: 2048
        });

        // Parse AI response
        const cleaned = rawResponse
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleaned);
        const insights = Array.isArray(parsed) ? parsed.map(item => ({
            type: ['success', 'warning', 'info'].includes(item.type) ? item.type : 'info',
            message: String(item.message || '')
        })) : [];

        res.json({ insights });
    } catch (err) {
        console.error('⚠️ [Roadmap] AI Insights generation failed:', err.message);
        res.status(500).json({ message: 'AI insights generation failed due to an internal LLM error.' });
    }
});

module.exports = { getRoadmapData, generateInsights };
