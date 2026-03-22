import { useState, useEffect, useRef, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const DISC_COLORS = [
  '#EF4444', '#F97316', '#F59E0B',
  '#84CC16', '#06B6D4', '#6366F1', '#EC4899',
]

const DISC_OPTIONS = [3, 4, 5, 6, 7]

function minMoves(n) { return Math.pow(2, n) - 1 }

function timeLimitForDiscs(n) {
  if (n <= 3) return 120
  if (n <= 4) return 180
  return 240
}

function makeState(n) {
  return [
    Array.from({ length: n }, (_, i) => n - i),
    [],
    [],
  ]
}

// ── Optimal move checker ───────────────────────────────────────────────────────
// Returns {from, to} of the next optimal move from the current state

function getOptimalMove(pegs) {
  const tops = pegs.map(p => (p.length ? p[p.length - 1] : null))
  for (let from = 0; from < 3; from++) {
    if (tops[from] === null) continue
    for (let to = 0; to < 3; to++) {
      if (from === to) continue
      if (tops[to] === null || tops[from] < tops[to]) return { from, to }
    }
  }
  return null
}

function isOptimalMove(pegs, from, to) {
  const opt = getOptimalMove(pegs)
  return opt !== null && opt.from === from && opt.to === to
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

const PEG_LABELS = ['A', 'B', 'C']

function pegX(i, W) { return W * (0.18 + i * 0.32) }
function pegBaseY(H) { return H * 0.88 }
function pegTopY(H)  { return H * (0.88 - 0.72) }
function discWidth(size, n, W) {
  const mx = W * 0.28, mn = W * 0.07
  return mn + (size / n) * (mx - mn)
}
function discY(pegArr, di, H) {
  return pegBaseY(H) - 20 - di * 22
}

function drawDisc(ctx, size, x, y, n, W, isHeld = false) {
  const w = discWidth(size, n, W)
  const color = DISC_COLORS[(size - 1) % DISC_COLORS.length]

  ctx.shadowColor = isHeld ? color : 'rgba(0,0,0,0.4)'
  ctx.shadowBlur  = isHeld ? 18 : 6
  ctx.shadowOffsetY = isHeld ? 0 : 3

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 9, w, 18, 5)
  ctx.fill()

  // Highlight strip
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.roundRect(x - w / 2 + 2, y - 7, w - 4, 6, 3)
  ctx.fill()

  if (isHeld) {
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y - 9, w, 18, 5)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

function drawCanvas(canvas, pegs, selected, anim, floats, n) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height

  ctx.clearRect(0, 0, W, H)

  // Base
  const grad = ctx.createLinearGradient(0, pegBaseY(H) + 2, 0, pegBaseY(H) + 12)
  grad.addColorStop(0, '#334155')
  grad.addColorStop(1, '#1E293B')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(W * 0.04, pegBaseY(H) + 2, W * 0.92, 10, 5)
  ctx.fill()

  // Rods + labels
  for (let i = 0; i < 3; i++) {
    const x = pegX(i, W)
    const isSel = selected === i
    const g = ctx.createLinearGradient(x - 3, pegTopY(H), x + 3, pegBaseY(H))
    g.addColorStop(0, isSel ? '#818CF8' : '#475569')
    g.addColorStop(1, isSel ? '#6366F1' : '#1E293B')

    if (isSel) {
      ctx.shadowColor = '#6366F1'
      ctx.shadowBlur = 14
    }
    ctx.fillStyle = isSel ? '#6366F1' : g
    ctx.beginPath()
    ctx.roundRect(x - 3, pegTopY(H), 6, pegBaseY(H) - pegTopY(H), 3)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = isSel ? '#818CF8' : '#475569'
    ctx.font = '500 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(PEG_LABELS[i], x, pegBaseY(H) + 26)
  }

  // Static discs (skip animated disc)
  for (let pi = 0; pi < 3; pi++) {
    pegs[pi].forEach((size, di) => {
      if (anim && anim.disc === size && anim.fromPeg === pi && di === pegs[pi].length - 1) return
      const isHeld = selected === pi && di === pegs[pi].length - 1
      drawDisc(ctx, size, pegX(pi, W), discY(pegs[pi], di, H), n, W, isHeld)
    })
  }

  // Animated disc (arc trajectory)
  if (anim) {
    const ease = anim.t < 0.5
      ? 2 * anim.t * anim.t
      : 1 - Math.pow(-2 * anim.t + 2, 2) / 2
    const x = anim.fromX + (anim.toX - anim.fromX) * ease
    const arcH = 60 + Math.abs(anim.toX - anim.fromX) * 0.15
    const y = anim.fromY + (anim.toY - anim.fromY) * ease - Math.sin(Math.PI * anim.t) * arcH
    drawDisc(ctx, anim.disc, x, y, n, W, true)
  }

  // Floating labels
  const now = Date.now()
  floats.forEach(f => {
    const age = (now - f.startT) / 800
    if (age > 1) return
    ctx.globalAlpha = 1 - age
    ctx.fillStyle = f.color
    ctx.font = '700 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(f.text, f.x, f.y - age * 30)
    ctx.globalAlpha = 1
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ParBadge({ moves, optimal }) {
  if (moves === 0) {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#475569', background: '#47556918', border: '1px solid #47556944' }}>
        Ready
      </span>
    )
  }
  const diff = moves - optimal
  const color = diff === 0 ? '#4ADE80' : diff <= 2 ? '#F59E0B' : '#EF4444'
  const label = diff === 0 ? '🏆 Perfect pace!' : `+${diff} over par`
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color, background: color + '18', border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

function WinOverlay({ moves, optimal, score, perfect, discs, onRetry, onNext, onExit, game }) {
  return (
    <div style={overlayWrap}>
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{perfect ? '🏆' : '🗼'}</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
          {perfect ? 'Perfect Solve!' : 'Tower Complete!'}
        </div>
        <div style={{ color: '#4ADE80', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
          {moves} moves · par {optimal}
          {perfect ? ' · Zero wasted moves!' : ''}<br />
          Score: <strong style={{ color: '#FBBF24' }}>{score}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRetry} style={overlayBtn('secondary')}>Retry</button>
          {discs < 7 && (
            <button onClick={onNext} style={overlayBtn('primary')}>
              Try {discs + 1} discs →
            </button>
          )}
          <button onClick={onExit} style={overlayBtn('muted')}>Exit</button>
        </div>
      </div>
    </div>
  )
}

function LostOverlay({ moves, optimal, onRetry, game }) {
  return (
    <div style={overlayWrap}>
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⏰</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Time's Up!</div>
        <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>
          {moves} moves used · Par is {optimal}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onRetry} style={overlayBtn('primary')}>Try Again</button>
        </div>
      </div>
    </div>
  )
}

const overlayWrap = {
  position: 'absolute', inset: 0, zIndex: 40,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(3,6,14,0.97)', backdropFilter: 'blur(10px)', borderRadius: 14,
}

function overlayBtn(variant) {
  const styles = {
    primary:   { background: '#6366F1', color: 'white' },
    secondary: { background: '#1A2642', color: '#94A3B8' },
    muted:     { background: '#0F172A', color: '#475569' },
  }
  return {
    padding: '10px 20px', borderRadius: 10, fontWeight: 700,
    fontSize: 13, border: 'none', cursor: 'pointer',
    ...(styles[variant] || styles.primary),
  }
}

function HowToPlayGuide({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🗼</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Tower of Mind</div>
      </div>

      {[
        ['📦', 'Move discs', 'Tap a peg to pick up its top disc, then tap another peg to place it.'],
        ['📏', 'One rule', 'You can never place a larger disc on top of a smaller disc.'],
        ['🎯', 'Goal', 'Move all discs from peg A to peg C using B as a helper.'],
        ['🔥', 'Play optimally', `Minimum moves = 2ⁿ−1. Stay on par for the best score.`],
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
        background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
      }}>
        <div style={{ color: '#7DD3FC', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Always move the smallest disc first in each cycle<br />
          • For odd-disc towers, move smallest to the target peg<br />
          • For even-disc towers, move smallest to the helper peg<br />
          • Watch the par tracker — 🔥 labels mean you're on the optimal path!
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer',
          // FIX: was `game.color` literal — now correctly interpolated
          background: `linear-gradient(135deg, ${game?.color ?? '#0EA5E9'}, #0369A1)`,
        }}
      >
        Start Game →
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TowerOfMind({ game, levelData, studentId, onFinish }) {
  const initialDiscs = Math.min(Math.max(levelData?.discs ?? 3, 3), 7)

  const [screen, setScreen]     = useState('guide')
  const [discs, setDiscs]       = useState(initialDiscs)
  const [pegs, setPegs]         = useState(() => makeState(initialDiscs))
  const [selected, setSelected] = useState(null)
  const [moves, setMoves]       = useState(0)
  const [phase, setPhase]       = useState('playing')
  const [timeLeft, setTimeLeft] = useState(() => timeLimitForDiscs(initialDiscs))
  const [score, setScore]       = useState(0)
  const [perfect, setPerfect]   = useState(false)
  const [history, setHistory]   = useState([])
  const [optimalStreak, setOptimalStreak] = useState(0)
  const [anim, setAnim]         = useState(null)   // {disc,fromPeg,toPeg,fromX,fromY,toX,toY,t,dur,startT,wasOptimal}
  const [floats, setFloats]     = useState([])     // [{text,x,y,color,startT}]
  const [shaking, setShaking]   = useState(false)

  const canvasRef    = useRef(null)
  const timerRef     = useRef(null)
  const rafRef       = useRef(null)
  const pegsRef      = useRef(pegs)
  const selectedRef  = useRef(selected)
  const animRef      = useRef(anim)
  const floatsRef    = useRef(floats)
  const movesRef     = useRef(moves)
  const phaseRef     = useRef(phase)
  const discsRef     = useRef(discs)

  // Keep refs in sync
  pegsRef.current    = pegs
  selectedRef.current = selected
  animRef.current    = anim
  floatsRef.current  = floats
  movesRef.current   = moves
  phaseRef.current   = phase
  discsRef.current   = discs

  // ── Canvas sizing ──────────────────────────────────────────────────────────

  const sizeCanvas = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const w = cv.offsetWidth || 360
    cv.width = w
    cv.height = 200
  }, [])

  // ── Draw loop ──────────────────────────────────────────────────────────────

  const drawLoop = useCallback((now) => {
    const cv = canvasRef.current
    if (!cv) return

    // Advance animation
    if (animRef.current) {
      const a = animRef.current
      const t = Math.min(1, (now - a.startT) / a.dur)
      if (t >= 1) {
        // Commit move
        const newPegs = pegsRef.current.map(p => [...p])
        newPegs[a.toPeg] = [...newPegs[a.toPeg], a.disc]
        pegsRef.current = newPegs
        animRef.current = null
        setAnim(null)
        setPegs(newPegs)
        setMoves(m => {
          const nm = m + 1
          movesRef.current = nm
          return nm
        })

        // Floating label
        const toX = pegX(a.toPeg, cv.width)
        const toY = discY(newPegs[a.toPeg], newPegs[a.toPeg].length - 1, cv.height)
        const newFloat = a.wasOptimal && optimalStreak >= 2
          ? { text: '🔥 Optimal!', x: toX, y: toY - 10, color: '#F59E0B', startT: Date.now() }
          : !a.wasOptimal
            ? { text: '↗ Off path', x: toX, y: toY - 10, color: '#EF4444', startT: Date.now() }
            : null
        if (newFloat) {
          floatsRef.current = [...floatsRef.current, newFloat]
          setFloats(prev => [...prev, newFloat])
        }

        // Win check
        if (newPegs[2].length === discsRef.current) {
          clearInterval(timerRef.current)
          const opt = minMoves(discsRef.current)
          const finalMoves = movesRef.current
          const isPerfect = finalMoves === opt
          const tl = timeLimitForDiscs(discsRef.current)
          const timeBonus = Math.round((phaseRef.current === 'playing' ? 1 : 0) * 400)
          const effBonus = Math.round((opt / finalMoves) * 600)
          const fs = Math.min(1000, Math.round(timeBonus + effBonus + 100))
          setScore(fs)
          setPerfect(isPerfect)
          setPhase('won')
          phaseRef.current = 'won'
          SoundEngine.levelComplete?.()
          if (studentId) saveGameScore(studentId, game?.id, levelData?.level, fs)
        }
      } else {
        setAnim({ ...a, t })
        animRef.current = { ...a, t }
      }
    }

    // Draw
    drawCanvas(cv, pegsRef.current, selectedRef.current, animRef.current, floatsRef.current, discsRef.current)

    // Purge old floats
    const now2 = Date.now()
    const fresh = floatsRef.current.filter(f => now2 - f.startT < 900)
    if (fresh.length !== floatsRef.current.length) {
      floatsRef.current = fresh
      setFloats(fresh)
    }

    rafRef.current = requestAnimationFrame(drawLoop)
  }, [studentId, game, levelData, optimalStreak])

  useEffect(() => {
    sizeCanvas()
    rafRef.current = requestAnimationFrame(drawLoop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawLoop, sizeCanvas])

  // ── Timer ──────────────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => clearInterval(timerRef.current), [])

  useEffect(() => {
    if (phase !== 'playing') { stopTimer(); return }
    const tl = timeLimitForDiscs(discs)
    const t0 = Date.now()
    timerRef.current = setInterval(() => {
      const left = Math.max(0, tl - (Date.now() - t0) / 1000)
      setTimeLeft(left)
      if (left <= 0) {
        stopTimer()
        setPhase('lost')
        phaseRef.current = 'lost'
      }
    }, 200)
    return stopTimer
  }, [phase, discs, stopTimer])

  useEffect(() => () => { stopTimer(); cancelAnimationFrame(rafRef.current) }, [stopTimer])

  // ── Load puzzle ────────────────────────────────────────────────────────────

  function loadPuzzle(n) {
    stopTimer()
    cancelAnimationFrame(rafRef.current)
    const newPegs = makeState(n)
    setDiscs(n)
    setPegs(newPegs)
    pegsRef.current = newPegs
    setSelected(null)
    selectedRef.current = null
    setMoves(0)
    movesRef.current = 0
    setPhase('playing')
    phaseRef.current = 'playing'
    setTimeLeft(timeLimitForDiscs(n))
    setScore(0)
    setPerfect(false)
    setHistory([])
    setOptimalStreak(0)
    setAnim(null)
    animRef.current = null
    setFloats([])
    floatsRef.current = []
    discsRef.current = n
    rafRef.current = requestAnimationFrame(drawLoop)
  }

  function handleStart() {
    loadPuzzle(discs)
    setScreen('playing')
  }

  // ── Peg interaction ────────────────────────────────────────────────────────

  function handleCanvasClick(e) {
    if (phase !== 'playing' || anim) return
    const cv = canvasRef.current
    if (!cv) return
    const rect = cv.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * cv.width

    for (let i = 0; i < 3; i++) {
      if (Math.abs(mx - pegX(i, cv.width)) < cv.width * 0.17) {
        handleSelectPeg(i)
        break
      }
    }
  }

  function handleSelectPeg(pi) {
    if (phase !== 'playing' || anim) return

    if (selected === null) {
      if (pegs[pi].length === 0) return
      SoundEngine.tap?.()
      setSelected(pi)
      selectedRef.current = pi
      return
    }

    if (selected === pi) {
      setSelected(null)
      selectedRef.current = null
      return
    }

    const from = selected
    const topDisc = pegs[from][pegs[from].length - 1]
    const destTop = pegs[pi].length ? pegs[pi][pegs[pi].length - 1] : Infinity

    if (topDisc > destTop) {
      SoundEngine.gameWrong?.()
      setShaking(true)
      setTimeout(() => setShaking(false), 350)
      setSelected(null)
      selectedRef.current = null
      return
    }

    // Valid move — start animation
    const wasOptimal = isOptimalMove(pegs, from, pi)
    if (wasOptimal) {
      setOptimalStreak(s => s + 1)
      SoundEngine.tileMove?.()
    } else {
      setOptimalStreak(0)
      SoundEngine.tap?.()
    }

    const cv = canvasRef.current
    const W = cv?.width || 360, H = cv?.height || 200
    const fromX = pegX(from, W)
    const toX   = pegX(pi, W)
    const fromY = discY(pegs[from], pegs[from].length - 1, H)
    const toY   = discY(pegs[pi], pegs[pi].length, H)
    const dur   = 280 + Math.abs(toX - fromX) * 0.4

    setHistory(prev => [...prev, pegs.map(p => [...p])])
    // Temporarily remove disc from source peg visually
    const tempPegs = pegs.map(p => [...p])
    tempPegs[from] = tempPegs[from].slice(0, -1)
    setPegs(tempPegs)
    pegsRef.current = tempPegs

    const newAnim = { disc: topDisc, fromPeg: from, toPeg: pi, fromX, fromY, toX, toY, t: 0, dur, startT: performance.now(), wasOptimal }
    setAnim(newAnim)
    animRef.current = newAnim
    setSelected(null)
    selectedRef.current = null
  }

  function handleUndo() {
    if (history.length === 0 || phase !== 'playing' || anim) return
    SoundEngine.tap?.()
    const prev = history[history.length - 1]
    setPegs(prev)
    pegsRef.current = prev
    setHistory(h => h.slice(0, -1))
    setMoves(m => Math.max(0, m - 1))
    movesRef.current = Math.max(0, movesRef.current - 1)
    setSelected(null)
    selectedRef.current = null
    setOptimalStreak(0)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const optimal   = minMoves(discs)
  const timeLimit = timeLimitForDiscs(discs)
  const timerPct  = (timeLeft / timeLimit) * 100
  const tc        = timerPct > 50 ? '#4ADE80' : timerPct > 20 ? '#F59E0B' : '#EF4444'
  const diff      = moves - optimal

  const instruction = selected !== null
    ? `Disc ${pegs[selected]?.[pegs[selected].length - 1]} lifted from peg ${PEG_LABELS[selected]} — tap a peg to place it`
    : 'Tap a peg to pick up its top disc · Move all discs to peg C'

  if (screen === 'guide') return <HowToPlayGuide game={game} onStart={handleStart} />

  return (
    <div style={{ position: 'relative' }}>
      <style>{`@keyframes tmShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`}</style>

      {/* Disc selector */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12 }}>
        {DISC_OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => loadPuzzle(n)}
            style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              border: '1px solid',
              borderColor: n === discs ? '#6366F155' : '#1A2642',
              background: n === discs ? '#6366F111' : 'rgba(255,255,255,0.03)',
              color: n === discs ? '#818CF8' : '#475569',
              cursor: 'pointer',
            }}
          >
            {n} discs
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <StatPill label="score"  value={phase === 'won' ? score : '–'} color="#FBBF24" />
        <StatPill label="moves"  value={moves} />
        <StatPill label="left"   value={`${Math.ceil(timeLeft)}s`} color={tc} mono />
      </div>

      {/* Timer bar */}
      <div style={{ height: 3, borderRadius: 2, background: '#0F1629', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${timerPct}%`, background: tc, transition: 'width 0.2s linear, background 0.4s' }} />
      </div>

      {/* Par row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
        marginBottom: 10, fontSize: 12,
      }}>
        <span style={{ color: '#475569' }}>
          Moves: <strong style={{ color: '#CBD5E1' }}>{moves}</strong>
          {' · '}Par: <strong style={{ color: '#CBD5E1' }}>{optimal}</strong>
        </span>
        <ParBadge moves={moves} optimal={optimal} />
      </div>

      {/* Canvas */}
      <div
        style={{
          borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
          overflow: 'hidden', marginBottom: 10, cursor: 'pointer',
          animation: shaking ? 'tmShake 0.3s ease' : 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 200, display: 'block' }}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Instruction */}
      <div style={{
        textAlign: 'center', fontSize: 11, height: 20, marginBottom: 8,
        color: selected !== null ? '#818CF8' : '#334155', fontWeight: 500,
      }}>
        {instruction}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || !!anim}
          style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            color: history.length > 0 && !anim ? '#94A3B8' : '#334155',
            background: 'rgba(255,255,255,0.03)', border: '1px solid #1A2642',
            cursor: history.length > 0 && !anim ? 'pointer' : 'default',
            opacity: history.length > 0 && !anim ? 1 : 0.4,
          }}
        >
          ↩ Undo ({history.length})
        </button>
        <button
          onClick={() => loadPuzzle(discs)}
          style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            color: '#64748B', background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1A2642', cursor: 'pointer',
          }}
        >
          🔄 Reset
        </button>
      </div>

      {/* Overlays */}
      {phase === 'won' && (
        <WinOverlay
          moves={moves} optimal={optimal} score={score} perfect={perfect} discs={discs}
          onRetry={() => loadPuzzle(discs)}
          onNext={() => loadPuzzle(discs + 1)}
          onExit={onFinish}
          game={game}
        />
      )}
      {phase === 'lost' && (
        <LostOverlay
          moves={moves} optimal={optimal}
          onRetry={() => loadPuzzle(discs)}
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
