const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  repo: {
    type: String,
    required: false
  },
  createdBy: {
    type: String,
    required: true
  },
  githubUsername: {
    type: String,
    required: false
  },
  expiresAt: {
    type: Date,
    required: true
  },
  lastActivity: {
    type: Date,
    required: true
  },
  users: [{
    userId: String,
    username: String,
    color: String,
    joinedAt: Date
  }],
  files: [{
    path: String,
    content: String,
    lastModified: Date,
    version: Number
  }]
}, {
  timestamps: true
});

// Add index for room expiry
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Add method to update last activity
roomSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Add method to add user to room
roomSchema.methods.addUser = function(user) {
  if (!this.users.find(u => u.userId === user.userId)) {
    this.users.push({
      ...user,
      joinedAt: new Date()
    });
  }
  return this.save();
};

// Add method to remove user from room
roomSchema.methods.removeUser = function(userId) {
  this.users = this.users.filter(u => u.userId !== userId);
  return this.save();
};

// Add method to update file content
roomSchema.methods.updateFile = function(path, content) {
  const file = this.files.find(f => f.path === path);
  if (file) {
    file.content = content;
    file.lastModified = new Date();
    file.version += 1;
  } else {
    this.files.push({
      path,
      content,
      lastModified: new Date(),
      version: 1
    });
  }
  return this.save();
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 