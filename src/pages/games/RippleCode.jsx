import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Pattern Generator ─────────────────────────────────────────────
// Each rule is a function that generates a sequence, plus a human-readable name
// Player sees N terms, must find next M terms

const RULE_SETS = {
  // Tier 1 — simple arithmetic/geometric
  1: [
    { name:'Add 3',       rule: n => n*3+2,          type:'arithmetic' },
    { name:'Add 5',       rule: n => n*5+1,          type:'arithmetic' },
    { name:'Subtract 4',  rule: n => 50 - n*4,       type:'arithmetic' },
    { name:'Double',      rule: n => Math.pow(2,n),   type:'geometric'  },
    { name:'Triple',      rule: n => Math.pow(3,n),   type:'geometric'  },
    { name:'Squares',     rule: n => (n+1)*(n+1),     type:'squares'    },
  ],
  2: [
    { name:'Fibonacci',   rule: null, gen: (len) => { const s=[1,1]; while(s.length<len) s.push(s[s.length-1]+s[s.length-2]); return s }, type:'fibonacci' },
    { name:'Triangular',  rule: n => (n+1)*(n+2)/2,  type:'triangular' },
    { name:'Add n',       rule: null, gen: (len) => { let v=1; const s=[v]; for(let i=1;i<len;i++){v+=i+1;s.push(v)} return s }, type:'step' },
    { name:'×2 +1',       rule: n => Math.pow(2,n+1)-1, type:'mixed' },
    { name:'Alternate',   rule: n => n%2===0 ? n*2 : n*3, type:'alternate' },
    { name:'Cubes',       rule: n => (n+1)*(n+1)*(n+1), type:'cubes' },
  ],
  3: [
    { name:'Prime',       rule: null, gen: (len) => { const primes=[]; let n=2; while(primes.length<len){let p=true;for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0){p=false;break};if(p)primes.push(n);n++} return primes }, type:'prime' },
    { name:'n² + n',      rule: n => (n+1)*(n+1)+(n+1), type:'poly' },
    { name:'2n² − 1',     rule: n => 2*(n+1)*(n+1)-1,   type:'poly' },
    { name:'Factorial',   rule: null, gen: (len) => { let f=1; const s=[1]; for(let i=1;i<len;i++){f*=i+1;s.push(f)} return s }, type:'factorial' },
    { name:'Lucas',       rule: null, gen: (len) => { const s=[2,1]; while(s.length<len) s.push(s[s.length-1]+s[s.length-2]); return s }, type:'lucas' },
  ],
  4: [
    { name:'nth prime squared', rule: null, gen: (len) => { const primes=[]; let n=2; while(primes.length<len+2){let p=true;for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0){p=false;break};if(p)primes.push(n);n++} return primes.slice(0,len).map(p=>p*p) }, type:'compound' },
    { name:'Sum of digits', rule: null, gen: (len) => { const s=[]; let n=1; while(s.length<len){const d=String(n*n).split('').reduce((a,b)=>a+parseInt(b),0); s.push(d);n++} return s }, type:'compound' },
    { name:'Collatz steps', rule: null, gen: (len) => { function steps(n){let s=0;while(n!==1){n=n%2===0?n/2:3*n+1;s++}return s} const r=[];for(let i=1;r.length<len;i++)r.push(steps(i));return r }, type:'compound' },
  ],
}

function generateSequence(tier, showCount, askCount) {
  const pool = RULE_SETS[Math.min(tier, 4)]
  const rule = pool[Math.floor(Math.random() * pool.length)]
  const total = showCount + askCount

  let seq
  if (rule.gen) {
    seq = rule.gen(total)
  } else {
    seq = Array.from({ length: total }, (_, i) => rule.rule(i))
  }

  return {
    name: rule.name,
    type: rule.type,
    shown:  seq.slice(0, showCount),
    answers: seq.slice(showCount, total),
  }
}

// Smarter wrong options: nearby but distinct
function makeOptions(correct, allAnswers, idx) {
  const opts = new Set([correct])
  const delta = Math.max(1, Math.round(Math.abs(correct) * 0.15))
  let tries = 0
  while (opts.size < 4 && tries < 40) {
    tries++
    const d = Math.floor(Math.random() * delta * 2) + 1
    const v = correct + (Math.random() < 0.5 ? d : -d)
    if (v !== correct && v > 0) opts.add(v)
  }
  // Fill with nearby integers if needed
  let x = 1
  while (opts.size < 4) { opts.add(correct + x); x++ }
  return [...opts].sort(() => Math.random() - 0.5).slice(0, 4)
}

function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{ position:'absolute',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,6,14,0.97)',backdropFilter:'blur(10px)',borderRadius:14 }}>
      <div style={{ textAlign:'center',padding:'0 24px' }}>
        <div style={{ fontSize:54,marginBottom:10 }}>{icon}</div>
        <div style={{ color:'white',fontWeight:900,fontSize:22,marginBottom:6 }}>{title}</div>
        <div style={{ color,fontSize:14,marginBottom:24,lineHeight:1.5 }}>{sub}</div>
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={onRetry} style={{ padding:'11px 24px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer' }}>Next Sequence</button>
          <button onClick={onExit}  style={{ padding:'11px 24px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#111827',border:'none',cursor:'pointer' }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

export default function RippleCode({ game, levelData, studentId, onFinish }) {
  const { tier = 1, rounds = 5, showCount = 5, askCount = 2, timePerQ = 25 } = levelData

  const [seqData, setSeqData]   = useState(() => generateSequence(tier, showCount, askCount))
  const [askIdx, setAskIdx]     = useState(0)       // which answer we're on
  const [options, setOptions]   = useState([])
  const [timeLeft, setTimeLeft] = useState(timePerQ)
  const [round, setRound]       = useState(1)
  const [score, setScore]       = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [phase, setPhase]       = useState('playing')
  const [feedback, setFeedback] = useState(null)    // null | 'right' | 'wrong'
  const [revealed, setRevealed] = useState([])      // answers revealed so far
  const [wrongOption, setWrongOption] = useState(null)
  const locked = useRef(false)

  useEffect(() => {
    // Build options for current ask
    const ans = seqData.answers[askIdx]
    setOptions(makeOptions(ans, seqData.answers, askIdx))
  }, [seqData, askIdx])

  useEffect(() => {
    if (phase !== 'playing' || feedback) return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); handleAnswer(null); return 0 }
      if (s <= 8) SoundEngine.timerTick(s <= 3 ? 3 : 2)
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase, feedback, askIdx, round])

  function handleAnswer(val) {
    if (locked.current || phase !== 'playing') return
    locked.current = true
    const ans = seqData.answers[askIdx]
    const ok  = val === ans

    if (ok) {
      SoundEngine.gameCorrect()
      setFeedback('right')
      setScore(s => s + Math.round(10 + (timeLeft / timePerQ) * 20))
      setCorrect(c => c + 1)
    } else {
      SoundEngine.gameWrong()
      setFeedback('wrong')
      setWrongOption(val)
    }
    setRevealed(r => [...r, ans])

    setTimeout(() => {
      setFeedback(null); setWrongOption(null); locked.current = false

      const nextAskIdx = askIdx + 1
      if (nextAskIdx >= askCount) {
        // Move to next round or end
        const nextRound = round + 1
        if (nextRound > rounds) {
          SoundEngine.levelComplete()
          setPhase('done')
          if (studentId) saveGameScore(studentId, game.id, levelData.level, score + (ok ? Math.round(10 + (timeLeft/timePerQ)*20) : 0))
          return
        }
        setSeqData(generateSequence(tier, showCount, askCount))
        setAskIdx(0); setRevealed([])
        setRound(nextRound); setTimeLeft(timePerQ)
      } else {
        setAskIdx(nextAskIdx); setTimeLeft(timePerQ)
      }
    }, ok ? 600 : 1200)
  }

  function restart() {
    setSeqData(generateSequence(tier, showCount, askCount))
    setAskIdx(0); setRevealed([]); setTimeLeft(timePerQ)
    setRound(1); setScore(0); setCorrect(0)
    setPhase('playing'); setFeedback(null); locked.current = false
  }

  const tc = timeLeft > timePerQ * 0.6 ? '#4ADE80' : timeLeft > timePerQ * 0.3 ? '#F59E0B' : '#EF4444'
  const currentAnswer = seqData.answers[askIdx]
  const allShown = [...seqData.shown, ...revealed]

  return (
    <div style={{ position:'relative' }}>
      <style>{`
        @keyframes pop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
        <div style={{ display:'flex',gap:12,fontSize:12 }}>
          <span style={{ color:'#FBBF24',fontWeight:800 }}>⭐ {score}</span>
          <span style={{ color:'#475569' }}>Round {round}/{rounds}</span>
          <span style={{ color:'#4ADE80' }}>✓ {correct}</span>
        </div>
        <span style={{ color:tc,fontWeight:800,fontFamily:'monospace',fontSize:13 }}>{timeLeft}s</span>
      </div>

      {/* Timer */}
      <div style={{ height:4,borderRadius:99,background:'#0F1629',marginBottom:16 }}>
        <div style={{ height:'100%',borderRadius:99,width:`${(timeLeft/timePerQ)*100}%`,background:tc,transition:'width 1s linear,background 0.4s' }}/>
      </div>

      {/* Sequence display */}
      <div style={{ marginBottom:16,padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid #1A2642' }}>
        <div style={{ color:'#475569',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10 }}>
          Find the pattern
        </div>
        <div style={{ display:'flex',flexWrap:'wrap',gap:8,alignItems:'center' }}>
          {/* Shown terms */}
          {seqData.shown.map((val, i) => (
            <div key={i} style={{ padding:'8px 14px',borderRadius:10,background:`${game.color}18`,border:`1px solid ${game.color}44`,color:'white',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:44,textAlign:'center' }}>
              {val}
            </div>
          ))}

          {/* Already-revealed answers */}
          {revealed.map((val, i) => (
            <div key={`r${i}`} style={{ padding:'8px 14px',borderRadius:10,background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.5)',color:'#4ADE80',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:44,textAlign:'center',animation:'pop 0.3s ease' }}>
              {val}
            </div>
          ))}

          {/* Current blank */}
          {askIdx < askCount && (
            <div style={{ padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`2px dashed ${feedback==='right'?'#4ADE80':feedback==='wrong'?'#EF4444':'#334155'}`,color:feedback==='right'?'#4ADE80':feedback==='wrong'?'#EF4444':'#475569',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:44,textAlign:'center',transition:'all 0.2s',animation:feedback==='wrong'?'shake 0.4s ease':'none' }}>
              {feedback==='right' ? currentAnswer : '?'}
            </div>
          )}

          {/* Remaining blanks */}
          {Array.from({ length: Math.max(0, askCount - askIdx - 1) }, (_, i) => (
            <div key={`b${i}`} style={{ padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'2px dashed #1A2642',color:'#334155',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:44,textAlign:'center' }}>
              ?
            </div>
          ))}
        </div>
      </div>

      {/* Question */}
      <div style={{ color:'#94A3B8',fontSize:13,marginBottom:12,textAlign:'center',fontWeight:600 }}>
        What comes next? · <span style={{ color:game.color }}>Position {showCount + askIdx + 1}</span>
      </div>

      {/* Answer options */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
        {options.map((opt, i) => {
          const isCorrect = opt === currentAnswer
          const isWrong   = opt === wrongOption
          let bg = 'rgba(255,255,255,0.04)'
          let border = 'rgba(255,255,255,0.08)'
          let color = '#CBD5E1'
          if (feedback === 'right' && isCorrect)  { bg='rgba(74,222,128,0.2)'; border='rgba(74,222,128,0.6)'; color='#4ADE80' }
          if (feedback === 'wrong' && isWrong)    { bg='rgba(239,68,68,0.2)';  border='rgba(239,68,68,0.6)';  color='#FCA5A5' }
          if (feedback === 'wrong' && isCorrect)  { bg='rgba(74,222,128,0.12)';border='rgba(74,222,128,0.4)'; color='#4ADE80' }
          return (
            <button key={i} onClick={() => handleAnswer(opt)}
              disabled={!!feedback}
              style={{ padding:'16px',borderRadius:12,border:`1px solid ${border}`,background:bg,color,fontWeight:800,fontSize:20,fontFamily:'monospace',cursor:feedback?'default':'pointer',transition:'all 0.15s' }}>
              {opt}
            </button>
          )
        })}
      </div>

      {/* Pattern type hint (subtle) */}
      <div style={{ textAlign:'center',color:'#1E2D45',fontSize:10,fontWeight:600 }}>
        Type: {seqData.type}
      </div>

      {phase==='done' && <Overlay icon="🔢" title="Code Cracked!" sub={`${correct}/${rounds*askCount} correct · ${score} pts`} color={correct>=rounds*askCount?'#4ADE80':'#F59E0B'} onRetry={restart} onExit={onFinish} game={game}/>}
    </div>
  )
}
