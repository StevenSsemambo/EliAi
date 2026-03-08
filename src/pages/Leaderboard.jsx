import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'
import db from '../db/schema.js'
import Navbar from '../components/Navbar.jsx'

const AVATARS = ['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋']
const MEDALS  = ['🥇','🥈','🥉']

// ── Weekly XP: sum progress completed_at in current week ─────────
function getWeekStart() {
  const now = new Date()
  const day = now.getDay()                    // 0=Sun, 1=Mon …
  const diff = (day === 0 ? -6 : 1 - day)    // days back to Monday
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

async function getWeeklyXp(studentId) {
  const weekStart = getWeekStart()
  const allProgress = await db.progress
    .where('student_id').equals(studentId)
    .and(p => p.status === 'completed' && p.completed_at && new Date(p.completed_at) >= weekStart)
    .toArray()
  return allProgress.reduce((sum, p) => {
    const xp = (p.best_score || 0) >= 70 ? 50 : 20
    return sum + xp
  }, 0)
}

function getRankColor(i) {
  return i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : '#64748B'
}

function WeekBar() {
  const now = new Date()
  const weekStart = getWeekStart()
  const dayOfWeek = ((now.getDay() + 6) % 7)  // 0=Mon … 6=Sun
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  return (
    <div className="flex gap-1 justify-center mt-2">
      {days.map((d, i) => (
        <div key={d} className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background: i < dayOfWeek ? 'rgba(245,158,11,0.3)' : i === dayOfWeek ? '#F59E0B' : 'rgba(255,255,255,0.05)',
              color: i <= dayOfWeek ? '#F59E0B' : '#3A4560',
              border: i === dayOfWeek ? '1px solid #F59E0B' : '1px solid transparent'
            }}>
            {i < dayOfWeek ? '✓' : i === dayOfWeek ? '●' : '○'}
          </div>
          <span className="text-xs" style={{ color: i <= dayOfWeek ? '#94A3B8' : '#2A3555', fontSize:'0.6rem' }}>{d}</span>
        </div>
      ))}
    </div>
  )
}

export default function Leaderboard() {
  const { student } = useUser()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [tab, setTab]            = useState('weekly')  // 'weekly' | 'alltime'
  const [entries, setEntries]    = useState([])
  const [loading, setLoading]    = useState(true)
  const [weekReset, setWeekReset] = useState('')

  useEffect(() => {
    loadLeaderboard()
    // Compute next Monday
    const mon = getWeekStart()
    mon.setDate(mon.getDate() + 7)
    setWeekReset(mon.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'short' }))
  }, [tab])

  async function loadLeaderboard() {
    setLoading(true)
    const all = await db.students.toArray()
    const withScores = await Promise.all(all.map(async s => ({
      ...s,
      weeklyXp: await getWeeklyXp(s.id),
    })))

    const sorted = [...withScores].sort((a, b) =>
      tab === 'weekly'
        ? (b.weeklyXp || 0) - (a.weeklyXp || 0)
        : (b.total_xp || 0) - (a.total_xp || 0)
    )
    setEntries(sorted)
    setLoading(false)
  }

  const myEntry = entries.find(e => e.id === student?.id)
  const myRank  = entries.indexOf(myEntry) + 1

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-5 relative overflow-hidden"
        style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${theme.accent}18 0%, transparent 70%)` }} />
        <button onClick={() => navigate('/dashboard')} className="text-sm mb-3 block" style={{ color: theme.muted }}>← Dashboard</button>
        <h1 className="text-2xl font-black mb-1" style={{ color: theme.text }}>🏆 Leaderboard</h1>

        {/* Week progress bar */}
        <WeekBar />
        <p className="text-xs text-center mt-2" style={{ color: theme.muted }}>
          Resets Monday · Next reset: {weekReset}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 px-5 pt-4">
        {[['weekly','🗓 This Week'],['alltime','⭐ All Time']].map(([id,label]) => (
          <button key={id} onClick={() => { SoundEngine.tap(); setTab(id) }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab===id ? theme.accent+'22' : theme.card,
              border: `1px solid ${tab===id ? theme.accent : theme.border}`,
              color: tab===id ? theme.accent : theme.subtext,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* My rank strip */}
      {myEntry && (
        <div className="mx-5 mt-3 rounded-2xl p-3 flex items-center gap-3"
          style={{ background: `${theme.accent}12`, border: `1px solid ${theme.accent}44` }}>
          <span className="text-xl font-black" style={{ color: theme.accent }}>#{myRank}</span>
          <span className="text-2xl">{AVATARS[myEntry.avatar || 0]}</span>
          <div className="flex-1">
            <span className="font-bold text-sm" style={{ color: theme.text }}>{myEntry.name}</span>
            <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full"
              style={{ background: `${theme.accent}22`, color: theme.accent }}>You</span>
          </div>
          <div className="text-right">
            <div className="font-black text-base" style={{ color: theme.accent }}>
              {tab === 'weekly' ? (myEntry.weeklyXp || 0) : (myEntry.total_xp || 0)}
            </div>
            <div className="text-xs" style={{ color: theme.muted }}>XP</div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-5 mt-3 space-y-2 pb-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🏆</div>
            <p className="text-sm" style={{ color: theme.muted }}>Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p style={{ color: theme.subtext }}>No students yet</p>
          </div>
        ) : entries.map((s, i) => {
          const xp = tab === 'weekly' ? (s.weeklyXp || 0) : (s.total_xp || 0)
          const isMe = s.id === student?.id
          const rankColor = getRankColor(i)
          return (
            <div key={s.id}
              className="rounded-2xl p-4 flex items-center gap-3 transition-all"
              style={{
                background: isMe ? `${theme.accent}10` : theme.card,
                border: `1px solid ${isMe ? theme.accent+'44' : theme.border}`,
                animation: `slideUp 0.3s ease both`,
                animationDelay: `${i * 0.05}s`,
              }}>
              {/* Rank */}
              <div className="w-8 text-center flex-shrink-0">
                {i < 3 ? (
                  <span className="text-2xl">{MEDALS[i]}</span>
                ) : (
                  <span className="font-black text-sm" style={{ color: rankColor }}>#{i+1}</span>
                )}
              </div>

              {/* Avatar */}
              <span className="text-3xl flex-shrink-0">{AVATARS[s.avatar || 0]}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm truncate" style={{ color: theme.text }}>{s.name}</span>
                  {isMe && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background:`${theme.accent}22`, color: theme.accent }}>You</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: theme.muted }}>{s.class_level}</span>
                  <span className="text-xs" style={{ color: theme.muted }}>🔥 {s.streak_days || 1}d</span>
                  {tab === 'weekly' && xp > 0 && (
                    <span className="text-xs font-bold" style={{ color: '#4ADE80' }}>+{xp} this week</span>
                  )}
                </div>
              </div>

              {/* XP */}
              <div className="text-right flex-shrink-0">
                <div className="font-black text-base" style={{ color: rankColor }}>
                  {xp.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: theme.muted }}>XP</div>
              </div>
            </div>
          )
        })}

        {/* Motivation footer */}
        {tab === 'weekly' && (
          <div className="rounded-2xl p-4 text-center mt-2"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: theme.text }}>💡 How to climb the board</p>
            <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>
              Complete lessons (+20 XP) · Pass quizzes with 70%+ (+50 XP) · Weekly totals reset every Monday at midnight
            </p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}
