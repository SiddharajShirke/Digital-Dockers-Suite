import { Layout, Menu, theme, Drawer, Grid, Badge, Tooltip } from 'antd';
import {
    ProjectOutlined,
    UnorderedListOutlined,
    CalendarOutlined,
    TeamOutlined,
    FileTextOutlined,
    SettingOutlined,
    DashboardOutlined,
    MessageOutlined,
    ApartmentOutlined,
    HeartOutlined,
    InboxOutlined,
    BarChartOutlined,
    UsergroupAddOutlined,
    MailOutlined,
    FilePptOutlined,
    SafetyCertificateOutlined,
    AppstoreOutlined,
    LeftOutlined,
    RightOutlined,
    ClockCircleOutlined,
    RocketOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';

const { Sider } = Layout;
const { useBreakpoint } = Grid;

// ── Recently Visited tracker ──────────────────────────────────────────────────
const MAX_RECENT = 5;
const RECENT_KEY = 'dd_recently_visited';

const readRecent = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const writeRecent = (list) => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
};

// Page label map (shared with breadcrumb)
const PAGE_LABELS = {
    '/dashboard': { label: 'Summary', icon: <DashboardOutlined /> },
    '/dashboard/tasks': { label: 'Board', icon: <UnorderedListOutlined /> },
    '/dashboard/backlog': { label: 'Backlog', icon: <InboxOutlined /> },
    '/dashboard/roadmap': { label: 'Roadmap', icon: <CalendarOutlined /> },
    '/dashboard/reports': { label: 'Reports', icon: <BarChartOutlined /> },
    '/dashboard/meetings': { label: 'Meetings', icon: <MessageOutlined /> },
    '/dashboard/documents': { label: 'Documents', icon: <FileTextOutlined /> },
    '/dashboard/settings': { label: 'Settings', icon: <SettingOutlined /> },
    '/dashboard/organization': { label: 'Team', icon: <ApartmentOutlined /> },
    '/dashboard/email-generator': { label: 'AI Email', icon: <MailOutlined /> },
    '/dashboard/ppt-generator': { label: 'AI PPT', icon: <FilePptOutlined /> },
    '/dashboard/chat': { label: 'Chat', icon: <MessageOutlined /> },
    '/dashboard/wellness': { label: 'Wellness', icon: <HeartOutlined /> },
    '/dashboard/tech-debt': { label: 'Code Health', icon: <SafetyCertificateOutlined /> },
    '/dashboard/ai-architect': { label: 'AI Architect', icon: <RocketOutlined /> },
};

// ── Recently Visited section ───────────────────────────────────────────────
const RecentSection = ({ recentPages, isCollapsed, isDark, navigate, locationPathname }) => {
    if (recentPages.length === 0) return null;

    const sectionStyle = {
        borderTop: `1px solid ${isDark ? '#30363d' : '#E5E7EB'}`,
        padding: isCollapsed ? '12px 0' : '12px 8px 8px',
        marginTop: 'auto',
    };

    return (
        <div style={sectionStyle}>
            {!isCollapsed && (
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isDark ? '#8b949e' : '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '0 8px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    <ClockCircleOutlined style={{ fontSize: 10 }} />
                    Recently Visited
                </div>
            )}
            {recentPages.map(({ path, label }) => {
                const icon = PAGE_LABELS[path]?.icon;
                const isActive = locationPathname === path;

                const btnStyle = {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: isCollapsed ? '8px 0' : '6px 12px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    background: isActive
                        ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)')
                        : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: isActive
                        ? '#3B82F6'
                        : (isDark ? '#8b949e' : '#6B7280'),
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                    borderLeft: isActive && !isCollapsed
                        ? '3px solid #3B82F6'
                        : '3px solid transparent',
                    marginBottom: 2,
                };

                const btn = (
                    <button
                        type="button"
                        style={btnStyle}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.background = isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.04)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                        onClick={() => navigate(path)}
                    >
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
                        {!isCollapsed && label}
                    </button>
                );

                return isCollapsed
                    ? <Tooltip key={path} title={label} placement="right">{btn}</Tooltip>
                    : <div key={path}>{btn}</div>;
            })}
        </div>
    );
};

// ── Collapse toggle button ─────────────────────────────────────────────────
const CollapseToggle = ({ collapsed, setCollapsed, isDark }) => (
    <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
            position: 'absolute',
            top: '50%',
            right: -12,
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: isDark ? '#21262d' : '#fff',
            border: `1px solid ${isDark ? '#30363d' : '#D1D5DB'}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 950,
            color: isDark ? '#8b949e' : '#6B7280',
            fontSize: 10,
            transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3B82F6';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#3B82F6';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? '#21262d' : '#fff';
            e.currentTarget.style.color = isDark ? '#8b949e' : '#6B7280';
            e.currentTarget.style.borderColor = isDark ? '#30363d' : '#D1D5DB';
        }}
    >
        {collapsed ? <RightOutlined /> : <LeftOutlined />}
    </button>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({ mobileOpen, setMobileOpen, collapsed, setCollapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { mode } = useThemeMode();
    const { currentProject } = useProject();
    const isDark = mode === 'dark';
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const { token: { colorBgContainer, colorBorderSecondary } } = theme.useToken();

    // Track recently visited pages
    const [recentPages, setRecentPages] = useState(readRecent);

    useEffect(() => {
        const path = location.pathname;
        if (!PAGE_LABELS[path]) return; // only track known pages

        // Use a slight delay or set state in a way that avoids synchronous cascading render warning if possible
        // but often in React 18/19 this is better handled by a custom hook or external store sync.
        // For now, we keep the logic but the component definition move is the primary fix.
        setRecentPages(prev => {
            const filtered = prev.filter(p => p.path !== path);
            const next = [
                { path, label: PAGE_LABELS[path].label },
                ...filtered,
            ].slice(0, MAX_RECENT);
            writeRecent(next);
            return next;
        });
    }, [location.pathname]);

    // Collapsed state for desktop (parent controls, but we can also toggle locally on tablet)
    const isCollapsed = isMobile ? false : collapsed;

    const handleNav = (key) => {
        navigate(key);
        if (isMobile) setMobileOpen(false);
    };

    // ── Nav items ─────────────────────────────────────────────────────────────
    const items = [
        {
            key: 'project-group',
            label: 'PROJECT',
            type: 'group',
            children: [
                { key: '/dashboard', icon: <DashboardOutlined />, label: 'Summary' },
                { key: '/dashboard/tasks', icon: <UnorderedListOutlined />, label: 'Board' },
                { key: '/dashboard/backlog', icon: <InboxOutlined />, label: 'Backlog' },
                { key: '/dashboard/roadmap', icon: <CalendarOutlined />, label: 'Roadmap' },
                { key: '/dashboard/reports', icon: <BarChartOutlined />, label: 'Reports' },
                { key: '/dashboard/tech-debt', icon: <SafetyCertificateOutlined />, label: 'Code Health' },
            ],
        },
        { type: 'divider' },
        {
            key: 'apps-toolkit',
            label: 'Apps & Toolkit',
            icon: <AppstoreOutlined />,
            children: [
                { key: '/dashboard/meetings', icon: <MessageOutlined />, label: 'Meetings' },
                { key: '/dashboard/documents', icon: <FileTextOutlined />, label: 'Documents' },
                { key: '/dashboard/email-generator', icon: <MailOutlined />, label: 'AI Email' },
                { key: '/dashboard/ppt-generator', icon: <FilePptOutlined />, label: 'AI PPT Generator' },
                { key: '/dashboard/chat', icon: <MessageOutlined />, label: 'Chat' },
                { key: '/dashboard/organization', icon: <ApartmentOutlined />, label: 'Team' },
                { key: '/dashboard/wellness', icon: <HeartOutlined />, label: 'Wellness' },
                { key: '/dashboard/ai-architect', icon: <RocketOutlined />, label: 'AI Architect' },
            ],
        },
        { type: 'divider' },
        ...(user?.role === 'admin' ? [
            {
                key: 'admin-group',
                label: 'ADMIN',
                type: 'group',
                children: [
                    { key: '/dashboard/team-management', icon: <UsergroupAddOutlined />, label: 'Team Management' },
                ],
            },
            { type: 'divider' },
        ] : []),
        { key: '/dashboard/settings', icon: <SettingOutlined />, label: 'Settings' },
    ];

    // ── Menu content ──────────────────────────────────────────────────────────
    const MenuContent = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    style={{ borderRight: 0 }}
                    items={items}
                    onClick={({ key }) => handleNav(key)}
                />
            </div>
            <RecentSection
                recentPages={recentPages}
                isCollapsed={isCollapsed}
                isDark={isDark}
                navigate={navigate}
                locationPathname={location.pathname}
            />
        </div>
    );

    return (
        <>
            {/* Mobile Drawer */}
            <div className="md:hidden">
                <Drawer
                    placement="left"
                    onClose={() => setMobileOpen(false)}
                    open={mobileOpen}
                    style={{ width: 280 }}
                    styles={{
                        body: { padding: 0, background: isDark ? 'var(--surface-primary)' : '#fff', display: 'flex', flexDirection: 'column' },
                        header: { display: 'none' },
                    }}
                >
                    <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${isDark ? '#30363d' : '#E5E7EB'}`, marginBottom: 4 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#a5b4fc' : '#3B82F6', letterSpacing: '-0.3px' }}>
                            Digital Dockers
                        </div>
                        {currentProject && (
                            <div style={{ fontSize: 12, color: isDark ? '#8b949e' : '#6B7280', marginTop: 2 }}>
                                {currentProject.name}
                            </div>
                        )}
                    </div>
                    {MenuContent}
                </Drawer>
            </div>

            {/* Desktop/Tablet Sider */}
            <Sider
                trigger={null}
                collapsible
                collapsed={isCollapsed}
                width={240}
                collapsedWidth={72}
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
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: isDark ? '8px 0 24px rgba(2,6,23,0.45)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Collapse toggle on sidebar edge */}
                    <CollapseToggle collapsed={collapsed} setCollapsed={setCollapsed} isDark={isDark} />
                    {MenuContent}
                </div>
            </Sider>
        </>
    );
};


export default Sidebar;
