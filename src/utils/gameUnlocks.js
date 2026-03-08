import db from '../db/schema.js'

function gradual(level, { minL, maxL, minS, maxS, minE, maxE }) {
  const t = (level - 1) / 23
  const curve = Math.pow(t, 1.4)
  return {
    lessons:  Math.round(minL + curve * (maxL - minL)),
    avgScore: Math.round(minS + curve * (maxS - minS)),
    exams:    Math.round(minE + curve * (maxE - minE)),
  }
}

function makeLevels(names, paramFn) {
  return names.map((name, i) => ({ level: i + 1, name, ...paramFn(i + 1) }))
}

export const GAMES = [
  {
    id: 'nebula_memory', name: 'Nebula Memory', icon: '🌌',
    description: 'Match cosmic card pairs before the void consumes them',
    type: 'memory', color: '#7C3AED', glow: 'rgba(124,58,237,0.4)',
    category: 'Memory', cogSkill: 'Working Memory & Visual Recall',
    levels: makeLevels([
      'Asteroid Dust','Asteroid Belt','Lunar Crater','Lunar Orbit',
      'Mars Gateway','Mars Storm','Jupiter Moon','Jupiter Storm',
      'Saturn Rings','Saturn Vortex','Uranus Core','Uranus Depths',
      'Neptune Wave','Neptune Abyss','Kuiper Edge','Kuiper Belt',
      'Oort Cloud I','Oort Cloud II','Stellar Nursery','Supernova',
      'Pulsar Field','Neutron Star','Black Hole Edge','Event Horizon',
    ], (lvl) => {
      const r = gradual(lvl, { minL:3,maxL:350, minS:0,maxS:88, minE:0,maxE:8 })
      const t = (lvl-1)/23
      return { pairs: Math.round(4+t*26), gridSize: lvl<=9?4:lvl<=16?5:6, timeLimit: Math.round(60+t*240), req:r }
    })
  },
  {
    id: 'cosmos_puzzle', name: 'Cosmos Puzzle', icon: '🔭',
    description: 'Reassemble shattered star maps to navigate the galaxy',
    type: 'sliding', color: '#0891B2', glow: 'rgba(8,145,178,0.4)',
    category: 'Spatial', cogSkill: 'Spatial Reasoning & Planning',
    levels: makeLevels([
      'Star Chart I','Star Chart II','Star Chart III','Star Chart IV',
      'Nebula Map I','Nebula Map II','Nebula Map III','Nebula Map IV',
      'Galaxy Chart I','Galaxy Chart II','Galaxy Chart III','Galaxy Chart IV',
      'Cosmic Map I','Cosmic Map II','Cosmic Map III','Cosmic Map IV',
      'Universe Map I','Universe Map II','Universe Map III','Universe Map IV',
      'Singularity I','Singularity II','Singularity III','The Infinite',
    ], (lvl) => {
      const r = gradual(lvl, { minL:5,maxL:400, minS:50,maxS:88, minE:0,maxE:8 })
      return { gridSize: lvl<=6?3:lvl<=14?4:lvl<=20?5:6, req:r }
    })
  },
  {
    id: 'quasar_chain', name: 'Quasar Chain', icon: '⚛️',
    description: 'Connect atomic particles to form stable molecular chains',
    type: 'chain', color: '#059669', glow: 'rgba(5,150,105,0.4)',
    category: 'Pattern', cogSkill: 'Pattern Recognition & Strategy',
    levels: makeLevels([
      'Hydrogen Bond','Helium Core','Lithium Spark','Beryllium Shell',
      'Carbon Rings','Nitrogen Cycle','Oxygen Storm','Fluorine Flash',
      'Neon Glow','Silicon Web','Phosphorus Web','Sulfur Burst',
      'Chlorine Cloud','Argon Drift','Iron Fusion','Cobalt Matrix',
      'Nickel Grid','Copper Lattice','Zinc Array','Silver Storm',
      'Gold Network','Platinum Maze','Uranium Web','Dark Matter',
    ], (lvl) => {
      const r = gradual(lvl, { minL:8,maxL:420, minS:55,maxS:88, minE:0,maxE:8 })
      const t = (lvl-1)/23
      return { colors:Math.min(6,3+Math.floor(t*3.5)), gridW:Math.round(6+t*5), gridH:Math.round(7+t*5), req:r }
    })
  },
  {
    id: 'number_warp', name: 'Number Warp', icon: '🔢',
    description: 'Solve arithmetic at warp speed before the black hole pulls you in',
    type: 'arithmetic', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',
    category: 'Arithmetic', cogSkill: 'Processing Speed & Mental Math',
    levels: makeLevels([
      'Warp 1: Addition','Warp 2: Subtraction','Warp 3: Mixed +−','Warp 4: ×2–5',
      'Warp 5: ×6–9','Warp 6: Division','Warp 7: Mixed ×÷','Warp 8: Squares',
      'Warp 9: Roots','Warp 10: Percentages','Warp 11: Fractions','Warp 12: Decimals',
      'Warp 13: Mixed All','Warp 14: Powers','Warp 15: Algebra I','Warp 16: Algebra II',
      'Warp 17: Negatives','Warp 18: Order of Ops','Warp 19: Speed Run I','Warp 20: Speed Run II',
      'Warp 21: Champion','Warp 22: Master','Warp 23: Legend','Warp 24: Singularity',
    ], (lvl) => {
      const r = gradual(lvl, { minL:2,maxL:380, minS:0,maxS:88, minE:0,maxE:8 })
      const t = (lvl-1)/23
      return { questionsPerRound: Math.round(10+t*15), timePerQ: Math.round(15-t*10), target: Math.round(100+t*400), difficultyTier:lvl, req:r }
    })
  },
  {
    id: 'sequence_memory', name: 'Sequence Memory', icon: '🧠',
    description: 'Watch the cosmos light up — repeat the sequence exactly to survive',
    type: 'sequence', color: '#EC4899', glow: 'rgba(236,72,153,0.4)',
    category: 'Memory', cogSkill: 'Sequential Memory & Concentration',
    levels: makeLevels([
      'Echo 1','Echo 2','Echo 3','Echo 4',
      'Pulse 1','Pulse 2','Pulse 3','Pulse 4',
      'Signal 1','Signal 2','Signal 3','Signal 4',
      'Wave 1','Wave 2','Wave 3','Wave 4',
      'Surge 1','Surge 2','Surge 3','Surge 4',
      'Nova 1','Nova 2','Nova 3','Supernova',
    ], (lvl) => {
      const r = gradual(lvl, { minL:4,maxL:360, minS:0,maxS:88, minE:0,maxE:8 })
      const t = (lvl-1)/23
      return { buttons:Math.min(9,4+Math.floor(t*5.5)), startLen:Math.round(3+t*5), flashMs:Math.round(700-t*450), lives:Math.max(1,3-Math.floor(t*2)), req:r }
    })
  },
  {
    id: 'logic_grid', name: 'Logic Grid', icon: '🌀',
    description: 'Decode alien number patterns using pure logical deduction',
    type: 'logic', color: '#06B6D4', glow: 'rgba(6,182,212,0.4)',
    category: 'Logic', cogSkill: 'Logical Deduction & Critical Thinking',
    levels: makeLevels([
      'Cadet I','Cadet II','Cadet III','Cadet IV',
      'Scout I','Scout II','Scout III','Scout IV',
      'Ranger I','Ranger II','Ranger III','Ranger IV',
      'Commander I','Commander II','Commander III','Commander IV',
      'Admiral I','Admiral II','Admiral III','Admiral IV',
      'Overlord I','Overlord II','Overlord III','Supreme Mind',
    ], (lvl) => {
      const r = gradual(lvl, { minL:6,maxL:400, minS:55,maxS:90, minE:0,maxE:8 })
      const t = (lvl-1)/23
      return { gridSize:Math.min(9,4+Math.floor(t*5.5)), clueRatio:Math.round(55-t*25), timeLimit:lvl<=4?0:Math.round(t*300), req:r }
    })
  },
,
  {
    id: 'chem_lab', name: 'Chem Lab', icon: '🧪',
    description: 'Mix chemicals and predict products — master Uganda Chemistry curriculum',
    type: 'subject', color: '#16A34A', glow: 'rgba(22,163,74,0.4)',
    category: 'Chemistry', cogSkill: 'Reaction Prediction & Chemical Knowledge',
    subject: 'chemistry',
    levels: makeLevels([
      'Acid Base Basics','Neutralisation I','Neutralisation II','Salt Formation','Metal Acids I',
      'Metal Acids II','Metal Acids III','Displacement I','Combustion I','Combustion II',
      'Combustion III','Organic I','Redox I','Redox II','Electrochemistry I',
      'Electrochemistry II','Organic II','Rates I','Rates II','Equilibrium I',
      'Equilibrium II','Analytical I','Industrial I','UNEB Exam Prep',
    ], l => gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 })),
  },
  {
    id: 'physics_forces', name: 'Physics Forces', icon: '⚡',
    description: 'Solve Physics problems — forces, energy, waves and electricity',
    type: 'subject', color: '#EF4444', glow: 'rgba(239,68,68,0.4)',
    category: 'Physics', cogSkill: 'Problem Solving & Formula Application',
    subject: 'physics',
    levels: makeLevels([
      'Force Basics','Newton Laws I','Newton Laws II','Newton Laws III','Energy I',
      'Energy II','Work & Power','Momentum I','Momentum II','Pressure I',
      'Pressure II','Waves I','Waves II','Sound','Light I',
      'Light II','Electricity I','Electricity II','Magnetism I','Magnetism II',
      'Thermodynamics','Nuclear I','Nuclear II','UNEB Exam Prep',
    ], l => gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 })),
  },
  {
    id: 'biology_cells', name: 'Biology Quest', icon: '🧬',
    description: 'Master Biology from cells to ecology — Uganda S1-S6 curriculum',
    type: 'subject', color: '#0D9488', glow: 'rgba(13,148,136,0.4)',
    category: 'Biology', cogSkill: 'Biological Reasoning & Classification',
    subject: 'biology',
    levels: makeLevels([
      'Cell Structure I','Cell Structure II','Diffusion & Osmosis','Active Transport','Photosynthesis I',
      'Photosynthesis II','Respiration I','Respiration II','Nutrition I','Nutrition II',
      'Transport I','Transport II','Reproduction I','Reproduction II','Genetics I',
      'Genetics II','Genetics III','Evolution','Ecology I','Ecology II',
      'Classification','Microbes','Immunity','UNEB Exam Prep',
    ], l => gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 })),
  },
  {
    id: 'maths_speed', name: 'Maths Speed', icon: '🔢',
    description: 'Beat the clock on Maths — from arithmetic to calculus',
    type: 'subject', color: '#7C3AED', glow: 'rgba(124,58,237,0.4)',
    category: 'Mathematics', cogSkill: 'Numerical Fluency & Speed Solving',
    subject: 'mathematics',
    levels: makeLevels([
      'Arithmetic I','Arithmetic II','Fractions I','Fractions II','Decimals',
      'Percentages I','Percentages II','Algebra I','Algebra II','Linear Equations I',
      'Linear Equations II','Quadratics I','Quadratics II','Simultaneous I','Simultaneous II',
      'Trigonometry I','Trigonometry II','Logarithms I','Logarithms II','Sequences',
      'Vectors I','Matrices I','Calculus I','UNEB Exam Prep',
    ], l => gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 })),
  },
]
]

export async function getUnlockStatus(studentId) {
  if (!studentId) return { status:{}, lessonsCompleted:0, avgScore:0, examsCompleted:0 }
  const allProgress = await db.progress.where('student_id').equals(studentId).toArray()
  const completed = allProgress.filter(p => p.status==='completed')
  const lessonsCompleted = completed.length
  const avgScore = completed.length>0 ? Math.round(completed.reduce((s,p)=>s+(p.best_score||0),0)/completed.length) : 0
  const examResults = await db.exam_results.where('student_id').equals(studentId).toArray()
  const examsCompleted = examResults.filter(e=>(e.score||0)>=50).length
  const status = {}
  for (const game of GAMES) {
    status[game.id] = { unlockedLevels:[], highScores:{} }
    for (const lvl of game.levels) {
      const r = lvl.req
      if (lessonsCompleted>=r.lessons && avgScore>=r.avgScore && examsCompleted>=r.exams)
        status[game.id].unlockedLevels.push(lvl.level)
    }
  }
  const gameScores = await db.game_progress.where('student_id').equals(studentId).toArray()
  for (const gs of gameScores) {
    if (status[gs.game_id]) status[gs.game_id].highScores[gs.level] = gs.high_score
  }
  return { status, lessonsCompleted, avgScore, examsCompleted }
}

export async function saveGameScore(studentId, gameId, level, score) {
  const existing = await db.game_progress.where({ student_id:studentId, game_id:gameId, level }).first()
  if (existing) {
    if (score > existing.high_score) await db.game_progress.update(existing.id, { high_score:score })
  } else {
    await db.game_progress.add({ student_id:studentId, game_id:gameId, level, high_score:score, unlocked_at:new Date().toISOString() })
  }
  const student = await db.students.get(studentId)
  if (student) await db.students.update(studentId, { total_xp:(student.total_xp||0)+Math.floor(score/10) })
}

export function getNextUnlockInfo(gameId, cur) {
  const game = GAMES.find(g=>g.id===gameId)
  if (!game) return null
  const next = game.levels.find(l => cur.lessonsCompleted<l.req.lessons || cur.avgScore<l.req.avgScore || cur.examsCompleted<l.req.exams)
  return next ? { level:next, game } : null
}
