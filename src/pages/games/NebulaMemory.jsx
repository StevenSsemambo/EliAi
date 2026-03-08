import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const SPACE_ICONS = ['🌍','🌙','☀️','🪐','⭐','🌟','🌠','🚀','🛸','🌌','🔭','🌑','💫','🌊','❄️','🔥','⚡','🌋','🌈','🪐']
const ATOM_ICONS  = ['⚛️','🔬','🧪','🔩','💎','🔋','⚙️','🧲','🌡️','🔭','📡','🛰️','☢️','⚗️','🔌','💡','🧬','🦠','🌀','💠']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
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

function NebulaMemory({ game, levelData, studentId, onFinish }) {
  const { pairs, timeLimit } = levelData
  const icons = shuffle([...SPACE_ICONS, ...ATOM_ICONS]).slice(0, pairs)
  const [cards, setCards] = useState(() =>
    shuffle([...icons, ...icons].map((icon, i) => ({ id: i, icon, flipped: false, matched: false })))
  )
  const [selected, setSelected] = useState([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [phase, setPhase] = useState('playing') // playing | won | lost
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const locked = useRef(false)

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); endGame(false); return 0 }
      if(s <= 10) SoundEngine.timerTick(s<=3?3:s<=6?2:1)
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  function endGame(won) {
    const finalScore = won
      ? Math.max(0, Math.round((timeLeft / timeLimit) * 1000 + (pairs * 50) - moves * 3))
      : Math.round(matches * 20)
    setScore(finalScore)
    if(won) SoundEngine.levelComplete(); setPhase(won ? 'won' : 'lost')
    if (studentId) {
      saveGameScore(studentId, game.id, levelData.level, finalScore).then(() => {})
    }
  }

  function flip(card) {
    if (locked.current || card.flipped || card.matched || phase !== 'playing') return
    SoundEngine.cardFlip(); const newCards = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c)
    setCards(newCards)
    const newSel = [...selected, card]
    setSelected(newSel)
    if (newSel.length === 2) {
      locked.current = true
      setMoves(m => m + 1)
      setTimeout(() => {
        const [a, b] = newSel
        if (a.icon === b.icon) { SoundEngine.gameCorrect();
          setCards(cs => cs.map(c => c.id === a.id || c.id === b.id ? { ...c, matched: true } : c))
          const newMatches = matches + 1
          setMatches(newMatches)
          if (newMatches === pairs) endGame(true)
        } else { SoundEngine.gameWrong();
          setCards(cs => cs.map(c => c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c))
        }
        setSelected([])
        locked.current = false
      }, 900)
    }
  }

  function restart() {
    const newIcons = shuffle([...SPACE_ICONS, ...ATOM_ICONS]).slice(0, pairs)
    setCards(shuffle([...newIcons, ...newIcons].map((icon, i) => ({ id: i, icon, flipped: false, matched: false }))))
    setSelected([]); setMoves(0); setMatches(0)
    setTimeLeft(timeLimit); setPhase('playing'); setScore(0)
  }

  const cols = levelData.gridSize || 4
  const timerPct = (timeLeft / timeLimit) * 100
  const timerColor = timeLeft > timeLimit * 0.5 ? '#4ADE80' : timeLeft > timeLimit * 0.25 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative">
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <ScoreBar score={score} best={highScore} />
        <div className="flex items-center gap-3 text-sm">
          <span style={{ color: '#94A3B8' }}>🃏 {moves}</span>
          <span style={{ color: '#94A3B8' }}>✅ {matches}/{pairs}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: '#94A3B8' }}>Time</span>
          <span className="font-bold font-mono" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1A2035' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.5s' }} />
        </div>
      </div>

      {/* Grid */}
      <div className="relative" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: cols >= 6 ? '4px' : '6px'
      }}>
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card)}
            className="aspect-square rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90"
            style={{
              background: card.matched ? 'rgba(74,222,128,0.15)'
                : card.flipped ? `${game.color}22`
                : 'linear-gradient(135deg, #0F1629, #131829)',
              border: card.matched ? '1px solid rgba(74,222,128,0.4)'
                : card.flipped ? `1px solid ${game.color}66`
                : '1px solid #1A2035',
              boxShadow: card.matched ? '0 0 8px rgba(74,222,128,0.3)' : 'none',
              transform: card.flipped || card.matched ? 'rotateY(0deg)' : 'rotateY(180deg)',
              fontSize: cols >= 6 ? '1.1rem' : '1.4rem'
            }}>
            {card.flipped || card.matched ? card.icon : '✦'}
          </button>
        ))}

        {phase === 'won' && (
          <GameOverlay title="Stellar!" subtitle={`Score: ${score} pts`} icon="🌟" color="#4ADE80">
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: game.color }}>Play Again</button>
              <button onClick={onFinish} className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: '#1A2035', color: '#94A3B8' }}>Exit</button>
            </div>
          </GameOverlay>
        )}
        {phase === 'lost' && (
          <GameOverlay title="Lost in Space" subtitle={`Matched ${matches}/${pairs} pairs`} icon="🌌" color="#EF4444">
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: game.color }}>Try Again</button>
              <button onClick={onFinish} className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: '#1A2035', color: '#94A3B8' }}>Exit</button>
            </div>
          </GameOverlay>
        )}
      </div>
    </div>
  )
}


export default NebulaMemory
