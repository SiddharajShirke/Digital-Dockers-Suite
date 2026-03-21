const express = require('express');
const router = express.Router();
const {
    getPullRequests,
    getHotspots,
    getRefactorTasks,
    getSummary,
    getGatekeeperFeed,
    connectRepo,
    createRefactorTask,
    updateRefactorTask,
    deleteRefactorTask,
    getRepositories,
    getRepository,
    refreshRepo,
    getAnalysisProgress,
    getFileDetails,
    getSnapshots,
    getSnapshotDetails,
    syncPullRequests,
    analyzePullRequest,
    analyzeAllPRs
} = require('../controllers/techDebtController');

// Pull Requests
router.get('/prs', getPullRequests);
router.post('/sync-prs', syncPullRequests);
router.post('/analyze-pr', analyzePullRequest);
router.post('/analyze-all-prs', analyzeAllPRs);

// Codebase Hotspots (MRI)
router.get('/hotspots', getHotspots);

// Refactor Tasks (CRUD)
router.get('/tasks', getRefactorTasks);
router.post('/tasks', createRefactorTask);
router.put('/tasks/:id', updateRefactorTask);
router.delete('/tasks/:id', deleteRefactorTask);

// Summary & Feed
router.get('/summary', getSummary);
router.get('/gatekeeper-feed', getGatekeeperFeed);

// Repository Management
router.get('/repositories', getRepositories);
router.get('/repositories/:repoId', getRepository);
router.post('/connect-repo', connectRepo);
router.post('/repositories/:repoId/refresh', refreshRepo);

// Analysis Progress
router.get('/analysis/:analysisId/progress', getAnalysisProgress);

// File Details
router.get('/files/:fileId', getFileDetails);

// Time-Travel Snapshots
router.get('/snapshots', getSnapshots);
router.get('/snapshots/:snapshotId', getSnapshotDetails);

module.exports = router;

