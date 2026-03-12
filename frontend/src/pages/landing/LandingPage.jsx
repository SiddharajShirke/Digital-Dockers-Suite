import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid } from '@mui/material';
import {
    ArrowRight, ArrowDown, Sparkles, Zap, Brain, Mail,
    CheckSquare, Presentation, MessageSquare, FileText, Video,
    Users, TrendingUp, Shield, Star, Menu, X
} from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const [showMainContent, setShowMainContent] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [counters, setCounters] = useState({ aiEngines: 0, fasterWorkflows: 0, aiAssistant: 0 });
    const [animated, setAnimated] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 500);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleContinue = () => {
        setShowMainContent(true);
    };

    const animateCounter = (key, target) => {
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const currentValue = Math.min(target, increment * currentStep);

            setCounters(prev => ({
                ...prev,
                [key]: key === 'aiAssistant' ? '24/7' : currentValue.toFixed(1)
            }));

            if (currentStep >= steps) {
                clearInterval(interval);
                setCounters(prev => ({
                    ...prev,
                    [key]: key === 'aiAssistant' ? '24/7' : target.toFixed(1)
                }));
            }
        }, duration / steps);
    };

    useEffect(() => {
        if (showMainContent && !animated) {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        setAnimated(true);
                        const targets = [
                            { key: 'aiEngines', target: 7, delay: 0 },
                            { key: 'fasterWorkflows', target: 10, delay: 500 },
                            { key: 'aiAssistant', target: 24, delay: 1000 }
                        ];
                        targets.forEach(({ key, target, delay }) => {
                            setTimeout(() => animateCounter(key, target), delay);
                        });
                    }
                },
                { threshold: 0.5 }
            );

            const hero = document.getElementById('hero');
            if (hero) observer.observe(hero);
            return () => observer.disconnect();
        }
    }, [showMainContent, animated]);

    const features = [
        { icon: <Mail size={32} />, title: "AutoMail Engine", description: "AI-powered email generation and scheduling. Craft perfect emails in seconds.", color: "#3B82F6" },
        { icon: <Brain size={32} />, title: "Emotion Analytics", description: "Detect emotional undertones in text. Understand sentiment to communicate better.", color: "#10B981" },
        { icon: <CheckSquare size={32} />, title: "TaskPilot AI", description: "Smart task management with intelligent prioritization based on deadlines.", color: "#8B5CF6" },
        { icon: <Presentation size={32} />, title: "SlideForge AI", description: "Generate stunning presentations in minutes. Transform ideas into slides.", color: "#F59E0B" },
        { icon: <MessageSquare size={32} />, title: "SmartDock Assistant", description: "Your versatile AI companion for any task. Get instant answers.", color: "#EF4444" },
        { icon: <FileText size={32} />, title: "DocSummary Engine", description: "Condense lengthy documents into actionable insights instantly.", color: "#06B6D4" },
        { icon: <Video size={32} />, title: "Meeting Insights", description: "Transform meetings into structured summaries with action items.", color: "#8B5CF6" }
    ];

    // StartPage (Splash)
    if (!showMainContent) {
        return (
            <Box className="start-page">
                <Box className="start-background">
                    <Box className="floating-shapes">
                        <Box className="shape shape-1" />
                        <Box className="shape shape-2" />
                        <Box className="shape shape-3" />
                        <Box className="shape shape-4" />
                    </Box>
                </Box>

                <Box className="start-content">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
                        transition={{ duration: 0.8 }}
                        className="start-header"
                    >
                        <Box className="brand-logo">
                            <Box className="logo-container">
                                <Box className="logo-svg">
                                    <Box className="logo-top" />
                                    <Box className="logo-bottom" />
                                </Box>
                            </Box>
                        </Box>

                        <Typography variant="h1" className="brand-title">
                            <span className="brand-main">Digital</span>
                            <span className="brand-secondary">Dockers</span>
                        </Typography>

                        <Box className="brand-tagline">
                            <Sparkles size={20} />
                            <span>AI-Powered Productivity Suite</span>
                            <Sparkles size={20} />
                        </Box>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="start-features"
                    >
                        <Box className="feature-item">
                            <Box className="feature-icon"><Brain size={24} /></Box>
                            <span>7 AI Engines</span>
                        </Box>
                        <Box className="feature-item">
                            <Box className="feature-icon"><Zap size={24} /></Box>
                            <span>10x Faster Workflows</span>
                        </Box>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="start-actions"
                    >
                        <Button className="start-button primary" onClick={handleContinue}>
                            Explore Features <ArrowDown size={20} />
                        </Button>
                        <Button className="start-button secondary" onClick={() => navigate('/login')}>
                            Get Started
                        </Button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isVisible ? 1 : 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="start-scroll"
                    >
                        <Box className="scroll-indicator">
                            <span>Scroll to explore</span>
                            <ArrowDown size={16} className="scroll-arrow" />
                        </Box>
                    </motion.div>
                </Box>
            </Box>
        );
    }

    // Main Landing Page
    return (
        <Box className="landing-page">
            {/* Navbar */}
            <Box component="nav" className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
                <Container maxWidth="lg" className="nav-container">
                    <Box className="logo" onClick={() => setShowMainContent(false)} sx={{ cursor: 'pointer' }}>
                        <Box className="logo-icon">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M16 2L2 10L16 18L30 10L16 2Z" fill="url(#gradient1)" />
                                <path d="M2 10V22L16 30L30 22V10L16 18L2 10Z" fill="url(#gradient2)" />
                                <defs>
                                    <linearGradient id="gradient1" x1="2" y1="2" x2="30" y2="10" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#0052CC" />
                                        <stop offset="1" stopColor="#0747A6" />
                                    </linearGradient>
                                    <linearGradient id="gradient2" x1="2" y1="10" x2="30" y2="22" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#0052CC" />
                                        <stop offset="1" stopColor="#172B4D" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </Box>
                        <Typography className="logo-text">Digital Dockers</Typography>
                    </Box>

                    <Box className="nav-center">
                        <a href="#hero" className="nav-link">Home</a>
                        <a href="#features" className="nav-link">Features</a>
                        <a href="#cta" className="nav-link">Contact</a>
                    </Box>

                    <Box className="nav-right">
                        <Button className="signin-btn" onClick={() => navigate('/login')}>
                            Sign In
                        </Button>
                    </Box>

                    <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {isMobileMenuOpen && (
                        <Box className="mobile-menu">
                            <a href="#hero" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
                            <a href="#features" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
                            <a href="#cta" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
                            <Button className="mobile-signin-btn" onClick={() => navigate('/login')}>Sign In</Button>
                        </Box>
                    )}
                </Container>
            </Box>

            {/* Hero Section */}
            <Box id="hero" className="hero-section">
                <Container maxWidth="lg">
                    <Box className="hero-content">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <Box className="badge">
                                <Sparkles size={16} />
                                <span>AI-Powered Productivity Suite</span>
                            </Box>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <Typography variant="h1" className="hero-title">
                                Digital Dockers
                            </Typography>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                        >
                            <Typography className="hero-subtitle">
                                Supercharge your workflow with 7 AI engines. From intelligent emails to meeting insights, automate the mundane and focus on what truly matters.
                            </Typography>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                        >
                            <Box className="hero-buttons">
                                <Button className="btn-primary" onClick={() => navigate('/login')}>
                                    Get Started Free <ArrowRight size={20} />
                                </Button>
                                <Button className="btn-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                                    Explore Features
                                </Button>
                            </Box>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                        >
                            <Box className="hero-stats">
                                <Box className="stat-item">
                                    <span className="stat-number">{animated ? counters.aiEngines : '0'}</span>
                                    <span className="stat-label">AI Engines</span>
                                </Box>
                                <Box className="stat-divider" />
                                <Box className="stat-item">
                                    <span className="stat-number">{animated ? counters.fasterWorkflows : '0'}x</span>
                                    <span className="stat-label">Faster Workflows</span>
                                </Box>
                                <Box className="stat-divider" />
                                <Box className="stat-item">
                                    <span className="stat-number">{animated ? counters.aiAssistant : '0'}</span>
                                    <span className="stat-label">AI Assistant</span>
                                </Box>
                            </Box>
                        </motion.div>
                    </Box>

                    <Box className="hero-graphics">
                        <Box className="floating-shape shape-1" />
                        <Box className="floating-shape shape-2" />
                        <Box className="floating-shape shape-3" />
                    </Box>
                </Container>
            </Box>

            {/* Features Section */}
            <Box id="features" className="features-section">
                <Container maxWidth="lg">
                    <Box className="section-header">
                        <Typography variant="h2" className="section-title">7 AI Engines, One Platform</Typography>
                        <Typography className="section-subtitle">
                            Each engine is designed to handle a specific workflow, working together to create an unmatched productivity experience.
                        </Typography>
                    </Box>

                    <Grid container spacing={3} className="features-grid">
                        {features.map((feature, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Box
                                        className="feature-card"
                                        sx={{ borderTop: `4px solid ${feature.color}` }}
                                    >
                                        <Box className="feature-icon" sx={{ color: feature.color }}>
                                            {feature.icon}
                                        </Box>
                                        <Typography className="feature-title">{feature.title}</Typography>
                                        <Typography className="feature-description">{feature.description}</Typography>
                                    </Box>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box id="cta" className="cta-section">
                <Box className="cta-background">
                    <Box className="floating-circle circle-1" />
                    <Box className="floating-circle circle-2" />
                    <Box className="floating-circle circle-3" />
                </Box>

                <Container maxWidth="lg">
                    <Box className="cta-content">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <Box className="cta-badge">
                                <Star size={20} />
                                <span>Join the AI Revolution</span>
                            </Box>

                            <Typography variant="h2" className="cta-title">
                                Ready to Transform Your <span className="highlight">Workflow?</span>
                            </Typography>

                            <Typography className="cta-subtitle">
                                Join thousands of professionals who have already supercharged their productivity with Digital Dockers' AI-powered tools.
                            </Typography>

                            <Box className="cta-features">
                                <Box className="cta-feature"><Zap size={24} /><span>Instant Setup</span></Box>
                                <Box className="cta-feature"><Shield size={24} /><span>Enterprise Security</span></Box>
                                <Box className="cta-feature"><TrendingUp size={24} /><span>Proven Results</span></Box>
                            </Box>

                            <Button className="cta-button-primary" onClick={() => navigate('/register')}>
                                Get Started <ArrowRight size={20} />
                            </Button>

                            <Box className="cta-stats">
                                <Box className="cta-stat">
                                    <Users size={24} />
                                    <Box>
                                        <span className="cta-stat-number">10,000+</span>
                                        <span className="cta-stat-label">Active Users</span>
                                    </Box>
                                </Box>
                                <Box className="cta-stat">
                                    <TrendingUp size={24} />
                                    <Box>
                                        <span className="cta-stat-number">98%</span>
                                        <span className="cta-stat-label">Satisfaction Rate</span>
                                    </Box>
                                </Box>
                                <Box className="cta-stat">
                                    <Shield size={24} />
                                    <Box>
                                        <span className="cta-stat-number">100%</span>
                                        <span className="cta-stat-label">Secure & Private</span>
                                    </Box>
                                </Box>
                            </Box>

                            <Box className="cta-testimonial">
                                <Box className="testimonial-stars">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#FFD700" color="#FFD700" />)}
                                </Box>
                                <Typography>"Digital Dockers has revolutionized how I work. The AI engines are incredibly powerful."</Typography>
                                <cite>- Sarah Johnson, Product Manager</cite>
                            </Box>
                        </motion.div>
                    </Box>
                </Container>
            </Box>

            {/* Footer */}
            <Box className="footer">
                <Container maxWidth="lg">
                    <Box className="footer-content">
                        <Box className="footer-brand">
                            <Box className="footer-logo">
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                    <path d="M16 2L2 10L16 18L30 10L16 2Z" fill="url(#footerGrad1)" />
                                    <path d="M2 10V22L16 30L30 22V10L16 18L2 10Z" fill="url(#footerGrad2)" />
                                    <defs>
                                        <linearGradient id="footerGrad1" x1="2" y1="2" x2="30" y2="10" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#0052CC" />
                                            <stop offset="1" stopColor="#0747A6" />
                                        </linearGradient>
                                        <linearGradient id="footerGrad2" x1="2" y1="10" x2="30" y2="22" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#0052CC" />
                                            <stop offset="1" stopColor="#172B4D" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <Typography className="footer-brand-text">Digital Dockers</Typography>
                            </Box>
                            <Typography className="footer-tagline">AI-Powered Productivity Suite</Typography>
                        </Box>

                        <Box className="footer-links">
                            <Box className="footer-column">
                                <Typography className="footer-heading">Product</Typography>
                                <a href="#features">Features</a>
                                <a href="#cta">Pricing</a>
                            </Box>
                            <Box className="footer-column">
                                <Typography className="footer-heading">Company</Typography>
                                <a href="#about">About</a>
                                <a href="#contact">Contact</a>
                            </Box>
                            <Box className="footer-column">
                                <Typography className="footer-heading">Legal</Typography>
                                <a href="#privacy">Privacy</a>
                                <a href="#terms">Terms</a>
                            </Box>
                        </Box>
                    </Box>

                    <Box className="footer-bottom">
                        <Typography>© {new Date().getFullYear()} Digital Dockers. All rights reserved.</Typography>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage;
