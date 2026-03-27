import api from './api';

/**
 * Roadmap API Service
 * Fetches the fully aggregated roadmap payload from the backend.
 * All data is dynamic — zero hardcoded values.
 */

/**
 * Fetch the complete roadmap data including KPIs, velocity trends,
 * monthly drill-down progress, and AI Insights.
 * @param {number} pastMonths - Number of past months to include (default: 12)
 * @param {number} futureMonths - Number of future months to include (default: 3)
 * @returns {Promise<Object>} The full roadmap JSON payload
 */
export const fetchRoadmapData = async (pastMonths = 12, futureMonths = 3) => {
    const response = await api.get('/roadmap', {
        params: { pastMonths, futureMonths }
    });
    return response.data;
};

/**
 * Fetch targeted AI insights for a specific project
 * @param {string} projectId - Project Mongo ID, or "general" for all projects
 * @returns {Promise<Object>} Object containing the insights array
 */
export const fetchInsights = async (projectId = 'general') => {
    const response = await api.post('/roadmap/insights', { projectId });
    return response.data;
};

export default { fetchRoadmapData, fetchInsights };
