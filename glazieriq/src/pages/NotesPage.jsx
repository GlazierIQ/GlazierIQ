import { useState } from 'react'
import { StickyNote, Mic, Bot, Pencil, Trash2, Plus, Tag, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { callClaude } from '../lib/aiClient'
import { useVoiceInput } from '../components/useVoiceInput'

const SOURCE_META = {
  dictation: { label: 'Dictated', icon: Mic, cls: 'text-sky-400' },
  agent:     { label: 'From AI agent', icon: Bot, cls: 'text-brand' },
  manual:    { label: 'Written', icon: Pencil, cls: 'text-slate-400' },
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotesPage() {
  const { user } = useAuth()
  const { notesFor, addNote, deleteNote } = useData()
  const [draft, setDraft] = useState('')
  const [title, setTitle] = useState('')
  const [tidy, setTidy] = useState(false)
  const [usedVoice, setUsedVoice] = useState(false)
  const { listening, supported, toggle, interim } = useVoiceInput(
    (finalText) => { setUsedVoice(true); setDraft(d => (d ? d + ' ' : '') + finalText) }
  )

  const myNotes = notesFor(user.id)

  const save = async () => {
    const body = draft.trim()
    if (!body) return
    let finalBody = body, finalTitle = title.trim()
    if (tidy) {
      try {
        const out = await callClaude({
          system: 'You clean up dictated jobsite notes for a commercial glazing company. Fix grammar/punctuation, keep all facts, keep it concise. Reply with the cleaned note only — no preamble.',
          messages: [{ role: 'user', content: body }], max_tokens: 600,
        })
        finalBody = out || body
      } catch { /* keep raw */ }
    }
    if (!finalTitle) finalTitle = finalBody.split(/[.\n]/)[0].slice(0, 60)
    addNote({ authorId: user.id, authorName: user.name, title: finalTitle, body: finalBody, source: usedVoice ? 'dictation' : 'manual' })
    setDraft(''); setTitle(''); setUsedVoice(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold flex items-center gap-2"><StickyNote size={18} className="text-brand" /> Notes</h1>
        <p className="text-slate-400 text-sm">Dictate or type — the AI agent saves notes here too</p>
      </div>

      {/* Composer */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand" />
        <textarea value={draft + (interim ? ` ${interim}` : '')} onChange={e => setDraft(e.target.value)} rows={4} placeholder="Type a note, or tap the mic and speak…"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand resize-none" />
        <div className="flex flex-wrap items-center gap-2">
          {supported && (
            <button onClick={toggle}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition ${listening ? 'bg-alert/15 border-alert/40 text-red-300 animate-pulse' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
              <Mic size={13} /> {listening ? 'Listening… tap to stop' : 'Dictate'}
            </button>
          )}
          <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer">
            <input type="checkbox" checked={tidy} onChange={e => setTidy(e.target.checked)} className="accent-brand" />
            <span className="flex items-center gap-1"><Sparkles size={11} className="text-brand" /> Clean up with AI</span>
          </label>
          <button onClick={save} disabled={!draft.trim()}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-yellow-300 disabled:opacity-40 text-slate-900 font-semibold text-xs rounded-lg transition">
            <Plus size={13} /> Save note
          </button>
        </div>
        {!supported && <p className="text-slate-600 text-[11px]">Voice dictation isn't supported in this browser — typing still works.</p>}
      </div>

      {/* List */}
      <div className="space-y-2">
        {myNotes.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No notes yet. Dictate one above, or ask the AI agent to take a note.</div>
        ) : myNotes.map(n => {
          const meta = SOURCE_META[n.source] || SOURCE_META.manual
          const I = meta.icon
          return (
            <div key={n.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 group">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-slate-300 text-sm mt-1 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] ${meta.cls}`}><I size={11} /> {meta.label}</span>
                    <span className="text-slate-600 text-[11px]">· {timeAgo(n.ts)}</span>
                    {n.tags?.map(t => <span key={t} className="inline-flex items-center gap-0.5 text-[11px] text-slate-500"><Tag size={9} />{t}</span>)}
                  </div>
                </div>
                <button onClick={() => deleteNote(n.id)} title="Delete note"
                  className="p-1.5 text-slate-500 hover:text-alert active:text-alert transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}