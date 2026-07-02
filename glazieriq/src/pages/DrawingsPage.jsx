import { useState, useRef } from 'react'
import { Upload, Send, RefreshCw, ChevronRight, BookOpen, Pin, AtSign, Check, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { callClaude, fileContent } from '../lib/aiClient'

const LOADED_DRAWINGS = [
  { id: 'SH-103', name: 'Sheet 103 — Level 33 Area A', project: 'The Creamery', type: 'Elevation', loaded: true },
  { id: 'SH-210', name: 'Sheet 210 — Level 37 North Coping', project: 'The Creamery', type: 'Detail', loaded: true },
]

const SUGGESTED = [
  'What glass types are specified on Sheet 103?',
  'What is the sill height at Level 33?',
  'List all panel dimensions on Sheet 210.',
  'Are there any special sealant requirements?',
  'What hardware is specified for the coping detail?',
]

export default function DrawingsPage() {
  const { user, users } = useAuth()
  const { addObservation, observationsFor, resolveObservation } = useData()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I have Sheet 103 (Level 33 Area A) and Sheet 210 (Level 37 North Coping) loaded for The Creamery · Job 25-0628. Ask me anything about the drawings — dimensions, glass specs, details, or field questions.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfBase64, setPdfBase64] = useState(null)
  // Blueprint observations
  const [obsDrawing, setObsDrawing] = useState(LOADED_DRAWINGS[0].id)
  const [obsNote, setObsNote] = useState('')
  const [obsLoc, setObsLoc] = useState('')
  const [obsTags, setObsTags] = useState([])
  const fileRef = useRef()
  const bottomRef = useRef()

  const submitObservation = () => {
    if (!obsNote.trim()) return
    const drawing = LOADED_DRAWINGS.find(d => d.id === obsDrawing)
    addObservation({
      drawingId: obsDrawing,
      drawingName: drawing ? `${drawing.id} — ${drawing.name.split('—')[1]?.trim() || drawing.name}` : obsDrawing,
      author: user, location: obsLoc.trim(), note: obsNote.trim(),
      taggedUserIds: obsTags, taggedNames: obsTags.map(id => users.find(u => u.id === id)?.name).filter(Boolean),
    })
    setObsNote(''); setObsLoc(''); setObsTags([])
  }
  const toggleTag = (id) => setObsTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id])
  const drawingObs = observationsFor(obsDrawing)

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setPdfFile(f)
    const reader = new FileReader()
    reader.onload = ev => {
      setPdfBase64(ev.target.result.split(',')[1])
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Drawing uploaded: **${f.name}**. I'll reference this document when you ask questions.`
      }])
    }
    reader.readAsDataURL(f)
  }

  const sendMessage = async (text) => {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')
    const updated = [...messages, { role: 'user', content: q }]
    setMessages(updated)
    setLoading(true)

    try {
      const apiMessages = updated.slice(-6).map((m, i, arr) => {
        const isLast = i === arr.length - 1
        if (isLast && m.role === 'user' && pdfBase64) {
          return { role: 'user', content: fileContent({ base64: pdfBase64, mediaType: 'application/pdf', text: q }) }
        }
        return { role: m.role, content: m.content }
      })

      const reply = await callClaude({
        system: `You are the GlazierIQ Drawing AI Assistant for SPS Corporation, a commercial glazing contractor.
You help field crews, superintendents, and PMs read and interpret construction drawings for commercial glass and panel installations.
Currently loaded drawings: Sheet 103 (Level 33 Area A) and Sheet 210 (Level 37 North Coping) for The Creamery · Job 25-0628, 410 Glenwood Ave, Raleigh NC.
If a PDF drawing is attached, read it carefully. If no drawing is attached, answer based on typical commercial glazing standards and the drawings listed above.
Be direct, use construction terminology, and flag any field safety or installation concerns.`,
        messages: apiMessages,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: reply || 'Unable to get a response. Check API connection.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-white text-xl font-semibold">Drawing AI Assistant</h1>
        <p className="text-slate-400 text-sm mt-0.5">Ask questions about blueprints, specs, and field details</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 h-[75vh]">
        {/* Left panel */}
        <div className="space-y-3">
          {/* Loaded drawings */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <h2 className="text-white font-medium text-xs mb-2 flex items-center gap-1.5"><BookOpen size={12}/> Loaded Drawings</h2>
            <div className="space-y-1.5">
              {LOADED_DRAWINGS.map(d => (
                <div key={d.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-white text-xs font-medium">{d.id}</p>
                    <p className="text-slate-500 text-xs">{d.name.split('—')[1]?.trim()}</p>
                    <p className="text-slate-600 text-xs">{d.type}</p>
                  </div>
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-600 hover:border-amber-400/50 text-slate-400 hover:text-amber-400 text-xs rounded-lg transition">
              <Upload size={11}/> Upload drawing PDF
            </button>
            {pdfFile && <p className="text-green-400 text-xs mt-1 text-center">{pdfFile.name}</p>}
          </div>

          {/* Suggested questions */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <h2 className="text-white font-medium text-xs mb-2">Suggested Questions</h2>
            <div className="space-y-1">
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="w-full text-left flex items-center gap-1.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs transition">
                  <ChevronRight size={10} className="flex-shrink-0 text-amber-400" />{q}
                </button>
              ))}
            </div>
          </div>

          {/* Blueprint observations */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <h2 className="text-white font-medium text-xs mb-2 flex items-center gap-1.5"><Pin size={12} className="text-amber-400" /> Observations</h2>
            <p className="text-slate-500 text-[11px] mb-2">Flag something on a drawing and tag who needs to look — they get notified right away.</p>
            <select value={obsDrawing} onChange={e => setObsDrawing(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs mb-2 focus:outline-none focus:border-amber-400">
              {LOADED_DRAWINGS.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
            </select>
            <input value={obsLoc} onChange={e => setObsLoc(e.target.value)} placeholder="Location (e.g. grid C-4, sill)"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs mb-2 placeholder-slate-500 focus:outline-none focus:border-amber-400" />
            <textarea value={obsNote} onChange={e => setObsNote(e.target.value)} rows={2} placeholder="What needs attention?"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs mb-2 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none" />
            <p className="text-slate-500 text-[11px] mb-1 flex items-center gap-1"><AtSign size={10} /> Tag people</p>
            <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto">
              {users.filter(u => u.id !== user.id).map(u => (
                <button key={u.id} onClick={() => toggleTag(u.id)}
                  className={`text-[11px] px-1.5 py-0.5 rounded-full border transition ${obsTags.includes(u.id) ? 'bg-amber-400/15 border-amber-400/30 text-amber-300' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}>
                  {u.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <button onClick={submitObservation} disabled={!obsNote.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 font-semibold text-xs rounded-lg transition">
              <Plus size={11} /> Add & notify
            </button>

            {drawingObs.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-slate-700/50 pt-2">
                {drawingObs.map(o => (
                  <div key={o.id} className={`p-2 rounded-lg text-[11px] ${o.resolved ? 'bg-slate-900/40 opacity-60' : 'bg-slate-900/60'}`}>
                    <p className="text-slate-200">{o.location && <span className="text-amber-400">@{o.location} · </span>}{o.note}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-500">{o.taggedNames?.length ? `→ ${o.taggedNames.join(', ')}` : 'no tags'}</span>
                      {!o.resolved && <button onClick={() => resolveObservation(o.id)} className="text-green-400 hover:text-green-300 flex items-center gap-0.5"><Check size={10} /> resolve</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 flex flex-col bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-amber-400/10 border border-amber-400/20 text-white'
                    : 'bg-slate-700/50 text-slate-200'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700/50 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin text-amber-400" />
                  <span className="text-slate-400 text-sm">Reading drawing…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700/50">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about the drawings…"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400" />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className="px-3 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 rounded-lg transition">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
