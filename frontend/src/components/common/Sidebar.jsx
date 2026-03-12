import { Layout, Menu, theme, Drawer, Grid } from 'antd';
import {
    ProjectOutlined,
    UnorderedListOutlined, // Board
    CalendarOutlined,
    TeamOutlined,
    FileTextOutlined,
    SettingOutlined,
    DashboardOutlined,
    MessageOutlined, // Chat vs Meetings
    ApartmentOutlined,
    HeartOutlined,
    InboxOutlined,
    BarChartOutlined,
    UsergroupAddOutlined,
    MailOutlined,
    FilePptOutlined,
    SafetyCertificateOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const { Sider } = Layout;
const { useBreakpoint } = Grid;

const Sidebar = ({ mobileOpen, setMobileOpen, collapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const screens = useBreakpoint();

    // State for hover-expand on tablet
    const [hoverExpanded, setHoverExpanded] = useState(false);

    const {
        token: { colorBgContainer, colorBorderSecondary },
    } = theme.useToken();

    // Determine current sidebar state based on breakpoints
    const isMobile = !screens.md; // Keep for some logic if needed, but styling is tailwind-driven

    // On tablet (md && !xl), default to collapsed (icon only)
    // On desktop (xl), default to full
    // But we let parent control 'collapsed' state for persistence if needed.
    // Ideally update 'collapsed' based on breakpoint changes, but simple logic here:

    const effectiveCollapsed = isMobile ? false : (collapsed || (!screens.xl && !hoverExpanded));

    const hasAccess = (roles) => {
        if (!roles || roles.includes('all')) return true;
        return roles.includes(user?.role) || user?.role === 'admin';
    };

    const items = [
        {
            key: 'project-group',
            label: 'PROJECT: PLATFORM',
            type: 'group',
            children: [
                { key: '/dashboard', icon: <DashboardOutlined />, label: 'Summary' },
                { key: '/dashboard/tasks', icon: <UnorderedListOutlined />, label: 'Board' },
                { key: '/dashboard/backlog', icon: <InboxOutlined />, label: 'Backlog' },
                { key: '/dashboard/roadmap', icon: <CalendarOutlined />, label: 'Roadmap' },
                { key: '/dashboard/reports', icon: <BarChartOutlined />, label: 'Reports' },
                { key: '/dashboard/tech-debt', icon: <SafetyCertificateOutlined />, label: 'Code Health' },
            ]
        },
        { type: 'divider' },
        {
            key: 'apps-toolkit',
            label: 'Apps & Toolkit',
            icon: <AppstoreOutlined />,
            children: [
                { key: '/dashboard/meetings', icon: <MessageOutlined />, label: 'Meetings', hidden: !hasAccess(['project_manager', 'technical_lead']) },
                { key: '/dashboard/documents', icon: <FileTextOutlined />, label: 'Documents' },
                { key: '/dashboard/email-generator', icon: <MailOutlined />, label: 'AI Email' },
                { key: '/dashboard/ppt-generator', icon: <FilePptOutlined />, label: 'AI PPT Generator' },
                { key: '/dashboard/chat', icon: <MessageOutlined />, label: 'Chat' },
                { key: '/dashboard/organization', icon: <ApartmentOutlined />, label: 'Team' },
                { key: '/dashboard/wellness', icon: <HeartOutlined />, label: 'Wellness' },
            ].filter(item => !item.hidden)
        },
        { type: 'divider' },
        // Admin section - only visible to admins
        ...(user?.role === 'admin' ? [
            {
                key: 'admin-group',
                label: 'ADMIN',
                type: 'group',
                children: [
                    { key: '/dashboard/team-management', icon: <UsergroupAddOutlined />, label: 'Team Management' },
                ]
            },
            { type: 'divider' },
        ] : []),
        { key: '/dashboard/settings', icon: <SettingOutlined />, label: 'Settings' }
    ];

    const MenuContent = (
        <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ borderRight: 0, height: '100%' }}
            items={items}
            onClick={({ key }) => {
                navigate(key);
                if (isMobile) setMobileOpen(false);
            }}
        />
    );

    return (
        <>
            {/* Mobile Drawer */}
            <div className="md:hidden">
                <Drawer
                    placement="left"
                    onClose={() => setMobileOpen(false)}
                    open={mobileOpen}
                    width={280}
                    styles={{ body: { padding: 0 }, header: { display: 'none' } }}
                >
                    <div style={{ padding: '24px 24px 0', marginBottom: 24 }}>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0052CC' }}>Digital Dockers</div>
                    </div>
                    {MenuContent}
                </Drawer>
            </div>

            {/* Desktop/Tablet Sider */}
            <Sider
                trigger={null}
                collapsible
                collapsed={effectiveCollapsed && !hoverExpanded}
                width={240}
                collapsedWidth={80}
                onMouseEnter={() => !screens.xl && setHoverExpanded(true)}
                onMouseLeave={() => setHoverExpanded(false)}
                className="hidden md:block"
                style={{
                    background: colorBgContainer,
                    borderRight: `1px solid ${colorBorderSecondary}`,
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    height: 'calc(100vh - 60px)',
                    position: 'fixed',
                    left: 0,
                    top: 60,
                    zIndex: 900,
                    transition: 'all 0.2s'
                }}
            >
                {MenuContent}
            </Sider>
        </>
    );
};

export default Sidebar;
