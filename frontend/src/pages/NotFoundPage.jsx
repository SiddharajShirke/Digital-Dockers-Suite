import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowBack } from '@mui/icons-material';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(145deg, #0052CC 0%, #0747A6 40%, #172B4D 100%)',
                position: 'relative',
                overflow: 'hidden',
                padding: 4,
            }}
        >
            {/* Dot grid */}
            <Box sx={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }} />

            {/* Main content */}
            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 500 }}>
                <Typography
                    sx={{
                        fontSize: 'clamp(7rem, 18vw, 12rem)',
                        fontWeight: 900,
                        lineHeight: 1,
                        mb: 2,
                        color: 'rgba(255,255,255,0.12)',
                        letterSpacing: '-0.05em',
                        userSelect: 'none',
                    }}
                >
                    404
                </Typography>

                <Typography
                    sx={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'white',
                        mb: 1.5,
                    }}
                >
                    Page not found
                </Typography>

                <Typography
                    sx={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        mb: 5,
                        maxWidth: 380,
                        mx: 'auto',
                    }}
                >
                    The page you're looking for doesn't exist or has been moved.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        startIcon={<Home sx={{ fontSize: 18 }} />}
                        onClick={() => navigate('/')}
                        sx={{
                            py: 1.2, px: 3.5, borderRadius: 2,
                            fontSize: '0.9rem', fontWeight: 600, textTransform: 'none',
                            bgcolor: 'white', color: '#0052CC',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                            boxShadow: 'none',
                        }}
                    >
                        Go home
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
                        onClick={() => navigate(-1)}
                        sx={{
                            py: 1.2, px: 3.5, borderRadius: 2,
                            fontSize: '0.9rem', fontWeight: 600, textTransform: 'none',
                            borderColor: 'rgba(255,255,255,0.25)', color: 'white',
                            '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.05)' },
                        }}
                    >
                        Go back
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default NotFoundPage;
