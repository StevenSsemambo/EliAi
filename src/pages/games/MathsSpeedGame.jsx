import { useState, useEffect, useCallback } from 'react'

function makeQuestion(level) {
  const tier = Math.min(Math.floor((level - 1) / 4), 4)

  if (tier === 0) {
    const ops = ['+', '-', 'x']
    const op = ops[Math.floor(Math.random() * ops.length)]
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 15) + 1
    if (op === '+') return { q:`${a} + ${b} = ?`, answer:String(a+b), type:'Arithmetic' }
    if (op === '-') { const x=Math.max(a,b), y=Math.min(a,b); return { q:`${x} - ${y} = ?`, answer:String(x-y), type:'Arithmetic' } }
    return { q:`${a} x ${b} = ?`, answer:String(a*b), type:'Multiplication' }
  }
  if (tier === 1) {
    const base = Math.floor(Math.random() * 8) + 2
    const exp  = Math.floor(Math.random() * 3) + 2
    if (Math.random() > 0.5) return { q:`${base}² = ?`, answer:String(base*base), type:'Powers' }
    const d=[2,4,5,10][Math.floor(Math.random()*4)]
    const n=Math.floor(Math.random()*(d-1))+1
    const m=Math.floor(Math.random()*8)+2
    const ans=(n*m)
    return { q:`${n}/${d} x ${d*m} = ?`, answer:String(ans), type:'Fractions' }
  }
  if (tier === 2) {
    const x=Math.floor(Math.random()*10)+1
    const a=Math.floor(Math.random()*8)+2
    const b=Math.floor(Math.random()*20)+5
    if (Math.random()>0.5) return { q:`${a}x = ${a*x}\nx = ?`, answer:String(x), type:'Linear Equations' }
    return { q:`${a}x + ${b} = ${a*x+b}\nx = ?`, answer:String(x), type:'Linear Equations' }
  }
  if (tier === 3) {
    const pcts=[10,20,25,50,15]
    const pct=pcts[Math.floor(Math.random()*pcts.length)]
    const vals=[200,400,600,800,120]
    const val=vals[Math.floor(Math.random()*vals.length)]
    if (Math.random()>0.5) return { q:`${pct}% of ${val} = ?`, answer:String((pct/100)*val), type:'Percentages' }
    const r1=Math.floor(Math.random()*5)+1, r2=Math.floor(Math.random()*5)+2
    return { q:`x² - ${r1+r2}x + ${r1*r2} = 0\nSmaller root?`, answer:String(Math.min(r1,r2)), type:'Quadratics' }
  }
  // tier 4 — advanced
  const known=[{fn:'sin',deg:'30°',val:'0.5'},{fn:'cos',deg:'60°',val:'0.5'},{fn:'tan',deg:'45°',val:'1'},{fn:'sin',deg:'90°',val:'1'}]
  const k=known[Math.floor(Math.random()*known.length)]
  return { q:`${k.fn}(${k.deg}) = ?`, answer:k.val, type:'Trigonometry' }
}

function makeOptions(correct) {
  const n = parseFloat(correct)
  if (isNaN(n)) return [correct, correct+'1', '0', 'undefined'].sort(()=>Math.random()-0.5)
  const set = new Set([String(correct)])
  const offsets = [n-1, n+1, n-2, n+2, n*2, Math.round(n/2)].filter(x => x !== n && x >= 0)
  for (const o of offsets.sort(()=>Math.random()-0.5)) {
    if (set.size >= 4) break
    set.add(String(o))
  }
  while (set.size < 4) set.add(String(Math.floor(Math.random()*20)+1))
  return [...set].sort(()=>Math.random()-0.5)
}

const TYPE_COLORS = {
  Arithmetic:'#0891B2', Multiplication:'#7C3AED', Powers:'#F59E0B',
  Fractions:'#EC4899', 'Linear Equations':'#EF4444', Percentages:'#0D9488',
  Quadratics:'#7C3AED', Trigonometry:'#F59E0B',
}

export default function MathsSpeedGame({ levelData, onFinish }) {
  const level   = levelData?.level || 1
  const ROUNDS  = Math.min(5 + Math.floor(level / 3), 10)
  const BASE_TIME = Math.max(10, 30 - level)

  const [round, setRound]       = useState(0)
  const [q, setQ]               = useState(null)
  const [options, setOptions]   = useState([])
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]       = useState('question')
  const [score, setScore]       = useState(0)
  const [streak, setStreak]     = useState(0)
  const [timeLeft, setTimeLeft] = useState(BASE_TIME)

  const nextQuestion = useCallback(() => {
    const newQ = makeQuestion(level)
    setQ(newQ)
    setOptions(makeOptions(newQ.answer))
    setSelected(null)
    setPhase('question')
    setTimeLeft(BASE_TIME)
  }, [level, BASE_TIME])

  useEffect(() => { nextQuestion() }, [])

  useEffect(() => {
    if (phase !== 'question') return
    const t = setInterval(() => setTimeLeft(n => {
      if (n <= 1) { clearInterval(t); pick(null); return 0 }
      return n - 1
    }), 1000)
    return () => clearInterval(t)
  }, [round, phase])

  function pick(ans) {
    if (phase !== 'question' || !q) return
    setSelected(ans)
    setPhase('result')
    const ok = ans === q.answer
    const newStreak = ok ? streak + 1 : 0
    setStreak(newStreak)
    if (ok) setScore(s => s + Math.max(10, timeLeft * 4) + streak * 8)
    setTimeout(() => {
      const next = round + 1
      if (next >= ROUNDS) { onFinish?.() }
      else { setRound(next); nextQuestion() }
    }, 1600)
  }

  if (!q) return (
    <div style={{ background:'#0C0F1A', borderRadius:16, minHeight:480, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:'#475569', fontSize:14 }}>Loading...</span>
    </div>
  )

  const C = TYPE_COLORS[q.type] || '#14B8A6'
  const urgent = timeLeft <= Math.floor(BASE_TIME * 0.3)

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#131829', borderBottom:'1px solid #1E2A45', padding:'14px 16px 10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:800, fontSize:14 }}>🔢 Maths Speed · Level {level}</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {streak > 1 && <span style={{ color:'#F59E0B', fontWeight:700, fontSize:12 }}>🔥 x{streak}</span>}
            <span style={{ color:'#FBBF24', fontWeight:700, fontSize:12 }}>⭐ {score}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:5, borderRadius:99, background:'#1E2A45' }}>
            <div style={{ height:'100%', borderRadius:99, width:`${(round/ROUNDS)*100}%`, background:C, transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{round+1}/{ROUNDS}</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        {/* Type badge + timer */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ background:`${C}18`, color:C, padding:'3px 12px', borderRadius:99, fontSize:11, fontWeight:700 }}>
            {q.type}
          </div>
          <span style={{ color: urgent ? '#EF4444' : '#14B8A6', fontWeight:800, fontSize:22 }}>{timeLeft}s</span>
        </div>

        {/* Timer bar */}
        <div style={{ height:4, borderRadius:99, background:'#1E2A45', marginBottom:20 }}>
          <div style={{ height:'100%', borderRadius:99, width:`${(timeLeft/BASE_TIME)*100}%`, background: urgent ? '#EF4444' : C, transition:'width 1s linear' }}/>
        </div>

        {/* Question */}
        <div style={{ background:`${C}10`, border:`2px solid ${C}25`, borderRadius:20, padding:'24px 20px', marginBottom:20, textAlign:'center' }}>
          <p style={{ color:'white', fontWeight:900, fontSize:26, whiteSpace:'pre-line', margin:0 }}>{q.q}</p>
        </div>

        {/* Options — 2x2 grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {options.map((opt, i) => {
            let bg = '#131829', border = '1px solid #1E2A45', color = '#CBD5E1'
            if (phase === 'result') {
              if (opt === q.answer)    { bg = `${C}15`; border = `2px solid ${C}`; color = C }
              else if (opt === selected){ bg = 'rgba(239,68,68,0.1)'; border = '2px solid #EF4444'; color = '#F87171' }
            }
            return (
              <button key={i} disabled={phase === 'result'} onClick={() => pick(opt)}
                style={{ background:bg, border, color, padding:'18px 8px', borderRadius:14, fontWeight:900, fontSize:20, cursor:'pointer', width:'100%', textAlign:'center' }}>
                {opt}
              </button>
            )
          })}
        </div>

        {phase === 'result' && (
          <div style={{ marginTop:14, padding:'8px 12px', borderRadius:10, textAlign:'center', background: selected === q.answer ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)' }}>
            <p style={{ color: selected === q.answer ? '#4ADE80' : '#F87171', fontWeight:700, fontSize:13, margin:0 }}>
              {selected === q.answer
                ? `✅ Correct! +${Math.max(10,timeLeft*4)+streak*8} XP${streak > 1 ? ` 🔥x${streak}` : ''}`
                : `❌ Answer: ${q.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
