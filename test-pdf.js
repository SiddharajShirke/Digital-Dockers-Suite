// test script
const exportService = require('./backend/services/reportExportService');

const dummyData = {
    reportType: 'PROJECT',
    project: { name: 'Test Project' },
    sprint: { name: 'Test Sprint' },
    metrics: {
        totalTasks: 10,
        statusDistribution: { todo: 2, in_progress: 3, done: 5 }
    },
    aiInsights: {
        executiveSummary: 'Test summary',
        taskBreakdowns: 'Breakdown',
        velocityAnalysis: 'Velocity',
        burndownAnalysis: 'Burndown',
        futurePredictions: 'Future',
        riskMatrix: [{ severity: 'High', riskItem: 'Test', mitigation: 'Test' }],
        verdict: 'Good',
        confidenceScoring: { score: 90, reason: 'Test' }
    }
};

async function run() {
    try {
        console.log('Generating PDF...');
        const pdf = await exportService.exportToPDF(dummyData);
        console.log('PDF generated successfully, length:', pdf.length);
    } catch (err) {
        console.error('PDF Generation Error:', err);
    }
}

run();
