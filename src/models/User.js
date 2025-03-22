const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  githubId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false, // Some GitHub users might not have public email
  },
  name: String,
  avatarUrl: String,
  accessToken: {
    type: String,
    required: true,
  },
  profile: {
    bio: String,
    company: String,
    location: String,
    followers: Number,
    following: Number,
    public_repos: Number,
    created_at: Date,
    updated_at: Date,
  },
  rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  }],
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  // Add better error messages
  validateBeforeSave: true,
  strict: false // Allow additional fields
});

// Update lastActive when user is modified
userSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Add custom error handling
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('User already exists with this GitHub ID'));
  } else {
    next(error);
  }
});

// Add indexes for better query performance
userSchema.index({ githubId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'rooms': 1 });

const User = mongoose.model('User', userSchema);

// Add error handler
User.on('error', function(error) {
  console.error('User Model Error:', {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  });
});

module.exports = User; 