const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;

class GitHubService {
    constructor(token) {
        this.octokit = new Octokit({
            auth: token || process.env.GITHUB_TOKEN
        });
    }

    /**
     * Get specific repository details
     */
    async getRepository(owner, repo) {
        try {
            const { data } = await this.octokit.repos.get({
                owner,
                repo
            });

            return {
                id: data.id,
                name: data.name,
                fullName: data.full_name,
                owner: data.owner.login,
                url: data.html_url,
                defaultBranch: data.default_branch,
                language: data.language,
                private: data.private
            };
        } catch (error) {
            console.error('Error fetching repository details:', error);
            throw error;
        }
    }

    /**
     * Get authenticated user's repositories
     */
    async getRepositories() {
        try {
            const { data } = await this.octokit.repos.listForAuthenticatedUser({
                sort: 'updated',
                per_page: 100
            });

            return data.map(repo => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                owner: repo.owner.login,
                url: repo.html_url,
                defaultBranch: repo.default_branch,
                language: repo.language,
                private: repo.private
            }));
        } catch (error) {
            console.error('Error fetching repositories:', error);
            throw error;
        }
    }

    /**
     * Get pull requests for a repository
     */
    async getPullRequests(owner, repo, state = 'all') {
        try {
            const { data } = await this.octokit.pulls.list({
                owner,
                repo,
                state,
                per_page: 100,
                sort: 'updated',
                direction: 'desc'
            });

            return data.map(pr => ({
                prNumber: pr.number,
                title: pr.title,
                author: pr.user.login,
                url: pr.html_url,
                branch: pr.head.ref,
                status: pr.state,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                filesChanged: [] // Will be populated by getFilesChanged
            }));
        } catch (error) {
            console.error('Error fetching pull requests:', error);
            throw error;
        }
    }

    /**
     * Get files changed in a pull request
     */
    async getFilesChanged(owner, repo, prNumber) {
        try {
            const { data } = await this.octokit.pulls.listFiles({
                owner,
                repo,
                pull_number: prNumber,
                per_page: 100
            });

            return data.map(file => ({
                filename: file.filename,
                status: file.status, // added, removed, modified
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                patch: file.patch
            }));
        } catch (error) {
            console.error('Error fetching files changed:', error);
            throw error;
        }
    }

    /**
     * Get commit details for a pull request
     */
    async getPullRequestCommits(owner, repo, prNumber, limit = 20) {
        try {
            const { data } = await this.octokit.pulls.listCommits({
                owner,
                repo,
                pull_number: prNumber,
                per_page: Math.max(1, Math.min(Number(limit) || 20, 100))
            });

            return data.map((commit) => ({
                sha: commit.sha,
                message: commit.commit?.message || '',
                author: commit.commit?.author?.name || commit.author?.login || 'unknown',
                date: commit.commit?.author?.date || null,
                url: commit.html_url
            }));
        } catch (error) {
            console.error('Error fetching pull request commits:', error);
            throw error;
        }
    }

    /**
     * Get file content from repository
     */
    async getFileContent(owner, repo, path, ref = 'main') {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
                ref
            });

            if (data.type === 'file') {
                const content = Buffer.from(data.content, 'base64').toString('utf-8');
                return content;
            }
            return null;
        } catch (error) {
            console.error('Error fetching file content:', error);
            return null;
        }
    }

    /**
     * Get commit history for a file (for churn analysis)
     */
    async getFileCommitHistory(owner, repo, filePath, since = null) {
        try {
            const params = {
                owner,
                repo,
                path: filePath,
                per_page: 100
            };

            if (since) {
                params.since = since;
            }

            const { data } = await this.octokit.repos.listCommits(params);
            return data.length; // Return commit count
        } catch (error) {
            console.error('Error fetching commit history:', error);
            return 0;
        }
    }

    /**
     * Get PR diff
     */
    async getPRDiff(owner, repo, prNumber) {
        try {
            const { data } = await this.octokit.pulls.get({
                owner,
                repo,
                pull_number: prNumber,
                mediaType: {
                    format: 'diff'
                }
            });

            return data;
        } catch (error) {
            console.error('Error fetching PR diff:', error);
            throw error;
        }
    }

    /**
     * Clone repository for local analysis
     */
    async cloneRepository(owner, repo, targetDir) {
        try {
            const repoUrl = `https://github.com/${owner}/${repo}.git`;
            const git = simpleGit();

            await git.clone(repoUrl, targetDir);
            return targetDir;
        } catch (error) {
            console.error('Error cloning repository:', error);
            throw error;
        }
    }

    /**
     * Get all files in repository
     */
    async getRepositoryTree(owner, repo, branch = 'main') {
        try {
            const { data } = await this.octokit.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: true
            });

            return data.tree
                .filter(item => item.type === 'blob') // Only files
                .map(item => ({
                    path: item.path,
                    sha: item.sha,
                    size: item.size
                }));
        } catch (error) {
            console.error('Error fetching repository tree:', error);
            throw error;
        }
    }

    /**
     * Post commit status to GitHub (for Gatekeeper integration)
     * This shows a check status on PRs and commits
     */
    async postCommitStatus(owner, repo, sha, status, description, targetUrl = null) {
        try {
            // Map our status to GitHub's expected values
            const stateMap = {
                'PASS': 'success',
                'BLOCK': 'failure',
                'WARN': 'pending',
                'PENDING': 'pending',
                'ERROR': 'error'
            };

            const { data } = await this.octokit.repos.createCommitStatus({
                owner,
                repo,
                sha,
                state: stateMap[status] || 'pending',
                target_url: targetUrl,
                description: description.substring(0, 140), // GitHub limit
                context: 'Digital Dockers / Gatekeeper'
            });

            return {
                id: data.id,
                state: data.state,
                context: data.context,
                url: data.target_url
            };
        } catch (error) {
            console.error('Error posting commit status:', error);
            throw error;
        }
    }

    /**
     * Post a review comment on a PR
     * Can be used to add inline comments or general review comments
     */
    async postReviewComment(owner, repo, prNumber, body, event = 'COMMENT') {
        try {
            // Create a review with comments
            const { data } = await this.octokit.pulls.createReview({
                owner,
                repo,
                pull_number: prNumber,
                body,
                event // 'APPROVE', 'REQUEST_CHANGES', or 'COMMENT'
            });

            return {
                id: data.id,
                state: data.state,
                body: data.body,
                url: data.html_url
            };
        } catch (error) {
            console.error('Error posting review comment:', error);
            throw error;
        }
    }

    /**
     * Post inline comments on specific lines in a PR
     */
    async postInlineComments(owner, repo, prNumber, comments) {
        try {
            // Each comment should have: path, line, body
            const reviewComments = comments.map(c => ({
                path: c.path,
                line: c.line,
                body: c.body
            }));

            const { data } = await this.octokit.pulls.createReview({
                owner,
                repo,
                pull_number: prNumber,
                event: 'COMMENT',
                comments: reviewComments
            });

            return {
                id: data.id,
                commentsCount: comments.length
            };
        } catch (error) {
            console.error('Error posting inline comments:', error);
            throw error;
        }
    }

    /**
     * Post Gatekeeper analysis summary to PR
     * Creates a comprehensive review with all findings
     */
    async postGatekeeperSummary(owner, repo, prNumber, analysisResults, status) {
        try {
            let summary = `## 🛡️ Gatekeeper Analysis\n\n`;
            summary += `**Status:** ${status === 'PASS' ? '✅ PASS' : status === 'BLOCK' ? '❌ BLOCKED' : '⚠️ WARNING'}\n\n`;

            // Lint results
            if (analysisResults.lint) {
                summary += `### Syntax Analysis\n`;
                summary += `- Errors: ${analysisResults.lint.errors || 0}\n`;
                summary += `- Warnings: ${analysisResults.lint.warnings || 0}\n\n`;
            }

            // Complexity results
            if (analysisResults.complexity) {
                summary += `### Complexity Analysis\n`;
                summary += `- Health Score Delta: ${analysisResults.complexity.healthScoreDelta >= 0 ? '+' : ''}${analysisResults.complexity.healthScoreDelta || 0}\n`;
                summary += `- Files Analyzed: ${analysisResults.complexity.fileChanges?.length || 0}\n\n`;
            }

            // AI findings
            if (analysisResults.aiScan?.findings?.length > 0) {
                summary += `### AI Findings\n`;
                analysisResults.aiScan.findings.slice(0, 5).forEach((finding, i) => {
                    summary += `${i + 1}. **${finding.message}**`;
                    if (finding.suggestion) {
                        summary += ` - 💡 ${finding.suggestion}`;
                    }
                    summary += `\n`;
                });
                summary += `\n`;
            }

            summary += `---\n*Powered by Digital Dockers Tech Debt Mode*`;

            const event = status === 'PASS' ? 'APPROVE' : status === 'BLOCK' ? 'REQUEST_CHANGES' : 'COMMENT';

            return await this.postReviewComment(owner, repo, prNumber, summary, event);
        } catch (error) {
            console.error('Error posting Gatekeeper summary:', error);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    static verifyWebhookSignature(payload, signature, secret) {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    }
}

module.exports = GitHubService;
