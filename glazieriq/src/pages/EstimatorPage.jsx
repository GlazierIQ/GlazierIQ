import { useState } from 'react'
import {
  TrendingUp, BellRing, Plus, DollarSign, Building2,
  UserCheck, CheckCircle2, Clock, XCircle, Volume2
} from 'lucide-react'
import { useAuth, ROLES } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'

// Synthesize a short "award" bell with the Web Audio API (no asset needed).
function playAwardBell() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const tones = [880, 1320, 1760] // A5, E6, A6 — a bright triad
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 1)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch { /* audio not available — silent */ }
}

const STATUS = {
  awarded: { light: 'bg-green-400',  ring: 'shadow-[0_0_12px_2px_rgba(74,222,128,0.6)]', label: 'Awarded', cls: 'text-green-400 bg-green-400/10 border-green-400/25', icon: CheckCircle2 },
  pending: { light: 'bg-amber-400',  ring: 'shadow-[0_0_12px_2px_rgba(251,191,36,0.5)]', label: 'Pending', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25', icon: Clock },
  lost:    { light: 'bg-red-500',    ring: '',                                            label: 'Not awarded', cls: 'text-red-400 bg-red-400/10 border-red-400/25', icon: XCircle },
}

function TrafficLight({ status }) {
  return (
    <div className="flex flex-col gap-1.5 items-center bg-slate-950/60 rounded-lg p-1.5 border border-slate-700/50">
      {['awarded', 'pending', 'lost'].map(s => (
        <span key={s}
          className={`w-3 h-3 rounded-full transition-all ${status === s ? `${STATUS[s].light} ${STATUS[s].ring}` : 'bg-slate-700/70'}`} />
      ))}
    </div>
  )
}

function BidCard({ bid, canManage }) {
  const { users, user } = useAuth()
  const { setBidStatus, assignBidPM } = useData()
  const meta = STATUS[bid.status]
  const Icon = meta.icon
  const pms = users.filter(u => [ROLES.PROJECT_MANAGER, ROLES.GENERAL_SUPER, ROLES.DIRECTOR_OPS].includes(u.role))
  const pm = users.find(u => u.id === bid.pmId)

  const award = () => { playAwardBell(); setBidStatus(bid.id, 'awarded', user?.name) }

  return (
    <div className={`bg-slate-800/60 border rounded-xl p-4 ${bid.status === 'awarded' ? 'border-green-400/25' : 'border-slate-700/50'}`}>
      <div className="flex items-start gap-3">
        <TrafficLight status={bid.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium text-sm truncate">{bid.name}</p>
            <span className="text-slate-500 text-xs font-mono">{bid.job}</span>
          </div>
          <p className="text-slate-500 text-xs truncate mt-0.5">{bid.address}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Building2 size={11} className="text-slate-500" /> {bid.gc}</span>
            {bid.value ? <span className="flex items-center gap-1 text-amber-300"><DollarSign size={11} /> {bid.value.toLocaleString()}</span> : null}
            <span className="text-slate-600">Bid {bid.bidDate}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${meta.cls}`}>
          <Icon size={11} /> {meta.label}
        </span>
      </div>

      {/* PM assignment row (awarded projects) */}
      {bid.status === 'awarded' && (
        <div className="mt-3 flex items-center gap-2 bg-slate-900/50 rounded-lg p-2.5">
          <UserCheck size={14} className={pm ? 'text-green-400' : 'text-slate-500'} />
          {pm ? (
            <p className="text-slate-300 text-xs flex-1">PM: <span className="text-white font-medium">{pm.name}</span></p>
          ) : (
            <p className="text-slate-500 text-xs flex-1">No PM assigned yet</p>
          )}
          {canManage && (
            <select value={bid.pmId || ''} onChange={e => { const id = Number(e.target.value); assignBidPM(bid.id, id || null, users.find(u => u.id === id)?.name) }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-400">
              <option value="">Assign PM…</option>
              {pms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Status controls */}
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {bid.status !== 'awarded' && (
            <button onClick={award}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-green-400/10 border border-green-400/25 text-green-300 hover:bg-green-400/20 transition">
              <BellRing size={12} /> Mark awarded
            </button>
          )}
          {bid.status !== 'pending' && (
            <button onClick={() => setBidStatus(bid.id, 'pending')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 hover:bg-amber-400/20 transition">
              <Clock size={12} /> Pending
            </button>
          )}
          {bid.status !== 'lost' && (
            <button onClick={() => setBidStatus(bid.id, 'lost')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-800 transition">
              <XCircle size={12} /> Not awarded
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function EstimatorPage() {
  const { userCan } = useAuth()
  const { bids, addBid } = useData()
  const canManage = userCan('manage_estimating')
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', job: '', address: '', gc: '', value: '', bidDate: '' })

  const counts = {
    awarded: bids.filter(b => b.status === 'awarded').length,
    pending: bids.filter(b => b.status === 'pending').length,
    lost: bids.filter(b => b.status === 'lost').length,
  }
  const awardedValue = bids.filter(b => b.status === 'awarded').reduce((s, b) => s + (b.value || 0), 0)

  const shown = filter === 'all' ? bids : bids.filter(b => b.status === filter)
  const ordered = [...shown].sort((a, b) => {
    const rank = { awarded: 0, pending: 1, lost: 2 }
    return rank[a.status] - rank[b.status]
  })

  const submit = () => {
    if (!form.name.trim()) return
    addBid({ name: form.name.trim(), job: form.job.trim(), address: form.address.trim(), gc: form.gc.trim(), value: Number(form.value) || 0, bidDate: form.bidDate || new Date().toISOString().slice(0, 10), client: '', estimator: 'Estimating' })
    setForm({ name: '', job: '', address: '', gc: '', value: '', bidDate: '' }); setShowAdd(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold flex items-center gap-2"><TrendingUp size={18} className="text-amber-400" /> Estimating</h1>
          <p className="text-slate-400 text-sm">Live bid board — projects announced and tracked from bid to award</p>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition flex-shrink-0">
            <Plus size={14} /> Add bid
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['awarded', counts.awarded, 'Awarded'], ['pending', counts.pending, 'Pending'], ['lost', counts.lost, 'Not awarded']].map(([k, v, label]) => {
          const m = STATUS[k]; const I = m.icon
          return (
            <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
              className={`text-left bg-slate-900/60 border rounded-xl p-3 transition ${filter === k ? 'border-amber-400/40' : 'border-slate-700/50 hover:border-slate-600'}`}>
              <div className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border ${m.cls}`}><I size={10} /> {label}</div>
              <p className="text-2xl font-bold text-white mt-1.5">{v}</p>
            </button>
          )
        })}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
          <div className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border text-green-400 bg-green-400/10 border-green-400/25"><DollarSign size={10} /> Awarded value</div>
          <p className="text-2xl font-bold text-white mt-1.5">${(awardedValue / 1e6).toFixed(2)}M</p>
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 grid sm:grid-cols-3 gap-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          <input value={form.job} onChange={e => setForm(f => ({ ...f, job: e.target.value }))} placeholder="Job # (e.g. 25-0750)"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          <input value={form.gc} onChange={e => setForm(f => ({ ...f, gc: e.target.value }))} placeholder="General contractor"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Location"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Est. value ($)" type="number"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          <div className="flex gap-2">
            <input type="date" value={form.bidDate} onChange={e => setForm(f => ({ ...f, bidDate: e.target.value }))}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
            <button onClick={submit} className="px-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition">Add</button>
          </div>
        </div>
      )}

      {!canManage && (
        <p className="text-slate-500 text-xs flex items-center gap-1.5"><Volume2 size={12} /> Read-only view. Awards ring the notification bell company-wide.</p>
      )}

      <div className="space-y-3">
        {ordered.map(b => <BidCard key={b.id} bid={b} canManage={canManage} />)}
        {ordered.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No projects in this view.</p>}
      </div>
    </div>
  )
}
