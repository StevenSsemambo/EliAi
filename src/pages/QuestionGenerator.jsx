import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { SoundEngine, Speaker } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

// ── Full curriculum map (mirrors Lesson.jsx / Dashboard.jsx) ──────
const ALL_FILES = {
  mathematics: {
    s1:['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],
    s2:['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],
    s3:['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],
    s4:['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],
    s5:['complex_numbers','differential_equations','further_calculus','mechanics','numerical_methods','probability_advanced'],
    s6:['applied_mathematics','further_pure','number_theory','pure_mathematics','statistics_probability'],
  },
  physics: {
    s1:['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],
    s2:['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],
    s3:['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],
    s4:['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],
    s5:['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],
    s6:['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity'],
  },
  biology: {
    s1:['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],
    s2:['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],
    s3:['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],
    s4:['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],
    s5:['biochemistry','bioenergetics','cell_biology_advanced','ecology_advanced','genetics_advanced','microbiology'],
    s6:['bioethics','developmental_biology','immunology','molecular_biology'],
  },
  chemistry: {
    s1:['atoms','bonding','matter','separation_techniques','water'],
    s2:['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],
    s3:['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],
    s4:['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],
    s5:['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],
    s6:['biochemistry','green_chemistry','industrial_chemistry','pharmaceuticals','polymers'],
  },
}

const SUBJECT_ICONS = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJECT_COLORS = {
  mathematics: { grad:'linear-gradient(135deg,#0D9488,#0F766E)', accent:'#14B8A6' },
  physics:     { grad:'linear-gradient(135deg,#06B6D4,#0369A1)', accent:'#06B6D4' },
  biology:     { grad:'linear-gradient(135deg,#16A34A,#15803D)', accent:'#4ADE80' },
  chemistry:   { grad:'linear-gradient(135deg,#7C3AED,#6D28D9)', accent:'#A78BFA' },
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Search all curriculum files for questions matching the topic query
async function findQuestions(query, classLevel, subject) {
  const q = query.toLowerCase().trim()
  const cls = (classLevel || 's1').toLowerCase()
  const results = []

  const subjects = subject ? [subject] : Object.keys(ALL_FILES)

  for (const subj of subjects) {
    const files = ALL_FILES[subj]?.[cls] || []
    for (const file of files) {
      try {
        const mod = await import(`../curriculum/${subj}/${cls}/${file}.json`)
        const data = mod.default
        const topicMatch =
          data.topic_id?.toLowerCase().includes(q) ||
          data.topic_title?.toLowerCase().includes(q) ||
          file.toLowerCase().includes(q)

        for (const lesson of data.lessons || []) {
          const lessonMatch =
            topicMatch ||
            lesson.title?.toLowerCase().includes(q) ||
            lesson.id?.toLowerCase().includes(q)

          if (!lessonMatch) {
            // Check if any content item mentions the query
            const contentMatch = (lesson.content || []).some(c =>
              c.body?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)
            )
            if (!contentMatch) continue
          }

          const qs = (lesson.quiz?.questions || []).filter(q => q.type === 'multiple_choice')
          qs.forEach(question => results.push({
            ...question,
            lessonTitle: lesson.title,
            subject: subj,
            topicTitle: data.topic_title,
            file,
          }))
        }
      } catch (e) {}
    }
  }
  return results
}

// ── Quiz component ────────────────────────────────────────────────
function QuizRunner({ questions, topic, onRestart, onNewSearch }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState([]) // {correct: bool}[]
  const [done, setDone] = useState(false)

  const q = questions[current]
  const total = questions.length
  const score = answers.filter(a => a.correct).length

  function choose(opt) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    const correct = opt === q.answer
    if (correct) SoundEngine.correct?.() || SoundEngine.tap()
    else SoundEngine.tap()
    setAnswers(prev => [...prev, { correct, selected: opt, answer: q.answer }])
  }

  function next() {
    SoundEngine.tap()
    if (current + 1 >= total) { setDone(true); return }
    setCurrent(c => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  const pct = Math.round((score / total) * 100)
  const grade = pct >= 80 ? '🌟 Excellent!' : pct >= 60 ? '👍 Good work!' : '📚 Keep practising!'

  if (done) return (
    <div className="px-5 pb-32">
      <div className="rounded-3xl p-6 text-center mb-4" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-5xl mb-3">{pct >= 80 ? '🌟' : pct >= 60 ? '✅' : '📚'}</div>
        <div className="text-3xl font-extrabold text-white mb-1">{pct}%</div>
        <div className="text-slate-400 text-sm mb-1">{score} of {total} correct</div>
        <div className="font-bold text-lg mb-4" style={{ color:'#F59E0B' }}>{grade}</div>
        <div className="text-xs text-slate-500 mb-5">Topic: {topic}</div>

        {/* Answer breakdown */}
        <div className="space-y-2 text-left mb-6">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: answers[i]?.correct ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${answers[i]?.correct ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
              <span className="flex-shrink-0 mt-0.5">{answers[i]?.correct ? '✅' : '❌'}</span>
              <div>
                <div className="text-white text-xs font-semibold">{q.question}</div>
                {!answers[i]?.correct && (
                  <div className="text-xs mt-0.5" style={{ color:'#4ADE80' }}>Answer: {q.answer}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onRestart}
            className="w-full py-3 rounded-2xl font-bold text-black text-sm"
            style={{ background:'#F59E0B' }}>
            🔄 Try Again — Same Topic
          </button>
          <button onClick={onNewSearch}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background:'rgba(255,255,255,0.06)', color:'#94A3B8', border:'1px solid rgba(255,255,255,0.1)' }}>
            🔍 Search New Topic
          </button>
        </div>
      </div>
    </div>
  )

  const subjectColor = SUBJECT_COLORS[q.subject]?.accent || '#14B8A6'

  return (
    <div className="px-5 pb-32">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Question {current + 1} of {total}</span>
          <span style={{ color: subjectColor }}>{q.subject} · {q.topicTitle}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'#1A2035' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width:`${((current) / total) * 100}%`, background: subjectColor }} />
        </div>
      </div>

      {/* Source label */}
      <div className="text-xs text-slate-600 mb-3">
        {SUBJECT_ICONS[q.subject]} {q.lessonTitle}
      </div>

      {/* Question */}
      <div className="rounded-2xl p-5 mb-4" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white font-semibold text-sm leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {(q.options || []).map((opt, i) => {
          const isSelected = selected === opt
          const isCorrect = opt === q.answer
          let bg = 'rgba(255,255,255,0.03)'
          let border = 'rgba(255,255,255,0.08)'
          let color = '#CBD5E1'
          if (revealed) {
            if (isCorrect)      { bg = 'rgba(74,222,128,0.12)'; border = 'rgba(74,222,128,0.4)'; color = '#4ADE80' }
            else if (isSelected){ bg = 'rgba(239,68,68,0.12)';  border = 'rgba(239,68,68,0.4)';  color = '#F87171' }
          } else if (isSelected) {
            bg = `${subjectColor}18`; border = subjectColor; color = '#fff'
          }
          return (
            <button key={i} onClick={() => choose(opt)}
              className="w-full text-left rounded-2xl p-4 transition-all active:scale-98"
              style={{ background:bg, border:`1px solid ${border}`, color }}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: revealed && isCorrect ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)' }}>
                  {['A','B','C','D'][i]}
                </span>
                <span className="text-sm font-medium">{opt}</span>
                {revealed && isCorrect && <span className="ml-auto">✅</span>}
                {revealed && isSelected && !isCorrect && <span className="ml-auto">❌</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {revealed && q.explanation && (
        <div className="rounded-2xl p-4 mb-4" style={{ background:'rgba(13,148,136,0.08)', border:'1px solid rgba(13,148,136,0.25)' }}>
          <div className="text-xs font-bold mb-1" style={{ color:'#14B8A6' }}>💡 Explanation</div>
          <div className="text-slate-300 text-sm leading-relaxed">{q.explanation}</div>
        </div>
      )}

      {revealed && (
        <button onClick={next}
          className="w-full py-3.5 rounded-2xl font-bold text-black text-sm transition-all active:scale-95"
          style={{ background:'#F59E0B' }}>
          {current + 1 >= total ? 'See Results →' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function QuestionGenerator() {
  const { student } = useUser()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [searching, setSearching] = useState(false)
  const [questions, setQuestions] = useState(null)  // null=idle, []=no results, [...]= questions
  const [quizKey, setQuizKey] = useState(0)
  const [error, setError] = useState('')

  const SUBJECTS = ['', 'mathematics', 'physics', 'biology', 'chemistry']

  async function generate() {
    if (!query.trim()) { setError('Please enter a topic to search.'); return }
    setError('')
    setSearching(true)
    setQuestions(null)
    SoundEngine.tap()
    try {
      const found = await findQuestions(query, student?.class_level, subject || null)
      if (found.length === 0) {
        setQuestions([])
        setSearching(false)
        return
      }
      // Deduplicate by question text, shuffle, take 5 (or up to 10 if requested)
      const seen = new Set()
      const unique = found.filter(q => {
        if (seen.has(q.question)) return false
        seen.add(q.question); return true
      })
      const picked = shuffle(unique).slice(0, 5)
      // Shuffle each question's options too
      const ready = picked.map(q => ({
        ...q,
        options: shuffle(q.options || []),
      }))
      setQuestions(ready)
      setQuizKey(k => k + 1)
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setSearching(false)
  }

  function restart() {
    setQuizKey(k => k + 1)
    generate()
  }

  function newSearch() {
    setQuestions(null)
    setQuery('')
    setSubject('')
  }

  const SUGGESTED = [
    { label:'Algebra', subject:'mathematics' },
    { label:'Forces', subject:'physics' },
    { label:'Cell biology', subject:'biology' },
    { label:'Moles', subject:'chemistry' },
    { label:'Trigonometry', subject:'mathematics' },
    { label:'Genetics', subject:'biology' },
    { label:'Radioactivity', subject:'physics' },
    { label:'Acids & bases', subject:'chemistry' },
  ]

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5 relative overflow-hidden"
        style={{ background:'linear-gradient(180deg,#131829 0%,#0C0F1A 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background:'radial-gradient(circle,rgba(245,158,11,0.1) 0%,transparent 70%)' }}/>
        <button onClick={() => navigate('/dashboard')} className="text-sm mb-3 block" style={{ color: theme.muted }}>
          ← Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)' }}>🎯</div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Question Generator</h1>
            <p className="text-xs text-slate-500 mt-0.5">Get practice questions on any topic</p>
          </div>
        </div>
      </div>

      {/* Search form — always visible unless in quiz */}
      {!questions || questions.length === 0 ? (
        <div className="px-5 pt-5">
          {/* Subject filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => { setSubject(s); SoundEngine.tap() }}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: subject === s ? '#F59E0B' : 'rgba(255,255,255,0.05)',
                  color: subject === s ? '#0C0F1A' : '#94A3B8',
                  border: `1px solid ${subject === s ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {s ? `${SUBJECT_ICONS[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}` : '🌐 All subjects'}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative mb-3">
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="e.g. algebra, photosynthesis, forces…"
              className="w-full px-4 py-3.5 pr-12 rounded-2xl text-white text-sm outline-none"
              style={{
                background:'rgba(255,255,255,0.05)',
                border:`1px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                caretColor:'#F59E0B',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">×</button>
            )}
          </div>

          {error && <p className="text-xs text-red-400 mb-3 px-1">{error}</p>}

          <button onClick={generate} disabled={searching || !query.trim()}
            className="w-full py-3.5 rounded-2xl font-extrabold text-black text-sm mb-5 transition-all active:scale-95 disabled:opacity-40"
            style={{ background:'#F59E0B' }}>
            {searching ? '🔍 Searching curriculum…' : '⚡ Generate 5 Questions'}
          </button>

          {/* No results message */}
          {questions !== null && questions.length === 0 && (
            <div className="rounded-2xl p-5 text-center mb-5"
              style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <div className="text-3xl mb-2">🤔</div>
              <div className="text-white font-bold text-sm mb-1">No questions found</div>
              <div className="text-slate-400 text-xs">
                Try a broader term like "algebra" instead of "quadratic equations", or switch to All Subjects.
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-3">💡 Try these topics</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(s => (
                <button key={s.label}
                  onClick={() => {
                    setQuery(s.label)
                    setSubject(s.subject)
                    setError('')
                    SoundEngine.tap()
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background:`${SUBJECT_COLORS[s.subject]?.accent}18`,
                    color: SUBJECT_COLORS[s.subject]?.accent,
                    border:`1px solid ${SUBJECT_COLORS[s.subject]?.accent}33`,
                  }}>
                  {SUBJECT_ICONS[s.subject]} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Back to search */}
          <div className="px-5 pt-4 pb-2">
            <button onClick={newSearch} className="text-sm flex items-center gap-1" style={{ color:'#94A3B8' }}>
              ← New search
            </button>
          </div>
          <div className="px-5 mb-1">
            <div className="rounded-xl px-3 py-2 text-xs" style={{ background:'rgba(245,158,11,0.08)', color:'#F59E0B' }}>
              🎯 "{query}" · {questions.length} questions · {student?.class_level?.toUpperCase()}
            </div>
          </div>
          <div className="mt-3">
            <QuizRunner
              key={quizKey}
              questions={questions}
              topic={query}
              onRestart={restart}
              onNewSearch={newSearch}
            />
          </div>
        </>
      )}

      <Navbar />
    </div>
  )
}
