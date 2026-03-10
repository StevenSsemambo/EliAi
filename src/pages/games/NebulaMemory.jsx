import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const SPACE_ICONS = ['🌍','🌙','☀️','🪐','⭐','🌟','🌠','🚀','🛸','🌌','🔭','🌑','💫','🌊','❄️','🔥','⚡','🌋','🌈','🎯']
const ATOM_ICONS  = ['⚛️','🔬','🧪','🔩','💎','🔋','⚙️','🧲','🌡️','📡','🛰️','☢️','⚗️','🔌','💡','🧬','🦠','🌀','💠','🎲']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Overlay({ title, sub, icon, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:16,background:'rgba(5,8,18,0.96)',backdropFilter:'blur(8px)' }}>
      <div style={{ textAlign:'center',padding:'0 24px' }}>
        <div style={{ fontSize:52,marginBottom:8 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:4 }}>{title}</div>
        <div style={{ color,fontSize:14,marginBottom:20 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'10px 22px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer',fontSize:14 }}>Play Again</button>
          <button onClick={onExit}  style={{ padding:'10px 22px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#1A2642',border:'none',cursor:'pointer',fontSize:14 }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

export default function NebulaMemory({ game, levelData, studentId, onFinish }) {
  const { pairs, timeLimit } = levelData
  const makeCards = () => {
    const icons = shuffle([...SPACE_ICONS,...ATOM_ICONS]).slice(0,pairs)
    return shuffle([...icons,...icons].map((icon,i) => ({ id:i,icon,flipped:false,matched:false })))
  }
  const [cards, setCards]   = useState(makeCards)
  const [sel, setSel]       = useState([])
  const [moves, setMoves]   = useState(0)
  const [matches, setMatches] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [phase, setPhase]   = useState('playing')
  const [score, setScore]   = useState(0)
  const [combo, setCombo]   = useState(0)
  const locked  = useRef(false)
  const matchRef = useRef(0)
  const comboRef = useRef(0)

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); finish(false); return 0 }
      if (s <= 10) SoundEngine.timerTick(s<=3?3:s<=6?2:1)
      return s-1
    }), 1000)
    return () => clearInterval(t)
  }, [phase])

  function finish(won) {
    const fs = won
      ? Math.max(0, Math.round((timeLeft/timeLimit)*1000 + pairs*50 - moves*3))
      : Math.round(matchRef.current * 20)
    setScore(fs)
    if (won) SoundEngine.levelComplete()
    setPhase(won ? 'won' : 'lost')
    if (studentId) saveGameScore(studentId, game.id, levelData.level, fs)
  }

  function flip(card) {
    if (locked.current || card.flipped || card.matched || phase!=='playing') return
    SoundEngine.cardFlip()
    const next = cards.map(c => c.id===card.id ? {...c,flipped:true} : c)
    setCards(next)
    const ns = [...sel, card]
    setSel(ns)
    if (ns.length===2) {
      locked.current = true
      setMoves(m => m+1)
      setTimeout(() => {
        const [a,b] = ns
        if (a.icon===b.icon) {
          SoundEngine.gameCorrect()
          comboRef.current++
          setCombo(comboRef.current)
          if (comboRef.current>=2) SoundEngine.combo(comboRef.current)
          setCards(cs => cs.map(c => c.id===a.id||c.id===b.id ? {...c,matched:true} : c))
          matchRef.current++
          setMatches(matchRef.current)
          if (matchRef.current===pairs) finish(true)
        } else {
          SoundEngine.gameWrong()
          comboRef.current = 0
          setCombo(0)
          setCards(cs => cs.map(c => c.id===a.id||c.id===b.id ? {...c,flipped:false} : c))
        }
        setSel([])
        locked.current = false
      }, 850)
    }
  }

  function restart() {
    setCards(makeCards()); setSel([]); setMoves(0); setMatches(0)
    matchRef.current=0; comboRef.current=0; setCombo(0)
    setTimeLeft(timeLimit); setPhase('playing'); setScore(0)
  }

  const cols = levelData.gridSize||4
  const pct  = (timeLeft/timeLimit)*100
  const tc   = timeLeft>timeLimit*0.5 ? '#4ADE80' : timeLeft>timeLimit*0.25 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ position:'relative' }}>
      {/* Header stats */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <div style={{ display:'flex',gap:14,fontSize:13 }}>
          <span style={{ color:'#FBBF24',fontWeight:800 }}>⭐ {score}</span>
          {combo>=2 && <span style={{ color:'#F59E0B',fontWeight:800 }}>🔥 ×{combo}</span>}
        </div>
        <div style={{ display:'flex',gap:12,fontSize:12,color:'#475569' }}>
          <span>🃏 {moves}</span>
          <span>✅ {matches}/{pairs}</span>
        </div>
      </div>
      {/* Timer */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'#475569',marginBottom:3 }}>
          <span>Time</span><span style={{ color:tc,fontWeight:800,fontFamily:'monospace' }}>{timeLeft}s</span>
        </div>
        <div style={{ height:5,borderRadius:99,background:'#0F1629' }}>
          <div style={{ height:'100%',borderRadius:99,width:`${pct}%`,background:tc,transition:'width 1s linear,background 0.4s' }}/>
        </div>
      </div>
      {/* Card grid */}
      <div style={{ position:'relative',display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:cols>=6?4:6 }}>
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card)} style={{
            aspectRatio:'1',borderRadius:cols>=6?8:12,border:'none',cursor:card.matched?'default':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:cols>=6?'1.05rem':'1.45rem',transition:'all 0.18s',
            background: card.matched?'rgba(74,222,128,0.15)' : card.flipped?`${game.color}25` : 'linear-gradient(145deg,#0E1525,#131E35)',
            outline: card.matched?'1px solid rgba(74,222,128,0.45)' : card.flipped?`1px solid ${game.color}55` : '1px solid #1C2840',
            boxShadow: card.matched?'0 0 10px rgba(74,222,128,0.2)' : card.flipped?`0 0 6px ${game.color}33` : 'none',
            transform: card.matched?'scale(1.03)' : 'scale(1)',
          }}>
            {card.flipped||card.matched ? card.icon : '✦'}
          </button>
        ))}
        {phase==='won'  && <Overlay title="Stellar Match!" sub={`${score} pts · ${moves} moves`} icon="🌟" color="#4ADE80" onRetry={restart} onExit={onFinish} game={game}/>}
        {phase==='lost' && <Overlay title="Lost in Space"  sub={`Matched ${matches}/${pairs}`}  icon="🌌" color="#EF4444" onRetry={restart} onExit={onFinish} game={game}/>}
      </div>
    </div>
  )
}
