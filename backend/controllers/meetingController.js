const asyncHandler = require('express-async-handler');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// Generate a Mirotalk SFU link
const generateMirotalkLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segment = (len) => Array(len).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    const roomId = `${segment(4)}-${segment(4)}-${segment(4)}`;
    const baseUrl = process.env.MIROTALK_URL || 'http://localhost:3010';
    return `${baseUrl}/join?room=${roomId}`;
};

// @desc    Schedule a new meeting
// @route   POST /api/meetings/schedule
// @access  Private (leads, managers, admin only)
const scheduleMeeting = asyncHandler(async (req, res) => {
    const { title, description, scheduledAt, duration, participants, meetingType } = req.body;

    // Check authorization
    const authorizedRoles = ['admin', 'project_manager', 'technical_lead', 'marketing_lead'];
    if (!authorizedRoles.includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to schedule meetings');
    }

    if (!title || !scheduledAt) {
        res.status(400);
        throw new Error('Please provide title and scheduled time');
    }

    const meetLink = generateMirotalkLink();
    const calendarEventId = '';

    // Check if user has Google credentials linked (keeping user fetch for logic consistency)
    // const user = await User.findById(req.user._id);

    // Process participants
    const processedParticipants = [];
    if (participants && participants.length > 0) {
        for (const p of participants) {
            if (p.userId) {
                const user = await User.findById(p.userId);
                if (user) {
                    processedParticipants.push({
                        user: user._id,
                        email: user.email,
                        name: user.fullName,
                        status: 'pending'
                    });
                }
            } else if (p.email) {
                processedParticipants.push({
                    email: p.email,
                    name: p.name || p.email,
                    status: 'pending'
                });
            }
        }
    }

    const meeting = await Meeting.create({
        title,
        description: description || '',
        createdBy: req.user._id,
        meetLink,
        calendarEventId,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60,
        participants: processedParticipants,
        meetingType: meetingType || 'mirotalk',
        status: 'scheduled'
    });

    await meeting.populate('createdBy', 'fullName email');

    // Send notifications to participants
    if (processedParticipants && processedParticipants.length > 0) {
        try {
            const notificationHandler = req.app.get('notificationHandler');
            if (notificationHandler) {
                const notificationService = notificationHandler.getNotificationService();
                
                for (const participant of processedParticipants) {
                    if (participant.user) {
                        await notificationService.createNotification({
                            recipient: participant.user,
                            sender: req.user._id,
                            type: 'MEETING_SCHEDULED',
                            title: 'Meeting Scheduled',
                            description: `You're invited to: ${title}`,
                            entityType: 'Meeting',
                            entityId: meeting._id,
                            priority: 'high',
                            metadata: {
                                meetingTitle: title,
                                scheduledAt: new Date(scheduledAt),
                                meetLink: meetLink,
                                duration: duration || 60
                            }
                        });
                    }
                }
            }
        } catch (notifError) {
            console.error('Error sending meeting notification:', notifError.message);
        }
    }

    // Broadcast meeting creation
    try {
        const io = req.app.get('io');
        io.emit('meeting:scheduled', {
            meetingId: meeting._id,
            title: meeting.title,
            scheduledAt: meeting.scheduledAt,
            participants: meeting.participants
        });
    } catch (error) {
        console.error('Error broadcasting:', error.message);
    }

    res.status(201).json(meeting);
});

// @desc    Get Google Calendar auth URL
// @route   GET /api/meetings/calendar-auth
// @access  Private
const getCalendarAuth = asyncHandler(async (req, res) => {
    res.json({ authUrl: '' });
});

// @desc    Get all meetings (upcoming + past)
// @route   GET /api/meetings
// @access  Private
const getMeetings = asyncHandler(async (req, res) => {
    const { type } = req.query;
    const now = new Date();

    let query = {};

    // Users can see meetings they created or are participants in
    query.$or = [
        { createdBy: req.user._id },
        { 'participants.user': req.user._id },
        { 'participants.email': req.user.email }
    ];

    if (type === 'upcoming') {
        query.scheduledAt = { $gte: now };
        query.status = { $in: ['scheduled', 'in_progress'] };
    } else if (type === 'past') {
        query.$or = [
            { scheduledAt: { $lt: now } },
            { status: 'completed' }
        ];
    }

    const meetings = await Meeting.find(query)
        .populate('createdBy', 'fullName email')
        .populate('participants.user', 'fullName email')
        .sort({ scheduledAt: -1 });

    res.status(200).json(meetings);
});

// @desc    Get meeting by ID
// @route   GET /api/meetings/:id
// @access  Private
const getMeeting = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.id)
        .populate('createdBy', 'fullName email')
        .populate('participants.user', 'fullName email');

    if (!meeting) {
        res.status(404);
        throw new Error('Meeting not found');
    }

    const isCreator = meeting.createdBy._id.toString() === req.user._id.toString();
    const isParticipant = meeting.participants.some(p =>
        (p.user && p.user._id.toString() === req.user._id.toString()) ||
        p.email === req.user.email
    );
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isParticipant && !isAdmin) {
        res.status(403);
        throw new Error('Not authorized to view this meeting');
    }

    res.status(200).json(meeting);
});

// @desc    Update meeting status
// @route   PUT /api/meetings/:id/status
// @access  Private
const updateMeetingStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
        res.status(404);
        throw new Error('Meeting not found');
    }

    if (meeting.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    meeting.status = status;
    await meeting.save();

    res.status(200).json(meeting);
});

// @desc    Add transcript to meeting
// @route   POST /api/meetings/:id/transcript
// @access  Private
const addTranscript = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
        res.status(404);
        throw new Error('Meeting not found');
    }

    if (meeting.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    meeting.transcript = {
        text,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
    };
    meeting.status = 'completed';
    await meeting.save();

    res.status(200).json(meeting);
});

// @desc    Cancel meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const cancelMeeting = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
        res.status(404);
        throw new Error('Meeting not found');
    }

    if (meeting.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    meeting.status = 'cancelled';
    await meeting.save();

    res.status(200).json({ message: 'Meeting cancelled' });
});

module.exports = {
    scheduleMeeting,
    getMeetings,
    getMeeting,
    updateMeetingStatus,
    addTranscript,
    cancelMeeting,
    getCalendarAuth
};
