const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');
const router = express.Router();

// Simple in-memory token store (would use a database in production)
const tokenStore = {};
const stateStore = {};

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(tokenStore).forEach(tokenId => {
    if (tokenStore[tokenId].expires < now) {
      delete tokenStore[tokenId];
    }
  });
}, 15 * 60 * 1000); // Clean every 15 minutes

// Helper function to generate a random state 
const generateState = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generate a unique token ID
const generateTokenId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Route to initiate OAuth flow
router.get('/auth', (req, res) => {
  // Generate a random state to prevent CSRF attacks
  const state = generateState();
  
  // Store the state in our memory store with a 10-minute expiration
  stateStore[state] = { 
    expires: Date.now() + (10 * 60 * 1000) // 10 minutes
  };
  
  // Build the WHOOP authorization URL
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
  if (!state || !stateStore[state]) {
    return res.status(403).send('State validation failed. Please try the authorization flow again.');
  }
  
  // Clean up the used state
  delete stateStore[state];
  
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  
  try {
    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://api.prod.whoop.com/oauth/oauth2/token', 
      new URLSearchParams({
        client_id: process.env.WHOOP_CLIENT_ID,
        client_secret: process.env.WHOOP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.WHOOP_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const tokenData = tokenResponse.data;
    
    // Generate a token ID for this authentication
    const tokenId = generateTokenId();
    
    // Store token data with the token ID
    tokenStore[tokenId] = {
      token: tokenData,
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    // Also store in session as a backup
    req.session.whoopToken = encrypt(tokenData);
    
    // Redirect to a success page with the token ID
    res.send(`
      <html>
        <body>
          <h1>Successfully connected to WHOOP!</h1>
          <p>You can now close this window and return to the GPT.</p>
          <p><strong>Important:</strong> Copy this token ID and provide it to the GPT: <code>${tokenId}</code></p>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    
    // Send more detailed error message
    let errorMessage = 'Error obtaining access token';
    if (error.response?.data) {
      errorMessage += `:<br><pre>${JSON.stringify(error.response.data, null, 2)}</pre>`;
    } else if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    res.status(500).send(errorMessage);
  }
});

// Helper function to get token data by token ID
const getTokenById = (tokenId) => {
  console.log('Getting token by ID:', tokenId);
  console.log('Current token store:', Object.keys(tokenStore));
  const data = tokenStore[tokenId];
  if (!data || data.expires < Date.now()) {
    console.log('Token not found or expired');
    return null;
  }
  console.log('Found token data:', data.token ? 'Token exists' : 'No token');
  return data.token;
};

// Helper function to get a user's WHOOP token from session
const getWhoopToken = (req) => {
  if (!req.session || !req.session.whoopToken) {
    console.log('No session or token in session');
    return null;
  }
  
  try {
    const token = decrypt(req.session.whoopToken);
    console.log('Decrypted token from session:', token ? 'Token exists' : 'No token');
    return token;
  } catch (error) {
    console.error('Error decrypting token:', error);
    return null;
  }
};

// Export the helper functions
module.exports = router;
module.exports.getWhoopToken = getWhoopToken;
module.exports.getTokenById = getTokenById;