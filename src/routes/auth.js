const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');
const router = express.Router();

// Helper function to generate a random state 
const generateState = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Route to initiate OAuth flow
router.get('/auth', (req, res) => {
  // Generate a random state to prevent CSRF attacks
  const state = generateState();
  
  // Store the state in the session to verify later
  req.session.oauthState = state;
  
  // Build the WHOOP authorization URL - UPDATED DOMAIN
  const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  authUrl.searchParams.append('client_id', process.env.WHOOP_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.WHOOP_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'read:recovery read:sleep read:profile read:workout read:cycles read:body_measurement');
  
  res.redirect(authUrl.toString());
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Verify state parameter to prevent CSRF attacks
  if (!state || state !== req.session.oauthState) {
    return res.status(403).send('State validation failed. Possible CSRF attack.');
  }
  
  // Clean up the state from session
  delete req.session.oauthState;
  
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  
  try {
    // Exchange code for token - UPDATED DOMAIN
    const tokenResponse = await axios.post('https://api.prod.whoop.com/oauth/oauth2/token', {
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.WHOOP_REDIRECT_URI
    });
    
    const tokenData = tokenResponse.data;
    
    // Encrypt the token data
    const encryptedData = encrypt(tokenData);
    
    // Store the encrypted token in the user's session
    req.session.whoopToken = encryptedData;
    
    // Redirect to a success page
    res.send(`
      <html>
        <body>
          <h1>Successfully connected to WHOOP!</h1>
          <p>You can now close this window and return to the GPT to access your WHOOP data.</p>
          <p>Your session has been securely established - no need to remember any IDs or credentials.</p>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.status(500).send('Error obtaining access token');
  }
});

// Endpoint to refresh a token
router.post('/refresh', async (req, res) => {
  // Check if user has a session with a token
  if (!req.session.whoopToken) {
    return res.status(401).json({ 
      error: 'No active session',
      auth_required: true,
      auth_url: '/auth'
    });
  }
  
  try {
    // Decrypt the token data from the session
    const tokenData = decrypt(req.session.whoopToken);
    
    if (!tokenData || !tokenData.refresh_token) {
      return res.status(401).json({ 
        error: 'Invalid token',
        auth_required: true,
        auth_url: '/auth'
      });
    }
    
    // UPDATED DOMAIN
    const response = await axios.post('https://api.prod.whoop.com/oauth/oauth2/token', {
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token
    });
    
    const newTokenData = response.data;
    
    // Update the encrypted token in the session
    req.session.whoopToken = encrypt(newTokenData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Helper function to get a user's WHOOP token from session
const getWhoopToken = (req) => {
  if (!req.session || !req.session.whoopToken) {
    return null;
  }
  
  try {
    return decrypt(req.session.whoopToken);
  } catch (error) {
    console.error('Error decrypting token:', error);
    return null;
  }
};

// Logout endpoint
router.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out');
    }
    
    res.send('Logged out successfully');
  });
});

module.exports = router;
module.exports.getWhoopToken = getWhoopToken;