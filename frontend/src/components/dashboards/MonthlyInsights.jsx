import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { getVelocityTrend, calculateCapacityUtilization } from '../../utils/monthlyProgressData';
import './MonthlyInsights.css';

const MonthlyInsights = ({ monthsData }) => {
    const velocityTrend = getVelocityTrend(monthsData, 5);
    const capacityData = calculateCapacityUtilization(monthsData);

    // Calculate trend direction
    const velocities = velocityTrend.map(v => v.velocity);
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const lastVelocity = velocities[velocities.length - 1];
    const velocityTrend_direction = lastVelocity > avgVelocity ? 'up' : 'down';

    return (
        <div className="monthly-insights">
            {/* Key Metrics */}
            <Card className="insights-card metrics-card">
                <h2>Team Velocity & Capacity</h2>
                <Row gutter={[32, 32]} style={{ marginTop: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Average Velocity"
                            value={capacityData.averageVelocity}
                            suffix="points/month"
                            prefix={<span className="velocity-badge">📊</span>}
                            styles={{ content: { color: '#1890ff' } }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Last Month"
                            value={velocities[velocities.length - 1]}
                            suffix="points"
                            prefix={velocityTrend_direction === 'up' ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
                            styles={{ content: { color: velocityTrend_direction === 'up' ? '#52c41a' : '#ff4d4f' } }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Estimated Burndown"
                            value="4 months"
                            prefix="⏱️"
                            styles={{ content: { color: '#faad14' } }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="On-Time Delivery"
                            value="85%"
                            suffix="%"
                            prefix="✅"
                            styles={{ content: { color: '#52c41a' } }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Velocity Chart */}
            <Card className="insights-card chart-card">
                <h3>Velocity Trend (Last 5 Months)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={velocityTrend}>
                        <defs>
                            <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #f0f0f0',
                                borderRadius: 4
                            }}
                            formatter={(value) => [`${value} points`, 'Velocity']}
                        />
                        <Area
                            type="monotone"
                            dataKey="velocity"
                            stroke="#1890ff"
                            fillOpacity={1}
                            fill="url(#colorVelocity)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Card>

            {/* Capacity Planning */}
            <Card className="insights-card capacity-card">
                <h3>Future Months Capacity Utilization</h3>
                <div className="capacity-grid">
                    {capacityData.futureCapacity.map((month, idx) => (
                        <div key={idx} className="capacity-item">
                            <div className="month-name">{month.month}</div>
                            <div className="capacity-bar">
                                <div
                                    className="capacity-fill"
                                    style={{
                                        width: `${Math.min(month.capacityUtilization, 100)}%`,
                                        backgroundColor: month.capacityUtilization > 100 ? '#ff4d4f' : '#3B82F6'
                                    }}
                                >
                                    {month.capacityUtilization > 0 && (
                                        <span className="capacity-percent">{month.capacityUtilization}%</span>
                                    )}
                                </div>
                            </div>
                            <div className="capacity-details">
                                <small>{month.plannedPoints} points planned</small>
                                {month.capacityUtilization > 100 && (
                                    <small className="overload">Overload: {month.capacityUtilization - 100}%</small>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Quick Tips */}
            <Card className="insights-card tips-card" styles={{ body: { padding: '16px 20px' } }} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <strong style={{ color: '#0f172a', fontSize: 14 }}>AI Insights</strong>
                </div>
                <div className="tips-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    <div className="tip" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <span style={{ color: '#10B981', fontWeight: 600, marginRight: 4 }}>Strong Performance:</span> 
                        Team has maintained consistent velocity. Keep up the momentum!
                    </div>
                    <div className="tip" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <span style={{ color: '#EF4444', fontWeight: 600, marginRight: 4 }}>Capacity Alert:</span> 
                        March is overloaded at {capacityData.futureCapacity[1]?.capacityUtilization}%. Consider deferring items.
                    </div>
                    <div className="tip" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <span style={{ color: '#3B82F6', fontWeight: 600, marginRight: 4 }}>Trend:</span> 
                        Velocity improving month-over-month. {velocityTrend_direction === 'up' ? 'Team efficiency increasing.' : 'Monitor for bottlenecks.'}
                    </div>
                    <div className="tip" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <span style={{ color: '#8B5CF6', fontWeight: 600, marginRight: 4 }}>Forecast:</span> 
                        With current velocity, project completes in ~4 months.
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default MonthlyInsights;
