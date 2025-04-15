# WHOOP GPT Integration

A secure backend service that bridges Custom GPTs with the WHOOP API, allowing users to access their health and fitness data through an AI assistant.

## Overview

This project creates a server that handles OAuth authentication with WHOOP and provides simplified API endpoints for a Custom GPT to access users' WHOOP data. Users can simply chat with the GPT about their health metrics, and the GPT will guide them through a one-time authentication flow.

### Key Features

- **Seamless Authentication**: Users authenticate once with WHOOP and can then immediately use the GPT without remembering any IDs or tokens
- **Secure Session Management**: Uses server-side sessions to securely track authenticated users
- **Token Encryption**: All WHOOP access tokens are encrypted at rest
- **Simple API**: Provides focused endpoints for the most important WHOOP data (recovery, sleep, profile)

## Architecture

The integration uses a three-component architecture:

1. **Custom GPT (on OpenAI)**: Uses an OpenAPI schema to communicate with your backend
2. **Node.js Backend (on Railway)**: Handles WHOOP authentication and API access
3. **WHOOP API**: Official source of user health and performance data

### Data Flow

1. User asks the GPT a question about their WHOOP data
2. GPT calls your backend API
3. If the user is not authenticated, they're redirected to WHOOP
4. After authentication, the backend stores encrypted tokens in a server-side session
5. Returning users are automatically recognized via their session cookie
6. The GPT presents the retrieved WHOOP data to the user

## Getting Started

### Prerequisites

- Node.js 16 or higher
- A WHOOP developer account with API credentials
- A Railway account (for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/whoop-gpt-integration.git
   cd whoop-gpt-integration
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in Railway dashboard (for production) or create a `.env` file (for local development):
   ```
   WHOOP_CLIENT_ID=your_client_id
   WHOOP_CLIENT_SECRET=your_client_secret
   WHOOP_REDIRECT_URI=http://localhost:3000/callback
   SESSION_SECRET=your_random_secure_string
   ENCRYPTION_KEY=your_encryption_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Railway

1. Create a new project on Railway
2. Connect your GitHub repository
3. Configure environment variables in Railway dashboard:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WHOOP_REDIRECT_URI` (use your Railway URL)
   - `SESSION_SECRET`
   - `ENCRYPTION_KEY`
   - `NODE_ENV=production`

4. Update your OAuth redirect URI in the WHOOP developer portal to match your Railway domain

## Creating Your Custom GPT

1. Visit https://chat.openai.com/gpts/
2. Click "Create a GPT"
3. Upload the `openapi-schema.yaml` file in the "Actions" section
4. Configure your GPT with instructions to use your WHOOP data endpoints

Example GPT instructions:
```
You're a helpful fitness and recovery assistant that uses WHOOP data to provide insights. 

If the user asks about their WHOOP data, call the appropriate API endpoint:
- For recovery scores or readiness, use the /api/recovery endpoint
- For sleep data, use the /api/sleep endpoint
- For user info, use the /api/profile endpoint

If the user needs to authenticate, provide the auth link and guide them through the process.

When showing WHOOP data, explain what the metrics mean and provide helpful insights based on the data.
```

## Security Considerations

This implementation includes several security features:

- **Session Management**: Uses secure HTTP-only cookies
- **Token Encryption**: All WHOOP tokens are encrypted before storage
- **CSRF Protection**: Implements state parameter validation in the OAuth flow
- **HTTPS Required**: Enforces secure connections in production

For enhanced security in production:
- Consider using a proper session store (Redis, MongoDB, etc.)
- Set up regular token rotation
- Implement rate limiting

## API Endpoints

### Authentication
- `GET /auth` - Initiates WHOOP OAuth flow
- `GET /callback` - OAuth callback from WHOOP
- `GET /logout` - Clears user session

### WHOOP Data
- `GET /api/recovery` - Gets latest recovery data
- `GET /api/sleep` - Gets latest sleep data
- `GET /api/profile` - Gets user profile information

## Why This Is Better Than the Official WHOOP GPT

This custom implementation offers several advantages:

1. Uses the more powerful GPT-4 model for deeper insights on health data
2. Provides more nuanced and personalized analysis of recovery patterns
3. Can combine sleep, strain, and recovery data for holistic recommendations
4. Less templated responses with more context-aware interpretations
5. Can be extended with additional features not available in the official integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WHOOP API for providing access to health data
- OpenAI for the Custom GPTs platform

---

Built as a community project to enhance the WHOOP user experience through AI.
