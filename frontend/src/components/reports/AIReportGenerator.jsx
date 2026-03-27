import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Spin, Typography, Row, Col, Divider, Tag, Space, Alert, Collapse, Table, Progress } from 'antd';
import { FilePdfOutlined, FileWordOutlined, Html5Outlined, RobotOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { reportService } from '../../services/reportService';
import projectService from '../../services/projectService';
import sprintService from '../../services/sprintService';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const { Title: AntTitle, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export default function AIReportGenerator() {
    const [projects, setProjects] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedSprint, setSelectedSprint] = useState('all');
    
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingSprints, setLoadingSprints] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoadingProjects(true);
        try {
            const data = await projectService.getProjects();
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects', err);
        }
        setLoadingProjects(false);
    };

    const handleProjectChange = async (projectId) => {
        setSelectedProject(projectId);
        setSelectedSprint('all');
        setSprints([]);
        setReportData(null);
        setError(null);
        
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

    const handleGenerate = async () => {
        if (!selectedProject) return;
        
        setGenerating(true);
        setError(null);
        setReportData(null);
        
        try {
            let data;
            if (selectedSprint === 'all') {
                data = await reportService.generateProjectReport(selectedProject);
            } else {
                data = await reportService.generateSprintReport(selectedSprint);
            }
            setReportData(data);
        } catch (err) {
            setError(err.toString());
        }
        setGenerating(false);
    };

    const handleExport = async (format) => {
        if (!reportData) return;
        try {
            await reportService.exportReport(reportData, format);
        } catch (err) {
            setError(`Export to ${format.toUpperCase()} failed: ${err}`);
        }
    };

    const renderCharts = () => {
        if (!reportData) return null;
        
        const isProject = reportData.reportType === 'PROJECT';
        const tasks = reportData.tasks || [];
        const metrics = reportData.metrics || {};
        const ai = reportData.aiInsights || {};

        // 1. Task Status Distribution (Pie)
        const pieData = {
            labels: ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'],
            datasets: [{
                data: [
                    metrics.statusDistribution?.todo || 0,
                    metrics.statusDistribution?.in_progress || 0,
                    metrics.statusDistribution?.review || 0,
                    metrics.statusDistribution?.done || 0,
                    metrics.statusDistribution?.blocked || 0
                ],
                backgroundColor: ['#d9d9d9', '#1890ff', '#722ed1', '#52c41a', '#f5222d'],
                borderWidth: 1
            }]
        };

        // 2. Assignee Workload (Bar)
        const workloadData = {
            labels: metrics.assigneeWorkload?.map(w => w.name) || [],
            datasets: [
                {
                    label: 'Tasks Assigned',
                    data: metrics.assigneeWorkload?.map(w => w.tasksAssigned) || [],
                    backgroundColor: '#1890ff'
                },
                {
                    label: 'Story Points',
                    data: metrics.assigneeWorkload?.map(w => w.storyPoints) || [],
                    backgroundColor: '#13c2c2'
                }
            ]
        };

        // 3. Velocity Trend (Only for projects)
        let velocityData = null;
        if (isProject && metrics.velocityTrend && metrics.velocityTrend.length > 0) {
            velocityData = {
                labels: metrics.velocityTrend.map(v => v.name),
                datasets: [
                    {
                        label: 'Committed Points',
                        data: metrics.velocityTrend.map(v => v.committed),
                        borderColor: '#fa8c16',
                        backgroundColor: 'rgba(250, 140, 22, 0.2)',
                        type: 'line',
                        fill: true
                    },
                    {
                        label: 'Completed Points',
                        data: metrics.velocityTrend.map(v => v.completed),
                        backgroundColor: '#52c41a',
                        type: 'bar'
                    }
                ]
            };
        }

        return (
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col span={12}>
                    <Card title="Task Status Distribution" size="small" style={{ height: '100%' }}>
                        <div style={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Assignee Workload" size="small" style={{ height: '100%' }}>
                        <div style={{ height: 250 }}>
                            <Bar data={workloadData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </Card>
                </Col>
                {isProject && velocityData && (
                    <Col span={24}>
                        <Card title="Velocity & Commitment Trend" size="small">
                            <div style={{ height: 300 }}>
                                <Bar data={velocityData} options={{ maintainAspectRatio: false }} />
                            </div>
                        </Card>
                    </Col>
                )}
            </Row>
        );
    };

    return (
        <div style={{ marginTop: 40, borderTop: '1px solid #f0f0f0', paddingTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <RobotOutlined style={{ fontSize: 28, color: '#722ed1', marginRight: 16 }} />
                <div>
                    <AntTitle level={3} style={{ margin: 0 }}>NVIDIA AI Report Generator</AntTitle>
                    <Text type="secondary">Generate comprehensive, LLM-driven technical analysis for projects and sprints.</Text>
                </div>
            </div>

            <Card style={{ marginBottom: 24, background: '#fafafa' }}>
                <Space size="large" align="end" wrap>
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Project</Text>
                        <Select 
                            style={{ width: 250 }} 
                            placeholder="Select a project" 
                            loading={loadingProjects}
                            value={selectedProject}
                            onChange={handleProjectChange}
                        >
                            {projects.map(p => (
                                <Select.Option key={p._id} value={p._id}>{p.name}</Select.Option>
                            ))}
                        </Select>
                    </div>
                    
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Target</Text>
                        <Select 
                            style={{ width: 250 }} 
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
                        icon={<SyncOutlined spin={generating} />} 
                        onClick={handleGenerate}
                        loading={generating}
                        disabled={!selectedProject}
                        style={{ background: '#722ed1', borderColor: '#722ed1' }}
                    >
                        {generating ? 'NVIDIA LLM Analyzing...' : 'Generate AI Report'}
                    </Button>
                </Space>
            </Card>

            {error && (
                <Alert message="Report Generation Failed" description={error} type="error" showIcon style={{ marginBottom: 24 }} />
            )}

            {generating && (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" tip="AI is analyzing tasks, workloads, and writing the report..." />
                </div>
            )}

            {reportData && !generating && (
                <div className="report-viewer" style={{ animation: 'fadeIn 0.5s' }}>
                    {/* Header bar with Export */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                        <div>
                            <AntTitle level={2} style={{ margin: 0, color: '#1890ff' }}>
                                {reportData.reportType === 'PROJECT' ? reportData.project.name : `${reportData.project.name} - ${reportData.sprint.name}`}
                            </AntTitle>
                            <Text type="secondary">Generated on {new Date().toLocaleString()}</Text>
                        </div>
                        <Space>
                            <Button icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')} danger>Export PDF</Button>
                            <Button icon={<FileWordOutlined />} onClick={() => handleExport('docx')} type="primary" ghost>Export DOCX</Button>
                            <Button icon={<Html5Outlined />} onClick={() => handleExport('html')}>Export HTML</Button>
                        </Space>
                    </div>

                    {/* AI Executive Summary & Confidence */}
                    <Row gutter={24} style={{ marginBottom: 24 }}>
                        <Col span={16}>
                            <Card title="AI Executive Summary" bordered={false} style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                                    {reportData.aiInsights?.executiveSummary}
                                </Paragraph>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title="AI Confidence Score" bordered={false} style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                                <Progress 
                                    type="dashboard" 
                                    percent={reportData.aiInsights?.confidenceScoring?.score || 0} 
                                    strokeColor={reportData.aiInsights?.confidenceScoring?.score > 80 ? '#52c41a' : '#faad14'} 
                                />
                                <Paragraph type="secondary" style={{ marginTop: 16 }}>
                                    {reportData.aiInsights?.confidenceScoring?.reason}
                                </Paragraph>
                            </Card>
                        </Col>
                    </Row>

                    {/* AI Breakdowns */}
                    <Card title="NVIDIA AI Insights" style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Collapse ghost defaultActiveKey={['1', '2']}>
                            <Panel header={<Text strong>Task Flow & Pipeline Analysis</Text>} key="1">
                                <Paragraph>{reportData.aiInsights?.taskBreakdowns}</Paragraph>
                                {reportData.aiInsights?.kanbanAnalysis && (
                                    <Paragraph><strong>Kanban/Flow: </strong>{reportData.aiInsights?.kanbanAnalysis}</Paragraph>
                                )}
                            </Panel>
                            {reportData.aiInsights?.velocityAnalysis && (
                                <Panel header={<Text strong>Velocity & Scope Predictability</Text>} key="2">
                                    <Paragraph>{reportData.aiInsights?.velocityAnalysis}</Paragraph>
                                    {reportData.aiInsights?.burndownAnalysis && (
                                        <Paragraph><strong>Target Tracking: </strong>{reportData.aiInsights?.burndownAnalysis}</Paragraph>
                                    )}
                                    {reportData.aiInsights?.churnAnalysis && (
                                        <Paragraph><strong>Scope Churn: </strong>{reportData.aiInsights?.churnAnalysis}</Paragraph>
                                    )}
                                </Panel>
                            )}
                            <Panel header={<Text strong>Future Predictions</Text>} key="3">
                                <Paragraph>{reportData.aiInsights?.futurePredictions}</Paragraph>
                            </Panel>
                        </Collapse>
                    </Card>

                    {/* Charts */}
                    {renderCharts()}

                    {/* Risk Matrix Table */}
                    <Card title="AI Risk Matrix & Mitigations" style={{ marginTop: 24, marginBottom: 24, borderColor: '#ffccc7' }} headStyle={{ background: '#fff1f0' }}>
                        <Table 
                            dataSource={reportData.aiInsights?.riskMatrix || []} 
                            pagination={false}
                            rowKey={(record, index) => index}
                            columns={[
                                { 
                                    title: 'Severity', 
                                    dataIndex: 'severity', 
                                    key: 'severity',
                                    render: (text) => {
                                        let color = text?.toLowerCase() === 'high' ? 'red' : text?.toLowerCase() === 'medium' ? 'orange' : 'green';
                                        return <Tag color={color}>{text}</Tag>;
                                    }
                                },
                                { title: 'Identified Risk', dataIndex: 'riskItem', key: 'riskItem' },
                                { title: 'Recommended Mitigation', dataIndex: 'mitigation', key: 'mitigation' }
                            ]}
                        />
                    </Card>

                    {/* Final Verdict */}
                    <Alert
                        message="Final AI Verdict"
                        description={<Text strong style={{ fontSize: 16 }}>{reportData.aiInsights?.verdict}</Text>}
                        type={reportData.aiInsights?.confidenceScoring?.score > 75 ? 'success' : reportData.aiInsights?.confidenceScoring?.score > 50 ? 'warning' : 'error'}
                        showIcon
                        style={{ padding: 24 }}
                    />
                </div>
            )}
        </div>
    );
}
