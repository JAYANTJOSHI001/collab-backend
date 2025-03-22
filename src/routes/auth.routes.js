const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// Configure GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.CLIENT_URL}/api/auth/callback/github`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GitHub Strategy - Profile received:', {
        id: profile.id,
        username: profile.username,
        hasEmail: !!profile._json.email,
        accessToken: accessToken ? '[PRESENT]' : '[MISSING]'
      });

      // Store user in MongoDB
      const user = {
        githubId: profile.id,
        name: profile.displayName || profile.username,
        email: profile._json.email,
        username: profile.username,
        avatarUrl: profile._json.avatar_url,
        accessToken
      };

      // Find or create user
      const savedUser = await User.findOneAndUpdate(
        { githubId: user.githubId },
        user,
        { upsert: true, new: true }
      );

      console.log('GitHub Strategy - User saved:', {
        id: savedUser._id,
        githubId: savedUser.githubId,
        username: savedUser.username
      });

      return done(null, savedUser);
    } catch (error) {
      console.error('GitHub Strategy - Error:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      return done(error, null);
    }
  }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware to verify GitHub token
const verifyGitHubToken = async (req, res, next) => {
  console.log("verifyGitHubToken - Headers:", {
    headers: req.headers,
    hasAuthHeader: !!req.headers.authorization
  });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error("verifyGitHubToken - No token provided");
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.error("verifyGitHubToken - Invalid token format");
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    console.log("verifyGitHubToken - Verifying token with GitHub");
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("verifyGitHubToken - GitHub API Error:", {
        status: response.status,
        statusText: response.statusText
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log("verifyGitHubToken - Token verified successfully");
    next();
  } catch (error) {
    console.error("verifyGitHubToken - Error:", {
      error: error instanceof Error ? error.message : error
    });
    res.status(500).json({ error: 'Failed to verify token' });
  }
};

// Store or update user data
router.post('/user', verifyGitHubToken, async (req, res) => {
  console.log("POST /user - Request received:", {
    body: req.body,
    headers: {
      contentType: req.headers['content-type'],
      hasAuth: !!req.headers.authorization
    }
  });

  try {
    const {
      githubId,
      username,
      email,
      name,
      avatarUrl,
      accessToken,
      profile,
    } = req.body;

    if (!githubId || !username || !accessToken) {
      console.error("POST /user - Missing required fields:", {
        hasGithubId: !!githubId,
        hasUsername: !!username,
        hasAccessToken: !!accessToken
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log("POST /user - Finding/Updating user:", { githubId, username });

    // Check MongoDB connection status
    if (mongoose.connection.readyState !== 1) {
      console.error("POST /user - MongoDB not connected:", {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      });
      return res.status(503).json({ 
        error: 'Database unavailable',
        message: 'Could not connect to database. Please try again later.'
      });
    }

    // First try to find the user with timeout handling
    let user;
    try {
      user = await Promise.race([
        User.findOne({ githubId }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database operation timed out')), 5000)
        )
      ]);
    } catch (findError) {
      console.error("POST /user - Find operation failed:", {
        error: findError.message,
        stack: findError.stack
      });
      return res.status(503).json({ 
        error: 'Database operation failed',
        message: 'Failed to retrieve user data. Please try again later.'
      });
    }

    console.log("POST /user - User found:", user);
    
    if (user) {
      // Update existing user
      console.log("POST /user - Updating existing user");
      user.username = username;
      user.email = email || user.email; // Keep existing email if new one is not provided
      user.name = name || user.name;
      user.avatarUrl = avatarUrl || user.avatarUrl;
      user.accessToken = accessToken;
      if (profile) {
        user.profile = {
          ...user.profile,
          ...profile
        };
      }
      user.lastActive = new Date();
    } else {
      // Create new user
      console.log("POST /user - Creating new user");
      user = new User({
        githubId,
        username,
        email,
        name,
        avatarUrl,
        accessToken,
        profile,
        lastActive: new Date()
      });
    }

    // Save the user
    const savedUser = await user.save();

    console.log("POST /user - User saved successfully:", {
      id: savedUser._id,
      githubId: savedUser.githubId,
      username: savedUser.username
    });

    res.json({
      id: savedUser._id,
      githubId: savedUser.githubId,
      username: savedUser.username,
      email: savedUser.email,
      name: savedUser.name,
      avatarUrl: savedUser.avatarUrl,
      profile: savedUser.profile,
    });
  } catch (error) {
    console.error("POST /user - Error:", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      } : error,
      type: typeof error
    });

    // Send appropriate error response
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ error: 'User already exists' });
    }

    res.status(500).json({ 
      error: 'Failed to store user data',
      message: error.message
    });
  }
});

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email', 'repo'] })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/git');
  }
);

module.exports = router; 