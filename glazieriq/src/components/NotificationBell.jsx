import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData, PROJECTS } from '../contexts/DataContext'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const LEVEL_ICON = {
  critical: <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />,
  warning:  <AlertCircle  size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />,
  info:     <Info         size={14} className="text-sky-400 flex-shrink-0 mt-0.5" />,
}

export default function NotificationBell() {
  const { user } = useAuth()
  const { notificationsFor, markRead, markAllRead } = useData()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const mine = notificationsFor(user)
  const unread = mine.filter(n => !n.readBy.includes(user.id))

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
        <Bell size={17} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 sticky top-0 bg-slate-900">
            <p className="text-white text-sm font-semibold">Notifications</p>
            {unread.length > 0 && (
              <button onClick={() => markAllRead(user.id)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {mine.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {mine.map(n => {
                const isUnread = !n.readBy.includes(user.id)
                const proj = PROJECTS.find(p => p.id === n.projectId)
                return (
                  <button key={n.id} onClick={() => markRead(n.id, user.id)}
                    className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-slate-800/60 transition ${isUnread ? 'bg-slate-800/30' : ''}`}>
                    {LEVEL_ICON[n.level] || LEVEL_ICON.info}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${isUnread ? 'text-white font-medium' : 'text-slate-400'}`}>{n.title}</p>
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-slate-600 text-[11px] mt-1">
                        {proj ? `${proj.name} · ` : ''}{timeAgo(n.ts)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
