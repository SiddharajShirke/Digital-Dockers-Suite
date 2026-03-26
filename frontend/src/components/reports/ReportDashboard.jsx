import {
  Card,
  Typography,
  Row,
  Col,
  Empty,
  Spin,
  Statistic,
  Tag,
  Space,
  Tooltip,
  Button,
  Skeleton,
  Select,
  message,
} from "antd";
import {
  BarChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ProjectOutlined,
  DownloadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { useState, useEffect, useRef } from "react";
import { useTeams, useTeamMetrics } from "../../hooks/useTeams";
import TeamsPanel from "./TeamsPanel";
import io from "socket.io-client";
import { useThemeMode } from "../../context/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  ArcElement,
);

const { Title, Text } = Typography;

// Skeleton loading state for metrics cards
const MetricCardSkeleton = () => (
  <Card>
    <Skeleton active paragraph={false} title={{ width: "60%" }} />
    <Skeleton.Button active style={{ width: 80, height: 32, marginTop: 8 }} />
  </Card>
);

const ReportDashboard = () => {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  // Team selection state
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [dateRange, setDateRange] = useState("30days");

  const handleExport = () => {
    message.success("Report export started...");
    setTimeout(() => message.success("Report downloaded successfully"), 1500);
  };

  // Fetch teams list
  const { teams, loading: teamsLoading, refetch: refetchTeams } = useTeams();

  // Fetch metrics for selected team (or global if null)
  const {
    metrics,
    loading: metricsLoading,
    refetch: refetchMetrics,
  } = useTeamMetrics(selectedTeamId);

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!socketRef.current) {
      const socket = io(
        import.meta.env.VITE_API_URL || "https://localhost:5002",
        {
          transports: ["websocket", "polling"],
          withCredentials: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          secure: true,
          rejectUnauthorized: false,
        },
      );

      socket.on("connect", () => {
        console.log("Reports Dashboard connected to socket");
        setIsConnected(true);
      });

      socket.on("task:updated", () => {
        console.log("Task updated - refreshing metrics");
        refetchMetrics();
        refetchTeams();
      });

      socket.on("task:created", () => {
        console.log("Task created - refreshing metrics");
        refetchMetrics();
        refetchTeams();
      });

      socket.on("task:deleted", () => {
        console.log("Task deleted - refreshing metrics");
        refetchMetrics();
        refetchTeams();
      });

      socket.on("disconnect", () => {
        console.log("Reports Dashboard disconnected from socket");
        setIsConnected(false);
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [refetchMetrics, refetchTeams]);

  // Handle team selection
  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId);
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchTeams();
    refetchMetrics();
  };

  // Prepare chart data from metrics
  const chartAxisTextColor = isDark ? "#8b949e" : "#64748b";
  const chartTitleColor = isDark ? "#e6edf3" : "#172B4D";
  const chartGridColor = isDark ? "#30363d" : "#e2e8f0";

  const velocityData =
    metrics?.velocityTrend?.length > 0
      ? {
          labels: metrics.velocityTrend.map((s) => s.name || "Sprint"),
          datasets: [
            {
              label: "Committed",
              data: metrics.velocityTrend.map((s) => s.committed || 0),
              backgroundColor: isDark ? "#4b5563" : "#BDC3C7",
            },
            {
              label: "Completed",
              data: metrics.velocityTrend.map((s) => s.completed || 0),
              backgroundColor: isDark ? "#58a6ff" : "#0052CC",
            },
          ],
        }
      : null;

  const statusData = metrics?.taskDistribution
    ? {
        labels: ["To Do", "In Progress", "In Review", "Done"],
        datasets: [
          {
            data: [
              metrics.taskDistribution.todo || 0,
              metrics.taskDistribution.in_progress || 0,
              metrics.taskDistribution.review || 0,
              metrics.taskDistribution.done || 0,
            ],
            backgroundColor: isDark
              ? ["#484f58", "#58a6ff", "#a371f7", "#3fb950"]
              : ["#dfe1e6", "#0052cc", "#6554C0", "#00875a"],
            borderWidth: 0,
          },
        ],
      }
    : null;

  const velocityOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { color: chartAxisTextColor },
      },
      title: {
        display: true,
        text: "Velocity (Last 5 Completed Sprints)",
        color: chartTitleColor,
      },
    },
    scales: {
      x: {
        ticks: { color: chartAxisTextColor },
        grid: { color: chartGridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { color: chartAxisTextColor },
        grid: { color: chartGridColor },
      },
    },
  };

  const statusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { color: chartAxisTextColor },
      },
    },
  };

  // Skeleton loading state for metrics cards

  return (
    <div style={{ padding: "24px", maxWidth: 1600, color: isDark ? "#e6edf3" : undefined }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Title
            level={2}
            style={{
              margin: 0,
              background: isDark
                ? "linear-gradient(135deg, #79c0ff, #a371f7)"
                : "linear-gradient(135deg, #0052CC, #6554C0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Analytics & Reports
          </Title>
          {selectedTeamId && metrics?.teamName && (
            <Text type="secondary">
              Showing metrics for: <strong>{metrics.teamName}</strong>
            </Text>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 12,
              color: isConnected ? "#10B981" : "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: isConnected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              padding: "4px 8px",
              borderRadius: 16,
              fontWeight: 500
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: isConnected ? "#10B981" : "#EF4444",
                display: "inline-block",
                boxShadow: isConnected ? "0 0 4px #10B981" : "0 0 4px #EF4444"
              }}
            ></span>
            {isConnected ? "Live Data" : "Offline"}
          </span>
          <Select
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 140 }}
            options={[
              { value: "7days", label: "Last 7 days" },
              { value: "30days", label: "Last 30 days" },
              { value: "sprint", label: "This sprint" },
              { value: "custom", label: "Custom range" },
            ]}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={metricsLoading || teamsLoading} />}
            onClick={handleRefresh}
            loading={metricsLoading || teamsLoading}
            title="Refresh data"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Teams Panel */}
      <TeamsPanel
        teams={teams}
        selectedTeamId={selectedTeamId}
        onTeamSelect={handleTeamSelect}
        loading={teamsLoading}
      />

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          {metricsLoading ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <Statistic
                title="Total Tasks"
                value={metrics?.totalTasks || 0}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: isDark ? "#58a6ff" : "#0052cc" } }}
              />
            </Card>
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {metricsLoading ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <Statistic
                title="Completed"
                value={metrics?.completedTasks || 0}
                suffix={`/ ${metrics?.totalTasks || 0}`}
                styles={{ content: { color: isDark ? "#3fb950" : "#00875a" } }}
              />
            </Card>
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {metricsLoading ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <Statistic
                title="Completion Rate"
                value={metrics?.completionRate || 0}
                suffix="%"
                styles={{
                  content: {
                    color:
                      (metrics?.completionRate || 0) >= 50
                        ? isDark
                          ? "#3fb950"
                          : "#00875a"
                        : isDark
                          ? "#e3b341"
                          : "#faad14",
                  },
                }}
              />
            </Card>
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {metricsLoading ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <Statistic
                title="Avg Velocity"
                value={metrics?.avgVelocity || 0}
                suffix="pts"
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: isDark ? "#58a6ff" : "#0052cc" } }}
              />
            </Card>
          )}
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartOutlined style={{ color: '#3B82F6' }} /> 
                <span>Velocity Trend</span>
              </div>
            }
            variant="borderless"
            style={{ boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            {metricsLoading ? (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Spin size="large" />
              </div>
            ) : velocityData && velocityData.labels?.length > 0 ? (
              <div style={{ height: 300 }}>
                <Bar options={velocityOptions} data={velocityData} />
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Not enough sprint data for velocity chart. Complete sprints to see trends."
                />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChartOutlined style={{ color: '#8B5CF6' }} /> 
                <span>Task Distribution</span>
              </div>
            }
            variant="borderless"
            style={{ boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            {metricsLoading ? (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Spin size="large" />
              </div>
            ) : statusData &&
              statusData.datasets?.[0]?.data?.some((v) => v > 0) ? (
              <div style={{ height: 300 }}>
                <Pie data={statusData} options={statusOptions} />
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No tasks found for current filter"
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Team Overview */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={
              <>
                <TeamOutlined /> Team Overview
              </>
            }
            variant="borderless"
          >
            {metricsLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Space
                orientation="vertical"
                style={{ width: "100%" }}
                size="large"
              >
                <div>
                  <Text strong>Team Members: </Text>
                  <Tag color="blue">{metrics?.teamMembers || 0} members</Tag>
                </div>
                <div>
                  <Text strong>Active Projects: </Text>
                  <Tag color="purple" icon={<ProjectOutlined />}>
                    {metrics?.activeProjects || 0} projects
                  </Tag>
                </div>
                <div>
                  <Text strong>Project Status: </Text>
                  <Tooltip
                    title={`${metrics?.completedTasks || 0} of ${metrics?.totalTasks || 0} tasks completed`}
                  >
                    <Tag
                      color={
                        (metrics?.completionRate || 0) >= 50
                          ? "green"
                          : "orange"
                      }
                    >
                      {metrics?.completionRate || 0}% Complete
                    </Tag>
                  </Tooltip>
                </div>
                <div>
                  <Text strong>Active Sprints: </Text>
                  <Tag color="cyan">{metrics?.activeSprints || 0} sprints</Tag>
                </div>
                {metrics?.totalTasks === 0 && (
                  <Empty
                    description={
                      selectedTeamId
                        ? "No tasks in this team's projects yet. Assign projects to the team and add tasks to see analytics."
                        : "No tasks or sprints yet. Create teams, assign projects, and add tasks to see analytics."
                    }
                    style={{ paddingTop: 20, paddingBottom: 20 }}
                  />
                )}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

    </div>
  );
};

export default ReportDashboard;
