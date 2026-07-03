import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Mail, User, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login, signUp, authError } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const submit = async () => {
    if (busy) return
    setNotice(null)
    if (!email.trim() || !password) { setNotice('Enter your email and password.'); return }
    if (mode === 'signup' && !name.trim()) { setNotice('Enter your name.'); return }
    setBusy(true)
    if (mode === 'signin') {
      await login(email, password)
    } else {
      const ok = await signUp(name, email, password)
      if (ok) setNotice('Account created. If you are not signed in automatically, check your email to confirm, then sign in.')
    }
    setBusy(false)
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center">
            <span className="text-slate-900 font-black text-sm">GIQ</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-wide leading-tight">GlazierIQ</p>
            <p className="text-slate-500 text-xs">Field Operations Platform</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <h1 className="text-white font-semibold text-base">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h1>

          {mode === 'signup' && (
            <label className="block">
              <span className="text-slate-400 text-xs">Full name</span>
              <div className="mt-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 focus-within:border-amber-400">
                <User size={14} className="text-slate-500 flex-shrink-0" />
                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}
                  placeholder="Bill Nettles" autoComplete="name"
                  className="w-full bg-transparent py-2 text-white text-sm focus:outline-none placeholder:text-slate-600" />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-slate-400 text-xs">Email</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 focus-within:border-amber-400">
              <Mail size={14} className="text-slate-500 flex-shrink-0" />
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
                placeholder="you@spscorp.com" type="email" autoComplete="email"
                className="w-full bg-transparent py-2 text-white text-sm focus:outline-none placeholder:text-slate-600" />
            </div>
          </label>

          <label className="block">
            <span className="text-slate-400 text-xs">Password</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 focus-within:border-amber-400">
              <Lock size={14} className="text-slate-500 flex-shrink-0" />
              <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}
                placeholder="••••••••" type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full bg-transparent py-2 text-white text-sm focus:outline-none placeholder:text-slate-600" />
            </div>
          </label>

          {(notice || authError) && (
            <p className="text-amber-400 text-xs leading-relaxed">{notice || authError}</p>
          )}

          <button onClick={submit} disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-900 font-semibold text-sm rounded-lg py-2.5 transition">
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-slate-500 text-xs text-center">
            {mode === 'signin' ? (
              <>New here?{' '}
                <button onClick={() => { setMode('signup'); setNotice(null) }} className="text-amber-400 hover:underline">Create an account</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setNotice(null) }} className="text-amber-400 hover:underline">Sign in</button>
              </>
            )}
          </p>
        </div>

        <p className="text-slate-600 text-[11px] text-center mt-4">
          Use your company email so your crew profile links automatically.
        </p>
      </div>
    </div>
  )
}
