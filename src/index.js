require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const configureSession = require('./middlewares/session');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true // Allow cookies with CORS
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware
configureSession(app);

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/api', apiRoutes);

// Simple home route
app.get('/', (req, res) => {
  res.send('WHOOP GPT Backend is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});