import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Box, Button, TextField, Typography,
    Alert, CircularProgress, InputAdornment, IconButton, Grid, useTheme, useMediaQuery
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, ArrowForward } from '@mui/icons-material';
import { Sparkles, Brain, Zap, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion as Motion } from 'framer-motion';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (err) {
            setError(err);
            toast.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container sx={{ minHeight: '100vh', overflow: 'hidden' }}>
            {/* Left Side - Form */}
            <Grid size={{ xs: 12, md: 5 }} sx={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                p: { xs: 3, sm: 4, md: 6 },
                bgcolor: 'background.paper',
                zIndex: 2,
            }}>
                <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{ maxWidth: 420, mx: 'auto', width: '100%' }}>
                        {/* Brand */}
                        <Box
                            sx={{ mb: 5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
                            onClick={() => navigate('/')}
                        >
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: 'linear-gradient(135deg, #0052CC, #4f46e5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                                    <path d="M16 2L2 10L16 18L30 10L16 2Z" fill="rgba(255,255,255,0.9)" />
                                    <path d="M2 10V22L16 30L30 22V10L16 18L2 10Z" fill="rgba(255,255,255,0.6)" />
                                </svg>
                            </Box>
                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'text.primary' }}>
                                Digital Dockers
                            </Typography>
                        </Box>

                        {/* Heading */}
                        <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            Sign in to your account
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                            Welcome back! Please enter your credentials.
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5, color: 'text.primary' }}>
                                Email
                            </Typography>
                            <TextField
                                required
                                fullWidth
                                id="email"
                                placeholder="Enter your email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email sx={{ color: 'text.disabled', fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 2.5,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0052CC',
                                        },
                                    },
                                }}
                            />

                            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5, color: 'text.primary' }}>
                                Password
                            </Typography>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                placeholder="Enter your password"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock sx={{ color: 'text.disabled', fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 3,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0052CC',
                                        },
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                endIcon={!loading && <ArrowForward sx={{ fontSize: 18 }} />}
                                sx={{
                                    py: 1.3,
                                    borderRadius: 2,
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    bgcolor: '#0052CC',
                                    '&:hover': { bgcolor: '#0747A6' },
                                    textTransform: 'none',
                                    boxShadow: 'none',
                                }}
                            >
                                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
                            </Button>

                            {/* Divider */}
                            <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                                <Typography variant="caption" sx={{ px: 2, color: 'text.disabled', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
                                    or continue with
                                </Typography>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                            </Box>

                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || ''}/api/auth/google`}
                                sx={{
                                    py: 1.2, borderRadius: 2, borderColor: 'divider', color: 'text.primary',
                                    textTransform: 'none', fontWeight: 500,
                                    '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' }
                                }}
                                startIcon={
                                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /><path fill="none" d="M0 0h48v48H0z" /></svg>
                                }
                            >
                                Sign in with Google
                            </Button>

                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don't have an account?{' '}
                                    <Link to="/register" style={{ textDecoration: 'none', color: '#0052CC', fontWeight: 600 }}>
                                        Sign up
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Motion.div>
            </Grid>

            {/* Right Side - Feature Panel */}
            {!isMobile && (
                <Grid size={{ md: 7 }} sx={{
                    position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(145deg, #0052CC 0%, #0747A6 40%, #172B4D 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    p: 8,
                }}>
                    {/* Subtle pattern */}
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }} />

                    <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
                        <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 1,
                            px: 2, py: 0.75, borderRadius: '100px',
                            bgcolor: 'rgba(255,255,255,0.1)', mb: 4,
                        }}>
                            <Sparkles size={14} color="#FFAB00" />
                            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500 }}>
                                AI-Powered Productivity
                            </Typography>
                        </Box>

                        <Typography sx={{
                            fontSize: '2.2rem', fontWeight: 700, color: 'white',
                            lineHeight: 1.25, mb: 2,
                        }}>
                            Your team's work,{' '}
                            <span style={{ color: '#79E2F2' }}>organized</span> and{' '}
                            <span style={{ color: '#57D9A3' }}>accelerated</span>.
                        </Typography>

                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, mb: 5 }}>
                            From backlog to deployment — manage sprints, track issues, and ship faster with AI-powered insights.
                        </Typography>

                        {/* Feature list */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {[
                                { icon: <Brain size={18} />, text: '7 AI engines for every workflow' },
                                { icon: <Zap size={18} />, text: 'Real-time Kanban & Scrum boards' },
                                { icon: <Shield size={18} />, text: 'Enterprise-grade security & SSO' },
                                { icon: <CheckCircle size={18} />, text: 'Smart sprint planning & analytics' },
                            ].map((item, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 32, height: 32, borderRadius: '8px',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.8)',
                                    }}>
                                        {item.icon}
                                    </Box>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                                        {item.text}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Stats */}
                        <Box sx={{
                            mt: 6, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', gap: 5,
                        }}>
                            {[
                                { value: '10k+', label: 'Teams' },
                                { value: '99.9%', label: 'Uptime' },
                                { value: '4.9/5', label: 'Rating' },
                            ].map((stat, i) => (
                                <Box key={i}>
                                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                        {stat.value}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {stat.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Grid>
            )}
        </Grid>
    );
};

export default LoginPage;
