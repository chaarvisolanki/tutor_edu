# Cuemath AI Screener - Frontend

React + Vite + Tailwind CSS frontend for the AI voice interviewer.

## Setup

```bash
cd frontend
npm install
cp .env.example .env
# Update VITE_BACKEND_URL if backend is not on localhost:3001
npm run dev
```

## Features

### Interview Room
- **MediaRecorder API** captures audio in WebM/Opus format
- **Voice Activity Detection** - automatically stops recording after silence
- **SSE Client** streams Aria's responses word-by-word
- **Web Speech API** reads responses aloud for hands-free interaction

### Visual States
- **Listening** - waveform animation while recording
- **Aria is thinking...** - spinner during transcription/processing
- **Aria speaking...** - speaker icon while TTS plays

### Interview Flow
1. Candidate holds microphone button to speak
2. Release sends audio to backend (Whisper + Claude)
3. Aria's response streams back and is spoken aloud
4. "Finish Interview" triggers final rubric evaluation

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | Backend server URL (default: http://localhost:3001) |

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Native Web APIs (MediaRecorder, Web Speech)

## Deployment (Vercel)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variable `VITE_BACKEND_URL` to your Render backend URL