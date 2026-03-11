import { useState, useEffect, useRef, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ═══════════════════════════════════════════════════════════════
//  CIRCUIT LAB  —  Physics Forces Game
//  A real drag-and-drop electrical circuit builder.
//  Players place components onto a grid, wire them together,
//  and the engine solves the circuit live — bulbs glow, current
//  animates, voltages are calculated using real Ohm's law.
// ═══════════════════════════════════════════════════════════════

// ── Component types ──────────────────────────────────────────────
const COMP = {
  WIRE:     { id:'wire',     label:'Wire',      icon:'━',  color:'#94A3B8', resistance: 0   },
  RESISTOR: { id:'resistor', label:'Resistor',  icon:'⊟',  color:'#F59E0B', resistance: null },
  BULB:     { id:'bulb',     label:'Bulb',      icon:'◎',  color:'#FCD34D', resistance: 10  },
  BATTERY:  { id:'battery',  label:'Battery',   icon:'⊣⊢', color:'#4ADE80', resistance: 0   },
  SWITCH:   { id:'switch',   label:'Switch',    icon:'⌇',  color:'#60A5FA', resistance: null },
  CORNER:   { id:'corner',   label:'Corner',    icon:'┘',  color:'#94A3B8', resistance: 0   },
  TJUNC:    { id:'tjunc',    label:'Junction',  icon:'┤',  color:'#A78BFA', resistance: 0   },
}

// ── Wire connectivity: which sides each tile type connects ───────
// sides: T=top, R=right, B=bottom, L=left
const CONNECTS = {
  wire:     { T:false, R:true,  B:false, L:true  },
  resistor: { T:false, R:true,  B:false, L:true  },
  bulb:     { T:false, R:true,  B:false, L:true  },
  battery:  { T:false, R:true,  B:false, L:true  },
  switch:   { T:false, R:true,  B:false, L:true  },
  corner_0: { T:false, R:true,  B:true,  L:false }, // ┌  top-right opened
  corner_1: { T:false, R:false, B:true,  L:true  }, // ┐  top-left opened
  corner_2: { T:true,  R:false, B:false, L:true  }, // ┘  bottom-right opened  (default CORNER)
  corner_3: { T:true,  R:true,  B:false, L:false }, // └  bottom-left opened
  tjunc:    { T:true,  R:true,  B:false, L:true  },
  empty:    { T:false, R:false, B:false, L:false },
}

// ── Level definitions ─────────────────────────────────────────────
// grid: 5×5 array of {type, rotation, locked, value}
// null = empty, locked = player can't remove it
// target: what must be achieved
// palette: which components player can use
// concept: the physics principle being taught

const LEVELS = [
  // ── L1: Complete the circuit ─────────────────────────────────
  {
    name: 'Close the Circuit',
    concept: 'A circuit must be a complete closed loop for current to flow.',
    instruction: 'Place a wire to complete the circuit and light the bulb!',
    palette: ['wire'],
    paletteCount: { wire: 3 },
    grid: [
      [null,       {t:'battery',locked:true}, {t:'wire',locked:true}, {t:'wire',locked:true}, {t:'corner',r:3,locked:true}],
      [null,       null,                      null,                   null,                   {t:'bulb',locked:true}      ],
      [null,       null,                      null,                   null,                   {t:'wire',locked:true}      ],
      [null,       null,                      null,                   null,                   {t:'corner',r:2,locked:true}],
      [{t:'corner',r:0,locked:true},{t:'wire',locked:true},{t:'wire',locked:true},{t:'gap'}, null                        ],
    ],
    gapCells: [{row:4,col:3}],
    target: { bullsLit: 1 },
    hint: 'Current needs a path from + to −. Fill the gap!',
    voltage: 6,
  },

  // ── L2: Add a resistor ───────────────────────────────────────
  {
    name: 'Add Resistance',
    concept: 'Resistors limit current flow. More resistance = less current = dimmer bulb.',
    instruction: 'Place the resistor in the gap. See how it affects the bulb brightness.',
    palette: ['resistor', 'wire'],
    paletteCount: { resistor: 1, wire: 2 },
    grid: [
      [{t:'corner',r:0,locked:true},{t:'wire',locked:true},{t:'battery',locked:true},{t:'wire',locked:true},{t:'corner',r:3,locked:true}],
      [{t:'bulb',locked:true},      null,                  null,                    null,                  {t:'wire',locked:true}       ],
      [{t:'wire',locked:true},      null,                  null,                    null,                  {t:'gap'}                    ],
      [{t:'wire',locked:true},      null,                  null,                    null,                  {t:'wire',locked:true}       ],
      [{t:'corner',r:1,locked:true},{t:'wire',locked:true},{t:'wire',locked:true},  {t:'wire',locked:true},{t:'corner',r:2,locked:true}],
    ],
    gapCells: [{row:2,col:4}],
    target: { bullsLit: 1, hasResistor: true },
    hint: 'Resistance (Ω) reduces current: I = V/R',
    voltage: 9,
  },

  // ── L3: Series circuit ───────────────────────────────────────
  {
    name: 'Series Circuit',
    concept: 'In series, all components share the same current. Add bulbs = more resistance = dimmer each.',
    instruction: 'Complete this series circuit with TWO bulbs.',
    palette: ['bulb', 'wire'],
    paletteCount: { bulb: 2, wire: 3 },
    grid: [
      [{t:'corner',r:0,locked:true},{t:'battery',locked:true},{t:'wire',locked:true},{t:'wire',locked:true},{t:'corner',r:3,locked:true}],
      [{t:'wire',locked:true},      null,                    null,                   null,                 {t:'wire',locked:true}       ],
      [{t:'gap'},                   null,                    null,                   null,                 {t:'gap'}                    ],
      [{t:'wire',locked:true},      null,                    null,                   null,                 {t:'wire',locked:true}       ],
      [{t:'corner',r:1,locked:true},{t:'wire',locked:true},  {t:'wire',locked:true}, {t:'wire',locked:true},{t:'corner',r:2,locked:true}],
    ],
    gapCells: [{row:2,col:0},{row:2,col:4}],
    target: { bullsLit: 2 },
    hint: 'Two bulbs in series share the voltage: each gets V/2',
    voltage: 12,
  },

  // ── L4: Parallel circuit ─────────────────────────────────────
  {
    name: 'Parallel Circuit',
    concept: 'In parallel, each branch gets the full voltage. More bulbs = brighter!',
    instruction: 'Wire two bulbs in parallel. Each branch should have one bulb.',
    palette: ['bulb', 'wire', 'corner'],
    paletteCount: { bulb: 1, wire: 4, corner: 2 },
    grid: [
      [{t:'corner',r:0,locked:true},{t:'battery',locked:true},{t:'tjunc',locked:true},{t:'wire',locked:true},{t:'corner',r:3,locked:true}],
      [{t:'bulb',locked:true},      null,                    {t:'gap'},               null,                 {t:'bulb',locked:true}       ],
      [{t:'wire',locked:true},      null,                    {t:'gap'},               null,                 {t:'wire',locked:true}       ],
      [{t:'corner',r:1,locked:true},{t:'wire',locked:true},  {t:'tjunc',locked:true}, {t:'wire',locked:true},{t:'corner',r:2,locked:true}],
      [null,                         null,                   null,                    null,                  null                         ],
    ],
    gapCells: [{row:1,col:2},{row:2,col:2}],
    target: { bullsLit: 2, isParallel: true },
    hint: 'Parallel branches share the same two nodes. Each bulb gets full voltage!',
    voltage: 6,
  },

  // ── L5: Switch control ───────────────────────────────────────
  {
    name: 'Switch Control',
    concept: 'A switch opens or closes a circuit. Open = no current. Closed = current flows.',
    instruction: 'Place the switch and toggle it to control the bulb.',
    palette: ['switch', 'wire'],
    paletteCount: { switch: 1, wire: 2 },
    grid: [
      [{t:'corner',r:0,locked:true},{t:'battery',locked:true},{t:'wire',locked:true},{t:'wire',locked:true},{t:'corner',r:3,locked:true}],
      [{t:'wire',locked:true},      null,                    null,                   null,                 {t:'bulb',locked:true}       ],
      [{t:'gap'},                   null,                    null,                   null,                 {t:'wire',locked:true}       ],
      [{t:'wire',locked:true},      null,                    null,                   null,                 {t:'wire',locked:true}       ],
      [{t:'corner',r:1,locked:true},{t:'wire',locked:true},  {t:'wire',locked:true}, {t:'wire',locked:true},{t:'corner',r:2,locked:true}],
    ],
    gapCells: [{row:2,col:0}],
    target: { bullsLit: 1, usedSwitch: true },
    hint: 'Toggle the switch by tapping it after placing. Closed = ✓ current flows.',
    voltage: 6,
  },
]

// For levels beyond 5, we generate procedurally
function generateLevel(level) {
  // Return from fixed bank if available
  if (level <= LEVELS.length) return LEVELS[level - 1]
  // Procedural: escalating complexity
  const base = LEVELS[(level - 1) % LEVELS.length]
  return { ...base, name: `Circuit ${level}`, voltage: 6 + (level % 5) * 3 }
}

// ── Circuit Solver ────────────────────────────────────────────────
// Simple graph-based solver: traces paths, computes resistance, calculates current
function solveCircuit(cells, gridW, gridH, voltage) {
  // Build adjacency map of connected component cells
  // Returns: { current, litBulbs: Set, hasResistor, isParallel, switchOpen }

  // Find battery position
  let batteryCell = null
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (cells[r]?.[c]?.t === 'battery') batteryCell = [r, c]

  if (!batteryCell) return { current: 0, litBulbs: new Set() }

  // Check if any switch is open
  let switchOpen = false
  let switchClosed = false
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++) {
      const cell = cells[r]?.[c]
      if (cell?.t === 'switch') {
        if (cell.closed) switchClosed = true
        else switchOpen = true
      }
    }

  // BFS from battery to find connected loop
  const visited = new Set()
  const queue = [batteryCell]
  const componentCells = []
  visited.add(`${batteryCell[0]},${batteryCell[1]}`)

  // Collect all connected non-null cells
  while (queue.length > 0) {
    const [r, c] = queue.shift()
    const cell = cells[r]?.[c]
    if (!cell || cell.t === 'empty' || cell.t === 'gap') continue
    componentCells.push([r, c, cell])

    // Check neighbors
    const neighbors = [
      [r-1, c, 'T', 'B'], [r+1, c, 'B', 'T'],
      [r, c-1, 'L', 'R'], [r, c+1, 'R', 'L']
    ]
    for (const [nr, nc, mySide, theirSide] of neighbors) {
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      const neighbor = cells[nr]?.[nc]
      if (!neighbor || neighbor.t === 'empty' || neighbor.t === 'gap') continue

      // Check connectivity
      const myConn = getConnects(cell)
      const theirConn = getConnects(neighbor)
      if (myConn[mySide] && theirConn[theirSide]) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }

  // Find bulbs and resistors in connected set
  const litBulbs = new Set()
  let totalResistance = 0
  let hasResistor = false
  let bulbCount = 0

  for (const [r, c, cell] of componentCells) {
    if (cell.t === 'bulb') { bulbCount++; totalResistance += 10 }
    if (cell.t === 'resistor') { hasResistor = true; totalResistance += (cell.value || 10) }
    if (cell.t === 'switch' && !cell.closed) return { current: 0, litBulbs: new Set() }
  }

  // Check circuit is actually closed (battery forms a loop)
  const [br, bc] = batteryCell
  const battConn = getConnects(cells[br][bc])
  let leftConnected = false, rightConnected = false

  // Simple check: battery must have connections on both sides
  if (bc > 0 && cells[br]?.[bc-1] && getConnects(cells[br][bc-1]).R && visited.has(`${br},${bc-1}`)) leftConnected = true
  if (bc < gridW-1 && cells[br]?.[bc+1] && getConnects(cells[br][bc+1]).L && visited.has(`${br},${bc+1}`)) rightConnected = true

  // For corner-connected batteries
  if (br > 0 && cells[br-1]?.[bc] && visited.has(`${br-1},${bc}`)) rightConnected = true
  if (br < gridH-1 && cells[br+1]?.[bc] && visited.has(`${br+1},${bc}`)) rightConnected = true

  if (!leftConnected && !rightConnected) return { current: 0, litBulbs: new Set() }

  // Is there a complete path? (at least one bulb or wire in the component set)
  if (componentCells.length < 3) return { current: 0, litBulbs: new Set() }

  const resistance = Math.max(0.1, totalResistance)
  const current = voltage / resistance

  // Light all bulbs in circuit
  for (const [r, c, cell] of componentCells)
    if (cell.t === 'bulb') litBulbs.add(`${r},${c}`)

  return {
    current,
    litBulbs,
    hasResistor,
    isParallel: bulbCount > 1,
    switchClosed
  }
}

function getConnects(cell) {
  if (!cell) return CONNECTS.empty
  const t = cell.t
  if (t === 'corner') {
    const r = cell.r ?? 2
    return CONNECTS[`corner_${r}`] || CONNECTS.corner_2
  }
  return CONNECTS[t] || CONNECTS.empty
}

// ── SVG Component Renderers ───────────────────────────────────────
function CellSVG({ cell, row, col, cellSize, lit, selected, onClick }) {
  const s = cellSize
  const x = col * s, y = row * s
  const cx = x + s/2, cy = y + s/2
  const t = cell?.t

  // Wire routing lines
  const conn = getConnects(cell)
  const mid = s / 2

  const lineStyle = { stroke: '#475569', strokeWidth: 2.5, strokeLinecap: 'round' }
  const activeWire = { ...lineStyle, stroke: lit ? '#FBBF24' : '#334155' }

  function wires() {
    const lines = []
    if (conn.L) lines.push(<line key='L' x1={0} y1={mid} x2={mid} y2={mid} style={activeWire}/>)
    if (conn.R) lines.push(<line key='R' x1={mid} y1={mid} x2={s} y2={mid} style={activeWire}/>)
    if (conn.T) lines.push(<line key='T' x1={mid} y1={0} x2={mid} y2={mid} style={activeWire}/>)
    if (conn.B) lines.push(<line key='B' x1={mid} y1={mid} x2={mid} y2={s} style={activeWire}/>)
    return lines
  }

  if (!t || t === 'empty' || t === 'gap') {
    return (
      <g transform={`translate(${x},${y})`} onClick={onClick} style={{cursor:'pointer'}}>
        <rect width={s} height={s} fill='transparent'/>
        {t === 'gap' && (
          <rect x={4} y={4} width={s-8} height={s-8}
            rx={4} fill='rgba(239,68,68,0.08)'
            stroke='rgba(239,68,68,0.35)' strokeWidth={1.5} strokeDasharray='4,3'/>
        )}
      </g>
    )
  }

  return (
    <g transform={`translate(${x},${y})`} onClick={onClick}
       style={{cursor: cell?.locked ? 'default' : 'pointer'}}>
      {/* Cell bg */}
      <rect width={s} height={s}
        fill={selected ? 'rgba(96,165,250,0.12)' : 'transparent'}
        rx={2}/>

      {/* Wire paths */}
      {wires()}

      {/* Component body */}
      {t === 'battery' && (
        <>
          <rect x={mid-12} y={mid-7} width={24} height={14} rx={3}
            fill='rgba(74,222,128,0.15)' stroke='#4ADE80' strokeWidth={1.5}/>
          <line x1={mid-5} y1={mid-4} x2={mid-5} y2={mid+4} stroke='#4ADE80' strokeWidth={2.5}/>
          <line x1={mid+5} y1={mid-2} x2={mid+5} y2={mid+2} stroke='#4ADE80' strokeWidth={1.5}/>
          <text x={mid-8} y={mid-9} fill='#4ADE80' fontSize={7} fontWeight='700'>+</text>
          <text x={mid+5} y={mid-9} fill='#94A3B8' fontSize={7}>−</text>
        </>
      )}

      {t === 'wire' && (
        <circle cx={mid} cy={mid} r={2.5} fill={lit ? '#FBBF24' : '#334155'}/>
      )}

      {t === 'corner' && (
        <circle cx={mid} cy={mid} r={2.5} fill={lit ? '#FBBF24' : '#334155'}/>
      )}

      {t === 'tjunc' && (
        <circle cx={mid} cy={mid} r={3.5} fill={lit ? '#FBBF24' : '#475569'}/>
      )}

      {t === 'resistor' && (
        <>
          <rect x={mid-11} y={mid-5} width={22} height={10} rx={2}
            fill='rgba(245,158,11,0.15)' stroke='#F59E0B' strokeWidth={1.5}/>
          <text x={mid} y={mid+4} fill='#F59E0B' fontSize={8} fontWeight='800'
            textAnchor='middle'>Ω</text>
        </>
      )}

      {t === 'bulb' && (
        <>
          {/* Glow when lit */}
          {lit && <circle cx={mid} cy={mid} r={13} fill={`rgba(252,211,77,${Math.min(0.35, 0.1 + 0.25)})`}/>}
          {lit && <circle cx={mid} cy={mid} r={9} fill='rgba(252,211,77,0.25)'/>}
          {/* Bulb body */}
          <circle cx={mid} cy={mid} r={8}
            fill={lit ? 'rgba(252,211,77,0.3)' : 'rgba(30,42,65,0.8)'}
            stroke={lit ? '#FCD34D' : '#475569'} strokeWidth={1.5}/>
          {/* Filament */}
          <path d={`M${mid-3},${mid+2} Q${mid},${mid-4} ${mid+3},${mid+2}`}
            fill='none' stroke={lit ? '#FCD34D' : '#475569'} strokeWidth={1.2}/>
          {/* Base */}
          <rect x={mid-3} y={mid+5} width={6} height={3} rx={1}
            fill={lit ? '#F59E0B' : '#334155'}/>
        </>
      )}

      {t === 'switch' && (
        <>
          <rect x={mid-10} y={mid-5} width={20} height={10} rx={3}
            fill='rgba(96,165,250,0.12)' stroke='#60A5FA' strokeWidth={1.5}/>
          {cell.closed
            ? <line x1={mid-7} y1={mid} x2={mid+7} y2={mid} stroke='#60A5FA' strokeWidth={2}/>
            : <line x1={mid-7} y1={mid} x2={mid+3} y2={mid-5} stroke='#60A5FA' strokeWidth={2}/>
          }
        </>
      )}

      {/* Locked indicator */}
      {cell?.locked && (
        <rect width={s} height={s} fill='transparent'
          stroke='rgba(255,255,255,0.04)' strokeWidth={1}/>
      )}
    </g>
  )
}

// ── Current Flow Animation ────────────────────────────────────────
function CurrentDots({ cells, gridW, gridH, cellSize, litBulbs, current }) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    if (litBulbs.size === 0) return
    const id = setInterval(() => setOffset(o => (o + 2) % 24), 60)
    return () => clearInterval(id)
  }, [litBulbs.size])

  if (litBulbs.size === 0 || current <= 0) return null

  const dots = []
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const cell = cells[r]?.[c]
      if (!cell || cell.t === 'gap' || cell.t === 'empty') continue
      if (!litBulbs.has(`${r},${c}`) && cell.t !== 'battery') {
        // Check if in lit path — for simplicity animate all connected wires
        const conn = getConnects(cell)
        const x = c * cellSize + cellSize/2
        const y = r * cellSize + cellSize/2
        if (conn.R && c < gridW-1 && cells[r]?.[c+1]) {
          const t = ((offset + c*8 + r*4) % 24) / 24
          const dx = t * cellSize
          dots.push(<circle key={`h${r}${c}`} cx={x - cellSize/2 + dx} cy={y} r={2}
            fill='rgba(251,191,36,0.7)' opacity={0.5 + t*0.5}/>)
        }
        if (conn.B && r < gridH-1 && cells[r+1]?.[c]) {
          const t = ((offset + r*8 + c*4) % 24) / 24
          const dy = t * cellSize
          dots.push(<circle key={`v${r}${c}`} cx={x} cy={y - cellSize/2 + dy} r={2}
            fill='rgba(251,191,36,0.7)' opacity={0.5 + t*0.5}/>)
        }
      }
    }
  }
  return <g style={{pointerEvents:'none'}}>{dots}</g>
}

// ── Palette Component ─────────────────────────────────────────────
function PaletteItem({ type, count, selected, onSelect }) {
  const def = COMP[type.toUpperCase()] || COMP.WIRE
  return (
    <button onClick={() => onSelect(type)}
      disabled={count <= 0}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:3,
        padding:'8px 10px', borderRadius:10, minWidth:52,
        background: selected ? `${def.color}22` : 'rgba(255,255,255,0.04)',
        border:`2px solid ${selected ? def.color : 'rgba(255,255,255,0.08)'}`,
        color: count > 0 ? def.color : '#334155',
        cursor: count > 0 ? 'pointer' : 'not-allowed',
        opacity: count > 0 ? 1 : 0.4,
        transition:'all 0.15s',
      }}>
      <span style={{fontSize:18, filter: count <= 0 ? 'grayscale(1)' : 'none'}}>{def.icon}</span>
      <span style={{fontSize:9, fontWeight:700, color:'#94A3B8'}}>{def.label}</span>
      <span style={{
        fontSize:10, fontWeight:900,
        color: count > 0 ? def.color : '#334155',
        background: 'rgba(0,0,0,0.3)', borderRadius:4, padding:'1px 5px'
      }}>×{count}</span>
    </button>
  )
}

// ── Overlay ───────────────────────────────────────────────────────
function Overlay({ icon, title, sub, details, color, btnLabel, onBtn, btnLabel2, onBtn2 }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:30, display:'flex',
      alignItems:'center', justifyContent:'center',
      background:'rgba(3,6,16,0.96)', backdropFilter:'blur(10px)', borderRadius:16,
    }}>
      <div style={{textAlign:'center', padding:'0 24px', maxWidth:300}}>
        <div style={{fontSize:52, marginBottom:8}}>{icon}</div>
        <div style={{color:'white', fontWeight:900, fontSize:20, marginBottom:4}}>{title}</div>
        <div style={{color, fontSize:13, marginBottom:8, lineHeight:1.5}}>{sub}</div>
        {details && (
          <div style={{
            background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'10px 14px',
            color:'#94A3B8', fontSize:11, lineHeight:1.7, textAlign:'left', marginBottom:16,
          }}>{details}</div>
        )}
        <div style={{display:'flex', gap:10, justifyContent:'center', marginTop:14}}>
          <button onClick={onBtn} style={{
            padding:'11px 22px', borderRadius:12, fontWeight:800,
            color:'white', background:color, border:'none', cursor:'pointer', fontSize:13,
          }}>{btnLabel}</button>
          {onBtn2 && <button onClick={onBtn2} style={{
            padding:'11px 22px', borderRadius:12, fontWeight:700,
            color:'#94A3B8', background:'#111827', border:'none', cursor:'pointer', fontSize:13,
          }}>{btnLabel2}</button>}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function PhysicsForcesGame({ game, levelData, studentId, onFinish }) {
  const level      = levelData?.level || 1
  const levelDef   = generateLevel(level)
  const GRID_H     = 5
  const GRID_W     = 5
  const CELL       = 52   // px

  // Initialise grid from level definition
  function initGrid() {
    return Array.from({length: GRID_H}, (_, r) =>
      Array.from({length: GRID_W}, (_, c) => {
        const def = levelDef.grid[r]?.[c]
        if (!def) return null
        return { ...def }
      })
    )
  }

  // Initialise palette counts
  function initPalette() {
    const counts = {}
    if (levelDef.paletteCount) {
      Object.entries(levelDef.paletteCount).forEach(([k,v]) => counts[k] = v)
    } else {
      levelDef.palette?.forEach(p => counts[p] = (counts[p]||0) + 3)
    }
    return counts
  }

  const [cells, setCells]           = useState(initGrid)
  const [palette, setPalette]       = useState(initPalette)
  const [selected, setSelected]     = useState(null)  // selected palette item
  const [circuit, setCircuit]       = useState({current:0, litBulbs:new Set()})
  const [phase, setPhase]           = useState('play') // play | win | fail
  const [score, setScore]           = useState(0)
  const [timeLeft, setTimeLeft]     = useState(90)
  const [moves, setMoves]           = useState(0)
  const [showConcept, setShowConcept] = useState(true)
  const [switchCells, setSwitchCells] = useState([]) // coords of placed switches

  // ── Solve circuit whenever cells change ──────────────────────
  useEffect(() => {
    const result = solveCircuit(cells, GRID_W, GRID_H, levelDef.voltage)
    setCircuit(result)

    // Check win condition
    if (result.litBulbs.size >= (levelDef.target?.bullsLit || 1) && phase === 'play') {
      const bonus = Math.round(timeLeft * 0.8)
      const movePenalty = Math.max(0, (moves - 3) * 5)
      const pts = Math.max(50, 200 + bonus - movePenalty)
      setScore(s => s + pts)
      setPhase('win')
      SoundEngine.levelComplete()
      if (studentId) saveGameScore(studentId, game?.id || 'physics_forces', level, pts)
    }
  }, [cells])

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'play') return
    if (timeLeft <= 0) { setPhase('fail'); SoundEngine.gameWrong(); return }
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); return 0 }
      if (s <= 10) SoundEngine.timerTick(s <= 4 ? 3 : 2)
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase, timeLeft <= 0])

  // ── Cell click ────────────────────────────────────────────────
  function handleCellClick(row, col) {
    const cell = cells[row]?.[col]

    // Toggle switch
    if (cell?.t === 'switch') {
      SoundEngine.tap()
      const nc = cells.map(r => r.map(c => ({...c})))
      nc[row][col] = {...cell, closed: !cell.closed}
      setCells(nc)
      return
    }

    // Can't touch locked cells
    if (cell?.locked) return

    // If no palette item selected, remove placed component
    if (!selected) {
      if (cell && cell.t && cell.t !== 'gap' && cell.t !== 'empty') {
        SoundEngine.tap()
        const nc = cells.map(r => r.map(c => ({...c})))
        // Return to palette
        setPalette(p => ({...p, [cell.t]: (p[cell.t]||0)+1}))
        nc[row][col] = levelDef.grid[row]?.[col]?.t === cell.t ? {...levelDef.grid[row][col]} : null
        setCells(nc)
        setMoves(m => m+1)
      }
      return
    }

    // Place selected component
    const count = palette[selected] || 0
    if (count <= 0) return

    // Only place on empty or gap cells (not locked)
    if (cell?.locked) return
    if (cell && cell.t && cell.t !== 'gap' && cell.t !== 'empty') {
      // Replace — return old to palette first
      setPalette(p => ({...p, [cell.t]: (p[cell.t]||0)+1}))
    }

    SoundEngine.tap()
    const nc = cells.map(r => r.map(c => c ? {...c} : null))
    nc[row][col] = { t: selected, closed: selected === 'switch' ? false : undefined }
    setCells(nc)
    setPalette(p => ({...p, [selected]: p[selected]-1}))
    setMoves(m => m+1)
    if (palette[selected] - 1 <= 0) setSelected(null)
  }

  function handleReset() {
    setCells(initGrid())
    setPalette(initPalette())
    setSelected(null)
    setCircuit({current:0, litBulbs:new Set()})
    setPhase('play')
    setTimeLeft(90)
    setMoves(0)
  }

  const timerColor = timeLeft > 45 ? '#4ADE80' : timeLeft > 20 ? '#F59E0B' : '#EF4444'
  const currentStr = circuit.current > 0 ? `${circuit.current.toFixed(2)} A` : '0 A'
  const voltageStr = `${levelDef.voltage} V`
  const resistanceStr = circuit.current > 0
    ? `${(levelDef.voltage / circuit.current).toFixed(1)} Ω` : '∞'

  return (
    <div style={{position:'relative', fontFamily:'system-ui,sans-serif', userSelect:'none'}}>

      {/* ── Concept intro overlay ── */}
      {showConcept && (
        <div style={{
          position:'absolute', inset:0, zIndex:25, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(3,6,16,0.97)', backdropFilter:'blur(8px)', borderRadius:16,
        }}>
          <div style={{textAlign:'center', padding:'0 24px', maxWidth:300}}>
            <div style={{fontSize:44, marginBottom:10}}>⚡</div>
            <div style={{color:'#EF4444', fontWeight:700, fontSize:10, letterSpacing:2,
              textTransform:'uppercase', marginBottom:6}}>
              Physics · Electricity
            </div>
            <div style={{color:'white', fontWeight:900, fontSize:18, marginBottom:10}}>
              {levelDef.name}
            </div>
            <div style={{
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
              borderRadius:10, padding:'12px 14px', marginBottom:12,
              color:'#FCA5A5', fontSize:12, lineHeight:1.7, textAlign:'left',
            }}>
              <strong style={{color:'#EF4444'}}>Physics concept: </strong>
              {levelDef.concept}
            </div>
            <div style={{color:'#94A3B8', fontSize:12, marginBottom:16, lineHeight:1.6}}>
              {levelDef.instruction}
            </div>
            <button onClick={() => setShowConcept(false)} style={{
              padding:'12px 28px', borderRadius:12, fontWeight:800,
              color:'white', fontSize:14, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#EF4444,#B91C1C)',
            }}>
              Build Circuit →
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <div style={{display:'flex', gap:12, fontSize:12}}>
          <span style={{color:'#FBBF24', fontWeight:800}}>⭐ {score}</span>
          <span style={{color:'#475569'}}>Moves: {moves}</span>
        </div>
        <span style={{color:timerColor, fontWeight:800, fontFamily:'monospace', fontSize:14}}>
          ⏱ {timeLeft}s
        </span>
      </div>

      {/* Timer bar */}
      <div style={{height:4, borderRadius:99, background:'#0F1629', marginBottom:10}}>
        <div style={{
          height:'100%', borderRadius:99, transition:'width 1s linear, background 0.4s',
          width:`${(timeLeft/90)*100}%`, background:timerColor,
        }}/>
      </div>

      {/* ── Live meters ── */}
      <div style={{
        display:'flex', gap:6, marginBottom:10,
        padding:'7px 10px', borderRadius:8,
        background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          {label:'Voltage', val:voltageStr, color:'#4ADE80', icon:'V'},
          {label:'Current', val:currentStr, color: circuit.current>0 ? '#FBBF24' : '#334155', icon:'I'},
          {label:'Resistance', val:resistanceStr, color:'#F59E0B', icon:'R'},
          {label:'Bulbs lit', val:`${circuit.litBulbs.size}`, color: circuit.litBulbs.size>0 ? '#FCD34D' : '#334155', icon:'💡'},
        ].map(m => (
          <div key={m.label} style={{flex:1, textAlign:'center'}}>
            <div style={{color:m.color, fontWeight:900, fontSize:13, fontFamily:'monospace'}}>{m.val}</div>
            <div style={{color:'#334155', fontSize:9, fontWeight:600, marginTop:1}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{
        display:'flex', justifyContent:'center', marginBottom:10,
        background:'#07090F', borderRadius:12,
        border:`1px solid ${circuit.litBulbs.size > 0 ? 'rgba(252,211,77,0.2)' : 'rgba(255,255,255,0.05)'}`,
        padding:8, transition:'border-color 0.4s',
        boxShadow: circuit.litBulbs.size > 0 ? '0 0 20px rgba(252,211,77,0.1)' : 'none',
      }}>
        <svg width={GRID_W * CELL} height={GRID_H * CELL} style={{display:'block'}}>
          {/* Grid dots */}
          {Array.from({length:GRID_H+1}, (_,r) =>
            Array.from({length:GRID_W+1}, (_,c) => (
              <circle key={`d${r}${c}`} cx={c*CELL} cy={r*CELL} r={1}
                fill='rgba(255,255,255,0.06)'/>
            ))
          )}

          {/* Cells */}
          {cells.map((row, r) =>
            row.map((cell, c) => (
              <CellSVG key={`${r}-${c}`} cell={cell} row={r} col={c}
                cellSize={CELL}
                lit={circuit.litBulbs.has(`${r},${c}`) || (circuit.litBulbs.size > 0 && (cell?.t==='wire'||cell?.t==='corner'||cell?.t==='battery'||cell?.t==='tjunc'))}
                selected={false}
                onClick={() => handleCellClick(r, c)}
              />
            ))
          )}

          {/* Current flow dots */}
          <CurrentDots cells={cells} gridW={GRID_W} gridH={GRID_H}
            cellSize={CELL} litBulbs={circuit.litBulbs} current={circuit.current}/>
        </svg>
      </div>

      {/* ── Palette ── */}
      <div style={{marginBottom:8}}>
        <div style={{color:'#334155', fontSize:9, fontWeight:700, textTransform:'uppercase',
          letterSpacing:1, marginBottom:5}}>
          Components — tap to select, then tap the grid to place
        </div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {levelDef.palette?.map(type => (
            <PaletteItem key={type} type={type}
              count={palette[type] || 0}
              selected={selected === type}
              onSelect={t => setSelected(s => s === t ? null : t)}
            />
          ))}
          <button onClick={handleReset} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            padding:'8px 10px', borderRadius:10, minWidth:48,
            background:'rgba(239,68,68,0.08)',
            border:'2px solid rgba(239,68,68,0.2)',
            color:'#EF4444', cursor:'pointer',
          }}>
            <span style={{fontSize:16}}>↺</span>
            <span style={{fontSize:9, fontWeight:700}}>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Hint ── */}
      <div style={{
        padding:'7px 10px', borderRadius:8,
        background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.15)',
        color:'#92400E', fontSize:11, lineHeight:1.5,
        display:'flex', alignItems:'flex-start', gap:6,
      }}>
        <span style={{color:'#F59E0B', flexShrink:0}}>💡</span>
        <span style={{color:'#FCD34D'}}>{levelDef.hint}</span>
      </div>

      {/* ── Win overlay ── */}
      {phase === 'win' && (
        <Overlay
          icon='💡' title='Circuit Complete!'
          sub={`Current flowing: ${currentStr}`}
          color='#4ADE80'
          details={
            `⚡ ${levelDef.concept}\n\n` +
            `Ohm's Law: I = V/R = ${levelDef.voltage}/${(levelDef.voltage/Math.max(0.01,circuit.current)).toFixed(1)} = ${currentStr}`
          }
          btnLabel='Next Level →'
          onBtn={onFinish}
          btnLabel2='Play Again'
          onBtn2={handleReset}
        />
      )}

      {/* ── Fail overlay ── */}
      {phase === 'fail' && (
        <Overlay
          icon='🔌' title='Time Up!'
          sub='The circuit was not completed in time.'
          color='#EF4444'
          details={levelDef.hint}
          btnLabel='Try Again'
          onBtn={handleReset}
          btnLabel2='Exit'
          onBtn2={onFinish}
        />
      )}
    </div>
  )
}
