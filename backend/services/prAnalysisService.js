const GitHubService = require('./githubService');
const ComplexityAnalysisService = require('./complexityAnalysisService');
const llmScanService = require('./analysis/llmScanService');
const path = require('path');
const fs = require('fs').promises;

/**
 * PR Analysis Service
 * Analyzes Pull Request code changes and provides PASS/BLOCK verdicts
 * Uses NVIDIA AI (with fallback support) for semantic code analysis
 */
class PRAnalysisService {
    constructor() {
        this.githubService = new GitHubService();
        this.complexityService = new ComplexityAnalysisService();

        // Thresholds for PASS/BLOCK decisions
        this.thresholds = {
            maxComplexity: 25,        // Block if any file exceeds this
            maxLintErrors: 5,         // Block if more than 5 lint errors
            maxRiskScore: 80,         // Block if risk score exceeds this
            minHealthScore: 40,       // Block if health drops below this
            securityPatterns: [       // Patterns that trigger security warnings
                /eval\s*\(/gi,
                /innerHTML\s*=/gi,
                /dangerouslySetInnerHTML/gi,
                /exec\s*\(/gi,
                /child_process/gi,
                /\.env/gi,
                /password\s*=\s*['"]/gi,
                /api[_-]?key\s*=\s*['"]/gi,
                /secret\s*=\s*['"]/gi,
                /token\s*=\s*['"]/gi
            ],
            codeSmellPatterns: [      // Patterns that indicate code smells
                /TODO:/gi,
                /FIXME:/gi,
                /HACK:/gi,
                /console\.log/gi,
                /debugger/gi,
                /alert\s*\(/gi
            ]
        };
    }

    /**
     * Analyze a Pull Request and return analysis results
     */
    async analyzePR(owner, repo, prNumber) {
        console.log(`[PRAnalysis] Starting analysis for PR #${prNumber} in ${owner}/${repo}`);

        const results = {
            lint: { errors: 0, warnings: 0, issues: [] },
            complexity: { healthScoreDelta: 0, fileChanges: [], avgComplexity: 0 },
            security: { issues: [], score: 100 },
            codeSmells: { count: 0, issues: [] },
            ticketAlignment: { aligned: false, confidence: 0, explanation: '' },
            aiScan: {
                verdict: 'PENDING',
                categories: {
                    security: 100,
                    correctness: 100,
                    maintainability: 100,
                    performance: 100,
                    testing: 50
                },
                findings: [],
                provider: 'none',
                model: 'none',
                fallbackUsed: false,
                generatedAt: null
            },
            overallRisk: 0,
            verdict: 'PENDING',
            blockReasons: [],
            summary: ''
        };

        try {
            let changedFiles = [];
            let useLocalFiles = false;

            // 1. Try to get changed files from GitHub API
            try {
                changedFiles = await this.githubService.getFilesChanged(owner, repo, prNumber);
                console.log(`[PRAnalysis] Found ${changedFiles.length} changed files from GitHub`);
            } catch (apiError) {
                // Handle rate limit - fall back to local repo analysis
                if (apiError.status === 403 || apiError.message?.includes('rate limit')) {
                    console.log(`[PRAnalysis] GitHub API rate limited, falling back to local repo analysis`);
                    useLocalFiles = true;
                    changedFiles = await this.getLocalRepoFiles(owner, repo);
                    console.log(`[PRAnalysis] Found ${changedFiles.length} files from local clone`);
                } else {
                    throw apiError;
                }
            }

            if (changedFiles.length === 0) {
                // Try local files as fallback
                changedFiles = await this.getLocalRepoFiles(owner, repo);
                useLocalFiles = changedFiles.length > 0;
                console.log(`[PRAnalysis] Using ${changedFiles.length} files from local clone`);
            }

            // 2. Analyze each file
            let totalComplexity = 0;
            let analyzedFiles = 0;

            for (const file of changedFiles) {
                // Skip non-code files
                const filename = file.filename || file.path;
                if (this.shouldSkipFile(filename)) {
                    continue;
                }

                const fileAnalysis = await this.analyzeFile(owner, repo, file, prNumber, useLocalFiles);

                if (fileAnalysis) {
                    // Aggregate lint issues
                    results.lint.errors += fileAnalysis.lint.errors;
                    results.lint.warnings += fileAnalysis.lint.warnings;
                    results.lint.issues.push(...fileAnalysis.lint.issues);

                    // Aggregate complexity for averages
                    if (fileAnalysis.complexity > 0) {
                        totalComplexity += fileAnalysis.complexity;
                        analyzedFiles++;
                    }

                    // Store per-file metrics for dynamic Files tab rendering
                    if (fileAnalysis.fileMetrics?.analyzed || fileAnalysis.complexity > 0) {
                        results.complexity.fileChanges.push({
                            file: filename,
                            complexity: fileAnalysis.complexity,
                            additions: file.additions || 0,
                            deletions: file.deletions || 0,
                            loc: fileAnalysis.fileMetrics?.loc || 0,
                            riskScore: fileAnalysis.fileMetrics?.riskScore || 0,
                            lintErrors: fileAnalysis.fileMetrics?.lintErrors || 0,
                            lintWarnings: fileAnalysis.fileMetrics?.lintWarnings || 0,
                            securityIssues: fileAnalysis.fileMetrics?.securityIssues || 0,
                            codeSmells: fileAnalysis.fileMetrics?.codeSmells || 0
                        });
                    }

                    // Aggregate security issues
                    results.security.issues.push(...fileAnalysis.security.issues);

                    // Aggregate code smells
                    results.codeSmells.count += fileAnalysis.codeSmells.length;
                    results.codeSmells.issues.push(...fileAnalysis.codeSmells);

                    // Add AI findings
                    results.aiScan.findings.push(...fileAnalysis.findings);
                }
            }

            // 3. Run semantic analysis (NVIDIA primary)
            console.log('[PRAnalysis] Running semantic AI analysis...');
            try {
                // Prepare files for AI analysis (limit to 5 most relevant files)
                const filesForAI = [];
                for (const file of changedFiles.slice(0, 5)) {
                    const fname = file.filename || file.path;
                    if (this.shouldSkipFile(fname)) continue;

                    let content = '';
                    if (useLocalFiles && file.localPath) {
                        // Read from local file
                        try {
                            content = await fs.readFile(file.localPath, 'utf-8');
                            // Limit content size for AI
                            content = content.substring(0, 3000);
                        } catch (e) {
                            continue;
                        }
                    } else if (file.patch) {
                        content = this.extractAddedLines(file.patch);
                    }

                    if (content) {
                        filesForAI.push({ path: fname, content });
                    }
                }

                if (filesForAI.length > 0) {
                    const aiResult = await llmScanService.scan(filesForAI);

                    if (aiResult && aiResult.verdict) {
                        results.aiScan.verdict = aiResult.verdict;
                        results.aiScan.provider = aiResult.provider || 'unknown';
                        results.aiScan.model = aiResult.model || 'unknown';
                        results.aiScan.fallbackUsed = Boolean(aiResult.fallbackUsed);
                        results.aiScan.generatedAt = aiResult.generatedAt || new Date().toISOString();

                        const toPercentScore = (score, fallback = 3) => {
                            const numeric = Number(score);
                            if (!Number.isFinite(numeric)) {
                                return fallback * 20;
                            }
                            if (numeric > 5) {
                                return Math.max(0, Math.min(100, Math.round(numeric)));
                            }
                            return Math.max(0, Math.min(100, Math.round(numeric * 20)));
                        };

                        // Map AI categories (1-5 scale to 0-100)
                        if (aiResult.categories) {
                            results.aiScan.categories.security = toPercentScore(aiResult.categories.security, 5);
                            results.aiScan.categories.correctness = toPercentScore(aiResult.categories.correctness, 5);
                            results.aiScan.categories.maintainability = toPercentScore(aiResult.categories.maintainability, 5);
                            results.aiScan.categories.performance = toPercentScore(aiResult.categories.performance, 5);
                            results.aiScan.categories.testing = toPercentScore(aiResult.categories.testing, 3);
                        }

                        // Add AI findings
                        if (aiResult.findings && Array.isArray(aiResult.findings)) {
                            results.aiScan.findings = aiResult.findings.map(f => ({
                                file: f.file,
                                lineRange: Array.isArray(f.lineRange) && f.lineRange.length >= 2
                                    ? [Number(f.lineRange[0]) || 1, Number(f.lineRange[1]) || Number(f.lineRange[0]) || 1]
                                    : [1, 1],
                                message: f.message,
                                suggestion: f.suggestion || '',
                                debtImpact: f.severity > 3 ? 'adds' : 'neutral',
                                severity: f.severity || 3,
                                confidence: f.confidence || 'medium'
                            }));
                        }

                        console.log(`[PRAnalysis] AI verdict (${results.aiScan.provider}/${results.aiScan.model}): ${aiResult.verdict}`);
                    }
                }
            } catch (aiError) {
                console.error('[PRAnalysis] Semantic AI analysis failed:', aiError.message);
                // Continue with pattern-based analysis as fallback
            }

            // 4. Calculate metrics
            results.complexity.avgComplexity = analyzedFiles > 0
                ? Math.round(totalComplexity / analyzedFiles)
                : 0;

            // Calculate health score delta (negative = worse)
            results.complexity.healthScoreDelta = this.calculateHealthDelta(results);

            // Calculate security score
            results.security.score = Math.max(0, 100 - (results.security.issues.length * 20));

            // Only update AI scan categories if AI did not provide them
            if (results.aiScan.verdict === 'PENDING') {
                results.aiScan.categories.security = results.security.score;
                results.aiScan.categories.maintainability = Math.max(0, 100 - (results.codeSmells.count * 5));
                results.aiScan.categories.correctness = Math.max(0, 100 - (results.lint.errors * 10));
            }

            // 5. Calculate overall risk
            results.overallRisk = this.calculateOverallRisk(results);

            // 6. Determine verdict (considering semantic AI verdict)
            const verdictResult = this.determineVerdict(results);
            results.verdict = verdictResult.verdict;
            results.blockReasons = verdictResult.blockReasons;

            // Keep AI verdict if it was set
            if (results.aiScan.verdict === 'PENDING') {
                results.aiScan.verdict = this.mapVerdictToAIScan(results.verdict);
            }

            // 7. Generate summary
            results.summary = this.generateSummary(results, changedFiles.length);

            console.log(`[PRAnalysis] Completed: ${results.verdict} (Risk: ${results.overallRisk})`);

            return results;

        } catch (error) {
            console.error(`[PRAnalysis] Error analyzing PR #${prNumber}:`, error);
            results.verdict = 'WARN';
            results.summary = `Analysis failed: ${error.message}`;
            return results;
        }
    }

    /**
     * Get files from local cloned repository
     */
    async getLocalRepoFiles(owner, repo) {
        const repoPath = path.join(__dirname, '..', 'repos', owner, repo);
        const files = [];

        try {
            await fs.access(repoPath);
        } catch {
            console.log(`[PRAnalysis] Local repo not found at ${repoPath}`);
            return files;
        }

        const walkDir = async (dir, baseDir = '') => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.join(baseDir, entry.name).replace(/\\/g, '/');

                    // Skip common non-code directories
                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(entry.name)) {
                            continue;
                        }
                        await walkDir(fullPath, relativePath);
                    } else if (entry.isFile()) {
                        // Only include code files
                        if (/\.(js|jsx|ts|tsx|py|java|go|rb|php|cs|cpp|c|h)$/i.test(entry.name)) {
                            files.push({
                                filename: relativePath,
                                path: relativePath,
                                localPath: fullPath
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip unreadable directories
            }
        };

        await walkDir(repoPath);

        // Limit to 50 most important files
        return files.slice(0, 50);
    }

    /**
     * Analyze a single file from the PR
     */
    async analyzeFile(owner, repo, file, prNumber, useLocalFiles = false) {
        const filename = file.filename || file.path;
        const analysis = {
            lint: { errors: 0, warnings: 0, issues: [] },
            complexity: 0,
            security: { issues: [] },
            codeSmells: [],
            findings: [],
            fileMetrics: {
                analyzed: false,
                loc: 0,
                lintErrors: 0,
                lintWarnings: 0,
                securityIssues: 0,
                codeSmells: 0,
                riskScore: 0
            }
        };

        try {
            // Get file content
            let content = '';

            if (useLocalFiles && file.localPath) {
                // Read from local clone
                try {
                    content = await fs.readFile(file.localPath, 'utf-8');
                } catch (e) {
                    console.log(`[PRAnalysis] Could not read local file: ${file.localPath}`);
                }
            } else if (file.patch) {
                // Extract added lines from patch
                content = this.extractAddedLines(file.patch);
            }

            if (!content && file.status !== 'removed' && !useLocalFiles) {
                // Try to fetch full file content from GitHub
                try {
                    content = await this.githubService.getFileContent(owner, repo, filename);
                } catch (e) {
                    // File might not exist yet or be binary
                    content = file.patch || '';
                }
            }

            if (!content) return analysis;

            const totalLines = content.split('\n').length;
            analysis.fileMetrics.analyzed = true;
            analysis.fileMetrics.loc = totalLines;

            // Analyze complexity
            if (this.isJavaScriptFile(filename)) {
                try {
                    const complexityResult = this.complexityService.analyzeCode(content, filename);
                    analysis.complexity = complexityResult.complexity || 0;

                    // Check for high complexity
                    if (analysis.complexity > this.thresholds.maxComplexity) {
                        analysis.findings.push({
                            file: filename,
                            lineRange: [1, totalLines],
                            message: `High cyclomatic complexity: ${analysis.complexity}`,
                            suggestion: 'Consider breaking down this file into smaller functions',
                            debtImpact: 'adds',
                            severity: 7,
                            confidence: 'high'
                        });
                    }
                } catch (e) {
                    // Complexity analysis failed, continue
                }
            }

            // Check for security patterns
            for (const pattern of this.thresholds.securityPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    analysis.security.issues.push({
                        file: filename,
                        pattern: pattern.source,
                        count: matches.length,
                        severity: 'high'
                    });
                    analysis.findings.push({
                        file: filename,
                        lineRange: [1, 1],
                        message: `Security concern: Pattern "${pattern.source}" detected`,
                        suggestion: 'Review this code for potential security vulnerabilities',
                        debtImpact: 'adds',
                        severity: 9,
                        confidence: 'medium'
                    });
                }
            }

            // Check for code smells
            for (const pattern of this.thresholds.codeSmellPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    analysis.codeSmells.push({
                        file: filename,
                        pattern: pattern.source,
                        count: matches.length
                    });

                    // Only add as lint warning, not error
                    analysis.lint.warnings += matches.length;
                    analysis.lint.issues.push({
                        file: filename,
                        message: `Code smell: ${pattern.source} found ${matches.length} time(s)`,
                        severity: 'warning'
                    });
                }
            }

            // Check for syntax issues
            if (this.isJavaScriptFile(filename)) {
                const syntaxIssues = this.checkBasicSyntax(content, filename);
                analysis.lint.errors += syntaxIssues.errors;
                analysis.lint.warnings += syntaxIssues.warnings;
                analysis.lint.issues.push(...syntaxIssues.issues);
            }

            analysis.fileMetrics.lintErrors = analysis.lint.errors;
            analysis.fileMetrics.lintWarnings = analysis.lint.warnings;
            analysis.fileMetrics.securityIssues = analysis.security.issues.length;
            analysis.fileMetrics.codeSmells = analysis.codeSmells.length;

            const riskScore = Math.min(
                100,
                (analysis.complexity * 2) +
                (analysis.lint.errors * 12) +
                (analysis.lint.warnings * 2) +
                (analysis.security.issues.length * 25) +
                (analysis.codeSmells.length * 5)
            );
            analysis.fileMetrics.riskScore = Math.round(riskScore);

            return analysis;

        } catch (error) {
            console.error(`[PRAnalysis] Error analyzing file ${filename}:`, error.message);
            return analysis;
        }
    }

    /**
     * Extract added lines from a git patch
     */
    extractAddedLines(patch) {
        if (!patch) return '';
        return patch
            .split('\n')
            .filter(line => line.startsWith('+') && !line.startsWith('+++'))
            .map(line => line.substring(1))
            .join('\n');
    }

    /**
     * Check if file should be skipped
     */
    shouldSkipFile(filename) {
        const skipPatterns = [
            /package-lock\.json$/i,
            /yarn\.lock$/i,
            /pnpm-lock\.yaml$/i,
            /\.min\.js$/i,
            /\.min\.css$/i,
            /\.map$/i,
            /\.d\.ts$/i,
            /node_modules\//i,
            /dist\//i,
            /build\//i,
            /\.png$/i,
            /\.jpg$/i,
            /\.jpeg$/i,
            /\.gif$/i,
            /\.svg$/i,
            /\.ico$/i,
            /\.woff$/i,
            /\.ttf$/i
        ];
        return skipPatterns.some(pattern => pattern.test(filename));
    }

    /**
     * Check if file is JavaScript/TypeScript
     */
    isJavaScriptFile(filename) {
        return /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filename);
    }

    /**
     * Basic syntax checking
     */
    checkBasicSyntax(content, filename) {
        const result = { errors: 0, warnings: 0, issues: [] };

        // Check for common issues
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            // Very long lines
            if (line.length > 200) {
                result.warnings++;
                result.issues.push({
                    file: filename,
                    line: index + 1,
                    message: `Line exceeds 200 characters (${line.length})`,
                    severity: 'warning'
                });
            }

            // Multiple statements on one line
            if ((line.match(/;/g) || []).length > 3) {
                result.warnings++;
                result.issues.push({
                    file: filename,
                    line: index + 1,
                    message: 'Multiple statements on one line',
                    severity: 'warning'
                });
            }
        });

        return result;
    }

    /**
     * Calculate health score delta
     */
    calculateHealthDelta(results) {
        let delta = 0;

        // Complexity impact
        if (results.complexity.avgComplexity > 15) {
            delta -= (results.complexity.avgComplexity - 15) * 2;
        }

        // Lint errors impact
        delta -= results.lint.errors * 5;
        delta -= results.lint.warnings * 1;

        // Security issues impact
        delta -= results.security.issues.length * 10;

        // Code smells impact
        delta -= results.codeSmells.count * 2;

        return Math.max(-100, Math.min(100, delta));
    }

    /**
     * Calculate overall risk score (0-100)
     */
    calculateOverallRisk(results) {
        let risk = 0;

        // Complexity contributes 30%
        const complexityRisk = Math.min(100, (results.complexity.avgComplexity / 30) * 100);
        risk += complexityRisk * 0.3;

        // Lint errors contribute 20%
        const lintRisk = Math.min(100, results.lint.errors * 10);
        risk += lintRisk * 0.2;

        // Security issues contribute 35%
        const securityRisk = 100 - results.security.score;
        risk += securityRisk * 0.35;

        // Code smells contribute 15%
        const smellRisk = Math.min(100, results.codeSmells.count * 10);
        risk += smellRisk * 0.15;

        return Math.round(risk);
    }

    /**
     * Determine PASS/BLOCK/WARN verdict
     */
    determineVerdict(results) {
        const blockReasons = [];

        // Check blocking conditions
        if (results.lint.errors > this.thresholds.maxLintErrors) {
            blockReasons.push(`Too many lint errors: ${results.lint.errors}`);
        }

        if (results.security.issues.length > 0) {
            blockReasons.push(`Security issues detected: ${results.security.issues.length}`);
        }

        if (results.overallRisk > this.thresholds.maxRiskScore) {
            blockReasons.push(`Risk score too high: ${results.overallRisk}`);
        }

        const maxFileComplexity = Math.max(
            0,
            ...results.complexity.fileChanges.map(f => f.complexity)
        );
        if (maxFileComplexity > this.thresholds.maxComplexity) {
            blockReasons.push(`File complexity exceeds limit: ${maxFileComplexity}`);
        }

        // Check AI verdict - if AI says BAD, it should influence blocking
        if (results.aiScan.verdict === 'BAD') {
            blockReasons.push('Semantic AI detected critical issues');
        }

        // Determine verdict
        if (blockReasons.length > 0) {
            return { verdict: 'BLOCK', blockReasons };
        }

        // Check warning conditions
        if (results.codeSmells.count > 5 || results.lint.warnings > 10) {
            return {
                verdict: 'WARN',
                blockReasons: [`Code quality concerns: ${results.codeSmells.count} smells, ${results.lint.warnings} warnings`]
            };
        }

        // Check AI verdict for warnings
        if (results.aiScan.verdict === 'RISKY') {
            return {
                verdict: 'WARN',
                blockReasons: ['Semantic AI detected potential risks in code']
            };
        }

        return { verdict: 'PASS', blockReasons: [] };
    }

    /**
     * Map verdict to AI scan verdict
     */
    mapVerdictToAIScan(verdict) {
        const map = {
            'PASS': 'GOOD',
            'WARN': 'RISKY',
            'BLOCK': 'BAD',
            'PENDING': 'PENDING'
        };
        return map[verdict] || 'PENDING';
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(results, fileCount) {
        const parts = [];

        parts.push(`Analyzed ${fileCount} files.`);

        if (results.verdict === 'PASS') {
            parts.push('✅ Code quality looks good!');
        } else if (results.verdict === 'WARN') {
            parts.push('⚠️ Some concerns detected, review recommended.');
        } else if (results.verdict === 'BLOCK') {
            parts.push('🚫 Critical issues found - blocking merge.');
        }

        // AI verdict
        if (results.aiScan.verdict !== 'PENDING') {
            const providerLabel = results.aiScan.provider || 'ai';
            parts.push(`AI (${providerLabel}): ${results.aiScan.verdict}.`);
        }

        if (results.lint.errors > 0) {
            parts.push(`Lint: ${results.lint.errors} errors, ${results.lint.warnings} warnings.`);
        }

        if (results.security.issues.length > 0) {
            parts.push(`Security: ${results.security.issues.length} potential issues.`);
        }

        if (results.codeSmells.count > 0) {
            parts.push(`Code smells: ${results.codeSmells.count} detected.`);
        }

        // Add AI findings summary
        if (results.aiScan.findings && results.aiScan.findings.length > 0) {
            parts.push(`AI findings: ${results.aiScan.findings.length} issues.`);
        }

        parts.push(`Risk score: ${results.overallRisk}/100.`);

        return parts.join(' ');
    }
}

module.exports = PRAnalysisService;
