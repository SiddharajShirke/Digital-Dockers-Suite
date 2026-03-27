const nvidiaLLM = require('./nvidiaLLMService');
const reportDataService = require('./reportDataService');

class AIReportService {
    /**
     * Generate an AI-driven project report using NVIDIA LLM
     * @param {string} projectId 
     */
    async generateProjectReport(projectId) {
        const rawData = await reportDataService.getProjectReportData(projectId);
        
        const systemPrompt = `You are an elite Senior Project Portfolio Analyst and Scrum Master.
Analyze the provided raw JSON data for the entire project lifecycle (all sprints, tasks, and workloads).
Your goal is to generate a comprehensive, C-level technical report.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no explanation).
The JSON must follow this exact schema:

{
  "executiveSummary": "A high-level 3-4 sentence summary of project health, overall progress, and critical blockers.",
  "sprintAnalyses": [
    {
      "sprintName": "Sprint 1",
      "summary": "1-2 sentence analysis of this sprint's success/failure",
      "rating": "Excellent|Good|Fair|Poor"
    }
  ],
  "taskBreakdowns": "A 2-3 sentence summary evaluating the status distribution (todo vs done vs blocked) and identifying bottlenecks.",
  "velocityAnalysis": "Analysis of the velocity trend across sprints. Is team speeding up or slowing down?",
  "kanbanAnalysis": "Evaluation of continuous flow, WIP limits (implied by in-progress counts), and cycle time.",
  "churnAnalysis": "Estimation of scope creep based on task additions or shifting priorities.",
  "futurePredictions": "Data-driven prediction for the next 2-4 weeks. Will the project finish on time?",
  "confidenceScoring": {
    "score": 85,
    "reason": "Team velocity is stable, but high blocked task count reduces confidence."
  },
  "riskMatrix": [
    {
      "riskItem": "High workload on User X",
      "severity": "High|Medium|Low",
      "mitigation": "Reallocate 2 tasks to User Y"
    }
  ],
  "verdict": "A final 1-sentence verdict on project trajectory."
}`;

        const userMessage = `Here is the raw project data:\n\n${JSON.stringify(rawData, null, 2)}`;

        try {
            console.log(`🤖 Generating Project Report via NVIDIA LLM for project: ${projectId}`);
            const response = await nvidiaLLM.chat(systemPrompt, userMessage, {
                temperature: 0.2, // Need analytical, grounded response
                max_tokens: 3000
            });

            // Parse response
            const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const aiInsights = JSON.parse(cleanedResponse);

            return {
                ...rawData, // Keep raw data for charts on the frontend
                aiInsights
            };
        } catch (error) {
            console.error('❌ Error generating project report from LLM:', error);
            throw new Error(`AI Report Generation Failed: ${error.message}`);
        }
    }

    /**
     * Generate an AI-driven sprint report using NVIDIA LLM
     * @param {string} sprintId 
     */
    async generateSprintReport(sprintId) {
        const rawData = await reportDataService.getSprintReportData(sprintId);
        
        const systemPrompt = `You are an elite Agile Scrum Master and Technical Analyst.
Analyze the provided raw JSON data for a specific active or closed sprint.
Your goal is to generate a tactical, highly detailed sprint technical report.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no explanation).
The JSON must follow this exact schema:

{
  "executiveSummary": "A high-level 2-3 sentence summary of the sprint goal achievement, completion rate, and overall health.",
  "taskBreakdowns": "A summary of task flow, highlighting any tasks that are stuck or taking too long.",
  "burndownAnalysis": "An analysis of the sprint committed vs completed points. Did the team bite off more than they could chew?",
  "assigneeWorkloadAnalysis": "Evaluation of workload distribution. Is anyone overworked? Is anyone underutilized?",
  "futurePredictions": "What is likely to happen by the end of this sprint (or what does this mean for the next one if closed)?",
  "confidenceScoring": {
    "score": 92,
    "reason": "Short, punchy reason for this score."
  },
  "riskMatrix": [
    {
      "riskItem": "Specific risk",
      "severity": "High|Medium|Low",
      "mitigation": "Actionable advice"
    }
  ],
  "verdict": "A final 1-sentence verdict on the sprint's success."
}`;

        const userMessage = `Here is the raw sprint data:\n\n${JSON.stringify(rawData, null, 2)}`;

        try {
            console.log(`🤖 Generating Sprint Report via NVIDIA LLM for sprint: ${sprintId}`);
            const response = await nvidiaLLM.chat(systemPrompt, userMessage, {
                temperature: 0.2,
                max_tokens: 3000
            });

            // Parse response
            const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const aiInsights = JSON.parse(cleanedResponse);

            return {
                ...rawData, // Keep raw data for charts on the frontend
                aiInsights
            };
        } catch (error) {
            console.error('❌ Error generating sprint report from LLM:', error);
            throw new Error(`AI Sprint Report Generation Failed: ${error.message}`);
        }
    }
}

module.exports = new AIReportService();
