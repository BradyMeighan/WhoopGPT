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
  
  console.log('Received callback with state:', state);
  console.log('Session state:', req.session.oauthState);
  
  // Verify state parameter to prevent CSRF attacks
  if (!state || state !== req.session.oauthState) {
    console.error('State validation failed:', { 
      receivedState: state, 
      sessionState: req.session.oauthState 
    });
    return res.status(403).send('State validation failed. Possible CSRF attack.');
  }
  
  // Clean up the state from session
  delete req.session.oauthState;
  
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  
  try {
    console.log('Exchanging code for token...');
    
    // IMPORTANT: Try form-urlencoded format which is more common for OAuth
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
    
    console.log('Token response received');
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
    console.error('Error exchanging code for token:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
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

// Rest of the file remains the same...

module.exports = router;
module.exports.getWhoopToken = getWhoopToken;