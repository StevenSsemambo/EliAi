import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import {
  EXAM_TIMETABLES, MOCK_TESTS,
  getTestsBySubjectAndLevel, getExamForStudent,
  TEST_TYPE_META, SUBJECT_META
} from '../data/exams.js'
import db from '../db/schema.js'
import { invalidateProfileCache } from '../ai/chatbot.js'
import { recordStudySession } from '../ai/learning.js'
import { Speaker } from '../utils/soundEngine.js'

// ── Load curriculum questions ─────────────────────────────────────
async function loadQuestions(subject, topics) {
  const modules = import.meta.glob('../curriculum/**/*.json')
  let all = []
  for (const [path, loader] of Object.entries(modules)) {
    if (subject !== 'all' && !path.includes(`/${subject}/`)) continue
    try {
      const data = await loader()
      for (const lesson of (data.lessons || data.default?.lessons || [])) {
        const match = topics.includes('all') ||
          topics.some(t => path.includes(t) || lesson.id.includes(t))
        if (match)
          for (const q of (lesson.quiz?.questions || []))
            all.push({ ...q, lesson_id: lesson.id, lesson_title: lesson.title, subject })
      }
    } catch(e) {}
  }
  return all
}

function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const SUBJECTS = ['all', 'mathematics', 'biology', 'chemistry', 'physics']
const LEVELS   = ['S1','S2','S3','S4','S5','S6']
const TYPES    = ['all','term','full_mock','past_paper','topic_drill','mixed']

// ── Timer ─────────────────────────────────────────────────────────
function Timer({ totalSeconds, onTimeUp }) {
  const [left, setLeft] = useState(totalSeconds)
  const ref = useRef()
  useEffect(() => {
    ref.current = setInterval(() => {
      setLeft(p => { if (p <= 1) { clearInterval(ref.current); onTimeUp(); return 0 } return p - 1 })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [])
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60
  const urgent = left < 300
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${urgent ? 'bg-red-900/60 text-red-300 animate-pulse' : 'bg-slate-800 text-amber-400'}`}>
      ⏱ {h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
    </div>
  )
}

// ── Timetable modal ───────────────────────────────────────────────
function TimetableModal({ timetable, onClose }) {
  const sm = SUBJECT_META
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:'rgba(0,0,0,0.85)'}}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.1)'}}>
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10" style={{background:'#0F1629'}}>
          <div>
            <h2 className="text-lg font-bold text-white">{timetable.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">Official UNEB Timetable · {timetable.year}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-400 text-lg">✕</button>
        </div>
        <div className="p-4 space-y-2">
          {timetable.papers.map(p => {
            const meta = sm[p.subject] || sm.all
            return (
              <div key={p.id} className="rounded-xl overflow-hidden" style={{border:`1px solid ${meta.border}`}}>
                <div className={`bg-gradient-to-r ${meta.grad} px-4 py-2.5 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span>{meta.icon}</span>
                    <div>
                      <div className="text-white font-semibold text-sm capitalize">{p.subject}</div>
                      <div className="text-slate-300 text-xs">{p.paper}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-sm">{p.duration_mins} min</div>
                    <div className="text-slate-400 text-xs">{p.start}</div>
                  </div>
                </div>
                <div className="px-4 py-2 flex justify-between text-xs text-slate-400" style={{background:'rgba(255,255,255,0.03)'}}>
                  <span>📅 {p.date}</span>
                  <span>{(p.duration_mins/60).toFixed(1)} hrs</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Exam Session ──────────────────────────────────────────────────
function ExamSession({ test, onFinish }) {
  const { student } = useUser()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]     = useState({})
  const [flagged, setFlagged]     = useState(new Set())
  const [current, setCurrent]     = useState(0)
  const [loading, setLoading]     = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults]     = useState(null)
  const [showNav, setShowNav]     = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => {
    loadQuestions(test.subject, test.topics).then(qs => {
      setQuestions(shuffle(qs).slice(0, test.num_questions))
      setLoading(false)
    })
  }, [test])

  const handleTimeUp = useCallback(() => { if (!submitted) doSubmit() }, [submitted, answers, questions])
  useEffect(() => { Speaker.stop(); setQSpeaking(false) }, [current])
  useEffect(() => { return () => Speaker.stop() }, [])

  function doSubmit() {
    if (submitted) return
    setSubmitted(true)
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000)
    let correct = 0
    const review = questions.map((q, i) => {
      const ok = answers[i] === q.answer
      if (ok) correct++
      return { ...q, userAnswer: answers[i] || null, correct: ok }
    })
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0
    setResults({ correct, total: questions.length, score, timeTaken, review })
    if (student?.id) {
      db.exam_results.add({ student_id: student.id, exam_id: test.id, subject: test.subject,
        title: test.name, score, correct, total: questions.length,
        time_taken: timeTaken, attempted_at: new Date().toISOString() }).catch(()=>{})
      recordStudySession(student.id, score, Math.round(timeTaken/60)).catch(()=>{})
      invalidateProfileCache()
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center">
        <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#F59E0B',borderTopColor:'transparent'}}/>
        <p className="text-slate-400 text-sm">Loading questions…</p>
      </div>
    </div>
  )

  if (results) return <ExamResults results={results} test={test} onClose={onFinish} />

  if (!questions.length) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center px-6">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-white font-bold text-lg mb-2">No questions found</p>
        <p className="text-slate-400 text-sm mb-6">Questions for these topics haven't been loaded yet.</p>
        <button onClick={onFinish} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#F59E0B'}}>← Go Back</button>
      </div>
    </div>
  )

  const q = questions[current]
  const answered = Object.keys(answers).length
  const meta = SUBJECT_META[test.subject] || SUBJECT_META.all

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#0C0F1A'}}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3" style={{background:'#0F1629',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => { if(window.confirm('Exit? Progress will be lost.')) onFinish() }} className="shrink-0 p-2 rounded-lg hover:bg-white/10 text-slate-400">✕</button>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{test.name}</div>
            <div className="text-slate-500 text-xs">{answered}/{questions.length} answered</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Timer totalSeconds={test.duration_mins * 60} onTimeUp={handleTimeUp} />
          <button onClick={() => setShowNav(!showNav)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400">⊞</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800/60">
        <div className="h-full transition-all duration-300" style={{width:`${(answered/questions.length)*100}%`, background: meta.color}}/>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
          {/* Q header */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(245,158,11,0.12)',color:'#F59E0B'}}>
              Q{current+1} / {questions.length}
            </span>
            <button onClick={() => setFlagged(f => { const n=new Set(f); n.has(current)?n.delete(current):n.add(current); return n })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${flagged.has(current)?'text-amber-400 bg-amber-400/15':'text-slate-500 hover:bg-white/5'}`}>
              🚩 {flagged.has(current) ? 'Flagged' : 'Flag'}
            </button>
          </div>

          {/* Question */}
          <div className="mb-5 p-5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <p className="text-slate-300 text-xs mb-2 uppercase tracking-wide">{q.lesson_title}</p>
            <div className="flex items-start gap-3">
              <p className="text-white text-base leading-relaxed flex-1">{q.question}</p>
              {Speaker.isSupported() && (
                <button onClick={speakQuestion}
                  title={qSpeaking ? 'Stop' : 'Read question aloud'}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{background:qSpeaking?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.06)',border:`1px solid ${qSpeaking?'rgba(245,158,11,0.5)':'rgba(255,255,255,0.1)'}`,color:qSpeaking?'#F59E0B':'#64748B'}}>
                  <span style={{fontSize:15}}>{qSpeaking ? '⏹' : '🔊'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {q.options.map((opt, i) => {
              const letter = 'ABCD'[i], selected = answers[current] === opt
              return (
                <button key={i} onClick={() => setAnswers(a => ({...a,[current]:opt}))}
                  className="w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all"
                  style={{
                    background: selected ? `${meta.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${selected ? meta.color+'60' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                    style={{background: selected ? meta.color : 'rgba(255,255,255,0.06)', color: selected ? '#fff' : '#94A3B8'}}>
                    {letter}
                  </span>
                  <span className={`text-sm ${selected ? 'text-white' : 'text-slate-300'}`}>{opt}</span>
                </button>
              )
            })}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white disabled:opacity-30"
              style={{background:'rgba(255,255,255,0.05)'}}>← Prev</button>
            {current < questions.length-1
              ? <button onClick={() => setCurrent(c => c+1)} className="px-5 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>Next →</button>
              : <button onClick={() => { if(window.confirm(`Submit? ${answered}/${questions.length} answered.`)) doSubmit() }} className="px-5 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#10B981,#059669)'}}>Submit ✓</button>
            }
          </div>
        </div>

        {/* Question navigator */}
        {showNav && (
          <div className="w-48 shrink-0 p-3 hidden md:block" style={{background:'rgba(255,255,255,0.02)',borderLeft:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Questions</p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_,i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className="w-7 h-7 rounded text-xs font-bold transition-all"
                  style={{
                    background: i===current ? meta.color : flagged.has(i) ? 'rgba(245,158,11,0.25)' : answers[i] ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)',
                    color: i===current ? '#fff' : flagged.has(i) ? '#F59E0B' : answers[i] ? '#10B981' : '#64748B'
                  }}>{i+1}</button>
              ))}
            </div>
            <button onClick={() => { if(window.confirm(`Submit?`)) doSubmit() }}
              className="w-full mt-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#10B981,#059669)'}}>
              Submit Exam
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Exam Results ──────────────────────────────────────────────────
function ExamResults({ results, test, onClose }) {
  const [filter, setFilter] = useState('all')
  const { score, correct, total, timeTaken, review } = results
  const grade = score>=80?{g:'A',c:'#10B981'}:score>=70?{g:'B',c:'#3B82F6'}:score>=60?{g:'C',c:'#F59E0B'}:score>=50?{g:'D',c:'#F97316'}:{g:'F',c:'#EF4444'}
  const mins = Math.floor(timeTaken/60), secs = timeTaken%60
  const filtered = review.filter(q => filter==='all'||(filter==='correct'&&q.correct)||(filter==='wrong'&&!q.correct))
  const meta = SUBJECT_META[test.subject] || SUBJECT_META.all

  return (
    <div className="min-h-screen" style={{background:'#0C0F1A'}}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Score card */}
        <div className="rounded-2xl p-6 mb-5" style={{background:`${grade.c}12`,border:`1px solid ${grade.c}30`}}>
          <div className="text-center mb-5">
            <div className="text-7xl font-black" style={{color:grade.c}}>{grade.g}</div>
            <div className="text-5xl font-bold text-white mt-1">{score}%</div>
            <div className="text-slate-400 text-sm mt-1">{test.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['✅','Score',`${correct}/${total}`],['⏱','Time',`${mins}m ${secs}s`],['📊','Avg/Q',`${total?Math.round(timeTaken/total):0}s`]].map(([ic,lbl,val])=>(
              <div key={lbl} className="text-center p-3 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
                <div className="text-xl">{ic}</div>
                <div className="text-lg font-bold mt-1" style={{color:grade.c}}>{val}</div>
                <div className="text-slate-500 text-xs">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300" style={{background:'rgba(255,255,255,0.06)'}}>← Back</button>
        </div>

        {/* Review */}
        <div className="flex gap-2 mb-4">
          {[['all',`All (${total})`],['correct',`Correct (${correct})`],['wrong',`Wrong (${total-correct})`]].map(([f,l])=>(
            <button key={f} onClick={()=>setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={filter===f?{background:meta.color,color:'#fff'}:{background:'rgba(255,255,255,0.05)',color:'#94A3B8'}}>
              {l}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.map((q,i)=>(
            <div key={i} className="rounded-xl p-4" style={{background:q.correct?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)',border:`1px solid ${q.correct?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`}}>
              <div className="flex gap-2 mb-2">
                <span className="text-base shrink-0">{q.correct?'✅':'❌'}</span>
                <div>
                  <p className="text-white text-sm font-medium">{q.question}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{q.lesson_title}</p>
                </div>
              </div>
              {!q.correct && <div className="text-xs text-red-400 mb-1">Your answer: {q.userAnswer||'Not answered'}</div>}
              <div className="text-xs text-green-400 mb-2">✓ Correct: {q.answer}</div>
              <div className="text-xs text-slate-400 p-2 rounded-lg" style={{background:'rgba(255,255,255,0.04)'}}>{q.explanation}</div>
              {Speaker.isSupported() && (
                <button onClick={() => Speaker.speak(`${q.question}. ${q.correct ? 'Correct.' : `Incorrect. Correct answer: ${q.answer}.`} ${q.explanation||''}`)}
                  className="mt-2 flex items-center gap-1 text-xs transition-all active:scale-90"
                  style={{color:'#475569'}}>
                  <span style={{fontSize:11}}>🔊</span>
                  <span>Read explanation</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Test Card ─────────────────────────────────────────────────────
function TestCard({ test, onStart }) {
  const meta  = SUBJECT_META[test.subject] || SUBJECT_META.all
  const tMeta = TEST_TYPE_META[test.type]  || TEST_TYPE_META.term
  return (
    <button onClick={() => onStart(test)}
      className="w-full text-left p-4 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{background:`linear-gradient(135deg,${meta.color}10,transparent)`,border:`1px solid ${meta.border}`}}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl shrink-0 mt-0.5">{meta.icon}</span>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm leading-tight">{test.name}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{background:`${tMeta.color}20`,color:tMeta.color}}>
                {tMeta.icon} {tMeta.label}
              </span>
              {test.badge && (
                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-amber-500/20 text-amber-400">{test.badge}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold" style={{color:meta.color}}>{test.num_questions}Q</div>
          <div className="text-slate-500 text-xs mt-0.5">{test.duration_mins}min</div>
        </div>
      </div>
    </button>
  )
}

// ── Main ExamCenter ───────────────────────────────────────────────
export default function ExamCenter() {
  const { student } = useUser()
  const navigate    = useNavigate()
  const [activeExam, setActiveExam]     = useState(null)
  const [showTimetable, setShowTimetable] = useState(null)
  const [mainTab, setMainTab]           = useState('tests')   // tests | timetable | history
  const [subject, setSubject]           = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [examHistory, setExamHistory]   = useState([])

  const rawLevel = student?.class_level || 'S1'
  const level    = rawLevel.toString().toUpperCase().replace(/^(\d)$/, 'S$1')

  useEffect(() => {
    if (student?.id) {
      db.exam_results.where('student_id').equals(student.id).toArray()
        .then(r => setExamHistory(r.sort((a,b)=>new Date(b.attempted_at)-new Date(a.attempted_at)).slice(0,20)))
        .catch(()=>setExamHistory([]))
    }
  }, [student?.id])

  if (activeExam) return <ExamSession test={activeExam} onFinish={() => setActiveExam(null)} />

  // Filter tests
  const allTests = MOCK_TESTS.filter(t => t.level === level || t.level === 'all')
  const visibleTests = allTests.filter(t => {
    const subjectOk = subject === 'all' ? true : t.subject === subject || t.subject === 'all'
    const typeOk    = typeFilter === 'all' ? true : t.type === typeFilter
    return subjectOk && typeOk
  })

  // Group by type for display
  const grouped = {}
  for (const test of visibleTests) {
    if (!grouped[test.type]) grouped[test.type] = []
    grouped[test.type].push(test)
  }
  const typeOrder = ['past_paper','full_mock','term','topic_drill','mixed']

  const uceTT  = EXAM_TIMETABLES.UCE
  const uaceTT = EXAM_TIMETABLES.UACE

  return (
    <div className="min-h-screen pb-24" style={{background:'#0C0F1A'}}>
      {/* Header */}
      <div className="px-4 pt-8 pb-3">
        <button onClick={() => navigate(-1)} className="text-slate-500 text-sm mb-4 flex items-center gap-1 hover:text-slate-300 transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🎓</span>
          <h1 className="text-2xl font-black text-white">Exam Centre</h1>
        </div>
        <p className="text-slate-500 text-sm pl-12">Practice tests, mocks, drills & UNEB timetables</p>
      </div>

      {/* Main tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
          {[['tests','📝 Tests'],['timetable','📅 Timetable'],['history','📊 History']].map(([k,l])=>(
            <button key={k} onClick={()=>setMainTab(k)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mainTab===k?'bg-amber-500 text-white':'text-slate-400 hover:text-slate-200'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── TESTS TAB ── */}
      {mainTab === 'tests' && (
        <div className="px-4 space-y-4">
          {/* Level indicator */}
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Showing tests for <span className="text-white font-bold">{level}</span>
              {' '}· <span className="text-amber-400 font-semibold">{visibleTests.length} tests</span>
            </p>
          </div>

          {/* Subject filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SUBJECTS.map(s => {
              const meta = SUBJECT_META[s] || SUBJECT_META.all
              const active = subject === s
              return (
                <button key={s} onClick={() => setSubject(s)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize"
                  style={active
                    ? {background:meta.color, color:'#fff'}
                    : {background:'rgba(255,255,255,0.07)', color:'#94A3B8', border:`1px solid rgba(255,255,255,0.08)`}}>
                  {meta.icon} {s === 'all' ? 'All Subjects' : s}
                </button>
              )
            })}
          </div>

          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TYPES.map(tp => {
              const meta = TEST_TYPE_META[tp]
              const active = typeFilter === tp
              return (
                <button key={tp} onClick={() => setTypeFilter(tp)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={active
                    ? {background: meta?.color || '#F59E0B', color:'#fff'}
                    : {background:'rgba(255,255,255,0.05)', color:'#64748B'}}>
                  {meta ? `${meta.icon} ${meta.label}` : '📋 All Types'}
                </button>
              )
            })}
          </div>

          {/* Results */}
          {visibleTests.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-400 text-sm">No tests match these filters</p>
            </div>
          ) : (
            typeOrder.map(tp => {
              const tests = grouped[tp]
              if (!tests?.length) return null
              const tMeta = TEST_TYPE_META[tp]
              return (
                <div key={tp}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{tMeta.icon}</span>
                    <h3 className="text-sm font-bold text-slate-300">{tMeta.label}s</h3>
                    <span className="text-xs text-slate-600">({tests.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tests.map(test => <TestCard key={test.id} test={test} onStart={setActiveExam} />)}
                  </div>
                </div>
              )
            })
          )}

          {/* Custom quick tests */}
          <div className="mt-2 p-4 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-slate-300 text-sm font-semibold mb-3">⚡ Custom Quick Test — All Topics</p>
            <div className="grid grid-cols-2 gap-2">
              {[{n:'Quick 10Q',q:10,m:15},{n:'Standard 30Q',q:30,m:45},{n:'Full 60Q',q:60,m:90},{n:'Marathon 100Q',q:100,m:150}].map(o=>(
                <button key={o.n} onClick={()=>setActiveExam({id:`custom_${o.q}`,name:o.n,subject:'all',level,duration_mins:o.m,num_questions:o.q,topics:['all'],type:'term'})}
                  className="py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02]"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <div className="text-amber-400 font-bold text-sm">{o.q}Q</div>
                  <div className="text-slate-500 text-xs">{o.m} min</div>
                  <div className="text-slate-400 text-xs mt-0.5">{o.n}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TIMETABLE TAB ── */}
      {mainTab === 'timetable' && (
        <div className="px-4 space-y-4">
          {[uceTT, uaceTT].map(tt => {
            const isActive = tt.level === level
            return (
              <div key={tt.name} className="rounded-2xl overflow-hidden" style={{border: isActive ? '1.5px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)'}}>
                <div className="p-4 flex items-center justify-between" style={{background:'rgba(255,255,255,0.04)'}}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-sm">{tt.name}</h3>
                      {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">Your Exam</span>}
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{tt.level} · {tt.year} · {tt.papers.length} papers</p>
                  </div>
                  <button onClick={() => setShowTimetable(tt)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                    View
                  </button>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {tt.papers.slice(0,4).map(p => {
                    const m = SUBJECT_META[p.subject] || SUBJECT_META.all
                    return (
                      <div key={p.id} className="p-2.5 rounded-lg" style={{background:`${m.color}10`,border:`1px solid ${m.border}`}}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{m.icon}</span>
                          <span className="text-white text-xs font-medium capitalize">{p.subject}</span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1">{p.date}</div>
                        <div className="text-xs font-semibold mt-0.5" style={{color:m.color}}>{p.duration_mins} min</div>
                      </div>
                    )
                  })}
                </div>
                {tt.papers.length > 4 && <p className="text-center text-slate-600 text-xs pb-3">+{tt.papers.length-4} more papers</p>}
              </div>
            )
          })}

          <div className="p-4 rounded-xl" style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)'}}>
            <p className="text-amber-400 font-semibold text-sm">📌 Exam Preparation Tips</p>
            <ul className="text-slate-400 text-xs mt-2 space-y-1 leading-relaxed">
              <li>• Start mock tests 3 months before the exam</li>
              <li>• Do at least 2 full paper simulations per subject</li>
              <li>• Review all wrong answers immediately after each test</li>
              <li>• Use Topic Drills to target your weakest areas</li>
              <li>• Aim for at least 70% on mocks before sitting the real exam</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {mainTab === 'history' && (
        <div className="px-4">
          {examHistory.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-slate-400 font-medium">No exam attempts yet</p>
              <p className="text-slate-600 text-sm mt-1">Take a test to see your results here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {examHistory.map((a,i) => {
                const meta = SUBJECT_META[a.subject] || SUBJECT_META.all
                const scoreColor = a.score>=70?'#10B981':a.score>=50?'#F59E0B':'#EF4444'
                return (
                  <div key={i} className="p-4 rounded-xl flex items-center justify-between"
                    style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{meta.icon}</span>
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{a.title || a.exam_id}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{new Date(a.attempted_at).toLocaleDateString()} · {a.correct}/{a.total} correct</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black shrink-0 ml-2" style={{color:scoreColor}}>{a.score}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showTimetable && <TimetableModal timetable={showTimetable} onClose={() => setShowTimetable(null)} />}
    </div>
  )
}
