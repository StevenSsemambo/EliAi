import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { analyseStudent, getSmartRecommendations, generateDailyMission, getMissionProgress } from '../ai/brain.js'
import { SoundEngine, Speaker } from '../utils/soundEngine.js'

const SUBJECT_ICONS = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const DIFF_LABELS   = ['', 'Foundation', 'Developing', 'Intermediate', 'Advanced', 'Expert']
const DIFF_COLORS   = ['', '#94A3B8', '#F59E0B', '#06B6D4', '#7C3AED', '#EF4444']

function MiniBar({ value, max = 100, color }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background:'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width:`${Math.min(100,(value/max)*100)}%`, background: color }} />
    </div>
  )
}

export default function SmartTutorWidget() {
  const { student } = useUser()
  const { theme }   = useTheme()
  const navigate    = useNavigate()
  const [analysis, setAnalysis]     = useState(null)
  const [recs, setRecs]             = useState([])
  const [mission, setMission]       = useState(null)
  const [missionDone, setMissionDone] = useState([])
  const [tab, setTab]               = useState('tutor') // tutor | mission | exam
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!student) return
    analyseStudent(student.id).then(a => {
      setAnalysis(a)
      setRecs(getSmartRecommendations(a, 4))
      setMission(generateDailyMission(a))
      setMissionDone(getMissionProgress(student.id))
      setLoading(false)
    })
  }, [student])

  function speakRec(text) {
    if (speaking && speakText === text) { Speaker.stop(); setSpeaking(false); setSpeakText(''); return }
    Speaker.stop(); Speaker.speak(text); setSpeaking(true); setSpeakText(text)
    const poll = setInterval(()=>{ if(!Speaker.isSpeaking()){setSpeaking(false);setSpeakText('');clearInterval(poll)} },500)
  }

  if (loading) return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
      <div className="flex items-center gap-2">
        <span className="text-xl animate-spin">🧠</span>
        <span className="text-sm" style={{ color: theme.muted }}>AI Tutor analysing your progress...</span>
      </div>
    </div>
  )

  if (!analysis || analysis.summary.totalCompleted === 0) return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🧠</span>
        <div>
          <p className="font-bold text-sm" style={{ color: theme.text }}>Smart Tutor</p>
          <p className="text-xs" style={{ color: theme.muted }}>Complete your first lesson to activate AI analysis</p>
        </div>
      </div>
    </div>
  )

  const missionComplete = mission && missionDone.length >= mission.tasks.length
  const missionPct = mission ? Math.round((missionDone.length / mission.tasks.length) * 100) : 0

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <div>
            <p className="font-black text-sm" style={{ color: theme.text }}>AI Smart Tutor</p>
            <p className="text-xs" style={{ color: theme.muted }}>Powered by EqLa AI · Rule-based</p>
          </div>
        </div>
        <button onClick={() => navigate('/ai-tutor')}
          className="text-xs px-3 py-1.5 rounded-xl font-bold"
          style={{ background:`${theme.accent}22`, color: theme.accent, border:`1px solid ${theme.accent}44` }}>
          Full View →
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 px-4 mb-3">
        {[['tutor','🎯 Tutor'],['mission','📅 Mission'],['exam','🎓 Exam']].map(([id, label]) => (
          <button key={id} onClick={() => { SoundEngine.tap(); setTab(id) }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: tab===id ? `${theme.accent}22` : 'transparent',
              color: tab===id ? theme.accent : theme.muted,
              border: `1px solid ${tab===id ? theme.accent+'44' : 'transparent'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TUTOR TAB ── */}
      {tab === 'tutor' && (
        <div className="px-4 pb-4 space-y-2">
          {/* Subject strength bars */}
          <div className="rounded-xl p-3 mb-2" style={{ background: theme.surface }}>
            <p className="text-xs font-bold mb-2" style={{ color: theme.subtext }}>Subject Strength</p>
            {Object.entries(analysis.subjectStrength).map(([subj, str]) => {
              const diff = analysis.adaptiveDifficulty[subj]
              return (
                <div key={subj} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <span className="text-sm w-5">{SUBJECT_ICONS[subj]}</span>
                  <span className="text-xs w-20 truncate capitalize" style={{ color: theme.subtext }}>{subj}</span>
                  <MiniBar value={str} color={DIFF_COLORS[diff]} />
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: DIFF_COLORS[diff] }}>
                    {DIFF_LABELS[diff]}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          {recs.slice(0, 3).map((rec, i) => (
            <button key={i} onClick={() => { SoundEngine.tap(); navigate(`/subject/${rec.subject}`) }}
              className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all active:scale-95"
              style={{ background: theme.surface, border:`1px solid ${theme.border}` }}>
              <span className="text-xl flex-shrink-0">{rec.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold capitalize truncate" style={{ color: theme.text }}>
                  {rec.topic ? rec.topic.replace(/_/g,' ') : rec.subject}
                </p>
                <p className="text-xs truncate" style={{ color: theme.muted }}>{rec.reason}</p>
              </div>
              <span className="text-slate-600 flex-shrink-0">›</span>
            </button>
          ))}

          {/* Mistake patterns */}
          {analysis.dominantMistakes.length > 0 && (
            <div className="rounded-xl p-3" style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-bold mb-1" style={{ color:'#EF4444' }}>⚡ Top Mistake Pattern</p>
              <p className="text-xs" style={{ color: theme.subtext }}>
                {analysis.dominantMistakes[0].label} — focus on these question types in drills
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── MISSION TAB ── */}
      {tab === 'mission' && mission && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: theme.subtext }}>
              Today's Mission · {missionDone.length}/{mission.tasks.length} done
            </p>
            <span className="text-xs font-black" style={{ color: theme.accent }}>+{mission.totalXp} XP</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: theme.border }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width:`${missionPct}%`, background: missionComplete ? '#4ADE80' : theme.accent }} />
          </div>
          {mission.tasks.map(task => {
            const done = missionDone.includes(task.id)
            return (
              <button key={task.id}
                onClick={() => {
                  SoundEngine.tap()
                  if (task.type === 'game') navigate('/games')
                  else if (task.subject) navigate(`/subject/${task.subject}`)
                }}
                className="w-full text-left rounded-xl p-3 flex items-center gap-3 mb-2 last:mb-0 transition-all active:scale-95"
                style={{
                  background: done ? 'rgba(74,222,128,0.08)' : theme.surface,
                  border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : theme.border}`,
                  opacity: done ? 0.7 : 1,
                }}>
                <span className="text-xl flex-shrink-0">{done ? '✅' : task.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: done ? '#4ADE80' : theme.text }}>{task.title}</p>
                  <p className="text-xs truncate" style={{ color: theme.muted }}>{task.subtitle}</p>
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: theme.accent }}>+{task.xpReward}</span>
              </button>
            )
          })}
          {missionComplete && (
            <div className="text-center py-2 mt-1 rounded-xl" style={{ background:'rgba(74,222,128,0.1)' }}>
              <p className="text-xs font-black" style={{ color:'#4ADE80' }}>🎉 Daily mission complete!</p>
            </div>
          )}
        </div>
      )}

      {/* ── EXAM TAB ── */}
      {tab === 'exam' && (
        <div className="px-4 pb-4">
          <p className="text-xs mb-3" style={{ color: theme.muted }}>
            Topics most likely to appear in your UNEB exam, ranked by risk.
          </p>
          {Object.entries(analysis.examPredictions).slice(0, 2).map(([subj, preds]) => (
            <div key={subj} className="mb-3">
              <p className="text-xs font-bold capitalize mb-1 flex items-center gap-1" style={{ color: theme.text }}>
                {SUBJECT_ICONS[subj]} {subj}
              </p>
              {preds.slice(0, 2).map(pred => (
                <div key={pred.topic} className="flex items-center gap-2 mb-1.5 rounded-lg px-2 py-1"
                  style={{ background: theme.surface }}>
                  <div className="flex-1">
                    <p className="text-xs font-semibold capitalize" style={{ color: theme.text }}>
                      {pred.topic.replace(/_/g,' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color:`${pred.mastery < 60 ? '#EF4444' : '#4ADE80'}` }}>
                      {pred.mastery}% mastered
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: pred.examWeight > 0.85 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: pred.examWeight > 0.85 ? '#EF4444' : '#F59E0B'
                      }}>
                      {pred.examWeight > 0.85 ? '🔥 HIGH' : '⚡ MED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={() => { SoundEngine.tap(); navigate('/ai-tutor') }}
            className="w-full py-2 rounded-xl text-xs font-bold mt-1 transition-all active:scale-95"
            style={{ background: theme.surface, color: theme.accent, border:`1px solid ${theme.accent}44` }}>
            See Full Exam Predictor →
          </button>
        </div>
      )}
    </div>
  )
}
