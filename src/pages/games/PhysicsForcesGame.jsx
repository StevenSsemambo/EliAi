import { useState, useEffect } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const QUESTIONS = [
  { id:'p1',  q:'A 10 kg box is pushed with 50 N. What is its acceleration?',    answer:'5 m/s2',     hint:'F = ma, so a = F/m = 50/10',           options:['5 m/s2','50 m/s2','0.5 m/s2','500 m/s2'],    cat:'Mechanics' },
  { id:'p2',  q:'What force keeps the Moon in orbit around the Earth?',           answer:'Gravity',    hint:'Acts between all masses across distance', options:['Gravity','Friction','Normal force','Tension'], cat:'Forces' },
  { id:'p3',  q:'A car decelerates at 4 m/s2. Mass = 800 kg. Braking force?',    answer:'3200 N',     hint:'F = ma = 800 x 4',                     options:['3200 N','200 N','8000 N','32 N'],             cat:'Mechanics' },
  { id:'p4',  q:'An object weighs 60 N on Earth. g = 10 m/s2. Its mass?',        answer:'6 kg',       hint:'W = mg so m = W/g = 60/10',            options:['6 kg','60 kg','600 g','0.6 kg'],              cat:'Forces' },
  { id:'p5',  q:"Newton's 3rd Law: if A pushes B with 30 N, B pushes A with?",   answer:'30 N opposite', hint:'Action = Reaction, equal and opposite', options:['30 N opposite','15 N','60 N','0 N'],       cat:'Newton' },
  { id:'p6',  q:'A 2 kg ball falls 5 m. KE gained? (g = 10)',                    answer:'100 J',      hint:'KE = mgh = 2 x 10 x 5',               options:['100 J','10 J','1000 J','25 J'],               cat:'Energy' },
  { id:'p7',  q:'Work done = Force x Distance. F=20N, d=3m. Work done?',         answer:'60 J',       hint:'W = Fd = 20 x 3',                      options:['60 J','6 J','23 J','600 J'],                  cat:'Energy' },
  { id:'p8',  q:'A spring with k=200 N/m is stretched 0.1 m. Elastic PE?',       answer:'1 J',        hint:'PE = 0.5 x k x x2 = 0.5 x 200 x 0.01', options:['1 J','10 J','0.1 J','20 J'],                cat:'Energy' },
  { id:'p9',  q:'Pressure = Force/Area. F=100N, A=0.5m2. Pressure?',             answer:'200 Pa',     hint:'P = F/A = 100/0.5',                    options:['200 Pa','50 Pa','500 Pa','20 Pa'],            cat:'Pressure' },
  { id:'p10', q:'Which increases pressure: small area or large area?',            answer:'Small area', hint:'P = F/A: smaller A gives bigger P',    options:['Small area','Large area','Same pressure','Depends on force'], cat:'Pressure' },
  { id:'p11', q:'Wave speed = frequency x wavelength. f=5Hz, wavelength=4m. Speed?', answer:'20 m/s', hint:'v = f x wavelength = 5 x 4',           options:['20 m/s','1.25 m/s','9 m/s','200 m/s'],       cat:'Waves' },
  { id:'p12', q:'Which wave is longitudinal?',                                    answer:'Sound',      hint:'Compressions travel along direction of motion', options:['Sound','Light','X-rays','Water ripples'], cat:'Waves' },
  { id:'p13', q:'V=12V, R=4 ohms. What is the current?',                         answer:'3 A',        hint:'I = V/R = 12/4',                       options:['3 A','48 A','8 A','0.33 A'],                 cat:'Electricity' },
  { id:'p14', q:'Power = V x I. V=230V, I=2A. Power?',                           answer:'460 W',      hint:'P = VI = 230 x 2',                     options:['460 W','115 W','232 W','46 W'],               cat:'Electricity' },
  { id:'p15', q:'Light goes from glass (n=1.5) to air (n=1.0). Critical angle sin?', answer:'0.67',   hint:'sin(critical) = n2/n1 = 1.0/1.5',     options:['0.67','0.5','1.5','0.33'],                   cat:'Optics' },
]

const CAT_COLORS = { Mechanics:'#0891B2', Forces:'#7C3AED', Newton:'#EF4444', Energy:'#F59E0B', Pressure:'#16A34A', Waves:'#A78BFA', Electricity:'#F59E0B', Optics:'#0D9488' }

function getQsForLevel(level, count=5) {
  const diff = Math.min(Math.floor((level-1)/3), 4)
  const pool = QUESTIONS.slice(diff*3, diff*3+6)
  return pool.sort(()=>Math.random()-0.5).slice(0,count)
}

export default function PhysicsForcesGame({ game, levelData, studentId, onFinish }) {
  const level = levelData?.level || 1
  const [qs]       = useState(() => getQsForLevel(level))
  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]       = useState('question')
  const [score, setScore]       = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [streak, setStreak]     = useState(0)

  const q = qs[qIdx]
  const col = CAT_COLORS[q?.cat] || '#14B8A6'

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
        const finalScore = score + (isCorrect ? Math.max(10, timeLeft*3) : 0)
        if (studentId) saveGameScore(studentId, game?.id, levelData?.level, finalScore)
        onFinish?.()
      } else {
        setQIdx(next); setSelected(null); setPhase('question')
      }
    }, 1800)
  }

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480 }}>
      <div style={{ background:'#131829', borderBottom:'1px solid #1A2035', padding:'16px 16px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:900, fontSize:14 }}>Physics Forces - Lvl {level}</span>
          <span style={{ color:'#F59E0B', fontWeight:900, fontSize:12 }}>* {score}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:6, borderRadius:9999, overflow:'hidden', background:'#1A2035' }}>
            <div style={{ height:'100%', borderRadius:9999, width:`${(qIdx/qs.length)*100}%`, background:col, transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{qIdx+1}/{qs.length}</span>
          <span style={{ color: timeLeft<8?'#EF4444':'#14B8A6', fontWeight:900, fontSize:14 }}>{timeLeft}s</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <div style={{ background:`${col}18`, color:col, padding:'4px 12px', borderRadius:9999, fontSize:12, fontWeight:900, display:'inline-block', marginBottom:16 }}>
          {q?.cat}
        </div>

        <div style={{ background:'rgba(8,145,178,0.08)', border:'1px solid rgba(8,145,178,0.2)', borderRadius:16, padding:'12px 16px', marginBottom:16 }}>
          <p style={{ color:'#7DD3FC', fontSize:12, fontWeight:700, marginBottom:4 }}>Formula / Hint</p>
          <p style={{ color:'#94A3B8', fontSize:12 }}>{q?.hint}</p>
        </div>

        <p style={{ color:'white', fontWeight:900, fontSize:15, lineHeight:1.5, marginBottom:20 }}>{q?.q}</p>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {q?.options.map((opt,i) => {
            let bg='#131829', border='1px solid #1A2035', color='#E2E8F0'
            if (phase==='result') {
              if (opt===q.answer)     { bg='rgba(74,222,128,0.1)'; border='2px solid #22C55E'; color='#4ADE80' }
              else if (opt===selected){ bg='rgba(239,68,68,0.1)';  border='2px solid #EF4444'; color='#EF4444' }
            }
            return (
              <button key={i} onClick={()=>handleAnswer(opt)} disabled={phase==='result'}
                style={{ background:bg, border, color, padding:'14px 16px', borderRadius:16, textAlign:'left', fontWeight:700, fontSize:14, cursor:'pointer', width:'100%' }}>
                <span style={{ color:'#64748B', marginRight:8 }}>{['A','B','C','D'][i]}.</span>{opt}
              </button>
            )
          })}
        </div>

        {phase==='result' && (
          <div style={{ marginTop:12, padding:'8px 12px', borderRadius:12, background: selected===q?.answer?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)' }}>
            <p style={{ color: selected===q?.answer?'#4ADE80':'#EF4444', fontWeight:700, fontSize:13 }}>
              {selected===q?.answer ? `Correct! ${streak>1?`${streak}x streak`:''}`:`Answer: ${q?.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
