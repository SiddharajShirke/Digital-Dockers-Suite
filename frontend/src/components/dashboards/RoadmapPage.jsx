import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Select, Space, Empty, Spin, message, Tooltip, Tabs } from 'antd';
import { PlusOutlined, BgColorsOutlined, BulbFilled, BarChartOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import epicService from '../../services/epicService';
import CreateEpicModal from './CreateEpicModal';
import EpicTimeline from './EpicTimeline';
import MonthCard from './MonthCard';
import MonthlyInsights from './MonthlyInsights';
import { generateMonthlyProgressData } from '../../utils/monthlyProgressData';
import './RoadmapPage.css';

const RoadmapPage = () => {
    const { currentProject } = useProject();
    const [epics, setEpics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [timeRange, setTimeRange] = useState('6months');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [monthlyData, setMonthlyData] = useState(null);
    const [activeTab, setActiveTab] = useState('progress'); // 'progress' or 'epics'

    // Fetch epics
    const fetchEpics = async () => {
        if (!currentProject) return;

        setLoading(true);
        try {
            const data = await epicService.getEpicsByProject(currentProject._id);
            setEpics(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch epics:', error);
            message.error('Failed to load epics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEpics();
        // Load monthly progress data
        const data = generateMonthlyProgressData();
        setMonthlyData(data);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProject]);

    // Handle create epic
    const handleCreateEpic = async (epicData) => {
        try {
            const newEpic = await epicService.createEpic({
                ...epicData,
                project: currentProject._id
            });
            setEpics([...epics, newEpic]);
            message.success(`Epic "${epicData.name}" created successfully`);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to create epic:', error);
            message.error('Failed to create epic');
        }
    };

    // Handle AI Generate Roadmap
    const handleGenerateAIRoadmap = async () => {
        setIsGeneratingAI(true);
        try {
            // Mock AI response - replace with real OpenAI API call in Phase 2
            const aiGeneratedEpics = generateMockAIEpics();
            
            // Add AI-generated epics to the list
            for (const epicData of aiGeneratedEpics) {
                try {
                    const newEpic = await epicService.createEpic({
                        ...epicData,
                        project: currentProject._id
                    });
                    setEpics(prev => [...prev, newEpic]);
                } catch (err) {
                    console.error('Failed to add AI epic:', err);
                }
            }
            message.success(`Generated ${aiGeneratedEpics.length} epic suggestions from AI`);
        } catch (error) {
            console.error('Failed to generate roadmap:', error);
            message.error('Failed to generate roadmap');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Mock AI Epic Generation (Phase 2: Replace with OpenAI API)
    const generateMockAIEpics = () => {
        const now = new Date();
        const getMonthString = (offset) => {
            const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        return [
            {
                name: 'Q1 - Core Infrastructure',
                description: 'Build foundational APIs and database layer',
                start_date: getMonthString(0),
                end_date: getMonthString(3),
                status: 'IN_PROGRESS',
                owner: 'Tech Lead'
            },
            {
                name: 'Q1/Q2 - UI/UX Redesign',
                description: 'Modernize user interface with new design system',
                start_date: getMonthString(1),
                end_date: getMonthString(4),
                status: 'PLANNED',
                owner: 'Design Team'
            },
            {
                name: 'Q2 - Analytics Dashboard',
                description: 'Real-time analytics and reporting features',
                start_date: getMonthString(3),
                end_date: getMonthString(5),
                status: 'PLANNED',
                owner: 'Product Team'
            },
            {
                name: 'Q2/Q3 - Mobile App',
                description: 'Native iOS and Android applications',
                start_date: getMonthString(4),
                end_date: getMonthString(7),
                status: 'PLANNED',
                owner: 'Mobile Team'
            },
            {
                name: 'Q3 - AI Integration',
                description: 'OpenAI/LLM features and automation',
                start_date: getMonthString(6),
                end_date: getMonthString(8),
                status: 'PLANNED',
                owner: 'AI Team'
            }
        ];
    };

    // Filter epics
    const filteredEpics = epics.filter(epic => {
        if (statusFilter !== 'all' && epic.status !== statusFilter) {
            return false;
        }
        return true;
    });

    if (!currentProject) {
        return <Empty description="Please select a project first" style={{ marginTop: 50 }} />;
    }

    // Get months to display based on timeRange
    const getDisplayMonths = () => {
        if (!monthlyData) return [];
        if (timeRange === '6months') return monthlyData.months;
        if (timeRange === '12months') return monthlyData.months.slice(0, 12);
        return monthlyData.months;
    };

    const displayMonths = getDisplayMonths();

    return (
        <div className="roadmap-page">
            {/* Header */}
            <div className="roadmap-header">
                <div>
                    <h1>Product Roadmap</h1>
                    <p className="text-secondary">{currentProject.name} — Progress Timeline</p>
                </div>
                <Space>
                    <Tooltip title="Generate roadmap using AI">
                        <Button
                            type="default"
                            icon={<BulbFilled />}
                            onClick={handleGenerateAIRoadmap}
                            loading={isGeneratingAI}
                        >
                            AI Generate
                        </Button>
                    </Tooltip>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalOpen(true)}
                    >
                        Create Epic
                    </Button>
                </Space>
            </div>

            {/* Tabs: Progress Timeline vs Epic View */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'progress',
                        label: (
                            <span>
                                <BarChartOutlined />
                                Progress Timeline
                            </span>
                        ),
                        children: (
                            <>
                                {/* Progress Controls */}
                                <Card className="roadmap-controls" style={{ marginBottom: 24 }}>
                                    <Row gutter={[16, 16]} align="middle">
                                        <Col xs={24} sm={12} md={8}>
                                            <label className="control-label">Time Range</label>
                                            <Select
                                                value={timeRange}
                                                onChange={setTimeRange}
                                                options={[
                                                    { label: '6 Months', value: '6months' },
                                                    { label: '12 Months', value: '12months' },
                                                    { label: 'All Time', value: 'all' }
                                                ]}
                                                style={{ width: '100%' }}
                                            />
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Insights */}
                                {monthlyData && <MonthlyInsights monthsData={monthlyData} />}

                                {/* Monthly Progress Timeline */}
                                <div className="roadmap-divider">
                                    <h2>Monthly Progress</h2>
                                </div>

                                {loading ? (
                                    <Spin size="large" />
                                ) : displayMonths.length > 0 ? (
                                    <Row gutter={[16, 16]} className="months-grid">
                                        {displayMonths.map((month, idx) => (
                                            <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                                                <MonthCard
                                                    month={month}
                                                    onTaskClick={(task) => {
                                                        message.info(`Selected: ${task.name}`);
                                                    }}
                                                />
                                            </Col>
                                        ))}
                                    </Row>
                                ) : (
                                    <Empty description="No monthly data" style={{ marginTop: 50 }} />
                                )}
                            </>
                        )
                    },
                    {
                        key: 'epics',
                        label: (
                            <span>
                                <BgColorsOutlined />
                                Epic View
                            </span>
                        ),
                        children: (
                            <>
                                {/* Epic Controls */}
                                <Card className="roadmap-controls" style={{ marginBottom: 24 }}>
                                    <Row gutter={[16, 16]} align="middle">
                                        <Col xs={24} sm={12} md={6}>
                                            <label className="control-label">Status Filter</label>
                                            <Select
                                                value={statusFilter}
                                                onChange={setStatusFilter}
                                                options={[
                                                    { label: 'All Statuses', value: 'all' },
                                                    { label: 'Planned', value: 'PLANNED' },
                                                    { label: 'In Progress', value: 'IN_PROGRESS' },
                                                    { label: 'Done', value: 'DONE' }
                                                ]}
                                                style={{ width: '100%' }}
                                            />
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <label className="control-label">Time Range</label>
                                            <Select
                                                value={timeRange}
                                                onChange={setTimeRange}
                                                options={[
                                                    { label: '6 Months', value: '6months' },
                                                    { label: '12 Months', value: '12months' },
                                                    { label: 'All Time', value: 'all' }
                                                ]}
                                                style={{ width: '100%' }}
                                            />
                                        </Col>
                                        <Col xs={24} sm={12} md={12}>
                                            <div className="legend">
                                                <span className="legend-item">
                                                    <span className="legend-color" style={{ backgroundColor: '#8c8c8c' }}></span>
                                                    Planned
                                                </span>
                                                <span className="legend-item">
                                                    <span className="legend-color" style={{ backgroundColor: '#1890ff' }}></span>
                                                    In Progress
                                                </span>
                                                <span className="legend-item">
                                                    <span className="legend-color" style={{ backgroundColor: '#52c41a' }}></span>
                                                    Done
                                                </span>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Epic Timeline */}
                                <Spin spinning={loading}>
                                    {filteredEpics.length > 0 ? (
                                        <EpicTimeline
                                            epics={filteredEpics}
                                            timeRange={timeRange}
                                            onEpicUpdate={fetchEpics}
                                        />
                                    ) : (
                                        <Empty
                                            description={statusFilter === 'all' ? 'No epics yet' : `No ${statusFilter.toLowerCase()} epics`}
                                            style={{ marginTop: 50 }}
                                        />
                                    )}
                                </Spin>
                            </>
                        )
                    }
                ]}
                style={{ background: '#fff' }}
            />

            {/* Create Epic Modal */}
            <CreateEpicModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateEpic}
            />
        </div>
    );
};

export default RoadmapPage;
