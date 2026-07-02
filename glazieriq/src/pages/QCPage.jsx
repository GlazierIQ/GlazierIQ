import { useState, useRef } from 'react'
import { ScanLine, Upload, CheckCircle, AlertTriangle, Camera, RefreshCw, Info, ClipboardCheck, RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData, PROJECTS } from '../contexts/DataContext'
import { callClaudeJSON } from '../lib/aiClient'

// Standard commercial glazing / panel inspection checklist
const CHECKLIST = [
  { id: 'glass',    label: 'Glass — no scratches, chips, cracks, or inclusions' },
  { id: 'coating',  label: 'Coating / IGU seal intact — no delamination or fogging' },
  { id: 'edge',     label: 'Edge condition clean and undamaged' },
  { id: 'dims',     label: 'Dimensions within tolerance per shop drawing' },
  { id: 'frame',    label: 'Framing plumb, level, and square' },
  { id: 'anchors',  label: 'Anchor count and embed per Sheet 103 / spec' },
  { id: 'fasteners',label: 'Fasteners / pressure plates installed and torqued' },
  { id: 'gaskets',  label: 'Gaskets seated, continuous, no rollout' },
  { id: 'sealant',  label: 'Sealant — backer rod set, full bead, tooled, no voids' },
  { id: 'weeps',    label: 'Weep holes / drainage path clear' },
]

const STATUS_COLOR = {
  pass: 'text-green-400 bg-green-400/10 border-green-400/20',
  fail: 'text-red-400 bg-red-400/10 border-red-400/20',
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

function timeAgo(ts) {
  const h = Math.floor((Date.now() - ts) / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ---------- Inspection Checklist tab ----------
function ChecklistTab() {
  const { user } = useAuth()
  const { addQCLog } = useData()
  const [projectId, setProjectId] = useState(PROJECTS[0].id)
  const [system, setSystem] = useState('')
  const [marks, setMarks] = useState({})      // id -> 'pass' | 'fail' | 'na'
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(null)

  const setMark = (id, val) => setMarks(m => ({ ...m, [id]: val }))
  const failedItems = CHECKLIST.filter(c => marks[c.id] === 'fail')
  const allMarked = CHECKLIST.every(c => marks[c.id])
  const overall = failedItems.length ? 'fail' : 'pass'

  const submit = () => {
    if (!system.trim() || !allMarked) return
    const log = addQCLog({
      projectId, system: system.trim(),
      inspector: user.name,
      result: overall,
      items: failedItems.map(c => c.label),
      notes: notes.trim(),
    })
    setSubmitted({ ...log })
    // reset form
    setMarks({}); setNotes(''); setSystem('')
  }

  const MARK_BTN = (id, val, label, active, color) => (
    <button onClick={() => setMark(id, val)}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${active ? color : 'text-slate-500 border-slate-700 hover:text-slate-300'}`}>
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      {submitted && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${submitted.result === 'pass' ? STATUS_COLOR.pass : STATUS_COLOR.fail}`}>
          {submitted.result === 'pass' ? <CheckCircle size={18} className="mt-0.5" /> : <AlertTriangle size={18} className="mt-0.5" />}
          <div>
            <p className="font-semibold text-sm">{submitted.id} logged — {submitted.result.toUpperCase()}</p>
            <p className="text-xs opacity-80 mt-0.5">
              {submitted.result === 'fail'
                ? 'Failure notification sent to PM, General Super, Superintendent, and Asst. Super.'
                : 'Inspection recorded. No issues flagged.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400">
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name} · {p.job}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">System / Location</label>
            <input value={system} onChange={e => setSystem(e.target.value)}
              placeholder="e.g. Curtain Wall — Level 33 Area A"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl divide-y divide-slate-700/40">
        {CHECKLIST.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-slate-300 text-sm">{c.label}</span>
            <div className="flex gap-1 flex-shrink-0">
              {MARK_BTN(c.id, 'pass', 'Pass', marks[c.id] === 'pass', STATUS_COLOR.pass)}
              {MARK_BTN(c.id, 'fail', 'Fail', marks[c.id] === 'fail', STATUS_COLOR.fail)}
              {MARK_BTN(c.id, 'na', 'N/A', marks[c.id] === 'na', 'text-slate-300 bg-slate-700 border-slate-600')}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Inspector Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Optional — describe any failures or follow-up needed…"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 resize-none" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {allMarked
              ? <>Overall: <span className={overall === 'pass' ? 'text-green-400' : 'text-red-400'}>{overall.toUpperCase()}</span>{failedItems.length ? ` · ${failedItems.length} item(s) failed` : ''}</>
              : `Mark all ${CHECKLIST.length} items to submit (${Object.keys(marks).length}/${CHECKLIST.length})`}
          </p>
          <button onClick={submit} disabled={!allMarked || !system.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 font-semibold text-sm rounded-lg transition">
            <ClipboardCheck size={14} /> Submit Inspection
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- AI Scan tab (preserved) ----------
function ScanTab() {
  const { userCan } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [panelId, setPanelId] = useState('')
  const [siteId, setSiteId] = useState('The Creamery · 25-0628')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileRef = useRef()

  const handleImageSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImageFile(f); setScanResult(null)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const runAIScan = async () => {
    setScanning(true); setScanResult(null)
    try {
      let content = []
      if (imagePreview) {
        const base64 = imagePreview.split(',')[1]
        const mediaType = imageFile?.type || 'image/jpeg'
        content = [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `You are a glass QC inspector AI for SPS Corporation, a commercial glazing company.
Analyze this glass/panel image for defects.

Panel ID: ${panelId || 'Not specified'}
Project: ${siteId}

Inspect for: scratches/chips/cracks, coating defects/delamination, edge damage, bubbles/inclusions, dimensional issues, silicone/sealant issues.

Respond in this JSON format only, no markdown:
{ "result": "pass" or "fail" or "needs_review", "confidence": 0-100, "defects": ["..."], "summary": "2-3 sentences for field crew", "recommended_action": "Clear next step" }` }
        ]
      } else {
        content = [{ type: 'text', text: `Simulate a glass panel QC inspection result for demo purposes. Panel: ${panelId || 'ORD-041 Lite #09'}. Return JSON only: { "result": "pass", "confidence": 94, "defects": [], "summary": "Glass panel appears clean with no visible defects. Coating is uniform and edges are intact.", "recommended_action": "Approve for shipment." }` }]
      }
      const parsed = await callClaudeJSON({ messages: [{ role: 'user', content }] })
      setScanResult(parsed)
    } catch {
      setScanResult({ result: 'needs_review', confidence: 0, defects: [], summary: 'Analysis could not complete. Check API connection or try again.', recommended_action: 'Manual inspection required.' })
    } finally { setScanning(false) }
  }

  const canManage = userCan('manage_qc')

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <h2 className="text-white font-medium text-sm flex items-center gap-2"><Camera size={14} /> Capture / Upload Panel Photo</h2>
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Panel ID</label>
          <input value={panelId} onChange={e => setPanelId(e.target.value)} placeholder="e.g. ORD-041 Lite #09"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Project / Site</label>
          <select value={siteId} onChange={e => setSiteId(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400">
            <option>The Creamery · 25-0628</option><option>Midtown Office</option><option>Harbor Walk</option>
          </select>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <div onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-600 hover:border-amber-400/50 rounded-xl p-6 text-center cursor-pointer transition">
          {imagePreview
            ? <img src={imagePreview} alt="Panel" className="max-h-48 mx-auto rounded-lg object-contain" />
            : <><Upload size={24} className="text-slate-500 mx-auto mb-2" /><p className="text-slate-400 text-sm">Click to upload panel photo</p><p className="text-slate-600 text-xs mt-1">JPG, PNG, HEIC · Max 10MB</p></>}
        </div>
        <button onClick={runAIScan} disabled={scanning}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-lg transition">
          {scanning ? <><RefreshCw size={14} className="animate-spin" /> Analyzing panel…</> : <><ScanLine size={14} /> Run AI Scan</>}
        </button>
        {!imagePreview && <p className="text-slate-600 text-xs text-center flex items-center justify-center gap-1"><Info size={10} /> No photo? Click "Run AI Scan" for a demo result</p>}
      </div>

      <div>
        {scanResult ? (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              {scanResult.result === 'pass' ? <CheckCircle size={20} className="text-green-400" /> : <AlertTriangle size={20} className="text-red-400" />}
              <div>
                <span className={`text-lg font-bold uppercase ${scanResult.result === 'pass' ? 'text-green-400' : scanResult.result === 'fail' ? 'text-red-400' : 'text-amber-400'}`}>
                  {scanResult.result === 'pass' ? 'PASSED' : scanResult.result === 'fail' ? 'FAILED' : 'NEEDS REVIEW'}
                </span>
                <p className="text-slate-500 text-xs">Confidence: {scanResult.confidence}%</p>
              </div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg"><p className="text-slate-300 text-sm">{scanResult.summary}</p></div>
            {scanResult.defects?.length > 0 && (
              <div>
                <p className="text-red-400 text-xs font-medium mb-1.5">Defects Found</p>
                <ul className="space-y-1">{scanResult.defects.map((d, i) => <li key={i} className="flex items-start gap-2 text-slate-300 text-sm"><span className="text-red-400 mt-0.5">•</span>{d}</li>)}</ul>
              </div>
            )}
            <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
              <p className="text-amber-400 text-xs font-medium mb-0.5">Recommended Action</p>
              <p className="text-slate-300 text-sm">{scanResult.recommended_action}</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-800/30 border border-slate-700/30 rounded-xl p-8">
            <div className="text-center"><ScanLine size={32} className="text-slate-600 mx-auto mb-3" /><p className="text-slate-500 text-sm">Upload a panel photo and run the AI scan to see results here.</p></div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- QC Log tab (live + resolve) ----------
function LogTab() {
  const { user, userCan } = useAuth()
  const { qcLogs, resolveQCLog } = useData()
  const canManage = userCan('manage_qc')
  return (
    <div className="space-y-3">
      {qcLogs.length === 0 && <p className="text-slate-500 text-sm">No inspections logged yet.</p>}
      {qcLogs.map(log => {
        const proj = PROJECTS.find(p => p.id === log.projectId)
        return (
          <div key={log.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-white font-mono text-sm">{log.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border uppercase font-medium ${STATUS_COLOR[log.result]}`}>{log.result}</span>
                  {log.result === 'fail' && log.resolved && <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">resolved</span>}
                </div>
                <p className="text-slate-400 text-sm">{log.system}{proj ? ` · ${proj.name}` : ''}</p>
                {log.notes && <p className="text-slate-500 text-xs mt-1">{log.notes}</p>}
                {log.items?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {log.items.map((d, i) => <span key={i} className="text-xs px-2 py-0.5 bg-red-400/10 text-red-400 rounded-full">{d}</span>)}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-slate-600 shrink-0">
                <p>{timeAgo(log.ts)}</p>
                <p>{log.inspector}</p>
                {log.result === 'fail' && !log.resolved && canManage && (
                  <button onClick={() => resolveQCLog(log.id, user)}
                    className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-green-400/10 border border-green-400/20 text-green-400 text-xs rounded-lg hover:bg-green-400/20 transition">
                    <RotateCcw size={11} /> Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function QCPage() {
  const [tab, setTab] = useState('checklist')
  const TABS = [['checklist', 'Inspection Checklist'], ['scan', 'AI Scan'], ['log', 'QC Log']]
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Panel Scan / QC</h1>
        <p className="text-slate-400 text-sm mt-0.5">Field inspections, AI defect detection, and quality control log</p>
      </div>
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-700/60 w-fit">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm transition ${tab === id ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'checklist' && <ChecklistTab />}
      {tab === 'scan' && <ScanTab />}
      {tab === 'log' && <LogTab />}
    </div>
  )
}
