const session = require('express-session');
const crypto = require('crypto');

// Generate a secure secret for session
const generateSecret = () => {
  return process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
};

// Configure session middleware
const configureSession = (app) => {
  // Session configuration
  app.use(session({
    secret: generateSecret(),
    resave: true, // Changed to true to ensure session is saved even if not modified
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days in milliseconds
      sameSite: 'lax' // Added to improve cookie handling across sites
    },
    // Adding explicit name to make sure the session ID is clearly identified
    name: 'whoopgpt.session'
  }));
};

module.exports = configureSession;