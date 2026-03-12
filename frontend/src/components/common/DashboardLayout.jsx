import { useState, useEffect } from 'react';
import { Layout, ConfigProvider, theme, Grid } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatbotWidget from '../chatbot/ChatbotWidget';
import { useThemeMode } from '../../context/ThemeContext';

const { Content } = Layout;
const { useBreakpoint } = Grid;

const DashboardLayout = () => {
    const { mode } = useThemeMode();
    const screens = useBreakpoint();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);

    // Responsive breakpoints
    const isMobile = !screens.md; // < 768px
    const isTablet = screens.md && !screens.xl; // 768px - 1199px
    const isDesktop = screens.xl; // >= 1200px

    // Auto-collapse sidebar on tablet
    useEffect(() => {
        if (isTablet && !desktopCollapsed) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDesktopCollapsed(true);
        } else if (isDesktop && desktopCollapsed) {
            setDesktopCollapsed(false);
        }
    }, [isTablet, isDesktop, desktopCollapsed]);

    const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);

    // Calculate content margin based on screen size and sidebar state
    const getContentMargin = () => {
        if (isMobile) return 0;
        if (isTablet || desktopCollapsed) return 80;
        return 240;
    };

    const algorithm = mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

    return (
        <ConfigProvider
            theme={{
                algorithm,
                token: {
                    colorPrimary: '#0052CC',
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
                        borderRadius: 8,
                    },
                },
            }}
        >
            <Layout style={{ minHeight: '100vh' }}>
                <Header onMenuClick={toggleMobileSidebar} />
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
                            padding: isMobile ? 12 : isTablet ? 16 : 24,
                            minHeight: 'calc(100vh - 60px)',
                            transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease',
                            overflow: 'auto',
                            background: mode === 'dark'
                                ? 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)'
                                : 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)',
                        }}
                    >
                        <div className="scale-in">
                            <Outlet />
                        </div>
                    </Content>
                </Layout>
            </Layout>
            <ChatbotWidget />
        </ConfigProvider>
    );
};

export default DashboardLayout;

