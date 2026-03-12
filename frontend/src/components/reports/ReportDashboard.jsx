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
} from "antd";
import {
  BarChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ProjectOutlined,
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
import EmailGeneratorForm from "../common/EmailGeneratorForm";
import io from "socket.io-client";

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
  // Team selection state
  const [selectedTeamId, setSelectedTeamId] = useState(null);

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
        import.meta.env.VITE_API_URL || "http://localhost:5001",
        {
          transports: ["websocket", "polling"],
          withCredentials: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
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
  const velocityData =
    metrics?.velocityTrend?.length > 0
      ? {
          labels: metrics.velocityTrend.map((s) => s.name || "Sprint"),
          datasets: [
            {
              label: "Committed",
              data: metrics.velocityTrend.map((s) => s.committed || 0),
              backgroundColor: "#BDC3C7",
            },
            {
              label: "Completed",
              data: metrics.velocityTrend.map((s) => s.completed || 0),
              backgroundColor: "#0052CC",
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
            backgroundColor: ["#dfe1e6", "#0052cc", "#6554C0", "#00875a"],
            borderWidth: 0,
          },
        ],
      }
    : null;

  const velocityOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Velocity (Last 5 Completed Sprints)" },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  const statusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right" },
    },
  };

  // Skeleton loading state for metrics cards

  return (
    <div style={{ padding: "24px", maxWidth: 1600 }}>
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
              background: "linear-gradient(135deg, #0052CC, #6554C0)",
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
              color: isConnected ? "#52c41a" : "#ff4d4f",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isConnected ? "#52c41a" : "#ff4d4f",
                display: "inline-block",
              }}
            ></span>
            {isConnected ? "Live" : "Offline"}
          </span>
          <Button
            type="text"
            icon={<ReloadOutlined spin={metricsLoading || teamsLoading} />}
            onClick={handleRefresh}
            loading={metricsLoading || teamsLoading}
            title="Refresh data"
          />
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
                valueStyle={{ color: "#0052cc" }}
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
                valueStyle={{ color: "#00875a" }}
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
                valueStyle={{
                  color:
                    (metrics?.completionRate || 0) >= 50
                      ? "#00875a"
                      : "#faad14",
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
                valueStyle={{ color: "#0052cc" }}
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
              <>
                <BarChartOutlined /> Velocity Trend
              </>
            }
            variant="borderless"
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
              <Empty
                description="No completed sprints yet"
                style={{ paddingTop: 50, paddingBottom: 50 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <>
                <PieChartOutlined /> Task Distribution
              </>
            }
            variant="borderless"
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
              <Empty
                description="No tasks found"
                style={{ paddingTop: 50, paddingBottom: 50 }}
              />
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
                direction="vertical"
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

      {/* Email Generator */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <EmailGeneratorForm />
        </Col>
      </Row>
    </div>
  );
};

export default ReportDashboard;
