import { useState, useCallback, useEffect } from 'react';
import { Layout, Button, Input, Avatar, Dropdown, Space, Typography, theme, Grid, Tag, Spin, Empty } from 'antd';
import {
    SearchOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
    AppstoreOutlined,
    DownOutlined,
    PlusOutlined,
    LogoutOutlined,
    UserOutlined,
    MenuOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { useProject } from '../../context/ProjectContext';
import CreateModal from './CreateModal';
import NotificationsDropdown from './NotificationsDropdown';
import HeaderCalendarDropdown from './HeaderCalendarDropdown';
import searchService from '../../services/searchService';
import debounce from 'lodash/debounce';

const { Header: AntHeader } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useThemeMode();
    const { projects, switchProject, currentProject } = useProject();
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const isDarkMode = mode === 'dark';

    // Roles that can create tasks
    const canCreate = ['admin', 'project_manager', 'technical_lead', 'marketing_lead'].includes(user?.role);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ tasks: [], projects: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const {
        token: { colorBgContainer, colorBorderSecondary },
    } = theme.useToken();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Debounced search function
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setSearchResults({ tasks: [], projects: [] });
                return;
            }
            setSearchLoading(true);
            try {
                const results = await searchService.globalSearch(query);
                setSearchResults(results);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 300),
        []
    );

    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setSearchOpen(true);
    };

    const handleSearchResultClick = (item, type) => {
        setSearchOpen(false);
        setSearchQuery('');
        if (type === 'task') {
            // Navigate to backlog or open issue detail
            navigate('/dashboard/backlog');
        } else if (type === 'project') {
            switchProject(item._id);
            navigate('/dashboard');
        }
    };

    const userMenu = [
        {
            key: 'profile',
            label: (
                <div style={{ padding: '8px 0' }}>
                    <Text strong>{user?.fullName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{user?.email}</Text>
                </div>
            ),
        },
        { type: 'divider' },
        { key: 'profile-page', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/dashboard/profile') },
        { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => navigate('/dashboard/settings') },
        { key: 'theme', label: mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode', onClick: toggleTheme },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', onClick: handleLogout, danger: true },
    ];

    const projectMenu = [
        {
            key: 'recent',
            type: 'group',
            label: 'Recent Projects',
            children: projects.slice(0, 5).map(p => ({
                key: p._id,
                label: `${p.name} (${p.key})`,
                onClick: () => {
                    switchProject(p._id);
                    navigate('/dashboard');
                }
            }))
        },
        { type: 'divider' },
        { key: 'view-all', label: 'View all projects', onClick: () => navigate('/dashboard/projects') }
    ];

    const searchDropdownContent = (
        <div style={{
            width: 400,
            maxHeight: 400,
            overflow: 'auto',
            backgroundColor: isDarkMode ? '#161b22' : '#fff',
            borderRadius: 8,
            border: `1px solid ${isDarkMode ? '#30363d' : '#f0f0f0'}`,
            boxShadow: isDarkMode
                ? '0 6px 20px rgba(0,0,0,0.45)'
                : '0 6px 16px rgba(0,0,0,0.12)',
            padding: 8
        }}>
            {searchLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Spin />
                </div>
            ) : searchResults.tasks.length > 0 || searchResults.projects.length > 0 ? (
                <>
                    {searchResults.tasks.length > 0 && (
                        <>
                            <Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>Issues</Text>
                            <div className="search-results-list">
                                {searchResults.tasks.map((item) => (
                                    <div
                                        key={item._id}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            color: isDarkMode ? '#e6edf3' : 'inherit',
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: 6,
                                            transition: 'background 0.2s'
                                        }}
                                        onClick={() => handleSearchResultClick(item, 'task')}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Space>
                                            <Tag color="blue">{item.key}</Tag>
                                            <Text ellipsis style={{ maxWidth: 250 }}>{item.title}</Text>
                                        </Space>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {searchResults.projects.length > 0 && (
                        <>
                            <Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>Projects</Text>
                            <div className="search-results-list">
                                {searchResults.projects.map((item) => (
                                    <div
                                        key={item._id}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            color: isDarkMode ? '#e6edf3' : 'inherit',
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: 6,
                                            transition: 'background 0.2s'
                                        }}
                                        onClick={() => handleSearchResultClick(item, 'project')}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Space>
                                            <Tag color="purple">{item.key}</Tag>
                                            <Text>{item.name}</Text>
                                        </Space>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            ) : searchQuery.length >= 2 ? (
                <Empty description="No results found" style={{ padding: 40 }} />
            ) : null}
        </div>
    );

    return (
        <>
            <AntHeader
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isMobile ? '0 16px' : '0 20px',
                    background: colorBgContainer,
                    borderBottom: `1px solid ${colorBorderSecondary}`,
                    height: 60,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                }}
            >
                {/* Left: Logo & Nav */}
                <div className="flex items-center gap-3 md:gap-6">
                    <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={onMenuClick}
                        className="flex md:hidden"
                        style={{ fontSize: 18 }}
                    />

                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <AppstoreOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
                        <Text
                            strong
                            className="hidden md:block"
                            style={{ fontSize: 18, color: isDarkMode ? '#e6edf3' : '#172B4D' }}
                        >
                            Digital Dockers
                        </Text>
                    </div>

                    <Space size="middle" className="hidden md:flex">
                        <Dropdown menu={{ items: projectMenu }} trigger={['click']}>
                            <Button type="text">
                                {currentProject?.name || 'Projects'} <DownOutlined style={{ fontSize: 10 }} />
                            </Button>
                        </Dropdown>
                        <Button type="text" className="hidden lg:inline-flex" onClick={() => navigate('/dashboard/spaces')}>📝 Spaces</Button>
                        <Button type="text" className="hidden lg:inline-flex" onClick={() => navigate('/dashboard/organization')}>People</Button>
                    </Space>
                </div>

                {/* Right: Search & Profile */}
                <div className="flex items-center gap-2 md:gap-4">
                    <Button type="text" icon={<SearchOutlined />} className="flex md:hidden" />

                    <div className="hidden md:block">
                        <Dropdown
                            popupRender={() => searchDropdownContent}
                            trigger={['click']}
                            open={searchOpen && searchQuery.length >= 2}
                            onOpenChange={(open) => !open && setSearchOpen(false)}
                        >
                            <Input
                                placeholder="Search issues, projects, people..."
                                prefix={<SearchOutlined style={{ color: isDarkMode ? '#8b949e' : '#9CA3AF' }} />}
                                className="w-[280px] lg:w-[400px] rounded"
                                style={{
                                    borderRadius: 8,
                                    height: 36,
                                    fontSize: 13,
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                                }}
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => setSearchOpen(true)}
                                allowClear
                            />
                        </Dropdown>
                    </div>

                    <Space className="gap-2 md:gap-6">
                        <div className="hidden md:flex items-center gap-6">
                            <HeaderCalendarDropdown />
                            <NotificationsDropdown />
                            <QuestionCircleOutlined
                                style={{
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    color: isDarkMode ? '#8b949e' : '#6B778C'
                                }}
                                onClick={() => window.open('https://support.atlassian.com/jira-software-cloud/', '_blank')}
                            />
                        </div>

                        <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Avatar
                                    style={{ backgroundColor: '#3B82F6', cursor: 'pointer', fontWeight: 600 }}
                                    icon={<UserOutlined />}
                                    size={32}
                                >
                                    {user?.fullName?.[0]}
                                </Avatar>
                                {!isMobile && (
                                    <Text
                                        className="hidden lg:block"
                                        style={{ fontSize: 13, fontWeight: 500, color: isDarkMode ? '#e6edf3' : '#172B4D', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {user?.fullName?.split(' ')[0]}
                                    </Text>
                                )}
                                <DownOutlined style={{ fontSize: 9, color: isDarkMode ? '#8b949e' : '#6B7280' }} className="hidden lg:block" />
                            </div>
                        </Dropdown>

                        {canCreate && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)} className="hidden md:flex bg-[#0052CC]">
                                Create
                            </Button>
                        )}
                    </Space>
                </div>
            </AntHeader>

            <CreateModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
        </>
    );
};

export default Header;
