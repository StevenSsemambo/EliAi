import { useState, useEffect } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

const QUESTIONS = [
  { id:'b1',  q:'Which organelle controls all cell activities?',                  answer:'Nucleus',              options:['Nucleus','Ribosome','Vacuole','Mitochondria'],                hint:'Contains DNA - the instruction manual of the cell', cat:'Cell Biology' },
  { id:'b2',  q:'Where does aerobic respiration occur in the cell?',              answer:'Mitochondria',         options:['Mitochondria','Nucleus','Ribosome','Cell membrane'],          hint:'Powerhouse of the cell - produces ATP', cat:'Cell Biology' },
  { id:'b3',  q:'Which structure is found in plant cells but NOT animal cells?',  answer:'Cell wall',            options:['Cell wall','Nucleus','Cytoplasm','Cell membrane'],            hint:'Made of cellulose - gives plant cells rigid shape', cat:'Cell Biology' },
  { id:'b4',  q:'Where does protein synthesis occur?',                            answer:'Ribosome',             options:['Ribosome','Mitochondria','Nucleus','Vacuole'],                hint:'Reads mRNA to build proteins', cat:'Cell Biology' },
  { id:'b5',  q:'Which process moves water across a semi-permeable membrane?',    answer:'Osmosis',              options:['Osmosis','Diffusion','Active transport','Filtration'],        hint:'Only water, from high to low concentration', cat:'Transport' },
  { id:'b6',  q:'What is the raw material for photosynthesis from the air?',      answer:'Carbon dioxide',       options:['Carbon dioxide','Oxygen','Nitrogen','Water vapour'],          hint:'CO2 enters through stomata', cat:'Photosynthesis' },
  { id:'b7',  q:'Which pigment absorbs light energy for photosynthesis?',         answer:'Chlorophyll',          options:['Chlorophyll','Haemoglobin','Melanin','Carotene'],             hint:'Found in chloroplasts - green in colour', cat:'Photosynthesis' },
  { id:'b8',  q:'What are the two products of photosynthesis?',                   answer:'Glucose + Oxygen',     options:['Glucose + Oxygen','CO2 + Water','Starch + CO2','ATP + Water'], hint:'6CO2 + 6H2O -> C6H12O6 + 6O2', cat:'Photosynthesis' },
  { id:'b9',  q:'Aerobic respiration: glucose + oxygen -> ?',                     answer:'CO2 + H2O + ATP',      options:['CO2 + H2O + ATP','Lactic acid + ATP','CO2 + ethanol','Glucose + water'], hint:'Complete oxidation releases maximum energy', cat:'Respiration' },
  { id:'b10', q:'Anaerobic respiration in muscles produces?',                     answer:'Lactic acid',          options:['Lactic acid','Ethanol','CO2 only','ATP only'],                hint:'Causes muscle fatigue and pain', cat:'Respiration' },
  { id:'b11', q:'What is a gene?',                                                answer:'A section of DNA coding for a protein', options:['A section of DNA coding for a protein','A chromosome','An RNA molecule','A ribosome'], hint:'Basic unit of heredity', cat:'Genetics' },
  { id:'b12', q:'How many chromosomes do human body cells have?',                 answer:'46',                   options:['46','23','48','92'],                                          hint:'23 pairs - one set from each parent', cat:'Genetics' },
  { id:'b13', q:'What type of molecule are enzymes?',                             answer:'Proteins',             options:['Proteins','Lipids','Carbohydrates','Nucleic acids'],          hint:'Biological catalysts with specific 3D active sites', cat:'Enzymes' },
  { id:'b14', q:'What happens to an enzyme above its optimum temperature?',       answer:'It denatures',         options:['It denatures','It speeds up','It slows slightly','Nothing'], hint:'Active site shape permanently changes', cat:'Enzymes' },
  { id:'b15', q:'What is a food chain always started by?',                        answer:'Producer (plant)',     options:['Producer (plant)','Primary consumer','Decomposer','Predator'], hint:'Organisms that make food via photosynthesis', cat:'Ecology' },
]

const CAT_COLORS = { 'Cell Biology':'#16A34A', 'Transport':'#0891B2', 'Photosynthesis':'#65A30D', 'Respiration':'#EF4444', 'Genetics':'#7C3AED', 'Enzymes':'#F59E0B', 'Ecology':'#0D9488' }
const CAT_ICONS  = { 'Cell Biology':'cell', 'Transport':'drop', 'Photosynthesis':'leaf', 'Respiration':'wind', 'Genetics':'dna', 'Enzymes':'flask', 'Ecology':'earth' }

function getQsForLevel(level, count=5) {
  const diff = Math.min(Math.floor((level-1)/3), 4)
  const pool = QUESTIONS.slice(diff*3, diff*3+6)
  return pool.sort(()=>Math.random()-0.5).slice(0,count)
}

export default function BiologyCellGame({ game, levelData, studentId, onFinish }) {
  const level = levelData?.level || 1
  const [qs]       = useState(() => getQsForLevel(level))
  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]       = useState('question')
  const [score, setScore]       = useState(0)
  const [correctCount, setCorrect] = useState(0)
  const [timeLeft, setTimeLeft] = useState(28)
  const [streak, setStreak]     = useState(0)

  const q   = qs[qIdx]
  const col = q ? (CAT_COLORS[q.cat] || '#14B8A6') : '#14B8A6'

  useEffect(() => {
    if (phase !== 'question') return
    setTimeLeft(28)
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
      setScore(s => s + Math.max(10, timeLeft*3 + streak*5))
      setCorrect(c => c+1)
      setStreak(s => s+1)
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
          <span style={{ color:'white', fontWeight:900, fontSize:14 }}>Biology Quest - Lvl {level}</span>
          <span style={{ color:'#F59E0B', fontWeight:900, fontSize:12 }}>* {score}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:6, borderRadius:9999, overflow:'hidden', background:'#1A2035' }}>
            <div style={{ height:'100%', borderRadius:9999, width:`${(qIdx/qs.length)*100}%`, background:col }}/>
          </div>
          <span style={{ color:'#64748B', fontSize:12 }}>{qIdx+1}/{qs.length}</span>
          <span style={{ color: timeLeft<8?'#EF4444':'#14B8A6', fontWeight:900, fontSize:14 }}>{timeLeft}s</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <div style={{ background:`${col}18`, color:col, padding:'4px 12px', borderRadius:9999, fontSize:12, fontWeight:900, display:'inline-block', marginBottom:16 }}>
          {q?.cat}
        </div>

        <div style={{ background:'rgba(20,184,166,0.08)', border:'1px solid rgba(20,184,166,0.2)', borderRadius:12, padding:'10px 14px', marginBottom:16 }}>
          <p style={{ color:'#5EEAD4', fontSize:12, fontWeight:700, marginBottom:2 }}>Hint</p>
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
                style={{ background:bg, border, color, padding:'12px 16px', borderRadius:16, textAlign:'left', fontWeight:700, fontSize:14, cursor:'pointer', width:'100%' }}>
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
