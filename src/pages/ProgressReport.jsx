import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'
import db from '../db/schema.js'
import { analyseStudent } from '../ai/brain.js'
import Navbar from '../components/Navbar.jsx'

const SUBJECTS = ['mathematics','physics','biology','chemistry']
const SUBJECT_ICONS = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJECT_COLORS = { mathematics:'#0D9488', physics:'#06B6D4', biology:'#16A34A', chemistry:'#7C3AED' }
const AVATARS = ['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋']

function gradeLabel(score) {
  if (score >= 80) return { label:'Distinction', color:'#4ADE80' }
  if (score >= 70) return { label:'Credit', color:'#86EFAC' }
  if (score >= 60) return { label:'Pass', color:'#F59E0B' }
  if (score >= 50) return { label:'Satisfactory', color:'#FBBF24' }
  return { label:'Needs Work', color:'#EF4444' }
}

function getWeekStart() {
  const now = new Date(); const day = now.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0)
  return mon
}

export default function ProgressReport() {
  const { student } = useUser()
  const { theme }   = useTheme()
  const navigate    = useNavigate()
  const reportRef   = useRef(null)

  const [stats, setStats]       = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => { if (student) { loadStats(); analyseStudent(student.id).then(setAnalysis).catch(()=>{}) } }, [student])

  async function loadStats() {
    const allProgress = await db.progress.where('student_id').equals(student.id).toArray()
    const completed   = allProgress.filter(p => p.status === 'completed')
    const examResults = await db.exam_results.where('student_id').equals(student.id).toArray()
    const gameScores  = await db.game_progress.where('student_id').equals(student.id).toArray()
    const weekStart   = getWeekStart()
    const thisWeek    = completed.filter(p => p.completed_at && new Date(p.completed_at) >= weekStart)

    // Per-subject breakdown
    const bySubject = {}
    for (const subj of SUBJECTS) {
      const sub = completed.filter(p => p.subject === subj)
      bySubject[subj] = {
        lessons: sub.length,
        avgScore: sub.length > 0 ? Math.round(sub.reduce((s,p) => s+(p.best_score||0),0)/sub.length) : 0,
        topScore: sub.length > 0 ? Math.max(...sub.map(p=>p.best_score||0)) : 0,
      }
    }

    // Weekly activity (last 7 days)
    const daily = Array.from({length:7}, (_,i) => {
      const d = new Date(); d.setDate(d.getDate() - (6-i)); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate()+1)
      const count = completed.filter(p => p.completed_at && new Date(p.completed_at) >= d && new Date(p.completed_at) < next).length
      return { label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], count }
    })

    const totalXp = student.total_xp || 0
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s,p) => s+(p.best_score||0),0)/completed.length) : 0

    setStats({
      completed: completed.length,
      avgScore,
      streak: student.streak_days || 1,
      totalXp,
      exams: examResults.length,
      avgExamScore: examResults.length > 0 ? Math.round(examResults.reduce((s,e)=>s+(e.score||0),0)/examResults.length) : 0,
      gameLevels: gameScores.length,
      bySubject,
      daily,
      weeklyLessons: thisWeek.length,
      generatedAt: new Date().toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
    })
    setLoading(false)
  }

  function handlePrint() {
    SoundEngine.tap()
    setPrinting(true)
    setTimeout(() => { window.print(); setPrinting(false) }, 300)
  }

  async function handleShare() {
    if (!stats || !student) return
    SoundEngine.tap()
    const text = [
      `📚 ELIMU LEARN — PROGRESS REPORT`,
      `Student: ${student.name} | Class: ${student.class_level}`,
      `Generated: ${stats.generatedAt}`,
      ``,
      `OVERALL PERFORMANCE`,
      `• Lessons Completed: ${stats.completed}`,
      `• Average Quiz Score: ${stats.avgScore}%`,
      `• Study Streak: ${stats.streak} days`,
      `• Total XP Earned: ${stats.totalXp}`,
      `• Exams Taken: ${stats.exams}${stats.exams > 0 ? ` (avg ${stats.avgExamScore}%)` : ''}`,
      ``,
      `BY SUBJECT`,
      ...SUBJECTS.map(s => {
        const b = stats.bySubject[s]
        return `• ${s.charAt(0).toUpperCase()+s.slice(1)}: ${b.lessons} lessons | Avg: ${b.avgScore}%`
      }),
      ``,
      `Powered by Elimu Learn | Built by SEMATECH DEVELOPERS 🇺🇬`,
    ]
    if (analysis?.allWeakTopics?.length) {
      const weak = analysis.allWeakTopics.slice(0,3).map(t=>t.topic.replace(/_/g,' ')).join(', ')
      text.splice(text.length - 1, 0, ``, `NEEDS REVISION`, `• ${weak}`)
    }.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'Elimu Progress Report', text })
      else { await navigator.clipboard?.writeText(text); alert('Report copied to clipboard!') }
    } catch(e) {}
  }

  if (!student) return null

  const grade = stats ? gradeLabel(stats.avgScore) : null

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { background: white !important; color: black !important; padding: 24px; }
        }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-5 no-print" style={{ background: theme.surface, borderBottom:`1px solid ${theme.border}` }}>
        <button onClick={() => navigate(-1)} className="text-sm mb-3 block" style={{ color: theme.muted }}>← Back</button>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>📊 Progress Report</h1>
        <p className="text-sm mt-1" style={{ color: theme.subtext }}>For parents, guardians & teachers</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm" style={{ color: theme.muted }}>Building report...</p>
        </div>
      ) : (
        <div ref={reportRef} className="px-5 mt-5 print-page">

          {/* Report header card */}
          <div className="rounded-2xl p-5 mb-4"
            style={{ background:`linear-gradient(135deg,#050810,#0F1629)`, border:`1px solid #7C3AED44` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                  style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)', color:'white' }}>S</div>
                <div>
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color:'#A78BFA' }}>SEMATECH DEVELOPERS</p>
                  <p className="text-xs" style={{ color:'#3A4560' }}>Elimu Learn</p>
                </div>
              </div>
              <span className="text-xs" style={{ color:'#3A4560' }}>{stats.generatedAt}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{AVATARS[student.avatar || 0]}</span>
              <div>
                <h2 className="text-xl font-black text-white">{student.name}</h2>
                <p className="text-sm" style={{ color:'#94A3B8' }}>{student.class_level} · Uganda Certificate of Education</p>
              </div>
            </div>
          </div>

          {/* Overall grade banner */}
          <div className="rounded-2xl p-4 mb-4 text-center"
            style={{ background:`${grade.color}15`, border:`2px solid ${grade.color}44` }}>
            <div className="text-4xl font-black mb-1" style={{ color: grade.color }}>{stats.avgScore}%</div>
            <div className="font-black text-lg mb-1" style={{ color: grade.color }}>{grade.label}</div>
            <p className="text-xs" style={{ color: theme.subtext }}>Overall average across all completed lessons</p>
          </div>

          {/* Key stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { icon:'✅', label:'Lessons Done', value: stats.completed, color:'#4ADE80' },
              { icon:'🔥', label:'Study Streak', value: `${stats.streak} days`, color:'#F59E0B' },
              { icon:'⭐', label:'Total XP', value: stats.totalXp.toLocaleString(), color:'#F59E0B' },
              { icon:'📅', label:'This Week', value: `${stats.weeklyLessons} lessons`, color:'#06B6D4' },
              { icon:'🎓', label:'Exams Taken', value: stats.exams, color:'#7C3AED' },
              { icon:'🎮', label:'Game Levels', value: stats.gameLevels, color:'#EC4899' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{s.icon}</span>
                  <span className="text-xs" style={{ color: theme.muted }}>{s.label}</span>
                </div>
                <div className="font-black text-xl" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Subject breakdown */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
            <h3 className="font-black text-sm mb-3" style={{ color: theme.text }}>📚 Subject Performance</h3>
            {SUBJECTS.map(subj => {
              const b = stats.bySubject[subj]
              const g = gradeLabel(b.avgScore)
              return (
                <div key={subj} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{SUBJECT_ICONS[subj]}</span>
                      <span className="text-sm font-bold capitalize" style={{ color: theme.text }}>{subj}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: g.color }}>{b.avgScore}%</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`${g.color}22`, color: g.color }}>{g.label}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.border }}>
                    <div className="h-full rounded-full transition-all" style={{ width:`${b.avgScore}%`, background: SUBJECT_COLORS[subj] }} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: theme.muted }}>{b.lessons} lessons completed · Top score: {b.topScore}%</p>
                </div>
              )
            })}
          </div>

          {/* 7-day activity chart */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
            <h3 className="font-black text-sm mb-3" style={{ color: theme.text }}>📅 Last 7 Days Activity</h3>
            <div className="flex items-end gap-2 h-20">
              {stats.daily.map((d, i) => {
                const max = Math.max(...stats.daily.map(x=>x.count), 1)
                const pct = max > 0 ? (d.count / max) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold" style={{ color: d.count > 0 ? '#4ADE80' : theme.muted }}>{d.count||''}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{
                      height: `${Math.max(4, pct)}%`, minHeight: 4,
                      background: d.count > 0 ? 'linear-gradient(to top,#0D9488,#14B8A6)' : theme.border
                    }} />
                    <span className="text-xs" style={{ color: theme.muted, fontSize:'0.6rem' }}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Insights — weak topics & UNEB risk */}
          {analysis && analysis.summary.totalCompleted > 0 && (() => {
            const weakTopics = analysis.allWeakTopics?.slice(0, 5) || []
            const topRisks = Object.values(analysis.examPredictions).flat()
              .filter(t => t.riskScore > 0.25).sort((a,b) => b.riskScore - a.riskScore).slice(0, 4)
            const topMistake = analysis.dominantMistakes?.[0]
            if (!weakTopics.length && !topRisks.length) return null
            return (
              <div className="rounded-2xl p-4 mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
                <h3 className="font-black text-sm mb-3" style={{ color: theme.text }}>🧠 AI Learning Analysis</h3>
                {topMistake && (
                  <div className="rounded-xl px-3 py-2 mb-3"
                    style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)'}}>
                    <p className="text-xs font-bold" style={{color:'#F59E0B'}}>Main Mistake Pattern</p>
                    <p className="text-xs mt-0.5" style={{color:theme.subtext}}>{topMistake.label} — {topMistake.advice || 'Review concept understanding'}</p>
                  </div>
                )}
                {weakTopics.length > 0 && (
                  <>
                    <p className="text-xs font-bold mb-2" style={{color:theme.muted}}>Needs Revision</p>
                    {weakTopics.map((t,i) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b last:border-0"
                        style={{borderColor:theme.border}}>
                        <span className="text-xs capitalize" style={{color:theme.text}}>{t.topic.replace(/_/g,' ')} <span style={{color:theme.muted}}>({t.subject})</span></span>
                        <span className="text-xs font-bold" style={{color:'#F87171'}}>{t.score}%</span>
                      </div>
                    ))}
                  </>
                )}
                {topRisks.length > 0 && (
                  <>
                    <p className="text-xs font-bold mb-2 mt-3" style={{color:theme.muted}}>⚠️ High UNEB Exam Risk</p>
                    {topRisks.map((t,i) => {
                      const risk = Math.round(t.riskScore * 100)
                      const col = risk > 60 ? '#EF4444' : '#F59E0B'
                      return (
                        <div key={i} className="flex justify-between items-center py-1 border-b last:border-0"
                          style={{borderColor:theme.border}}>
                          <span className="text-xs capitalize" style={{color:theme.text}}>{t.topic.replace(/_/g,' ')}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:`${col}20`,color:col}}>{risk}% risk</span>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )
          })()}

          {/* Teacher/parent note */}
          <div className="rounded-2xl p-4 mb-4"
            style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs font-bold mb-1" style={{ color:'#F59E0B' }}>📝 Note for Parent/Teacher</p>
            <p className="text-xs leading-relaxed" style={{ color: theme.subtext }}>
              {student.name} is using Elimu Learn to study Mathematics, Physics, Biology and Chemistry
              at {student.class_level} level. The app works offline and covers the full Uganda National
              Curriculum. Scores above 60% represent a passing grade. Encourage daily 20-minute sessions
              for best results.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-4 no-print">
            <button onClick={handlePrint}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
              style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
              {printing ? '⏳ Preparing...' : '🖨️ Print Report'}
            </button>
            <button onClick={handleShare}
              className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ background: theme.card, color:'#F59E0B', border:`1px solid rgba(245,158,11,0.3)` }}>
              📤 Share Report
            </button>
          </div>

          {/* Footer branding */}
          <div className="text-center py-3 rounded-2xl" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-black"
                style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)', color:'white' }}>S</div>
              <span className="font-black text-xs tracking-widest uppercase" style={{ color: theme.text }}>SEMATECH DEVELOPERS</span>
            </div>
            <p className="text-xs" style={{ color: theme.muted }}>Elimu Learn · Empowering Ugandan Students 🇺🇬</p>
          </div>

        </div>
      )}

      <Navbar />
    </div>
  )
}
