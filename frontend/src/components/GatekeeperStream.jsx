import React, { useState, useRef, useCallback, useEffect } from "react";
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
  FaShieldAlt,
  FaExpand,
  FaTimes,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const observerTarget = useRef(null);
  const feedContainerRef = useRef(null);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === feedContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (!feedContainerRef.current) return;

      if (document.fullscreenElement === feedContainerRef.current) {
        await document.exitFullscreen();
      } else {
        await feedContainerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen toggle failed:", error);
    }
  }, []);

  const isPRItem = (item) => {
    return item?.type === "pull_request" || Number.isFinite(Number(item?.prNumber));
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

  const getGatekeeperScore = (item) => {
    const score = Number(
      item?.gatekeeper?.score ??
      item?.gatekeeperScore?.overall ??
      item?.healthScore?.current ??
      (100 - Number(item?.risk_score ?? item?.riskScore ?? 0))
    );
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getStatusMeta = (status) => {
    const normalized = String(status || "PENDING").toUpperCase();
    if (normalized === "PASS") {
      return {
        icon: <FaCheckCircle className="text-emerald-400" />,
        badgeClass: "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30",
        cardClass: "border-emerald-400/30",
        ringColor: "#10b981",
      };
    }
    if (normalized === "BLOCK") {
      return {
        icon: <FaTimesCircle className="text-rose-400" />,
        badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-400/30",
        cardClass: "border-rose-400/30",
        ringColor: "#f43f5e",
      };
    }
    if (normalized === "WARN") {
      return {
        icon: <FaExclamationTriangle className="text-amber-400" />,
        badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-400/30",
        cardClass: "border-amber-400/30",
        ringColor: "#f59e0b",
      };
    }
    return {
      icon: <FaExclamationTriangle className="text-sky-400" />,
      badgeClass: "bg-sky-500/20 text-sky-200 border border-sky-400/30",
      cardClass: "border-sky-400/30",
      ringColor: "#38bdf8",
    };
  };

  const buildGatekeeperSnapshot = (item) => {
    const score = getGatekeeperScore(item);
    const status = String(item?.status || "PENDING").toUpperCase();

    const fallbackBand = score >= 85
      ? "Elite Stability"
      : score >= 70
        ? "Stable"
        : score >= 55
          ? "Needs Watch"
          : "Critical Risk";

    const fallbackHeadline = status === "PASS"
      ? "Merge-ready and stable across all checkpoints."
      : status === "BLOCK"
        ? "Blocked until quality and risk blockers are resolved."
        : status === "WARN"
          ? "Warning state: review recommended before merge."
          : "Awaiting Gatekeeper analysis.";

    const fallbackSummary = status === "PASS"
      ? "All quality layers are aligned for a safe merge window."
      : status === "BLOCK"
        ? "Critical quality signals were detected by Gatekeeper."
        : status === "WARN"
          ? "Proceed with caution and clear warning-level findings first."
          : "Run analysis to receive syntax, maintainability, and semantic scoring.";

    const delta = Number(item?.analysisResults?.complexity?.healthScoreDelta || item?.healthScore?.delta || 0);
    const lintErrors = Number(item?.analysisResults?.lint?.errors || 0);
    const lintWarnings = Number(item?.analysisResults?.lint?.warnings || 0);

    return {
      score,
      bandLabel: item?.gatekeeper?.band?.label || fallbackBand,
      headline: item?.gatekeeper?.headline || fallbackHeadline,
      summary: item?.gatekeeper?.summary || fallbackSummary,
      actionLabel: item?.gatekeeper?.actionLabel || (status === "PASS" ? "Merge with confidence" : "Review before merge"),
      layerSignals: {
        syntax: item?.gatekeeper?.layerSignals?.syntax || `${lintErrors} blocking issues, ${lintWarnings} warnings`,
        maintainability: item?.gatekeeper?.layerSignals?.maintainability || `Maintainability trend ${delta >= 0 ? "+" : ""}${delta}`,
        semantic: item?.gatekeeper?.layerSignals?.semantic || `AI Review: ${normalizeVerdict(item?.analysisResults?.aiScan?.verdict)}`,
      },
    };
  };

  const getItemIcon = (item) => {
    if (isPRItem(item)) return getStatusMeta(item.status).icon;
    if (item.type === "high_risk_file") return <FaFileCode className="text-orange-400" />;
    if (item.type === "refactor_task") return <FaTasks className="text-blue-400" />;
    return <FaExclamationTriangle className="text-yellow-400" />;
  };

  const openDetail = (item) => {
    if (!isPRItem(item)) return;
    const merged = item?.data && item.data.prNumber
      ? { ...item.data, ...item }
      : item;
    setSelectedPR(merged);
  };

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

  const summaryCards = [
    { label: "Merge Ready", value: stats.mergeReadyCount ?? stats.passCount ?? 0, tone: "text-emerald-400" },
    { label: "Review Queue", value: stats.reviewQueueCount ?? ((stats.warnCount || 0) + (stats.pendingCount || 0)), tone: "text-amber-300" },
    { label: "Needs Attention", value: stats.attentionCount ?? ((stats.blockCount || 0) + (stats.warnCount || 0)), tone: "text-rose-300" },
    { label: "Readiness Index", value: `${stats.readinessIndex ?? 0}%`, tone: "text-cyan-300" },
  ];

  const renderScoreRing = (score, ringColor) => {
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    const ringStyle = {
      background: `conic-gradient(${ringColor} ${safeScore * 3.6}deg, rgba(148, 163, 184, 0.25) 0deg)`
    };

    return (
      <div className="relative h-20 w-20 rounded-full p-[5px]" style={ringStyle}>
        <div className={`h-full w-full rounded-full flex items-center justify-center ${isDarkMode ? "bg-slate-900/95" : "bg-white"}`}>
          <div className="text-center leading-none">
            <div className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{safeScore}</div>
            <div className={`text-[10px] uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Score</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`relative isolate rounded-2xl border min-h-0 overflow-hidden flex flex-col h-full ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
      >
        <div className="pointer-events-none absolute -top-14 -right-12 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-fuchsia-500/10 blur-2xl" />

        <div className={`relative p-5 border-b ${isDarkMode ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-gradient-to-br from-white to-slate-50"}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-slate-800 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                  <FaShieldAlt size={16} />
                </span>
                Gatekeeper Command Center
                {isConnected && <FaWifi className="text-emerald-400" size={14} title="Realtime connected" />}
              </h2>
              <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Real-time merge intelligence with clear quality checkpoints and review-ready narratives.
              </p>
              <p className={`text-xs mt-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Pass Rate {stats.passRate ?? 0}% · Avg Gatekeeper Score {stats.avgGatekeeperScore ?? 0}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzing || !repoId}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-2 text-sm font-medium ${isDarkMode
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-700"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-300"
                  } ${analyzing ? "animate-pulse" : ""}`}
                title="Analyze all pending PRs"
              >
                <FaMicroscope size={13} />
                {analyzing ? "Analyzing" : "Analyze All"}
              </button>
              <button
                onClick={handleFullscreenToggle}
                disabled={!repoId}
                className={`p-2.5 rounded-xl transition ${isDarkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:bg-slate-800 disabled:text-slate-500"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
                  }`}
                title={isFullscreen ? "Exit scoring cards full screen" : "Open scoring cards full screen"}
              >
                <FaExpand size={13} />
              </button>
              <button
                onClick={refresh}
                disabled={loading || !repoId}
                className={`p-2.5 rounded-xl transition ${isDarkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:bg-slate-800 disabled:text-slate-500"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
                  } ${loading ? "animate-spin" : ""}`}
                title="Refresh feed"
              >
                <FaSync size={13} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {summaryCards.map((card) => (
              <div key={card.label} className={`rounded-xl px-3 py-2 border ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className={`text-[11px] uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{card.label}</div>
                <div className={`text-lg font-semibold ${card.tone}`}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`px-5 py-4 border-b space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="relative">
            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
            <input
              type="text"
              placeholder="Search by PR title, author, branch, or number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!repoId}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${isDarkMode
                ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400 disabled:bg-slate-900 disabled:text-slate-500"
                : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                } focus:outline-none focus:ring-2 focus:ring-cyan-500`}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>
              <FaFilter size={12} />
            </span>
            {["", "PASS", "BLOCK", "WARN", "PENDING"].map((status) => (
              <button
                key={status || "all"}
                onClick={() => setStatusFilter(status)}
                disabled={!repoId}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusFilter === status
                  ? "bg-cyan-600 text-white"
                  : isDarkMode
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {status || "ALL"}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={feedContainerRef}
          className={`flex-1 min-h-0 overflow-y-auto ${isFullscreen
            ? `${isDarkMode ? "bg-slate-900" : "bg-white"} p-5 md:p-6 space-y-5`
            : "p-4 md:p-5 space-y-4"
            }`}
        >
          {isFullscreen && (
            <div className="sticky top-0 z-20 flex justify-end pb-3">
              <button
                onClick={handleFullscreenToggle}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${isDarkMode
                  ? "bg-slate-800 text-slate-200 border border-slate-700"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                title="Exit scoring cards full screen"
              >
                <FaTimes size={11} />
                Exit Full Screen
              </button>
            </div>
          )}

          {!repoId ? (
            <div className={`text-center py-12 rounded-xl border ${isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
              <FaStream className="mx-auto mb-3 text-cyan-400" size={24} />
              <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                Connect a repository to activate Gatekeeper Command Center.
              </p>
            </div>
          ) : loading && feed.length === 0 ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto"></div>
              <p className={`mt-3 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Loading Gatekeeper feed...</p>
            </div>
          ) : feed.length === 0 ? (
            <p className={`text-sm text-center py-10 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              No Gatekeeper events match your active filters.
            </p>
          ) : (
            feed.map((item, index) => {
              const snapshot = buildGatekeeperSnapshot(item);
              const statusMeta = getStatusMeta(item.status);

              return (
                <div
                  key={item.id || item._id || `${item.type || "item"}-${index}`}
                  ref={index === feed.length - 1 ? lastPRRef : null}
                  onClick={() => openDetail(item)}
                  className={`relative overflow-hidden border rounded-2xl transition-all ${statusMeta.cardClass} ${isPRItem(item) ? "cursor-pointer hover:scale-[1.005]" : "cursor-default"} ${isDarkMode ? "bg-slate-800/80 hover:bg-slate-800" : "bg-white hover:bg-slate-50"}`}
                >
                  <div className={`h-1.5 w-full ${item.status === "PASS" ? "bg-emerald-500" : item.status === "BLOCK" ? "bg-rose-500" : item.status === "WARN" ? "bg-amber-500" : "bg-cyan-500"}`} />

                  {isPRItem(item) ? (
                    <div className="p-4">
                      <div className="flex gap-4 items-start justify-between flex-wrap md:flex-nowrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getItemIcon(item)}
                            <span className={`font-semibold text-base truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                              #{item.prNumber} {item.title}
                            </span>
                            <span className={`text-[11px] px-2 py-1 rounded-full font-semibold uppercase tracking-[0.1em] ${statusMeta.badgeClass}`}>
                              {item?.gatekeeper?.statusLabel || item.status || "PENDING"}
                            </span>
                            <span className={`text-[11px] px-2 py-1 rounded-full ${isDarkMode ? "bg-slate-700 text-cyan-200" : "bg-cyan-100 text-cyan-700"}`}>
                              {snapshot.bandLabel}
                            </span>
                          </div>

                          <div className={`text-xs mb-3 flex items-center gap-2 flex-wrap ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <span>{compactRepoLabel(item.repoId)}</span>
                            <span>•</span>
                            <span>@{item.author || "unknown"}</span>
                            <span>•</span>
                            <span>{item.createdAt || item.timestamp ? format(new Date(item.createdAt || item.timestamp), "HH:mm - MMM d") : "Now"}</span>
                          </div>

                          <div className={`rounded-xl p-3 border ${isDarkMode ? "bg-slate-900/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <div className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{snapshot.headline}</div>
                            <div className={`text-xs mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{snapshot.summary}</div>
                          </div>

                          <div className="mt-3 flex gap-2 text-xs flex-wrap">
                            <span className={`px-2 py-1 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
                              {snapshot.layerSignals.syntax}
                            </span>
                            <span className={`px-2 py-1 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
                              {snapshot.layerSignals.maintainability}
                            </span>
                            <span className={`px-2 py-1 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
                              {snapshot.layerSignals.semantic}
                            </span>
                          </div>

                          {item.analysisResults?.aiScan?.findings?.length > 0 && (
                            <div className={`mt-3 p-2.5 text-xs rounded-xl border flex gap-2 ${isDarkMode ? "bg-slate-900/70 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
                              <FaRobot className="flex-shrink-0 text-fuchsia-400 mt-0.5" />
                              <div>
                                <span className="font-semibold">AI Insight:</span>{" "}
                                {item.analysisResults.aiScan.findings[0]?.message || "Potential risk detected."}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          {renderScoreRing(snapshot.score, statusMeta.ringColor)}
                          <div className={`text-[11px] uppercase tracking-[0.1em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {snapshot.actionLabel}
                          </div>
                          {item.status === "PENDING" && (
                            <button
                              onClick={(e) => handleAnalyzePR(item.prNumber, e)}
                              disabled={analyzingPR === item.prNumber}
                              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 font-semibold ${analyzingPR === item.prNumber
                                ? "bg-cyan-400 text-white animate-pulse"
                                : "bg-cyan-600 hover:bg-cyan-500 text-white"
                                }`}
                            >
                              <FaPlay size={9} />
                              {analyzingPR === item.prNumber ? "Analyzing" : "Analyze"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {getItemIcon(item)}
                            <span className={`font-semibold truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                              {item.title || item.type || "Gatekeeper Alert"}
                            </span>
                            {item.type === "high_risk_file" && (
                              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${item.status === "HIGH_RISK"
                                ? "bg-rose-500/20 text-rose-300"
                                : item.status === "WATCH"
                                  ? "bg-amber-500/20 text-amber-200"
                                  : "bg-emerald-500/20 text-emerald-300"
                                }`}>
                                {item.status || "SAFE"}
                              </span>
                            )}
                          </div>

                          <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                            {item.path || item.description || "No details available"}
                          </p>
                          <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {item.language ? `Language: ${item.language}` : "Language: Unknown"}
                            {item.riskScore !== undefined ? ` • Risk score: ${item.riskScore}` : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{snapshot.score}</div>
                          <div className={`text-[10px] uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {item.type === "high_risk_file" ? "Score" : "Task"}
                          </div>
                        </div>
                      </div>

                      {item.type === "high_risk_file" && (item.statusReasoning || item.analysisResults?.aiScan?.reasoning) && (
                        <div className={`mt-2.5 p-2 text-xs rounded-lg border ${isDarkMode ? "bg-slate-900/70 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                          <span className="font-semibold">Why this file is flagged:</span>{" "}
                          {item.statusReasoning || item.analysisResults?.aiScan?.reasoning}
                        </div>
                      )}

                      <div className={`mt-2 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {item.timestamp ? format(new Date(item.timestamp), "HH:mm - MMM d") : "Now"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && feed.length > 0 && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
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
