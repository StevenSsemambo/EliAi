import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme, THEMES, BACKGROUNDS } from '../context/ThemeContext.jsx'
import { useOffline } from '../hooks/useOffline.js'
import { syncDB } from '../db/syncDB.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const AVATARS = ['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋']

async function requestNotifications() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return await Notification.requestPermission()
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
      <h3 className="font-bold text-sm mb-3" style={{ color:'var(--subtext)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Toggle({ label, sub, value, onChange, color='#14B8A6' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex-1 mr-3">
        <p className="text-sm font-medium" style={{ color:'var(--text)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{sub}</p>}
      </div>
      <button onClick={onChange}
        className="relative w-14 h-7 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? color : 'var(--border)' }}>
        <div className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all"
          style={{ left: value ? 'calc(100% - 1.5rem)' : '0.25rem' }} />
      </button>
    </div>
  )
}

export default function Settings() {
  const { student, logout } = useUser()
  const { theme, themeId, bgId, setTheme, setBackground } = useTheme()
  const offline = useOffline()
  const navigate = useNavigate()

  const [soundOn, setSoundOn]     = useState(SoundEngine.isEnabled())
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState('')
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('elimu_reminders') || '{"morning":true,"evening":false}') }
    catch { return { morning:true, evening:false } }
  })

  function toggleSound() {
    const next = !soundOn; setSoundOn(next); SoundEngine.setEnabled(next)
    if (next) SoundEngine.tap()
  }

  function toggleReminder(key) {
    const next = { ...reminders, [key]: !reminders[key] }
    setReminders(next)
    localStorage.setItem('elimu_reminders', JSON.stringify(next))
  }

  async function handleSync() {
    if (!student || offline) return
    setSyncing(true); setSyncMsg('')
    const r = await syncDB.syncAll(student.id)
    setSyncing(false)
    setSyncMsg(r.error ? `Sync failed: ${r.error}` : `✅ Synced ${r.synced} records`)
  }

  async function handleNotifToggle() {
    if (notifPerm === 'unsupported') return
    const result = await requestNotifications()
    setNotifPerm(result)
  }

  if (!student) return null

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: theme.surface, borderBottom:`1px solid ${theme.border}` }}>
        <button onClick={() => navigate('/dashboard')} className="text-slate-500 text-sm mb-3">← Back</button>
        <h1 className="text-2xl font-black text-white">⚙️ Settings</h1>
        <p className="text-sm mt-1" style={{ color: theme.subtext }}>{student.name} · {student.class_level}</p>
      </div>

      <div className="px-5 mt-4">

        {/* ── Theme ── */}
        <Section title="🎨 App Theme">
          <div className="grid grid-cols-2 gap-2">
            {Object.values(THEMES).map(t => (
              <button key={t.id} onClick={() => { SoundEngine.tap(); setTheme(t.id) }}
                className="rounded-xl p-3 transition-all active:scale-95 text-left"
                style={{
                  background: t.grad,
                  border: `2px solid ${themeId === t.id ? t.accent : t.border}`,
                  boxShadow: themeId === t.id ? `0 0 12px ${t.accent}44` : 'none',
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{t.icon}</span>
                  {themeId === t.id && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: t.accent + '33', color: t.accent }}>✓</span>
                  )}
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

        {/* ── Background ── */}
        <Section title="🖼️ Dashboard Background">
          <div className="grid grid-cols-3 gap-2">
            {Object.values(BACKGROUNDS).map(b => (
              <button key={b.id} onClick={() => { SoundEngine.tap(); setBackground(b.id) }}
                className="rounded-xl p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                style={{
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

        {/* ── Sound ── */}
        <Section title="🔊 Sound & Haptics">
          <Toggle
            label="Sound Effects" sub="Game sounds, chimes, fanfares"
            value={soundOn} onChange={toggleSound} color="#14B8A6"
          />
        </Section>

        {/* ── Notifications ── */}
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
              <Toggle label="Morning reminder" sub="6:30 AM — start your day with a lesson"
                value={reminders.morning} onChange={() => toggleReminder('morning')} color="#F59E0B" />
              <Toggle label="Evening reminder" sub="7:00 PM — evening revision session"
                value={reminders.evening} onChange={() => toggleReminder('evening')} color="#7C3AED" />
              <p className="text-xs mt-2" style={{ color:'var(--muted)' }}>
                ✅ Notifications enabled.
              </p>
            </div>
          )}
          <button onClick={() => navigate('/notifications')}
            className="mt-3 w-full rounded-xl p-3 flex items-center gap-2 transition-all active:scale-95"
            style={{ background:`${theme.accent}11`, border:`1px solid ${theme.accent}33` }}>
            <span>🔔</span>
            <span className="text-sm font-bold" style={{ color: theme.accent }}>Advanced Notification Settings →</span>
          </button>
        </Section>

        {/* ── AI Engine ── */}
        <Section title="🧠 AI Engine">
          <button onClick={() => navigate('/ai-setup')}
            className="w-full rounded-xl p-3 flex items-center gap-3 transition-all active:scale-95"
            style={{ background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)' }}>
            <span className="text-xl">🤖</span>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm text-white">On-Device AI Model</p>
              <p className="text-xs" style={{ color: theme.muted }}>Download Gemma/Phi/TinyLlama for offline AI</p>
            </div>
            <span style={{ color: '#A78BFA' }}>→</span>
          </button>
        </Section>

        {/* ── Sync ── */}
        <Section title="☁️ Cloud Sync">
          <Toggle
            label="Sync enabled"
            sub={offline ? 'Offline — sync when connected' : 'Online — data syncs automatically'}
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
          <button onClick={() => { SoundEngine.tap(); if (window.confirm('Sign out? Your progress is saved locally.')) logout() }}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>
            Sign Out
          </button>
        </Section>

        {/* Branding */}
        <div className="mt-6 mb-2 text-center">
          <div className="inline-block px-6 py-4 rounded-2xl" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)', color:'white' }}>S</div>
              <span className="font-black text-sm tracking-widest uppercase" style={{ color:'var(--text)' }}>SEMATECH</span>
              <span className="font-light text-sm tracking-widest uppercase" style={{ color:'var(--subtext)' }}>DEVELOPERS</span>
            </div>
            <p className="text-xs" style={{ color:'var(--muted)' }}>Elimu Learn · Version 2.0</p>
            <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>Built for Ugandan Students 🇺🇬</p>
          </div>
        </div>

      </div>
      <Navbar />
    </div>
  )
}
