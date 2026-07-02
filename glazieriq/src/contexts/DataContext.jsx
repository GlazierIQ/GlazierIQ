import { createContext, useContext, useState, useEffect } from 'react'
import { ROLES } from './AuthContext'

const DataContext = createContext(null)

// ---- Seed data ----
export const PROJECTS = [
  { id: 'creamery', name: 'The Creamery',   job: '25-0628', address: '410 Glenwood Ave, Raleigh NC 27603' },
  { id: 'midtown',  name: 'Midtown Office',  job: '25-0441', address: 'Raleigh, NC' },
  { id: 'harbor',   name: 'Harbor Walk',     job: '25-0712', address: 'Raleigh, NC' },
]

// Roles that should receive project-lead alerts (QC fails, weather, etc.)
export const PROJECT_LEADS = [
  ROLES.PROJECT_MANAGER, ROLES.GENERAL_SUPER, ROLES.SUPERINTENDENT, ROLES.ASST_SUPER, ROLES.DIRECTOR_OPS,
]

const SEED_MESSAGES = [
  { id: 'm1', projectId: 'creamery', userId: 5, userName: 'Bill Nettles',  role: ROLES.SUPERINTENDENT, text: 'Mora Glass crew on site, 6 men. Starting Level 33 Area A install per Sheet 103.', ts: Date.now() - 1000 * 60 * 240 },
  { id: 'm2', projectId: 'creamery', userId: 4, userName: 'John Kimbal',   role: ROLES.PROJECT_MANAGER, text: 'Copy. Coping material for Level 37 ships Thursday — confirm lift availability.', ts: Date.now() - 1000 * 60 * 180 },
  { id: 'm3', projectId: 'creamery', userId: 6, userName: 'Sultan Al Mumin', role: ROLES.ASST_SUPER,    text: 'Lift booked through Friday. Will stage North coping on Level 37 deck.', ts: Date.now() - 1000 * 60 * 90 },
]

const SEED_QC = [
  { id: 'QC-2026-041', projectId: 'creamery', system: 'Curtain Wall — Level 33 Area A',  inspector: 'QC Inspector', result: 'pass', items: [], notes: 'Edges clean, coating uniform, dimensions within tolerance.', ts: Date.now() - 1000 * 60 * 60 * 20, resolved: false },
  { id: 'QC-2026-040', projectId: 'midtown',  system: 'Storefront — Entry A',            inspector: 'QC Inspector', result: 'fail', items: ['Sealant joint — voids at sill', 'Glass — surface scratch top-right'], notes: 'Scratch 3" at top-right. Reorder + re-tool sealant.', ts: Date.now() - 1000 * 60 * 60 * 44, resolved: false },
]

// Helper: a date N days from now as an ISO yyyy-mm-dd string (keeps demo states stable)
const DAY = 1000 * 60 * 60 * 24
const dateIn = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10)

// ---- Certifications (expiry tracking + AI reminder engine) ----
const SEED_CERTS = [
  // userId links to AuthContext seed users so reminders route to the person
  { id: 'C-101', userId: 4, userName: 'John Kimbal',     email: 'john@spscorp.com',   certType: 'OSHA-30',        issuer: 'OSHA',          issued: '2021-08-12', expires: dateIn(83),  renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-102', userId: 5, userName: 'Bill Nettles',    email: 'bill@spscorp.com',   certType: 'OSHA-30',        issuer: 'OSHA',          issued: '2021-06-15', expires: dateIn(21),  renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-103', userId: 5, userName: 'Bill Nettles',    email: 'bill@spscorp.com',   certType: 'Forklift / Telehandler', issuer: 'SPS Internal', issued: '2024-02-01', expires: dateIn(9),   renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-104', userId: 6, userName: 'Sultan Al Mumin', email: 'sultan@spscorp.com', certType: 'OSHA-10',        issuer: 'OSHA',          issued: '2023-01-10', expires: dateIn(140), renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-105', userId: 6, userName: 'Sultan Al Mumin', email: 'sultan@spscorp.com', certType: 'Aerial / Scissor Lift',  issuer: 'IPAF',     issued: '2023-04-22', expires: dateIn(-6),  renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-106', userId: 11, userName: 'Safety Coord',   email: 'safety@spscorp.com', certType: 'First Aid / CPR', issuer: 'Red Cross',     issued: '2024-05-01', expires: dateIn(54),  renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-107', userId: 11, userName: 'Safety Coord',   email: 'safety@spscorp.com', certType: 'OSHA-500 (Trainer)', issuer: 'OSHA',      issued: '2022-09-15', expires: dateIn(28),  renewed: false, lastReminderTs: null, reminderCount: 0 },
  { id: 'C-108', userId: 7, userName: 'Rhino Op 1',      email: 'op1@spscorp.com',    certType: 'Forklift / Telehandler', issuer: 'SPS Internal', issued: '2024-03-01', expires: dateIn(210), renewed: false, lastReminderTs: null, reminderCount: 0 },
]

// ---- Estimating / bid board ----
const SEED_BIDS = [
  { id: 'B-301', name: 'The Creamery',      job: '25-0628', address: '410 Glenwood Ave, Raleigh NC', client: 'Hoffman & Assoc.', gc: 'Brasfield & Gorrie', value: 2450000, bidDate: '2025-04-18', status: 'awarded', pmId: 4, awardedTs: Date.now() - DAY * 40, estimator: 'Dana Estimator' },
  { id: 'B-302', name: 'Midtown Office Tower', job: '25-0441', address: 'Raleigh, NC',             client: 'Kane Realty',     gc: 'Clancy & Theys',     value: 3870000, bidDate: '2025-05-02', status: 'awarded', pmId: null, awardedTs: Date.now() - DAY * 12, estimator: 'Dana Estimator' },
  { id: 'B-303', name: 'Harbor Walk Mixed-Use', job: '25-0712', address: 'Wilmington, NC',         client: 'East West Partners', gc: 'Monteith',        value: 1620000, bidDate: '2025-06-01', status: 'pending', pmId: null, awardedTs: null, estimator: 'Dana Estimator' },
  { id: 'B-304', name: 'Fort Wayne Medical', job: '25-0733', address: 'Fort Wayne, IN',           client: 'Parkview Health', gc: 'Weigand',            value: 2980000, bidDate: '2025-06-10', status: 'pending', pmId: null, awardedTs: null, estimator: 'Dana Estimator' },
  { id: 'B-305', name: 'Charlotte Tech Campus B', job: '25-0698', address: 'Charlotte, NC',        client: 'Childress Klein', gc: 'Rodgers',            value: 5240000, bidDate: '2025-05-20', status: 'lost', pmId: null, awardedTs: null, estimator: 'Dana Estimator' },
]

const NOTI_KEY = 'giq_notifications'
const MSG_KEY  = 'giq_messages'
const QC_KEY   = 'giq_qc'
const WX_KEY   = 'giq_weather_alerts'
const CERT_KEY = 'giq_certs'
const BID_KEY  = 'giq_bids'
const NOTE_KEY = 'giq_notes'
const OBS_KEY  = 'giq_observations'
const EMAIL_KEY = 'giq_email_log'

// Days before expiry that the AI reminder engine starts nudging
export const CERT_WARN_DAYS = 30
// Cadence (days) for the recurring weekly reminder
const REMINDER_CADENCE_DAYS = 7

// Compute a cert's live status from its expiry + renewal flag
export function certStatus(cert) {
  if (cert.renewed) return 'renewed'
  const daysLeft = Math.ceil((new Date(cert.expires + 'T00:00:00').getTime() - Date.now()) / DAY)
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= CERT_WARN_DAYS) return 'expiring'
  return 'valid'
}
export const certDaysLeft = (cert) =>
  Math.ceil((new Date(cert.expires + 'T00:00:00').getTime() - Date.now()) / DAY)

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

let _seq = 0
const uid = (p) => `${p}-${Date.now().toString(36)}-${(_seq++).toString(36)}`

export function DataProvider({ children }) {
  const [notifications, setNotifications] = useState(() => load(NOTI_KEY, []))
  const [messages, setMessages]           = useState(() => load(MSG_KEY, SEED_MESSAGES))
  const [qcLogs, setQcLogs]               = useState(() => load(QC_KEY, SEED_QC))
  const [weatherAlerts, setWeatherAlerts] = useState(() => load(WX_KEY, []))
  const [certs, setCerts]                 = useState(() => load(CERT_KEY, SEED_CERTS))
  const [bids, setBids]                   = useState(() => load(BID_KEY, SEED_BIDS))
  const [notes, setNotes]                 = useState(() => load(NOTE_KEY, []))
  const [observations, setObservations]   = useState(() => load(OBS_KEY, []))
  const [emailLog, setEmailLog]           = useState(() => load(EMAIL_KEY, []))

  useEffect(() => { localStorage.setItem(NOTI_KEY, JSON.stringify(notifications)) }, [notifications])
  useEffect(() => { localStorage.setItem(MSG_KEY,  JSON.stringify(messages)) }, [messages])
  useEffect(() => { localStorage.setItem(QC_KEY,   JSON.stringify(qcLogs)) }, [qcLogs])
  useEffect(() => { localStorage.setItem(WX_KEY,   JSON.stringify(weatherAlerts)) }, [weatherAlerts])
  useEffect(() => { localStorage.setItem(CERT_KEY, JSON.stringify(certs)) }, [certs])
  useEffect(() => { localStorage.setItem(BID_KEY,  JSON.stringify(bids)) }, [bids])
  useEffect(() => { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem(OBS_KEY,  JSON.stringify(observations)) }, [observations])
  useEffect(() => { localStorage.setItem(EMAIL_KEY, JSON.stringify(emailLog)) }, [emailLog])

  // ---- Notifications ----
  // toRoles: array of role keys, toUserIds: array of user ids, level: info|warning|critical
  const addNotification = ({ title, body, projectId = null, toRoles = [], toUserIds = [], level = 'info' }) => {
    const n = { id: uid('n'), title, body, projectId, toRoles, toUserIds, level, ts: Date.now(), readBy: [] }
    setNotifications(list => [n, ...list])
    return n
  }

  const notificationsFor = (user) => {
    if (!user) return []
    return notifications.filter(n =>
      user.adminGrant ||
      n.toUserIds.includes(user.id) ||
      n.toRoles.includes(user.role) ||
      n.toRoles.includes('all')
    )
  }

  const markRead = (id, userId) =>
    setNotifications(list => list.map(n =>
      n.id === id && !n.readBy.includes(userId) ? { ...n, readBy: [...n.readBy, userId] } : n))

  const markAllRead = (userId) =>
    setNotifications(list => list.map(n =>
      n.readBy.includes(userId) ? n : { ...n, readBy: [...n.readBy, userId] }))

  // ---- Per-project messaging ----
  const sendMessage = ({ projectId, user, text }) => {
    if (!text.trim()) return
    const msg = { id: uid('m'), projectId, userId: user.id, userName: user.name, role: user.role, text: text.trim(), ts: Date.now() }
    setMessages(list => [...list, msg])
    return msg
  }
  const messagesFor = (projectId) =>
    messages.filter(m => m.projectId === projectId).sort((a, b) => a.ts - b.ts)

  // ---- QC ----
  const addQCLog = ({ projectId, system, inspector, result, items = [], notes = '' }) => {
    const project = PROJECTS.find(p => p.id === projectId)
    const id = `QC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
    const log = { id, projectId, system, inspector, result, items, notes, ts: Date.now(), resolved: false }
    setQcLogs(list => [log, ...list])
    if (result === 'fail') {
      addNotification({
        title: `QC FAILED — ${system}`,
        body: `${project?.name || projectId}: ${items.length ? items.join('; ') : notes || 'Inspection failed.'} Inspector: ${inspector}.`,
        projectId, toRoles: PROJECT_LEADS, level: 'critical',
      })
    }
    return log
  }

  const resolveQCLog = (id, resolver) => {
    let resolved
    setQcLogs(list => list.map(l => {
      if (l.id === id) { resolved = l; return { ...l, resolved: true } }
      return l
    }))
    if (resolved) {
      const project = PROJECTS.find(p => p.id === resolved.projectId)
      addNotification({
        title: `QC RESOLVED — ${resolved.system}`,
        body: `${project?.name || resolved.projectId}: re-inspection passed. Cleared by ${resolver?.name || 'inspector'}.`,
        projectId: resolved.projectId, toRoles: PROJECT_LEADS, level: 'info',
      })
    }
  }

  // ---- Weather / storm alerts ----
  const issueWeatherAlert = ({ projectId, site, level, wind, message, action, issuedBy }) => {
    const project = PROJECTS.find(p => p.id === projectId)
    const alert = { id: uid('wx'), projectId, site, level, wind, message, action, issuedBy: issuedBy?.name || 'System', ts: Date.now() }
    setWeatherAlerts(list => [alert, ...list])
    addNotification({
      title: level === 'stop' ? `STORM ALERT — STOP WORK · ${site}` : `WEATHER WATCH — ${site}`,
      body: `${message}${action ? ` Action: ${action}.` : ''} (${project?.name || projectId})`,
      projectId, toRoles: PROJECT_LEADS.concat(ROLES.FOREMAN, ROLES.SAFETY_COORD),
      level: level === 'stop' ? 'critical' : 'warning',
    })
    return alert
  }

  // ---- Certifications + AI reminder engine ----
  const logEmail = (entry) =>
    setEmailLog(list => [{ id: uid('email'), ts: Date.now(), ...entry }, ...list].slice(0, 200))

  const addCert = ({ userId, userName, email, certType, issuer, issued, expires }) => {
    const cert = { id: uid('C'), userId, userName, email, certType, issuer, issued, expires, renewed: false, lastReminderTs: null, reminderCount: 0 }
    setCerts(list => [cert, ...list])
    return cert
  }
  const removeCert = (id) => setCerts(list => list.filter(c => c.id !== id))

  const markCertRenewed = (id, newExpires, by) => {
    let renewed
    setCerts(list => list.map(c => {
      if (c.id !== id) return c
      renewed = c
      return { ...c, renewed: false, expires: newExpires || c.expires, issued: new Date().toISOString().slice(0, 10), lastReminderTs: null, reminderCount: 0 }
    }))
    if (renewed) {
      addNotification({
        title: `Certification renewed — ${renewed.certType}`,
        body: `${renewed.userName}'s ${renewed.certType} is updated through ${newExpires || renewed.expires}${by ? `, confirmed by ${by}` : ''}. Reminders cleared.`,
        toUserIds: [renewed.userId], toRoles: [ROLES.SAFETY_COORD], level: 'info',
      })
      logEmail({ kind: 'cert_renewed', to: renewed.email, subject: `Confirmed: ${renewed.certType} renewal recorded`,
        body: `Hi ${renewed.userName}, your ${renewed.certType} has been updated in GlazierIQ${newExpires ? ` and now expires ${newExpires}` : ''}. No further reminders will be sent. — GlazierIQ Safety` })
    }
  }

  // The engine: scans certs and fires due reminders. Returns how many it sent.
  // Runs automatically on load and can be triggered manually ("Run reminder check").
  const runCertReminderCheck = () => {
    let sent = 0
    setCerts(list => list.map(c => {
      if (c.renewed) return c
      const daysLeft = Math.ceil((new Date(c.expires + 'T00:00:00').getTime() - Date.now()) / DAY)
      const inWindow = daysLeft <= CERT_WARN_DAYS // expiring soon or already expired
      if (!inWindow) return c

      const since = c.lastReminderTs ? (Date.now() - c.lastReminderTs) / DAY : Infinity
      const firstNotice = c.reminderCount === 0
      const dueForWeekly = since >= REMINDER_CADENCE_DAYS
      if (!firstNotice && !dueForWeekly) return c

      const expired = daysLeft < 0
      const when = expired ? `expired ${Math.abs(daysLeft)} day(s) ago` : `expires in ${daysLeft} day(s) (${c.expires})`
      addNotification({
        title: firstNotice
          ? `Certification expiring — ${c.certType}`
          : `Reminder (#${c.reminderCount + 1}) — renew ${c.certType}`,
        body: `${c.userName}: ${c.certType} ${when}. Please renew and confirm in GlazierIQ. Weekly reminders continue until updated.`,
        toUserIds: [c.userId],
        toRoles: [ROLES.SAFETY_COORD],
        level: expired ? 'critical' : 'warning',
      })
      logEmail({
        kind: firstNotice ? 'cert_first_notice' : 'cert_reminder',
        to: c.email || c.userName,
        subject: expired ? `ACTION NEEDED: ${c.certType} has expired` : `Reminder: ${c.certType} expires soon`,
        body: `Hi ${c.userName}, your ${c.certType} ${when}. Please schedule your renewal and confirm completion in GlazierIQ so reminders stop. — GlazierIQ Safety (auto-sent)`,
      })
      sent++
      return { ...c, lastReminderTs: Date.now(), reminderCount: c.reminderCount + 1 }
    }))
    return sent
  }

  // ---- Notes (dictation / agent / manual) ----
  const addNote = ({ authorId, authorName, title, body, tags = [], source = 'manual', projectId = null }) => {
    const note = { id: uid('note'), authorId, authorName, title: title || 'Untitled note', body, tags, source, projectId, ts: Date.now() }
    setNotes(list => [note, ...list])
    return note
  }
  const deleteNote = (id) => setNotes(list => list.filter(n => n.id !== id))
  const notesFor = (userId) => notes.filter(n => n.authorId === userId).sort((a, b) => b.ts - a.ts)

  // ---- Estimating / bid board ----
  const addBid = (bid) => {
    const b = { id: uid('B'), status: 'pending', pmId: null, awardedTs: null, ...bid }
    setBids(list => [b, ...list])
    return b
  }

  const setBidStatus = (id, status, actor) => {
    let target
    setBids(list => list.map(b => {
      if (b.id !== id) return b
      target = { ...b, status, awardedTs: status === 'awarded' ? Date.now() : b.awardedTs }
      return target
    }))
    if (target && status === 'awarded') {
      const pm = target.pmId
      addNotification({
        title: `Project AWARDED — ${target.name}`,
        body: `${target.name} (${target.job}) awarded${actor ? ` by ${actor}` : ''}. Est. value ${target.value ? '$' + target.value.toLocaleString() : 'n/a'}. ${pm ? 'PM assigned.' : 'Awaiting PM assignment.'}`,
        toRoles: PROJECT_LEADS.concat(ROLES.ESTIMATOR),
        toUserIds: pm ? [pm] : [],
        level: 'info',
      })
    }
    return target
  }

  const assignBidPM = (id, pmId, pmName) => {
    let target
    setBids(list => list.map(b => {
      if (b.id !== id) return b
      target = { ...b, pmId, pmName: pmName || b.pmName }
      return target
    }))
    if (target && pmId) {
      addNotification({
        title: `You've been assigned — ${target.name}`,
        body: `${target.name} (${target.job}) has been assigned to you as Project Manager. Est. value ${target.value ? '$' + target.value.toLocaleString() : 'n/a'}.`,
        toUserIds: [pmId], toRoles: [], level: 'warning',
      })
    }
    return target
  }

  // ---- Blueprint observations (tag someone to review) ----
  const addObservation = ({ drawingId, drawingName, author, location, note, taggedUserIds = [], taggedNames = [] }) => {
    const obs = { id: uid('obs'), drawingId, drawingName, authorId: author?.id, authorName: author?.name, location, note, taggedUserIds, taggedNames, resolved: false, ts: Date.now() }
    setObservations(list => [obs, ...list])
    if (taggedUserIds.length) {
      addNotification({
        title: `Blueprint flagged for you — ${drawingName}`,
        body: `${author?.name || 'Someone'} tagged you on ${drawingName}${location ? ` @ ${location}` : ''}: "${note}". Needs your attention.`,
        toUserIds: taggedUserIds, toRoles: [], level: 'warning',
      })
    }
    return obs
  }
  const resolveObservation = (id) => setObservations(list => list.map(o => o.id === id ? { ...o, resolved: true } : o))
  const observationsFor = (drawingId) => observations.filter(o => o.drawingId === drawingId).sort((a, b) => b.ts - a.ts)

  // Fire the reminder engine once after first paint
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { runCertReminderCheck() }, [])

  return (
    <DataContext.Provider value={{
      projects: PROJECTS,
      notifications, addNotification, notificationsFor, markRead, markAllRead,
      messages, sendMessage, messagesFor,
      qcLogs, addQCLog, resolveQCLog,
      weatherAlerts, issueWeatherAlert,
      certs, addCert, removeCert, markCertRenewed, runCertReminderCheck,
      emailLog,
      notes, addNote, deleteNote, notesFor,
      bids, addBid, setBidStatus, assignBidPM,
      observations, addObservation, resolveObservation, observationsFor,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
