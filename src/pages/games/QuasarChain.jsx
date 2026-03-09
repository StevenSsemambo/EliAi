import { useState, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const ATOM_COLORS = [
  { name: 'Hydrogen',  color: '#EF4444', glow: 'rgba(239,68,68,0.5)',   icon: 'H'  },
  { name: 'Helium',    color: '#F59E0B', glow: 'rgba(245,158,11,0.5)',  icon: 'He' },
  { name: 'Carbon',    color: '#10B981', glow: 'rgba(16,185,129,0.5)',  icon: 'C'  },
  { name: 'Nitrogen',  color: '#3B82F6', glow: 'rgba(59,130,246,0.5)', icon: 'N'  },
  { name: 'Oxygen',    color: '#8B5CF6', glow: 'rgba(139,92,246,0.5)', icon: 'O'  },
  { name: 'Silicon',   color: '#06B6D4', glow: 'rgba(6,182,212,0.5)',  icon: 'Si' },
]

function makeGrid(w, h, numColors) {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => Math.floor(Math.random() * numColors))
  )
}

function findMatches(grid, w, h) {
  const matched = Array.from({ length: h }, () => Array(w).fill(false))
  // Horizontal
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w - 2; c++) {
      const v = grid[r][c]
      if (v !== -1 && grid[r][c+1] === v && grid[r][c+2] === v) {
        let end = c + 2
        while (end + 1 < w && grid[r][end+1] === v) end++
        for (let x = c; x <= end; x++) matched[r][x] = true
      }
    }
  }
  // Vertical
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h - 2; r++) {
      const v = grid[r][c]
      if (v !== -1 && grid[r+1][c] === v && grid[r+2][c] === v) {
        let end = r + 2
        while (end + 1 < h && grid[end+1][c] === v) end++
        for (let y = r; y <= end; y++) matched[y][c] = true
      }
    }
  }
  return matched
}

function applyGravity(grid, w, h) {
  const newGrid = grid.map(r => [...r])
  for (let c = 0; c < w; c++) {
    const col = []
    for (let r = h - 1; r >= 0; r--) if (newGrid[r][c] !== -1) col.push(newGrid[r][c])
    while (col.length < h) col.push(Math.floor(Math.random() * 6))
    for (let r = h - 1; r >= 0; r--) newGrid[r][c] = col[h - 1 - r]
  }
  return newGrid
}

function ScoreBar({ score, best }) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="font-bold text-white">⭐ {score}</span>
      {best > 0 && <span style={{ color: '#F59E0B' }}>Best: {best}</span>}
    </div>
  )
}

function GameOverlay({ title, subtitle, icon, color, children }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl"
      style={{ background: 'rgba(5,8,16,0.92)', backdropFilter: 'blur(4px)' }}>
      <div className="text-center px-6">
        <div className="text-6xl mb-3">{icon}</div>
        <h2 className="text-2xl font-black text-white mb-1">{title}</h2>
        <p className="mb-6" style={{ color }}>{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

function QuasarChain({ game, levelData, studentId, onFinish }) {
  const { gridW: W, gridH: H, colors: numColors } = levelData
  const [grid, setGrid] = useState(() => makeGrid(W, H, numColors))
  const [sel, setSel] = useState(null)
  const [highlighted, setHighlighted] = useState([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [moves, setMoves] = useState(20)
  const [phase, setPhase] = useState('playing')
  const [animating, setAnimating] = useState(false)

  const atoms = ATOM_COLORS.slice(0, numColors)

  function handleTap(r, c) {
    if (animating || phase !== 'playing') return
    if (!sel) { setSel([r, c]); return }
    const [sr, sc] = sel
    if (sr === r && sc === c) { setSel(null); return }
    // Check adjacent
    const adj = (Math.abs(r - sr) === 1 && c === sc) || (Math.abs(c - sc) === 1 && r === sr)
    if (!adj) { setSel([r, c]); return }

    // Swap
    const newGrid = grid.map(row => [...row])
    ;[newGrid[r][c], newGrid[sr][sc]] = [newGrid[sr][sc], newGrid[r][c]]
    setSel(null)

    const matches = findMatches(newGrid, W, H)
    const hasMatch = matches.some(row => row.some(Boolean))
    if (!hasMatch) { setGrid(newGrid); setMoves(m => m - 1); if (moves <= 1) endGame(newGrid); return }

    setAnimating(true)
    resolveMatches(newGrid, 0)
  }

  function resolveMatches(g, depth) {
    const matches = findMatches(g, W, H)
    const count = matches.flat().filter(Boolean).length
    if (count === 0) {
      setGrid(g)
      setAnimating(false)
      const newMoves = moves - 1
      setMoves(newMoves)
      setCombo(0)
      if (newMoves <= 0) endGame(g)
      return
    }
    SoundEngine.combo(depth+1); const pts = count * 10 * (1 + depth * 0.5)
    setScore(s => s + Math.round(pts))
    setCombo(depth + 1)
    setHighlighted(matches)

    setTimeout(() => {
      // Clear matched
      const cleared = g.map((row, r) => row.map((v, c) => matches[r][c] ? -1 : v))
      const settled = applyGravity(cleared, W, H)
      setHighlighted([])
      setGrid(settled)
      setTimeout(() => resolveMatches(settled, depth + 1), 200)
    }, 500)
  }

  function endGame(g) {
    const finalScore = score
    SoundEngine.levelComplete(); setPhase('over')
    if (studentId) saveGameScore(studentId, game.id, levelData.level, finalScore)
  }

  function restart() {
    setGrid(makeGrid(W, H, numColors))
    setSel(null); setScore(0); setCombo(0); setMoves(20); setPhase('playing'); setAnimating(false)
  }

  const cellSize = Math.min(44, Math.floor(340 / W))

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 px-1">
        <ScoreBar score={score} best={0} />
        <div className="flex items-center gap-3 text-sm">
          {combo > 1 && <span className="font-black animate-bounce" style={{ color: '#F59E0B' }}>×{combo} COMBO!</span>}
          <span style={{ color: '#94A3B8' }}>🎯 {moves} moves</span>
        </div>
      </div>

      {/* Atom legend */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {atoms.map((a, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: a.color + '22', border: `1px solid ${a.color}44`, color: a.color }}>
            {a.icon}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative overflow-auto">
        <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${W}, ${cellSize}px)`, gap: '3px' }}>
          {grid.map((row, r) =>
            row.map((val, c) => {
              const atom = atoms[val] || atoms[0]
              const isSelected = sel && sel[0] === r && sel[1] === c
              const isHighlighted = highlighted[r]?.[c]
              return (
                <button key={`${r}-${c}`} onClick={() => handleTap(r, c)}
                  className="rounded-lg flex items-center justify-center font-black transition-all duration-150"
                  style={{
                    width: cellSize, height: cellSize,
                    fontSize: cellSize > 36 ? '0.75rem' : '0.6rem',
                    background: isHighlighted ? atom.color : isSelected ? atom.color + '55' : atom.color + '22',
                    border: isSelected ? `2px solid ${atom.color}` : `1px solid ${atom.color}44`,
                    boxShadow: isSelected ? `0 0 12px ${atom.glow}` : isHighlighted ? `0 0 8px ${atom.glow}` : 'none',
                    color: isHighlighted ? '#fff' : atom.color,
                    transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
                  }}>
                  {atom.icon}
                </button>
              )
            })
          )}
        </div>

        {phase === 'over' && (
          <GameOverlay title="Mission Complete" subtitle={`Final Score: ${score}`} icon="⚛️" color="#059669">
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: game.color }}>Play Again</button>
              <button onClick={onFinish} className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: '#1A2035', color: '#94A3B8' }}>Exit</button>
            </div>
          </GameOverlay>
        )}
      </div>
    </div>
  )
}


export default QuasarChain
