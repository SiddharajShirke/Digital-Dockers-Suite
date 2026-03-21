import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, Typography, Chip, IconButton,
    FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { Close, Add, Person, Schedule } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ScheduleMeetingModal = ({ open, onClose, onMeetingCreated }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduledAt: new Date(Date.now() + 3600000),
        duration: 60,
        meetingType: 'mirotalk'
    });
    const [participants, setParticipants] = useState([]);
    const [participantEmail, setParticipantEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddParticipant = () => {
        if (participantEmail && !participants.find(p => p.email === participantEmail)) {
            setParticipants([...participants, { email: participantEmail, name: participantEmail }]);
            setParticipantEmail('');
        }
    };

    const handleRemoveParticipant = (email) => {
        setParticipants(participants.filter(p => p.email !== email));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const meetingData = {
                ...formData,
                participants: participants.map(p => ({ email: p.email, name: p.name }))
            };

            const res = await api.post('/meetings/schedule', meetingData);
            toast.success('Meeting scheduled successfully!');
            onMeetingCreated && onMeetingCreated(res.data);
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to schedule meeting');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            description: '',
            scheduledAt: new Date(Date.now() + 3600000),
            duration: 60,
            meetingType: 'mirotalk'
        });
        setParticipants([]);
        setParticipantEmail('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule color="primary" />
                    <Typography variant="h6">Schedule Meeting</Typography>
                </Box>
                <IconButton onClick={handleClose} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            fullWidth
                            label="Meeting Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Sprint Planning, Team Standup"
                        />

                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            placeholder="Meeting agenda and details..."
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DateTimePicker
                                        label="Date & Time"
                                        value={formData.scheduledAt}
                                        onChange={(newValue) => setFormData({ ...formData, scheduledAt: newValue })}
                                        slotProps={{ textField: { fullWidth: true } }}
                                        minDateTime={new Date()}
                                    />
                                </LocalizationProvider>
                            </Box>
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel>Duration</InputLabel>
                                <Select
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    label="Duration"
                                >
                                    <MenuItem value={15}>15 minutes</MenuItem>
                                    <MenuItem value={30}>30 minutes</MenuItem>
                                    <MenuItem value={45}>45 minutes</MenuItem>
                                    <MenuItem value={60}>1 hour</MenuItem>
                                    <MenuItem value={90}>1.5 hours</MenuItem>
                                    <MenuItem value={120}>2 hours</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Participants</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                    size="small"
                                    placeholder="Enter email address"
                                    value={participantEmail}
                                    onChange={(e) => setParticipantEmail(e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddParticipant(); } }}
                                    sx={{ flex: 1 }}
                                />
                                <Button variant="outlined" onClick={handleAddParticipant} startIcon={<Add />}>
                                    Add
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {participants.map((p, idx) => (
                                    <Chip
                                        key={idx}
                                        icon={<Person />}
                                        label={p.email}
                                        onDelete={() => handleRemoveParticipant(p.email)}
                                        size="small"
                                    />
                                ))}
                                {participants.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No participants added yet
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        <Alert severity="info">
                            A Mirotalk SFU meeting room will be automatically generated for this meeting.
                        </Alert>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || !formData.title}>
                        {loading ? 'Scheduling...' : 'Schedule Meeting'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ScheduleMeetingModal;
