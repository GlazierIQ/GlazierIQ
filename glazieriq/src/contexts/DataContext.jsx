/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ROLES, useAuth } from './AuthContext'

const DataContext = createContext(null)

// ---- Static project list (mirrors the projects table seed) ----
export const PROJECTS = [
  { id: 'creamery', name: 'The Creamery',   job: '25-0628', address: '410 Glenwood Ave, Raleigh NC 27603' },
  { id: 'midtown',  name: 'Midtown Office',  job: '25-0441', address: 'Raleigh, NC' },
  { id: 'harbor',   name: 'Harbor Walk',     job: '25-0712', address: 'Raleigh, NC' },
]

// Roles that should receive project-lead alerts (QC fails, weather, etc.)
export const PROJECT_LEADS = [
  ROLES.PROJECT_MANAGER, ROLES.GENERAL_SUPER, ROLES.SUPERINTENDENT, ROLES.ASST_SUPER, ROLES.DIRECTOR_OPS,
]

const DAY = 1000 * 60 * 60 * 24

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

// ---------------------------------------------------------------------------
// Row mappers: DB snake_case <-> app camelCase (timestamps as ms numbers)
// ---------------------------------------------------------------------------
const ms = (t) => (t ? new Date(t).getTime() : null)
const iso = (t) => (t ? new Date(t).toISOString() : null)
const newId = () => crypto.randomUUID()

const fromNoti = (r) => ({ id: r.id, title: r.title, body: r.body, projectId: r.project_id, toRoles: r.to_roles || [], toUserIds: r.to_user_ids || [], level: r.level, readBy: r.read_by || [], ts: ms(r.ts) })
const fromMsg  = (r) => ({ id: r.id, projectId: r.project_id, userId: r.user_id, userName: r.user_name, role: r.role, text: r.text, ts: ms(r.ts) })
const fromQC   = (r) => ({ id: r.id, projectId: r.project_id, system: r.system, inspector: r.inspector, result: r.result, items: r.items || [], notes: r.notes, resolved: r.resolved, ts: ms(r.ts) })
const fromWx   = (r) => ({ id: r.id, projectId: r.project_id, site: r.site, level: r.level, wind: r.wind, message: r.message, action: r.action, issuedBy: r.issued_by, ts: ms(r.ts) })
const fromCert = (r) => ({ id: r.id, userId: r.user_id, userName: r.user_name, email: r.email, certType: r.cert_type, issuer: r.issuer, issued: r.issued, expires: r.expires, renewed: r.renewed, lastReminderTs: ms(r.last_reminder_ts), reminderCount: r.reminder_count })
const fromBid  = (r) => ({ id: r.id, name: r.name, job: r.job, address: r.address, client: r.client, gc: r.gc, value: r.value == null ? null : Number(r.value), bidDate: r.bid_date, status: r.status, pmId: r.pm_id, pmName: r.pm_name, awardedTs: ms(r.awarded_ts), estimator: r.estimator })
const fromNote = (r) => ({ id: r.id, authorId: r.author_id, authorName: r.author_name, title: r.title, body: r.body, tags: r.tags || [], source: r.source, projectId: r.project_id, ts: ms(r.ts) })
const fromObs  = (r) => ({ id: r.id, drawingId: r.drawing_id, drawingName: r.drawing_name, authorId: r.author_id, authorName: r.author_name, location: r.location, note: r.note, taggedUserIds: r.tagged_user_ids || [], taggedNames: r.tagged_names || [], resolved: r.resolved, ts: ms(r.ts) })
const fromMail = (r) => ({ id: r.id, kind: r.kind, to: r.to_addr, subject: r.subject, body: r.body, ts: ms(r.ts) })

const logDbError = (label) => ({ error }) => { if (error) console.error(`${label}:`, error.message) }

export function DataProvider({ children }) {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [messages, setMessages]           = useState([])
  const [qcLogs, setQcLogs]               = useState([])
  const [weatherAlerts, setWeatherAlerts] = useState([])
  const [certs, setCerts]                 = useState([])
  const [bids, setBids]                   = useState([])
  const [notes, setNotes]                 = useState([])
  const [observations, setObservations]   = useState([])
  const [emailLog, setEmailLog]           = useState([])
  const [dataReady, setDataReady]         = useState(false)

  // ---- Notifications ----
  const addNotification = ({ title, body, projectId = null, toRoles = [], toUserIds = [], level = 'info' }) => {
    const n = { id: newId(), title, body, projectId, toRoles, toUserIds, level, ts: Date.now(), readBy: [] }
    setNotifications(list => [n, ...list])
    supabase.from('notifications').insert({
      id: n.id, title, body, project_id: projectId, to_roles: toRoles,
      to_user_ids: toUserIds, level, ts: iso(n.ts),
    }).then(logDbError('addNotification'))
    return n
  }

  const notificationsFor = (u) => {
    if (!u) return []
    return notifications.filter(n =>
      u.adminGrant ||
      n.toUserIds.includes(u.id) ||
      n.toRoles.includes(u.role) ||
      n.toRoles.includes('all')
    )
  }

  const markRead = (id, userId) => {
    let updated
    setNotifications(list => list.map(n => {
      if (n.id === id && !n.readBy.includes(userId)) { updated = { ...n, readBy: [...n.readBy, userId] }; return updated }
      return n
    }))
    if (updated) supabase.from('notifications').update({ read_by: updated.readBy }).eq('id', id).then(logDbError('markRead'))
  }

  const markAllRead = (userId) => {
    const changed = []
    setNotifications(list => list.map(n => {
      if (n.readBy.includes(userId)) return n
      const upd = { ...n, readBy: [...n.readBy, userId] }
      changed.push(upd)
      return upd
    }))
    changed.forEach(n =>
      supabase.from('notifications').update({ read_by: n.readBy }).eq('id', n.id).then(logDbError('markAllRead')))
  }

  // ---- Per-project messaging ----
  const sendMessage = ({ projectId, user: u, text }) => {
    if (!text.trim()) return
    const msg = { id: newId(), projectId, userId: u.id, userName: u.name, role: u.role, text: text.trim(), ts: Date.now() }
    setMessages(list => [...list, msg])
    supabase.from('messages').insert({
      id: msg.id, project_id: projectId, user_id: u.id, user_name: u.name,
      role: u.role, text: msg.text, ts: iso(msg.ts),
    }).then(logDbError('sendMessage'))
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
    supabase.from('qc_logs').insert({
      id, project_id: projectId, system, inspector, result, items, notes, ts: iso(log.ts),
    }).then(logDbError('addQCLog'))
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
      supabase.from('qc_logs').update({ resolved: true }).eq('id', id).then(logDbError('resolveQCLog'))
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
    const alert = { id: newId(), projectId, site, level, wind, message, action, issuedBy: issuedBy?.name || 'System', ts: Date.now() }
    setWeatherAlerts(list => [alert, ...list])
    supabase.from('weather_alerts').insert({
      id: alert.id, project_id: projectId, site, level, wind, message, action,
      issued_by: alert.issuedBy, ts: iso(alert.ts),
    }).then(logDbError('issueWeatherAlert'))
    addNotification({
      title: level === 'stop' ? `STORM ALERT — STOP WORK · ${site}` : `WEATHER WATCH — ${site}`,
      body: `${message}${action ? ` Action: ${action}.` : ''} (${project?.name || projectId})`,
      projectId, toRoles: PROJECT_LEADS.concat(ROLES.FOREMAN, ROLES.SAFETY_COORD),
      level: level === 'stop' ? 'critical' : 'warning',
    })
    return alert
  }

  // ---- Certifications + AI reminder engine ----
  const logEmail = (entry) => {
    const e = { id: newId(), ts: Date.now(), ...entry }
    setEmailLog(list => [e, ...list].slice(0, 200))
    supabase.from('email_log').insert({
      id: e.id, kind: e.kind, to_addr: e.to, subject: e.subject, body: e.body, ts: iso(e.ts),
    }).then(logDbError('logEmail'))
  }

  const addCert = ({ userId, userName, email, certType, issuer, issued, expires }) => {
    const cert = { id: newId(), userId, userName, email, certType, issuer, issued, expires, renewed: false, lastReminderTs: null, reminderCount: 0 }
    setCerts(list => [cert, ...list])
    supabase.from('certs').insert({
      id: cert.id, user_id: userId || null, user_name: userName, email,
      cert_type: certType, issuer, issued: issued || null, expires,
    }).then(logDbError('addCert'))
    return cert
  }
  const removeCert = (id) => {
    setCerts(list => list.filter(c => c.id !== id))
    supabase.from('certs').delete().eq('id', id).then(logDbError('removeCert'))
  }

  const markCertRenewed = (id, newExpires, by) => {
    let renewed
    const todayStr = new Date().toISOString().slice(0, 10)
    setCerts(list => list.map(c => {
      if (c.id !== id) return c
      renewed = c
      return { ...c, renewed: false, expires: newExpires || c.expires, issued: todayStr, lastReminderTs: null, reminderCount: 0 }
    }))
    if (renewed) {
      supabase.from('certs').update({
        renewed: false, expires: newExpires || renewed.expires, issued: todayStr,
        last_reminder_ts: null, reminder_count: 0,
      }).eq('id', id).then(logDbError('markCertRenewed'))
      addNotification({
        title: `Certification renewed — ${renewed.certType}`,
        body: `${renewed.userName}'s ${renewed.certType} is updated through ${newExpires || renewed.expires}${by ? `, confirmed by ${by}` : ''}. Reminders cleared.`,
        toUserIds: renewed.userId ? [renewed.userId] : [], toRoles: [ROLES.SAFETY_COORD], level: 'info',
      })
      logEmail({ kind: 'cert_renewed', to: renewed.email, subject: `Confirmed: ${renewed.certType} renewal recorded`,
        body: `Hi ${renewed.userName}, your ${renewed.certType} has been updated in GlazierIQ${newExpires ? ` and now expires ${newExpires}` : ''}. No further reminders will be sent. — GlazierIQ Safety` })
    }
  }

  // The engine: scans a cert list and fires due reminders. Returns how many it sent.
  const runReminderScan = useCallback((certList) => {
    let sent = 0
    const now = Date.now()
    const updated = certList.map(c => {
      if (c.renewed) return c
      const daysLeft = Math.ceil((new Date(c.expires + 'T00:00:00').getTime() - now) / DAY)
      const inWindow = daysLeft <= CERT_WARN_DAYS // expiring soon or already expired
      if (!inWindow) return c

      const since = c.lastReminderTs ? (now - c.lastReminderTs) / DAY : Infinity
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
        toUserIds: c.userId ? [c.userId] : [],
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
      const upd = { ...c, lastReminderTs: now, reminderCount: c.reminderCount + 1 }
      supabase.from('certs').update({
        last_reminder_ts: iso(now), reminder_count: upd.reminderCount,
      }).eq('id', c.id).then(logDbError('reminderUpdate'))
      return upd
    })
    setCerts(updated)
    return sent
  }, [])

  const runCertReminderCheck = () => runReminderScan(certs)

  // ---- Notes (dictation / agent / manual) ----
  const addNote = ({ authorId, authorName, title, body, tags = [], source = 'manual', projectId = null }) => {
    const note = { id: newId(), authorId, authorName, title: title || 'Untitled note', body, tags, source, projectId, ts: Date.now() }
    setNotes(list => [note, ...list])
    supabase.from('notes').insert({
      id: note.id, author_id: authorId || null, author_name: authorName, title: note.title,
      body, tags, source, project_id: projectId, ts: iso(note.ts),
    }).then(logDbError('addNote'))
    return note
  }
  const deleteNote = (id) => {
    setNotes(list => list.filter(n => n.id !== id))
    supabase.from('notes').delete().eq('id', id).then(logDbError('deleteNote'))
  }
  const notesFor = (userId) => notes.filter(n => n.authorId === userId).sort((a, b) => b.ts - a.ts)

  // ---- Estimating / bid board ----
  const addBid = (bid) => {
    const b = { id: `B-${Date.now().toString(36)}`, status: 'pending', pmId: null, awardedTs: null, ...bid }
    setBids(list => [b, ...list])
    supabase.from('bids').insert({
      id: b.id, name: b.name, job: b.job, address: b.address, client: b.client, gc: b.gc,
      value: b.value ?? null, bid_date: b.bidDate || null, status: b.status,
      pm_id: b.pmId, pm_name: b.pmName || null, awarded_ts: iso(b.awardedTs), estimator: b.estimator,
    }).then(logDbError('addBid'))
    return b
  }

  const setBidStatus = (id, status, actor) => {
    let target
    setBids(list => list.map(b => {
      if (b.id !== id) return b
      target = { ...b, status, awardedTs: status === 'awarded' ? Date.now() : b.awardedTs }
      return target
    }))
    if (target) {
      supabase.from('bids').update({ status, awarded_ts: iso(target.awardedTs) }).eq('id', id).then(logDbError('setBidStatus'))
    }
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
    if (target) {
      supabase.from('bids').update({ pm_id: pmId, pm_name: target.pmName || null }).eq('id', id).then(logDbError('assignBidPM'))
    }
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
    const obs = { id: newId(), drawingId, drawingName, authorId: author?.id, authorName: author?.name, location, note, taggedUserIds, taggedNames, resolved: false, ts: Date.now() }
    setObservations(list => [obs, ...list])
    supabase.from('observations').insert({
      id: obs.id, drawing_id: drawingId, drawing_name: drawingName, author_id: author?.id || null,
      author_name: author?.name, location, note, tagged_user_ids: taggedUserIds,
      tagged_names: taggedNames, ts: iso(obs.ts),
    }).then(logDbError('addObservation'))
    if (taggedUserIds.length) {
      addNotification({
        title: `Blueprint flagged for you — ${drawingName}`,
        body: `${author?.name || 'Someone'} tagged you on ${drawingName}${location ? ` @ ${location}` : ''}: "${note}". Needs your attention.`,
        toUserIds: taggedUserIds, toRoles: [], level: 'warning',
      })
    }
    return obs
  }
  const resolveObservation = (id) => {
    setObservations(list => list.map(o => o.id === id ? { ...o, resolved: true } : o))
    supabase.from('observations').update({ resolved: true }).eq('id', id).then(logDbError('resolveObservation'))
  }
  const observationsFor = (drawingId) => observations.filter(o => o.drawingId === drawingId).sort((a, b) => b.ts - a.ts)

  // ---- Load everything from the cloud once the user is signed in ----
  const scannedOnce = useRef(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user) { setDataReady(false); scannedOnce.current = false; return }
    let cancelled = false
    async function loadAll() {
      const [noti, msg, qc, wx, ct, bd, nt, obs, ml] = await Promise.all([
        supabase.from('notifications').select('*').order('ts', { ascending: false }).limit(300),
        supabase.from('messages').select('*').order('ts'),
        supabase.from('qc_logs').select('*').order('ts', { ascending: false }),
        supabase.from('weather_alerts').select('*').order('ts', { ascending: false }),
        supabase.from('certs').select('*'),
        supabase.from('bids').select('*'),
        supabase.from('notes').select('*').order('ts', { ascending: false }),
        supabase.from('observations').select('*').order('ts', { ascending: false }),
        supabase.from('email_log').select('*').order('ts', { ascending: false }).limit(200),
      ])
      if (cancelled) return
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications((noti.data || []).map(fromNoti))
      setMessages((msg.data || []).map(fromMsg))
      setQcLogs((qc.data || []).map(fromQC))
      setWeatherAlerts((wx.data || []).map(fromWx))
      setBids((bd.data || []).map(fromBid))
      setNotes((nt.data || []).map(fromNote))
      setObservations((obs.data || []).map(fromObs))
      setEmailLog((ml.data || []).map(fromMail))
      const certList = (ct.data || []).map(fromCert)
      setCerts(certList)
      setDataReady(true)
      // Fire the reminder engine once per session, after data lands
      if (!scannedOnce.current) { scannedOnce.current = true; runReminderScan(certList) }
    }
    loadAll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <DataContext.Provider value={{
      projects: PROJECTS, dataReady,
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
