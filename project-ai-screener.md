# Project Brief: Cuemath AI Tutor Screener

## 1. Project Goal
[cite_start]Build an AI-driven voice interviewer to screen prospective math tutors[cite: 57, 61]. [cite_start]The goal is to replace manual 10-minute screening calls with an automated system that assesses soft skills like communication clarity, patience, and warmth[cite: 59, 61, 62].

## 2. Core Assessment Dimensions (The Rubric)
[cite_start]The AI must evaluate the candidate on a structured rubric, providing specific quotes as evidence for each[cite: 71]:
- [cite_start]**Communication Clarity:** Can they explain concepts without jargon? [cite: 62]
- [cite_start]**Patience:** How do they handle a student who "doesn't get it" after multiple tries? [cite: 65, 68]
- [cite_start]**Simplicity:** Can they explain a topic (e.g., fractions) to a 9-year-old? [cite: 62, 65]
- [cite_start]**Warmth & Encouragement:** Do they sound welcoming and professional? [cite: 62, 72]
- [cite_start]**English Fluency:** Assessment of spoken language proficiency[cite: 62].

## 3. Technical Requirements
- [cite_start]**Interaction Method:** Voice-based (Speech-to-Text and Text-to-Speech)[cite: 69].
- **Tech Stack:**
    - [cite_start]**Transcription:** OpenAI Whisper or Browser Speech APIs[cite: 69].
    - **Intelligence:** Claude 3.5 Sonnet (for reasoning and evaluation).
    - [cite_start]**Deployment:** Public URL (Vercel, Render, or Railway)[cite: 11, 91].
- [cite_start]**Safety:** All API keys must be kept on the server-side as environment variables; never expose them in the frontend[cite: 87, 100].

## 4. Key Conversation Logic
- [cite_start]**Natural Flow:** The AI must listen, respond, and adapt rather than just reading a list of questions[cite: 64].
- [cite_start]**Adaptive Probing:** If a candidate gives a vague answer, the AI should follow up to get more detail[cite: 64].
- [cite_start]**Handling Edge Cases:** The system must handle one-word answers, long tangents, or choppy audio gracefully[cite: 73].

## 5. Required Deliverables (Due April 21, 1 PM)
1. [cite_start]**Live URL:** A working link to the deployed application[cite: 103, 113].
2. [cite_start]**Video Walkthrough:** 2-5 minute demo of the product and key decisions[cite: 104, 105].
3. [cite_start]**Write-up:** Documentation on tech choices, trade-offs, and future improvements[cite: 106, 107, 110].
4. [cite_start]**Public GitHub Repo:** Source code for the entire project[cite: 112].