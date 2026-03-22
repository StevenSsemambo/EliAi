import { useState, useEffect, useRef, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Puzzle Bank ───────────────────────────────────────────────────────────────
// solution[personIdx][catIdx] = correct attribute index for that category

const PUZZLE_BANK = [
  {
    title: 'The Three Students',
    difficulty: 1,
    diffLabel: '⭐ Starter',
    timeLimit: 120,
    people: ['Alice', 'Bob', 'Carol'],
    categories: [
      { name: 'Subject', items: ['Maths', 'Physics', 'Biology'] },
      { name: 'Score',   items: ['90', '85', '75'] },
    ],
    // Alice→Maths(0)→90(0), Bob→Physics(1)→85(1), Carol→Biology(2)→75(2)
    solution: [[0, 0], [1, 2], [2, 1]],
    clues: [
      'Alice does not study Physics.',
      'The Biology student scored 75.',
      'Bob scored higher than 75.',
      'Carol does not study Maths.',
    ],
  },
  {
    title: 'The Athletes',
    difficulty: 1,
    diffLabel: '⭐ Starter',
    timeLimit: 120,
    people: ['Grace', 'Henry', 'Iris'],
    categories: [
      { name: 'Sport',    items: ['Football', 'Swimming', 'Running'] },
      { name: 'Position', items: ['1st', '2nd', '3rd'] },
    ],
    // Grace→Football(0)→1st(0), Henry→Running(2)→3rd(2), Iris→Swimming(1)→2nd(1)
    solution: [[0, 0], [2, 2], [1, 1]],
    clues: [
      'Grace does not swim.',
      'The swimmer came 2nd.',
      'Henry does not swim.',
      'Iris did not come 1st.',
    ],
  },
  {
    title: 'The Science Fair',
    difficulty: 2,
    diffLabel: '⭐⭐ Medium',
    timeLimit: 150,
    people: ['David', 'Eve', 'Frank'],
    categories: [
      { name: 'Project', items: ['Volcano', 'Robot', 'Plant'] },
      { name: 'Award',   items: ['Gold', 'Silver', 'Bronze'] },
    ],
    // David→Volcano(0)→Gold(0), Eve→Robot(1)→Silver(1), Frank→Plant(2)→Bronze(2)
    solution: [[0, 0], [1, 1], [2, 2]],
    clues: [
      'David did not build the Robot.',
      'Eve won Silver.',
      'The Volcano project won Gold.',
      'Frank built the Plant project.',
    ],
  },
  {
    title: 'The Reading Club',
    difficulty: 2,
    diffLabel: '⭐⭐ Medium',
    timeLimit: 180,
    people: ['Ana', 'Ben', 'Cara', 'Dan'],
    categories: [
      { name: 'Book', items: ['Novel', 'Poetry', 'History', 'Science'] },
      { name: 'Day',  items: ['Mon', 'Tue', 'Wed', 'Thu'] },
    ],
    // Ana→Novel(0)→Mon(0), Ben→Poetry(1)→Tue(1), Cara→History(2)→Wed(2), Dan→Science(3)→Thu(3)
    solution: [[0, 0], [1, 1], [2, 2], [3, 3]],
    clues: [
      'Ana does not read Poetry.',
      'Ben reads on Tuesday.',
      'The History reader meets on Wednesday.',
      'Cara reads Poetry.',
      'Ana meets on Monday.',
      'Dan does not read Science.',
    ],
  },
  {
    title: 'The Tech Team',
    difficulty: 2,
    diffLabel: '⭐⭐ Medium',
    timeLimit: 180,
    people: ['Sam', 'Tina', 'Uma', 'Vic'],
    categories: [
      { name: 'Language', items: ['Python', 'Java', 'React', 'Swift'] },
      { name: 'Level',    items: ['Junior', 'Mid', 'Senior', 'Lead'] },
    ],
    // Sam→React(2)→Senior(2), Tina→Python(0)→Lead(3), Uma→Java(1)→Mid(1), Vic→Swift(3)→Junior(0)
    solution: [[2, 2], [0, 3], [1, 1], [3, 0]],
    clues: [
      'Sam does not use Java.',
      'The React developer is Senior.',
      'Tina is Lead.',
      'The Swift developer is Junior.',
      'Uma does not use Python.',
      'Vic is not Mid or Senior.',
    ],
  },
  {
    title: 'The Sports Team',
    difficulty: 3,
    diffLabel: '⭐⭐⭐ Hard',
    timeLimit: 210,
    people: ['Amos', 'Beatrice', 'Charles', 'Diana'],
    categories: [
      { name: 'Sport',   items: ['Football', 'Swimming', 'Athletics', 'Tennis'] },
      { name: 'Rank',    items: ['1st', '2nd', '3rd', '4th'] },
      { name: 'Country', items: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda'] },
    ],
    // Amos→Football(0)→1st(0)→Uganda(0), Beatrice→Swimming(1)→2nd(1)→Kenya(1),
    // Charles→Athletics(2)→3rd(2)→Tanzania(2), Diana→Tennis(3)→4th(3)→Rwanda(3)
    solution: [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]],
    clues: [
      'Amos does not play Tennis.',
      'The Football player ranked 1st.',
      'Beatrice is from Kenya.',
      'The swimmer ranked 2nd.',
      'Charles is not from Uganda.',
      'Diana plays Tennis.',
      'The Athletics player ranked 3rd.',
    ],
  },
  {
    title: 'The School Prefects',
    difficulty: 3,
    diffLabel: '⭐⭐⭐ Hard',
    timeLimit: 240,
    people: ['Emma', 'Felix', 'Grace', 'Henry', 'Irene'],
    categories: [
      { name: 'Subject', items: ['Maths', 'English', 'Biology', 'Physics', 'Chemistry'] },
      { name: 'Class',   items: ['S4A', 'S4B', 'S5A', 'S5B', 'S6A'] },
      { name: 'House',   items: ['Red', 'Blue', 'Green', 'Yellow', 'White'] },
    ],
    solution: [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]],
    clues: [
      'Emma is in S4A.',
      'The Maths prefect is in Red house.',
      'Felix studies English.',
      'The S5A student is in Green house.',
      'Grace is not in Red or Yellow house.',
      'Henry is in S5B.',
      'The Chemistry prefect is in White house.',
      'Irene is in White house.',
      'The Biology prefect is in S5A.',
    ],
  },
]

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildMarks(puzzle) {
  // marks[personIdx][catIdx][attrIdx] = null | 'yes' | 'no'
  return puzzle.people.map(() =>
    puzzle.categories.map(cat => Array(cat.items.length).fill(null))
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`
}

function timerColor(pct) {
  if (pct > 50) return '#4ADE80'
  if (pct > 20) return '#F59E0B'
  return '#EF4444'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WinOverlay({ puzzle, puzzleIdx, score, elapsed, hintsUsed, onRetry, onNext, onExit, game }) {
  const hasNext = puzzleIdx + 1 < PUZZLE_BANK.length
  return (
    <div style={overlayStyle}>
      <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 320 }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>🧠</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
          Logic Master!
        </div>
        <div style={{ color: '#4ADE80', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Solved in {formatTime(elapsed)} · {score} pts<br />
          {hintsUsed} hint{hintsUsed !== 1 ? 's' : ''} used
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRetry}  style={overlayBtn('secondary')}>Retry</button>
          {hasNext
            ? <button onClick={onNext} style={overlayBtn('primary')}>Next puzzle →</button>
            : <button onClick={onRetry} style={overlayBtn('primary')}>Start over</button>
          }
          <button onClick={onExit} style={overlayBtn('secondary')}>Exit</button>
        </div>
      </div>
    </div>
  )
}

function LostOverlay({ puzzleIdx, onRetry, onSkip, game }) {
  const hasNext = puzzleIdx + 1 < PUZZLE_BANK.length
  return (
    <div style={overlayStyle}>
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>⏰</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
          Time's Up!
        </div>
        <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>
          Study the clues carefully and try again.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onRetry} style={overlayBtn('primary')}>Try Again</button>
          {hasNext && <button onClick={onSkip} style={overlayBtn('secondary')}>Skip</button>}
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'absolute', inset: 0, zIndex: 40,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(3,6,14,0.97)', backdropFilter: 'blur(10px)', borderRadius: 16,
}

function overlayBtn(variant) {
  return {
    padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
    border: 'none', cursor: 'pointer',
    background: variant === 'primary' ? '#6366F1' : '#1A2642',
    color: variant === 'primary' ? 'white' : '#94A3B8',
  }
}

function HowToPlayGuide({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🧩</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>
          How to Play
        </div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>MindBridge Logic</div>
      </div>

      {[
        ['📋', 'Read the clues', 'Logic clues describe who has which attribute. Each attribute is used exactly once.'],
        ['✓✗', 'Mark the grid', 'Click a cell to mark ✓ (yes) or ✗ (no). Marking ✓ auto-eliminates others in the same row/column.'],
        ['🔍', 'Eliminate options', 'Use ✗ to cross off impossible combinations until only one ✓ remains per row.'],
        ['✅', 'Submit when done', 'Once every person has a ✓ in each category, hit Submit.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}

      <div style={{
        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
      }}>
        <div style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
          💡 Strategy
        </div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Start with definite clues ("X is Y" → mark ✓ immediately)<br />
          • Then use "not" clues to ✗ eliminate options<br />
          • Watch clues turn green as you satisfy them — that's your progress tracker
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${game?.color ?? '#6366F1'}, #4F46E5)`,
        }}
      >
        Start Game →
      </button>
    </div>
  )
}

// ── Elimination Grid ──────────────────────────────────────────────────────────

function EliminationGrid({ puzzle, marks, onMark, shakeRows, wrongCells }) {
  const cellStyle = (mark, isWrong) => ({
    width: 34, height: 28,
    borderRadius: 6, border: '1px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.12s',
    userSelect: 'none',
    borderColor: isWrong ? 'rgba(239,68,68,0.6)'
      : mark === 'yes' ? 'rgba(74,222,128,0.5)'
      : mark === 'no'  ? 'rgba(255,255,255,0.06)'
      : 'rgba(255,255,255,0.08)',
    background: isWrong ? 'rgba(239,68,68,0.2)'
      : mark === 'yes' ? 'rgba(74,222,128,0.15)'
      : mark === 'no'  ? 'rgba(255,255,255,0.02)'
      : 'rgba(255,255,255,0.04)',
    color: mark === 'yes' ? '#4ADE80'
      : mark === 'no'  ? '#334155'
      : '#64748B',
  })

  return (
    <div style={{ overflowX: 'auto', marginBottom: 12 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
        <thead>
          {/* Category name headers (spanning) */}
          <tr>
            <td style={{ minWidth: 70 }} />
            {puzzle.categories.map((cat, ci) => (
              <td
                key={ci}
                colSpan={cat.items.length}
                style={{
                  textAlign: 'center',
                  fontSize: 10, fontWeight: 700, color: '#64748B',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  paddingBottom: 4,
                  paddingLeft: ci > 0 ? 8 : 0,
                  borderBottom: '1px solid #1E2D4A',
                }}
              >
                {cat.name}
              </td>
            ))}
          </tr>
          {/* Attribute labels */}
          <tr>
            <td />
            {puzzle.categories.map((cat, ci) =>
              cat.items.map((item, ai) => (
                <td
                  key={`${ci}-${ai}`}
                  style={{
                    textAlign: 'center',
                    fontSize: 10, color: '#475569',
                    paddingBottom: 6,
                    paddingLeft: ci > 0 && ai === 0 ? 8 : 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item}
                </td>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {puzzle.people.map((person, pi) => (
            <tr
              key={pi}
              style={{ animation: shakeRows.has(pi) ? 'mb-shake 0.35s ease' : 'none' }}
            >
              <td style={{
                fontSize: 12, fontWeight: 700, color: 'white',
                paddingRight: 10, whiteSpace: 'nowrap', verticalAlign: 'middle',
              }}>
                {person}
              </td>
              {puzzle.categories.map((cat, ci) =>
                cat.items.map((item, ai) => {
                  const mark = marks[pi][ci][ai]
                  const isWrong = wrongCells.some(([wp, wc, wa]) => wp === pi && wc === ci && wa === ai)
                  return (
                    <td
                      key={`${ci}-${ai}`}
                      style={{ paddingLeft: ci > 0 && ai === 0 ? 8 : 0 }}
                    >
                      <div
                        style={cellStyle(mark, isWrong)}
                        onClick={() => onMark(pi, ci, ai)}
                        title={`${person} — ${item}`}
                      >
                        {mark === 'yes' ? '✓' : mark === 'no' ? '✗' : ''}
                      </div>
                    </td>
                  )
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MindBridge({ game, levelData, studentId, onFinish }) {
  const initialPuzzleIdx = Math.min(levelData?.puzzleIdx ?? 0, PUZZLE_BANK.length - 1)

  const [screen, setScreen]       = useState('guide')
  const [puzzleIdx, setPuzzleIdx] = useState(initialPuzzleIdx)
  const [marks, setMarks]         = useState([])
  const [phase, setPhase]         = useState('playing')
  const [timeLeft, setTimeLeft]   = useState(0)
  const [score, setScore]         = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintMsg, setHintMsg]     = useState(null)
  const [shakeRows, setShakeRows] = useState(new Set())
  const [wrongCells, setWrongCells] = useState([])
  const [elapsed, setElapsed]     = useState(0)

  const startTimeRef = useRef(Date.now())
  const timerRef     = useRef(null)

  const puzzle = PUZZLE_BANK[puzzleIdx]

  // ── Timer ──────────────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => clearInterval(timerRef.current), [])

  useEffect(() => {
    if (phase !== 'playing') { stopTimer(); return }
    const tl = puzzle.timeLimit
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const left = Math.max(0, tl - secs)
      setTimeLeft(left)
      setElapsed(secs)
      if (left === 0) {
        clearInterval(timerRef.current)
        setPhase('lost')
      }
    }, 500)
    return stopTimer
  }, [phase, puzzle, stopTimer])

  useEffect(() => () => stopTimer(), [stopTimer])

  // ── Init ───────────────────────────────────────────────────────────────────

  function loadPuzzle(idx) {
    const p = PUZZLE_BANK[idx]
    setPuzzleIdx(idx)
    setMarks(buildMarks(p))
    setPhase('playing')
    setTimeLeft(p.timeLimit)
    setScore(0)
    setHintsUsed(0)
    setHintMsg(null)
    setShakeRows(new Set())
    setWrongCells([])
    setElapsed(0)
    startTimeRef.current = Date.now()
  }

  function handleStart() {
    loadPuzzle(puzzleIdx)
    setScreen('playing')
  }

  // ── Mark logic ─────────────────────────────────────────────────────────────

  function handleMark(pi, ci, ai) {
    if (phase !== 'playing') return
    SoundEngine.tap?.()

    setMarks(prev => {
      const next = prev.map(row => row.map(cat => [...cat]))
      const cur = next[pi][ci][ai]

      // Cycle: null → yes → no → null
      let newVal
      const alreadyYes = next[pi][ci].indexOf('yes')
      if (cur === null) {
        newVal = (alreadyYes >= 0 && alreadyYes !== ai) ? 'no' : 'yes'
      } else if (cur === 'yes') {
        newVal = 'no'
      } else {
        newVal = null
      }

      next[pi][ci][ai] = newVal

      if (newVal === 'yes') {
        // Auto-eliminate: mark all other people as NO for this attr in this cat
        for (let p2 = 0; p2 < puzzle.people.length; p2++) {
          if (p2 !== pi && next[p2][ci][ai] !== 'yes') {
            next[p2][ci][ai] = 'no'
          }
        }
        // Mark all other attrs for this person/cat as NO
        for (let a2 = 0; a2 < puzzle.categories[ci].items.length; a2++) {
          if (a2 !== ai && next[pi][ci][a2] !== 'yes') {
            next[pi][ci][a2] = 'no'
          }
        }
      }

      return next
    })

    setWrongCells([])
  }

  // ── Check solution ─────────────────────────────────────────────────────────

  function isComplete(m) {
    return puzzle.people.every((_, pi) =>
      puzzle.categories.every((_, ci) => m[pi][ci].indexOf('yes') >= 0)
    )
  }

  function checkSolution() {
    if (!isComplete(marks) || phase !== 'playing') return
    const wrong = []
    for (let pi = 0; pi < puzzle.people.length; pi++) {
      for (let ci = 0; ci < puzzle.categories.length; ci++) {
        const yesIdx = marks[pi][ci].indexOf('yes')
        if (yesIdx !== puzzle.solution[pi][ci]) {
          wrong.push([pi, ci, yesIdx])
        }
      }
    }

    if (wrong.length === 0) {
      stopTimer()
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const base = puzzle.people.length <= 3 ? 500 : puzzle.people.length === 4 ? 800 : 1200
      const fs = Math.max(50, Math.round(base - secs * 2 - hintsUsed * 100))
      setScore(fs)
      setPhase('won')
      setElapsed(secs)
      SoundEngine.levelComplete?.()
      if (studentId) saveGameScore(studentId, game?.id, levelData?.level, fs)
    } else {
      SoundEngine.gameWrong?.()
      setWrongCells(wrong)
      const wrongPeople = new Set(wrong.map(([pi]) => pi))
      setShakeRows(wrongPeople)
      setTimeout(() => {
        setShakeRows(new Set())
        setWrongCells([])
      }, 500)
    }
  }

  // ── Hint ───────────────────────────────────────────────────────────────────

  function useHint() {
    if (phase !== 'playing') return
    // Find first incorrectly-filled or empty cell
    for (let pi = 0; pi < puzzle.people.length; pi++) {
      for (let ci = 0; ci < puzzle.categories.length; ci++) {
        const correct = puzzle.solution[pi][ci]
        if (marks[pi][ci][correct] !== 'yes') {
          setMarks(prev => {
            const next = prev.map(row => row.map(cat => [...cat]))
            // Set correct to yes, rest to no
            for (let ai = 0; ai < puzzle.categories[ci].items.length; ai++) {
              next[pi][ci][ai] = ai === correct ? 'yes' : 'no'
            }
            // Auto-eliminate across rows
            for (let p2 = 0; p2 < puzzle.people.length; p2++) {
              if (p2 !== pi && next[p2][ci][correct] !== 'yes') {
                next[p2][ci][correct] = 'no'
              }
            }
            return next
          })
          const msg = `${puzzle.people[pi]} → ${puzzle.categories[ci].name}: ${puzzle.categories[ci].items[correct]}`
          setHintMsg(msg)
          setHintsUsed(h => h + 1)
          setTimeout(() => setHintMsg(null), 3000)
          SoundEngine.tap?.()
          return
        }
      }
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const timerPct = (timeLeft / puzzle.timeLimit) * 100
  const tc = timerColor(timerPct)
  const complete = marks.length > 0 && isComplete(marks)
  const solvedPeople = marks.length > 0
    ? puzzle.people.filter((_, pi) => puzzle.categories.every((_, ci) => marks[pi][ci].indexOf('yes') >= 0))
    : []

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'guide') {
    return <HowToPlayGuide game={game} onStart={handleStart} />
  }

  return (
    <div style={{ position: 'relative', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes mb-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>

      {/* Puzzle selector */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
        {PUZZLE_BANK.map((p, i) => (
          <button
            key={i}
            onClick={() => loadPuzzle(i)}
            style={{
              padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              border: '1px solid',
              borderColor: i === puzzleIdx ? '#6366F188' : '#1A2642',
              background: i === puzzleIdx ? '#6366F122' : 'rgba(255,255,255,0.03)',
              color: i === puzzleIdx ? '#818CF8' : '#475569',
              cursor: 'pointer',
            }}
          >
            {p.diffLabel}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <StatPill label="score" value={phase === 'won' ? score : '–'} color="#FBBF24" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{puzzle.title}</div>
          <div style={{ color: '#475569', fontSize: 10 }}>{puzzle.diffLabel}</div>
        </div>
        <StatPill
          label="left"
          value={formatTime(timeLeft)}
          color={tc}
          mono
        />
      </div>

      {/* Timer bar */}
      <div style={{ height: 3, borderRadius: 2, background: '#0F1629', marginBottom: 12, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${timerPct}%`, background: tc,
          transition: 'width 0.5s linear, background 0.4s',
        }} />
      </div>

      {/* Progress pills */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {puzzle.people.map(person => {
          const done = solvedPeople.includes(person)
          return (
            <span key={person} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 99,
              border: '1px solid',
              borderColor: done ? 'rgba(74,222,128,0.4)' : '#1A2642',
              background: done ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
              color: done ? '#4ADE80' : '#475569',
            }}>
              {person}{done ? ' ✓' : ''}
            </span>
          )
        })}
      </div>

      {/* Clues */}
      <div style={{
        marginBottom: 12, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
      }}>
        <div style={{
          color: '#475569', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Clues — solved clues turn green
        </div>
        {puzzle.clues.map((clue, i) => (
          <div key={i} style={{
            color: '#94A3B8', fontSize: 12, marginBottom: 3,
            paddingLeft: 10, lineHeight: 1.5,
            borderLeft: `2px solid ${game?.color ?? '#6366F1'}44`,
          }}>
            {clue}
          </div>
        ))}
      </div>

      {/* Hint banner */}
      {hintMsg && (
        <div style={{
          marginBottom: 10, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          color: '#F59E0B', fontSize: 12, fontWeight: 700, textAlign: 'center',
        }}>
          💡 {hintMsg}
        </div>
      )}

      {/* Elimination grid */}
      <EliminationGrid
        puzzle={puzzle}
        marks={marks}
        onMark={handleMark}
        shakeRows={shakeRows}
        wrongCells={wrongCells}
      />

      {/* Legend */}
      <div style={{ color: '#334155', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
        Click to cycle: <span style={{ color: '#4ADE80' }}>✓ yes</span> → <span style={{ color: '#475569' }}>✗ no</span> → blank. Confirming ✓ auto-eliminates others in the row and column.
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={useHint}
          style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            color: '#F59E0B', background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer',
          }}
        >
          💡 Hint ({hintsUsed} used)
        </button>
        <button
          onClick={checkSolution}
          disabled={!complete || phase !== 'playing'}
          style={{
            flex: 2, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 800,
            color: 'white',
            background: complete && phase === 'playing' ? (game?.color ?? '#6366F1') : '#1A2642',
            border: 'none',
            cursor: complete && phase === 'playing' ? 'pointer' : 'default',
            opacity: complete && phase === 'playing' ? 1 : 0.5,
          }}
        >
          {complete ? '✓ Submit Solution' : 'Fill all rows first'}
        </button>
      </div>

      {/* Overlays */}
      {phase === 'won' && (
        <WinOverlay
          puzzle={puzzle}
          puzzleIdx={puzzleIdx}
          score={score}
          elapsed={elapsed}
          hintsUsed={hintsUsed}
          onRetry={() => loadPuzzle(puzzleIdx)}
          onNext={() => loadPuzzle(puzzleIdx + 1)}
          onExit={onFinish}
          game={game}
        />
      )}
      {phase === 'lost' && (
        <LostOverlay
          puzzleIdx={puzzleIdx}
          onRetry={() => loadPuzzle(puzzleIdx)}
          onSkip={() => loadPuzzle(puzzleIdx + 1)}
          game={game}
        />
      )}
    </div>
  )
}

function StatPill({ label, value, color = '#CBD5E1', mono = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{
        color, fontWeight: 800, fontSize: 15,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      <span style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  )
}
