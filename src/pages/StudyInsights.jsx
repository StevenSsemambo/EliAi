import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { analyseStudyHabits, detectLearningStyle, getSavedLearningStyle, getCognitiveProfile } from '../ai/learning.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const STYLE_ICONS = { visual:'👁️', analytical:'🔢', memory:'🧠', applied:'🔬', balanced:'⚖️' }
const STYLE_COLORS= { visual:'#06B6D4', analytical:'#7C3AED', memory:'#F59E0B', applied:'#16A34A', balanced:'#0D9488' }
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function StatCard({ icon, label, value, sub, color }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}22`, color }}>
          {sub}
        </span>
      </div>
      <div className="font-black text-xl mt-1" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>{label}</div>
    </div>
  )
}

function HourBar({ stat, maxScore, theme }) {
  const pct = maxScore > 0 ? (stat.avgScore / maxScore) * 100 : 0
  const col = stat.avgScore > 75 ? '#4ADE80' : stat.avgScore > 55 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs w-12 text-right flex-shrink-0" style={{ color: theme.muted }}>{stat.label}</span>
      <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: theme.border }}>
        <div className="h-full rounded-lg flex items-center px-2 transition-all duration-700"
          style={{ width: `${Math.max(8, pct)}%`, background: col }}>
          <span className="text-xs font-black text-white">{stat.avgScore}%</span>
        </div>
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: theme.muted }}>{stat.count}×</span>
    </div>
  )
}

export default function StudyInsights() {
  const { student } = useUser()
  const { theme }   = useTheme()
  const navigate    = useNavigate()

  const [habits, setHabits]   = useState(null)
  const [style, setStyle]     = useState(null)
  const [cogProfile, setCog]  = useState(null)
  const [tab, setTab]         = useState('habits')
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    if (!student) return
    Promise.all([
      analyseStudyHabits(student.id),
      getSavedLearningStyle(student.id),
      getCognitiveProfile(student.id),
    ]).then(([h, s, c]) => {
      setHabits(h); setStyle(s); setCog(c); setLoading(false)
    })
  }, [student])

  async function runStyleDetection() {
    setDetecting(true); SoundEngine.tap()
    const s = await detectLearningStyle(student.id)
    setStyle(s); setDetecting(false)
  }

  const TABS = [
    { id:'habits',  label:'📆 Habits'  },
    { id:'style',   label:'🧠 Style'   },
    { id:'cogload', label:'⚡ Cognition'},
  ]

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      <style>{`@keyframes barGrow{from{width:0}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-4"
        style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => navigate('/ai-tutor')} className="text-sm mb-3 block" style={{ color: theme.muted }}>← AI Tutor</button>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>🔬 Study Insights</h1>
        <p className="text-xs mt-0.5" style={{ color: theme.muted }}>
          Learning style · Study habits · Cognitive profile
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-5 pt-4 pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { SoundEngine.tap(); setTab(t.id) }}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t.id ? `${theme.accent}22` : theme.card,
              color: tab === t.id ? theme.accent : theme.subtext,
              border: `1px solid ${tab === t.id ? theme.accent + '44' : theme.border}`,
            }}>{t.label}</button>
        ))}
      </div>

      <div className="px-5 pt-2">

        {loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔬</div>
            <p style={{ color: theme.muted }}>Analysing your study patterns...</p>
          </div>
        )}

        {/* ── STUDY HABITS TAB ── */}
        {!loading && tab === 'habits' && (
          <>
            {!habits?.hasEnoughData ? (
              <div className="text-center py-10 rounded-2xl mb-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="text-5xl mb-3">📆</div>
                <p className="font-black text-lg mb-2" style={{ color: theme.text }}>Building your habit profile</p>
                <p className="text-sm mb-3" style={{ color: theme.muted }}>{habits?.message}</p>
                <div className="mx-8 h-2 rounded-full overflow-hidden" style={{ background: theme.border }}>
                  <div className="h-full rounded-full" style={{ background: theme.accent,
                    width: `${Math.min(100, ((habits?.sessions || 0) / 10) * 100)}%` }}/>
                </div>
                <p className="text-xs mt-2" style={{ color: theme.muted }}>
                  {habits?.sessions || 0} / 10 sessions recorded
                </p>
              </div>
            ) : (
              <>
                {/* Key stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatCard icon="⏰" label="Peak study hour" color="#F59E0B"
                    value={habits.peakHour?.label || 'N/A'}
                    sub={`${habits.peakHour?.avgScore || 0}% avg`} />
                  <StatCard icon="📅" label="Best study day" color="#7C3AED"
                    value={habits.peakDay?.dayName || 'N/A'}
                    sub={`${habits.peakDay?.avgScore || 0}% avg`} />
                  <StatCard icon="🎯" label="Study consistency" color={habits.consistency >= 70 ? '#4ADE80' : '#F59E0B'}
                    value={`${habits.consistency}%`}
                    sub={`${habits.studyDaysCount} days`} />
                  <StatCard icon="⏱️" label="Avg session length" color="#06B6D4"
                    value={`${habits.avgDuration}m`}
                    sub={`${habits.sessions} sessions`} />
                </div>

                {/* Hour performance chart */}
                <div className="rounded-2xl p-4 mb-4"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="font-black text-sm mb-3" style={{ color: theme.text }}>
                    📊 Performance by Time of Day
                  </p>
                  {(() => {
                    const maxScore = Math.max(...(habits.hourStats || []).map(h => h.avgScore), 1)
                    return (habits.hourStats || []).map(stat => (
                      <HourBar key={stat.hour} stat={stat} maxScore={maxScore} theme={theme} />
                    ))
                  })()}
                </div>

                {/* Day of week heatmap */}
                <div className="rounded-2xl p-4 mb-4"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="font-black text-sm mb-3" style={{ color: theme.text }}>📅 Performance by Day</p>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map((day, i) => {
                      const d = (habits.dayStats || []).find(s => s.day === i)
                      const score = d?.avgScore || 0
                      const col = score > 75 ? '#4ADE80' : score > 55 ? '#F59E0B' : score > 0 ? '#EF4444' : theme.border
                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div className="w-full rounded-lg flex items-center justify-center text-xs font-black"
                            style={{ height: 36, background: score > 0 ? `${col}33` : theme.surface,
                              border: `1px solid ${col}`, color: col }}>
                            {score > 0 ? `${score}` : '–'}
                          </div>
                          <span className="text-xs" style={{ color: theme.muted, fontSize:'0.6rem' }}>{day}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Insights */}
                <div className="rounded-2xl p-4 mb-4"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="font-black text-sm mb-2" style={{ color: '#F59E0B' }}>💡 AI Insights</p>
                  {(habits.insight || []).map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                      <span style={{ color: '#F59E0B' }}>→</span>
                      <p className="text-xs leading-relaxed" style={{ color: theme.subtext }}>{ins}</p>
                    </div>
                  ))}
                  {habits.reminderSuggestion && (
                    <p className="text-xs mt-2 font-bold" style={{ color: theme.accent }}>
                      🔔 {habits.reminderSuggestion}
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── LEARNING STYLE TAB ── */}
        {!loading && tab === 'style' && (
          <>
            {!style ? (
              <div className="text-center py-10 rounded-2xl mb-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="text-5xl mb-3">🧠</div>
                <p className="font-black text-lg mb-2" style={{ color: theme.text }}>Detect Your Learning Style</p>
                <p className="text-sm mb-4" style={{ color: theme.muted }}>
                  The AI analyses your quiz performance patterns to identify how you learn best.
                  Complete more quizzes for a more accurate result.
                </p>
                <button onClick={runStyleDetection} disabled={detecting}
                  className="px-6 py-3 rounded-2xl font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
                  {detecting ? '🔍 Analysing...' : '🧠 Detect My Style'}
                </button>
              </div>
            ) : (
              <>
                {/* Dominant style hero */}
                <div className="rounded-2xl p-5 mb-4 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${STYLE_COLORS[style.dominant]}22, ${STYLE_COLORS[style.dominant]}11)`,
                    border: `2px solid ${STYLE_COLORS[style.dominant]}44`,
                  }}>
                  <div className="text-5xl mb-2">{STYLE_ICONS[style.dominant]}</div>
                  <h2 className="text-2xl font-black capitalize mb-1"
                    style={{ color: STYLE_COLORS[style.dominant] }}>
                    {style.dominant} Learner
                  </h2>
                  {style.secondary && (
                    <p className="text-xs mb-2" style={{ color: theme.muted }}>
                      Secondary: {style.secondary} · {!style.reliable && '⚠️ Need more data for accuracy'}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: theme.subtext }}>{style.advice}</p>
                </div>

                {/* Style breakdown */}
                <div className="rounded-2xl p-4 mb-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="font-black text-sm mb-3" style={{ color: theme.text }}>📊 Accuracy by Question Type</p>
                  {Object.entries(style.accuracy || {}).map(([s, score]) => {
                    const col = STYLE_COLORS[s] || '#94A3B8'
                    const n   = style.sampleSizes?.[s] || 0
                    return (
                      <div key={s} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span>{STYLE_ICONS[s]}</span>
                            <span className="text-sm font-bold capitalize" style={{ color: theme.text }}>{s}</span>
                          </div>
                          <span className="text-xs" style={{ color: theme.muted }}>
                            {score}% · {n} questions
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.border }}>
                          <div className="h-full rounded-full" style={{ width: `${score}%`, background: col }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Adaptations */}
                <div className="rounded-2xl p-4 mb-4"
                  style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <p className="font-black text-sm mb-2" style={{ color: '#A78BFA' }}>
                    🎯 How to adapt your studying
                  </p>
                  {(style.contentAdaptations || []).map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                      <span style={{ color:'#A78BFA' }}>→</span>
                      <p className="text-xs" style={{ color: theme.subtext }}>{tip}</p>
                    </div>
                  ))}
                </div>

                <button onClick={runStyleDetection} disabled={detecting}
                  className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: theme.card, color: theme.accent, border: `1px solid ${theme.accent}44` }}>
                  {detecting ? '🔍 Re-analysing...' : '🔄 Re-run Detection'}
                </button>
              </>
            )}
          </>
        )}

        {/* ── COGNITIVE LOAD TAB ── */}
        {!loading && tab === 'cogload' && (
          <>
            {!cogProfile ? (
              <div className="text-center py-10 rounded-2xl"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="text-5xl mb-3">⚡</div>
                <p className="font-black mb-2" style={{ color: theme.text }}>No cognitive data yet</p>
                <p className="text-sm" style={{ color: theme.muted }}>
                  Complete at least 3 timed quizzes for your cognitive load profile to appear.
                </p>
              </div>
            ) : (
              <>
                {/* Profile card */}
                <div className="rounded-2xl p-5 mb-4 text-center"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <div className="text-4xl mb-2">
                    {cogProfile.dominantStyle === 'master' ? '🏆'
                    : cogProfile.dominantStyle === 'learner' ? '📈'
                    : cogProfile.dominantStyle === 'guesser' ? '⚡'
                    : '💪'}
                  </div>
                  <h2 className="text-xl font-black mb-1 capitalize" style={{ color: theme.text }}>
                    {cogProfile.dominantStyle === 'master' ? 'High Confidence Learner'
                    : cogProfile.dominantStyle === 'learner' ? 'Active Learner'
                    : cogProfile.dominantStyle === 'guesser' ? 'Speed Guesser'
                    : 'Working Hard'}
                  </h2>
                  <p className="text-sm" style={{ color: theme.subtext }}>{cogProfile.recommendation}</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label:'Avg Confidence', value:`${cogProfile.avgConfidence}%`, col:'#4ADE80' },
                    { label:'Guessing Rate', value:`${cogProfile.guessingRate}%`,
                      col: cogProfile.guessingRate > 30 ? '#EF4444' : '#4ADE80' },
                    { label:'Sessions', value: cogProfile.totalSessions, col:'#06B6D4' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                      <div className="font-black text-xl" style={{ color: s.col }}>{s.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: theme.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* What it means */}
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <p className="font-black text-sm mb-2" style={{ color:'#06B6D4' }}>💡 What this means</p>
                  <div className="space-y-2">
                    {[
                      { icon:'⚡', label:'Fast + Wrong', text:'Guessing — slow down, read every word of the question' },
                      { icon:'🤔', label:'Slow + Correct', text:'Effortful thinking — excellent! This is real learning happening' },
                      { icon:'✅', label:'Fast + Correct', text:'Mastered — this topic is in your long-term memory' },
                      { icon:'😓', label:'Slow + Wrong', text:'Struggling — use Socratic Tutor or revisit the lesson' },
                    ].map(r => (
                      <div key={r.icon} className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0">{r.icon}</span>
                        <div>
                          <span className="text-xs font-bold" style={{ color: theme.text }}>{r.label}: </span>
                          <span className="text-xs" style={{ color: theme.subtext }}>{r.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <Navbar />
    </div>
  )
}
