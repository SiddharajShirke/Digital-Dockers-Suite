const express = require('express');
const router = express.Router();
const GitHubService = require('../services/githubService');
const AnalysisOrchestrator = require('../services/analysisOrchestrator');

/**
 * Connect to GitHub (store token)
 */
router.post('/github/connect', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'GitHub token is required' });
        }

        // Test the token by fetching user info
        const githubService = new GitHubService(token);
        const repos = await githubService.getRepositories();

        res.status(200).json({
            message: 'Connected to GitHub successfully',
            repositoryCount: repos.length
        });
    } catch (error) {
        console.error('GitHub connection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get list of repositories
 */
router.get('/github/repos', async (req, res) => {
    try {
        const githubService = new GitHubService();
        const repos = await githubService.getRepositories();

        res.status(200).json(repos);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get pull requests for a repository
 */
router.get('/github/repos/:owner/:repo/pulls', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const { state = 'all' } = req.query;

        const githubService = new GitHubService();
        const prs = await githubService.getPullRequests(owner, repo, state);

        res.status(200).json(prs);
    } catch (error) {
        console.error('Error fetching PRs:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Trigger full repository scan
 */
router.post('/github/repos/:owner/:repo/scan', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const repoId = `${owner}/${repo}`;
        const io = req.app.get('io');

        const githubService = new GitHubService();

        // Get repository tree
        const files = await githubService.getRepositoryTree(owner, repo);

        // Fetch content for each file
        const filesWithContent = [];
        for (const file of files.slice(0, 100)) { // Limit to 100 files for now
            const content = await githubService.getFileContent(owner, repo, file.path);
            if (content) {
                filesWithContent.push({
                    path: file.path,
                    content
                });
            }
        }

        // Analyze repository
        const orchestrator = new AnalysisOrchestrator();
        const result = await orchestrator.analyzeRepository(repoId, filesWithContent, io);

        res.status(200).json(result);
    } catch (error) {
        console.error('Repository scan error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
