import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { getDueForReview, getAllForgettingCurveData } from '../ai/learning.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const SUBJ_ICONS  = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJ_COLORS = { mathematics:'#0D9488', physics:'#06B6D4', biology:'#16A34A', chemistry:'#7C3AED' }

function RetentionRing({ value, size = 56 }) {
  const r = size / 2 - 6
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  const col = value > 70 ? '#4ADE80' : value > 40 ? '#F59E0B' : '#EF4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={col} fontSize="10" fontWeight="800">{value}%</text>
    </svg>
  )
}

export default function ForgettingCurve() {
  const { student } = useUser()
  const { theme }   = useTheme()
  const navigate    = useNavigate()
  const [due, setDue]     = useState([])
  const [all, setAll]     = useState([])
  const [tab, setTab]     = useState('due')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    Promise.all([
      getDueForReview(student.id),
      getAllForgettingCurveData(student.id),
    ]).then(([d, a]) => {
      setDue(d); setAll(a); setLoading(false)
    })
  }, [student])

  const urgent   = due.filter(d => d.urgency === 'critical')
  const high     = due.filter(d => d.urgency === 'high')
  const normal   = due.filter(d => d.urgency === 'normal')
  const strong   = all.filter(d => d.status === 'strong')
  const fading   = all.filter(d => d.status === 'fading')
  const forgotten= all.filter(d => d.status === 'forgotten')

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      <style>{`@keyframes pulseRed{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-5 relative overflow-hidden"
        style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 50%, rgba(239,68,68,0.1) 0%, transparent 60%)' }}/>
        <button onClick={() => navigate('/ai-tutor')} className="text-sm mb-3 block" style={{ color: theme.muted }}>← AI Tutor</button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>📉</div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>Forgetting Curve</h1>
            <p className="text-xs" style={{ color: theme.muted }}>Ebbinghaus model · Reviews scheduled by AI</p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 mt-3">
          {[
            { label: `${urgent.length + high.length} Due`, col: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
            { label: `${fading.length} Fading`, col: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
            { label: `${strong.length} Strong`, col: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
          ].map(p => (
            <span key={p.label} className="text-xs px-3 py-1 rounded-full font-bold"
              style={{ background: p.bg, color: p.col }}>{p.label}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 pt-4">
        {[['due','⏰ Due Now'],['all','📊 All Topics']].map(([id, label]) => (
          <button key={id} onClick={() => { SoundEngine.tap(); setTab(id) }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === id ? `${theme.accent}22` : theme.card,
              color: tab === id ? theme.accent : theme.subtext,
              border: `1px solid ${tab === id ? theme.accent + '44' : theme.border}`,
            }}>{label}</button>
        ))}
      </div>

      <div className="px-5 pt-4">
        {loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📉</div>
            <p style={{ color: theme.muted }}>Calculating retention scores...</p>
          </div>
        )}

        {/* ── DUE NOW ── */}
        {!loading && tab === 'due' && (
          <>
            {due.length === 0 ? (
              <div className="text-center py-12 rounded-2xl"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-black text-lg mb-1" style={{ color: theme.text }}>All caught up!</p>
                <p className="text-sm" style={{ color: theme.muted }}>
                  No topics due for review. Keep studying to build your memory bank.
                </p>
              </div>
            ) : (
              <>
                {/* Explanation banner */}
                <div className="rounded-2xl p-3 mb-4"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-xs" style={{ color: '#F59E0B' }}>
                    💡 The Ebbinghaus Forgetting Curve shows how quickly memory fades. Reviewing at the right moment locks information into long-term memory. These topics are at risk — review them now.
                  </p>
                </div>

                {urgent.length > 0 && (
                  <>
                    <p className="text-xs font-black mb-2" style={{ color: '#EF4444', animation: 'pulseRed 2s infinite' }}>
                      🔴 CRITICAL — nearly forgotten
                    </p>
                    {urgent.map(item => <ReviewCard key={item.id} item={item} theme={theme} navigate={navigate} />)}
                  </>
                )}
                {high.length > 0 && (
                  <>
                    <p className="text-xs font-black mb-2 mt-3" style={{ color: '#F59E0B' }}>🟡 HIGH — fading fast</p>
                    {high.map(item => <ReviewCard key={item.id} item={item} theme={theme} navigate={navigate} />)}
                  </>
                )}
                {normal.length > 0 && (
                  <>
                    <p className="text-xs font-black mb-2 mt-3" style={{ color: '#94A3B8' }}>🔵 Scheduled review</p>
                    {normal.map(item => <ReviewCard key={item.id} item={item} theme={theme} navigate={navigate} />)}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── ALL TOPICS ── */}
        {!loading && tab === 'all' && (
          <>
            {all.length === 0 ? (
              <div className="text-center py-12 rounded-2xl"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="text-5xl mb-3">📚</div>
                <p className="font-black mb-1" style={{ color: theme.text }}>No data yet</p>
                <p className="text-sm" style={{ color: theme.muted }}>Complete quizzes to start tracking your memory retention.</p>
              </div>
            ) : (
              <>
                {[
                  { label: '💪 Strong Memory', items: strong, col: '#4ADE80' },
                  { label: '⚡ Fading', items: fading, col: '#F59E0B' },
                  { label: '💤 Forgotten', items: forgotten, col: '#EF4444' },
                ].map(group => group.items.length > 0 && (
                  <div key={group.label} className="mb-5">
                    <p className="text-xs font-black mb-2" style={{ color: group.col }}>{group.label}</p>
                    {group.items.map(item => (
                      <div key={item.id} className="rounded-2xl p-3 flex items-center gap-3 mb-2"
                        style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                        <RetentionRing value={item.currentRetention} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm capitalize truncate" style={{ color: theme.text }}>
                            {(item.topic_id || '').replace(/_/g,' ')}
                          </p>
                          <p className="text-xs" style={{ color: theme.muted }}>
                            {SUBJ_ICONS[item.subject]} {item.subject} · Reviewed {item.review_count}×
                          </p>
                        </div>
                        <span className="text-xs font-bold flex-shrink-0"
                          style={{ color: group.col }}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      <Navbar />
    </div>
  )
}

function ReviewCard({ item, theme, navigate }) {
  const urgencyColors = { critical: '#EF4444', high: '#F59E0B', normal: '#94A3B8' }
  const col = urgencyColors[item.urgency] || '#94A3B8'
  const subCol = SUBJ_COLORS[item.subject] || '#7C3AED'

  return (
    <div className="rounded-2xl p-4 mb-2 flex items-center gap-3 transition-all"
      style={{ background: theme.card, border: `1px solid ${col}44` }}>
      <RetentionRing value={item.estimated_retention || 30} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm capitalize" style={{ color: theme.text }}>
          {(item.topic_id || '').replace(/_/g,' ')}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: subCol }}>
            {SUBJ_ICONS[item.subject]} {item.subject}
          </span>
          <span className="text-xs" style={{ color: theme.muted }}>
            · {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : 'due today'}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: theme.muted }}>
          Last score: {item.score_at_learning}% · Review #{item.review_count + 1}
        </p>
      </div>
      <button onClick={() => { SoundEngine.tap(); navigate(`/subject/${item.subject}`) }}
        className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
        style={{ background: subCol }}>
        Review →
      </button>
    </div>
  )
}
