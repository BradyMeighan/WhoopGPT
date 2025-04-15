const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');
const router = express.Router();

// A simple in-memory store for OAuth states
// This avoids relying on session storage which can be unreliable in stateless environments
const stateStore = {};

// Clean up old states occasionally
setInterval(() => {
  const now = Date.now();
  Object.keys(stateStore).forEach(state => {
    if (stateStore[state].expires < now) {
      delete stateStore[state];
    }
  });
}, 15 * 60 * 1000); // Clean every 15 minutes

// Helper function to generate a random state 
const generateState = () => {
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
  
  console.log('Generated state:', state);
  
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
  console.log('Known states:', Object.keys(stateStore));
  
  // Verify state parameter to prevent CSRF attacks
  if (!state || !stateStore[state]) {
    return res.status(403).send('State validation failed. Please try the authorization flow again by visiting /auth');
  }
  
  // Clean up the used state
  delete stateStore[state];
  
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  
  try {
    console.log('Exchanging code for token...');
    
    // Use form-urlencoded format for the token request
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
    
    console.log('Token received successfully');
    const tokenData = tokenResponse.data;
    
    // Encrypt the token data
    const encryptedData = encrypt(tokenData);
    
    // Store the encrypted token in the user's session
    req.session.whoopToken = encryptedData;
    
    // Save the session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
      }
      
      // Continue regardless of session save error
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
    });
    
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