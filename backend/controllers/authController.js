const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Helper to set cookie
const setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Supports netlify & localhost
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        fullName,
        email,
        password,
        role: role || 'technical_team'
    });

    if (user) {
        const token = generateToken(user._id);
        setTokenCookie(res, token);
        
        res.status(201).json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token // keeping for backwards compatibility potentially, but the cookie is what matters
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        const token = generateToken(user._id);
        setTokenCookie(res, token);
        
        res.json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(req.user);
});

// @desc    Google OAuth callback (handles both login and calendar integration)
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = asyncHandler(async (req, res) => {
    const { state } = req.query;

    // Check if this is a calendar integration request (state contains userId)
    if (state) {
        try {
            const decoded = jwt.verify(state, process.env.JWT_SECRET);
            if (decoded.userId) {
                // This is a calendar integration request, redirect to calendar callback handler
                return connectGoogleCalendarCallback(req, res);
            }
        } catch (error) {
            // Invalid state token, treat as normal login
            console.log('Invalid state token, proceeding with normal login');
        }
    }

    // Normal login flow
    const token = generateToken(req.user._id);
    setTokenCookie(res, token);

    // Redirect to frontend with token and user data
    const userData = encodeURIComponent(JSON.stringify({
        _id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role
    }));

    res.redirect(`http://localhost:5173/auth/google/callback?token=${token}&user=${userData}`);
});

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Connect Google Calendar to existing account
// @route   GET /api/auth/google/calendar/callback
// @access  Public (but requires valid state token)
const connectGoogleCalendarCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.redirect('http://localhost:5173/dashboard/settings?error=no_code');
    }

    if (!state) {
        return res.redirect('http://localhost:5173/dashboard/settings?error=no_state');
    }

    try {
        // Decode state to get user ID
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Exchange code for tokens
        const { getTokensFromCode } = require('../services/googleCalendarService');
        const tokens = await getTokensFromCode(code);

        // Update user with tokens
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('http://localhost:5173/dashboard/settings?error=user_not_found');
        }

        user.googleAccessToken = tokens.access_token;
        user.googleRefreshToken = tokens.refresh_token || user.googleRefreshToken; // Keep old refresh token if not provided
        user.googleTokenExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
        await user.save();

        res.redirect('http://localhost:5173/dashboard/settings?calendar_connected=true');
    } catch (error) {
        console.error('Error connecting Google Calendar:', error);
        res.redirect('http://localhost:5173/dashboard/settings?error=auth_failed');
    }
});

// @desc    Disconnect Google Calendar
// @route   POST /api/auth/google/calendar/disconnect
// @access  Private
const disconnectGoogleCalendar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    user.googleAccessToken = undefined;
    user.googleRefreshToken = undefined;
    user.googleTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Google Calendar disconnected successfully' });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'User logged out' });
});

module.exports = {
    registerUser,
    loginUser,
    getMe,
    logoutUser,
    googleAuthCallback,
    connectGoogleCalendarCallback,
    disconnectGoogleCalendar
};
