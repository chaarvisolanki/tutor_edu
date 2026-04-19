import { useState, useRef, useEffect, useCallback } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const INTERVIEW_DURATION = 10 * 60 * 1000

export default function InterviewRoom() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [interviewActive, setInterviewActive] = useState(false)
  const [showEvaluation, setShowEvaluation] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(INTERVIEW_DURATION)
  const [messages, setMessages] = useState([])
  const [currentAriaText, setCurrentAriaText] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [interviewStarted, setInterviewStarted] = useState(false)

  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const ariaTextRef = useRef('')

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
  }

  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const sendForProcessing = async (transcription) => {
    if (!transcription.trim()) return

    setIsProcessing(true)
    setCurrentAriaText('')
    ariaTextRef.current = ''

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription, conversationHistory }),
      })

      if (!response.ok) throw new Error('Failed to process')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                ariaTextRef.current += data.content
                setCurrentAriaText(prev => prev + data.content)
              }
            } catch (e) {}
          }
        }
      }

      const finalText = ariaTextRef.current
      if (finalText) {
        const ariaMessage = { role: 'assistant', content: finalText }
        setConversationHistory(prev => [...prev, ariaMessage])
        setMessages(prev => [...prev, ariaMessage])
        setIsProcessing(false)
        speakText(finalText)
      } else {
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Error:', error)
      setCurrentAriaText("I'm having trouble processing. Please try again.")
      setIsProcessing(false)
    }
  }

  const startRecording = useCallback(() => {
    if (isRecording || isProcessing) return

    clearTimeout(silenceTimerRef.current)
    finalTranscriptRef.current = ''

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Browser speech recognition not supported. Use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + ' '
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => {
            recognition.stop()
          }, 5000)
        }
      }
    }

    recognition.onerror = (event) => {
      console.error('STT error:', event.error)
      if (event.error !== 'no-speech') {
        setCurrentAriaText("I didn't catch that. Please try again.")
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      clearTimeout(silenceTimerRef.current)
      setIsRecording(false)
      const text = finalTranscriptRef.current.trim()
      if (text) {
        sendForProcessing(text)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)

    silenceTimerRef.current = setTimeout(() => {
      recognition.stop()
    }, 30000)

  }, [isRecording, isProcessing, sendForProcessing])

  const stopRecording = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const startInterview = () => {
    setInterviewActive(true)
    setInterviewStarted(true)
    setTimeRemaining(INTERVIEW_DURATION)
    setMessages([])
    setConversationHistory([])
    setCurrentAriaText('')
    ariaTextRef.current = ''
    setShowEvaluation(false)
  }

  useEffect(() => {
    if (!interviewActive || showEvaluation) return
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(timer)
          clearTimeout(silenceTimerRef.current)
          if (recognitionRef.current) recognitionRef.current.stop()
          window.speechSynthesis.cancel()
          setIsRecording(false)
          setIsSpeaking(false)
          setInterviewActive(false)
          setShowEvaluation(true)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [interviewActive, showEvaluation])

  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current)
      window.speechSynthesis.cancel()
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  const getEvaluation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationHistory })
      })
      if (!response.ok) throw new Error('Failed to get evaluation')
      return (await response.json()).evaluation
    } catch (error) {
      console.error('Error getting evaluation:', error)
      return 'Unable to generate evaluation at this time.'
    }
  }

  const EvaluationPanel = () => {
    const [evaluation, setEvaluation] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getEvaluation().then(result => {
        setEvaluation(result)
        setLoading(false)
      })
    }, [])

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-cuegreen-700 mb-6">Interview Complete</h2>
        <p className="text-gray-600 mb-4">Assessment based on your responses:</p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cuegreen-200 border-t-cuegreen-600"></div>
            <span className="ml-4 text-gray-500">Generating evaluation...</span>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {evaluation}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-cuegreen-600 text-white rounded-lg hover:bg-cuegreen-700"
        >
          Start New Interview
        </button>
      </div>
    )
  }

  if (!interviewStarted) {
    const browserSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 bg-cuegreen-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cuemath AI Screener</h1>
              <p className="text-sm text-gray-500">AI-Powered Tutor Interview</p>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Tutor Screening Interview</h2>
            <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 space-y-2">
              <p><strong>Duration:</strong> 10 minutes</p>
              <p><strong>Format:</strong> Voice conversation with Aria</p>
              <p><strong>Evaluated on:</strong> Communication, patience, simplicity, warmth, English fluency</p>
              <p><strong>How it works:</strong> Tap the mic to speak. After 5 seconds of silence, Aria will respond.</p>
            </div>
            {!browserSupported && (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-lg mb-4 text-sm">
                Browser speech not supported. Please use Chrome or Edge.
              </div>
            )}
            <button
              onClick={startInterview}
              disabled={!browserSupported}
              className="px-8 py-3 bg-cuegreen-600 text-white text-lg font-semibold rounded-xl hover:bg-cuegreen-700 transition-colors disabled:bg-gray-400"
            >
              Start Interview
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cuegreen-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Interview Room</h1>
              <p className="text-sm text-gray-500">Aria - AI Interviewer</p>
            </div>
          </div>
          <div className={`text-2xl font-mono font-bold ${timeRemaining < 60000 ? 'text-red-600' : 'text-gray-700'}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {showEvaluation ? (
          <EvaluationPanel />
        ) : (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-6">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                isRecording ? 'bg-cuegreen-100 text-cuegreen-700' :
                isProcessing ? 'bg-amber-100 text-amber-700' :
                isSpeaking ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {isRecording && (
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 h-4 bg-cuegreen-600 rounded animate-wave" />
                    ))}
                  </div>
                )}
                {isProcessing && (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSpeaking && (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
                <span className="font-medium">
                  {isRecording ? 'Listening...' :
                   isProcessing ? 'Aria is thinking...' :
                   isSpeaking ? 'Aria speaking...' :
                   'Ready to speak'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex gap-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                  isRecording ? 'bg-red-500' : isProcessing ? 'bg-amber-500' : 'bg-cuegreen-500'
                }`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Aria</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    {currentAriaText || messages[messages.length - 1]?.content || "Tap the microphone when you're ready to begin."}
                  </p>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all relative ${
                    isProcessing ? 'bg-gray-400 cursor-not-allowed' :
                    isRecording ? 'bg-red-500 shadow-lg shadow-red-500/50' :
                    'bg-cuegreen-600 hover:bg-cuegreen-700 shadow-lg shadow-cuegreen-500/50'
                  }`}
                >
                  {isRecording ? (
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                  {isRecording && <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />}
                </button>
              </div>
              <p className="text-center text-gray-500 mt-4">
                {isRecording ? 'Tap to stop • auto-sends in 5s silence' : 'Tap to speak'}
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t py-3 px-6">
        <p className="text-center text-sm text-gray-400">Interview auto-ends after 10 minutes</p>
      </footer>
    </div>
  )
}