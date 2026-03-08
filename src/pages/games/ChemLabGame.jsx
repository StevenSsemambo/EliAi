import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { SoundEngine } from '../../utils/soundEngine.js'

// ── Chemistry reaction database (curriculum-aligned) ──────────────
const REACTIONS = [
  // Level 1-6: Acids + Bases (S1-S2)
  { id:'r1', a:'HCl',   b:'NaOH',  product:'NaCl + H₂O',    type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base → Salt + Water' },
  { id:'r2', a:'H₂SO₄', b:'KOH',   product:'K₂SO₄ + H₂O',  type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base → Salt + Water' },
  { id:'r3', a:'HNO₃',  b:'Ca(OH)₂',product:'Ca(NO₃)₂ + H₂O',type:'Neutralisation',color:'#4ADE80', hint:'Acid + Base → Salt + Water' },
  // Level 7-12: Metals + Acids (S2-S3)
  { id:'r4', a:'Zn',    b:'HCl',   product:'ZnCl₂ + H₂↑',   type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid → salt + hydrogen gas' },
  { id:'r5', a:'Fe',    b:'H₂SO₄', product:'FeSO₄ + H₂↑',   type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid → salt + hydrogen gas' },
  { id:'r6', a:'Mg',    b:'HCl',   product:'MgCl₂ + H₂↑',   type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid → salt + hydrogen gas' },
  // Level 13-18: Combustion (S3-S4)
  { id:'r7', a:'C',     b:'O₂',    product:'CO₂',            type:'Combustion',     color:'#EF4444', hint:'Carbon burns in oxygen → carbon dioxide' },
  { id:'r8', a:'CH₄',   b:'O₂',    product:'CO₂ + H₂O',     type:'Combustion',     color:'#EF4444', hint:'Hydrocarbon + oxygen → CO₂ + water' },
  { id:'r9', a:'H₂',    b:'O₂',    product:'H₂O',            type:'Combustion',     color:'#EF4444', hint:'Hydrogen burns to form water' },
  // Level 19-24: Displacement (S4-S6)
  { id:'r10',a:'Fe',    b:'CuSO₄', product:'FeSO₄ + Cu',     type:'Displacement',   color:'#7C3AED', hint:'More reactive metal displaces less reactive one' },
  { id:'r11',a:'Zn',    b:'CuSO₄', product:'ZnSO₄ + Cu',     type:'Displacement',   color:'#7C3AED', hint:'Zinc is more reactive than copper' },
  { id:'r12',a:'Mg',    b:'ZnSO₄', product:'MgSO₄ + Zn',     type:'Displacement',   color:'#7C3AED', hint:'Magnesium displaces zinc from solution' },
]

const WRONG_PRODUCTS = [
  'No reaction', 'H₂SO₄ + O₂', 'NaOH + Cl₂', 'CaCl₂ + H₂',
  'KNO₃ + H₂O', 'MgO + H₂', 'FeO + CO₂', 'Na₂O + H₂O',
  'CO + H₂O', 'ZnO + HCl', 'CuO + H₂SO₄', 'Al₂O₃ + H₂',
]

function getReactionForLevel(level) {
  const idx = Math.min(Math.floor((level - 1) / 2), REACTIONS.length - 1)
  return REACTIONS[idx]
}

function BubbleAnimation({ color }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute w-3 h-3 rounded-full opacity-70"
          style={{
            background: color,
            animation: `bubble 1s ease-out ${i * 0.1}s forwards`,
            transform: `rotate(${i * 45}deg) translateX(${20 + Math.random() * 20}px)`,
          }}/>
      ))}
    </div>
  )
}

export default function ChemLabGame({ level = 1, onComplete, onExit }) {
  const { theme }   = useTheme()
  const { student } = useUser()

  const reaction    = getReactionForLevel(level)
  const [phase, setPhase]     = useState('mix')    // mix | reacting | answer | result
  const [selected, setSelected] = useState(null)
  const [options, setOptions]   = useState([])
  const [score, setScore]       = useState(0)
  const [questions, setQuestions] = useState(0)
  const [streak, setStreak]     = useState(0)
  const [showBubbles, setShowBubbles] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25)
  const [lives, setLives]       = useState(3)

  const TOTAL_ROUNDS = Math.min(5 + Math.floor(level / 4), 10)

  useEffect(() => {
    // Build answer options
    const wrong = WRONG_PRODUCTS
      .filter(w => w !== reaction.product)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const opts = [reaction.product, ...wrong].sort(() => Math.random() - 0.5)
    setOptions(opts)
  }, [reaction])

  useEffect(() => {
    if (phase !== 'answer') return
    const t = setInterval(() => {
      setTimeLeft(tl => {
        if (tl <= 1) { clearInterval(t); handleAnswer(null); return 0 }
        return tl - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  function startReaction() {
    SoundEngine.tap()
    setPhase('reacting')
    setShowBubbles(true)
    setTimeout(() => { setShowBubbles(false); setPhase('answer'); setTimeLeft(25) }, 1800)
  }

  function handleAnswer(ans) {
    if (phase !== 'answer') return
    setSelected(ans)
    const correct = ans === reaction.product
    setPhase('result')

    if (correct) {
      SoundEngine.gameCorrect?.()
      setScore(s => s + Math.max(10, timeLeft * 4 + streak * 5))
      setStreak(s => s + 1)
    } else {
      SoundEngine.gameWrong?.()
      setStreak(0)
      setLives(l => l - 1)
    }

    const nextQ = questions + 1
    setQuestions(nextQ)

    setTimeout(() => {
      if (lives <= 1 && !correct || nextQ >= TOTAL_ROUNDS) {
        // Game over
        const finalScore = score + (correct ? Math.max(10, timeLeft * 4) : 0)
        onComplete?.({ score: finalScore, correct: correct ? score/10+1 : score/10, total: TOTAL_ROUNDS })
      } else {
        setPhase('mix')
        setSelected(null)
        setTimeLeft(25)
      }
    }, 1800)
  }

  const reactionCol = reaction.color

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      <style>{`
        @keyframes bubble { to { transform: translateY(-60px) scale(0); opacity: 0; } }
        @keyframes shake  { 0%,100%{transform:none} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-10 pb-4" style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onExit} style={{ color: theme.muted }}>✕</button>
          <span className="font-black text-sm" style={{ color: theme.text }}>🧪 Chem Lab — Level {level}</span>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
            <div className="h-full rounded-full" style={{ width: `${(questions/TOTAL_ROUNDS)*100}%`, background: reactionCol }}/>
          </div>
          <span className="text-xs font-bold" style={{ color: theme.muted }}>{questions}/{TOTAL_ROUNDS}</span>
          <span className="text-xs font-black" style={{ color: '#F59E0B' }}>⭐ {score}</span>
        </div>
      </div>

      {/* Lab bench */}
      <div className="flex-1 flex flex-col items-center px-5 py-6">

        {/* Reaction type label */}
        <div className="px-3 py-1 rounded-full text-xs font-black mb-4"
          style={{ background: `${reactionCol}22`, color: reactionCol }}>
          {reaction.type} Reaction
        </div>

        {/* Beakers */}
        <div className="flex items-end justify-center gap-8 mb-6">
          {/* Beaker A */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-24 rounded-b-xl relative flex items-end justify-center overflow-hidden"
              style={{ background: 'rgba(8,145,178,0.15)', border: '2px solid rgba(8,145,178,0.4)' }}>
              <div className="w-full rounded-b-xl transition-all"
                style={{ height: '60%', background: 'rgba(8,145,178,0.3)' }}/>
              {showBubbles && <BubbleAnimation color={reactionCol}/>}
            </div>
            <p className="text-sm font-black" style={{ color: theme.text }}>{reaction.a}</p>
          </div>

          {/* Plus sign */}
          <div className="text-3xl font-black pb-10" style={{ color: theme.muted }}>+</div>

          {/* Beaker B */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-24 rounded-b-xl relative flex items-end justify-center overflow-hidden"
              style={{ background: 'rgba(124,58,237,0.15)', border: '2px solid rgba(124,58,237,0.4)' }}>
              <div className="w-full rounded-b-xl"
                style={{ height: '60%', background: 'rgba(124,58,237,0.3)' }}/>
              {showBubbles && <BubbleAnimation color={reactionCol}/>}
            </div>
            <p className="text-sm font-black" style={{ color: theme.text }}>{reaction.b}</p>
          </div>
        </div>

        {/* Mix button */}
        {phase === 'mix' && (
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: theme.muted }}>
              {reaction.hint}
            </p>
            <button onClick={startReaction}
              className="px-8 py-4 rounded-2xl font-black text-white text-lg transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg,${reactionCol},#7C3AED)` }}>
              ⚗️ Mix Chemicals!
            </button>
          </div>
        )}

        {/* Reacting */}
        {phase === 'reacting' && (
          <div className="text-center">
            <div className="text-4xl mb-2" style={{ animation: 'shake 0.3s ease infinite' }}>⚗️</div>
            <p className="font-black" style={{ color: reactionCol }}>Reaction in progress...</p>
          </div>
        )}

        {/* Question */}
        {(phase === 'answer' || phase === 'result') && (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black" style={{ color: theme.text }}>
                What are the products?
              </p>
              {phase === 'answer' && (
                <span className="font-black text-sm" style={{ color: timeLeft < 8 ? '#EF4444' : theme.accent }}>
                  {timeLeft}s
                </span>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, i) => {
                let bg = theme.card, border = `1px solid ${theme.border}`, textCol = theme.text
                if (phase === 'result') {
                  if (opt === reaction.product) { bg = 'rgba(74,222,128,0.12)'; border = '2px solid #22C55E'; textCol = '#4ADE80' }
                  else if (opt === selected)    { bg = 'rgba(239,68,68,0.12)';  border = '2px solid #EF4444'; textCol = '#EF4444' }
                }
                return (
                  <button key={i} onClick={() => handleAnswer(opt)} disabled={phase === 'result'}
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all active:scale-95"
                    style={{ background: bg, border, color: textCol }}>
                    {opt}
                  </button>
                )
              })}
            </div>

            {phase === 'result' && (
              <div className="mt-3 rounded-xl px-3 py-2"
                style={{ background: selected === reaction.product ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)' }}>
                <p className="text-xs font-bold" style={{ color: selected === reaction.product ? '#4ADE80' : '#EF4444' }}>
                  {selected === reaction.product ? '✅ Correct!' : `❌ Answer: ${reaction.product}`}
                </p>
                {streak > 1 && <p className="text-xs" style={{ color: '#F59E0B' }}>🔥 {streak} streak! Bonus XP</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
