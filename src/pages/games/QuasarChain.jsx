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
    rule: 'A trader carries a Goat, Matooke and a Rat. Both the Goat and Rat eat the Matooke. Boat holds 1 passenger.',
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
    rule: '3 Missionaries 😇 and 3 Cannibals 😈. If cannibals ever outnumber missionaries on either bank (with missionaries present), they attack. Boat holds 2.',
    cap: 2, min: 11, special: 'missionaries',
    chars: [
      { id: 'm1', em: '😇', nm: 'M-1', row: true },
      { id: 'm2', em: '😇', nm: 'M-2', row: true },
      { id: 'm3', em: '😇', nm: 'M-3', row: true },
      { id: 'c1', em: '😈', nm: 'C-1', row: true },
      { id: 'c2', em: '😈', nm: 'C-2', row: true },
      { id: 'c3', em: '😈', nm: 'C-3', row: true },
    ],
    bad: [],
    hints: ['Send 2 cannibals first, one comes back.', 'Send 1 more cannibal, then 1 comes back.', 'Now send 2 missionaries, 1 missionary + 1 cannibal come back.'],
  },
  {
    id: 5, chapter: 'Hard', name: 'Jealous Couples',
    rule: '3 couples. No wife can be with another husband unless her own husband is present too. Boat holds 2, anyone rows.',
    cap: 2, min: 17, special: 'jealous',
    chars: [
      { id: 'h1', em: '🧔',   nm: 'H-1', row: true }, { id: 'w1', em: '👱‍♀️', nm: 'W-1', row: true },
      { id: 'h2', em: '👨‍🦱', nm: 'H-2', row: true }, { id: 'w2', em: '👩‍🦰',  nm: 'W-2', row: true },
      { id: 'h3', em: '🧑‍🦲', nm: 'H-3', row: true }, { id: 'w3', em: '👩‍🦳',  nm: 'W-3', row: true },
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
    rule: 'Ranger + 5 animals: 🐺Wolf, 🦌Deer, 🐇Rabbit, 🌿Grass, 🐛Caterpillar. Wolf eats Deer, Deer eats Rabbit, Rabbit eats Grass, Grass feeds Caterpillar. Boat holds 1. Ranger must row.',
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
    rule: '5 people must cross. The Captain must row every trip — no one else can operate the boat. Anyone else may return alone if needed.',
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
// PURE HELPERS — no React state closures
// ═══════════════════════════════════════════════════════
function getCharDef(lv, id) {
  return lv.chars.find(c => c.id === id)
}

/**
 * Returns a conflict message string, or null if everything is safe.
 * Takes explicit bank arrays so it never reads stale React state.
 */
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
          return `${wives[i].toUpperCase()} is alone with another husband! 😤`
        }
      }

    } else if (lv.special === 'torch') {
      if (torchTime > 17) return `Time's up! ${torchTime} min used — need ≤17 🕐`

    } else if (lv.special === 'captain') {
      // no conflict rules

    } else {
      // Standard: bad pairs only dangerous when no rower/supervisor is present
      const hasSupervisor = bankArr.some(id => getCharDef(lv, id)?.row)
      if (hasSupervisor) continue
      for (const [a, b] of lv.bad) {
        if (bankArr.includes(a) && bankArr.includes(b)) {
          return `The ${getCharDef(lv, a).nm} attacked the ${getCharDef(lv, b).nm}! 😱`
        }
      }
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════
// OVERLAY — same structure/props as original
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
// HOW TO PLAY — same function name as original
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
        ['🎯', 'Cross the river', 'Get everyone from the left bank to the right bank safely. Tap a character to select them, then tap Cross River.'],
        ['⛵', 'Mind the boat', 'The boat has a capacity limit. Only certain characters can row — the button stays greyed until a rower boards.'],
        ['⚠️', 'No dangerous pairs', "Some characters can't be left alone together. A conflict auto-undoes the crossing so you can try again."],
        ['↩️', 'Going back is fine', "You often must bring someone back. Don't fear going backwards — it's part of every solution."],
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
          • Ask: "what happens if I leave these two behind?"<br />
          • Use the Undo button freely — experimenting is part of it
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
// MAIN COMPONENT
// Props: game, levelData, studentId, onFinish  (identical to original)
// ═══════════════════════════════════════════════════════
export default function QuasarChain({ game, levelData, studentId, onFinish }) {
  const puzzleIdx = ((levelData.level || 1) - 1) % RIVER_LEVELS.length
  const lv        = RIVER_LEVELS[puzzleIdx]

  const [screen,     setScreen]     = useState('guide')
  const [leftBank,   setLeftBank]   = useState(() => lv.chars.map(c => c.id))
  const [rightBank,  setRightBank]  = useState([])
  const [passengers, setPassengers] = useState([])   // IDs on the boat right now
  const [boatSide,   setBoatSide]   = useState('L')  // 'L' | 'R'
  const [moves,      setMoves]      = useState(0)
  const [torchTime,  setTorchTime]  = useState(0)
  const [history,    setHistory]    = useState([])
  const [hintsLeft,  setHintsLeft]  = useState(3)
  const [toast,      setToast]      = useState(null) // { msg, type }
  const [crossing,   setCrossing]   = useState(false)
  const [phase,      setPhase]      = useState('playing') // 'playing' | 'won'
  const [shaking,    setShaking]    = useState(false)

  const scoreRef   = useRef(0)
  const toastTimer = useRef(null)

  // ── toast ──
  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  // ── score: fewer moves = higher score ──
  const computeScore = useCallback((mv) => {
    return 500 + Math.max(0, lv.min - mv) * 100
  }, [lv.min])

  // ── reset to clean slate for a given puzzle level object ──
  // FIX Bug 5: accepts explicit level so useEffect never reads stale lv
  function initLevel(level) {
    setLeftBank(level.chars.map(c => c.id))
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

  // Re-init whenever the puzzle index changes
  useEffect(() => {
    initLevel(RIVER_LEVELS[puzzleIdx])
  }, [puzzleIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── board / de-board a character ──
  // FIX Bug 1: cap check and toast are OUTSIDE setPassengers updater
  function tapCharacter(id) {
    if (crossing || phase !== 'playing') return

    // De-board if already on boat
    if (passengers.includes(id)) {
      setPassengers(prev => prev.filter(x => x !== id))
      return
    }

    // FIX Bug 6: captain puzzle — guide the player to board captain first
    if (lv.special === 'captain' && !passengers.includes('captain') && id !== 'captain') {
      showToast('Board the Captain first — they must row every trip!', 'err')
      return
    }

    // Capacity check
    if (passengers.length >= lv.cap) {
      showToast(`Boat fits only ${lv.cap} — remove someone first!`, 'err')
      return
    }

    setPassengers(prev => [...prev, id])
  }

  // ── attempt a crossing ──
  function doCross() {
    if (crossing || phase !== 'playing') return

    // Validate there's a rower on board
    if (lv.special === 'captain') {
      if (!passengers.includes('captain')) {
        showToast('The Captain must be on board every crossing!', 'err'); return
      }
    } else {
      if (!passengers.some(id => getCharDef(lv, id)?.row)) {
        showToast('Someone who can row must be on the boat!', 'err'); return
      }
    }

    // Torch rule: only 1 person can carry the torch back
    let legTime = 0
    if (lv.special === 'torch') {
      if (boatSide === 'R' && passengers.length > 1) {
        showToast('Only 1 person can carry the torch back!', 'err'); return
      }
      legTime = Math.max(...passengers.map(id => getCharDef(lv, id)?.speed || 1))
    }

    setCrossing(true)
    SoundEngine.tap()

    // FIX Bug 2: snapshot passengers as [] — boat is docked after crossing,
    // player should re-select who to board from scratch on undo
    const snapshot = {
      leftBank:   [...leftBank],
      rightBank:  [...rightBank],
      boatSide,
      passengers: [],
      moves,
      torchTime,
    }
    setHistory(h => [...h, snapshot])

    // Capture current passengers before clearing state
    const boarding = [...passengers]

    // Compute the definitive next bank state synchronously
    // FIX Bug 3: derive newLeft/newRight before any boatSide flip
    const fromArr  = boatSide === 'L' ? [...leftBank]  : [...rightBank]
    const toArr    = boatSide === 'L' ? [...rightBank] : [...leftBank]
    const newFrom  = fromArr.filter(id => !boarding.includes(id))
    const newTo    = [...toArr, ...boarding]
    const newLeft  = boatSide === 'L' ? newFrom : newTo   // absolute, not relative
    const newRight = boatSide === 'L' ? newTo   : newFrom
    const newSide  = boatSide === 'L' ? 'R' : 'L'
    const newMoves = moves + 1
    const newTorch = torchTime + legTime

    // Apply all state changes
    setLeftBank(newLeft)
    setRightBank(newRight)
    setBoatSide(newSide)
    setMoves(newMoves)
    setTorchTime(newTorch)
    setPassengers([])

    // After animation, validate and check win
    setTimeout(() => {
      setCrossing(false)

      const conflict = checkConflict(lv, newLeft, newRight, newTorch)
      if (conflict) {
        SoundEngine.gameWrong()
        showToast(conflict, 'err')
        setShaking(true)
        // FIX Bug 2: restore directly from snapshot (not from history state)
        setTimeout(() => {
          setShaking(false)
          setLeftBank(snapshot.leftBank)
          setRightBank(snapshot.rightBank)
          setBoatSide(snapshot.boatSide)
          setPassengers(snapshot.passengers)
          setMoves(snapshot.moves)
          setTorchTime(snapshot.torchTime)
          setCrossing(false)
          setHistory(h => h.slice(0, -1)) // pop the bad move
        }, 480)
        return
      }

      // Win: all characters have crossed to the right bank
      if (newLeft.length === 0) {
        const finalScore = computeScore(newMoves)
        scoreRef.current = finalScore
        SoundEngine.levelComplete()
        setPhase('won')
        if (studentId) saveGameScore(studentId, game.id, levelData.level, finalScore)
      }
    }, 650)
  }

  // ── manual undo (player-triggered) ──
  function doUndo() {
    if (crossing) return
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

  // ── hint ──
  function doHint() {
    if (hintsLeft <= 0) { showToast('No hints left for this puzzle!', 'err'); return }
    const used = 3 - hintsLeft
    const msg  = lv.hints[used] || lv.hints[lv.hints.length - 1] || 'Keep thinking — you can do it!'
    setHintsLeft(h => h - 1)
    showToast('💡 ' + msg, 'hint')
  }

  function restart() { initLevel(lv) }

  // ── derived UI ──
  const progress = rightBank.length / lv.chars.length
  const canCross = (
    passengers.length > 0 &&
    !crossing &&
    phase === 'playing' &&
    (lv.special === 'captain'
      ? passengers.includes('captain')
      : passengers.some(id => getCharDef(lv, id)?.row))
  )
  const moveLabel = lv.special === 'torch'
    ? `${torchTime}/${lv.min} min`
    : `${moves} moves`

  const C = {
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

  // ── guide screen ──
  if (screen === 'guide') {
    return (
      <HowToPlayGuide__QuasarChain
        game={game}
        onStart={() => { initLevel(lv); setScreen('playing') }}
      />
    )
  }

  // ── bank renderer ──
  function renderBank(ids, side, borderCol, labelCol, label) {
    const onThisSide = boatSide === side
    return (
      <div style={{ flex: 1, background: C.bg3, border: `1.5px solid ${borderCol}`, borderRadius: 14, padding: 10, minHeight: 100 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: labelCol, fontWeight: 700, marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ids.map(id => {
            const c         = getCharDef(lv, id)
            const aboard    = passengers.includes(id)
            const clickable = onThisSide && !crossing && phase === 'playing'
            return (
              <button
                key={id}
                onClick={() => clickable && tapCharacter(id)}
                title={c.nm}
                style={{
                  width: 46, height: 46, borderRadius: 12,
                  border: `2px solid ${aboard ? C.gold : borderCol}`,
                  background: aboard ? 'rgba(245,158,11,0.18)' : C.bg4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: clickable ? 'pointer' : 'default',
                  opacity: onThisSide ? 1 : 0.22,
                  transition: 'all 0.15s',
                  transform: aboard ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: aboard ? '0 0 10px rgba(245,158,11,0.35)' : 'none',
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{c.em}</span>
                <span style={{ fontSize: 7, color: aboard ? C.gold : C.muted, fontWeight: 700, marginTop: 1 }}>{c.nm}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── main render ──
  return (
    <div style={{ position: 'relative', fontFamily: 'inherit' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 1 }}>
            {lv.chapter} · Puzzle {lv.id}
          </div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{lv.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 }}>
            {lv.special === 'torch' ? 'time' : 'moves'} · par {lv.min}
          </div>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 14 }}>{moveLabel}</div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div style={{ background: C.bg3, borderRadius: 99, height: 4, overflow: 'hidden', marginBottom: 8, border: `1px solid ${C.faint}` }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg,${C.accent2},${C.green})`, borderRadius: 99, transition: 'width .45s ease' }} />
      </div>

      {/* RULE */}
      <div style={{ background: 'rgba(14,165,233,0.07)', borderLeft: `3px solid ${C.accent2}`, borderRadius: '0 10px 10px 0', padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
        {lv.rule}
      </div>

      {/* TOAST */}
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

      {/* BANKS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {renderBank(leftBank,  'L', '#1E3A5A', C.muted,  '⛰ Start')}
        {renderBank(rightBank, 'R', '#064E3B', '#065F46', '✅ Goal')}
      </div>

      {/* RIVER + BOAT */}
      <div style={{
        position: 'relative', height: 80, borderRadius: 14, overflow: 'hidden', marginBottom: 8,
        animation: shaking ? 'riverShake 0.42s ease' : 'none',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#0C3254 0,#0E4470 52px,#0C3254 104px)', animation: 'riverFlow 5s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#0A2844 0,#0C3A62 64px,#0A2844 128px)', opacity: 0.5, animation: 'riverFlow 8s linear infinite reverse' }} />

        {/* Boat */}
        <div style={{
          position: 'absolute', bottom: 8, zIndex: 5,
          left: boatSide === 'L' ? 8 : 'calc(100% - 92px)',
          transition: 'left 0.65s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(180deg,#A35010,#7C350C)', borderRadius: '10px 10px 18px 18px',
            width: 84, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            border: '2px solid #B45309',
            boxShadow: passengers.length > 0 ? '0 0 16px rgba(245,158,11,0.55)' : 'none',
            transition: 'box-shadow 0.2s',
          }}>
            <span style={{ fontSize: 13 }}>🚣</span>
            {passengers.map(id => (
              <span key={id} style={{ fontSize: 18, lineHeight: 1 }}>{getCharDef(lv, id)?.em}</span>
            ))}
          </div>
          <span style={{ fontSize: 8, color: '#7DD3FC', fontWeight: 700, marginTop: 3, letterSpacing: 0.5 }}>
            {passengers.length}/{lv.cap} aboard
          </span>
        </div>

        {/* Cross button */}
        <button
          onClick={doCross}
          disabled={!canCross}
          style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: canCross ? 'linear-gradient(135deg,#0EA5E9,#0369A1)' : C.bg3,
            border: canCross ? 'none' : `1px solid ${C.faint}`,
            borderRadius: 20, padding: '6px 20px',
            fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
            color: canCross ? 'white' : C.muted,
            cursor: canCross ? 'pointer' : 'not-allowed',
            zIndex: 10, whiteSpace: 'nowrap',
            boxShadow: canCross ? '0 2px 14px rgba(14,165,233,0.45)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {crossing ? '⏳ Crossing…' : boatSide === 'L' ? 'Cross River →' : '← Cross Back'}
        </button>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
        {[
          { label: '↩ Undo',             fn: doUndo,  bg: C.bg3,                      col: C.muted,  bdr: C.faint                   },
          { label: '↺ Reset',             fn: restart, bg: 'rgba(239,68,68,0.08)',      col: C.red,    bdr: 'rgba(239,68,68,0.2)'     },
          { label: `💡 Hint (${hintsLeft})`, fn: doHint,  bg: 'rgba(167,139,250,0.08)',  col: C.purple, bdr: 'rgba(167,139,250,0.2)'   },
        ].map(({ label, fn, bg, col, bdr }) => (
          <button key={label} onClick={fn} style={{
            flex: 1, padding: '10px 4px', borderRadius: 12,
            border: `1px solid ${bdr}`, background: bg,
            color: col, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* WIN OVERLAY */}
      {phase === 'won' && (
        <Overlay
          title="Puzzle Solved! 🎉"
          sub={`${lv.special === 'torch' ? torchTime + ' minutes' : moves + ' moves'} · par ${lv.min} · Score: ${scoreRef.current}`}
          icon="🏆"
          color={C.green}
          onRetry={restart}
          onExit={onFinish}
          game={game}
        />
      )}

      {/* SCOPED KEYFRAMES */}
      <style>{`
        @keyframes riverFlow {
          from { transform: translateX(0)       }
          to   { transform: translateX(-33.33%) }
        }
        @keyframes riverShake {
          0%,100% { transform: translateX(0)   }
          20%     { transform: translateX(-8px) }
          40%     { transform: translateX(8px)  }
          60%     { transform: translateX(-5px) }
          80%     { transform: translateX(5px)  }
        }
      `}</style>
    </div>
  )
}
