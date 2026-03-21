const asyncHandler = require('express-async-handler');
const { getAuthUrl, getTokens, listEvents } = require('../services/calendarService');

// @desc    Get Auth URL
// @route   GET /api/calendar/auth
// @access  Private
const getGoogleAuthUrl = asyncHandler(async (req, res) => {
    const url = getAuthUrl();
    res.status(200).json({ url });
});

// @desc    OAuth Callback
// @route   GET /api/calendar/callback
// @access  Public (handled by frontend redirect usually, but here as API)
const googleCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;
    const tokens = await getTokens(code);

    // In a real app, you'd associate this with the user.
    // Since this is a callback, user might not be logged in session unless passed via state.
    // Simplified: Return tokens to frontend to save or manage.
    res.status(200).json(tokens);
});

// @desc    Get Upcoming Events from Google Calendar
// @route   GET /api/calendar/events
// @access  Private
const getEvents = asyncHandler(async (req, res) => {
    // Check if user has Google Access Token
    if (!req.user.googleAccessToken) {
        res.status(400);
        throw new Error('Google Calendar not connected');
    }

    try {
        const events = await listEvents(req.user.googleAccessToken);

        // Map to a cleaner format
        const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            link: event.htmlLink,
            meetLink: event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
        }));

        res.json(formattedEvents);
    } catch (error) {
        console.error('Failed to fetch events:', error);
        res.status(401).json({ message: 'Failed to fetch events, try reconnecting Google account' });
    }
});

module.exports = {
    getGoogleAuthUrl,
    googleCallback,
    getEvents
};
