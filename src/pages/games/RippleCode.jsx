import { useState, useEffect, useRef } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Sequence Definitions ──────────────────────────────────────────
// Every entry has: name, gen(totalLen) → number[], hint (shown in guide only)
// All sequences must be:
//  - Strictly learnable from 5 visible terms
//  - Positive integers throughout
//  - Distinct enough that 4 options make sense

const SEQUENCES = {
  1: [
    {
      name: 'Add 2',   hint: 'Each term increases by 2',
      gen: len => Array.from({length:len}, (_,i) => 3 + i*2),
    },
    {
      name: 'Add 3',   hint: 'Each term increases by 3',
      gen: len => Array.from({length:len}, (_,i) => 2 + i*3),
    },
    {
      name: 'Add 5',   hint: 'Each term increases by 5',
      gen: len => Array.from({length:len}, (_,i) => 1 + i*5),
    },
    {
      name: 'Add 7',   hint: 'Each term increases by 7',
      gen: len => Array.from({length:len}, (_,i) => 3 + i*7),
    },
    {
      name: 'Add 10',  hint: 'Each term increases by 10',
      gen: len => Array.from({length:len}, (_,i) => 5 + i*10),
    },
    {
      name: 'Double',  hint: 'Each term is doubled',
      gen: len => Array.from({length:len}, (_,i) => Math.pow(2, i)),
    },
    {
      name: 'Squares', hint: 'Perfect square numbers (1, 4, 9, 16…)',
      gen: len => Array.from({length:len}, (_,i) => (i+1)*(i+1)),
    },
  ],

  2: [
    {
      name: 'Fibonacci', hint: 'Each term = sum of the two before it',
      gen: len => { const s=[1,1]; while(s.length<len) s.push(s[s.length-1]+s[s.length-2]); return s },
    },
    {
      name: 'Triangular', hint: 'Add 1 more each time (1, +2, +3, +4…)',
      gen: len => Array.from({length:len}, (_,i) => (i+1)*(i+2)/2),
    },
    {
      name: 'Growing gaps', hint: 'Differences: 1, 2, 3, 4, 5…',
      gen: len => { let v=1; const s=[v]; for(let i=1;i<len;i++){v+=i+1;s.push(v)} return s },
    },
    {
      name: 'Cubes',      hint: 'Perfect cube numbers (1, 8, 27, 64…)',
      gen: len => Array.from({length:len}, (_,i) => (i+1)*(i+1)*(i+1)),
    },
    {
      name: '×3',         hint: 'Each term is multiplied by 3',
      gen: len => Array.from({length:len}, (_,i) => Math.pow(3, i)),
    },
    {
      name: '×2 +2',      hint: 'Double the term then add 2',
      gen: len => Array.from({length:len}, (_,i) => (Math.pow(2,i+1) - 2) + 2*1),
      // 2,6,14,30,62,126... each = prev*2+2
      gen: len => { const s=[2]; while(s.length<len) s.push(s[s.length-1]*2+2); return s },
    },
  ],

  3: [
    {
      name: 'Primes',   hint: 'Prime numbers: only divisible by 1 and itself',
      gen: len => {
        const primes=[];let n=2
        while(primes.length<len){
          let p=true
          for(let i=2;i<=Math.sqrt(n);i++) if(n%i===0){p=false;break}
          if(p) primes.push(n); n++
        }
        return primes
      },
    },
    {
      name: 'Lucas',    hint: 'Like Fibonacci but starts 2, 1…',
      gen: len => { const s=[2,1]; while(s.length<len) s.push(s[s.length-1]+s[s.length-2]); return s },
    },
    {
      name: 'n²+n',     hint: 'n × (n+1): 2, 6, 12, 20…',
      gen: len => Array.from({length:len}, (_,i) => (i+1)*(i+2)),
    },
    {
      name: '2n²−1',    hint: 'Twice a square minus 1',
      gen: len => Array.from({length:len}, (_,i) => 2*(i+1)*(i+1)-1),
    },
    {
      name: 'Factorial', hint: '1, 1×2, 1×2×3, 1×2×3×4…',
      gen: len => { let f=1; const s=[1]; for(let i=1;i<len;i++){f*=(i+1);s.push(f)} return s },
    },
    {
      name: 'Power +1',  hint: 'Powers of 2 minus 1: 1, 3, 7, 15…',
      gen: len => Array.from({length:len}, (_,i) => Math.pow(2,i+1)-1),
    },
  ],

  4: [
    {
      name: 'Prime squares', hint: 'The squares of prime numbers',
      gen: len => {
        const primes=[];let n=2
        while(primes.length<len){let p=true;for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0){p=false;break};if(p)primes.push(n);n++}
        return primes.map(p => p*p)
      },
    },
    {
      name: 'Catalan',   hint: 'Catalan numbers: 1, 1, 2, 5, 14, 42…',
      gen: len => {
        const cat=[1,1];
        while(cat.length<len){
          const n=cat.length
          cat.push(cat[n-1]*2*(2*n-1)/(n+1))
        }
        return cat.slice(0,len).map(Math.round)
      },
    },
    {
      name: '4th powers', hint: 'n⁴: 1, 16, 81, 256…',
      gen: len => Array.from({length:len}, (_,i) => Math.pow(i+1, 4)),
    },
    {
      name: 'Double Fibonacci', hint: 'Each term doubles the Fibonacci rule',
      gen: len => { const s=[2,2]; while(s.length<len) s.push(s[s.length-1]+s[s.length-2]); return s },
    },
    {
      name: 'n³+n²',    hint: 'n cubed plus n squared',
      gen: len => Array.from({length:len}, (_,i) => Math.pow(i+1,3)+Math.pow(i+1,2)),
    },
  ],
}

// ── Generate one round ────────────────────────────────────────────
function generateSequence(tier, showCount, askCount) {
  const pool = SEQUENCES[Math.min(tier, 4)]
  const defn = pool[Math.floor(Math.random() * pool.length)]
  const total = showCount + askCount
  const seq   = defn.gen(total)
  // Safety: make sure all values are positive integers
  const safe  = seq.map(v => Math.max(1, Math.round(v)))
  return {
    name:    defn.name,
    hint:    defn.hint,
    shown:   safe.slice(0, showCount),
    answers: safe.slice(showCount),
  }
}

// ── Distractor options ────────────────────────────────────────────
// Produce 4 choices that are close but distinct — not too obvious, not random
function makeOptions(correct, seqAnswers, idx) {
  const opts = new Set([correct])
  // Use a percentage-based spread so large numbers still produce plausible options
  const spread = Math.max(2, Math.round(correct * 0.18))

  // Primary distractors: within ±spread
  for (let tries = 0; tries < 60 && opts.size < 4; tries++) {
    const d   = Math.floor(Math.random() * spread) + 1
    const sgn = Math.random() < 0.5 ? 1 : -1
    const v   = correct + sgn * d
    if (v > 0 && v !== correct) opts.add(v)
  }

  // Fallback: sequential integers above correct
  for (let x = 1; opts.size < 4; x++) opts.add(correct + x)

  // Shuffle then return exactly 4
  return [...opts].sort(() => Math.random() - 0.5).slice(0, 4)
}

// ── Overlay ───────────────────────────────────────────────────────
function Overlay({ icon, title, sub, color, onRetry, onExit, game }) {
  return (
    <div style={{position:'absolute',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,6,14,0.97)',backdropFilter:'blur(10px)',borderRadius:14}}>
      <div style={{textAlign:'center',padding:'0 24px'}}>
        <div style={{fontSize:54,marginBottom:10}}>{icon}</div>
        <div style={{color:'white',fontWeight:900,fontSize:22,marginBottom:6}}>{title}</div>
        <div style={{color,fontSize:14,marginBottom:24,lineHeight:1.5}}>{sub}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={onRetry} style={{padding:'11px 24px',borderRadius:12,fontWeight:800,color:'white',background:game.color,border:'none',cursor:'pointer'}}>Play Again</button>
          <button onClick={onExit}  style={{padding:'11px 24px',borderRadius:12,fontWeight:700,color:'#94A3B8',background:'#111827',border:'none',cursor:'pointer'}}>Exit</button>
        </div>
      </div>
    </div>
  )
}

// ── How To Play ───────────────────────────────────────────────────
function HowToPlay({ game, onStart }) {
  const exSeq = [3, 6, 9, 12, 15, '?', '?']
  return (
    <div style={{padding:'4px 0'}}>
      <div style={{textAlign:'center',marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>🔢</div>
        <div style={{color:'white',fontWeight:900,fontSize:20,marginBottom:4}}>Ripple Code</div>
        <div style={{color:'#94A3B8',fontSize:13}}>Predict the next numbers in the sequence</div>
      </div>

      {/* Live example */}
      <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
        <div style={{color:'#64748B',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Example sequence</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          {exSeq.map((v, i) => (
            <div key={i} style={{
              padding:'8px 12px', borderRadius:8, fontWeight:800, fontSize:17, fontFamily:'monospace',
              background: typeof v === 'number' ? `${game.color}18` : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${typeof v === 'number' ? game.color+'44' : '#334155'}`,
              color: typeof v === 'number' ? 'white' : '#475569',
            }}>{v}</div>
          ))}
        </div>
        <div style={{color:'#4ADE80',fontSize:12,marginTop:8,fontWeight:600}}>Answer: 18 and 21 — add 3 each time!</div>
      </div>

      {[
        ['👁', 'Study the sequence', 'Look at the 5 visible numbers and find the pattern.'],
        ['❓', 'Fill the blanks',    'One or two numbers are hidden. Figure out what fits.'],
        ['⏱', 'Tap your answer',    'Pick from 4 choices before time runs out. Speed = bonus points!'],
        ['🔥', 'Chain answers',      'Get both blanks right to complete the round.'],
      ].map(([icon, title, desc]) => (
        <div key={title} style={{display:'flex',gap:12,marginBottom:10,alignItems:'flex-start'}}>
          <div style={{fontSize:20,flexShrink:0,marginTop:2}}>{icon}</div>
          <div>
            <div style={{color:'white',fontWeight:700,fontSize:13,marginBottom:2}}>{title}</div>
            <div style={{color:'#64748B',fontSize:12,lineHeight:1.5}}>{desc}</div>
          </div>
        </div>
      ))}

      <div style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:10,padding:'10px 14px',marginBottom:16}}>
        <div style={{color:'#4ADE80',fontWeight:700,fontSize:12,marginBottom:4}}>💡 Tips</div>
        <div style={{color:'#94A3B8',fontSize:12,lineHeight:1.6}}>
          • Check the differences between pairs first (3→6→9: diff is always 3)<br/>
          • If gaps grow, try adding more each time or squares<br/>
          • If numbers jump big, try multiplying (×2, ×3)
        </div>
      </div>

      <button onClick={onStart} style={{width:'100%',padding:'14px',borderRadius:14,fontWeight:900,fontSize:16,color:'white',border:'none',cursor:'pointer',background:`linear-gradient(135deg, ${game.color}, #059669)`}}>
        Start Game →
      </button>
    </div>
  )
}

// ── Main game component ───────────────────────────────────────────
export default function RippleCode({ game, levelData, studentId, onFinish }) {
  const { tier = 1, rounds = 5, showCount = 5, askCount = 2, timePerQ = 25 } = levelData || {}

  const [screen,   setScreen]   = useState('guide')
  const [seqData,  setSeqData]  = useState(null)
  const [options,  setOptions]  = useState([])
  const [askIdx,   setAskIdx]   = useState(0)
  const [timeLeft, setTimeLeft] = useState(timePerQ)
  const [timerKey, setTimerKey] = useState(0)
  const [round,    setRound]    = useState(1)
  const [score,    setScore]    = useState(0)
  const [correct,  setCorrect]  = useState(0)
  const [phase,    setPhase]    = useState('playing')
  const [feedback, setFeedback] = useState(null)   // null | 'right' | 'wrong'
  const [revealed, setRevealed] = useState([])
  const [wrongOpt, setWrongOpt] = useState(null)
  const locked = useRef(false)

  // Generate a new sequence whenever we need one
  function freshSeq() {
    return generateSequence(tier, showCount, askCount)
  }

  // Build options whenever seq or current blank changes
  useEffect(() => {
    if (!seqData) return
    const ans = seqData.answers[askIdx]
    setOptions(makeOptions(ans, seqData.answers, askIdx))
  }, [seqData, askIdx])

  // Timer — restarts only when timerKey increments
  useEffect(() => {
    if (screen !== 'playing' || phase !== 'playing') return
    setTimeLeft(timePerQ)
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleTimeout(); return 0 }
        if (prev <= 8) SoundEngine.timerTick?.(prev <= 3 ? 3 : 2)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, screen, phase])

  function handleTimeout() {
    if (locked.current || phase !== 'playing') return
    locked.current = true
    SoundEngine.gameWrong?.()
    setFeedback('wrong')
    setWrongOpt(null)
    setRevealed(r => [...r, seqData.answers[askIdx]])
    scheduleAdvance(false, 0)
  }

  function handleAnswer(val) {
    if (locked.current || phase !== 'playing' || !seqData) return
    locked.current = true
    const ans = seqData.answers[askIdx]
    const ok  = val === ans
    const pts = ok ? Math.round(10 + (timeLeft / timePerQ) * 20) : 0

    if (ok) { SoundEngine.gameCorrect?.(); setFeedback('right'); setScore(s => s + pts); setCorrect(c => c + 1) }
    else    { SoundEngine.gameWrong?.();   setFeedback('wrong'); setWrongOpt(val) }

    setRevealed(r => [...r, ans])
    scheduleAdvance(ok, pts)
  }

  function scheduleAdvance(ok, pts) {
    setTimeout(() => {
      setFeedback(null); setWrongOpt(null); locked.current = false

      const next = askIdx + 1
      if (next >= askCount) {
        // Round complete
        const nextRound = round + 1
        if (nextRound > rounds) {
          SoundEngine.levelComplete?.()
          setPhase('done')
          const finalScore = score + pts
          if (studentId) saveGameScore(studentId, game.id, levelData.level, finalScore)
          return
        }
        setSeqData(freshSeq())
        setAskIdx(0)
        setRevealed([])
        setRound(nextRound)
        setTimerKey(k => k + 1)
      } else {
        setAskIdx(next)
        setTimerKey(k => k + 1)
      }
    }, ok ? 700 : 1300)
  }

  function startGame() {
    const seq = freshSeq()
    setSeqData(seq)
    setAskIdx(0); setRevealed([]); setRound(1); setScore(0); setCorrect(0)
    setPhase('playing'); setFeedback(null); locked.current = false
    setTimerKey(0)
    setScreen('playing')
  }

  function restart() {
    const seq = freshSeq()
    setSeqData(seq)
    setAskIdx(0); setRevealed([]); setRound(1); setScore(0); setCorrect(0)
    setPhase('playing'); setFeedback(null); locked.current = false
    setTimerKey(k => k + 1)
  }

  // ── Screens ───────────────────────────────────────────────────
  if (screen === 'guide') {
    return <HowToPlay game={game} onStart={startGame} />
  }

  if (!seqData) {
    return (
      <div style={{textAlign:'center',padding:'40px 0',color:'#94A3B8'}}>
        Loading sequence…
      </div>
    )
  }

  const currentAns = seqData.answers[askIdx]
  const tc = timeLeft > timePerQ*0.6 ? '#4ADE80' : timeLeft > timePerQ*0.3 ? '#F59E0B' : '#EF4444'
  const totalBlanks = askCount

  return (
    <div style={{position:'relative'}}>
      <style>{`
        @keyframes pop   { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        @keyframes glow  { from{box-shadow:0 0 0 0 rgba(74,222,128,0.6)} to{box-shadow:0 0 0 8px rgba(74,222,128,0)} }
      `}</style>

      {/* Scoreboard */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{display:'flex',gap:14,fontSize:12}}>
          <span style={{color:'#FBBF24',fontWeight:800}}>⭐ {score}</span>
          <span style={{color:'#475569'}}>Round {round}/{rounds}</span>
          <span style={{color:'#4ADE80'}}>✓ {correct}</span>
        </div>
        <span style={{color:tc,fontWeight:800,fontFamily:'monospace',fontSize:14}}>{timeLeft}s</span>
      </div>

      {/* Timer bar */}
      <div style={{height:4,borderRadius:99,background:'#0F1629',marginBottom:18,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:99,background:tc,width:`${(timeLeft/timePerQ)*100}%`,transition:'width 1s linear,background 0.4s'}}/>
      </div>

      {/* Sequence row */}
      <div style={{marginBottom:16,padding:'14px 16px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{color:'#475569',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>
          Find the pattern — what comes next?
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>

          {/* Visible terms */}
          {seqData.shown.map((val, i) => (
            <div key={`s${i}`} style={{padding:'8px 13px',borderRadius:10,background:`${game.color}18`,border:`1.5px solid ${game.color}44`,color:'white',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:42,textAlign:'center'}}>
              {val}
            </div>
          ))}

          {/* Separator dot */}
          <div style={{color:'#334155',fontSize:20,fontWeight:900,margin:'0 2px'}}>…</div>

          {/* Already-answered blanks */}
          {revealed.map((val, i) => (
            <div key={`r${i}`} style={{padding:'8px 13px',borderRadius:10,background:'rgba(74,222,128,0.15)',border:'1.5px solid rgba(74,222,128,0.5)',color:'#4ADE80',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:42,textAlign:'center',animation:'pop 0.3s ease, glow 0.6s ease'}}>
              {val}
            </div>
          ))}

          {/* Current blank */}
          <div style={{
            padding:'8px 13px',borderRadius:10,minWidth:42,textAlign:'center',
            background: feedback==='right' ? 'rgba(74,222,128,0.2)' : feedback==='wrong' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
            border: `2px dashed ${feedback==='right' ? '#4ADE80' : feedback==='wrong' ? '#EF4444' : '#334155'}`,
            color: feedback==='right' ? '#4ADE80' : feedback==='wrong' ? '#EF4444' : '#475569',
            fontWeight:800, fontSize:18, fontFamily:'monospace',
            transition:'all 0.2s',
            animation: feedback==='wrong' ? 'shake 0.4s ease' : 'none',
          }}>
            {feedback === 'right' ? currentAns : '?'}
          </div>

          {/* Future blanks */}
          {Array.from({length: Math.max(0, totalBlanks - revealed.length - 1)}, (_, i) => (
            <div key={`b${i}`} style={{padding:'8px 13px',borderRadius:10,background:'rgba(255,255,255,0.02)',border:'2px dashed #1E2D40',color:'#1E2D40',fontWeight:800,fontSize:18,fontFamily:'monospace',minWidth:42,textAlign:'center'}}>
              ?
            </div>
          ))}
        </div>
      </div>

      {/* Blank position label */}
      <div style={{color:'#475569',fontSize:12,marginBottom:12,textAlign:'center',fontWeight:600}}>
        Position{' '}
        <span style={{color: game.color, fontWeight:800}}>
          {showCount + revealed.length + 1}
        </span>
        {' '}of{' '}
        <span style={{color:'#64748B'}}>{showCount + totalBlanks}</span>
        {' '}— {seqData.name}
      </div>

      {/* Answer buttons */}
      {options.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          {options.map((opt, i) => {
            const isCorrect = opt === currentAns
            const isWrong   = opt === wrongOpt
            let bg     = 'rgba(255,255,255,0.04)'
            let border = 'rgba(255,255,255,0.09)'
            let color  = '#CBD5E1'
            let scale  = '1'
            if (feedback === 'right' && isCorrect)  { bg='rgba(74,222,128,0.2)';  border='rgba(74,222,128,0.6)'; color='#4ADE80'; scale='1.04' }
            if (feedback === 'wrong' && isWrong)    { bg='rgba(239,68,68,0.2)';   border='rgba(239,68,68,0.6)';  color='#FCA5A5' }
            if (feedback === 'wrong' && isCorrect)  { bg='rgba(74,222,128,0.12)'; border='rgba(74,222,128,0.35)';color='#4ADE80' }
            if (!feedback)                          { scale = '1' }
            return (
              <button key={i} onClick={() => handleAnswer(opt)}
                disabled={!!feedback}
                style={{
                  padding:'18px 12px', borderRadius:14,
                  border:`1.5px solid ${border}`, background:bg, color,
                  fontWeight:900, fontSize:22, fontFamily:'monospace',
                  cursor: feedback ? 'default' : 'pointer',
                  transition:'all 0.15s',
                  transform:`scale(${scale})`,
                  lineHeight:1,
                }}>
                {opt}
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'20px',color:'#475569',fontSize:13}}>
          Loading options…
        </div>
      )}

      {/* Pattern hint (subtle, doesn't give away answer) */}
      <div style={{textAlign:'center',color:'#1E2D45',fontSize:10,fontWeight:600,marginTop:2}}>
        {seqData.hint}
      </div>

      {phase === 'done' && (
        <Overlay
          icon="🔢"
          title="Sequence Solved!"
          sub={`${correct}/${rounds * askCount} correct · ${score} pts`}
          color={correct >= rounds * askCount * 0.7 ? '#4ADE80' : '#F59E0B'}
          onRetry={restart}
          onExit={onFinish}
          game={game}
        />
      )}
    </div>
  )
}
