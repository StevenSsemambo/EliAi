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

  function buildShareText() {
    if (!stats || !student) return ''
    const lines = [
      `📚 *EQLA LEARN — PROGRESS REPORT*`,
      `👤 *Student:* ${student.name} | Class: ${student.class_level}`,
      `📅 *Generated:* ${stats.generatedAt}`,
      ``,
      `📊 *OVERALL PERFORMANCE*`,
      `✅ Lessons Completed: ${stats.completed}`,
      `🎯 Average Quiz Score: ${stats.avgScore}%`,
      `🔥 Study Streak: ${stats.streak} days`,
      `⭐ Total XP Earned: ${stats.totalXp.toLocaleString()}`,
      stats.exams > 0 ? `🎓 Exams Taken: ${stats.exams} (avg ${stats.avgExamScore}%)` : null,
      ``,
      `📚 *BY SUBJECT*`,
      ...SUBJECTS.map(s => {
        const b = stats.bySubject[s]
        const g = gradeLabel(b.avgScore)
        return `${SUBJECT_ICONS[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}: ${b.avgScore}% (${g.label}) — ${b.lessons} lessons`
      }),
    ].filter(l => l !== null)

    if (analysis?.allWeakTopics?.length) {
      const weak = analysis.allWeakTopics.slice(0,3).map(t=>t.topic.replace(/_/g,' ')).join(', ')
      lines.push(``, `⚠️ *NEEDS REVISION*`, `• ${weak}`)
    }
    lines.push(``, `_Powered by Eqla Learn — Built for Ugandan Students 🇺🇬_`)
    return lines.join('\n')
  }

  async function handleWhatsApp() {
    if (!stats || !student) return
    SoundEngine.tap()
    const text = buildShareText()
    const encoded = encodeURIComponent(text)
    // Open WhatsApp with pre-filled message
    const url = `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  async function handleShare() {
    if (!stats || !student) return
    SoundEngine.tap()
    const text = buildShareText()
    try {
      if (navigator.share) await navigator.share({ title: 'Eqla Progress Report', text })
      else { await navigator.clipboard?.writeText(text); alert('Report copied to clipboard! Paste it in WhatsApp.') }
    } catch(e) {}
  }

  function handleExportPDF() {
    if (!stats || !student) return
    SoundEngine.tap()
    setPrinting(true)

    const grade = gradeLabel(stats.avgScore)
    const subjectRows = SUBJECTS.map(subj => {
      const b = stats.bySubject[subj]
      const g = gradeLabel(b.avgScore)
      const barW = Math.round(b.avgScore * 2.2)
      return `
        <tr>
          <td style="padding:8px 12px;font-size:13px;">${SUBJECT_ICONS[subj]} ${subj.charAt(0).toUpperCase()+subj.slice(1)}</td>
          <td style="padding:8px 12px;font-size:13px;">${b.lessons}</td>
          <td style="padding:8px 12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                <div style="width:${b.avgScore}%;height:100%;background:${SUBJECT_COLORS[subj]};border-radius:4px;"></div>
              </div>
              <span style="font-size:12px;font-weight:700;color:${g.color};min-width:40px;">${b.avgScore}%</span>
            </div>
          </td>
          <td style="padding:8px 12px;"><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${g.color}22;color:${g.color};font-weight:700;">${g.label}</span></td>
        </tr>`
    }).join('')

    const weakSection = analysis?.allWeakTopics?.length ? `
      <div style="margin-bottom:20px;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;">
        <h3 style="margin:0 0 10px;font-size:14px;color:#c2410c;">⚠️ Topics Needing Revision</h3>
        ${analysis.allWeakTopics.slice(0,5).map(t => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #fed7aa;font-size:12px;">
            <span style="text-transform:capitalize;color:#374151;">${t.topic.replace(/_/g,' ')} <span style="color:#9ca3af;">(${t.subject})</span></span>
            <span style="font-weight:700;color:#ef4444;">${t.score}%</span>
          </div>`).join('')}
      </div>` : ''

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Eqla Learn — Progress Report — ${student.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; }
  @media print {
    body { font-size: 12px; }
    .no-print { display: none !important; }
    @page { margin: 15mm; size: A4; }
  }
  @media screen { body { max-width: 800px; margin: 0 auto; padding: 24px; background: #f9fafb; } }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  td { border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
</style></head><body>

<!-- Header -->
<div style="background:linear-gradient(135deg,#0D9488,#0369A1);padding:28px 32px;border-radius:12px;margin-bottom:24px;color:white;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.8;margin-bottom:4px;">SEMATECH DEVELOPERS · EQLA LEARN</div>
      <h1 style="font-size:24px;font-weight:800;margin-bottom:4px;">Progress Report</h1>
      <p style="opacity:0.85;font-size:14px;">${student.name} · ${student.class_level} · Uganda Certificate of Education</p>
    </div>
    <div style="text-align:right;opacity:0.75;font-size:12px;">${stats.generatedAt}</div>
  </div>
</div>

<!-- Grade banner -->
<div style="background:${grade.color}18;border:2px solid ${grade.color}55;border-radius:10px;padding:16px 24px;margin-bottom:24px;display:flex;align-items:center;gap:20px;">
  <div style="font-size:42px;font-weight:900;color:${grade.color};">${stats.avgScore}%</div>
  <div>
    <div style="font-size:20px;font-weight:800;color:${grade.color};">${grade.label}</div>
    <div style="font-size:13px;color:#6b7280;">Overall average across all completed lessons</div>
  </div>
</div>

<!-- Stats grid -->
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
  ${[
    {icon:'✅', label:'Lessons Completed', value: stats.completed},
    {icon:'🔥', label:'Study Streak', value: `${stats.streak} days`},
    {icon:'⭐', label:'Total XP Earned', value: stats.totalXp.toLocaleString()},
    {icon:'📅', label:'Lessons This Week', value: stats.weeklyLessons},
    {icon:'🎓', label:'Exams Taken', value: stats.exams},
    {icon:'🎮', label:'Game Levels', value: stats.gameLevels},
  ].map(s => `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;">
      <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;">${s.icon} ${s.label}</div>
      <div style="font-size:22px;font-weight:800;color:#1f2937;">${s.value}</div>
    </div>`).join('')}
</div>

<!-- Subject table -->
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px;overflow:hidden;">
  <div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:15px;font-weight:700;">📚 Subject Performance</h2>
  </div>
  <table>
    <thead><tr><th>Subject</th><th>Lessons</th><th>Score</th><th>Grade</th></tr></thead>
    <tbody>${subjectRows}</tbody>
  </table>
</div>

${weakSection}

<!-- Parent note -->
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:20px;">
  <h3 style="font-size:13px;font-weight:700;color:#b45309;margin-bottom:6px;">📝 Note for Parent / Teacher</h3>
  <p style="font-size:12px;color:#374151;line-height:1.6;">
    ${student.name} is using Eqla Learn to study Mathematics, Physics, Biology and Chemistry at ${student.class_level} level. 
    The app works 100% offline and covers the full Uganda National Curriculum. 
    Scores above 60% represent a passing grade. Encourage daily 20-minute study sessions for the best results.
  </p>
</div>

<!-- Print button -->
<div class="no-print" style="text-align:center;margin-top:20px;">
  <button onclick="window.print()" style="background:linear-gradient(135deg,#0D9488,#0369A1);color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">
    🖨️ Save as PDF / Print
  </button>
</div>

<!-- Footer -->
<div style="text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
  Generated by Eqla Learn · Empowering Ugandan Students 🇺🇬 · ${stats.generatedAt}
</div>

</body></html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Please allow pop-ups to export the PDF.'); setPrinting(false); return }
    win.document.write(html)
    win.document.close()
    setTimeout(() => setPrinting(false), 400)
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
                  <p className="text-xs" style={{ color:'#3A4560' }}>Eqla Learn</p>
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
              {student.name} is using Eqla Learn to study Mathematics, Physics, Biology and Chemistry
              at {student.class_level} level. The app works offline and covers the full Uganda National
              Curriculum. Scores above 60% represent a passing grade. Encourage daily 20-minute sessions
              for best results.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 mb-4 no-print">
            {/* WhatsApp — primary CTA */}
            <button onClick={handleWhatsApp}
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background:'linear-gradient(135deg,#25D366,#128C7E)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send to Parent via WhatsApp
            </button>
            {/* PDF Export */}
            <button onClick={handleExportPDF}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
              style={{ background:'linear-gradient(135deg,#0D9488,#0369A1)' }}>
              {printing ? '⏳ Building PDF...' : '📄 Export as PDF'}
            </button>
            {/* Native share / copy */}
            <button onClick={handleShare}
              className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ background: theme.card, color:'#F59E0B', border:`1px solid rgba(245,158,11,0.3)` }}>
              📤 Share / Copy Report Text
            </button>
          </div>

          {/* Footer branding */}
          <div className="text-center py-3 rounded-2xl" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-black"
                style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)', color:'white' }}>S</div>
              <span className="font-black text-xs tracking-widest uppercase" style={{ color: theme.text }}>SEMATECH DEVELOPERS</span>
            </div>
            <p className="text-xs" style={{ color: theme.muted }}>Eqla Learn · Empowering Ugandan Students 🇺🇬</p>
          </div>

        </div>
      )}

      <Navbar />
    </div>
  )
}
