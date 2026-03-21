const express = require('express');
const router = express.Router();
const {
    getPullRequests,
    getHotspots,
    getRefactorTasks,
    getSummary,
    createRefactorTask,
    updateRefactorTask,
    deleteRefactorTask
} = require('../controllers/techDebtController');
const { handlePREvent, testWebhook } = require('../controllers/githubWebhookController');
const { handleGitHubWebhook } = require('../controllers/webhookController');

// GitHub Webhook
router.post('/github/pr', handlePREvent);
router.get('/github/test', testWebhook);

// Tech Debt Routes
router.get('/prs', getPullRequests);
router.get('/hotspots', getHotspots);
router.get('/tasks', getRefactorTasks);
router.post('/tasks', createRefactorTask);
router.put('/tasks/:id', updateRefactorTask);
router.delete('/tasks/:id', deleteRefactorTask);
router.get('/summary', getSummary);

module.exports = router;
