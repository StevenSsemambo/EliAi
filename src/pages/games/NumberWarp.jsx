import { useState, useEffect, useRef, useCallback } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'
import { SoundEngine } from '../../utils/soundEngine.js'

// ── Question generator ────────────────────────────────────────────
function genQuestion(tier) {
  const r = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
  const ops = []

  if (tier <= 1)  ops.push(() => { const a=r(1,20),b=r(1,20); return { q:`${a} + ${b}`, ans:a+b } })
  if (tier <= 2)  ops.push(() => { const a=r(5,30),b=r(1,a);  return { q:`${a} − ${b}`, ans:a-b } })
  if (tier >= 3 && tier <= 7) ops.push(() => { const a=r(3,20),b=r(3,20); return { q:`${a} + ${b}`, ans:a+b } })
  if (tier >= 3 && tier <= 7) ops.push(() => { const a=r(5,40),b=r(3,a);  return { q:`${a} − ${b}`, ans:a-b } })
  if (tier >= 4)  ops.push(() => { const a=r(2,5),b=r(2,12);  return { q:`${a} × ${b}`, ans:a*b } })
  if (tier >= 5)  ops.push(() => { const a=r(6,9),b=r(2,12);  return { q:`${a} × ${b}`, ans:a*b } })
  if (tier >= 6)  ops.push(() => { const b=r(2,9),a=b*r(2,12); return { q:`${a} ÷ ${b}`, ans:a/b } })
  if (tier >= 7)  ops.push(() => { const b=r(2,9),a=b*r(2,12); return { q:`${a} ÷ ${b}`, ans:a/b } })
  if (tier >= 8)  ops.push(() => { const a=r(2,15); return { q:`${a}²`, ans:a*a } })
  if (tier >= 9)  ops.push(() => { const a=r(1,12); return { q:`√${a*a}`, ans:a } })
  if (tier >= 10) ops.push(() => { const a=r(1,99); return { q:`${a}% of ${r(10,200)}`, ans: null, _a:a, _b:null,
    _gen: () => { const b=r(10,200); return { q:`${a}% of ${b}`, ans:Math.round(a*b/100) } } } })
  if (tier >= 11) ops.push(() => { const n=r(1,9),d=r(2,8); return { q:`½ of ${n*2*d}`, ans:n*d } })
  if (tier >= 12) ops.push(() => { const a=r(10,99),b=r(1,9),c=r(1,9),d=r(1,9); return { q:`${a}.${b} + ${c}.${d}`, ans: parseFloat(((a+c) + (b+d)/10).toFixed(1)) } })
  if (tier >= 14) ops.push(() => { const a=r(2,5),b=r(2,4); return { q:`${a}^${b}`, ans:Math.pow(a,b) } })
  if (tier >= 15) ops.push(() => { const c=r(1,15),a=r(1,8); return { q:`${a}x = ${a*c}, x=?`, ans:c } })
  if (tier >= 16) ops.push(() => { const c=r(1,12),b=r(1,10); return { q:`2x+${b}=${2*c+b}, x=?`, ans:c } })
  if (tier >= 17) ops.push(() => { const a=r(-10,-1),b=r(-10,10); return { q:`${a} + ${b}`, ans:a+b } })
  if (tier >= 18) ops.push(() => { const a=r(2,6),b=r(2,6),c=r(1,5); return { q:`${a}+${b}×${c}`, ans:a+b*c } })

  if (ops.length === 0) ops.push(() => { const a=r(1,30),b=r(1,30); return { q:`${a} + ${b}`, ans:a+b } })

  const fn = ops[Math.floor(Math.random() * ops.length)]
  let result = fn()
  if (result._gen) result = result._gen()

  // Generate 3 wrong answers
  const correct = result.ans
  const wrongs = new Set()
  while (wrongs.size < 3) {
    const delta = r(-10, 10)
    const w = correct + (delta === 0 ? 1 : delta)
    if (w !== correct) wrongs.add(w)
  }
  const options = [...wrongs, correct].sort(() => Math.random() - 0.5)
  return { question: result.q, correct, options }
}

// ── Warp speed particles ──────────────────────────────────────────
function WarpBg({ active }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {active && Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: '2px', height: `${20 + Math.random() * 60}px`,
          background: 'linear-gradient(to bottom, transparent, rgba(245,158,11,0.6))',
          animation: `warpLine ${0.4 + Math.random() * 0.8}s linear infinite`,
          animationDelay: `${Math.random() * 0.8}s`,
          transform: `rotate(${80 + Math.random() * 20}deg)`
        }} />
      ))}
    </div>
  )
}

function HowToPlayWarp({ game, onStart, levelData }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🚀</div>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 4 }}>How to Play</div>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Number Warp</div>
      </div>
      {[
        ['🔢', 'Read the question', 'A maths question appears — addition, subtraction, multiplication, division, and more as you level up.'],
        ['⚡', 'Pick the answer fast', 'Tap the correct answer from 4 choices. Speed gives bonus points!'],
        ['🔥', 'Build streaks', 'Chain correct answers to earn a streak multiplier. Every wrong answer resets it.'],
        ['🏆', 'Hit the target', 'Reach the points target before running out of questions to win the level.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
            <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[['Target', `${levelData.target} pts`, '#F59E0B'], ['Questions', levelData.questionsPerRound, '#7C3AED'], ['Time/Q', `${levelData.timePerQ}s`, '#EC4899']].map(([l,v,c]) => (
          <div key={l} style={{ background: '#0F1629', border: `1px solid ${c}33`, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: c }}>{v}</div>
            <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 16, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${game.color}, #EF4444)` }}>
        🚀 Start Warp
      </button>
    </div>
  )
}

export default function NumberWarp({ game, levelData, studentId, onFinish }) {
  const { questionsPerRound, timePerQ, target, difficultyTier } = levelData
  const [screen, setScreen] = useState('guide')
  const [phase, setPhase] = useState('ready')
  const [qIndex, setQIndex] = useState(0)
  const [current, setCurrent] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timePerQ)
  const [feedback, setFeedback] = useState(null) // 'right' | 'wrong' | 'timeout'
  const [results, setResults] = useState([])
  const timerRef = useRef(null)
  const lockedRef = useRef(false)

  const nextQ = useCallback((forceEnd = false) => {
    lockedRef.current = false
    clearInterval(timerRef.current)
    if (forceEnd || qIndex + 1 >= questionsPerRound) {
      setPhase('result')
      const finalScore = score + (feedback === 'right' ? 0 : 0) // already updated
      if (studentId) saveGameScore(studentId, game.id, levelData.level, score)
      return
    }
    const q = genQuestion(difficultyTier)
    setCurrent(q)
    setQIndex(i => i + 1)
    setTimeLeft(timePerQ)
    setFeedback(null)
  }, [qIndex, questionsPerRound, score, difficultyTier, timePerQ])

  function startGame() {
    setPhase('playing')
    setQIndex(0); setScore(0); setStreak(0); setBestStreak(0); setResults([])
    const q = genQuestion(difficultyTier)
    setCurrent(q)
    setTimeLeft(timePerQ)
    setFeedback(null)
    lockedRef.current = false
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || feedback) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          if (!lockedRef.current) {
            lockedRef.current = true
            setFeedback('timeout')
            setStreak(0)
            setResults(r => [...r, { correct: false, timeout: true }])
            setTimeout(() => nextQ(), 800)
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, feedback, qIndex])

  function answer(opt) {
    if (lockedRef.current || phase !== 'playing') return
    lockedRef.current = true
    clearInterval(timerRef.current)
    const correct = opt === current.correct
    const newStreak = correct ? streak + 1 : 0
    const pts = correct ? Math.round(10 + newStreak * 5 + (timeLeft / timePerQ) * 20) : 0
    if(correct){SoundEngine.gameCorrect();if(newStreak>=2)SoundEngine.combo(newStreak)}else{SoundEngine.gameWrong()}
    setFeedback(correct ? 'right' : 'wrong')
    setScore(s => s + pts)
    setStreak(newStreak)
    setBestStreak(b => Math.max(b, newStreak))
    setResults(r => [...r, { correct, pts }])
    setTimeout(() => nextQ(), correct ? 600 : 1000)
  }

  const timerPct = (timeLeft / timePerQ) * 100
  const timerColor = timerPct > 50 ? '#4ADE80' : timerPct > 25 ? '#F59E0B' : '#EF4444'
  const correctCount = results.filter(r => r.correct).length
  const passed = score >= target

  if (screen === 'guide') return <HowToPlayWarp game={game} onStart={() => setScreen('playing')} levelData={levelData} />

  return (
    <div className="relative min-h-64">
      <style>{`
        @keyframes warpLine { from { transform: translateY(-100%) rotate(85deg) } to { transform: translateY(200%) rotate(85deg) } }
        @keyframes popIn { from { transform: scale(0.7); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-8px) } 75% { transform: translateX(8px) } }
      `}</style>

      {/* READY */}
      {phase === 'ready' && (
        <div className="text-center py-6">
          <div className="text-5xl mb-4" style={{ animation: 'popIn 0.5s ease' }}>🔢</div>
          <h3 className="text-white font-black text-xl mb-1">{levelData.name}</h3>
          <p className="text-slate-400 text-sm mb-4">{questionsPerRound} questions · {timePerQ}s per question</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[['Target', `${target} pts`, '#F59E0B'], ['Questions', questionsPerRound, '#7C3AED'], ['Time/Q', `${timePerQ}s`, '#EC4899']].map(([l,v,c]) => (
              <div key={l} className="rounded-xl p-2 text-center" style={{ background: '#0F1629', border: `1px solid ${c}33` }}>
                <div className="font-black text-sm" style={{ color: c }}>{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>
          <button onClick={startGame} className="w-full py-4 rounded-2xl font-black text-lg text-white"
            style={{ background: `linear-gradient(135deg, ${game.color}, #EF4444)` }}>
            🚀 Start Warp
          </button>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'playing' && current && (
        <div className="relative overflow-hidden rounded-2xl" style={{ background: '#050810', minHeight: 340 }}>
          <WarpBg active={!!feedback && feedback === 'right'} />
          <div className="relative p-4" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold" style={{ color: game.color }}>
                ⭐ {score} <span className="text-slate-600">/ {target}</span>
              </div>
              <div className="text-xs text-slate-500">{qIndex}/{questionsPerRound}</div>
              {streak >= 2 && (
                <div className="text-xs font-black px-2 py-0.5 rounded-full animate-bounce"
                  style={{ background: '#F59E0B22', color: '#F59E0B' }}>
                  🔥 ×{streak}
                </div>
              )}
            </div>

            {/* Timer bar */}
            <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: '#1A2035' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s'
              }} />
            </div>

            {/* Question */}
            <div className="text-center mb-6 py-4 rounded-2xl" style={{
              background: feedback === 'right' ? 'rgba(74,222,128,0.1)' : feedback === 'wrong' ? 'rgba(239,68,68,0.1)' : '#0F1629',
              border: `1px solid ${feedback === 'right' ? 'rgba(74,222,128,0.3)' : feedback === 'wrong' ? 'rgba(239,68,68,0.3)' : '#1A2035'}`,
              animation: feedback === 'wrong' ? 'shake 0.3s ease' : 'none'
            }}>
              <div className="text-5xl font-black text-white font-mono"
                style={{ letterSpacing: '-0.02em' }}>
                {current.question}
              </div>
              <div className="text-xs mt-1 font-bold" style={{
                color: feedback === 'right' ? '#4ADE80' : feedback === 'wrong' ? '#EF4444' : '#3A4560'
              }}>
                {feedback === 'right' ? '✓ Correct!' : feedback === 'wrong' ? `✗ Answer: ${current.correct}` : feedback === 'timeout' ? '⏰ Too slow!' : '= ?'}
              </div>
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-3">
              {current.options.map((opt, i) => {
                let bg = '#0F1629', border = '#1A2035', color = '#E2E8F0'
                if (feedback) {
                  if (opt === current.correct) { bg = 'rgba(74,222,128,0.15)'; border = 'rgba(74,222,128,0.5)'; color = '#4ADE80' }
                  else if (opt !== current.correct) { bg = '#0C0F1A'; border = '#1A2035'; color = '#3A4560' }
                }
                return (
                  <button key={i} onClick={() => answer(opt)}
                    className="py-4 rounded-2xl font-black text-xl transition-all active:scale-95"
                    style={{ background: bg, border: `1px solid ${border}`, color }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <div className="text-center py-4">
          <div className="text-5xl mb-3">{passed ? '🏆' : '💫'}</div>
          <h3 className="text-white font-black text-xl mb-1">{passed ? 'Warp Complete!' : 'Keep Training!'}</h3>
          <p className="text-slate-400 text-sm mb-4">{passed ? 'Target reached — level conquered!' : `Need ${target} pts — you scored ${score}`}</p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            {[['Score', score, game.color], ['Correct', `${correctCount}/${questionsPerRound}`, '#4ADE80'], ['Best Streak', `×${bestStreak}`, '#F59E0B']].map(([l, v, c]) => (
              <div key={l} className="rounded-xl p-3 text-center" style={{ background: '#0F1629', border: `1px solid ${c}33` }}>
                <div className="font-black text-lg" style={{ color: c }}>{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>

          {/* Mini score chart */}
          <div className="flex items-end gap-0.5 justify-center mb-5 h-12">
            {results.map((r, i) => (
              <div key={i} style={{
                width: 8, height: r.correct ? `${Math.min(100, 30 + (r.pts || 0) * 2)}%` : '20%',
                background: r.correct ? game.color : '#EF444466', borderRadius: 2,
                transition: 'height 0.3s'
              }} />
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={startGame} className="flex-1 py-3 rounded-2xl font-bold text-white"
              style={{ background: game.color }}>Try Again</button>
            <button onClick={onFinish} className="flex-1 py-3 rounded-2xl font-bold"
              style={{ background: '#1A2035', color: '#94A3B8' }}>Exit</button>
          </div>
        </div>
      )}
    </div>
  )
}
