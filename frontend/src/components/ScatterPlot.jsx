import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { FaCubes, FaHistory, FaExclamationTriangle } from "react-icons/fa";

/**
 * ScatterPlot - Complexity × Churn visualization
 * Files in upper-right quadrant are high-risk hotspots
 */
const ScatterPlot = ({ data = [], isDarkMode, onPointClick }) => {
    const svgRef = useRef();
    const containerRef = useRef();
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [showQuadrantLabels] = useState(true);

    // Process data for scatter plot
    const { points, maxComplexity, maxChurn, avgComplexity, avgChurn } = useMemo(() => {
        if (!data.length) {
            return { points: [], maxComplexity: 100, maxChurn: 50, avgComplexity: 50, avgChurn: 25 };
        }

        const points = data.map((file) => ({
            id: file._id || file.path,
            path: file.path,
            filename: file.path?.split("/").pop() || "unknown",
            complexity: file.complexity?.cyclomatic ?? file.complexity ?? Math.random() * 80,
            churn: file.churn?.recentCommits ?? file.churnRate ?? Math.random() * 40,
            risk: file.risk?.score ?? file.risk ?? 50,
            loc: file.loc || 100,
        }));

        const maxComplexity = Math.max(...points.map((p) => p.complexity), 50);
        const maxChurn = Math.max(...points.map((p) => p.churn), 20);
        const avgComplexity = points.reduce((sum, p) => sum + p.complexity, 0) / points.length;
        const avgChurn = points.reduce((sum, p) => sum + p.churn, 0) / points.length;

        return { points, maxComplexity, maxChurn, avgComplexity, avgChurn };
    }, [data]);

    // Draw scatter plot
    useEffect(() => {
        if (!points.length) return;

        const container = containerRef.current;
        const width = container?.clientWidth || 500;
        const height = 350;

        const margin = { top: 30, right: 30, bottom: 50, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, maxComplexity * 1.1])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, maxChurn * 1.1])
            .range([innerHeight, 0]);

        const sizeScale = d3.scaleSqrt()
            .domain([0, 100])
            .range([4, 20]);

        const colorScale = d3.scaleLinear()
            .domain([0, 40, 70, 100])
            .range(["#22c55e", "#84cc16", "#f59e0b", "#ef4444"]);

        // Quadrant lines (at averages)
        const midX = xScale(avgComplexity);
        const midY = yScale(avgChurn);

        // Quadrant backgrounds
        if (showQuadrantLabels) {
            // Bottom-left: Low priority (green tint)
            g.append("rect")
                .attr("x", 0)
                .attr("y", midY)
                .attr("width", midX)
                .attr("height", innerHeight - midY)
                .attr("fill", isDarkMode ? "rgba(34, 197, 94, 0.05)" : "rgba(34, 197, 94, 0.08)");

            // Top-right: Hotspots (red tint)
            g.append("rect")
                .attr("x", midX)
                .attr("y", 0)
                .attr("width", innerWidth - midX)
                .attr("height", midY)
                .attr("fill", isDarkMode ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.1)");
        }

        // Grid lines
        g.append("line")
            .attr("x1", midX)
            .attr("y1", 0)
            .attr("x2", midX)
            .attr("y2", innerHeight)
            .attr("stroke", isDarkMode ? "#475569" : "#e5e7eb")
            .attr("stroke-dasharray", "4,4");

        g.append("line")
            .attr("x1", 0)
            .attr("y1", midY)
            .attr("x2", innerWidth)
            .attr("y2", midY)
            .attr("stroke", isDarkMode ? "#475569" : "#e5e7eb")
            .attr("stroke-dasharray", "4,4");

        // Quadrant labels
        if (showQuadrantLabels) {
            const labelStyle = {
                fontSize: "9px",
                fill: isDarkMode ? "#6b7280" : "#9ca3af",
            };

            g.append("text")
                .attr("x", midX / 2)
                .attr("y", innerHeight - 10)
                .attr("text-anchor", "middle")
                .style("font-size", labelStyle.fontSize)
                .attr("fill", labelStyle.fill)
                .text("Low Priority");

            g.append("text")
                .attr("x", midX + (innerWidth - midX) / 2)
                .attr("y", 20)
                .attr("text-anchor", "middle")
                .style("font-size", labelStyle.fontSize)
                .attr("fill", "#ef4444")
                .style("font-weight", "bold")
                .text("🔥 HOTSPOTS");

            g.append("text")
                .attr("x", midX / 2)
                .attr("y", 20)
                .attr("text-anchor", "middle")
                .style("font-size", labelStyle.fontSize)
                .attr("fill", labelStyle.fill)
                .text("Monitor");

            g.append("text")
                .attr("x", midX + (innerWidth - midX) / 2)
                .attr("y", innerHeight - 10)
                .attr("text-anchor", "middle")
                .style("font-size", labelStyle.fontSize)
                .attr("fill", labelStyle.fill)
                .text("Stabilize");
        }

        // X-axis
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(6))
            .call((g) => g.selectAll("text").attr("fill", isDarkMode ? "#9ca3af" : "#6b7280"))
            .call((g) => g.selectAll("line").attr("stroke", isDarkMode ? "#475569" : "#e5e7eb"))
            .call((g) => g.select(".domain").attr("stroke", isDarkMode ? "#475569" : "#e5e7eb"));

        // Y-axis
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(5))
            .call((g) => g.selectAll("text").attr("fill", isDarkMode ? "#9ca3af" : "#6b7280"))
            .call((g) => g.selectAll("line").attr("stroke", isDarkMode ? "#475569" : "#e5e7eb"))
            .call((g) => g.select(".domain").attr("stroke", isDarkMode ? "#475569" : "#e5e7eb"));

        // Axis labels
        g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 38)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", isDarkMode ? "#9ca3af" : "#6b7280")
            .text("Complexity →");

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -45)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", isDarkMode ? "#9ca3af" : "#6b7280")
            .text("Churn (commits) →");

        // Draw points
        points.forEach((point) => {
            const cx = xScale(point.complexity);
            const cy = yScale(point.churn);
            const r = sizeScale(point.risk);
            const color = colorScale(point.risk);

            g.append("circle")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", r)
                .attr("fill", color)
                .attr("opacity", 0.75)
                .attr("stroke", isDarkMode ? "#1e293b" : "#fff")
                .attr("stroke-width", 1.5)
                .attr("cursor", "pointer")
                .on("mouseenter", function () {
                    d3.select(this)
                        .attr("opacity", 1)
                        .attr("stroke-width", 3)
                        .attr("stroke", isDarkMode ? "#fff" : "#000");
                    setHoveredPoint({
                        ...point,
                        x: cx + margin.left,
                        y: cy + margin.top,
                    });
                })
                .on("mouseleave", function () {
                    d3.select(this)
                        .attr("opacity", 0.75)
                        .attr("stroke-width", 1.5)
                        .attr("stroke", isDarkMode ? "#1e293b" : "#fff");
                    setHoveredPoint(null);
                })
                .on("click", () => {
                    onPointClick?.(point);
                });
        });

    }, [points, maxComplexity, maxChurn, avgComplexity, avgChurn, isDarkMode, showQuadrantLabels, onPointClick]);

    if (!data.length) {
        return (
            <div className={`p-8 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No data available for scatter plot
            </div>
        );
    }

    const hotspotsCount = points.filter(
        (p) => p.complexity > avgComplexity && p.churn > avgChurn
    ).length;

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <span className="flex items-center gap-1">
                        <FaCubes /> Complexity
                    </span>
                    <span>×</span>
                    <span className="flex items-center gap-1">
                        <FaHistory /> Churn
                    </span>
                </div>

                {hotspotsCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <FaExclamationTriangle />
                        {hotspotsCount} hotspot{hotspotsCount > 1 ? "s" : ""}
                    </div>
                )}
            </div>

            <svg ref={svgRef} className="w-full" />

            {/* Tooltip */}
            {hoveredPoint && (
                <div
                    className={`absolute pointer-events-none px-3 py-2 rounded-lg shadow-lg text-xs z-10 min-w-[150px] ${isDarkMode ? "bg-slate-700 text-white" : "bg-white text-gray-800 border"
                        }`}
                    style={{
                        left: Math.min(hoveredPoint.x + 15, (containerRef.current?.clientWidth || 400) - 170),
                        top: hoveredPoint.y - 10,
                    }}
                >
                    <div className="font-medium mb-1 truncate">{hoveredPoint.filename}</div>
                    <div className="space-y-0.5">
                        <div>Complexity: {hoveredPoint.complexity.toFixed(0)}</div>
                        <div>Churn: {hoveredPoint.churn.toFixed(0)} commits</div>
                        <div>Risk: {hoveredPoint.risk.toFixed(0)}</div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className={`flex items-center justify-center gap-6 mt-4 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                <div className="flex items-center gap-2">
                    <span>Size = Risk Score</span>
                </div>
                <div className="flex items-center gap-1">
                    <span>Low</span>
                    <div className="flex">
                        {["#22c55e", "#84cc16", "#f59e0b", "#ef4444"].map((color, i) => (
                            <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                    <span>High</span>
                </div>
            </div>
        </div>
    );
};

export default ScatterPlot;
