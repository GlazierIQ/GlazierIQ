import { useState, useRef, useEffect } from 'react'
import { MessageSquare, FileText, Send, RefreshCw } from 'lucide-react'
import { useAuth, ROLE_LABELS } from '../contexts/AuthContext'
import { useData, PROJECTS } from '../contexts/DataContext'
import { callClaude } from '../lib/aiClient'

const TABS = ['Messages', 'Daily Report', 'RFI', 'Submittal', 'Email Draft']

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ---------- Per-project internal messaging ----------
function MessagesTab() {
  const { user } = useAuth()
  const { sendMessage, messagesFor, addNotification } = useData()
  const [projectId, setProjectId] = useState(PROJECTS[0].id)
  const [text, setText] = useState('')
  const endRef = useRef()

  const thread = messagesFor(projectId)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread.length, projectId])

  const send = () => {
    if (!text.trim()) return
    sendMessage({ projectId, user, text })
    const proj = PROJECTS.find(p => p.id === projectId)
    // ping the project leads so a new message surfaces in their bell
    addNotification({
      title: `New message — ${proj?.name}`,
      body: `${user.name}: ${text.trim().slice(0, 80)}${text.trim().length > 80 ? '…' : ''}`,
      projectId, toRoles: ['project_manager', 'general_super', 'superintendent', 'asst_super'], level: 'info',
    })
    setText('')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {PROJECTS.map(p => (
          <button key={p.id} onClick={() => setProjectId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition border ${projectId === p.id ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'text-slate-400 bg-slate-800 border-slate-700 hover:text-white'}`}>
            {p.name} · {p.job}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl flex flex-col h-[28rem]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {thread.length === 0 && <p className="text-slate-500 text-sm text-center mt-8">No messages on this project yet. Start the thread below.</p>}
          {thread.map(m => {
            const mine = m.userId === user.id
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-amber-400/15 border border-amber-400/20' : 'bg-slate-900/70 border border-slate-700/50'}`}>
                  {!mine && <p className="text-amber-300 text-xs font-medium mb-0.5">{m.userName} <span className="text-slate-500 font-normal">· {ROLE_LABELS[m.role] || m.role}</span></p>}
                  <p className="text-slate-200 text-sm whitespace-pre-wrap">{m.text}</p>
                  <p className="text-slate-500 text-[11px] mt-1 text-right">{timeAgo(m.ts)}</p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <div className="border-t border-slate-700/50 p-3 flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Message the project team…"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400" />
          <button onClick={send} disabled={!text.trim()}
            className="flex items-center gap-2 px-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 font-semibold text-sm rounded-lg transition">
            <Send size={14} />
          </button>
        </div>
      </div>
      <p className="text-slate-600 text-xs flex items-center gap-1"><MessageSquare size={11} /> Messages are internal to SPS and the assigned project team. New posts notify project leads.</p>
    </div>
  )
}

// ---------- Preserved AI GC drafting ----------
const DAILY_TEMPLATE = `PROJECT: The Creamery · Job 25-0628
DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
PREPARED BY: SPS Corporation — Bill Nettles, Superintendent

CREW ON SITE:
- SPS: 3 personnel
- Mora Glass: 6 personnel
- Total: 9

WORK COMPLETED TODAY:
- [describe work]

WORK PLANNED TOMORROW:
- [describe planned work]

DELAYS / ISSUES:
- [none / describe]

MATERIALS RECEIVED:
- [list materials]

SAFETY NOTES:
- Morning flex & stretch completed
- JSA reviewed with full crew`

function DraftTab({ tab }) {
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [dailyText, setDailyText] = useState(DAILY_TEMPLATE)

  const generateDraft = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true); setDraft('')
    const systemPrompts = {
      RFI: 'You are a construction RFI writer for SPS Corporation, a commercial glazing subcontractor. Write professional, precise RFIs. Include: Project, Date, RFI #, Subject, Reference Drawings, Question, Requested Response Date.',
      Submittal: 'You are writing a submittal cover letter for SPS Corporation, commercial glazing subcontractor on The Creamery project. Include: Project, Submittal #, Section, Description, notes.',
      'Email Draft': 'You are a superintendent or project manager at SPS Corporation writing an email to the General Contractor. Be professional, direct, and construction-industry appropriate.',
    }
    try {
      const reply = await callClaude({
        system: systemPrompts[tab] || systemPrompts['Email Draft'],
        messages: [{ role: 'user', content: `Project: The Creamery, Job 25-0628, 410 Glenwood Ave Raleigh NC. SPS team: John Kimbal (PM), Bill Nettles (Superintendent). Today: ${new Date().toLocaleDateString()}.\n\n${prompt}` }],
      })
      setDraft(reply || 'Could not generate draft.')
    } catch { setDraft('Connection error — check API key.') }
    setLoading(false)
  }

  if (tab === 'Daily Report') {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-medium text-sm">Daily Field Report</h2>
          <button className="px-3 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg transition">Send to GC</button>
        </div>
        <textarea value={dailyText} onChange={e => setDailyText(e.target.value)} rows={20}
          className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-3 text-slate-200 text-sm font-mono focus:outline-none focus:border-amber-400 resize-none" />
      </div>
    )
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-medium text-sm">AI-Assisted {tab}</h2>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
        placeholder={tab === 'RFI' ? 'Describe the field question or drawing discrepancy…' : tab === 'Submittal' ? 'Describe the submittal — product, section, notes…' : 'What do you need to communicate to the GC?'}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none" />
      <button onClick={generateDraft} disabled={loading || !prompt.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 font-semibold text-sm rounded-lg transition">
        {loading ? <><RefreshCw size={13} className="animate-spin" />Drafting…</> : <><FileText size={13} />Generate {tab}</>}
      </button>
      {draft && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <pre className="text-slate-200 text-sm whitespace-pre-wrap font-mono leading-relaxed">{draft}</pre>
        </div>
      )}
    </div>
  )
}

export default function GCPage() {
  const [tab, setTab] = useState('Messages')
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Project Communications</h1>
        <p className="text-slate-400 text-sm mt-0.5">Internal per-project messaging plus AI-assisted GC documents</p>
      </div>
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-700/60 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${tab === t ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Messages' ? <MessagesTab /> : <DraftTab tab={tab} />}
    </div>
  )
}
