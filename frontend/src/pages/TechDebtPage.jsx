import React, { useState, useEffect } from "react";
import api from "../services/api";
import GatekeeperStream from "../components/GatekeeperStream";
import CodebaseMRI from "../components/CodebaseMRI";
import ActionsBacklog from "../components/ActionsBacklog";
import TopKPIs from "../components/TopKPIs";
import RepoConnectionBar from "../components/RepoConnectionBar";
import { useThemeMode } from "../context/ThemeContext";

const TechDebtPage = () => {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const [metrics, setMetrics] = useState(null);
  const [activeRepoId, setActiveRepoId] = useState(localStorage.getItem('tech_debt_active_repo') || null);
  const [loading, setLoading] = useState(!!(localStorage.getItem('tech_debt_active_repo')));
  const [connectedRepo, setConnectedRepo] = useState(null);

  // Fetch connected repository details
  useEffect(() => {
    const fetchRepo = async () => {
      if (!activeRepoId) {
        setConnectedRepo(null);
        return;
      }
      try {
        const { data } = await api.get(`/tech-debt/repositories/${encodeURIComponent(activeRepoId)}`);
        setConnectedRepo(data);
      } catch (error) {
        console.error("Failed to fetch repository", error);
        // Clear invalid repo from localStorage
        if (error.response?.status === 404) {
          localStorage.removeItem('tech_debt_active_repo');
          setActiveRepoId(null);
        }
      }
    };
    fetchRepo();
  }, [activeRepoId]);

  const handleRepoConnect = (repoData) => {
    // Force reset to trigger loading states and re-fetches
    setMetrics(null);
    setLoading(true);
    localStorage.setItem('tech_debt_active_repo', repoData.repoId);
    setActiveRepoId(repoData.repoId);
    // Set connected repo from response
    setConnectedRepo({
      fullName: repoData.repoId,
      _id: repoData.repositoryId,
      branch: repoData.branch,
      name: repoData.repo,
      owner: repoData.owner,
      analysisStatus: 'in_progress'
    });
  };

  // Add a refresh key to force re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    // Re-fetch metrics and repo details by incrementing refresh key
    setLoading(true);
    setMetrics(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleDisconnect = () => {
    // Clear the connected repo and reset state
    localStorage.removeItem('tech_debt_active_repo');
    setActiveRepoId(null);
    setConnectedRepo(null);
    setMetrics(null);
    setLoading(false);
  };

  // Update useEffect to include refreshKey
  useEffect(() => {
    const fetchMetricsData = async () => {
      if (!activeRepoId) {
        setMetrics(null);
        setLoading(false);
        return;
      }
      try {
        const params = { repoId: activeRepoId };
        const { data } = await api.get("/tech-debt/summary", { params });
        setMetrics(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch metrics", error);
        setLoading(false);
      }
    };
    fetchMetricsData();
  }, [activeRepoId, refreshKey]);

  const repoDisplayName = activeRepoId ? activeRepoId.split('/').pop() : 'Code Health Workspace';
  const activeBranch = connectedRepo?.branch || 'main';

  return (
    <div
      className={`h-full rounded-2xl border p-3 sm:p-4 lg:p-6 ${isDark
        ? "text-slate-100 border-slate-800 bg-gradient-to-b from-slate-900/70 via-slate-900/40 to-slate-900/10"
        : "text-slate-900 border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white"
        }`}
    >
      <div className={`mb-8 rounded-2xl border px-5 py-4 sm:px-6 sm:py-5 ${isDark
        ? "border-indigo-900/60 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900"
        : "border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50"
        }`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-[0.12em] ${isDark
              ? "bg-indigo-900/70 text-indigo-100"
              : "bg-indigo-100 text-indigo-700"
              }`}>
              SUMMARY DASHBOARD
            </span>
            <h1 className={`mt-3 text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              Project Overview: {repoDisplayName}
            </h1>
            <p className={`mt-1 text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Repository: {activeRepoId || 'Not connected'}
              <span className="mx-2">•</span>
              Branch: {activeBranch}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            {["Live code quality signals", "Risk trends made visible", "Prioritized action queue insights"].map((label) => (
              <div
                key={label}
                className={`rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium text-center ${isDark
                  ? "border-slate-700 bg-slate-800/70 text-slate-200"
                  : "border-slate-200 bg-white/90 text-slate-700"
                  }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Repo Connection */}
      <RepoConnectionBar
        onConnect={handleRepoConnect}
        isDarkMode={isDark}
        connectedRepo={connectedRepo}
        onRefresh={handleRefresh}
        onDisconnect={handleDisconnect}
      />

      {/* 1. Top KPI Row */}
      <TopKPIs metrics={metrics} loading={loading} isDarkMode={isDark} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 h-[74vh] xl:h-[78vh] min-h-0">
        {/* 2. Gatekeeper Feed (Left) */}
        <div className="min-h-0">
          <GatekeeperStream isDarkMode={isDark} repoId={activeRepoId} />
        </div>

        {/* 3. Codebase MRI (Right) */}
        <div className="min-h-0">
          <CodebaseMRI isDarkMode={isDark} repoId={activeRepoId} />
        </div>
      </div>

      {/* 4. Actions & Backlog (Bottom) */}
      <div className="w-full">
        <ActionsBacklog isDarkMode={isDark} repoId={activeRepoId} />
      </div>
    </div>
  );
};

export default TechDebtPage;
