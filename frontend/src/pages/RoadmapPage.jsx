import React, { useState, useEffect, useMemo } from 'react';
import { Collapse, Tag, Spin, Alert, Progress, Segmented, Table, Empty, Card, Select, Button, message } from 'antd';
import {
    RocketOutlined, ThunderboltOutlined, ClockCircleOutlined,
    CheckCircleOutlined, WarningOutlined, InfoCircleOutlined,
    TeamOutlined, ProjectOutlined, FundOutlined, BulbOutlined,
    CaretRightOutlined
} from '@ant-design/icons';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Area
} from 'recharts';
import { fetchRoadmapData, fetchInsights } from '../services/roadmapService';
import '../styles/RoadmapPage.css';

/**
 * ============================================================================
 * ROADMAP PAGE — Dynamic Drill-Down with NVIDIA AI Insights
 * ============================================================================
 * Data Flow: API → KPI Header → Velocity Chart → Accordion → AI Insights
 * Drill-Down: Month (L1) → Project (L2) → Team Pills (L3) → Tasks (L4)
 *
 * Zero hardcoded values — everything fetched from /api/roadmap.
 */

/* ---------- KPI CARD ---------- */
const KpiCard = ({ icon, title, value, suffix, color }) => (
    <div className="roadmap-kpi-card" style={{ borderTop: `3px solid ${color}` }}>
        <div className="kpi-icon" style={{ color }}>{icon}</div>
        <div className="kpi-body">
            <div className="kpi-value">{value}<span className="kpi-suffix">{suffix}</span></div>
            <div className="kpi-title">{title}</div>
        </div>
    </div>
);

/* ---------- STATUS TAG COLORS ---------- */
const statusColors = {
    TODO: 'default',
    IN_PROGRESS: 'processing',
    REVIEW: 'warning',
    DONE: 'success',
    BLOCKED: 'error',
};

/* ---------- TASK TABLE COLUMNS ---------- */
const taskColumns = [
    { title: 'ID', dataIndex: 'taskId', key: 'taskId', width: 100 },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    {
        title: 'Points', dataIndex: 'points', key: 'points', width: 80,
        sorter: (a, b) => (a.points || 0) - (b.points || 0),
        render: (pts) => <Tag color="blue">{pts || 0} SP</Tag>
    },
    {
        title: 'Status', dataIndex: 'status', key: 'status', width: 130,
        render: (s) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>
    },
    { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 150 },
];

import MonthColumn from '../components/roadmap/MonthColumn';

/* ---------- MAIN PAGE ---------- */
const RoadmapPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Time Filter State
    const [pastMonthsFilter, setPastMonthsFilter] = useState(12);

    // AI Insights State
    const [aiInsights, setAiInsights] = useState([]);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [selectedProject, setSelectedProject] = useState('general');

    // Drill-Down State
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);

    // ──── VELOCITY CHART FILTERS ────
    const [chartProjectFilter, setChartProjectFilter] = useState('all');
    const [chartSprintFilter, setChartSprintFilter] = useState('all');
    const [chartPersonFilter, setChartPersonFilter] = useState('all');

    // Generate project options for AI filter (MUST BE BEFORE EARLY RETURNS)
    const projectOptions = useMemo(() => {
        if (!data || !data.monthlyProgress) return [];
        const uniqueProjects = new Map();
        data.monthlyProgress.forEach(month => {
            (month.projects || []).forEach(p => {
                if (!uniqueProjects.has(p.projectId)) {
                    uniqueProjects.set(p.projectId, p.projectName);
                }
            });
        });
        const options = [{ value: 'general', label: 'All Projects (General)' }];
        uniqueProjects.forEach((name, id) => {
            options.push({ value: id, label: name });
        });
        return options;
    }, [data]);

    // Velocity chart PROJECT options
    const chartProjectOptions = useMemo(() => {
        if (!data?.monthlyProgress) return [];
        const uniqueProjects = new Map();
        data.monthlyProgress.forEach(month => {
            (month.projects || []).forEach(p => {
                if (!uniqueProjects.has(p.projectId)) {
                    uniqueProjects.set(p.projectId, p.projectName);
                }
            });
        });
        const opts = [{ value: 'all', label: '🌐 All Projects' }];
        uniqueProjects.forEach((name, id) => opts.push({ value: id, label: name }));
        return opts;
    }, [data]);

    // Velocity chart SPRINT options (cascading from project)
    const chartSprintOptions = useMemo(() => {
        if (!data?.monthlyProgress) return [];
        const uniqueSprints = new Map();
        data.monthlyProgress.forEach(month => {
            (month.projects || []).forEach(p => {
                if (chartProjectFilter !== 'all' && p.projectId !== chartProjectFilter) return;
                (p.sprints || []).forEach(s => {
                    if (!uniqueSprints.has(s.sprintId)) {
                        uniqueSprints.set(s.sprintId, s.sprintName);
                    }
                });
            });
        });
        const opts = [{ value: 'all', label: '🏃 All Sprints' }];
        uniqueSprints.forEach((name, id) => opts.push({ value: id, label: name }));
        return opts;
    }, [data, chartProjectFilter]);

    // Velocity chart PERSON options (cascading from project + sprint)
    const chartPersonOptions = useMemo(() => {
        if (!data?.monthlyProgress) return [];
        const uniquePersons = new Set();
        data.monthlyProgress.forEach(month => {
            (month.projects || []).forEach(p => {
                if (chartProjectFilter !== 'all' && p.projectId !== chartProjectFilter) return;
                (p.sprints || []).forEach(s => {
                    if (chartSprintFilter !== 'all' && s.sprintId !== chartSprintFilter) return;
                    (s.tasks || []).forEach(t => {
                        if (t.assignee && t.assignee !== 'Unassigned') uniquePersons.add(t.assignee);
                    });
                });
            });
        });
        const opts = [{ value: 'all', label: '👤 All People' }];
        uniquePersons.forEach(name => opts.push({ value: name, label: name }));
        return opts;
    }, [data, chartProjectFilter, chartSprintFilter]);

    // ──── FILTERED CHART DATA (based on Project/Sprint/Person filters) ────
    const isPersonMode = chartPersonFilter !== 'all';
    const filteredChartData = useMemo(() => {
        const chartTimeline = data?.chartTimeline || [];
        const monthlyProgress = data?.monthlyProgress || [];

        if (!monthlyProgress || monthlyProgress.length === 0) return chartTimeline;

        // If Person mode: aggregate by person across months
        if (isPersonMode) {
            const personMap = {}; // personName -> { completed, ongoing, planned }
            monthlyProgress.forEach(month => {
                (month.projects || []).forEach(p => {
                    if (chartProjectFilter !== 'all' && p.projectId !== chartProjectFilter) return;
                    (p.sprints || []).forEach(s => {
                        if (chartSprintFilter !== 'all' && s.sprintId !== chartSprintFilter) return;
                        (s.tasks || []).forEach(t => {
                            const person = t.assignee || 'Unassigned';
                            if (chartPersonFilter !== 'all' && person !== chartPersonFilter) return;
                            if (!personMap[person]) personMap[person] = { completedPoints: 0, ongoingPoints: 0, plannedPoints: 0 };
                            const status = (t.status || '').toUpperCase();
                            const pts = t.points || 0;
                            if (status === 'DONE') personMap[person].completedPoints += pts;
                            else if (status === 'TODO') personMap[person].plannedPoints += pts;
                            else personMap[person].ongoingPoints += pts;
                        });
                    });
                });
            });
            return Object.entries(personMap).map(([name, pts]) => ({
                month: name,
                ...pts,
                teamCapacity: 0
            }));
        }

        // Else if Project or Sprint filter: re-aggregate monthly from monthlyProgress
        if (chartProjectFilter !== 'all' || chartSprintFilter !== 'all') {
            return (chartTimeline || []).map((bucket, idx) => {
                const monthData = monthlyProgress[idx];
                if (!monthData) return bucket;

                let completed = 0, ongoing = 0, planned = 0;
                (monthData.projects || []).forEach(p => {
                    if (chartProjectFilter !== 'all' && p.projectId !== chartProjectFilter) return;
                    (p.sprints || []).forEach(s => {
                        if (chartSprintFilter !== 'all' && s.sprintId !== chartSprintFilter) return;
                        (s.tasks || []).forEach(t => {
                            const pts = t.points || 0;
                            const status = (t.status || '').toUpperCase();
                            if (status === 'DONE') completed += pts;
                            else if (status === 'TODO') planned += pts;
                            else ongoing += pts;
                        });
                    });
                });
                return { ...bucket, completedPoints: completed, ongoingPoints: ongoing, plannedPoints: planned };
            });
        }

        return chartTimeline;
    }, [data, chartProjectFilter, chartSprintFilter, chartPersonFilter, isPersonMode]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const payload = await fetchRoadmapData(pastMonthsFilter, 3);
                if (!cancelled) setData(payload);
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [pastMonthsFilter]);

    if (loading) {
        return (
            <div className="roadmap-loading">
                <Spin size="large" tip="Loading Roadmap..." fullscreen />
            </div>
        );
    }

    if (error) {
        return (
            <div className="roadmap-error">
                <Alert type="error" message="Failed to load Roadmap" description={error} showIcon />
            </div>
        );
    }

    if (!data) return null;

    const { kpiHeader, chartTimeline, monthlyProgress } = data;



    const handleGenerateInsights = async () => {
        try {
            setLoadingInsights(true);
            const payload = await fetchInsights(selectedProject);
            setAiInsights(payload.insights || []);
            message.success('AI Insights generated successfully!');
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to generate insights');
        } finally {
            setLoadingInsights(false);
        }
    };

    // Current focused metrics (Overall vs. Selected Month)
    const isFiltered = selectedMonthIndex !== null;
    const activeData = isFiltered ? chartTimeline[selectedMonthIndex] : null;

    const displayMetrics = {
        avgVelocity: isFiltered ? activeData.completedPoints : (kpiHeader?.averageVelocity ?? 0),
        monthlyVelocity: isFiltered ? activeData.completedPoints : (kpiHeader?.lastMonthVelocity ?? 0),
        burndown: isFiltered ? activeData.estimatedBurndownMonths : (kpiHeader?.estimatedBurndownMonths ?? 0),
        onTime: isFiltered ? activeData.onTimeDeliveryPercentage : (kpiHeader?.onTimeDeliveryPercentage ?? 0)
    };

    // The new unified timeline handles past, present, and future natively
    const chartData = chartTimeline || [];

    // AI Insight icon map
    const insightIcons = {
        success: <CheckCircleOutlined />,
        warning: <WarningOutlined />,
        info: <InfoCircleOutlined />
    };

    return (
        <div className="roadmap-page-v2">
            {/* ──── HEADER ──── */}
            <div className="roadmap-header-v2">
                <div className="roadmap-header-topline">Execution cockpit</div>
                <div className="roadmap-header-main">
                    <div>
                        <h1><FundOutlined style={{ marginRight: 10 }} />Project Roadmap</h1>
                        <p className="roadmap-subtitle">
                            Dynamic execution view — Last 12 months + Next 3 months
                        </p>
                    </div>
                    <div className="roadmap-header-badge">Live planning view</div>
                </div>
            </div>

            {/* ──── KPI CARDS ──── */}
            <div className="kpi-grid">
                <KpiCard
                    icon={<RocketOutlined />}
                    title={isFiltered ? `Velocity (${activeData.month})` : "Avg Velocity"}
                    value={displayMetrics.avgVelocity}
                    suffix=" pts/sprint"
                    color="#722ed1"
                />
                <KpiCard
                    icon={<ThunderboltOutlined />}
                    title="Velocity Per Month"
                    value={displayMetrics.monthlyVelocity}
                    suffix=" pts"
                    color="#1890ff"
                />
                <KpiCard
                    icon={<ClockCircleOutlined />}
                    title="Est. Burndown"
                    value={displayMetrics.burndown}
                    suffix=" months"
                    color="#fa8c16"
                />
                <KpiCard
                    icon={<CheckCircleOutlined />}
                    title="On-Time Delivery"
                    value={displayMetrics.onTime}
                    suffix="%"
                    color="#52c41a"
                />
            </div>

            {/* ──── VELOCITY & CAPACITY COMBO CHART ──── */}
            <Card
                className="roadmap-chart-card"
                title={<><FundOutlined /> Velocity & Capacity Trend {isFiltered && <Tag color="blue" closable onClose={() => setSelectedMonthIndex(null)} style={{ marginLeft: 12 }}>Viewing: {activeData.month}</Tag>}</>}
                extra={
                    <div className="roadmap-chart-actions">
                        {isFiltered && <Button size="small" onClick={() => setSelectedMonthIndex(null)}>Reset to Overall</Button>}
                        <Select
                            value={pastMonthsFilter}
                            onChange={(val) => { setPastMonthsFilter(val); setSelectedMonthIndex(null); }}
                            className="roadmap-compact-select"
                            options={[
                                { value: 1, label: 'Last 1 Month' },
                                { value: 3, label: 'Last 3 Months' },
                                { value: 5, label: 'Last 5 Months' },
                                { value: 12, label: 'Last 12 Months' }
                            ]}
                        />
                    </div>
                }
            >
                {/* ──── FILTER ROW: Project → Sprint → Person ──── */}
                <div className="roadmap-filter-row">
                    <Select
                        value={chartProjectFilter}
                        onChange={(val) => { setChartProjectFilter(val); setChartSprintFilter('all'); setChartPersonFilter('all'); }}
                        className="roadmap-filter-select"
                        options={chartProjectOptions}
                        placeholder="Filter by Project"
                    />
                    <Select
                        value={chartSprintFilter}
                        onChange={(val) => { setChartSprintFilter(val); setChartPersonFilter('all'); }}
                        className="roadmap-filter-select"
                        options={chartSprintOptions}
                        placeholder="Filter by Sprint"
                    />
                    <Select
                        value={chartPersonFilter}
                        onChange={setChartPersonFilter}
                        className="roadmap-filter-select"
                        options={chartPersonOptions}
                        placeholder="Filter by Person"
                    />
                    {(chartProjectFilter !== 'all' || chartSprintFilter !== 'all' || chartPersonFilter !== 'all') && (
                        <Button type="link" size="small" className="roadmap-filter-reset" onClick={() => { setChartProjectFilter('all'); setChartSprintFilter('all'); setChartPersonFilter('all'); }}>
                            Reset Filters
                        </Button>
                    )}
                </div>

                {filteredChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart
                            data={filteredChartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            onClick={(state) => {
                                if (!isPersonMode && state && state.activeTooltipIndex !== undefined) {
                                    setSelectedMonthIndex(state.activeTooltipIndex);
                                }
                            }}
                            style={{ cursor: isPersonMode ? 'default' : 'pointer' }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="completedPoints"
                                stackId="a"
                                name={isPersonMode ? "Completed" : "Completed Tasks"}
                                fill="#52c41a"
                            />
                            <Bar
                                dataKey="ongoingPoints"
                                stackId="a"
                                name={isPersonMode ? "Ongoing" : "Ongoing Projects"}
                                fill="#1890ff"
                            />
                            <Bar
                                dataKey="plannedPoints"
                                stackId="a"
                                name={isPersonMode ? "Planned" : "Future Planned"}
                                fill="#fa8c16"
                                radius={[4, 4, 0, 0]}
                            />
                            {!isPersonMode && (
                                <Line
                                    type="monotone"
                                    dataKey="teamCapacity"
                                    name="Team Capacity"
                                    stroke="#fa541c"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <Empty description="No velocity data available" />
                )}
            </Card>

            {/* ──── HORIZONTAL COLUMNAR BOARD ──── */}
            <Card
                className="roadmap-board-card"
                title={<><ProjectOutlined /> Monthly Sprint Planner</>}
                extra={<span className="roadmap-board-subtitle">Professional month-by-month execution overview</span>}
            >
                {monthlyProgress && monthlyProgress.length > 0 ? (
                    <div className="roadmap-board">
                        {monthlyProgress.map((monthData, idx) => {
                            // Find relevant AI insight for this month if possible
                            const insight = aiInsights?.find(i => i.message && i.message.includes(monthData.month));
                            return (
                                <MonthColumn 
                                    key={idx} 
                                    monthData={monthData} 
                                    aiInsight={insight?.message} 
                                />
                            );
                        })}
                    </div>
                ) : (
                    <Empty description="No monthly progress data available." />
                )}
            </Card>

            {/* ──── AI INSIGHTS ──── */}
            <Card
                className="roadmap-insights-card"
                title={<><BulbOutlined /> AI Insights</>}
                extra={
                    <div className="roadmap-insights-toolbar">
                        <Select 
                            value={selectedProject} 
                            onChange={setSelectedProject}
                            options={projectOptions}
                            className="roadmap-insights-select"
                        />
                        <Button 
                            type="primary" 
                            onClick={handleGenerateInsights} 
                            loading={loadingInsights}
                            icon={<RocketOutlined />}
                        >
                            Generate Insights
                        </Button>
                    </div>
                }
            >
                {loadingInsights ? (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <Spin tip="NVIDIA AI is analyzing your project telemetry..." />
                    </div>
                ) : aiInsights && aiInsights.length > 0 ? (
                    <div className="insights-list">
                        {aiInsights.map((insight, idx) => (
                            <Alert
                                key={idx}
                                type={insight.type || 'info'}
                                message={insight.message}
                                icon={insightIcons[insight.type] || <InfoCircleOutlined />}
                                showIcon
                                className="insight-alert"
                            />
                        ))}
                    </div>
                ) : (
                    <Empty description="Select a project filter and click Generate Insights to analyze this roadmap." />
                )}
            </Card>
        </div>
    );
};

export default RoadmapPage;



