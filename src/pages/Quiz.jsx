import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { progressDB, quizDB, goalsDB } from '../db/progressDB.js'
import { analyseStudent, filterQuestionsByDifficulty, saveDetailedAttempt } from '../ai/brain.js'
import {
  classifyResponse, saveCognitiveLoadSession,
  generateExplanation, getSocraticPrompt,
  buildRetryQuiz, recordLessonLearned, recordStudySession,
} from '../ai/learning.js'
import { invalidateProfileCache } from '../ai/chatbot.js'
import { calculateScore } from '../utils/scoring.js'
import { SoundEngine, Haptics } from '../utils/soundEngine.js'
import { recordStudyActivity } from '../utils/notifications.js'

const QUESTION_TIME = 30

function SocraticOverlay({ question, onClose, onReveal, theme }) {
  const [attempt, setAttempt] = useState(0)
  const [prompt, setPrompt]   = useState(() => getSocraticPrompt(question, 0))
  function next() {
    const n = attempt + 1; setAttempt(n)
    const p = getSocraticPrompt(question, n); setPrompt(p)
    if (p.revealOnNext) setTimeout(() => onReveal(), 3000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-3xl p-5 pb-8"
        style={{ background:theme.card, border:'1px solid #7C3AED44' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background:'linear-gradient(135deg,#7C3AED22,#0891B222)' }}>🧑‍🏫</div>
          <div>
            <p className="font-black text-sm" style={{ color:theme.text }}>Socratic Tutor</p>
            <p className="text-xs" style={{ color:theme.muted }}>Let's think through this together</p>
          </div>
          <button onClick={onClose} className="ml-auto text-sm" style={{ color:theme.muted }}>✕</button>
        </div>
        <div className="rounded-2xl p-4 mb-4"
          style={{ background:theme.surface, border:`1px solid ${theme.border}` }}>
          <p className="text-sm leading-relaxed" style={{ color:theme.text }}>{prompt.text}</p>
          {prompt.hint && <p className="text-xs mt-2 italic" style={{ color:'#A78BFA' }}>💡 {prompt.hint}</p>}
        </div>
        <div className="flex gap-2">
          {!prompt.showAnswer && attempt < 2 && (
            <button onClick={next} className="flex-1 py-3 rounded-2xl font-bold text-sm"
              style={{ background:'rgba(124,58,237,0.15)', color:'#A78BFA', border:'1px solid rgba(124,58,237,0.3)' }}>
              I still need a hint →
            </button>
          )}
          <button onClick={onReveal} className="flex-1 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: attempt >= 1 ? '#7C3AED' : theme.surface, color: attempt >= 1 ? 'white' : theme.muted }}>
            {attempt >= 1 ? 'Show answer' : 'I think I know'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExplanationPanel({ explanation, theme }) {
  const [open, setOpen] = useState(false)
  if (!explanation) return null
  return (
    <div className="mt-3 rounded-2xl overflow-hidden"
      style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between" style={{ color:'#A78BFA' }}>
        <span className="text-sm font-bold">🧠 AI Explanation — why was I wrong?</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {explanation.steps.map((step, i) => (
            <div key={i} className="rounded-xl p-3"
              style={{ background:'rgba(0,0,0,0.2)', border:'1px solid rgba(124,58,237,0.15)' }}>
              <p className="text-xs font-black mb-1" style={{ color:'#A78BFA' }}>{step.label}</p>
              <p className="text-xs leading-relaxed" style={{ color:'#CBD5E1' }}>{step.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CogBadge({ cl, theme }) {
  if (!cl) return null
  const c = { confident:'#4ADE80', effortful:'#06B6D4', learning:'#A78BFA',
              guessing:'#F59E0B', struggling:'#EF4444', unsure:'#94A3B8', timeout:'#64748B' }
  const col = c[cl.type] || '#94A3B8'
  return <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-1"
    style={{ background:`${col}22`, color:col }}>{cl.label}</span>
}

function RetryPrompt({ rd, onStart, onSkip, theme }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{ background:theme.card, border:'1px solid rgba(239,68,68,0.3)' }}>
        <div className="text-5xl mb-3">🔁</div>
        <h2 className="text-xl font-black mb-2" style={{ color:theme.text }}>Smart Retry</h2>
        <p className="text-sm mb-4" style={{ color:theme.muted }}>
          You scored {rd.originalScore}%. The AI has built a focused quiz of just the{' '}
          <span style={{ color:'#F59E0B' }}>{rd.retryCount} concepts</span> you missed.
        </p>
        {rd.focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-4">
            {rd.focusAreas.map(a => (
              <span key={a} className="text-xs px-2 py-1 rounded-full"
                style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>⚡ {a}</span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onSkip} className="flex-1 py-3 rounded-2xl text-sm font-bold"
            style={{ background:theme.surface, color:theme.muted }}>Skip</button>
          <button onClick={onStart} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background:'linear-gradient(135deg,#EF4444,#7C3AED)' }}>
            Retry {rd.retryCount} Qs →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Quiz() {
  const { lessonId }  = useParams()
  const { state }     = useLocation()
  const navigate      = useNavigate()
  const { student, refreshStudent } = useUser()
  const { theme }     = useTheme()
  const lesson  = state?.lesson
  const subject = state?.subject
  const topicId = state?.topicId
  const isRetry = state?.isRetry || false

  const [cur, setCur]             = useState(0)
  const [answers, setAnswers]     = useState([])
  const [selected, setSelected]   = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [timeLeft, setTimeLeft]   = useState(QUESTION_TIME)
  const [active, setActive]       = useState(true)
  const [questions, setQuestions] = useState(lesson?.quiz?.questions || [])
  const [showSocratic, setShowSocratic] = useState(false)
  const [explanations, setExplanations] = useState({})
  const [cogData, setCogData]     = useState([])
  const [qStartTime, setQStart]   = useState(Date.now())
  const [curCog, setCurCog]       = useState(null)
  const [retryData, setRetryData] = useState(null)
  const [showRetry, setShowRetry] = useState(false)

  const startTime  = useRef(Date.now())
  const timerRef   = useRef(null)
  const confirmRef = useRef(null)
  const rawQs = lesson?.quiz?.questions || []

  useEffect(() => {
    if (!student || rawQs.length === 0) return
    if (isRetry) { setQuestions(rawQs); return }
    analyseStudent(student.id).then(a => {
      if (!a) return
      const lvl = a.adaptiveDifficulty?.[subject || 'mathematics'] || 3
      const f   = filterQuestionsByDifficulty(rawQs, lvl)
      setQuestions(f.length >= 5 ? f : rawQs)
    })
  }, [student?.id])

  useEffect(() => { setQStart(Date.now()); setCurCog(null) }, [cur])

  useEffect(() => {
    if (!active || confirmed) return
    setTimeLeft(QUESTION_TIME)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); confirmRef.current?.('__timeout__'); return 0 }
        if (t <= 4) SoundEngine.timerTick(3)
        else if (t <= 7) SoundEngine.timerTick(2)
        else if (t <= 11) SoundEngine.timerTick(1)
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [cur, active])

  function pick(opt) { if (confirmed) return; SoundEngine.tap(); Haptics.tap(); setSelected(opt) }

  async function confirm(forced) {
    const ans = forced || selected
    if (!ans && !forced) return
    clearInterval(timerRef.current); setActive(false)
    const q       = questions[cur]
    const final   = forced === '__timeout__' ? null : ans
    const ok      = final === q.answer
    const spent   = forced === '__timeout__' ? null : Math.round((Date.now() - qStartTime) / 1000)
    const cog     = classifyResponse(spent, ok, QUESTION_TIME)
    setCurCog(cog)
    const qCog    = { questionId:q.id, question:q.question, timeSpent:spent, isCorrect:ok, ...cog }
    const newCog  = [...cogData, qCog]; setCogData(newCog)
    ok ? (SoundEngine.correct(), Haptics.correct()) : (SoundEngine.wrong(), Haptics.wrong())
    const newAns  = [...answers, final]; setAnswers(newAns); setConfirmed(true)
    if (!ok && final !== null) {
      setExplanations(p => ({ ...p, [cur]: generateExplanation(q, final, q.answer) }))
    }
    setTimeout(async () => {
      if (cur + 1 < questions.length) {
        setCur(c => c+1); setSelected(null); setConfirmed(false); setActive(true)
      } else {
        const score     = calculateScore(newAns, questions)
        const timeTaken = Math.round((Date.now() - startTime.current) / 1000)
        SoundEngine.quizComplete()
        if (student) {
          await progressDB.completeLesson(student.id, lessonId, score, timeTaken)
          await quizDB.saveAttempt(student.id, lessonId, newAns, score, timeTaken)
          await saveDetailedAttempt(student.id, lessonId, questions, newAns)
          await goalsDB.incrementCompleted(student.id)
          await saveCognitiveLoadSession(student.id, lessonId, newCog)
          await recordLessonLearned(student.id, lessonId, topicId, subject, score)
          await recordStudyActivity()
          recordStudySession(student.id, score, Math.round(timeTaken / 60))
          invalidateProfileCache()  // chatbot gets fresh analysis next open
          refreshStudent()
        }
        if (score < 60) {
          const wrongQs = questions.filter((q, i) => newAns[i] !== q.answer)
          const rd      = buildRetryQuiz(questions, wrongQs.map(q => ({ id:q.id })), questions)
          setRetryData(rd); setShowRetry(true); return
        }
        navigate(`/results/${lessonId}`, { state:{ lesson, questions, answers:newAns, score, subject, topicId } })
      }
    }, 1300)
  }
  confirmRef.current = confirm

  function socraticReveal() {
    setShowSocratic(false)
    const q = questions[cur]
    setSelected(q.answer); setConfirmed(true); setActive(false)
    clearInterval(timerRef.current)
  }

  function doRetry() {
    setShowRetry(false)
    navigate(`/quiz/${lessonId}`, {
      state: { lesson:{ ...lesson, quiz:{ questions:retryData.questions } }, subject, topicId, isRetry:true }
    })
  }

  function skipRetry() {
    setShowRetry(false)
    navigate(`/results/${lessonId}`, {
      state: { lesson, questions, answers, score:calculateScore(answers, questions), subject, topicId }
    })
  }

  if (!lesson || questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:theme.bg }}>
      <div className="text-center px-6">
        <p className="mb-4" style={{ color:theme.muted }}>No quiz available.</p>
        <button onClick={() => navigate(-1)} style={{ color:theme.accent }}>← Go back</button>
      </div>
    </div>
  )

  const q        = questions[cur]
  const timerPct = (timeLeft / QUESTION_TIME) * 100
  const timerCol = timeLeft > 15 ? '#14B8A6' : timeLeft > 7 ? '#F59E0B' : '#EF4444'
  const isOk     = confirmed && selected === q.answer
  const isWrong  = confirmed && selected !== q.answer && selected !== null
  const curExp   = explanations[cur]

  return (
    <div className="min-h-screen flex flex-col" style={{ background:theme.bg }}>

      {showSocratic && <SocraticOverlay question={q} theme={theme}
        onClose={() => setShowSocratic(false)} onReveal={socraticReveal} />}

      {showRetry && retryData && <RetryPrompt rd={retryData} theme={theme}
        onStart={doRetry} onSkip={skipRetry} />}

      {/* Header */}
      <div className="px-5 pt-10 pb-4 border-b" style={{ background:theme.surface, borderColor:theme.border }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="text-sm" style={{ color:theme.muted }}>✕ Exit</button>
          <div className="flex items-center gap-1">
            {isRetry && <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background:'rgba(239,68,68,0.15)', color:'#EF4444' }}>🔁 Retry</span>}
            <span className="text-sm font-semibold" style={{ color:theme.muted }}>{cur+1} / {questions.length}</span>
          </div>
          <span className="text-sm font-bold" style={{ color:theme.accent }}>+{lesson.xp_reward} XP</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background:theme.border }}>
          <div className="h-full rounded-full transition-all duration-400"
            style={{ width:`${cur/questions.length*100}%`, background:`linear-gradient(90deg,${theme.accent},#7C3AED)` }}/>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono w-6 text-right" style={{ color:timerCol }}>{timeLeft}s</span>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:theme.border }}>
            <div className="h-full rounded-full"
              style={{ width:`${timerPct}%`, background:timerCol, transition:'width 1s linear,background 0.5s' }}/>
          </div>
          {confirmed && <CogBadge cl={curCog} theme={theme} />}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-6 max-w-2xl mx-auto w-full overflow-y-auto">

        {confirmed && curCog?.guessing && (
          <div className="mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)' }}>
            <span>⚡</span>
            <p className="text-xs" style={{ color:'#F59E0B' }}>
              You answered very quickly — slow down and read carefully to avoid guessing.
            </p>
          </div>
        )}
        {confirmed && curCog?.overloaded && !curCog?.guessing && (
          <div className="mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)' }}>
            <span>🧑‍🏫</span>
            <p className="text-xs" style={{ color:'#A78BFA' }}>
              This looks challenging — use the Socratic Tutor button next time for guidance.
            </p>
          </div>
        )}

        <p className="font-extrabold text-lg leading-snug mb-6" style={{ color:theme.text }}>{q.question}</p>

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let bg, border, opacity = 1
            if (!confirmed) {
              bg = selected === opt ? `${theme.accent}22` : theme.card
              border = selected === opt ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`
            } else {
              if (opt === q.answer) { bg='rgba(34,197,94,0.12)'; border='2px solid #22C55E' }
              else if (opt === selected) { bg='rgba(239,68,68,0.12)'; border='2px solid #EF4444' }
              else { bg=theme.surface; border=`1px solid ${theme.border}`; opacity=0.4 }
            }
            return (
              <button key={i} onClick={() => pick(opt)}
                className="w-full rounded-2xl p-4 text-left transition-all active:scale-95"
                style={{ background:bg, border, opacity }}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                    style={{ background:theme.border, color:theme.subtext }}>
                    {['A','B','C','D'][i]}
                  </span>
                  <span className="text-sm leading-snug" style={{ color:theme.text }}>{opt}</span>
                </div>
              </button>
            )
          })}
        </div>

        {confirmed && (
          <div className="mt-4 rounded-2xl p-4"
            style={{ background:isOk?'rgba(34,197,94,0.06)':'rgba(239,68,68,0.06)',
              border:`1px solid ${isOk?'rgba(34,197,94,0.25)':!selected?theme.border:'rgba(239,68,68,0.25)'}` }}>
            <p className="text-sm font-bold mb-1"
              style={{ color:isOk?'#4ADE80':!selected?'#94A3B8':'#FB7185' }}>
              {isOk ? '✅ Correct!' : !selected ? "⏰ Time's up!" : '❌ Not quite!'}
            </p>
            <p className="text-sm" style={{ color:theme.subtext }}>{q.explanation}</p>
          </div>
        )}

        {confirmed && isWrong && curExp && <ExplanationPanel explanation={curExp} theme={theme} />}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 space-y-2">
        {!confirmed && (
          <button onClick={() => setShowSocratic(true)}
            className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background:'rgba(124,58,237,0.12)', color:'#A78BFA', border:'1px solid rgba(124,58,237,0.25)' }}>
            🧑‍🏫 Help me think through this
          </button>
        )}
        <button onClick={() => confirm()} disabled={!selected || confirmed}
          className="w-full py-4 rounded-2xl font-extrabold text-lg text-white transition-all active:scale-95 disabled:opacity-30"
          style={{ background: !selected || confirmed ? theme.surface : `linear-gradient(135deg,${theme.accent},#7C3AED)` }}>
          {confirmed ? (cur+1<questions.length ? 'Next →' : 'See Results →') : 'Confirm Answer'}
        </button>
      </div>
    </div>
  )
}
