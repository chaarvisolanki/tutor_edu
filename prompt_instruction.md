#### **. Core Component: The Interview Room**

Ask Claude to build a `InterviewRoom.js` component that includes:

- **MediaRecorder Integration:** Use the **WebM/Opus** format to capture audio blobs and send them to your `/api/chat` endpoint as soon as the user stops speaking.
    
- **SSE Client:** A listener for the **Server-Sent Events (SSE)** streaming from your backend. This ensures the "Aria" persona's text appears word-by-word, making the AI feel more "natural, not robotic".
    
- **Visual States:** Clear UI indicators for:
    
    - **"Listening..."** (Visualizing the candidate's voice input).
        
    - **"Aria is thinking..."** (During Whisper transcription and initial Claude processing).
        
    - **"Aria speaking..."** (While the response is being read back).
        

#### **2. Voice Interaction (The "Magic" Step)**

The brief emphasizes that the candidate should be **speaking, not typing**.

- integrate the **Web Speech API (`window.speechSynthesis`)** to read Aria’s responses aloud. This fulfills the "Voice interaction" requirement without needing a complex server-side TTS for the MVP.
    

#### **3. Security Check**



- **Environment Variables:** Ensure the Vercel frontend URL is added to the backend's CORS whitelist.
    
- **Key Protection:** Reminder that the **API keys stay on the Render backend**; the frontend only communicates with your internal API.
  
 