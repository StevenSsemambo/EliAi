import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { SoundEngine } from '../../utils/soundEngine.js'

// ── Physics questions (curriculum-aligned, S1–S6) ─────────────────
const QUESTIONS = [
  // Forces & Motion (S1-S2)
  { id:'p1',  q:'A 10 kg box is pushed with 50 N. What is its acceleration?',    answer:'5 m/s²',    formula:'F = ma → a = F/m',          options:['5 m/s²','50 m/s²','0.5 m/s²','500 m/s²'],    cat:'Mechanics' },
  { id:'p2',  q:'What force keeps the Moon in orbit around the Earth?',          answer:'Gravity',   formula:'Gravitational attraction',   options:['Gravity','Friction','Normal force','Tension'], cat:'Forces' },
  { id:'p3',  q:'A car decelerates at 4 m/s². Mass = 800 kg. Braking force?',   answer:'3200 N',    formula:'F = ma = 800 × 4',           options:['3200 N','200 N','8000 N','32 N'],              cat:'Mechanics' },
  { id:'p4',  q:'An object weighs 60 N on Earth. g = 10 m/s². Its mass?',        answer:'6 kg',      formula:'W = mg → m = W/g',           options:['6 kg','60 kg','600 g','0.6 kg'],               cat:'Forces' },
  { id:'p5',  q:'Newton\'s 3rd Law: if A pushes B with 30 N, B pushes A with?', answer:'30 N opposite', formula:'Action = Reaction',      options:['30 N opposite','15 N','60 N','0 N'],           cat:'Newton' },
  // Energy (S2-S3)
  { id:'p6',  q:'A 2 kg ball falls 5 m. KE gained? (g = 10)',                   answer:'100 J',     formula:'KE = mgh = 2×10×5',         options:['100 J','10 J','1000 J','25 J'],                cat:'Energy' },
  { id:'p7',  q:'Work done = Force × Distance. F=20N, d=3m. Work done?',        answer:'60 J',      formula:'W = Fd = 20 × 3',            options:['60 J','6 J','23 J','600 J'],                   cat:'Energy' },
  { id:'p8',  q:'A spring with k=200 N/m is stretched 0.1 m. Elastic PE?',      answer:'1 J',       formula:'PE = ½kx² = ½×200×0.01',    options:['1 J','10 J','0.1 J','20 J'],                   cat:'Energy' },
  // Pressure (S3)
  { id:'p9',  q:'Pressure = Force/Area. F=100N, A=0.5m². Pressure?',            answer:'200 Pa',    formula:'P = F/A = 100/0.5',          options:['200 Pa','50 Pa','500 Pa','20 Pa'],             cat:'Pressure' },
  { id:'p10', q:'Which increases pressure: small area or large area?',           answer:'Small area',formula:'P = F/A — smaller A → bigger P', options:['Small area','Large area','Same pressure','Depends on force'], cat:'Pressure' },
  // Waves (S4)
  { id:'p11', q:'Wave speed = frequency × wavelength. f=5Hz, λ=4m. Speed?',    answer:'20 m/s',    formula:'v = fλ = 5 × 4',             options:['20 m/s','1.25 m/s','9 m/s','200 m/s'],        cat:'Waves' },
  { id:'p12', q:'Which wave is longitudinal?',                                   answer:'Sound',     formula:'Longitudinal: compressions along direction of travel', options:['Sound','Light','X-rays','Water ripples'], cat:'Waves' },
  // Electricity (S4-S5)
  { id:'p13', q:'V=12V, R=4Ω. What is the current?',                            answer:'3 A',       formula:'I = V/R = 12/4',             options:['3 A','48 A','8 A','0.33 A'],                   cat:'Electricity' },
  { id:'p14', q:'Power = VI. V=230V, I=2A. Power?',                             answer:'460 W',     formula:'P = VI = 230 × 2',           options:['460 W','115 W','232 W','46 W'],                 cat:'Electricity' },
  // Optics (S4-S5)
  { id:'p15', q:'Light travels from glass (n=1.5) to air (n=1.0). Critical angle sin θ?', answer:'0.67', formula:'sin θc = n₂/n₁ = 1.0/1.5', options:['0.67','0.5','1.5','0.33'],           cat:'Optics' },
]

function getQsForLevel(level, count=5) {
  const diff = Math.min(Math.floor((level-1)/3), 4)
  const pool = QUESTIONS.slice(diff*3, diff*3+6)
  return pool.sort(()=>Math.random()-0.5).slice(0,count)
}

function ForceArrow({ force, direction, color }) {
  const width = Math.min(120, Math.max(30, force / 2))
  return (
    <div className="flex items-center" style={{ flexDirection: direction === 'left' ? 'row-reverse' : 'row' }}>
      <div className="h-4 rounded-sm" style={{ width, background: color }}/>
      <div className="w-0 h-0" style={{
        borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
        borderLeft: direction === 'right' ? `12px solid ${color}` : 'none',
        borderRight: direction === 'left' ? `12px solid ${color}` : 'none',
      }}/>
      <span className="text-xs font-black ml-1" style={{ color }}>{force} N</span>
    </div>
  )
}

export default function PhysicsForcesGame({ level = 1, onComplete, onExit }) {
  const { theme } = useTheme()
  const [qs]      = useState(() => getQsForLevel(level))
  const [qIdx, setQIdx]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]     = useState('question') // question | result
  const [score, setScore]     = useState(0)
  const [correct, setCorrect] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [streak, setStreak]   = useState(0)

  const q = qs[qIdx]

  useEffect(() => {
    if (phase !== 'question') return
    setTimeLeft(30)
    const t = setInterval(() => setTimeLeft(tl => {
      if (tl <= 1) { clearInterval(t); handleAnswer(null); return 0 }
      return tl - 1
    }), 1000)
    return () => clearInterval(t)
  }, [qIdx, phase])

  function handleAnswer(ans) {
    if (phase !== 'question') return
    setSelected(ans)
    setPhase('result')
    const isCorrect = ans === q.answer
    if (isCorrect) {
      SoundEngine.gameCorrect?.()
      setScore(s => s + Math.max(10, timeLeft * 3 + streak * 5))
      setCorrect(c => c + 1)
      setStreak(s => s + 1)
    } else {
      SoundEngine.gameWrong?.()
      setStreak(0)
    }
    setTimeout(() => {
      const next = qIdx + 1
      if (next >= qs.length) {
        onComplete?.({ score: score + (isCorrect ? Math.max(10, timeLeft*3) : 0), correct: correct + (isCorrect?1:0), total: qs.length })
      } else {
        setQIdx(next); setSelected(null); setPhase('question')
      }
    }, 1800)
  }

  const catColors = { Mechanics:'#0891B2', Forces:'#7C3AED', Newton:'#EF4444', Energy:'#F59E0B', Pressure:'#16A34A', Waves:'#A78BFA', Electricity:'#F59E0B', Optics:'#0D9488' }
  const col = catColors[q?.cat] || theme.accent

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-4" style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onExit} style={{ color: theme.muted }}>✕</button>
          <span className="font-black text-sm" style={{ color: theme.text }}>⚡ Physics Forces — Lvl {level}</span>
          <span className="text-xs font-black" style={{ color: '#F59E0B' }}>⭐ {score}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
            <div className="h-full rounded-full transition-all" style={{ width:`${((qIdx)/qs.length)*100}%`, background: col }}/>
          </div>
          <span className="text-xs font-bold" style={{ color: theme.muted }}>{qIdx+1}/{qs.length}</span>
          <span className="font-black text-sm" style={{ color: timeLeft<8 ? '#EF4444' : theme.accent }}>{timeLeft}s</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 max-w-lg mx-auto w-full">
        {/* Category badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-4"
          style={{ background:`${col}18`, color: col }}>
          ⚡ {q?.cat}
        </div>

        {/* Formula hint */}
        <div className="rounded-2xl px-4 py-3 mb-4"
          style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)' }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: '#7DD3FC' }}>📐 Formula / Hint</p>
          <p className="text-xs font-mono" style={{ color: theme.subtext }}>{q?.formula}</p>
        </div>

        {/* Question */}
        <p className="text-base font-black leading-relaxed mb-5" style={{ color: theme.text }}>
          {q?.q}
        </p>

        {/* Answer options */}
        <div className="space-y-2">
          {q?.options.map((opt, i) => {
            let bg = theme.card, border = `1px solid ${theme.border}`, textCol = theme.text
            if (phase === 'result') {
              if (opt === q.answer)     { bg='rgba(74,222,128,0.1)'; border='2px solid #22C55E'; textCol='#4ADE80' }
              else if (opt === selected){ bg='rgba(239,68,68,0.1)';  border='2px solid #EF4444'; textCol='#EF4444' }
            }
            return (
              <button key={i} onClick={() => handleAnswer(opt)} disabled={phase==='result'}
                className="w-full rounded-2xl px-4 py-3.5 text-left font-bold text-sm transition-all active:scale-95"
                style={{ background: bg, border, color: textCol }}>
                <span className="mr-2" style={{ color: theme.muted }}>{['A','B','C','D'][i]}.</span>
                {opt}
              </button>
            )
          })}
        </div>

        {phase === 'result' && (
          <div className="mt-3 rounded-xl px-3 py-2"
            style={{ background: selected===q?.answer ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)' }}>
            <p className="text-sm font-bold" style={{ color: selected===q?.answer ? '#4ADE80' : '#EF4444' }}>
              {selected===q?.answer ? `✅ Correct! ${streak>1?`🔥 ${streak} streak!`:''}` : `❌ Answer: ${q?.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
