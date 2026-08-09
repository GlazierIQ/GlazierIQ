import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import Sidebar from './components/Sidebar'
import NotificationBell from './components/NotificationBell'
import Dashboard from './pages/Dashboard'
import QCPage from './pages/QCPage'
import DrawingsPage from './pages/DrawingsPage'
import CrewPage from './pages/CrewPage'
import WeatherPage from './pages/WeatherPage'
import GCPage from './pages/GCPage'
import AdminPage from './pages/AdminPage'
import SafetyPage from './pages/SafetyPage'
import EstimatorPage from './pages/EstimatorPage'
import NotesPage from './pages/NotesPage'
import PanelPassportPage from './pages/PanelPassportPage'
import AIAgent from './components/AIAgent'
import LoginPage from './pages/LoginPage'
import { Loader2 } from 'lucide-react'
import {
  OrdersPage, MachineQueuePage,
  TimePage, LogisticsPage, CloseoutPage
} from './pages/StubPages'

function TopBar() {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-30 flex items-center justify-end gap-3 px-5 h-14 bg-slate-950/80 backdrop-blur border-b border-slate-800">
      <NotificationBell />
      <div className="flex items-center gap-2 pl-1">
        <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
          <span className="text-amber-400 text-xs font-bold">{user?.name?.[0]}</span>
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-white text-xs font-medium">{user?.name}</p>
          <p className="text-slate-500 text-[11px]">{user?.role.replace(/_/g, ' ')}{user?.adminGrant ? ' · admin' : ''}</p>
        </div>
      </div>
    </header>
  )
}

function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 overflow-y-auto min-w-0">
        <TopBar />
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/estimating" element={<EstimatorPage />} />
          <Route path="/orders"    element={<OrdersPage />} />
          <Route path="/queue"     element={<MachineQueuePage />} />
          <Route path="/qc"        element={<QCPage />} />
          <Route path="/drawings"  element={<DrawingsPage />} />
          <Route path="/safety"    element={<SafetyPage />} />
          <Route path="/crew"      element={<CrewPage />} />
          <Route path="/weather"   element={<WeatherPage />} />
          <Route path="/time"      element={<TimePage />} />
          <Route path="/gc"        element={<GCPage />} />
          <Route path="/closeout"  element={<CloseoutPage />} />
          <Route path="/logistics" element={<LogisticsPage />} />
          <Route path="/notes"     element={<NotesPage />} />
          <Route path="/passports" element={<PanelPassportPage />} />
          <Route path="/admin"     element={<AdminPage />} />
        </Routes>
      </main>
      <AIAgent />
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center">
          <span className="text-slate-900 font-black text-sm">GIQ</span>
        </div>
        <Loader2 size={18} className="text-amber-400 animate-spin" />
      </div>
    )
  }
  if (!user) return <LoginPage />
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Gate />
      </DataProvider>
    </AuthProvider>
  )
}
