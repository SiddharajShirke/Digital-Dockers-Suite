import axios from 'axios';

class ReportService {
  /**
   * Fetch raw project metrics immediately for the dashboard
   */
  async getProjectMetrics(projectId) {
    try {
        const response = await axios.get(`/api/reports/data/project/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project metrics:', error);
        throw error;
    }
  }

  /**
   * Fetch raw sprint metrics immediately for the dashboard
   */
  async getSprintMetrics(sprintId) {
    try {
        const response = await axios.get(`/api/reports/data/sprint/${sprintId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching sprint metrics:', error);
        throw error;
    }
  }

  /**
   * Generate an AI-powered Project Report

   * @param {string} projectId 
   * @returns {Promise<Object>} The generated report data including AI narrative
   */
  async generateProjectReport(projectId) {
    try {
        const response = await axios.post(`/api/reports/generate/project/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Error generating project report:', error);
        throw error.response?.data?.message || 'Failed to generate project report';
    }
  }

  /**
   * Generate an AI-powered Sprint Report
   * @param {string} sprintId 
   * @returns {Promise<Object>} The generated report data including AI narrative
   */
  async generateSprintReport(sprintId) {
    try {
        const response = await axios.post(`/api/reports/generate/sprint/${sprintId}`);
        return response.data;
    } catch (error) {
        console.error('Error generating sprint report:', error);
        throw error.response?.data?.message || 'Failed to generate sprint report';
    }
  }

  /**
   * Export the report to PDF, DOCX, or HTML
   * @param {Object} reportData The generated report
   * @param {string} format 'pdf', 'docx', or 'html'
   */
  async exportReport(reportData, format) {
    try {
        const response = await axios.post('/api/reports/export', { reportData, format }, {
            responseType: 'blob' // Important for downloading files
        });

        // Create a blob from the response data
        const blob = new Blob([response.data], { 
            type: response.headers['content-type'] 
        });

        // Extract filename from Content-Disposition header if available
        let filename = `report_${new Date().getTime()}.${format}`;
        const disposition = response.headers['content-disposition'];
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        // Create download link and trigger click
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Error exporting report:', error);
        // If error is a blob (from API error response), we need to read it
        if (error.response && error.response.data instanceof Blob) {
           const text = await error.response.data.text();
           try {
               const errJson = JSON.parse(text);
               throw errJson.message || 'Export failed';
           } catch (e) {
               throw 'Export failed';
           }
        }
        throw 'Failed to export report';
    }
  }
}

export const reportService = new ReportService();
