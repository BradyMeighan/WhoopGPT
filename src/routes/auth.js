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
    
    // Return a modern, beautiful success page with a copy button
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WHOOP Connected Successfully</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #1c7ed6;
            --primary-dark: #1971c2;
            --success: #37b24d;
            --background: #f8f9fa;
            --card-bg: #ffffff;
            --text: #212529;
            --text-secondary: #495057;
            --border: #dee2e6;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .container {
            max-width: 500px;
            width: 100%;
          }
          
          .card {
            background: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
            padding: 32px;
            transition: transform 0.3s ease;
          }
          
          .success-icon {
            display: flex;
            justify-content: center;
            margin-bottom: 24px;
          }
          
          .circle {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 64px;
            height: 64px;
            background-color: var(--success);
            border-radius: 50%;
          }
          
          .checkmark {
            color: white;
            font-size: 32px;
            transform: translateY(-2px);
          }
          
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 16px;
            text-align: center;
            color: var(--text);
          }
          
          p {
            font-size: 16px;
            color: var(--text-secondary);
            margin-bottom: 24px;
            text-align: center;
          }
          
          .token-container {
            background-color: var(--background);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            position: relative;
            border: 1px solid var(--border);
          }
          
          .token-id {
            font-family: monospace;
            font-size: 16px;
            word-break: break-all;
            color: var(--text);
            text-align: center;
          }
          
          .copy-btn {
            display: block;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.2s ease;
          }
          
          .copy-btn:hover {
            background-color: var(--primary-dark);
          }
          
          .footer {
            margin-top: 24px;
            text-align: center;
            font-size: 14px;
            color: var(--text-secondary);
          }
          
          .brand {
            color: var(--primary);
            font-weight: 600;
          }
          
          @media (max-width: 480px) {
            .card {
              padding: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="success-icon">
              <div class="circle">
                <span class="checkmark">✓</span>
              </div>
            </div>
            <h1>Successfully Connected to WHOOP!</h1>
            <p>Your WHOOP account has been linked. Please copy the token ID below and paste it into the GPT chat to continue.</p>
            
            <div class="token-container">
              <div class="token-id" id="tokenId">${tokenId}</div>
            </div>
            
            <button class="copy-btn" id="copyBtn">Copy Token ID</button>
            
            <div class="footer">
              You can now close this window and return to <span class="brand">WHOOP GPT</span>
            </div>
          </div>
        </div>
        
        <script>
          document.getElementById('copyBtn').addEventListener('click', function() {
            const tokenId = document.getElementById('tokenId').textContent;
            navigator.clipboard.writeText(tokenId)
              .then(() => {
                const btn = document.getElementById('copyBtn');
                btn.textContent = 'Copied!';
                btn.style.backgroundColor = 'var(--success)';
                setTimeout(() => {
                  btn.textContent = 'Copy Token ID';
                  btn.style.backgroundColor = 'var(--primary)';
                }, 2000);
              })
              .catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy token. Please copy it manually.');
              });
          });
        </script>
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

// Helper functions for token management
const getTokenById = (tokenId) => {
  // Security: Don't log token IDs
  
  if (!tokenStore[tokenId] || tokenStore[tokenId].expires < Date.now()) {
    // Security: Don't log token store details
    return null;
  }
  
  const data = tokenStore[tokenId];
  // Security: Don't log token details
  return data;
};

const getWhoopToken = (req) => {
  if (!req.session || !req.session.whoopToken) {
    // Security: Don't log session details
    return null;
  }
  
  const token = decrypt(req.session.whoopToken);
  // Security: Don't log token details
  return token;
};

// Export the helper functions
module.exports = router;
module.exports.getWhoopToken = getWhoopToken;
module.exports.getTokenById = getTokenById;