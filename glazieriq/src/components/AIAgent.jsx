import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bot, X, Send, Mic, Paperclip, StickyNote, Volume2, RefreshCw,
  Sparkles, Languages, Check, FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { callClaude, fileContent } from '../lib/aiClient'
import { useVoiceInput } from './useVoiceInput'

// Where the user is → a hint the agent uses to give context-aware help
const ROUTE_CONTEXT = {
  '/':          'Dashboard',
  '/orders':    'Orders',
  '/queue':     'Machine Queue (Rhino 1/2/3)',
  '/qc':        'Panel Scan / QC',
  '/drawings':  'Drawing AI Assistant (blueprints)',
  '/safety':    'Safety & Certifications',
  '/crew':      'Crew Management',
  '/weather':   'Weather & Lift Planner',
  '/time':      'Time & Cost',
  '/gc':        'Project Comms',
  '/closeout':  'Project Close-Out',
  '/logistics': 'Logistics & Deliveries',
  '/estimating':'Estimating bid board',
  '/notes':     'Notes',
  '/admin':     'Admin Settings',
}

const SYSTEM_PROMPT = `You are the GlazierIQ Assistant — the live in-app guide for SPS Corporation, a commercial glass, glazing, and metal panel contractor (Apex & Charlotte NC, Fort Wayne IN).

You can help with anything that lives in GlazierIQ:
- Reading and explaining blueprints, shop drawings, elevations, and details
- Simplifying RFIs, change orders, request forms, JSAs, and Material Request Forms into plain language
- QC questions (glass defects, sealant/silicone, coatings, tolerances, the 10-point glazing checklist)
- Fabrication, install methods, and identifying anything glazing or metal-panel related
- Safety awareness, certifications, and OSHA basics
- Logistics, delivery windows, and material arrival timeframes
- Live weather, lift scheduling, and stop-work thresholds
- Project scope, sequencing, and how to use the GlazierIQ app itself (training new users)
- Translating between languages — primarily English <-> Spanish for field crews

Style: direct, practical, jobsite-ready. Use real construction terminology. Keep answers short and scannable. When a field crew member asks in Spanish, answer in Spanish. When asked to translate, give a clean translation with no commentary. If something is a safety risk, say so first. If you're unsure of a project-specific spec, say what you'd verify and where in GlazierIQ to find it.`

const QUICK_ACTIONS = [
  { label: 'Simplify a document', icon: FileText, prompt: 'I\'m attaching a document — simplify it into plain language and list any action items, dates, or quantities.' },
  { label: 'Translate to Spanish', icon: Languages, prompt: 'Translate the following to Spanish for the field crew: ' },
  { label: 'QC help', icon: Sparkles, prompt: 'I have a QC question: ' },
  { label: 'Material ETA', icon: RefreshCw, prompt: 'When should I expect material to arrive, and what affects the timeframe for ' },
]

export default function AIAgent() {
  const { user, userCan } = useAuth()
  const { addNote } = useData()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState('en') // en | es — controls dictation language
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${user?.name?.split(' ')[0] || 'there'} — I'm your GlazierIQ assistant. Ask me anything about glazing, metal panels, prints, QC, safety, logistics, or how to use the app. You can speak to me, attach a document to simplify, or have me take a note. ¿Hablas español? También te ayudo.` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)        // { base64, mediaType, name }
  const [savedIdx, setSavedIdx] = useState(null)
  const fileRef = useRef()
  const bottomRef = useRef()

  const { listening, supported, toggle, interim } = useVoiceInput(
    (finalText) => setInput(i => (i ? i + ' ' : '') + finalText),
    lang === 'es' ? 'es-ES' : 'en-US'
  )

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [messages, open])

  if (!userCan('use_ai_agent')) return null

  const attachFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setFile({ base64: ev.target.result.split(',')[1], mediaType: f.type || 'application/pdf', name: f.name })
    reader.readAsDataURL(f)
  }

  const speak = (text) => {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = /[áéíóúñ¿¡]/i.test(text) || lang === 'es' ? 'es-ES' : 'en-US'
      synth.speak(u)
    } catch { /* tts unavailable */ }
  }

  const send = async (preset) => {
    const text = (preset ?? input).trim()
    if ((!text && !file) || loading) return
    setInput('')
    const shownText = file ? `${text || 'Simplify this document.'}  📎 ${file.name}` : text
    const history = [...messages, { role: 'user', content: shownText }]
    setMessages(history)
    setLoading(true)

    try {
      // Build API messages — attach file content to the latest user turn only
      const apiMessages = history.slice(-8).map((m, i, arr) => {
        const isLast = i === arr.length - 1
        if (isLast && m.role === 'user' && file) {
          return { role: 'user', content: fileContent({ base64: file.base64, mediaType: file.mediaType, text: text || 'Simplify this document into plain language; list action items, dates, and quantities.' }) }
        }
        return { role: m.role, content: typeof m.content === 'string' ? m.content.replace(/ 📎 .*/, '') : m.content }
      })

      const reply = await callClaude({
        system: `${SYSTEM_PROMPT}\n\nThe user is ${user?.name} (${user?.role?.replace(/_/g, ' ')}), currently on the ${ROUTE_CONTEXT[location.pathname] || 'app'} screen.`,
        messages: apiMessages,
        max_tokens: 1200,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: reply || 'I couldn\'t get a response — check the connection and try again.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
      setFile(null)
    }
  }

  const saveAsNote = (content, idx) => {
    const title = content.split(/[.\n]/)[0].slice(0, 60)
    addNote({ authorId: user.id, authorName: user.name, title, body: content, source: 'agent' })
    setSavedIdx(idx)
    setTimeout(() => setSavedIdx(null), 2000)
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm shadow-2xl shadow-amber-400/20 transition group">
          <span className="relative flex items-center justify-center">
            <Bot size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 ring-2 ring-amber-400" />
          </span>
          <span className="hidden sm:inline">Ask GlazierIQ</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-5 sm:right-5 z-40 w-full sm:w-[26rem] h-[80vh] sm:h-[34rem] flex flex-col bg-slate-900 border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800 bg-slate-900">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
              <Bot size={17} className="text-slate-900" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold leading-tight">GlazierIQ Assistant</p>
              <p className="text-green-400 text-[11px] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Live</p>
            </div>
            {/* Language toggle */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden text-[11px]">
              {['en', 'es'].map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-1 transition ${lang === l ? 'bg-amber-400 text-slate-900 font-semibold' : 'text-slate-400 hover:text-white'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 text-slate-500 hover:text-white transition"><X size={17} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2.5 text-sm ${m.role === 'user' ? 'bg-amber-400/10 border border-amber-400/20 text-white' : 'bg-slate-800 text-slate-200'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.role === 'assistant' && i > 0 && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                      <button onClick={() => speak(m.content)} title="Read aloud"
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition">
                        <Volume2 size={12} /> Read
                      </button>
                      <button onClick={() => saveAsNote(m.content, i)} title="Save as note"
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition">
                        {savedIdx === i ? <><Check size={12} className="text-green-400" /> Saved</> : <><StickyNote size={12} /> Save note</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin text-amber-400" />
                  <span className="text-slate-400 text-sm">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick actions (only at start) */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map(qa => { const I = qa.icon; return (
                <button key={qa.label} onClick={() => qa.label === 'Simplify a document' ? fileRef.current?.click() : setInput(qa.prompt)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-amber-400/30 transition">
                  <I size={11} className="text-amber-400" /> {qa.label}
                </button>
              ) })}
            </div>
          )}

          {/* Attached file chip */}
          {file && (
            <div className="px-3 pb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-400/10 border border-amber-400/20 text-amber-300 px-2 py-1 rounded-full">
                <Paperclip size={11} /> {file.name}
                <button onClick={() => setFile(null)} className="hover:text-white"><X size={11} /></button>
              </span>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900">
            <div className="flex items-end gap-1.5">
              <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={attachFile} />
              <button onClick={() => fileRef.current?.click()} title="Attach RFI, drawing, change order…"
                className="p-2 text-slate-400 hover:text-amber-400 transition flex-shrink-0"><Paperclip size={16} /></button>
              {supported && (
                <button onClick={toggle} title="Voice note"
                  className={`p-2 transition flex-shrink-0 ${listening ? 'text-red-400 animate-pulse' : 'text-slate-400 hover:text-amber-400'}`}>
                  <Mic size={16} />
                </button>
              )}
              <input
                value={input + (interim ? ` ${interim}` : '')}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder={listening ? 'Listening…' : lang === 'es' ? 'Escribe o habla…' : 'Ask, speak, or attach…'}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 min-w-0" />
              <button onClick={() => send()} disabled={loading || (!input.trim() && !file)}
                className="p-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 rounded-lg transition flex-shrink-0">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
