/**
 * EQLA LEARN — Smart Notification Service v2
 * Contextual, data-driven notifications based on actual student behaviour.
 * 100% offline — uses localStorage + Web Notifications API.
 */

const NOTIF_KEY         = 'elimu_notif_permission'
const SCHEDULE_KEY      = 'elimu_notif_schedule'
const LAST_STUDY_KEY    = 'elimu_last_study_date'
const STUDY_HISTORY_KEY = 'elimu_study_history'  // array of {date, subjects, scores}

// ── Permission ────────────────────────────────────────────────────
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

// ── Show notification ─────────────────────────────────────────────
export async function showNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return false
  const opts = {
    body, icon:'/icons/icon-192.png', badge:'/icons/icon-192.png',
    vibrate:[200,100,200], tag:options.tag||'elimu-general',
    renotify:options.renotify||false, data:options.data||{},
    actions:options.actions||[], ...options,
  }
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) { await reg.showNotification(title, opts) }
    else new Notification(title, opts)
    return true
  } catch(e) {
    try { new Notification(title, opts); return true } catch { return false }
  }
}

// ── Scheduler ────────────────────────────────────────────────────
const schedules = []

export function scheduleNotification(id, title, body, scheduledTime, options={}) {
  const now = Date.now()
  const delay = scheduledTime - now
  if (delay < 0) return
  const stored = getStoredSchedules()
  stored[id] = { title, body, scheduledTime, options }
  saveStoredSchedules(stored)
  if (delay < 86400000) {
    const timeout = setTimeout(() => {
      showNotification(title, body, options)
      const s = getStoredSchedules(); delete s[id]; saveStoredSchedules(s)
    }, delay)
    schedules.push({ id, timeout })
  }
}

export function cancelNotification(id) {
  const idx = schedules.findIndex(s => s.id === id)
  if (idx >= 0) { clearTimeout(schedules[idx].timeout); schedules.splice(idx, 1) }
  const stored = getStoredSchedules(); delete stored[id]; saveStoredSchedules(stored)
}

function getStoredSchedules() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}') } catch { return {} }
}
function saveStoredSchedules(s) { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)) }

export async function checkPendingNotifications() {
  if (Notification.permission !== 'granted') return
  const stored = getStoredSchedules()
  const now = Date.now(); const updated = {}
  for (const [id, notif] of Object.entries(stored)) {
    if (notif.scheduledTime <= now) {
      await showNotification(notif.title, notif.body, notif.options||{})
    } else {
      updated[id] = notif
      const delay = notif.scheduledTime - now
      if (delay < 86400000) setTimeout(() => showNotification(notif.title, notif.body, notif.options||{}), delay)
    }
  }
  saveStoredSchedules(updated)
}

// ── Study history tracking ────────────────────────────────────────
function getStudyHistory() {
  try { return JSON.parse(localStorage.getItem(STUDY_HISTORY_KEY) || '[]') } catch { return [] }
}
function saveStudyHistory(h) { localStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(h.slice(-60))) } // keep 60 days

export function recordStudyActivity(subject, score, lessonId) {
  const today = new Date().toDateString()
  localStorage.setItem(LAST_STUDY_KEY, today)
  cancelNotification('streak_risk')
  const history = getStudyHistory()
  const todayEntry = history.find(h => h.date === today)
  if (todayEntry) {
    if (subject && !todayEntry.subjects.includes(subject)) todayEntry.subjects.push(subject)
    if (score !== undefined) todayEntry.scores.push({ subject, score, lessonId, ts: Date.now() })
  } else {
    history.push({
      date: today,
      subjects: subject ? [subject] : [],
      scores: score !== undefined ? [{ subject, score, lessonId, ts: Date.now() }] : [],
    })
  }
  saveStudyHistory(history)
}

// ── SMART contextual notifications ───────────────────────────────
export async function scheduleSmartNotifications(studentId, profile, studyHabits) {
  if (Notification.permission !== 'granted') return
  const now = new Date()
  const today = now.toDateString()

  // Cancel all existing
  ['daily_study','streak_risk','mission_remind','leaderboard',
   'forgetting_curve','weak_topic','exam_countdown','score_drill'].forEach(id => cancelNotification(id))

  const history = getStudyHistory()
  const lastStudy = localStorage.getItem(LAST_STUDY_KEY)

  // ── 1. CONTEXTUAL DAILY REMINDER ─────────────────────────────
  // Message depends on what the student actually needs
  const peakHour = studyHabits?.peakHour?.hour ?? 19
  const reminderTime = new Date()
  reminderTime.setHours(peakHour, 0, 0, 0)
  if (reminderTime <= now) reminderTime.setDate(reminderTime.getDate() + 1)

  let reminderTitle = '📚 Time to Study!'
  let reminderBody = 'Your daily study session is waiting.'

  if (profile) {
    const { allWeakTopics, summary, examPredictions } = profile
    // Find the highest-risk exam topic
    const topRisk = Object.values(examPredictions || {}).flat()
      .sort((a,b) => b.riskScore - a.riskScore)[0]
    // Days since last study
    const daysSinceStudy = lastStudy
      ? Math.floor((Date.now() - new Date(lastStudy).getTime()) / 86400000) : 99

    if (daysSinceStudy >= 3 && allWeakTopics?.[0]) {
      const t = allWeakTopics[0]
      reminderTitle = `⚠️ You haven't studied in ${daysSinceStudy} days!`
      reminderBody = `Your forgetting curve shows you're about to lose retention on ${t.topic.replace(/_/g,' ')}. Quick 10-min revision now?`
    } else if (topRisk && topRisk.mastery < 50) {
      reminderTitle = `🎓 UNEB Risk: ${topRisk.topic.replace(/_/g,' ')}`
      reminderBody = `This is a high-frequency exam topic and you've only mastered ${topRisk.mastery}%. Open Eqla to revise it now.`
    } else if (allWeakTopics?.[0]) {
      const t = allWeakTopics[0]
      reminderTitle = `📖 Revise ${t.topic.replace(/_/g,' ')}`
      reminderBody = `You scored ${t.score}% on this topic last time. A quick review now will boost your UNEB score.`
    } else if (summary?.globalAvg) {
      reminderTitle = `🧠 Keep your ${summary.globalAvg}% average going!`
      reminderBody = `You've studied ${summary.studyDaysThisWeek}/7 days this week. Don't break the momentum!`
    }
  }

  scheduleNotification('daily_study', reminderTitle, reminderBody, reminderTime.getTime(), {
    tag:'study-reminder', actions:[{ action:'open', title:'Study Now' }]
  })

  // ── 2. STREAK AT RISK (8PM if not studied today) ──────────────
  if (lastStudy !== today) {
    const streakTime = new Date(); streakTime.setHours(20,0,0,0)
    if (streakTime <= now) streakTime.setDate(streakTime.getDate()+1)
    scheduleNotification('streak_risk',
      '🔥 Study streak at risk!',
      "You haven't studied today. Log in now to protect your streak before midnight!",
      streakTime.getTime(), { tag:'streak-risk', renotify:true }
    )
  }

  // ── 3. WEAK TOPIC DRILL — fires 30 min after daily reminder ──
  if (profile?.allWeakTopics?.[0]) {
    const t = profile.allWeakTopics[0]
    const drillTime = new Date(reminderTime.getTime() + 30 * 60 * 1000)
    scheduleNotification('weak_topic',
      `⚡ Quick drill: ${t.topic.replace(/_/g,' ')}`,
      `You scored ${t.score}% on ${t.topic.replace(/_/g,' ')} in ${t.subject}. A 5-minute drill now can push that above 80%.`,
      drillTime.getTime(), { tag:'weak-topic' }
    )
  }

  // ── 4. SCORE IMPROVEMENT NUDGE — fires if recent score was low ──
  const recentScores = history.slice(-3).flatMap(h => h.scores || [])
  const lowScore = recentScores.find(s => s.score < 50)
  if (lowScore) {
    const drillAt = new Date(); drillAt.setHours(15, 0, 0, 0)
    if (drillAt <= now) drillAt.setDate(drillAt.getDate()+1)
    scheduleNotification('score_drill',
      `📉 You scored ${lowScore.score}% — let's fix that`,
      `You got ${lowScore.score}% on ${lowScore.subject || 'your last quiz'}. Open Eqla for a targeted drill on exactly what you missed.`,
      drillAt.getTime(), { tag:'score-drill' }
    )
  }

  // ── 5. MISSION REMINDER (6PM if not done) ───────────────────
  const missionDone = localStorage.getItem(`elimu_mission_${today}`)
  if (!missionDone) {
    const missionTime = new Date(); missionTime.setHours(18,0,0,0)
    if (missionTime <= now) missionTime.setDate(missionTime.getDate()+1)
    scheduleNotification('mission_remind',
      '🎯 Daily Mission waiting',
      "You haven't completed today's AI missions. Earn bonus XP before midnight!",
      missionTime.getTime(), { tag:'mission-remind' }
    )
  }

  // ── 6. WEEKLY LEADERBOARD (Monday 9AM) ──────────────────────
  const monday = new Date()
  const daysUntilMonday = (8 - monday.getDay()) % 7 || 7
  monday.setDate(monday.getDate() + daysUntilMonday)
  monday.setHours(9,0,0,0)
  scheduleNotification('leaderboard',
    '🏆 New week, new leaderboard!',
    'Fresh competition starts now. Study hard to reach the top this week.',
    monday.getTime(), { tag:'leaderboard' }
  )
}

// ── Forgetting curve review nudge ─────────────────────────────────
export async function scheduleReviewNudge(dueItems=[]) {
  if (Notification.permission !== 'granted') return
  const settings = getNotifSettings()
  if (!settings.forgettingCurve) return
  cancelNotification('forgetting_curve')
  if (!dueItems?.length) return
  const critical = dueItems.filter(d=>d.urgency==='critical').length
  const fireAt = new Date(); fireAt.setHours(16,0,0,0)
  if (fireAt <= new Date()) fireAt.setTime(Date.now() + 30*60*1000)
  const title = critical
    ? `🧠 ${critical} topic${critical>1?'s':''} fading fast!`
    : `📖 ${dueItems.length} topic${dueItems.length>1?'s':''} ready for review`
  const body = critical
    ? `You're about to forget ${critical} topic${critical>1?'s':''}. Quick review to lock in your knowledge!`
    : `Spaced repetition time! Reviewing now takes 5 minutes and keeps knowledge fresh for weeks.`
  scheduleNotification('forgetting_curve', title, body, fireAt.getTime(), {
    tag:'forgetting-curve', renotify:true, data:{ url:'/forgetting-curve' }
  })
}

// ── Notification settings ─────────────────────────────────────────
const SETTINGS_KEY = 'elimu_notif_settings'

export function getNotifSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify({
      studyReminder:true, streakAlert:true, missionRemind:true,
      leaderboard:true, forgettingCurve:true, weakTopic:true, scoreDrill:true,
    }))
  } catch {
    return { studyReminder:true, streakAlert:true, missionRemind:true,
             leaderboard:true, forgettingCurve:true, weakTopic:true, scoreDrill:true }
  }
}
export function saveNotifSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) }

export async function sendTestNotification() {
  return showNotification(
    '✅ Notifications Working!',
    'Eqla will now send smart study reminders based on your progress. Keep learning! 🧠',
    { tag:'test', vibrate:[300,100,300,100,300] }
  )
}
