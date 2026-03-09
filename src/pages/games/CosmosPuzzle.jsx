import { useState } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }

const PUZZLE_IMAGES = [
  { emoji: '🌌', label: 'Milky Way' },
  { emoji: '🪐', label: 'Saturn' },
  { emoji: '☀️', label: 'Solar System' },
  { emoji: '🚀', label: 'Launch' },
]

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

function CosmosPuzzle({ game, levelData, studentId, onFinish }) {
  const n = levelData.gridSize || 3
  const total = n * n
  const [theme] = useState(() => PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)])
  const [tiles, setTiles] = useState(() => {
    // Solved state: 0..total-1, where total-1 is blank
    const solved = Array.from({ length: total }, (_, i) => i)
    return shuffle(solved.slice(0, -1)).concat([total - 1])
  })
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState('playing')
  const [score, setScore] = useState(0)
  const [startTime] = useState(Date.now())

  const blankIdx = tiles.indexOf(total - 1)

  function canMove(idx) {
    const row = Math.floor(idx / n), col = idx % n
    const br = Math.floor(blankIdx / n), bc = blankIdx % n
    return (Math.abs(row - br) === 1 && col === bc) || (Math.abs(col - bc) === 1 && row === br)
  }

  function move(idx) {
    if (!canMove(idx) || phase !== 'playing') return
    const newTiles = [...tiles]
    ;SoundEngine.tileMove(); [newTiles[idx], newTiles[blankIdx]] = [newTiles[blankIdx], newTiles[idx]]
    setTiles(newTiles)
    setMoves(m => m + 1)
    // Check win
    if (newTiles.every((v, i) => v === i)) { SoundEngine.levelComplete();
      const elapsed = (Date.now() - startTime) / 1000
      const finalScore = Math.max(0, Math.round(5000 - moves * 10 - elapsed * 5))
      setScore(finalScore)
      setPhase('won')
      if (studentId) saveGameScore(studentId, game.id, levelData.level, finalScore)
    }
  }

  function restart() {
    const solved = Array.from({ length: total }, (_, i) => i)
    setTiles(shuffle(solved.slice(0, -1)).concat([total - 1]))
    setMoves(0); setPhase('playing'); setScore(0)
  }

  // Colour each tile based on position in solved puzzle
  const hues = Array.from({ length: total - 1 }, (_, i) =>
    Math.round((i / (total - 1)) * 240)
  )

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3 px-1">
        <ScoreBar score={score} best={0} />
        <span className="text-sm" style={{ color: '#94A3B8' }}>🔄 {moves} moves</span>
      </div>

      {/* Goal preview */}
      <div className="flex items-center gap-3 mb-3 p-2 rounded-xl" style={{ background: '#0F1629', border: '1px solid #1A2035' }}>
        <div className="text-3xl">{theme.emoji}</div>
        <div>
          <p className="text-xs text-slate-500">Goal: Restore the {theme.label}</p>
          <p className="text-xs text-slate-600">Numbers 1–{total-1} in order, blank at bottom-right</p>
        </div>
      </div>

      {/* Grid */}
      <div className="relative" style={{
        display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: '5px'
      }}>
        {tiles.map((val, idx) => {
          const isBlank = val === total - 1
          const solved = val === idx
          return (
            <button key={idx} onClick={() => move(idx)}
              disabled={isBlank}
              className="aspect-square rounded-xl flex items-center justify-center font-black text-xl transition-all duration-150 active:scale-95"
              style={{
                background: isBlank ? 'transparent'
                  : solved ? 'rgba(74,222,128,0.2)'
                  : `hsl(${hues[val] || 200}, 70%, 20%)`,
                border: isBlank ? '2px dashed #1A2035'
                  : solved ? '1px solid rgba(74,222,128,0.5)'
                  : `1px solid hsl(${hues[val] || 200}, 70%, 35%)`,
                color: solved ? '#4ADE80' : '#E2E8F0',
                boxShadow: canMove(idx) && !isBlank ? `0 0 12px ${game.color}44` : 'none',
                cursor: canMove(idx) && !isBlank ? 'pointer' : isBlank ? 'default' : 'not-allowed',
              }}>
              {isBlank ? '' : val + 1}
            </button>
          )
        })}

        {phase === 'won' && (
          <GameOverlay title="Star Map Restored!" subtitle={`${moves} moves · Score: ${score}`} icon={theme.emoji} color="#4ADE80">
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: game.color }}>Play Again</button>
              <button onClick={onFinish} className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: '#1A2035', color: '#94A3B8' }}>Exit</button>
            </div>
          </GameOverlay>
        )}
      </div>

      <button onClick={restart} className="mt-3 w-full py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#0F1629', color: '#94A3B8', border: '1px solid #1A2035' }}>
        🔀 Shuffle
      </button>
    </div>
  )
}


export default CosmosPuzzle
