const express = require('express');
const router = express.Router();
const { Octokit } = require('@octokit/rest');
const User = require('../models/User');

// Get user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const user = await User.findOne({ accessToken: token });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
});

// Get user repositories
router.get('/repos', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const octokit = new Octokit({
      auth: token
    });

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      visibility: 'all'
    });

    const formattedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count
    }));

    res.json(formattedRepos);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

module.exports = router; 