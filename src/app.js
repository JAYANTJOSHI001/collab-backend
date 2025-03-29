require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fileRoutes = require('./routes/file.routes');

// Import routes
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const userRoutes = require('./routes/user.routes');

// Import socket handler
const setupSocket = require('./socket/socket');

// Create Express app
const app = express();
const httpServer = createServer(app);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collab')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err.message));

// MongoDB Connection Events
mongoose.connection.on('disconnected', () => console.log('❌ MongoDB Disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB Reconnected'));

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// CORS configuration
// Add after creating the app
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/collab',
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/room', roomRoutes);
app.use('/user', userRoutes);

// Add file routes
app.use('/api/file', fileRoutes);

// Health check
app.get('/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'ok' : 'error';
  res.json({ 
    status,
    mongo: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'
  });
});

// Setup Socket.io
setupSocket(io);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;