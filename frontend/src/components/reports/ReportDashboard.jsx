import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Typography, Row, Col, Empty, Spin, Statistic, Tag, Space,
  Button, Select, App, Collapse, Table, Progress, Alert
} from "antd";
import {
  BarChartOutlined, PieChartOutlined, TeamOutlined, CheckCircleOutlined,
  ClockCircleOutlined, RobotOutlined, FilePdfOutlined, FileWordOutlined,
  Html5Outlined, SyncOutlined
} from "@ant-design/icons";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle,
  Tooltip as ChartTooltip, Legend, ArcElement, LineElement, PointElement
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { useProject } from "../../context/ProjectContext";

import { useThemeMode } from "../../context/ThemeContext";
import projectService from "../../services/projectService";
import sprintService from "../../services/sprintService";
import { reportService } from "../../services/reportService";
import "./reports.css";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ChartTitle, ChartTooltip, Legend, ArcElement
);

const { Title, Text, Paragraph } = Typography;

export default function ReportDashboard() {
  const { message: messageApi } = App.useApp();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  // Socket
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Core State
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState('all');
  
  // Intelligence Sync
  const { syncTrigger } = useProject() || { syncTrigger: 0 };

  // Loading States
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Data States
  const [metricsData, setMetricsData] = useState(null); // Instant data
  const [aiReport, setAiReport] = useState(null); // Deep LLM data
  const [error, setError] = useState(null);

  // 1. Initial Load
  useEffect(() => {
    loadProjects();
  }, []);

  // 2. Refresh metrics instantly if filters OR syncTrigger change
  useEffect(() => {
    if (selectedProject) {
      refreshMetrics();
    }
  }, [selectedProject, selectedSprint, syncTrigger]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
      messageApi.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectChange = async (projectId) => {
    setSelectedProject(projectId);
    setSelectedSprint('all');
    setSprints([]);
    setAiReport(null); // clear old AI report
    
    if (projectId) {
      setLoadingSprints(true);
      try {
        const data = await sprintService.getSprintsByProject(projectId);
        setSprints(data || []);
      } catch (err) {
        console.error('Failed to load sprints', err);
      }
      setLoadingSprints(false);
    }
  };

  const refreshMetrics = async () => {
    const projId = selectedProject || (socketRef.current ? document.getElementById('proj-select')?.value : null);
    const sprId = selectedSprint;
    
    if (!projId) return;

    setLoadingMetrics(true);
    try {
      let data;
      if (sprId === 'all') {
        data = await reportService.getProjectMetrics(projId);
      } else {
        data = await reportService.getSprintMetrics(sprId);
      }
      setMetricsData(data);
    } catch (err) {
      console.error('Failed to fetch instant metrics', err);
      setError("Failed to fetch dashboard metrics. Please try again.");
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedProject) return;
    setGeneratingAI(true);
    setError(null);
    setAiReport(null);
    
    try {
      let data;
      if (selectedSprint === 'all') {
        data = await reportService.generateProjectReport(selectedProject);
      } else {
        data = await reportService.generateSprintReport(selectedSprint);
      }
      setAiReport(data);
      messageApi.success("AI Technical Report Generated successfully.");
    } catch (err) {
      setError(err.toString());
      messageApi.error("Failed to generate AI report.");
    }
    setGeneratingAI(false);
  };

  const handleExport = async (format) => {
    if (!aiReport) {
      messageApi.warning("Please generate an AI pattern first to export.");
      return;
    }
    try {
      await reportService.exportReport(aiReport, format);
      messageApi.success(`Report exported to ${format.toUpperCase()}`);
    } catch (err) {
      messageApi.error(`Export to ${format.toUpperCase()} failed`);
    }
  };

  // derived metrics from instant data
  const tMetrics = metricsData ? metricsData.metrics : null;
  const isProjectView = metricsData?.reportType === 'PROJECT';

  const totalTasks = tMetrics?.totalTasks || 0;
  const completedTasks = tMetrics?.statusDistribution?.done || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Velocity is sum over last N sprints if project view, else specific to sprint
  const avgVelocity = isProjectView && tMetrics?.velocityTrend
    ? (tMetrics.velocityTrend.reduce((sum, s) => sum + s.velocity, 0) / (tMetrics.velocityTrend.length || 1)).toFixed(1)
    : (metricsData?.sprint?.completedPoints || 0);

  // Charts Config
  const chartAxisTextColor = isDark ? "#8b949e" : "#64748b";
  const chartTitleColor = isDark ? "#e6edf3" : "#172B4D";
  const chartGridColor = isDark ? "#30363d" : "#e2e8f0";

  let velocityData = null;
  if (isProjectView && tMetrics?.velocityTrend?.length > 0) {
    velocityData = {
      labels: tMetrics.velocityTrend.map(v => v.name),
      datasets: [
        {
          label: 'Committed',
          data: tMetrics.velocityTrend.map(v => v.committed),
          borderColor: '#fa8c16',
          backgroundColor: 'rgba(250, 140, 22, 0.2)',
          type: 'line',
          fill: true
        },
        {
          label: 'Completed',
          data: tMetrics.velocityTrend.map(v => v.completed),
          backgroundColor: isDark ? "#58a6ff" : "#52c41a",
          type: 'bar'
        }
      ]
    };
  }

  const statusData = tMetrics?.statusDistribution ? {
    labels: ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'],
    datasets: [{
      data: [
        tMetrics.statusDistribution.todo || 0,
        tMetrics.statusDistribution.in_progress || 0,
        tMetrics.statusDistribution.review || 0,
        tMetrics.statusDistribution.done || 0,
        tMetrics.statusDistribution.blocked || 0
      ],
      backgroundColor: isDark 
        ? ["#484f58", "#58a6ff", "#a371f7", "#3fb950", "#f5222d"]
        : ["#d9d9d9", "#1890ff", "#722ed1", "#52c41a", "#f5222d"],
      borderWidth: 1
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: chartAxisTextColor } } },
    scales: {
      x: { ticks: { color: chartAxisTextColor }, grid: { color: chartGridColor } },
      y: { ticks: { color: chartAxisTextColor }, grid: { color: chartGridColor } }
    }
  };

  const statusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "right", labels: { color: chartAxisTextColor } } }
  };

  return (
    <div className={`reports-dashboard ${isDark ? "reports-dashboard-dark" : ""}`} style={{ padding: "24px", maxWidth: 1600, color: isDark ? "#e6edf3" : undefined }}>
      
      {/* 1. Header & Filters */}
      <div className="reports-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div className="reports-hero-copy">
          <div className="reports-eyebrow">Project intelligence</div>
          <Title level={2} style={{ margin: 0, background: isDark ? "linear-gradient(135deg, #79c0ff, #a371f7)" : "linear-gradient(135deg, #0052CC, #6554C0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Project Intelligence
          </Title>
          <div style={{ marginTop: 8 }}>
            <span className="reports-status-pill" style={{ fontSize: 12, color: isConnected ? "#10B981" : "#EF4444", display: "inline-flex", alignItems: "center", gap: 6, background: isConnected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", padding: "4px 8px", borderRadius: 16, fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: isConnected ? "#10B981" : "#EF4444", boxShadow: isConnected ? "0 0 4px #10B981" : "0 0 4px #EF4444" }}></span>
              {isConnected ? "Live Data" : "Offline"}
            </span>
          </div>
        </div>
        
        <Space size="middle" align="end" wrap className="reports-filter-panel">
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4, color: isDark ? '#c9d1d9' : '#595959' }}>Select Project</Text>
            <Select 
              id="proj-select"
              className="reports-filter-select"
              loading={loadingProjects}
              value={selectedProject}
              onChange={handleProjectChange}
              options={projects.map(p => ({ label: p.name, value: p._id }))}
            />
          </div>
          
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4, color: isDark ? '#c9d1d9' : '#595959' }}>Select Target</Text>
            <Select 
              className="reports-filter-select"
              value={selectedSprint}
              onChange={setSelectedSprint}
              disabled={!selectedProject}
              loading={loadingSprints}
            >
              <Select.Option value="all">Entire Project Lifecycle</Select.Option>
              {sprints.map(s => (
                <Select.Option key={s._id} value={s._id}>Sprint: {s.name}</Select.Option>
              ))}
            </Select>
          </div>

          <Button 
            type="primary" 
            size="large" 
            icon={<RobotOutlined />} 
            onClick={handleGenerateAI}
            loading={generatingAI}
            disabled={!selectedProject}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            {generatingAI ? 'Analyzing...' : 'Generate AI Report'}
          </Button>

          {aiReport && (
            <Space>
              <Button icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')} danger title="Export PDF" />
              <Button icon={<FileWordOutlined />} onClick={() => handleExport('docx')} type="primary" ghost title="Export DOCX" />
            </Space>
          )}
        </Space>
      </div>

      {error && <Alert title="Error" description={error} type="error" showIcon style={{ marginBottom: 24 }} />}

      {/* 2. Instant Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingMetrics} className="reports-metric-card">
            <Statistic title="Total Tasks" value={totalTasks} prefix={<CheckCircleOutlined />} styles={{ content: { color: isDark ? "#58a6ff" : "#0052cc" } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingMetrics} className="reports-metric-card">
            <Statistic title="Completed" value={completedTasks} suffix={`/ ${totalTasks}`} styles={{ content: { color: isDark ? "#3fb950" : "#00875a" } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingMetrics} className="reports-metric-card">
            <Statistic title="Completion Rate" value={completionRate} suffix="%" 
              styles={{ content: { color: completionRate >= 50 ? (isDark ? "#3fb950" : "#00875a") : (isDark ? "#e3b341" : "#faad14") } }} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingMetrics} className="reports-metric-card">
            <Statistic title={isProjectView ? "Avg Velocity" : "Sprint Velocity"} value={avgVelocity} suffix="pts" prefix={<ClockCircleOutlined />} styles={{ content: { color: isDark ? "#a371f7" : "#722ed1" } }} />
          </Card>
        </Col>
      </Row>

      {/* 3. Charts Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChartOutlined style={{ color: '#3B82F6' }} /><span>Velocity Trend</span></div>}
            className="reports-chart-card"
            variant="borderless" style={{ boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)', height: '100%' }}
          >
            {loadingMetrics ? (
              <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin size="large" /></div>
            ) : isProjectView && velocityData && velocityData.labels?.length > 0 ? (
              <div style={{ height: 300 }}><Bar options={chartOptions} data={velocityData} /></div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Empty description={isProjectView ? "Not enough sprint data for velocity chart." : "Velocity charts display across the entire project lifecycle. Switch to project view to see trends."} />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PieChartOutlined style={{ color: '#8B5CF6' }} /><span>Task Distribution</span></div>}
            className="reports-chart-card"
            variant="borderless" style={{ boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)', height: '100%' }}
          >
            {loadingMetrics ? (
              <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin size="large" /></div>
            ) : statusData && statusData.datasets?.[0]?.data?.some(v => v > 0) ? (
              <div style={{ height: 300 }}><Pie data={statusData} options={statusOptions} /></div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center' }}><Empty description="No tasks found for current target" /></div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 4. Team Overview Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title={<><TeamOutlined /> Active Team Roster — {selectedSprint === 'all' ? 'Entire Project' : 'Current Sprint'}</>} className="reports-team-card" variant="borderless" style={{ boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)' }}>
            {loadingMetrics ? (
              <Spin />
            ) : tMetrics?.assigneeWorkload?.length > 0 ? (
              <Space wrap size="large">
                {tMetrics.assigneeWorkload.map(user => (
                  <Card key={user.name} size="small" className="reports-team-member-card" style={{ width: 220, borderColor: isDark ? '#30363d' : '#f0f0f0', background: isDark ? '#161b22' : '#fafafa' }}>
                    <Statistic title={<Text strong>{user.name}</Text>} value={user.tasksAssigned} suffix="tasks" styles={{ content: { fontSize: 18, color: '#1890ff' } }} />
                    <div style={{ marginTop: 8, fontSize: 12, color: 'gray' }}>
                      Pushed: {user.storyPoints} pts<br/>
                      Completed: {user.tasksCompleted} / {user.tasksAssigned}
                    </div>
                  </Card>
                ))}
              </Space>
            ) : (
              <Empty description="No team members assigned to tasks in this view." />
            )}
          </Card>
        </Col>
      </Row>

      {/* 5. AI GENERATED REPORT DATA VIEW */}
      {generatingAI && (
        <div style={{ textAlign: 'center', padding: '50px 0', background: isDark ? '#161b22' : '#f9f9f9', borderRadius: 8, marginTop: 24 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: isDark ? '#c9d1d9' : '#595959', fontWeight: 500 }}>
            Analyzing tasks, workloads, and writing the report...
          </div>
        </div>
      )}

      {aiReport && !generatingAI && (
        <div className="reports-ai-report" style={{ animation: 'fadeIn 0.5s', borderTop: '2px dashed #d9d9d9', paddingTop: 40, marginTop: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>Intelligence Report</Title>
            <Text type="secondary">Generated securely on {new Date().toLocaleString()}</Text>
          </div>

          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={16}>
              <Card title="Executive Summary" className="reports-ai-card" variant="borderless" style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                  {aiReport.aiInsights?.executiveSummary}
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Confidence Score" className="reports-ai-card reports-confidence-card" variant="borderless" style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <Progress 
                    type="dashboard" 
                    percent={aiReport.aiInsights?.confidenceScoring?.score || 0} 
                    strokeColor={aiReport.aiInsights?.confidenceScoring?.score > 80 ? '#52c41a' : '#faad14'} 
                />
                <Paragraph type="secondary" style={{ marginTop: 16 }}>
                    {aiReport.aiInsights?.confidenceScoring?.reason}
                </Paragraph>
              </Card>
            </Col>
          </Row>

          <Card title="Technical Breakdown" className="reports-ai-card" style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Collapse
              ghost
              defaultActiveKey={['1', '2']}
              items={[
                {
                  key: '1',
                  label: <Text strong>Task Flow & Pipeline Analysis</Text>,
                  children: (
                    <>
                      <Paragraph>{aiReport.aiInsights?.taskBreakdowns}</Paragraph>
                      {aiReport.aiInsights?.kanbanAnalysis && <Paragraph><strong>Kanban/Flow: </strong>{aiReport.aiInsights?.kanbanAnalysis}</Paragraph>}
                    </>
                  )
                },
                ...(aiReport.aiInsights?.velocityAnalysis ? [{
                  key: '2',
                  label: <Text strong>Velocity & Scope Predictability</Text>,
                  children: (
                    <>
                      <Paragraph>{aiReport.aiInsights?.velocityAnalysis}</Paragraph>
                      {aiReport.aiInsights?.burndownAnalysis && <Paragraph><strong>Target Tracking: </strong>{aiReport.aiInsights?.burndownAnalysis}</Paragraph>}
                      {aiReport.aiInsights?.churnAnalysis && <Paragraph><strong>Scope Churn: </strong>{aiReport.aiInsights?.churnAnalysis}</Paragraph>}
                    </>
                  )
                }] : []),
                {
                  key: '3',
                  label: <Text strong>Future Predictions</Text>,
                  children: <Paragraph>{aiReport.aiInsights?.futurePredictions}</Paragraph>
                }
              ]}
            />
          </Card>

          <Card title="Risk Matrix & Mitigations" className="reports-risk-card" style={{ marginBottom: 24, borderColor: '#ffccc7' }} styles={{ header: { background: isDark ? '#431418' : '#fff1f0' } }}>
            <Table 
              dataSource={aiReport.aiInsights?.riskMatrix || []} 
              pagination={false}
              rowKey={(record) => `${record?.severity || 'risk'}-${record?.riskItem || record?.mitigation || 'item'}`}
              columns={[
                  { title: 'Severity', dataIndex: 'severity', key: 'severity', render: text => <Tag color={text?.toLowerCase() === 'high' ? 'red' : text?.toLowerCase() === 'medium' ? 'orange' : 'green'}>{text}</Tag> },
                  { title: 'Identified Risk', dataIndex: 'riskItem', key: 'riskItem' },
                  { title: 'Recommended Mitigation', dataIndex: 'mitigation', key: 'mitigation' }
              ]}
            />
          </Card>

          <Alert
              className="reports-verdict-alert"
              title="Final Verdict"
              description={<Text strong style={{ fontSize: 16 }}>{aiReport.aiInsights?.verdict}</Text>}
              type={aiReport.aiInsights?.confidenceScoring?.score > 75 ? 'success' : aiReport.aiInsights?.confidenceScoring?.score > 50 ? 'warning' : 'error'}
              showIcon
              style={{ padding: 24 }}
          />
        </div>
      )}
    </div>
  );
}
