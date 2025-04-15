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
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,               // Prevents client-side JS from reading the cookie
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days in milliseconds
    }
  }));
};

module.exports = configureSession;