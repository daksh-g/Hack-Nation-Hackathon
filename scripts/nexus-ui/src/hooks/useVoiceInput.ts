import { useState, useCallback, useRef, useEffect } from 'react'

interface UseVoiceInputOptions {
  onResult?: (transcript: string) => void
  silenceTimeout?: number
}

interface UseVoiceInputReturn {
  isListening: boolean
  transcript: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  error: string | null
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export function useVoiceInput({ onResult, silenceTimeout = 1500 }: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSupported = !!SpeechRecognition

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Voice not available in this browser')
      return
    }

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(currentTranscript)

      // Reset silence timer on each result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (finalTranscript) {
        // Got a final result — submit after brief delay
        silenceTimerRef.current = setTimeout(() => {
          onResult?.(finalTranscript.trim())
          stopListening()
        }, 300)
      } else {
        // Still getting interim results — wait for silence
        silenceTimerRef.current = setTimeout(() => {
          if (currentTranscript.trim()) {
            onResult?.(currentTranscript.trim())
          }
          stopListening()
        }, silenceTimeout)
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.')
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied')
      } else {
        setError(`Voice error: ${event.error}`)
      }
      stopListening()
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [onResult, silenceTimeout, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  return { isListening, transcript, isSupported, startListening, stopListening, error }
}
