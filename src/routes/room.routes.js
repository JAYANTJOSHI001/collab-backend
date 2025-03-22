const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Room = require('../models/room.model');
const { Octokit } = require('@octokit/rest');

// Create a new room
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { name, repo, githubUsername } = req.body;
    const room = new Room({
      name,
      repo,
      createdBy: req.user.username,
      githubUsername,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lastActivity: new Date()
    });

    const savedRoom = await room.save();
    res.status(201).json(savedRoom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room details
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
});

// Commit code to GitHub
router.post('/:id/commit', isAuthenticated, async (req, res) => {
  console.log("[API] Commit request received:", {
    roomId: req.params.id,
    body: req.body
  });

  try {
    const { files, message } = req.body;
    console.log("[API] Files to commit:", files);
    
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      console.log("[API] Room not found:", req.params.id);
      return res.status(404).json({ error: 'Room not found' });
    }

    // Use room.createdBy as the repository owner
    const repoOwner = room.createdBy;
    
    if (!repoOwner) {
      console.log("[API] Repository owner not found in room data");
      return res.status(400).json({ error: 'Repository owner information missing' });
    }

    const octokit = new Octokit({ auth: req.user.accessToken });
    
    // Commit directly to main branch
    const branchName = 'main';
    
    // Commit each file
    for (const file of files) {
      const { path, content } = file;
      
      if (!content) {
        console.log("[API] Skipping file with empty content:", path);
        continue;
      }
      
      console.log("[API] Processing file:", { path, contentLength: content.length });

      // Get the current file (if it exists)
      try {
        const { data: currentFile } = await octokit.repos.getContent({
          owner: repoOwner,
          repo: room.repo,
          path,
          ref: branchName
        });

        // Update file
        await octokit.repos.createOrUpdateFileContents({
          owner: repoOwner,
          repo: room.repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          branch: branchName,
          sha: currentFile.sha
        });
      } catch (error) {
        // File doesn't exist, create it
        if (error.status === 404) {
          await octokit.repos.createOrUpdateFileContents({
            owner: repoOwner,
            repo: room.repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'),
            branch: branchName
          });
        } else {
          console.error("[API] Error processing file:", error.message);
          return res.status(500).json({ error: `Failed to process file ${path}: ${error.message}` });
        }
      }
    }

    res.json({ success: true, branch: branchName });
  } catch (error) {
    console.error('Commit error:', error);
    res.status(500).json({ error: `Failed to commit changes: ${error.message}` });
  }
});

// Create a pull request
router.post('/:id/pr', isAuthenticated, async (req, res) => {
  try {
    const { title, body, branch } = req.body;
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Use room.createdBy instead of room.githubUsername
    const repoOwner = room.createdBy;
    
    if (!repoOwner) {
      console.log("[API] Repository owner not found in room data");
      return res.status(400).json({ error: 'Repository owner information missing' });
    }

    const octokit = new Octokit({ auth: req.user.accessToken });
    
    // Create pull request
    const { data: pullRequest } = await octokit.pulls.create({
      owner: repoOwner,
      repo: room.repo,
      title,
      body,
      head: branch,
      base: 'main'
    });

    res.json(pullRequest);
  } catch (error) {
    console.error('PR error:', error);
    res.status(500).json({ error: `Failed to create pull request: ${error.message}` });
  }
});

module.exports = router;