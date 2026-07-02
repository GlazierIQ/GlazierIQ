import { createContext, useContext, useState, useEffect } from 'react'

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

// Seed users — first run only; afterwards loaded from localStorage
const SEED_USERS = [
  { id: 1,  name: 'Rich Rivera',     role: ROLES.RECRUITER,       email: 'rich@spscorp.com',   machineNum: null, adminGrant: false },
  { id: 2,  name: 'Brian Hogan',     role: ROLES.DIRECTOR_OPS,    email: 'brian@spscorp.com',  machineNum: null, adminGrant: true  },
  { id: 3,  name: 'Pepe Perales',    role: ROLES.GENERAL_SUPER,   email: 'pepe@spscorp.com',   machineNum: null, adminGrant: false },
  { id: 4,  name: 'John Kimbal',     role: ROLES.PROJECT_MANAGER, email: 'john@spscorp.com',   machineNum: null, adminGrant: false },
  { id: 5,  name: 'Bill Nettles',    role: ROLES.SUPERINTENDENT,  email: 'bill@spscorp.com',   machineNum: null, adminGrant: false },
  { id: 6,  name: 'Sultan Al Mumin', role: ROLES.ASST_SUPER,      email: 'sultan@spscorp.com', machineNum: null, adminGrant: false },
  { id: 7,  name: 'Rhino Op 1',      role: ROLES.SHOP_OPERATOR,   email: 'op1@spscorp.com',    machineNum: 1,    adminGrant: false },
  { id: 8,  name: 'Rhino Op 2',      role: ROLES.SHOP_OPERATOR,   email: 'op2@spscorp.com',    machineNum: 2,    adminGrant: false },
  { id: 9,  name: 'Rhino Op 3',      role: ROLES.SHOP_OPERATOR,   email: 'op3@spscorp.com',    machineNum: 3,    adminGrant: false },
  { id: 10, name: 'QC Inspector',    role: ROLES.QC_INSPECTOR,    email: 'qc@spscorp.com',     machineNum: null, adminGrant: false },
  { id: 11, name: 'Safety Coord',    role: ROLES.SAFETY_COORD,    email: 'safety@spscorp.com', machineNum: null, adminGrant: false },
  { id: 12, name: 'Fab Manager',     role: ROLES.FAB_MANAGER,     email: 'fab@spscorp.com',    machineNum: null, adminGrant: false },
  { id: 13, name: 'Dana Estimator',  role: ROLES.ESTIMATOR,       email: 'est@spscorp.com',    machineNum: null, adminGrant: false },
]

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
  // Internal per-project messaging — open to the field + project leadership
  project_messages:    Object.values(ROLES).filter(r => r !== ROLES.SPD),
  issue_weather_alert: [ROLES.SUPERINTENDENT, ROLES.ASST_SUPER, ROLES.GENERAL_SUPER, ROLES.DIRECTOR_OPS, ROLES.SAFETY_COORD, ROLES.ADMIN],
  // Certifications — viewing is broad; managing/renewing limited to safety + leadership
  view_certs:          Object.values(ROLES).filter(r => r !== ROLES.SPD),
  manage_certs:        [ROLES.SAFETY_COORD, ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER, ROLES.RECRUITER],
  // Estimating board — everyone can watch the bid board light up
  view_estimating:     Object.values(ROLES).filter(r => r !== ROLES.SPD),
  // Awarding / assigning a PM to a project — estimator + leadership
  manage_estimating:   [ROLES.ESTIMATOR, ROLES.ADMIN, ROLES.DIRECTOR_OPS, ROLES.GENERAL_SUPER],
  // The live AI agent + personal notes — available to the whole company
  use_ai_agent:        Object.values(ROLES),
  manage_notes:        Object.values(ROLES),
}

const USERS_KEY = 'giq_users'
const CURRENT_KEY = 'giq_current_user'

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* ignore */ }
  return SEED_USERS
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(loadUsers)
  const [currentUserId, setCurrentUserId] = useState(() => {
    const saved = Number(localStorage.getItem(CURRENT_KEY))
    return saved || 1 // Default: Rich Rivera
  })

  // Persist
  useEffect(() => { localStorage.setItem(USERS_KEY, JSON.stringify(users)) }, [users])
  useEffect(() => { localStorage.setItem(CURRENT_KEY, String(currentUserId)) }, [currentUserId])

  const user = users.find(u => u.id === currentUserId) || users[0]

  const login = (userId) => setCurrentUserId(Number(userId))

  const userCan = (permission) => {
    if (!user) return false
    if (user.adminGrant) return true            // full-site admin override
    const allowed = PERMISSIONS[permission]
    if (!allowed) return false
    return allowed.includes(user.role)
  }

  // --- User management (Admin) ---
  const grantAdmin  = (id) => setUsers(us => us.map(u => u.id === id ? { ...u, adminGrant: true }  : u))
  const revokeAdmin = (id) => setUsers(us => us.map(u => u.id === id ? { ...u, adminGrant: false } : u))

  const addUser = ({ name, role, email }) => {
    const id = Math.max(0, ...users.map(u => u.id)) + 1
    setUsers(us => [...us, { id, name, role, email, machineNum: null, adminGrant: false }])
    return id
  }

  const updateUser = (id, patch) =>
    setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u))

  const removeUser = (id) => {
    if (id === currentUserId) return // never delete the active session user
    setUsers(us => us.filter(u => u.id !== id))
  }

  const resetUsers = () => { setUsers(SEED_USERS); setCurrentUserId(1) }

  return (
    <AuthContext.Provider value={{
      user, users, login, userCan,
      grantAdmin, revokeAdmin, addUser, updateUser, removeUser, resetUsers,
      // legacy alias so older components keep working
      DEMO_USERS: users,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
