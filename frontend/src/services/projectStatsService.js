import api from './api';

const projectStatsService = {
    // Get project statistics for dashboard
    getProjectStats: async (projectId, sprintId) => {
        const url = `/projects/${projectId}/stats${sprintId ? `?sprintId=${sprintId}` : ''}`;
        const response = await api.get(url);
        return response.data;
    },

    // Get burndown data for a sprint
    getBurndownData: async (sprintId) => {
        const response = await api.get(`/sprints/${sprintId}/burndown`);
        return response.data;
    }
};

export default projectStatsService;
