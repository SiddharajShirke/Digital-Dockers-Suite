const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, logoutUser, googleAuthCallback } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const passport = require('passport');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
    scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send'
    ],
    accessType: 'offline', // Crucial: Requests a refresh token
    prompt: 'consent'      // Crucial: Forces consent screen to ensure refresh token is returned
}));
router.get('/google/callback', (req, res, next) => {
    const { state } = req.query;

    // Check if this is a calendar integration request
    if (state) {
        try {
            const decoded = jwt.verify(state, process.env.JWT_SECRET);
            if (decoded.userId) {
                // Calendar integration - skip passport, go directly to handler
                return googleAuthCallback(req, res, next);
            }
        } catch (error) {
            // Invalid state, continue with passport authentication
            console.log('Invalid state token, using passport authentication');
        }
    }

    // Normal login flow - use passport authentication
    passport.authenticate('google', {
        session: false,
        failureRedirect: 'http://localhost:5173/login'
    })(req, res, next);
}, googleAuthCallback);

// Google Calendar connection routes (for adding to existing accounts)
const { connectGoogleCalendarCallback, disconnectGoogleCalendar } = require('../controllers/authController');
const { getCalendarAuthUrl } = require('../services/googleCalendarService');
const jwt = require('jsonwebtoken');

router.get('/google/calendar/auth', protect, (req, res) => {
    // Generate state with user ID for security
    const state = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const authUrl = getCalendarAuthUrl(state);
    res.json({ authUrl });
});

router.get('/google/calendar/callback', connectGoogleCalendarCallback);
router.post('/google/calendar/disconnect', protect, disconnectGoogleCalendar);

module.exports = router;
