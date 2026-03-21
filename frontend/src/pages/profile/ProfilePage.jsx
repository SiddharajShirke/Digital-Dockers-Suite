import { Typography, Box, Paper, Avatar, Grid, TextField, Button } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const ProfilePage = () => {
    const { user } = useAuth();

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Profile</Typography>
            <Paper sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid size="auto">
                        <Avatar sx={{ width: 100, height: 100, fontSize: 40 }}>{user?.fullName?.[0]}</Avatar>
                    </Grid>
                    <Grid size="grow">
                        <Typography variant="h5">{user?.fullName}</Typography>
                        <Typography color="textSecondary">{user?.role}</Typography>
                        <Typography color="textSecondary">{user?.email}</Typography>
                    </Grid>
                </Grid>

                <Box component="form" sx={{ mt: 4 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField fullWidth label="Full Name" defaultValue={user?.fullName} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField fullWidth label="Email" defaultValue={user?.email} disabled />
                        </Grid>
                        <Grid size={12}>
                            <Button variant="contained">Save Changes</Button>
                        </Grid>
                    </Grid>
                </Box>

                {/* Connected Accounts Section */}
                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>Connected Accounts</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Connect your accounts to enable features like Google Meet scheduling, sending emails, and calendar integration.
                    </Typography>

                    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {/* Google Icon SVG */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <Box>
                                <Typography variant="subtitle1">Google Account</Typography>
                                <Typography variant="caption" color={user?.googleId ? "success.main" : "text.secondary"}>
                                    {user?.googleId ? 'Connected' : 'Not Connected'}
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant={user?.googleId ? "outlined" : "contained"}
                            color={user?.googleId ? "error" : "primary"}
                            href={`${import.meta.env.VITE_API_URL || ''}/api/auth/google`}
                        >
                            {user?.googleId ? 'Disconnect' : 'Connect'}
                        </Button>
                    </Paper>
                </Box>
            </Paper>
        </Box>
    );
};

export default ProfilePage;
