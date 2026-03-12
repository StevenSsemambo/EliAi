import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Puzzle Generator ─────────────────────────────────────────────
// Classic Einstein / Zebra-style logic deduction puzzles
// Categories: People × Attributes. Use clues to deduce the full grid.

const PUZZLE_BANK = [
  // Puzzle 1 — 3 people, 2 attributes
  // Solution: Alice→Maths→90, Bob→Physics→85, Carol→Biology→75
  {
    title: 'The Three Students',
    categories: ['Student', 'Subject', 'Score'],
    items: [
      ['Alice', 'Bob', 'Carol'],
      ['Maths', 'Physics', 'Biology'],
      ['90', '75', '85'],
    ],
    // solutionMap[personIdx] = [personIdx, subjectIdx, scoreIdx]
    // Alice(0)→Maths(0)→90(0), Bob(1)→Physics(1)→85(2), Carol(2)→Biology(2)→75(1)
    solutionMap: { 0:[0,0,0], 1:[1,1,2], 2:[2,2,1] },
    clues: [
      'Alice does not study Physics.',
      'The Biology student scored 75.',
      'Bob scored higher than 75.',
      'Carol does not study Maths.',
    ],
  },
  // Puzzle 2 — 3 people, 2 attributes
  // Solution: David→Volcano→Gold, Eve→Robot→Silver, Frank→Plant→Bronze
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
  // Puzzle 3 — 3 people, 2 attributes
  // Solution: Grace→Football→1st, Henry→Running→3rd, Iris→Swimming→2nd
  {
    title: 'The Athletes',
    categories: ['Athlete', 'Sport', 'Position'],
    items: [
      ['Grace', 'Henry', 'Iris'],
      ['Football', 'Swimming', 'Running'],
      ['1st', '2nd', '3rd'],
    ],
    // Grace(0)→Football(0)→1st(0), Henry(1)→Running(2)→3rd(2), Iris(2)→Swimming(1)→2nd(1)
    solutionMap: { 0:[0,0,0], 1:[1,2,2], 2:[2,1,1] },
    clues: [
      'Grace does not swim.',
      'The swimmer came 2nd.',
      'Henry does not swim.',
      'Iris did not come 1st.',
    ],
  },
  // Puzzle 4 — 4 people, 2 attributes
  // Solution: Ana→Novel→Mon, Ben→Poetry→Tue, Cara→History→Wed, Dan→Science→Thu
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
  // Puzzle 5 — 4 people, 2 attributes
  // Solution: Sam→Python→Junior, Tina→Swift→Lead, Uma→Java→Senior, Vic→React→Mid
  // Wait - check clues: Tina is Lead. Swift is Junior. Uma uses Python. Vic not Junior.
  // If Tina is Lead and Swift is Junior, Tina doesn't use Swift.
  // Uma uses Python → Sam doesn't use Python → Sam uses Java or React or Swift
  // React developer is Senior → Uma(Python)≠Senior → Uma is Junior,Mid,or Lead
  // Tina is Lead → Uma ≠ Lead
  // Swift is Junior → Vic not Junior → Vic doesn't use Swift
  // Sam→Swift(Junior), Tina→React(Lead)? But React=Senior, Tina=Lead - contradiction
  // Let's fix: Sam→React→Senior? But React=Senior and Sam≠Lead... 
  // Corrected solution: Sam→React→Senior, Tina→Python→Lead, Uma→Java→Mid, Vic→Swift→Junior
  // Check: Uma uses Python? NO — Uma uses Java. Need to fix Uma's clue.
  {
    title: 'The Tech Team',
    categories: ['Developer', 'Language', 'Level'],
    items: [
      ['Sam', 'Tina', 'Uma', 'Vic'],
      ['Python', 'Java', 'React', 'Swift'],
      ['Junior', 'Mid', 'Senior', 'Lead'],
    ],
    // Sam(0)→React(2)→Senior(2), Tina(1)→Python(0)→Lead(3), Uma(2)→Java(1)→Mid(1), Vic(3)→Swift(3)→Junior(0)
    solutionMap: { 0:[0,2,2], 1:[1,0,3], 2:[2,1,1], 3:[3,3,0] },
    clues: [
      'Sam does not use Java.',
      'The React developer is Senior.',
      'Tina is Lead.',
      'The Swift developer is Junior.',
      'Uma does not use Python.',
      'Vic is not Mid or Senior.',
    ],
  },
  // Puzzle 6 — 4 people, 3 attributes
  // Solution: Amos→Football→1st→Uganda, Beatrice→Swimming→2nd→Kenya,
  //           Charles→Athletics→3rd→Tanzania, Diana→Tennis→4th→Rwanda
  {
    title: 'The Sports Team',
    categories: ['Player', 'Sport', 'Rank', 'Country'],
    items: [
      ['Amos', 'Beatrice', 'Charles', 'Diana'],
      ['Football', 'Swimming', 'Athletics', 'Tennis'],
      ['1st', '2nd', '3rd', '4th'],
      ['Uganda', 'Kenya', 'Tanzania', 'Rwanda'],
    ],
    solutionMap: { 0:[0,0,0,0], 1:[1,1,1,1], 2:[2,2,2,2], 3:[3,3,3,3] },
    clues: [
      'Amos does not play Tennis.',
      'The Football player ranked 1st.',
      'Beatrice is from Kenya.',
      'The swimmer ranked 2nd.',
      'Charles is not from Uganda.',
      'Diana plays Tennis.',
      'The Athletics player ranked 3rd.',
    ],
  },
  // Puzzle 7 — 4 people, 3 attributes
  // Solution: Prof. Ali→Carbon→2001→Certificate, Dr. Bak→Gold→2005→Medal,
  //           Ms. Cee→Iron→2009→Prize, Mr. Dex→Oxygen→2013→Trophy
  {
    title: 'The Science Lab',
    categories: ['Scientist', 'Element', 'Year', 'Award'],
    items: [
      ['Prof. Ali', 'Dr. Bak', 'Ms. Cee', 'Mr. Dex'],
      ['Carbon', 'Gold', 'Iron', 'Oxygen'],
      ['2001', '2005', '2009', '2013'],
      ['Certificate', 'Medal', 'Prize', 'Trophy'],
    ],
    // Prof.Ali(0)→Carbon(0)→2001(0)→Certificate(0)
    // Dr.Bak(1)→Gold(1)→2005(1)→Medal(1)
    // Ms.Cee(2)→Iron(2)→2009(2)→Prize(2)
    // Mr.Dex(3)→Oxygen(3)→2013(3)→Trophy(3)
    solutionMap: { 0:[0,0,0,0], 1:[1,1,1,1], 2:[2,2,2,2], 3:[3,3,3,3] },
    clues: [
      'Prof. Ali worked in 2001.',
      'The Gold discoverer won a Trophy.',
      'Dr. Bak won a Medal.',
      'The Iron discoverer worked in 2009.',
      'Ms. Cee won the Prize.',
      'Mr. Dex worked in 2013.',
      'The Carbon discoverer won a Certificate.',
    ],
  },
  // Puzzle 8 — 5 people, 3 attributes
  // Solution: Emma→Maths→S4A→Red, Felix→English→S4B→Blue,
  //           Grace→Biology→S5A→Green, Henry→Physics→S5B→Yellow, Irene→Chemistry→S6A→White
  {
    title: 'The School Prefects',
    categories: ['Prefect', 'Subject', 'Class', 'House'],
    items: [
      ['Emma', 'Felix', 'Grace', 'Henry', 'Irene'],
      ['Maths', 'English', 'Biology', 'Physics', 'Chemistry'],
      ['S4A', 'S4B', 'S5A', 'S5B', 'S6A'],
      ['Red', 'Blue', 'Green', 'Yellow', 'White'],
    ],
    solutionMap: { 0:[0,0,0,0], 1:[1,1,1,1], 2:[2,2,2,2], 3:[3,3,3,3], 4:[4,4,4,4] },
    clues: [
      'Emma is in S4A.',
      'The Maths prefect is in Red house.',
      'Felix studies English.',
      'The S5A student is in Green house.',
      'Grace is not in Red or Yellow house.',
      'Henry is in S5B.',
      'The Chemistry prefect is in White house.',
      'Irene is in White house.',
      'The Biology prefect is in S5A.',
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

function HowToPlayMind({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🧩</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>MindBridge Logic</div>
      </div>
      {[
        ['📋', 'Read the clues', 'A set of logic clues describe relationships between people and their attributes.'],
        ['🔲', 'Fill the grid', 'For each person, tap their row to cycle through possible attributes in each column.'],
        ['🔍', 'Use elimination', 'If a clue rules something out, cross it off mentally. What\'s left must be the answer.'],
        ['✅', 'Check your work', 'Press "Check" when done. Mistakes are highlighted. Use a hint if you\'re stuck.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Strategy</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Start with "definite" clues (X is Y, X does Z)<br/>
          • Then use "not" clues to eliminate options<br/>
          • Each attribute is used exactly once per column
        </div>
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${game.color}, #4F46E5)` }}>
        Start Game →
      </button>
    </div>
  )
}

export default function MindBridge({ game, levelData, studentId, onFinish }) {
  const { puzzleIdx = 0, timeLimit = 180 } = levelData

  const puzzle = PUZZLE_BANK[Math.min(puzzleIdx, PUZZLE_BANK.length - 1)]
  const n = puzzle.items[0].length
  const numCats = puzzle.categories.length - 1

  const [screen, setScreen]   = useState('guide')
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

  if (screen === 'guide') return <HowToPlayMind game={game} onStart={() => setScreen('playing')} />

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
