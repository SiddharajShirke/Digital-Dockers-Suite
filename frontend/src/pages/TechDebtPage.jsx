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

  return (
    <div className={`h-full rounded-lg p-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${isDark ? "text-indigo-300" : "text-indigo-900"}`}>
          Code Health & Debt
        </h1>
        <p className={isDark ? "text-slate-400" : "text-gray-600"}>
          Gatekeeper AI & Debt Visualization Dashboard {activeRepoId && `for ${activeRepoId}`}
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 h-[65vh]">
        {/* 2. Gatekeeper Feed (Left) */}
        <GatekeeperStream isDarkMode={isDark} repoId={activeRepoId} />

        {/* 3. Codebase MRI (Right) */}
        <CodebaseMRI isDarkMode={isDark} repoId={activeRepoId} />
      </div>

      {/* 4. Actions & Backlog (Bottom) */}
      <div className="w-full">
        <ActionsBacklog isDarkMode={isDark} repoId={activeRepoId} />
      </div>
    </div>
  );
};

export default TechDebtPage;
