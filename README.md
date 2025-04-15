# WhoopGPT

A smart AI assistant that analyzes your WHOOP fitness data through ChatGPT.

## Overview

WhoopGPT combines the power of OpenAI's GPT models with your WHOOP fitness data to provide personalized insights, recommendations, and answers about your health and fitness. It allows you to have natural conversations about your fitness data, including recovery, sleep, workouts, and more.

## How It Works

1. **Authentication**: WhoopGPT securely connects to your WHOOP account using OAuth.
2. **Data Access**: Once connected, WhoopGPT can access your fitness data directly from WHOOP's API.
3. **AI Analysis**: We integrate this data with ChatGPT, allowing you to ask questions and get personalized insights.
4. **Natural Conversation**: Ask anything about your WHOOP data in natural language: "How was my sleep last night?", "What trends do you see in my recovery scores?", etc.

## Features

- **Secure OAuth Connection**: Safe and secure connection to your WHOOP account
- **Comprehensive Data Access**: Access to recovery, sleep, workout, cycle, and body measurement data
- **Historical Analysis**: View trends and patterns in your fitness data over time
- **Personalized Insights**: Get AI-powered recommendations based on your unique fitness profile
- **Natural Language Interface**: Interact with your fitness data through simple conversations

## Privacy & Security

- All WHOOP authentication tokens are stored securely in memory
- We use encryption for sensitive data
- We do not store your fitness data; it's accessed directly from WHOOP when needed
- For more details, please see our [Privacy Policy](/privacy-policy.html)

## Example Use Cases

- "How was my recovery last week compared to this week?"
- "What factors seem to impact my sleep quality the most?"
- "Can you analyze my workout patterns and suggest improvements?"
- "What's my average RHR trend over the past month?"
- "How does my recovery correlate with my workout strain?"

## Technical Implementation

WhoopGPT consists of:

1. **Backend Server**: Node.js Express server that handles WHOOP API integration and authentication
2. **ChatGPT Integration**: Custom GPT with specialized knowledge about fitness metrics and WHOOP data interpretation
3. **OAuth Flow**: Secure authentication with WHOOP's API

## Feedback & Support

We're constantly improving WhoopGPT based on user feedback. If you have suggestions, questions, or encounter any issues, please reach out to us.

---

*WhoopGPT is not affiliated with or endorsed by WHOOP, Inc. WHOOP is a registered trademark of WHOOP, Inc.* 
