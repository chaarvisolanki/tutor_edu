import { useState, useRef, useEffect, useCallback } from 'react'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const INTERVIEW_DURATION = 10 * 60 * 1000

function ConfirmationModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">End Interview Early?</h3>
        <p className="text-gray-600 text-center mb-6">
          Ending the interview will impact your overall score. Are you sure you want to end the interview now?
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            NO, Continue
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
          >
            YES, End Interview
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, score, maxScore = 10 }) {
  const percentage = (score / maxScore) * 100
  const getColorClass = (score) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-cuegreen-500'
    if (score >= 4) return 'bg-amber-500'
    return 'bg-red-500'
  }
  const getBgClass = (score) => {
    if (score >= 8) return 'bg-green-50 border-green-200'
    if (score >= 6) return 'bg-cuegreen-50 border-cuegreen-200'
    if (score >= 4) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className={`rounded-xl p-4 border ${getBgClass(score)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800">{label}</span>
        <span className="text-lg font-bold text-gray-900">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass(score)} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function RecommendationBadge({ recommendation }) {
  const rec = recommendation || ''
  if (rec.includes('Strong') || rec.includes('Hire')) {
    return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Recommended</span>
  }
  if (rec.includes('Reject')) {
    return <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Not Recommended</span>
  }
  return <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">Needs Improvement</span>
}

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
  const [interviewIncomplete, setInterviewIncomplete] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

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
          silenceTimerRef.current = setTimeout(() => recognition.stop(), 10000)
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
      if (text) sendForProcessing(text)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    silenceTimerRef.current = setTimeout(() => recognition.stop(), 30000)

  }, [isRecording, isProcessing])

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
    setInterviewIncomplete(false)
    introSpokenRef.current = false

    setTimeout(() => {
      const introMessage = {
        role: 'assistant',
        content: "Hi, I'm Aria from Cuemath HR. Thanks for joining this screening interview. We'll have a friendly 10-minute conversation about your teaching style — there's no right or wrong answer, just honest responses. Take 40 seconds to 1.5 minutes per answer. Ready?"
      }
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
    setShowEvaluation(true)
    setShowEndConfirm(false)
  }, [])

  const handleEndEarly = () => {
    setShowEndConfirm(true)
  }

  const handleEndEarlyConfirm = () => {
    setInterviewIncomplete(true)
    clearTimeout(silenceTimerRef.current)
    if (recognitionRef.current) recognitionRef.current.stop()
    window.speechSynthesis.cancel()
    setIsRecording(false)
    setIsSpeaking(false)
    setInterviewActive(false)
    setShowEvaluation(true)
    setShowEndConfirm(false)
  }

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

  function EvaluationPanel({ isIncomplete }) {
    const [evaluation, setEvaluation] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getEvaluation().then(result => {
        setEvaluation(result)
        setLoading(false)
      })
    }, [])

    let parsedEvaluation = null
    if (evaluation) {
      try {
        const jsonMatch = evaluation.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsedEvaluation = JSON.parse(jsonMatch[0])
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
          <p className="text-gray-500 mt-2">Your Assessment Report</p>
        </div>

        {isIncomplete && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-800 font-medium">You didn't complete the assessment to get evaluated.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cuegreen-200 border-t-cuegreen-600"></div>
            <span className="ml-4 text-gray-500">Generating evaluation...</span>
          </div>
        ) : parsedEvaluation ? (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-cuegreen-50 to-cuegreen-100 border border-cuegreen-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <RecommendationBadge recommendation={parsedEvaluation.overallRecommendation} />
              </div>
              <div className="text-center">
                <span className="text-5xl font-bold text-cuegreen-700">{parsedEvaluation.overallScore || '?'}/50</span>
              </div>
              {parsedEvaluation.overallRecommendation && (
                <p className="text-center font-semibold text-gray-800 mt-3">{parsedEvaluation.overallRecommendation}</p>
              )}
            </div>

            {/* Dimension Scores */}
            <div className="space-y-3">
              <p className="font-semibold text-gray-700">Dimension-wise Assessment</p>
              <ScoreBar label="Communication Clarity" score={parsedEvaluation.communicationClarity?.score || 0} />
              <ScoreBar label="Simplicity & Pedagogical Skill" score={parsedEvaluation.simplicity?.score || 0} />
              <ScoreBar label="Patience & Temperament" score={parsedEvaluation.patience?.score || 0} />
              <ScoreBar label="Warmth & Encouragement" score={parsedEvaluation.warmth?.score || 0} />
              <ScoreBar label="English Fluency & Demeanor" score={parsedEvaluation.englishFluency?.score || 0} />
            </div>

            {/* Evidence */}
            <div className="space-y-3">
              {parsedEvaluation.communicationClarity?.evidence && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Communication Quote:</p>
                  <p className="text-sm text-gray-700 italic">"{parsedEvaluation.communicationClarity.evidence}"</p>
                </div>
              )}
              {parsedEvaluation.simplicity?.evidence && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Simplicity Quote:</p>
                  <p className="text-sm text-gray-700 italic">"{parsedEvaluation.simplicity.evidence}"</p>
                </div>
              )}
            </div>

            {/* Strengths & Areas */}
            {parsedEvaluation.strengths?.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="font-semibold text-green-800 mb-2">Strengths</p>
                <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                  {parsedEvaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {parsedEvaluation.areasForImprovement?.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="font-semibold text-amber-800 mb-2">Areas for Improvement</p>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                  {parsedEvaluation.areasForImprovement.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {/* Honest Assessment */}
            {parsedEvaluation.honestAssessment && (
              <div className="bg-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-2">Overall Assessment</p>
                <p className="text-sm text-gray-700">{parsedEvaluation.honestAssessment}</p>
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

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-cuegreen-400 to-cuegreen-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-2M4 12H2m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">AI Tutor Screening</h2>
            <p className="text-gray-600 mb-8">A 10-minute interview assessing your teaching approach. Answer honestly and naturally.</p>

            <div className="bg-white rounded-2xl shadow-lg p-6 text-left mb-8">
              <p className="text-sm font-semibold text-gray-900 mb-4">What we assess (out of 10 each):</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Communication Clarity', icon: '💬' },
                  { label: 'Simplicity & Pedagogical Skill', icon: '🎯' },
                  { label: 'Patience & Temperament', icon: '🧘' },
                  { label: 'Warmth & Encouragement', icon: '☀️' },
                  { label: 'English Fluency & Demeanor', icon: '🗣️' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                    <span>{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cuegreen-50 rounded-2xl p-4 text-left mb-8">
              <p className="text-sm font-medium text-cuegreen-800 mb-2">How it works:</p>
              <ul className="text-sm text-cuegreen-700 space-y-1">
                <li>✓ 10-minute voice interview with Aria</li>
                <li>✓ Tap mic to speak, auto-sends after 5s silence</li>
                <li>✓ Answer in 40 sec to 1.5 min per question</li>
                <li>✓ 7-10 questions, honest assessment at end</li>
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

            <p className="text-xs text-gray-400 mt-4">Your responses are used only for evaluation purposes</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {showEndConfirm && (
        <ConfirmationModal
          onConfirm={handleEndEarlyConfirm}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

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
              <p className="text-sm text-gray-500">Aria - HR Interviewer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-lg font-mono font-bold ${timeRemaining < 60000 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeRemaining)}
            </div>
            {interviewActive && (
              <button
                onClick={handleEndEarly}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                End Early
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {showEvaluation || interviewEnded ? (
          <EvaluationPanel isIncomplete={interviewIncomplete} />
        ) : (
          <div className="w-full max-w-2xl">
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
                   'Ready to speak'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
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

              <div className="bg-gradient-to-r from-gray-50 to-white border-t p-6">
                <div className="flex justify-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
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

            {messages.length > 1 && (
              <div className="mt-6 p-4 bg-white/50 rounded-xl">
                <p className="text-xs text-gray-400 mb-2">{messages.length - 1} exchanges completed</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t py-3 px-6">
        <p className="text-center text-xs text-gray-400">Cuemath AI Tutor Screener • 10 Minute Interview</p>
      </footer>
    </div>
  )
}