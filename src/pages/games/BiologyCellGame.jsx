import { useState, useEffect } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'

const ALL_QUESTIONS = [
  { q:'Which organelle controls all cell activities?', answer:'Nucleus', options:['Nucleus','Ribosome','Vacuole','Mitochondria'], hint:'Contains DNA — the instruction manual of the cell', cat:'Cell Biology' },
  { q:'Where does aerobic respiration occur in the cell?', answer:'Mitochondria', options:['Mitochondria','Nucleus','Ribosome','Cell membrane'], hint:'Powerhouse of the cell — produces ATP', cat:'Cell Biology' },
  { q:'Which structure is found in plant cells but NOT animal cells?', answer:'Cell wall', options:['Cell wall','Nucleus','Cytoplasm','Cell membrane'], hint:'Made of cellulose — gives plant cells a rigid shape', cat:'Cell Biology' },
  { q:'Where does protein synthesis occur?', answer:'Ribosome', options:['Ribosome','Mitochondria','Nucleus','Vacuole'], hint:'Reads mRNA to build proteins', cat:'Cell Biology' },
  { q:'Which process moves water across a semi-permeable membrane?', answer:'Osmosis', options:['Osmosis','Diffusion','Active transport','Filtration'], hint:'Only water moves, from high to low concentration', cat:'Transport' },
  { q:'What raw material for photosynthesis comes from the air?', answer:'Carbon dioxide', options:['Carbon dioxide','Oxygen','Nitrogen','Water vapour'], hint:'CO2 enters through stomata in leaves', cat:'Photosynthesis' },
  { q:'Which pigment absorbs light energy for photosynthesis?', answer:'Chlorophyll', options:['Chlorophyll','Haemoglobin','Melanin','Carotene'], hint:'Found in chloroplasts — gives plants their green colour', cat:'Photosynthesis' },
  { q:'What are the two products of photosynthesis?', answer:'Glucose + Oxygen', options:['Glucose + Oxygen','CO2 + Water','Starch + CO2','ATP + Water'], hint:'6CO2 + 6H2O gives C6H12O6 + 6O2', cat:'Photosynthesis' },
  { q:'Aerobic respiration: glucose + oxygen gives?', answer:'CO2 + H2O + ATP', options:['CO2 + H2O + ATP','Lactic acid + ATP','CO2 + ethanol','Glucose + water'], hint:'Complete oxidation releases maximum energy', cat:'Respiration' },
  { q:'Anaerobic respiration in muscles produces?', answer:'Lactic acid', options:['Lactic acid','Ethanol','CO2 only','ATP only'], hint:'Causes muscle fatigue and the burning feeling', cat:'Respiration' },
  { q:'What is a gene?', answer:'A section of DNA coding for a protein', options:['A section of DNA coding for a protein','A chromosome','An RNA molecule','A ribosome'], hint:'The basic unit of heredity', cat:'Genetics' },
  { q:'How many chromosomes do human body cells have?', answer:'46', options:['46','23','48','92'], hint:'23 pairs — one set inherited from each parent', cat:'Genetics' },
  { q:'What type of molecule are enzymes?', answer:'Proteins', options:['Proteins','Lipids','Carbohydrates','Nucleic acids'], hint:'Biological catalysts with a specific 3D active site', cat:'Enzymes' },
  { q:'What happens to an enzyme above its optimum temperature?', answer:'It denatures', options:['It denatures','It speeds up','It slows slightly','Nothing changes'], hint:'The active site changes shape permanently', cat:'Enzymes' },
  { q:'What always starts a food chain?', answer:'Producer (plant)', options:['Producer (plant)','Primary consumer','Decomposer','Predator'], hint:'Organisms that make food via photosynthesis', cat:'Ecology' },
]

const CAT_COLORS = {
  'Cell Biology':'#16A34A','Transport':'#0891B2','Photosynthesis':'#65A30D',
  'Respiration':'#EF4444','Genetics':'#7C3AED','Enzymes':'#F59E0B','Ecology':'#0D9488',
}

function getQuestions(level) {
  const start = Math.min(Math.floor((level - 1) / 3) * 3, ALL_QUESTIONS.length - 6)
  const pool = ALL_QUESTIONS.slice(start, start + 8)
  return pool.sort(() => Math.random() - 0.5).slice(0, 5)
}

export default function BiologyCellGame({ levelData, onFinish }) {
  const level = levelData?.level || 1
  const [questions] = useState(() => getQuestions(level))
  const [idx, setIdx]           = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]       = useState('question')
  const [score, setScore]       = useState(0)
  const [streak, setStreak]     = useState(0)
  const [timeLeft, setTimeLeft] = useState(28)

  const q = questions[idx]
  const C = q ? (CAT_COLORS[q.cat] || '#14B8A6') : '#14B8A6'

  useEffect(() => {
    setTimeLeft(28)
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
      if (next >= questions.length) { SoundEngine.levelComplete(); onFinish?.() }
      else { setIdx(next); setSelected(null); setPhase('question') }
    }, 1600)
  }

  if (!q) return null

  return (
    <div style={{ background:'#0C0F1A', borderRadius:16, overflow:'hidden', minHeight:480, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#131829', borderBottom:'1px solid #1E2A45', padding:'14px 16px 10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'white', fontWeight:800, fontSize:14 }}>🧬 Biology Quest · Level {level}</span>
          <span style={{ color:'#FBBF24', fontWeight:700, fontSize:12 }}>⭐ {score}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:5, borderRadius:99, background:'#1E2A45' }}>
            <div style={{ height:'100%', borderRadius:99, width:`${(idx/questions.length)*100}%`, background:C, transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{idx+1}/{questions.length}</span>
          <span style={{ color: timeLeft < 8 ? '#EF4444' : '#14B8A6', fontWeight:800, fontSize:15 }}>{timeLeft}s</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        {/* Category badge */}
        <div style={{ background:`${C}18`, color:C, padding:'3px 12px', borderRadius:99, fontSize:11, fontWeight:700, display:'inline-block', marginBottom:12 }}>
          {q.cat}
        </div>

        {/* Hint */}
        <div style={{ background:'rgba(20,184,166,0.07)', border:'1px solid rgba(20,184,166,0.2)', borderRadius:10, padding:'8px 12px', marginBottom:14 }}>
          <span style={{ color:'#5EEAD4', fontSize:12 }}>💡 {q.hint}</span>
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
