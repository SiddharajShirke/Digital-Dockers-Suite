import React, { useState } from "react";
import {
  FaTimes,
  FaExternalLinkAlt,
  FaCode,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaRobot,
  FaGithub,
  FaBrain,
  FaLayerGroup,
  FaCog,
  FaClipboardCheck,
} from "react-icons/fa";
import { format } from "date-fns";

const PRDetailModal = ({ pr, onClose, isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState("layers");

  if (!pr) return null;

  const getSeverityColor = (severity) => {
    if (severity >= 8) return "text-red-600 bg-red-100";
    if (severity >= 5) return "text-yellow-600 bg-yellow-100";
    return "text-blue-600 bg-blue-100";
  };

  const getLayerStatus = (layer) => {
    if (!pr.analysisResults) return { status: "pending", icon: FaCog };

    switch (layer) {
      case "syntax": {
        const lintErrors = pr.analysisResults?.lint?.errors || 0;
        return lintErrors === 0
          ? { status: "pass", icon: FaCheckCircle, color: "text-green-500" }
          : { status: "fail", icon: FaTimesCircle, color: "text-red-500" };
      }
      case "complexity": {
        const delta = pr.analysisResults?.complexity?.healthScoreDelta || 0;
        return delta >= 0
          ? { status: "pass", icon: FaCheckCircle, color: "text-green-500" }
          : { status: "fail", icon: FaTimesCircle, color: "text-red-500" };
      }
      case "semantic": {
        const verdict = pr.analysisResults?.aiScan?.verdict;
        if (verdict === "GOOD") return { status: "pass", icon: FaCheckCircle, color: "text-green-500" };
        if (verdict === "BAD") return { status: "fail", icon: FaTimesCircle, color: "text-red-500" };
        if (verdict === "RISKY") return { status: "warn", icon: FaExclamationTriangle, color: "text-yellow-500" };
        return { status: "warn", icon: FaExclamationTriangle, color: "text-yellow-500" };
      }
      default:
        return { status: "pending", icon: FaCog, color: "text-gray-400" };
    }
  };

  const normalizeProviderValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "none" || normalized === "unknown" || normalized === "n/a" || normalized === "null") {
      return null;
    }
    return String(value).trim();
  };

  const semanticVerdictLabel = (verdict) => {
    const normalized = String(verdict || "").toUpperCase();
    if (normalized === "GOOD") return "Healthy";
    if (normalized === "BAD") return "High Risk";
    if (normalized === "RISKY") return "Needs Review";
    return "Pending Review";
  };

  const aiProvider = normalizeProviderValue(pr.analysisResults?.aiScan?.provider);
  const aiModel = normalizeProviderValue(pr.analysisResults?.aiScan?.model);
  const aiEngineLabel = aiProvider || "NVIDIA";

  const analysisLayers = [
    {
      id: "syntax",
      name: "Code Quality and Style",
      icon: FaClipboardCheck,
      description: "Lint, formatting, and style guardrails",
      details: pr.analysisResults?.lint || {},
    },
    {
      id: "complexity",
      name: "Maintainability Impact",
      icon: FaLayerGroup,
      description: "Cyclomatic complexity and health score movement",
      details: pr.analysisResults?.complexity || {},
    },
    {
      id: "semantic",
      name: "AI Risk Review",
      icon: FaBrain,
      description: "Semantic review for logic and hidden implementation risk",
      details: pr.analysisResults?.aiScan || {},
    },
  ];

  const fileChangeMetrics = pr.analysisResults?.complexity?.fileChanges || [];

  const tabs = [
    { id: "layers", label: "Analysis Layers", icon: FaLayerGroup },
    { id: "findings", label: "AI Findings", icon: FaRobot },
    { id: "files", label: "Files", icon: FaCode },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden m-4 ${isDarkMode ? "bg-slate-800" : "bg-white"
          }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-2xl font-bold">#{pr.prNumber}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${pr.status === "PASS"
                      ? "bg-green-500"
                      : pr.status === "BLOCK"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                >
                  {pr.status}
                </span>
                {pr.status === "PASS" && (
                  <FaCheckCircle className="text-green-300" size={20} />
                )}
                {pr.status === "BLOCK" && (
                  <FaTimesCircle className="text-red-300" size={20} />
                )}
              </div>
              <h2 className="text-xl font-semibold mb-2 truncate">{pr.title}</h2>
              <div className="flex items-center gap-4 text-sm opacity-90 flex-wrap">
                <span>@{pr.author}</span>
                <span>•</span>
                <span>{pr.branch || pr.repoId}</span>
                <span>•</span>
                <span>
                  {pr.createdAt
                    ? format(new Date(pr.createdAt), "MMM d, yyyy HH:mm")
                    : "Just now"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition flex-shrink-0"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Health Score Bar */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${(pr.healthScore?.current || 0) > 70
                    ? "bg-green-400"
                    : (pr.healthScore?.current || 0) > 40
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  }`}
                style={{ width: `${pr.healthScore?.current || 0}%` }}
              />
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">
                {pr.healthScore?.current || 0}
              </span>
              <span className="text-sm opacity-75 ml-1">
                ({pr.healthScore?.delta >= 0 ? "+" : ""}
                {pr.healthScore?.delta || 0})
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`border-b ${isDarkMode ? "border-slate-700" : "border-gray-200"
            }`}
        >
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition ${activeTab === tab.id
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : isDarkMode
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          className={`p-6 overflow-y-auto max-h-[calc(90vh-280px)] ${isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
        >
          {/* Layers Tab - Layer by Layer Analysis */}
          {activeTab === "layers" && (
            <div className="space-y-4">
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"
                  } mb-4`}
              >
                Gatekeeper evaluates each PR across three checkpoints before merge:
              </p>

              {analysisLayers.map((layer, idx) => {
                const status = getLayerStatus(layer.id);
                const StatusIcon = status.icon;

                return (
                  <div
                    key={layer.id}
                    className={`border rounded-xl p-5 transition ${isDarkMode
                        ? "bg-slate-700/50 border-slate-600"
                        : "bg-gray-50 border-gray-200"
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Layer Number */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${status.status === "pass"
                            ? "bg-green-100 text-green-700"
                            : status.status === "fail"
                              ? "bg-red-100 text-red-700"
                              : status.status === "warn"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-200 text-gray-500"
                          }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Layer Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <layer.icon
                            className={isDarkMode ? "text-indigo-400" : "text-indigo-600"}
                          />
                          <h3 className="font-semibold text-lg">{layer.name}</h3>
                          <StatusIcon className={status.color} />
                        </div>
                        <p
                          className={`text-sm mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                        >
                          {layer.description}
                        </p>

                        {/* Layer-specific details */}
                        {layer.id === "syntax" && (
                          <div className="flex gap-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full ${(layer.details.errors || 0) === 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                                }`}
                            >
                                Blocking errors: {layer.details.errors || 0}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full ${isDarkMode
                                  ? "bg-slate-600 text-gray-300"
                                  : "bg-gray-200 text-gray-700"
                                }`}
                            >
                                Warnings to review: {layer.details.warnings || 0}
                            </span>
                          </div>
                        )}

                        {layer.id === "complexity" && (
                          <div className="flex gap-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full ${(layer.details.healthScoreDelta || 0) >= 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                                }`}
                            >
                                Health impact:{" "}
                              {(layer.details.healthScoreDelta || 0) >= 0 ? "+" : ""}
                              {layer.details.healthScoreDelta || 0}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full ${isDarkMode
                                  ? "bg-slate-600 text-gray-300"
                                  : "bg-gray-200 text-gray-700"
                                }`}
                            >
                                Files assessed: {layer.details.fileChanges?.length || 0}
                            </span>
                          </div>
                        )}

                        {layer.id === "semantic" && (
                          <div className="flex gap-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full ${layer.details.verdict === "GOOD"
                                  ? "bg-green-100 text-green-700"
                                  : layer.details.verdict === "BAD"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                              AI verdict: {semanticVerdictLabel(layer.details.verdict)}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full ${isDarkMode
                                  ? "bg-slate-600 text-gray-300"
                                  : "bg-gray-200 text-gray-700"
                                }`}
                            >
                                Insights found: {layer.details.findings?.length || 0}
                            </span>
                              <span
                                className={`px-3 py-1 rounded-full ${isDarkMode
                                    ? "bg-slate-600 text-indigo-200"
                                    : "bg-indigo-100 text-indigo-700"
                                  }`}
                              >
                                Engine: {aiEngineLabel}
                                {aiModel ? ` / ${aiModel}` : ""}
                              </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Final Verdict */}
              <div
                className={`mt-6 p-4 rounded-xl text-center ${pr.status === "PASS"
                    ? "bg-green-100 border-2 border-green-300"
                    : pr.status === "BLOCK"
                      ? "bg-red-100 border-2 border-red-300"
                      : "bg-yellow-100 border-2 border-yellow-300"
                  }`}
              >
                <p className="font-semibold text-lg">
                  {pr.status === "PASS"
                    ? "Merge-ready: all quality gates passed"
                    : pr.status === "BLOCK"
                      ? "Blocked: address critical issues before merging"
                      : "Attention required: review warnings before merge"}
                </p>
              </div>
            </div>
          )}

          {/* Findings Tab */}
          {activeTab === "findings" && (
            <div className="space-y-4">
              {(pr.analysisResults?.aiScan?.provider || pr.analysisResults?.aiScan?.model) && (
                <div
                  className={`p-3 rounded-lg border text-sm ${isDarkMode
                    ? "bg-slate-700/40 border-slate-600 text-gray-300"
                    : "bg-indigo-50 border-indigo-200 text-indigo-800"
                    }`}
                >
                  <span className="font-semibold">AI Review Engine:</span>{" "}
                  {aiEngineLabel}
                  {aiModel ? ` / ${aiModel}` : ""}
                  {pr.analysisResults?.aiScan?.fallbackUsed ? " (fallback used)" : ""}
                </div>
              )}

              {pr.analysisResults?.aiScan?.findings?.length > 0 ? (
                pr.analysisResults.aiScan.findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${isDarkMode
                        ? "bg-slate-700/50 border-slate-600"
                        : "bg-white border-gray-200"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(
                          finding.severity || 5
                        )}`}
                      >
                        {finding.confidence || "medium"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium mb-1">{finding.message}</p>
                        {finding.suggestion && (
                          <div
                            className={`mt-2 p-3 rounded-lg border ${isDarkMode
                                ? "bg-yellow-900/30 border-yellow-700 text-yellow-200"
                                : "bg-yellow-50 border-yellow-200 text-yellow-800"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm">💡 {finding.suggestion}</p>
                              <button
                                onClick={() =>
                                  alert(
                                    `Applying AI Fix via GitHub API...\n\nCommit: "Fix: ${finding.message}"`
                                  )
                                }
                                className="flex-shrink-0 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                              >
                                Apply Fix
                              </button>
                            </div>
                          </div>
                        )}
                        {finding.file && (
                          <p
                            className={`text-xs mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                          >
                            <FaCode className="inline mr-1" />
                            {finding.file}
                            {Array.isArray(finding.lineRange) && finding.lineRange.length >= 2
                              ? `:${finding.lineRange[0]}-${finding.lineRange[1]}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <FaCheckCircle
                    className={`mx-auto mb-3 ${isDarkMode ? "text-gray-600" : "text-gray-300"
                      }`}
                    size={48}
                  />
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                    No major semantic risks were flagged by AI for this PR.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <div>
              <h3 className="font-semibold mb-3">
                Changed Files ({fileChangeMetrics.length || pr.filesChanged?.length || 0})
              </h3>
              <div className="space-y-2">
                {fileChangeMetrics.length > 0
                  ? fileChangeMetrics.map((file, idx) => (
                    <div
                      key={`${file.file || "file"}-${idx}`}
                      className={`p-3 rounded-lg transition ${isDarkMode
                        ? "bg-slate-700/50 hover:bg-slate-700"
                        : "bg-gray-50 hover:bg-gray-100"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <FaCode
                          className={isDarkMode ? "text-gray-500" : "text-gray-400"}
                        />
                        <span className="font-mono text-sm flex-1 truncate">
                          {file.file}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${isDarkMode ? "bg-slate-600 text-gray-200" : "bg-gray-200 text-gray-800"}`}>
                          Complexity Score: {file.complexity || 0}
                        </span>
                        <span className={`px-2 py-1 rounded ${(file.riskScore || 0) > 70 ? "bg-red-100 text-red-700" : (file.riskScore || 0) > 40 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                          Risk Score: {file.riskScore || 0}
                        </span>
                        <span className={`px-2 py-1 rounded ${isDarkMode ? "bg-slate-600 text-gray-200" : "bg-gray-200 text-gray-800"}`}>
                          Lines of Code: {file.loc || 0}
                        </span>
                        <span className={`px-2 py-1 rounded ${isDarkMode ? "bg-slate-600 text-gray-200" : "bg-gray-200 text-gray-800"}`}>
                          Diff: +{file.additions || 0} / -{file.deletions || 0}
                        </span>
                        <span className={`px-2 py-1 rounded ${(file.lintErrors || 0) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          Lint Signals: {file.lintErrors || 0} errors, {file.lintWarnings || 0} warnings
                        </span>
                      </div>
                    </div>
                  ))
                  : pr.filesChanged?.map((file, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg transition ${isDarkMode
                        ? "bg-slate-700/50 hover:bg-slate-700"
                        : "bg-gray-50 hover:bg-gray-100"
                        }`}
                    >
                      <FaCode
                        className={isDarkMode ? "text-gray-500" : "text-gray-400"}
                      />
                      <span className="font-mono text-sm flex-1 truncate">
                        {file}
                      </span>
                    </div>
                  ))}
                {fileChangeMetrics.length === 0 && (!pr.filesChanged || pr.filesChanged.length === 0) && (
                  <p
                    className={`text-center py-8 ${isDarkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                  >
                    No file-level metrics are available for this PR yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${isDarkMode
              ? "border-slate-700 bg-slate-800/50"
              : "border-gray-200 bg-gray-50"
            }`}
        >
          {pr.url ? (
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <FaGithub /> View on GitHub
              <FaExternalLinkAlt size={10} />
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode
                ? "bg-slate-700 text-gray-200 hover:bg-slate-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PRDetailModal;

