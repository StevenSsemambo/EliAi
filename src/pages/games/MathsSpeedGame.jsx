import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { SoundEngine } from '../../utils/soundEngine.js'

// ── Question generator (curriculum-aligned, difficulty by level) ──
function generateQuestion(level) {
  const tier = Math.floor((level - 1) / 4) // 0-5

  if (tier === 0) {
    // S1: Basic arithmetic
    const ops = ['+', '-', '×']
    const op  = ops[Math.floor(Math.random() * ops.length)]
    const a   = Math.floor(Math.random() * 20) + 1
    const b   = Math.floor(Math.random() * 15) + 1
    let ans, q
    if (op==='+') { ans=a+b; q=`${a} + ${b}` }
    else if (op==='-') { const x=Math.max(a,b),y=Math.min(a,b); ans=x-y; q=`${x} - ${y}` }
    else { ans=a*b; q=`${a} × ${b}` }
    return { q: `${q} = ?`, answer: String(ans), type:'Arithmetic', hint:'Basic arithmetic' }
  }

  if (tier === 1) {
    // S2: Fractions + Powers
    const types = ['fraction', 'power', 'divide']
    const t = types[Math.floor(Math.random() * types.length)]
    if (t === 'fraction') {
      const d = [2,4,5,10][Math.floor(Math.random()*4)]
      const n = Math.floor(Math.random()*(d-1))+1
      const m = Math.floor(Math.random()*8)+2
      const ans = (n*m)/d
      return { q:`${n}/${d} × ${m} = ?`, answer: Number.isInteger(ans)?String(ans):`${n*m}/${d}`, type:'Fractions', hint:'Multiply numerator by the whole number' }
    }
    if (t === 'power') {
      const base = Math.floor(Math.random()*5)+2
      const exp  = Math.floor(Math.random()*3)+2
      const ans  = Math.pow(base,exp)
      return { q:`${base}${exp===2?'²':exp===3?'³':'^'+exp} = ?`, answer: String(ans), type:'Powers', hint:`Multiply ${base} by itself ${exp} times` }
    }
    const a=Math.floor(Math.random()*9)+2, b=Math.floor(Math.random()*9)+1
    return { q:`${a*b} ÷ ${a} = ?`, answer: String(b), type:'Division', hint:'How many times does the divisor go in?' }
  }

  if (tier === 2) {
    // S2-S3: Simple algebra
    const x = Math.floor(Math.random() * 10) + 1
    const a = Math.floor(Math.random() * 8) + 2
    const b = Math.floor(Math.random() * 20) + 5
    const types = ['linear1', 'linear2']
    const t = types[Math.floor(Math.random() * 2)]
    if (t === 'linear1') {
      // ax = b → x = b/a
      const prod = a * x
      return { q:`${a}x = ${prod}\nx = ?`, answer: String(x), type:'Linear Equations', hint:'Divide both sides by the coefficient of x' }
    }
    // ax + b = c
    const c = a*x + b
    return { q:`${a}x + ${b} = ${c}\nx = ?`, answer: String(x), type:'Linear Equations', hint:'Subtract b from both sides, then divide by a' }
  }

  if (tier === 3) {
    // S3-S4: Quadratics + percentages
    const types = ['percent', 'quad_roots', 'simultaneous']
    const t = types[Math.floor(Math.random()*3)]
    if (t === 'percent') {
      const pcts = [10,20,25,50,15]
      const pct  = pcts[Math.floor(Math.random()*pcts.length)]
      const vals = [200,400,600,800,120,240]
      const val  = vals[Math.floor(Math.random()*vals.length)]
      const ans  = (pct/100)*val
      return { q:`${pct}% of ${val} = ?`, answer: String(ans), type:'Percentages', hint:`Divide by 100 then multiply: ${val} × ${pct}/100` }
    }
    if (t === 'quad_roots') {
      // (x+a)(x+b) roots
      const r1=Math.floor(Math.random()*5)+1, r2=Math.floor(Math.random()*5)+1
      const sum=r1+r2, prod=r1*r2
      return { q:`x² - ${sum}x + ${prod} = 0\nSmaller root?`, answer: String(Math.min(r1,r2)), type:'Quadratics', hint:`Find two numbers that add to ${sum} and multiply to ${prod}` }
    }
    // Simultaneous: x+y=a, x-y=b
    const s=Math.floor(Math.random()*10)+4, d=Math.floor(Math.random()*4)+1
    const x=(s+d)/2, y=(s-d)/2
    if(Number.isInteger(x)&&Number.isInteger(y))
      return { q:`x + y = ${s}\nx - y = ${d}\nx = ?`, answer: String(x), type:'Simultaneous', hint:'Add the two equations to eliminate y' }
    return { q:`2x + 3 = ${2*5+3}\nx = ?`, answer:'5', type:'Linear Equations', hint:'Subtract 3, then divide by 2' }
  }

  if (tier >= 4) {
    // S4-S6: Trigonometry + logs
    const types = ['trig', 'log', 'sequence']
    const t = types[Math.floor(Math.random()*3)]
    if (t === 'trig') {
      const known = [{sin30:'0.5'},{cos60:'0.5'},{tan45:'1'},{sin90:'1'},{cos0:'1'}]
      const k = known[Math.floor(Math.random()*known.length)]
      const [key, val] = Object.entries(k)[0]
      const fn = key.slice(0,3), deg = key.slice(3)
      return { q:`${fn}(${deg}°) = ?`, answer: val, type:'Trigonometry', hint:'Standard angle — memorise sin/cos/tan of 0°,30°,45°,60°,90°' }
    }
    if (t === 'log') {
      const bases = [{b:2,x:8,ans:3},{b:2,x:16,ans:4},{b:3,x:9,ans:2},{b:10,x:100,ans:2},{b:5,x:25,ans:2}]
      const k = bases[Math.floor(Math.random()*bases.length)]
      return { q:`log${k.b}(${k.x}) = ?`, answer: String(k.ans), type:'Logarithms', hint:`${k.b}^? = ${k.x}` }
    }
    // Arithmetic sequence
    const a1=Math.floor(Math.random()*5)+1, d2=Math.floor(Math.random()*4)+2, n=Math.floor(Math.random()*4)+4
    const nth = a1 + (n-1)*d2
    return { q:`Sequence: ${a1}, ${a1+d2}, ${a1+2*d2}, ...\nTerm ${n} = ?`, answer: String(nth), type:'Sequences', hint:`aₙ = a₁ + (n-1)d` }
  }
}

function generateOptions(correct) {
  const n = parseInt(correct)
  if (isNaN(n)) {
    // String answer — generate plausible wrongs
    return [correct, correct+'²', String(parseFloat(correct)*2), 'undefined'].sort(()=>Math.random()-0.5)
  }
  const wrongs = new Set()
  while (wrongs.size < 3) {
    const offsets = [-2,-1,1,2,n-1,n+1,n*2,Math.round(n/2)].filter(x=>x!==n&&x>=0)
    wrongs.add(String(offsets[Math.floor(Math.random()*offsets.length)]))
  }
  return [correct, ...wrongs].sort(()=>Math.random()-0.5)
}

const CAT_COLORS = { Arithmetic:'#0891B2', Fractions:'#7C3AED', Powers:'#F59E0B', Division:'#16A34A', 'Linear Equations':'#EF4444', Percentages:'#0D9488', Quadratics:'#7C3AED', Simultaneous:'#A78BFA', Trigonometry:'#F59E0B', Logarithms:'#EF4444', Sequences:'#0891B2' }

export default function MathsSpeedGame({ level=1, onComplete, onExit }) {
  const { theme }  = useTheme()
  const ROUNDS     = Math.min(5 + Math.floor(level/3), 10)
  const BASE_TIME  = Math.max(10, 30 - level)

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
    if (phase !== 'question') return
    setSelected(ans)
    setPhase('result')
    const isCorrect = ans === q?.answer
    if (isCorrect) {
      SoundEngine.gameCorrect?.()
      const bonus = Math.max(10, timeLeft * 4) + streak * 8
      setScore(s => s + bonus)
      setCorrect(c => c+1)
      setStreak(s => s+1)
    } else {
      SoundEngine.gameWrong?.()
      setStreak(0)
    }
    setTimeout(() => {
      const next = round + 1
      if (next >= ROUNDS) {
        const finalBonus = isCorrect ? Math.max(10, timeLeft*4) : 0
        onComplete?.({ score: score+finalBonus, correct: correct+(isCorrect?1:0), total: ROUNDS })
      } else {
        setRound(next); newQuestion()
      }
    }, 1600)
  }

  if (!q) return null
  const col = CAT_COLORS[q.type] || theme.accent
  const urgentTime = timeLeft <= Math.floor(BASE_TIME * 0.3)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-4" style={{ background: theme.surface, borderBottom:`1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onExit} style={{ color: theme.muted }}>✕</button>
          <span className="font-black text-sm" style={{ color: theme.text }}>🔢 Maths Speed — Lvl {level}</span>
          <span className="text-xs font-black" style={{ color:'#F59E0B' }}>⭐ {score}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
            <div className="h-full rounded-full transition-all"
              style={{ width:`${(round/ROUNDS)*100}%`, background: col }}/>
          </div>
          <span className="text-xs font-bold" style={{ color: theme.muted }}>{round+1}/{ROUNDS}</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 max-w-lg mx-auto w-full">
        {/* Category + timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
            style={{ background:`${col}18`, color: col }}>
            📐 {q.type}
          </div>
          <div className="flex items-center gap-1.5">
            {streak > 1 && <span className="text-xs font-black" style={{ color:'#F59E0B' }}>🔥{streak}</span>}
            <span className="font-black text-lg" style={{ color: urgentTime ? '#EF4444' : theme.accent,
              animation: urgentTime ? 'pulse 0.5s ease infinite' : 'none' }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: theme.border }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width:`${(timeLeft/BASE_TIME)*100}%`, background: urgentTime?'#EF4444':col }}/>
        </div>

        {/* Question in a big display */}
        <div className="rounded-3xl p-6 mb-6 text-center"
          style={{ background:`${col}10`, border:`2px solid ${col}30` }}>
          <p className="text-3xl font-black whitespace-pre-line" style={{ color: theme.text }}>{q.q}</p>
          <p className="text-xs mt-2" style={{ color: theme.muted }}>{q.hint}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => {
            let bg = theme.card, border = `1px solid ${theme.border}`, textCol = theme.text
            if (phase === 'result') {
              if (opt === q.answer)     { bg=`${col}15`; border=`2px solid ${col}`; textCol=col }
              else if (opt === selected){ bg='rgba(239,68,68,0.1)'; border='2px solid #EF4444'; textCol='#EF4444' }
            }
            return (
              <button key={i} onClick={() => handleAnswer(opt)} disabled={phase==='result'}
                className="rounded-2xl py-5 font-black text-xl transition-all active:scale-90"
                style={{ background: bg, border, color: textCol }}>
                {opt}
              </button>
            )
          })}
        </div>

        {phase==='result' && (
          <div className="mt-4 rounded-xl px-3 py-2 text-center"
            style={{ background: selected===q.answer?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)' }}>
            <p className="font-bold text-sm" style={{ color: selected===q.answer?'#4ADE80':'#EF4444' }}>
              {selected===q.answer
                ? `✅ +${Math.max(10,timeLeft*4)+streak*8} XP${streak>1?` 🔥${streak}x streak!`:''}`
                : `❌ Answer: ${q.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
