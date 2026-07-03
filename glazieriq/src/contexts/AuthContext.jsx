/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

// Full SPS role hierarchy
export const ROLES = {
  ADMIN:             'admin',
  DIRECTOR_OPS:      'director_ops',         // Brian Hogan
  GENERAL_SUPER:     'general_super',        // Pepe Perales
  PROJECT_MANAGER:   'project_manager',
  SUPERINTENDENT:    'superintendent',
  ASST_SUPER:        'asst_super',
  FOREMAN:           'foreman',
  GLAZING_MECHANIC:  'glazing_mechanic',
  HELPER:            'helper',
  SAFETY_COORD:      'safety_coord',
  QC_INSPECTOR:      'qc_inspector',
  SHOP_OPERATOR:     'shop_operator',
  PRODUCTION_MGR:    'production_mgr',
  FAB_MANAGER:       'fab_manager',
  WAREHOUSE_DRIVER:  'warehouse_driver',
  RECRUITER:         'recruiter',            // Rich Rivera
  ESTIMATOR:         'estimator',
  PROJECT_ENGINEER:  'project_engineer',
  SPD:               'spd',                  // isolated workspace
}

// Friendly labels for dropdowns / display
export const ROLE_LABELS = Object.fromEntries(
  Object.values(ROLES).map(r => [r, r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())])
)

// Permission map (role-based). A user with adminGrant === true bypasses this entirely.
const PERMISSIONS = {
  admin_access:        [ROLES.ADMIN, ROLES.DIRECTOR_OPS],
  manage_users:        [ROLES.ADMIN, ROLES.DIRECTOR_OPS],
  view_all_projects:   [ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER, ROLES.PROJECT_MANAGER, ROLES.RECRUITER],
  assign_orders:       [ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.FAB_MANAGER, ROLES.PRODUCTION_MGR],
  claim_machine_queue: [ROLES.SHOP_OPERATOR, ROLES.FAB_MANAGER],
  complete_order:      [ROLES.SHOP_OPERATOR, ROLES.FAB_MANAGER, ROLES.PRODUCTION_MGR],
  view_safety:         Object.values(ROLES),
  manage_safety:       [ROLES.SAFETY_COORD, ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER, ROLES.SUPERINTENDENT],
  manage_crew:         [ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER, ROLES.SUPERINTENDENT, ROLES.RECRUITER],
  approve_time:        [ROLES.DIRECTOR_OPS, ROLES.ADMIN],
  view_qc:             Object.values(ROLES),
  manage_qc:           [ROLES.QC_INSPECTOR, ROLES.SUPERINTENDENT, ROLES.ASST_SUPER, ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER],
  view_drawings:       Object.values(ROLES).filter(r => r !== ROLES.SPD),
  project_messages:    Object.values(ROLES).filter(r => r !== ROLES.SPD),
  issue_weather_alert: [ROLES.SUPERINTENDENT, ROLES.ASST_SUPER, ROLES.GENERAL_SUPER, ROLES.DIRECTOR_OPS, ROLES.SAFETY_COORD, ROLES.ADMIN],
  view_certs:          Object.values(ROLES).filter(r => r !== ROLES.SPD),
  manage_certs:        [ROLES.SAFETY_COORD, ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER, ROLES.RECRUITER],
  view_estimating:     Object.values(ROLES).filter(r => r !== ROLES.SPD),
  manage_estimating:   [ROLES.ESTIMATOR, ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER],
  use_ai_agent:        Object.values(ROLES),
  manage_notes:        Object.values(ROLES),
}

// DB row (snake_case) -> app shape (camelCase)
const mapProfile = (p) => p && ({
  id: p.id, authId: p.auth_id, name: p.name, email: p.email,
  role: p.role, machineNum: p.machine_num, adminGrant: p.admin_grant,
})

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [user, setUser]         = useState(null)   // the signed-in person's profile
  const [users, setUsers]       = useState([])     // full crew roster
  const [loading, setLoading]   = useState(true)   // true until we know if a session exists
  const [authError, setAuthError] = useState(null)

  const loadRoster = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (!error && data) setUsers(data.map(mapProfile))
  }, [])

  const loadMyProfile = useCallback(async (sess) => {
    if (!sess?.user) { setUser(null); return }
    // Profile is linked to the login by the signup trigger; look it up.
    let { data } = await supabase.from('profiles').select('*').eq('auth_id', sess.user.id).maybeSingle()
    if (!data) {
      // Trigger may not have run yet on a brand-new signup — brief retry by email.
      const byEmail = await supabase.from('profiles').select('*').ilike('email', sess.user.email).maybeSingle()
      data = byEmail.data
    }
    setUser(mapProfile(data))
  }, [])

  // Watch the session: fires on load, sign-in, sign-out, token refresh
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      Promise.all([loadMyProfile(session), session ? loadRoster() : Promise.resolve()])
        .finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) { loadMyProfile(session); loadRoster() }
      else setUser(null)
    })
    return () => subscription.unsubscribe()
  }, [loadMyProfile, loadRoster])

  // ---- Auth actions ----
  const login = async (email, password) => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setAuthError(error.message); return false }
    return true
  }

  const signUp = async (name, email, password) => {
    setAuthError(null)
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: name.trim() } },
    })
    if (error) { setAuthError(error.message); return false }
    return true
  }

  const logout = () => supabase.auth.signOut()

  // ---- Permissions ----
  const userCan = (permission) => {
    if (!user) return false
    if (user.adminGrant) return true            // full-site admin override
    const allowed = PERMISSIONS[permission]
    if (!allowed) return false
    return allowed.includes(user.role)
  }

  // ---- User management (Admin) — writes to the profiles table ----
  const grantAdmin = async (id) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, adminGrant: true } : u))
    await supabase.from('profiles').update({ admin_grant: true }).eq('id', id)
  }
  const revokeAdmin = async (id) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, adminGrant: false } : u))
    await supabase.from('profiles').update({ admin_grant: false }).eq('id', id)
  }

  const addUser = async ({ name, role, email }) => {
    const { data, error } = await supabase.from('profiles')
      .insert({ name, role, email })
      .select().single()
    if (error) { console.error('addUser:', error.message); return null }
    const p = mapProfile(data)
    setUsers(us => [...us, p])
    return p.id
  }

  const updateUser = async (id, patch) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u))
    const dbPatch = {}
    if ('name' in patch)       dbPatch.name = patch.name
    if ('email' in patch)      dbPatch.email = patch.email
    if ('role' in patch)       dbPatch.role = patch.role
    if ('machineNum' in patch) dbPatch.machine_num = patch.machineNum
    if ('adminGrant' in patch) dbPatch.admin_grant = patch.adminGrant
    if (Object.keys(dbPatch).length) await supabase.from('profiles').update(dbPatch).eq('id', id)
  }

  const removeUser = async (id) => {
    if (user && id === user.id) return // never delete the active session user
    setUsers(us => us.filter(u => u.id !== id))
    await supabase.from('profiles').delete().eq('id', id)
  }

  return (
    <AuthContext.Provider value={{
      user, users, session, loading, authError,
      login, signUp, logout, userCan,
      grantAdmin, revokeAdmin, addUser, updateUser, removeUser,
      // legacy alias so older components keep working
      DEMO_USERS: users,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
