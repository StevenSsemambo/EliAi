import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { EXAM_TIMETABLES, MOCK_TESTS, getMockTestsForLevel } from '../data/exams.js'
import db from '../db/schema.js'
import { invalidateProfileCache } from '../ai/chatbot.js'
import { recordStudySession } from '../ai/learning.js'

// Load all curriculum questions
async function loadQuestions(subject, topics) {
  const modules = import.meta.glob('../curriculum/**/*.json')
  let allQuestions = []
  for (const [path, loader] of Object.entries(modules)) {
    const shouldLoad = subject === 'all' || path.includes(`/${subject}/`)
    if (!shouldLoad) continue
    try {
      const data = await loader()
      for (const lesson of (data.lessons || data.default?.lessons || [])) {
        const topicMatch = topics.includes('all') ||
          topics.some(t => path.includes(t) || lesson.id.includes(t))
        if (topicMatch) {
          for (const q of (lesson.quiz?.questions || [])) {
            allQuestions.push({ ...q, lesson_id: lesson.id, lesson_title: lesson.title, subject })
          }
        }
      }
    } catch(e) {}
  }
  return allQuestions
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Countdown Timer ──────────────────────────────────────────────
function Timer({ totalSeconds, onTimeUp }) {
  const [left, setLeft] = useState(totalSeconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); onTimeUp(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const h = Math.floor(left / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60
  const pct = (left / totalSeconds) * 100
  const urgent = left < 300  // last 5 mins

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${urgent ? 'bg-red-900/50 text-red-300 animate-pulse' : 'bg-slate-800 text-amber-400'}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
    </div>
  )
}

// ── Timetable View ───────────────────────────────────────────────
function TimetableView({ timetable, onClose }) {
  const subjectColors = { mathematics:'from-blue-600 to-blue-700', biology:'from-green-600 to-green-700', chemistry:'from-purple-600 to-purple-700', physics:'from-amber-600 to-amber-700' }
  const subjectIcons = { mathematics:'📐', biology:'🧬', chemistry:'🧪', physics:'⚡' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)'}}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.1)'}}>
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/10" style={{background:'#0F1629'}}>
          <div>
            <h2 className="text-xl font-bold text-white">{timetable.name}</h2>
            <p className="text-slate-400 text-sm mt-0.5">Official Exam Timetable {timetable.year}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {timetable.papers.map(paper => (
            <div key={paper.id} className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className={`bg-gradient-to-r ${subjectColors[paper.subject] || 'from-slate-600 to-slate-700'} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{subjectIcons[paper.subject]}</span>
                  <div>
                    <div className="text-white font-semibold capitalize text-sm">{paper.subject}</div>
                    <div className="text-white/80 text-xs">{paper.paper}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono text-sm font-bold">{paper.duration_mins} mins</div>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between" style={{background:'rgba(255,255,255,0.03)'}}>
                <div className="text-slate-300 text-sm">
                  📅 {paper.date} &nbsp;⏰ {paper.start}
                </div>
                <div className="text-slate-500 text-xs">{Math.round(paper.duration_mins/60*10)/10}h</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Exam Session ─────────────────────────────────────────────────
function ExamSession({ test, onFinish }) {
  const { student } = useUser()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [showNav, setShowNav] = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => {
    loadQuestions(test.subject, test.topics).then(qs => {
      const shuffled = shuffle(qs)
      setQuestions(shuffled.slice(0, test.num_questions))
      setLoading(false)
    })
  }, [test])

  const handleTimeUp = useCallback(() => { if (!submitted) handleSubmit() }, [submitted, answers, questions])

  function handleSubmit() {
    if (submitted) return
    setSubmitted(true)
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000)
    let correct = 0
    const review = questions.map((q, i) => {
      const isCorrect = answers[i] === q.answer
      if (isCorrect) correct++
      return { ...q, userAnswer: answers[i] || null, correct: isCorrect }
    })
    const score = Math.round((correct / questions.length) * 100)
    setResults({ correct, total: questions.length, score, timeTaken, review })
    // ── Save to DB so brain.js examPredictions and ProgressReport can read it ──
    if (student?.id) {
      db.exam_results.add({
        student_id: student.id,
        exam_id: test.id,
        subject: test.subject,
        title: test.title,
        score,
        correct,
        total: questions.length,
        time_taken: timeTaken,
        attempted_at: new Date().toISOString(),
      }).catch(() => {})
      recordStudySession(student.id, score, Math.round(timeTaken / 60)).catch(() => {})
      invalidateProfileCache()
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#F59E0B',borderTopColor:'transparent'}}/>
        <p className="text-slate-400">Loading exam questions...</p>
      </div>
    </div>
  )

  if (results) return <ExamResults results={results} test={test} onClose={onFinish} />

  const q = questions[current]
  const answered = Object.keys(answers).length
  const isFlagged = flagged.has(current)

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#0C0F1A'}}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3" style={{background:'#0F1629',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center gap-3">
          <button onClick={() => { if(window.confirm('Exit exam? Progress will be lost.')) onFinish() }} className="p-2 rounded-lg hover:bg-white/10 text-slate-400">
            ✕
          </button>
          <div>
            <div className="text-white font-semibold text-sm">{test.name}</div>
            <div className="text-slate-400 text-xs">{answered}/{questions.length} answered</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Timer totalSeconds={test.duration_mins * 60} onTimeUp={handleTimeUp} />
          <button onClick={() => setShowNav(!showNav)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 text-lg">⊞</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div className="h-full bg-amber-500 transition-all" style={{width:`${(answered/questions.length)*100}%`}}/>
      </div>

      <div className="flex-1 flex">
        {/* Question area */}
        <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
          {/* Q header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400" style={{background:'rgba(245,158,11,0.15)'}}>
                Q{current+1} / {questions.length}
              </span>
              <span className="text-slate-500 text-xs truncate max-w-32">{q.lesson_title}</span>
            </div>
            <button onClick={() => setFlagged(f => { const n = new Set(f); n.has(current)?n.delete(current):n.add(current); return n })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isFlagged ? 'text-amber-400 bg-amber-400/20' : 'text-slate-400 hover:bg-white/5'}`}>
              🚩 {isFlagged ? 'Flagged' : 'Flag'}
            </button>
          </div>

          {/* Question text */}
          <div className="mb-6 p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <p className="text-white text-base leading-relaxed">{q.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {q.options.map((opt, i) => {
              const letter = 'ABCD'[i]
              const selected = answers[current] === opt
              return (
                <button key={i} onClick={() => setAnswers(a => ({...a,[current]:opt}))}
                  className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all ${selected
                    ? 'text-white' : 'text-slate-300 hover:text-white'}`}
                  style={{
                    background: selected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                    border: selected ? '1.5px solid rgba(245,158,11,0.5)' : '1.5px solid rgba(255,255,255,0.07)'
                  }}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${selected ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400'}`}>{letter}</span>
                  <span className="text-sm">{opt}</span>
                </button>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              style={{background:'rgba(255,255,255,0.05)'}}>
              ← Previous
            </button>
            {current < questions.length-1 ? (
              <button onClick={() => setCurrent(c => c+1)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                Next →
              </button>
            ) : (
              <button onClick={() => { if(window.confirm(`Submit exam? ${answered}/${questions.length} answered.`)) handleSubmit() }}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#10B981,#059669)'}}>
                Submit Exam ✓
              </button>
            )}
          </div>
        </div>

        {/* Question navigator panel */}
        {showNav && (
          <div className="w-52 shrink-0 p-4 border-l border-white/8 hidden md:block" style={{background:'rgba(255,255,255,0.02)'}}>
            <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                    i===current ? 'bg-amber-500 text-white' :
                    flagged.has(i) ? 'bg-amber-900/60 text-amber-300' :
                    answers[i] ? 'bg-green-800/60 text-green-300' :
                    'bg-white/5 text-slate-500 hover:bg-white/10'
                  }`}>{i+1}</button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              {[['bg-amber-500','Current'],['bg-green-800/60 text-green-300','Answered'],['bg-amber-900/60 text-amber-300','Flagged'],['bg-white/5 text-slate-500','Unanswered']].map(([cl,lbl]) => (
                <div key={lbl} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${cl}`}/>
                  <span className="text-slate-500">{lbl}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { if(window.confirm(`Submit? ${answered}/${questions.length} answered.`)) handleSubmit() }}
              className="w-full mt-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#10B981,#059669)'}}>
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Exam Results ─────────────────────────────────────────────────
function ExamResults({ results, test, onClose }) {
  const [showReview, setShowReview] = useState(false)
  const [filter, setFilter] = useState('all') // all, correct, incorrect
  const { score, correct, total, timeTaken, review } = results
  const grade = score>=80?{g:'A',c:'text-green-400',b:'from-green-900/40 to-green-800/20'}:score>=70?{g:'B',c:'text-blue-400',b:'from-blue-900/40 to-blue-800/20'}:score>=60?{g:'C',c:'text-amber-400',b:'from-amber-900/40 to-amber-800/20'}:score>=50?{g:'D',c:'text-orange-400',b:'from-orange-900/40 to-orange-800/20'}:{g:'F',c:'text-red-400',b:'from-red-900/40 to-red-800/20'}
  const mins = Math.floor(timeTaken/60)
  const secs = timeTaken%60
  const filtered = review.filter(q => filter==='all'||( filter==='correct'&&q.correct)||(filter==='incorrect'&&!q.correct))

  return (
    <div className="min-h-screen" style={{background:'#0C0F1A'}}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Score card */}
        <div className={`rounded-2xl p-6 mb-6 bg-gradient-to-br ${grade.b}`} style={{border:'1px solid rgba(255,255,255,0.1)'}}>
          <div className="text-center mb-4">
            <div className={`text-7xl font-black ${grade.c}`}>{grade.g}</div>
            <div className="text-5xl font-bold text-white mt-1">{score}%</div>
            <div className="text-slate-400 mt-1">{test.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[['✅','Correct',`${correct}/${total}`],['⏱️','Time',`${mins}m ${secs}s`],['📊','Per Q',`${Math.round(timeTaken/total)}s`]].map(([ic,lbl,val]) => (
              <div key={lbl} className="text-center p-3 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
                <div className="text-2xl">{ic}</div>
                <div className={`text-lg font-bold mt-1 ${grade.c}`}>{val}</div>
                <div className="text-slate-500 text-xs">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white" style={{background:'rgba(255,255,255,0.06)'}}>
            ← Back to Exams
          </button>
          <button onClick={() => setShowReview(!showReview)} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            {showReview ? 'Hide' : 'Review Answers'}
          </button>
        </div>

        {/* Review section */}
        {showReview && (
          <div>
            <div className="flex gap-2 mb-4">
              {['all','correct','incorrect'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter===f?'bg-amber-500 text-white':'text-slate-400 hover:text-white'}`}
                  style={filter!==f?{background:'rgba(255,255,255,0.05)'}:{}}>
                  {f} {f==='all'?`(${total})`:f==='correct'?`(${correct})`:`(${total-correct})`}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {filtered.map((q, i) => (
                <div key={i} className="rounded-xl p-4" style={{background:q.correct?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)',border:`1px solid ${q.correct?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`}}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-lg">{q.correct?'✅':'❌'}</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{q.question}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{q.lesson_title}</p>
                    </div>
                  </div>
                  {!q.correct && q.userAnswer && (
                    <div className="text-xs text-red-400 mb-1">Your answer: {q.userAnswer}</div>
                  )}
                  {!q.correct && !q.userAnswer && (
                    <div className="text-xs text-slate-500 mb-1">Not answered</div>
                  )}
                  <div className="text-xs text-green-400 mb-2">✓ Correct: {q.answer}</div>
                  <div className="text-xs text-slate-400 p-2 rounded-lg" style={{background:'rgba(255,255,255,0.04)'}}>{q.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ExamCenter Page ─────────────────────────────────────────
export default function ExamCenter() {
  const { student } = useUser()
  const [activeExam, setActiveExam] = useState(null)
  const [showTimetable, setShowTimetable] = useState(null)
  const [tab, setTab] = useState('mock') // mock | timetable | history
  const [examHistory, setExamHistory] = useState([])

  const level = student?.class_level || 'S1'
  const mockTests = getMockTestsForLevel(level)
  const uceActive = ['S4','4'].includes(String(level))
  const uaceActive = ['S6','6'].includes(String(level))

  useEffect(() => {
    if (student?.id) {
      db.quiz_attempts.where('student_id').equals(student.id).toArray().then(attempts => {
        const examAttempts = attempts.filter(a => a.lesson_id?.startsWith('exam_'))
        setExamHistory(examAttempts.sort((a,b) => new Date(b.attempted_at)-new Date(a.attempted_at)).slice(0,10))
      })
    }
  }, [student?.id])

  if (activeExam) {
    return <ExamSession test={activeExam} onFinish={() => setActiveExam(null)} />
  }

  const subjectColors = { mathematics:'from-blue-600/20 to-blue-700/10 border-blue-500/20', biology:'from-green-600/20 to-green-700/10 border-green-500/20', chemistry:'from-purple-600/20 to-purple-700/10 border-purple-500/20', physics:'from-amber-600/20 to-amber-700/10 border-amber-500/20', all:'from-slate-600/20 to-slate-700/10 border-slate-500/20' }
  const subjectIcons = { mathematics:'📐', biology:'🧬', chemistry:'🧪', physics:'⚡', all:'📚' }

  return (
    <div className="min-h-screen pb-20" style={{background:'#0C0F1A'}}>
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🎓</span>
          <h1 className="text-2xl font-black text-white">Exam Centre</h1>
        </div>
        <p className="text-slate-400 text-sm pl-12">Practice exams, mock tests & official timetables</p>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-5">
        <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
          {[['mock','📝 Mock Tests'],['timetable','📅 Timetable'],['history','📊 My Results']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab===key?'bg-amber-500 text-white':'text-slate-400 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mock' && (
        <div className="px-4 space-y-3">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Choose a test — timed, exam conditions</p>
          {mockTests.map(test => (
            <button key={test.id} onClick={() => setActiveExam(test)}
              className={`w-full text-left p-4 rounded-xl bg-gradient-to-br ${subjectColors[test.subject] || subjectColors.all} border transition-all hover:scale-[1.01] active:scale-[0.99]`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{subjectIcons[test.subject] || '📚'}</span>
                  <div>
                    <div className="text-white font-semibold text-sm">{test.name}</div>
                    <div className="text-slate-400 text-xs mt-0.5 capitalize">{test.subject} · {test.level}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold text-sm">{test.num_questions}Q</div>
                  <div className="text-slate-500 text-xs">{test.duration_mins} min</div>
                </div>
              </div>
            </button>
          ))}

          {/* Custom test */}
          <div className="mt-4 p-4 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-slate-400 text-sm font-medium mb-3">🎯 All-subjects practice</p>
            <div className="grid grid-cols-2 gap-2">
              {[{name:'Quick 10Q',q:10,mins:15},{name:'Standard 30Q',q:30,mins:45},{name:'Full Exam 60Q',q:60,mins:90},{name:'Marathon 100Q',q:100,mins:150}].map(opt => (
                <button key={opt.name} onClick={() => setActiveExam({id:`custom_${opt.q}`,name:opt.name,subject:'all',level,duration_mins:opt.mins,num_questions:opt.q,topics:['all']})}
                  className="py-3 px-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white transition-all text-center"
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <div className="text-amber-400 font-bold">{opt.q}Q</div>
                  <div className="text-slate-400 text-xs">{opt.mins}min</div>
                  <div className="text-xs mt-0.5">{opt.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'timetable' && (
        <div className="px-4 space-y-4">
          {[EXAM_TIMETABLES.UCE, EXAM_TIMETABLES.UACE].map(tt => (
            <div key={tt.name} className="rounded-2xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="p-4" style={{background:'rgba(255,255,255,0.04)'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold">{tt.name}</h3>
                    <p className="text-slate-400 text-sm mt-0.5">{tt.level} · {tt.year} · {tt.papers.length} papers</p>
                  </div>
                  <button onClick={() => setShowTimetable(tt)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                    style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                    View
                  </button>
                </div>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {tt.papers.slice(0,4).map(p => (
                  <div key={p.id} className="p-2.5 rounded-lg" style={{background:'rgba(255,255,255,0.03)'}}>
                    <div className="text-white text-xs font-medium capitalize">{p.subject}</div>
                    <div className="text-slate-500 text-xs">{p.date}</div>
                    <div className="text-amber-400 text-xs">{p.duration_mins}min</div>
                  </div>
                ))}
              </div>
              {tt.papers.length > 4 && <p className="text-center text-slate-500 text-xs pb-3">+{tt.papers.length-4} more papers</p>}
            </div>
          ))}

          <div className="p-4 rounded-xl text-center" style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)'}}>
            <p className="text-amber-400 font-semibold text-sm">📌 Preparation Tips</p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">Start mock tests 3 months before exams. Do at least 2 full papers per subject. Review all incorrect answers. Focus on weak topics.</p>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="px-4">
          {examHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-slate-400">No exam attempts yet</p>
              <p className="text-slate-600 text-sm mt-1">Take a mock test to see your results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {examHistory.map((attempt, i) => (
                <div key={i} className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold text-sm">{attempt.lesson_id}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{new Date(attempt.attempted_at).toLocaleDateString()}</div>
                    </div>
                    <div className={`text-2xl font-black ${attempt.score>=70?'text-green-400':attempt.score>=50?'text-amber-400':'text-red-400'}`}>
                      {attempt.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showTimetable && <TimetableView timetable={showTimetable} onClose={() => setShowTimetable(null)} />}
    </div>
  )
}
