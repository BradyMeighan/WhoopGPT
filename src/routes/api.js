const express = require('express');
const axios = require('axios');
const { getWhoopToken, getTokenById } = require('./auth');
const router = express.Router();

// The base URL for the application
const BASE_URL = 'https://whoopgpt-production.up.railway.app';

// Middleware to check if a user is authenticated
const requireAuth = (req, res, next) => {
  let tokenData = null;
  
  // First, try to get token from query parameter
  if (req.query.token_id) {
    tokenData = getTokenById(req.query.token_id);
  }
  
  // If not found, try session
  if (!tokenData) {
    tokenData = getWhoopToken(req);
  }
  
  if (!tokenData || !tokenData.access_token) {
    return res.status(401).json({ 
      error: 'Not authenticated',
      auth_required: true,
      auth_url: `${BASE_URL}/auth`
    });
  }
  
  // Add access token to request for the route handlers
  req.accessToken = tokenData.access_token;
  next();
};

// API routes
router.get('/recovery', requireAuth, async (req, res) => {
  try {
    // Get the most recent recovery - UPDATED DOMAIN
    const response = await axios.get('https://api.prod.whoop.com/v2/recovery', {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });
    
    // Extract the latest recovery data
    const latestRecovery = response.data.data?.[0];
    
    if (!latestRecovery) {
      return res.status(404).json({ error: 'No recovery data found' });
    }
    
    // Format and return the data
    res.json({
      date: latestRecovery.date,
      recovery_score: latestRecovery.recovery_score,
      hrv: latestRecovery.hrv,
      rhr: latestRecovery.resting_heart_rate,
      sleep_quality: latestRecovery.sleep_quality_score,
      user_status: latestRecovery.user_status
    });
  } catch (error) {
    console.error('Error fetching recovery data:', error.response?.data || error.message);
    
    // Check if token expired or other auth error
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Authentication error',
        auth_required: true,
        auth_url: '/auth'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch recovery data' });
  }
});

router.get('/sleep', requireAuth, async (req, res) => {
  try {
    // Get the most recent sleep data - UPDATED DOMAIN
    const response = await axios.get('https://api.prod.whoop.com/v2/sleep', {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });
    
    // Extract the latest sleep data
    const latestSleep = response.data.data?.[0];
    
    if (!latestSleep) {
      return res.status(404).json({ error: 'No sleep data found' });
    }
    
    // Format and return the data
    res.json({
      date: latestSleep.date,
      score: latestSleep.score,
      total_duration_minutes: Math.floor(latestSleep.total_duration / 60),
      efficiency: latestSleep.efficiency,
      disturbances: latestSleep.disturbances,
      deep_sleep_minutes: Math.floor(latestSleep.deep_sleep_duration / 60),
      rem_sleep_minutes: Math.floor(latestSleep.rem_sleep_duration / 60),
      light_sleep_minutes: Math.floor(latestSleep.light_sleep_duration / 60)
    });
  } catch (error) {
    console.error('Error fetching sleep data:', error.response?.data || error.message);
    
    // Check if token expired or other auth error
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Authentication error',
        auth_required: true,
        auth_url: '/auth'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch sleep data' });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    // Get user profile information - UPDATED DOMAIN
    const response = await axios.get('https://api.prod.whoop.com/v2/user/profile', {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });
    
    const profile = response.data;
    
    // Format and return the data
    res.json({
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email
    });
  } catch (error) {
    console.error('Error fetching profile data:', error.response?.data || error.message);
    
    // Check if token expired or other auth error
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Authentication error',
        auth_required: true,
        auth_url: '/auth'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// Additional endpoints as needed...

module.exports = router;