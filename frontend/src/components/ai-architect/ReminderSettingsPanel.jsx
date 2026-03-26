import React, { useState, useEffect } from 'react';
import {
    Card, Button, Form, Select, Switch, Space, 
    Typography, message, Spin, Alert, Descriptions, Tag
} from 'antd';
import {
    BellOutlined, ClockCircleOutlined, SaveOutlined, MailOutlined
} from '@ant-design/icons';

import aiArchitectService from '../../services/aiArchitectService';
import projectService from '../../services/projectService';
import api from '../../services/api'; // Direct API for sprints

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ReminderSettingsPanel = () => {
    const [form] = Form.useForm();
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [sprints, setSprints] = useState([]);
    const [selectedSprint, setSelectedSprint] = useState(null);
    
    // Loading states
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingSprints, setLoadingSprints] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial load: Fetch Projects
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoadingProjects(true);
            const data = await projectService.getProjects();
            // getProjects returns response.data from axios — could be array directly or {data: [...]}
            const projectList = Array.isArray(data) ? data : (data.data || []);
            setProjects(projectList);
        } catch (error) {
            message.error('Failed to load projects');
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleProjectChange = async (projectId) => {
        setSelectedProject(projectId);
        setSelectedSprint(null);
        setSprints([]);
        form.resetFields(['sprintId', 'enabled', 'intervalsDays']);
        
        try {
            setLoadingSprints(true);
            // Quick fetch of sprints for project
            const response = await api.get(`/sprints/project/${projectId}`);
            setSprints(response.data || []);
        } catch (error) {
            message.error('Failed to load sprints for project');
            setSprints([]);
        } finally {
            setLoadingSprints(false);
        }
    };

    const handleSprintChange = async (sprintId) => {
        setSelectedSprint(sprintId);
        try {
            setLoadingSettings(true);
            const response = await aiArchitectService.getReminderSettings(sprintId);
            const settings = response.data;
            form.setFieldsValue({
                enabled: settings.enabled !== false, // default true
                intervalsDays: settings.intervalsDays || [5, 2, 1]
            });
        } catch (error) {
            message.error('Failed to load reminder settings');
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSave = async (values) => {
        if (!selectedSprint) return message.warning('Please select a sprint first.');

        try {
            setSaving(true);
            await aiArchitectService.updateReminderSettings(selectedSprint, {
                enabled: values.enabled,
                intervalsDays: values.intervalsDays
            });
            message.success('Reminder settings saved successfully!');
        } catch (error) {
            message.error('Failed to save settings: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Card style={{ marginBottom: 24 }}>
                <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Select Project">
                                <Select 
                                    placeholder="Select Project" 
                                    onChange={handleProjectChange}
                                    loading={loadingProjects}
                                    value={selectedProject}
                                >
                                    {projects.map(p => (
                                        <Option key={p._id} value={p._id}>{p.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Select Sprint">
                                <Select 
                                    placeholder="Select Sprint" 
                                    onChange={handleSprintChange}
                                    loading={loadingSprints}
                                    value={selectedSprint}
                                    disabled={!selectedProject}
                                >
                                    {sprints.map(s => (
                                        <Option key={s._id} value={s._id}>{s.name} ({s.status})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {selectedSprint && (
                <Card 
                    title={<Space><BellOutlined style={{ color: '#1890ff' }}/> Configuration </Space>}
                    loading={loadingSettings}
                >
                    <Alert
                        message="How it works"
                        description="The AI Project Architect runs a daily cron job at 08:00 AM. It scans all incomplete tasks in this active sprint and sends email reminders to assigned engineers if the task is due in exactly the configured number of days."
                        type="info"
                        showIcon
                        icon={<MailOutlined />}
                        style={{ marginBottom: 24 }}
                    />

                    <Form 
                        form={form} 
                        layout="vertical" 
                        onFinish={handleSave}
                        initialValues={{ enabled: true, intervalsDays: [5, 2, 1] }}
                    >
                        <Form.Item 
                            label="Enable AI Automated Reminders" 
                            name="enabled" 
                            valuePropName="checked"
                        >
                            <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                        </Form.Item>

                        <Form.Item 
                            label="Reminder Intervals (Days Before Deadline)" 
                            name="intervalsDays"
                            rules={[{ required: true, message: 'Please select at least one interval.' }]}
                        >
                            <Select mode="tags" style={{ width: '100%' }} placeholder="e.g. 5, 2, 1">
                                <Option value={10}>10 Days Before</Option>
                                <Option value={7}>7 Days Before</Option>
                                <Option value={5}>5 Days Before</Option>
                                <Option value={3}>3 Days Before</Option>
                                <Option value={2}>2 Days Before</Option>
                                <Option value={1}>1 Day Before</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item style={{ marginTop: 32 }}>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                icon={<SaveOutlined />} 
                                loading={saving}
                                style={{ background: '#1890ff', borderColor: '#1890ff' }}
                            >
                                Save Configuration
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            )}
        </div>
    );
};

// Simple Row/Col wrapper for styling since they were missed in imports above
const Row = ({ children, style, gutter }) => (
    <div style={{ display: 'flex', gap: gutter ? gutter : 16, width: '100%', ...style }}>{children}</div>
);
const Col = ({ children, style, span }) => (
    <div style={{ flex: span ? span / 24 : 1, width: '100%', ...style }}>{children}</div>
);

export default ReminderSettingsPanel;
