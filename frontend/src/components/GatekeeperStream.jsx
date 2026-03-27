import React, { useState, useRef, useCallback } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaRobot,
  FaStream,
  FaSearch,
  FaFilter,
  FaSync,
  FaWifi,
  FaPlay,
  FaMicroscope,
  FaFileCode,
  FaTasks,
} from "react-icons/fa";
import { format } from "date-fns";
import { useGatekeeperFeed } from "../hooks/useGatekeeperFeed";
import PRDetailModal from "./PRDetailModal";
import api from "../services/api";

const GatekeeperStream = ({ isDarkMode, repoId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPR, setSelectedPR] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingPR, setAnalyzingPR] = useState(null);
  const observerTarget = useRef(null);

  const { feed, loading, hasMore, loadMore, refresh, stats, isConnected } = useGatekeeperFeed({
    initialLoading: true,
    filters: {
      status: statusFilter,
      search: searchTerm,
      repoId,
    },
    enableRealtime: true,
    autoAnalyzePending: true,
  });

  const handleAnalyzeAll = async () => {
    if (!repoId || analyzing) return;
    setAnalyzing(true);
    try {
      await api.post("/tech-debt/analyze-all-prs", { repoId });
      await refresh();
    } catch (error) {
      console.error("Failed to analyze PRs:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzePR = async (prNumber, e) => {
    e.stopPropagation();
    if (!repoId || analyzingPR === prNumber) return;
    setAnalyzingPR(prNumber);
    try {
      await api.post("/tech-debt/analyze-pr", { repoId, prNumber });
      await refresh();
    } catch (error) {
      console.error(`Failed to analyze PR #${prNumber}:`, error);
    } finally {
      setAnalyzingPR(null);
    }
  };

  const lastPRRef = useCallback(
    (node) => {
      if (loading) return;
      if (observerTarget.current) observerTarget.current.disconnect();

      observerTarget.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observerTarget.current.observe(node);
    },
    [loading, hasMore, loadMore],
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "PASS":
        return <FaCheckCircle className="text-green-500" />;
      case "BLOCK":
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaExclamationTriangle className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PASS":
        return "border-l-green-500";
      case "BLOCK":
        return "border-l-red-500";
      default:
        return "border-l-yellow-500";
    }
  };

  const isPRItem = (item) => {
    return item?.type === "pull_request" || Number.isFinite(Number(item?.prNumber));
  };

  const getItemIcon = (item) => {
    if (isPRItem(item)) return getStatusIcon(item.status);
    if (item.type === "high_risk_file") return <FaFileCode className="text-orange-500" />;
    if (item.type === "refactor_task") return <FaTasks className="text-blue-500" />;
    return <FaExclamationTriangle className="text-yellow-500" />;
  };

  const getItemBorderColor = (item) => {
    if (isPRItem(item)) return getStatusColor(item.status);
    if (item.severity === "high") return "border-l-red-500";
    if (item.severity === "medium") return "border-l-yellow-500";
    return "border-l-blue-500";
  };

  const openDetail = (item) => {
    if (!isPRItem(item)) return;
    const merged = item?.data && item.data.prNumber
      ? { ...item.data, ...item }
      : item;
    setSelectedPR(merged);
  };

  const normalizeVerdict = (verdict) => {
    const normalized = String(verdict || "").toUpperCase();
    if (normalized === "GOOD") return "Healthy";
    if (normalized === "BAD") return "Risk Detected";
    if (normalized === "RISKY") return "Needs Review";
    return "Pending Review";
  };

  const compactRepoLabel = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "Repository";
    const segments = raw.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
    }
    return raw;
  };

  return (
    <>
      <div
        className={`shadow rounded-lg p-6 h-full min-h-0 flex flex-col overflow-hidden isolate relative z-10 transition-colors ${isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2
              className={`text-xl font-bold flex items-center ${isDarkMode ? "text-white" : "text-gray-800"}`}
            >
              <FaStream className="mr-2 text-indigo-600" /> Live Gatekeeper Feed
              {isConnected && (
                <FaWifi className="ml-2 text-green-500" size={14} title="Connected" />
              )}
            </h2>
            <div className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Pass Rate: <span className="font-semibold text-green-500">{stats.passRate}%</span>
              {" • "}
              <span className="text-green-500">{stats.passCount} passed</span>
              {" • "}
              <span className="text-red-500">{stats.blockCount} blocked</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAnalyzeAll}
              disabled={analyzing || !repoId}
              className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium ${isDarkMode
                ? "bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-700"
                : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-gray-300"
                } ${analyzing ? "animate-pulse" : ""}`}
              title="Analyze all pending PRs"
            >
              <FaMicroscope size={14} />
              {analyzing ? "Analyzing..." : "Analyze All"}
            </button>
            <button
              onClick={refresh}
              disabled={loading || !repoId}
              className={`p-2 rounded-lg transition ${isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-gray-300 disabled:bg-slate-800 disabled:text-slate-500"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:bg-gray-200 disabled:text-gray-400"
                } ${loading ? "animate-spin" : ""}`}
              title="Refresh feed"
            >
              <FaSync size={14} />
            </button>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PR title, author, branch, or number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!repoId}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDarkMode
                ? "bg-slate-700 border-slate-600 text-white placeholder-gray-400 disabled:bg-slate-800 disabled:text-slate-500"
                : "bg-white border-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FaFilter
              className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            />
            {["", "PASS", "BLOCK", "WARN"].map((status) => (
              <button
                key={status || "all"}
                onClick={() => setStatusFilter(status)}
                disabled={!repoId}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : isDarkMode
                    ? "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {status || "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          {!repoId ? (
            <div className="text-center py-10">
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Connect a repository to view the live Gatekeeper feed.
              </p>
            </div>
          ) : loading && feed.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p
                className={`mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Loading feed...
              </p>
            </div>
          ) : feed.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No gatekeeper events match your current filters.
            </p>
          ) : (
            feed.map((item, index) => (
              <div
                key={item.id || item._id || `${item.type || "item"}-${index}`}
                ref={index === feed.length - 1 ? lastPRRef : null}
                onClick={() => openDetail(item)}
                className={`border-l-4 ${getItemBorderColor(item)} rounded p-4 transition-all ${isPRItem(item) ? "cursor-pointer" : "cursor-default"} hover:shadow-lg ${isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600"
                  : "bg-gray-50 hover:bg-gray-100"
                  }`}
              >
                {isPRItem(item) ? (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className={`font-bold text-lg truncate ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            #{item.prNumber} {item.title}
                          </span>
                          {getItemIcon(item)}
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${item.status === "BLOCK"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : item.status === "PASS"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p
                          className={`text-xs mb-3 flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          <span>{compactRepoLabel(item.repoId)}</span>
                          <span>•</span>
                          <span>@{item.author || "unknown"}</span>
                          <span>•</span>
                          <span>
                            {item.createdAt || item.timestamp
                              ? format(new Date(item.createdAt || item.timestamp), "HH:mm - MMM d")
                              : "Now"}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right flex-shrink-0 bg-gray-50 dark:bg-slate-800 p-2 rounded">
                          <div
                            className={`text-2xl font-bold ${(item.risk_score || item.riskScore || item.healthScore?.current || 0) > 70
                              ? "text-red-500"
                              : (item.risk_score || item.riskScore || item.healthScore?.current || 0) > 40
                                ? "text-yellow-500"
                                : "text-green-500"
                              }`}
                          >
                            {item.risk_score || item.riskScore || item.healthScore?.current || 0}
                          </div>
                          <div className="text-xs uppercase tracking-wider text-gray-400">
                            Risk
                          </div>
                        </div>
                        {item.status === "PENDING" && (
                          <button
                            onClick={(e) => handleAnalyzePR(item.prNumber, e)}
                            disabled={analyzingPR === item.prNumber}
                            className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${analyzingPR === item.prNumber
                              ? "bg-indigo-400 text-white animate-pulse"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white"
                              }`}
                          >
                            <FaPlay size={8} />
                            {analyzingPR === item.prNumber ? "Analyzing..." : "Analyze"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs mt-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded ${item.analysisResults?.lint?.errors > 0
                          ? "bg-red-200 text-red-900"
                          : "bg-green-200 text-green-900"
                          }`}
                      >
                        Code Quality: {item.analysisResults?.lint?.errors || 0} errors
                        {`, ${item.analysisResults?.lint?.warnings || 0} warnings`}
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${item.analysisResults?.complexity?.healthScoreDelta < 0
                          ? "bg-red-200 text-red-900"
                          : "bg-green-200 text-green-900"
                          }`}
                      >
                        Maintainability Impact: {item.analysisResults?.complexity?.healthScoreDelta > 0 ? "+" : ""}
                        {item.analysisResults?.complexity?.healthScoreDelta || 0}
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${item.analysisResults?.aiScan?.verdict === "BAD"
                          ? "bg-red-200 text-red-900"
                          : "bg-green-200 text-green-900"
                          }`}
                      >
                        AI Review: {normalizeVerdict(item.analysisResults?.aiScan?.verdict)}
                      </span>
                    </div>

                    {item.analysisResults?.aiScan?.findings?.length > 0 && (
                      <div
                        className={`mt-3 p-2 text-xs rounded border flex gap-2 ${isDarkMode
                          ? "bg-slate-800 border-slate-600 text-gray-300"
                          : "bg-white border-gray-200 text-gray-600"
                          }`}
                      >
                        <FaRobot className="flex-shrink-0 text-indigo-400 mt-1" />
                        <div>
                          <span className="font-semibold">AI Insight:</span>{" "}
                          {item.analysisResults.aiScan.findings[0]?.message || "Potential risk detected."}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getItemIcon(item)}
                          <span className={`font-semibold truncate ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                            {item.title || item.type || "Gatekeeper Alert"}
                          </span>
                          {item.type === "high_risk_file" && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${item.status === "HIGH_RISK"
                                ? "bg-red-100 text-red-800"
                                : item.status === "WATCH"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                                }`}
                            >
                              {item.status || "SAFE"}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                          {item.path || item.description || "No details available"}
                        </p>
                        <p className={`text-[11px] mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {item.language ? `Language: ${item.language}` : "Language: Unknown"}
                          {item.riskScore !== undefined ? ` • Risk score: ${item.riskScore}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        {item.riskScore !== undefined && (
                          <div className={`text-lg font-bold ${item.riskScore > 70 ? "text-red-500" : item.riskScore > 40 ? "text-yellow-500" : "text-green-500"}`}>
                            {item.riskScore}
                          </div>
                        )}
                        <div className="text-[10px] uppercase tracking-wider text-gray-400">
                          {item.type === "high_risk_file" ? "File" : "Task"}
                        </div>
                      </div>
                    </div>

                    {item.type === "high_risk_file" && item.analysisResults && (
                      <div className="flex gap-2 text-xs mt-2 flex-wrap">
                        <span
                          className={`px-2 py-1 rounded ${(item.analysisResults?.lint?.errors || 0) > 0
                            ? "bg-red-200 text-red-900"
                            : "bg-green-200 text-green-900"
                            }`}
                        >
                          Code Quality: {item.analysisResults?.lint?.errors || 0} errors
                          {`, ${item.analysisResults?.lint?.warnings || 0} warnings`}
                        </span>
                        <span
                          className={`px-2 py-1 rounded ${(item.analysisResults?.complexity?.healthScoreDelta || 0) < 0
                            ? "bg-red-200 text-red-900"
                            : "bg-green-200 text-green-900"
                            }`}
                        >
                          Maintainability Impact: {(item.analysisResults?.complexity?.healthScoreDelta || 0) > 0 ? "+" : ""}
                          {item.analysisResults?.complexity?.healthScoreDelta || 0}
                        </span>
                        <span
                          className={`px-2 py-1 rounded ${item.analysisResults?.aiScan?.verdict === "BAD"
                            ? "bg-red-200 text-red-900"
                            : item.analysisResults?.aiScan?.verdict === "RISKY"
                              ? "bg-yellow-200 text-yellow-900"
                              : "bg-green-200 text-green-900"
                            }`}
                        >
                          AI Review: {normalizeVerdict(item.analysisResults?.aiScan?.verdict)}
                        </span>
                      </div>
                    )}

                    {item.type === "high_risk_file" && (item.statusReasoning || item.analysisResults?.aiScan?.reasoning) && (
                      <div
                        className={`mt-2 p-2 text-xs rounded border ${isDarkMode
                          ? "bg-slate-800 border-slate-600 text-gray-300"
                          : "bg-white border-gray-200 text-gray-600"
                          }`}
                      >
                        <span className="font-semibold">Why this file is flagged:</span>{" "}
                        {item.statusReasoning || item.analysisResults?.aiScan?.reasoning}
                      </div>
                    )}

                    {item.type === "high_risk_file" && item.analysisResults?.aiScan?.findings?.length > 0 && (
                      <div
                        className={`mt-2 p-2 text-xs rounded border flex gap-2 ${isDarkMode
                          ? "bg-slate-800 border-slate-600 text-gray-300"
                          : "bg-white border-gray-200 text-gray-600"
                          }`}
                      >
                        <FaRobot className="flex-shrink-0 text-indigo-400 mt-1" />
                        <div className="space-y-1">
                          <div className="font-semibold">AI Findings and Suggestions</div>
                          {item.analysisResults.aiScan.findings.slice(0, 3).map((finding, findingIdx) => (
                            <div key={`file-finding-${findingIdx}`}>
                              {findingIdx + 1}. {finding?.message || "No semantic finding available."}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`mt-2 text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {item.timestamp ? format(new Date(item.timestamp), "HH:mm - MMM d") : "Now"}
                    </div>
                  </>
                )}
              </div>
            ))
          )}

          {loading && feed.length > 0 && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {selectedPR && (
        <PRDetailModal
          pr={selectedPR}
          onClose={() => setSelectedPR(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
};

export default GatekeeperStream;
