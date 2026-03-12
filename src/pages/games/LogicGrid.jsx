import { useState, useEffect, useRef, useCallback } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'
import { SoundEngine } from '../../utils/soundEngine.js'

// ── Sudoku-style Latin Square Generator ──────────────────────────
function generateLatinSquare(n) {
  // Base pattern: row i has values (i + j) % n in col j
  const base = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i + j) % n + 1)
  )
  // Shuffle rows and columns
  const shuffleArr = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }
  const rowOrder = shuffleArr(Array.from({length:n},(_,i)=>i))
  const colOrder = shuffleArr(Array.from({length:n},(_,i)=>i))
  return rowOrder.map(r => colOrder.map(c => base[r][c]))
}

// Count how many valid solutions exist (stop at 2 — we only need to know if unique)
function countSolutions(grid, n) {
  function solve(pos, count) {
    if (count > 1) return count
    if (pos === n * n) return count + 1
    const row = Math.floor(pos / n), col = pos % n
    if (grid[row][col] !== 0) return solve(pos + 1, count)
    for (let v = 1; v <= n; v++) {
      let ok = true
      for (let i = 0; i < n && ok; i++) {
        if (grid[row][i] === v || grid[i][col] === v) ok = false
      }
      if (ok) {
        grid[row][col] = v
        count = solve(pos + 1, count)
        grid[row][col] = 0
      }
    }
    return count
  }
  return solve(0, 0)
}

function generatePuzzle(gridSize, clueRatio) {
  const solution = generateLatinSquare(gridSize)
  const total = gridSize * gridSize
  const targetClues = Math.max(gridSize * 2, Math.round(total * clueRatio / 100))

  // Start with all cells revealed, then remove one by one while solution remains unique
  const revealed = new Set(Array.from({ length: total }, (_, i) => i))

  // Shuffle removal order
  const removalOrder = [...revealed].sort(() => Math.random() - 0.5)

  for (const pos of removalOrder) {
    if (revealed.size <= targetClues) break
    revealed.delete(pos)
    // Check if still unique
    const testGrid = solution.map((row, r) =>
      row.map((val, c) => revealed.has(r * gridSize + c) ? val : 0)
    )
    if (countSolutions(testGrid.map(r => [...r]), gridSize) !== 1) {
      revealed.add(pos) // put it back
    }
  }

  const puzzle = solution.map((row, r) =>
    row.map((val, c) => ({
      value: val,
      given: revealed.has(r * gridSize + c),
      userValue: null,
      error: false,
    }))
  )
  return { puzzle, solution }
}

function HowToPlayGrid({ game, onStart, levelData }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌀</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Logic Grid</div>
      </div>
      {[
        ['🔣', 'Alien symbols', 'Each symbol ①②③ must appear exactly once in every row and every column — like Sudoku.'],
        ['👁', 'Given clues', 'Some cells are pre-filled. Use them as your starting point.'],
        ['🔢', 'Fill the blanks', 'Tap an empty cell to cycle through symbols until the grid is complete.'],
        ['⚠️', 'No repeats', 'If a symbol already appears in the same row or column, you can\'t place it there.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#67E8F9', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Find rows or columns with only one empty cell — fill those first<br/>
          • If a symbol appears in 2 of 3 rows in a column, the 3rd row must have it<br/>
          • Wrong answers turn red — tap again to change
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[['Grid', `${levelData.gridSize}×${levelData.gridSize}`, '#06B6D4'], ['Time', `${levelData.timeLimit}s`, '#F59E0B']].map(([l,v,c]) => (
          <div key={l} style={{ background: '#0F1629', border: `1px solid ${c}33`, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: c }}>{v}</div>
            <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${game.color}, #0369A1)` }}>
        Start Game →
      </button>
    </div>
  )
}

function isComplete(puzzle, solution) {
  return puzzle.every((row, r) => row.every((cell, c) =>
    cell.given ? true : cell.userValue === solution[r][c]
  ))
}

function checkErrors(puzzle, solution) {
  return puzzle.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      error: !cell.given && cell.userValue !== null && cell.userValue !== solution[r][c]
    }))
  )
}

// Alien symbols for each number 1-9
const SYMBOLS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨']
const COLORS_BY_VAL = ['#7C3AED','#0891B2','#059669','#F59E0B','#EC4899','#EF4444','#06B6D4','#84CC16','#F97316']

export default function LogicGrid({ game, levelData, studentId, onFinish }) {
  const { gridSize, clueRatio, timeLimit } = levelData

  const [screen, setScreen]     = useState('guide')
  const [phase, setPhase]       = useState('ready')
  const [puzzle, setPuzzle]     = useState(null)
  const [solution, setSolution] = useState(null)
  const [selected, setSelected] = useState(null)  // [r,c]
  const [timeLeft, setTimeLeft] = useState(timeLimit || 0)
  const [moves, setMoves]       = useState(0)
  const [errors, setErrors]     = useState(0)
  const [score, setScore]       = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [showNumbers, setShowNumbers] = useState(false) // toggle symbols↔numbers

  const cellSize = gridSize <= 4 ? 72 : gridSize <= 6 ? 58 : gridSize <= 7 ? 50 : 44

  function start() {
    const { puzzle: p, solution: s } = generatePuzzle(gridSize, clueRatio)
    setPuzzle(p); setSolution(s)
    setSelected(null); setMoves(0); setErrors(0)
    setTimeLeft(timeLimit || 0)
    setStartTime(Date.now())
    setPhase('playing')
  }

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing' || !timeLimit) return
    if (timeLeft <= 0) { endGame(false); return }
    const t = setInterval(() => setTimeLeft(s => { if (s <= 1) { clearInterval(t); endGame(false); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [phase, timeLeft, timeLimit])

  function endGame(won) {
    const elapsed = (Date.now() - startTime) / 1000
    const pts = won
      ? Math.max(0, Math.round(5000 + (timeLimit ? timeLeft * 10 : 300) - moves * 5 - errors * 50))
      : Math.round(moves * 2)
    setScore(pts)
    if(won) SoundEngine.levelComplete()
    setPhase(won ? 'win' : 'timeout')
    if (studentId) saveGameScore(studentId, game.id, levelData.level, pts)
  }

  function placeValue(val) {
    if (!selected || phase !== 'playing') return
    const [r, c] = selected
    if (puzzle[r][c].given) return

    const newPuzzle = puzzle.map((row, ri) =>
      row.map((cell, ci) => {
        if (ri === r && ci === c) return { ...cell, userValue: val === cell.userValue ? null : val }
        return cell
      })
    )
    setMoves(m => m + 1)

    const checked = checkErrors(newPuzzle, solution)
    const errCount = checked.flat().filter(c => c.error).length
    setErrors(errCount)
    setPuzzle(checked)

    if (isComplete(checked, solution)) { SoundEngine.gameCorrect(); endGame(true) } else { SoundEngine.tileMove() }
  }

  const timerPct = timeLimit ? (timeLeft / timeLimit) * 100 : 100
  const timerColor = timerPct > 50 ? '#4ADE80' : timerPct > 20 ? '#F59E0B' : '#EF4444'

  if (screen === 'guide') return <HowToPlayGrid game={game} onStart={() => setScreen('playing')} levelData={levelData} />

  return (
    <div className="relative">
      <style>{`
        @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes cellPop { from{transform:scale(1.3)} to{transform:scale(1)} }
      `}</style>

      {/* READY */}
      {phase === 'ready' && (
        <div className="text-center py-4">
          <div className="text-5xl mb-3">🌀</div>
          <h3 className="text-white font-black text-xl mb-1">{levelData.name}</h3>
          <p className="text-slate-400 text-sm mb-4">Fill the grid so every row and column contains each symbol exactly once.</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[['Grid', `${gridSize}×${gridSize}`, game.color], ['Clues', `${clueRatio}%`, '#7C3AED'], ['Time', timeLimit ? `${timeLimit}s` : '∞', '#F59E0B']].map(([l,v,c]) => (
              <div key={l} className="rounded-xl p-2 text-center" style={{ background:'#0F1629', border:`1px solid ${c}33` }}>
                <div className="font-black text-sm" style={{ color:c }}>{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mb-5">Using alien symbols — tap a cell, tap a symbol to fill it</p>
          <button onClick={start} className="w-full py-4 rounded-2xl font-black text-lg text-white"
            style={{ background:`linear-gradient(135deg, ${game.color}, #7C3AED)` }}>
            🌀 Start Decoding
          </button>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'playing' && puzzle && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-sm font-bold" style={{ color: game.color }}>⭐ Moves: {moves}</div>
            {timeLimit > 0 && (
              <div className="font-mono font-black text-sm" style={{ color: timerColor }}>{timeLeft}s</div>
            )}
            <div className="text-sm" style={{ color: errors > 0 ? '#EF4444' : '#4ADE80' }}>
              {errors > 0 ? `⚠ ${errors} error${errors > 1 ? 's' : ''}` : '✓ Clean'}
            </div>
          </div>

          {timeLimit > 0 && (
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background:'#1A2035' }}>
              <div className="h-full rounded-full transition-all" style={{ width:`${timerPct}%`, background:timerColor, transition:'width 1s linear' }} />
            </div>
          )}

          {/* Grid */}
          <div className="flex justify-center mb-3 overflow-auto">
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${gridSize}, ${cellSize}px)`, gap:3 }}>
              {puzzle.map((row, r) =>
                row.map((cell, c) => {
                  const isSel = selected && selected[0]===r && selected[1]===c
                  const val = cell.given ? cell.value : cell.userValue
                  const col = val ? COLORS_BY_VAL[val - 1] : null
                  const sameVal = selected && val && puzzle[selected[0]][selected[1]]?.userValue === val
                  return (
                    <button key={`${r}-${c}`}
                      onClick={() => !cell.given && setSelected(isSel ? null : [r, c])}
                      className="flex items-center justify-center rounded-lg font-black transition-all"
                      style={{
                        width: cellSize, height: cellSize,
                        fontSize: cellSize > 58 ? '1.4rem' : cellSize > 44 ? '1.1rem' : '0.9rem',
                        background: isSel ? `${game.color}33` : cell.error ? 'rgba(239,68,68,0.15)' : sameVal ? `${col}18` : cell.given ? '#0F1629' : '#0A0D18',
                        border: isSel ? `2px solid ${game.color}` : cell.error ? '1px solid rgba(239,68,68,0.5)' : cell.given ? '1px solid #252D45' : '1px solid #1A2035',
                        color: cell.given ? (col || '#94A3B8') : cell.error ? '#EF4444' : (col || 'transparent'),
                        cursor: cell.given ? 'default' : 'pointer',
                        boxShadow: isSel ? `0 0 12px ${game.color}66` : 'none',
                        animation: val && !cell.given ? 'cellPop 0.2s ease' : 'none',
                        fontWeight: cell.given ? 900 : 700,
                        opacity: cell.given ? 1 : val ? 1 : 0.3,
                      }}>
                      {val ? (showNumbers ? val : SYMBOLS[val - 1]) : (cell.given ? '?' : '·')}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Number pad */}
          {selected && !puzzle[selected[0]][selected[1]].given && (
            <div className="mb-3">
              <p className="text-xs text-center text-slate-500 mb-2">Tap to fill cell ({selected[0]+1},{selected[1]+1})</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {Array.from({ length: gridSize }, (_, i) => i + 1).map(v => {
                  const col = COLORS_BY_VAL[v - 1]
                  return (
                    <button key={v} onClick={() => placeValue(v)}
                      className="w-10 h-10 rounded-xl font-black text-base flex items-center justify-center transition-all active:scale-90"
                      style={{ background:`${col}22`, border:`1px solid ${col}55`, color:col }}>
                      {showNumbers ? v : SYMBOLS[v - 1]}
                    </button>
                  )
                })}
                <button onClick={() => placeValue(null)}
                  className="w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center"
                  style={{ background:'#1A2035', color:'#3A4560' }}>✕</button>
              </div>
            </div>
          )}

          {/* Hint legend */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-600">Each symbol appears once per row & column</p>
            <button onClick={() => setShowNumbers(n => !n)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background:'#1A2035', color:'#94A3B8' }}>
              {showNumbers ? '① Symbols' : '1 Numbers'}
            </button>
          </div>
        </div>
      )}

      {/* WIN */}
      {phase === 'win' && (
        <div className="text-center py-6" style={{ animation:'popIn 0.5s ease' }}>
          <div className="text-5xl mb-3">🏆</div>
          <h3 className="text-white font-black text-xl mb-1">Grid Decoded!</h3>
          <p className="text-slate-400 text-sm mb-2">{moves} moves · {errors} errors</p>
          <p className="font-black text-3xl text-white mb-5">⭐ {score}</p>
          <div className="flex gap-3">
            <button onClick={start} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background:game.color }}>New Grid</button>
            <button onClick={onFinish} className="flex-1 py-3 rounded-2xl font-bold" style={{ background:'#1A2035', color:'#94A3B8' }}>Exit</button>
          </div>
        </div>
      )}

      {/* TIMEOUT */}
      {phase === 'timeout' && (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">⏰</div>
          <h3 className="text-white font-black text-xl mb-1">Time Warped Out</h3>
          <p className="text-slate-400 text-sm mb-2">The grid collapsed — try again!</p>
          <p className="font-black text-2xl text-white mb-5">⭐ {score}</p>
          <div className="flex gap-3">
            <button onClick={start} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background:game.color }}>Try Again</button>
            <button onClick={onFinish} className="flex-1 py-3 rounded-2xl font-bold" style={{ background:'#1A2035', color:'#94A3B8' }}>Exit</button>
          </div>
        </div>
      )}
    </div>
  )
}
