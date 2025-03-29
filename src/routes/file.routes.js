const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Room = require('../models/room.model');

// Get file content
router.get('/:fileId', isAuthenticated, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const room = await Room.findOne({ 'files.path': fileId });
    
    if (!room) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = room.files.find(f => f.path === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ content: file.content });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});

// Update file content
router.post('/:fileId', isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    const fileId = req.params.fileId;
    
    const room = await Room.findOneAndUpdate(
      { 'files.path': fileId },
      { 
        $set: { 
          'files.$.content': content,
          lastActivity: new Date()
        }
      },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file content' });
  }
});

module.exports = router;