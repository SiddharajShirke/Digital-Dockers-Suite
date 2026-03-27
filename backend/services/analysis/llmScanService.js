const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_CODE_HEALTH_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
const GEMINI_MODEL = process.env.GEMINI_CODE_HEALTH_MODEL || 'gemini-1.5-flash-latest';

const geminiClient = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

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

const buildFileContext = (files = []) => files
    .slice(0, 5)
    .map((file, index) => {
        const path = file.path || `unknown-${index + 1}`;
        const content = (file.content || 'No content').substring(0, 2500);
        return `File: ${path}\nContent:\n${content}`;
    })
    .join('\n\n---\n\n');

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

const scanWithNvidia = async (prompt, fileContext) => {
    if (!nvidiaClient) {
        throw new Error('NVIDIA_API_KEY is not configured');
    }

    const response = await nvidiaClient.chat.completions.create({
        model: NVIDIA_MODEL,
        messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Code to analyze:\n\n${fileContext}` }
        ],
        temperature: 0.1,
        max_tokens: 1800,
        top_p: 0.9
    });

    const text = response?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(extractJson(text));

    return normalizeResult(parsed, {
        provider: 'nvidia',
        model: NVIDIA_MODEL,
        fallbackUsed: false
    });
};

const scanWithGeminiFallback = async (prompt, fileContext, reason) => {
    if (!geminiClient) {
        throw new Error(`Gemini fallback unavailable: ${reason}`);
    }

    const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(`${prompt}\n\nCode to analyze:\n\n${fileContext}`);
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(extractJson(text));

    return normalizeResult(parsed, {
        provider: 'gemini',
        model: GEMINI_MODEL,
        fallbackUsed: true
    });
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
    const fileContext = buildFileContext(files);

    try {
        const nvidiaResult = await scanWithNvidia(prompt, fileContext);
        console.log(`[CodeHealth AI] NVIDIA scan complete (${nvidiaResult.model}): ${nvidiaResult.verdict}`);
        return nvidiaResult;
    } catch (nvidiaError) {
        console.error('[CodeHealth AI] NVIDIA scan failed:', nvidiaError.message);

        try {
            const geminiResult = await scanWithGeminiFallback(prompt, fileContext, nvidiaError.message);
            console.log(`[CodeHealth AI] Gemini fallback scan complete (${geminiResult.model}): ${geminiResult.verdict}`);
            return geminiResult;
        } catch (fallbackError) {
            console.error('[CodeHealth AI] Gemini fallback failed:', fallbackError.message);
            return {
                verdict: 'PENDING',
                categories: { security: 3, correctness: 3, maintainability: 3, performance: 3, testing: 3 },
                findings: [
                    {
                        file: 'system',
                        lineRange: [1, 1],
                        message: `AI scan unavailable: ${fallbackError.message}`,
                        suggestion: 'Retry analysis after checking NVIDIA and Gemini API configuration.',
                        severity: 2,
                        confidence: 'low'
                    }
                ],
                provider: 'none',
                model: 'none',
                fallbackUsed: false,
                generatedAt: new Date().toISOString()
            };
        }
    }
};

module.exports = { scan };

