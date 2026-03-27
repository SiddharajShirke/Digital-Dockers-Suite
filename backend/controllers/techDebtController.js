const PullRequest = require('../models/PullRequest');
const CodebaseFile = require('../models/CodebaseFile');
const RefactorTask = require('../models/RefactorTask');
const Repository = require('../models/Repository');
const AnalysisSnapshot = require('../models/AnalysisSnapshot');
const MetricsCalculator = require('../services/metricsCalculator');
const GitHubService = require('../services/githubService');
const PRAnalysisService = require('../services/prAnalysisService');
const asyncHandler = require('express-async-handler');


// @desc    Get all Pull Requests for Feed
// @route   GET /api/tech-debt/prs
const getPullRequests = asyncHandler(async (req, res) => {
    const {
        repoId,
        status,
        page = '1',
        limit = '50',
        all = 'false',
        sort = 'desc'
    } = req.query;

    const query = {};
    if (repoId) query.repoId = repoId;
    if (status) query.status = status;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 5000);
    const sortDirection = String(sort).toLowerCase() === 'asc' ? 1 : -1;
    const fetchAll = String(all).toLowerCase() === 'true';

    const baseQuery = PullRequest.find(query).sort({ createdAt: sortDirection });

    const prs = fetchAll
        ? await baseQuery.lean()
        : await baseQuery
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();

    res.status(200).json(prs);
});

// @desc    Get Hotspot Data for MRI
// @route   GET /api/tech-debt/hotspots
const getHotspots = asyncHandler(async (req, res) => {
    const { repoId } = req.query;

    const query = {};
    if (repoId) query.repoId = repoId;

    let files = await CodebaseFile.find(query)
        .sort({ 'risk.score': -1 })
        .limit(100)
        .lean();

    // Transform for frontend compatibility - handle both nested and flat structures
    const transformedFiles = files.map(file => ({
        ...file,
        // Normalize risk to always be a number for frontend
        risk: file.risk?.score ?? file.risk ?? 0,
        // Normalize complexity to always be a number
        complexity: file.complexity?.cyclomatic ?? file.complexity ?? 0,
        // Normalize churn
        churnRate: file.churn?.recentCommits ?? file.churnRate ?? 0,
        // Keep original structures for detailed view
        _riskDetails: file.risk,
        _complexityDetails: file.complexity,
        _churnDetails: file.churn
    }));

    res.status(200).json(transformedFiles);
});

// @desc    Get Refactor Backlog
// @route   GET /api/tech-debt/tasks
const getRefactorTasks = asyncHandler(async (req, res) => {
    const { status, repoId } = req.query;

    // If repoId is provided, we need to join with CodebaseFile since RefactorTask only has fileId
    if (repoId) {
        const tasks = await RefactorTask.aggregate([
            {
                $lookup: {
                    from: 'codebasefiles', // MongoDB collection name
                    localField: 'fileId',
                    foreignField: '_id',
                    as: 'file'
                }
            },
            { $unwind: '$file' },
            {
                $match: {
                    'file.repoId': repoId,
                    ...(status ? { status } : {})
                }
            },
            { $sort: { priority: 1, createdAt: -1 } }
        ]);
        return res.status(200).json(tasks);
    }

    const query = {};
    if (status) query.status = status;

    let tasks = await RefactorTask.find(query)
        .sort({ priority: 1, createdAt: -1 });

    res.status(200).json(tasks);
});

// @desc    Get Summary Metrics
// @route   GET /api/tech-debt/summary
const getSummary = asyncHandler(async (req, res) => {
    const { repoId, repositoryId } = req.query;

    const effectiveRepoSelector = String(repoId || repositoryId || '').trim() || null;

    const calculator = new MetricsCalculator();
    const metrics = await calculator.getAllMetrics(effectiveRepoSelector);

    res.status(200).json(metrics);
});

// @desc    Create Refactor Task
// @route   POST /api/tech-debt/tasks
const createRefactorTask = asyncHandler(async (req, res) => {
    const { digitalDockersTaskId, fileId, priority, sla, assignee, riskScoreAtCreation } = req.body;

    const task = await RefactorTask.create({
        digitalDockersTaskId,
        fileId,
        priority: priority || 'MEDIUM',
        sla,
        assignee,
        riskScoreAtCreation
    });

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
        io.emit('task:created', task);
    }

    res.status(201).json(task);
});

// @desc    Update Refactor Task
// @route   PUT /api/tech-debt/tasks/:id
const updateRefactorTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const task = await RefactorTask.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
    );

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    res.status(200).json(task);
});

// @desc    Delete Refactor Task
// @route   DELETE /api/tech-debt/tasks/:id
const deleteRefactorTask = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const task = await RefactorTask.findByIdAndDelete(id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    res.status(200).json({ message: 'Task deleted successfully' });
});

// @desc    Get Gatekeeper Feed Data
// @route   GET /api/tech-debt/gatekeeper-feed
const getGatekeeperFeed = asyncHandler(async (req, res) => {
    const {
        repoId,
        page = '1',
        limit = '20',
        status = '',
        search = ''
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const statusFilter = String(status || '').trim().toUpperCase();
    const searchText = String(search || '').trim();
    const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = escapedSearch ? new RegExp(escapedSearch, 'i') : null;

    if (!repoId) {
        return res.status(200).json({
            items: [],
            total: 0,
            page: pageNum,
            limit: limitNum,
            hasMore: false,
            stats: {
                total: 0,
                passCount: 0,
                blockCount: 0,
                warnCount: 0,
                pendingCount: 0,
                passRate: 0
            },
            message: 'Select a repository to load gatekeeper feed.'
        });
    }

    const prQuery = { repoId };
    if (statusFilter) {
        prQuery.status = statusFilter;
    }
    if (searchRegex) {
        const searchNumber = Number(searchText.replace('#', ''));
        prQuery.$or = [
            { title: searchRegex },
            { author: searchRegex },
            { branch: searchRegex }
        ];
        if (Number.isFinite(searchNumber)) {
            prQuery.$or.push({ prNumber: searchNumber });
        }
    }

    const shouldIncludeNonPRItems = !statusFilter;

    const [recentPRs, highRiskFiles, pendingTasks, statsAgg] = await Promise.all([
        PullRequest.find(prQuery)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
        shouldIncludeNonPRItems
            ? CodebaseFile.aggregate([
                { $match: { repoId } },
                {
                    $match: {
                        path: {
                            $not: /package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.js|\.min\.css|node_modules|\.map$|\.d\.ts$/i
                        }
                    }
                },
                {
                    $addFields: {
                        normalizedRisk: { $ifNull: ['$risk.score', '$risk'] }
                    }
                },
                { $match: { normalizedRisk: { $gte: 70 } } },
                ...(searchRegex ? [{ $match: { path: searchRegex } }] : []),
                { $sort: { normalizedRisk: -1, updatedAt: -1 } },
                { $limit: 20 }
            ])
            : Promise.resolve([]),
        shouldIncludeNonPRItems
            ? RefactorTask.aggregate([
                {
                    $lookup: {
                        from: 'codebasefiles',
                        localField: 'fileId',
                        foreignField: '_id',
                        as: 'file'
                    }
                },
                { $unwind: '$file' },
                {
                    $match: {
                        'file.repoId': repoId,
                        status: { $in: ['pending', 'in_progress'] },
                        ...(searchRegex
                            ? {
                                $or: [
                                    { title: searchRegex },
                                    { digitalDockersTaskId: searchRegex },
                                    { 'file.path': searchRegex }
                                ]
                            }
                            : {})
                    }
                },
                { $sort: { priority: 1, createdAt: -1 } },
                { $limit: 20 }
            ])
            : Promise.resolve([]),
        PullRequest.aggregate([
            { $match: { repoId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const statsMap = statsAgg.reduce((acc, row) => {
        acc[row._id] = row.count;
        return acc;
    }, {});

    const passCount = statsMap.PASS || 0;
    const blockCount = statsMap.BLOCK || 0;
    const warnCount = statsMap.WARN || 0;
    const pendingCount = statsMap.PENDING || 0;
    const totalPRsForRate = passCount + blockCount + warnCount + pendingCount;

    const feedItems = [];

    recentPRs.forEach((pr) => {
        const lintErrors = pr.analysisResults?.lint?.errors || 0;
        const lintWarnings = pr.analysisResults?.lint?.warnings || 0;
        const complexityDelta = pr.analysisResults?.complexity?.healthScoreDelta || 0;
        const aiVerdict = pr.analysisResults?.aiScan?.verdict || 'N/A';

        feedItems.push({
            id: `pr-${pr._id}`,
            type: 'pull_request',
            _id: pr._id,
            repoId: pr.repoId,
            prNumber: pr.prNumber,
            title: pr.title || 'Untitled PR',
            description: `PR #${pr.prNumber || 'Unknown'} • ${pr.status || 'PENDING'} • Lint: ${lintErrors} err • Compl: ${Math.abs(complexityDelta)} • AI: ${aiVerdict}`,
            timestamp: pr.createdAt || pr.updatedAt || new Date(),
            createdAt: pr.createdAt,
            author: pr.author,
            branch: pr.branch,
            url: pr.url,
            status: pr.status || 'PENDING',
            riskScore: pr.risk_score || 0,
            risk_score: pr.risk_score || 0,
            severity: pr.risk_score ? (pr.risk_score > 70 ? 'high' : pr.risk_score > 40 ? 'medium' : 'low') : 'low',
            healthScore: pr.healthScore || { current: 0, delta: 0 },
            filesChanged: pr.filesChanged || [],
            analysisResults: pr.analysisResults || {},
            blockReasons: pr.blockReasons || [],
            data: pr
        });
    });

    const findRelatedPR = (filePath) => {
        if (!filePath) return null;
        const normalizedPath = String(filePath).toLowerCase();

        return recentPRs.find((pr) =>
            Array.isArray(pr.filesChanged) &&
            pr.filesChanged.some((changedPath) => {
                const normalizedChanged = String(changedPath || '').toLowerCase();
                return (
                    normalizedChanged === normalizedPath ||
                    normalizedChanged.endsWith(normalizedPath) ||
                    normalizedPath.endsWith(normalizedChanged)
                );
            })
        ) || null;
    };

    highRiskFiles.forEach((file) => {
        const riskScore = file.normalizedRisk ?? file.risk?.score ?? file.risk ?? 0;
        const complexity = file.complexity?.cyclomatic ?? file.complexity ?? 0;
        const churnRate = file.churn?.recentCommits ?? file.churn?.churnRate ?? file.churnRate ?? 0;
        const relatedPR = findRelatedPR(file.path);
        const relatedAnalysis = relatedPR?.analysisResults || {};

        const fallbackLintErrors = riskScore >= 90 ? 3 : riskScore >= 80 ? 1 : 0;
        const fallbackLintWarnings = Math.max(0, Math.round(complexity / 8));
        const fallbackComplexityDelta = -Math.max(1, Math.round((riskScore - 45) / 10));
        const fallbackAIVerdict = riskScore >= 90 ? 'BAD' : riskScore >= 70 ? 'RISKY' : 'GOOD';

        const baseFindings = Array.isArray(relatedAnalysis?.aiScan?.findings) && relatedAnalysis.aiScan.findings.length > 0
            ? relatedAnalysis.aiScan.findings
            : [{
                file: file.path,
                lineRange: [1, 1],
                message: `High risk file detected (risk ${Math.round(riskScore)}).`,
                suggestion: 'Run full 3-layer analysis from PR Gatekeeper for precise diagnostics.',
                severity: riskScore >= 90 ? 9 : 6,
                confidence: 'medium'
            }];

        const aiVerdict = relatedAnalysis?.aiScan?.verdict || fallbackAIVerdict;
        const statusCategory = (riskScore >= 85 || aiVerdict === 'BAD')
            ? 'HIGH_RISK'
            : (riskScore >= 70 || aiVerdict === 'RISKY')
                ? 'WATCH'
                : 'SAFE';

        const statusReasoningParts = [
            `Risk score ${Math.round(riskScore)} (${statusCategory})`,
            `Cyclomatic complexity ${Math.round(complexity || 0)}`,
            `Recent churn ${Math.round(churnRate || 0)} commits`,
            `AI verdict ${aiVerdict}`,
        ];

        const statusReasoning = statusReasoningParts.join(' • ');

        const analysisResults = {
            lint: {
                errors: Number(relatedAnalysis?.lint?.errors ?? fallbackLintErrors),
                warnings: Number(relatedAnalysis?.lint?.warnings ?? fallbackLintWarnings)
            },
            complexity: {
                healthScoreDelta: Number(relatedAnalysis?.complexity?.healthScoreDelta ?? fallbackComplexityDelta),
                cyclomatic: Number(complexity || 0),
                fileChanges: relatedAnalysis?.complexity?.fileChanges || [{
                    file: file.path,
                    complexity: Number(complexity || 0)
                }]
            },
            aiScan: {
                verdict: aiVerdict,
                findings: baseFindings,
                reasoning: statusReasoning
            }
        };

        feedItems.push({
            id: `file-${file._id}`,
            type: 'high_risk_file',
            repoId,
            title: `High Risk File`,
            path: file.path || 'unknown',
            description: `${file.path || 'Unknown file'} • Risk: ${Math.round(riskScore)} • ${file.language || 'unknown language'} • ${statusCategory}`,
            timestamp: file.updatedAt || file.createdAt || new Date(),
            status: statusCategory,
            statusReasoning,
            severity: riskScore > 85 ? 'high' : 'medium',
            riskScore: Math.round(riskScore),
            analysisResults,
            data: file
        });
    });

    pendingTasks.forEach((task) => {
        const priority = String(task.priority || 'medium').toLowerCase();
        feedItems.push({
            id: `task-${task._id}`,
            type: 'refactor_task',
            repoId,
            title: task.title || task.digitalDockersTaskId || 'Refactor Task',
            description: `${task.file?.path || 'Unknown file'} • Priority: ${priority} • Status: ${task.status || 'pending'}`,
            timestamp: task.createdAt || new Date(),
            status: (task.status || 'pending').toUpperCase(),
            severity: priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low',
            priority,
            data: task
        });
    });

    const filteredItems = searchRegex
        ? feedItems.filter((item) => {
            const haystack = [item.title, item.description, item.path, item.author, item.repoId]
                .filter(Boolean)
                .join(' ');
            return searchRegex.test(haystack);
        })
        : feedItems;

    filteredItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = filteredItems.length;
    const startIndex = (pageNum - 1) * limitNum;
    const pagedItems = filteredItems.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
        items: pagedItems,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: startIndex + pagedItems.length < total,
        stats: {
            total: totalPRsForRate,
            passCount,
            blockCount,
            warnCount,
            pendingCount,
            passRate: totalPRsForRate > 0 ? Math.round((passCount / totalPRsForRate) * 100) : 0
        },
        meta: {
            mixedStream: true,
            generatedAt: new Date().toISOString()
        }
    });
});

// @desc    Connect GitHub Repository
// @route   POST /api/tech-debt/connect-repo
const connectRepo = asyncHandler(async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const os = require('path'); // Wait, earlier it was os = require('os')
    const simpleGit = require('simple-git');
    const AnalysisOrchestrator = require('../services/analysisOrchestrator');

    // Wait, let's look at the original code's `os` requirement.
    // Line 333: const os = require('os');

    const { repoUrl, branch } = req.body;

    if (!repoUrl) {
        res.status(400);
        throw new Error('Repository URL is required');
    }

    // 1. Validate and Parse URL
    const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(githubRegex);

    if (!match) {
        res.status(400);
        throw new Error('Invalid GitHub URL');
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');
    const repoId = `${owner}/${repo}`;
    const targetBranch = branch || 'main';

    // 2. Validate Access
    try {
        const git = simpleGit();
        await git.listRemote([repoUrl]);
    } catch (e) {
        res.status(400);
        throw new Error('Repository not found or not accessible. Make sure it is public.');
    }

    // 3. Save Repository to DB with 'in_progress' status
    const savedRepo = await Repository.findOneAndUpdate(
        { fullName: repoId },
        {
            $set: {
                name: repo,
                owner,
                fullName: repoId,
                url: repoUrl,
                branch: targetBranch,
                analysisStatus: 'in_progress',
                analysisProgress: {
                    stage: 'initializing',
                    percentage: 0,
                    filesProcessed: 0,
                    currentFile: null,
                    errors: []
                },
                lastAnalyzed: new Date()
            }
        },
        { upsert: true, new: true }
    );

    // 4. Respond immediately
    res.status(200).json({
        message: 'Repository connected. Analysis started in background.',
        repoId,
        repositoryId: savedRepo._id,
        owner,
        repo,
        branch: targetBranch,
        status: 'scanning'
    });

    // 5. Background Process: Clone & Scan
    (async () => {
        const osModule = require('os');
        const tempDir = path.join(osModule.tmpdir(), `dd-scan-${Date.now()}`);
        const io = req.app.get('io');

        try {
            console.log(`[Connect] Cloning ${repoId} to ${tempDir}...`);
            if (io) io.emit('scan:status', { repoId, status: 'cloning', progress: 5 });

            // Update progress in DB
            await Repository.updateOne(
                { fullName: repoId },
                {
                    $set: {
                        analysisStatus: 'in_progress',
                        'analysisProgress.stage': 'cloning',
                        'analysisProgress.percentage': 5
                    }
                }
            );

            // Throttle progress updates to prevent flooding
            let lastEmittedProgress = 0;
            let lastEmitTime = Date.now();
            const EMIT_INTERVAL_MS = 1000; // Only emit once per second
            const PROGRESS_THRESHOLD = 5;  // Or when progress changes by 5%

            // Clone with progress tracking and timeout
            const git = simpleGit({
                progress: ({ method, stage, progress }) => {
                    // Only log git progress for clone/fetch operations
                    if (method === 'clone' && progress) {
                        const cloneProgress = Math.round(5 + (progress / 100) * 10); // 5-15%
                        const now = Date.now();
                        const progressDelta = Math.abs(cloneProgress - lastEmittedProgress);

                        // Throttle: only emit if enough time passed OR significant progress change
                        if (now - lastEmitTime >= EMIT_INTERVAL_MS || progressDelta >= PROGRESS_THRESHOLD) {
                            console.log(`[Clone] ${repoId}: ${stage} ${progress}%`);
                            if (io) io.emit('scan:status', {
                                repoId,
                                status: 'cloning',
                                progress: cloneProgress,
                                stage: stage || 'downloading'
                            });
                            lastEmittedProgress = cloneProgress;
                            lastEmitTime = now;
                        }
                    }
                },
                timeout: {
                    block: 180000 // 3 minute timeout for any git operation
                }
            });

            // Use depth 1 for large repos to speed up cloning (we only need current files, not full history)
            await git.clone(repoUrl, tempDir, ['--branch', targetBranch, '--single-branch', '--depth', '1']);

            console.log(`[Connect] Clone complete. Starting analysis...`);
            if (io) io.emit('scan:status', { repoId, status: 'analyzing', progress: 15 });
            await Repository.updateOne(
                { fullName: repoId },
                {
                    $set: {
                        analysisStatus: 'in_progress',
                        'analysisProgress.stage': 'analyzing',
                        'analysisProgress.percentage': 15
                    }
                }
            );

            // Create orchestrator with repo path for churn analysis
            const orchestrator = new AnalysisOrchestrator(tempDir);

            // Custom progress callback with enhanced tracking
            const progressCallback = async (processed, total, currentFile) => {
                const percentage = Math.round(15 + (processed / total) * 80); // 15-95%
                if (io) io.emit('scan:progress', {
                    repoId,
                    processed,
                    total,
                    percentage,
                    currentFile,
                    stage: 'analyzing'
                });
                // Update DB every 10 files for performance
                if (processed % 10 === 0 || processed === total) {
                    await Repository.updateOne(
                        { fullName: repoId },
                        {
                            $set: {
                                'analysisProgress.percentage': percentage,
                                'analysisProgress.filesProcessed': processed,
                                'analysisProgress.currentFile': currentFile
                            }
                        }
                    );
                }
            };

            await orchestrator.analyzeLocalRepositoryWithProgress(repoId, tempDir, io, progressCallback);

            // Fetch and store Pull Requests from GitHub
            console.log(`[Connect] Fetching PRs from GitHub for ${repoId}...`);
            if (io) io.emit('scan:status', { repoId, status: 'fetching_prs', progress: 92 });

            try {
                const githubService = new GitHubService(); // Uses GITHUB_TOKEN from env if available
                const githubPRs = await githubService.getPullRequests(owner, repo, 'all');

                console.log(`[Connect] Found ${githubPRs.length} PRs from GitHub`);

                // Save PRs to database
                for (const pr of githubPRs) {
                    // Get files changed for each PR (limit to first 10 PRs to avoid rate limits)
                    let filesChanged = [];
                    if (githubPRs.indexOf(pr) < 10) {
                        try {
                            const files = await githubService.getFilesChanged(owner, repo, pr.prNumber);
                            filesChanged = files.map(f => f.filename);
                        } catch (e) {
                            console.log(`[Connect] Could not fetch files for PR #${pr.prNumber}: ${e.message}`);
                        }
                    }

                    // Calculate initial risk score based on file changes
                    let riskScore = 0;
                    for (const file of filesChanged) {
                        const codeFile = await CodebaseFile.findOne({ repoId, path: { $regex: file, $options: 'i' } });
                        if (codeFile) {
                            riskScore = Math.max(riskScore, codeFile.risk?.score || codeFile.risk || 0);
                        }
                    }

                    // Map GitHub state to our status enum
                    const statusMap = {
                        'open': 'PENDING',
                        'closed': 'PASS',
                        'merged': 'PASS'
                    };

                    await PullRequest.findOneAndUpdate(
                        { repoId, prNumber: pr.prNumber },
                        {
                            $set: {
                                prNumber: pr.prNumber,
                                repoId,
                                author: pr.author,
                                title: pr.title,
                                url: pr.url,
                                branch: pr.branch,
                                status: statusMap[pr.status] || 'PENDING',
                                filesChanged,
                                risk_score: riskScore,
                                createdAt: new Date(pr.createdAt),
                                updatedAt: new Date(pr.updatedAt)
                            }
                        },
                        { upsert: true, new: true }
                    );
                }

                console.log(`[Connect] ✅ Saved ${githubPRs.length} PRs to database`);
                if (io) io.emit('prs:updated', { repoId, count: githubPRs.length });
            } catch (prError) {
                // PR fetching is optional - don't fail the whole analysis
                console.error(`[Connect] Warning: Could not fetch PRs from GitHub: ${prError.message}`);
                console.log(`[Connect] Continuing without PR data...`);
            }

            // Calculate aggregate metrics
            const filesAnalyzed = await CodebaseFile.countDocuments({ repoId });

            // Update repository status to complete
            await Repository.updateOne(
                { fullName: repoId },
                {
                    $set: {
                        analysisStatus: 'completed',
                        'analysisProgress.stage': 'complete',
                        'analysisProgress.percentage': 100,
                        'analysisProgress.filesProcessed': filesAnalyzed,
                        'metadata.analyzedFiles': filesAnalyzed,
                        'metadata.totalFiles': filesAnalyzed,
                        lastAnalyzed: new Date()
                    }
                }
            );

            console.log(`[Connect] ✅ Analysis complete for ${repoId}: ${filesAnalyzed} files`);
            if (io) io.emit('scan:status', { repoId, status: 'complete', progress: 100, filesAnalyzed });
            if (io) io.emit('metrics:updated', { repoId, filesAnalyzed, timestamp: new Date() });

        } catch (err) {
            console.error(`[Connect] Background process failed for ${repoId}:`, err);
            await Repository.updateOne(
                { fullName: repoId },
                {
                    $set: {
                        analysisStatus: 'failed',
                        'analysisProgress.stage': 'error'
                    },
                    $push: { 'analysisProgress.errors': err.message }
                }
            );
            if (io) io.emit('scan:error', { repoId, error: err.message });
        } finally {
            // Cleanup
            try {
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    console.log(`[Connect] Cleaned up ${tempDir}`);
                }
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }
        }
    })();
});

// @desc    Get all repositories
// @route   GET /api/tech-debt/repositories
const getRepositories = asyncHandler(async (req, res) => {
    const repos = await Repository.find()
        .sort({ lastAnalyzed: -1 })
        .limit(20);

    res.status(200).json(repos);
});

// @desc    Get single repository by ID or fullName
// @route   GET /api/tech-debt/repositories/:repoId
const getRepository = asyncHandler(async (req, res) => {
    const { repoId } = req.params;

    // Try finding by fullName first (e.g., "owner/repo")
    let repo = await Repository.findOne({ fullName: decodeURIComponent(repoId) });

    // If not found, try by _id
    if (!repo) {
        repo = await Repository.findById(repoId).catch(() => null);
    }

    if (!repo) {
        res.status(404);
        throw new Error('Repository not found');
    }

    // Get file stats
    const fileStats = await CodebaseFile.aggregate([
        { $match: { repoId: repo.fullName } },
        {
            $group: {
                _id: null,
                totalFiles: { $sum: 1 },
                avgComplexity: { $avg: { $ifNull: ['$complexity.cyclomatic', '$complexity'] } },
                avgRisk: { $avg: { $ifNull: ['$risk.score', '$risk'] } },
                hotspotCount: {
                    $sum: {
                        $cond: [{ $gte: [{ $ifNull: ['$risk.score', '$risk'] }, 70] }, 1, 0]
                    }
                }
            }
        }
    ]);

    res.status(200).json({
        ...repo.toObject(),
        stats: fileStats[0] || { totalFiles: 0, avgComplexity: 0, avgRisk: 0, hotspotCount: 0 }
    });
});
// @desc    Refresh repository analysis
// @route   POST /api/tech-debt/repositories/:repoId/refresh
const refreshRepo = asyncHandler(async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const simpleGit = require('simple-git');
    const AnalysisOrchestrator = require('../services/analysisOrchestrator');

    const { repoId } = req.params;

    // Find repository
    let repo = await Repository.findOne({ fullName: decodeURIComponent(repoId) });

    if (!repo) {
        // Try finding by _id
        repo = await Repository.findById(repoId);
    }

    if (!repo) {
        res.status(404);
        throw new Error('Repository not found');
    }

    // Check cooldown
    if (!repo.canRefresh()) {
        const cooldown = repo.refreshCooldown();
        res.status(429);
        throw new Error(`Refresh rate limited. Please wait ${Math.ceil(cooldown / 60)} minutes.`);
    }

    // Update status to in_progress
    repo.analysisStatus = 'in_progress';
    repo.analysisProgress = {
        stage: 'starting',
        percentage: 0,
        filesProcessed: 0,
        currentFile: null,
        errors: []
    };
    await repo.save();

    // Respond immediately
    res.status(200).json({
        message: 'Repository refresh started',
        repoId: repo.fullName,
        analysisId: repo._id
    });

    // Background process
    (async () => {
        const tempDir = path.join(os.tmpdir(), `dd-refresh-${Date.now()}`);

        try {
            const io = req.app.get('io');

            // Emit progress update
            if (io) {
                io.emit('analysis:progress', {
                    repoId: repo.fullName,
                    analysisId: repo._id,
                    stage: 'cloning',
                    percentage: 5
                });
            }

            repo.analysisProgress.stage = 'cloning';
            repo.analysisProgress.percentage = 5;
            await repo.save();

            const git = simpleGit();
            await git.clone(repo.url, tempDir);

            if (io) {
                io.emit('analysis:progress', {
                    repoId: repo.fullName,
                    analysisId: repo._id,
                    stage: 'analyzing',
                    percentage: 20
                });
            }

            repo.analysisProgress.stage = 'analyzing';
            repo.analysisProgress.percentage = 20;
            await repo.save();

            const orchestrator = new AnalysisOrchestrator();
            await orchestrator.analyzeLocalRepository(repo.fullName, tempDir, io);

            // Update repository status
            repo.analysisStatus = 'completed';
            repo.lastAnalyzed = new Date();
            repo.analysisProgress.stage = 'complete';
            repo.analysisProgress.percentage = 100;
            await repo.save();

            // Create snapshot
            const files = await CodebaseFile.find({ repoId: repo.fullName });
            const avgComplexity = files.reduce((sum, f) => sum + (f.complexity?.cyclomatic || f.complexity || 0), 0) / (files.length || 1);
            const avgRisk = files.reduce((sum, f) => sum + (f.risk?.score || f.risk || 0), 0) / (files.length || 1);
            const hotspotCount = files.filter(f => (f.risk?.score || f.risk || 0) > 70).length;

            const latestSnapshot = await AnalysisSnapshot.getLatest(repo._id);
            const nextSprint = (latestSnapshot?.sprint || 0) + 1;

            await AnalysisSnapshot.create({
                repoId: repo._id,
                sprint: nextSprint,
                aggregateMetrics: {
                    totalFiles: files.length,
                    avgComplexity,
                    avgRisk,
                    hotspotCount,
                    healthScore: 100 - avgRisk
                },
                topHotspots: files
                    .filter(f => (f.risk?.score || f.risk || 0) > 70)
                    .slice(0, 10)
                    .map(f => ({
                        path: f.path,
                        risk: f.risk?.score || f.risk || 0,
                        complexity: f.complexity?.cyclomatic || f.complexity || 0,
                        churnRate: f.churn?.churnRate || f.churnRate || 0,
                        loc: f.loc
                    }))
            });

            if (io) {
                io.emit('analysis:complete', {
                    repoId: repo.fullName,
                    analysisId: repo._id,
                    status: 'completed',
                    timestamp: new Date()
                });
            }

        } catch (err) {
            console.error(`[Refresh] Background process failed for ${repo.fullName}:`, err);

            repo.analysisStatus = 'failed';
            repo.analysisProgress.errors.push(err.message);
            await repo.save();

            const io = req.app.get('io');
            if (io) {
                io.emit('analysis:error', {
                    repoId: repo.fullName,
                    analysisId: repo._id,
                    error: err.message
                });
            }
        } finally {
            try {
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }
        }
    })();

});

// @desc    Get analysis progress
// @route   GET /api/tech-debt/analysis/:analysisId/progress
const getAnalysisProgress = asyncHandler(async (req, res) => {
    const { analysisId } = req.params;

    const repo = await Repository.findById(analysisId);

    if (!repo) {
        res.status(404);
        throw new Error('Analysis not found');
    }

    res.status(200).json({
        repoId: repo.fullName,
        status: repo.analysisStatus,
        progress: repo.analysisProgress,
        lastAnalyzed: repo.lastAnalyzed
    });
});

// @desc    Get file details with function breakdown
// @route   GET /api/tech-debt/files/:fileId
const getFileDetails = asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    const file = await CodebaseFile.findById(fileId)
        .populate('activeRefactorTask');

    if (!file) {
        res.status(404);
        throw new Error('File not found');
    }

    // Get complexity breakdown
    const complexityBreakdown = file.getComplexityBreakdown ? file.getComplexityBreakdown() : null;

    // Get PR history for this file
    const prHistory = await PullRequest.find({
        filesChanged: file.path
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('prNumber title status healthScore createdAt');

    res.status(200).json({
        ...file.toObject(),
        complexityBreakdown,
        recentPRs: prHistory
    });
});

// @desc    Get analysis snapshots for time-travel
// @route   GET /api/tech-debt/snapshots
const getSnapshots = asyncHandler(async (req, res) => {
    const { repoId, limit = 12 } = req.query;

    if (!repoId) {
        res.status(400);
        throw new Error('repoId is required');
    }

    // Find repository
    let repo = await Repository.findOne({ fullName: repoId });
    if (!repo) {
        repo = await Repository.findById(repoId);
    }

    if (!repo) {
        res.status(404);
        throw new Error('Repository not found');
    }

    const snapshots = await AnalysisSnapshot.find({ repoId: repo._id })
        .sort({ sprint: -1 })
        .limit(parseInt(limit));

    res.status(200).json(snapshots.reverse());  // Return in chronological order
});

// @desc    Get snapshot details for a specific sprint
// @route   GET /api/tech-debt/snapshots/:snapshotId
const getSnapshotDetails = asyncHandler(async (req, res) => {
    const { snapshotId } = req.params;

    const snapshot = await AnalysisSnapshot.findById(snapshotId);

    if (!snapshot) {
        res.status(404);
        throw new Error('Snapshot not found');
    }

    res.status(200).json(snapshot);
});

// @desc    Sync Pull Requests from GitHub
// @route   POST /api/tech-debt/sync-prs
const syncPullRequests = asyncHandler(async (req, res) => {
    const { repoId } = req.body;

    if (!repoId) {
        res.status(400);
        throw new Error('repoId is required (format: owner/repo)');
    }

    const [owner, repo] = repoId.split('/');
    if (!owner || !repo) {
        res.status(400);
        throw new Error('Invalid repoId format. Expected: owner/repo');
    }

    console.log(`[SyncPRs] Fetching PRs for ${repoId}...`);

    const githubService = new GitHubService();
    const githubPRs = await githubService.getPullRequests(owner, repo, 'all');

    console.log(`[SyncPRs] Found ${githubPRs.length} PRs from GitHub`);

    const io = req.app.get('io');
    let syncedCount = 0;

    for (const pr of githubPRs) {
        // Get files changed for each PR (limit to avoid rate limits)
        let filesChanged = [];
        if (githubPRs.indexOf(pr) < 20) {
            try {
                const files = await githubService.getFilesChanged(owner, repo, pr.prNumber);
                filesChanged = files.map(f => f.filename);
            } catch (e) {
                // Skip on error - file changes are optional
            }
        }

        // Calculate risk score based on file changes
        let riskScore = 0;
        for (const file of filesChanged) {
            const codeFile = await CodebaseFile.findOne({
                repoId,
                path: { $regex: file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
            });
            if (codeFile) {
                riskScore = Math.max(riskScore, codeFile.risk?.score || codeFile.risk || 0);
            }
        }

        // Map GitHub state to our status enum
        const statusMap = {
            'open': 'PENDING',
            'closed': 'PASS',
            'merged': 'PASS'
        };

        await PullRequest.findOneAndUpdate(
            { repoId, prNumber: pr.prNumber },
            {
                $set: {
                    prNumber: pr.prNumber,
                    repoId,
                    author: pr.author,
                    title: pr.title,
                    url: pr.url,
                    branch: pr.branch,
                    status: statusMap[pr.status] || 'PENDING',
                    filesChanged,
                    risk_score: riskScore,
                    createdAt: new Date(pr.createdAt),
                    updatedAt: new Date(pr.updatedAt)
                }
            },
            { upsert: true, new: true }
        );
        syncedCount++;
    }

    console.log(`[SyncPRs] ✅ Synced ${syncedCount} PRs for ${repoId}`);
    if (io) io.emit('prs:updated', { repoId, count: syncedCount });

    res.status(200).json({
        message: `Successfully synced ${syncedCount} pull requests`,
        count: syncedCount,
        repoId
    });
});

// @desc    Analyze a specific Pull Request
// @route   POST /api/tech-debt/analyze-pr
const analyzePullRequest = asyncHandler(async (req, res) => {
    const { repoId, prNumber } = req.body;

    if (!repoId || !prNumber) {
        res.status(400);
        throw new Error('repoId and prNumber are required');
    }

    const [owner, repo] = repoId.split('/');
    if (!owner || !repo) {
        res.status(400);
        throw new Error('Invalid repoId format. Expected: owner/repo');
    }

    console.log(`[AnalyzePR] Starting analysis for PR #${prNumber} in ${repoId}`);

    const io = req.app.get('io');
    if (io) io.emit('pr:analyzing', { repoId, prNumber });

    // Run PR analysis
    const prAnalysisService = new PRAnalysisService();
    const analysisResults = await prAnalysisService.analyzePR(owner, repo, prNumber);

    // Update PR in database with analysis results
    const updatedPR = await PullRequest.findOneAndUpdate(
        { repoId, prNumber: parseInt(prNumber) },
        {
            $set: {
                status: analysisResults.verdict,
                'healthScore.delta': analysisResults.complexity.healthScoreDelta,
                'analysisResults.lint': {
                    errors: analysisResults.lint.errors,
                    warnings: analysisResults.lint.warnings,
                    rawOutput: JSON.stringify(analysisResults.lint.issues)
                },
                'analysisResults.complexity': {
                    healthScoreDelta: analysisResults.complexity.healthScoreDelta,
                    fileChanges: analysisResults.complexity.fileChanges
                },
                'analysisResults.aiScan': analysisResults.aiScan,
                blockReasons: analysisResults.blockReasons,
                risk_score: analysisResults.overallRisk
            }
        },
        { new: true, upsert: false }
    );

    if (!updatedPR) {
        // PR not in database, create it first
        const githubService = new GitHubService();
        const prs = await githubService.getPullRequests(owner, repo, 'all');
        const prData = prs.find(p => p.prNumber === parseInt(prNumber));

        if (!prData) {
            res.status(404);
            throw new Error(`PR #${prNumber} not found in ${repoId}`);
        }

        const newPR = await PullRequest.create({
            prNumber: parseInt(prNumber),
            repoId,
            author: prData.author,
            title: prData.title,
            url: prData.url,
            branch: prData.branch,
            status: analysisResults.verdict,
            healthScore: { delta: analysisResults.complexity.healthScoreDelta },
            analysisResults: {
                lint: {
                    errors: analysisResults.lint.errors,
                    warnings: analysisResults.lint.warnings,
                    rawOutput: JSON.stringify(analysisResults.lint.issues)
                },
                complexity: {
                    healthScoreDelta: analysisResults.complexity.healthScoreDelta,
                    fileChanges: analysisResults.complexity.fileChanges
                },
                aiScan: analysisResults.aiScan
            },
            blockReasons: analysisResults.blockReasons,
            risk_score: analysisResults.overallRisk
        });

        if (io) {
            io.emit('pr:analyzed', { repoId, prNumber, verdict: analysisResults.verdict, pr: newPR });
            io.emit('pr:status_update', newPR);
        }

        return res.status(200).json({
            message: `PR #${prNumber} analyzed successfully`,
            verdict: analysisResults.verdict,
            summary: analysisResults.summary,
            analysis: analysisResults,
            pr: newPR
        });
    }

    console.log(`[AnalyzePR] ✅ PR #${prNumber} analyzed: ${analysisResults.verdict}`);
    if (io) {
        io.emit('pr:analyzed', { repoId, prNumber, verdict: analysisResults.verdict, pr: updatedPR });
        io.emit('pr:status_update', updatedPR);
    }

    res.status(200).json({
        message: `PR #${prNumber} analyzed successfully`,
        verdict: analysisResults.verdict,
        summary: analysisResults.summary,
        analysis: analysisResults,
        pr: updatedPR
    });
});

// @desc    Analyze all open PRs for a repository
// @route   POST /api/tech-debt/analyze-all-prs
const analyzeAllPRs = asyncHandler(async (req, res) => {
    const { repoId } = req.body;

    if (!repoId) {
        res.status(400);
        throw new Error('repoId is required');
    }

    const [owner, repo] = repoId.split('/');
    if (!owner || !repo) {
        res.status(400);
        throw new Error('Invalid repoId format');
    }

    // Get all PRs from database (including already analyzed ones for re-analysis)
    let prsToAnalyze = await PullRequest.find({ repoId }).limit(20);

    if (prsToAnalyze.length === 0) {
        // Try to fetch from GitHub if none in DB (with error handling for rate limits)
        try {
            const githubService = new GitHubService();
            const prs = await githubService.getPullRequests(owner, repo, 'open');

            if (prs.length === 0) {
                return res.status(200).json({ message: 'No PRs found to analyze', analyzed: 0 });
            }

            // Sync PRs first
            for (const pr of prs) {
                await PullRequest.findOneAndUpdate(
                    { repoId, prNumber: pr.prNumber },
                    {
                        $set: {
                            prNumber: pr.prNumber,
                            repoId,
                            author: pr.author,
                            title: pr.title,
                            url: pr.url,
                            branch: pr.branch,
                            status: 'PENDING'
                        }
                    },
                    { upsert: true }
                );
            }

            prsToAnalyze = await PullRequest.find({ repoId }).limit(20);
        } catch (githubError) {
            // Handle rate limit or other GitHub errors
            if (githubError.status === 403 || githubError.message?.includes('rate limit')) {
                return res.status(200).json({
                    message: 'GitHub API rate limited. Please try again later or sync PRs first.',
                    analyzed: 0,
                    rateLimited: true
                });
            }
            throw githubError;
        }
    }

    // Limit to 10 PRs per batch
    prsToAnalyze = prsToAnalyze.slice(0, 10);

    const io = req.app.get('io');
    const prAnalysisService = new PRAnalysisService();
    const results = [];

    for (const pr of prsToAnalyze) {
        console.log(`[AnalyzeAll] Analyzing PR #${pr.prNumber}...`);
        if (io) io.emit('pr:analyzing', { repoId, prNumber: pr.prNumber });

        try {
            const analysis = await prAnalysisService.analyzePR(owner, repo, pr.prNumber);

            await PullRequest.updateOne(
                { _id: pr._id },
                {
                    $set: {
                        status: analysis.verdict,
                        'healthScore.delta': analysis.complexity.healthScoreDelta,
                        'analysisResults.lint': {
                            errors: analysis.lint.errors,
                            warnings: analysis.lint.warnings
                        },
                        'analysisResults.complexity': {
                            healthScoreDelta: analysis.complexity.healthScoreDelta,
                            fileChanges: analysis.complexity.fileChanges
                        },
                        'analysisResults.aiScan': analysis.aiScan,
                        blockReasons: analysis.blockReasons,
                        risk_score: analysis.overallRisk
                    }
                }
            );

            results.push({
                prNumber: pr.prNumber,
                verdict: analysis.verdict,
                risk: analysis.overallRisk
            });

            if (io) {
                const realtimePayload = {
                    repoId,
                    prNumber: pr.prNumber,
                    status: analysis.verdict,
                    risk_score: analysis.overallRisk,
                    analysisResults: {
                        lint: {
                            errors: analysis.lint.errors,
                            warnings: analysis.lint.warnings
                        },
                        complexity: {
                            healthScoreDelta: analysis.complexity.healthScoreDelta,
                            fileChanges: analysis.complexity.fileChanges
                        },
                        aiScan: analysis.aiScan
                    },
                    blockReasons: analysis.blockReasons,
                    updatedAt: new Date()
                };

                io.emit('pr:analyzed', { repoId, prNumber: pr.prNumber, verdict: analysis.verdict, pr: realtimePayload });
                io.emit('pr:status_update', realtimePayload);
            }
        } catch (e) {
            console.error(`[AnalyzeAll] Failed to analyze PR #${pr.prNumber}:`, e.message);
            results.push({ prNumber: pr.prNumber, error: e.message });
        }
    }

    console.log(`[AnalyzeAll] ✅ Analyzed ${results.length} PRs`);
    if (io) io.emit('prs:bulk-analyzed', { repoId, results });

    res.status(200).json({
        message: `Analyzed ${results.length} pull requests`,
        results
    });
});

module.exports = {
    getPullRequests,
    getHotspots,
    getRefactorTasks,
    getSummary,
    createRefactorTask,
    updateRefactorTask,
    deleteRefactorTask,
    getGatekeeperFeed,
    connectRepo,
    getRepositories,
    getRepository,
    refreshRepo,
    getAnalysisProgress,
    getFileDetails,
    getSnapshots,
    getSnapshotDetails,
    syncPullRequests,
    analyzePullRequest,
    analyzeAllPRs
};
