import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { progressDB } from '../db/progressDB.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Navbar from '../components/Navbar.jsx'

const SUBJECTS = ['mathematics', 'physics', 'biology', 'chemistry']
const COLORS = { mathematics: '#0D9488', physics: '#0E7490', biology: '#15803D', chemistry: '#7C3AED' }
const ICONS = { mathematics: '📐', physics: '⚡', biology: '🧬', chemistry: '🧪' }

export default function Progress() {
  const { student } = useUser()
  const [stats, setStats] = useState([])
  const [allProgress, setAllProgress] = useState([])

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
  }, [student])

  const totalCompleted = allProgress.filter(p => p.status === 'completed').length
  const overallAvg = totalCompleted ? Math.round(allProgress.filter(p => p.status === 'completed').reduce((a,p) => a + p.score, 0) / totalCompleted) : 0

  return (
    <div className="min-h-screen pb-24" style={{background:"#0C0F1A"}}>
      <div className=" px-5 pt-12 pb-6 border-b border-night-border">
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

        {/* Chart */}
        {stats.some(s => s.completed > 0) && (
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

        {/* Per subject */}
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
            <div className="h-2  rounded-full overflow-hidden">
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
      </div>
      <Navbar />
    </div>
  )
}
