import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Towers of Hanoi ──────────────────────────────────────────────
// Player moves discs from peg A to peg C
// Rules: only 1 disc at a time, never put larger disc on smaller

const DISC_COLORS = [
  '#EF4444','#F97316','#F59E0B','#4ADE80','#06B6D4','#8B5CF6','#EC4899',
]

function minMoves(n) { return Math.pow(2, n) - 1 }

function makeState(n) {
  // All discs on peg 0, largest at bottom (disc n is largest)
  return [
    Array.from({ length: n }, (_, i) => n - i), // peg 0: [n, n-1, ..., 1] (bottom to top)
    [],
    [],
  ]
}

function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,6,14,0.97)',backdropFilter:'blur(10px)',borderRadius:14 }}>
      <div style={{ textAlign:'center',padding:'0 24px' }}>
        <div style={{ fontSize:54,marginBottom:10 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:6 }}>{title}</div>
        <div style={{ color,fontSize:14,marginBottom:24,lineHeight:1.5 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'11px 24px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer' }}>Play Again</button>
          <button onClick={onExit}  style={{ padding:'11px 24px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#111827',border:'none',cursor:'pointer' }}>Exit</button>
        </div>
      </div>
    </div>
  )
}


function HowToPlayGuide__TowerOfMind({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🗼</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Tower of Mind</div>
      </div>
      {[
        ['📦', 'Move discs', `Tap a peg to pick up its top disc, then tap another peg to place it there.`],
        ['📏', 'One rule', `You can never place a larger disc on top of a smaller disc.`],
        ['🎯', 'Goal', `Move all discs from the left peg to the right peg using the middle as a helper.`],
        ['💡', 'Minimum moves', `The fewest possible moves is 2ⁿ-1 (e.g. 3 discs = 7 moves minimum).`],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#7DD3FC', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: `• Always move the smallest disc first in a new cycle<br/>• For odd discs, move smallest to the target peg<br/>• For even discs, move smallest to the helper peg<br/>• Use Undo if you get stuck!` }} />
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, game.color, #0369A1)` }}>
        Start Game →
      </button>
    </div>
  )
}

export default function TowerOfMind({ game, levelData, studentId, onFinish }) {
  const { discs = 3, timeLimit = 120 } = levelData
  const [screen, setScreen] = useState('guide')

  const [pegs, setPegs]         = useState(() => makeState(discs))
  const [selected, setSelected] = useState(null)   // peg index being held
  const [moves, setMoves]       = useState(0)
  const [phase, setPhase]       = useState('playing')
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [score, setScore]       = useState(0)
  const [wrongAnim, setWrongAnim] = useState(false)
  const [history, setHistory]   = useState([])  // for undo
  const optimal = minMoves(discs)

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); endGame(false); return 0 }
      if (s <= 15) SoundEngine.timerTick(s <= 5 ? 3 : 2)
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase])

  function selectPeg(pegIdx) {
    if (phase !== 'playing') return

    if (selected === null) {
      // Pick up top disc from this peg
      if (pegs[pegIdx].length === 0) return
      SoundEngine.tap()
      setSelected(pegIdx)
    } else {
      if (selected === pegIdx) {
        // Put back down on same peg
        setSelected(null)
        return
      }
      // Try to move
      const topDisc  = pegs[selected][pegs[selected].length - 1]
      const destTop  = pegs[pegIdx].length > 0 ? pegs[pegIdx][pegs[pegIdx].length - 1] : Infinity

      if (topDisc > destTop) {
        // Invalid — can't place larger on smaller
        SoundEngine.gameWrong()
        setWrongAnim(true)
        setTimeout(() => setWrongAnim(false), 600)
        setSelected(null)
        return
      }

      // Valid move
      SoundEngine.tileMove()
      const newPegs = pegs.map(p => [...p])
      newPegs[selected].pop()
      newPegs[pegIdx].push(topDisc)
      setHistory(h => [...h, pegs])
      setPegs(newPegs)
      setMoves(m => m + 1)
      setSelected(null)

      // Check win: all discs on peg 2
      if (newPegs[2].length === discs) {
        SoundEngine.levelComplete()
        const efficiency = optimal / (moves + 1)
        const timeBonus = Math.round((timeLeft / timeLimit) * 400)
        const effBonus  = Math.round(efficiency * 600)
        const fs = Math.min(1000, timeBonus + effBonus + 100)
        setScore(fs)
        setPhase('won')
        if (studentId) saveGameScore(studentId, game.id, levelData.level, fs)
      }
    }
  }

  function undo() {
    if (history.length === 0 || phase !== 'playing') return
    SoundEngine.tap()
    const prev = history[history.length - 1]
    setPegs(prev)
    setHistory(h => h.slice(0, -1))
    setMoves(m => Math.max(0, m - 1))
    setSelected(null)
  }

  function endGame(won) {
    if (!won) setPhase('lost')
  }

  function restart() {
    setPegs(makeState(discs)); setSelected(null); setMoves(0)
    setPhase('playing'); setTimeLeft(timeLimit); setScore(0); setHistory([])
  }

  const tc = timeLeft > timeLimit * 0.5 ? '#4ADE80' : timeLeft > timeLimit * 0.2 ? '#F59E0B' : '#EF4444'
  const efficiency = moves > 0 ? Math.round((optimal / moves) * 100) : 100

  if (screen === 'guide') return <HowToPlayGuide__TowerOfMind game={game} onStart={() => setScreen('playing')} />

  return (
    <div style={{ position:'relative' }}>
      <style>{`
        @keyframes wobble { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        .wobble { animation: wobble 0.3s ease; }
        @keyframes lift { from{transform:translateY(0)} to{transform:translateY(-8px)} }
      `}</style>

      {/* Stats */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
        <div style={{ display:'flex',gap:14,fontSize:12 }}>
          <span style={{ color:'#FBBF24',fontWeight:800 }}>⭐ {score}</span>
          <span style={{ color:'#475569' }}>🎯 {moves} moves</span>
          <span style={{ color: efficiency>=100?'#4ADE80':efficiency>=70?'#F59E0B':'#EF4444' }}>
            {efficiency}% efficient
          </span>
        </div>
        <span style={{ color:tc,fontWeight:800,fontFamily:'monospace',fontSize:12 }}>{timeLeft}s</span>
      </div>

      {/* Timer */}
      <div style={{ height:4,borderRadius:99,background:'#0F1629',marginBottom:16 }}>
        <div style={{ height:'100%',borderRadius:99,width:`${(timeLeft/timeLimit)*100}%`,background:tc,transition:'width 1s linear,background 0.4s' }}/>
      </div>

      {/* Optimal moves hint */}
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:14,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',fontSize:12 }}>
        <span style={{ color:'#475569' }}>Minimum possible: <span style={{ color:'#94A3B8',fontWeight:700 }}>{optimal} moves</span></span>
        <span style={{ color:'#475569' }}>{discs} discs</span>
      </div>

      {/* Pegs */}
      <div className={wrongAnim ? 'wobble' : ''} style={{ display:'flex',justifyContent:'space-around',alignItems:'flex-end',height:180,marginBottom:14,position:'relative' }}>
        {/* Base platform */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,height:8,borderRadius:4,background:'linear-gradient(90deg,#1A2642,#243054,#1A2642)' }}/>

        {pegs.map((peg, pi) => {
          const isSelected = selected === pi
          const hasDisc    = peg.length > 0
          const pegLabels  = ['A','B','C']

          return (
            <div key={pi}
              onClick={() => selectPeg(pi)}
              style={{ display:'flex',flexDirection:'column-reverse',alignItems:'center',width:`${100/3}%`,cursor:'pointer',paddingBottom:8,position:'relative' }}>

              {/* Peg rod */}
              <div style={{
                position:'absolute',bottom:8,
                width:6,height:160,borderRadius:3,
                background: isSelected ? game.color : '#243054',
                boxShadow: isSelected ? `0 0 16px ${game.color}66` : 'none',
                transition:'all 0.2s'
              }}/>

              {/* Peg label */}
              <div style={{ position:'absolute',bottom:-20,color:isSelected?game.color:'#334155',fontWeight:800,fontSize:14,transition:'color 0.2s' }}>
                {pegLabels[pi]}
              </div>

              {/* Discs */}
              {peg.map((size, di) => {
                const maxW  = 90
                const minW  = 26
                const width = minW + (size / discs) * (maxW - minW)
                const isTop  = di === peg.length - 1
                const isHeld = isTop && isSelected

                return (
                  <div key={size} style={{
                    width, height:20, borderRadius:6,
                    background: DISC_COLORS[(size - 1) % DISC_COLORS.length],
                    marginBottom:2, zIndex:1, position:'relative',
                    boxShadow: isHeld ? `0 0 16px ${DISC_COLORS[(size-1)%DISC_COLORS.length]}99` : `0 2px 4px rgba(0,0,0,0.4)`,
                    transform: isHeld ? 'translateY(-16px) scale(1.06)' : 'translateY(0)',
                    transition:'all 0.2s',
                    border: isHeld ? '2px solid white' : '1px solid rgba(255,255,255,0.25)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <span style={{ fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.8)' }}>{size}</span>
                  </div>
                )
              })}

              {/* Hover/click zone */}
              <div style={{ position:'absolute',inset:0,zIndex:2 }}/>
            </div>
          )
        })}
      </div>

      {/* Instruction */}
      <div style={{ textAlign:'center',color:'#334155',fontSize:11,marginBottom:14 }}>
        {selected !== null
          ? `Disc ${pegs[selected][pegs[selected].length-1]} lifted from peg ${['A','B','C'][selected]} — tap a peg to place it`
          : 'Tap a peg to pick up its top disc · Move all discs to peg C'}
      </div>

      {/* Actions */}
      <div style={{ display:'flex',gap:8 }}>
        <button onClick={undo} disabled={history.length===0}
          style={{ flex:1,padding:'10px',borderRadius:10,fontWeight:700,fontSize:12,color:history.length?'#94A3B8':'#334155',background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',cursor:history.length?'pointer':'not-allowed',opacity:history.length?1:0.4 }}>
          ↩ Undo
        </button>
        <button onClick={restart}
          style={{ flex:1,padding:'10px',borderRadius:10,fontWeight:700,fontSize:12,color:'#64748B',background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',cursor:'pointer' }}>
          🔄 Reset
        </button>
      </div>

      {phase==='won'  && <Overlay icon="🏗️" title="Tower Complete!" sub={`${moves} moves (optimal: ${optimal}) · ${score} pts${moves===optimal?' 🏆 Perfect!':''}`} color="#4ADE80" onRetry={restart} onExit={onFinish} game={game}/>}
      {phase==='lost' && <Overlay icon="⏰" title="Time's Up!" sub={`You used ${moves} moves · Optimal is ${optimal}`} color="#EF4444" onRetry={restart} onExit={onFinish} game={game}/>}
    </div>
  )
}
