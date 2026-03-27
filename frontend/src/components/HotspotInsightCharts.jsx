import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["#22c55e", "#16a34a", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#94a3b8"];

const HotspotInsightCharts = ({ files = [], isDarkMode = false, onFileSelect }) => {
  const hotspotData = useMemo(() => {
    const normalized = files.map((file) => ({
      ...file,
      fileName: file.path?.split("/").pop() || "unknown",
      risk: Number(file.risk ?? 0),
      churnRate: Number(file.churnRate ?? file.churn?.recentCommits ?? 0),
      complexity: Number(file.complexity ?? file.complexity?.cyclomatic ?? 0),
      loc: Number(file.loc ?? 0),
    }));

    const topHotspots = [...normalized]
      .sort((a, b) => (b.risk - a.risk) || (b.churnRate - a.churnRate))
      .slice(0, 10);

    const maxChurn = Math.max(...topHotspots.map((item) => item.churnRate), 1);
    const hotspotBars = topHotspots.map((item) => ({
      ...item,
      churnIndex: Math.round((item.churnRate / maxChurn) * 100),
      label: item.fileName.length > 26 ? `${item.fileName.slice(0, 24)}...` : item.fileName,
    }));

    const folderMap = new Map();
    normalized.forEach((item) => {
      const folder = item.path?.split("/")[0] || "root";
      if (!folderMap.has(folder)) {
        folderMap.set(folder, { folder, weightedRisk: 0, files: 0 });
      }
      const entry = folderMap.get(folder);
      entry.weightedRisk += item.risk * Math.max(item.loc, 1);
      entry.files += 1;
    });

    const sortedFolders = Array.from(folderMap.values())
      .sort((a, b) => b.weightedRisk - a.weightedRisk);

    const topFolders = sortedFolders.slice(0, 6);
    const rest = sortedFolders.slice(6);
    if (rest.length > 0) {
      topFolders.push({
        folder: "others",
        weightedRisk: rest.reduce((sum, x) => sum + x.weightedRisk, 0),
        files: rest.reduce((sum, x) => sum + x.files, 0),
      });
    }

    const criticalCount = normalized.filter((item) => item.risk >= 70).length;
    const avgHotspotRisk = topHotspots.length
      ? Math.round(topHotspots.reduce((sum, item) => sum + item.risk, 0) / topHotspots.length)
      : 0;

    return {
      hotspotBars,
      folderRiskShare: topFolders,
      criticalCount,
      avgHotspotRisk,
      highChurnCount: normalized.filter((item) => item.churnRate >= 8).length,
    };
  }, [files]);

  const tooltipStyle = {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    border: `1px solid ${isDarkMode ? "#475569" : "#e5e7eb"}`,
    borderRadius: "8px",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontSize: "12px",
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-800"}`}>
          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Critical Hotspots
          </div>
          <div className="text-2xl font-bold text-red-500">{hotspotData.criticalCount}</div>
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            files with risk score 70+
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-800"}`}>
          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Avg Hotspot Risk
          </div>
          <div className="text-2xl font-bold text-amber-500">{hotspotData.avgHotspotRisk}</div>
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            top 10 risky files
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-800"}`}>
          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            High Churn Files
          </div>
          <div className="text-2xl font-bold text-indigo-500">{hotspotData.highChurnCount}</div>
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            8+ commits in recent window
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            Top Hotspots: Risk and Churn
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hotspotData.hotspotBars}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name, props) => {
                  if (name === "risk") return [`${value}`, "Risk Score"];
                  if (name === "churnIndex") return [`${props?.payload?.churnRate || 0} commits`, "Recent Churn"];
                  return [value, name];
                }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  name="Risk"
                  dataKey="risk"
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry) => onFileSelect?.(entry)}
                />
                <Bar
                  name="Churn Index"
                  dataKey="churnIndex"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry) => onFileSelect?.(entry)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            Directory Risk Contribution
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hotspotData.folderRiskShare}
                  dataKey="weightedRisk"
                  nameKey="folder"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {hotspotData.folderRiskShare.map((entry, index) => (
                    <Cell key={`${entry.folder}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value, _name, props) => {
                  const payload = props?.payload || {};
                  return [`${Math.round(Number(value) || 0)} weighted`, `${payload.folder} (${payload.files || 0} files)`];
                }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotInsightCharts;
