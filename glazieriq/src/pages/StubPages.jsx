// Orders page stub
import { useState } from 'react'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const ORDERS = [
  { id:'ORD-041', site:'The Creamery', type:'IGU', qty:12, status:'In Production', machine:'Rhino 2', pm:'John Kimbal', created:'2026-06-01' },
  { id:'ORD-040', site:'Midtown Office', type:'Spandrel', qty:8, status:'QC Pending', machine:'Rhino 1', pm:'TBD', created:'2026-05-31' },
  { id:'ORD-039', site:'Harbor Walk', type:'Storefront', qty:20, status:'Ready to Ship', machine:'Rhino 3', pm:'TBD', created:'2026-05-30' },
  { id:'ORD-038', site:'River District', type:'Curtain Wall', qty:5, status:'Shipped', machine:'Rhino 1', pm:'TBD', created:'2026-05-28' },
]

const STATUS_COLOR = {
  'In Production': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'QC Pending':    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Ready to Ship': 'text-green-400 bg-green-400/10 border-green-400/20',
  'Shipped':       'text-slate-400 bg-slate-700/40 border-slate-600/40',
}

export function OrdersPage() {
  const { userCan } = useAuth()
  const [search, setSearch] = useState('')
  const filtered = ORDERS.filter(o => o.id.toLowerCase().includes(search.toLowerCase()) || o.site.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-white text-xl font-semibold">Orders</h1><p className="text-slate-400 text-sm">Internal order management — SPS production only</p></div>
        {userCan('assign_orders') && <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm rounded-lg transition"><Plus size={13}/>New Order</button>}
      </div>
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400"/>
      </div>
      <div className="space-y-2">
        {filtered.map(o => (
          <div key={o.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <div className="font-mono text-sm text-white w-20">{o.id}</div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{o.site}</p>
              <p className="text-slate-500 text-xs">{o.type} · Qty {o.qty} · {o.machine}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[o.status]}`}>{o.status}</span>
            <span className="text-slate-600 text-xs">{o.created}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Machine Queue stub
import { Factory } from 'lucide-react'
export function MachineQueuePage() {
  const MACHINES = [
    { id:1, name:'Rhino 1', op:'Rhino Op 1', orders:[{id:'ORD-040',site:'Midtown Office',status:'In Production'}] },
    { id:2, name:'Rhino 2', op:'Rhino Op 2', orders:[{id:'ORD-041',site:'The Creamery',status:'In Production'},{id:'ORD-042',site:'Harbor Walk',status:'Queued'}] },
    { id:3, name:'Rhino 3', op:'Rhino Op 3', orders:[] },
  ]
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-white text-xl font-semibold">Machine Queue</h1><p className="text-slate-400 text-sm">Rhino 1 · 2 · 3 — real-time order assignment</p></div>
      <div className="grid md:grid-cols-3 gap-4">
        {MACHINES.map(m => (
          <div key={m.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Factory size={15} className="text-amber-400"/>
              <span className="text-white font-semibold text-sm">{m.name}</span>
              <span className="ml-auto text-slate-500 text-xs">{m.op}</span>
            </div>
            <div className="space-y-2">
              {m.orders.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Queue empty</p>}
              {m.orders.map(o => (
                <div key={o.id} className="p-2 bg-slate-900/50 rounded-lg">
                  <p className="text-white text-xs font-mono">{o.id}</p>
                  <p className="text-slate-400 text-xs">{o.site}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${o.status==='In Production'?'bg-amber-400/10 text-amber-400':'bg-slate-700 text-slate-400'}`}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Safety page now lives in its own file: src/pages/SafetyPage.jsx

// Time & Cost stub
import { Clock } from 'lucide-react'
export function TimePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-white text-xl font-semibold">Time & Cost Tracker</h1><p className="text-slate-400 text-sm">Hours by site, weekly rollup, Director approval</p></div>
      <div className="grid grid-cols-3 gap-4">
        {[['Total Hours This Week','312','hrs'],['Pending Approval','4','entries'],['Estimated Labor Cost','$18,720','est.']].map(([l,v,u])=>(
          <div key={l} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-xs">{l}</p>
            <p className="text-2xl font-bold text-white mt-1">{v} <span className="text-sm text-slate-500">{u}</span></p>
          </div>
        ))}
      </div>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <h2 className="text-white font-medium text-sm mb-3">This Week by Site</h2>
        {[['The Creamery','9 crew','112 hrs'],['Midtown Office','4 crew','52 hrs'],['Harbor Walk','3 crew','39 hrs'],['Shop — Rhino Ops','3 ops','109 hrs']].map(([s,c,h])=>(
          <div key={s} className="flex items-center gap-4 py-2 border-b border-slate-700/30 last:border-0">
            <p className="text-white text-sm flex-1">{s}</p>
            <p className="text-slate-400 text-xs">{c}</p>
            <p className="text-amber-400 text-sm font-medium">{h}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Logistics stub
import { Truck, Package } from 'lucide-react'
export function LogisticsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-white text-xl font-semibold">Logistics</h1><p className="text-slate-400 text-sm">Shipping workflow, driver sign-off, delivery confirmation</p></div>
      <div className="space-y-3">
        {[
          {id:'SHIP-039',order:'ORD-039',site:'Harbor Walk',status:'Pending Driver',driver:'',eta:'2026-06-02'},
          {id:'SHIP-038',order:'ORD-038',site:'River District',status:'Delivered',driver:'Mike R.',eta:'2026-05-28',actual:'2026-05-28'},
        ].map(s=>(
          <div key={s.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <Truck size={16} className={s.status==='Delivered'?'text-green-400':'text-amber-400'}/>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{s.id} · {s.order}</p>
              <p className="text-slate-400 text-xs">{s.site} · ETA {s.eta}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status==='Delivered'?'bg-green-400/10 text-green-400 border-green-400/20':'bg-amber-400/10 text-amber-400 border-amber-400/20'}`}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Project Closeout stub
import { FolderKanban } from 'lucide-react'
export function CloseoutPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-white text-xl font-semibold">Project Close-Out</h1><p className="text-slate-400 text-sm">Final documentation, punch list, and close-out package generation</p></div>
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4 text-amber-300 text-sm">
        The Creamery · 25-0628 — project in progress. Close-out package will be generated upon project completion.
      </div>
      <div className="space-y-2">
        {[['Final walkthrough & punch list','pending'],['As-built drawings submitted','pending'],['Warranty documents filed','pending'],['Lien waiver executed','pending'],['Owner acceptance sign-off','pending'],['Close-out PDF package generated','pending']].map(([item,status])=>(
          <div key={item} className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg">
            <div className={`w-4 h-4 rounded border-2 ${status==='complete'?'bg-green-400 border-green-400':'border-slate-600'}`}/>
            <span className="text-slate-300 text-sm flex-1">{item}</span>
            <span className={`text-xs ${status==='complete'?'text-green-400':'text-slate-600'}`}>{status}</span>
          </div>
        ))}
      </div>
      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">Generate Close-Out PDF</button>
    </div>
  )
}
