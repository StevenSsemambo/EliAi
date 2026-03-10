import { useState, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Ensure puzzle is solvable (count inversions)
function isSolvable(tiles, n) {
  const flat = tiles.filter(v => v !== n * n - 1)
  let inv = 0
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (flat[i] > flat[j]) inv++
  const blankRow = Math.floor(tiles.indexOf(n * n - 1) / n)
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

const THEMES = [
  { icon:'🌌', label:'Milky Way', accent:'#7C3AED' },
  { icon:'🪐', label:'Saturn',    accent:'#F59E0B' },
  { icon:'☀️', label:'Solar',     accent:'#EF4444' },
  { icon:'🚀', label:'Launch',    accent:'#06B6D4' },
  { icon:'🌊', label:'Nebula',    accent:'#059669' },
]

function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(5,8,18,0.95)',backdropFilter:'blur(8px)',borderRadius:12 }}>
      <div style={{ textAlign:'center',padding:'0 20px' }}>
        <div style={{ fontSize:50,marginBottom:8 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:4 }}>{title}</div>
        <div style={{ color,fontSize:13,marginBottom:20 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'10px 20px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer',fontSize:13 }}>Play Again</button>
          <button onClick={onExit}  style={{ padding:'10px 20px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#1A2642',border:'none',cursor:'pointer',fontSize:13 }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

export default function CosmosPuzzle({ game, levelData, studentId, onFinish }) {
  const n = levelData.gridSize || 3
  const total = n * n
  const [theme]  = useState(() => THEMES[Math.floor(Math.random() * THEMES.length)])
  const [tiles, setTiles] = useState(() => makePuzzle(n))
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState('playing')
  const [score, setScore] = useState(0)
  const [startTime] = useState(Date.now)

  const blankIdx = tiles.indexOf(total - 1)

  function canMove(idx) {
    const r = Math.floor(idx / n), c = idx % n
    const br = Math.floor(blankIdx / n), bc = blankIdx % n
    return (Math.abs(r - br) === 1 && c === bc) || (Math.abs(c - bc) === 1 && r === br)
  }

  function move(idx) {
    if (!canMove(idx) || phase !== 'playing') return
    SoundEngine.tileMove()
    const nt = [...tiles];
    [nt[idx], nt[blankIdx]] = [nt[blankIdx], nt[idx]]
    setTiles(nt)
    const nm = moves + 1
    setMoves(nm)
    if (nt.every((v, i) => v === i)) {
      SoundEngine.levelComplete()
      const elapsed = (Date.now() - startTime()) / 1000
      const fs = Math.max(50, Math.round(5000 - nm * 12 - elapsed * 4))
      setScore(fs)
      setPhase('won')
      if (studentId) saveGameScore(studentId, game.id, levelData.level, fs)
    }
  }

  function restart() {
    setTiles(makePuzzle(n)); setMoves(0); setPhase('playing'); setScore(0)
  }

  // Color tiles by their solved position
  const hues = Array.from({ length: total - 1 }, (_, i) => Math.round((i / (total - 1)) * 200 + 160))

  return (
    <div style={{ position:'relative' }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ color:'#FBBF24',fontWeight:800,fontSize:13 }}>⭐ {score}</span>
        <span style={{ color:'#475569',fontSize:12 }}>🔄 {moves} moves</span>
      </div>

      {/* Goal hint */}
      <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',marginBottom:12 }}>
        <span style={{ fontSize:26 }}>{theme.icon}</span>
        <div>
          <div style={{ color:'#94A3B8',fontSize:11,fontWeight:600 }}>Restore the {theme.label}</div>
          <div style={{ color:'#475569',fontSize:10 }}>Order tiles 1–{total-1}, blank at bottom-right</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ position:'relative',display:'grid',gridTemplateColumns:`repeat(${n},1fr)`,gap:n>=5?4:6 }}>
        {tiles.map((val, idx) => {
          const isBlank = val === total - 1
          const inPlace = val === idx
          const movable = canMove(idx) && !isBlank
          return (
            <button key={idx} onClick={() => move(idx)} disabled={isBlank}
              style={{
                aspectRatio:'1',borderRadius:n>=5?8:12,border:'none',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:900,fontSize:n>=5?'1rem':'1.4rem',
                transition:'all 0.12s',
                background: isBlank ? 'transparent'
                  : inPlace ? 'rgba(74,222,128,0.18)'
                  : `hsl(${hues[val]||200}, 65%, 18%)`,
                outline: isBlank ? '2px dashed #1A2642'
                  : inPlace ? '1px solid rgba(74,222,128,0.5)'
                  : `1px solid hsl(${hues[val]||200}, 65%, 32%)`,
                color: inPlace ? '#4ADE80' : '#CBD5E1',
                boxShadow: movable ? `0 0 14px ${theme.accent}55` : 'none',
                cursor: movable ? 'pointer' : isBlank ? 'default' : 'not-allowed',
                transform: movable ? 'scale(1.03)' : 'scale(1)',
              }}>
              {isBlank ? '' : val + 1}
            </button>
          )
        })}
        {phase==='won' && <Overlay icon={theme.icon} title="Star Map Restored!" sub={`${moves} moves · ${score} pts`} color="#4ADE80" onRetry={restart} onExit={onFinish} game={game}/>}
      </div>

      <button onClick={restart}
        style={{ marginTop:12,width:'100%',padding:'9px',borderRadius:10,fontSize:12,fontWeight:700,color:'#64748B',background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',cursor:'pointer' }}>
        🔀 New Puzzle
      </button>
    </div>
  )
}
