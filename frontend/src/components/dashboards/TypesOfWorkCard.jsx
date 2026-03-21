import { Card, Skeleton, Typography, Empty, Space } from 'antd';
import { BgColorsOutlined, FileTextOutlined, BugOutlined, CheckSquareOutlined, CopyOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DistributionBar from '../common/DistributionBar';

const { Text } = Typography;

const TypesOfWorkCard = ({ projectId, onTypeClick }) => {
    const [workTypes, setWorkTypes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        const fetchWorkTypes = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/api/projects/${projectId}/work-types`, {
                    withCredentials: true
                });
                setWorkTypes(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching work types:', err);
                setError('Failed to load work types');
                setWorkTypes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkTypes();
    }, [projectId]);

    // Map work types to icons and colors (Jira-style)
    const typeConfig = {
        'Task': {
            icon: CheckSquareOutlined,
            color: '#0052cc'
        },
        'Epic': {
            icon: BgColorsOutlined,
            color: '#403294'
        },
        'Story': {
            icon: FileTextOutlined,
            color: '#00875a'
        },
        'Bug': {
            icon: BugOutlined,
            color: '#ff5630'
        },
        'Subtask': {
            icon: CopyOutlined,
            color: '#8590a2'
        }
    };

    if (loading) {
        return (
            <Card
                title={
                    <div>
                        <Text strong style={{ fontSize: '13px', color: '#262626', fontWeight: 600 }}>
                            Types of work
                        </Text>
                        <div style={{ fontSize: '12px', color: '#626f86', marginTop: 2 }}>
                            Get a breakdown of work items by their types
                        </div>
                    </div>
                }
                style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0'
                }}
                styles={{ body: { padding: '16px 0' } }}
            >
                <Skeleton active paragraph={{ rows: 5 }} />
            </Card>
        );
    }

    if (error) {
        return (
            <Card
                title={
                    <div>
                        <Text strong style={{ fontSize: '13px', color: '#262626', fontWeight: 600 }}>
                            Types of work
                        </Text>
                        <div style={{ fontSize: '12px', color: '#626f86', marginTop: 2 }}>
                            Get a breakdown of work items by their types
                        </div>
                    </div>
                }
                style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0'
                }}
                styles={{ body: { padding: '16px 0' } }}
            >
                <Empty description={error} />
            </Card>
        );
    }

    const safeWorkTypes = Array.isArray(workTypes) ? workTypes : [];
    const total = safeWorkTypes.reduce((sum, wt) => sum + (wt.count || 0), 0);
    const hasData = total > 0;

    return (
        <Card
            title={
                <div>
                    <Text strong style={{ fontSize: '13px', color: '#262626', fontWeight: 600 }}>
                        Types of work
                    </Text>
                    <div style={{ fontSize: '12px', color: '#626f86', marginTop: 2 }}>
                        Get a breakdown of work items by their types
                    </div>
                </div>
            }
            style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderRadius: 8,
                border: '1px solid #f0f0f0'
            }}
            styles={{ body: { padding: '16px 0' } }}
        >
            {hasData ? (
                <Space orientation="vertical" style={{ width: '100%' }} size={0}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', paddingLeft: 16, paddingRight: 16, marginBottom: 8, gap: 12 }}>
                        <div style={{ flex: 0.8, minWidth: '120px' }}>
                            <Text type="secondary" strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#626f86' }}>
                                Type
                            </Text>
                        </div>
                        <div style={{ flex: 1.5 }}>
                            <Text type="secondary" strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#626f86' }}>
                                Distribution
                            </Text>
                        </div>
                    </div>

                    {/* Data Rows */}
                    {safeWorkTypes.map((workType, idx) => {
                        const config = typeConfig[workType.type] || { icon: FileTextOutlined, color: '#626f86' };
                        return (
                            <DistributionBar
                                key={idx}
                                label={workType.type}
                                icon={config.icon}
                                count={workType.count}
                                total={total}
                                percentage={workType.percentage}
                                color={config.color}
                                onClick={() => onTypeClick && onTypeClick(workType.rawType)}
                            />
                        );
                    })}
                </Space>
            ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8c8c8c' }}>
                    <Empty description="No work items found" />
                </div>
            )}
        </Card>
    );
};

export default TypesOfWorkCard;
