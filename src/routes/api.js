const express = require('express');
const axios = require('axios');
const { getWhoopToken, getTokenById } = require('./auth');
const router = express.Router();

// The base URL for the application
const BASE_URL = 'https://whoopgpt-production.up.railway.app';

// Middleware to get token from session or query parameter
const getToken = async (req, res, next) => {
  // Check if there's a token ID in the query parameters
  if (req.query.token_id) {
    // Security: Don't log token IDs
    
    const tokenData = getTokenById(req.query.token_id);
    
    if (tokenData) {
      // Security: Don't log token details
      req.accessToken = tokenData.token.access_token;
      return next();
    }
    
    // Security: Don't log session status
  }
  
  // Try to get token from session
  const tokenData = getWhoopToken(req);
  
  if (tokenData) {
    req.accessToken = tokenData.access_token;
    return next();
  }
  
  // No valid token found
  return res.status(401).json({ error: 'Authentication required' });
};

// Middleware to make requests to WHOOP API
const fetchWhoopData = async (req, res, next) => {
  try {
    // Security: Don't log access tokens
    
    // ... existing code ...
    
    const response = await axios.get(req.whoopApiUrl, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });
    
    // Log only status code, not the full response data
    console.log('WHOOP API response status:', response.status);
    
    // Security: Don't log full API response with potentially sensitive data
    
    req.whoopData = response.data;
    next();
  } catch (error) {
    // ... existing code ...
  }
};

// API routes
router.get('/recovery', getToken, async (req, res) => {
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

router.get('/sleep', getToken, async (req, res) => {
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

router.get('/profile', getToken, async (req, res) => {
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
router.get('/recovery/history', getToken, async (req, res) => {
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

// Get historical sleep data (with customizable time period)
router.get('/sleep/history', getToken, async (req, res) => {
  try {
    console.log('Making WHOOP API request for historical sleep data');
    
    // Get the requested number of days (default 30, max 180)
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 180);
    console.log(`Fetching sleep history for the past ${days} days`);
    
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Pagination variables
    let allRecords = [];
    let nextToken = null;
    let page = 1;
    let hasMorePages = true;
    const maxPages = Math.min(Math.ceil(days / 25) + 1, 8);
    
    while (hasMorePages && page <= maxPages) {
      console.log(`Fetching sleep history page ${page}...`);
      
      const params = {
        limit: 25,
        start: startDate.toISOString()
      };
      if (nextToken) {
        params.nextToken = nextToken;
      }
      
      const response = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
        headers: { 'Authorization': `Bearer ${req.accessToken}` },
        params
      });
      
      console.log(`Sleep history page ${page} response status:`, response.status);
      const records = response.data.records || [];
      console.log(`Got ${records.length} sleep records from page ${page}`);
      
      // Process records
      const processedRecords = records.map(record => {
        const score = record.score || {};
        const stageSummary = score.stage_summary || {};
        const totalDurationSeconds = (new Date(record.end) - new Date(record.start)) / 1000;
        
        return {
          date: record.start,
          score: score.sleep_performance_percentage || null,
          total_duration_minutes: Math.floor(totalDurationSeconds / 60),
          efficiency: score.sleep_efficiency_percentage || null,
          disturbances: score.disturbances_count || 0,
          deep_sleep_minutes: stageSummary.deep_sleep_duration_seconds ? Math.floor(stageSummary.deep_sleep_duration_seconds / 60) : null,
          rem_sleep_minutes: stageSummary.rem_sleep_duration_seconds ? Math.floor(stageSummary.rem_sleep_duration_seconds / 60) : null,
          light_sleep_minutes: stageSummary.light_sleep_duration_seconds ? Math.floor(stageSummary.light_sleep_duration_seconds / 60) : null,
          awake_minutes: stageSummary.awake_duration_seconds ? Math.floor(stageSummary.awake_duration_seconds / 60) : null,
          respiratory_rate: score.respiratory_rate || null
        };
      });
      
      allRecords = [...allRecords, ...processedRecords];
      nextToken = response.data.next_token;
      hasMorePages = !!nextToken;
      page++;
    }
    
    // Calculate summary statistics
    const summary = {
      total_records: allRecords.length,
      days_requested: days,
      avg_score: 0,
      avg_duration_minutes: 0,
      avg_efficiency: 0,
      avg_deep_minutes: 0,
      avg_rem_minutes: 0,
      avg_light_minutes: 0,
      avg_awake_minutes: 0,
    };
    
    let validScoreCount = 0;
    let validDurationCount = 0;
    let validEfficiencyCount = 0;
    let validDeepCount = 0;
    let validRemCount = 0;
    let validLightCount = 0;
    let validAwakeCount = 0;
    
    allRecords.forEach(record => {
      if (record.score !== null) { summary.avg_score += record.score; validScoreCount++; }
      if (record.total_duration_minutes !== null) { summary.avg_duration_minutes += record.total_duration_minutes; validDurationCount++; }
      if (record.efficiency !== null) { summary.avg_efficiency += record.efficiency; validEfficiencyCount++; }
      if (record.deep_sleep_minutes !== null) { summary.avg_deep_minutes += record.deep_sleep_minutes; validDeepCount++; }
      if (record.rem_sleep_minutes !== null) { summary.avg_rem_minutes += record.rem_sleep_minutes; validRemCount++; }
      if (record.light_sleep_minutes !== null) { summary.avg_light_minutes += record.light_sleep_minutes; validLightCount++; }
      if (record.awake_minutes !== null) { summary.avg_awake_minutes += record.awake_minutes; validAwakeCount++; }
    });

    summary.avg_score = validScoreCount > 0 ? Math.round(summary.avg_score / validScoreCount) : null;
    summary.avg_duration_minutes = validDurationCount > 0 ? Math.round(summary.avg_duration_minutes / validDurationCount) : null;
    summary.avg_efficiency = validEfficiencyCount > 0 ? Math.round(summary.avg_efficiency / validEfficiencyCount * 100) / 100 : null;
    summary.avg_deep_minutes = validDeepCount > 0 ? Math.round(summary.avg_deep_minutes / validDeepCount) : null;
    summary.avg_rem_minutes = validRemCount > 0 ? Math.round(summary.avg_rem_minutes / validRemCount) : null;
    summary.avg_light_minutes = validLightCount > 0 ? Math.round(summary.avg_light_minutes / validLightCount) : null;
    summary.avg_awake_minutes = validAwakeCount > 0 ? Math.round(summary.avg_awake_minutes / validAwakeCount) : null;

    res.json({ summary, records: allRecords });

  } catch (error) {
    console.error('Error fetching historical sleep data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Authentication error', auth_required: true, auth_url: '/auth' });
    }
    res.status(500).json({ error: 'Failed to fetch historical sleep data' });
  }
});

// Get historical workout data (with customizable time period)
router.get('/workout/history', getToken, async (req, res) => {
  try {
    console.log('Making WHOOP API request for historical workout data');
    
    // Get days (default 30, max 180)
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 180);
    console.log(`Fetching workout history for the past ${days} days`);
    
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Pagination variables
    let allRecords = [];
    let nextToken = null;
    let page = 1;
    let hasMorePages = true;
    const maxPages = Math.min(Math.ceil(days / 25) + 1, 8); // Limit pagination
    
    while (hasMorePages && page <= maxPages) {
      console.log(`Fetching workout history page ${page}...`);
      
      const params = {
        limit: 25,
        start: startDate.toISOString()
      };
      if (nextToken) {
        params.nextToken = nextToken;
      }
      
      const response = await axios.get('https://api.prod.whoop.com/developer/v1/activity/workout', {
        headers: { 'Authorization': `Bearer ${req.accessToken}` },
        params
      });
      
      console.log(`Workout history page ${page} response status:`, response.status);
      const records = response.data.records || [];
      console.log(`Got ${records.length} workout records from page ${page}`);
      
      // Process records
      const processedRecords = records.map(record => {
        const score = record.score || {};
        const durationSeconds = (new Date(record.end) - new Date(record.start)) / 1000;
        
        return {
          date: record.start,
          sport_id: record.sport_id,
          strain: score.strain || null,
          average_heart_rate: score.average_heart_rate || null,
          max_heart_rate: score.max_heart_rate || null,
          kilojoule: score.kilojoule || null,
          distance_meter: score.distance_meter || null,
          duration_minutes: Math.floor(durationSeconds / 60),
        };
      });
      
      allRecords = [...allRecords, ...processedRecords];
      nextToken = response.data.next_token;
      hasMorePages = !!nextToken;
      page++;
    }
    
    // Calculate summary statistics
    const summary = {
      total_records: allRecords.length,
      days_requested: days,
      avg_strain: 0,
      avg_duration_minutes: 0,
      total_distance_km: 0,
      total_kilojoules: 0,
      workouts_by_sport: {}
    };
    
    let validStrainCount = 0;
    let validDurationCount = 0;
    
    allRecords.forEach(record => {
      if (record.strain !== null) { summary.avg_strain += record.strain; validStrainCount++; }
      if (record.duration_minutes !== null) { summary.avg_duration_minutes += record.duration_minutes; validDurationCount++; }
      if (record.distance_meter !== null) { summary.total_distance_km += record.distance_meter; }
      if (record.kilojoule !== null) { summary.total_kilojoules += record.kilojoule; }
      
      // Group by sport_id
      const sportId = record.sport_id || 'unknown';
      if (!summary.workouts_by_sport[sportId]) {
        summary.workouts_by_sport[sportId] = { count: 0, total_duration: 0, total_strain: 0 };
      }
      summary.workouts_by_sport[sportId].count++;
      summary.workouts_by_sport[sportId].total_duration += record.duration_minutes || 0;
      summary.workouts_by_sport[sportId].total_strain += record.strain || 0;
    });

    summary.avg_strain = validStrainCount > 0 ? Math.round((summary.avg_strain / validStrainCount) * 10) / 10 : null;
    summary.avg_duration_minutes = validDurationCount > 0 ? Math.round(summary.avg_duration_minutes / validDurationCount) : null;
    summary.total_distance_km = Math.round((summary.total_distance_km / 1000) * 10) / 10; // Convert to km
    summary.total_kilojoules = Math.round(summary.total_kilojoules);
    
    // Calculate average strain/duration per sport
    Object.keys(summary.workouts_by_sport).forEach(sportId => {
        const sport = summary.workouts_by_sport[sportId];
        sport.avg_strain = sport.count > 0 ? Math.round((sport.total_strain / sport.count) * 10) / 10 : null;
        sport.avg_duration = sport.count > 0 ? Math.round(sport.total_duration / sport.count) : null;
        delete sport.total_strain;
        delete sport.total_duration;
    });

    res.json({ summary, records: allRecords });

  } catch (error) {
    console.error('Error fetching historical workout data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Authentication error', auth_required: true, auth_url: '/auth' });
    }
    res.status(500).json({ error: 'Failed to fetch historical workout data' });
  }
});

// Add Body Measurement Endpoint
router.get('/body_measurement', getToken, async (req, res) => {
  try {
    console.log('Making WHOOP API request for body measurement data');
    const response = await axios.get('https://api.prod.whoop.com/developer/v1/user/measurement/body', {
      headers: { 'Authorization': `Bearer ${req.accessToken}` }
    });
    
    console.log('WHOOP API body measurement response status:', response.status);
    console.log('WHOOP API body measurement response data:', JSON.stringify(response.data, null, 2));
    
    const data = response.data;
    res.json({
      height_meter: data.height_meter || null,
      weight_kilogram: data.weight_kilogram || null,
      max_heart_rate: data.max_heart_rate || null
    });

  } catch (error) {
    console.error('Error fetching body measurement data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Authentication error', auth_required: true, auth_url: '/auth' });
    }
    res.status(500).json({ error: 'Failed to fetch body measurement data' });
  }
});

module.exports = router;