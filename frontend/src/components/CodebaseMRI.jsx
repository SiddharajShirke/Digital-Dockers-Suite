import React, { useEffect, useRef, useState, useCallback } from "react";
import { io as socketIo } from "socket.io-client";
import api from "../services/api";
import CreateRefactorTaskModal from "./CreateRefactorTaskModal";
import FileDetailsModal from "./FileDetailsModal";
import ScatterPlot from "./ScatterPlot";
import CodebaseConditionCharts from "./CodebaseConditionCharts";
import HotspotInsightCharts from "./HotspotInsightCharts";
import {
  FaExpand,
  FaSearch,
  FaChartBar,
  FaChartLine,
  FaChartPie,
  FaSync,
  FaGithub,
} from "react-icons/fa";

const CodebaseMRI = ({ isDarkMode, repoId }) => {
  const containerRef = useRef();
  const [data, setData] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("condition");
  const [scanStatus, setScanStatus] = useState(null); // { status, progress, currentFile }
  const [isLoading, setIsLoading] = useState(false);

  // Fetch hotspot data
  const fetchData = useCallback(async () => {
    if (!repoId) {
      setData([]);
      setFilteredData([]);
      setPullRequests([]);
      setIssues([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = { repoId };
      const [{ data: responseData }, { data: prResponseData }, { data: issuesResponseData }] = await Promise.all([
        api.get("/tech-debt/hotspots", { params }),
        api.get("/tech-debt/prs", {
          params: {
            ...params,
            all: true,
            sort: "asc",
            limit: 5000,
          },
        }),
        api.get("/tech-debt/tasks", { params }),
      ]);

      const validData = (responseData || []).map((d) => ({
        ...d,
        loc: d.loc || 10,
        risk: d.risk?.score ?? d.risk ?? 0,
        complexity: d.complexity?.cyclomatic ?? d.complexity ?? 0,
        churnRate: d.churn?.recentCommits ?? d.churnRate ?? 0,
      }));

      setData(validData);
      setFilteredData(validData);
      setPullRequests(Array.isArray(prResponseData) ? prResponseData : []);
      setIssues(Array.isArray(issuesResponseData) ? issuesResponseData : []);
    } catch (err) {
      console.error("MRI Fetch Error", err);
      setData([]);
      setFilteredData([]);
      setPullRequests([]);
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [repoId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket listener for real-time updates
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "https://localhost:5002";
    const socket = socketIo(API_URL, { transports: ["websocket", "polling"], withCredentials: true, secure: true, rejectUnauthorized: false });

    socket.on("connect", () => {
      console.log("[MRI] Socket connected");
    });

    socket.on("scan:status", (data) => {
      if (data.repoId === repoId || !repoId) {
        setScanStatus(data);
        if (data.status === "complete") {
          // Refresh data when scan completes
          setTimeout(() => fetchData(), 500);
        }
      }
    });

    socket.on("scan:progress", (data) => {
      if (data.repoId === repoId || !repoId) {
        setScanStatus({
          status: "analyzing",
          progress: data.percentage,
          currentFile: data.currentFile
        });
      }
    });

    socket.on("metrics:updated", (data) => {
      if (data.repoId === repoId || !repoId) {
        console.log("[MRI] Metrics updated, refreshing...");
        fetchData();
        setScanStatus(null);
      }
    });

    socket.on("scan:error", (data) => {
      if (data.repoId === repoId || !repoId) {
        console.error("[MRI] Scan error:", data.error);
        setScanStatus({
          status: "error",
          error: data.error
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [repoId, fetchData]);

  // Filter data based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredData(data.filter((d) => d.path?.toLowerCase().includes(term)));
    }
  }, [searchTerm, data]);

const handleFullscreen = useCallback(() => {
  if (containerRef.current) {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
}, []);

const handleTaskCreated = (task) => {
  console.log("Task created:", task);
  setShowTaskModal(false);
  setSelectedNode(null);
};

const handleCreateTaskFromModal = () => {
  setShowFileModal(false);
  setShowTaskModal(true);
};

return (
  <>
    <div
      ref={containerRef}
      className={`shadow rounded-lg p-6 h-full flex flex-col transition-colors ${isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white"
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2
            className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"
              }`}
          >
            Codebase MRI
          </h2>
          <p
            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
          >
            Size = LOC, Color = Risk (Complexity × Churn)
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
            <span className="font-semibold">{filteredData.length}</span> files
          </span>
          <span className="text-red-500">
            <span className="font-semibold">
              {filteredData.filter((d) => d.risk > 70).length}
            </span>{" "}
            hotspots
          </span>
        </div>
      </div>

      {/* Scan Progress Indicator */}
      {scanStatus && scanStatus.status !== "complete" && (
        <div
          className={`mb-3 p-3 rounded-lg border ${
            scanStatus.status === "error"
              ? isDarkMode
                ? "bg-red-900/30 border-red-700"
                : "bg-red-50 border-red-200"
              : isDarkMode
              ? "bg-slate-700/50 border-slate-600"
              : "bg-indigo-50 border-indigo-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {scanStatus.status === "error" ? (
                <span className="text-red-500">⚠</span>
              ) : (
                <FaSync
                  className={`animate-spin ${
                    isDarkMode ? "text-indigo-400" : "text-indigo-600"
                  }`}
                  size={12}
                />
              )}
              <span
                className={`text-sm font-medium ${
                  scanStatus.status === "error"
                    ? "text-red-500"
                    : isDarkMode
                    ? "text-gray-200"
                    : "text-gray-700"
                }`}
              >
                {scanStatus.status === "error"
                  ? `Error: ${scanStatus.error || "Analysis failed"}`
                  : scanStatus.status === "cloning"
                  ? "Cloning repository..."
                  : scanStatus.status === "analyzing"
                  ? "Analyzing codebase..."
                  : "Processing..."}
              </span>
            </div>
            {scanStatus.status !== "error" && (
              <span
                className={`text-sm font-bold ${
                  isDarkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                {scanStatus.progress || 0}%
              </span>
            )}
          </div>
          {scanStatus.status !== "error" && (
            <div
              className={`w-full h-2 rounded-full overflow-hidden ${
                isDarkMode ? "bg-slate-600" : "bg-gray-200"
              }`}
            >
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${scanStatus.progress || 0}%` }}
              />
            </div>
          )}
          {scanStatus.currentFile && scanStatus.status !== "error" && (
            <p
              className={`mt-1 text-xs truncate ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {scanStatus.currentFile}
            </p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <FaSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            size={12}
          />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border ${isDarkMode
              ? "bg-slate-700 border-slate-600 text-white placeholder-gray-400"
              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
        </div>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className={`p-1.5 rounded-lg border ${isDarkMode
            ? "border-slate-600 text-gray-300 hover:bg-slate-700"
            : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          title="Fullscreen"
        >
          <FaExpand size={12} />
        </button>

        {/* View Mode Toggle */}
        <div
          className={`flex items-center rounded-lg border ml-2 ${isDarkMode ? "border-slate-600" : "border-gray-300"
            }`}
        >
          <button
            onClick={() => setViewMode("condition")}
            className={`p-1.5 flex items-center gap-1 text-xs ${viewMode === "condition"
              ? "bg-indigo-600 text-white"
              : isDarkMode
                ? "text-gray-300 hover:bg-slate-700"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Issues & PR Health"
          >
            <FaChartBar size={10} />
          </button>
          <button
            onClick={() => setViewMode("scatter")}
            className={`p-1.5 border-l flex items-center gap-1 text-xs ${viewMode === "scatter"
              ? "bg-indigo-600 text-white"
              : isDarkMode
                ? "border-slate-600 text-gray-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="Complexity vs Churn"
          >
            <FaChartLine size={10} />
          </button>
          <button
            onClick={() => setViewMode("bubble")}
            className={`p-1.5 border-l flex items-center gap-1 text-xs ${viewMode === "bubble"
              ? "bg-indigo-600 text-white"
              : isDarkMode
                ? "border-slate-600 text-gray-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="Hotspot Insights"
          >
            <FaChartPie size={10} />
          </button>
        </div>
      </div>

      {/* Visualization Area */}
      <div
        className={`flex-grow border rounded relative overflow-hidden min-h-[300px] ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50"
          }`}
      >
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <FaSync className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-sm">Loading files...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !repoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <FaGithub className="mx-auto mb-2" size={32} />
              <p className="text-sm font-medium">Connect a repository</p>
              <p className="text-xs mt-1">Paste a GitHub URL above to analyze</p>
            </div>
          </div>
        )}

        {/* No Files Found */}
        {!isLoading && repoId && filteredData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-sm font-medium">No files found</p>
              <p className="text-xs mt-1">
                {data.length === 0 
                  ? 'Analysis may still be in progress. Try refreshing.' 
                  : 'No files match your search.'}
              </p>
            </div>
          </div>
        )}

        {/* Hotspot Insight View */}
        {viewMode === "bubble" && filteredData.length > 0 && (
          <div className="p-4 h-full overflow-auto">
            <HotspotInsightCharts
              files={filteredData}
              isDarkMode={isDarkMode}
              onFileSelect={(file) => {
                const found = filteredData.find((entry) => entry.path === file.path);
                if (found) {
                  setSelectedNode(found);
                }
              }}
            />
          </div>
        )}

        {/* Code Condition View (Commit + PR Insights) */}
        {viewMode === "condition" && filteredData.length > 0 && (
          <div className="p-4 h-full overflow-auto">
            <CodebaseConditionCharts
              files={filteredData}
              pullRequests={pullRequests}
              issues={issues}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* Scatter Plot View */}
        {viewMode === "scatter" && filteredData.length > 0 && (
          <div className="p-4 h-full overflow-auto">
            <ScatterPlot
              data={filteredData}
              isDarkMode={isDarkMode}
              onPointClick={(point) => {
                const file = filteredData.find(d => d.path === point.path);
                if (file) {
                  setSelectedNode(file);
                }
              }}
            />
          </div>
        )}

        {/* Selected Node Panel */}
        {selectedNode && (
          <div
            className={`absolute top-2 right-2 backdrop-blur p-4 rounded-lg shadow border max-w-xs ${isDarkMode
              ? "bg-slate-800/95 text-white border-slate-600"
              : "bg-white/95 text-gray-800 border-gray-200"
              }`}
          >
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-1 right-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <h3 className="font-bold text-sm truncate mb-2 pr-4">
              {selectedNode.path?.split("/").pop()}
            </h3>
            <p
              className={`text-xs truncate mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
            >
              {selectedNode.path}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Risk Score:</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      selectedNode.risk > 70
                        ? "#ef4444"
                        : selectedNode.risk > 40
                          ? "#f59e0b"
                          : "#22c55e",
                  }}
                >
                  {selectedNode.risk.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Complexity:</span>
                <span>{selectedNode.complexity.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Churn (90d):</span>
                <span>{selectedNode.churnRate.toFixed(0)} commits</span>
              </div>
              <div className="flex justify-between">
                <span>LOC:</span>
                <span>{selectedNode.loc.toFixed(0)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowFileModal(true)}
                className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-xs font-semibold hover:bg-gray-300"
              >
                Details
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex-1 bg-indigo-600 text-white py-1.5 rounded text-xs font-semibold hover:bg-indigo-700"
              >
                Create Task
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!filteredData.length && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
              {data.length
                ? "No files match your search"
                : "No hotspot data available. Connect a repository to start."}
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Create Task Modal */}
    {showTaskModal && selectedNode && (
      <CreateRefactorTaskModal
        file={selectedNode}
        onClose={() => setShowTaskModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    )}

    {/* File Details Modal */}
    <FileDetailsModal
      file={selectedNode}
      isOpen={showFileModal}
      onClose={() => setShowFileModal(false)}
      onCreateTask={handleCreateTaskFromModal}
    />
  </>
);
};

export default CodebaseMRI;

