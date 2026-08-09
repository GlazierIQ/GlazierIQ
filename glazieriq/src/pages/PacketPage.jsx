import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PROJECTS } from '../contexts/DataContext'

export default function PacketPage() {
  const { passportId } = useParams()
  const [passport, setPassport] = useState(null)
  const [stations, setStations] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [ppRes, stRes, evRes] = await Promise.all([
        supabase.from('panel_passports').select('*').eq('id', passportId).single(),
        supabase.from('pp_stations').select('*').order('id'),
        supabase.from('pp_events').select('*').eq('passport_id', passportId).order('logged_at'),
      ])
      setPassport(ppRes.data || null)
      setStations(stRes.data || [])
      setEvents(evRes.data || [])
      setLoading(false)
    }
    load()
  }, [passportId])

  if (loading) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center text-aluminum">
        Loading packet…
      </div>
    )
  }

  if (!passport) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center text-alert font-bold p-6 text-center">
        Packet not found. Check the QR code or contact your PM.
      </div>
    )
  }

  const project = PROJECTS.find(p => p.id === passport.project_id)
  const stationName = (id) => stations.find(s => s.id === id)?.name || `Station ${id}`
  const pct = stations.length ? Math.round((passport.current_station / stations.length) * 100) : 0

  return (
    <div className="min-h-screen bg-graphite text-aluminum p-4 pb-16 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-brand font-mono text-sm">{passport.passport_number}</div>
        <div className="text-3xl font-black">{passport.unit_mark}</div>
        <div className="opacity-80">{passport.unit_family}</div>
      </div>

      {/* Unit card */}
      <div className="bg-black/30 border border-aluminum/20 rounded-xl p-4 mb-4">
        <Row label="Project" value={project ? `${project.name} (${project.job})` : passport.project_id} />
        {project?.address && <Row label="Address" value={project.address} />}
        {passport.width_in && passport.height_in && (
          <Row label="Size" value={`${passport.width_in}" W × ${passport.height_in}" H`} />
        )}
        <Row label="Status" value={`${stationName(passport.current_station)} (${pct}%)`} />
      </div>

      {/* Install instructions */}
      <div className="bg-black/30 border border-brand/40 rounded-xl p-4 mb-4">
        <div className="text-brand font-bold mb-2">INSTALL INSTRUCTIONS</div>
        {passport.install_notes ? (
          <p className="whitespace-pre-wrap">{passport.install_notes}</p>
        ) : (
          <p className="opacity-60 italic">
            No install instructions attached yet. Contact your PM before setting this unit.
          </p>
        )}
      </div>

      {/* Hold point warning */}
      {passport.hold_point && (
        <div className="bg-alert/15 border-2 border-alert rounded-xl p-4 mb-4">
          <div className="text-alert font-black mb-1">⛔ HOLD POINT</div>
          <p className="whitespace-pre-wrap">{passport.hold_point}</p>
        </div>
      )}

      {/* Custody chain */}
      <div className="bg-black/30 border border-aluminum/20 rounded-xl p-4">
        <div className="font-bold mb-3">Chain of Custody</div>
        {stations.map(st => {
          const done = st.id <= passport.current_station
          const ev = events.find(e => e.station_id === st.id)
          return (
            <div key={st.id} className="flex items-start gap-3 py-1.5">
              <span className={done ? 'text-brand' : 'opacity-30'}>{done ? '✓' : '○'}</span>
              <div className="flex-1">
                <span className={done ? '' : 'opacity-40'}>{st.name}</span>
                {ev && (
                  <div className="text-xs opacity-60">
                    {new Date(ev.logged_at).toLocaleString()}
                    {ev.notes && <> — {ev.notes}</>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-aluminum/10 last:border-0">
      <span className="opacity-60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}