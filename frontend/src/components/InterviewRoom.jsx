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
  const [interviewEnded, setInterviewEnded] = useState(false)

  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const ariaTextRef = useRef('')
  const introSpokenRef = useRef(false)

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
        setCurrentAriaText("I didn't catch that. Can you try again?")
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
    setInterviewEnded(false)
    introSpokenRef.current = false

    // Aria introduces herself after a brief pause
    setTimeout(() => {
      const introMessage = { role: 'assistant', content: "Hi! I'm Aria from Cuemath. Thanks for joining — this will be a short, friendly conversation about your teaching approach. I'll ask a few questions, and there's no right or wrong answer. Ready to begin?" }
      setCurrentAriaText(introMessage.content)
      setMessages([introMessage])
      setConversationHistory([introMessage])
      speakText(introMessage.content)
      introSpokenRef.current = true
    }, 1000)
  }

  const endInterview = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    if (recognitionRef.current) recognitionRef.current.stop()
    window.speechSynthesis.cancel()
    setIsRecording(false)
    setIsSpeaking(false)
    setInterviewActive(false)
    setInterviewEnded(true)
  }, [])

  useEffect(() => {
    if (!interviewActive || showEvaluation) return
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(timer)
          endInterview()
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [interviewActive, showEvaluation, endInterview])

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

    // Parse evaluation if it's JSON
    let parsedEvaluation = null
    if (evaluation) {
      try {
        const jsonMatch = evaluation.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedEvaluation = JSON.parse(jsonMatch[0])
        }
      } catch (e) {}
    }

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-cuegreen-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-cuegreen-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Interview Complete</h2>
          <p className="text-gray-500 mt-2">Here's your assessment</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cuegreen-200 border-t-cuegreen-600"></div>
            <span className="ml-4 text-gray-500">Generating evaluation...</span>
          </div>
        ) : parsedEvaluation ? (
          <div className="space-y-6">
            {/* Overall Recommendation */}
            <div className={`p-4 rounded-xl ${
              parsedEvaluation.overallRecommendation?.includes('Strong yes') || parsedEvaluation.overallRecommendation?.includes('Strong'))
                ? 'bg-green-50 border border-green-200'
                : parsedEvaluation.overallRecommendation?.includes('No') || parsedEvaluation.overallRecommendation?.includes('Strong no')
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-amber-50 border border-amber-200'
            }`}>
              <p className="text-sm font-medium text-gray-500 mb-1">Overall Recommendation</p>
              <p className="text-lg font-bold text-gray-900">{parsedEvaluation.overallRecommendation || 'N/A'}</p>
              {parsedEvaluation.summary && <p className="text-sm text-gray-600 mt-2">{parsedEvaluation.summary}</p>}
            </div>

            {/* Dimension Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'communicationClarity', label: 'Communication Clarity', icon: '💬' },
                { key: 'patience', label: 'Patience', icon: '🧘' },
                { key: 'simplicity', label: 'Simplicity', icon: '🎯' },
                { key: 'warmth', label: 'Warmth', icon: '☀️' },
                { key: 'englishFluency', label: 'English Fluency', icon: '🗣️' },
              ].map(dim => {
                const data = parsedEvaluation[dim.key]
                if (!data) return null
                const ratingColors = {
                  'Strong': 'bg-green-100 text-green-700',
                  'Adequate': 'bg-amber-100 text-amber-700',
                  'Needs Improvement': 'bg-red-100 text-red-700'
                }
                const ratingColor = data.rating ? ratingColors[data.rating] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
                return (
                  <div key={dim.key} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{dim.icon}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ratingColor}`}>
                        {data.rating || 'N/A'}
                      </span>
                    </div>
                    <p className="font-medium text-gray-700 text-sm mb-1">{dim.label}</p>
                    {data.evidence && (
                      <p className="text-xs text-gray-500 italic">"{data.evidence.slice(0, 100)}..."</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Strengths & Areas */}
            {parsedEvaluation.strengths?.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-2">Strengths</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {parsedEvaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {parsedEvaluation.areasForImprovement?.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-2">Areas for Improvement</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {parsedEvaluation.areasForImprovement.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {evaluation}
          </pre>
        )}

        <button
          onClick={() => window.location.reload()}
          className="mt-8 w-full px-6 py-3 bg-cuegreen-600 text-white font-semibold rounded-xl hover:bg-cuegreen-700 transition-colors"
        >
          Start New Interview
        </button>
      </div>
    )
  }

  if (!interviewStarted) {
    const browserSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-cuegreen-50 via-white to-cuegreen-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm py-4 px-6 border-b border-gray-100">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 bg-cuegreen-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cuemath</h1>
              <p className="text-sm text-gray-500">Tutor Screening Interview</p>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-cuegreen-400 to-cuegreen-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">AI Tutor Screening</h2>
            <p className="text-gray-600 mb-8">
              A quick 5-7 minute conversation to learn about your teaching approach. No preparation needed!
            </p>

            {/* What's assessed */}
            <div className="bg-white rounded-2xl shadow-lg p-6 text-left mb-8">
              <p className="text-sm font-semibold text-gray-900 mb-4">What we're looking for:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Communication', icon: '💬' },
                  { label: 'Patience', icon: '🧘' },
                  { label: 'Simplicity', icon: '🎯' },
                  { label: 'Warmth', icon: '☀️' },
                  { label: 'English', icon: '🗣️' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                    <span>{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-cuegreen-50 rounded-2xl p-4 text-left mb-8">
              <p className="text-sm font-medium text-cuegreen-800 mb-2">How it works:</p>
              <ul className="text-sm text-cuegreen-700 space-y-1">
                <li>✓ Tap the microphone and speak</li>
                <li>✓ Wait 5 seconds of silence to auto-send</li>
                <li>✓ Aria will respond and ask follow-up questions</li>
                <li>✓ Interview lasts up to 10 minutes</li>
              </ul>
            </div>

            {!browserSupported && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl mb-6 text-sm">
                <strong>Note:</strong> Browser speech not supported. Please use Chrome or Edge.
              </div>
            )}

            <button
              onClick={startInterview}
              disabled={!browserSupported}
              className="w-full px-8 py-4 bg-gradient-to-r from-cuegreen-500 to-cuegreen-600 text-white text-lg font-semibold rounded-xl hover:from-cuegreen-600 hover:to-cuegreen-700 transition-all shadow-lg shadow-cuegreen-500/30 disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none"
            >
              Start Interview
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Your responses are used only for evaluation purposes
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
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
          <div className="flex items-center gap-4">
            <div className={`text-lg font-mono font-bold ${timeRemaining < 60000 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeRemaining)}
            </div>
            {interviewActive && (
              <button
                onClick={endInterview}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                End Early
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {showEvaluation || interviewEnded ? (
          <EvaluationPanel />
        ) : (
          <div className="w-full max-w-2xl">
            {/* Status */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                isRecording ? 'bg-red-100 text-red-700' :
                isProcessing ? 'bg-amber-100 text-amber-700' :
                isSpeaking ? 'bg-blue-100 text-blue-700' :
                'bg-cuegreen-100 text-cuegreen-700'
              }`}>
                {isRecording && (
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 h-4 bg-red-500 rounded animate-wave" />
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
                  <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
                <span className="font-medium">
                  {isRecording ? 'Listening...' :
                   isProcessing ? 'Aria is thinking...' :
                   isSpeaking ? 'Aria speaking...' :
                   'Tap to speak'}
                </span>
              </div>
            </div>

            {/* Conversation Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Aria's response area */}
              <div className="p-6 min-h-[200px]">
                <div className="flex gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    isRecording ? 'bg-red-500' : isProcessing ? 'bg-amber-500' : 'bg-cuegreen-500'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg text-gray-900 leading-relaxed">
                      {currentAriaText || "Tap the microphone to begin speaking with Aria."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mic Button */}
              <div className="bg-gradient-to-r from-gray-50 to-white border-t p-6">
                <div className="flex justify-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || (interviewActive && messages.length === 0 && !introSpokenRef.current)}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      isProcessing ? 'bg-gray-400 cursor-not-allowed' :
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                        : 'bg-gradient-to-br from-cuegreen-500 to-cuegreen-600 hover:from-cuegreen-600 hover:to-cuegreen-700 shadow-cuegreen-500/30'
                    }`}
                  >
                    {isRecording ? (
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-center text-gray-500 mt-4 text-sm">
                  {isRecording ? 'Tap to stop recording' : 'Tap to speak with Aria'}
                </p>
              </div>
            </div>

            {/* Conversation History */}
            {messages.length > 1 && (
              <div className="mt-6 p-4 bg-white/50 rounded-xl">
                <p className="text-xs text-gray-400 mb-2">{messages.length - 1} exchanges completed</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-3 px-6">
        <p className="text-center text-xs text-gray-400">
          Cuemath AI Tutor Screener • Voice Interview
        </p>
      </footer>
    </div>
  )
}