import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme, THEMES, BACKGROUNDS } from '../context/ThemeContext.jsx'
import { useOffline } from '../hooks/useOffline.js'
import { syncDB } from '../db/syncDB.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const AVATARS=['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋']

// ── Push Notifications helper ─────────────────────────────────────
async function requestNotifications() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  const result = await Notification.requestPermission()
  return result
}

function scheduleReminders(times) {
  // Store in localStorage; service worker picks these up
  localStorage.setItem('elimu_reminder_times', JSON.stringify(times))
  // Demo: schedule a notification for test
  if (Notification.permission === 'granted') {
    setTimeout(() => {
      try {
        new Notification('📚 Elimu Learn', {
          body: "Time to study! Your subjects await 🚀",
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        })
      } catch(e) {}
    }, 500)
  }
}

// ── Section wrapper ───────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
      <h3 className="font-bold text-sm mb-3" style={{ color:'var(--subtext)' }}>{title}</h3>
      {children}
      {/* Notifications section */}
      <div className="px-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>🔔 Notifications</p>
        <button onClick={() => navigate('/notifications')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
          style={{ background: theme.card, border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)' }}>🔔</div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: theme.text }}>Study Reminders</p>
            <p className="text-xs" style={{ color: theme.muted }}>Smart notifications at your peak study time</p>
          </div>
          <span style={{ color: '#F59E0B' }}>→</span>
        </button>
      </div>

  {/* AI Engine section */}
      <div className="px-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>🧠 AI Engine</p>
        <button onClick={() => navigate('/ai-setup')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
          style={{ background: theme.card, border: '1px solid rgba(124,58,237,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.15)' }}>🤖</div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: theme.text }}>On-Device AI Model</p>
            <p className="text-xs" style={{ color: theme.muted }}>Download Gemma/Phi/TinyLlama for powerful offline AI</p>
          </div>
          <span style={{ color: '#A78BFA' }}>→</span>
        </button>
      </div>
</div>
  )
}

function Toggle({ label, sub, value, onChange, color='#14B8A6' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium" style={{ color:'var(--text)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{sub}</p>}
      </div>
      <button onClick={onChange}
        className="relative w-14 h-7 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? color : 'var(--border)' }}>
        <div className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all"
          style={{ left: value ? 'calc(100% - 1.5rem)' : '0.25rem' }} />
      </button>
      {/* Notifications section */}
      <div className="px-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>🔔 Notifications</p>
        <button onClick={() => navigate('/notifications')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
          style={{ background: theme.card, border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)' }}>🔔</div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: theme.text }}>Study Reminders</p>
            <p className="text-xs" style={{ color: theme.muted }}>Smart notifications at your peak study time</p>
          </div>
          <span style={{ color: '#F59E0B' }}>→</span>
        </button>
      </div>

  {/* AI Engine section */}
      <div className="px-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>🧠 AI Engine</p>
        <button onClick={() => navigate('/ai-setup')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
          style={{ background: theme.card, border: '1px solid rgba(124,58,237,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.15)' }}>🤖</div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: theme.text }}>On-Device AI Model</p>
            <p className="text-xs" style={{ color: theme.muted }}>Download Gemma/Phi/TinyLlama for powerful offline AI</p>
          </div>
          <span style={{ color: '#A78BFA' }}>→</span>
        </button>
      </div>
</div>
  )
}

export default function Settings() {
  const { student, logout, refreshStudent } = useUser()
  const { theme, themeId, bgId, setTheme, setBackground } = useTheme()
  const offline = useOffline()
  const navigate = useNavigate()

  const [soundOn, setSoundOn]       = useState(SoundEngine.isEnabled())
  const [syncing, setSyncing]       = useState(false)
  const [syncMsg, setSyncMsg]       = useState('')
  const [notifPerm, setNotifPerm]   = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [reminders, setReminders]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('elimu_reminders') || '{"morning":true,"evening":false}') } catch { return {morning:true,evening:false} }
  })

  function toggleSound() {
    const next = !soundOn; setSoundOn(next); SoundEngine.setEnabled(next)
    if (next) SoundEngine.tap()
  }

  async function handleSync() {
    if (!student || offline) return
    setSyncing(true); setSyncMsg('')
    const r = await syncDB.syncAll(student.id)
    setSyncing(false); setSyncMsg(r.error ? `Sync failed: ${r.error}` : `✅ Synced ${r.synced} records`)
  }

  async function handleNotifToggle() {
    if (notifPerm === 'unsupported') return
    if (notifPerm !== 'granted') {
      const result = await requestNotifications()
      setNotifPerm(result)
      if (result === 'granted') scheduleReminders(reminders)
    } else {
      scheduleReminders(reminders)
    }
  }

  function toggleReminder(key) {
    const next = { ...reminders, [key]: !reminders[key] }
    setReminders(next)
    localStorage.setItem('elimu_reminders', JSON.stringify(next))
    if (notifPerm === 'granted') scheduleReminders(next)
  }

  if (!student) return null

  return (
    <div className="min-h-screen pb-28" style={{ background:'var(--bg)' }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-sm mb-3 block" style={{ color:'var(--muted)' }}>← Back</button>
        <h1 className="text-2xl font-black" style={{ color:'var(--text)' }}>⚙️ Settings</h1>
      </div>

      <div className="px-5 mt-5">

        {/* ── Profile ── */}
        <Section title="👤 Profile">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl">{AVATARS[student.avatar || 0]}</div>
            <div>
              <h2 className="font-black text-lg" style={{ color:'var(--text)' }}>{student.name}</h2>
              <p className="text-sm font-semibold" style={{ color:'#14B8A6' }}>{student.class_level} Student</p>
              <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
                ⭐ {student.total_xp || 0} XP · 🔥 {student.streak_days || 1} day streak
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/achievements" onClick={() => SoundEngine.tap()}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 active:scale-95 transition-all"
              style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
              <span>🏅</span><span className="text-sm font-semibold" style={{ color:'var(--text)' }}>Achievements</span>
            </Link>
            <Link to="/report" onClick={() => SoundEngine.tap()}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 active:scale-95 transition-all"
              style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <span>📊</span><span className="text-sm font-semibold" style={{ color:'#F59E0B' }}>Progress Report</span>
            </Link>
          </div>
        </Section>

        {/* ── App Theme ── */}
        <Section title="🎨 App Theme">
          <div className="grid grid-cols-2 gap-2">
            {Object.values(THEMES).map(t => (
              <button key={t.id} onClick={() => { SoundEngine.tap(); setTheme(t.id) }}
                className="rounded-xl p-3 text-left transition-all active:scale-95"
                style={{
                  background: t.grad,
                  border: `2px solid ${themeId === t.id ? t.accent : t.border}`,
                  boxShadow: themeId === t.id ? `0 0 12px ${t.accent}44` : 'none',
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{t.icon}</span>
                  {themeId === t.id && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: t.accent + '33', color: t.accent }}>✓</span>}
                </div>
                <p className="text-xs font-bold" style={{ color: t.text }}>{t.name}</p>
                <div className="flex gap-1 mt-1.5">
                  {[t.bg, t.surface, t.accent, t.subtext].map((c,i) => (
                    <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Dashboard Background ── */}
        <Section title="🖼️ Dashboard Background">
          <div className="grid grid-cols-3 gap-2">
            {Object.values(BACKGROUNDS).map(b => (
              <button key={b.id} onClick={() => { SoundEngine.tap(); setBackground(b.id) }}
                className="rounded-xl p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                style={{
                  ...b.style,
                  background: bgId === b.id ? `${theme.accent}22` : theme.card,
                  border: `2px solid ${bgId === b.id ? theme.accent : theme.border}`,
                  minHeight: 70,
                }}>
                <span className="text-2xl">{b.icon}</span>
                <span className="text-xs font-bold" style={{ color: bgId === b.id ? theme.accent : theme.subtext }}>
                  {b.name}
                </span>
                {bgId === b.id && <span className="text-xs" style={{ color: theme.accent }}>✓</span>}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Sound & Haptics ── */}
        <Section title="🔊 Sound & Haptics">
          <Toggle
            label="Sound Effects" sub="Game sounds, chimes, fanfares"
            value={soundOn} onChange={toggleSound} color="#14B8A6"
          />
        </Section>

        {/* ── Study Reminders ── */}
        <Section title="🔔 Study Reminders">
          {notifPerm === 'unsupported' && (
            <p className="text-xs mb-2" style={{ color:'var(--muted)' }}>Push notifications not supported in this browser.</p>
          )}
          {notifPerm !== 'unsupported' && notifPerm !== 'granted' && (
            <div className="mb-3">
              <p className="text-sm mb-2" style={{ color:'var(--subtext)' }}>Allow notifications to get study reminders</p>
              <button onClick={handleNotifToggle}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
                🔔 Enable Reminders
              </button>
            </div>
          )}
          {notifPerm === 'granted' && (
            <div className="space-y-2">
              <Toggle
                label="Morning reminder" sub="6:30 AM — start your day with a lesson"
                value={reminders.morning} onChange={() => toggleReminder('morning')} color="#F59E0B"
              />
              <Toggle
                label="Evening reminder" sub="7:00 PM — evening revision session"
                value={reminders.evening} onChange={() => toggleReminder('evening')} color="#7C3AED"
              />
              <p className="text-xs mt-2" style={{ color:'var(--muted)' }}>
                ✅ Notifications enabled. Reminders fire at the set times when the app is open.
              </p>
            </div>
          )}
        </Section>

        {/* ── Sync ── */}
        <Section title="☁️ Cloud Sync">
          <Toggle
            label="Sync enabled" sub={offline ? 'Offline — sync when connected' : 'Online — data syncs automatically'}
            value={!offline} onChange={() => {}} color="#14B8A6"
          />
          <button onClick={handleSync} disabled={syncing || offline}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: offline ? 'var(--surface)' : 'var(--card)', color: offline ? 'var(--muted)' : '#14B8A6', border:'1px solid var(--border)' }}>
            {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
          </button>
          {syncMsg && <p className="text-xs mt-2 text-center" style={{ color:'var(--subtext)' }}>{syncMsg}</p>}
        </Section>

        {/* ── Account ── */}
        <Section title="🔐 Account">
          <button onClick={() => { SoundEngine.tap(); if (confirm('Sign out? Your progress is saved locally.')) logout() }}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>
            Sign Out
          </button>
        </Section>

        {/* ── SEMATECH DEVELOPERS Branding ── */}
        <div className="mt-6 mb-2 text-center">
          <div className="inline-block px-6 py-4 rounded-2xl" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)', color:'white' }}>S</div>
              <span className="font-black text-sm tracking-widest uppercase"
                style={{ color:'var(--text)' }}>SEMATECH</span>
              <span className="font-light text-sm tracking-widest uppercase"
                style={{ color:'var(--subtext)' }}>DEVELOPERS</span>
            </div>
            <p className="text-xs" style={{ color:'var(--muted)' }}>Elimu Learn · Version 2.0</p>
            <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>Built for Ugandan Students 🇺🇬</p>
          </div>
        </div>

      </div>
      <Navbar />
      {/* Notifications section */}
      <div className="px-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>🔔 Notifications</p>
        <button onClick={() => navigate('/notifications')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
          style={{ background: theme.card, border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)' }}>🔔</div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: theme.text }}>Study Reminders</p>
            <p className="text-xs" style={{ color: theme.muted }}>Smart notifications at your peak study time</p>
          </div>
          <span style={{ color: '#F59E0B' }}>→</span>
        </button>
      </div>

  {/* AI Engine section */}
      <div className="px-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.muted }}>🧠 AI Engine</p>
        <button onClick={() => navigate('/ai-setup')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
          style={{ background: theme.card, border: '1px solid rgba(124,58,237,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.15)' }}>🤖</div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: theme.text }}>On-Device AI Model</p>
            <p className="text-xs" style={{ color: theme.muted }}>Download Gemma/Phi/TinyLlama for powerful offline AI</p>
          </div>
          <span style={{ color: '#A78BFA' }}>→</span>
        </button>
      </div>
</div>
  )
}
