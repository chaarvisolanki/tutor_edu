# Cuemath AI Screener - Backend

Node.js/Express backend for the AI voice interviewer.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm start
```

## API Endpoints

### POST /api/chat
Main endpoint for interview conversation.

**Request (FormData):**
- `audio`: Audio file (WebM/Opus)
- `conversationHistory`: JSON string of prior messages

**Response:** Server-Sent Events (SSE) stream

### POST /api/evaluate
Final assessment after interview completes.

**Request:**
- `conversationHistory`: Array of message objects

**Response:** JSON with structured evaluation

### GET /health
Health check endpoint

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI key for Whisper transcription |
| `ANTHROPIC_API_KEY` | Anthropic key for Claude 3.5 Sonnet |
| `FRONTEND_URL` | CORS origin for production |
| `PORT` | Server port (default: 3001) |