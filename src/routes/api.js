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
    console.log('Looking up token by ID:', req.query.token_id);
    tokenData = getTokenById(req.query.token_id);
    console.log('Token data from ID:', tokenData);
  }
  
  // If not found, try session
  if (!tokenData) {
    console.log('No token found by ID, checking session');
    tokenData = getWhoopToken(req);
    console.log('Token data from session:', tokenData);
  }
  
  if (!tokenData || !tokenData.access_token) {
    console.log('No valid token found');
    return res.status(401).json({ 
      error: 'Not authenticated',
      auth_required: true,
      auth_url: `${BASE_URL}/auth`
    });
  }
  
  // Add access token to request for the route handlers
  req.accessToken = tokenData.access_token;
  console.log('Using access token:', req.accessToken.substring(0, 10) + '...');
  next();
};

// API routes
router.get('/recovery', requireAuth, async (req, res) => {
  try {
    console.log('Making WHOOP API request with token:', req.accessToken.substring(0, 10) + '...');
    // Get the most recent recovery using the correct endpoint
    const response = await axios.get('https://api.prod.whoop.com/developer/v1/recovery', {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params: {
        limit: 1, // Get only the most recent recovery
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
      }
    });
    
    console.log('WHOOP API response status:', response.status);
    // Print full object with depth to see nested objects
    console.log('WHOOP API response data:', JSON.stringify(response.data, null, 2));
    
    // Extract the latest recovery data
    const latestRecovery = response.data.records?.[0];
    
    if (!latestRecovery) {
      return res.status(404).json({ error: 'No recovery data found' });
    }
    
    // Get the score object and log it to verify structure
    const score = latestRecovery.score;
    console.log('Recovery score object:', JSON.stringify(score, null, 2));
    
    // Format and return the data according to our OpenAPI schema
    res.json({
      date: latestRecovery.created_at,
      recovery_score: score?.recovery_score || null,
      hrv: score?.hrv_rmssd_milli || null,
      rhr: score?.resting_heart_rate || null,
      sleep_quality: score?.sleep_performance_percentage || null,
      user_status: score?.user_calibrating ? 'Calibrating' : 'Normal'
    });
  } catch (error) {
    console.error('Error fetching recovery data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
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
    console.log('Making WHOOP API request for sleep data');
    // Get the most recent sleep data using the v1 API
    const response = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params: {
        limit: 1, // Get only the most recent sleep
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
      }
    });
    
    console.log('WHOOP API sleep response status:', response.status);
    console.log('WHOOP API sleep response data:', JSON.stringify(response.data, null, 2));
    
    // Extract the latest sleep data
    const latestSleep = response.data.records?.[0];
    
    if (!latestSleep) {
      return res.status(404).json({ error: 'No sleep data found' });
    }
    
    // Get the score object and log it to verify structure
    const score = latestSleep.score;
    console.log('Sleep score object:', JSON.stringify(score, null, 2));
    
    // Format and return the data according to our OpenAPI schema
    res.json({
      date: latestSleep.start,
      score: score?.sleep_performance_percentage || null,
      total_duration_minutes: Math.floor((new Date(latestSleep.end) - new Date(latestSleep.start)) / 60000),
      efficiency: score?.sleep_efficiency_percentage || null,
      disturbances: score?.disturbances_count || 0,
      deep_sleep_minutes: score?.stage_summary?.deep_sleep_duration_seconds 
                          ? Math.floor(score.stage_summary.deep_sleep_duration_seconds / 60)
                          : null,
      rem_sleep_minutes: score?.stage_summary?.rem_sleep_duration_seconds
                        ? Math.floor(score.stage_summary.rem_sleep_duration_seconds / 60)
                        : null,
      light_sleep_minutes: score?.stage_summary?.light_sleep_duration_seconds
                          ? Math.floor(score.stage_summary.light_sleep_duration_seconds / 60)
                          : null
    });
  } catch (error) {
    console.error('Error fetching sleep data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
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
    console.log('Making WHOOP API request for profile data');
    // Get user profile information using the v1 API
    const response = await axios.get('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });
    
    console.log('WHOOP API profile response status:', response.status);
    console.log('WHOOP API profile response data:', JSON.stringify(response.data, null, 2));
    
    const profile = response.data;
    
    // Format and return the data
    res.json({
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email
    });
  } catch (error) {
    console.error('Error fetching profile data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
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

// Get historical recovery data (with customizable time period)
router.get('/recovery/history', requireAuth, async (req, res) => {
  try {
    console.log('Making WHOOP API request for historical recovery data');
    
    // Get the requested number of days from the query parameter (default to 30 days)
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 180);
    console.log(`Fetching recovery history for the past ${days} days`);
    
    // Calculate start date based on requested days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Initialize variables for pagination
    let allRecords = [];
    let nextToken = null;
    let page = 1;
    let hasMorePages = true;
    
    // Calculate max pages based on days (roughly 1 record per day, 25 records per page)
    const maxPages = Math.min(Math.ceil(days / 25) + 1, 8); // Cap at 8 pages for very long periods
    
    // Loop to get all pages of data
    while (hasMorePages && page <= maxPages) {
      console.log(`Fetching recovery history page ${page}...`);
      
      // Build params object
      const params = {
        limit: 25, // Maximum allowed by API
        start: startDate.toISOString()
      };
      
      // Add nextToken if we have one
      if (nextToken) {
        params.nextToken = nextToken;
      }
      
      // Make the API request
      const response = await axios.get('https://api.prod.whoop.com/developer/v1/recovery', {
        headers: {
          'Authorization': `Bearer ${req.accessToken}`
        },
        params
      });
      
      // Log response status
      console.log(`Recovery history page ${page} response status:`, response.status);
      
      // Get records from this page
      const records = response.data.records || [];
      console.log(`Got ${records.length} records from page ${page}`);
      
      // Process records to match our schema
      const processedRecords = records.map(record => {
        const score = record.score || {};
        return {
          date: record.created_at,
          recovery_score: score.recovery_score || null,
          hrv: score.hrv_rmssd_milli || null,
          rhr: score.resting_heart_rate || null,
          user_status: score.user_calibrating ? 'Calibrating' : 'Normal'
        };
      });
      
      // Add to our collection
      allRecords = [...allRecords, ...processedRecords];
      
      // Check if there are more pages
      nextToken = response.data.next_token;
      hasMorePages = !!nextToken;
      
      // Increment page counter
      page++;
    }
    
    // Calculate summary statistics
    const summary = {
      total_records: allRecords.length,
      days_requested: days,
      avg_recovery_score: 0,
      avg_hrv: 0,
      avg_rhr: 0,
      highest_recovery_score: 0,
      lowest_recovery_score: 100,
      data_by_week: {},
    };
    
    // Process records for summary
    let validScoreCount = 0;
    let validHrvCount = 0;
    let validRhrCount = 0;
    
    allRecords.forEach(record => {
      // Add to weekly buckets
      const date = new Date(record.date);
      const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
      const weekKey = `Week ${weekNumber} (${date.getMonth() + 1}/${date.getFullYear()})`;
      
      if (!summary.data_by_week[weekKey]) {
        summary.data_by_week[weekKey] = {
          records: [],
          avg_recovery_score: 0,
          avg_hrv: 0,
          avg_rhr: 0
        };
      }
      
      summary.data_by_week[weekKey].records.push(record);
      
      // Calculate overall stats
      if (record.recovery_score !== null) {
        summary.avg_recovery_score += record.recovery_score;
        validScoreCount++;
        
        if (record.recovery_score > summary.highest_recovery_score) {
          summary.highest_recovery_score = record.recovery_score;
        }
        
        if (record.recovery_score < summary.lowest_recovery_score) {
          summary.lowest_recovery_score = record.recovery_score;
        }
      }
      
      if (record.hrv !== null) {
        summary.avg_hrv += record.hrv;
        validHrvCount++;
      }
      
      if (record.rhr !== null) {
        summary.avg_rhr += record.rhr;
        validRhrCount++;
      }
    });
    
    // Calculate averages for overall summary
    if (validScoreCount > 0) {
      summary.avg_recovery_score = Math.round(summary.avg_recovery_score / validScoreCount);
    } else {
      summary.avg_recovery_score = null;
    }
    
    if (validHrvCount > 0) {
      summary.avg_hrv = Math.round((summary.avg_hrv / validHrvCount) * 100) / 100;
    } else {
      summary.avg_hrv = null;
    }
    
    if (validRhrCount > 0) {
      summary.avg_rhr = Math.round(summary.avg_rhr / validRhrCount);
    } else {
      summary.avg_rhr = null;
    }
    
    // Calculate weekly averages
    Object.keys(summary.data_by_week).forEach(weekKey => {
      const weekData = summary.data_by_week[weekKey];
      let weekScoreCount = 0;
      let weekHrvCount = 0;
      let weekRhrCount = 0;
      
      weekData.records.forEach(record => {
        if (record.recovery_score !== null) {
          weekData.avg_recovery_score += record.recovery_score;
          weekScoreCount++;
        }
        
        if (record.hrv !== null) {
          weekData.avg_hrv += record.hrv;
          weekHrvCount++;
        }
        
        if (record.rhr !== null) {
          weekData.avg_rhr += record.rhr;
          weekRhrCount++;
        }
      });
      
      // Calculate weekly averages
      if (weekScoreCount > 0) {
        weekData.avg_recovery_score = Math.round(weekData.avg_recovery_score / weekScoreCount);
      } else {
        weekData.avg_recovery_score = null;
      }
      
      if (weekHrvCount > 0) {
        weekData.avg_hrv = Math.round((weekData.avg_hrv / weekHrvCount) * 100) / 100;
      } else {
        weekData.avg_hrv = null;
      }
      
      if (weekRhrCount > 0) {
        weekData.avg_rhr = Math.round(weekData.avg_rhr / weekRhrCount);
      } else {
        weekData.avg_rhr = null;
      }
      
      // Remove raw records to reduce response size
      delete weekData.records;
    });
    
    // Return results
    res.json({
      summary,
      records: allRecords
    });
    
  } catch (error) {
    console.error('Error fetching historical recovery data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // Check if token expired or other auth error
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Authentication error',
        auth_required: true,
        auth_url: '/auth'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch historical recovery data' });
  }
});

// Additional endpoints as needed...

module.exports = router;