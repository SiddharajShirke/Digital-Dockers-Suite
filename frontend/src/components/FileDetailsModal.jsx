import React, { useState, useEffect } from "react";
import {
    FaTimes,
    FaGithub,
    FaExclamationTriangle,
    FaCheckCircle,
    FaCode,
    FaHistory,
    FaChartLine,
    FaPlus,
} from "react-icons/fa";
import { format } from "date-fns";
import api from "../services/api";

/**
 * FileDetailsModal - Comprehensive file analysis view
 * Shows risk breakdown, function complexity, churn history, and PR history
 */
const FileDetailsModal = ({ file, isOpen, onClose, onCreateTask }) => {
    const [loading, setLoading] = useState(false);
    const [fileDetails, setFileDetails] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (isOpen && file?._id) {
            fetchFileDetails();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, file?._id]);

    const fetchFileDetails = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/tech-debt/files/${file._id}`);
            setFileDetails(data);
        } catch (err) {
            console.error("Failed to fetch file details:", err);
            // Fall back to basic file data
            setFileDetails(file);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !file) return null;

    const displayFile = fileDetails || file;
    const riskScore = displayFile.risk?.score || displayFile.risk || 0;
    const riskCategory = displayFile.risk?.category ||
        (riskScore > 70 ? "critical" : riskScore > 40 ? "warning" : "healthy");
    const riskColor = displayFile.risk?.color ||
        (riskScore > 70 ? "#FF4444" : riskScore > 40 ? "#FFAA00" : "#44FF44");

    const getRiskGradient = (score) => {
        const percentage = Math.min(100, Math.max(0, score));
        return `conic-gradient(${riskColor} ${percentage}%, #e5e7eb ${percentage}%)`;
    };

    const tabs = [
        { id: "overview", label: "Overview", icon: FaChartLine },
        { id: "functions", label: "Functions", icon: FaCode },
        { id: "history", label: "History", icon: FaHistory },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">
                            {displayFile.path?.split("/").pop() || "File Details"}
                        </h2>
                        <p className="text-sm text-gray-500 truncate">{displayFile.path}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    ) : (
                        <>
                            {/* Overview Tab */}
                            {activeTab === "overview" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Risk Gauge */}
                                    <div className="bg-gray-50 rounded-xl p-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                            Risk Score
                                        </h3>
                                        <div className="flex items-center gap-6">
                                            <div
                                                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                                                style={{ background: getRiskGradient(riskScore) }}
                                            >
                                                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                                                    <span className="text-2xl font-bold" style={{ color: riskColor }}>
                                                        {riskScore.toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <span
                                                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${riskCategory === "critical"
                                                            ? "bg-red-100 text-red-700"
                                                            : riskCategory === "warning"
                                                                ? "bg-yellow-100 text-yellow-700"
                                                                : "bg-green-100 text-green-700"
                                                        }`}
                                                >
                                                    {riskCategory}
                                                </span>
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Confidence: {displayFile.risk?.confidence || "low"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="bg-gray-50 rounded-xl p-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                            Metrics
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Lines of Code</span>
                                                <span className="font-semibold">{displayFile.loc || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Cyclomatic Complexity</span>
                                                <span className="font-semibold">
                                                    {displayFile.complexity?.cyclomatic || displayFile.complexity || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Churn Rate (90d)</span>
                                                <span className="font-semibold">
                                                    {displayFile.churn?.recentCommits || displayFile.churnRate || 0} commits
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Language</span>
                                                <span className="font-semibold capitalize">
                                                    {displayFile.language || "unknown"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Contributors */}
                                    {displayFile.churn?.topContributors?.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                                Top Contributors
                                            </h3>
                                            <div className="space-y-2">
                                                {displayFile.churn.topContributors.slice(0, 5).map((contributor, idx) => (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <span className="text-gray-600 truncate">
                                                            {contributor.name || contributor.email}
                                                        </span>
                                                        <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                                            {contributor.commits} commits
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    {displayFile.recommendations?.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                                AI Recommendations
                                            </h3>
                                            <div className="space-y-2">
                                                {displayFile.recommendations.slice(0, 3).map((rec, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg text-sm ${rec.priority === "high"
                                                                ? "bg-red-50 text-red-700"
                                                                : rec.priority === "medium"
                                                                    ? "bg-yellow-50 text-yellow-700"
                                                                    : "bg-blue-50 text-blue-700"
                                                            }`}
                                                    >
                                                        <span className="font-medium capitalize">[{rec.type}]</span>{" "}
                                                        {rec.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Functions Tab */}
                            {activeTab === "functions" && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                        Function Complexity ({displayFile.functions?.length || 0} functions)
                                    </h3>
                                    {displayFile.functions?.length > 0 ? (
                                        <div className="space-y-2">
                                            {displayFile.functions
                                                .sort((a, b) => b.complexity - a.complexity)
                                                .map((fn, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${fn.complexity > 15
                                                                        ? "bg-red-100 text-red-700"
                                                                        : fn.complexity > 10
                                                                            ? "bg-yellow-100 text-yellow-700"
                                                                            : "bg-green-100 text-green-700"
                                                                    }`}
                                                            >
                                                                {fn.complexity}
                                                            </span>
                                                            <div>
                                                                <span className="font-mono text-sm">{fn.name}</span>
                                                                <span className="text-xs text-gray-400 ml-2">
                                                                    Lines {fn.startLine}-{fn.endLine}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {fn.complexity > 10 && (
                                                            <FaExclamationTriangle
                                                                className="text-yellow-500"
                                                                title="High complexity"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">
                                            No function-level analysis available
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* History Tab */}
                            {activeTab === "history" && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                        PR History
                                    </h3>
                                    {fileDetails?.recentPRs?.length > 0 ? (
                                        <div className="space-y-3">
                                            {fileDetails.recentPRs.map((pr, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {pr.status === "PASS" ? (
                                                            <FaCheckCircle className="text-green-500" />
                                                        ) : pr.status === "BLOCK" ? (
                                                            <FaExclamationTriangle className="text-red-500" />
                                                        ) : (
                                                            <FaHistory className="text-gray-400" />
                                                        )}
                                                        <div>
                                                            <span className="font-medium">PR #{pr.prNumber}</span>
                                                            <span className="text-gray-500 ml-2 text-sm truncate">
                                                                {pr.title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {format(new Date(pr.createdAt), "MMM d, yyyy")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">
                                            No PR history for this file
                                        </p>
                                    )}

                                    {/* Historical Metrics */}
                                    {displayFile.historicalMetrics?.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                                Complexity Trend
                                            </h3>
                                            <div className="h-32 flex items-end gap-1">
                                                {displayFile.historicalMetrics.slice(-12).map((metric, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex-1 bg-indigo-200 rounded-t hover:bg-indigo-300 transition-colors"
                                                        style={{
                                                            height: `${Math.min(100, (metric.complexity || 0) * 2)}%`,
                                                        }}
                                                        title={`Complexity: ${metric.complexity}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <a
                        href={`https://github.com/${displayFile.repoId}/blob/main/${displayFile.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <FaGithub /> View on GitHub
                    </a>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            Close
                        </button>
                        {riskScore > 50 && onCreateTask && (
                            <button
                                onClick={() => onCreateTask(displayFile)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <FaPlus size={12} /> Create Refactor Task
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileDetailsModal;
