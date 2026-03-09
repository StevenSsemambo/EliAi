import { useState, useEffect } from 'react'

const ALL_QUESTIONS = [
  { q:'A 10 kg box is pushed with 50 N. What is its acceleration?', answer:'5 m/s²', options:['5 m/s²','50 m/s²','0.5 m/s²','500 m/s²'], hint:'F = ma, so a = F/m = 50/10' },
  { q:"What force keeps the Moon in orbit around Earth?", answer:'Gravity', options:['Gravity','Friction','Normal force','Tension'], hint:'Acts between all masses across space' },
  { q:'A car decelerates at 4 m/s². Mass = 800 kg. Braking force?', answer:'3200 N', options:['3200 N','200 N','8000 N','32 N'], hint:'F = ma = 800 × 4' },
  { q:'An object weighs 60 N on Earth. g = 10 m/s². Its mass?', answer:'6 kg', options:['6 kg','60 kg','600 g','0.6 kg'], hint:'W = mg, so m = W/g = 60/10' },
  { q:"Newton's 3rd Law: A pushes B with 30 N. B pushes A with?", answer:'30 N (opposite)', options:['30 N (opposite)','15 N','60 N','0 N'], hint:'Action = Reaction, equal and opposite' },
  { q:'A 2 kg ball falls 5 m. KE gained? (g = 10)', answer:'100 J', options:['100 J','10 J','1000 J','25 J'], hint:'KE = mgh = 2 × 10 × 5' },
  { q:'Work done: F = 20 N, distance = 3 m. Work done?', answer:'60 J', options:['60 J','6 J','23 J','600 J'], hint:'W = F × d = 20 × 3' },
  { q:'Pressure: F = 100 N, Area = 0.5 m². Pressure?', answer:'200 Pa', options:['200 Pa','50 Pa','500 Pa','20 Pa'], hint:'P = F/A = 100 ÷ 0.5' },
  { q:'Wave speed: f = 5 Hz, wavelength = 4 m. Speed?', answer:'20 m/s', options:['20 m/s','1.25 m/s','9 m/s','200 m/s'], hint:'v = f × λ = 5 × 4' },
  { q:'Which wave is longitudinal?', answer:'Sound', options:['Sound','Light','X-rays','Water ripples'], hint:'Compressions travel in the direction of motion' },
  { q:'V = 12 V, R = 4 Ω. What is the current?', answer:'3 A', options:['3 A','48 A','8 A','0.33 A'], hint:'I = V/R = 12 ÷ 4' },
  { q:'Power = V × I. V = 230 V, I = 2 A. Power?', answer:'460 W', options:['460 W','115 W','232 W','46 W'], hint:'P = V × I = 230 × 2' },
  { q:'A spring k = 200 N/m stretched 0.1 m. Elastic PE?', answer:'1 J', options:['1 J','10 J','0.1 J','20 J'], hint:'PE = ½kx² = ½ × 200 × 0.01' },
  { q:'Which increases pressure: small area or large area?', answer:'Small area', options:['Small area','Large area','Same','Depends on force'], hint:'P = F/A — smaller A gives bigger P' },
  { q:'Object of mass 5 kg at height 10 m. PE? (g = 10)', answer:'500 J', options:['500 J','50 J','5000 J','0.5 J'], hint:'PE = mgh = 5 × 10 × 10' },
]

function getQuestions(level) {
  const start = Math.min(Math.floor((level - 1) / 3) * 3, ALL_QUESTIONS.length - 6)
  const pool = ALL_QUESTIONS.slice(start, start + 8)
  return pool.sort(() => Math.random() - 0.5).slice(0, 5)
}

export default function PhysicsForcesGame({ levelData, onFinish }) {
  const level = levelData?.level || 1
  const [questions] = useState(() => getQuestions(level))
  const [idx, setIdx]           = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]       = useState('question')
  const [score, setScore]       = useState(0)
  const [streak, setStreak]     = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)

  const q = questions[idx]

  useEffect(() => {
    setTimeLeft(30)
    if (phase !== 'question') return
    const t = setInterval(() => setTimeLeft(n => {
      if (n <= 1) { clearInterval(t); pick(null); return 0 }
      return n - 1
    }), 1000)
    return () => clearInterval(t)
  }, [idx, phase])

  function pick(ans) {
    if (phase !== 'question') return
    setSelected(ans)
    setPhase('result')
    const ok = ans === q.answer
    const newStreak = ok ? streak + 1 : 0
    setStreak(newStreak)
    if (ok) setScore(s => s + Math.max(10, timeLeft * 3 + streak * 5))
    setTimeout(() => {
      const next = idx + 1
      if (next >= questions.length) { onFinish?.() }
      else { setIdx(next); setSelected(null); setPhase('question') }
    }, 1600)
  }

  if (!q) return null

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#131829', borderBottom:'1px solid #1E2A45', padding:'14px 16px 10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:800, fontSize:14 }}>⚡ Physics Forces · Level {level}</span>
          <span style={{ color:'#FBBF24', fontWeight:700, fontSize:12 }}>⭐ {score}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:5, borderRadius:99, background:'#1E2A45' }}>
            <div style={{ height:'100%', borderRadius:99, width:`${(idx/questions.length)*100}%`, background:'#EF4444', transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{idx+1}/{questions.length}</span>
          <span style={{ color: timeLeft < 8 ? '#EF4444' : '#14B8A6', fontWeight:800, fontSize:15 }}>{timeLeft}s</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        {/* Hint box */}
        <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'8px 12px', marginBottom:14 }}>
          <span style={{ color:'#FCA5A5', fontSize:12 }}>💡 {q.hint}</span>
        </div>

        {/* Question */}
        <p style={{ color:'white', fontWeight:800, fontSize:16, lineHeight:1.5, marginBottom:20 }}>{q.q}</p>

        {/* Options */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {q.options.map((opt, i) => {
            let bg = '#131829', border = '1px solid #1E2A45', color = '#CBD5E1'
            if (phase === 'result') {
              if (opt === q.answer)    { bg = 'rgba(74,222,128,0.1)'; border = '2px solid #22C55E'; color = '#4ADE80' }
              else if (opt === selected){ bg = 'rgba(239,68,68,0.1)'; border = '2px solid #EF4444'; color = '#F87171' }
            }
            return (
              <button key={i} disabled={phase === 'result'} onClick={() => pick(opt)}
                style={{ background:bg, border, color, padding:'13px 14px', borderRadius:12, textAlign:'left', fontWeight:600, fontSize:14, cursor:'pointer', width:'100%' }}>
                <span style={{ color:'#475569', marginRight:8 }}>{['A','B','C','D'][i]}.</span>{opt}
              </button>
            )
          })}
        </div>

        {phase === 'result' && (
          <div style={{ marginTop:12, padding:'8px 12px', borderRadius:10, background: selected === q.answer ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)' }}>
            <p style={{ color: selected === q.answer ? '#4ADE80' : '#F87171', fontWeight:700, fontSize:13, margin:0 }}>
              {selected === q.answer ? `✅ Correct!${streak > 0 ? ` ${streak+1}x streak!` : ''}` : `❌ Answer: ${q.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
