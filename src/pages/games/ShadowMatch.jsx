import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Shape data ────────────────────────────────────────────────────────────────
// cubes: [x, y, z] — x=right, y=up, z=forward
// views: 2D boolean grids for top (x,z cols), front (x cols, y rows bottom-up), side (z cols, y rows)
// answerView: which view the question asks about

const SHAPES = [
  {
    name: 'L-Tower', level: 1,
    cubes: [[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,2,0]],
    question: 'Which is the FRONT view?', answerView: 'front',
    views: {
      top:   [[1,1,1]],
      front: [[0,0,1],[0,0,1],[1,1,1]],
      side:  [[1],[1],[1]],
    },
  },
  {
    name: 'Staircase', level: 1,
    cubes: [[0,0,0],[1,0,0],[1,1,0],[2,0,0],[2,1,0],[2,2,0]],
    question: 'Which is the FRONT view?', answerView: 'front',
    views: {
      top:   [[1,1,1]],
      front: [[0,0,1],[0,1,1],[1,1,1]],
      side:  [[1],[1],[1]],
    },
  },
  {
    name: 'Cross', level: 1,
    cubes: [[1,0,0],[0,0,1],[1,0,1],[2,0,1],[1,0,2]],
    question: 'Which is the TOP view?', answerView: 'top',
    views: {
      top:   [[0,1,0],[1,1,1],[0,1,0]],
      front: [[1,1,1]],
      side:  [[1,1,1]],
    },
  },
  {
    name: 'T-Shape', level: 2,
    cubes: [[0,0,0],[1,0,0],[2,0,0],[1,1,0],[1,2,0]],
    question: 'Which is the FRONT view?', answerView: 'front',
    views: {
      top:   [[1,1,1]],
      front: [[0,1,0],[0,1,0],[1,1,1]],
      side:  [[1],[1],[1]],
    },
  },
  {
    name: 'Corner Tower', level: 2,
    cubes: [[0,0,0],[1,0,0],[0,0,1],[0,1,1],[0,2,1],[0,3,1]],
    question: 'Which is the TOP view?', answerView: 'top',
    views: {
      top:   [[1,0],[1,1]],
      front: [[1,0],[1,0],[1,0],[1,1]],
      side:  [[0,1],[0,1],[0,1],[1,1]],
    },
  },
  {
    name: 'Platform', level: 2,
    cubes: [[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[1,1,1]],
    question: 'Which is the FRONT view?', answerView: 'front',
    views: {
      top:   [[1,1,1],[1,1,1]],
      front: [[0,1,0],[1,1,1]],
      side:  [[1,1],[1,0]],
    },
  },
  {
    name: 'Zigzag', level: 3,
    cubes: [[0,0,0],[0,1,0],[1,1,0],[1,2,0],[2,2,0]],
    question: 'Which is the FRONT view?', answerView: 'front',
    views: {
      top:   [[1,1,1]],
      front: [[0,0,1],[0,1,1],[1,1,0]],
      side:  [[1],[1],[1]],
    },
  },
  {
    name: 'Double Tower', level: 3,
    cubes: [[0,0,0],[0,1,0],[0,2,0],[2,0,0],[2,1,0],[0,0,1],[2,0,1]],
    question: 'Which is the FRONT view?', answerView: 'front',
    views: {
      top:   [[1,0,1],[1,0,1]],
      front: [[1,0,1],[1,0,1],[1,0,0]],
      side:  [[1,1],[1,0],[1,0]],
    },
  },
]

const DIFFICULTIES = [
  { label: 'Easy',   timePerQ: 18, rounds: 5, maxLevel: 1 },
  { label: 'Medium', timePerQ: 13, rounds: 6, maxLevel: 2 },
  { label: 'Hard',   timePerQ: 9,  rounds: 7, maxLevel: 3 },
]

// ── Isometric rendering helpers ───────────────────────────────────────────────

const CUBE_SIZE = 28

function cubeToIso(x, y, z) {
  const ix = (x - z) * CUBE_SIZE * 0.866
  const iy = (x + z) * CUBE_SIZE * 0.5 - y * CUBE_SIZE
  return { ix, iy }
}

function buildCubeSVG(cubes) {
  const hw = CUBE_SIZE * 0.866
  const hh = CUBE_SIZE * 0.5

  const sorted = [...cubes].sort((a, b) => (a[0] + a[2] - a[1]) - (b[0] + b[2] - b[1]))
  const projected = cubes.map(([x, y, z]) => cubeToIso(x, y, z))
  const minX = Math.min(...projected.map(p => p.ix)) - hw
  const maxX = Math.max(...projected.map(p => p.ix)) + hw
  const minY = Math.min(...projected.map(p => p.iy)) - CUBE_SIZE
  const maxY = Math.max(...projected.map(p => p.iy)) + hh
  const W = Math.ceil(maxX - minX + 16)
  const H = Math.ceil(maxY - minY + 16)
  const ox = -minX + 8
  const oy = -minY + 8

  const poly = pts => pts.map(([px, py]) => `${px},${py}`).join(' ')

  const faces = sorted.map(([x, y, z]) => {
    const { ix, iy } = cubeToIso(x, y, z)
    const cx = ix + ox, cy = iy + oy

    const top   = [[cx,cy-CUBE_SIZE],[cx+hw,cy-hh],[cx,cy],[cx-hw,cy-hh]]
    const left  = [[cx-hw,cy-hh],[cx,cy],[cx,cy+hh],[cx-hw,cy+hh-hh]]
    const right = [[cx+hw,cy-hh],[cx,cy],[cx,cy+hh],[cx+hw,cy+hh-hh]]

    return (
      `<polygon points="${poly(top)}"   fill="#5B8BF5" stroke="#1A2E7A" strokeWidth="1"/>` +
      `<polygon points="${poly(left)}"  fill="#3B62CC" stroke="#1A2E7A" strokeWidth="1"/>` +
      `<polygon points="${poly(right)}" fill="#2A4799" stroke="#1A2E7A" strokeWidth="1"/>`
    )
  })

  return { facesHTML: faces.join(''), W, H }
}

// ── Distractor generation ─────────────────────────────────────────────────────

function transposeGrid(grid) {
  const rows = grid.length
  const cols = Math.max(...grid.map(r => r.length))
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => grid[r]?.[c] ?? 0)
  )
}
function flipH(grid) { return grid.map(row => [...row].reverse()) }
function flipV(grid) { return [...grid].reverse() }

function makeDistractors(correctGrid, otherGrids, count) {
  const transforms = [
    transposeGrid,
    flipH,
    flipV,
    g => flipH(transposeGrid(g)),
    g => flipV(transposeGrid(g)),
  ]
  const candidates = []
  for (const t of transforms) {
    try { candidates.push(t(correctGrid)) } catch {}
  }
  for (const g of otherGrids) {
    candidates.push(g)
    for (const t of transforms.slice(0, 2)) {
      try { candidates.push(t(g)) } catch {}
    }
  }
  const seen = new Set([JSON.stringify(correctGrid)])
  const unique = []
  for (const c of candidates) {
    const key = JSON.stringify(c)
    if (!seen.has(key)) { seen.add(key); unique.push(c) }
  }
  // Shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]]
  }
  return unique.slice(0, count)
}

function buildOptions(shape) {
  const correctGrid = shape.views[shape.answerView]
  const otherGrids = Object.entries(shape.views)
    .filter(([k]) => k !== shape.answerView)
    .map(([, v]) => v)
  const distractors = makeDistractors(correctGrid, otherGrids, 3)
  while (distractors.length < 3) {
    distractors.push(otherGrids[distractors.length % otherGrids.length] ?? correctGrid)
  }

  const opts = [
    { grid: correctGrid, isCorrect: true,  label: shape.answerView.charAt(0).toUpperCase() + shape.answerView.slice(1) + ' view' },
    ...distractors.map((g, i) => ({ grid: g, isCorrect: false, label: ['Option B', 'Option C', 'Option D'][i] })),
  ]
  // Shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]]
  }
  return opts
}

function shuffleShapes(shapes, excludeIdx) {
  const idx = Math.floor(Math.random() * shapes.length)
  if (shapes.length > 1 && idx === excludeIdx) return (idx + 1) % shapes.length
  return idx
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IsoShape({ cubes }) {
  const { facesHTML, W, H } = useMemo(() => buildCubeSVG(cubes), [cubes])
  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: facesHTML }}
    />
  )
}

function ViewGrid({ grid, state: viewState }) {
  if (!grid?.length) return <div style={{ width: 80, height: 60 }} />
  const rows = grid.length
  const cols = Math.max(...grid.map(r => r.length))
  const cell = Math.min(18, Math.floor(80 / cols))

  const fillColors = {
    normal:   '#64748B',
    selected: '#818CF8',
    correct:  '#4ADE80',
    wrong:    '#EF4444',
  }
  const bgColors = {
    normal:   'transparent',
    selected: '#6366F144',
    correct:  '#4ADE8033',
    wrong:    '#EF444433',
  }

  const fill = fillColors[viewState] || fillColors.normal
  const emptyBorder = viewState === 'normal' ? 'var(--color-border-tertiary)' : fill + '44'

  return (
    <div style={{
      display: 'inline-grid',
      gridTemplateRows: `repeat(${rows}, ${cell}px)`,
      gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
      gap: 2,
    }}>
      {grid.map((row, ri) =>
        Array.from({ length: cols }, (_, ci) => (
          <div
            key={`${ri}-${ci}`}
            style={{
              width: cell, height: cell, borderRadius: 3,
              background: row[ci] ? fill : bgColors[viewState],
              border: row[ci] ? 'none' : `1px solid ${emptyBorder}`,
              transition: 'background 0.15s',
            }}
          />
        ))
      )}
    </div>
  )
}

function ChoiceCard({ opt, viewState, onClick }) {
  const borderColors = {
    normal:   '1px solid var(--color-border-tertiary)',
    selected: '2px solid #818CF888',
    correct:  '2px solid #4ADE8077',
    wrong:    '2px solid #EF444477',
  }
  const bgColors = {
    normal:   'var(--color-background-secondary)',
    selected: '#6366F118',
    correct:  '#4ADE8011',
    wrong:    '#EF444411',
  }
  const labelColors = {
    normal:   'var(--color-text-tertiary)',
    selected: '#818CF8',
    correct:  '#4ADE80',
    wrong:    '#EF4444',
  }

  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 8px', borderRadius: 12,
        border: borderColors[viewState] || borderColors.normal,
        background: bgColors[viewState] || bgColors.normal,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        transition: 'all 0.12s',
      }}
    >
      <ViewGrid grid={opt.grid} state={viewState} />
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: labelColors[viewState] || labelColors.normal,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {opt.label}
      </span>
    </button>
  )
}

function WinOverlay({ correct, totalRounds, score, diffIdx, onRetry, onNextDiff, onExit, game }) {
  const isGood = correct >= Math.round(totalRounds * 0.7)
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(3,6,14,0.97)', backdropFilter: 'blur(10px)', borderRadius: 14,
    }}>
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>{isGood ? '🎯' : '🧠'}</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
          {isGood ? 'Spatial Master!' : 'Good effort!'}
        </div>
        <div style={{ color: isGood ? '#4ADE80' : '#F59E0B', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {correct}/{totalRounds} correct · {score} pts<br />
          {DIFFICULTIES[diffIdx].label} difficulty
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRetry} style={overlayBtn('#6366F1')}>Play Again</button>
          {diffIdx < DIFFICULTIES.length - 1 && (
            <button onClick={onNextDiff} style={overlayBtn('#1A2642', '#94A3B8')}>
              Try {DIFFICULTIES[diffIdx + 1].label} →
            </button>
          )}
          <button onClick={onExit} style={overlayBtn('#111827', '#64748B')}>Exit</button>
        </div>
      </div>
    </div>
  )
}

function overlayBtn(bg, color = 'white') {
  return {
    padding: '11px 22px', borderRadius: 12, fontWeight: 800,
    color, background: bg, border: 'none', cursor: 'pointer', fontSize: 13,
  }
}

function HowToPlayGuide({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Shadow Match</div>
      </div>

      {[
        ['🧊', 'Study the 3D shape', 'A shape built from cubes is shown. Rotate it mentally.'],
        ['👁',  'Pick the right view', '4 flat grids are shown. One is the correct view of the shape.'],
        ['🔍', 'Read the question',   'It tells you exactly which view to find — top, front, or side.'],
        ['🔥', 'Build a streak',      'Correct answers fast earn bonus points. Chain them for a multiplier!'],
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
        background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.25)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
      }}>
        <div style={{ color: '#F9A8D4', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Top view = looking straight down<br />
          • Front view = looking from the front (x-axis spans left-right)<br />
          • Side view = looking from the right (z-axis spans left-right)<br />
          • Count the grid rows and columns to eliminate wrong options
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${game?.color ?? '#EC4899'}, #9333EA)`,
        }}
      >
        Start Game →
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShadowMatch({ game, levelData, studentId, onFinish }) {
  const initialDiffIdx = (() => {
    const d = levelData?.difficulty ?? 1
    return Math.min(Math.max(d - 1, 0), DIFFICULTIES.length - 1)
  })()

  const [screen, setScreen]     = useState('guide')
  const [diffIdx, setDiffIdx]   = useState(initialDiffIdx)
  const [shapeIdx, setShapeIdx] = useState(0)
  const [options, setOptions]   = useState([])
  const [round, setRound]       = useState(1)
  const [score, setScore]       = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [streak, setStreak]     = useState(0)
  const [phase, setPhase]       = useState('playing')
  const [timeLeft, setTimeLeft] = useState(18)
  const [selected, setSelected] = useState(null)    // option object
  const [feedback, setFeedback] = useState(null)    // null | 'right' | 'wrong'
  const [roundHistory, setRoundHistory] = useState([]) // true/false per round

  const lockedRef    = useRef(false)
  const timerRef     = useRef(null)
  const feedbackRef  = useRef(null)
  const startTimeRef = useRef(Date.now())
  const scoreRef     = useRef(0) // track score in ref for saveGameScore

  const diff   = DIFFICULTIES[diffIdx]
  const shapes = useMemo(() => SHAPES.filter(s => s.level <= diff.maxLevel), [diffIdx])
  const shape  = shapes[shapeIdx] ?? shapes[0]

  // ── Timer ──────────────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => clearInterval(timerRef.current), [])

  useEffect(() => {
    if (phase !== 'playing' || feedback !== null) { stopTimer(); return }
    const tl = diff.timePerQ
    const t0 = Date.now()
    timerRef.current = setInterval(() => {
      const left = Math.max(0, tl - (Date.now() - t0) / 1000)
      setTimeLeft(left)
      if (left <= 0) {
        stopTimer()
        handlePickTimeout()
      }
    }, 100)
    return stopTimer
  }, [phase, feedback, round, diffIdx])

  useEffect(() => () => { stopTimer(); clearTimeout(feedbackRef.current) }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  function loadShape(idx) {
    const opts = buildOptions(shapes[idx])
    setShapeIdx(idx)
    setOptions(opts)
    setSelected(null)
    setFeedback(null)
    setTimeLeft(diff.timePerQ)
    startTimeRef.current = Date.now()
  }

  function startGame(dIdx) {
    stopTimer()
    clearTimeout(feedbackRef.current)
    lockedRef.current = false
    const d = DIFFICULTIES[dIdx]
    const shapesForDiff = SHAPES.filter(s => s.level <= d.maxLevel)
    const si = Math.floor(Math.random() * shapesForDiff.length)
    const opts = buildOptions(shapesForDiff[si])
    setDiffIdx(dIdx)
    setShapeIdx(si)
    setOptions(opts)
    setRound(1)
    setScore(0)
    setCorrect(0)
    setStreak(0)
    setPhase('playing')
    setTimeLeft(d.timePerQ)
    setSelected(null)
    setFeedback(null)
    setRoundHistory([])
    scoreRef.current = 0
    startTimeRef.current = Date.now()
  }

  function handleStart() {
    startGame(diffIdx)
    setScreen('playing')
  }

  function handlePickTimeout() {
    if (lockedRef.current) return
    handlePick(null)
  }

  function handlePick(opt) {
    if (lockedRef.current || phase !== 'playing') return
    lockedRef.current = true
    stopTimer()

    const isCorrect = opt?.isCorrect === true
    setSelected(opt)
    setFeedback(isCorrect ? 'right' : 'wrong')

    let addedPts = 0
    if (isCorrect) {
      SoundEngine.gameCorrect?.()
      const timePct = Math.max(0, timeLeft / diff.timePerQ)
      const streakBonus = Math.min(streak, 4)
      addedPts = Math.round((10 + timePct * 20) * (1 + streakBonus * 0.25))
      setScore(s => s + addedPts)
      setCorrect(c => c + 1)
      setStreak(s => s + 1)
    } else {
      SoundEngine.gameWrong?.()
      setStreak(0)
    }

    setRoundHistory(prev => [...prev, isCorrect])

    const delay = isCorrect ? 700 : 1400

    feedbackRef.current = setTimeout(() => {
      const isLastRound = round >= diff.rounds
      if (isLastRound) {
        SoundEngine.levelComplete?.()
        const finalScore = scoreRef.current + addedPts
        scoreRef.current = finalScore
        setPhase('done')
        if (studentId) saveGameScore(studentId, game?.id, levelData?.level, finalScore)
      } else {
        // Pick next shape, avoid repeating current
        const nextIdx = shuffleShapes(shapes, shapeIdx)
        loadShape(nextIdx)
        setRound(r => r + 1)
        lockedRef.current = false
      }
    }, delay)
  }

  // keep scoreRef in sync
  useEffect(() => { scoreRef.current = score }, [score])

  // ── Derived ────────────────────────────────────────────────────────────────

  const timerPct = (timeLeft / diff.timePerQ) * 100
  const tc = timerPct > 55 ? '#4ADE80' : timerPct > 25 ? '#F59E0B' : '#EF4444'

  function getViewState(opt) {
    if (!feedback) return opt === selected ? 'selected' : 'normal'
    if (opt?.isCorrect) return 'correct'
    if (opt === selected && !opt?.isCorrect) return 'wrong'
    return 'normal'
  }

  if (screen === 'guide') return <HowToPlayGuide game={game} onStart={handleStart} />

  return (
    <div style={{ position: 'relative' }}>
      {/* Difficulty selector */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {DIFFICULTIES.map((d, i) => (
          <button
            key={d.label}
            onClick={() => startGame(i)}
            style={{
              flex: 1, padding: '5px', borderRadius: 8, fontSize: 10, fontWeight: 700,
              border: '1px solid',
              borderColor: i === diffIdx ? '#6366F155' : '#1A2642',
              background: i === diffIdx ? '#6366F111' : 'rgba(255,255,255,0.03)',
              color: i === diffIdx ? '#818CF8' : '#475569',
              cursor: 'pointer',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <StatPill label="score" value={score} color="#FBBF24" />
        {/* Round dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {Array.from({ length: diff.rounds }, (_, i) => {
            const done = i < round - 1
            const current = i === round - 1
            const bg = current ? '#818CF8'
              : done ? (roundHistory[i] ? '#4ADE80' : '#EF4444')
              : 'var(--color-border-tertiary)'
            return (
              <div key={i} style={{
                width: current ? 10 : 8, height: current ? 10 : 8,
                borderRadius: '50%', background: bg,
                transition: 'all 0.2s',
              }} />
            )
          })}
        </div>
        <StatPill label="left" value={`${Math.ceil(timeLeft)}s`} color={tc} mono />
      </div>

      {/* Timer bar */}
      <div style={{ height: 3, borderRadius: 2, background: '#0F1629', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${timerPct}%`, background: tc,
          transition: 'width 0.1s linear, background 0.4s',
        }} />
      </div>

      {/* Streak banner */}
      <div style={{ height: 20, textAlign: 'center', marginBottom: 8 }}>
        {streak >= 2 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>
            🔥 {streak}× streak! +{Math.round((Math.min(streak, 4)) * 25)}% bonus
          </span>
        )}
      </div>

      {/* Shape name + round */}
      <div style={{
        textAlign: 'center', marginBottom: 8,
        fontSize: 10, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {shape.name} — Round {round}/{diff.rounds}
      </div>

      {/* 3D Shape */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <div style={{
          padding: '12px 20px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
        }}>
          <IsoShape cubes={shape.cubes} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        textAlign: 'center', color: '#94A3B8', fontSize: 13,
        fontWeight: 600, marginBottom: 14,
      }}>
        {shape.question}
      </div>

      {/* Choices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {options.map((opt, i) => (
          <ChoiceCard
            key={i}
            opt={opt}
            viewState={getViewState(opt)}
            onClick={() => handlePick(opt)}
          />
        ))}
      </div>

      {/* Win/done overlay */}
      {phase === 'done' && (
        <WinOverlay
          correct={correct}
          totalRounds={diff.rounds}
          score={score}
          diffIdx={diffIdx}
          onRetry={() => startGame(diffIdx)}
          onNextDiff={() => startGame(diffIdx + 1)}
          onExit={onFinish}
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
