import { useState, useEffect, useRef } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'
import { SoundEngine } from '../../utils/soundEngine.js'

const REACTIONS = [
  { a:'HCl',    b:'NaOH',    product:'NaCl + H2O',     type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base gives Salt + Water' },
  { a:'H2SO4',  b:'KOH',     product:'K2SO4 + H2O',    type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base gives Salt + Water' },
  { a:'HNO3',   b:'Ca(OH)2', product:'Ca(NO3)2 + H2O', type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base gives Salt + Water' },
  { a:'HCl',    b:'Ca(OH)2', product:'CaCl2 + H2O',    type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base gives Salt + Water' },
  { a:'H2SO4',  b:'NaOH',    product:'Na2SO4 + H2O',   type:'Neutralisation', color:'#4ADE80', hint:'Acid + Base gives Salt + Water' },
  { a:'Zn',     b:'HCl',     product:'ZnCl2 + H2 gas', type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid gives salt + hydrogen' },
  { a:'Fe',     b:'H2SO4',   product:'FeSO4 + H2 gas', type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid gives salt + hydrogen' },
  { a:'Mg',     b:'HCl',     product:'MgCl2 + H2 gas', type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid gives salt + hydrogen' },
  { a:'Al',     b:'H2SO4',   product:'Al2(SO4)3 + H2', type:'Metal + Acid',   color:'#FCD34D', hint:'Active metal + acid gives salt + hydrogen' },
  { a:'Na',     b:'H2O',     product:'NaOH + H2 gas',  type:'Metal + Water',  color:'#FB923C', hint:'Very reactive metals react violently with water' },
  { a:'Ca',     b:'H2O',     product:'Ca(OH)2 + H2',   type:'Metal + Water',  color:'#FB923C', hint:'Calcium reacts steadily with cold water' },
  { a:'C',      b:'O2',      product:'CO2',             type:'Combustion',     color:'#EF4444', hint:'Carbon burns in oxygen gives carbon dioxide' },
  { a:'CH4',    b:'O2',      product:'CO2 + H2O',       type:'Combustion',     color:'#EF4444', hint:'Hydrocarbon + oxygen gives CO2 + water' },
  { a:'H2',     b:'O2',      product:'H2O',             type:'Combustion',     color:'#EF4444', hint:'Hydrogen burns to form water' },
  { a:'C3H8',   b:'O2',      product:'CO2 + H2O',       type:'Combustion',     color:'#EF4444', hint:'Propane combustion produces CO2 and water' },
  { a:'Fe',     b:'CuSO4',   product:'FeSO4 + Cu',      type:'Displacement',   color:'#A78BFA', hint:'More reactive metal displaces less reactive one' },
  { a:'Zn',     b:'CuSO4',   product:'ZnSO4 + Cu',      type:'Displacement',   color:'#A78BFA', hint:'Zinc is more reactive than copper' },
  { a:'Mg',     b:'ZnSO4',   product:'MgSO4 + Zn',      type:'Displacement',   color:'#A78BFA', hint:'Magnesium displaces zinc from solution' },
  { a:'Cu',     b:'AgNO3',   product:'Cu(NO3)2 + Ag',   type:'Displacement',   color:'#A78BFA', hint:'Copper displaces silver — more reactive wins' },
  { a:'Fe',     b:'S',       product:'FeS',             type:'Direct Combo',   color:'#38BDF8', hint:'Iron + sulfur heated gives iron sulfide' },
  { a:'Na',     b:'Cl2',     product:'NaCl',            type:'Direct Combo',   color:'#38BDF8', hint:'Metal + non-metal gives ionic compound' },
  { a:'CaCO3',  b:'heat',    product:'CaO + CO2',       type:'Decomposition',  color:'#F472B6', hint:'Thermal decomposition of limestone' },
  { a:'2H2O2',  b:'MnO2',   product:'2H2O + O2',       type:'Decomposition',  color:'#F472B6', hint:'Catalyst speeds up hydrogen peroxide breakdown' },
]

const WRONG = [
  'No reaction','H2SO4 + O2','NaOH + Cl2','CaCl2 + H2',
  'KNO3 + H2O','MgO + H2','FeO + CO2','Na2O + H2O',
  'CO + H2O','ZnO + HCl','CuO + H2SO4','Al2O3 + H2',
  'NaHCO3 + O2','FeH2 + Cl','Cu2O + H2O','KOH + CO',
]

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQueue(level) {
  const tier = Math.min(Math.floor((level - 1) / 3), 2)
  const pool = tier === 0 ? REACTIONS.slice(0, 10) : tier === 1 ? REACTIONS.slice(5, 18) : REACTIONS
  return shuffleArray(pool)
}

export default function ChemLabGame({ game, levelData, studentId, onFinish }) {
  const level = levelData?.level || 1
  const ROUNDS = Math.min(5 + Math.floor(level / 4), 10)

  const queueRef = useRef(buildQueue(level))
  const queueIdxRef = useRef(0)

  function nextReaction() {
    if (queueIdxRef.current >= queueRef.current.length) {
      queueRef.current = shuffleArray(queueRef.current)
      queueIdxRef.current = 0
    }
    return queueRef.current[queueIdxRef.current++]
  }

  const [reaction, setReaction]   = useState(() => nextReaction())
  const [phase, setPhase]         = useState('mix')
  const [selected, setSelected]   = useState(null)
  const [options, setOptions]     = useState([])
  const [score, setScore]         = useState(0)
  const [round, setRound]         = useState(0)
  const [streak, setStreak]       = useState(0)
  const [timeLeft, setTimeLeft]   = useState(25)
  const [lives, setLives]         = useState(3)
  const [shaking, setShaking]     = useState(false)

  useEffect(() => {
    const wrong = WRONG.filter(w => w !== reaction.product).sort(() => Math.random() - 0.5).slice(0, 3)
    setOptions([reaction.product, ...wrong].sort(() => Math.random() - 0.5))
  }, [reaction])

  useEffect(() => {
    if (phase !== 'answer') return
    const t = setInterval(() => setTimeLeft(n => {
      if (n <= 1) { clearInterval(t); pick(null); return 0 }
      if (n <= 8) SoundEngine.timerTick(n <= 3 ? 3 : 2)
      return n - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase])

  function mix() {
    SoundEngine.tap()
    setPhase('reacting')
    setShaking(true)
    setTimeout(() => { setShaking(false); setPhase('answer'); setTimeLeft(25) }, 1800)
  }

  function pick(ans) {
    if (phase !== 'answer') return
    setSelected(ans)
    setPhase('result')
    const ok = ans === reaction.product
    const newLives = ok ? lives : lives - 1
    const newStreak = ok ? streak + 1 : 0
    const gained = ok ? Math.max(10, timeLeft * 4 + streak * 5) : 0
    const newScore = score + gained
    setScore(newScore)
    setStreak(newStreak)
    setLives(newLives)
    if (ok) {
      SoundEngine.gameCorrect()
      if (newStreak >= 2) SoundEngine.combo(newStreak)
    } else {
      SoundEngine.gameWrong()
    }
    const nextRound = round + 1
    setRound(nextRound)
    setTimeout(() => {
      if (newLives <= 0 || nextRound >= ROUNDS) {
        SoundEngine.levelComplete()
        if (studentId) saveGameScore(studentId, game?.id || 'chem_lab', levelData.level, newScore)
        onFinish?.()
      } else {
        setReaction(nextReaction())
        setPhase('mix'); setSelected(null); setTimeLeft(25)
      }
    }, 1600)
  }

  const C = reaction.color

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#131829', borderBottom:'1px solid #1E2A45', padding:'14px 16px 10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:800, fontSize:14 }}>🧪 Chem Lab · Level {level}</span>
          <div style={{ display:'flex', gap:4 }}>
            {[0,1,2].map(i => <span key={i} style={{ fontSize:14, opacity: i < lives ? 1 : 0.2 }}>❤️</span>)}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:5, borderRadius:99, background:'#1E2A45' }}>
            <div style={{ height:'100%', borderRadius:99, width:`${(round/ROUNDS)*100}%`, background:C, transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{round}/{ROUNDS}</span>
          <span style={{ color:'#FBBF24', fontSize:12, fontWeight:700 }}>⭐ {score}</span>
        </div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {/* Reaction type badge */}
        <div style={{ background:`${C}22`, color:C, padding:'3px 12px', borderRadius:99, fontSize:11, fontWeight:700, marginBottom:16 }}>
          {reaction.type}
        </div>

        {/* Beakers */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:24, marginBottom:20 }}>
          {[{chem:reaction.a, bg:'rgba(8,145,178,0.15)', border:'rgba(8,145,178,0.5)', liquid:'rgba(8,145,178,0.35)'},
            {chem:reaction.b, bg:'rgba(124,58,237,0.15)', border:'rgba(124,58,237,0.5)', liquid:'rgba(124,58,237,0.35)'}
          ].map((beaker, idx) => (
            <div key={idx} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ width:72, height:88, borderRadius:'0 0 10px 10px', background:beaker.bg, border:`2px solid ${beaker.border}`, display:'flex', alignItems:'flex-end', justifyContent:'center', overflow:'hidden', position:'relative',
                animation: shaking ? `shake${idx} 0.15s ease infinite` : 'none' }}>
                <div style={{ width:'100%', height:'55%', background:beaker.liquid, borderRadius:'0 0 8px 8px' }}/>
              </div>
              <span style={{ color:'white', fontWeight:700, fontSize:13 }}>{beaker.chem}</span>
            </div>
          ))}
          <span style={{ color:'#475569', fontSize:24, fontWeight:900, paddingBottom:28 }}>+</span>
        </div>

        <style>{`
          @keyframes shake0{0%,100%{transform:none}25%{transform:translateX(-3px) rotate(-1deg)}75%{transform:translateX(3px) rotate(1deg)}}
          @keyframes shake1{0%,100%{transform:none}25%{transform:translateX(3px) rotate(1deg)}75%{transform:translateX(-3px) rotate(-1deg)}}
        `}</style>

        {/* Hint */}
        <div style={{ background:'rgba(20,184,166,0.07)', border:'1px solid rgba(20,184,166,0.2)', borderRadius:10, padding:'8px 14px', marginBottom:16, textAlign:'center', maxWidth:320 }}>
          <span style={{ color:'#5EEAD4', fontSize:12 }}>{reaction.hint}</span>
        </div>

        {phase === 'mix' && (
          <button onClick={mix} style={{ padding:'13px 32px', borderRadius:14, fontWeight:800, color:'white', fontSize:15, background:`linear-gradient(135deg,${C},#7C3AED)`, border:'none', cursor:'pointer', marginTop:4 }}>
            ⚗️ Mix Chemicals!
          </button>
        )}

        {phase === 'reacting' && (
          <div style={{ textAlign:'center', marginTop:8 }}>
            <div style={{ fontSize:32, marginBottom:6 }}>⚗️</div>
            <p style={{ color:C, fontWeight:700, fontSize:14 }}>Reacting...</p>
          </div>
        )}

        {(phase === 'answer' || phase === 'result') && (
          <div style={{ width:'100%', maxWidth:340 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ color:'white', fontWeight:700, fontSize:14 }}>What are the products?</span>
              {phase === 'answer' && <span style={{ color: timeLeft < 8 ? '#EF4444' : '#14B8A6', fontWeight:800, fontSize:14 }}>{timeLeft}s</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {options.map((opt, i) => {
                let bg = '#131829', border = '1px solid #1E2A45', color = '#CBD5E1'
                if (phase === 'result') {
                  if (opt === reaction.product) { bg = 'rgba(74,222,128,0.1)'; border = '2px solid #22C55E'; color = '#4ADE80' }
                  else if (opt === selected)    { bg = 'rgba(239,68,68,0.1)';  border = '2px solid #EF4444'; color = '#F87171' }
                }
                return (
                  <button key={i} disabled={phase === 'result'} onClick={() => pick(opt)}
                    style={{ background:bg, border, color, padding:'12px 14px', borderRadius:12, textAlign:'left', fontWeight:600, fontSize:13, cursor:'pointer', width:'100%', transition:'all 0.15s' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {phase === 'result' && (
              <div style={{ marginTop:10, padding:'8px 12px', borderRadius:10, background: selected === reaction.product ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)' }}>
                <p style={{ color: selected === reaction.product ? '#4ADE80' : '#F87171', fontWeight:700, fontSize:13, margin:0 }}>
                  {selected === reaction.product ? `✅ Correct!${streak > 0 ? ` ${streak + 1}x streak!` : ''}` : `❌ Answer: ${reaction.product}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
