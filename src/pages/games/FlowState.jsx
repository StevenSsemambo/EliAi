import { useState, useRef, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Puzzle data ──────────────────────────────────────────────────
// Each puzzle: gridSize N, pairs of [row,col] endpoints that must be connected
// The player draws a path filling ALL cells — no cell left empty

const PUZZLES = {
  4: [
    // grid=4, 3 colors
    { colors: [
      { name:'Crimson', c:'#EF4444', nodes:[[0,0],[3,3]] },
      { name:'Cyan',    c:'#06B6D4', nodes:[[0,3],[3,0]] },
      { name:'Gold',    c:'#F59E0B', nodes:[[1,1],[2,2]] },
    ]},
    { colors: [
      { name:'Lime',    c:'#4ADE80', nodes:[[0,0],[2,3]] },
      { name:'Violet',  c:'#8B5CF6', nodes:[[0,3],[3,1]] },
      { name:'Orange',  c:'#F97316', nodes:[[1,0],[3,3]] },
    ]},
    { colors: [
      { name:'Rose',    c:'#EC4899', nodes:[[0,1],[3,2]] },
      { name:'Blue',    c:'#3B82F6', nodes:[[0,3],[2,0]] },
      { name:'Amber',   c:'#F59E0B', nodes:[[2,3],[3,0]] },
    ]},
  ],
  5: [
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[4,4]] },
      { name:'Teal',    c:'#06B6D4', nodes:[[0,4],[4,0]] },
      { name:'Green',   c:'#4ADE80', nodes:[[0,2],[4,2]] },
      { name:'Purple',  c:'#8B5CF6', nodes:[[2,0],[2,4]] },
    ]},
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[3,4]] },
      { name:'Blue',    c:'#3B82F6', nodes:[[0,4],[4,1]] },
      { name:'Gold',    c:'#F59E0B', nodes:[[1,1],[4,4]] },
      { name:'Pink',    c:'#EC4899', nodes:[[2,2],[4,2]] },
    ]},
  ],
  6: [
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[5,5]] },
      { name:'Cyan',    c:'#06B6D4', nodes:[[0,5],[5,0]] },
      { name:'Green',   c:'#4ADE80', nodes:[[0,3],[3,0]] },
      { name:'Purple',  c:'#8B5CF6', nodes:[[2,2],[5,3]] },
      { name:'Orange',  c:'#F97316', nodes:[[1,5],[4,2]] },
    ]},
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[5,2]] },
      { name:'Blue',    c:'#3B82F6', nodes:[[0,5],[4,5]] },
      { name:'Gold',    c:'#F59E0B', nodes:[[1,1],[5,4]] },
      { name:'Pink',    c:'#EC4899', nodes:[[2,0],[5,0]] },
      { name:'Teal',    c:'#14B8A6', nodes:[[0,3],[3,5]] },
    ]},
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,1],[5,5]] },
      { name:'Blue',    c:'#3B82F6', nodes:[[0,4],[3,0]] },
      { name:'Green',   c:'#4ADE80', nodes:[[2,2],[5,1]] },
      { name:'Purple',  c:'#8B5CF6', nodes:[[1,0],[4,4]] },
      { name:'Orange',  c:'#F97316', nodes:[[0,0],[5,3]] },
      { name:'Rose',    c:'#FB7185', nodes:[[1,5],[4,1]] },
    ]},
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[4,0]] },
      { name:'Cyan',    c:'#06B6D4', nodes:[[0,2],[5,5]] },
      { name:'Gold',    c:'#F59E0B', nodes:[[0,5],[3,3]] },
      { name:'Green',   c:'#4ADE80', nodes:[[2,1],[5,2]] },
      { name:'Violet',  c:'#7C3AED', nodes:[[1,4],[4,5]] },
      { name:'Pink',    c:'#EC4899', nodes:[[3,0],[5,0]] },
    ]},
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[5,0]] },
      { name:'Blue',    c:'#3B82F6', nodes:[[0,5],[5,5]] },
      { name:'Gold',    c:'#F59E0B', nodes:[[1,1],[4,4]] },
      { name:'Green',   c:'#4ADE80', nodes:[[1,4],[4,1]] },
      { name:'Orange',  c:'#F97316', nodes:[[0,2],[5,3]] },
      { name:'Teal',    c:'#14B8A6', nodes:[[2,0],[2,5]] },
    ]},
    { colors: [
      { name:'Red',     c:'#EF4444', nodes:[[0,0],[2,5]] },
      { name:'Blue',    c:'#3B82F6', nodes:[[0,3],[5,4]] },
      { name:'Green',   c:'#4ADE80', nodes:[[1,1],[4,2]] },
      { name:'Purple',  c:'#8B5CF6', nodes:[[0,5],[3,1]] },
      { name:'Gold',    c:'#F59E0B', nodes:[[3,4],[5,0]] },
      { name:'Rose',    c:'#FB7185', nodes:[[2,2],[5,5]] },
    ]},
  ],
}

function getEndpointColor(r, c, colors) {
  for (const col of colors)
    for (const [nr, nc] of col.nodes)
      if (nr===r && nc===c) return col
  return null
}

function cellKey(r, c) { return `${r},${c}` }

function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,6,14,0.97)',backdropFilter:'blur(10px)',borderRadius:14 }}>
      <div style={{ textAlign:'center',padding:'0 24px' }}>
        <div style={{ fontSize:54,marginBottom:10 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:6 }}>{title}</div>
        <div style={{ color,fontSize:14,marginBottom:24 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'11px 24px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer' }}>Next</button>
          <button onClick={onExit}  style={{ padding:'11px 24px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#111827',border:'none',cursor:'pointer' }}>Exit</button>
        </div>
      </div>
    </div>
  )
}


function HowToPlayGuide__FlowState({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌊</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Flow State</div>
      </div>
      {[
        ['🎨', 'Connect the dots', `Each colour has two dots. Draw a path connecting each matching pair.`],
        ['📐', 'Fill every cell', `Your paths must fill the ENTIRE grid — no empty cells allowed!`],
        ['🚫', "Don't cross", `Paths cannot cross each other. Plan your routes carefully.`],
        ['✅', 'Auto-checks', `The puzzle solves automatically when all cells are filled correctly.`],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#6EE7B7', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: `• Connect colours near edges first — they have fewer route options<br/>• Leave flexible colours (with many possible paths) for last<br/>• Drag from either dot to draw the path` }} />
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, game.color, #059669)` }}>
        Start Game →
      </button>
    </div>
  )
}

export default function FlowState({ game, levelData, studentId, onFinish }) {
  const { gridSize = 4, puzzleSet = 0 } = levelData
  const [screen, setScreen] = useState('guide')
  const sz = Math.min(gridSize, 6)
  const puzzlePool = PUZZLES[sz] || PUZZLES[4]
  const puzzleData = puzzlePool[puzzleSet % puzzlePool.length]
  const colors     = puzzleData.colors

  // paths: { colorName: [[r,c],...] }
  const [paths, setPaths]       = useState({})
  const [drawing, setDrawing]   = useState(null)   // { colorName, path }
  const [phase, setPhase]       = useState('playing')
  const [score, setScore]       = useState(0)
  const [moves, setMoves]       = useState(0)
  const startTime = useRef(Date.now())

  // Build endpoint lookup
  const endpointMap = {}
  for (const col of colors)
    for (const [r, c] of col.nodes)
      endpointMap[cellKey(r, c)] = col

  function cellColor(r, c) {
    const key = cellKey(r, c)
    for (const [name, path] of Object.entries(paths)) {
      if (path.some(([pr, pc]) => pr===r && pc===c)) {
        const col = colors.find(cl => cl.name===name)
        return col?.c
      }
    }
    return null
  }

  function isEndpoint(r, c) {
    return !!endpointMap[cellKey(r, c)]
  }

  function startDraw(r, c) {
    if (phase !== 'playing') return
    const ep = endpointMap[cellKey(r, c)]
    if (!ep) {
      // Start from a path cell — erase from that point
      for (const [name, path] of Object.entries(paths)) {
        const idx = path.findIndex(([pr, pc]) => pr===r && pc===c)
        if (idx >= 0 && !isEndpoint(r, c)) {
          const truncated = path.slice(0, idx)
          setPaths(p => ({ ...p, [name]: truncated }))
          setDrawing({ colorName: name, path: truncated })
          return
        }
      }
      return
    }
    SoundEngine.tap()
    // Start or restart from this endpoint
    const existingPath = paths[ep.name] || []
    // If this is the second node of an existing path, start from scratch
    const newPath = [[r, c]]
    setPaths(p => ({ ...p, [ep.name]: newPath }))
    setDrawing({ colorName: ep.name, path: newPath })
  }

  function continueDraw(r, c) {
    if (!drawing || phase !== 'playing') return
    const { colorName, path } = drawing
    const last = path[path.length - 1]
    if (!last) return

    // Check adjacency
    const dr = Math.abs(r - last[0]), dc = Math.abs(c - last[1])
    if ((dr===1&&dc===0)||(dr===0&&dc===1)) {
      // Don't cross own path (except go back)
      if (path.length >= 2) {
        const prev = path[path.length - 2]
        if (prev[0]===r && prev[1]===c) {
          // Backtrack
          const np = path.slice(0, -1)
          setDrawing({ colorName, path: np })
          setPaths(p => ({ ...p, [colorName]: np }))
          return
        }
      }
      // Don't step on other color's path
      const occupant = cellColor(r, c)
      if (occupant && occupant !== colors.find(cl => cl.name===colorName)?.c) {
        // Can't draw over different color
        const ep2 = endpointMap[cellKey(r, c)]
        if (!ep2 || ep2.name !== colorName) return
      }

      const np = [...path, [r, c]]
      setDrawing({ colorName, path: np })
      setPaths(p => ({ ...p, [colorName]: np }))
      setMoves(m => m + 1)

      // Check if reached other endpoint
      const col = colors.find(cl => cl.name===colorName)
      const otherNode = col.nodes.find(([nr,nc]) => !(nr===path[0][0]&&nc===path[0][1]))
      if (otherNode && otherNode[0]===r && otherNode[1]===c) {
        SoundEngine.gameCorrect()
        setDrawing(null)
        checkWin({ ...paths, [colorName]: np })
        return
      }
    }
  }

  function endDraw() {
    setDrawing(null)
  }

  function checkWin(currentPaths) {
    // All colors connected?
    const allConnected = colors.every(col => {
      const path = currentPaths[col.name] || []
      if (path.length < 2) return false
      const start = path[0], end = path[path.length - 1]
      const nodes = col.nodes
      return (
        (start[0]===nodes[0][0]&&start[1]===nodes[0][1]&&end[0]===nodes[1][0]&&end[1]===nodes[1][1]) ||
        (start[0]===nodes[1][0]&&start[1]===nodes[1][1]&&end[0]===nodes[0][0]&&end[1]===nodes[0][1])
      )
    })
    // All cells filled?
    const filled = new Set()
    for (const path of Object.values(currentPaths))
      path.forEach(([r, c]) => filled.add(cellKey(r, c)))
    const allFilled = filled.size === sz * sz

    if (allConnected && allFilled) {
      SoundEngine.levelComplete()
      const elapsed = (Date.now() - startTime.current) / 1000
      const fs = Math.max(50, Math.round(1000 - elapsed * 3 - moves * 2))
      setScore(fs)
      setPhase('won')
      if (studentId) saveGameScore(studentId, game.id, levelData.level, fs)
    }
  }

  function restart() {
    setPaths({}); setDrawing(null); setPhase('playing')
    setScore(0); setMoves(0); startTime.current = Date.now()
  }

  const cellSz = Math.min(56, Math.floor(300 / sz))
  const filledCount = new Set(Object.values(paths).flat().map(([r,c])=>cellKey(r,c))).size

  if (screen === 'guide') return <HowToPlayGuide__FlowState game={game} onStart={() => setScreen('playing')} />

  return (
    <div style={{ position:'relative', userSelect:'none' }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ color:'#FBBF24',fontWeight:800,fontSize:13 }}>⭐ {score}</span>
        <div style={{ display:'flex',gap:10,fontSize:12,color:'#475569' }}>
          <span>🖊 {moves}</span>
          <span>📦 {filledCount}/{sz*sz}</span>
        </div>
      </div>

      {/* Color legend */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
        {colors.map(col => {
          const path = paths[col.name] || []
          const connected = path.length >= 2 && (() => {
            const s=path[0],e=path[path.length-1]
            return col.nodes.some(([r,c])=>r===s[0]&&c===s[1]) && col.nodes.some(([r,c])=>r===e[0]&&c===e[1])
          })()
          return (
            <div key={col.name} style={{ display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:99,background:`${col.c}15`,border:`1px solid ${col.c}${connected?'99':'33'}`,fontSize:11,fontWeight:700,color:connected?col.c:'#475569' }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:connected?col.c:`${col.c}55` }}/>
              {col.name} {connected?'✓':''}
            </div>
          )
        })}
      </div>

      {/* Instruction */}
      <div style={{ color:'#334155',fontSize:11,marginBottom:10 }}>
        Connect matching colors · Fill every cell · Paths can't cross
      </div>

      {/* Grid */}
      <div style={{ position:'relative', display:'inline-block' }}
        onMouseLeave={endDraw}
        onTouchEnd={endDraw}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${sz},${cellSz}px)`, gap:3 }}>
          {Array.from({ length: sz }, (_, r) =>
            Array.from({ length: sz }, (_, c) => {
              const ep = endpointMap[cellKey(r, c)]
              const fill = cellColor(r, c)
              const isDot = !!ep
              return (
                <div key={`${r}-${c}`}
                  onMouseDown={() => startDraw(r, c)}
                  onMouseEnter={() => continueDraw(r, c)}
                  onTouchStart={e => { e.preventDefault(); startDraw(r, c) }}
                  onTouchMove={e => {
                    e.preventDefault()
                    const touch = e.touches[0]
                    const el = document.elementFromPoint(touch.clientX, touch.clientY)
                    if (el?.dataset?.row !== undefined) {
                      continueDraw(+el.dataset.row, +el.dataset.col)
                    }
                  }}
                  data-row={r} data-col={c}
                  style={{
                    width:cellSz, height:cellSz,
                    borderRadius: isDot ? '50%' : 8,
                    background: isDot ? ep.c : fill ? `${fill}40` : 'rgba(255,255,255,0.04)',
                    border: isDot ? 'none' : fill ? `2px solid ${fill}80` : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isDot ? `0 0 14px ${ep.c}88` : fill ? `0 0 6px ${fill}30` : 'none',
                    cursor: 'crosshair',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.1s',
                    transform: isDot ? 'scale(0.7)' : 'scale(1)',
                  }}>
                </div>
              )
            })
          )}
        </div>
        {phase==='won' && <Overlay icon="🌊" title="Flow Complete!" sub={`${score} pts · ${moves} moves`} color="#4ADE80" onRetry={restart} onExit={onFinish} game={game}/>}
      </div>

      <button onClick={restart}
        style={{ marginTop:12,width:'100%',padding:'9px',borderRadius:10,fontSize:12,fontWeight:700,color:'#64748B',background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',cursor:'pointer' }}>
        🔄 Reset
      </button>
    </div>
  )
}
