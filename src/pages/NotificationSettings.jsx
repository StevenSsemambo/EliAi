import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  requestNotificationPermission, getNotificationPermission,
  isNotificationsSupported, getNotifSettings, saveNotifSettings,
  scheduleSmartNotifications, sendTestNotification, checkPendingNotifications,
} from '../utils/notifications.js'
import { analyseStudyHabits } from '../ai/learning.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

function Toggle({ value, onChange, theme }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? theme.accent : theme.border }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: value ? '26px' : '2px' }}/>
    </button>
  )
}

function PermissionCard({ permission, onRequest, theme }) {
  const states = {
    granted:     { icon: '✅', title: 'Notifications Enabled', sub: 'You will receive study reminders', col: '#4ADE80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)', btn: null },
    denied:      { icon: '🔕', title: 'Notifications Blocked', sub: 'Enable them in your browser settings → Site Settings → Notifications', col: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', btn: null },
    default:     { icon: '🔔', title: 'Enable Notifications', sub: 'Get study reminders at your best time, streak alerts, and mission nudges', col: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', btn: 'Enable Now' },
    unsupported: { icon: '📵', title: 'Not Supported', sub: 'Your browser does not support notifications. Try installing the app from Chrome on Android.', col: '#94A3B8', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', btn: null },
  }
  const s = states[permission] || states.default

  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">{s.icon}</span>
        <div className="flex-1">
          <p className="font-black text-sm mb-1" style={{ color: s.col }}>{s.title}</p>
          <p className="text-xs leading-relaxed" style={{ color: theme.subtext }}>{s.sub}</p>
          {s.btn && (
            <button onClick={onRequest}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-black text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg,${s.col},#7C3AED)` }}>
              {s.btn}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationSettings() {
  const { student } = useUser()
  const { theme }   = useTheme()
  const navigate    = useNavigate()

  const [permission, setPermission]   = useState(() => getNotificationPermission())
  const [settings, setSettings]       = useState(() => getNotifSettings())
  const [peakHour, setPeakHour]       = useState(null)
  const [testSent, setTestSent]       = useState(false)
  const [scheduling, setScheduling]   = useState(false)

  useEffect(() => {
    if (!student) return
    analyseStudyHabits(student.id).then(h => {
      if (h?.hasEnoughData) setPeakHour(h.peakHour)
    })
    checkPendingNotifications()
  }, [student])

  async function handleRequestPermission() {
    SoundEngine.tap()
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      await reschedule()
    }
  }

  async function reschedule() {
    setScheduling(true)
    const habits = peakHour ? { peakHour } : null
    await scheduleSmartNotifications(student?.id, habits)
    setScheduling(false)
  }

  function handleToggle(key, value) {
    SoundEngine.tap()
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    saveNotifSettings(updated)
    if (permission === 'granted') reschedule()
  }

  async function handleTest() {
    SoundEngine.tap()
    const ok = await sendTestNotification()
    if (ok) { setTestSent(true); setTimeout(() => setTestSent(false), 3000) }
  }

  const NOTIF_TYPES = [
    {
      key: 'studyReminder',
      icon: '⏰',
      title: 'Daily Study Reminder',
      desc: peakHour
        ? `Reminds you at your peak study time: ${peakHour.label}`
        : 'Reminds you to study at your personal peak time',
    },
    {
      key: 'streakAlert',
      icon: '🔥',
      title: 'Streak Protection Alert',
      desc: 'Alerts you at 8 PM if you haven\'t studied today so you don\'t lose your streak',
    },
    {
      key: 'missionRemind',
      icon: '🎯',
      title: 'Daily Mission Reminder',
      desc: 'Reminds you at 6 PM if your daily AI missions are incomplete',
    },
    {
      key: 'leaderboard',
      icon: '🏆',
      title: 'Weekly Leaderboard',
      desc: 'Notifies you every Monday when the new competition week begins',
    },
    {
      key: 'forgettingCurve',
      icon: '📉',
      title: 'Forgetting Curve Alerts',
      desc: 'Alerts you when topics are about to fade from memory and need review',
    },
  ]

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5 relative overflow-hidden"
        style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 50%, rgba(245,158,11,0.1) 0%, transparent 60%)' }}/>
        <button onClick={() => navigate('/settings')} className="text-sm mb-3 block" style={{ color: theme.muted }}>← Settings</button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>🔔</div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>Notifications</h1>
            <p className="text-xs" style={{ color: theme.muted }}>Smart reminders powered by your study habits</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 max-w-lg mx-auto">

        {/* Permission card */}
        {isNotificationsSupported()
          ? <PermissionCard permission={permission} onRequest={handleRequestPermission} theme={theme}/>
          : <PermissionCard permission="unsupported" onRequest={null} theme={theme}/>
        }

        {/* Peak study time info */}
        {peakHour && permission === 'granted' && (
          <div className="rounded-2xl p-3 mb-5 flex items-center gap-3"
            style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <span className="text-2xl">🧠</span>
            <div>
              <p className="text-sm font-black" style={{ color: theme.accent }}>
                Your peak study time: {peakHour.label}
              </p>
              <p className="text-xs" style={{ color: theme.muted }}>
                You score {peakHour.avgScore}% on average at this time. Daily reminders set for then.
              </p>
            </div>
          </div>
        )}

        {/* Notification toggles */}
        {permission === 'granted' && (
          <>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>
              Notification Types
            </p>
            <div className="space-y-2 mb-6">
              {NOTIF_TYPES.map(n => (
                <div key={n.key} className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <span className="text-2xl flex-shrink-0">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: theme.text }}>{n.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: theme.muted }}>{n.desc}</p>
                  </div>
                  <Toggle value={settings[n.key] ?? true} onChange={v => handleToggle(n.key, v)} theme={theme}/>
                </div>
              ))}
            </div>

            {/* Test + reschedule */}
            <div className="space-y-2 mb-5">
              <button onClick={handleTest}
                className="w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                style={{
                  background: testSent ? 'rgba(74,222,128,0.15)' : `${theme.accent}18`,
                  color: testSent ? '#4ADE80' : theme.accent,
                  border: `1px solid ${testSent ? 'rgba(74,222,128,0.3)' : theme.accent + '44'}`,
                }}>
                {testSent ? '✅ Test Notification Sent!' : '🔔 Send Test Notification'}
              </button>
              <button onClick={reschedule} disabled={scheduling}
                className="w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40"
                style={{ background: theme.card, color: theme.subtext, border: `1px solid ${theme.border}` }}>
                {scheduling ? '⏳ Rescheduling...' : '🔄 Reschedule All Reminders'}
              </button>
            </div>
          </>
        )}

        {/* How it works */}
        <div className="rounded-2xl p-4"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="font-black text-sm mb-2" style={{ color: theme.text }}>💡 How Smart Reminders Work</p>
          {[
            'Your daily reminder fires at your personal peak study time — the hour when you score best',
            'Streak alerts fire at 8 PM only if you haven\'t studied that day',
            'Mission reminders fire at 6 PM only if your daily missions are incomplete',
            'Notifications work even when the app is closed — as long as it\'s installed as a PWA',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
              <span style={{ color: theme.accent, flexShrink: 0 }}>→</span>
              <p className="text-xs leading-relaxed" style={{ color: theme.subtext }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
      <Navbar />
    </div>
  )
}
