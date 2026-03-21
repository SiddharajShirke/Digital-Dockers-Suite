import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { io as socketIo } from "socket.io-client";
import api from "../services/api";
import CreateRefactorTaskModal from "./CreateRefactorTaskModal";
import FileDetailsModal from "./FileDetailsModal";
import HeatmapMatrix from "./HeatmapMatrix";
import ScatterPlot from "./ScatterPlot";
import {
  FaSearchPlus,
  FaSearchMinus,
  FaExpand,
  FaRedo,
  FaSearch,
  FaInfoCircle,
  FaCircle,
  FaTh,
  FaChartLine,
  FaSync,
  FaGithub,
} from "react-icons/fa";

const CodebaseMRI = ({ isDarkMode, repoId }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const zoomRef = useRef();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLegend, setShowLegend] = useState(true);
  const [viewMode, setViewMode] = useState("bubble");
  const [scanStatus, setScanStatus] = useState(null); // { status, progress, currentFile }
  const [isLoading, setIsLoading] = useState(false);

  // Fetch hotspot data
  const fetchData = useCallback(async () => {
    if (!repoId) {
      setData([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = { repoId };
      const { data: responseData } = await api.get("/tech-debt/hotspots", { params });
      const validData = (responseData || []).map((d) => ({
        ...d,
        loc: d.loc || 10,
        risk: d.risk?.score ?? d.risk ?? 0,
        complexity: d.complexity?.cyclomatic ?? d.complexity ?? 0,
        churnRate: d.churn?.recentCommits ?? d.churnRate ?? 0,
      }));
      setData(validData);
      setFilteredData(validData);
    } catch (err) {
      console.error("MRI Fetch Error", err);
      setData([]);
      setFilteredData([]);
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
    const API_URL = import.meta.env.VITE_API_URL || "https://localhost:5001";
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

// D3 visualization
useEffect(() => {
  if (!filteredData.length) {
    // Clear SVG if no data
    d3.select(svgRef.current).selectAll("*").remove();
    return;
  }

  console.log('[MRI] Rendering', filteredData.length, 'files');

  const width = 600;
  const height = 400;

  const svg = d3.select(svgRef.current)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Setup zoom
  const zoom = d3
    .zoom()
    .scaleExtent([0.5, 4])
    .on("zoom", (event) => {
      svg.select("g.main-group").attr("transform", event.transform);
    });

  zoomRef.current = zoom;
  svg.call(zoom);

  svg.selectAll("*").remove();

  const g = svg.append("g").attr("class", "main-group");

  // Color Scale: Green (Low Risk) -> Yellow (Med) -> Red (High)
  const colorScale = d3
    .scaleLinear()
    .domain([0, 40, 70, 100])
    .range(["#22c55e", "#84cc16", "#f59e0b", "#ef4444"]);

  // Size Scale: Based on LOC (sqrt) - minimum size of 8, max of 40
  const maxLoc = Math.max(...filteredData.map(d => d.loc || 10), 100);
  const sizeScale = d3.scaleSqrt().domain([0, maxLoc]).range([8, 40]);

  const simulation = d3
    .forceSimulation(filteredData)
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius((d) => sizeScale(d.loc || 10) + 3)
    );

  // Create nodes
  const nodes = g
    .selectAll("circle")
    .data(filteredData)
    .join("circle")
    .attr("r", (d) => sizeScale(d.loc || 10))
    .attr("fill", (d) => colorScale(d.risk || 0))
    .attr("stroke", (d) =>
      selectedNode?._id === d._id
        ? isDarkMode
          ? "#fff"
          : "#1e40af"
        : isDarkMode
          ? "#333"
          : "#fff"
    )
    .attr("stroke-width", (d) => (selectedNode?._id === d._id ? 3 : 1.5))
    .style("cursor", "pointer")
    .style("filter", (d) =>
      d.risk > 70 ? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))" : "none"
    )
    .on("click", (event, d) => setSelectedNode(d))
    .on("dblclick", (event, d) => {
      setSelectedNode(d);
      setShowFileModal(true);
    });

  // Add tooltips
  nodes.append("title").text((d) => `${d.path}\nRisk: ${(d.risk || 0).toFixed(0)}\nLOC: ${d.loc || 0}`);

  simulation.on("tick", () => {
    nodes
      .attr("cx", (d) => Math.max(20, Math.min(width - 20, d.x)))
      .attr("cy", (d) => Math.max(20, Math.min(height - 20, d.y)));
  });

  return () => simulation.stop();
}, [filteredData, isDarkMode, selectedNode]);

// Zoom controls
const handleZoomIn = useCallback(() => {
  if (svgRef.current && zoomRef.current) {
    d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3);
  }
}, []);

const handleZoomOut = useCallback(() => {
  if (svgRef.current && zoomRef.current) {
    d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7);
  }
}, []);

const handleReset = useCallback(() => {
  if (svgRef.current && zoomRef.current) {
    d3.select(svgRef.current)
      .transition()
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }
}, []);

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

        {/* Zoom controls */}
        <div
          className={`flex items-center rounded-lg border ${isDarkMode ? "border-slate-600" : "border-gray-300"
            }`}
        >
          <button
            onClick={handleZoomIn}
            className={`p-1.5 ${isDarkMode
              ? "text-gray-300 hover:bg-slate-700"
              : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Zoom in"
          >
            <FaSearchPlus size={12} />
          </button>
          <button
            onClick={handleZoomOut}
            className={`p-1.5 border-l ${isDarkMode
              ? "border-slate-600 text-gray-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="Zoom out"
          >
            <FaSearchMinus size={12} />
          </button>
          <button
            onClick={handleReset}
            className={`p-1.5 border-l ${isDarkMode
              ? "border-slate-600 text-gray-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="Reset view"
          >
            <FaRedo size={12} />
          </button>
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

        {/* Legend toggle */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-1.5 rounded-lg border ${showLegend
            ? "bg-indigo-100 border-indigo-300 text-indigo-600"
            : isDarkMode
              ? "border-slate-600 text-gray-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          title="Toggle legend"
        >
          <FaInfoCircle size={12} />
        </button>

        {/* View Mode Toggle */}
        <div
          className={`flex items-center rounded-lg border ml-2 ${isDarkMode ? "border-slate-600" : "border-gray-300"
            }`}
        >
          <button
            onClick={() => setViewMode("bubble")}
            className={`p-1.5 flex items-center gap-1 text-xs ${viewMode === "bubble"
              ? "bg-indigo-600 text-white"
              : isDarkMode
                ? "text-gray-300 hover:bg-slate-700"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Bubble View"
          >
            <FaCircle size={10} />
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={`p-1.5 border-l flex items-center gap-1 text-xs ${viewMode === "heatmap"
              ? "bg-indigo-600 text-white"
              : isDarkMode
                ? "border-slate-600 text-gray-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="Heatmap View"
          >
            <FaTh size={10} />
          </button>
          <button
            onClick={() => setViewMode("scatter")}
            className={`p-1.5 border-l flex items-center gap-1 text-xs ${viewMode === "scatter"
              ? "bg-indigo-600 text-white"
              : isDarkMode
                ? "border-slate-600 text-gray-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="Scatter Plot"
          >
            <FaChartLine size={10} />
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

        {/* Bubble View (default) */}
        {viewMode === "bubble" && filteredData.length > 0 && (
          <svg ref={svgRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} preserveAspectRatio="xMidYMid meet" />
        )}

        {/* Heatmap View */}
        {viewMode === "heatmap" && filteredData.length > 0 && (
          <div className="p-4 h-full overflow-auto">
            <HeatmapMatrix
              data={filteredData}
              isDarkMode={isDarkMode}
              onCellClick={(cell) => {
                console.log("Heatmap cell clicked:", cell);
              }}
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

        {/* Legend */}
        {showLegend && (
          <div
            className={`absolute bottom-2 left-2 p-2 rounded-lg text-xs ${isDarkMode
              ? "bg-slate-800/90 text-gray-300"
              : "bg-white/90 text-gray-600"
              } border ${isDarkMode ? "border-slate-600" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>0-40</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>40-70</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>70+</span>
              </div>
            </div>
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

