import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Empty, Spin, Tag, Space, Alert, Tooltip } from 'antd';
import { RiseOutlined, FallOutlined, CheckCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import { useThemeMode } from '../../context/ThemeContext';

const { Text, Title } = Typography;

/**
 * SprintBurndownChart Component
 * Displays sprint burndown data with ideal vs actual lines
 * Shows health status, velocity, and forecast
 */
const SprintBurndownChart = ({ sprintId }) => {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [burndownData, setBurndownData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const healthyColor = isDark ? '#34d399' : '#00875a';
  const riskColor = isDark ? '#fb7185' : '#ff5630';
  const primaryAccent = isDark ? '#93c5fd' : '#0052cc';
  const idealLineColor = isDark ? '#94a3b8' : '#97a0af';
  const mutedTextColor = isDark ? '#94a3b8' : '#626f86';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(0, 0, 0, 0.05)';
  const dividerColor = isDark ? 'var(--border-surface)' : '#e9ecef';
  const infoCardBackground = isDark ? 'rgba(148, 163, 184, 0.12)' : '#f5f5f5';
  const cardStyle = {
    boxShadow: isDark ? '0 8px 24px rgba(2, 6, 23, 0.48)' : '0 1px 3px rgba(0,0,0,0.08)',
    background: isDark ? 'var(--surface-primary)' : '#ffffff',
    border: isDark ? '1px solid var(--border-surface)' : '1px solid #f0f0f0'
  };

  const loadBurndownData = React.useCallback(async () => {
    if (!sprintId) {
      setError('No sprint selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/sprints/${sprintId}/burndown`,
        {
          withCredentials: true
        }
      );

      if (response.data.success) {
        setBurndownData(response.data.data);
      } else if (response.data.labels) {
        // Handle legacy response format
        setBurndownData(response.data);
      }
    } catch (err) {
      console.error('Error fetching burndown data:', err);
      if (err.response?.status === 404) {
        setError('Sprint not found');
      } else {
        setError(err.response?.data?.message || 'Failed to load burndown data');
      }
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    loadBurndownData();
  }, [sprintId, loadBurndownData]);

  if (loading) {
    return (
      <Card style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="Loading burndown data...">
            <div />
          </Spin>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={cardStyle}>
        <Alert
          message="Error Loading Burndown"
          description={error}
          type="error"
          showIcon
          action={
            <button
              onClick={loadBurndownData}
              style={{
                fontSize: 12,
                marginLeft: 12,
                color: isDark ? '#bfdbfe' : '#0052cc',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          }
        />
      </Card>
    );
  }

  if (!burndownData) {
    return (
      <Card style={cardStyle}>
        <Empty description="No sprint data available" />
      </Card>
    );
  }

  const { labels, ideal, actual, committedPoints, currentDay, sprintDays, health, trend, forecast, completionPercentage, totalPoints } = burndownData;

  // Show message if no tasks in sprint
  if (!labels || labels.length === 0 || totalPoints === 0) {
    return (
      <Card style={cardStyle}>
        <Empty description="No issues in this sprint" />
      </Card>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: labels || [],
    datasets: [
      {
        label: 'Ideal Burndown',
        data: ideal || [],
        borderColor: idealLineColor,
        borderDash: [5, 5],
        borderWidth: 2,
        tension: 0.1,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: idealLineColor
      },
      {
        label: 'Actual Remaining',
        data: actual || [],
        borderColor: health === 'healthy' ? healthyColor : riskColor,
        borderWidth: 2.5,
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: health === 'healthy' ? healthyColor : riskColor,
        pointBorderColor: isDark ? '#0f172a' : '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 12, weight: 500 },
          color: mutedTextColor,
          generateLabels: () => {
            return [
              {
                text: 'Ideal Burndown',
                fillStyle: idealLineColor,
                strokeStyle: idealLineColor,
                lineWidth: 2,
                hidden: false,
                lineDash: [5, 5],
                index: 0
              },
              {
                text: 'Actual Remaining',
                fillStyle: health === 'healthy' ? healthyColor : riskColor,
                strokeStyle: health === 'healthy' ? healthyColor : riskColor,
                lineWidth: 2.5,
                hidden: false,
                index: 1
              }
            ];
          }
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(0,0,0,0.8)',
        padding: 12,
        titleColor: isDark ? '#e2e8f0' : '#fff',
        bodyColor: isDark ? '#e2e8f0' : '#fff',
        borderColor: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y} points`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: committedPoints * 1.1,
        ticks: {
          color: mutedTextColor,
          font: { size: 11 }
        },
        grid: {
          color: gridColor
        }
      },
      x: {
        ticks: {
          color: mutedTextColor,
          font: { size: 11 }
        },
        grid: {
          color: gridColor
        }
      }
    }
  };

  return (
    <div>
      {/* Header with Status */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: isDark ? '#e2e8f0' : '#111827' }}>📈 Sprint Burndown</span>
            <Tag
              color={health === 'healthy' ? 'green' : 'red'}
              style={{ marginLeft: 12, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}
            >
              {health === 'healthy' ? '✓ On Track' : '⚠ At Risk'}
            </Tag>
          </div>
        }
        style={{ ...cardStyle, marginBottom: 0 }}
      >
        {/* Chart */}
        <div style={{ height: 380, marginBottom: 24 }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Stats Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: 24, paddingTop: 24, borderTop: `1px solid ${dividerColor}` }}>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, color: mutedTextColor }}>Committed Points</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: primaryAccent }}>
                {committedPoints}
              </Title>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, color: mutedTextColor }}>Points Remaining</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: riskColor }}>
                {actual[actual.length - 1] || 0}
              </Title>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, color: mutedTextColor }}>Completion</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: healthyColor }}>
                {completionPercentage}%
              </Title>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, color: mutedTextColor }}>Sprint Progress</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: primaryAccent }}>
                {currentDay != null && sprintDays != null ? `${currentDay}/${sprintDays} days` : '0 days'}
              </Title>
            </div>
          </Col>
        </Row>

        {/* Insights Row */}
        <Row gutter={[16, 16]} style={{ paddingTop: 16, borderTop: `1px solid ${dividerColor}` }}>
          {/* Trend */}
          <Col xs={24} sm={8}>
            <div style={{ padding: '12px', backgroundColor: infoCardBackground, borderRadius: 6 }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 12, color: isDark ? '#e2e8f0' : '#111827' }}>Velocity Trend</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {trend === 'improving' && (
                    <>
                      <FallOutlined style={{ color: healthyColor, fontSize: 18 }} />
                      <Text style={{ color: healthyColor, fontWeight: 600 }}>Improving</Text>
                    </>
                  )}
                  {trend === 'worsening' && (
                    <>
                      <RiseOutlined style={{ color: riskColor, fontSize: 18 }} />
                      <Text style={{ color: riskColor, fontWeight: 600 }}>Worsening</Text>
                    </>
                  )}
                  {trend === 'stable' && (
                    <>
                      <CheckCircleOutlined style={{ color: primaryAccent, fontSize: 18 }} />
                      <Text style={{ color: primaryAccent, fontWeight: 600 }}>Stable</Text>
                    </>
                  )}
                </div>
              </Space>
            </div>
          </Col>

          {/* Forecast */}
          <Col xs={24} sm={8}>
            {forecast ? (
              <div style={{ padding: '12px', backgroundColor: infoCardBackground, borderRadius: 6 }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 12, color: isDark ? '#e2e8f0' : '#111827' }}>Forecast</Text>
                  <div>
                    <Text style={{ fontSize: 12, color: isDark ? '#e2e8f0' : '#111827' }}>
                      {forecast.willCompleteOnTime ? (
                        <span style={{ color: healthyColor }}>
                          ✓ On time ({forecast.daysEarlyOrLate} days early)
                        </span>
                      ) : (
                        <span style={{ color: riskColor }}>
                          ⚠ {Math.abs(forecast.daysEarlyOrLate)} days late
                        </span>
                      )}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, color: mutedTextColor }}>
                    {forecast.avgBurnPerDay} pts/day
                  </Text>
                </Space>
              </div>
            ) : (
              <Tooltip title="Requires at least 2 completed sprints to forecast">
                <div style={{ padding: '12px', backgroundColor: infoCardBackground, borderRadius: 6, minHeight: 74 }}>
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 12, color: isDark ? '#e2e8f0' : '#111827' }}>Forecast</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <LineChartOutlined style={{ fontSize: 16, color: mutedTextColor }} />
                      <div style={{ height: 1, borderTop: `2px dotted ${isDark ? '#64748b' : '#d9d9d9'}`, width: '100%' }}></div>
                    </div>
                  </Space>
                </div>
              </Tooltip>
            )}
          </Col>

          {/* Status */}
          <Col xs={24} sm={8}>
            <div style={{
              padding: '12px',
              backgroundColor: health === 'healthy'
                ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#dffcf0')
                : (isDark ? 'rgba(251, 113, 133, 0.14)' : '#fff7f0'),
              borderRadius: 6,
              border: `1px solid ${health === 'healthy' ? (isDark ? '#34d399' : '#4BCE97') : (isDark ? '#fb7185' : '#f87462')}`
            }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 12, color: health === 'healthy' ? healthyColor : riskColor }}>
                  {health === 'healthy' ? '✓ Health: Good' : '⚠ Health: At Risk'}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, color: mutedTextColor }}>
                  {health === 'healthy' ? 'Sprint is on track' : 'Review and adjust'}
                </Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SprintBurndownChart;
