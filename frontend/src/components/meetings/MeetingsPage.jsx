import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Button, Card, CardContent,
    Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Avatar, CircularProgress
} from '@mui/material';
import {
    Add, VideoCall, Schedule, Person, ContentCopy,
    Description, PlayArrow, ExpandMore, ExpandLess, Warning, Link as LinkIcon, Settings
} from '@mui/icons-material';
import { format, isPast, isFuture } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { useNavigate } from 'react-router-dom';

const MeetingsPage = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
    const [transcriptText, setTranscriptText] = useState('');
    const [expandedMeeting, setExpandedMeeting] = useState(null);

    const canScheduleMeetings = ['admin', 'project_manager', 'technical_lead', 'marketing_lead'].includes(user?.role);

    useEffect(() => {
        fetchMeetings();

    }, [user]);

    const fetchMeetings = async () => {
        try {
            const res = await api.get('/meetings');
            setMeetings(res.data || []);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMeetingCreated = (newMeeting) => {
        setMeetings([newMeeting, ...meetings]);
    };

    const handleCopyLink = (link) => {
        navigator.clipboard.writeText(link);
        toast.success('Meeting link copied!');
    };

    const handleJoinMeeting = (link) => {
        window.open(link, '_blank');
    };

    const handleAddTranscript = async () => {
        if (!transcriptText.trim()) {
            toast.error('Please enter transcript text');
            return;
        }

        try {
            await api.post('/meetings/' + selectedMeeting._id + '/transcript', { text: transcriptText });
            toast.success('Transcript added successfully!');
            setTranscriptDialogOpen(false);
            setTranscriptText('');
            fetchMeetings();
        } catch {
            toast.error('Failed to add transcript');
        }
    };

    const upcomingMeetings = meetings.filter(m =>
        isFuture(new Date(m.scheduledAt)) && m.status !== 'cancelled'
    );
    const pastMeetings = meetings.filter(m =>
        isPast(new Date(m.scheduledAt)) || m.status === 'completed'
    );

    const MeetingCard = ({ meeting, isPastMeeting }) => {
        const isExpanded = expandedMeeting === meeting._id;

        return (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2, '&:hover': { borderColor: 'primary.main' } }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                {meeting.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Schedule fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        {format(new Date(meeting.scheduledAt), 'PPP p')}
                                    </Typography>
                                </Box>
                                <Chip label={meeting.duration + ' min'} size="small" variant="outlined" />
                                <Chip
                                    label={meeting.status}
                                    size="small"
                                    color={meeting.status === 'completed' ? 'success' : meeting.status === 'scheduled' ? 'primary' : 'default'}
                                />
                            </Box>
                            {meeting.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {meeting.description}
                                </Typography>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isPastMeeting && meeting.meetLink && (
                                <>
                                    <Button variant="contained" size="small" startIcon={<PlayArrow />} onClick={() => handleJoinMeeting(meeting.meetLink)}>
                                        Join
                                    </Button>
                                    <IconButton size="small" onClick={() => handleCopyLink(meeting.meetLink)}>
                                        <ContentCopy fontSize="small" />
                                    </IconButton>
                                </>
                            )}
                            {isPastMeeting && !meeting.transcript?.text && canScheduleMeetings && (
                                <Button variant="outlined" size="small" startIcon={<Description />} onClick={() => { setSelectedMeeting(meeting); setTranscriptDialogOpen(true); }}>
                                    Add Transcript
                                </Button>
                            )}
                            <IconButton size="small" onClick={() => setExpandedMeeting(isExpanded ? null : meeting._id)}>
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                        </Box>
                    </Box>

                    {meeting.participants?.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Person fontSize="small" color="action" />
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {meeting.participants.slice(0, 3).map((p, idx) => (
                                    <Chip key={idx} label={p.name || p.email} size="small" variant="outlined" />
                                ))}
                                {meeting.participants.length > 3 && (
                                    <Chip label={'+' + (meeting.participants.length - 3) + ' more'} size="small" />
                                )}
                            </Box>
                        </Box>
                    )}

                    {isExpanded && meeting.transcript?.text && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Transcript</Typography>
                            <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: 'background.default' }}>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {meeting.transcript.text}
                                </Typography>
                            </Paper>
                        </Box>
                    )}

                    {isExpanded && meeting.meetLink && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Meeting Link</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VideoCall color="primary" />
                                <Typography variant="body2" sx={{ color: 'primary.main', cursor: 'pointer' }} onClick={() => handleJoinMeeting(meeting.meetLink)}>
                                    {meeting.meetLink}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Meetings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Schedule, join, and review meeting transcripts</Typography>
                </Box>
                {canScheduleMeetings && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setScheduleModalOpen(true)}
                        sx={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                            '&:hover': {
                                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.5)'
                            }
                        }}
                    >
                        Schedule Meeting
                    </Button>
                )}
            </Box>

            <Paper elevation={0} sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        px: 2,
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            textTransform: 'none'
                        },
                        '& .Mui-selected': {
                            color: '#4f46e5 !important'
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#4f46e5'
                        }
                    }}
                >
                    <Tab label={'Upcoming (' + upcomingMeetings.length + ')'} />
                    <Tab label={'Past Meetings (' + pastMeetings.length + ')'} />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {activeTab === 0 && (
                        upcomingMeetings.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <VideoCall sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography color="text.secondary">No upcoming meetings</Typography>
                                {canScheduleMeetings && (
                                    <Button sx={{ mt: 2 }} onClick={() => setScheduleModalOpen(true)}>Schedule your first meeting</Button>
                                )}
                            </Box>
                        ) : (
                            upcomingMeetings.map(meeting => (
                                <MeetingCard key={meeting._id} meeting={meeting} isPastMeeting={false} />
                            ))
                        )
                    )}

                    {activeTab === 1 && (
                        pastMeetings.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography color="text.secondary">No past meetings</Typography>
                            </Box>
                        ) : (
                            pastMeetings.map(meeting => (
                                <MeetingCard key={meeting._id} meeting={meeting} isPastMeeting={true} />
                            ))
                        )
                    )}
                </Box>
            </Paper>

            <ScheduleMeetingModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} onMeetingCreated={handleMeetingCreated} />

            <Dialog open={transcriptDialogOpen} onClose={() => setTranscriptDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add Meeting Transcript</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Paste the meeting transcript below.
                    </Typography>
                    <TextField fullWidth multiline rows={10} placeholder="Paste transcript here..." value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTranscriptDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTranscript}>Save Transcript</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MeetingsPage;
