import React, { useMemo } from "react";
import {
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaChartLine,
  FaShieldAlt,
  FaFire,
  FaBroom,
  FaHeartbeat,
} from "react-icons/fa";

/**
 * Mini Sparkline component - renders a simple line chart
 */
const Sparkline = ({ data = [], color = "#6366f1", height = 24 }) => {
  const points = useMemo(() => {
    if (!data || data.length < 2) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 60;
    const step = width / (data.length - 1);

    return data
      .map((val, i) => {
        const x = i * step;
        const y = height - ((val - min) / range) * height;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, height]);

  if (!data || data.length < 2) return null;

  return (
    <svg width="60" height={height} className="ml-2">
      <path
        d={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Circular Gauge component for health score
 */
const HealthGauge = ({ value = 0, size = 80, isDarkMode }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  const getColor = () => {
    if (value >= 70) return "#22c55e"; // green
    if (value >= 40) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDarkMode ? "#374151" : "#e5e7eb"}
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          {value}
        </span>
      </div>
    </div>
  );
};

const TopKPIs = ({ metrics, loading, isDarkMode }) => {


  // Generate mock history for sparklines (in production, this would come from the API)
  const generateHistory = (current, variance = 10) => {
    const history = [];
    let val = current;
    for (let i = 0; i < 7; i++) {
      // Use deterministic pseudo-random variation instead of Math.random
      history.unshift(Math.max(0, val + ((i % 3) - 1.5) * variance * 0.5));
      val = history[0];
    }
    history.push(current);
    return history;
  };

  const kpis = useMemo(() => [
    {
      label: "Health Score",
      value: metrics.healthScore || 75,
      isGauge: true,
      trend: metrics.healthScoreDelta || 0,
      trendLabel: "vs last sprint",
    },
    {
      label: "Avg Debt Ratio",
      value: metrics.debtRatio || 35,
      suffix: "/100",
      trend: metrics.debtRatioDelta || -3,
      color: metrics.debtRatio > 50 ? "red" : "green",
      icon: <FaChartLine />,
      history: generateHistory(metrics.debtRatio || 35, 8),
    },
    {
      label: "PR Block Rate",
      value: metrics.blockRate || 12,
      suffix: "%",
      trend: metrics.blockRateDelta || -5,
      color: metrics.blockRate > 20 ? "red" : "green",
      icon: <FaShieldAlt />,
      trendLabel: "7 day",
      history: generateHistory(metrics.blockRate || 12, 5),
    },
    {
      label: "Critical Hotspots",
      value: metrics.hotspotCount || 4,
      trend: metrics.hotspotDelta || -2,
      color: metrics.hotspotCount > 5 ? "red" : metrics.hotspotCount > 0 ? "yellow" : "green",
      icon: <FaFire />,
      history: generateHistory(metrics.hotspotCount || 4, 2),
    },
    {
      label: "Risk Reduced",
      value: metrics.riskReduced || 15,
      suffix: " pts",
      trend: null,
      color: "green",
      icon: <FaBroom />,
      trendLabel: "this sprint",
    },
  ], [metrics]);

  const getTrendIcon = (trend, color) => {
    if (trend === null || trend === undefined) return null;
    if (trend > 0) {
      return (
        <span className={`flex items-center ${color === "red" || (color !== "green" && trend > 0) ? "text-red-500" : "text-green-500"}`}>
          <FaArrowUp size={10} className="mr-0.5" />
          +{Math.abs(trend)}
        </span>
      );
    }
    if (trend < 0) {
      return (
        <span className={`flex items-center ${color === "green" || (color !== "red" && trend < 0) ? "text-green-500" : "text-red-500"}`}>
          <FaArrowDown size={10} className="mr-0.5" />
          {Math.abs(trend)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-gray-400">
        <FaMinus size={10} className="mr-0.5" />
        0
      </span>
    );
  };

  const getSparklineColor = (color) => {
    switch (color) {
      case "red": return "#ef4444";
      case "green": return "#22c55e";
      case "yellow": return "#f59e0b";
      default: return "#6366f1";
    }
  };

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`rounded-xl shadow p-5 h-28 animate-pulse ${isDarkMode ? "bg-slate-800" : "bg-gray-100"
              }`}
          >
            <div className={`h-3 w-20 rounded mb-3 ${isDarkMode ? "bg-slate-700" : "bg-gray-300"}`}></div>
            <div className={`h-8 w-16 rounded ${isDarkMode ? "bg-slate-700" : "bg-gray-300"}`}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className={`rounded-xl shadow-sm p-5 transition-all hover:shadow-md ${isDarkMode
            ? "bg-slate-800 border border-slate-700"
            : "bg-white border border-gray-100"
            } ${kpi.isGauge ? "flex items-center gap-4" : ""}`}
        >
          {kpi.isGauge ? (
            <>
              <HealthGauge value={kpi.value} isDarkMode={isDarkMode} />
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  <FaHeartbeat className="inline mr-1 text-red-400" />
                  {kpi.label}
                </div>
                <div className="mt-1 text-xs">
                  {getTrendIcon(kpi.trend, kpi.trend >= 0 ? "green" : "red")}
                  <span className={`ml-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {kpi.trendLabel}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${isDarkMode
                      ? "bg-slate-700 text-indigo-400"
                      : "bg-indigo-50 text-indigo-600"
                      }`}
                  >
                    {kpi.icon}
                  </div>
                  <span
                    className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                  >
                    {kpi.label}
                  </span>
                </div>
                {kpi.history && (
                  <Sparkline data={kpi.history} color={getSparklineColor(kpi.color)} />
                )}
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <span
                    className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                  >
                    {kpi.value}
                  </span>
                  {kpi.suffix && (
                    <span className={`text-sm ml-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {kpi.suffix}
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  {kpi.trend !== null && getTrendIcon(kpi.trend, kpi.color)}
                  {kpi.trendLabel && (
                    <span className={`ml-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      {kpi.trendLabel}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default TopKPIs;

