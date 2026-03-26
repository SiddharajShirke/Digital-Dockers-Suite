import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Button, Upload, Table, Tag, Space, message, Progress, 
    Modal, Descriptions, Spin, Badge, Alert, Tooltip, Row, Col, Statistic,
    Select, Typography
} from 'antd';
import {
    UploadOutlined, FileTextOutlined, CheckCircleOutlined,
    CloseCircleOutlined, SyncOutlined, DeleteOutlined,
    UserOutlined, CodeOutlined, BookOutlined, TrophyOutlined,
    ReloadOutlined, InboxOutlined, RocketOutlined
} from '@ant-design/icons';
import aiArchitectService from '../../services/aiArchitectService';
import { useAuth } from '../../context/AuthContext';

const { Dragger } = Upload;
const { Option } = Select;
const { Text } = Typography;

const CVUploadPanel = () => {
    const { user } = useAuth();
    const [cvList, setCvList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedCV, setSelectedCV] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [pollInterval, setPollInterval] = useState(null);
    
    // Employee Selection State
    const [systemUsers, setSystemUsers] = useState([]);
    const [selectedUploadUser, setSelectedUploadUser] = useState(null);

    // Fetch all CVs
    const fetchCVs = useCallback(async () => {
        try {
            setLoading(true);
            const result = await aiArchitectService.getAllCVs();
            setCvList(result.data || []);
        } catch (error) {
            console.error('Error fetching CVs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch System Users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Using standard API endpoint for fetching users (usually /users)
                // Assuming it exists based on standard patterns; fallback to user if not
                const res = await fetch('/api/users', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(r => r.json());
                if (res.data) setSystemUsers(res.data);
            } catch (err) {
                console.error("Could not fetch users", err);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchCVs();
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [fetchCVs]);

    // Poll for parsing status on uploading/parsing CVs
    useEffect(() => {
        const parsingCVs = cvList.filter(cv => cv.status === 'uploaded' || cv.status === 'parsing');
        
        if (parsingCVs.length > 0 && !pollInterval) {
            const interval = setInterval(() => {
                fetchCVs();
            }, 3000);
            setPollInterval(interval);
        } else if (parsingCVs.length === 0 && pollInterval) {
            clearInterval(pollInterval);
            setPollInterval(null);
        }
    }, [cvList, pollInterval, fetchCVs]);

    // Handle file upload
    const handleUpload = async (info) => {
        const file = info.file;
        if (!file) return;

        const targetUserId = selectedUploadUser || user._id;

        try {
            setUploading(true);
            await aiArchitectService.uploadCV(targetUserId, file);
            message.success(`CV "${file.name}" uploaded! Parsing with AI...`);
            fetchCVs();
        } catch (error) {
            message.error('Upload failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setUploading(false);
        }
    };

    // View CV details
    const viewCVDetails = async (cv) => {
        try {
            const result = await aiArchitectService.getUserCVData(cv.user?._id || cv.user);
            setSelectedCV(result.data);
            setDetailModalOpen(true);
        } catch (error) {
            message.error('Failed to load CV details');
        }
    };

    // Retry parsing
    const handleRetry = async (cvId) => {
        try {
            await aiArchitectService.retryParsing(cvId);
            message.info('Retrying CV parsing...');
            fetchCVs();
        } catch (error) {
            message.error('Retry failed');
        }
    };

    // Delete CV
    const handleDelete = async (cvId) => {
        Modal.confirm({
            title: 'Delete CV?',
            content: 'This will permanently remove the CV and all extracted data.',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                try {
                    await aiArchitectService.deleteCV(cvId);
                    message.success('CV deleted');
                    fetchCVs();
                } catch (error) {
                    message.error('Delete failed');
                }
            }
        });
    };

    // Status tag renderer
    const renderStatus = (status) => {
        const config = {
            uploaded: { color: 'blue', icon: <SyncOutlined spin />, text: 'Processing' },
            parsing: { color: 'orange', icon: <SyncOutlined spin />, text: 'AI Parsing...' },
            parsed: { color: 'green', icon: <CheckCircleOutlined />, text: 'Parsed' },
            error: { color: 'red', icon: <CloseCircleOutlined />, text: 'Error' }
        };
        const s = config[status] || config.uploaded;
        return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>;
    };

    // Domain badge
    const renderDomain = (domain) => {
        const colors = {
            backend: 'blue', frontend: 'cyan', fullstack: 'purple', devops: 'volcano',
            cloud: 'geekblue', data: 'orange', ml_ai: 'magenta', mobile: 'lime',
            security: 'red', qa: 'gold', design: 'pink', marketing: 'green',
            sales: 'default', management: 'default', other: 'default'
        };
        return <Tag color={colors[domain] || 'default'}>{(domain || 'other').replace('_', '/')}</Tag>;
    };

    // Table columns
    const columns = [
        {
            title: 'Employee',
            key: 'employee',
            render: (_, record) => (
                <Space>
                    <UserOutlined />
                    <div>
                        <div style={{ fontWeight: 600 }}>{record.user?.fullName || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{record.user?.email}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'File',
            dataIndex: 'originalFilename',
            key: 'filename',
            render: (text) => (
                <Space>
                    <FileTextOutlined />
                    <span style={{ fontSize: 13 }}>{text}</span>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: renderStatus
        },
        {
            title: 'Domain',
            key: 'domain',
            render: (_, record) => record.status === 'parsed' && record.extractedData?.primaryDomain
                ? renderDomain(record.extractedData.primaryDomain)
                : '-'
        },
        {
            title: 'Skills Found',
            key: 'skills',
            render: (_, record) => record.status === 'parsed'
                ? <Badge count={record.extractedData?.skills?.length || 0} showZero style={{ backgroundColor: '#52c41a' }} />
                : '-'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.status === 'parsed' && (
                        <Tooltip title="View Details">
                            <Button type="link" size="small" icon={<FileTextOutlined />}
                                onClick={() => viewCVDetails(record)} />
                        </Tooltip>
                    )}
                    {record.status === 'error' && (
                        <Tooltip title="Retry Parsing">
                            <Button type="link" size="small" icon={<ReloadOutlined />}
                                onClick={() => handleRetry(record._id)} />
                        </Tooltip>
                    )}
                    <Tooltip title="Delete">
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record._id)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const parsedCount = cvList.filter(cv => cv.status === 'parsed').length;
    const parsingCount = cvList.filter(cv => ['uploaded', 'parsing'].includes(cv.status)).length;

    return (
        <div>
            {/* Summary Stats */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card size="small">
                        <Statistic title="Total CVs" value={cvList.length} prefix={<FileTextOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small">
                        <Statistic title="AI Parsed" value={parsedCount}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small">
                        <Statistic title="Processing" value={parsingCount}
                            prefix={<SyncOutlined spin={parsingCount > 0} />}
                            valueStyle={{ color: parsingCount > 0 ? '#1890ff' : undefined }} />
                    </Card>
                </Col>
            </Row>

            {/* Upload Zone */}
            <Card
                title={<Space><RocketOutlined style={{ color: '#1890ff' }} /> Upload Employee CV</Space>}
                style={{ marginBottom: 24 }}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text strong>Select Employee Profile (Optional): </Text>
                    <Select 
                        placeholder="Assign CV to specific employee (Default: Yourself)"
                        style={{ width: 300, marginLeft: 8 }}
                        allowClear
                        onChange={val => setSelectedUploadUser(val)}
                        value={selectedUploadUser}
                    >
                        {systemUsers.map(u => (
                            <Option key={u._id} value={u._id}>{u.fullName} ({u.role})</Option>
                        ))}
                    </Select>
                </div>

                <Dragger
                    name="cv"
                    accept=".pdf,.doc,.docx"
                    showUploadList={false}
                    customRequest={({ file }) => handleUpload({ file })}
                    disabled={uploading}
                    style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                        borderColor: '#91d5ff',
                        borderRadius: 12
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined style={{ color: '#1890ff', fontSize: 48 }} />
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
                        {uploading ? 'Uploading...' : 'Click or drag CV file to upload'}
                    </p>
                    <p style={{ color: '#888' }}>
                        Supports PDF, DOC, DOCX • Max 10MB • AI will extract skills, experience & education
                    </p>
                </Dragger>
            </Card>

            {/* CV List */}
            <Card
                title={<Space><FileTextOutlined /> Uploaded CVs</Space>}
                extra={
                    <Button icon={<ReloadOutlined />} onClick={fetchCVs} loading={loading}>
                        Refresh
                    </Button>
                }
            >
                <Table
                    dataSource={cvList}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                    locale={{ emptyText: 'No CVs uploaded yet. Upload employee CVs to begin AI team formation.' }}
                />
            </Card>

            {/* CV Detail Modal */}
            <Modal
                title={<Space><FileTextOutlined /> CV Analysis — {selectedCV?.user?.fullName}</Space>}
                open={detailModalOpen}
                onCancel={() => { setDetailModalOpen(false); setSelectedCV(null); }}
                footer={<Button onClick={() => setDetailModalOpen(false)}>Close</Button>}
                width={800}
            >
                {selectedCV && selectedCV.extractedData && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        {/* Summary */}
                        <Alert
                            message="AI-Generated Professional Summary"
                            description={selectedCV.extractedData.summary || 'No summary available'}
                            type="info"
                            showIcon
                        />

                        {/* Quick Stats */}
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic title="Total Experience" value={selectedCV.extractedData.totalYearsExperience || 0} suffix="years" />
                            </Col>
                            <Col span={8}>
                                <Statistic title="Primary Domain" value={(selectedCV.extractedData.primaryDomain || 'other').replace('_', '/')} />
                            </Col>
                            <Col span={8}>
                                <Statistic title="Skills Extracted" value={selectedCV.extractedData.skills?.length || 0} />
                            </Col>
                        </Row>

                        {/* Skills */}
                        <div>
                            <h4><CodeOutlined /> Extracted Skills</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(selectedCV.extractedData.skills || []).map((skill, i) => (
                                    <Tag key={i} color="blue">{skill}</Tag>
                                ))}
                            </div>
                        </div>

                        {/* Experience */}
                        {selectedCV.extractedData.experience?.length > 0 && (
                            <div>
                                <h4><TrophyOutlined /> Experience</h4>
                                <Descriptions column={1} bordered size="small">
                                    {selectedCV.extractedData.experience.map((exp, i) => (
                                        <Descriptions.Item
                                            key={i}
                                            label={<><strong>{exp.title}</strong> at {exp.company} ({exp.years}y)</>}
                                        >
                                            {exp.description || 'No description'}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </div>
                        )}

                        {/* Education */}
                        {selectedCV.extractedData.education?.length > 0 && (
                            <div>
                                <h4><BookOutlined /> Education</h4>
                                <Descriptions column={1} bordered size="small">
                                    {selectedCV.extractedData.education.map((edu, i) => (
                                        <Descriptions.Item key={i} label={edu.degree}>
                                            {edu.institution} ({edu.year})
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </div>
                        )}
                    </Space>
                )}
            </Modal>
        </div>
    );
};

export default CVUploadPanel;
