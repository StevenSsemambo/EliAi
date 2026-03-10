import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Puzzle Generator ─────────────────────────────────────────────
// Classic Einstein / Zebra-style logic deduction puzzles
// Categories: People × Attributes. Use clues to deduce the full grid.

const PUZZLE_BANK = [
  // Puzzle 1 – 3 people, 2 attributes (starter)
  {
    title: 'The Three Students',
    categories: ['Student', 'Subject', 'Score'],
    items: [
      ['Alice', 'Bob', 'Carol'],
      ['Maths', 'Physics', 'Biology'],
      ['90', '75', '85'],
    ],
    solution: [[0,0,0],[1,1,2],[2,2,1]], // person i → attr[cat] = items[cat][solution[i][cat]]
    // solution: Alice→Maths→90, Bob→Physics→85, Carol→Biology→75
    solutionMap: { 0:[0,0,0], 1:[1,2,1], 2:[2,1,2] },
    clues: [
      'Alice does not study Physics.',
      'The Biology student scored 75.',
      'Bob scored higher than 75.',
      'Carol does not study Maths.',
    ],
  },
  {
    title: 'The Science Fair',
    categories: ['Student', 'Project', 'Award'],
    items: [
      ['David', 'Eve', 'Frank'],
      ['Volcano', 'Robot', 'Plant'],
      ['Gold', 'Silver', 'Bronze'],
    ],
    solutionMap: { 0:[0,0,0], 1:[1,1,1], 2:[2,2,2] },
    clues: [
      'David did not build the Robot.',
      'Eve won Silver.',
      'The Volcano project won Gold.',
      'Frank built the Plant project.',
    ],
  },
  {
    title: 'The Athletes',
    categories: ['Athlete', 'Sport', 'Position'],
    items: [
      ['Grace', 'Henry', 'Iris'],
      ['Football', 'Swimming', 'Running'],
      ['1st', '2nd', '3rd'],
    ],
    solutionMap: { 0:[0,0,0], 1:[1,1,1], 2:[2,2,2] },
    clues: [
      'Grace does not swim.',
      'The swimmer came 2nd.',
      'Henry runs.',
      'Iris did not come 1st.',
    ],
  },
  // 4-person puzzle
  {
    title: 'The Reading Club',
    categories: ['Member', 'Book', 'Day'],
    items: [
      ['Ana', 'Ben', 'Cara', 'Dan'],
      ['Novel', 'Poetry', 'History', 'Science'],
      ['Mon', 'Tue', 'Wed', 'Thu'],
    ],
    solutionMap: { 0:[0,0,0], 1:[1,1,1], 2:[2,2,2], 3:[3,3,3] },
    clues: [
      'Ana does not read Poetry.',
      'Ben reads on Tuesday.',
      'The History reader meets on Wednesday.',
      'Dan does not read Science.',
      'Cara reads Poetry.',
      'Ana meets on Monday.',
    ],
  },
  {
    title: 'The Tech Team',
    categories: ['Developer', 'Language', 'Level'],
    items: [
      ['Sam', 'Tina', 'Uma', 'Vic'],
      ['Python', 'Java', 'React', 'Swift'],
      ['Junior', 'Mid', 'Senior', 'Lead'],
    ],
    solutionMap: { 0:[0,0,0], 1:[1,1,1], 2:[2,2,2], 3:[3,3,3] },
    clues: [
      'Sam does not use Java.',
      'The React developer is Senior.',
      'Tina is Lead.',
      'The Swift developer is Junior.',
      'Uma uses Python.',
      'Vic is not Junior.',
    ],
  },
]

// Simple 3×3 deduction grid (who→attribute mapping)
// Player fills in a grid: for each (person, category) pick the attribute

function buildEmptyGrid(n, cats) {
  // grid[personIdx][catIdx] = selected attribute idx or null
  return Array.from({ length: n }, () => Array(cats).fill(null))
}

function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,6,14,0.97)',backdropFilter:'blur(10px)',borderRadius:16 }}>
      <div style={{ textAlign:'center',padding:'0 24px',maxWidth:300 }}>
        <div style={{ fontSize:54,marginBottom:10 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:6 }}>{title}</div>
        <div style={{ color,fontSize:14,marginBottom:24,lineHeight:1.5 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'11px 22px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer',fontSize:14 }}>Try Again</button>
          <button onClick={onExit}  style={{ padding:'11px 22px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#111827',border:'none',cursor:'pointer',fontSize:14 }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

export default function MindBridge({ game, levelData, studentId, onFinish }) {
  const { puzzleIdx = 0, timeLimit = 180 } = levelData

  const puzzle = PUZZLE_BANK[Math.min(puzzleIdx, PUZZLE_BANK.length - 1)]
  const n = puzzle.items[0].length   // number of people
  const numCats = puzzle.categories.length - 1  // exclude 'Person' row

  // grid[personIdx][catIdx] = chosen attribute index (0..n-1) or null
  const [grid, setGrid]       = useState(() => buildEmptyGrid(n, numCats))
  const [phase, setPhase]     = useState('playing')
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [score, setScore]     = useState(0)
  const [errors, setErrors]   = useState([])   // [personIdx, catIdx] cells that are wrong
  const [hint, setHint]       = useState(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); endGame(false); return 0 }
      if (s <= 15) SoundEngine.timerTick(s <= 5 ? 3 : 2)
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase])

  function select(personIdx, catIdx, attrIdx) {
    if (phase !== 'playing') return
    SoundEngine.tap()
    const ng = grid.map(r => [...r])
    ng[personIdx][catIdx] = ng[personIdx][catIdx] === attrIdx ? null : attrIdx
    setGrid(ng)
    setErrors([])
  }

  function checkSolution() {
    const wrong = []
    for (let p = 0; p < n; p++) {
      for (let c = 0; c < numCats; c++) {
        const expected = puzzle.solutionMap[p][c + 1] // +1 to skip Person category
        if (grid[p][c] !== expected) wrong.push([p, c])
      }
    }
    if (wrong.length === 0) {
      SoundEngine.levelComplete()
      const elapsed = (Date.now() - startRef.current) / 1000
      const fs = Math.max(50, Math.round(1000 - elapsed * 2 - hintsUsed * 80))
      setScore(fs)
      setPhase('won')
      if (studentId) saveGameScore(studentId, game.id, levelData.level, fs)
    } else {
      SoundEngine.gameWrong()
      setErrors(wrong)
      setTimeout(() => setErrors([]), 1500)
    }
  }

  function useHint() {
    // Find first unfilled or wrong cell and fill it
    for (let p = 0; p < n; p++) {
      for (let c = 0; c < numCats; c++) {
        const expected = puzzle.solutionMap[p][c + 1]
        if (grid[p][c] !== expected) {
          SoundEngine.tap()
          const ng = grid.map(r => [...r])
          ng[p][c] = expected
          setGrid(ng)
          setHintsUsed(h => h + 1)
          setHint(`${puzzle.items[0][p]} → ${puzzle.items[c+1][expected]}`)
          setTimeout(() => setHint(null), 2000)
          return
        }
      }
    }
  }

  function endGame(won) {
    if (!won) setPhase('lost')
  }

  function restart() {
    setGrid(buildEmptyGrid(n, numCats))
    setPhase('playing'); setTimeLeft(timeLimit); setScore(0)
    setErrors([]); setHintsUsed(0); setHint(null)
    startRef.current = Date.now()
  }

  const timerPct = (timeLeft / timeLimit) * 100
  const tc = timeLeft > timeLimit * 0.5 ? '#4ADE80' : timeLeft > timeLimit * 0.2 ? '#F59E0B' : '#EF4444'
  const filled = grid.flat().filter(v => v !== null).length
  const total  = n * numCats

  return (
    <div style={{ position:'relative', fontFamily:'system-ui,sans-serif' }}>
      <style>{`
        .mb-cell { transition: all 0.15s; }
        .mb-cell:hover { filter: brightness(1.15); transform: scale(1.04); }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .mb-shake { animation: shake 0.35s ease; }
      `}</style>

      {/* Timer & score */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ color:'#FBBF24',fontWeight:800,fontSize:13 }}>⭐ {score}</span>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <span style={{ color:'#475569',fontSize:11 }}>{filled}/{total} filled</span>
          <span style={{ color:tc,fontWeight:800,fontFamily:'monospace',fontSize:13 }}>{timeLeft}s</span>
        </div>
      </div>
      <div style={{ height:4,borderRadius:99,background:'#0F1629',marginBottom:14 }}>
        <div style={{ height:'100%',borderRadius:99,width:`${timerPct}%`,background:tc,transition:'width 1s linear,background 0.4s' }}/>
      </div>

      {/* Puzzle title */}
      <div style={{ color:'white',fontWeight:900,fontSize:16,marginBottom:4 }}>{puzzle.title}</div>

      {/* Clues */}
      <div style={{ marginBottom:14,padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642' }}>
        <div style={{ color:'#64748B',fontSize:10,fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:1 }}>Clues</div>
        {puzzle.clues.map((clue, i) => (
          <div key={i} style={{ color:'#94A3B8',fontSize:12,marginBottom:3,paddingLeft:8,borderLeft:`2px solid ${game.color}55` }}>
            {clue}
          </div>
        ))}
      </div>

      {/* Hint banner */}
      {hint && (
        <div style={{ marginBottom:10,padding:'8px 12px',borderRadius:8,background:`${game.color}22`,border:`1px solid ${game.color}55`,color:game.color,fontSize:12,fontWeight:700,textAlign:'center' }}>
          💡 {hint}
        </div>
      )}

      {/* Deduction grid */}
      <div style={{ overflowX:'auto', marginBottom:12 }}>
        <table style={{ borderCollapse:'separate',borderSpacing:3,width:'100%' }}>
          <thead>
            <tr>
              <th style={{ color:'#475569',fontSize:10,fontWeight:700,textAlign:'left',padding:'4px 6px',textTransform:'uppercase' }}>
                {puzzle.categories[0]}
              </th>
              {puzzle.categories.slice(1).map((cat, ci) => (
                <th key={ci} style={{ color:'#475569',fontSize:10,fontWeight:700,textAlign:'center',padding:'4px 6px',textTransform:'uppercase' }}>
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {puzzle.items[0].map((person, pi) => (
              <tr key={pi}>
                {/* Person label */}
                <td style={{ color:'white',fontWeight:700,fontSize:13,padding:'4px 6px',whiteSpace:'nowrap' }}>
                  {person}
                </td>
                {/* Attribute selector for each category */}
                {Array.from({ length: numCats }, (_, ci) => {
                  const isError = errors.some(([ep, ec]) => ep===pi && ec===ci)
                  const selected = grid[pi][ci]
                  return (
                    <td key={ci} style={{ padding:2 }}>
                      <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
                        {puzzle.items[ci + 1].map((attr, ai) => {
                          const isSel = selected === ai
                          return (
                            <button key={ai}
                              className={`mb-cell${isError && isSel ? ' mb-shake' : ''}`}
                              onClick={() => select(pi, ci, ai)}
                              style={{
                                padding:'5px 8px',borderRadius:7,border:'none',cursor:'pointer',
                                fontSize:11,fontWeight:700,whiteSpace:'nowrap',
                                background: isSel
                                  ? (isError ? 'rgba(239,68,68,0.35)' : `${game.color}35`)
                                  : 'rgba(255,255,255,0.04)',
                                outline: isSel
                                  ? (isError ? '1px solid rgba(239,68,68,0.7)' : `1px solid ${game.color}88`)
                                  : '1px solid rgba(255,255,255,0.06)',
                                color: isSel ? (isError ? '#FCA5A5' : 'white') : '#475569',
                              }}>
                              {attr}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex',gap:8 }}>
        <button onClick={useHint}
          style={{ flex:1,padding:'10px',borderRadius:10,fontWeight:700,fontSize:12,color:'#F59E0B',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',cursor:'pointer' }}>
          💡 Hint ({hintsUsed} used)
        </button>
        <button onClick={checkSolution}
          disabled={filled < total}
          style={{ flex:2,padding:'10px',borderRadius:10,fontWeight:800,fontSize:13,color:'white',background:filled<total?'#1A2642':game.color,border:'none',cursor:filled<total?'not-allowed':'pointer',opacity:filled<total?0.5:1 }}>
          ✓ Submit Solution
        </button>
      </div>

      {phase==='won'  && <Overlay icon="🧠" title="Logic Master!" sub={`Solved in ${Math.round((timeLimit-timeLeft))}s · ${score} pts · ${hintsUsed} hint${hintsUsed!==1?'s':''} used`} color="#4ADE80" onRetry={restart} onExit={onFinish} game={game}/>}
      {phase==='lost' && <Overlay icon="⏰" title="Time's Up!" sub="The puzzle wasn't solved in time. Study the clues carefully." color="#EF4444" onRetry={restart} onExit={onFinish} game={game}/>}
    </div>
  )
}
