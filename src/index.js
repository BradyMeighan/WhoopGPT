require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Generate a secure session secret
const sessionSecret = process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex');

// Middleware
app.use(cors({
  origin: true,
  credentials: true // Allow cookies with CORS
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure session
app.use(session({
  secret: sessionSecret,
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax'
  },
  name: 'whoopgpt.session'
}));

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Add session debugging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    next();
  });
}

// Routes
app.use('/', authRoutes);
app.use('/api', apiRoutes);

// Simple home route
app.get('/', (req, res) => {
  res.send('WHOOP GPT Backend is running!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('An unexpected error occurred');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});