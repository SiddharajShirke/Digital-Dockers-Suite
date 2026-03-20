import { useLocation } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { useThemeMode } from '../../context/ThemeContext';
import { HomeOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

/* Maps path segments to readable labels */
const PATH_LABELS = {
    dashboard:       'Home',
    tasks:           'Board',
    backlog:         'Backlog',
    roadmap:         'Roadmap',
    reports:         'Reports',
    settings:        'Settings',
    profile:         'Profile',
    meetings:        'Meetings',
    documents:       'Documents',
    chat:            'Chat',
    organization:    'Team',
    wellness:        'Wellness',
    'email-generator': 'AI Email',
    'ppt-generator': 'AI PPT',
    'team-management': 'Team Management',
    'tech-debt':     'Code Health',
    spaces:          'Spaces',
    projects:        'Projects',
};

const AppBreadcrumb = () => {
    const location  = useLocation();
    const navigate  = useNavigate();
    const { currentProject } = useProject();
    const { mode }  = useThemeMode();
    const isDark    = mode === 'dark';

    // Build breadcrumb items from the pathname
    const segments = location.pathname.split('/').filter(Boolean); // ['dashboard', 'tasks', ...]

    // crumbs[0] is always 'Home'
    const crumbs = [];

    // Home
    crumbs.push({
        key:   'home',
        label: 'Home',
        path:  '/dashboard',
        icon:  <HomeOutlined style={{ fontSize: 12 }} />,
    });

    // If deeper than just /dashboard, add project name (if selected) + page
    if (segments.length > 1) {
        // Project name — inserted as second crumb if project is selected
        if (currentProject?.name) {
            crumbs.push({
                key:   'project',
                label: currentProject.name,
                path:  '/dashboard',
            });
        }

        // Page crumbs for segments after 'dashboard'
        const pageSegments = segments.slice(1); // e.g. ['tasks'] or ['settings']
        pageSegments.forEach((seg, idx) => {
            const label = PATH_LABELS[seg] || (seg.charAt(0).toUpperCase() + seg.slice(1));
            const isLast = idx === pageSegments.length - 1;
            const path   = '/' + segments.slice(0, idx + 2).join('/');
            crumbs.push({ key: seg, label, path, isLast });
        });
    }

    // Mark last crumb
    if (crumbs.length > 0) {
        crumbs[crumbs.length - 1].isLast = true;
    }

    /* Don't show on /dashboard root (only one crumb) */
    if (crumbs.length <= 1) return null;

    const textColors = {
        link:    isDark ? '#8b949e' : '#6B7280',
        hover:   '#3B82F6',
        current: isDark ? '#e6edf3' : '#172B4D',
        sep:     isDark ? '#484f58' : '#D1D5DB',
    };

    return (
        <nav
            aria-label="Breadcrumb"
            style={{
                display:        'flex',
                alignItems:     'center',
                gap:            6,
                padding:        '8px 0 10px',
                fontSize:       12,
                fontWeight:     500,
                marginBottom:   4,
                flexWrap:       'wrap',
            }}
        >
            {crumbs.map((crumb, idx) => (
                <span key={crumb.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {idx > 0 && (
                        <RightOutlined
                            style={{ fontSize: 9, color: textColors.sep }}
                            aria-hidden="true"
                        />
                    )}
                    {crumb.isLast ? (
                        <span
                            style={{
                                color: textColors.current,
                                fontWeight: 600,
                            }}
                            aria-current="page"
                        >
                            {crumb.icon && <span style={{ marginRight: 4 }}>{crumb.icon}</span>}
                            {crumb.label}
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate(crumb.path)}
                            style={{
                                background: 'none',
                                border:     'none',
                                padding:    0,
                                cursor:     'pointer',
                                color:      textColors.link,
                                fontSize:   12,
                                fontWeight: 500,
                                display:    'inline-flex',
                                alignItems: 'center',
                                gap:        3,
                                transition: 'color 0.15s',
                                lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = textColors.hover; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = textColors.link; }}
                        >
                            {crumb.icon && <span style={{ marginRight: 2 }}>{crumb.icon}</span>}
                            {crumb.label}
                        </button>
                    )}
                </span>
            ))}
        </nav>
    );
};

export default AppBreadcrumb;
