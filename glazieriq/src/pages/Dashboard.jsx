import { useAuth } from '../contexts/AuthContext'
import { Package, Factory, ShieldCheck, Clock, AlertTriangle, TrendingUp, Users, Truck } from 'lucide-react'

const STATS = [
  { label: 'Active Orders',     value: '14',  sub: '3 in production',   icon: Package,     color: 'amber' },
  { label: 'Machine Uptime',    value: '96%', sub: 'Rhino 1·2·3 online', icon: Factory,     color: 'green' },
  { label: 'Safety Score',      value: '98',  sub: 'This week',          icon: ShieldCheck, color: 'blue'  },
  { label: 'Hours Logged',      value: '312', sub: 'Pending approval: 4', icon: Clock,       color: 'purple'},
]

const RECENT = [
  { id: 'ORD-041', site: 'The Creamery',    status: 'In Production', machine: 'Rhino 2', updated: '2h ago',   color: 'amber'  },
  { id: 'ORD-040', site: 'Midtown Office',  status: 'QC Pending',    machine: 'Rhino 1', updated: '4h ago',   color: 'blue'   },
  { id: 'ORD-039', site: 'Harbor Walk',     status: 'Ready to Ship', machine: 'Rhino 3', updated: '6h ago',   color: 'green'  },
  { id: 'ORD-038', site: 'River District',  status: 'Shipped',       machine: 'Rhino 1', updated: 'Yesterday',color: 'slate'  },
]

const ALERTS = [
  { type: 'Safety',    msg: 'JSA pending sign-off — Harbor Walk crew',  severity: 'high'   },
  { type: 'QC',        msg: 'Panel defect flagged on ORD-040 Lite #12', severity: 'medium' },
  { type: 'Weather',   msg: 'Wind advisory Tue — review lift plan',     severity: 'low'    },
]

const colorMap = {
  amber:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
  green:  'bg-green-400/10 text-green-400 border-green-400/20',
  blue:   'bg-blue-400/10 text-blue-400 border-blue-400/20',
  purple: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  slate:  'bg-slate-700/40 text-slate-400 border-slate-600/40',
}

const severityColor = { high: 'text-red-400 bg-red-400/10', medium: 'text-amber-400 bg-amber-400/10', low: 'text-blue-400 bg-blue-400/10' }

export default function Dashboard() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-semibold">{greeting}, {user.name.split(' ')[0]}.</h1>
        <p className="text-slate-400 text-sm mt-0.5">GlazierIQ Operations — SPS Corporation · Apex, NC</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <div className={`inline-flex p-2 rounded-lg border mb-3 ${colorMap[s.color]}`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
              <p className="text-slate-500 text-xs mt-1">{s.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3">Recent Orders</h2>
          <div className="space-y-2">
            {RECENT.map(o => (
              <div key={o.id} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-400 text-xs font-mono w-16">{o.id}</span>
                <span className="text-white text-sm flex-1">{o.site}</span>
                <span className="text-slate-500 text-xs">{o.machine}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${colorMap[o.color]}`}>{o.status}</span>
                <span className="text-slate-600 text-xs w-20 text-right">{o.updated}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" /> Active Alerts
          </h2>
          <div className="space-y-2">
            {ALERTS.map((a, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${severityColor[a.severity]}`}>{a.type}</span>
                  <span className={`text-xs font-medium capitalize ${severityColor[a.severity].split(' ')[0]}`}>{a.severity}</span>
                </div>
                <p className="text-slate-300 text-xs">{a.msg}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Pilot Project */}
      <div className="bg-slate-800/60 border border-amber-400/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-amber-400 font-semibold text-sm">Active Pilot Project</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-slate-500 text-xs">Project</p><p className="text-white font-medium">The Creamery · 25-0628</p></div>
          <div><p className="text-slate-500 text-xs">Address</p><p className="text-white">410 Glenwood Ave, Raleigh NC</p></div>
          <div><p className="text-slate-500 text-xs">SPS Team</p><p className="text-white">Kimbal · Nettles · Al Mumin</p></div>
          <div><p className="text-slate-500 text-xs">Sub (Mora Glass)</p><p className="text-white">6-person crew · Week of 6/2</p></div>
        </div>
      </div>
    </div>
  )
}
