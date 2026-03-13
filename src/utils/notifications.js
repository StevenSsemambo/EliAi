/**
 * ELIMU LEARN — PUSH NOTIFICATION SERVICE
 * ─────────────────────────────────────────────────────────────────
 * PWA notifications using the Web Notifications API + ServiceWorker.
 * Works on Android. iOS 16.4+ with PWA installed.
 *
 * Notification types:
 *   1. Daily study reminder (at student's personal peak hour)
 *   2. Streak-at-risk alert (if no study by 8PM)
 *   3. Daily mission reminder (if mission not completed by 6PM)
 *   4. Forgetting curve alert (topics about to be forgotten)
 *   5. Weekly leaderboard update (Monday morning)
 */

const NOTIF_KEY        = 'elimu_notif_permission'
const SCHEDULE_KEY     = 'elimu_notif_schedule'
const LAST_STUDY_KEY   = 'elimu_last_study_date'
const STREAK_REMIND_KEY= 'elimu_streak_remind'

// ── Permission handling ───────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  localStorage.setItem(NOTIF_KEY, result)
  return result
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function isNotificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// ── Show a notification immediately ──────────────────────────────
export async function showNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return false

  const notifOptions = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: options.tag || 'elimu-general',
    renotify: options.renotify || false,
    data: options.data || {},
    actions: options.actions || [],
    ...options,
  }

  try {
    // Use ServiceWorker for persistent notifications
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      await reg.showNotification(title, notifOptions)
    } else {
      new Notification(title, notifOptions)
    }
    return true
  } catch (e) {
    // Fallback to basic Notification
    try { new Notification(title, notifOptions); return true } catch { return false }
  }
}

// ── Notification scheduler (uses setTimeout + localStorage) ──────
// Since we can't run a background server, we schedule using:
// 1. Page visibility events (when app is open)
// 2. Stored schedule checked on every app load
// 3. ServiceWorker periodic sync where supported

const schedules = []

export function scheduleNotification(id, title, body, scheduledTime, options = {}) {
  const now = Date.now()
  const delay = scheduledTime - now
  if (delay < 0) return  // Past time

  // Store in localStorage for persistence
  const stored = getStoredSchedules()
  stored[id] = { title, body, scheduledTime, options }
  saveStoredSchedules(stored)

  // Also set a live timeout if within 24 hours
  if (delay < 86400000) {
    const timeout = setTimeout(() => {
      showNotification(title, body, options)
      // Remove from stored
      const s = getStoredSchedules()
      delete s[id]
      saveStoredSchedules(s)
    }, delay)
    schedules.push({ id, timeout })
  }
}

export function cancelNotification(id) {
  const idx = schedules.findIndex(s => s.id === id)
  if (idx >= 0) { clearTimeout(schedules[idx].timeout); schedules.splice(idx, 1) }
  const stored = getStoredSchedules()
  delete stored[id]
  saveStoredSchedules(stored)
}

function getStoredSchedules() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}') } catch { return {} }
}
function saveStoredSchedules(s) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s))
}

// ── Check stored schedules on app load ───────────────────────────
export async function checkPendingNotifications() {
  if (Notification.permission !== 'granted') return
  const stored = getStoredSchedules()
  const now    = Date.now()
  const updated = {}

  for (const [id, notif] of Object.entries(stored)) {
    if (notif.scheduledTime <= now) {
      // Fire immediately (was scheduled while app was closed)
      await showNotification(notif.title, notif.body, notif.options || {})
    } else {
      updated[id] = notif
      // Re-schedule timeout
      const delay = notif.scheduledTime - now
      if (delay < 86400000) {
        setTimeout(() => showNotification(notif.title, notif.body, notif.options || {}), delay)
      }
    }
  }
  saveStoredSchedules(updated)
}

// ── Smart notification scheduler ─────────────────────────────────
export async function scheduleSmartNotifications(studentId, studyHabits) {
  if (Notification.permission !== 'granted') return

  const now   = new Date()
  const today = now.toDateString()

  // Cancel all existing study reminders before rescheduling
  cancelNotification('daily_study')
  cancelNotification('streak_risk')
  cancelNotification('mission_remind')
  cancelNotification('leaderboard')
  cancelNotification('forgetting_curve')

  // ── 1. Daily study reminder at peak hour ──────────────────────
  const peakHour = studyHabits?.peakHour?.hour ?? 19  // default 7PM
  const reminderTime = new Date()
  reminderTime.setHours(peakHour, 0, 0, 0)
  if (reminderTime <= now) reminderTime.setDate(reminderTime.getDate() + 1)

  const studyMessages = [
    { title: '📚 Time to Study!', body: `It's your peak study time — you score ${studyHabits?.peakHour?.avgScore || 75}% at this hour. Open Elimu Learn now!` },
    { title: '🧠 Your Brain is Ready!', body: 'Studies show this is your best learning time. Don\'t miss it!' },
    { title: '⚡ Study Reminder', body: 'Your daily mission is waiting. Complete it to keep your streak alive!' },
  ]
  const sm = studyMessages[now.getDay() % studyMessages.length]
  scheduleNotification('daily_study', sm.title, sm.body, reminderTime.getTime(), {
    tag: 'study-reminder', actions: [{ action: 'open', title: 'Study Now' }],
  })

  // ── 2. Streak-at-risk alert at 8PM ────────────────────────────
  const lastStudy = localStorage.getItem(LAST_STUDY_KEY)
  if (lastStudy !== today) {
    const streakRisk = new Date()
    streakRisk.setHours(20, 0, 0, 0)
    if (streakRisk <= now) streakRisk.setDate(streakRisk.getDate() + 1)

    scheduleNotification('streak_risk',
      '🔥 Streak at Risk!',
      'You haven\'t studied today. Log in now to protect your streak before midnight!',
      streakRisk.getTime(),
      { tag: 'streak-risk', renotify: true }
    )
  }

  // ── 3. Mission reminder at 6PM ────────────────────────────────
  const missionDone = localStorage.getItem(`elimu_mission_${today}`)
  if (!missionDone) {
    const missionTime = new Date()
    missionTime.setHours(18, 0, 0, 0)
    if (missionTime <= now) missionTime.setDate(missionTime.getDate() + 1)

    scheduleNotification('mission_remind',
      '🎯 Daily Mission Waiting',
      'You haven\'t completed today\'s AI-generated missions. Earn bonus XP before midnight!',
      missionTime.getTime(),
      { tag: 'mission-remind' }
    )
  }

  // ── 4. Weekly leaderboard (Monday 9AM) ────────────────────────
  const monday = new Date()
  const daysUntilMonday = (8 - monday.getDay()) % 7 || 7
  monday.setDate(monday.getDate() + daysUntilMonday)
  monday.setHours(9, 0, 0, 0)

  scheduleNotification('leaderboard',
    '🏆 New Leaderboard Week!',
    'A fresh week of competition begins. Study hard to reach the top!',
    monday.getTime(),
    { tag: 'leaderboard' }
  )
}

// ── Schedule forgetting curve review nudge ────────────────────────
// Call this separately after checking getDueForReview so we only
// notify when there are genuinely overdue lessons.
export async function scheduleReviewNudge(dueItems = []) {
  if (Notification.permission !== 'granted') return
  const settings = getNotifSettings()
  if (!settings.forgettingCurve) return
  cancelNotification('forgetting_curve')
  if (!dueItems || dueItems.length === 0) return

  const critical = dueItems.filter(d => d.urgency === 'critical').length
  const hasCritical = critical > 0

  // Fire at 4PM today, or in 30 minutes if already past 4PM
  const fireAt = new Date()
  fireAt.setHours(16, 0, 0, 0)
  if (fireAt <= new Date()) {
    // Already past 4PM — nudge in 30 minutes instead
    fireAt.setTime(Date.now() + 30 * 60 * 1000)
  }

  const title = hasCritical
    ? `🧠 ${critical} lesson${critical > 1 ? 's' : ''} fading fast!`
    : `📖 ${dueItems.length} lesson${dueItems.length > 1 ? 's' : ''} ready for review`
  const body = hasCritical
    ? `You're about to forget ${critical} topic${critical > 1 ? 's' : ''}. Open Elimu Learn and do a quick review to lock in your knowledge!`
    : `Spaced repetition time! Reviewing now takes 5 minutes and keeps knowledge fresh for weeks.`

  scheduleNotification('forgetting_curve', title, body, fireAt.getTime(), {
    tag: 'forgetting-curve',
    renotify: true,
    data: { url: '/forgetting-curve' },
  })
}

// ── Record study activity (call after each quiz/lesson) ──────────
export function recordStudyActivity() {
  const today = new Date().toDateString()
  localStorage.setItem(LAST_STUDY_KEY, today)
  // Cancel streak-risk notification since student studied today
  cancelNotification('streak_risk')
}

// ── Notification settings storage ────────────────────────────────
const SETTINGS_KEY = 'elimu_notif_settings'

export function getNotifSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify({
      studyReminder: true,
      streakAlert: true,
      missionRemind: true,
      leaderboard: true,
      forgettingCurve: true,
    }))
  } catch {
    return { studyReminder:true, streakAlert:true, missionRemind:true, leaderboard:true, forgettingCurve:true }
  }
}

export function saveNotifSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// ── Test notification (for settings page) ────────────────────────
export async function sendTestNotification() {
  return showNotification(
    '✅ Notifications Working!',
    'Elimu Learn will now remind you to study at your peak time. Keep learning! 🧠',
    { tag: 'test', vibrate: [300, 100, 300, 100, 300] }
  )
}
