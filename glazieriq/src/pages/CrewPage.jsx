import { useState } from 'react'
import { Users, Plus, ChevronDown, Mail, Phone, Award, MapPin, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CREW = [
  // SPS Team
  { id: 1, name: 'John Kimbal',     role: 'Project Manager',     company: 'SPS',       site: 'The Creamery', status: 'active',  phone: '', email: 'john@spscorp.com',   cert: ['OSHA-30','SSPC'], start: '2022-03-01' },
  { id: 2, name: 'Bill Nettles',    role: 'Superintendent',       company: 'SPS',       site: 'The Creamery', status: 'active',  phone: '', email: 'bill@spscorp.com',   cert: ['OSHA-30','Forklift'], start: '2019-06-15' },
  { id: 3, name: 'Sultan Al Mumin', role: 'Asst. Superintendent', company: 'SPS',       site: 'The Creamery', status: 'active',  phone: '', email: 'sultan@spscorp.com', cert: ['OSHA-10'], start: '2023-01-10' },
  // Mora Glass crew (names TBD)
  { id: 4, name: 'Mora Glass — Op 1',role: 'Glazing Mechanic',   company: 'Mora Glass', site: 'The Creamery', status: 'active',  phone: '', email: '', cert: [], start: '2026-05-26' },
  { id: 5, name: 'Mora Glass — Op 2',role: 'Glazing Mechanic',   company: 'Mora Glass', site: 'The Creamery', status: 'active',  phone: '', email: '', cert: [], start: '2026-05-26' },
  { id: 6, name: 'Mora Glass — Op 3',role: 'Glazing Mechanic',   company: 'Mora Glass', site: 'The Creamery', status: 'active',  phone: '', email: '', cert: [], start: '2026-05-26' },
  { id: 7, name: 'Mora Glass — Op 4',role: 'Helper',             company: 'Mora Glass', site: 'The Creamery', status: 'active',  phone: '', email: '', cert: [], start: '2026-05-26' },
  { id: 8, name: 'Mora Glass — Op 5',role: 'Helper',             company: 'Mora Glass', site: 'The Creamery', status: 'active',  phone: '', email: '', cert: [], start: '2026-05-26' },
  { id: 9, name: 'Mora Glass — Op 6',role: 'Helper',             company: 'Mora Glass', site: 'The Creamery', status: 'active',  phone: '', email: '', cert: [], start: '2026-05-26' },
]

const ROLE_COLORS = {
  'Project Manager': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Superintendent': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'Asst. Superintendent': 'text-amber-300 bg-amber-300/10 border-amber-300/20',
  'Glazing Mechanic': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Helper': 'text-slate-400 bg-slate-400/10 border-slate-400/20',
}

const COMPANY_COLOR = {
  'SPS': 'text-amber-400',
  'Mora Glass': 'text-blue-400',
}

export default function CrewPage() {
  const { userCan } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const canManage = userCan('manage_crew')

  const filtered = CREW.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.company === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Crew Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">All personnel by project — The Creamery · 25-0628</p>
        </div>
        {canManage && (
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition">
            <Plus size={14}/> Add Member
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search crew…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400" />
        </div>
        {['all','SPS','Mora Glass'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === f ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-slate-400 hover:text-white bg-slate-800 border border-slate-700'}`}>
            {f === 'all' ? 'All Companies' : f}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{CREW.filter(c => c.company === 'SPS').length}</p>
          <p className="text-slate-400 text-xs">SPS Personnel</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{CREW.filter(c => c.company === 'Mora Glass').length}</p>
          <p className="text-slate-400 text-xs">Mora Glass Crew</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{CREW.length}</p>
          <p className="text-slate-400 text-xs">Total Headcount</p>
        </div>
      </div>

      {/* Mora Glass notice */}
      <div className="flex items-center gap-2 p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg text-sm text-amber-300">
        <span className="text-amber-400">⚠</span> Mora Glass crew names are pending — update individual records when roster is provided.
      </div>

      {/* Crew list */}
      <div className="space-y-2">
        {filtered.map(member => (
          <div key={member.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">{member.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm">{member.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[member.role] || 'text-slate-400 bg-slate-700 border-slate-600'}`}>{member.role}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`text-xs font-medium ${COMPANY_COLOR[member.company]}`}>{member.company}</span>
                <span className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={10}/>{member.site}</span>
                {member.email && <span className="text-slate-500 text-xs flex items-center gap-1"><Mail size={10}/>{member.email}</span>}
              </div>
            </div>
            {member.cert.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {member.cert.map(c => (
                  <span key={c} className="text-xs px-1.5 py-0.5 bg-green-400/10 text-green-400 border border-green-400/20 rounded">{c}</span>
                ))}
              </div>
            )}
            {canManage && (
              <button className="px-2 py-1 text-slate-500 hover:text-white text-xs border border-slate-700 rounded-lg hover:bg-slate-700 transition">Edit</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
