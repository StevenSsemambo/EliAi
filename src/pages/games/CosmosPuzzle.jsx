import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isSolvable(tiles, n) {
  const blank = n * n - 1
  const flat = tiles.filter(v => v !== blank)
  let inv = 0
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (flat[i] > flat[j]) inv++
  const blankRow = Math.floor(tiles.indexOf(blank) / n)
  if (n % 2 === 1) return inv % 2 === 0
  return (inv + blankRow) % 2 === 1
}

function makePuzzle(n) {
  const total = n * n
  let tiles
  do {
    tiles = shuffle(Array.from({ length: total }, (_, i) => i))
  } while (!isSolvable(tiles, n) || tiles.every((v, i) => v === i))
  return tiles
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEMES = [
  { icon: '🌌', label: 'Milky Way', accent: '#7C3AED' },
  { icon: '🪐', label: 'Saturn',    accent: '#F59E0B' },
  { icon: '☀️', label: 'Solar',     accent: '#EF4444' },
  { icon: '🚀', label: 'Nebula',    accent: '#06B6D4' },
  { icon: '🌊', label: 'Aurora',    accent: '#059669' },
]

const DIFFICULTIES = [
  { label: '3×3', n: 3, maxScore: 3000 },
  { label: '4×4', n: 4, maxScore: 5000 },
  { label: '5×5', n: 5, maxScore: 8000 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function WinOverlay({ theme, moves, elapsed, score, diffIdx, onRetry, onNext, onExit, game }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,8,18,0.95)', backdropFilter: 'blur(8px)', borderRadius: 12,
    }}>
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>{theme.icon}</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
          Star Map Restored!
        </div>
        <div style={{ color: '#4ADE80', fontSize: 13, marginBottom: 20 }}>
          {moves} moves · {formatTime(elapsed)} · {score} pts
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRetry} style={btnStyle(game.color)}>Play Again</button>
          {diffIdx < DIFFICULTIES.length - 1 && (
            <button onClick={onNext} style={btnStyle('#059669')}>Next Difficulty →</button>
          )}
          <button onClick={onExit} style={btnStyle('#1A2642', '#94A3B8')}>Exit</button>
        </div>
      </div>
    </div>
  )
}

function btnStyle(bg, color = 'white') {
  return {
    padding: '10px 18px', borderRadius: 12, fontWeight: 800,
    color, background: bg, border: 'none', cursor: 'pointer', fontSize: 13,
  }
}

function HowToPlayGuide({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🧩</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Cosmos Puzzle</div>
      </div>

      {[
        ['🔲', 'Slide tiles', 'Tap any tile next to the empty space to slide it into that space.'],
        ['🎯', 'Reach the goal', 'Arrange all tiles into the correct order, blank at bottom-right.'],
        ['↩',  'Undo moves',   'Made a mistake? Use the Undo button to step back one move at a time.'],
        ['⚡', 'Fewer moves = more points', 'Efficient solutions earn bigger score bonuses.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}

      <div style={{
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
      }}>
        <div style={{ color: '#C4B5FD', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Work on one row at a time, top to bottom<br />
          • Fix the left column last<br />
          • The empty corner lets you rotate tiles without disturbing others
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          fontWeight: 900, fontSize: 16, color: 'white', border: 'none',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${game.color ?? '#7C3AED'}, #7C3AED)`,
        }}
      >
        Start Game →
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CosmosPuzzle({ game, levelData, studentId, onFinish }) {
  // Determine starting grid size from levelData, clamped to valid difficulties
  const initialDiffIdx = (() => {
    const n = levelData?.gridSize ?? 3
    const idx = DIFFICULTIES.findIndex(d => d.n === n)
    return idx >= 0 ? idx : 0
  })()

  const [screen, setScreen]     = useState('guide')   // 'guide' | 'playing'
  const [diffIdx, setDiffIdx]   = useState(initialDiffIdx)
  const [theme]                 = useState(() => THEMES[Math.floor(Math.random() * THEMES.length)])
  const [tiles, setTiles]       = useState([])
  const [history, setHistory]   = useState([])         // undo stack
  const [moves, setMoves]       = useState(0)
  const [phase, setPhase]       = useState('playing')  // 'playing' | 'won'
  const [score, setScore]       = useState(0)
  const [elapsed, setElapsed]   = useState(0)
  const startTimeRef            = useRef(Date.now())
  const timerRef                = useRef(null)

  const { n, maxScore } = DIFFICULTIES[diffIdx]
  const total = n * n

  // ── Helpers ────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current)
  }, [])

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => () => clearInterval(timerRef.current), [])

  // ── Actions ────────────────────────────────────────────────────────────────

  function initGame(dIdx = diffIdx) {
    const d = DIFFICULTIES[dIdx]
    setDiffIdx(dIdx)
    setTiles(makePuzzle(d.n))
    setHistory([])
    setMoves(0)
    setPhase('playing')
    setScore(0)
    setElapsed(0)
    startTimeRef.current = Date.now()
    startTimer()
  }

  function handleStart() {
    initGame(diffIdx)
    setScreen('playing')
  }

  function handleDiffChange(dIdx) {
    initGame(dIdx)
  }

  function handleRestart() {
    initGame(diffIdx)
  }

  function handleNextDiff() {
    const next = Math.min(diffIdx + 1, DIFFICULTIES.length - 1)
    initGame(next)
  }

  const blankIdx = tiles.indexOf(total - 1)

  function canMove(idx) {
    const r = Math.floor(idx / n), c = idx % n
    const br = Math.floor(blankIdx / n), bc = blankIdx % n
    return (Math.abs(r - br) === 1 && c === bc) || (Math.abs(c - bc) === 1 && r === br)
  }

  function handleMove(idx) {
    if (!canMove(idx) || phase !== 'playing') return

    // Save snapshot for undo before mutating
    setHistory(prev => [...prev, tiles])

    const nt = [...tiles]
    ;[nt[idx], nt[blankIdx]] = [nt[blankIdx], nt[idx]]
    setTiles(nt)

    const nm = moves + 1
    setMoves(nm)

    if (nt.every((v, i) => v === i)) {
      stopTimer()
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const fs = Math.max(50, Math.round(maxScore - nm * 15 - secs * 5))
      setScore(fs)
      setPhase('won')
      // Report score to parent if available
      // saveGameScore(studentId, game?.id, levelData?.level, fs)  ← wire up when available
    }
  }

  function handleUndo() {
    if (history.length === 0 || phase !== 'playing') return
    setTiles(history[history.length - 1])
    setHistory(prev => prev.slice(0, -1))
    setMoves(m => Math.max(0, m - 1))
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const solvedCount = tiles.filter((v, i) => v === i).length
  const progressPct = total > 1 ? Math.round((solvedCount / (total - 1)) * 100) : 0
  const tileSize    = n >= 5 ? 58 : n === 4 ? 72 : 90
  const tileFontSz  = n >= 5 ? '1rem' : n === 4 ? '1.2rem' : '1.5rem'
  const gridGap     = n >= 5 ? 4 : 6

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'guide') {
    return <HowToPlayGuide game={game} onStart={handleStart} />
  }

  // ── Playing screen ─────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative' }}>

      {/* Difficulty selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {DIFFICULTIES.map((d, i) => (
          <button
            key={d.label}
            onClick={() => handleDiffChange(i)}
            style={{
              flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: '1px solid',
              borderColor: i === diffIdx ? `${theme.accent}88` : '#1A2642',
              background: i === diffIdx ? `${theme.accent}22` : 'rgba(255,255,255,0.03)',
              color: i === diffIdx ? theme.accent : '#64748B',
              cursor: 'pointer',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Stats header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <StatPill label="score"  value={phase === 'won' ? score : '–'} color="#FBBF24" />
        <StatPill label="moves"  value={moves} />
        <StatPill label="time"   value={formatTime(elapsed)} />
        <StatPill label="done"   value={`${progressPct}%`} color="#4ADE80" />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: '#1A2642', marginBottom: 12, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: '#4ADE80',
          width: `${progressPct}%`,
          transition: 'width 0.3s',
        }} />
      </div>

      {/* Theme hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 24 }}>{theme.icon}</span>
        <div>
          <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>
            Restore the {theme.label}
          </div>
          <div style={{ color: '#475569', fontSize: 10 }}>
            Order 1–{total - 1}, blank at bottom-right
          </div>
        </div>
      </div>

      {/* Puzzle grid */}
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${n}, ${tileSize}px)`,
        gap: gridGap,
        justifyContent: 'center',
        marginBottom: 12,
      }}>
        {tiles.map((val, idx) => {
          const isBlank  = val === total - 1
          const inPlace  = val === idx
          const movable  = canMove(idx) && !isBlank

          return (
            <button
              key={idx}
              onClick={() => handleMove(idx)}
              disabled={isBlank}
              style={{
                width: tileSize, height: tileSize,
                aspectRatio: '1',
                borderRadius: n >= 5 ? 8 : 12,
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: tileFontSz,
                transition: 'all 0.1s',
                background: isBlank
                  ? 'transparent'
                  : inPlace
                    ? 'rgba(74,222,128,0.18)'
                    : 'rgba(255,255,255,0.05)',
                outline: isBlank
                  ? '2px dashed #1A2642'
                  : inPlace
                    ? '1px solid rgba(74,222,128,0.5)'
                    : '1px solid #1E2D4A',
                color: inPlace ? '#4ADE80' : '#CBD5E1',
                boxShadow: movable ? `0 0 14px ${theme.accent}66` : 'none',
                cursor: movable ? 'pointer' : isBlank ? 'default' : 'not-allowed',
                transform: movable ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {isBlank ? '' : val + 1}
            </button>
          )
        })}

        {/* Win overlay, positioned over the grid */}
        {phase === 'won' && (
          <WinOverlay
            theme={theme}
            moves={moves}
            elapsed={elapsed}
            score={score}
            diffIdx={diffIdx}
            onRetry={handleRestart}
            onNext={handleNextDiff}
            onExit={onFinish}
            game={game}
          />
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || phase !== 'playing'}
          style={{
            flex: 1, padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            color: history.length > 0 && phase === 'playing' ? '#94A3B8' : '#334155',
            background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
            cursor: history.length > 0 && phase === 'playing' ? 'pointer' : 'default',
          }}
        >
          ↩ Undo ({history.length})
        </button>
        <button
          onClick={handleRestart}
          style={{
            flex: 1, padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            color: '#64748B', background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1A2642', cursor: 'pointer',
          }}
        >
          🔀 New Puzzle
        </button>
      </div>
    </div>
  )
}

// ─── Helper: stat display pill ────────────────────────────────────────────────

function StatPill({ label, value, color = '#CBD5E1' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ color, fontWeight: 800, fontSize: 15 }}>{value}</span>
      <span style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  )
}
