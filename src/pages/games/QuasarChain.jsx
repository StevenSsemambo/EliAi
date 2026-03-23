import { useState, useRef, useEffect, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ═══════════════════════════════════════════════════════
// LEVEL DATA — 8 river crossing puzzles
// ═══════════════════════════════════════════════════════
const RIVER_LEVELS = [
  {
    id: 1, chapter: 'Beginner', name: 'The Classic',
    rule: 'The Fox eats the Chicken. The Chicken eats the Grain. Boat holds 1 passenger. The Farmer must always row.',
    cap: 1, min: 7,
    chars: [
      { id: 'farmer',  em: '👨‍🌾', nm: 'Farmer',  row: true  },
      { id: 'fox',     em: '🦊',   nm: 'Fox',     row: false },
      { id: 'chicken', em: '🐔',   nm: 'Chicken', row: false },
      { id: 'grain',   em: '🌾',   nm: 'Grain',   row: false },
    ],
    bad: [['fox', 'chicken'], ['chicken', 'grain']],
    hints: ['Take the Chicken across first.', 'Go back alone, then take Fox across.', 'Bring Chicken back, then take Grain across.'],
  },
  {
    id: 2, chapter: 'Beginner', name: 'Uganda Market',
    rule: 'A trader carries a Goat, Matooke and a Rat. Goat and Rat both eat the Matooke. Boat holds 1 passenger.',
    cap: 1, min: 7,
    chars: [
      { id: 'trader',  em: '🧑', nm: 'Trader',  row: true  },
      { id: 'goat',    em: '🐐', nm: 'Goat',    row: false },
      { id: 'matooke', em: '🍌', nm: 'Matooke', row: false },
      { id: 'rat',     em: '🐀', nm: 'Rat',     row: false },
    ],
    bad: [['goat', 'matooke'], ['rat', 'matooke']],
    hints: ["Take the Matooke across first — it's the one everyone wants to eat.", 'Go back alone, then take the Goat across.', 'Return alone, then take the Rat across.'],
  },
  {
    id: 3, chapter: 'Medium', name: 'The Siblings',
    rule: "A Brother and Sister each have a younger sibling. A child cannot be left alone with the other family's adult. Boat holds 2, only adults row.",
    cap: 2, min: 9,
    chars: [
      { id: 'bro',  em: '🧔', nm: 'Bro',  row: true  },
      { id: 'sis',  em: '👩', nm: 'Sis',  row: true  },
      { id: 'boy',  em: '👦', nm: 'Boy',  row: false },
      { id: 'girl', em: '👧', nm: 'Girl', row: false },
    ],
    bad: [['bro', 'girl'], ['sis', 'boy']],
    hints: ['Both adults cross first — no children are left unsupervised.', 'Sister goes back and brings Girl across.', 'Sister goes back, both adults cross together again.'],
  },
  {
    id: 4, chapter: 'Medium', name: 'Missionaries & Cannibals',
    rule: '3 Missionaries 😇 and 3 Cannibals 😈. If cannibals ever outnumber missionaries on either bank, they attack. Boat holds 2.',
    cap: 2, min: 11, special: 'missionaries',
    chars: [
      { id: 'm1', em: '😇', nm: 'M-1', row: true }, { id: 'm2', em: '😇', nm: 'M-2', row: true }, { id: 'm3', em: '😇', nm: 'M-3', row: true },
      { id: 'c1', em: '😈', nm: 'C-1', row: true }, { id: 'c2', em: '😈', nm: 'C-2', row: true }, { id: 'c3', em: '😈', nm: 'C-3', row: true },
    ],
    bad: [],
    hints: ['Send 2 cannibals first, one comes back.', 'Send 1 more cannibal, then 1 comes back.', 'Now send 2 missionaries, 1 missionary + 1 cannibal come back.'],
  },
  {
    id: 5, chapter: 'Hard', name: 'Jealous Couples',
    rule: '3 couples. No wife can be with another husband unless her own husband is present too. Boat holds 2, anyone rows.',
    cap: 2, min: 17, special: 'jealous',
    chars: [
      { id: 'h1', em: '🧔',    nm: 'H-1', row: true }, { id: 'w1', em: '👱‍♀️', nm: 'W-1', row: true },
      { id: 'h2', em: '👨‍🦱',  nm: 'H-2', row: true }, { id: 'w2', em: '👩‍🦰',  nm: 'W-2', row: true },
      { id: 'h3', em: '🧑‍🦲',  nm: 'H-3', row: true }, { id: 'w3', em: '👩‍🦳',  nm: 'W-3', row: true },
    ],
    bad: [],
    hints: ['Start by sending all 3 wives together — or 2 wives across, 1 comes back.', 'Husbands cannot mix with the wrong wives on either bank.', 'Think of moving wives first, then husbands joining them.'],
  },
  {
    id: 6, chapter: 'Hard', name: 'The Torch Bridge',
    rule: '4 people cross at night with one torch. Crossing speed = slowest person. Get everyone across in ≤17 min. 🕯️1m · 🏃2m · 🚶5m · 🐌10m',
    cap: 2, min: 17, special: 'torch',
    chars: [
      { id: 'p1',  em: '🕯️', nm: '1min',  row: true, speed: 1  },
      { id: 'p2',  em: '🏃',  nm: '2min',  row: true, speed: 2  },
      { id: 'p5',  em: '🚶',  nm: '5min',  row: true, speed: 5  },
      { id: 'p10', em: '🐌',  nm: '10min', row: true, speed: 10 },
    ],
    bad: [],
    hints: ['The 1-min person should escort everyone and bring the torch back.', 'Send 1+2 first, 1 back, send 5+10, 2 back, then 1+2 again = 17 mins.', 'Key insight: always pair the fastest with the slowest.'],
  },
  {
    id: 7, chapter: 'Expert', name: 'Wolf Pack',
    rule: 'Ranger + 5 animals: 🐺Wolf, 🦌Deer, 🐇Rabbit, 🌿Grass, 🐛Caterpillar. Chain of who eats whom. Boat holds 1 passenger. Ranger must row.',
    cap: 1, min: 11,
    chars: [
      { id: 'ranger',      em: '🧑‍🌾', nm: 'Ranger',      row: true  },
      { id: 'wolf',        em: '🐺',   nm: 'Wolf',        row: false },
      { id: 'deer',        em: '🦌',   nm: 'Deer',        row: false },
      { id: 'rabbit',      em: '🐇',   nm: 'Rabbit',      row: false },
      { id: 'grass',       em: '🌿',   nm: 'Grass',       row: false },
      { id: 'caterpillar', em: '🐛',   nm: 'Caterpillar', row: false },
    ],
    bad: [['wolf', 'deer'], ['deer', 'rabbit'], ['rabbit', 'grass'], ['grass', 'caterpillar']],
    hints: ['Map out the conflict chain: Wolf→Deer→Rabbit→Grass→Caterpillar.', 'Start by moving one end of the chain (Wolf or Caterpillar).', "You'll need to bring characters back multiple times."],
  },
  {
    id: 8, chapter: 'Expert', name: 'Night Crossing',
    rule: '5 people must cross. Boat holds 2, but the Captain must row every trip. Anyone else can return alone.',
    cap: 2, min: 9, special: 'captain',
    chars: [
      { id: 'captain', em: '⚓', nm: 'Captain', row: true, captain: true },
      { id: 'n1', em: '🧑', nm: 'P-1', row: false },
      { id: 'n2', em: '👩', nm: 'P-2', row: false },
      { id: 'n3', em: '🧔', nm: 'P-3', row: false },
      { id: 'n4', em: '👱', nm: 'P-4', row: false },
    ],
    bad: [],
    hints: ['The Captain must be on every crossing — this is a shuttling puzzle.', 'Captain takes P-1 across, Captain returns alone.', 'Repeat until all are across — no one else can row back.'],
  },
]

// ═══════════════════════════════════════════════════════
// SHARED OVERLAY (same pattern as original)
// ═══════════════════════════════════════════════════════
function Overlay({ title, sub, icon, color, onRetry, onExit, game }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,18,0.95)', backdropFilter: 'blur(8px)', borderRadius: 12 }}>
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>{icon}</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>{title}</div>
        <div style={{ color, fontSize: 13, marginBottom: 20 }}>{sub}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onRetry} style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 800, color: 'white', background: game.color, border: 'none', cursor: 'pointer', fontSize: 13 }}>Play Again</button>
          <button onClick={onExit}  style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 700, color: '#94A3B8', background: '#1A2642', border: 'none', cursor: 'pointer', fontSize: 13 }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// HOW TO PLAY (same naming pattern as original)
// ═══════════════════════════════════════════════════════
function HowToPlayGuide__QuasarChain({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🚣</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>River Crossing Puzzles</div>
      </div>
      {[
        ['🎯', 'Cross the river', 'Get everyone from the left bank to the right bank safely — tap a character to select them, then tap Cross.'],
        ['⛵', 'Mind the boat', 'The boat has a capacity limit. Only certain characters can row — the boat won\'t move without one.'],
        ['⚠️', 'No dangerous pairs', 'Some characters can\'t be left alone together on a bank. Plan every move carefully.'],
        ['↩️', 'Go back if needed', 'You can — and often must — bring someone back across. Don\'t fear going backwards.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#FCD34D', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • The character causing the most conflict should cross early<br />
          • Ask yourself: "what happens if I leave these two behind?"<br />
          • Use Undo freely — experimenting is part of solving it
        </div>
      </div>
      <button
        onClick={onStart}
        style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${game.color}, #0369a1)` }}
      >
        Start Crossing →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// GAME STATE HELPERS
// ═══════════════════════════════════════════════════════
function charDef(lv, id) {
  return lv.chars.find(c => c.id === id)
}

function checkConflict(lv, leftBank, rightBank, torchTime) {
  for (const bankArr of [leftBank, rightBank]) {
    if (bankArr.length === 0) continue
    if (lv.special === 'missionaries') {
      const ms = bankArr.filter(id => id.startsWith('m')).length
      const cs = bankArr.filter(id => id.startsWith('c')).length
      if (ms > 0 && cs > ms) return 'Cannibals outnumber missionaries! 💀'
    } else if (lv.special === 'jealous') {
      const husbands = ['h1', 'h2', 'h3']
      const wives    = ['w1', 'w2', 'w3']
      for (let i = 0; i < 3; i++) {
        if (!bankArr.includes(wives[i])) continue
        const otherH = husbands.filter((_, j) => j !== i)
        if (otherH.some(h => bankArr.includes(h)) && !bankArr.includes(husbands[i])) {
          return `${wives[i]} is alone with another husband! 😤`
        }
      }
    } else if (lv.special === 'torch') {
      if (torchTime > 17) return `Time's up! ${torchTime} min — need ≤17 🕐`
    } else if (lv.special === 'captain') {
      // no conflict rules
    } else {
      const hasSupervisor = bankArr.some(id => charDef(lv, id)?.row)
      if (hasSupervisor) continue
      for (const [a, b] of lv.bad) {
        if (bankArr.includes(a) && bankArr.includes(b))
          return `The ${charDef(lv, a).nm} attacked the ${charDef(lv, b).nm}! 😱`
      }
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT — drop-in replacement for QuasarChain
// Props: game, levelData, studentId, onFinish
// ═══════════════════════════════════════════════════════
export default function QuasarChain({ game, levelData, studentId, onFinish }) {
  // Pick puzzle index from levelData.level (cycles through 8 puzzles)
  const puzzleIdx = ((levelData.level || 1) - 1) % RIVER_LEVELS.length
  const lv        = RIVER_LEVELS[puzzleIdx]

  const [screen,     setScreen]     = useState('guide')
  const [leftBank,   setLeftBank]   = useState(lv.chars.map(c => c.id))
  const [rightBank,  setRightBank]  = useState([])
  const [passengers, setPassengers] = useState([])
  const [boatSide,   setBoatSide]   = useState('L') // 'L' | 'R'
  const [moves,      setMoves]      = useState(0)
  const [torchTime,  setTorchTime]  = useState(0)
  const [history,    setHistory]    = useState([])
  const [hintsLeft,  setHintsLeft]  = useState(3)
  const [toast,      setToast]      = useState(null)  // { msg, type }
  const [crossing,   setCrossing]   = useState(false)
  const [phase,      setPhase]      = useState('playing') // 'playing' | 'won' | 'conflict'
  const [shaking,    setShaking]    = useState(false)
  const scoreRef  = useRef(0)
  const toastTimer = useRef(null)

  // Score = moves-based: fewer moves = higher score
  const computeScore = useCallback((mv) => {
    const par = lv.min
    const raw = Math.max(0, par - mv) * 100 + 500
    return raw
  }, [lv])

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  function initLevel() {
    setLeftBank(lv.chars.map(c => c.id))
    setRightBank([])
    setPassengers([])
    setBoatSide('L')
    setMoves(0)
    setTorchTime(0)
    setHistory([])
    setHintsLeft(3)
    setToast(null)
    setCrossing(false)
    setPhase('playing')
    setShaking(false)
    scoreRef.current = 0
  }

  // Re-init if puzzle changes
  useEffect(() => { initLevel() }, [puzzleIdx])

  function tapCharacter(id) {
    if (crossing || phase !== 'playing') return
    setPassengers(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= lv.cap) {
        showToast(`Boat fits only ${lv.cap}!`, 'err')
        return prev
      }
      return [...prev, id]
    })
  }

  function doCross() {
    if (crossing || phase !== 'playing') return

    // Validate rower
    if (lv.special === 'captain') {
      if (!passengers.includes('captain')) {
        showToast('The Captain must be on board!', 'err'); return
      }
    } else {
      if (!passengers.some(id => charDef(lv, id)?.row)) {
        showToast('Someone who can row must board first!', 'err'); return
      }
    }

    // Torch: only 1 person can carry torch back
    let legTime = 0
    if (lv.special === 'torch') {
      if (boatSide === 'R' && passengers.length > 1) {
        showToast('Only 1 person can carry the torch back!', 'err'); return
      }
      legTime = Math.max(...passengers.map(id => charDef(lv, id)?.speed || 1))
    }

    setCrossing(true)
    SoundEngine.tap()

    // Snapshot for undo
    setHistory(h => [...h, { leftBank: [...leftBank], rightBank: [...rightBank], boatSide, passengers: [...passengers], moves, torchTime }])

    const from = boatSide === 'L' ? leftBank : rightBank
    const to   = boatSide === 'L' ? rightBank : leftBank
    const newFrom = from.filter(id => !passengers.includes(id))
    const newTo   = [...to, ...passengers]
    const newSide = boatSide === 'L' ? 'R' : 'L'
    const newMoves = moves + 1
    const newTorchTime = torchTime + legTime

    if (boatSide === 'L') {
      setLeftBank(newFrom); setRightBank(newTo)
    } else {
      setRightBank(newFrom); setLeftBank(newTo)
    }
    setBoatSide(newSide)
    setMoves(newMoves)
    setTorchTime(newTorchTime)
    setPassengers([])

    setTimeout(() => {
      setCrossing(false)
      const newLeft  = boatSide === 'L' ? newFrom : newTo
      const newRight = boatSide === 'L' ? newTo   : newFrom
      const conflict = checkConflict(lv, newLeft, newRight, newTorchTime)
      if (conflict) {
        SoundEngine.gameWrong()
        showToast(conflict, 'err')
        setShaking(true)
        setTimeout(() => {
          setShaking(false)
          // Auto-undo
          setHistory(h => {
            const prev = h[h.length - 1]
            if (!prev) return h
            setLeftBank(prev.leftBank)
            setRightBank(prev.rightBank)
            setBoatSide(prev.boatSide)
            setPassengers(prev.passengers)
            setMoves(prev.moves)
            setTorchTime(prev.torchTime)
            setCrossing(false)
            return h.slice(0, -1)
          })
        }, 420)
        return
      }
      // Win check: left bank empty
      if (newLeft.length === 0) {
        const finalScore = computeScore(newMoves)
        scoreRef.current = finalScore
        SoundEngine.levelComplete()
        setPhase('won')
        if (studentId) saveGameScore(studentId, game.id, levelData.level, finalScore)
      }
    }, 600)
  }

  function doUndo() {
    if (!history.length) { showToast('Nothing to undo!', 'err'); return }
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setLeftBank(prev.leftBank)
    setRightBank(prev.rightBank)
    setBoatSide(prev.boatSide)
    setPassengers(prev.passengers)
    setMoves(prev.moves)
    setTorchTime(prev.torchTime)
    setCrossing(false)
  }

  function doHint() {
    if (hintsLeft <= 0) { showToast('No hints left!', 'err'); return }
    const usedHints = 3 - hintsLeft
    const msg = lv.hints[usedHints] || lv.hints[lv.hints.length - 1] || 'Keep thinking!'
    setHintsLeft(h => h - 1)
    showToast('💡 ' + msg, 'hint')
  }

  function restart() {
    initLevel()
  }

  // ── derived UI values ──
  const currentBank = boatSide === 'L' ? leftBank : rightBank
  const otherBank   = boatSide === 'L' ? rightBank : leftBank
  const progress    = rightBank.length / lv.chars.length
  const canCross    = passengers.length > 0 && !crossing && phase === 'playing' &&
    (lv.special === 'captain'
      ? passengers.includes('captain')
      : passengers.some(id => charDef(lv, id)?.row))

  const moveLabel = lv.special === 'torch'
    ? `${torchTime}/${lv.min} min`
    : `${moves} moves`

  // ── style helpers ──
  const C = {
    bg:      '#080D16',
    bg2:     '#0D1625',
    bg3:     '#111E30',
    bg4:     '#16263D',
    faint:   '#1E3252',
    accent:  '#38BDF8',
    accent2: '#0EA5E9',
    gold:    '#F59E0B',
    green:   '#22C55E',
    red:     '#EF4444',
    purple:  '#A78BFA',
    muted:   '#64748B',
    text:    '#E2E8F0',
  }

  const pill = (bg, border, color) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: 99,
    padding: '3px 10px', fontSize: 11, fontWeight: 700, color,
  })

  if (screen === 'guide') return <HowToPlayGuide__QuasarChain game={game} onStart={() => { initLevel(); setScreen('playing') }} />

  return (
    <div style={{ position: 'relative', fontFamily: 'inherit' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 1 }}>
            {lv.chapter} · Level {lv.id}
          </div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{lv.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Progress</div>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 14 }}>{moveLabel}</div>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ background: C.bg3, borderRadius: 99, height: 4, overflow: 'hidden', marginBottom: 8, border: `1px solid ${C.faint}` }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${C.accent2}, ${C.green})`, borderRadius: 99, transition: 'width .5s ease' }} />
      </div>

      {/* ── RULE CARD ── */}
      <div style={{ background: `rgba(14,165,233,0.07)`, borderLeft: `3px solid ${C.accent2}`, borderRadius: '0 10px 10px 0', padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
        {lv.rule}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          textAlign: 'center', marginBottom: 8, padding: '7px 16px', borderRadius: 99,
          fontSize: 12, fontWeight: 600,
          background: toast.type === 'err' ? 'rgba(239,68,68,0.1)' : toast.type === 'hint' ? 'rgba(167,139,250,0.1)' : C.bg3,
          border: `1px solid ${toast.type === 'err' ? 'rgba(239,68,68,0.3)' : toast.type === 'hint' ? 'rgba(167,139,250,0.3)' : C.faint}`,
          color: toast.type === 'err' ? '#FCA5A5' : toast.type === 'hint' ? '#C4B5FD' : C.text,
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── BANKS ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {/* Left / Start bank */}
        <div style={{ flex: 1, background: C.bg3, border: `1.5px solid #1E3A5A`, borderRadius: 14, padding: 10, minHeight: 110 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 8 }}>⛰ Start</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {leftBank.map(id => {
              const c     = charDef(lv, id)
              const onSide = boatSide === 'L'
              const aboard = passengers.includes(id)
              return (
                <button key={id} onClick={() => onSide && tapCharacter(id)}
                  style={{
                    width: 46, height: 46, borderRadius: 12, border: `2px solid ${aboard ? C.gold : C.faint}`,
                    background: aboard ? `rgba(245,158,11,0.15)` : C.bg4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: onSide && !crossing ? 'pointer' : 'default',
                    opacity: onSide ? 1 : 0.2, transition: 'all 0.15s',
                    transform: aboard ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: aboard ? `0 0 10px rgba(245,158,11,0.3)` : 'none',
                  }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{c.em}</span>
                  <span style={{ fontSize: 7, color: C.muted, fontWeight: 700, marginTop: 1 }}>{c.nm}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right / Goal bank */}
        <div style={{ flex: 1, background: C.bg3, border: `1.5px solid #064E3B`, borderRadius: 14, padding: 10, minHeight: 110 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#065F46', fontWeight: 700, marginBottom: 8 }}>✅ Goal</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {rightBank.map(id => {
              const c     = charDef(lv, id)
              const onSide = boatSide === 'R'
              const aboard = passengers.includes(id)
              return (
                <button key={id} onClick={() => onSide && tapCharacter(id)}
                  style={{
                    width: 46, height: 46, borderRadius: 12, border: `2px solid ${aboard ? C.gold : '#064E3B'}`,
                    background: aboard ? `rgba(245,158,11,0.15)` : `rgba(34,197,94,0.07)`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: onSide && !crossing ? 'pointer' : 'default',
                    opacity: onSide ? 1 : 0.35, transition: 'all 0.15s',
                    transform: aboard ? 'scale(1.1)' : 'scale(1)',
                  }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{c.em}</span>
                  <span style={{ fontSize: 7, color: '#22C55E', fontWeight: 700, marginTop: 1 }}>{c.nm}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── RIVER + BOAT ── */}
      <div style={{
        position: 'relative', height: 76, borderRadius: 14, overflow: 'hidden', marginBottom: 8,
        animation: shaking ? 'riverShake 0.38s ease' : 'none',
      }}>
        {/* Animated river */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#0C3254 0,#0E4470 52px,#0C3254 104px)', animation: 'riverFlow 5s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#0A2844 0,#0C3A62 64px,#0A2844 128px)', opacity: 0.5, animation: 'riverFlow 8s linear infinite reverse' }} />

        {/* Boat */}
        <div style={{
          position: 'absolute', bottom: 8, zIndex: 5,
          left: boatSide === 'L' ? 8 : 'calc(100% - 90px)',
          transition: 'left 0.65s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(180deg,#A35010,#7C350C)', borderRadius: '10px 10px 18px 18px',
            width: 82, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            border: `2px solid #B45309`,
            boxShadow: passengers.length > 0 ? '0 0 14px rgba(245,158,11,0.5)' : 'none',
          }}>
            <span style={{ fontSize: 13 }}>🚣</span>
            {passengers.map(id => (
              <span key={id} style={{ fontSize: 17 }}>{charDef(lv, id)?.em}</span>
            ))}
          </div>
          <span style={{ fontSize: 8, color: '#7DD3FC', fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>cap {lv.cap}</span>
        </div>

        {/* Cross button */}
        <button onClick={doCross} disabled={!canCross}
          style={{
            position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
            background: canCross ? `linear-gradient(135deg,#0EA5E9,#0369A1)` : C.bg3,
            border: canCross ? 'none' : `1px solid ${C.faint}`,
            borderRadius: 20, padding: '5px 18px', fontSize: 11, fontWeight: 800,
            color: canCross ? 'white' : C.muted, cursor: canCross ? 'pointer' : 'not-allowed',
            zIndex: 10, whiteSpace: 'nowrap', boxShadow: canCross ? '0 2px 12px rgba(14,165,233,0.4)' : 'none',
            transition: 'all 0.15s',
          }}>
          {crossing ? '...' : boatSide === 'L' ? 'Cross River →' : '← Cross Back'}
        </button>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
        {[
          { label: '↩ Undo', onClick: doUndo, bg: C.bg3, color: C.muted, border: C.faint },
          { label: '↺ Reset', onClick: restart, bg: 'rgba(239,68,68,0.08)', color: C.red, border: 'rgba(239,68,68,0.2)' },
          { label: `💡 Hint (${hintsLeft})`, onClick: doHint, bg: 'rgba(167,139,250,0.08)', color: C.purple, border: 'rgba(167,139,250,0.2)' },
        ].map(({ label, onClick, bg, color, border }) => (
          <button key={label} onClick={onClick}
            style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: `1px solid ${border}`, background: bg, color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── WIN OVERLAY ── */}
      {phase === 'won' && (
        <Overlay
          title="Solved! 🎉"
          sub={`${lv.special === 'torch' ? torchTime + ' minutes' : moves + ' moves'} · par is ${lv.min} · Score: ${scoreRef.current}`}
          icon="⚓"
          color={C.green}
          onRetry={restart}
          onExit={onFinish}
          game={game}
        />
      )}

      {/* ── CSS KEYFRAMES ── */}
      <style>{`
        @keyframes riverFlow { from { transform: translateX(0) } to { transform: translateX(-33.33%) } }
        @keyframes riverShake {
          0%,100% { transform: translateX(0) }
          20%     { transform: translateX(-8px) }
          40%     { transform: translateX(8px) }
          60%     { transform: translateX(-5px) }
          80%     { transform: translateX(5px) }
        }
      `}</style>
    </div>
  )
}
