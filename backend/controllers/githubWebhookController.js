const GitHubService = require('../services/githubService');
const AnalysisOrchestrator = require('../services/analysisOrchestrator');

/**
 * Handle GitHub PR webhook events
 */
const handlePREvent = async (req, res) => {
    try {
        // 1. Verify webhook signature
        const signature = req.headers['x-hub-signature-256'];
        const secret = process.env.GITHUB_WEBHOOK_SECRET;

        if (secret && signature) {
            const payload = JSON.stringify(req.body);
            const isValid = GitHubService.verifyWebhookSignature(payload, signature, secret);

            if (!isValid) {
                console.error('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        // 2. Parse webhook event
        const event = req.headers['x-github-event'];
        const action = req.body.action;
        const pr = req.body.pull_request;

        console.log(`Received GitHub webhook: ${event} - ${action}`);

        // 3. Handle PR events
        if (event === 'pull_request' && ['opened', 'synchronize', 'reopened'].includes(action)) {
            const githubService = new GitHubService();
            const io = req.app.get('io');

            // Extract PR data
            const prData = {
                prNumber: pr.number,
                title: pr.title,
                author: pr.user.login,
                url: pr.html_url,
                branch: pr.head.ref,
                repoId: `${pr.base.repo.owner.login}/${pr.base.repo.name}`
            };

            // Get files changed
            const [owner, repo] = prData.repoId.split('/');
            const filesChanged = await githubService.getFilesChanged(owner, repo, pr.number);

            // Queue analysis
            const orchestrator = new AnalysisOrchestrator();
            const result = await orchestrator.analyzePR(prData, filesChanged, io);

            if (result.success) {
                console.log(`✅ PR #${pr.number} analyzed successfully`);
                return res.status(200).json({
                    message: 'PR analyzed successfully',
                    status: result.status,
                    healthScore: result.healthScore
                });
            } else {
                console.error(`❌ PR analysis failed:`, result.error);
                return res.status(500).json({
                    error: 'Analysis failed',
                    details: result.error
                });
            }
        }

        // 4. Handle PR closed event
        if (event === 'pull_request' && action === 'closed') {
            // Update PR status in database if needed
            console.log(`PR #${pr.number} closed`);
        }

        res.status(200).json({ message: 'Webhook received' });

    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Test webhook endpoint (for development)
 */
const testWebhook = async (req, res) => {
    try {
        res.status(200).json({
            message: 'Webhook endpoint is working',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    handlePREvent,
    testWebhook
};
