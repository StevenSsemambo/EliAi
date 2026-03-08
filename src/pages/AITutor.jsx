import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  analyseStudent, getSmartRecommendations, generateDailyMission,
  getMissionProgress, markMissionTaskDone
} from '../ai/brain.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const SUBJECT_ICONS  = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJECT_COLORS = { mathematics:'#0D9488', physics:'#06B6D4', biology:'#16A34A', chemistry:'#7C3AED' }
const DIFF_LABELS    = ['','Foundation','Developing','Intermediate','Advanced','Expert']
const DIFF_COLORS    = ['','#94A3B8','#F59E0B','#06B6D4','#7C3AED','#EF4444']

function Section({ title, sub, children, accent }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-black text-base" style={{ color: theme.text }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: theme.muted }}>{sub}</p>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  )
}

function ProgressBar({ value, color, height = 6 }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: theme.border }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width:`${Math.min(100,value)}%`, background: color }} />
    </div>
  )
}

export default function AITutor() {
  const { student } = useUser()
  const { theme }   = useTheme()
  const navigate    = useNavigate()
  const [tab, setTab]           = useState('tutor')
  const [analysis, setAnalysis] = useState(null)
  const [recs, setRecs]         = useState([])
  const [mission, setMission]   = useState(null)
  const [missionDone, setMissionDone] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!student) { setLoading(false); return }
    const timeout = setTimeout(() => setLoading(false), 5000)
    analyseStudent(student.id)
      .then(a => {
        clearTimeout(timeout)
        setAnalysis(a)
        setRecs(getSmartRecommendations(a, 8))
        setMission(generateDailyMission(a))
        setMissionDone(getMissionProgress(student.id))
        setLoading(false)
      })
      .catch(() => { clearTimeout(timeout); setLoading(false) })
  }, [student])

  async function completeTask(task) {
    SoundEngine.gameCorrect()
    const done = await markMissionTaskDone(student.id, task.id, task.xpReward)
    setMissionDone(done)
    if (task.type === 'game') navigate('/games')
    else if (task.subject) navigate(`/subject/${task.subject}`)
  }

  const TABS = [
    { id:'tutor',   label:'🧠 Tutor'   },
    { id:'mission', label:'📅 Mission' },
    { id:'exam',    label:'🎓 Exam'    },
    { id:'mistakes',label:'⚡ Mistakes'},
  ]

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-4 relative overflow-hidden"
        style={{ background: theme.surface, borderBottom:`1px solid ${theme.border}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(circle at 30% 50%,rgba(124,58,237,0.12) 0%,transparent 60%)' }} />
        <button onClick={() => navigate('/dashboard')} className="text-sm mb-3 block" style={{ color: theme.muted }}>← Dashboard</button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background:'linear-gradient(135deg,#7C3AED22,#0891B222)', border:'1px solid #7C3AED44' }}>
            🧠
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>AI Smart Tutor</h1>
            <p className="text-xs" style={{ color: theme.muted }}>
              Rule-based · Offline · Built on your {analysis?.summary.totalCompleted || 0} completed lessons
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-5 pt-4 pb-2 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { SoundEngine.tap(); setTab(t.id) }}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab===t.id ? `${theme.accent}22` : theme.card,
              color: tab===t.id ? theme.accent : theme.subtext,
              border:`1px solid ${tab===t.id ? theme.accent+'44' : theme.border}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5 pt-2">

        {loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-spin">🧠</div>
            <p className="font-bold" style={{ color: theme.text }}>Analysing your learning profile...</p>
            <p className="text-sm mt-1" style={{ color: theme.muted }}>Scanning quiz patterns · Building weakness map</p>
          </div>
        )}

        {!loading && !analysis?.summary.totalCompleted && (
          <div className="text-center py-12 rounded-2xl" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
            <div className="text-5xl mb-3">📚</div>
            <p className="font-black text-lg mb-2" style={{ color: theme.text }}>Complete your first lesson</p>
            <p className="text-sm mb-4" style={{ color: theme.muted }}>The AI tutor needs data to analyse. Start studying to unlock personalised guidance.</p>
            <button onClick={() => navigate('/subject/mathematics')}
              className="px-6 py-3 rounded-2xl font-bold text-white"
              style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
              Start Studying →
            </button>
          </div>
        )}

        {/* ─── SMART TUTOR TAB ─── */}
        {!loading && analysis?.summary.totalCompleted > 0 && tab === 'tutor' && (
          <>
            {/* Subject strength overview */}
            <Section title="📊 Your Learning Profile" sub="AI-calculated from your quiz performance">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  ['Global Average', `${analysis.summary.globalAvg}%`, '#4ADE80'],
                  ['Lessons Done',   analysis.summary.totalCompleted, '#F59E0B'],
                  ['Days Active',    `${analysis.summary.studyDaysThisWeek}/7`, '#06B6D4'],
                  ['Streak Risk',    analysis.summary.streakRisk ? '⚠ Low' : '✓ Good', analysis.summary.streakRisk ? '#EF4444' : '#4ADE80'],
                ].map(([l,v,c]) => (
                  <div key={l} className="rounded-xl p-3" style={{ background: theme.surface }}>
                    <div className="font-black text-lg" style={{ color:c }}>{v}</div>
                    <div className="text-xs" style={{ color: theme.muted }}>{l}</div>
                  </div>
                ))}
              </div>

              {Object.entries(analysis.subjectStrength).map(([subj, str]) => {
                const diff = analysis.adaptiveDifficulty[subj]
                const col = SUBJECT_COLORS[subj]
                return (
                  <div key={subj} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span>{SUBJECT_ICONS[subj]}</span>
                        <span className="text-sm font-bold capitalize" style={{ color: theme.text }}>{subj}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: DIFF_COLORS[diff] }}>
                          {DIFF_LABELS[diff]}
                        </span>
                        <span className="text-xs" style={{ color: theme.muted }}>
                          {analysis.bySubject[subj].avgScore}% avg
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={str} color={col} height={8} />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs" style={{ color: theme.muted }}>
                        {analysis.bySubject[subj].lessons} lessons · {analysis.bySubject[subj].weakTopics.length} weak topics
                      </span>
                      <span className="text-xs" style={{ color: theme.muted }}>Strength: {str}%</span>
                    </div>
                  </div>
                )
              })}
            </Section>

            {/* Smart recommendations */}
            <Section title="🎯 Recommended Next" sub="Personalised based on your weak areas and UNEB priorities">
              {recs.map((rec, i) => (
                <button key={i}
                  onClick={() => { SoundEngine.tap(); if(rec.subject) navigate(`/subject/${rec.subject}`) }}
                  className="w-full text-left rounded-xl p-3 flex items-center gap-3 mb-2 last:mb-0 transition-all active:scale-95"
                  style={{ background: theme.surface, border:`1px solid ${theme.border}`, animation:`slideUp 0.3s ease both`, animationDelay:`${i*0.05}s` }}>
                  <span className="text-2xl flex-shrink-0">{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold capitalize truncate" style={{ color: theme.text }}>
                      {rec.topic ? rec.topic.replace(/_/g,' ') : rec.subject}
                    </p>
                    <p className="text-xs" style={{ color: theme.muted }}>{rec.reason}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ background:`${SUBJECT_COLORS[rec.subject]}22`, color: SUBJECT_COLORS[rec.subject] }}>
                      {rec.subject}
                    </span>
                  </div>
                </button>
              ))}
            </Section>

            {/* Adaptive difficulty info */}
            <Section title="📈 Your Adaptive Level" sub="Quiz difficulty auto-adjusts to keep you challenged">
              {Object.entries(analysis.adaptiveDifficulty).map(([subj, lvl]) => (
                <div key={subj} className="flex items-center gap-3 mb-2 last:mb-0 p-2 rounded-xl"
                  style={{ background: theme.surface }}>
                  <span className="text-lg">{SUBJECT_ICONS[subj]}</span>
                  <div className="flex-1">
                    <p className="text-sm capitalize font-semibold" style={{ color: theme.text }}>{subj}</p>
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="h-2 flex-1 rounded-full" style={{
                          background: l <= lvl ? DIFF_COLORS[lvl] : theme.border
                        }} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-black flex-shrink-0" style={{ color: DIFF_COLORS[lvl] }}>
                    {DIFF_LABELS[lvl]}
                  </span>
                </div>
              ))}
              <p className="text-xs mt-2" style={{ color: theme.muted }}>
                When you take a quiz, questions are selected to match your current level automatically.
              </p>
            </Section>
          </>
        )}

        {/* ─── DAILY MISSION TAB ─── */}
        {!loading && tab === 'mission' && mission && (
          <>
            <Section title="📅 Today's Mission" sub={`Personalised for you · Resets at midnight`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: theme.text }}>
                  {missionDone.length}/{mission.tasks.length} complete
                </span>
                <span className="font-black text-base" style={{ color: theme.accent }}>
                  🏆 +{mission.totalXp} XP total
                </span>
              </div>
              <ProgressBar
                value={(missionDone.length / mission.tasks.length) * 100}
                color={missionDone.length >= mission.tasks.length ? '#4ADE80' : theme.accent}
                height={8}
              />
              <div className="mt-4 space-y-3">
                {mission.tasks.map((task, i) => {
                  const done = missionDone.includes(task.id)
                  return (
                    <div key={task.id} className="rounded-2xl p-4 transition-all"
                      style={{
                        background: done ? 'rgba(74,222,128,0.06)' : theme.surface,
                        border:`1px solid ${done ? 'rgba(74,222,128,0.3)' : theme.border}`,
                        animation:`slideUp 0.3s ease both`, animationDelay:`${i*0.1}s`
                      }}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{done ? '✅' : task.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm" style={{ color: done ? '#4ADE80' : theme.text }}>{task.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: theme.muted }}>{task.subtitle}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background:`${theme.accent}22`, color: theme.accent }}>
                              +{task.xpReward} XP
                            </span>
                            {task.subject && (
                              <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                                style={{ background:`${SUBJECT_COLORS[task.subject]}22`, color: SUBJECT_COLORS[task.subject] }}>
                                {task.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        {!done && (
                          <button onClick={() => completeTask(task)}
                            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                            style={{ background: theme.accent }}>
                            Go →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {missionDone.length >= mission.tasks.length && (
                <div className="mt-4 py-3 rounded-2xl text-center"
                  style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)' }}>
                  <p className="font-black" style={{ color:'#4ADE80' }}>🎉 Mission Complete! Come back tomorrow.</p>
                </div>
              )}
            </Section>
          </>
        )}

        {/* ─── EXAM PREDICTOR TAB ─── */}
        {!loading && tab === 'exam' && analysis && (
          <Section title="🎓 UNEB Exam Predictor" sub="Rule-based analysis of past paper frequency × your mastery gap">
            <div className="rounded-xl p-3 mb-4" style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-xs font-bold mb-1" style={{ color:'#F59E0B' }}>How this works</p>
              <p className="text-xs leading-relaxed" style={{ color: theme.subtext }}>
                Each topic is weighted by how often it has appeared in UNEB past papers.
                Topics where your mastery is low AND exam frequency is high are flagged as high-risk.
              </p>
            </div>
            {Object.entries(analysis.examPredictions).map(([subj, preds]) => (
              <div key={subj} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{SUBJECT_ICONS[subj]}</span>
                  <span className="font-black capitalize" style={{ color: theme.text }}>{subj}</span>
                </div>
                {preds.map((pred, i) => {
                  const riskColor = pred.riskScore > 0.6 ? '#EF4444' : pred.riskScore > 0.35 ? '#F59E0B' : '#4ADE80'
                  const riskLabel = pred.riskScore > 0.6 ? '🔴 HIGH RISK' : pred.riskScore > 0.35 ? '🟡 MEDIUM' : '🟢 LOW'
                  return (
                    <button key={pred.topic}
                      onClick={() => { SoundEngine.tap(); navigate(`/subject/${subj}`) }}
                      className="w-full text-left rounded-xl p-3 mb-2 last:mb-0 transition-all active:scale-95"
                      style={{ background: theme.surface, border:`1px solid ${theme.border}`, animation:`slideUp 0.3s ease both`, animationDelay:`${i*0.08}s` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold capitalize" style={{ color: theme.text }}>
                          {pred.topic.replace(/_/g,' ')}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background:`${riskColor}22`, color: riskColor }}>
                          {riskLabel}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs mb-1.5" style={{ color: theme.muted }}>
                        <span>📚 Exam freq: {Math.round(pred.examWeight * 100)}%</span>
                        <span style={{ color: pred.mastery < 60 ? '#EF4444' : '#4ADE80' }}>
                          🎯 Your mastery: {pred.mastery}%
                        </span>
                      </div>
                      <ProgressBar value={pred.mastery} color={pred.mastery < 60 ? '#EF4444' : '#4ADE80'} height={4} />
                    </button>
                  )
                })}
              </div>
            ))}
          </Section>
        )}

        {/* ─── MISTAKE ENGINE TAB ─── */}
        {!loading && tab === 'mistakes' && analysis && (
          <Section title="⚡ Mistake Pattern Engine" sub="Analyses your wrong answers to find patterns in your errors">
            {analysis.dominantMistakes.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-4xl">✨</span>
                <p className="font-bold mt-2" style={{ color: theme.text }}>No patterns detected yet</p>
                <p className="text-sm mt-1" style={{ color: theme.muted }}>Complete more quizzes to build your mistake profile</p>
              </div>
            ) : (
              <>
                {analysis.dominantMistakes.map((pattern, i) => {
                  const pct = Math.round((pattern.count / analysis.dominantMistakes[0].count) * 100)
                  const colors = ['#EF4444','#F59E0B','#06B6D4','#7C3AED','#059669']
                  const col = colors[i] || '#94A3B8'
                  return (
                    <div key={pattern.id} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold" style={{ color: theme.text }}>{pattern.label}</span>
                        <span className="text-xs font-bold" style={{ color: col }}>{pattern.count} errors</span>
                      </div>
                      <ProgressBar value={pct} color={col} height={6} />
                      <p className="text-xs mt-1" style={{ color: theme.muted }}>
                        {pattern.id === 'calculation' && 'Practice mental arithmetic — Number Warp game helps!'}
                        {pattern.id === 'concept' && 'Review lesson theory before attempting quizzes'}
                        {pattern.id === 'application' && 'Work through worked examples in each lesson'}
                        {pattern.id === 'memory' && 'Use Flashcard mode for definitions and key facts'}
                        {pattern.id === 'diagram' && 'Focus on diagram-based questions in your revision'}
                      </p>
                    </div>
                  )
                })}

                {/* Drill recommendation */}
                <div className="mt-4 rounded-xl p-3"
                  style={{ background:`rgba(124,58,237,0.08)`, border:'1px solid rgba(124,58,237,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color:'#A78BFA' }}>
                    🎯 Recommended drill for #{analysis.dominantMistakes[0]?.label}
                  </p>
                  <p className="text-xs" style={{ color: theme.subtext }}>
                    {analysis.dominantMistakes[0]?.id === 'memory'
                      ? 'Open Flashcard mode for any topic — swipe to master key definitions'
                      : analysis.dominantMistakes[0]?.id === 'calculation'
                      ? 'Play Number Warp in Space Academy to train mental arithmetic speed'
                      : 'Retry the quiz in your weakest topic with adaptive mode on'}
                  </p>
                  <button onClick={() => { SoundEngine.tap()
                    analysis.dominantMistakes[0]?.id === 'memory' || analysis.dominantMistakes[0]?.id === 'calculation'
                      ? navigate(analysis.dominantMistakes[0]?.id === 'calculation' ? '/games' : '/flashcards')
                      : navigate(`/subject/${analysis.allWeakTopics[0]?.subject || 'mathematics'}`)
                  }}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                    style={{ background:'#7C3AED' }}>
                    Start Drill →
                  </button>
                </div>
              </>
            )}
          </Section>
        )}

      </div>
      <Navbar />
    </div>
  )
}
