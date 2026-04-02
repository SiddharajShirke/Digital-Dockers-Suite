const OpenAI = require('openai');
require('dotenv').config();

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL_CANDIDATES = Array.from(new Set([
    process.env.NVIDIA_CODE_HEALTH_MODEL_DEEP,
    process.env.NVIDIA_CODE_HEALTH_MODEL,
    process.env.NVIDIA_MODEL,
    process.env.NVIDIA_CODE_HEALTH_MODEL_FALLBACK,
    process.env.NVIDIA_FALLBACK_MODEL
].filter(Boolean)));
const NVIDIA_READINESS_CACHE_TTL_MS = Number(process.env.NVIDIA_READINESS_CACHE_TTL_MS || 120000);

let readinessCache = {
    expiresAt: 0,
    payload: null
};

const nvidiaClient = process.env.NVIDIA_API_KEY
    ? new OpenAI({
        baseURL: NVIDIA_BASE_URL,
        apiKey: process.env.NVIDIA_API_KEY
    })
    : null;

const getPrompt = () => `
You are a strict senior code reviewer for a Gatekeeper pipeline.

Task:
- Analyze the provided code snippets/diffs.
- Return a single JSON object only.

Required JSON schema:
{
  "verdict": "GOOD",
  "categories": {
    "security": 5,
    "correctness": 5,
    "maintainability": 5,
    "performance": 5,
    "testing": 3
  },
  "findings": [
    {
      "file": "src/example.js",
      "lineRange": [10, 15],
      "message": "Potential null dereference",
      "suggestion": "Add a null guard before dereferencing.",
      "severity": 4,
      "confidence": "medium"
    }
  ]
}

Rules:
- verdict must be one of GOOD, RISKY, BAD.
- categories values must be integers from 1 to 5.
- severity must be 1 to 10.
- confidence must be low, medium, or high.
- If no issues, findings must be an empty array.
- Never return markdown/code fences.
`;

const SECURITY_PATTERNS = [
    { regex: /\.env/gi, message: 'Sensitive environment file reference detected.', severity: 8 },
    { regex: /password\s*=\s*['"]/gi, message: 'Hardcoded password-like assignment detected.', severity: 8 },
    { regex: /api[_-]?key\s*=\s*['"]/gi, message: 'Potential hardcoded API key assignment detected.', severity: 8 },
    { regex: /secret\s*=\s*['"]/gi, message: 'Potential hardcoded secret assignment detected.', severity: 8 },
    { regex: /token\s*=\s*['"]/gi, message: 'Potential hardcoded token assignment detected.', severity: 7 },
    { regex: /eval\s*\(/gi, message: 'Use of eval detected and should be reviewed for security risk.', severity: 7 },
    { regex: /dangerouslySetInnerHTML/gi, message: 'dangerouslySetInnerHTML usage requires sanitization review.', severity: 7 }
];

const MAINTAINABILITY_PATTERNS = [
    { regex: /TODO:/gi, message: 'TODO marker indicates pending technical debt.', severity: 4 },
    { regex: /FIXME:/gi, message: 'FIXME marker indicates unresolved code issue.', severity: 5 },
    { regex: /HACK:/gi, message: 'HACK marker indicates temporary workaround in code.', severity: 5 },
    { regex: /console\.log\(/gi, message: 'console.log usage found in code path.', severity: 3 },
    { regex: /debugger/gi, message: 'debugger statement present in source.', severity: 4 }
];

const buildFileContext = (files = []) => files
    .slice(0, 5)
    .map((file, index) => {
        const path = file.path || `unknown-${index + 1}`;
        const content = (file.content || 'No content').substring(0, 2500);
        return `File: ${path}\nContent:\n${content}`;
    })
    .join('\n\n---\n\n');

const buildStructuredScanBody = (files = []) => {
    const payload = {
        task: 'Analyze these files for semantic risk and quality findings.',
        outputSchema: {
            verdict: 'GOOD|RISKY|BAD',
            categories: {
                security: '1..5',
                correctness: '1..5',
                maintainability: '1..5',
                performance: '1..5',
                testing: '1..5'
            },
            findings: [
                {
                    file: 'string',
                    lineRange: '[start,end]',
                    message: 'string',
                    suggestion: 'string',
                    severity: '1..10',
                    confidence: 'low|medium|high'
                }
            ]
        },
        files: (files || []).slice(0, 5).map((file, index) => ({
            path: file.path || `unknown-${index + 1}`,
            content: String(file.content || '').substring(0, 2500)
        }))
    };

    return JSON.stringify(payload);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const extractJson = (text = '') => {
    const trimmed = String(text).trim();
    if (!trimmed) {
        throw new Error('Empty AI response');
    }

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
        return fenced[1].trim();
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return trimmed;
};

const normalizeFindings = (findings = []) => {
    if (!Array.isArray(findings)) return [];

    return findings
        .slice(0, 20)
        .map((finding) => {
            const severity = clamp(Number(finding?.severity) || 3, 1, 10);
            const confidenceRaw = String(finding?.confidence || 'medium').toLowerCase();
            const confidence = ['low', 'medium', 'high'].includes(confidenceRaw)
                ? confidenceRaw
                : 'medium';

            let lineRange = finding?.lineRange;
            if (!Array.isArray(lineRange) || lineRange.length < 2) {
                const line = Number(finding?.line || 1);
                lineRange = [line, line];
            }

            return {
                file: finding?.file || 'unknown',
                lineRange: [
                    clamp(Number(lineRange[0]) || 1, 1, 1000000),
                    clamp(Number(lineRange[1]) || Number(lineRange[0]) || 1, 1, 1000000)
                ],
                message: finding?.message || 'Potential code quality issue detected.',
                suggestion: finding?.suggestion || '',
                severity,
                confidence
            };
        });
};

const normalizeResult = (raw, metadata = {}) => {
    const verdictRaw = String(raw?.verdict || 'RISKY').toUpperCase();
    const verdict = ['GOOD', 'RISKY', 'BAD'].includes(verdictRaw) ? verdictRaw : 'RISKY';

    const categories = raw?.categories || {};
    const normalizedCategories = {
        security: clamp(Number(categories.security) || 3, 1, 5),
        correctness: clamp(Number(categories.correctness) || 3, 1, 5),
        maintainability: clamp(Number(categories.maintainability) || 3, 1, 5),
        performance: clamp(Number(categories.performance) || 3, 1, 5),
        testing: clamp(Number(categories.testing) || 3, 1, 5)
    };

    return {
        verdict,
        categories: normalizedCategories,
        findings: normalizeFindings(raw?.findings || []),
        provider: metadata.provider || 'unknown',
        model: metadata.model || 'unknown',
        fallbackUsed: Boolean(metadata.fallbackUsed),
        generatedAt: new Date().toISOString()
    };
};

const buildDeterministicFallback = (files = [], reason = '') => {
    const findings = [];

    const addFinding = (filePath, message, severity) => {
        findings.push({
            file: filePath,
            lineRange: [1, 1],
            message,
            suggestion: 'Review and remediate this finding before merge to reduce semantic risk.',
            severity,
            confidence: severity >= 7 ? 'high' : 'medium'
        });
    };

    (files || []).slice(0, 5).forEach((file, index) => {
        const filePath = file.path || `unknown-${index + 1}`;
        const content = String(file.content || '');

        SECURITY_PATTERNS.forEach((pattern) => {
            if (pattern.regex.test(content)) {
                addFinding(filePath, pattern.message, pattern.severity);
            }
        });

        MAINTAINABILITY_PATTERNS.forEach((pattern) => {
            if (pattern.regex.test(content)) {
                addFinding(filePath, pattern.message, pattern.severity);
            }
        });
    });

    const topFindings = findings.slice(0, 20);
    const severeCount = topFindings.filter((finding) => Number(finding.severity) >= 7).length;
    const mediumCount = topFindings.filter((finding) => Number(finding.severity) >= 4 && Number(finding.severity) < 7).length;
    const lowCount = topFindings.length - severeCount - mediumCount;

    const categories = {
        security: clamp(5 - Math.ceil(severeCount / 2), 1, 5),
        correctness: clamp(5 - Math.ceil((severeCount + mediumCount) / 3), 1, 5),
        maintainability: clamp(5 - Math.ceil((mediumCount + lowCount) / 4), 1, 5),
        performance: clamp(5 - Math.ceil(lowCount / 5), 1, 5),
        testing: clamp(5 - Math.ceil(mediumCount / 4), 1, 5)
    };

    const maxSeverity = topFindings.reduce((max, finding) => Math.max(max, Number(finding.severity) || 0), 0);
    const verdict = maxSeverity >= 8
        ? 'BAD'
        : maxSeverity >= 5
            ? 'RISKY'
            : 'GOOD';

    const normalized = normalizeResult({ verdict, categories, findings: topFindings }, {
        provider: 'nvidia',
        model: 'deterministic-fallback',
        fallbackUsed: true
    });

    if (normalized.findings.length === 0) {
        normalized.findings = [
            {
                file: 'system',
                lineRange: [1, 1],
                message: 'Semantic fallback completed with no explicit high-risk pattern matches.',
                suggestion: 'Retry analysis when NVIDIA inference access is available for deeper reasoning.',
                severity: 2,
                confidence: 'medium'
            }
        ];
        normalized.verdict = 'RISKY';
    }

    if (reason) {
        normalized.reason = reason;
    }

    return normalized;
};

const scanWithNvidia = async (prompt, fileContext) => {
    if (!nvidiaClient) {
        throw new Error('NVIDIA_API_KEY is not configured');
    }

    if (NVIDIA_MODEL_CANDIDATES.length === 0) {
        throw new Error('No NVIDIA model configured. Set NVIDIA_MODEL or NVIDIA_CODE_HEALTH_MODEL(_DEEP).');
    }

    let lastError = null;

    for (const model of NVIDIA_MODEL_CANDIDATES) {
        try {
            const response = await nvidiaClient.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: fileContext }
                ],
                temperature: 0.1,
                max_tokens: 1800,
                top_p: 0.9
            });

            const text = response?.choices?.[0]?.message?.content || '';
            const parsed = JSON.parse(extractJson(text));

            return normalizeResult(parsed, {
                provider: 'nvidia',
                model,
                fallbackUsed: false
            });
        } catch (error) {
            lastError = error;
            const status = Number(error?.status ?? error?.response?.status ?? 0);
            const retryable = [403, 404, 429].includes(status);
            if (retryable) {
                continue;
            }
            break;
        }
    }

    const lastStatus = Number(lastError?.status ?? lastError?.response?.status ?? 0);
    const statusLabel = lastStatus ? `status ${lastStatus}` : 'unknown status';
    throw new Error(`NVIDIA scan failed (${statusLabel}): ${lastError?.message || 'Unknown error'}`);
};

const resolveReadinessReason = (error) => {
    const status = Number(error?.status ?? error?.response?.status ?? 0);
    if (status === 403) return 'nvidia_access_pending';
    if (status === 404) return 'model_not_found';
    if (status === 429) return 'rate_limited';
    if (status >= 500) return 'provider_error';
    return 'inference_unavailable';
};

const getPublicReadinessMessage = (reasonCode = '') => {
    const normalized = String(reasonCode || '').toLowerCase();
    if (normalized === 'ready') return 'NVIDIA inference ready';
    if (normalized === 'missing_api_key') return 'NVIDIA access pending';
    if (normalized === 'missing_model_config') return 'NVIDIA model configuration pending';
    if (normalized === 'nvidia_access_pending') return 'NVIDIA access pending';
    if (normalized === 'model_not_found') return 'Configured NVIDIA model is unavailable';
    if (normalized === 'rate_limited') return 'NVIDIA request limit reached';
    if (normalized === 'provider_error') return 'NVIDIA provider temporarily unavailable';
    return 'NVIDIA inference temporarily unavailable';
};

const checkReadiness = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && readinessCache.payload && readinessCache.expiresAt > now) {
        return readinessCache.payload;
    }

    let payload;

    if (!process.env.NVIDIA_API_KEY || !nvidiaClient) {
        payload = {
            ready: false,
            reasonCode: 'missing_api_key',
            message: getPublicReadinessMessage('missing_api_key'),
            checkedAt: new Date().toISOString(),
            model: null,
            modelsTried: []
        };
    } else if (NVIDIA_MODEL_CANDIDATES.length === 0) {
        payload = {
            ready: false,
            reasonCode: 'missing_model_config',
            message: getPublicReadinessMessage('missing_model_config'),
            checkedAt: new Date().toISOString(),
            model: null,
            modelsTried: []
        };
    } else {
        const tried = [];
        let lastError = null;
        let successModel = null;

        for (const model of NVIDIA_MODEL_CANDIDATES) {
            tried.push(model);
            try {
                await nvidiaClient.chat.completions.create({
                    model,
                    messages: [{ role: 'user', content: 'ready' }],
                    max_tokens: 8,
                    temperature: 0
                });
                successModel = model;
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (successModel) {
            payload = {
                ready: true,
                reasonCode: 'ready',
                message: getPublicReadinessMessage('ready'),
                checkedAt: new Date().toISOString(),
                model: successModel,
                modelsTried: tried
            };
        } else {
            const reasonCode = resolveReadinessReason(lastError);
            payload = {
                ready: false,
                reasonCode,
                message: getPublicReadinessMessage(reasonCode),
                checkedAt: new Date().toISOString(),
                model: null,
                modelsTried: tried
            };
        }
    }

    readinessCache = {
        payload,
        expiresAt: now + NVIDIA_READINESS_CACHE_TTL_MS
    };

    return payload;
};

const scan = async (files) => {
    if (!files || files.length === 0) {
        return {
            verdict: 'GOOD',
            categories: { security: 5, correctness: 5, maintainability: 5, performance: 5, testing: 5 },
            findings: [],
            provider: 'none',
            model: 'none',
            fallbackUsed: false,
            generatedAt: new Date().toISOString()
        };
    }

    const prompt = getPrompt();
    const fileContext = buildStructuredScanBody(files);

    try {
        const nvidiaResult = await scanWithNvidia(prompt, fileContext);
        console.log(`[CodeHealth AI] NVIDIA scan complete (${nvidiaResult.model}): ${nvidiaResult.verdict}`);
        return nvidiaResult;
    } catch (nvidiaError) {
        console.error('[CodeHealth AI] NVIDIA scan failed:', nvidiaError.message);
        return buildDeterministicFallback(files, `NVIDIA scan failed: ${nvidiaError.message}`);
    }
};

module.exports = { scan, checkReadiness, getPublicReadinessMessage };

