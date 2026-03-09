import { useState, useEffect } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Curriculum-aligned Biology questions ──────────────────────────
const QUESTIONS = [
  // Cell biology (S1-S2)
  { id:'b1',  q:'Which organelle controls all cell activities?',            answer:'Nucleus',        options:['Nucleus','Ribosome','Vacuole','Mitochondria'],        hint:'Contains DNA — the instruction manual of the cell', cat:'Cell Biology' },
  { id:'b2',  q:'Where does aerobic respiration occur in the cell?',       answer:'Mitochondria',   options:['Mitochondria','Nucleus','Ribosome','Cell membrane'],   hint:'Powerhouse of the cell — produces ATP', cat:'Cell Biology' },
  { id:'b3',  q:'Which structure is found in plant cells but NOT animal cells?', answer:'Cell wall', options:['Cell wall','Nucleus','Cytoplasm','Cell membrane'],    hint:'Made of cellulose — gives plant cells rigid shape', cat:'Cell Biology' },
  { id:'b4',  q:'Where does protein synthesis occur?',                     answer:'Ribosome',       options:['Ribosome','Mitochondria','Nucleus','Vacuole'],         hint:'Reads mRNA to build proteins', cat:'Cell Biology' },
  { id:'b5',  q:'Which process moves water from high to low concentration across a membrane?', answer:'Osmosis', options:['Osmosis','Diffusion','Active transport','Filtration'], hint:'Only water, through a semi-permeable membrane', cat:'Transport' },
  // Photosynthesis (S2)
  { id:'b6',  q:'What is the raw material for photosynthesis from the air?', answer:'Carbon dioxide', options:['Carbon dioxide','Oxygen','Nitrogen','Water vapour'], hint:'CO₂ enters through stomata', cat:'Photosynthesis' },
  { id:'b7',  q:'Which pigment absorbs light energy for photosynthesis?',   answer:'Chlorophyll',   options:['Chlorophyll','Haemoglobin','Melanin','Carotene'],      hint:'Found in chloroplasts — green in colour', cat:'Photosynthesis' },
  { id:'b8',  q:'What are the two products of photosynthesis?',             answer:'Glucose + Oxygen', options:['Glucose + Oxygen','CO₂ + Water','Starch + CO₂','ATP + Water'], hint:'6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', cat:'Photosynthesis' },
  // Respiration (S2-S3)
  { id:'b9',  q:'Aerobic respiration equation: glucose + oxygen → ?',      answer:'CO₂ + H₂O + ATP', options:['CO₂ + H₂O + ATP','Lactic acid + ATP','CO₂ + ethanol','Glucose + water'], hint:'Complete oxidation releases maximum energy', cat:'Respiration' },
  { id:'b10', q:'Anaerobic respiration in muscles produces?',              answer:'Lactic acid',    options:['Lactic acid','Ethanol','CO₂ only','ATP only'],         hint:'Causes muscle fatigue and pain', cat:'Respiration' },
  // Genetics (S4-S5)
  { id:'b11', q:'What is a gene?',                                          answer:'A section of DNA coding for a protein', options:['A section of DNA coding for a protein','A chromosome','An RNA molecule','A ribosome'], hint:'Basic unit of heredity', cat:'Genetics' },
  { id:'b12', q:'How many chromosomes do human body cells have?',          answer:'46',             options:['46','23','48','92'],                                   hint:'23 pairs — one set from each parent', cat:'Genetics' },
  // Enzymes (S3)
  { id:'b13', q:'What type of molecule are enzymes?',                      answer:'Proteins',       options:['Proteins','Lipids','Carbohydrates','Nucleic acids'],   hint:'Biological catalysts with specific 3D active sites', cat:'Enzymes' },
  { id:'b14', q:'What happens to an enzyme above its optimum temperature?', answer:'It denatures',  options:['It denatures','It speeds up','It slows slightly','Nothing'], hint:'Active site shape permanently changes', cat:'Enzymes' },
  // Ecology (S3-S4)
  { id:'b15', q:'What is a food chain always started by?',                 answer:'Producer (plant)', options:['Producer (plant)','Primary consumer','Decomposer','Predator'], hint:'Organisms that make their own food via photosynthesis', cat:'Ecology' },
]

const CAT_ICONS = { 'Cell Biology':'🔬', 'Transport':'💧', 'Photosynthesis':'🌿', 'Respiration':'💨', 'Genetics':'🧬', 'Enzymes':'⚗️', 'Ecology':'🌍' }
const CAT_COLORS= { 'Cell Biology':'#16A34A', 'Transport':'#0891B2', 'Photosynthesis':'#65A30D', 'Respiration':'#EF4444', 'Genetics':'#7C3AED', 'Enzymes':'#F59E0B', 'Ecology':'#0D9488' }

function getQsForLevel(level, count=5) {
  const diff = Math.min(Math.floor((level-1)/3), 4)
  const pool = QUESTIONS.slice(diff*3, diff*3+6)
  return pool.sort(()=>Math.random()-0.5).slice(0, count)
}

// Visual cell diagram shown during cell biology questions
function CellDiagram({ highlight }) {
  const organelles = [
    { id:'Nucleus',       x:50, y:45, r:14, col:'#7C3AED', label:'Nucleus' },
    { id:'Mitochondria',  x:72, y:35, r:9,  col:'#EF4444', label:'Mito.' },
    { id:'Ribosome',      x:30, y:60, r:5,  col:'#F59E0B', label:'Ribo.' },
    { id:'Cell membrane', x:50, y:50, r:44, col:'#0891B2', label:'', outline:true },
    { id:'Cell wall',     x:50, y:50, r:48, col:'#16A34A', label:'', outline:true },
    { id:'Vacuole',       x:35, y:35, r:10, col:'#0D9488', label:'Vacuole' },
  ]
  return (
    <div className="w-40 h-40 mx-auto mb-4">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Cytoplasm */}
        <ellipse cx="50" cy="50" rx="44" ry="44" fill="rgba(20,184,166,0.08)" stroke="rgba(20,184,166,0.3)" strokeWidth="0.5"/>
        {organelles.map(o => {
          const isHit = o.id === highlight
          return o.outline ? (
            <ellipse key={o.id} cx={o.x} cy={o.y} rx={o.r} ry={o.r*0.95}
              fill="none" stroke={isHit ? o.col : o.col+'44'} strokeWidth={isHit ? 2 : 1}
              strokeDasharray={o.id === 'Cell wall' ? '2 1' : undefined}/>
          ) : (
            <g key={o.id}>
              <ellipse cx={o.x} cy={o.y} rx={o.r} ry={o.r*0.8}
                fill={isHit ? o.col : o.col+'44'}
                stroke={isHit ? o.col : o.col+'66'} strokeWidth={isHit ? 1.5 : 0.5}/>
              {o.label && <text x={o.x} y={o.y+1} textAnchor="middle" fontSize="4.5"
                fill={isHit ? 'white' : o.col+'99'} fontWeight="bold">{o.label}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function BiologyCellGame({ game, levelData, studentId, onFinish }) {
  const level = levelData?.level || 1
  const [qs]      = useState(() => getQsForLevel(level))
  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [phase, setPhase]       = useState('question')
  const [score, setScore]       = useState(0)
  const [correctCount, setCorrect] = useState(0)
  const [timeLeft, setTimeLeft] = useState(28)
  const [streak, setStreak]     = useState(0)

  const q   = qs[qIdx]
  const col = q ? (CAT_COLORS[q.cat] || '#14B8A6') : '#14B8A6'
  const isCellQ = q?.cat === 'Cell Biology'

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
        setTimeout(() => onFinish?.(), 400)
      } else {
        setQIdx(next); setSelected(null); setPhase('question')
      }
    }, 1800)
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0C0F1A', minHeight: 480 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ background: '#131829', borderBottom: '1px solid #1A2035' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-black text-sm text-white">🧬 Biology — Lvl {level}</span>
          <span className="text-xs font-black" style={{ color:'#F59E0B' }}>⭐ {score}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1A2035' }}>
            <div className="h-full rounded-full" style={{ width:`${(qIdx/qs.length)*100}%`, background: col }}/>
          </div>
          <span className="text-xs font-bold text-slate-500">{qIdx+1}/{qs.length}</span>
          <span className="font-black text-sm" style={{ color: timeLeft<8 ? '#EF4444' : '#14B8A6' }}>{timeLeft}s</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-4"
          style={{ background:`${col}18`, color: col }}>
          {CAT_ICONS[q?.cat]} {q?.cat}
        </div>

        {/* Cell diagram for cell biology questions */}
        {isCellQ && phase === 'result' && (
          <CellDiagram highlight={selected === q?.answer ? q?.answer : null} />
        )}

        {/* Hint */}
        <div className="rounded-xl px-3 py-2 mb-4"
          style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: '#5EEAD4' }}>Hint</p>
          <p className="text-xs text-slate-400">{q?.hint}</p>
        </div>

        <p className="text-base font-black leading-relaxed mb-5 text-white">{q?.q}</p>

        <div className="space-y-2">
          {q?.options.map((opt, i) => {
            let bg = '#131829', border = '1px solid #1A2035', textCol = '#E2E8F0'
            if (phase === 'result') {
              if (opt === q.answer)     { bg='rgba(74,222,128,0.1)'; border='2px solid #22C55E'; textCol='#4ADE80' }
              else if (opt === selected){ bg='rgba(239,68,68,0.1)';  border='2px solid #EF4444'; textCol='#EF4444' }
            }
            return (
              <button key={i} onClick={() => handleAnswer(opt)} disabled={phase==='result'}
                className="w-full rounded-2xl px-4 py-3 text-left font-bold text-sm transition-all active:scale-95"
                style={{ background: bg, border, color: textCol }}>
                <span className="mr-2 text-slate-500">{['A','B','C','D'][i]}.</span>
                {opt}
              </button>
            )
          })}
        </div>

        {phase==='result' && (
          <div className="mt-3 rounded-xl px-3 py-2"
            style={{ background: selected===q?.answer?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)' }}>
            <p className="text-sm font-bold" style={{ color: selected===q?.answer?'#4ADE80':'#EF4444' }}>
              {selected===q?.answer?`Correct! ${streak>1?`🔥 ${streak} streak`:''}`: `Answer: ${q?.answer}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
