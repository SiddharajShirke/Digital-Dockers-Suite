const CodebaseFile = require('../models/CodebaseFile');
const PullRequest = require('../models/PullRequest');
const MetricsHistory = require('../models/MetricsHistory');
const Repository = require('../models/Repository');

class MetricsCalculator {
    escapeRegex(value = '') {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    isObjectIdLike(value = '') {
        return /^[a-fA-F0-9]{24}$/.test(String(value));
    }

    normalizeRepoFullName(value = '') {
        return decodeURIComponent(String(value || '')).trim().replace(/\.git$/i, '');
    }

    async resolveRepoFullName(repoId = null) {
        if (!repoId) return null;

        const normalizedInput = this.normalizeRepoFullName(repoId);
        if (!normalizedInput) return null;

        // If repoId is a repository document id, resolve to fullName
        if (this.isObjectIdLike(normalizedInput)) {
            const repositoryDoc = await Repository.findById(normalizedInput).select('fullName').lean();
            if (repositoryDoc?.fullName) {
                return this.normalizeRepoFullName(repositoryDoc.fullName);
            }
        }

        // Resolve case-insensitively by repository fullName if it exists
        const existingRepo = await Repository.findOne({
            fullName: {
                $regex: new RegExp(`^${this.escapeRegex(normalizedInput)}$`, 'i')
            }
        }).select('fullName').lean();

        return this.normalizeRepoFullName(existingRepo?.fullName || normalizedInput);
    }

    buildRepoFilter(repoFullName = null) {
        if (!repoFullName) {
            return {};
        }

        return {
            repoId: {
                $regex: new RegExp(`^${this.escapeRegex(repoFullName)}$`, 'i')
            }
        };
    }

    /**
     * Calculate average debt ratio (average risk of all files)
     */
    async calculateDebtRatio(repoFullName = null) {
        try {
            const query = this.buildRepoFilter(repoFullName);

            const fileStats = await CodebaseFile.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        // Handle both nested risk.score and flat risk for backwards compatibility
                        avgRisk: { $avg: { $ifNull: ['$risk.score', '$risk'] } },
                        totalFiles: { $sum: 1 }
                    }
                }
            ]);

            const debtRatio = fileStats[0]?.avgRisk || 0;

            // Save to history
            await MetricsHistory.create({
                metricType: 'debtRatio',
                value: Math.round(debtRatio),
                repoId: repoFullName,
                metadata: {
                    totalFiles: fileStats[0]?.totalFiles || 0
                }
            });

            return Math.round(debtRatio);
        } catch (error) {
            console.error('Error calculating debt ratio:', error);
            return 0;
        }
    }

    /**
     * Calculate PR block rate (last 7 days)
     */
    async calculateBlockRate(repoFullName = null, days = 7) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const query = {
                ...this.buildRepoFilter(repoFullName),
                createdAt: { $gte: since }
            };

            const prStats = await PullRequest.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        blocked: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'BLOCK'] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const blockRate = prStats[0]?.total
                ? (prStats[0].blocked / prStats[0].total) * 100
                : 0;

            // Save to history
            await MetricsHistory.create({
                metricType: 'blockRate',
                value: Math.round(blockRate),
                repoId: repoFullName,
                metadata: {
                    totalPRs: prStats[0]?.total || 0,
                    blockedPRs: prStats[0]?.blocked || 0,
                    days
                }
            });

            return Math.round(blockRate);
        } catch (error) {
            console.error('Error calculating block rate:', error);
            return 0;
        }
    }

    /**
     * Identify critical hotspots (files with risk > threshold)
     */
    async identifyCriticalHotspots(repoFullName = null, threshold = 70) {
        try {
            // Query files where risk.score > threshold (or flat risk for backwards compat)
            const matchStage = this.buildRepoFilter(repoFullName);

            const hotspots = await CodebaseFile.aggregate([
                { $match: matchStage },
                {
                    $addFields: {
                        normalizedRisk: { $ifNull: ['$risk.score', '$risk'] }
                    }
                },
                { $match: { normalizedRisk: { $gt: threshold } } },
                { $sort: { normalizedRisk: -1 } },
                { $limit: 20 },
                {
                    $project: {
                        path: 1,
                        language: 1,
                        risk: { $ifNull: ['$risk.score', '$risk'] },
                        complexity: { $ifNull: ['$complexity.cyclomatic', '$complexity'] },
                        churn: { $ifNull: ['$churn.churnRate', '$churn'] },
                        category: { $ifNull: ['$risk.category', 'unknown'] },
                        color: { $ifNull: ['$risk.color', '#666666'] }
                    }
                }
            ]);

            const hotspotCount = hotspots.length;

            // Save to history
            await MetricsHistory.create({
                metricType: 'hotspots',
                value: hotspotCount,
                repoId: repoFullName,
                metadata: {
                    threshold,
                    topHotspots: hotspots.slice(0, 5).map(h => ({
                        path: h.path,
                        risk: h.risk
                    }))
                }
            });

            return {
                count: hotspotCount,
                hotspots
            };
        } catch (error) {
            console.error('Error identifying hotspots:', error);
            return { count: 0, hotspots: [] };
        }
    }

    /**
     * Calculate risk reduced (sum of positive health deltas in passed PRs)
     */
    async calculateRiskReduced(repoFullName = null, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const query = {
                ...this.buildRepoFilter(repoFullName),
                status: 'PASS',
                createdAt: { $gte: since }
            };

            const riskStats = await PullRequest.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        reduced: {
                            $sum: '$analysisResults.complexity.healthScoreDelta'
                        },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const riskReduced = Math.max(0, riskStats[0]?.reduced || 0);

            // Save to history
            await MetricsHistory.create({
                metricType: 'riskReduced',
                value: Math.round(riskReduced),
                repoId: repoFullName,
                metadata: {
                    passedPRs: riskStats[0]?.count || 0,
                    days
                }
            });

            return Math.round(riskReduced);
        } catch (error) {
            console.error('Error calculating risk reduced:', error);
            return 0;
        }
    }

    /**
     * Get all metrics summary
     */
    async getAllMetrics(repoId = null) {
        try {
            const repoFullName = await this.resolveRepoFullName(repoId);

            const [debtRatio, blockRate, hotspots, riskReduced] = await Promise.all([
                this.calculateDebtRatio(repoFullName),
                this.calculateBlockRate(repoFullName),
                this.identifyCriticalHotspots(repoFullName),
                this.calculateRiskReduced(repoFullName)
            ]);

            // Calculate health score as inverse of debt ratio (0-100)
            const healthScore = Math.max(0, Math.min(100, 100 - debtRatio));

            return {
                repoId: repoFullName || null,
                healthScore,
                debtRatio,
                blockRate,
                hotspotCount: hotspots.count,
                riskReduced,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error getting all metrics:', error);
            return {
                healthScore: 75,
                debtRatio: 0,
                blockRate: 0,
                hotspotCount: 0,
                riskReduced: 0,
                timestamp: new Date()
            };
        }
    }

    /**
     * Get metric history/trend
     */
    async getMetricTrend(metricType, repoId = null, days = 30) {
        try {
            const repoFullName = await this.resolveRepoFullName(repoId);
            const since = new Date();
            since.setDate(since.getDate() - days);

            const query = {
                metricType,
                calculatedAt: { $gte: since }
            };

            if (repoFullName) {
                query.repoId = {
                    $regex: new RegExp(`^${this.escapeRegex(repoFullName)}$`, 'i')
                };
            }

            const history = await MetricsHistory.find(query)
                .sort({ calculatedAt: 1 })
                .select('value calculatedAt metadata');

            return history;
        } catch (error) {
            console.error('Error getting metric trend:', error);
            return [];
        }
    }
}

module.exports = MetricsCalculator;
