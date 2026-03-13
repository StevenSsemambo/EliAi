import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { progressDB } from '../db/progressDB.js'
import { analyseStudent } from '../ai/brain.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Navbar from '../components/Navbar.jsx'
import { ProgressSkeleton } from '../components/Skeletons.jsx'

const SUBJECTS = ['mathematics', 'physics', 'biology', 'chemistry']
const COLORS = { mathematics: '#0D9488', physics: '#0E7490', biology: '#15803D', chemistry: '#7C3AED' }
const ICONS = { mathematics: '📐', physics: '⚡', biology: '🧬', chemistry: '🧪' }

export default function Progress() {
  const { student } = useUser()
  const navigate = useNavigate()
  const [stats, setStats] = useState([])
  const [allProgress, setAllProgress] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    if (!student) return
    progressDB.getAllProgress(student.id).then(prog => {
      setAllProgress(prog)
      const s = SUBJECTS.map(sub => {
        const subProg = prog.filter(p => p.subject === sub)
        const completed = subProg.filter(p => p.status === 'completed')
        const avgScore = completed.length ? Math.round(completed.reduce((a,p) => a + p.score, 0) / completed.length) : 0
        return { subject: sub, label: sub.charAt(0).toUpperCase() + sub.slice(1), completed: completed.length, avgScore }
      })
      setStats(s)
    })
    // Load brain.js analysis for rich AI insights
    analyseStudent(student.id).then(setAnalysis).catch(() => {})
    progressDB.getAllProgress(student.id).then(() => setDataReady(true)).catch(() => setDataReady(true))
  }, [student])

  const totalCompleted = allProgress.filter(p => p.status === 'completed').length
  const overallAvg = totalCompleted ? Math.round(allProgress.filter(p => p.status === 'completed').reduce((a,p) => a + p.score, 0) / totalCompleted) : 0

  // Top UNEB risk topics from brain.js
  const topRisks = analysis
    ? Object.values(analysis.examPredictions).flat()
        .filter(t => t.riskScore > 0.3)
        .sort((a,b) => b.riskScore - a.riskScore)
        .slice(0, 4)
    : []

  // Top weak topics
  const weakTopics = analysis?.allWeakTopics?.slice(0, 4) || []

  // Dominant mistake
  const topMistake = analysis?.dominantMistakes?.[0]

  if (!student || !dataReady) return <ProgressSkeleton />

  return (
    <div className="min-h-screen pb-24" style={{background:"#0C0F1A"}}>
      <div className="px-5 pt-12 pb-6 border-b border-night-border">
        <h1 className="text-2xl font-display font-bold text-white">📊 My Progress</h1>
        <p className="text-slate-400 text-sm">{student?.name} • {student?.class_level}</p>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* Overall stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Lessons Done', value: totalCompleted, icon: '✅' },
            { label: 'Avg Score', value: `${overallAvg}%`, icon: '🎯' },
            { label: 'Total XP', value: student?.total_xp || 0, icon: '⭐' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-lg font-display font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subject strength from brain.js */}
        {analysis && analysis.summary.totalCompleted > 0 && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-white font-semibold mb-3 text-sm">🧠 AI Subject Strength</h2>
            {SUBJECTS.map(sub => {
              const str = analysis.subjectStrength[sub] ?? 0
              const diff = analysis.adaptiveDifficulty[sub] ?? 1
              return (
                <div key={sub} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">{ICONS[sub]} {sub.charAt(0).toUpperCase()+sub.slice(1)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: diff >= 4 ? 'rgba(239,68,68,0.15)' : diff >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                        color: diff >= 4 ? '#F87171' : diff >= 3 ? '#FCD34D' : '#4ADE80'
                      }}>Lvl {diff}</span>
                      <span className="text-xs font-bold text-white">{str}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{background:'#1A2035'}}>
                    <div className="h-full rounded-full transition-all" style={{width:`${str}%`, background: COLORS[sub]}}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Chart — fallback if no brain data */}
        {!analysis && stats.some(s => s.completed > 0) && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-white font-semibold mb-3 text-sm">Average Score by Subject</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats} barSize={32}>
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, color: '#E2E8F0' }} />
                <Bar dataKey="avgScore" radius={[6,6,0,0]}>
                  {stats.map((s, i) => <Cell key={i} fill={COLORS[s.subject]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weak topics needing attention */}
        {weakTopics.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-white font-semibold mb-3 text-sm">⚠️ Topics Needing Work</h2>
            <div className="space-y-2">
              {weakTopics.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.18)'}}>
                  <div>
                    <span className="text-white text-sm font-medium">{t.topic.replace(/_/g,' ')}</span>
                    <span className="text-slate-500 text-xs ml-2">{t.subject}</span>
                  </div>
                  <span className="text-red-400 font-bold text-sm">{t.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UNEB exam risk */}
        {topRisks.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-white font-semibold mb-3 text-sm">🎓 UNEB Exam Risk</h2>
            <p className="text-slate-500 text-xs mb-3">Topics frequently examined that you're still weak on</p>
            <div className="space-y-2">
              {topRisks.map((t, i) => {
                const risk = Math.round(t.riskScore * 100)
                const col = risk > 60 ? '#EF4444' : risk > 40 ? '#F59E0B' : '#F87171'
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{background:`${col}10`,border:`1px solid ${col}30`}}>
                    <div>
                      <span className="text-white text-sm font-medium">{t.topic.replace(/_/g,' ')}</span>
                      <span className="text-xs ml-2" style={{color:'#94A3B8'}}>exam weight: {Math.round((t.examWeight||0)*100)}%</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:`${col}20`,color:col}}>
                      {risk}% risk
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Dominant mistake pattern */}
        {topMistake && (
          <div className="glass rounded-2xl p-4" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
            <h2 className="text-white font-semibold mb-1 text-sm">🔍 Your Main Mistake Pattern</h2>
            <p className="text-yellow-400 font-bold text-sm mb-1">{topMistake.label}</p>
            <p className="text-slate-400 text-xs">{topMistake.advice || 'Focus on understanding the concept before attempting questions.'}</p>
          </div>
        )}

        {/* Per subject rows */}
        <h2 className="text-white font-display font-bold">By Subject</h2>
        {stats.map(s => (
          <div key={s.subject} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{ICONS[s.subject]}</span>
              <div>
                <div className="text-white font-semibold text-sm">{s.label}</div>
                <div className="text-slate-400 text-xs">{s.completed} lessons completed</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-white font-bold">{s.avgScore}%</div>
                <div className="text-slate-400 text-xs">avg score</div>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${s.avgScore}%`, background: COLORS[s.subject] }} />
            </div>
          </div>
        ))}

        {totalCompleted === 0 && (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-slate-400">No progress yet!</p>
            <p className="text-slate-500 text-sm mt-1">Complete your first lesson to see your stats here.</p>
          </div>
        )}

        {/* CTA to AI tutor */}
        {totalCompleted > 0 && (
          <button onClick={() => navigate('/ai-tutor')}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',color:'#A78BFA'}}>
            🧠 Get AI Study Plan
          </button>
        )}
      </div>
      <Navbar />
    </div>
  )
}
