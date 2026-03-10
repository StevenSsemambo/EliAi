import { useState, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const ATOMS = [
  { name:'Hydrogen', color:'#EF4444', glow:'rgba(239,68,68,0.6)',  icon:'H'  },
  { name:'Helium',   color:'#F59E0B', glow:'rgba(245,158,11,0.6)', icon:'He' },
  { name:'Carbon',   color:'#10B981', glow:'rgba(16,185,129,0.6)', icon:'C'  },
  { name:'Nitrogen', color:'#3B82F6', glow:'rgba(59,130,246,0.6)', icon:'N'  },
  { name:'Oxygen',   color:'#8B5CF6', glow:'rgba(139,92,246,0.6)', icon:'O'  },
  { name:'Silicon',  color:'#06B6D4', glow:'rgba(6,182,212,0.6)',  icon:'Si' },
]

function makeGrid(w, h, nc) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => Math.floor(Math.random() * nc)))
}

function findMatches(grid, w, h) {
  const m = Array.from({ length: h }, () => Array(w).fill(false))
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w - 2; c++) {
      const v = grid[r][c]
      if (v !== -1 && grid[r][c+1] === v && grid[r][c+2] === v) {
        let e = c + 2; while (e+1<w && grid[r][e+1]===v) e++
        for (let x = c; x <= e; x++) m[r][x] = true
      }
    }
  for (let c = 0; c < w; c++)
    for (let r = 0; r < h - 2; r++) {
      const v = grid[r][c]
      if (v !== -1 && grid[r+1][c] === v && grid[r+2][c] === v) {
        let e = r + 2; while (e+1<h && grid[e+1][c]===v) e++
        for (let y = r; y <= e; y++) m[y][c] = true
      }
    }
  return m
}

function applyGravity(grid, w, h, nc) {
  const ng = grid.map(r => [...r])
  for (let c = 0; c < w; c++) {
    const col = []
    for (let r = h-1; r >= 0; r--) if (ng[r][c] !== -1) col.push(ng[r][c])
    while (col.length < h) col.push(Math.floor(Math.random() * nc))
    for (let r = h-1; r >= 0; r--) ng[r][c] = col[h-1-r]
  }
  return ng
}

function Overlay({ title, sub, icon, color, onRetry, onExit, game }) {
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

export default function QuasarChain({ game, levelData, studentId, onFinish }) {
  const { gridW: W, gridH: H, colors: numColors } = levelData
  const initialMoves = levelData.moves || Math.max(15, 30 - Math.floor(levelData.level / 4))
  const nc = Math.min(numColors, ATOMS.length)
  const atoms = ATOMS.slice(0, nc)

  const [grid, setGrid]       = useState(() => makeGrid(W, H, nc))
  const [sel, setSel]         = useState(null)
  const [lit, setLit]         = useState([])
  const [score, setScore]     = useState(0)
  const [combo, setCombo]     = useState(0)
  const [moves, setMoves]     = useState(initialMoves)
  const [phase, setPhase]     = useState('playing')
  const [animating, setAnimating] = useState(false)
  const scoreRef = useRef(0)

  function handleTap(r, c) {
    if (animating || phase !== 'playing') return
    if (!sel) { SoundEngine.tap(); setSel([r, c]); return }
    const [sr, sc] = sel
    if (sr === r && sc === c) { setSel(null); return }
    const adj = (Math.abs(r-sr)===1 && c===sc) || (Math.abs(c-sc)===1 && r===sr)
    if (!adj) { SoundEngine.tap(); setSel([r, c]); return }

    const ng = grid.map(row => [...row]);
    [ng[r][c], ng[sr][sc]] = [ng[sr][sc], ng[r][c]]
    setSel(null)

    const matches = findMatches(ng, W, H)
    const hasMatch = matches.some(row => row.some(Boolean))
    if (!hasMatch) {
      SoundEngine.gameWrong()
      setGrid(ng)
      const nm = moves - 1; setMoves(nm)
      if (nm <= 0) endGame()
      return
    }
    setAnimating(true)
    resolveMatches(ng, 0)
  }

  function resolveMatches(g, depth) {
    const matches = findMatches(g, W, H)
    const count = matches.flat().filter(Boolean).length
    if (count === 0) {
      setGrid(g); setAnimating(false); setCombo(0)
      const nm = moves - 1; setMoves(nm)
      if (nm <= 0) endGame()
      return
    }
    SoundEngine.combo(depth + 1)
    const pts = Math.round(count * 10 * (1 + depth * 0.6))
    scoreRef.current += pts
    setScore(scoreRef.current)
    setCombo(depth + 1)
    setLit(matches)

    setTimeout(() => {
      const cleared = g.map((row, r) => row.map((v, c) => matches[r][c] ? -1 : v))
      const settled = applyGravity(cleared, W, H, nc)
      setLit([])
      setGrid(settled)
      setTimeout(() => resolveMatches(settled, depth + 1), 200)
    }, 480)
  }

  function endGame() {
    SoundEngine.levelComplete(); setPhase('over')
    if (studentId) saveGameScore(studentId, game.id, levelData.level, scoreRef.current)
  }

  function restart() {
    setGrid(makeGrid(W, H, nc)); setSel(null); setLit([])
    scoreRef.current = 0; setScore(0); setCombo(0)
    setMoves(initialMoves); setPhase('playing'); setAnimating(false)
  }

  const cellSize = Math.min(42, Math.floor(320 / W))

  return (
    <div style={{ position:'relative' }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ color:'#FBBF24',fontWeight:800,fontSize:13 }}>⭐ {score}</span>
        <div style={{ display:'flex',gap:12,alignItems:'center',fontSize:12 }}>
          {combo > 1 && <span style={{ color:'#F59E0B',fontWeight:900,fontSize:14 }}>×{combo} CHAIN!</span>}
          <span style={{ color:'#475569' }}>🎯 {moves} moves</span>
        </div>
      </div>

      {/* Atom legend */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:10 }}>
        {atoms.map((a,i) => (
          <div key={i} style={{ display:'flex',alignItems:'center',gap:4,padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:`${a.color}18`,border:`1px solid ${a.color}44`,color:a.color }}>
            {a.icon}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ position:'relative',overflowX:'auto' }}>
        <div style={{ display:'inline-grid',gridTemplateColumns:`repeat(${W},${cellSize}px)`,gap:3 }}>
          {grid.map((row, r) => row.map((val, c) => {
            const atom = atoms[val] || atoms[0]
            const isSel = sel && sel[0]===r && sel[1]===c
            const isLit = lit[r]?.[c]
            return (
              <button key={`${r}-${c}`} onClick={() => handleTap(r,c)}
                style={{
                  width:cellSize,height:cellSize,borderRadius:8,border:'none',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:cellSize>36?'0.75rem':'0.6rem',
                  transition:'all 0.15s',cursor:'pointer',
                  background: isLit ? atom.color : isSel ? `${atom.color}55` : `${atom.color}20`,
                  outline: isSel ? `2px solid ${atom.color}` : isLit ? `1px solid ${atom.color}` : `1px solid ${atom.color}30`,
                  boxShadow: isSel ? `0 0 12px ${atom.glow}` : isLit ? `0 0 8px ${atom.glow}` : 'none',
                  color: isLit ? '#fff' : atom.color,
                  transform: isLit ? 'scale(1.12)' : isSel ? 'scale(1.06)' : 'scale(1)',
                }}>
                {atom.icon}
              </button>
            )
          }))}
        </div>
        {phase==='over' && <Overlay title="Chain Reaction!" sub={`Final score: ${score}`} icon="⚛️" color={game.color} onRetry={restart} onExit={onFinish} game={game}/>}
      </div>
    </div>
  )
}
