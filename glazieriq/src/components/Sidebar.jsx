import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, ClipboardList, Factory, ScanLine, FileText,
  ShieldCheck, Users, CloudSun, Clock, MessageSquare, FolderKanban,
  Settings, Truck, ChevronRight, ShieldAlert, TrendingUp, StickyNote, LogOut , BadgeCheck
} from 'lucide-react'

const NAV = [
  { to: '/',            label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/estimating',  label: 'Estimating',         icon: TrendingUp, perm: 'view_estimating' },
  { to: '/orders',      label: 'Orders',             icon: ClipboardList },
  { to: '/queue',       label: 'Machine Queue',      icon: Factory },
  { to: '/qc',          label: 'Panel Scan / QC',    icon: ScanLine },
  { to: '/passports',   label: 'Panel Passports',    icon: BadgeCheck },
  { to: '/drawings',    label: 'Drawing Assistant',  icon: FileText },
  { to: '/safety',      label: 'Safety',             icon: ShieldCheck },
  { to: '/crew',        label: 'Crew Management',    icon: Users },
  { to: '/weather',     label: 'Weather & Lift',     icon: CloudSun },
  { to: '/time',        label: 'Time & Cost',        icon: Clock },
  { to: '/gc',          label: 'Project Comms',      icon: MessageSquare },
  { to: '/closeout',    label: 'Project Close-Out',  icon: FolderKanban },
  { to: '/logistics',   label: 'Logistics',          icon: Truck },
  { to: '/notes',       label: 'Notes',              icon: StickyNote },
  { to: '/admin',       label: 'Admin Settings',     icon: Settings },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout, userCan } = useAuth()
  const nav = NAV.filter(n => !n.perm || userCan(n.perm))

  return (
    <div className={`flex flex-col bg-slate-900 border-r border-slate-700/50 h-screen sticky top-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/50">
        <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
          <span className="text-slate-900 font-black text-xs">GIQ</span>
        </div>
        {!collapsed && <span className="text-white font-bold text-sm tracking-wide">GlazierIQ</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-slate-500 hover:text-white">
          <ChevronRight size={14} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition group
               ${isActive
                 ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                 : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
            }>
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Signed-in user + sign out */}
      {!collapsed && user && (
        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <span className="text-amber-400 text-xs font-bold">{user.name[0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-slate-500 text-xs truncate">{user.role.replace(/_/g, ' ')}</p>
            </div>
            {user.adminGrant && (
              <span title="Full-site admin" className="flex items-center text-amber-400">
                <ShieldAlert size={13} />
              </span>
            )}
          </div>
          <button onClick={logout}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-300 text-xs transition">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      )}
      {collapsed && user && (
        <div className="p-2 border-t border-slate-700/50 flex justify-center">
          <button onClick={logout} title="Sign out" className="text-slate-500 hover:text-white p-1.5">
            <LogOut size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
