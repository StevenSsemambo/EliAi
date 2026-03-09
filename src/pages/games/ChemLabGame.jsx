import { useState, useEffect } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const REACTIONS = [
  { id:'r1',  a:'HCl',    b:'NaOH',     product:'NaCl + H2O',       type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base -> Salt + Water' },
  { id:'r2',  a:'H2SO4',  b:'KOH',      product:'K2SO4 + H2O',      type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base -> Salt + Water' },
  { id:'r3',  a:'HNO3',   b:'Ca(OH)2',  product:'Ca(NO3)2 + H2O',   type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base -> Salt + Water' },
  { id:'r4',  a:'Zn',     b:'HCl',      product:'ZnCl2 + H2 gas',   type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid -> salt + hydrogen gas' },
  { id:'r5',  a:'Fe',     b:'H2SO4',    product:'FeSO4 + H2 gas',   type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid -> salt + hydrogen gas' },
  { id:'r6',  a:'Mg',     b:'HCl',      product:'MgCl2 + H2 gas',   type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid -> salt + hydrogen gas' },
  { id:'r7',  a:'C',      b:'O2',       product:'CO2',              type:'Combustion',     color:'#EF4444', hint:'Carbon burns in oxygen -> carbon dioxide' },
  { id:'r8',  a:'CH4',    b:'O2',       product:'CO2 + H2O',        type:'Combustion',     color:'#EF4444', hint:'Hydrocarbon + oxygen -> CO2 + water' },
  { id:'r9',  a:'H2',     b:'O2',       product:'H2O',              type:'Combustion',     color:'#EF4444', hint:'Hydrogen burns to form water' },
  { id:'r10', a:'Fe',     b:'CuSO4',    product:'FeSO4 + Cu',       type:'Displacement',   color:'#7C3AED', hint:'More reactive metal displaces less reactive one' },
  { id:'r11', a:'Zn',     b:'CuSO4',    product:'ZnSO4 + Cu',       type:'Displacement',   color:'#7C3AED', hint:'Zinc is more reactive than copper' },
  { id:'r12', a:'Mg',     b:'ZnSO4',    product:'MgSO4 + Zn',       type:'Displacement',   color:'#7C3AED', hint:'Magnesium displaces zinc from solution' },
]

const WRONG_PRODUCTS = [
  'No reaction', 'H2SO4 + O2', 'NaOH + Cl2', 'CaCl2 + H2',
  'KNO3 + H2O', 'MgO + H2', 'FeO + CO2', 'Na2O + H2O',
  'CO + H2O', 'ZnO + HCl', 'CuO + H2SO4', 'Al2O3 + H2',
]

function getReactionForLevel(level) {
  const idx = Math.min(Math.floor((level - 1) / 2), REACTIONS.length - 1)
  return REACTIONS[idx]
}

export default function ChemLabGame({ game, levelData, studentId, onFinish }) {
  const level = levelData?.level || 1
  const TOTAL_ROUNDS = Math.min(5 + Math.floor(level / 4), 10)
  const reaction = getReactionForLevel(level)

  const [phase, setPhase]         = useState('mix')
  const [selected, setSelected]   = useState(null)
  const [options, setOptions]     = useState([])
  const [score, setScore]         = useState(0)
  const [questions, setQuestions] = useState(0)
  const [streak, setStreak]       = useState(0)
  const [showBubbles, setShowBubbles] = useState(false)
  const [timeLeft, setTimeLeft]   = useState(25)
  const [lives, setLives]         = useState(3)

  useEffect(() => {
    const wrong = WRONG_PRODUCTS.filter(w => w !== reaction.product).sort(() => Math.random() - 0.5).slice(0, 3)
    setOptions([reaction.product, ...wrong].sort(() => Math.random() - 0.5))
  }, [reaction])

  useEffect(() => {
    if (phase !== 'answer') return
    const t = setInterval(() => {
      setTimeLeft(tl => {
        if (tl <= 1) { clearInterval(t); handleAnswer(null); return 0 }
        return tl - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  function startReaction() {
    SoundEngine.tap?.()
    setPhase('reacting')
    setShowBubbles(true)
    setTimeout(() => { setShowBubbles(false); setPhase('answer'); setTimeLeft(25) }, 1800)
  }

  function handleAnswer(ans) {
    if (phase !== 'answer') return
    setSelected(ans)
    const correct = ans === reaction.product
    setPhase('result')
    if (correct) {
      SoundEngine.gameCorrect?.()
      setScore(s => s + Math.max(10, timeLeft * 4 + streak * 5))
      setStreak(s => s + 1)
    } else {
      SoundEngine.gameWrong?.()
      setStreak(0)
      setLives(l => l - 1)
    }
    const nextQ = questions + 1
    setQuestions(nextQ)
    setTimeout(() => {
      if ((lives <= 1 && !correct) || nextQ >= TOTAL_ROUNDS) {
        const finalScore = score + (correct ? Math.max(10, timeLeft * 4) : 0)
        if (studentId) saveGameScore(studentId, game?.id, levelData?.level, finalScore)
        onFinish?.()
      } else {
        setPhase('mix'); setSelected(null); setTimeLeft(25)
      }
    }, 1800)
  }

  const col = reaction.color

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480 }}>
      <style>{`@keyframes bubble{to{transform:translateY(-60px) scale(0);opacity:0}} @keyframes shake{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}`}</style>

      <div style={{ background:'#131829', borderBottom:'1px solid #1A2035', padding:'16px 16px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:900, fontSize:14 }}>Chem Lab - Level {level}</span>
          <div style={{ display:'flex', gap:2 }}>
            {[...Array(3)].map((_,i)=><span key={i} style={{ opacity: i<lives?1:0.2 }}>heart</span>)}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:6, borderRadius:9999, overflow:'hidden', background:'#1A2035' }}>
            <div style={{ height:'100%', borderRadius:9999, width:`${(questions/TOTAL_ROUNDS)*100}%`, background:col }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{questions}/{TOTAL_ROUNDS}</span>
          <span style={{ color:'#F59E0B', fontSize:12, fontWeight:900 }}>* {score}</span>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 16px' }}>
        <div style={{ background:`${col}22`, color:col, padding:'4px 12px', borderRadius:9999, fontSize:12, fontWeight:900, marginBottom:16 }}>
          {reaction.type} Reaction
        </div>

        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:32, marginBottom:24 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ width:80, height:96, borderRadius:'0 0 12px 12px', position:'relative', overflow:'hidden', background:'rgba(8,145,178,0.15)', border:'2px solid rgba(8,145,178,0.4)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
              <div style={{ width:'100%', height:'60%', background:'rgba(8,145,178,0.3)', borderRadius:'0 0 10px 10px' }}/>
              {showBubbles && [...Array(6)].map((_,i)=>(
                <div key={i} style={{ position:'absolute', width:10, height:10, borderRadius:'50%', background:col, animation:`bubble 1s ease-out ${i*0.1}s forwards`, transform:`rotate(${i*60}deg) translateX(18px)`, opacity:0.7 }}/>
              ))}
            </div>
            <span style={{ color:'white', fontWeight:900, fontSize:14 }}>{reaction.a}</span>
          </div>

          <span style={{ color:'#64748B', fontSize:28, fontWeight:900, paddingBottom:20 }}>+</span>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ width:80, height:96, borderRadius:'0 0 12px 12px', position:'relative', overflow:'hidden', background:'rgba(124,58,237,0.15)', border:'2px solid rgba(124,58,237,0.4)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
              <div style={{ width:'100%', height:'60%', background:'rgba(124,58,237,0.3)', borderRadius:'0 0 10px 10px' }}/>
              {showBubbles && [...Array(6)].map((_,i)=>(
                <div key={i} style={{ position:'absolute', width:10, height:10, borderRadius:'50%', background:col, animation:`bubble 1s ease-out ${i*0.1}s forwards`, transform:`rotate(${i*60}deg) translateX(18px)`, opacity:0.7 }}/>
              ))}
            </div>
            <span style={{ color:'white', fontWeight:900, fontSize:14 }}>{reaction.b}</span>
          </div>
        </div>

        {phase === 'mix' && (
          <div style={{ textAlign:'center' }}>
            <p style={{ color:'#94A3B8', fontSize:13, marginBottom:16 }}>{reaction.hint}</p>
            <button onClick={startReaction} style={{ padding:'14px 32px', borderRadius:16, fontWeight:900, color:'white', fontSize:16, background:`linear-gradient(135deg,${col},#7C3AED)`, border:'none', cursor:'pointer' }}>
              Mix Chemicals!
            </button>
          </div>
        )}

        {phase === 'reacting' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:8, animation:'shake 0.3s ease infinite' }}>flask</div>
            <p style={{ color:col, fontWeight:900 }}>Reaction in progress...</p>
          </div>
        )}

        {(phase === 'answer' || phase === 'result') && (
          <div style={{ width:'100%', maxWidth:360 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ color:'white', fontWeight:900, fontSize:14 }}>What are the products?</span>
              {phase === 'answer' && <span style={{ color: timeLeft<8?'#EF4444':'#14B8A6', fontWeight:900 }}>{timeLeft}s</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {options.map((opt,i) => {
                let bg='#131829', border='1px solid #1A2035', color='#E2E8F0'
                if (phase==='result') {
                  if (opt===reaction.product) { bg='rgba(74,222,128,0.12)'; border='2px solid #22C55E'; color='#4ADE80' }
                  else if (opt===selected)    { bg='rgba(239,68,68,0.12)'; border='2px solid #EF4444'; color='#EF4444' }
                }
                return (
                  <button key={i} onClick={()=>handleAnswer(opt)} disabled={phase==='result'}
                    style={{ background:bg, border, color, padding:'12px 16px', borderRadius:16, textAlign:'left', fontWeight:700, fontSize:13, cursor:'pointer', width:'100%' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {phase==='result' && (
              <div style={{ marginTop:12, padding:'8px 12px', borderRadius:12, background: selected===reaction.product?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)' }}>
                <p style={{ color: selected===reaction.product?'#4ADE80':'#EF4444', fontWeight:700, fontSize:13 }}>
                  {selected===reaction.product ? 'Correct!' : `Answer: ${reaction.product}`}
                </p>
                {streak > 1 && <p style={{ color:'#F59E0B', fontSize:12 }}>x{streak} streak bonus!</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
