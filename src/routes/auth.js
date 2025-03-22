const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to verify GitHub token
const verifyGitHubToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    // Verify token with GitHub
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
  } catch (error) {
    console.error('Error verifying GitHub token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
};

// Store or update user data
router.post('/user', verifyGitHubToken, async (req, res) => {
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

    const user = await User.findOneAndUpdate(
      { githubId },
      {
        username,
        email,
        name,
        avatarUrl,
        accessToken,
        profile,
        lastActive: new Date(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json({
      id: user._id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      profile: user.profile,
    });
  } catch (error) {
    console.error('Error storing user data:', error);
    res.status(500).json({ error: 'Failed to store user data' });
  }
});

// Get user data
router.get('/user/:githubId', verifyGitHubToken, async (req, res) => {
  try {
    const user = await User.findOne({ githubId: req.params.githubId })
      .select('-accessToken')
      .populate('rooms');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update user's last active timestamp
router.post('/user/:githubId/active', verifyGitHubToken, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { githubId: req.params.githubId },
      { lastActive: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ lastActive: user.lastActive });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ error: 'Failed to update user activity' });
  }
});

module.exports = router; 