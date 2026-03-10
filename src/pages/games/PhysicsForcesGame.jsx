import { useState, useEffect } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const ALL_QUESTIONS = [
  // Tier 1: S1-S2 Forces & Motion
  { q:'A 10 kg box is pushed with 50 N. Acceleration?', answer:'5 m/s²', options:['5 m/s²','50 m/s²','0.5 m/s²','500 m/s²'], hint:'F = ma → a = F/m = 50/10', cat:'Forces', tier:1 },
  { q:'What force keeps the Moon in orbit around Earth?', answer:'Gravity', options:['Gravity','Friction','Normal force','Tension'], hint:'Acts between all masses across space', cat:'Forces', tier:1 },
  { q:'An object weighs 60 N. g = 10 m/s². Its mass?', answer:'6 kg', options:['6 kg','60 kg','600 g','0.6 kg'], hint:'W = mg, so m = W/g = 60/10', cat:'Forces', tier:1 },
  { q:"Newton's 3rd Law: A pushes B with 30 N. B pushes A with?", answer:'30 N (opposite)', options:['30 N (opposite)','15 N','60 N','0 N'], hint:'Action = Reaction, equal and opposite', cat:'Forces', tier:1 },
  { q:'Which is a scalar quantity?', answer:'Speed', options:['Speed','Velocity','Force','Displacement'], hint:'Scalar has magnitude only, no direction', cat:'Motion', tier:1 },
  { q:'Distance-time graph: steeper slope means?', answer:'Greater speed', options:['Greater speed','Less speed','Constant speed','Acceleration'], hint:'Gradient = speed on a d-t graph', cat:'Motion', tier:1 },
  { q:'A car decelerates at 4 m/s². Mass = 800 kg. Braking force?', answer:'3200 N', options:['3200 N','200 N','8000 N','32 N'], hint:'F = ma = 800 × 4', cat:'Forces', tier:1 },
  { q:'Unit of force is?', answer:'Newton (N)', options:['Newton (N)','Joule (J)','Watt (W)','Pascal (Pa)'], hint:'Named after Sir Isaac Newton', cat:'Forces', tier:1 },
  // Tier 2: S2-S3 Energy & Work
  { q:'A 2 kg ball falls 5 m. KE gained? (g=10)', answer:'100 J', options:['100 J','10 J','1000 J','25 J'], hint:'KE = mgh = 2 × 10 × 5', cat:'Energy', tier:2 },
  { q:'Work done: F = 20 N, distance = 3 m.', answer:'60 J', options:['60 J','6 J','23 J','600 J'], hint:'W = F × d = 20 × 3', cat:'Energy', tier:2 },
  { q:'Object of mass 5 kg at height 10 m. PE? (g=10)', answer:'500 J', options:['500 J','50 J','5000 J','0.5 J'], hint:'PE = mgh = 5 × 10 × 10', cat:'Energy', tier:2 },
  { q:'Power = Energy ÷ time. E=600 J, t=30 s. Power?', answer:'20 W', options:['20 W','200 W','0.05 W','18000 W'], hint:'P = E/t = 600/30', cat:'Energy', tier:2 },
  { q:'A machine lifts 200 N load 3 m in 6 s. Power output?', answer:'100 W', options:['100 W','600 W','1200 W','33 W'], hint:'P = W/t = (200×3)/6', cat:'Energy', tier:2 },
  { q:'Pressure: F = 100 N, Area = 0.5 m². Pressure?', answer:'200 Pa', options:['200 Pa','50 Pa','500 Pa','20 Pa'], hint:'P = F/A = 100 ÷ 0.5', cat:'Pressure', tier:2 },
  { q:'Which increases pressure for same force?', answer:'Smaller area', options:['Smaller area','Larger area','Same area','No difference'], hint:'P = F/A — smaller A gives bigger P', cat:'Pressure', tier:2 },
  { q:'A spring k=200 N/m stretched 0.1 m. Elastic PE?', answer:'1 J', options:['1 J','10 J','0.1 J','20 J'], hint:'PE = ½kx² = ½ × 200 × 0.01', cat:'Energy', tier:2 },
  // Tier 3: S3-S4 Waves & Light
  { q:'Wave speed: f=5 Hz, wavelength=4 m. Speed?', answer:'20 m/s', options:['20 m/s','1.25 m/s','9 m/s','200 m/s'], hint:'v = f × λ = 5 × 4', cat:'Waves', tier:3 },
  { q:'Which wave is longitudinal?', answer:'Sound', options:['Sound','Light','X-rays','Water ripples'], hint:'Compressions travel in the direction of motion', cat:'Waves', tier:3 },
  { q:'Light travels fastest in?', answer:'Vacuum', options:['Vacuum','Water','Glass','Air'], hint:'c = 3 × 10⁸ m/s in vacuum', cat:'Light', tier:3 },
  { q:'Refraction occurs when light moves between?', answer:'Media of different optical density', options:['Media of different optical density','The same medium','Mirrors','Only glass and air'], hint:'Speed change causes bending of the ray', cat:'Light', tier:3 },
  { q:'Period T = 0.5 s. Frequency?', answer:'2 Hz', options:['2 Hz','0.5 Hz','1 Hz','4 Hz'], hint:'f = 1/T = 1/0.5', cat:'Waves', tier:3 },
  { q:'Total internal reflection requires?', answer:'Angle greater than critical angle', options:['Angle greater than critical angle','Any angle','45° exactly','Concave mirror'], hint:'Light reflects back entirely instead of refracting', cat:'Light', tier:3 },
  { q:'Electromagnetic waves travel at?', answer:'3 × 10⁸ m/s in vacuum', options:['3 × 10⁸ m/s in vacuum','3 × 10⁶ m/s','340 m/s','Variable speed'], hint:'Speed of light in vacuum — applies to all EM waves', cat:'Waves', tier:3 },
  // Tier 4: S4-S5 Electricity & Magnetism
  { q:'V=12 V, R=4 Ω. Current?', answer:'3 A', options:['3 A','48 A','8 A','0.33 A'], hint:'I = V/R = 12 ÷ 4', cat:'Electricity', tier:4 },
  { q:'Power: V=230 V, I=2 A. Power?', answer:'460 W', options:['460 W','115 W','232 W','46 W'], hint:'P = V × I = 230 × 2', cat:'Electricity', tier:4 },
  { q:'In a series circuit, current is?', answer:'The same throughout', options:['The same throughout','Divided at each component','Zero after the first resistor','Doubled at each component'], hint:'Series: same current, voltage splits', cat:'Electricity', tier:4 },
  { q:'Two 6 Ω resistors in parallel. Combined resistance?', answer:'3 Ω', options:['3 Ω','12 Ω','6 Ω','1 Ω'], hint:'1/R = 1/6 + 1/6 = 2/6, so R = 3', cat:'Electricity', tier:4 },
  { q:'Charge Q = I × t. I=2 A, t=30 s. Charge?', answer:'60 C', options:['60 C','15 C','0.067 C','600 C'], hint:'Q = It = 2 × 30', cat:'Electricity', tier:4 },
  { q:'Which material is a good conductor?', answer:'Copper', options:['Copper','Rubber','Glass','Plastic'], hint:'Metals have free electrons that carry charge', cat:'Electricity', tier:4 },
  // Tier 5: S5-S6 Thermodynamics, Nuclear, Electromagnetism
  { q:'Nuclear fission involves?', answer:'Splitting of a heavy nucleus', options:['Splitting of a heavy nucleus','Joining of light nuclei','Emission of electrons only','Neutron decay'], hint:'Used in nuclear power stations — releases huge energy', cat:'Nuclear', tier:5 },
  { q:'An alpha particle consists of?', answer:'2 protons + 2 neutrons', options:['2 protons + 2 neutrons','1 proton + 1 neutron','An electron','A photon'], hint:'Identical to a helium-4 nucleus', cat:'Nuclear', tier:5 },
  { q:'Half-life is the time for?', answer:'Half the radioactive atoms to decay', options:['Half the radioactive atoms to decay','All atoms to decay','Activity to double','Temperature to halve'], hint:'After 1 half-life, activity is 50% of original', cat:'Nuclear', tier:5 },
  { q:'Transformer: Vp/Vs = Np/Ns. Np=100, Ns=500, Vp=50 V. Vs?', answer:'250 V', options:['250 V','10 V','2500 V','0.5 V'], hint:'Vs = Vp × (Ns/Np) = 50 × 500/100', cat:'Electricity', tier:5 },
  { q:'The first law of thermodynamics states?', answer:'Energy cannot be created or destroyed', options:['Energy cannot be created or destroyed','Heat always flows from cold to hot','Entropy always increases','Ideal gases obey PV = nRT'], hint:'Conservation of energy applied to heat and work', cat:'Thermodynamics', tier:5 },
  { q:'A wire carrying current in a magnetic field experiences?', answer:'A force (motor effect)', options:['A force (motor effect)','No effect','Only heat','Increased resistance'], hint:'F = BIL — the principle behind electric motors', cat:'Electromagnetism', tier:5 },
]

function getQuestions(level) {
  const tier = Math.min(Math.ceil(level / 5), 5)
  const pool = ALL_QUESTIONS.filter(q => q.tier <= tier)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(5 + Math.floor(level / 5), 8))
}


export default function PhysicsForcesGame({ game, levelData, studentId, onFinish }) {
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
      if (n <= 8) SoundEngine.timerTick(n <= 3 ? 3 : 2)
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
    if (ok) {
      setScore(s => s + Math.max(10, timeLeft * 3 + streak * 5))
      SoundEngine.gameCorrect()
      if (newStreak >= 2) SoundEngine.combo(newStreak)
    } else {
      SoundEngine.gameWrong()
    }
    setTimeout(() => {
      const next = idx + 1
      if (next >= questions.length) { SoundEngine.levelComplete(); if (studentId) saveGameScore(studentId, game?.id || 'physics_forces', levelData.level, score + Math.max(10, timeLeft * 3)); onFinish?.() }
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
