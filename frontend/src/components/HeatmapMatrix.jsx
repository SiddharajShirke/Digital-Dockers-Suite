import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { FaFolder, FaCalendarAlt } from "react-icons/fa";

/**
 * HeatmapMatrix - Folder × Time heatmap visualization
 * Shows how different folders' risk scores change over sprints
 */
const HeatmapMatrix = ({ data = [], isDarkMode, onCellClick }) => {
    const svgRef = useRef();
    const containerRef = useRef();
    const [hoveredCell, setHoveredCell] = useState(null);

    // Process data into folder × time matrix
    const { folders, sprints, matrix } = useMemo(() => {
        if (!data.length) {
            return { folders: [], sprints: [], matrix: [], maxRisk: 0 };
        }

        // Extract unique folders (group by top-level directory)
        const folderMap = new Map();
        data.forEach((file) => {
            const parts = file.path?.split("/") || [];
            const folder = parts.length > 1 ? parts[0] : "root";
            if (!folderMap.has(folder)) {
                folderMap.set(folder, []);
            }
            folderMap.get(folder).push(file);
        });

        const folders = Array.from(folderMap.keys()).slice(0, 12); // Limit to 12 folders

        // Generate sprint labels (simulated - would come from API)
        const sprintCount = 8;
        const sprints = Array.from({ length: sprintCount }, (_, i) => `S${i + 1}`);

        // Create matrix: folder × sprint with risk values
        let maxRisk = 0;
        const matrix = folders.map((folder) => {
            const files = folderMap.get(folder) || [];
            const baseRisk = files.reduce((sum, f) => sum + (f.risk || 0), 0) / (files.length || 1);

            // Simulate historical data with variance
            return sprints.map((_, i) => {
                const variance = (Math.random() - 0.5) * 20;
                const risk = Math.max(0, Math.min(100, baseRisk + variance - ((sprintCount - i) * 2)));
                if (risk > maxRisk) maxRisk = risk;
                return risk;
            });
        });

        return { folders, sprints, matrix, maxRisk };
    }, [data]);

    // Draw heatmap
    useEffect(() => {
        if (!folders.length || !sprints.length) return;

        const container = containerRef.current;
        const width = container?.clientWidth || 500;
        const height = Math.max(250, folders.length * 30 + 60);

        const margin = { top: 40, right: 20, bottom: 20, left: 100 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const cellWidth = innerWidth / sprints.length;
        const cellHeight = innerHeight / folders.length;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Color scale: green → yellow → red
        const colorScale = d3.scaleLinear()
            .domain([0, 40, 70, 100])
            .range(["#22c55e", "#84cc16", "#f59e0b", "#ef4444"]);

        // Draw cells
        folders.forEach((folder, row) => {
            sprints.forEach((sprint, col) => {
                const value = matrix[row][col];

                g.append("rect")
                    .attr("x", col * cellWidth + 1)
                    .attr("y", row * cellHeight + 1)
                    .attr("width", cellWidth - 2)
                    .attr("height", cellHeight - 2)
                    .attr("rx", 3)
                    .attr("fill", colorScale(value))
                    .attr("opacity", 0.85)
                    .attr("cursor", "pointer")
                    .on("mouseenter", function () {
                        d3.select(this).attr("opacity", 1).attr("stroke", isDarkMode ? "#fff" : "#000").attr("stroke-width", 2);
                        setHoveredCell({ folder, sprint, value: value.toFixed(1), x: col * cellWidth + cellWidth / 2, y: row * cellHeight });
                    })
                    .on("mouseleave", function () {
                        d3.select(this).attr("opacity", 0.85).attr("stroke", "none");
                        setHoveredCell(null);
                    })
                    .on("click", () => {
                        onCellClick?.({ folder, sprint, risk: value });
                    });

                // Add value text for larger cells
                if (cellHeight >= 25 && cellWidth >= 40) {
                    g.append("text")
                        .attr("x", col * cellWidth + cellWidth / 2)
                        .attr("y", row * cellHeight + cellHeight / 2 + 4)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "10px")
                        .attr("fill", value > 60 ? "#fff" : "#000")
                        .attr("pointer-events", "none")
                        .text(Math.round(value));
                }
            });
        });

        // Y-axis (folders)
        folders.forEach((folder, i) => {
            g.append("text")
                .attr("x", -8)
                .attr("y", i * cellHeight + cellHeight / 2 + 4)
                .attr("text-anchor", "end")
                .attr("font-size", "11px")
                .attr("fill", isDarkMode ? "#9ca3af" : "#4b5563")
                .text(folder.length > 12 ? folder.slice(0, 12) + "…" : folder);
        });

        // X-axis (sprints)
        sprints.forEach((sprint, i) => {
            g.append("text")
                .attr("x", i * cellWidth + cellWidth / 2)
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("fill", isDarkMode ? "#9ca3af" : "#6b7280")
                .text(sprint);
        });

    }, [folders, sprints, matrix, isDarkMode, onCellClick]);

    if (!data.length) {
        return (
            <div className={`p-8 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No data available for heatmap
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Header */}
            <div className={`flex items-center gap-4 mb-3 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                <span className="flex items-center gap-1">
                    <FaFolder /> Folders
                </span>
                <span>×</span>
                <span className="flex items-center gap-1">
                    <FaCalendarAlt /> Sprints
                </span>
            </div>

            <svg ref={svgRef} className="w-full" />

            {/* Tooltip */}
            {hoveredCell && (
                <div
                    className={`absolute pointer-events-none px-3 py-2 rounded-lg shadow-lg text-xs z-10 ${isDarkMode ? "bg-slate-700 text-white" : "bg-white text-gray-800 border"
                        }`}
                    style={{
                        left: hoveredCell.x + 110,
                        top: hoveredCell.y + 50,
                    }}
                >
                    <div className="font-medium">{hoveredCell.folder}</div>
                    <div>{hoveredCell.sprint}: Risk {hoveredCell.value}</div>
                </div>
            )}

            {/* Legend */}
            <div className={`flex items-center justify-center gap-4 mt-4 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                <span>Low</span>
                <div className="flex">
                    {["#22c55e", "#84cc16", "#f59e0b", "#ef4444"].map((color, i) => (
                        <div key={i} className="w-6 h-3" style={{ backgroundColor: color }} />
                    ))}
                </div>
                <span>High Risk</span>
            </div>
        </div>
    );
};

export default HeatmapMatrix;
