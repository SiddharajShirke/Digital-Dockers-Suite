const PullRequest = require('../models/PullRequest');
const CodebaseFile = require('../models/CodebaseFile');
const RefactorTask = require('../models/RefactorTask');
const Repository = require('../models/Repository');
const AnalysisSnapshot = require('../models/AnalysisSnapshot');
const User = require('../models/User');
const MetricsCalculator = require('../services/metricsCalculator');
const GitHubService = require('../services/githubService');
const PRAnalysisService = require('../services/prAnalysisService');
const llmScanService = require('../services/analysis/llmScanService');
const nvidiaLLMService = require('../services/nvidiaLLMService');
const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');

const GATEKEEPER_SCORE_WEIGHTS = {
    syntax: 0.30,
    maintainability: 0.30,
    semantic: 0.40
};

const FILE_INSIGHT_TTL_MS = Number(process.env.GATEKEEPER_FILE_AI_TTL_MS || (10 * 60 * 1000));
const FILE_INSIGHT_LIMIT = Math.max(1, Number(process.env.GATEKEEPER_FILE_AI_LIMIT || 3));
const fileInsightCache = new Map();

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const normalizeAiCategoryPercent = (value, fallback = 60) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric <= 5) return clampPercent(numeric * 20);
    return clampPercent(numeric);
};

const semanticVerdictToScore = (verdict) => {
    const normalized = String(verdict || '').toUpperCase();
    if (normalized === 'GOOD') return 85;
    if (normalized === 'RISKY') return 60;
    if (normalized === 'BAD') return 30;
    return 55;
};

const calculateGatekeeperScore = ({
    lintErrors = 0,
    lintWarnings = 0,
    complexityDelta = 0,
    aiVerdict = 'PENDING',
    aiCategories = {}
} = {}) => {
    const syntaxScore = clampPercent(100 - (Number(lintErrors) * 12) - (Number(lintWarnings) * 2));

    const maintainabilityPenalty =
        Math.max(0, -Number(complexityDelta || 0)) * 4 +
        Math.max(0, Number(lintWarnings || 0) - 2) * 1.5;
    const maintainabilityScore = clampPercent(100 - maintainabilityPenalty);

    const semanticByCategories = clampPercent((
        normalizeAiCategoryPercent(aiCategories.security, 65) +
        normalizeAiCategoryPercent(aiCategories.correctness, 65) +
        normalizeAiCategoryPercent(aiCategories.maintainability, 65) +
        normalizeAiCategoryPercent(aiCategories.performance, 60) +
        normalizeAiCategoryPercent(aiCategories.testing, 55)
    ) / 5);

    const semanticVerdictScore = semanticVerdictToScore(aiVerdict);
    const semanticScore = clampPercent((semanticByCategories * 0.7) + (semanticVerdictScore * 0.3));

    const overall = clampPercent(
        (syntaxScore * GATEKEEPER_SCORE_WEIGHTS.syntax) +
        (maintainabilityScore * GATEKEEPER_SCORE_WEIGHTS.maintainability) +
        (semanticScore * GATEKEEPER_SCORE_WEIGHTS.semantic)
    );

    return {
        overall,
        layers: {
            syntax: syntaxScore,
            maintainability: maintainabilityScore,
            semantic: semanticScore
        },
        weights: {
            syntax: Math.round(GATEKEEPER_SCORE_WEIGHTS.syntax * 100),
            maintainability: Math.round(GATEKEEPER_SCORE_WEIGHTS.maintainability * 100),
            semantic: Math.round(GATEKEEPER_SCORE_WEIGHTS.semantic * 100)
        }
    };
};

const toSignedValue = (value) => {
    const numeric = Number(value) || 0;
    return `${numeric >= 0 ? '+' : ''}${Math.round(numeric)}`;
};

const getGatekeeperBand = (score) => {
    const normalized = clampPercent(score);
    if (normalized >= 85) {
        return { key: 'elite', label: 'Elite Stability', tone: 'success', accent: 'emerald' };
    }
    if (normalized >= 70) {
        return { key: 'stable', label: 'Stable', tone: 'success', accent: 'teal' };
    }
    if (normalized >= 55) {
        return { key: 'watch', label: 'Needs Watch', tone: 'warning', accent: 'amber' };
    }
    return { key: 'critical', label: 'Critical Risk', tone: 'danger', accent: 'rose' };
};

const getStatusLabel = (status) => {
    const normalized = String(status || 'PENDING').toUpperCase();
    if (normalized === 'PASS') return 'Merge Ready';
    if (normalized === 'BLOCK') return 'Blocked';
    if (normalized === 'WARN') return 'Review Required';
    return 'Pending Analysis';
};

const getSemanticLabel = (verdict) => {
    const normalized = String(verdict || '').toUpperCase();
    if (normalized === 'GOOD') return 'Semantic confidence is strong';
    if (normalized === 'RISKY') return 'Semantic review flagged possible regressions';
    if (normalized === 'BAD') return 'Semantic review found critical logic risk';
    return 'Semantic review pending';
};

const buildGatekeeperNarrative = ({
    status = 'PENDING',
    score = 0,
    lintErrors = 0,
    lintWarnings = 0,
    complexityDelta = 0,
    aiVerdict = 'PENDING',
    blockReasons = []
} = {}) => {
    const normalizedStatus = String(status || 'PENDING').toUpperCase();
    const band = getGatekeeperBand(score);
    const lintLabel = `${Number(lintErrors) || 0} blocking issues, ${Number(lintWarnings) || 0} warnings`;
    const maintainabilityLabel = `Maintainability trend ${toSignedValue(complexityDelta)}`;
    const semanticLabel = getSemanticLabel(aiVerdict);

    let headline = 'Gatekeeper is preparing this change for review.';
    let summary = 'Run analysis to unlock a layered quality verdict before merge.';
    let actionLabel = 'Analyze this pull request';

    if (normalizedStatus === 'PASS') {
        headline = `Merge-ready with a ${band.label.toLowerCase()} profile.`;
        summary = 'All quality checkpoints are clear, with low merge risk right now.';
        actionLabel = 'Merge with confidence';
    } else if (normalizedStatus === 'BLOCK') {
        headline = 'Merge blocked due to critical quality risks.';
        summary = blockReasons.length > 0
            ? `Top blocker: ${blockReasons[0]}`
            : 'Resolve highlighted quality and semantic issues before merge.';
        actionLabel = 'Fix blockers before merge';
    } else if (normalizedStatus === 'WARN') {
        headline = 'Merge is possible, but risk review is recommended.';
        summary = 'Address warnings to prevent reliability and maintainability drift.';
        actionLabel = 'Review warnings before merge';
    }

    return {
        band,
        statusLabel: getStatusLabel(normalizedStatus),
        headline,
        summary,
        actionLabel,
        lintLabel,
        maintainabilityLabel,
        semanticLabel
    };
};

const buildGatekeeperPayload = ({
    status,
    score,
    lintErrors,
    lintWarnings,
    complexityDelta,
    aiVerdict,
    blockReasons
} = {}) => {
    const normalizedScore = clampPercent(score);
    const narrative = buildGatekeeperNarrative({
        status,
        score: normalizedScore,
        lintErrors,
        lintWarnings,
        complexityDelta,
        aiVerdict,
        blockReasons
    });

    return {
        score: normalizedScore,
        status: String(status || 'PENDING').toUpperCase(),
        statusLabel: narrative.statusLabel,
        band: narrative.band,
        headline: narrative.headline,
        summary: narrative.summary,
        actionLabel: narrative.actionLabel,
        layerSignals: {
            syntax: narrative.lintLabel,
            maintainability: narrative.maintainabilityLabel,
            semantic: narrative.semanticLabel
        }
    };
};

const getFileCacheKey = (repoId, file) => {
    const pathKey = String(file?.path || '').toLowerCase();
    const riskKey = Math.round(Number(file?.normalizedRisk ?? file?.risk?.score ?? file?.risk ?? 0));
    const complexityKey = Math.round(Number(file?.complexity?.cyclomatic ?? file?.complexity ?? 0));
    const churnKey = Math.round(Number(file?.churn?.recentCommits ?? file?.churn?.churnRate ?? file?.churnRate ?? 0));
    return `${repoId}:${pathKey}:${riskKey}:${complexityKey}:${churnKey}`;
};

const getCachedInsight = (cacheKey) => {
    const cached = fileInsightCache.get(cacheKey);
    if (!cached) return null;
    if ((Date.now() - cached.timestamp) > FILE_INSIGHT_TTL_MS) {
        fileInsightCache.delete(cacheKey);
        return null;
    }
    return cached.value;
};

const setCachedInsight = (cacheKey, value) => {
    fileInsightCache.set(cacheKey, { timestamp: Date.now(), value });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseRecipientEmails = (rawRecipients) => {
    const input = Array.isArray(rawRecipients)
        ? rawRecipients.join(',')
        : String(rawRecipients || '');

    const deduped = Array.from(new Set(
        input
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    ));

    const validEmails = deduped.filter((email) => EMAIL_REGEX.test(email));
    const invalidEmails = deduped.filter((email) => !EMAIL_REGEX.test(email));

    return { validEmails, invalidEmails };
};

const resolveCardTags = (card, score) => {
    const tagSet = new Set(
        (Array.isArray(card?.tags) ? card.tags : [])
            .map((tag) => String(tag || '').trim().toUpperCase())
            .filter(Boolean)
    );

    const status = String(card?.status || '').toUpperCase();
    const type = String(card?.type || '').toLowerCase();
    const safeScore = clampPercent(score);

    if (safeScore < 80) tagSet.add('HIGH');
    if (safeScore < 70) tagSet.add('CRITICAL');
    if (safeScore < 80) tagSet.add('UNDER_80');
    if (safeScore < 70) tagSet.add('UNDER_70');
    if (status === 'BLOCK' || status === 'HIGH_RISK') tagSet.add('CRITICAL');
    if (status === 'WARN' || status === 'WATCH') tagSet.add('RISK');
    if (type === 'refactor_task') tagSet.add('TASK');
    if (type === 'pull_request') tagSet.add('PR');

    if (tagSet.size === 0) {
        tagSet.add(type === 'refactor_task' ? 'TASK' : 'RISK');
    }

    return Array.from(tagSet);
};

const buildFallbackSafetyNarrative = (context) => {
    const lines = [
        'Executive Summary',
        `${context.cardTitle} in ${context.repoId} requires immediate attention (${context.cardStatus}, score ${context.cardScore}/100).`,
        '',
        'Risk Signals',
        `Tags: ${context.tags.join(', ') || 'N/A'}`,
        `Primary Finding: ${context.findings[0] || 'No AI findings were available.'}`,
        '',
        'Required Actions',
        '1) Review the flagged card details and linked PR/file context.',
        '2) Assign owner and fix plan with a clear SLA.',
        '3) Re-run Gatekeeper analysis after remediation.',
        '',
        'Ownership & SLA',
        'Owner: Engineering Lead',
        'SLA: 24 hours for critical/blocking signals.',
    ];

    if (context.includeCommits && context.commits.length > 0) {
        lines.splice(8, 0,
            '',
            'Commit Intelligence',
            ...context.commits.slice(0, 5).map((commit, index) => {
                const shortSha = String(commit.sha || '').slice(0, 7) || 'unknown';
                const headline = String(commit.message || '').split('\n')[0] || 'No commit message';
                const author = commit.author || 'unknown';
                return `${index + 1}. ${shortSha} by ${author}: ${headline}`;
            })
        );
    }

    return lines.join('\n');
};

const mapNarrativeFallbackReason = (reason) => {
    const raw = String(reason || '').toLowerCase();

    if (raw.includes('403') || raw.includes('forbidden') || raw.includes('insufficient')) {
        return {
            reasonCode: 'nvidia_access_pending',
            publicReason: 'NVIDIA access pending'
        };
    }

    if (raw.includes('429') || raw.includes('rate')) {
        return {
            reasonCode: 'nvidia_rate_limited',
            publicReason: 'NVIDIA rate limit reached'
        };
    }

    if (raw.includes('timeout')) {
        return {
            reasonCode: 'nvidia_timeout',
            publicReason: 'NVIDIA response timeout'
        };
    }

    return {
        reasonCode: 'nvidia_unavailable',
        publicReason: 'NVIDIA narrative temporarily unavailable'
    };
};

const generateSafetyNarrative = async (context) => {
    const systemPrompt = [
        'You are Gatekeeper Action Narrator for engineering risk management.',
        'Generate a detailed, operations-ready incident report in plain text.',
        'Use these sections exactly in order:',
        '1. Executive Summary',
        '2. Risk Signals',
        context.includeCommits ? '3. Commit Intelligence' : null,
        context.includeCommits ? '4. Required Actions' : '3. Required Actions',
        context.includeCommits ? '5. Ownership & SLA' : '4. Ownership & SLA',
        'Requirements:',
        '- Be specific and actionable, not generic.',
        '- Mention critical findings, score, and tag implications.',
        '- Include concrete mitigation actions and escalation notes.',
        '- Keep response within 280-450 words.',
    ].filter(Boolean).join('\n');

    const userPayload = {
        repoId: context.repoId,
        cardType: context.cardType,
        cardTitle: context.cardTitle,
        cardStatus: context.cardStatus,
        cardScore: context.cardScore,
        tags: context.tags,
        findings: context.findings,
        aiReasoning: context.aiReasoning,
        commitCount: context.commits.length,
        commits: context.includeCommits ? context.commits : [],
        metadata: context.metadata
    };

    try {
        const generated = await nvidiaLLMService.chat(
            systemPrompt,
            JSON.stringify(userPayload),
            { temperature: 0.2, max_tokens: 1200, top_p: 0.9 }
        );

        const cleaned = String(generated || '').trim();
        if (cleaned) {
            return {
                narrative: cleaned,
                fallbackUsed: false,
                reason: null,
                reasonCode: null,
                publicReason: null
            };
        }

        const mapped = mapNarrativeFallbackReason('empty response');

        return {
            narrative: buildFallbackSafetyNarrative(context),
            fallbackUsed: true,
            reason: 'NVIDIA response was empty.',
            reasonCode: mapped.reasonCode,
            publicReason: mapped.publicReason
        };
    } catch (error) {
        console.error('[SafetyAction] Narrative generation fallback:', error.message);
        const mapped = mapNarrativeFallbackReason(error.message);
        return {
            narrative: buildFallbackSafetyNarrative(context),
            fallbackUsed: true,
            reason: error.message,
            reasonCode: mapped.reasonCode,
            publicReason: mapped.publicReason
        };
    }
};

// @desc    Get NVIDIA readiness for Code Health semantic inference
// @route   GET /api/tech-debt/ai-readiness
const getAiReadiness = asyncHandler(async (req, res) => {
    const force = String(req.query.force || '').toLowerCase() === 'true';
    const readiness = await llmScanService.checkReadiness({ force });

    res.status(200).json({
        feature: 'code_health',
        provider: 'nvidia',
        ready: Boolean(readiness.ready),
        reasonCode: readiness.reasonCode || null,
        message: readiness.message || 'NVIDIA inference temporarily unavailable',
        checkedAt: readiness.checkedAt || new Date().toISOString(),
        model: readiness.model || null,
        modelsTried: Array.isArray(readiness.modelsTried) ? readiness.modelsTried : []
    });
});

const createSafetyMailTransporter = () => {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';

    if (!smtpUser || !smtpPassword) {
        return { transporter: null, reason: 'SMTP credentials missing (SMTP_USER + SMTP_PASSWORD/SMTP_PASS).' };
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: {
            user: smtpUser,
            pass: smtpPassword
        }
    });

    return { transporter, reason: null, smtpUser };
};

const sanitizeLegacyAiText = (value) => {
    const raw = String(value || '');
    if (!raw) return '';

    return raw
        .replace(/AI scan unavailable:\s*NVIDIA scan failed:[^\n\r]*/gi, 'Semantic fallback used due to NVIDIA access constraints.')
        .replace(/Gemini fallback unavailable:\s*/gi, 'NVIDIA scan failed: ')
        .replace(/NVIDIA and Gemini API configuration/gi, 'NVIDIA API configuration')
        .replace(/checking NVIDIA and Gemini API configuration/gi, 'checking NVIDIA API configuration')
        .replace(/Gemini API configuration/gi, 'NVIDIA API configuration')
        .trim();
};

const sanitizeLegacyAiScan = (aiScan = {}) => {
    const source = (aiScan && typeof aiScan === 'object') ? aiScan : {};
    const sanitizeFindings = (findings = []) => (
        Array.isArray(findings)
            ? findings.map((finding) => ({
                ...finding,
                message: sanitizeLegacyAiText(finding?.message),
                suggestion: sanitizeLegacyAiText(finding?.suggestion)
            }))
            : []
    );

    const findings = sanitizeFindings(source.findings || []);

    const dynamicScanSource = (source.dynamicScan && typeof source.dynamicScan === 'object')
        ? source.dynamicScan
        : null;

    const dynamicLayers = (dynamicScanSource?.layers && typeof dynamicScanSource.layers === 'object')
        ? Object.fromEntries(
            Object.entries(dynamicScanSource.layers).map(([layerKey, layerValue]) => {
                const layer = (layerValue && typeof layerValue === 'object') ? layerValue : {};
                return [
                    layerKey,
                    {
                        ...layer,
                        findings: sanitizeFindings(layer.findings || [])
                    }
                ];
            })
        )
        : undefined;

    const dynamicScan = dynamicScanSource
        ? {
            ...dynamicScanSource,
            layers: dynamicLayers || dynamicScanSource.layers,
            unifiedFindings: sanitizeFindings(dynamicScanSource.unifiedFindings || [])
        }
        : undefined;

    return {
        ...source,
        findings,
        reasoning: sanitizeLegacyAiText(source.reasoning),
        dynamicScan
    };
};

const sanitizeLegacyAnalysisResults = (analysisResults = {}) => {
    const source = (analysisResults && typeof analysisResults === 'object') ? analysisResults : {};
    const sanitizeFindings = (findings = []) => (
        Array.isArray(findings)
            ? findings.map((finding) => ({
                ...finding,
                message: sanitizeLegacyAiText(finding?.message),
                suggestion: sanitizeLegacyAiText(finding?.suggestion)
            }))
            : []
    );

    const dynamicScanSource = (source.dynamicScan && typeof source.dynamicScan === 'object')
        ? source.dynamicScan
        : {};

    const dynamicLayers = (dynamicScanSource.layers && typeof dynamicScanSource.layers === 'object')
        ? Object.fromEntries(
            Object.entries(dynamicScanSource.layers).map(([layerKey, layerValue]) => {
                const layer = (layerValue && typeof layerValue === 'object') ? layerValue : {};
                return [
                    layerKey,
                    {
                        ...layer,
                        findings: sanitizeFindings(layer.findings || [])
                    }
                ];
            })
        )
        : dynamicScanSource.layers;

    return {
        ...source,
        aiScan: sanitizeLegacyAiScan(source.aiScan || {}),
        dynamicScan: {
            ...dynamicScanSource,
            layers: dynamicLayers,
            unifiedFindings: sanitizeFindings(dynamicScanSource.unifiedFindings || [])
        }
    };
};

const buildFeedTags = ({ type, status, score }) => {
    const tags = new Set();
    const normalizedType = String(type || '').toLowerCase();
    const normalizedStatus = String(status || '').toUpperCase();
    const safeScore = clampPercent(score);

    if (normalizedType === 'pull_request') tags.add('PR');
    if (normalizedType === 'refactor_task') tags.add('TASK');
    if (normalizedType === 'high_risk_file') tags.add('FILE RISK');

    if (safeScore < 80) tags.add('HIGH');
    if (safeScore < 70) tags.add('CRITICAL');
    if (safeScore < 80) tags.add('UNDER_80');
    if (safeScore < 70) tags.add('UNDER_70');

    if (normalizedStatus === 'BLOCK' || normalizedStatus === 'HIGH_RISK') {
        tags.add('CRITICAL');
        tags.add('HIGH');
    }
    if (normalizedStatus === 'WARN' || normalizedStatus === 'WATCH') {
        tags.add('HIGH');
    }

    if (tags.size === 0) {
        tags.add('INFO');
    }

    return Array.from(tags);
};


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

    const normalizedPRs = prs.map((pr) => ({
        ...pr,
        analysisResults: sanitizeLegacyAnalysisResults(pr.analysisResults || {})
    }));

    res.status(200).json(normalizedPRs);
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
        search = '',
        onlyPullRequests = 'false',
        tags = '',
        maxScore = ''
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const statusFilter = String(status || '').trim().toUpperCase();
    const searchText = String(search || '').trim();
    const onlyPRItems = String(onlyPullRequests).toLowerCase() === 'true';
    const requestedTags = String(tags || '')
        .split(',')
        .map((tag) => tag.trim().toUpperCase())
        .filter(Boolean);
    const rawMaxScore = String(maxScore ?? '').trim();
    const parsedMaxScore = rawMaxScore === '' ? NaN : Number(rawMaxScore);
    const hasScoreFilter = rawMaxScore !== '' && Number.isFinite(parsedMaxScore);
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
                passRate: 0,
                avgGatekeeperScore: 0,
                mergeReadyCount: 0,
                reviewQueueCount: 0,
                attentionCount: 0,
                readinessIndex: 0,
                scoreBuckets: {
                    elite: 0,
                    stable: 0,
                    watch: 0,
                    critical: 0
                }
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

    const shouldIncludeNonPRItems = !statusFilter && !onlyPRItems;

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

    const normalizedRecentPRs = recentPRs.map((pr) => ({
        ...pr,
        analysisResults: sanitizeLegacyAnalysisResults(pr.analysisResults || {})
    }));

    const feedItems = [];

    normalizedRecentPRs.forEach((pr) => {
        const lintErrors = pr.analysisResults?.lint?.errors || 0;
        const lintWarnings = pr.analysisResults?.lint?.warnings || 0;
        const complexityDelta = pr.analysisResults?.complexity?.healthScoreDelta || 0;
        const sanitizedAnalysisResults = sanitizeLegacyAnalysisResults(pr.analysisResults || {});
        const aiScan = sanitizedAnalysisResults.aiScan || {};
        const aiVerdict = aiScan.verdict || 'PENDING';
        const gatekeeperScore = calculateGatekeeperScore({
            lintErrors,
            lintWarnings,
            complexityDelta,
            aiVerdict,
            aiCategories: aiScan.categories || {}
        });

        const persistedHealthCurrent = Number(pr.healthScore?.current);
        const healthCurrent = Number.isFinite(persistedHealthCurrent) && persistedHealthCurrent > 0
            ? clampPercent(persistedHealthCurrent)
            : gatekeeperScore.overall;
        const healthDelta = Number(pr.healthScore?.delta ?? complexityDelta) || 0;

        const persistedRisk = Number(pr.risk_score);
        const resolvedRisk = Number.isFinite(persistedRisk)
            ? clampPercent(persistedRisk)
            : clampPercent(100 - healthCurrent);

        const gatekeeper = buildGatekeeperPayload({
            status: pr.status || 'PENDING',
            score: healthCurrent,
            lintErrors,
            lintWarnings,
            complexityDelta: healthDelta,
            aiVerdict,
            blockReasons: pr.blockReasons || []
        });

        feedItems.push({
            id: `pr-${pr._id}`,
            type: 'pull_request',
            _id: pr._id,
            repoId: pr.repoId,
            prNumber: pr.prNumber,
            title: pr.title || 'Untitled PR',
            description: gatekeeper.summary,
            timestamp: pr.createdAt || pr.updatedAt || new Date(),
            createdAt: pr.createdAt,
            author: pr.author,
            branch: pr.branch,
            url: pr.url,
            status: pr.status || 'PENDING',
            gatekeeper,
            riskScore: resolvedRisk,
            risk_score: resolvedRisk,
            severity: resolvedRisk > 70 ? 'high' : resolvedRisk > 40 ? 'medium' : 'low',
            healthScore: {
                current: healthCurrent,
                delta: healthDelta
            },
            gatekeeperScore,
            tags: buildFeedTags({ type: 'pull_request', status: pr.status || 'PENDING', score: healthCurrent }),
            filesChanged: pr.filesChanged || [],
            analysisResults: sanitizedAnalysisResults,
            blockReasons: pr.blockReasons || [],
            data: {
                ...pr,
                analysisResults: sanitizedAnalysisResults
            }
        });
    });

    const avgGatekeeperScore = feedItems.filter((item) => item.type === 'pull_request').length > 0
        ? clampPercent(
            feedItems
                .filter((item) => item.type === 'pull_request')
                .reduce((sum, item) => sum + Number(item.healthScore?.current || item.gatekeeperScore?.overall || 0), 0) /
            feedItems.filter((item) => item.type === 'pull_request').length
        )
        : 0;

    const findRelatedPR = (filePath) => {
        if (!filePath) return null;
        const normalizedPath = String(filePath).toLowerCase();

        return normalizedRecentPRs.find((pr) =>
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

    const dynamicFileInsights = new Map();
    const aiCandidateFiles = highRiskFiles
        .slice(0, FILE_INSIGHT_LIMIT)
        .filter((file) => {
            const relatedPR = findRelatedPR(file.path);
            return !(Array.isArray(relatedPR?.analysisResults?.aiScan?.findings) && relatedPR.analysisResults.aiScan.findings.length > 0);
        });

    await Promise.all(aiCandidateFiles.map(async (file) => {
        const cacheKey = getFileCacheKey(repoId, file);
        const cached = getCachedInsight(cacheKey);
        if (cached) {
            dynamicFileInsights.set(String(file.path || '').toLowerCase(), cached);
            return;
        }

        const riskScore = file.normalizedRisk ?? file.risk?.score ?? file.risk ?? 0;
        const complexity = file.complexity?.cyclomatic ?? file.complexity ?? 0;
        const churnRate = file.churn?.recentCommits ?? file.churn?.churnRate ?? file.churnRate ?? 0;

        const topFunctions = Array.isArray(file.functions)
            ? file.functions.slice(0, 5).map((fn) => `${fn.name || 'anonymous'} (complexity ${fn.complexity || 0})`).join(', ')
            : '';
        const recommendations = Array.isArray(file.recommendations)
            ? file.recommendations.slice(0, 5).map((r) => `${r.type || 'review'}: ${r.message || ''}`).join(' | ')
            : '';

        const fileContext = [
            `Repository: ${repoId}`,
            `File: ${file.path || 'unknown'}`,
            `Language: ${file.language || 'unknown'}`,
            `Risk Score: ${Math.round(Number(riskScore) || 0)} / 100`,
            `Cyclomatic Complexity: ${Math.round(Number(complexity) || 0)}`,
            `Recent Churn: ${Math.round(Number(churnRate) || 0)} commits`,
            `Top Complex Functions: ${topFunctions || 'N/A'}`,
            `Existing Recommendations: ${recommendations || 'N/A'}`
        ].join('\n');

        try {
            const insight = await llmScanService.scan([{ path: file.path || 'unknown', content: fileContext }]);
            dynamicFileInsights.set(String(file.path || '').toLowerCase(), insight);
            setCachedInsight(cacheKey, insight);
        } catch (error) {
            // Keep feed responsive even if AI file insight generation fails for some files.
            console.error(`[GatekeeperFeed] Dynamic AI insight failed for ${file.path}:`, error.message);
        }
    }));

    highRiskFiles.forEach((file) => {
        const riskScore = file.normalizedRisk ?? file.risk?.score ?? file.risk ?? 0;
        const complexity = file.complexity?.cyclomatic ?? file.complexity ?? 0;
        const churnRate = file.churn?.recentCommits ?? file.churn?.churnRate ?? file.churnRate ?? 0;
        const relatedPR = findRelatedPR(file.path);
        const relatedAnalysis = sanitizeLegacyAnalysisResults(relatedPR?.analysisResults || {});
        const dynamicInsight = dynamicFileInsights.get(String(file.path || '').toLowerCase());
        const aiScanSource = sanitizeLegacyAiScan(dynamicInsight || relatedAnalysis?.aiScan || {});

        const fallbackLintErrors = riskScore >= 90 ? 3 : riskScore >= 80 ? 1 : 0;
        const fallbackLintWarnings = Math.max(0, Math.round(complexity / 8));
        const fallbackComplexityDelta = -Math.max(1, Math.round((riskScore - 45) / 10));
        const fallbackAIVerdict = riskScore >= 90 ? 'BAD' : riskScore >= 70 ? 'RISKY' : 'GOOD';

        const baseFindings = Array.isArray(aiScanSource?.findings) && aiScanSource.findings.length > 0
            ? aiScanSource.findings
            : [{
                file: file.path,
                lineRange: [1, 1],
                message: `High risk file detected (risk ${Math.round(riskScore)}).`,
                suggestion: 'Run full 3-layer analysis from PR Gatekeeper for precise diagnostics.',
                severity: riskScore >= 90 ? 9 : 6,
                confidence: 'medium'
            }];

        const aiVerdict = aiScanSource?.verdict || fallbackAIVerdict;
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
                categories: aiScanSource?.categories || {},
                findings: baseFindings,
                reasoning: statusReasoning,
                provider: aiScanSource?.provider || 'nvidia',
                model: aiScanSource?.model || process.env.NVIDIA_CODE_HEALTH_MODEL_DEEP || process.env.NVIDIA_CODE_HEALTH_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
                fallbackUsed: Boolean(aiScanSource?.fallbackUsed)
            }
        };

        const gatekeeperScore = calculateGatekeeperScore({
            lintErrors: analysisResults.lint.errors,
            lintWarnings: analysisResults.lint.warnings,
            complexityDelta: analysisResults.complexity.healthScoreDelta,
            aiVerdict,
            aiCategories: analysisResults.aiScan.categories || {}
        });

        const mappedStatus = statusCategory === 'HIGH_RISK'
            ? 'BLOCK'
            : statusCategory === 'WATCH'
                ? 'WARN'
                : 'PASS';

        const gatekeeper = buildGatekeeperPayload({
            status: mappedStatus,
            score: gatekeeperScore.overall,
            lintErrors: analysisResults.lint.errors,
            lintWarnings: analysisResults.lint.warnings,
            complexityDelta: analysisResults.complexity.healthScoreDelta,
            aiVerdict,
            blockReasons: []
        });

        feedItems.push({
            id: `file-${file._id}`,
            type: 'high_risk_file',
            repoId,
            title: `High Risk File`,
            path: file.path || 'unknown',
            description: gatekeeper.summary,
            timestamp: file.updatedAt || file.createdAt || new Date(),
            status: statusCategory,
            statusReasoning,
            severity: riskScore > 85 ? 'high' : 'medium',
            riskScore: Math.round(riskScore),
            healthScore: { current: gatekeeperScore.overall, delta: analysisResults.complexity.healthScoreDelta },
            gatekeeperScore,
            tags: buildFeedTags({ type: 'high_risk_file', status: statusCategory, score: gatekeeperScore.overall }),
            gatekeeper,
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
            tags: buildFeedTags({ type: 'refactor_task', status: task.status || 'pending', score: task.riskScoreAtCreation || 0 }),
            data: task
        });
    });

    const typeFilteredItems = onlyPRItems
        ? feedItems.filter((item) => item.type === 'pull_request')
        : feedItems;

    const scoreFilteredItems = hasScoreFilter
        ? typeFilteredItems.filter((item) => {
            const score = Number(item?.healthScore?.current ?? item?.gatekeeperScore?.overall ?? item?.riskScore ?? item?.risk_score ?? 0);
            return Number.isFinite(score) && score <= parsedMaxScore;
        })
        : typeFilteredItems;

    const tagFilteredItems = requestedTags.length > 0
        ? scoreFilteredItems.filter((item) => {
            const itemTags = Array.isArray(item.tags) ? item.tags : [];
            return requestedTags.some((tag) => itemTags.includes(tag));
        })
        : scoreFilteredItems;

    const filteredItems = searchRegex
        ? tagFilteredItems.filter((item) => {
            const haystack = [item.title, item.description, item.path, item.author, item.repoId, ...(item.tags || [])]
                .filter(Boolean)
                .join(' ');
            return searchRegex.test(haystack);
        })
        : tagFilteredItems;

    filteredItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = filteredItems.length;
    const startIndex = (pageNum - 1) * limitNum;
    const pagedItems = filteredItems.slice(startIndex, startIndex + limitNum);

    const prFeedItems = feedItems.filter((item) => item.type === 'pull_request');
    const scoreBuckets = prFeedItems.reduce((acc, item) => {
        const score = Number(item?.healthScore?.current ?? item?.gatekeeperScore?.overall ?? 0);
        if (score >= 85) acc.elite += 1;
        else if (score >= 70) acc.stable += 1;
        else if (score >= 55) acc.watch += 1;
        else acc.critical += 1;
        return acc;
    }, { elite: 0, stable: 0, watch: 0, critical: 0 });

    const readinessIndex = prFeedItems.length > 0
        ? clampPercent(((scoreBuckets.elite * 1) + (scoreBuckets.stable * 0.8) + (scoreBuckets.watch * 0.45)) / prFeedItems.length * 100)
        : 0;

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
            passRate: totalPRsForRate > 0 ? Math.round((passCount / totalPRsForRate) * 100) : 0,
            avgGatekeeperScore,
            mergeReadyCount: passCount,
            reviewQueueCount: warnCount + pendingCount,
            attentionCount: blockCount + warnCount,
            readinessIndex,
            scoreBuckets
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
    const gatekeeperCurrent = Number.isFinite(Number(analysisResults?.gatekeeperScore?.overall))
        ? clampPercent(analysisResults.gatekeeperScore.overall)
        : clampPercent(100 - Number(analysisResults?.overallRisk || 0));

    // Update PR in database with analysis results
    const updatedPR = await PullRequest.findOneAndUpdate(
        { repoId, prNumber: parseInt(prNumber) },
        {
            $set: {
                status: analysisResults.verdict,
                'healthScore.current': gatekeeperCurrent,
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
                'analysisResults.dynamicScan': analysisResults.dynamicScan || {},
                'analysisResults.scanConfig': analysisResults.scanConfig || {},
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
            healthScore: {
                current: gatekeeperCurrent,
                delta: analysisResults.complexity.healthScoreDelta
            },
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
                aiScan: analysisResults.aiScan,
                dynamicScan: analysisResults.dynamicScan || {},
                scanConfig: analysisResults.scanConfig || {}
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
            const gatekeeperCurrent = Number.isFinite(Number(analysis?.gatekeeperScore?.overall))
                ? clampPercent(analysis.gatekeeperScore.overall)
                : clampPercent(100 - Number(analysis?.overallRisk || 0));

            await PullRequest.updateOne(
                { _id: pr._id },
                {
                    $set: {
                        status: analysis.verdict,
                        'healthScore.current': gatekeeperCurrent,
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
                        'analysisResults.dynamicScan': analysis.dynamicScan || {},
                        'analysisResults.scanConfig': analysis.scanConfig || {},
                        blockReasons: analysis.blockReasons,
                        risk_score: analysis.overallRisk
                    }
                }
            );

            results.push({
                prNumber: pr.prNumber,
                verdict: analysis.verdict,
                risk: analysis.overallRisk,
                score: gatekeeperCurrent
            });

            if (io) {
                const realtimePayload = {
                    repoId,
                    prNumber: pr.prNumber,
                    status: analysis.verdict,
                    risk_score: analysis.overallRisk,
                    healthScore: {
                        current: gatekeeperCurrent,
                        delta: analysis.complexity.healthScoreDelta
                    },
                    gatekeeperScore: analysis.gatekeeperScore,
                    analysisResults: {
                        lint: {
                            errors: analysis.lint.errors,
                            warnings: analysis.lint.warnings
                        },
                        complexity: {
                            healthScoreDelta: analysis.complexity.healthScoreDelta,
                            fileChanges: analysis.complexity.fileChanges
                        },
                        aiScan: analysis.aiScan,
                        dynamicScan: analysis.dynamicScan || {},
                        scanConfig: analysis.scanConfig || {}
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

// @desc    Notify Safety Action from Gatekeeper card
// @route   POST /api/tech-debt/safety-actions/notify
// @access  Private
const notifySafetyAction = asyncHandler(async (req, res) => {
    const { repoId, card, recipientEmails } = req.body;

    if (!repoId) {
        res.status(400);
        throw new Error('repoId is required');
    }

    if (!card || typeof card !== 'object') {
        res.status(400);
        throw new Error('card payload is required');
    }

    const { validEmails, invalidEmails } = parseRecipientEmails(recipientEmails);
    if (validEmails.length === 0) {
        return res.status(400).json({
            message: 'At least one valid recipient email is required.',
            invalidEmails
        });
    }

    const cardType = String(card.type || '').toLowerCase() || 'unknown';
    const prNumberCandidate = Number(card.prNumber ?? card?.data?.prNumber);
    const isPRCard = cardType === 'pull_request' || Number.isFinite(prNumberCandidate);
    const prNumber = Number.isFinite(prNumberCandidate) ? prNumberCandidate : null;

    const pullRequest = (isPRCard && Number.isFinite(prNumber))
        ? await PullRequest.findOne({ repoId, prNumber }).lean()
        : null;

    const normalizedCardAnalysis = sanitizeLegacyAnalysisResults(card?.analysisResults || {});
    const normalizedPullRequestAnalysis = sanitizeLegacyAnalysisResults(pullRequest?.analysisResults || {});

    const resolvedScore = clampPercent(
        card?.healthScore?.current ??
        card?.gatekeeper?.score ??
        card?.gatekeeperScore?.overall ??
        pullRequest?.healthScore?.current ??
        card?.riskScore ??
        card?.risk_score ??
        0
    );

    const resolvedStatus = String(card?.status || pullRequest?.status || 'PENDING').toUpperCase();
    const resolvedTitle =
        card?.title ||
        pullRequest?.title ||
        (isPRCard && Number.isFinite(prNumber) ? `PR #${prNumber}` : 'Gatekeeper Card');

    const resolvedFindings = (
        normalizedCardAnalysis?.aiScan?.findings ||
        normalizedPullRequestAnalysis?.aiScan?.findings ||
        []
    )
        .slice(0, 6)
        .map((finding) => String(finding?.message || '').trim())
        .filter(Boolean);

    const resolvedReasoning =
        card?.statusReasoning ||
        normalizedCardAnalysis?.aiScan?.reasoning ||
        normalizedPullRequestAnalysis?.aiScan?.reasoning ||
        '';

    const tags = resolveCardTags(card, resolvedScore);

    let commits = [];
    if (isPRCard && Number.isFinite(prNumber)) {
        const [owner, repo] = String(repoId).split('/');
        if (owner && repo) {
            try {
                const githubService = new GitHubService();
                commits = await githubService.getPullRequestCommits(owner, repo, prNumber, 12);
            } catch (error) {
                console.error(`[SafetyAction] Failed to fetch commits for ${repoId}#${prNumber}:`, error.message);
            }
        }
    }

    const narrativeResult = await generateSafetyNarrative({
        repoId,
        cardType,
        cardTitle: resolvedTitle,
        cardStatus: resolvedStatus,
        cardScore: resolvedScore,
        tags,
        findings: resolvedFindings,
        aiReasoning: resolvedReasoning,
        includeCommits: isPRCard,
        commits,
        metadata: {
            prNumber,
            author: card?.author || pullRequest?.author || null,
            branch: card?.branch || pullRequest?.branch || null,
            url: card?.url || pullRequest?.url || null
        }
    });
    const narrative = narrativeResult.narrative;

    const emailDelivery = {
        attempted: true,
        sent: [],
        failed: [],
        skipped: false,
        reason: null
    };

    const { transporter, reason: smtpReason, smtpUser } = createSafetyMailTransporter();
    if (!transporter) {
        emailDelivery.attempted = false;
        emailDelivery.skipped = true;
        emailDelivery.reason = smtpReason;
    } else {
        const subject = `[Safety Action] ${repoId} • ${resolvedTitle}`;
        const text = [
            `Repository: ${repoId}`,
            `Card Type: ${cardType || 'unknown'}`,
            Number.isFinite(prNumber) ? `PR Number: #${prNumber}` : null,
            `Status: ${resolvedStatus}`,
            `Score: ${resolvedScore}/100`,
            `Tags: ${tags.join(', ')}`,
            '',
            narrative
        ].filter(Boolean).join('\n');

        await Promise.all(validEmails.map(async (email) => {
            try {
                await transporter.sendMail({
                    from: `"Digital Dockers Gatekeeper" <${smtpUser}>`,
                    to: email,
                    subject,
                    text
                });
                emailDelivery.sent.push(email);
            } catch (error) {
                emailDelivery.failed.push({
                    email,
                    error: error.message
                });
            }
        }));
    }

    const inAppDelivery = {
        attempted: true,
        sentCount: 0,
        failedCount: 0,
        reason: null
    };

    const notificationHandler = req.app.get('notificationHandler');
    if (!notificationHandler?.notificationService) {
        inAppDelivery.attempted = false;
        inAppDelivery.reason = 'Notification service is unavailable.';
    } else {
        const adminUsers = await User.find({ role: 'admin', isActive: true })
            .select('_id')
            .lean();

        if (adminUsers.length === 0) {
            inAppDelivery.attempted = false;
            inAppDelivery.reason = 'No active admin users found.';
        } else {
            const repoDoc = await Repository.findOne({ fullName: repoId }).select('_id').lean();
            const entityId = repoDoc?._id || req.user?._id;

            for (const admin of adminUsers) {
                try {
                    await notificationHandler.notificationService.createNotification({
                        recipientId: String(admin._id),
                        senderId: String(req.user._id),
                        type: 'ai_insight',
                        title: `Safety Action Needed: ${resolvedTitle}`,
                        description: narrative,
                        entityType: 'project',
                        entityId,
                        options: {
                            priority: resolvedStatus === 'BLOCK' ? 'urgent' : 'high',
                            actionUrl: '/code-health',
                            entityKey: repoId,
                            metadata: {
                                additionalInfo: {
                                    repoId,
                                    cardType,
                                    prNumber,
                                    score: resolvedScore,
                                    tags
                                }
                            }
                        }
                    });
                    inAppDelivery.sentCount += 1;
                } catch (error) {
                    inAppDelivery.failedCount += 1;
                }
            }
        }
    }

    const isEmailSuccessful = emailDelivery.sent.length > 0;
    const isInAppSuccessful = inAppDelivery.sentCount > 0;
    const partialSuccess = isEmailSuccessful || isInAppSuccessful;

    return res.status(partialSuccess ? 200 : 500).json({
        message: partialSuccess
            ? 'Safety action processed with available delivery channels.'
            : 'Safety action failed on all delivery channels.',
        partialSuccess,
        invalidEmails,
        delivery: {
            email: emailDelivery,
            inApp: inAppDelivery
        },
        narrative,
        narrativeMeta: {
            fallbackUsed: Boolean(narrativeResult.fallbackUsed),
            reason: narrativeResult.publicReason || null,
            reasonCode: narrativeResult.reasonCode || null
        }
    });
});

module.exports = {
    getPullRequests,
    getHotspots,
    getRefactorTasks,
    getSummary,
    getAiReadiness,
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
    analyzeAllPRs,
    notifySafetyAction
};
