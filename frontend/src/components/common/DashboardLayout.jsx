import { useState, useEffect, useRef } from 'react';
import { Layout, ConfigProvider, theme, Grid } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AppBreadcrumb from './AppBreadcrumb';
import ChatbotWidget from '../chatbot/ChatbotWidget';
import { useThemeMode } from '../../context/ThemeContext';

const { Content } = Layout;
const { useBreakpoint } = Grid;

const DashboardLayout = () => {
    const { mode } = useThemeMode();
    const location = useLocation();
    const screens = useBreakpoint();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const previousViewportRef = useRef(null);

    // Responsive breakpoints
    const isMobile = !screens.md; // < 768px
    const isTablet = screens.md && !screens.xl; // 768px - 1199px
    const isDesktop = screens.xl; // >= 1200px

    useEffect(() => {
        const currentViewport = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

        if (previousViewportRef.current === null) {
            previousViewportRef.current = currentViewport;
            return;
        }

        if (previousViewportRef.current !== currentViewport && !isMobile) {
            setDesktopCollapsed(isTablet);
        }

        previousViewportRef.current = currentViewport;
    }, [isMobile, isTablet]);

    const handleSidebarToggle = () => {
        if (isMobile) {
            setMobileSidebarOpen((prevOpen) => !prevOpen);
            return;
        }

        setDesktopCollapsed((prevCollapsed) => !prevCollapsed);
    };

    useEffect(() => {
        if (!isMobile && mobileSidebarOpen) {
            setMobileSidebarOpen(false);
        }
    }, [isMobile, mobileSidebarOpen]);

    // Calculate content margin based on screen size and sidebar state
    const getContentMargin = () => {
        if (isMobile) return 0;
        if (isTablet || desktopCollapsed) return 80;
        return 240;
    };

    const algorithm = mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;
    const showChatbot = !location.pathname.startsWith('/dashboard/wellness');

    return (
        <ConfigProvider
            theme={{
                algorithm,
                token: {
                    colorPrimary: '#3B82F6',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    borderRadius: 8,
                    colorBgLayout: mode === 'dark' ? '#0d1117' : '#f4f5f7',
                    colorBgContainer: mode === 'dark' ? '#161b22' : '#ffffff',
                },
                components: {
                    Card: {
                        borderRadiusLG: 12,
                    },
                    Button: {
                        borderRadius: 6,
                    },
                    Menu: {
                        itemSelectedColor: '#3B82F6',
                        itemSelectedBg: 'rgba(59,130,246,0.08)',
                        itemHoverBg: 'rgba(0,0,0,0.04)',
                        itemActiveBg: 'rgba(59,130,246,0.12)',
                    },
                },
            }}
        >
            <Layout style={{ minHeight: '100vh' }}>
                <Header onMenuClick={handleSidebarToggle} />
                <Layout style={{ marginTop: 60 }}>
                    <Sidebar
                        mobileOpen={mobileSidebarOpen}
                        setMobileOpen={setMobileSidebarOpen}
                        collapsed={desktopCollapsed}
                        setCollapsed={setDesktopCollapsed}
                    />
                    <Content
                        style={{
                            marginLeft: getContentMargin(),
                            padding: isMobile ? '12px 12px' : isTablet ? '16px 20px' : '16px 24px',
                            minHeight: 'calc(100vh - 60px)',
                            transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease',
                            overflow: 'auto',
                            background: mode === 'dark'
                                ? 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)'
                                : 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)',
                        }}
                    >
                        {/* Breadcrumb Navigation */}
                        {!isMobile && <AppBreadcrumb />}

                        <div className="scale-in">
                            <Outlet />
                        </div>
                    </Content>
                </Layout>
            </Layout>
            {showChatbot && <ChatbotWidget />}
        </ConfigProvider>
    );
};

export default DashboardLayout;


