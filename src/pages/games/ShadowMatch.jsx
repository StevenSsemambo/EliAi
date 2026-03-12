import { useState, useEffect, useRef, useMemo } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── ShadowMatch ───────────────────────────────────────────────────
// Players see a 3D shape made of unit cubes on an isometric grid.
// They must pick which of 4 silhouettes (top/front/side views) matches.
// Builds: spatial reasoning, 3D mental visualization, perspective-taking.

// Each shape is defined as [x,y,z] cube positions
// We render them as ASCII/emoji isometric views

const SHAPES = [
  {
    name: 'L-Tower',
    cubes: [[0,0,0],[1,0,0],[2,0,0],[2,0,1],[2,0,2]],
    views: {
      top:   [[1,0,1,0],[0,0,1,0],[0,0,0,0]], // top-down projection (row=y, col=x)
      front: [[0,0,1,0],[0,0,1,0],[1,1,1,0]], // front view (row=z from top, col=x)
      side:  [[1,0,0,0],[1,0,0,0],[1,0,0,0]], // right-side view
    },
    correct: 'front',
    question: 'Which view shows the FRONT of this shape?',
  },
  {
    name: 'Staircase',
    cubes: [[0,0,0],[1,0,0],[1,0,1],[2,0,0],[2,0,1],[2,0,2]],
    views: {
      top:   [[1,1,1],[0,1,1],[0,0,1]],
      front: [[1,1,1],[0,1,1],[0,0,1]],
      side:  [[1,0,0],[1,1,0],[1,1,1]],
    },
    correct: 'side',
    question: 'Which view shows the SIDE of this shape?',
  },
  {
    name: 'Cross',
    cubes: [[1,0,0],[0,0,1],[1,0,1],[2,0,1],[1,0,2]],
    views: {
      top:   [[0,1,0],[1,1,1],[0,1,0]],
      front: [[0,1,0],[1,1,1],[0,0,0]],
      side:  [[0,1,0],[0,1,1],[0,1,0]],
    },
    correct: 'top',
    question: 'Which view shows the TOP of this shape?',
  },
  {
    name: 'T-Shape',
    cubes: [[0,0,0],[1,0,0],[2,0,0],[1,0,1],[1,0,2]],
    views: {
      top:   [[1,1,1],[0,1,0],[0,1,0]],
      front: [[0,0,0],[1,1,1],[0,0,0]],
      side:  [[1,0],[1,0],[1,1]],
    },
    correct: 'top',
    question: 'Which view shows the TOP of this shape?',
  },
  {
    name: 'Corner Tower',
    cubes: [[0,0,0],[1,0,0],[0,0,1],[0,0,2],[0,0,3]],
    views: {
      top:   [[1,1],[1,0],[1,0],[1,0]],
      front: [[1,0],[1,0],[1,0],[1,1]],
      side:  [[1,0],[1,0],[1,0],[0,1]],
    },
    correct: 'front',
    question: 'Which view is the FRONT of this shape?',
  },
  {
    name: 'Pyramid Step',
    cubes: [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[1,0,1],[2,0,1],[2,0,2]],
    views: {
      top:   [[0,0,1,0],[0,1,1,0],[1,1,1,1]],
      front: [[0,0,1,0],[0,1,1,0],[1,1,1,1]],
      side:  [[1,0,0],[1,1,0],[1,1,1]],
    },
    correct: 'side',
    question: 'Which is the SIDE view?',
  },
]

// Render a 2D grid as tiny colored cells
function GridView({ grid, color, label, selected, correct, wrong, onClick }) {
  if (!grid || !grid.length) return null
  const rows = grid.length
  const cols = Math.max(...grid.map(r => r.length))

  return (
    <button onClick={onClick} style={{
      padding:'10px 8px',borderRadius:12,border:'none',cursor:'pointer',
      background: correct ? 'rgba(74,222,128,0.15)' : wrong ? 'rgba(239,68,68,0.15)' : selected ? `${color}18` : 'rgba(255,255,255,0.04)',
      outline: correct ? '2px solid rgba(74,222,128,0.7)' : wrong ? '2px solid rgba(239,68,68,0.7)' : selected ? `2px solid ${color}88` : '1px solid rgba(255,255,255,0.07)',
      transition:'all 0.15s',
      display:'flex',flexDirection:'column',alignItems:'center',gap:6,
    }}>
      {/* Mini grid */}
      <div style={{ display:'grid',gridTemplateRows:`repeat(${rows},14px)`,gridTemplateColumns:`repeat(${cols},14px)`,gap:2 }}>
        {grid.map((row, ri) =>
          Array.from({ length: cols }, (_, ci) => (
            <div key={`${ri}-${ci}`} style={{
              width:14,height:14,borderRadius:3,
              background: row[ci] ? (correct?'#4ADE80':wrong?'#EF4444':selected?color:'#475569') : 'rgba(255,255,255,0.05)',
              border: row[ci] ? 'none' : '1px solid rgba(255,255,255,0.04)',
              transition:'background 0.2s',
            }}/>
          ))
        )}
      </div>
      <div style={{ fontSize:10,fontWeight:700,color: correct?'#4ADE80':wrong?'#EF4444':selected?color:'#475569' }}>
        {label}
      </div>
    </button>
  )
}

// Render 3D shape isometrically using Unicode block chars
function IsoView({ cubes, color }) {
  // Project to 2D isometric
  // iso_x = (x - z), iso_y = (x + z)/2 - y
  const ISO = '▪'
  const maxX = 8, maxY = 6
  const grid = Array.from({ length: maxY }, () => Array(maxX).fill(null))

  for (const [x, y, z] of cubes) {
    const ix = Math.round(3 + x - z)
    const iy = Math.round(2 + (x + z) / 2 - y)
    if (iy >= 0 && iy < maxY && ix >= 0 && ix < maxX) {
      grid[iy][ix] = { x, y, z }
    }
  }

  return (
    <div style={{ fontFamily:'monospace',lineHeight:1,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642',display:'inline-block' }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display:'flex' }}>
          {row.map((cell, ci) => (
            <span key={ci} style={{ width:14,height:14,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:12,color:cell?color:'transparent' }}>
              {cell ? ISO : ' '}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,6,14,0.97)',backdropFilter:'blur(10px)',borderRadius:14 }}>
      <div style={{ textAlign:'center',padding:'0 24px' }}>
        <div style={{ fontSize:54,marginBottom:10 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:6 }}>{title}</div>
        <div style={{ color,fontSize:14,marginBottom:24,lineHeight:1.5 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'11px 24px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer' }}>Next Shape</button>
          <button onClick={onExit}  style={{ padding:'11px 24px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#111827',border:'none',cursor:'pointer' }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

function HowToPlayShadow({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Shadow Match</div>
      </div>
      {[
        ['🧊', 'See the 3D shape', 'A 3D shape built from cubes is shown on the left. Spin it in your mind.'],
        ['👁', 'Pick the correct shadow', '4 flat grid images are shown. One is the correct view (top, front or side) of that shape.'],
        ['🔍', 'Read the question', 'The question tells you WHICH view to find — top, front or side.'],
        ['⚡', 'Tap fast', 'Correct answers give time bonus points. Wrong answers show what\'s right.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#F9A8D4', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💡 Tips</div>
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
          • Top view = looking straight down<br/>
          • Front view = looking from in front<br/>
          • Side view = looking from the right<br/>
          • Count rows and columns to eliminate wrong options
        </div>
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${game.color}, #9333EA)` }}>
        Start Game →
      </button>
    </div>
  )
}

export default function ShadowMatch({ game, levelData, studentId, onFinish }) {
  const { rounds = 6, timePerQ = 20, difficulty = 1 } = levelData

  const [screen, setScreen]       = useState('guide')
  const [shapeIdx, setShapeIdx]   = useState(() => Math.floor(Math.random()*SHAPES.length))
  const [selected, setSelected]   = useState(null)
  const [feedback, setFeedback]   = useState(null)
  const [timeLeft, setTimeLeft]   = useState(timePerQ)
  const [round, setRound]         = useState(1)
  const [score, setScore]         = useState(0)
  const [correct, setCorrect]     = useState(0)
  const [phase, setPhase]         = useState('playing')
  const locked = useRef(false)

  const shape = SHAPES[shapeIdx]
  // Rebuild options every time shapeIdx changes (was broken: useState only runs once)
  const options = useMemo(() => {
    const keys = Object.keys(shape.views)
    const correctKey = shape.correct
    const wrongs = shuffle(keys.filter(k => k !== correctKey)).slice(0, 2)
    const otherShape = SHAPES[(shapeIdx + 1) % SHAPES.length]
    const allOpts = [
      { key: correctKey, grid: shape.views[correctKey], label: `${correctKey.charAt(0).toUpperCase()+correctKey.slice(1)} View`, isCorrect: true },
      ...wrongs.map(k => ({ key: k, grid: shape.views[k], label: `${k.charAt(0).toUpperCase()+k.slice(1)} View`, isCorrect: false })),
      { key: 'extra', grid: Object.values(otherShape.views)[0], label: 'Alternate', isCorrect: false },
    ]
    return shuffle(allOpts.slice(0, 4))
  }, [shapeIdx])

  useEffect(() => {
    if (phase !== 'playing' || feedback) return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); handlePick(null); return 0 }
      if (s <= 8) SoundEngine.timerTick(s <= 3 ? 3 : 2)
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase, feedback, round])

  function handlePick(opt) {
    if (locked.current || phase !== 'playing') return
    locked.current = true
    setSelected(opt?.key || null)
    const ok = opt?.isCorrect === true

    if (ok) {
      SoundEngine.gameCorrect()
      setFeedback('right')
      setScore(s => s + Math.round(10 + (timeLeft/timePerQ)*25))
      setCorrect(c => c + 1)
    } else {
      SoundEngine.gameWrong()
      setFeedback('wrong')
    }

    setTimeout(() => {
      locked.current = false
      setFeedback(null); setSelected(null)
      const nextRound = round + 1
      if (nextRound > rounds) {
        SoundEngine.levelComplete()
        setPhase('done')
        if (studentId) saveGameScore(studentId, game.id, levelData.level, score + (ok?Math.round(10+(timeLeft/timePerQ)*25):0))
        return
      }
      setShapeIdx(Math.floor(Math.random()*SHAPES.length))
      setRound(nextRound); setTimeLeft(timePerQ)
    }, ok ? 700 : 1300)
  }

  const tc = timeLeft > timePerQ * 0.6 ? '#4ADE80' : timeLeft > timePerQ * 0.3 ? '#F59E0B' : '#EF4444'

  if (screen === 'guide') return <HowToPlayShadow game={game} onStart={() => setScreen('playing')} />

  return (
    <div style={{ position:'relative' }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
        <div style={{ display:'flex',gap:12,fontSize:12 }}>
          <span style={{ color:'#FBBF24',fontWeight:800 }}>⭐ {score}</span>
          <span style={{ color:'#475569' }}>Q {round}/{rounds}</span>
          <span style={{ color:'#4ADE80' }}>✓ {correct}</span>
        </div>
        <span style={{ color:tc,fontWeight:800,fontFamily:'monospace',fontSize:13 }}>{timeLeft}s</span>
      </div>

      {/* Timer */}
      <div style={{ height:4,borderRadius:99,background:'#0F1629',marginBottom:14 }}>
        <div style={{ height:'100%',borderRadius:99,width:`${(timeLeft/timePerQ)*100}%`,background:tc,transition:'width 1s linear,background 0.4s' }}/>
      </div>

      {/* 3D Shape display */}
      <div style={{ textAlign:'center',marginBottom:12 }}>
        <div style={{ color:'#475569',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:8 }}>
          3D Shape — {shape.name}
        </div>
        <div style={{ display:'flex',justifyContent:'center' }}>
          <IsoView cubes={shape.cubes} color={game.color} />
        </div>
      </div>

      {/* Question */}
      <div style={{ textAlign:'center',color:'#94A3B8',fontSize:13,fontWeight:600,marginBottom:14 }}>
        {shape.question}
      </div>

      {/* Choices */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        {options.map((opt, i) => (
          <GridView
            key={i}
            grid={opt.grid}
            color={game.color}
            label={opt.label}
            selected={selected === opt.key}
            correct={feedback && opt.isCorrect}
            wrong={feedback === 'wrong' && selected === opt.key && !opt.isCorrect}
            onClick={() => handlePick(opt)}
          />
        ))}
      </div>

      {phase==='done' && <Overlay icon="🎯" title="Shapes Mastered!" sub={`${correct}/${rounds} correct · ${score} pts`} color={correct>=rounds*0.7?'#4ADE80':'#F59E0B'} onRetry={() => { setRound(1);setScore(0);setCorrect(0);setPhase('playing');setTimeLeft(timePerQ);setShapeIdx(Math.floor(Math.random()*SHAPES.length));locked.current=false }} onExit={onFinish} game={game}/>}
    </div>
  )
}
