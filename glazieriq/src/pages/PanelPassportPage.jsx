import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { PROJECTS } from '../contexts/DataContext'
import { QRCodeCanvas } from 'qrcode.react'

const UNIT_FAMILIES = [
  'Curtain Wall', 'Storefront', 'Window Wall', 'SSG',
  'ACM', 'IMP', 'Door + Hardware Frame',
]

const FAMILY_CODES = {
  'Curtain Wall': 'CW', 'Storefront': 'SF', 'Window Wall': 'WW',
  'SSG': 'SG', 'ACM': 'AC', 'IMP': 'IM', 'Door + Hardware Frame': 'DR',
}

export default function PanelPassportPage() {
  const { user } = useAuth()
  const [stations, setStations] = useState([])
  const [passports, setPassports] = useState([])
  const [selected, setSelected] = useState(null)   // passport being viewed
  const [events, setEvents] = useState([])          // events for selected passport
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    project_id: PROJECTS[0]?.id || '',
    unit_family: UNIT_FAMILIES[0],
    unit_mark: '',
    width_in: '',
    height_in: '',
  })

  const loadAll = useCallback(async () => {
    const [stRes, ppRes] = await Promise.all([
      supabase.from('pp_stations').select('*').order('id'),
      supabase.from('panel_passports').select('*').order('created_at', { ascending: false }),
    ])
    if (stRes.data) setStations(stRes.data)
    if (ppRes.data) setPassports(ppRes.data)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const loadEvents = useCallback(async (passportId) => {
    const { data } = await supabase
      .from('pp_events')
      .select('*')
      .eq('passport_id', passportId)
      .order('logged_at')
    setEvents(data || [])
  }, [])

  const openPassport = (pp) => {
    setSelected(pp)
    setNote('')
    loadEvents(pp.id)
  }

  const makePassportNumber = () => {
    const proj = PROJECTS.find(p => p.id === form.project_id)
    const job = proj ? proj.job.replace('-', '') : 'JOB'
    const fam = FAMILY_CODES[form.unit_family] || 'XX'
    const seq = String(Date.now()).slice(-6)
    return `PP-${job}-${fam}-${seq}`
  }

  const createPassport = async () => {
    if (!form.unit_mark.trim()) { alert('Unit mark is required'); return }
    setBusy(true)
    const { error } = await supabase.from('panel_passports').insert({
      passport_number: makePassportNumber(),
      project_id: form.project_id,
      unit_family: form.unit_family,
      unit_mark: form.unit_mark.trim(),
      width_in: form.width_in || null,
      height_in: form.height_in || null,
      current_station: 1,
      created_by: user?.id || null,
    })
    setBusy(false)
    if (error) { alert(error.message); return }
    setShowForm(false)
    setForm(f => ({ ...f, unit_mark: '', width_in: '', height_in: '' }))
    loadAll()
  }

  const stampNextStation = async () => {
    if (!selected) return
    const nextId = (selected.current_station || 0) + 1
    if (nextId > stations.length) return
    setBusy(true)
    // 1. Stamp the logbook
    const { error: evErr } = await supabase.from('pp_events').insert({
      passport_id: selected.id,
      station_id: nextId,
      logged_by: user?.id || null,
      notes: note.trim() || null,
    })
    if (evErr) { setBusy(false); alert(evErr.message); return }
    // 2. Advance the passport
    const { error: upErr } = await supabase
      .from('panel_passports')
      .update({ current_station: nextId })
      .eq('id', selected.id)
    setBusy(false)
    if (upErr) { alert(upErr.message); return }
    const updated = { ...selected, current_station: nextId }
    setSelected(updated)
    setNote('')
    setPassports(pps => pps.map(p => (p.id === updated.id ? updated : p)))
    loadEvents(updated.id)
  }

  const stationName = (id) => stations.find(s => s.id === id)?.name || `Station ${id}`
  const projectName = (id) => PROJECTS.find(p => p.id === id)?.name || id
  const complete = selected && selected.current_station >= stations.length

  // ---------- Detail view ----------
  if (selected) {
    return (
      <div className="p-4 max-w-3xl mx-auto text-aluminum">
        <button onClick={() => setSelected(null)} className="mb-4 text-brand">
          &larr; All Passports
        </button>

        <div className="bg-graphite border border-aluminum/20 rounded-xl p-4 mb-4">
          <div className="text-brand font-mono text-lg">{selected.passport_number}</div>
          <div className="text-xl font-bold mt-1">{selected.unit_mark}</div>
          <div className="text-sm opacity-80 mt-1">
            {selected.unit_family} &middot; {projectName(selected.project_id)}
            {selected.width_in && selected.height_in &&
              <> &middot; {selected.width_in}&quot; &times; {selected.height_in}&quot;</>}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 mb-4 flex flex-col items-center">
          <QRCodeCanvas
            value={`${window.location.origin}/packet/${selected.id}`}
            size={160}
          />
          <div className="text-graphite text-xs font-mono mt-2">{selected.passport_number}</div>
        </div>

        {/* Station timeline */}
        <div className="bg-graphite border border-aluminum/20 rounded-xl p-4">
          <div className="font-bold mb-3">Chain of Custody</div>
          {stations.map(st => {
            const done = st.id <= selected.current_station
            const isNext = st.id === selected.current_station + 1
            const ev = events.find(e => e.station_id === st.id)
            return (
              <div key={st.id} className="flex items-start gap-3 py-2 border-b border-aluminum/10 last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${done ? 'bg-brand text-graphite' : isNext ? 'border-2 border-brand text-brand' : 'border border-aluminum/30 text-aluminum/40'}`}>
                  {done ? '✓' : st.id}
                </div>
                <div className="flex-1">
                  <div className={done ? '' : 'opacity-50'}>{st.name}</div>
                  {ev && (
                    <div className="text-xs opacity-60">
                      {new Date(ev.logged_at).toLocaleString()}
                      {ev.notes && <> &mdash; {ev.notes}</>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {complete ? (
            <div className="mt-4 text-brand font-bold text-center">
              ✓ Chain of custody complete
            </div>
          ) : (
            <div className="mt-4">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full mb-2 rounded-lg bg-black/30 border border-aluminum/20 p-2 text-aluminum"
              />
              <button
                onClick={stampNextStation}
                disabled={busy}
                className="w-full bg-brand text-graphite font-bold rounded-lg py-3 disabled:opacity-50"
              >
                Stamp: {stationName(selected.current_station + 1)}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- List view ----------
  return (
    <div className="p-4 max-w-3xl mx-auto text-aluminum">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Panel Passports</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-brand text-graphite font-bold rounded-lg px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ New Passport'}
        </button>
      </div>

      {showForm && (
        <div className="bg-graphite border border-aluminum/20 rounded-xl p-4 mb-4 space-y-3">
          <select
            value={form.project_id}
            onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
            className="w-full rounded-lg bg-black/30 border border-aluminum/20 p-2 text-aluminum"
          >
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.job})</option>)}
          </select>
          <select
            value={form.unit_family}
            onChange={e => setForm(f => ({ ...f, unit_family: e.target.value }))}
            className="w-full rounded-lg bg-black/30 border border-aluminum/20 p-2 text-aluminum"
          >
            {UNIT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input
            value={form.unit_mark}
            onChange={e => setForm(f => ({ ...f, unit_mark: e.target.value }))}
            placeholder="Unit mark (e.g. CW-3-14)"
            className="w-full rounded-lg bg-black/30 border border-aluminum/20 p-2 text-aluminum"
          />
          <div className="flex gap-3">
            <input
              value={form.width_in}
              onChange={e => setForm(f => ({ ...f, width_in: e.target.value }))}
              placeholder="Width (in)" type="number"
              className="w-1/2 rounded-lg bg-black/30 border border-aluminum/20 p-2 text-aluminum"
            />
            <input
              value={form.height_in}
              onChange={e => setForm(f => ({ ...f, height_in: e.target.value }))}
              placeholder="Height (in)" type="number"
              className="w-1/2 rounded-lg bg-black/30 border border-aluminum/20 p-2 text-aluminum"
            />
          </div>
          <button
            onClick={createPassport}
            disabled={busy}
            className="w-full bg-brand text-graphite font-bold rounded-lg py-3 disabled:opacity-50"
          >
            Create Passport
          </button>
        </div>
      )}

      {passports.length === 0 && !showForm && (
        <div className="opacity-60 text-center py-10">
          No passports yet. Hit + New Passport to issue the first one.
        </div>
      )}

      {passports.map(pp => (
        <button
          key={pp.id}
          onClick={() => openPassport(pp)}
          className="w-full text-left bg-graphite border border-aluminum/20 rounded-xl p-4 mb-3"
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-brand font-mono text-sm">{pp.passport_number}</div>
              <div className="font-bold">{pp.unit_mark}</div>
              <div className="text-xs opacity-70">{pp.unit_family} &middot; {projectName(pp.project_id)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-70">Station {pp.current_station}/{stations.length || 13}</div>
              <div className="text-sm">{stationName(pp.current_station)}</div>
            </div>
          </div>
          {/* progress bar */}
          <div className="mt-3 h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-brand"
              style={{ width: `${(pp.current_station / (stations.length || 13)) * 100}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  )
}