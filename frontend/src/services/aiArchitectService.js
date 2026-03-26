import api from './api';

const aiArchitectService = {
    // Upload a CV for a user
    uploadCV: async (userId, file) => {
        const formData = new FormData();
        formData.append('cv', file);
        formData.append('userId', userId);

        const response = await api.post('/ai-architect/cv/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Get CV parsing status for a user
    getCVStatus: async (userId) => {
        const response = await api.get(`/ai-architect/cv/${userId}/status`);
        return response.data;
    },

    // Get full parsed CV data for a user
    getUserCVData: async (userId) => {
        const response = await api.get(`/ai-architect/cv/${userId}`);
        return response.data;
    },

    // Get all uploaded CVs
    getAllCVs: async () => {
        const response = await api.get('/ai-architect/cv/all');
        return response.data;
    },

    // Retry parsing a failed CV
    retryParsing: async (cvId) => {
        const response = await api.post(`/ai-architect/cv/${cvId}/retry`);
        return response.data;
    },

    // Delete a CV
    deleteCV: async (cvId) => {
        const response = await api.delete(`/ai-architect/cv/${cvId}`);
        return response.data;
    },

    // ========================================================================
    // PHASE 2: SPRINT FORMATION
    // ========================================================================

    generateDraftSprint: async (data) => {
        const response = await api.post('/ai-architect/sprint/generate', data);
        return response.data;
    },

    getDraftSprint: async (sprintId) => {
        const response = await api.get(`/ai-architect/sprint/${sprintId}`);
        return response.data;
    },

    approveSprint: async (sprintId) => {
        const response = await api.post(`/ai-architect/sprint/${sprintId}/approve`);
        return response.data;
    },

    rejectSprint: async (sprintId) => {
        const response = await api.delete(`/ai-architect/sprint/${sprintId}/reject`);
        return response.data;
    },

    // ========================================================================
    // PHASE 3: EMERGENCY RE-ALLOCATION
    // ========================================================================

    getAtRiskTasks: async (projectId) => {
        const response = await api.get(`/ai-architect/reallocation/risks/${projectId}`);
        return response.data;
    },

    generateReallocationProposal: async (taskId) => {
        const response = await api.post(`/ai-architect/reallocation/propose/${taskId}`);
        return response.data;
    },

    approveReallocation: async (taskId, newAssigneeId) => {
        const response = await api.post(`/ai-architect/reallocation/approve/${taskId}`, { newAssigneeId });
        return response.data;
    },

    // ========================================================================
    // PHASE 4: REMINDERS & NOTIFICATIONS
    // ========================================================================

    getReminderSettings: async (sprintId) => {
        const response = await api.get(`/ai-architect/sprint/${sprintId}/reminders`);
        return response.data;
    },

    updateReminderSettings: async (sprintId, data) => {
        const response = await api.put(`/ai-architect/sprint/${sprintId}/reminders`, data);
        return response.data;
    }
};

export default aiArchitectService;
