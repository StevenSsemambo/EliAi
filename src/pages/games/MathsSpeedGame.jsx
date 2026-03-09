import { useState, useEffect, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

function generateQuestion(level) {
  const tier = Math.floor((level - 1) / 4)

  if (tier === 0) {
    const ops = ['+', '-', 'x']
    const op  = ops[Math.floor(Math.random() * ops.length)]
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 15) + 1
    let ans, q
    if (op==='+') { ans=a+b; q=`${a} + ${b}` }
    else if (op==='-') { const x=Math.max(a,b),y=Math.min(a,b); ans=x-y; q=`${x} - ${y}` }
    else { ans=a*b; q=`${a} x ${b}` }
    return { q:`${q} = ?`, answer:String(ans), type:'Arithmetic', hint:'Basic arithmetic' }
  }

  if (tier === 1) {
    const t = ['fraction','power','divide'][Math.floor(Math.random()*3)]
    if (t==='fraction') {
      const d=[2,4,5,10][Math.floor(Math.random()*4)]
      const n=Math.floor(Math.random()*(d-1))+1
      const m=Math.floor(Math.random()*8)+2
      const ans=(n*m)/d
      return { q:`${n}/${d} x ${m} = ?`, answer:Number.isInteger(ans)?String(ans):`${n*m}/${d}`, type:'Fractions', hint:`Multiply numerator by ${m}` }
    }
    if (t==='power') {
      const base=Math.floor(Math.random()*5)+2
      const exp=Math.floor(Math.random()*3)+2
      return { q:`${base}^${exp} = ?`, answer:String(Math.pow(base,exp)), type:'Powers', hint:`Multiply ${base} by itself ${exp} times` }
    }
    const a=Math.floor(Math.random()*9)+2, b=Math.floor(Math.random()*9)+1
    return { q:`${a*b} / ${a} = ?`, answer:String(b), type:'Division', hint:'How many times does the divisor go in?' }
  }

  if (tier === 2) {
    const x=Math.floor(Math.random()*10)+1
    const a=Math.floor(Math.random()*8)+2
    const b=Math.floor(Math.random()*20)+5
    if (Math.random()>0.5) {
      return { q:`${a}x = ${a*x}\nx = ?`, answer:String(x), type:'Linear Equations', hint:'Divide both sides by the coefficient' }
    }
    return { q:`${a}x + ${b} = ${a*x+b}\nx = ?`, answer:String(x), type:'Linear Equations', hint:'Subtract b, then divide by a' }
  }

  if (tier === 3) {
    const t=['percent','quad_roots','simultaneous'][Math.floor(Math.random()*3)]
    if (t==='percent') {
      const pcts=[10,20,25,50,15]
      const pct=pcts[Math.floor(Math.random()*pcts.length)]
      const vals=[200,400,600,800,120,240]
      const val=vals[Math.floor(Math.random()*vals.length)]
      return { q:`${pct}% of ${val} = ?`, answer:String((pct/100)*val), type:'Percentages', hint:`${val} x ${pct}/100` }
    }
    if (t==='quad_roots') {
      const r1=Math.floor(Math.random()*5)+1, r2=Math.floor(Math.random()*5)+1
      return { q:`x^2 - ${r1+r2}x + ${r1*r2} = 0\nSmaller root?`, answer:String(Math.min(r1,r2)), type:'Quadratics', hint:`Find two numbers that add to ${r1+r2} and multiply to ${r1*r2}` }
    }
    const s=Math.floor(Math.random()*10)+4, d=Math.floor(Math.random()*4)+1
    const xv=(s+d)/2, yv=(s-d)/2
    if (Number.isInteger(xv)&&Number.isInteger(yv))
      return { q:`x + y = ${s}\nx - y = ${d}\nx = ?`, answer:String(xv), type:'Simultaneous', hint:'Add the two equations to eliminate y' }
    return { q:`2x + 3 = 13\nx = ?`, answer:'5', type:'Linear Equations', hint:'Subtract 3, then divide by 2' }
  }

  const t=['trig','log','sequence'][Math.floor(Math.random()*3)]
  if (t==='trig') {
    const known=[{fn:'sin',deg:'30',val:'0.5'},{fn:'cos',deg:'60',val:'0.5'},{fn:'tan',deg:'45',val:'1'},{fn:'sin',deg:'90',val:'1'}]
    const k=known[Math.floor(Math.random()*known.length)]
    return { q:`${k.fn}(${k.deg} degrees) = ?`, answer:k.val, type:'Trigonometry', hint:'Standard angle values' }
  }
  if (t==='log') {
    const bases=[{b:2,x:8,ans:3},{b:2,x:16,ans:4},{b:3,x:9,ans:2},{b:10,x:100,ans:2},{b:5,x:25,ans:2}]
    const k=bases[Math.floor(Math.random()*bases.length)]
    return { q:`log${k.b}(${k.x}) = ?`, answer:String(k.ans), type:'Logarithms', hint:`${k.b}^? = ${k.x}` }
  }
  const a1=Math.floor(Math.random()*5)+1, d2=Math.floor(Math.random()*4)+2, n=Math.floor(Math.random()*4)+4
  return { q:`${a1}, ${a1+d2}, ${a1+d2*2}, ...\nTerm ${n} = ?`, answer:String(a1+(n-1)*d2), type:'Sequences', hint:`an = a1 + (n-1)d` }
}

function generateOptions(correct) {
  const n = parseInt(correct)
  if (isNaN(n)) return [correct, correct+'2', 'undefined', '0'].sort(()=>Math.random()-0.5)
  const wrongs = new Set()
  const offsets = [-2,-1,1,2,n-1,n+1,n*2,Math.round(n/2)].filter(x=>x!==n&&x>=0)
  while (wrongs.size < 3 && offsets.length > 0) wrongs.add(String(offsets[Math.floor(Math.random()*offsets.length)]))
  while (wrongs.size < 3) wrongs.add(String(Math.floor(Math.random()*20)+1))
  return [correct, ...wrongs].sort(()=>Math.random()-0.5)
}

const CAT_COLORS = { Arithmetic:'#0891B2', Fractions:'#7C3AED', Powers:'#F59E0B', Division:'#16A34A', 'Linear Equations':'#EF4444', Percentages:'#0D9488', Quadratics:'#7C3AED', Simultaneous:'#A78BFA', Trigonometry:'#F59E0B', Logarithms:'#EF4444', Sequences:'#0891B2' }

export default function MathsSpeedGame({ game, levelData, studentId, onFinish }) {
  const level    = levelData?.level || 1
  const ROUNDS   = Math.min(5 + Math.floor(level/3), 10)
  const BASE_TIME = Math.max(10, 30 - level)

  const [round, setRound]     = useState(0)
  const [q, setQ]             = useState(null)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]     = useState('question')
  const [score, setScore]     = useState(0)
  const [correct, setCorrect] = useState(0)
  const [timeLeft, setTimeLeft] = useState(BASE_TIME)
  const [streak, setStreak]   = useState(0)

  const newQuestion = useCallback(() => {
    const q2 = generateQuestion(level)
    setQ(q2)
    setOptions(generateOptions(q2.answer))
    setSelected(null)
    setPhase('question')
    setTimeLeft(BASE_TIME)
  }, [level, BASE_TIME])

  useEffect(() => { newQuestion() }, [])

  useEffect(() => {
    if (phase !== 'question') return
    const t = setInterval(() => setTimeLeft(tl => {
      if (tl <= 1) { clearInterval(t); handleAnswer(null); return 0 }
      return tl - 1
    }), 1000)
    return () => clearInterval(t)
  }, [round, phase])

  function handleAnswer(ans) {
    if (phase !== 'question' || !q) return
    setSelected(ans)
    setPhase('result')
    const isCorrect = ans === q.answer
    if (isCorrect) {
      SoundEngine.gameCorrect?.()
      setScore(s => s + Math.max(10, timeLeft * 4) + streak * 8)
      setCorrect(c => c+1)
      setStreak(s => s+1)
    } else {
      SoundEngine.gameWrong?.()
      setStreak(0)
    }
    setTimeout(() => {
      const next = round + 1
      if (next >= ROUNDS) {
        const finalScore = score + (isCorrect ? Math.max(10, timeLeft*4) : 0)
        if (studentId) saveGameScore(studentId, game?.id, levelData?.level, finalScore)
        onFinish?.()
      } else {
        setRound(next); newQuestion()
      }
    }, 1600)
  }

  if (!q) return <div style={{ background:'#0C0F1A', borderRadius:16, minHeight:480, display:'flex', alignItems:'center', justifyContent:'center' }}><p style={{ color:'#64748B' }}>Loading...</p></div>

  const col = CAT_COLORS[q.type] || '#14B8A6'
  const urgent = timeLeft <= Math.floor(BASE_TIME * 0.3)

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480 }}>
      <div style={{ background:'#131829', borderBottom:'1px solid #1A2035', padding:'16px 16px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:900, fontSize:14 }}>Maths Speed - Lvl {level}</span>
          <span style={{ color:'#F59E0B', fontWeight:900, fontSize:12 }}>* {score}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:6, borderRadius:9999, overflow:'hidden', background:'#1A2035' }}>
            <div style={{ height:'100%', borderRadius:9999, width:`${(round/ROUNDS)*100}%`, background:col, transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{round+1}/{ROUNDS}</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ background:`${col}18`, color:col, padding:'4px 12px', borderRadius:9999, fontSize:12, fontWeight:900 }}>
            {q.type}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {streak > 1 && <span style={{ color:'#F59E0B', fontWeight:900, fontSize:12 }}>x{streak}</span>}
            <span style={{ color: urgent?'#EF4444':'#14B8A6', fontWeight:900, fontSize:20 }}>{timeLeft}s</span>
          </div>
        </div>

        <div style={{ height:6, borderRadius:9999, overflow:'hidden', marginBottom:20, background:'#1A2035' }}>
          <div style={{ height:'100%', borderRadius:9999, width:`${(timeLeft/BASE_TIME)*100}%`, background:urgent?'#EF4444':col, transition:'width 1s linear' }}/>
        </div>

        <div style={{ background:`${col}10`, border:`2px solid ${col}30`, borderRadius:24, padding:24, marginBottom:24, textAlign:'center' }}>
          <p style={{ color:'white', fontWeight:900, fontSize:28, whiteSpace:'pre-line' }}>{q.q}</p>
          <p style={{ color:'#64748B', fontSize:12, marginTop:8 }}>{q.hint}</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {options.map((opt,i) => {
            let bg='#131829', border='1px solid #1A2035', color='#E2E8F0'
            if (phase==='result') {
              if (opt===q.answer)     { bg=`${col}15`; border=`2px solid ${col}`; color=col }
              else if (opt===selected){ bg='rgba(239,68,68,0.1)'; border='2px solid #EF4444'; color='#EF4444' }
            }
            return (
              <button key={i} onClick={()=>handleAnswer(opt)} disabled={phase==='result'}
                style={{ background:bg, border, color, padding:'20px 8px', borderRadius:16, fontWeight:900, fontSize:20, cursor:'pointer', width:'100%' }}>
                {opt}
              </button>
            )
          })}
        </div>

        {phase==='result' && (
          <div style={{ marginTop:16, padding:'10px 14px', borderRadius:12, textAlign:'center', background: selected===q.answer?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)' }}>
            <p style={{ color: selected===q.answer?'#4ADE80':'#EF4444', fontWeight:700, fontSize:13 }}>
              {selected===q.answer ? `Correct! +${Math.max(10,timeLeft*4)+streak*8} XP${streak>1?` x${streak}`:''}`:`Answer: ${q.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
