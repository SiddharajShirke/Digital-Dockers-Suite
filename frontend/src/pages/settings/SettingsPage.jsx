import { useState } from 'react';
import {
    Typography, Box, Paper, Switch, FormControlLabel, Divider,
    TextField, Button, Grid, Avatar, IconButton, Tabs, Tab,
    Select, MenuItem, FormControl, InputLabel, Alert
} from '@mui/material';
import { PhotoCamera, Save, Event, CheckCircle, Warning, Lock } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useEffect } from 'react';

function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index} style={{ paddingTop: 24 }}>
            {value === index && children}
        </div>
    );
}

const SettingsPage = () => {
    const { user } = useAuth();
    const { mode, toggleTheme } = useThemeMode();
    const [activeTab, setActiveTab] = useState(0);
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        department: user?.department || '',
        phone: '',
        bio: '',
    });
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        taskUpdates: true,
        meetingReminders: true,
        weeklyDigest: false,
    });
    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);

    // Check URL parameters for calendar connection status
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('calendar_connected') === 'true') {
            setGoogleCalendarConnected(true);
            toast.success('Google Calendar connected successfully!');
            // Clean up URL
            window.history.replaceState({}, '', '/dashboard/settings');
        }
        if (params.get('error')) {
            toast.error('Failed to connect Google Calendar');
            window.history.replaceState({}, '', '/dashboard/settings');
        }
    }, []);

    // Check if user has Google Calendar connected on mount
    useEffect(() => {
        // You can add an API call here to check connection status
        // For now, we'll check if user object has googleAccessToken
        setGoogleCalendarConnected(!!user?.googleAccessToken);
    }, [user]);

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleNotificationChange = (e) => {
        setNotifications({ ...notifications, [e.target.name]: e.target.checked });
    };

    const handleSecurityChange = (e) => {
        setSecurity({ ...security, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = () => {
        // API call to update profile
        toast.success('Profile updated successfully!');
    };

    const handleSaveNotifications = () => {
        // API call to update notification preferences
        toast.success('Notification preferences saved!');
    };

    const handleChangePassword = () => {
        if (security.newPassword !== security.confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }
        // API call to change password
        toast.success('Password changed successfully!');
        setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const handleConnectGoogleCalendar = async () => {
        try {
            setCalendarLoading(true);
            const res = await api.get('/auth/google/calendar/auth');
            // Redirect user to Google OAuth
            window.location.href = res.data.authUrl;
        } catch {
            toast.error('Failed to initiate Google Calendar connection');
            setCalendarLoading(false);
        }
    };

    const handleDisconnectGoogleCalendar = async () => {
        if (!window.confirm('Are you sure you want to disconnect Google Calendar? Meetings will no longer generate real Google Meet links.')) {
            return;
        }
        try {
            setCalendarLoading(true);
            await api.post('/auth/google/calendar/disconnect');
            setGoogleCalendarConnected(false);
            toast.success('Google Calendar disconnected');
        } catch {
            toast.error('Failed to disconnect Google Calendar');
        } finally {
            setCalendarLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Settings
            </Typography>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab label="Profile" />
                    <Tab label="Notifications" />
                    <Tab label="Appearance" />
                    <Tab label="Security" />
                    <Tab label="Integrations" />
                </Tabs>

                {/* Profile Tab */}
                <TabPanel value={activeTab} index={0}>
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        fontSize: 40,
                                        bgcolor: '#0052CC',
                                    }}
                                >
                                    {user?.fullName?.[0]}
                                </Avatar>
                                <IconButton
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        bgcolor: 'background.paper',
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        '&:hover': { bgcolor: 'background.paper' }
                                    }}
                                    size="small"
                                >
                                    <PhotoCamera fontSize="small" />
                                </IconButton>
                            </Box>
                            <Box>
                                <Typography variant="h6">{user?.fullName}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {user?.role?.replace('_', ' ').toUpperCase()}
                                </Typography>
                            </Box>
                        </Box>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    name="fullName"
                                    value={profileData.fullName}
                                    onChange={handleProfileChange}
                                    sx={{ maxWidth: 400 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    disabled
                                    helperText="Email cannot be changed"
                                    sx={{ maxWidth: 400 }}
                                    slotProps={{
                                        input: {
                                            startAdornment: <Lock sx={{ mr: 1, fontSize: 18, color: 'text.disabled' }} />
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Department"
                                    name="department"
                                    value={profileData.department}
                                    onChange={handleProfileChange}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    sx={{ maxWidth: 400 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Bio"
                                    name="bio"
                                    value={profileData.bio}
                                    onChange={handleProfileChange}
                                    multiline
                                    rows={4}
                                    placeholder="Tell us about yourself..."
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    onClick={handleSaveProfile}
                                >
                                    Save Changes
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </TabPanel>

                {/* Notifications Tab */}
                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Email Notifications
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.email}
                                        onChange={handleNotificationChange}
                                        name="email"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Email Notifications</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Receive email updates about your activity
                                        </Typography>
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.taskUpdates}
                                        onChange={handleNotificationChange}
                                        name="taskUpdates"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Task Updates</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Get notified when tasks are assigned or updated
                                        </Typography>
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.meetingReminders}
                                        onChange={handleNotificationChange}
                                        name="meetingReminders"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Meeting Reminders</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Receive reminders before scheduled meetings
                                        </Typography>
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={notifications.weeklyDigest}
                                        onChange={handleNotificationChange}
                                        name="weeklyDigest"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Weekly Digest</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Get a weekly summary of your activity
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Push Notifications
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={notifications.push}
                                    onChange={handleNotificationChange}
                                    name="push"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body1">Browser Notifications</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Show desktop notifications for important updates
                                    </Typography>
                                </Box>
                            }
                        />

                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSaveNotifications}
                            >
                                Save Preferences
                            </Button>
                        </Box>
                    </Box>
                </TabPanel>

                {/* Appearance Tab */}
                <TabPanel value={activeTab} index={2}>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Theme
                        </Typography>
                        <FormControlLabel
                            control={<Switch checked={mode === 'dark'} onChange={toggleTheme} />}
                            label={
                                <Box>
                                    <Typography variant="body1">Dark Mode</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Use dark theme across the application
                                    </Typography>
                                </Box>
                            }
                        />

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Language & Region
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Language</InputLabel>
                                    <Select defaultValue="en" label="Language">
                                        <MenuItem value="en">English</MenuItem>
                                        <MenuItem value="es">Spanish</MenuItem>
                                        <MenuItem value="fr">French</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Timezone</InputLabel>
                                    <Select defaultValue="utc" label="Timezone">
                                        <MenuItem value="utc">UTC</MenuItem>
                                        <MenuItem value="ist">IST (India)</MenuItem>
                                        <MenuItem value="pst">PST (US)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>
                </TabPanel>

                {/* Security Tab */}
                <TabPanel value={activeTab} index={3}>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Change Password
                        </Typography>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Password must be at least 8 characters long and include uppercase, lowercase, and numbers.
                        </Alert>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Current Password"
                                    name="currentPassword"
                                    value={security.currentPassword}
                                    onChange={handleSecurityChange}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="New Password"
                                    name="newPassword"
                                    value={security.newPassword}
                                    onChange={handleSecurityChange}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Confirm New Password"
                                    name="confirmPassword"
                                    value={security.confirmPassword}
                                    onChange={handleSecurityChange}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleChangePassword}
                                >
                                    Update Password
                                </Button>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 4 }} />

                        <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>
                            Danger Zone
                        </Typography>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: 'error.main',
                                bgcolor: mode === 'light' ? '#FFEBE6' : 'rgba(248, 113, 104, 0.1)'
                            }}
                        >
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                Delete Account
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Once you delete your account, there is no going back. Please be certain.
                            </Typography>
                            <Button variant="outlined" color="error">
                                Delete My Account
                            </Button>
                        </Paper>
                    </Box>
                </TabPanel>

                {/* Integrations Tab */}
                <TabPanel value={activeTab} index={4}>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Google Calendar Integration
                        </Typography>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Connect your Google Calendar to enable real Google Meet links for scheduled meetings.
                            Without this connection, meeting links will be placeholders only.
                        </Alert>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                border: '1px solid',
                                borderColor: googleCalendarConnected ? 'success.main' : 'divider',
                                bgcolor: googleCalendarConnected
                                    ? (mode === 'light' ? '#E3FCEF' : 'rgba(34, 197, 94, 0.1)')
                                    : 'background.paper'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Event
                                    sx={{
                                        fontSize: 40,
                                        color: googleCalendarConnected ? 'success.main' : 'text.secondary'
                                    }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h6">Google Calendar</Typography>
                                        {googleCalendarConnected && (
                                            <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                                        )}
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {googleCalendarConnected
                                            ? 'Your Google Calendar is connected'
                                            : 'Not connected'}
                                    </Typography>
                                </Box>
                            </Box>

                            {googleCalendarConnected ? (
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        ✓ Real Google Meet links will be generated for new meetings
                                        <br />
                                        ✓ Meetings will appear in your Google Calendar
                                        <br />
                                        ✓ Participants will receive calendar invites
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleDisconnectGoogleCalendar}
                                        disabled={calendarLoading}
                                    >
                                        Disconnect Calendar
                                    </Button>
                                </Box>
                            ) : (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                                        <Warning sx={{ fontSize: 20, color: 'warning.main', mt: 0.5 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Without Google Calendar connection, meeting links will be placeholder URLs that don't work.
                                            Connect your Google account to generate real, working Google Meet links.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<Event />}
                                        onClick={handleConnectGoogleCalendar}
                                        disabled={calendarLoading}
                                    >
                                        {calendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </Box>
                </TabPanel>
            </Paper>
        </Box>
    );
};

export default SettingsPage;
