import { useState, useMemo } from 'react'
import {
  ShieldCheck, FileText, Activity, Camera, AlertTriangle, BadgeCheck,
  CalendarClock, Mail, RefreshCw, Plus, CheckCircle2, Clock, XCircle,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData, certStatus, certDaysLeft, CERT_WARN_DAYS } from '../contexts/DataContext'
import { callClaude } from '../lib/aiClient'

const STATUS_META = {
  valid:    { label: 'Valid',     cls: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle2 },
  expiring: { label: 'Expiring',  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock },
  expired:  { label: 'Expired',   cls: 'text-red-400 bg-red-400/10 border-red-400/20',       icon: XCircle },
  renewed:  { label: 'Up to date', cls: 'text-sky-400 bg-sky-400/10 border-sky-400/20',      icon: BadgeCheck },
}

function fmtDays(cert) {
  const d = certDaysLeft(cert)
  if (cert.renewed) return 'renewed'
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'today'
  return `${d}d left`
}

function CertRow({ cert, canManage }) {
  const { markCertRenewed } = useData()
  const { user } = useAuth()
  const [renewOpen, setRenewOpen] = useState(false)
  const [draftEmail, setDraftEmail] = useState(null)
  const [drafting, setDrafting] = useState(false)
  const [newExp, setNewExp] = useState('')

  const status = certStatus(cert)
  const meta = STATUS_META[status]
  const Icon = meta.icon

  const draftRenewalEmail = async () => {
    setDrafting(true); setDraftEmail(null)
    try {
      const text = await callClaude({
        system: 'You write short, friendly, bilingual (English then Spanish) certification-renewal reminder emails for a commercial glazing company called SPS. Keep each language to 3-4 sentences. Plain text only.',
        messages: [{ role: 'user', content: `Write a renewal reminder for ${cert.userName}. Certification: ${cert.certType} (issued by ${cert.issuer}). It ${certDaysLeft(cert) < 0 ? 'has expired' : `expires on ${cert.expires}`}. Ask them to renew and confirm completion in GlazierIQ so reminders stop.` }],
        max_tokens: 500,
      })
      setDraftEmail(text)
    } catch {
      setDraftEmail('Could not draft the email — check the API connection and try again.')
    } finally { setDrafting(false) }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center flex-shrink-0">
          <span className="text-amber-400 text-xs font-bold">{cert.userName[0]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium truncate">{cert.certType}</p>
          <p className="text-slate-500 text-xs truncate">{cert.userName} · {cert.issuer} · exp {cert.expires}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta.cls}`}>
            <Icon size={11} /> {meta.label}
          </span>
          <p className="text-slate-500 text-[11px] mt-1">{fmtDays(cert)}{cert.reminderCount > 0 && !cert.renewed ? ` · ${cert.reminderCount} sent` : ''}</p>
        </div>
      </div>

      {canManage && (status === 'expiring' || status === 'expired') && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setRenewOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-green-400/10 border border-green-400/25 text-green-300 hover:bg-green-400/20 transition">
            <CheckCircle2 size={12} /> Mark renewed
          </button>
          <button onClick={draftRenewalEmail} disabled={drafting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition disabled:opacity-50">
            {drafting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} className="text-amber-400" />}
            AI draft renewal email
          </button>
        </div>
      )}

      {renewOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 bg-slate-800/60 rounded-lg p-3">
          <div>
            <label className="text-slate-500 text-[11px] mb-1 block">New expiry date</label>
            <input type="date" value={newExp} onChange={e => setNewExp(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400" />
          </div>
          <button onClick={() => { markCertRenewed(cert.id, newExp, user?.name); setRenewOpen(false) }}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-xs rounded-lg transition">
            Confirm renewal
          </button>
        </div>
      )}

      {draftEmail && (
        <div className="mt-3 bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
          <p className="text-slate-400 text-[11px] mb-1 flex items-center gap-1"><Mail size={11} /> Draft to {cert.email}</p>
          <p className="text-slate-200 text-xs whitespace-pre-wrap leading-relaxed">{draftEmail}</p>
        </div>
      )}
    </div>
  )
}

function CertsTab() {
  const { users, userCan } = useAuth()
  const { certs, runCertReminderCheck, emailLog, addCert } = useData()
  const canManage = userCan('manage_certs')
  const [lastRun, setLastRun] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ userId: '', certType: '', issuer: '', expires: '' })

  const sorted = useMemo(() =>
    [...certs].sort((a, b) => certDaysLeft(a) - certDaysLeft(b)), [certs])

  const counts = useMemo(() => {
    const c = { valid: 0, expiring: 0, expired: 0, renewed: 0 }
    certs.forEach(x => { c[certStatus(x)]++ })
    return c
  }, [certs])

  const run = () => { const n = runCertReminderCheck(); setLastRun(n) }

  const submit = () => {
    const u = users.find(x => x.id === Number(form.userId))
    if (!u || !form.certType.trim() || !form.expires) return
    addCert({ userId: u.id, userName: u.name, email: u.email, certType: form.certType.trim(), issuer: form.issuer.trim() || 'SPS Internal', issued: new Date().toISOString().slice(0, 10), expires: form.expires })
    setForm({ userId: '', certType: '', issuer: '', expires: '' }); setShowAdd(false)
  }

  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['expired', 'Expired'], ['expiring', `Expiring (≤${CERT_WARN_DAYS}d)`], ['valid', 'Valid'], ['renewed', 'Up to date']].map(([k, label]) => {
          const m = STATUS_META[k]; const I = m.icon
          return (
            <div key={k} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
              <div className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border ${m.cls}`}><I size={10} /> {label}</div>
              <p className="text-2xl font-bold text-white mt-1.5">{counts[k]}</p>
            </div>
          )
        })}
      </div>

      {/* AI reminder engine banner */}
      <div className="bg-gradient-to-r from-amber-400/10 to-transparent border border-amber-400/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-400/15 border border-amber-400/25 flex-shrink-0">
            <CalendarClock size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">AI Renewal Reminder Engine</p>
            <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
              Sends a first notice ~1 month before any certification expires, then a reminder every week — to the employee and the Safety Coordinator — until it's renewed and confirmed here. Runs automatically; you can also run it now.
            </p>
          </div>
          {canManage && (
            <button onClick={run}
              className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-xs rounded-lg transition flex-shrink-0">
              <RefreshCw size={13} /> Run reminder check
            </button>
          )}
        </div>
        {lastRun !== null && (
          <p className="text-amber-300 text-xs mt-2 pl-12">{lastRun === 0 ? 'No reminders due right now — everything is on schedule.' : `Sent ${lastRun} reminder${lastRun > 1 ? 's' : ''}. Check the bell and the send log below.`}</p>
        )}
      </div>

      {/* Add cert */}
      {canManage && (
        <div>
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-2 px-3 py-2 border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm rounded-lg transition">
            <Plus size={14} /> Add certification
          </button>
          {showAdd && (
            <div className="mt-3 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 grid sm:grid-cols-4 gap-3">
              <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400">
                <option value="">Employee…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input value={form.certType} onChange={e => setForm(f => ({ ...f, certType: e.target.value }))} placeholder="Certification (e.g. OSHA-30)"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
              <input value={form.issuer} onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Issuer"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
              <div className="flex gap-2">
                <input type="date" value={form.expires} onChange={e => setForm(f => ({ ...f, expires: e.target.value }))}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
                <button onClick={submit} className="px-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition">Add</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cert list */}
      <div className="space-y-2">
        {sorted.map(c => <CertRow key={c.id} cert={c} canManage={canManage} />)}
      </div>

      {/* Reminder send log */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2"><Mail size={14} className="text-amber-400" /> Reminder send log</h3>
        {emailLog.length === 0 ? (
          <p className="text-slate-500 text-xs">No reminders sent yet. They'll appear here when the engine runs.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {emailLog.map(e => (
              <div key={e.id} className="flex items-start gap-2 py-1.5 border-b border-slate-700/30 last:border-0">
                <Mail size={12} className={`mt-0.5 flex-shrink-0 ${e.kind === 'cert_renewed' ? 'text-sky-400' : e.kind === 'cert_first_notice' ? 'text-amber-400' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200 text-xs font-medium truncate">{e.subject}</p>
                  <p className="text-slate-500 text-[11px] truncate">to {e.to}</p>
                </div>
                <span className="text-slate-600 text-[11px] flex-shrink-0">{new Date(e.ts).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldSafetyTab() {
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        {[['JSA Forms', 'Daily job safety analyses', FileText, 'green'], ['Flex & Stretch', 'Morning stretch sign-off log', Activity, 'blue'], ['Site Photos', 'Photo documentation by job', Camera, 'amber'], ['Violations', 'Incidents and corrective actions', AlertTriangle, 'red']].map(([label, desc, Icon, color]) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:border-amber-400/30 transition">
            <div className={`p-2.5 rounded-lg border ${color === 'green' ? 'bg-green-400/10 text-green-400 border-green-400/20' : color === 'blue' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : color === 'amber' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}><Icon size={16} /></div>
            <div><p className="text-white font-medium text-sm">{label}</p><p className="text-slate-400 text-xs mt-0.5">{desc}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <h2 className="text-white font-medium text-sm mb-3">Recent Safety Activity</h2>
        {[
          { type: 'JSA', site: 'The Creamery', date: '2026-06-01', crew: 9, status: 'complete' },
          { type: 'Flex & Stretch', site: 'The Creamery', date: '2026-06-01', crew: 9, status: 'complete' },
          { type: 'JSA', site: 'Midtown Office', date: '2026-05-31', crew: 4, status: 'complete' },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
            <span className="text-slate-400 text-xs w-28">{r.type}</span>
            <span className="text-white text-sm flex-1">{r.site}</span>
            <span className="text-slate-500 text-xs">Crew: {r.crew}</span>
            <span className="text-green-400 text-xs">✓ {r.status}</span>
            <span className="text-slate-600 text-xs">{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SafetyPage() {
  const [tab, setTab] = useState('certs')
  const TABS = [
    { id: 'certs', label: 'Certifications', icon: BadgeCheck },
    { id: 'field', label: 'Field Safety', icon: ShieldCheck },
  ]
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Safety</h1>
        <p className="text-slate-400 text-sm">Certification tracking with AI renewal reminders, JSAs, and field records</p>
      </div>
      <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-700/60 w-fit">
        {TABS.map(t => { const I = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${tab === t.id ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <I size={13} /> {t.label}
          </button>
        ) })}
      </div>
      {tab === 'certs' ? <CertsTab /> : <FieldSafetyTab />}
    </div>
  )
}
