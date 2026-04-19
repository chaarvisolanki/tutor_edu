import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize clients - API keys from environment variables ONLY
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load system prompt from file
const systemPrompt = readFileSync(join(__dirname, 'interviewer-system-prompt.md'), 'utf-8');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    groq: !!process.env.GROQ_API_KEY,
    whisper: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY
  });
});

// Main interview endpoint - receives audio, transcribes, and streams response
app.post('/api/chat', async (req, res) => {
  try {
    let audioBuffer = null;
    let transcription = req.body.transcription || null;

    console.log('Content-Type:', req.headers['content-type']);
    console.log('req.files:', req.files);
    console.log('req.body keys:', Object.keys(req.body || {}));
    console.log('transcription from body:', transcription);

    if (req.files?.audio) {
      audioBuffer = req.files.audio.data;
      console.log('Using req.files.audio, size:', audioBuffer.length);
    } else if (req.body.audioBase64) {
      const base64Data = req.body.audioBase64.replace(/^data:.*;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
      console.log('Using base64 audio, size:', audioBuffer.length);
    }

    // Step 1: Transcribe via Whisper (only if we have audio but no direct transcription)
    if (audioBuffer && !transcription) {
      console.log('Transcribing with Whisper...');
      transcription = await transcribeWithWhisper(audioBuffer);
      console.log('Whisper transcription:', transcription);
    }

    if (!transcription || transcription.trim().length === 0) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'text', content: "I didn't catch that. Could you please repeat?" })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // Step 2: Get interview response from Groq with streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const messageHistory = (() => {
      try {
        const hist = req.body.conversationHistory;
        if (!hist || hist === '' || hist === '[]') return [];
        const parsed = JSON.parse(hist);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    let fullResponse = '';

    console.log('Calling Groq API with model: llama-3.3-70b-versatile');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messageHistory.map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        })),
        { role: 'user', content: `Candidate said: "${transcription}"` }
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true
    });

    // Process streaming response
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in /api/chat:', error);
    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
    }
    res.write(`data: ${JSON.stringify({ type: 'text', content: "I'm having trouble processing that. Could you try again?" })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', error: error.message })}\n\n`);
    res.end();
  }
});

// Whisper transcription helper
async function transcribeWithWhisper(audioBuffer) {
  try {
    console.log('Creating audio file for Whisper...');
    console.log('Audio buffer type:', typeof audioBuffer, 'length:', audioBuffer?.length);

    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    console.log('File created, size:', file.size, 'type:', file.type);

    console.log('Calling Whisper API...');
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    });

    console.log('Whisper response:', transcription);
    return transcription.text;
  } catch (error) {
    console.error('Whisper transcription error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Evaluation endpoint - for final assessment after interview
app.post('/api/evaluate', async (req, res) => {
  try {
    const { conversationHistory } = req.body;

    console.log('Calling Groq for evaluation...');
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt + "\n\nBased on the conversation above, provide a structured evaluation of the candidate with specific quotes as evidence for each dimension. Format as JSON with: communicationClarity, patience, simplicity, warmth, englishFluency, overallRecommendation, strengths, areasForImprovement."
        },
        ...conversationHistory.map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        }))
      ],
      temperature: 0.3,
      max_tokens: 2048
    });

    res.json({ evaluation: response.choices[0]?.message?.content || 'No evaluation generated' });
  } catch (error) {
    console.error('Error in /api/evaluate:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment check:');
  console.log('  - GROQ_API_KEY:', !!process.env.GROQ_API_KEY);
  console.log('  - OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
  console.log('  - ANTHROPIC_API_KEY (optional):', !!process.env.ANTHROPIC_API_KEY);
});