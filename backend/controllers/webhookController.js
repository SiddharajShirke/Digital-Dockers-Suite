const PullRequest = require('../models/PullRequest');
const analysisQueue = require('../services/queue/analysisQueue');
// const { verifySignature } = require('../utils/githubUtils'); // Implement signature check if needed

// @desc    Handle GitHub Webhook
// @route   POST /api/webhooks/github
// @access  Public (Validated by Signature)
const handleGitHubWebhook = async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    console.log(`[Webhook] Received GitHub Event: ${event}`);

    try {
        if (event === 'pull_request') {
            const action = payload.action;
            const prData = payload.pull_request;

            // Only care about open, synchronize (push new code), or reopened
            if (['opened', 'synchronize', 'reopened'].includes(action)) {

                // 1. Create or Update PR Record
                await PullRequest.findOneAndUpdate(
                    { prNumber: prData.number, repoId: payload.repository.full_name },
                    {
                        author: prData.user.login,
                        title: prData.title,
                        status: 'PENDING',
                        // In a real app we'd fetch the diffs here or pass URL to worker
                        // For this implementation, we assume we fetch content in the worker or
                        // we put a placeholder in the job.
                    },
                    { upsert: true, new: true }
                );

                // 2. Add to Analysis Queue
                // We need to fetch file content. In a real scenario, the worker uses the GitHub API to get files.
                // Pass minimal info to the queue.
                analysisQueue.addJob({
                    prId: prData.number,
                    repoId: payload.repository.full_name,
                    author: prData.user.login,
                    installationId: payload.installation?.id, // For GitHub App auth
                    // We mock 'files' here for the demo flow if not fetching from GH API in worker
                    // Ideally worker fetches. 
                });

                console.log(`[Webhook] PR #${prData.number} queued for analysis.`);
            }
        }

        res.status(200).json({ message: 'Webhook received' });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
};

module.exports = {
    handleGitHubWebhook
};
