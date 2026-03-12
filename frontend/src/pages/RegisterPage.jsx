import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Box, Button, TextField, Typography,
    Alert, CircularProgress, InputAdornment, IconButton, MenuItem, Grid, useTheme, useMediaQuery,
    LinearProgress
} from '@mui/material';
import { Email, Lock, Person, Visibility, VisibilityOff, Work, Business, ArrowForward } from '@mui/icons-material';
import { Sparkles, Users, BarChart3, Layers, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'technical_team',
        department: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const roles = [
        { value: 'admin', label: 'Administrator' },
        { value: 'project_manager', label: 'Project Manager' },
        { value: 'technical_team', label: 'Technical Team' },
        { value: 'marketing_team', label: 'Marketing Team' },
        { value: 'technical_lead', label: 'Technical Lead' },
        { value: 'marketing_lead', label: 'Marketing Lead' },
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const passwordStrength = useMemo(() => {
        const pwd = formData.password;
        if (!pwd) return { score: 0, label: '', color: 'transparent' };
        let score = 0;
        if (pwd.length >= 6) score += 1;
        if (pwd.length >= 10) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        if (score <= 1) return { score: 20, label: 'Weak', color: '#DE350B' };
        if (score <= 2) return { score: 40, label: 'Fair', color: '#FF8B00' };
        if (score <= 3) return { score: 60, label: 'Good', color: '#FFAB00' };
        if (score <= 4) return { score: 80, label: 'Strong', color: '#36B37E' };
        return { score: 100, label: 'Excellent', color: '#00875A' };
    }, [formData.password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const { confirmPassword: _confirmPassword, ...userData } = formData;
            await register(userData);
            toast.success('Registration Successful!');
            navigate('/dashboard');
        } catch (err) {
            setError(err);
            toast.error(err);
        } finally {
            setLoading(false);
        }
    };

    const inputSx = {
        mb: 2,
        '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0052CC' },
        },
    };

    return (
        <Grid container sx={{ minHeight: '100vh', overflow: 'hidden' }}>
            {/* Left Side - Form */}
            <Grid size={{ xs: 12, md: 5 }} sx={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                p: { xs: 3, sm: 4, md: 5 },
                bgcolor: 'background.paper', zIndex: 2, overflowY: 'auto',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{ maxWidth: 420, mx: 'auto', width: '100%' }}>
                        {/* Brand */}
                        <Box
                            sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
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

                        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            Create your account
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Get started with your team workspace.
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <TextField
                                required fullWidth size="small" name="fullName" label="Full Name"
                                value={formData.fullName} onChange={handleChange}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }}
                                sx={inputSx}
                            />
                            <TextField
                                required fullWidth size="small" name="email" label="Email Address" type="email"
                                value={formData.email} onChange={handleChange}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }}
                                sx={inputSx}
                            />
                            <TextField
                                required fullWidth size="small" name="password" label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password} onChange={handleChange}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment>,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ ...inputSx, mb: formData.password ? 0.5 : 2 }}
                            />

                            {formData.password && (
                                <Box sx={{ mb: 2 }}>
                                    <LinearProgress
                                        variant="determinate" value={passwordStrength.score}
                                        sx={{
                                            height: 3, borderRadius: 2, bgcolor: 'divider',
                                            '& .MuiLinearProgress-bar': { bgcolor: passwordStrength.color, borderRadius: 2 },
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ color: passwordStrength.color, fontSize: '0.65rem', mt: 0.3, display: 'block', textAlign: 'right' }}>
                                        {passwordStrength.label}
                                    </Typography>
                                </Box>
                            )}

                            <TextField
                                required fullWidth size="small" name="confirmPassword" label="Confirm Password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.confirmPassword} onChange={handleChange}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }}
                                sx={inputSx}
                            />
                            <TextField
                                required fullWidth size="small" select name="role" label="Role"
                                value={formData.role} onChange={handleChange}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Work sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }}
                                sx={inputSx}
                            >
                                {roles.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth size="small" name="department" label="Department (Optional)"
                                value={formData.department} onChange={handleChange}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Business sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }}
                                sx={inputSx}
                            />

                            <Button
                                type="submit" fullWidth variant="contained" disabled={loading}
                                endIcon={!loading && <ArrowForward sx={{ fontSize: 18 }} />}
                                sx={{
                                    mt: 1, py: 1.3, borderRadius: 2, fontSize: '0.9rem', fontWeight: 600,
                                    bgcolor: '#0052CC', '&:hover': { bgcolor: '#0747A6' },
                                    textTransform: 'none', boxShadow: 'none',
                                }}
                            >
                                {loading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
                            </Button>

                            <Box sx={{ display: 'flex', alignItems: 'center', my: 2.5 }}>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                                <Typography variant="caption" sx={{ px: 2, color: 'text.disabled', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
                                    or
                                </Typography>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                            </Box>

                            <Button
                                fullWidth variant="outlined"
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
                                Sign up with Google
                            </Button>

                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Already have an account?{' '}
                                    <Link to="/login" style={{ textDecoration: 'none', color: '#0052CC', fontWeight: 600 }}>
                                        Sign in
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </motion.div>
            </Grid>

            {/* Right Side - Feature Panel */}
            {!isMobile && (
                <Grid size={{ md: 7 }} sx={{
                    position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(145deg, #0747A6 0%, #0052CC 40%, #172B4D 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    p: 8,
                }}>
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
                                Join 10,000+ teams
                            </Typography>
                        </Box>

                        <Typography sx={{
                            fontSize: '2.2rem', fontWeight: 700, color: 'white',
                            lineHeight: 1.25, mb: 2,
                        }}>
                            The workspace that{' '}
                            <span style={{ color: '#79E2F2' }}>scales</span> with your team.
                        </Typography>

                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, mb: 5 }}>
                            Everything you need to plan, track, and deliver — with the intelligence to make it effortless.
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {[
                                { icon: <Users size={18} />, text: 'Unlimited team collaboration' },
                                { icon: <BarChart3 size={18} />, text: 'Advanced sprint analytics' },
                                { icon: <Layers size={18} />, text: 'Custom workflows & automations' },
                                { icon: <Globe size={18} />, text: 'Multi-project management' },
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

                        <Box sx={{
                            mt: 6, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', gap: 5,
                        }}>
                            {[
                                { value: '50k+', label: 'Users' },
                                { value: '7', label: 'AI Engines' },
                                { value: '98%', label: 'Satisfaction' },
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

export default RegisterPage;
