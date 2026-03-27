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
  LineChart,
  Line,
  Legend,
  ReferenceLine,
  Brush,
} from "recharts";

const PR_STATUS_COLORS = {
  PASS: "#22c55e",
  BLOCK: "#ef4444",
  WARN: "#f59e0b",
  PENDING: "#64748b",
};

const SAFE_GREEN = "#22c55e";
const ISSUE_RED = "#ef4444";
const ISSUE_CLOSED_STATUSES = new Set(["DONE", "CLOSED", "RESOLVED"]);

const isPullRequestClosed = (status) => {
  const normalized = String(status || "").toUpperCase();
  return normalized === "PASS" || normalized === "CLOSED" || normalized === "MERGED";
};

const CodebaseConditionCharts = ({ files = [], pullRequests = [], issues = [], isDarkMode = false }) => {
  const snapshot = useMemo(() => {
    const prCounts = { open: 0, closed: 0 };
    const issueCounts = { open: 0, closed: 0 };

    pullRequests.forEach((pr) => {
      if (isPullRequestClosed(pr?.status)) {
        prCounts.closed += 1;
      } else {
        prCounts.open += 1;
      }
    });

    issues.forEach((issue) => {
      const status = String(issue?.status || "").toUpperCase();
      if (ISSUE_CLOSED_STATUSES.has(status)) {
        issueCounts.closed += 1;
      } else {
        issueCounts.open += 1;
      }
    });

    return {
      pr: prCounts,
      issue: issueCounts,
      chartData: [
        {
          group: "Pull Requests",
          open: prCounts.open,
          closed: prCounts.closed,
        },
        {
          group: "Issues",
          open: issueCounts.open,
          closed: issueCounts.closed,
        },
      ],
    };
  }, [pullRequests, issues]);

  const prStatusMix = useMemo(() => {
    const counts = {
      PASS: 0,
      BLOCK: 0,
      WARN: 0,
      PENDING: 0,
    };

    pullRequests.forEach((pr) => {
      const status = String(pr.status || "PENDING").toUpperCase();
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      } else {
        counts.PENDING += 1;
      }
    });

    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .filter((entry) => entry.count > 0);
  }, [pullRequests]);

  const prRiskTrend = useMemo(() => {
    const sorted = [...pullRequests]
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const windowSize = 5;

    return sorted.map((pr, idx) => {
      const risk = Number(pr.risk_score || 0);
      const historySlice = sorted.slice(Math.max(0, idx - windowSize + 1), idx + 1);
      const rollingRisk = Math.round(
        historySlice.reduce((sum, item) => sum + Number(item.risk_score || 0), 0) /
        Math.max(historySlice.length, 1)
      );

      const createdAt = pr.createdAt ? new Date(pr.createdAt) : null;

      return {
        sequence: idx + 1,
        name: `#${pr.prNumber}`,
        prNumber: pr.prNumber,
        risk,
        rollingRisk,
        status: String(pr.status || "PENDING").toUpperCase(),
        createdAtLabel: createdAt
          ? `${String(createdAt.getMonth() + 1).padStart(2, "0")}/${String(createdAt.getDate()).padStart(2, "0")}/${createdAt.getFullYear()}`
          : "Unknown",
      };
    });
  }, [pullRequests]);

  const trendSummary = useMemo(() => {
    if (prRiskTrend.length === 0) {
      return {
        from: "-",
        to: "-",
        total: 0,
      };
    }

    return {
      from: prRiskTrend[0].name,
      to: prRiskTrend[prRiskTrend.length - 1].name,
      total: prRiskTrend.length,
    };
  }, [prRiskTrend]);

  const initialBrushStartIndex = useMemo(() => {
    if (prRiskTrend.length <= 40) return 0;
    return prRiskTrend.length - 40;
  }, [prRiskTrend.length]);

  const totalPRs = pullRequests.length;
  const totalIssues = issues.length;

  const tooltipStyle = {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    border: `1px solid ${isDarkMode ? "#475569" : "#e5e7eb"}`,
    borderRadius: "8px",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontSize: "12px",
  };

  const renderRiskDot = (props) => {
    const { cx, cy, payload } = props;
    const color = PR_STATUS_COLORS[payload?.status] || "#6366f1";

    return <circle cx={cx} cy={cy} r={3} fill={color} stroke={isDarkMode ? "#0f172a" : "#ffffff"} strokeWidth={1.5} />;
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-4">
        <div
          className={`rounded-lg border p-3 ${
            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Open Risk Items
          </div>
          <div className="text-2xl font-bold text-red-500">{snapshot.pr.open + snapshot.issue.open}</div>
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            open PRs + open issues
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Safe Closed Items
          </div>
          <div className="text-2xl font-bold text-green-500">{snapshot.pr.closed + snapshot.issue.closed}</div>
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            closed PRs + resolved issues
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Scope
          </div>
          <div className="text-2xl font-bold">{totalPRs + totalIssues}</div>
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            total PR and issue records
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            Open vs Closed Health Snapshot
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshot.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
                <XAxis dataKey="group" tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar name="Open (Issue)" dataKey="open" stackId="health" fill={ISSUE_RED} radius={[0, 0, 6, 6]} />
                <Bar name="Closed (Safe)" dataKey="closed" stackId="health" fill={SAFE_GREEN} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            PR Decision Mix
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prStatusMix}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {prStatusMix.map((entry) => (
                    <Cell key={entry.status} fill={PR_STATUS_COLORS[entry.status] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
          PR Risk Trend (Complete Timeline)
        </h4>
        <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          {trendSummary.total > 0
            ? `${trendSummary.from} → ${trendSummary.to} • ${trendSummary.total} PRs`
            : "No PR trend data available"}
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prRiskTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
              <XAxis
                dataKey="sequence"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 }}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis domain={[0, 100]} tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => {
                  if (name === "risk") return [`${value}`, "Risk Score"];
                  if (name === "rollingRisk") return [`${value}`, "Rolling Avg (5)"];
                  return [value, name];
                }}
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload;
                  if (!point) return "PR";
                  return `${point.name} • ${point.createdAtLabel} • ${point.status}`;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <Line
                type="monotone"
                dataKey="risk"
                name="Risk Score"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={renderRiskDot}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="rollingRisk"
                name="Rolling Avg (5)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
              {prRiskTrend.length > 20 && (
                <Brush
                  dataKey="sequence"
                  height={24}
                  stroke={isDarkMode ? "#6366f1" : "#4f46e5"}
                  travellerWidth={10}
                  startIndex={initialBrushStartIndex}
                  endIndex={prRiskTrend.length - 1}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CodebaseConditionCharts;
