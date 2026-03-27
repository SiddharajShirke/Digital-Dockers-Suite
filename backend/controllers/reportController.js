const asyncHandler = require('express-async-handler');
const Report = require('../models/Report');
const aiReportService = require('../services/aiReportService');
const reportExportService = require('../services/reportExportService');
const reportDataService = require('../services/reportDataService');

// @desc    Get Project Metrics Data directly
// @route   GET /api/reports/data/project/:projectId
// @access  Private
const getProjectMetrics = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const reportData = await reportDataService.getProjectReportData(projectId);
    res.status(200).json(reportData);
});

// @desc    Get Sprint Metrics Data directly
// @route   GET /api/reports/data/sprint/:sprintId
// @access  Private
const getSprintMetrics = asyncHandler(async (req, res) => {
    const { sprintId } = req.params;
    const reportData = await reportDataService.getSprintReportData(sprintId);
    res.status(200).json(reportData);
});

// @desc    Generate Project Report
// @route   POST /api/reports/generate/project/:projectId
// @access  Private
const generateProjectReport = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const reportData = await aiReportService.generateProjectReport(projectId);
    res.status(200).json(reportData);
});

// @desc    Generate Sprint Report
// @route   POST /api/reports/generate/sprint/:sprintId
// @access  Private
const generateSprintReport = asyncHandler(async (req, res) => {
    const { sprintId } = req.params;
    const reportData = await aiReportService.generateSprintReport(sprintId);
    res.status(200).json(reportData);
});

// @desc    Export Report
// @route   POST /api/reports/export
// @access  Private
const exportReport = asyncHandler(async (req, res) => {
    const { reportData, format } = req.body;
    
    if (!reportData || !format) {
        res.status(400);
        throw new Error('Please provide reportData and format (pdf, docx, html)');
    }

    try {
        if (format === 'pdf') {
            const pdfBuffer = await reportExportService.exportToPDF(reportData);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="report_${Date.now()}.pdf"`);
            return res.send(pdfBuffer);
        } else if (format === 'docx') {
            const docxBuffer = await reportExportService.exportToDOCX(reportData);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="report_${Date.now()}.docx"`);
            return res.send(docxBuffer);
        } else if (format === 'html') {
            const htmlString = reportExportService.exportToHTML(reportData);
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="report_${Date.now()}.html"`);
            return res.send(htmlString);
        } else {
            res.status(400);
            throw new Error('Unsupported format. Use pdf, docx, or html');
        }
    } catch (error) {
        console.error('Export Error:', error);
        res.status(500);
        throw new Error('Failed to export report');
    }
});

// @desc    Generate Legacy Report
// @route   POST /api/reports/generate
// @access  Private
const generateReport = asyncHandler(async (req, res) => {
    // Legacy support
    const { title, reportType, dataSource } = req.body;

    const report = await Report.create({
        title,
        generatedBy: req.user._id,
        reportType,
        dataSource,
        status: 'completed',
        insights: {
            summary: "AI generated summary based on data",
            keyMetrics: [],
            recommendations: ["Optimize workflow", "Increase budget"],
            risks: ["Low engagement"]
        }
    });

    res.status(201).json(report);
});

// @desc    Get reports
// @route   GET /api/reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
    const reports = await Report.find({ generatedBy: req.user._id }).sort('-createdAt');
    res.status(200).json(reports);
});

module.exports = {
    getProjectMetrics,
    getSprintMetrics,
    generateProjectReport,
    generateSprintReport,
    exportReport,
    generateReport,
    getReports
};
