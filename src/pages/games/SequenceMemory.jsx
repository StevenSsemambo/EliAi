import { useState, useEffect, useRef, useCallback } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'
import { SoundEngine } from '../../utils/soundEngine.js'

// Button shapes & positions in a circular/grid layout
const BUTTON_CONFIGS = [
  // 4 buttons - cardinal
  [[0,1],[1,2],[2,1],[1,0]],
  // 5 buttons
  [[0,1],[1,2],[2,1],[1,0],[1,1]],
  // 6 buttons - 2x3
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],
  // 7 buttons
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,1]],
  // 8 buttons - 2x4
  [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3]],
  // 9 buttons - 3x3
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
]

const COLORS = [
  { bg: '#7C3AED', glow: 'rgba(124,58,237,0.8)', dim: 'rgba(124,58,237,0.15)', icon: '🔮' },
  { bg: '#0891B2', glow: 'rgba(8,145,178,0.8)',   dim: 'rgba(8,145,178,0.15)',   icon: '💎' },
  { bg: '#059669', glow: 'rgba(5,150,105,0.8)',   dim: 'rgba(5,150,105,0.15)',   icon: '💚' },
  { bg: '#F59E0B', glow: 'rgba(245,158,11,0.8)',  dim: 'rgba(245,158,11,0.15)',  icon: '⭐' },
  { bg: '#EC4899', glow: 'rgba(236,72,153,0.8)',  dim: 'rgba(236,72,153,0.15)',  icon: '🌸' },
  { bg: '#EF4444', glow: 'rgba(239,68,68,0.8)',   dim: 'rgba(239,68,68,0.15)',   icon: '🔴' },
  { bg: '#06B6D4', glow: 'rgba(6,182,212,0.8)',   dim: 'rgba(6,182,212,0.15)',   icon: '🌊' },
  { bg: '#84CC16', glow: 'rgba(132,204,22,0.8)',  dim: 'rgba(132,204,22,0.15)',  icon: '🌿' },
  { bg: '#F97316', glow: 'rgba(249,115,22,0.8)',  dim: 'rgba(249,115,22,0.15)', icon: '🔥' },
]


function HowToPlayGuide__SequenceMemory({ game, onStart }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🧠</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Sequence Memory</div>
      </div>
      {[
        ['👁', 'Watch the sequence', `Buttons flash one by one in a specific order. Pay attention!`],
        ['🔁', 'Repeat it back', `Once the sequence ends, tap the buttons in exactly the same order.`],
        ['📈', 'It grows', `Each successful round adds one more step to the sequence.`],
        ['❤️', 'Lives', `You have limited lives. A wrong tap costs one life.`],
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
        <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: `• Try saying the colours/positions out loud as they flash<br/>• Group sequences in threes mentally<br/>• Don't rush — accuracy beats speed here` }} />
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, game.color, #7C3AED)` }}>
        Start Game →
      </button>
    </div>
  )
}

export default function SequenceMemory({ game, levelData, studentId, onFinish }) {
  const { buttons: numButtons, startLen, flashMs, lives: maxLives } = levelData
  const [screen, setScreen] = useState('guide')

  const [phase, setPhase]         = useState('ready')    // ready|watch|input|right|wrong|dead|win
  const [sequence, setSequence]   = useState([])
  const [userInput, setUserInput] = useState([])
  const [lit, setLit]             = useState(-1)          // which button is flashing
  const [round, setRound]         = useState(1)
  const [lives, setLives]         = useState(maxLives)
  const [score, setScore]         = useState(0)
  const [bestRound, setBestRound] = useState(0)
  const [flashIdx, setFlashIdx]   = useState(0)
  const pauseMs = Math.round(flashMs * 0.4)

  const gridConfig = BUTTON_CONFIGS[Math.min(numButtons - 4, BUTTON_CONFIGS.length - 1)]
  const rows = gridConfig ? Math.max(...gridConfig.map(([r]) => r)) + 1 : 2
  const cols = gridConfig ? Math.max(...gridConfig.map(([, c]) => c)) + 1 : 2

  // Play sequence
  const playSequence = useCallback((seq) => {
    setPhase('watch')
    setLit(-1)
    let i = 0
    function step() {
      if (i >= seq.length) { setTimeout(() => { setLit(-1); setPhase('input'); setUserInput([]) }, pauseMs); return }
      setLit(-1)
      setTimeout(() => {
        setLit(seq[i]); SoundEngine.seqButton(seq[i])
        setFlashIdx(i)
        i++
        setTimeout(step, flashMs)
      }, pauseMs)
    }
    setTimeout(step, 400)
  }, [flashMs, pauseMs])

  function startGame() {
    const first = [Math.floor(Math.random() * numButtons)]
    setSequence(first)
    setRound(1)
    setLives(maxLives)
    setScore(0)
    playSequence(first)
  }

  function handleButton(idx) {
    if (phase !== 'input') return
    SoundEngine.seqButton(idx)
    const newInput = [...userInput, idx]
    setUserInput(newInput)
    const pos = newInput.length - 1

    if (newInput[pos] !== sequence[pos]) {
      // Wrong
      const newLives = lives - 1
      setLives(newLives)
      SoundEngine.gameWrong(); setPhase('wrong')
      if (newLives <= 0) {
        setTimeout(() => { SoundEngine.gameWrong(); setPhase('dead') }, 900)
        if (studentId) saveGameScore(studentId, game.id, levelData.level, score)
      } else {
        setTimeout(() => playSequence(sequence), 1000)
      }
      return
    }

    if (newInput.length === sequence.length) {
      // Complete!
      const pts = round * 100 + Math.round(sequence.length * 20)
      const newScore = score + pts
      setScore(newScore)
      setBestRound(b => Math.max(b, round))
      SoundEngine.gameCorrect(); setPhase('right')

      // Win condition: survive startLen + 15 rounds
      if (round >= startLen + 15) {
        SoundEngine.levelComplete(); setTimeout(() => { setPhase('win'); if (studentId) saveGameScore(studentId, game.id, levelData.level, newScore) }, 800)
        return
      }

      // Extend sequence
      const next = [...sequence, Math.floor(Math.random() * numButtons)]
      setSequence(next)
      setTimeout(() => {
        setRound(r => r + 1)
        playSequence(next)
      }, 900)
    }
  }

  const CELL_SIZE = numButtons <= 4 ? 80 : numButtons <= 6 ? 72 : numButtons <= 8 ? 64 : 56

  if (screen === 'guide') return <HowToPlayGuide__SequenceMemory game={game} onStart={() => setScreen('playing')} />

  return (
    <div className="relative">
      <style>{`
        @keyframes pulse-bright { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes popIn { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-10px)} 75%{transform:translateX(10px)} }
      `}</style>

      {/* READY */}
      {phase === 'ready' && (
        <div className="text-center py-4">
          <div className="text-5xl mb-4">🧠</div>
          <h3 className="text-white font-black text-xl mb-1">{levelData.name}</h3>
          <p className="text-slate-400 text-sm mb-2">Watch the sequence — repeat it exactly.</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[['Buttons', numButtons, '#EC4899'], ['Lives', maxLives, '#EF4444'], ['Start Len', startLen, game.color]].map(([l,v,c]) => (
              <div key={l} className="rounded-xl p-2 text-center" style={{ background:'#0F1629', border:`1px solid ${c}33` }}>
                <div className="font-black text-sm" style={{ color:c }}>{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>
          <button onClick={startGame} className="w-full py-4 rounded-2xl font-black text-lg text-white"
            style={{ background:`linear-gradient(135deg, ${game.color}, #7C3AED)` }}>
            🧠 Begin
          </button>
        </div>
      )}

      {/* GAME */}
      {(phase === 'watch' || phase === 'input' || phase === 'right' || phase === 'wrong') && (
        <div>
          {/* Status */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex gap-1">
              {Array.from({ length: maxLives }).map((_, i) => (
                <span key={i} className="text-lg" style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500">Round </span>
              <span className="font-black text-white">{round}</span>
              <span className="text-xs text-slate-500"> · Len </span>
              <span className="font-black" style={{ color: game.color }}>{sequence.length}</span>
            </div>
            <div className="font-black text-white">⭐ {score}</div>
          </div>

          {/* Status banner */}
          <div className="text-center mb-4 py-2 rounded-xl text-sm font-bold transition-all" style={{
            background: phase === 'right' ? 'rgba(74,222,128,0.1)' : phase === 'wrong' ? 'rgba(239,68,68,0.1)' : '#0F1629',
            color: phase === 'right' ? '#4ADE80' : phase === 'wrong' ? '#EF4444' : phase === 'watch' ? '#F59E0B' : game.color,
            border: `1px solid ${phase === 'right' ? 'rgba(74,222,128,0.3)' : phase === 'wrong' ? 'rgba(239,68,68,0.3)' : '#1A2035'}`
          }}>
            {phase === 'watch' ? `👁 Watch... (${flashIdx + 1}/${sequence.length})`
              : phase === 'input' ? `👆 Your turn! (${userInput.length}/${sequence.length})`
              : phase === 'right' ? '✓ Perfect!'
              : '✗ Wrong — watch again!'}
          </div>

          {/* Button grid */}
          <div className="flex justify-center">
            <div style={{
              display: 'grid',
              gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
              gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
              gap: 8,
              animation: phase === 'wrong' ? 'wrongShake 0.3s ease' : 'none'
            }}>
              {Array.from({ length: numButtons }).map((_, idx) => {
                const [r, c] = gridConfig[idx] || [0, idx]
                const col = COLORS[idx % COLORS.length]
                const isLit = lit === idx
                return (
                  <button key={idx}
                    onClick={() => handleButton(idx)}
                    style={{
                      gridRow: r + 1, gridColumn: c + 1,
                      width: CELL_SIZE, height: CELL_SIZE,
                      borderRadius: 16,
                      background: isLit ? col.bg : col.dim,
                      border: `2px solid ${isLit ? col.bg : 'transparent'}`,
                      boxShadow: isLit ? `0 0 24px ${col.glow}, 0 0 48px ${col.glow}` : 'none',
                      transform: isLit ? 'scale(1.08)' : 'scale(1)',
                      transition: 'all 0.12s ease',
                      cursor: phase === 'input' ? 'pointer' : 'default',
                      fontSize: CELL_SIZE > 64 ? '1.8rem' : '1.4rem',
                    }}>
                    {isLit ? col.icon : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-4">
            {sequence.map((_, i) => (
              <div key={i} className="rounded-full transition-all" style={{
                width: 6, height: 6,
                background: i < userInput.length ? game.color : '#1A2035'
              }} />
            ))}
          </div>
        </div>
      )}

      {/* DEAD */}
      {phase === 'dead' && (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">💀</div>
          <h3 className="text-white font-black text-xl mb-1">Lost in Space</h3>
          <p className="text-slate-400 text-sm mb-1">Reached round <strong style={{ color: game.color }}>{round}</strong> — sequence length <strong style={{ color: game.color }}>{sequence.length}</strong></p>
          <p className="font-black text-2xl text-white mb-5">⭐ {score}</p>
          <div className="flex gap-3">
            <button onClick={startGame} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background: game.color }}>Try Again</button>
            <button onClick={onFinish} className="flex-1 py-3 rounded-2xl font-bold" style={{ background:'#1A2035', color:'#94A3B8' }}>Exit</button>
          </div>
        </div>
      )}

      {/* WIN */}
      {phase === 'win' && (
        <div className="text-center py-6">
          <div className="text-5xl mb-3" style={{ animation:'popIn 0.5s ease' }}>🌟</div>
          <h3 className="text-white font-black text-xl mb-1">Level Mastered!</h3>
          <p className="text-slate-400 text-sm mb-1">Completed {round} rounds</p>
          <p className="font-black text-2xl text-white mb-5">⭐ {score}</p>
          <div className="flex gap-3">
            <button onClick={startGame} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background: game.color }}>Play Again</button>
            <button onClick={onFinish} className="flex-1 py-3 rounded-2xl font-bold" style={{ background:'#1A2035', color:'#94A3B8' }}>Exit</button>
          </div>
        </div>
      )}
    </div>
  )
}
