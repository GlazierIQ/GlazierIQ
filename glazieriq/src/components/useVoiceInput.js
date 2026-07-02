import { useState, useRef, useCallback, useEffect } from 'react'

// Wraps the browser SpeechRecognition API so voice notes work anywhere.
// onFinal(text) fires with each finalized chunk. interim holds in-progress text.
export function useVoiceInput(onFinal, lang = 'en-US') {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recogRef = useRef(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => { onFinalRef.current = onFinal }, [onFinal])

  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const supported = !!SR

  const stop = useCallback(() => {
    try { recogRef.current?.stop() } catch { /* noop */ }
    setListening(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    if (!SR) return
    const recog = new SR()
    recog.lang = lang
    recog.continuous = true
    recog.interimResults = true
    recog.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) onFinalRef.current?.(r[0].transcript.trim())
        else live += r[0].transcript
      }
      setInterim(live)
    }
    recog.onerror = () => { setListening(false); setInterim('') }
    recog.onend = () => { setListening(false); setInterim('') }
    recogRef.current = recog
    try { recog.start(); setListening(true) } catch { /* already started */ }
  }, [SR, lang])

  const toggle = useCallback(() => { listening ? stop() : start() }, [listening, start, stop])

  useEffect(() => () => { try { recogRef.current?.stop() } catch { /* noop */ } }, [])

  return { listening, supported, interim, start, stop, toggle }
}
