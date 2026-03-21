const { createQueue } = require('../../config/queue.config');
const PullRequest = require('../../models/PullRequest');
const CodebaseFile = require('../../models/CodebaseFile');
const staticService = require('../analysis/staticService');
const complexityService = require('../analysis/complexityService');
const ticketAlignmentService = require('../analysis/ticketAlignmentService');
const llmScanService = require('../analysis/llmScanService');

// Create queue (automatically uses Redis or mock based on environment)
const analysisQueue = createQueue('pr-analysis');

// Process Jobs
analysisQueue.process(async (job) => {
    const { prId, files, repoId, author, ticketId } = job.data;
    console.log(`[Queue] Processing PR Analysis for PR #${prId}`);

    // Update PR to 'processing' (optional, or rely on logic)

    // 1. Fetch PR details from DB
    const pr = await PullRequest.findOne({ prNumber: prId, repoId: repoId });
    if (!pr) {
        throw new Error(`PR ${prId} not found in DB`);
    }

    try {
        // --- Layer 1: Static Analysis ---
        const lintResults = await staticService.analyze(files);
        pr.analysisResults.lint = {
            errors: lintResults.errorCount,
            warnings: lintResults.warningCount,
            rawOutput: lintResults.output
        };
        // Emit Socket Event? (via global io if available, or post-process)

        // --- Layer 2: Complexity Ratchet ---
        const complexityResults = await complexityService.analyze(files);
        pr.analysisResults.complexity = {
            healthScoreDelta: complexityResults.delta,
            fileChanges: complexityResults.fileChanges
        };

        // --- Layer 3: Ticket Alignment ---
        const alignmentResults = await ticketAlignmentService.checkAlignment(files, ticketId);
        pr.analysisResults.ticketAlignment = alignmentResults;

        // --- Layer 4: LLM Scan ---
        const llmResults = await llmScanService.scan(files);
        pr.analysisResults.aiScan = llmResults;

        // --- Final Verdict Calculation ---
        let status = 'PASS';
        const reasons = [];

        if (pr.analysisResults.lint.errors > 0) {
            status = 'BLOCK';
            reasons.push('Static Analysis Errors');
        }
        if (pr.analysisResults.complexity.healthScoreDelta < 0) {
            status = 'BLOCK';
            reasons.push('Complexity increased (Health Score drop)');
        }
        if (pr.analysisResults.aiScan.verdict === 'BAD') {
            status = 'BLOCK';
            reasons.push('AI Quality Scan Rejected');
        }
        if (pr.analysisResults.aiScan.findings.some(f => f.severity >= 4)) {
            status = 'BLOCK';
            reasons.push('Critical Security/Correctness Issues');
        }

        // Save Results
        pr.status = status;
        pr.blockReasons = reasons;
        pr.analysisResults.aiScan.verdict = llmResults.verdict; // Ensure verdict saved

        await pr.save();

        console.log(`[Queue] Analysis Complete for PR #${prId}: ${status}`);

        // Notify via Websocket (Using the globally exposed IO if possible, or a pub/sub)
        // Here we just log, the Controller/Stream will pick it up via polling or we implement a redis pubsub for io.

        return { status, prId };

    } catch (error) {
        console.error(`[Queue] Analysis Failed for PR #${prId}`, error);
        pr.status = 'PENDING'; // Or ERROR
        await pr.save();
        throw error;
    }
});

module.exports = {
    addJob: (data) => analysisQueue.add(data)
};
