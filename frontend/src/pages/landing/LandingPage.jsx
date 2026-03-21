import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppBar,
    Box,
    Button,
    Container,
    Divider,
    Grid,
    IconButton,
    Stack,
    Toolbar,
    Typography
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon, ArrowForward } from '@mui/icons-material';
import {
    Brain,
    CheckSquare,
    FileText,
    Mail,
    MessageSquare,
    Presentation,
    Shield,
    Sparkles,
    TrendingUp,
    Users,
    Video,
    Zap
} from 'lucide-react';
import './LandingPage.css';

const NAV_ITEMS = [
    { id: 'features', label: 'Features' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'cta', label: 'Get Started' }
];

const FEATURE_ITEMS = [
    {
        title: 'AutoMail Engine',
        description: 'Generate clear, professional emails quickly for updates, follow-ups, and stakeholder communication.',
        icon: Mail,
        tone: 'primary'
    },
    {
        title: 'Emotion Analytics',
        description: 'Understand message sentiment and communication tone to improve collaboration and reduce friction.',
        icon: Brain,
        tone: 'success'
    },
    {
        title: 'TaskPilot AI',
        description: 'Prioritize and organize work intelligently based on status, deadlines, and team context.',
        icon: CheckSquare,
        tone: 'secondary'
    },
    {
        title: 'SlideForge AI',
        description: 'Build presentation-ready decks from your project data and narratives in a few clicks.',
        icon: Presentation,
        tone: 'warning'
    },
    {
        title: 'SmartDock Assistant',
        description: 'Use a context-aware assistant for instant answers, summaries, and daily productivity support.',
        icon: MessageSquare,
        tone: 'error'
    },
    {
        title: 'DocSummary Engine',
        description: 'Convert long documents into concise action items, decisions, and key takeaways.',
        icon: FileText,
        tone: 'info'
    },
    {
        title: 'Meeting Insights',
        description: 'Transform meeting content into structured summaries, responsibilities, and next steps.',
        icon: Video,
        tone: 'primary'
    }
];

const WORKFLOW_STEPS = [
    {
        title: 'Plan Together',
        description: 'Align teams with shared tasks, backlog visibility, and roadmap clarity.',
        icon: Users
    },
    {
        title: 'Execute Faster',
        description: 'Automate repetitive communication and keep delivery flowing with AI assistance.',
        icon: Zap
    },
    {
        title: 'Track Confidently',
        description: 'Use live dashboards and reports to monitor team health and project progress.',
        icon: TrendingUp
    }
];

const KPI_ITEMS = [
    { value: '7', label: 'AI Engines' },
    { value: '10x', label: 'Faster Workflows' },
    { value: '24/7', label: 'AI Assistant' }
];

const TONE_ACCENTS = {
    primary: '#1d4ed8',
    secondary: '#0f766e',
    success: '#0ea5e9',
    warning: '#f97316',
    error: '#dc2626',
    info: '#0ea5e9'
};

const LandingPage = () => {
    const navigate = useNavigate();

    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 60);
        return () => clearTimeout(timer);
    }, []);

    const scrollToSection = (id) => {
        const section = document.getElementById(id);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMobileMenuOpen(false);
    };

    return (
        <Box className={`dd-landing ${isReady ? 'dd-ready' : ''}`}>
            <Box className="dd-bg-orb dd-bg-orb-a" aria-hidden="true" />
            <Box className="dd-bg-orb dd-bg-orb-b" aria-hidden="true" />
            <Box className="dd-grid-overlay" aria-hidden="true" />

            <AppBar
                position="fixed"
                elevation={0}
                className={`dd-navbar ${isScrolled ? 'dd-navbar-scrolled' : ''}`}
            >
                <Container maxWidth="lg">
                    <Toolbar disableGutters className="dd-toolbar">
                        <Box
                            className="dd-brand"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            <Box className="dd-brand-mark">
                                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                                    <path d="M16 2L2 10L16 18L30 10L16 2Z" fill="rgba(255,255,255,0.9)" />
                                    <path d="M2 10V22L16 30L30 22V10L16 18L2 10Z" fill="rgba(255,255,255,0.65)" />
                                </svg>
                            </Box>
                            <Typography className="dd-brand-text">
                                Digital Dockers
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={0.8} className="dd-nav-links">
                            {NAV_ITEMS.map((item) => (
                                <Button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className="dd-nav-btn"
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={1.2} className="dd-nav-ctas">
                            <Button variant="text" onClick={() => navigate('/login')} className="dd-btn dd-btn-ghost">
                                Sign In
                            </Button>
                            <Button variant="contained" disableElevation onClick={() => navigate('/register')} className="dd-btn dd-btn-primary">
                                Create Account
                            </Button>
                        </Stack>

                        <IconButton
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className="dd-mobile-toggle"
                            aria-label="toggle navigation menu"
                        >
                            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                        </IconButton>
                    </Toolbar>

                    {mobileMenuOpen && (
                        <Box className="dd-mobile-menu">
                            <Stack spacing={1}>
                                {NAV_ITEMS.map((item) => (
                                    <Button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className="dd-mobile-link"
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                                <Divider sx={{ my: 0.5 }} />
                                <Button onClick={() => navigate('/login')} className="dd-mobile-link">
                                    Sign In
                                </Button>
                                <Button variant="contained" onClick={() => navigate('/register')} className="dd-btn dd-btn-primary">
                                    Create Account
                                </Button>
                            </Stack>
                        </Box>
                    )}
                </Container>
            </AppBar>

            <Box component="section" className="dd-hero" id="top">
                <Container maxWidth="lg">
                    <Grid container spacing={{ xs: 4, md: 5 }} alignItems="stretch">
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Stack spacing={3} className="dd-hero-copy">
                                <Box className="dd-pill">
                                    <Sparkles size={14} />
                                    <span>AI-powered productivity suite</span>
                                </Box>

                                <Typography variant="h2" className="dd-hero-title">
                                    Plan smarter, move faster, and deliver better with Digital Dockers.
                                </Typography>

                                <Typography variant="body1" className="dd-hero-subtitle">
                                    Manage tasks, meetings, communication, and reporting in one collaborative workspace powered by practical AI tools.
                                </Typography>

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.3} className="dd-hero-cta">
                                    <Button
                                        variant="contained"
                                        disableElevation
                                        size="large"
                                        endIcon={<ArrowForward />}
                                        className="dd-btn dd-btn-primary"
                                        onClick={() => navigate('/register')}
                                    >
                                        Start Free
                                    </Button>
                                    <Button variant="outlined" size="large" className="dd-btn dd-btn-outline" onClick={() => navigate('/login')}>
                                        Sign In
                                    </Button>
                                </Stack>

                                <Box className="dd-kpi-panel">
                                    <Grid container>
                                        {KPI_ITEMS.map((item, index) => (
                                            <Grid size={{ xs: 4 }} key={item.label}>
                                                <Box className="dd-kpi-item" sx={{ borderRight: index < KPI_ITEMS.length - 1 ? '1px solid var(--dd-border)' : 'none' }}>
                                                    <Typography variant="h5" className="dd-kpi-value">
                                                        {item.value}
                                                    </Typography>
                                                    <Typography variant="caption" className="dd-kpi-label">
                                                        {item.label}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, md: 5 }}>
                            <Box className="dd-hero-panel">
                                <Typography variant="h6" className="dd-panel-title">
                                    Everything in one workflow hub
                                </Typography>
                                <Typography variant="body2" className="dd-panel-subtitle">
                                    Built to match how your team already works across planning, execution, and reporting.
                                </Typography>

                                <Stack spacing={1.2}>
                                    {FEATURE_ITEMS.slice(0, 4).map((feature) => {
                                        const Icon = feature.icon;
                                        const accent = TONE_ACCENTS[feature.tone] || TONE_ACCENTS.primary;

                                        return (
                                            <Box
                                                key={feature.title}
                                                className="dd-panel-row"
                                                sx={{ '--dd-accent': accent }}
                                            >
                                                <Box className="dd-panel-row-icon">
                                                    <Icon size={17} />
                                                </Box>
                                                <Box className="dd-panel-row-copy">
                                                    <Typography variant="body2" className="dd-panel-row-title">
                                                        {feature.title}
                                                    </Typography>
                                                    <Typography variant="caption" className="dd-panel-row-desc">
                                                        {feature.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Box id="features" component="section" className="dd-features-section">
                <Container maxWidth="lg">
                    <Box className="dd-section-head">
                        <Typography variant="h4" className="dd-section-title">
                            Core capabilities aligned with your team flow
                        </Typography>
                        <Typography className="dd-section-subtitle">
                            Use focused AI modules for communication, planning, document work, and execution tracking without switching between tools.
                        </Typography>
                    </Box>

                    <Grid container spacing={2.4}>
                        {FEATURE_ITEMS.map((feature, index) => {
                            const Icon = feature.icon;
                            const accent = TONE_ACCENTS[feature.tone] || TONE_ACCENTS.primary;

                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.title}>
                                    <Box className="dd-feature-card" sx={{ '--dd-accent': accent, '--dd-delay': `${index * 0.07}s` }}>
                                        <Box className="dd-feature-icon-wrap">
                                            <Icon size={20} />
                                        </Box>
                                        <Typography variant="subtitle1" className="dd-feature-title">
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" className="dd-feature-desc">
                                            {feature.description}
                                        </Typography>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Container>
            </Box>

            <Box id="workflow" component="section" className="dd-workflow-section">
                <Container maxWidth="lg">
                    <Box className="dd-workflow-shell">
                        <Typography variant="h5" className="dd-workflow-title">
                            Designed for real delivery teams
                        </Typography>
                        <Grid container spacing={2.2}>
                            {WORKFLOW_STEPS.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <Grid size={{ xs: 12, md: 4 }} key={step.title}>
                                        <Box className="dd-workflow-card" sx={{ '--dd-delay': `${index * 0.08}s` }}>
                                            <Box className="dd-workflow-top">
                                                <Box className="dd-workflow-index">0{index + 1}</Box>
                                                <Box className="dd-workflow-icon">
                                                    <Icon size={18} />
                                                </Box>
                                            </Box>
                                            <Typography variant="subtitle1" className="dd-workflow-card-title">
                                                {step.title}
                                            </Typography>
                                            <Typography variant="body2" className="dd-workflow-card-desc">
                                                {step.description}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                </Container>
            </Box>

            <Box id="cta" component="section" className="dd-cta-section">
                <Container maxWidth="lg">
                    <Box className="dd-cta-shell">
                        <Box className="dd-cta-badge">
                            <Shield size={14} />
                            <span>Secure. Scalable. Team-ready.</span>
                        </Box>
                        <Typography variant="h4" className="dd-cta-title">
                            Bring planning, execution, and AI assistance into one consistent workspace.
                        </Typography>
                        <Typography className="dd-cta-subtitle">
                            Create your workspace in minutes and start collaborating with the same UI patterns your team uses across the platform.
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                            <Button variant="contained" size="large" disableElevation className="dd-btn dd-btn-primary" onClick={() => navigate('/register')}>
                                Create Account
                            </Button>
                            <Button variant="outlined" size="large" className="dd-btn dd-btn-outline" onClick={() => navigate('/login')}>
                                Sign In
                            </Button>
                        </Stack>
                    </Box>
                </Container>
            </Box>

            <Box component="footer" className="dd-footer">
                <Container maxWidth="lg">
                    <Divider sx={{ mb: 2.5 }} />
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        justifyContent="space-between"
                        spacing={1.5}
                    >
                        <Typography variant="body2" className="dd-footer-text">
                            © {new Date().getFullYear()} Digital Dockers. All rights reserved.
                        </Typography>
                        <Stack direction="row" spacing={1} className="dd-footer-links">
                            <Button size="small" className="dd-footer-link" onClick={() => scrollToSection('features')}>Features</Button>
                            <Button size="small" className="dd-footer-link" onClick={() => scrollToSection('workflow')}>Workflow</Button>
                            <Button size="small" className="dd-footer-link" onClick={() => scrollToSection('cta')}>Start</Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage;