# Cuemath AI Tutor Screener — Project Write-up

**Date:** April 21, 2026
**Live URLs:**
- Frontend: https://tutor-edu.vercel.app
- Backend: https://cuemath-backend-5ngt.onrender.com
- GitHub: https://github.com/chaarvisolanki/tutor_edu

---

## 1. Project Overview

**Cuemath AI Tutor Screener** is an automated voice-based interview system designed to screen prospective math tutors through natural, conversational dialogue. Rather than relying on written assessments or manual HR screening, the system uses an AI interviewer named **Aria** — a professional, warm, and honest HR persona — to evaluate candidates in real time. The entire screening process runs for 10 minutes, after which HR receives a structured evaluation report with scores, evidence, and a hiring recommendation.

The project was built to solve a key hiring challenge: evaluating soft skills like communication clarity, patience, and warmth in tutoring candidates at scale, consistently, and without human bias. Traditional interviews are time-intensive and vary wildly between interviewers. The AI screener ensures every candidate gets the same questions, the same timing, and the same evaluation criteria — producing reliable, comparable data for HR decisions.

---

## 2. Problem It Solves

Hiring tutors for young children (Cuemath's core age group is 9-year-olds) requires more than just math proficiency. The tutors need to:

- Communicate mathematical concepts without jargon or complexity
- Simplify ideas using analogies, real-world examples, and visual reasoning
- Remain patient and encouraging when a child is stuck or frustrated
- Build warmth and trust so children feel safe making mistakes
- Speak fluent, clear English in a way a child can understand

These soft skills are notoriously hard to assess consistently in a short HR interview. Manual screening often results in subjective decisions, different standards across interviewers, and candidates who are great at math but terrible at teaching it to kids.

The AI Tutor Screener addresses all of this by creating a standardized, 10-minute voice interview that evaluates 5 clearly defined dimensions, generates specific evidence quotes from the actual conversation, and produces an honest recommendation — in seconds.

---

## 3. How It Works

### 3.1 Candidate Experience

The candidate visits the live frontend URL, enters their name, and clicks **Start Interview**. They are immediately shown:

- A **10-minute countdown timer** — visible at all times so candidates manage their pace
- A **tap-to-speak microphone button** — large, central, and easy to use

When the interview begins, **Aria** (the AI interviewer) introduces herself and asks the first question. The candidate taps the microphone, speaks their answer, and after **10 seconds of silence**, the response is automatically sent for processing — no manual "send" button needed. This tap-to-speak pattern mimics natural conversation and is far more intuitive than holding a button.

Aria's response is then:
1. **Generated** by Groq LLM as a text stream
2. **Displayed** on screen in real time (word-by-word streaming)
3. **Spoken aloud** via Web Speech API text-to-speech so the candidate hears Aria's voice, not just sees text

The candidate answers 7-10 questions over 10 minutes, with Aria asking natural follow-ups, rephrasing when needed, and moving through the interview flow like a real HR conversation.

### 3.2 Interview Flow

**Opening (30 seconds)**
Aria introduces herself, explains the format, sets timing expectations (40 seconds to 1.5 minutes per answer), and assures the candidate there's no right or wrong answer.

**Question 1: Background & Motivation (1 minute)**
Aria asks about the candidate's teaching background and what draws them to tutoring young children. This establishes baseline communication and motivation.

**Question 2: Communication Clarity Check (1.5 minutes)**
Aria asks the candidate to explain the concept of "half" to a 9-year-old — probing whether they use simple language or fall back on technical/adult terminology.

**Question 3: Patience Scenario (1.5 minutes)**
Aria presents a scenario: a student has been staring at a fractions problem for 5 minutes and says "I just don't get it." She asks what the candidate would do and say. This probes emotional response, not just stated philosophy.

**Question 4: Simplification Deep Dive (1.5 minutes)**
Aria asks the candidate to explain "three-quarters" to a 9-year-old, step by step. This tests pedagogical imagination — whether they use pizza slices, sharing toys, visual analogies, or stay abstract.

**Question 5: Handling Repetition (1 minute)**
Aria asks how the candidate would handle a situation where they've explained something three different ways and the student is still confused. This reveals adaptability and humility.

**Question 6: Warmth Check (1 minute)**
Aria asks how the candidate would encourage a student who is about to give up because they feel stupid. This tests the candidate's use of positive reinforcement and emotional intelligence.

**Question 7: Real-World Challenge (1 minute)**
Aria asks how the candidate would communicate to a parent that their child struggles with place value. This probes delicate communication skills and professional boundary awareness.

**Question 8: Motivation & Fit (45 seconds)**
Aria asks why the candidate wants to tutor for Cuemath specifically and what they find most rewarding about teaching young children.

**Question 9: Self-Awareness (45 seconds)**
Aria asks about the most challenging part of tutoring a math-anxious child. This reveals honest self-awareness rather than rehearsed positivity.

**Closing (30 seconds)**
Aria thanks the candidate and asks if they have any questions about the role or Cuemath.

### 3.3 Silence Auto-Send

A critical UX decision was the **10-second silence auto-send**. When the candidate stops speaking, a timer starts. If they don't speak again within 10 seconds, their full response is sent for processing automatically. This eliminates the need for a manual send button and keeps the conversation flowing naturally, mimicking how a real interviewer would interpret silence as the end of a thought.

### 3.4 End Early Option

If a candidate ends the interview before the 10 minutes are up, a **confirmation modal** warns them that cutting the interview early will impact the evaluation score. This encourages candidates to complete the full screening and reduces incomplete evaluations that are hard to score fairly.

---

## 4. Evaluation System

### 4.1 Five Assessment Dimensions

Each candidate is evaluated across 5 dimensions, each scored out of 10:

**Communication Clarity (/10)**
Definition: The ability to explain concepts simply without using complex jargon or "adult" terminology that would confuse a child.
Metric: Does the candidate avoid technical terms and use clear, direct English?

**Simplicity & Pedagogical Skill (/10)**
Definition: The ability to simplify a mathematical concept (like fractions or division) for a young audience, specifically 9-year-olds.
Metric: Look for the use of analogies, real-world examples (like pizza slices or sharing toys), and step-by-step breakdowns.

**Patience & Temperament (/10)**
Definition: How the candidate reacts when a student is frustrated, stuck, or repeatedly says they don't understand.
Metric: Does the candidate remain calm and encouraging, or do they become robotic and repetitive?

**Warmth & Encouragement (/10)**
Definition: The "human" element of tutoring — making the student feel safe, confident, and supported in their learning journey.
Metric: The use of positive reinforcement, a welcoming tone of voice, and professional yet friendly language.

**English Fluency & Demeanor (/10)**
Definition: General proficiency in spoken English and the ability to maintain a professional yet approachable presence.
Metric: Fluency, vocabulary appropriate for kids, and the ability to handle tangents or "messy" conversational reality.

### 4.2 Evaluation Report

After the interview ends, the system generates a structured report containing:

- **Dimension-wise scores** (out of 10) for all 5 parameters
- **Specific quotes as evidence** — actual excerpts from the conversation that justify each score
- **Overall score** (out of 50)
- **Overall recommendation**: Strong Hire / Hire / Needs Improvement / Reject
- **Strengths**: 2-3 specific strengths demonstrated
- **Areas for Improvement**: 2-3 specific areas needing work
- **Honest Assessment**: A 2-3 sentence brutally honest but polite summary
- **Suggestion**: 2-3 sentences of guidance for the HR team on what the candidate should focus on for development

The evidence-based structure is critical — every score is backed by a real quote from the conversation, making the evaluation transparent and reviewable, not a black box.

### 4.3 Scoring Criteria

Scores below **4/10** in any dimension indicate a significant weakness. Scores of **7-8/10** indicate solid competence. Scores of **9-10/10** indicate exceptional, standout performance.

The overall recommendation follows this logic:
- **Strong Hire (40-50/50):** Exceptional across most dimensions, strong hire recommendation
- **Hire (30-39/50):** Competent, suitable for the role
- **Needs Improvement (20-29/50):** Some strengths but notable gaps
- **Reject (below 20/50):** Significant weaknesses across multiple dimensions

---

## 5. Tech Stack

### 5.1 Frontend — React + Vite + Tailwind CSS (Vercel)

The frontend is a React single-page application built with Vite for fast builds and HMR. Tailwind CSS provides the styling with a custom `cuegreen` color palette that reflects Cuemath's brand.

Key frontend features:
- **Browser Web Speech API** — handles speech-to-text transcription entirely client-side, with no network call and no API key required
- **Real-time text streaming** — LLM responses stream word-by-word on screen using Server-Sent Events (SSE)
- **Text-to-speech** — Aria's responses are spoken aloud using `window.speechSynthesis`, making the interview feel like a real voice conversation
- **State management** — React hooks (`useState`, `useRef`, `useCallback`, `useEffect`) manage recording state, processing state, speaking state, timer, messages, and conversation history
- **Confirmation modal** — warns candidates before ending early
- **Evaluation display** — after interview ends, shows structured score bars and recommendation badge

**Live URL:** https://tutor-edu.vercel.app

### 5.2 Backend — Express.js + Groq SDK (Render)

The backend is a Node.js Express server that:

- Receives candidate responses via a `POST /api/chat` SSE endpoint
- Builds a conversation history and sends it to Groq LLM for response generation
- Streams LLM responses back to the frontend word-by-word using SSE
- Serves a `POST /api/evaluate` endpoint that generates the final structured evaluation report

The server reads the **system prompt** (the interviewer-system-prompt.md file) at startup, which contains Aria's full persona, the interview flow, all questions with timing guidance, edge case handling, and the evaluation format specification.

**Live URL:** https://cuemath-backend-5ngt.onrender.com

### 5.3 LLM — Groq (llama-3.3-70b-versatile)

Groq was chosen because it offers a free tier sufficient for MVP volume and its streaming is fast enough for real-time conversation. The model `llama-3.3-70b-versatile` is used with a temperature of 0.7 for natural, conversational responses, and max_tokens of 1024 to keep responses appropriately short.

### 5.4 Speech Recognition — Browser Web Speech API

Rather than sending audio to a server-side transcription API (which caused reliability issues with OpenAI Whisper), the system uses the browser's built-in `SpeechRecognition` API (`webkitSpeechRecognition` for Chrome/Safari). This:

- Works entirely client-side — no API call, no latency, no cost
- Handles real-time transcription with `continuous: true` mode
- Detects final transcripts when `isFinal: true` is set
- Automatically stops after 10 seconds of silence

Requires a modern browser (Chrome, Edge, Safari). Does not work in Firefox.

---

## 6. Aria — The AI Interviewer Persona

Aria is not just a system prompt — she is a carefully designed HR persona with a specific communication style:

- **Professional and warm** — like a seasoned HR head, not a chatbot
- **Honest but polite** — gives honest assessments but never embarrasses a candidate
- **Natural questioner** — moves between questions conversationally, not like a checklist
- **Evaluative, not instructive** — never coaches or suggests improvements mid-interview
- **Short responses** — keeps her own talking to 30% of the conversation, candidates speak 70%
- **Strict confidentiality** — never reveals what dimensions she is assessing; the candidate should feel like they are in a normal HR interview, not an examination

**Critical design rule:** Aria must NEVER say things like "I'm evaluating your communication clarity" or "Remember, I'm assessing your patience" during the interview. The evaluation dimensions are private to HR — visible only in the final report.

### Edge Case Handling

- **One-word answers:** "That's interesting, but I'd love to hear more. Can you elaborate on that?"
- **Long tangents:** "I appreciate that perspective. Let me bring us back — what would you do in that situation specifically?"
- **Going silent:** "Take your time — there's no rush. What comes to mind?"
- **Confusion/rephrasing:** "Let me ask this a different way..."
- **Choppy audio:** "Sorry, I didn't quite catch that. Could you repeat what you just said?"

---

## 7. Architecture

```
Candidate (Vercel Frontend)               HR Team (Vercel Frontend)
• Tap-to-speak mic                          • Evaluation report
• 10-min countdown                          • Score bars
• Aria's voice (TTS)                       • Recommendation
• Real-time streaming

        │ SSE / HTTPS                               │
        │                                           │
        ▼                                           │
Render Backend (Express + Groq SDK)                │
• /api/chat (SSE) ◄────────────────────────────────┘
• /api/evaluate    (evaluation report)
• System prompt loaded
• Groq LLM streaming

        │ (No STT API call needed)
        ▼
Browser Web Speech API (Client-side STT)
• continuous: true
• 10-sec silence timer
• Real-time transcript
```

---

## 8. Key Design Decisions

**Browser STT vs. Whisper API**
Initial versions used OpenAI Whisper for transcription. This consistently failed due to `ECONNRESET` errors from network issues. Switching to the browser's native Web Speech API eliminated the problem entirely — transcription now happens locally, for free, with no network dependency.

**Groq vs. Claude/Anthropic**
Anthropic Claude was the original LLM choice but account credits were exhausted. Groq's free tier with `llama-3.3-70b-versatile` proved fast enough for real-time streaming and capable enough for natural interview responses.

**Tap-to-speak vs. Hold-to-speak**
The tap-to-speak + 10-second silence auto-send pattern is far more natural for conversation and reduces candidate fatigue over a 10-minute interview compared to holding a button throughout.

**SSE vs. WebSockets**
Server-Sent Events were chosen for streaming because they are simpler to implement server-side and work well with Express.js for a one-directional streaming use case.

**Separate System Prompt File**
The full interview prompt is stored in `interviewer-system-prompt.md` and read at startup, keeping it maintainable and versionable separate from application code.

---

## 9. Repository Structure

```
tutor_edu/
├── backend/
│   ├── server.js                   # Express server, Groq integration, SSE endpoints
│   ├── interviewer-system-prompt.md # Aria's full persona and interview script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── InterviewRoom.jsx    # Main interview UI component
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                # Custom animations, Tailwind imports
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js           # Custom cuegreen color palette
├── interviewer-system-prompt.md     # Root-level copy for reference
└── package.json
```

---

## 10. Future Enhancements

- **Multi-language support** — extend beyond English for regional hiring
- **Video input** — capture non-verbal cues (hesitation, confidence) via camera
- **Whiteboard integration** — allow candidates to draw/explain concepts visually
- **Analytics dashboard** — aggregate scores, pass rates, and trends over time for HR
- **Calibration mode** — validate scoring accuracy with mock interviews
- **Partial interview handling** — adjusted scoring for candidates who drop before 5 minutes

---

## 11. Deployment URLs

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://tutor-edu.vercel.app |
| Backend | Render | https://cuemath-backend-5ngt.onrender.com |
| Repository | GitHub | https://github.com/chaarvisolanki/tutor_edu |
