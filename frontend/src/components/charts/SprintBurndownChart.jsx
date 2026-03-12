import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Empty, Spin, Tag, Space, Alert, Tooltip, Statistic } from 'antd';
import { RiseOutlined, FallOutlined, CheckCircleOutlined, WarningOutlined, LineChartOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

const { Text, Title } = Typography;

/**
 * SprintBurndownChart Component
 * Displays sprint burndown data with ideal vs actual lines
 * Shows health status, velocity, and forecast
 */
const SprintBurndownChart = ({ sprintId }) => {
  const [burndownData, setBurndownData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBurndownData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprintId]);

  const loadBurndownData = async () => {
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
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
  };

  if (loading) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="Loading burndown data..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Alert
          message="Error Loading Burndown"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={loadBurndownData} style={{ fontSize: 12, marginLeft: 12 }}>
              Retry
            </button>
          }
        />
      </Card>
    );
  }

  if (!burndownData) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Empty description="No sprint data available" />
      </Card>
    );
  }

  const { labels, ideal, actual, committedPoints, currentDay, sprintDays, health, trend, forecast, completionPercentage, totalPoints } = burndownData;

  // Show message if no tasks in sprint
  if (!labels || labels.length === 0 || totalPoints === 0) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
        borderColor: '#97a0af',
        borderDash: [5, 5],
        borderWidth: 2,
        tension: 0.1,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#97a0af'
      },
      {
        label: 'Actual Remaining',
        data: actual || [],
        borderColor: health === 'healthy' ? '#00875a' : '#ff5630',
        borderWidth: 2.5,
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: health === 'healthy' ? '#00875a' : '#ff5630',
        pointBorderColor: '#fff',
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
          color: '#626f86',
          generateLabels: () => {
            return [
              {
                text: 'Ideal Burndown',
                fillStyle: '#97a0af',
                strokeStyle: '#97a0af',
                lineWidth: 2,
                hidden: false,
                lineDash: [5, 5],
                index: 0
              },
              {
                text: 'Actual Remaining',
                fillStyle: health === 'healthy' ? '#00875a' : '#ff5630',
                strokeStyle: health === 'healthy' ? '#00875a' : '#ff5630',
                lineWidth: 2.5,
                hidden: false,
                index: 1
              }
            ];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.2)',
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
          color: '#626f86',
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        ticks: {
          color: '#626f86',
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
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
            <span>📈 Sprint Burndown</span>
            <Tag
              color={health === 'healthy' ? 'green' : 'red'}
              style={{ marginLeft: 12, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}
            >
              {health === 'healthy' ? '✓ On Track' : '⚠ At Risk'}
            </Tag>
          </div>
        }
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 0 }}
      >
        {/* Chart */}
        <div style={{ height: 380, marginBottom: 24 }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Stats Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: 24, paddingTop: 24, borderTop: '1px solid #e9ecef' }}>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Committed Points</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: '#0052cc' }}>
                {committedPoints}
              </Title>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Points Remaining</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: '#ff5630' }}>
                {actual[actual.length - 1] || 0}
              </Title>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Completion</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: '#00875a' }}>
                {completionPercentage}%
              </Title>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Sprint Progress</Text>
              <Title level={4} style={{ margin: '8px 0 0 0', color: '#0052cc' }}>
                {currentDay != null && sprintDays != null ? `${currentDay}/${sprintDays} days` : '0 days'}
              </Title>
            </div>
          </Col>
        </Row>

        {/* Insights Row */}
        <Row gutter={[16, 16]} style={{ paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
          {/* Trend */}
          <Col xs={24} sm={8}>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 12 }}>Velocity Trend</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {trend === 'improving' && (
                    <>
                      <FallOutlined style={{ color: '#00875a', fontSize: 18 }} />
                      <Text style={{ color: '#00875a', fontWeight: 600 }}>Improving</Text>
                    </>
                  )}
                  {trend === 'worsening' && (
                    <>
                      <RiseOutlined style={{ color: '#ff5630', fontSize: 18 }} />
                      <Text style={{ color: '#ff5630', fontWeight: 600 }}>Worsening</Text>
                    </>
                  )}
                  {trend === 'stable' && (
                    <>
                      <CheckCircleOutlined style={{ color: '#0052cc', fontSize: 18 }} />
                      <Text style={{ color: '#0052cc', fontWeight: 600 }}>Stable</Text>
                    </>
                  )}
                </div>
              </Space>
            </div>
          </Col>

          {/* Forecast */}
          <Col xs={24} sm={8}>
            {forecast ? (
              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 12 }}>Forecast</Text>
                  <div>
                    <Text style={{ fontSize: 12 }}>
                      {forecast.willCompleteOnTime ? (
                        <span style={{ color: '#00875a' }}>
                          ✓ On time ({forecast.daysEarlyOrLate} days early)
                        </span>
                      ) : (
                        <span style={{ color: '#ff5630' }}>
                          ⚠ {Math.abs(forecast.daysEarlyOrLate)} days late
                        </span>
                      )}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {forecast.avgBurnPerDay} pts/day
                  </Text>
                </Space>
              </div>
            ) : (
              <Tooltip title="Requires at least 2 completed sprints to forecast">
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 6, minHeight: 74 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 12 }}>Forecast</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <LineChartOutlined style={{ fontSize: 16, color: '#bfbfbf' }} />
                      <div style={{ height: 1, borderTop: '2px dotted #d9d9d9', width: '100%' }}></div>
                    </div>
                  </Space>
                </div>
              </Tooltip>
            )}
          </Col>

          {/* Status */}
          <Col xs={24} sm={8}>
            <div style={{ padding: '12px', backgroundColor: health === 'healthy' ? '#dffcf0' : '#fff7f0', borderRadius: 6, border: `1px solid ${health === 'healthy' ? '#4BCE97' : '#f87462'}` }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 12, color: health === 'healthy' ? '#00875a' : '#ff5630' }}>
                  {health === 'healthy' ? '✓ Health: Good' : '⚠ Health: At Risk'}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
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
