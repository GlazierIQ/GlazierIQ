import { useState } from 'react'
import { Mail, Link, Bell, Factory, Save, Users, ShieldCheck, ShieldOff, UserPlus, Trash2 } from 'lucide-react'
import { useAuth, ROLES, ROLE_LABELS } from '../contexts/AuthContext'

const ADMIN_TABS = [
  { id: 'users',        label: 'Users & Access',    icon: Users },
  { id: 'machines',     label: 'Machine Emails',    icon: Factory },
  { id: 'distribution', label: 'Distribution Lists', icon: Mail },
  { id: 'integrations', label: 'Integrations',      icon: Link },
  { id: 'notifications', label: 'Notifications',     icon: Bell },
]

// ---------- Users & Access ----------
function UsersTab() {
  const { user, users, grantAdmin, revokeAdmin, addUser, removeUser } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: ROLES.HELPER })

  const submitNew = () => {
    if (!form.name.trim() || !form.email.trim()) return
    addUser({ name: form.name.trim(), email: form.email.trim(), role: form.role })
    setForm({ name: '', email: '', role: ROLES.HELPER }); setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm max-w-lg">
          Manage platform users. Granting full-site admin gives a department head access to every module and all notifications — use sparingly.
        </p>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition shrink-0">
          <UserPlus size={14} /> Add User
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400">
              {Object.values(ROLES).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button onClick={submitNew} className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition">Create User</button>
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl divide-y divide-slate-700/40">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-400 text-xs font-bold">{u.name[0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium truncate">{u.name}</p>
                {u.adminGrant && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/20">FULL ADMIN</span>}
                {u.id === user.id && <span className="text-[10px] text-slate-500">(you)</span>}
              </div>
              <p className="text-slate-500 text-xs truncate">{ROLE_LABELS[u.role] || u.role} · {u.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {u.adminGrant ? (
                <button onClick={() => revokeAdmin(u.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition">
                  <ShieldOff size={12} /> Revoke Admin
                </button>
              ) : (
                <button onClick={() => grantAdmin(u.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-amber-400/30 text-amber-300 hover:bg-amber-400/10 transition">
                  <ShieldCheck size={12} /> Grant Admin
                </button>
              )}
              {u.id !== user.id && (
                <button onClick={() => { if (confirm(`Remove ${u.name}?`)) removeUser(u.id) }}
                  title="Remove user"
                  className="p-1.5 text-slate-500 hover:text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Preserved config tabs ----------
function MachinesTab() {
  const [machines, setMachines] = useState([
    { id: 1, name: 'Rhino 1', email: 'rhino1@spscorp.com', op: 'Rhino Op 1', active: true },
    { id: 2, name: 'Rhino 2', email: 'rhino2@spscorp.com', op: 'Rhino Op 2', active: true },
    { id: 3, name: 'Rhino 3', email: 'rhino3@spscorp.com', op: 'Rhino Op 3', active: true },
  ])
  const update = (id, field, val) => setMachines(m => m.map(x => x.id === id ? { ...x, [field]: val } : x))
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Each Rhino machine operator receives order assignments by email. Configure machine name, assigned email, and operator.</p>
      {machines.map(m => (
        <div key={m.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Factory size={14} className="text-amber-400" />
            <input value={m.name} onChange={e => update(m.id, 'name', e.target.value)}
              className="bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-amber-400" />
            <label className="ml-auto flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={m.active} onChange={e => update(m.id, 'active', e.target.checked)} className="accent-amber-400" /> Active
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Machine Email</label>
              <input value={m.email} onChange={e => update(m.id, 'email', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Operator Name</label>
              <input value={m.op} onChange={e => update(m.id, 'op', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition"><Save size={13} /> Save Machine Config</button>
    </div>
  )
}

function DistributionTab() {
  const TRIGGERS = [
    { id: 'order_complete', label: 'Order Complete / Ship Notification', recipients: ['Project Manager', 'General Superintendent', 'Superintendent', 'Production Manager', 'Fabrication Manager'] },
    { id: 'qc_fail', label: 'QC Failure Alert', recipients: ['Project Manager', 'General Superintendent', 'Superintendent', 'Asst. Superintendent'] },
    { id: 'safety_alert', label: 'Safety Violation Alert', recipients: ['Director of Field Operations', 'General Superintendent', 'Safety Coordinator'] },
    { id: 'weather_stop', label: 'Storm / Stop-Work Alert', recipients: ['Project Manager', 'General Superintendent', 'Superintendent', 'Foreman', 'Safety Coordinator'] },
  ]
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Automatic alerts fire on each trigger below. Recipients are determined by project role assignment.</p>
      {TRIGGERS.map(t => (
        <div key={t.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-white font-medium text-sm mb-2">{t.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {t.recipients.map(r => <span key={r} className="text-xs px-2 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-300 rounded-full">{r}</span>)}
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition"><Save size={13} /> Save Distribution</button>
    </div>
  )
}

function IntegrationsTab() {
  const INTEGRATIONS = [
    { name: 'Procore', desc: 'Project management & document control', color: 'orange' },
    { name: 'Bluebeam', desc: 'Drawing markup & PDF collaboration', color: 'blue' },
    { name: 'Plexxis', desc: 'Glazing industry ERP & estimating', color: 'green' },
    { name: 'SmartBarrel', desc: 'Field workforce management', color: 'purple' },
  ]
  const colorMap = { orange: 'bg-orange-400/10 text-orange-400 border-orange-400/20', blue: 'bg-blue-400/10 text-blue-400 border-blue-400/20', green: 'bg-green-400/10 text-green-400 border-green-400/20', purple: 'bg-purple-400/10 text-purple-400 border-purple-400/20' }
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Third-party integrations. Connect via API key or OAuth. Contact each platform's developer portal for credentials.</p>
      {INTEGRATIONS.map(i => (
        <div key={i.name} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-bold ${colorMap[i.color]}`}>{i.name[0]}</div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{i.name}</p>
            <p className="text-slate-500 text-xs">{i.desc}</p>
          </div>
          <div className="text-right space-y-1">
            <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">Pending Setup</span>
            <div><input placeholder="API Key or Webhook URL" className="w-48 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-400" /></div>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition"><Save size={13} /> Save Integration Config</button>
    </div>
  )
}

function NotificationsTab() {
  const [settings, setSettings] = useState({ weekly_day: 'Monday', weekly_time: '06:00' })
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <h3 className="text-white font-medium text-sm">Email Triggers</h3>
        {['Order assigned to machine', 'Order in production', 'Order QC passed', 'Order ready to ship', 'Order delivered', 'QC failure alert', 'Safety incident flagged', 'Storm / stop-work alert'].map(t => (
          <label key={t} className="flex items-center gap-3 text-slate-300 text-sm cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-amber-400" /> {t}
          </label>
        ))}
      </div>
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <h3 className="text-white font-medium text-sm">Weekly Manpower Report</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Day of Week</label>
            <select value={settings.weekly_day} onChange={e => setSettings(p => ({ ...p, weekly_day: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Send Time</label>
            <input type="time" value={settings.weekly_time} onChange={e => setSettings(p => ({ ...p, weekly_time: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
          </div>
        </div>
        <p className="text-slate-500 text-xs">Sent to Director of Field Operations & Training (Brian Hogan) for approval before release.</p>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition"><Save size={13} /> Save Notification Settings</button>
    </div>
  )
}

export default function AdminPage() {
  const { userCan } = useAuth()
  const [activeTab, setTab] = useState('users')
  if (!userCan('admin_access')) return (
    <div className="p-6 text-center text-slate-500 text-sm">You don't have access to Admin Settings.</div>
  )
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Admin Settings</h1>
        <p className="text-slate-400 text-sm">Users & access, machines, distribution, integrations</p>
      </div>
      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-slate-900 rounded-xl border border-slate-700/60">
        {ADMIN_TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition whitespace-nowrap ${activeTab === t.id ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Icon size={13} />{t.label}
          </button>
        ) })}
      </div>
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'machines' && <MachinesTab />}
      {activeTab === 'distribution' && <DistributionTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
    </div>
  )
}
