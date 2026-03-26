import React from 'react';
import { Tabs, Card, Space } from 'antd';
import {
    FileTextOutlined, ThunderboltOutlined, SwapOutlined, BellOutlined, RocketOutlined
} from '@ant-design/icons';
import CVUploadPanel from '../components/ai-architect/CVUploadPanel';
import AISprintFormationPanel from '../components/ai-architect/AISprintFormationPanel';
import ReallocationProposalPanel from '../components/ai-architect/ReallocationProposalPanel';
import ReminderSettingsPanel from '../components/ai-architect/ReminderSettingsPanel';

/**
 * AI Project Architect Page
 * Main hub for all AI-driven workload management features.
 * Tabs are incrementally enabled as phases are built.
 */
const AIArchitectPage = () => {
    const tabItems = [
        {
            key: 'cv-upload',
            label: (
                <Space>
                    <FileTextOutlined />
                    CV Upload & Skills
                </Space>
            ),
            children: <CVUploadPanel />
        },
        {
            key: 'sprint-formation',
            label: (
                <Space>
                    <ThunderboltOutlined />
                    AI Sprint Formation
                </Space>
            ),
            children: <AISprintFormationPanel />,
            disabled: false
        },
        {
            key: 'reallocation',
            label: (
                <Space>
                    <SwapOutlined />
                    Re-allocation
                </Space>
            ),
            children: <ReallocationProposalPanel />,
            disabled: false
        },
        {
            key: 'reminders',
            label: (
                <Space>
                    <BellOutlined />
                    Reminders
                </Space>
            ),
            children: <ReminderSettingsPanel />,
            disabled: false
        }
    ];

    return (
        <div style={{ padding: '0px' }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RocketOutlined style={{ color: '#1890ff' }} />
                    AI Project Architect
                </h2>
                <p style={{ color: '#8c8c8c', margin: '4px 0 0' }}>
                    AI-driven team formation, task distribution, and workload management
                </p>
            </div>

            <Tabs
                defaultActiveKey="cv-upload"
                items={tabItems}
                type="card"
                size="large"
            />
        </div>
    );
};

export default AIArchitectPage;
