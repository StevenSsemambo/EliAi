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
    ], l => ({ req: gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 }) })),
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
    ], l => ({ req: gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 }) })),
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
    ], l => ({ req: gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 }) })),
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
    ], l => ({ req: gradual(l, { minL:0, maxL:0, minS:40, maxS:80, minE:0, maxE:0 }) })),
  },

  // ── 5 NEW COGNITIVE GAMES ─────────────────────────────────────
  {
    id: 'mind_bridge', name: 'Mind Bridge', icon: '🧩',
    description: 'Solve Einstein-style logic puzzles — use clues to deduce who does what',
    type: 'deduction', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)',
    category: 'Logic', cogSkill: 'Deductive Reasoning & Systematic Elimination',
    levels: makeLevels([
      'First Clue','Simple Logic','Three Variables','Four Clues I','Four Clues II',
      'Five Clues I','Five Clues II','Six Clues I','Six Clues II','Category Clash I',
      'Category Clash II','Cross Reference I','Cross Reference II','Elimination I','Elimination II',
      'Deep Logic I','Deep Logic II','Deep Logic III','Multi-Layer I','Multi-Layer II',
      'Expert Deduction I','Expert Deduction II','Grand Puzzle I','Grand Puzzle II',
    ], (lvl) => {
      const t = (lvl-1)/23
      return { puzzleIdx: Math.floor(t*5), timeLimit: Math.round(300-t*120), req: gradual(lvl, { minL:5,maxL:200, minS:45,maxS:85, minE:0,maxE:6 }) }
    }),
  },
  {
    id: 'flow_state', name: 'Flow State', icon: '🌊',
    description: 'Connect matching colours with paths — fill every cell without crossing',
    type: 'flow', color: '#06B6D4', glow: 'rgba(6,182,212,0.4)',
    category: 'Spatial', cogSkill: 'Route Planning & Spatial Problem-Solving',
    levels: makeLevels([
      'Trickle I','Trickle II','Trickle III','Trickle IV',
      'Stream I','Stream II','Stream III','Stream IV',
      'River I','River II','River III','River IV',
      'Flood I','Flood II','Flood III','Flood IV',
      'Torrent I','Torrent II','Torrent III','Torrent IV',
      'Cascade I','Cascade II','Cascade III','The Abyss',
    ], (lvl) => {
      const t = (lvl-1)/23
      const gs = lvl<=6?4:lvl<=14?5:6
      return { gridSize: gs, puzzleSet: lvl%3, req: gradual(lvl, { minL:5,maxL:180, minS:40,maxS:84, minE:0,maxE:5 }) }
    }),
  },
  {
    id: 'tower_of_mind', name: 'Tower of Mind', icon: '🏗️',
    description: 'Move all discs from peg A to peg C — never place a larger on a smaller',
    type: 'hanoi', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',
    category: 'Algorithmic', cogSkill: 'Recursive Thinking & Optimal Planning',
    levels: makeLevels([
      'Two Discs I','Two Discs II','Two Discs III','Two Discs IV',
      'Three Discs I','Three Discs II','Three Discs III','Three Discs IV',
      'Three Discs V','Three Discs VI','Four Discs I','Four Discs II',
      'Four Discs III','Four Discs IV','Four Discs V','Four Discs VI',
      'Five Discs I','Five Discs II','Five Discs III','Five Discs IV',
      'Six Discs I','Six Discs II','Six Discs III','Master Tower',
    ], (lvl) => {
      const discs = lvl<=4?2:lvl<=10?3:lvl<=16?4:lvl<=22?5:6
      const timeLimit = Math.round(60 + (discs-2)*90)
      return { discs, timeLimit, req: gradual(lvl, { minL:3,maxL:160, minS:40,maxS:83, minE:0,maxE:5 }) }
    }),
  },
  {
    id: 'ripple_code', name: 'Ripple Code', icon: '🔢',
    description: 'Crack the hidden rule in each number sequence — predict what comes next',
    type: 'pattern', color: '#10B981', glow: 'rgba(16,185,129,0.4)',
    category: 'Pattern', cogSkill: 'Inductive Reasoning & Mathematical Pattern Recognition',
    levels: makeLevels([
      'Add/Subtract I','Add/Subtract II','Multiply I','Multiply II',
      'Squares I','Squares II','Mix I','Mix II',
      'Fibonacci I','Fibonacci II','Triangular I','Triangular II',
      'Step Patterns I','Step Patterns II','Power Patterns I','Power Patterns II',
      'Prime Numbers I','Prime Numbers II','Factorial I','Factorial II',
      'Compound I','Compound II','Compound III','Grand Sequence',
    ], (lvl) => {
      const t = (lvl-1)/23
      const tier = lvl<=4?1:lvl<=10?2:lvl<=18?3:4
      return { tier, rounds:5, showCount:5, askCount:Math.min(2+Math.floor(t*2),4), timePerQ:Math.round(25-t*10), req: gradual(lvl, { minL:4,maxL:190, minS:42,maxS:85, minE:0,maxE:5 }) }
    }),
  },
  {
    id: 'shadow_match', name: 'Shadow Match', icon: '🎯',
    description: 'Identify the correct 2D view of a 3D shape — top, front or side projection',
    type: 'spatial', color: '#EC4899', glow: 'rgba(236,72,153,0.4)',
    category: 'Spatial', cogSkill: '3D Spatial Visualisation & Mental Rotation',
    levels: makeLevels([
      'Simple Shapes I','Simple Shapes II','Simple Shapes III','Simple Shapes IV',
      'L-Shapes I','L-Shapes II','L-Shapes III','L-Shapes IV',
      'T-Shapes I','T-Shapes II','T-Shapes III','T-Shapes IV',
      'Towers I','Towers II','Towers III','Towers IV',
      'Complex I','Complex II','Complex III','Complex IV',
      'Rotations I','Rotations II','Rotations III','3D Master',
    ], (lvl) => {
      const t = (lvl-1)/23
      return { rounds:6, timePerQ:Math.round(20-t*8), difficulty:Math.ceil(t*3+1), req: gradual(lvl, { minL:5,maxL:210, minS:44,maxS:86, minE:0,maxE:5 }) }
    }),
  },
].filter(Boolean)

export async function getUnlockStatus(studentId) {
  if (!studentId) return { status:{}, lessonsCompleted:0, avgScore:0, examsCompleted:0 }
  try {
    const allProgress = await db.progress.where('student_id').equals(studentId).toArray()
    const completed = allProgress.filter(p => p.status==='completed')
    const lessonsCompleted = completed.length
    const avgScore = completed.length>0 ? Math.round(completed.reduce((s,p)=>s+(p.best_score||0),0)/completed.length) : 0
    let examsCompleted = 0
    try {
      const examResults = await db.exam_results.where('student_id').equals(studentId).toArray()
      examsCompleted = examResults.filter(e=>(e.score||0)>=50).length
    } catch(e) {}
    const status = {}
    for (const game of GAMES) {
      if (!game || !game.id) continue
      status[game.id] = { unlockedLevels:[], highScores:{} }
      for (const lvl of game.levels) {
        const r = lvl.req
        if (!r) continue
        // Level 1 always unlocked so games are always visible
        if (lvl.level === 1 || (lessonsCompleted>=r.lessons && avgScore>=r.avgScore && examsCompleted>=r.exams))
          status[game.id].unlockedLevels.push(lvl.level)
      }
    }
    try {
      const gameScores = await db.game_progress.where('student_id').equals(studentId).toArray()
      for (const gs of gameScores) {
        if (status[gs.game_id]) status[gs.game_id].highScores[gs.level] = gs.high_score
      }
    } catch(e) {}
    return { status, lessonsCompleted, avgScore, examsCompleted }
  } catch(e) {
    console.error('getUnlockStatus error:', e)
    // Fallback: return all games with level 1 unlocked
    const status = {}
    for (const game of GAMES) {
      if (!game || !game.id) continue
      status[game.id] = { unlockedLevels:[1], highScores:{} }
    }
    return { status, lessonsCompleted:0, avgScore:0, examsCompleted:0 }
  }
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
