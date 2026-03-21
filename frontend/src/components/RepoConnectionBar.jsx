import React, { useState, useEffect } from 'react';
import { io as socketIo } from 'socket.io-client';
import {
    FaGithub,
    FaCheckCircle,
    FaExclamationCircle,
    FaSync,
    FaCodeBranch,
    FaClock,
    FaSpinner
} from 'react-icons/fa';
import api from '../services/api';

const RepoConnectionBar = ({
    onConnect,
    isDarkMode,
    connectedRepo = null,
    onRefresh
}) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('main');
    const [branches] = useState(['main', 'master', 'develop']);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [analysisProgress, setAnalysisProgress] = useState(null);
    const [showChangeRepo, setShowChangeRepo] = useState(false);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    // Poll for analysis progress
    useEffect(() => {
        if (!analysisProgress?.analysisId) return;

        const pollProgress = async () => {
            try {
                const { data } = await api.get(`/tech-debt/analysis/${analysisProgress.analysisId}/progress`);
                setAnalysisProgress(prev => ({ ...prev, ...data }));

                if (data.status === 'completed' || data.status === 'failed') {
                    setRefreshing(false);
                    if (data.status === 'completed') {
                        setSuccess('Analysis completed!');
                        onRefresh?.();
                    } else {
                        setError('Analysis failed');
                    }
                }
            } catch (err) {
                console.error('Failed to poll progress:', err);
            }
        };

        const interval = setInterval(pollProgress, 2000);
        return () => clearInterval(interval);
    }, [analysisProgress?.analysisId, onRefresh]);

    // Socket listener for real-time scan updates
    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:5001';
        const socket = socketIo(API_URL, { transports: ['websocket', 'polling'], withCredentials: true, secure: true, rejectUnauthorized: false });

        // Track either the connected repo or the one being analyzed
        const targetRepoId = connectedRepo?.fullName || analysisProgress?.repoId;

        socket.on('scan:progress', (data) => {
            if (targetRepoId && data.repoId === targetRepoId) {
                setAnalysisProgress(prev => ({
                    ...prev,
                    progress: data.percentage,
                    currentFile: data.currentFile,
                    status: 'running'
                }));
            }
        });

        socket.on('scan:status', (data) => {
            if (targetRepoId && data.repoId === targetRepoId) {
                if (data.status === 'complete') {
                    setAnalysisProgress(null);
                    setRefreshing(false);
                    setSuccess(`Analysis completed! ${data.filesAnalyzed || ''} files analyzed.`);
                    onRefresh?.();
                } else if (data.status === 'error') {
                    setAnalysisProgress(null);
                    setRefreshing(false);
                    setError('Analysis failed: ' + (data.error || 'Unknown error'));
                } else {
                    setAnalysisProgress(prev => ({
                        ...prev,
                        progress: data.progress,
                        status: 'running'
                    }));
                }
            }
        });

        socket.on('scan:error', (data) => {
            if (targetRepoId && data.repoId === targetRepoId) {
                setAnalysisProgress(null);
                setRefreshing(false);
                setError('Analysis error: ' + (data.error || 'Unknown error'));
            }
        });

        socket.on('metrics:updated', (data) => {
            if (targetRepoId && data.repoId === targetRepoId) {
                setAnalysisProgress(null);
                onRefresh?.();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [connectedRepo, analysisProgress?.repoId, onRefresh]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const { data } = await api.post('/tech-debt/connect-repo', {
                repoUrl,
                branch: selectedBranch
            });
            setSuccess(`Connected to ${data.repoId}. Analysis started...`);
            setRepoUrl('');

            // Start analysis progress tracking
            setAnalysisProgress({
                analysisId: data.repositoryId,
                repoId: data.repoId,
                progress: 5,
                status: 'running'
            });

            // Reset change repo form
            setShowChangeRepo(false);

            // Pass full data including repoId to parent
            if (onConnect) onConnect({
                ...data,
                fullName: data.repoId,
                _id: data.repositoryId
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to connect repository');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!connectedRepo || cooldown > 0 || refreshing) return;

        setRefreshing(true);
        setError('');
        setSuccess('');

        try {
            const { data } = await api.post(`/tech-debt/repositories/${connectedRepo._id}/refresh`);

            if (data.analysisId) {
                setAnalysisProgress({
                    analysisId: data.analysisId,
                    progress: 0,
                    status: 'running'
                });
            }

            // Set 5-minute cooldown
            setCooldown(300);
        } catch (err) {
            setRefreshing(false);
            if (err.response?.status === 429) {
                // Rate limited - extract remaining cooldown
                const remaining = err.response?.data?.remainingCooldown || 300;
                setCooldown(remaining);
                setError(`Please wait ${Math.ceil(remaining / 60)}m before refreshing`);
            } else {
                setError(err.response?.data?.error || 'Failed to refresh');
            }
        }
    };

    const formatCooldown = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    return (
        <div className={`p-4 rounded-xl mb-6 shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                    <FaGithub className="text-xl" />
                    {connectedRepo ? 'Connected Repository' : 'Connect GitHub Repository'}
                </h3>

                {connectedRepo && (
                    <button
                        onClick={handleRefresh}
                        disabled={cooldown > 0 || refreshing}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${cooldown > 0 || refreshing
                                ? isDarkMode
                                    ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isDarkMode
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                    >
                        {refreshing ? (
                            <FaSpinner className="animate-spin" />
                        ) : cooldown > 0 ? (
                            <>
                                <FaClock />
                                {formatCooldown(cooldown)}
                            </>
                        ) : (
                            <>
                                <FaSync />
                                Refresh Analysis
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Connected Repo Display */}
            {connectedRepo && !showChangeRepo ? (
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                        <FaCheckCircle className="text-green-500" />
                        <div>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                {connectedRepo.fullName || connectedRepo.name}
                            </span>
                            <div className={`text-xs flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                <FaCodeBranch />
                                {connectedRepo.branch || 'main'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Analysis Progress */}
                        {analysisProgress && analysisProgress.status === 'running' && (
                            <div className="flex items-center gap-3">
                                <div className={`w-32 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                                    }`}>
                                    <div
                                        className="h-full bg-indigo-500 transition-all"
                                        style={{ width: `${analysisProgress.progress || 0}%` }}
                                    />
                                </div>
                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {analysisProgress.progress || 0}%
                                </span>
                            </div>
                        )}

                        {/* Change Repo Button */}
                        <button
                            onClick={() => setShowChangeRepo(true)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                isDarkMode
                                    ? 'bg-slate-600 hover:bg-slate-500 text-gray-300'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                        >
                            Change
                        </button>
                    </div>
                </div>
            ) : connectedRepo && showChangeRepo ? (
                /* Change Repo Form */
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Currently: <strong>{connectedRepo.fullName}</strong>
                        </span>
                        <button
                            onClick={() => setShowChangeRepo(false)}
                            className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Cancel
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
                                    ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                            disabled={loading}
                        />
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
                                    ? 'bg-slate-600 border-slate-500 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                            disabled={loading}
                        >
                            {branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={loading || !repoUrl}
                            className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${loading || !repoUrl
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : null}
                            {loading ? 'Connecting...' : 'Connect'}
                        </button>
                    </form>
                </div>
            ) : analysisProgress && analysisProgress.status === 'running' ? (
                /* Analysis in Progress (Connecting) */
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-indigo-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <FaSpinner className="animate-spin text-indigo-500" />
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                Analyzing {analysisProgress.repoId}...
                            </span>
                        </div>
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            {analysisProgress.progress || 0}%
                        </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${analysisProgress.progress || 0}%` }}
                        />
                    </div>
                    {analysisProgress.currentFile && (
                        <p className={`mt-1 text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {analysisProgress.currentFile}
                        </p>
                    )}
                </div>
            ) : (
                /* Connection Form */
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="https://github.com/owner/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
                                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                : 'bg-gray-50 border-gray-300 text-gray-900'
                            }`}
                        disabled={loading}
                    />

                    {/* Branch Selector */}
                    <div className="relative">
                        <FaCodeBranch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`} />
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-lg border appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-gray-50 border-gray-300 text-gray-900'
                                }`}
                            disabled={loading}
                        >
                            {branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !repoUrl}
                        className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${loading || !repoUrl
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            'Connect'
                        )}
                    </button>
                </form>
            )}

            {/* Feedback Messages */}
            {error && (
                <div className="mt-3 text-sm text-red-500 flex items-center gap-2">
                    <FaExclamationCircle />
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-3 text-sm text-green-500 flex items-center gap-2">
                    <FaCheckCircle />
                    {success}
                </div>
            )}
        </div>
    );
};

export default RepoConnectionBar;

