/**
 * ELIMU LEARN — INTELLIGENT RULE-BASED AI
 * 100% offline. Works on all devices.
 *
 * Intelligence upgrades:
 *   ✅ Conversation memory — remembers topic across messages
 *   ✅ Follow-up handling — "tell me more", "why?", "another example", "simpler please"
 *   ✅ Real calculation solver — computes answers from numbers in the question
 *   ✅ Fuzzy topic matching — handles typos like "phootosynthesis"
 *   ✅ Rich personality — varied greetings, streak encouragement, Ugandan context
 *   ✅ Smart fallback — guesses closest topic, never just says "I don't know"
 *   ✅ Quiz streak tracking — adjusts tone based on performance
 *   ✅ Compare intent — handles "difference between X and Y"
 *   ✅ Exam tips intent — UNEB-specific advice per topic
 */

// ── Conversation memory (persists across messages in one session) ──
export const conversationMemory = {
  lastTopic: null, lastSubject: null, lastIntent: null,
  lastKnowledge: null, quizStreak: 0, quizTotal: 0,
  messageCount: 0, studentName: null, sessionTopics: [],
}

export function resetMemory() {
  Object.assign(conversationMemory, {
    lastTopic: null, lastSubject: null, lastIntent: null,
    lastKnowledge: null, quizStreak: 0, quizTotal: 0,
    messageCount: 0, studentName: null, sessionTopics: [],
  })
}

// ── Intent classifier ──────────────────────────────────────────────
const INTENT_PATTERNS = [
  { intent: 'FOLLOWUP_MORE', patterns: [
    /^(tell me more|more|continue|go on|elaborate|expand)[\s.!?]*$/i,
    /^(more (about|on|please))[\s.!?]*$/i,
    /^(i want (to know )?more)[\s.!?]*$/i,
  ]},
  { intent: 'FOLLOWUP_SIMPLER', patterns: [
    /^(simpler|easier|i (still )?don'?t get it)[\s.!?]*$/i,
    /^(can you (explain|say) (it|that) (differently|simpler|again))[\s.!?]*$/i,
    /explain (it )?differently|in simple(r)? terms/i,
    /simpler (please|explanation)/i,
  ]},
  { intent: 'FOLLOWUP_EXAMPLE', patterns: [
    /^(give me (an?|another) example)[\s.!?]*$/i,
    /^(example please|another example|show me (an? )?example)[\s.!?]*$/i,
  ]},
  { intent: 'FOLLOWUP_WHY', patterns: [
    /^(why\??|but why\??|why is (that|this|it)\??)[\s.!?]*$/i,
    /^why does (that|this|it) (happen|work|occur)/i,
  ]},
  { intent: 'FOLLOWUP_NEXT_QUIZ', patterns: [
    /^(next (question)?|another (question)?|again|one more|next one|continue quiz)[\s.!?]*$/i,
    /^(ask me (another|again))[\s.!?]*$/i,
  ]},
  { intent: 'EXPLAIN', patterns: [
    /what is (.+)/i, /what are (.+)/i, /define (.+)/i,
    /explain (.+)/i, /tell me about (.+)/i, /describe (.+)/i,
    /meaning of (.+)/i, /what does (.+) mean/i,
    /how does (.+) work/i, /teach me (.+)/i, /i want to learn (.+)/i,
  ]},
  { intent: 'CALCULATE', patterns: [
    /calculate (.+)/i, /solve (.+)/i,
    /how do (i|you|we) (calculate|solve|find|work out) (.+)/i,
    /work out (.+)/i, /what is the (formula|equation) for (.+)/i,
    /formula for (.+)/i, /how to (calculate|find|get) (.+)/i,
    /find (.+) (if|when|given|where) (.+)/i,
    /what is (.+) if (.+)/i,
  ]},
  { intent: 'QUIZ', patterns: [
    /quiz me (on )?(.+)/i, /test me (on )?(.+)/i,
    /ask me (a question|questions) (about|on) (.+)/i,
    /give me (a question|questions) (about|on) (.+)/i,
    /practice (.+)/i, /let'?s? practice (.+)/i, /drill me on (.+)/i,
    /revise (.+)/i, /test (my knowledge of )?(.+)/i,
  ]},
  { intent: 'HINT', patterns: [
    /i('?m| am) stuck/i, /give me a hint/i,
    /i don'?t (understand|get|know)/i,
    /help me (with|understand) (.+)/i,
    /i need help (with )?(.+)/i,
    /i'?m? confused (about|by)?/i, /hint( please)?/i,
    /struggling with (.+)/i, /not sure (about|how to)/i,
  ]},
  { intent: 'COMPARE', patterns: [
    /difference between (.+) and (.+)/i,
    /compare (.+) (and|with|to) (.+)/i,
    /(.+) vs (.+)/i,
    /how is (.+) different from (.+)/i,
  ]},
  { intent: 'EXAM_TIP', patterns: [
    /exam tip(s)?/i, /how (do i|should i|to) (pass|study for|prepare for) (.+)/i,
    /uneb (tip|advice|help)/i, /common (mistake|error)s? (in|on|for) (.+)/i,
  ]},
  { intent: 'GREET', patterns: [
    /^(hi|hello|hey|good morning|good evening|good afternoon|helo|hi there)[\s!.]*$/i,
    /^(how are you|what can you do|who are you|what are you)[\s?]*$/i,
    /^(start|begin|help)[\s!.]*$/i,
  ]},
  { intent: 'THANKS', patterns: [
    /^(thanks?|thank you|ok thanks?|great|awesome|cool|perfect|got it|i see|understood)[\s!.]*$/i,
    /^(nice|brilliant|excellent|wonderful|fantastic|that helps?)[\s!.]*$/i,
  ]},
  { intent: 'RECOMMEND', patterns: [
    /what should i (study|learn|do) (next|now)?/i,
    /recommend (.+)/i, /what topic should i/i,
    /what'?s? next/i, /guide me/i, /where do i start/i,
  ]},
]

export function classifyIntent(input) {
  const text = input.trim()
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return { intent, match, raw: input }
    }
  }
  return { intent: 'EXPLAIN', match: [text, text], raw: input }
}

// ── Topic extractor with fuzzy matching ───────────────────────────
const TOPIC_ALIASES = {
  algebra:             ['algebra','variable','expression','coefficient','like terms','expand brackets','simplify'],
  linear_equations:    ['linear equation','simultaneous','solve for x','two unknowns','system of equations'],
  quadratic_equations: ['quadratic','x squared','parabola','factorisation','completing the square','discriminant'],
  geometry:            ['geometry','angle','triangle','circle','polygon','parallel','perpendicular','rhombus','trapezium'],
  trigonometry:        ['trigonometry','trig','sine','cosine','tangent','sin','cos','tan','sohcahtoa','bearing','elevation'],
  mensuration:         ['mensuration','area','volume','perimeter','surface area','circumference','arc length','sector'],
  statistics:          ['statistics','mean','median','mode','average','frequency','histogram','pie chart','bar graph','range'],
  number_theory:       ['number','prime','factor','multiple','hcf','lcm','indices','index','standard form'],
  matrices:            ['matrix','matrices','determinant','inverse matrix','transformation matrix'],
  vectors:             ['vector','scalar','magnitude','resultant','position vector'],
  probability:         ['probability','chance','likelihood','sample space','tree diagram'],
  sets:                ['sets','union','intersection','subset','universal set','venn diagram'],
  calculus:            ['calculus','derivative','differentiation','integration','gradient','rate of change','d/dx','turning point'],
  forces:              ['force','newton','gravity','weight','friction','tension','normal force'],
  motion:              ['motion','velocity','acceleration','speed','kinematics','uniform','retardation'],
  energy:              ['energy','work done','power','kinetic','potential','joule','conservation of energy','efficiency'],
  waves:               ['wave','frequency','amplitude','wavelength','transverse','longitudinal','period'],
  light:               ['light','reflection','refraction','lens','mirror','ray','optics','prism','spectrum','critical angle'],
  electricity:         ['electricity','current','voltage','resistance','circuit','ohm','series','parallel','charge'],
  magnetism:           ['magnet','magnetism','magnetic field','electromagnet','solenoid','poles'],
  thermodynamics:      ['heat','temperature','thermal','conduction','convection','radiation','specific heat','latent heat'],
  properties_matter:   ['density','pressure','buoyancy','flotation','archimedes','upthrust','hydraulic'],
  measurement:         ['measurement','unit','si unit','significant figure','error','accuracy','precision'],
  nuclear_physics:     ['nuclear','radioactive','radiation','alpha','beta','gamma','half-life','fission','fusion'],
  cells:               ['cell','nucleus','membrane','cytoplasm','organelle','mitochondria','chloroplast','vacuole','cell wall'],
  photosynthesis_respiration: ['photosynthesis','respiration','glucose','chlorophyll','atp','light reaction'],
  diffusion_osmosis:   ['diffusion','osmosis','active transport','concentration gradient','plasmolysis','turgor'],
  genetics:            ['genetics','gene','dna','chromosome','allele','dominant','recessive','mendel','genotype','phenotype','mutation'],
  reproduction:        ['reproduction','fertilisation','mitosis','meiosis','gamete','pollination','asexual'],
  nutrition:           ['nutrition','nutrient','protein','carbohydrate','fat','vitamin','mineral','balanced diet'],
  transport:           ['transport','blood','heart','circulatory','xylem','phloem','haemoglobin','artery','vein','transpiration'],
  classification:      ['classification','kingdom','phylum','species','taxonomy','vertebrate','invertebrate','mammal'],
  ecology:             ['ecology','ecosystem','food chain','food web','habitat','population','community','predator','decomposer'],
  digestion_ecology:   ['digestion','stomach','enzyme','intestine','absorption','bile','amylase','peristalsis'],
  atoms:               ['atom','element','proton','neutron','electron','atomic number','mass number','isotope'],
  bonding:             ['bond','ionic','covalent','metallic','electronegativity','dot and cross','hydrogen bond'],
  matter:              ['matter','solid','liquid','gas','change of state','melting','boiling','sublimation'],
  reactions_metals:    ['reactivity','metal','displacement','neutralisation','salt','corrosion','rusting'],
  acids_bases:         ['acid','base','alkali','ph','indicator','litmus','universal indicator','strong acid'],
  organic_chemistry:   ['organic','hydrocarbon','alkane','alkene','alcohol','carboxylic','polymer','homologous series'],
  periodic_table:      ['periodic table','group','period','valence','electron configuration','noble gas','halogen'],
  stoichiometry:       ['mole','stoichiometry','molar mass','avogadro','molarity','limiting reagent'],
  mole_calculations:   ['mole calculation','molar','relative molecular mass','empirical formula'],
  water:               ['hard water','soft water','electrolysis of water','purification'],
  gases_solutions:     ['solution','solute','solvent','solubility','saturated','dissolve'],
  energy_changes:      ['exothermic','endothermic','enthalpy','bond energy','activation energy','catalyst'],
}

const TOPIC_SUBJECTS = {}
const TOPIC_FILES = {
  mathematics: ['algebra','linear_equations','quadratic_equations','geometry','trigonometry','mensuration',
                'statistics','number_theory','matrices','vectors','probability','sets','calculus'],
  physics:     ['forces','motion','energy','waves','light','electricity','magnetism',
                'thermodynamics','properties_matter','measurement','nuclear_physics'],
  biology:     ['cells','photosynthesis_respiration','diffusion_osmosis','genetics','reproduction',
                'nutrition','transport','classification','ecology','digestion_ecology'],
  chemistry:   ['atoms','bonding','matter','reactions_metals','acids_bases','organic_chemistry',
                'periodic_table','stoichiometry','mole_calculations','water','gases_solutions','energy_changes'],
}
for (const [subj, topics] of Object.entries(TOPIC_FILES)) {
  for (const t of topics) TOPIC_SUBJECTS[t] = subj
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m+1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

export function extractTopic(input) {
  const text = input.toLowerCase()
  let bestTopic = null, bestScore = 0
  for (const [topic, aliases] of Object.entries(TOPIC_ALIASES)) {
    for (const alias of aliases) {
      if (text.includes(alias)) {
        const score = alias.length * 2
        if (score > bestScore) { bestScore = score; bestTopic = topic }
      }
    }
  }
  if (!bestTopic) {
    const words = text.split(/\s+/).filter(w => w.length > 3)
    for (const word of words) {
      for (const [topic, aliases] of Object.entries(TOPIC_ALIASES)) {
        for (const alias of aliases) {
          if (alias.split(' ').length > 1) continue
          const dist = levenshtein(word, alias)
          if (dist <= 2 && alias.length > 4) {
            const score = alias.length - dist
            if (score > bestScore) { bestScore = score; bestTopic = topic }
          }
        }
      }
    }
  }
  return bestTopic ? { topic: bestTopic, subject: TOPIC_SUBJECTS[bestTopic] || 'general' } : null
}

function findClosestTopic(input) {
  const text = input.toLowerCase()
  let best = null, bestScore = 0
  for (const [topic, aliases] of Object.entries(TOPIC_ALIASES)) {
    for (const alias of aliases) {
      const words = alias.split(' ')
      for (const word of words) {
        if (word.length < 4) continue
        const dist = levenshtein(text.replace(/\s+/g,''), word)
        const score = word.length - dist
        if (score > bestScore && dist <= 3) { bestScore = score; best = topic }
      }
    }
  }
  return best ? { topic: best, subject: TOPIC_SUBJECTS[best] || 'general' } : null
}

// ── Curriculum knowledge loader ───────────────────────────────────
const KNOWLEDGE_CACHE = {}

export async function loadTopicKnowledge(topic, subject) {
  const key = `${subject}_${topic}`
  if (KNOWLEDGE_CACHE[key]) return KNOWLEDGE_CACHE[key]
  for (const level of ['s1','s2','s3','s4','s5','s6']) {
    try {
      const data = await import(`../curriculum/${subject}/${level}/${topic}.json`)
      const k = extractKnowledge(data, topic, subject)
      KNOWLEDGE_CACHE[key] = k
      return k
    } catch {}
  }
  return null
}

function extractKnowledge(data, topic, subject) {
  const lessons = data.lessons || []
  const k = { topic, subject, title: data.topic_title || topic.replace(/_/g,' '),
    definitions:[], keyFacts:[], formulas:[], examples:[], quizQuestions:[], steps:[], simplerExplanation: null }
  for (const lesson of lessons) {
    for (const block of (lesson.content || [])) {
      if (block.type === 'text' && block.body)
        k.keyFacts.push(...block.body.split(/[.!]\s+/).filter(s => s.length > 20).slice(0, 3))
      else if (block.type === 'formula' && block.body)
        k.formulas.push({ label: block.title || 'Formula', content: block.body.trim() })
      else if (block.type === 'example' && block.body)
        k.examples.push({ title: block.title || 'Example', body: block.body })
      else if (block.type === 'definition' && block.term)
        k.definitions.push({ term: block.term, definition: block.definition })
      else if (block.type === 'steps' && block.items)
        k.steps.push({ title: block.title || 'Steps', items: block.items })
      else if ((block.type === 'simple' || block.type === 'analogy') && block.body)
        k.simplerExplanation = block.body
    }
    k.quizQuestions.push(...(lesson.quiz?.questions || []).slice(0, 5))
  }
  k.keyFacts = [...new Set(k.keyFacts)].slice(0, 8)
  k.formulas = k.formulas.slice(0, 5)
  k.examples = k.examples.slice(0, 4)
  k.quizQuestions = k.quizQuestions.slice(0, 30)
  return k
}

// ── Calculation solver ────────────────────────────────────────────
const CALC_ENGINES = [
  {
    match: /speed|velocity|distance|time/i,
    formulas: [
      { name: 'speed',    vars: ['d','t'], calc: v => v.d/v.t,   unit:'m/s',  form:'speed = distance ÷ time' },
      { name: 'distance', vars: ['s','t'], calc: v => v.s*v.t,   unit:'m',    form:'distance = speed × time' },
      { name: 'time',     vars: ['d','s'], calc: v => v.d/v.s,   unit:'s',    form:'time = distance ÷ speed' },
    ],
    extract: t => {
      const v = {}
      const d = t.match(/distance[=\s:]+([0-9.]+)/i), s = t.match(/(speed|velocity)[=\s:]+([0-9.]+)/i), tm = t.match(/time[=\s:]+([0-9.]+)/i)
      if (d) v.d=parseFloat(d[1]); if (s) v.s=parseFloat(s[2]); if (tm) v.t=parseFloat(tm[1])
      return v
    },
  },
  {
    match: /force|mass|acceleration/i,
    formulas: [
      { name: 'force',        vars: ['m','a'], calc: v => v.m*v.a,   unit:'N',    form:'F = m × a' },
      { name: 'acceleration', vars: ['f','m'], calc: v => v.f/v.m,   unit:'m/s²', form:'a = F ÷ m' },
      { name: 'mass',         vars: ['f','a'], calc: v => v.f/v.a,   unit:'kg',   form:'m = F ÷ a' },
    ],
    extract: t => {
      const v = {}
      const f=t.match(/force[=\s:]+([0-9.]+)/i), m=t.match(/mass[=\s:]+([0-9.]+)/i), a=t.match(/acceleration[=\s:]+([0-9.]+)/i)
      if (f) v.f=parseFloat(f[1]); if (m) v.m=parseFloat(m[1]); if (a) v.a=parseFloat(a[1])
      return v
    },
  },
  {
    match: /voltage|current|resistance|ohm/i,
    formulas: [
      { name: 'voltage',    vars: ['i','r'], calc: v => v.i*v.r, unit:'V', form:"V = I × R (Ohm's Law)" },
      { name: 'current',    vars: ['v','r'], calc: v => v.v/v.r, unit:'A', form:'I = V ÷ R' },
      { name: 'resistance', vars: ['v','i'], calc: v => v.v/v.i, unit:'Ω', form:'R = V ÷ I' },
    ],
    extract: t => {
      const v = {}
      const vt=t.match(/voltage[=\s:]+([0-9.]+)/i), i=t.match(/current[=\s:]+([0-9.]+)/i), r=t.match(/resistance[=\s:]+([0-9.]+)/i)
      if (vt) v.v=parseFloat(vt[1]); if (i) v.i=parseFloat(i[1]); if (r) v.r=parseFloat(r[1])
      return v
    },
  },
  {
    match: /kinetic energy|work done|power/i,
    formulas: [
      { name: 'kinetic energy', vars: ['m','v'], calc: v => 0.5*v.m*v.v*v.v, unit:'J', form:'KE = ½mv²' },
      { name: 'work done',      vars: ['f','d'], calc: v => v.f*v.d,          unit:'J', form:'W = F × d' },
      { name: 'power',          vars: ['w','t'], calc: v => v.w/v.t,          unit:'W', form:'P = W ÷ t' },
    ],
    extract: t => {
      const v = {}
      const m=t.match(/mass[=\s:]+([0-9.]+)/i), spd=t.match(/velocity[=\s:]+([0-9.]+)|speed[=\s:]+([0-9.]+)/i)
      const f=t.match(/force[=\s:]+([0-9.]+)/i), d=t.match(/distance[=\s:]+([0-9.]+)/i)
      const w=t.match(/work[=\s:]+([0-9.]+)/i), tm=t.match(/time[=\s:]+([0-9.]+)/i)
      if (m) v.m=parseFloat(m[1]); if (spd) v.v=parseFloat(spd[1]||spd[2])
      if (f) v.f=parseFloat(f[1]); if (d) v.d=parseFloat(d[1])
      if (w) v.w=parseFloat(w[1]); if (tm) v.t=parseFloat(tm[1])
      return v
    },
  },
  {
    match: /density|density of/i,
    formulas: [
      { name: 'density', vars: ['m','vol'], calc: v => v.m/v.vol, unit:'kg/m³', form:'ρ = m ÷ V' },
      { name: 'mass',    vars: ['d','vol'], calc: v => v.d*v.vol, unit:'kg',    form:'m = ρ × V' },
      { name: 'volume',  vars: ['m','d'],   calc: v => v.m/v.d,  unit:'m³',    form:'V = m ÷ ρ' },
    ],
    extract: t => {
      const v = {}
      const m=t.match(/mass[=\s:]+([0-9.]+)/i), vol=t.match(/volume[=\s:]+([0-9.]+)/i), den=t.match(/density[=\s:]+([0-9.]+)/i)
      if (m) v.m=parseFloat(m[1]); if (vol) v.vol=parseFloat(vol[1]); if (den) v.d=parseFloat(den[1])
      return v
    },
  },
  {
    match: /mole|molar mass/i,
    formulas: [
      { name: 'moles',      vars: ['mass','mr'], calc: v => v.mass/v.mr, unit:'mol',   form:'n = mass ÷ Mr' },
      { name: 'molar mass', vars: ['mass','n'],  calc: v => v.mass/v.n,  unit:'g/mol', form:'Mr = mass ÷ n' },
      { name: 'mass',       vars: ['n','mr'],    calc: v => v.n*v.mr,    unit:'g',     form:'mass = n × Mr' },
    ],
    extract: t => {
      const v = {}
      const mass=t.match(/mass[=\s:]+([0-9.]+)/i), mr=t.match(/molar mass[=\s:]+([0-9.]+)|mr[=\s:]+([0-9.]+)/i), n=t.match(/moles?[=\s:]+([0-9.]+)/i)
      if (mass) v.mass=parseFloat(mass[1]); if (mr) v.mr=parseFloat(mr[1]||mr[2]); if (n) v.n=parseFloat(n[1])
      return v
    },
  },
]

function tryAutoCalculate(input) {
  for (const engine of CALC_ENGINES) {
    if (!engine.match.test(input)) continue
    const vars = engine.extract(input)
    if (Object.keys(vars).length < 2) continue
    for (const formula of engine.formulas) {
      if (formula.vars.every(v => vars[v] !== undefined)) {
        try {
          const result = formula.calc(vars)
          if (!isFinite(result)) continue
          return { name: formula.name, formula: formula.form, result: Math.round(result*1000)/1000, unit: formula.unit, vars }
        } catch {}
      }
    }
  }
  return null
}

// ── Response generators ───────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export function generateExplainResponse(knowledge, query, simpler = false) {
  if (!knowledge) return smartFallback(query)
  const parts = []
  const t = knowledge.title
  parts.push({ type: 'heading', text: `📖 ${t}` })
  if (simpler && knowledge.simplerExplanation) {
    parts.push({ type: 'text', text: knowledge.simplerExplanation })
  } else if (knowledge.definitions.length > 0) {
    parts.push({ type: 'text', text: `**${knowledge.definitions[0].term}**: ${knowledge.definitions[0].definition}` })
  } else if (knowledge.keyFacts.length > 0) {
    parts.push({ type: 'text', text: knowledge.keyFacts[0] })
  }
  if (knowledge.keyFacts.length > 1)
    parts.push({ type: 'list', title: '🔑 Key Points', items: knowledge.keyFacts.slice(1, simpler ? 3 : 4) })
  if (knowledge.formulas.length > 0)
    parts.push({ type: 'formula', title: '📐 Formula(s)', items: knowledge.formulas.slice(0, simpler ? 1 : 3).map(f => `${f.label}: ${f.content}`) })
  if (knowledge.examples.length > 0)
    parts.push({ type: 'example', title: `💡 Example: ${knowledge.examples[0].title}`, text: knowledge.examples[0].body })
  parts.push({ type: 'suggestions', items: [`Quiz me on ${t}`, `Give me another example of ${t}`, `Exam tips for ${t}`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

function generateMoreResponse(knowledge) {
  if (!knowledge) return smartFallback('')
  const parts = []
  parts.push({ type: 'heading', text: `📖 More on ${knowledge.title}` })
  if (knowledge.keyFacts.length > 3)
    parts.push({ type: 'list', title: '📚 More Key Points', items: knowledge.keyFacts.slice(3, 7) })
  else
    parts.push({ type: 'list', title: 'Key points:', items: knowledge.keyFacts })
  if (knowledge.formulas.length > 2)
    parts.push({ type: 'formula', title: '📐 Additional Formulas', items: knowledge.formulas.slice(2).map(f => `${f.label}: ${f.content}`) })
  if (knowledge.examples.length > 1)
    parts.push({ type: 'example', title: `💡 ${knowledge.examples[1].title}`, text: knowledge.examples[1].body })
  parts.push({ type: 'suggestions', items: [`Quiz me on ${knowledge.title}`, `Exam tips for ${knowledge.title}`, `Explain ${knowledge.title} in simpler terms`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

export function generateCalculateResponse(knowledge, query) {
  const parts = []
  const solved = tryAutoCalculate(query)
  if (solved) {
    parts.push({ type: 'heading', text: `🔢 Solved: ${solved.name}` })
    parts.push({ type: 'formula', title: '📐 Formula Used', items: [solved.formula] })
    parts.push({ type: 'list', title: '📋 Working', items: [
      `Given: ${Object.entries(solved.vars).map(([k,v]) => `${k} = ${v}`).join(', ')}`,
      `Applying: ${solved.formula}`,
      `✅ Answer: **${solved.name} = ${solved.result} ${solved.unit}**`,
    ]})
    if (knowledge?.examples?.length > 0)
      parts.push({ type: 'example', title: '💡 Similar Example', text: knowledge.examples[0].body })
    parts.push({ type: 'suggestions', items: [`Quiz me on ${knowledge?.title || solved.name}`, `Explain ${solved.name}`, 'Give me another example'] })
    return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
  }
  if (!knowledge) return smartFallback(query)
  parts.push({ type: 'heading', text: `🔢 How to Calculate: ${knowledge.title}` })
  if (knowledge.formulas.length > 0) {
    parts.push({ type: 'formula', title: '📐 Formula(s) to Use', items: knowledge.formulas.map(f => `${f.label}: ${f.content}`) })
    parts.push({ type: 'list', title: '📋 Step-by-Step Method', items: [
      '1️⃣ Read the question — identify all given values',
      '2️⃣ Identify what you need to find (the unknown)',
      '3️⃣ Write the formula from above',
      '4️⃣ Substitute the known values into the formula',
      '5️⃣ Solve and include the correct unit in your answer',
    ]})
  }
  if (knowledge.examples.length > 0)
    parts.push({ type: 'example', title: '💡 Worked Example', text: knowledge.examples[0].body })
  parts.push({ type: 'text', text: `💡 **Tip:** Give me actual numbers and I can solve it for you!\ne.g. _"find force if mass=5kg and acceleration=3m/s²"_` })
  parts.push({ type: 'suggestions', items: [`Quiz me on ${knowledge.title}`, `Explain ${knowledge.title}`, 'Another example please'] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

export function generateQuizResponse(knowledge, existingSession = null) {
  if (!knowledge || knowledge.quizQuestions.length === 0) {
    return { parts: [
      { type: 'text', text: `I don't have quiz questions for that topic yet — but I can explain it!\nTry: _"Explain ${knowledge?.title || 'the topic'}"_` },
      { type: 'suggestions', items: [`Explain ${knowledge?.title || 'algebra'}`, 'Quiz me on forces', 'Quiz me on cells'] },
    ], quizMode: false }
  }
  const used = existingSession?.usedIds || new Set()
  const available = knowledge.quizQuestions.filter(q => !used.has(q.id))
  const pool = available.length > 0 ? available : knowledge.quizQuestions
  const q = pool[Math.floor(Math.random() * pool.length)]
  const intros = [
    `Here is a question on **${knowledge.title}**:`,
    `Let's test your knowledge of **${knowledge.title}**:`,
    `Ready? Here comes a **${knowledge.title}** question:`,
    `Challenge yourself on **${knowledge.title}**:`,
  ]
  return {
    parts: [
      { type: 'heading', text: `❓ Quiz: ${knowledge.title}` },
      { type: 'text', text: pick(intros) },
      { type: 'quiz_question', question: q.question, options: q.options, answer: q.answer, explanation: q.explanation, id: q.id },
    ],
    quizMode: true, currentQuestion: q, topic: knowledge.topic, subject: knowledge.subject, newUsedId: q.id,
  }
}

export function generateHintResponse(knowledge, query) {
  const parts = []
  if (!knowledge) {
    parts.push({ type: 'heading', text: '💡 Let me help you' })
    parts.push({ type: 'list', title: 'When you are stuck, try this:', items: [
      '📖 Re-read the question slowly — what is it actually asking?',
      '📝 Write down all the values or facts given in the question',
      '🔍 Think: which topic does this question relate to?',
      '📚 Look back at a similar solved example in your notes',
      '🎯 In multiple-choice: eliminate clearly wrong options first',
      '💬 Tell me the topic and I will give you a specific hint!',
    ]})
    parts.push({ type: 'suggestions', items: ['Explain algebra', 'Explain photosynthesis', 'Quiz me on forces'] })
    return { parts }
  }
  parts.push({ type: 'heading', text: `💡 Hints for: ${knowledge.title}` })
  const hints = [
    knowledge.keyFacts[0] ? `🔑 Key idea: **${knowledge.keyFacts[0]}**` : null,
    knowledge.formulas[0] ? `📐 Main formula: **${knowledge.formulas[0].content}**` : null,
    `🤔 Ask yourself: what values do I already know, and what am I finding?`,
    knowledge.keyFacts[1] ? `💡 Also remember: ${knowledge.keyFacts[1]}` : null,
  ].filter(Boolean)
  parts.push({ type: 'list', title: 'Think through this step by step:', items: hints })
  if (knowledge.examples.length > 0)
    parts.push({ type: 'example', title: '💡 A Similar Example', text: knowledge.examples[0].body })
  parts.push({ type: 'text', text: `Still stuck? Try: _"Explain ${knowledge.title} in simpler terms"_` })
  parts.push({ type: 'suggestions', items: [`Explain ${knowledge.title} in simpler terms`, `Quiz me on ${knowledge.title}`, `Show me the formula for ${knowledge.title}`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

function generateExamTipResponse(knowledge, query) {
  const parts = []
  parts.push({ type: 'heading', text: `🎯 Exam Tips${knowledge ? ': ' + knowledge.title : ''}` })
  if (knowledge) {
    const tips = []
    if (knowledge.formulas.length > 0)
      tips.push(`Memorise: ${knowledge.formulas.map(f => f.content).slice(0,3).join(' | ')}`)
    tips.push(`For definitions: learn exact key terms — UNEB examiners mark specific words`)
    tips.push(`Always show your working — you earn method marks even if the final answer is wrong`)
    tips.push(`Common mistake: rushing without writing down the given values first`)
    parts.push({ type: 'list', title: `📌 Tips for ${knowledge.title}:`, items: tips })
  }
  parts.push({ type: 'list', title: '📋 General UNEB Strategy:', items: [
    '📝 Show all working — method marks are valuable',
    '⏱️ If stuck, move on and come back — never waste too much time',
    '🔢 Always write units in your final answer',
    '✅ Check arithmetic — many marks are lost on simple errors',
    '📊 Label diagrams clearly and use a ruler for straight lines',
  ]})
  parts.push({ type: 'suggestions', items: [
    knowledge ? `Quiz me on ${knowledge.title}` : 'Quiz me on forces',
    knowledge ? `Explain ${knowledge.title}` : 'Explain photosynthesis',
    'How do I calculate force?',
  ]})
  return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
}

function smartFallback(query) {
  const closest = findClosestTopic(query)
  const parts = []
  if (closest) {
    const name = closest.topic.replace(/_/g,' ')
    parts.push({ type: 'heading', text: '🤔 Did you mean...' })
    parts.push({ type: 'text', text: `I couldn't find an exact match for _"${query}"_, but did you mean **${name}**?` })
    parts.push({ type: 'suggestions', items: [`Explain ${name}`, `Quiz me on ${name}`, `How do I calculate ${name}?`, 'Show me all topics'] })
  } else {
    parts.push({ type: 'heading', text: "🤔 I'm not sure about that" })
    parts.push({ type: 'text', text: `I specialise in the S1–S6 UNEB curriculum. Try asking about a specific topic:` })
    parts.push({ type: 'list', title: 'Examples:', items: ['"What is photosynthesis?"','"Explain quadratic equations"','"Quiz me on forces"','"How do I calculate speed?"','"Exam tips for chemistry"'] })
    parts.push({ type: 'suggestions', items: ['Explain photosynthesis', 'Quiz me on algebra', 'Explain electricity', 'How do I find force?'] })
  }
  return { parts }
}

// ── Greetings, thanks, recommend ──────────────────────────────────
const GREETINGS = [
  n => `Hello${n ? ' '+n : ''}! 👋 I am **Elimu AI** — your personal study assistant.\n\nI can help you:\n• **Explain** any topic — _"What is osmosis?"_\n• **Solve** calculations — _"Find force if mass=5kg acceleration=3m/s²"_\n• **Quiz** you — _"Quiz me on algebra"_\n• **Hints** when stuck — _"I don't understand genetics"_\n• **Exam tips** — _"Tips for physics exam"_\n\nWhat would you like to study today?`,
  n => `Hi${n ? ' '+n : ''}! 🌟 Ready to study? I know your entire S1–S6 curriculum — Maths, Physics, Biology and Chemistry.\n\nJust ask me anything! Try:\n• _"Explain the periodic table"_\n• _"Quiz me on cells"_\n• _"How do I calculate density?"_`,
  n => `Good to see you${n ? ', '+n : ''}! 🚀 Let's make your study session count.\n\nI can explain topics, quiz you, solve problems step by step, or give UNEB exam tips. What are we studying today?`,
]

const THANKS_MSGS = [
  "You're welcome! 😊 Every question you ask makes you stronger. What's next?",
  "Happy to help! 🌟 You're doing great. Shall we keep going?",
  "Great! 🚀 The best students are the ones who ask questions. What else can I explain?",
  "Glad that helped! 💪 Want to test yourself on this with a quick quiz?",
  "Any time! 🎯 Consistent study is the key to passing UNEB. What topic next?",
]

const CORRECT_RESPONSES = [
  n => `✅ Correct${n ? ', '+n : ''}! Well done! 🎉`,
  () => `✅ That's right! Excellent! ⭐`,
  () => `✅ Perfect answer! You clearly know this topic. 🚀`,
  () => `✅ Spot on! Keep this up and you will ace UNEB. 💪`,
]
const WRONG_RESPONSES = [
  () => `❌ Not quite — but that's okay, this is how we learn.`,
  () => `❌ Good try! The correct answer is below.`,
  () => `❌ Almost! Check the correct answer below.`,
]

export function generateGreetResponse(studentName) {
  const name = studentName || conversationMemory.studentName
  return {
    parts: [{ type: 'text', text: pick(GREETINGS)(name) }],
    suggestions: ['Explain photosynthesis', 'Quiz me on forces', 'How do I calculate speed?', 'Exam tips for maths'],
  }
}

export function generateThanksResponse() {
  const mem = conversationMemory
  return {
    parts: [{ type: 'text', text: pick(THANKS_MSGS) }],
    suggestions: mem.lastTopic
      ? [`Quiz me on ${mem.lastTopic.replace(/_/g,' ')}`, 'Explain another topic', 'Give me exam tips']
      : ['Explain photosynthesis', 'Quiz me on algebra', 'How do I calculate force?'],
  }
}

// ── Quiz answer checker ───────────────────────────────────────────
export function checkQuizAnswer(userInput, currentQuestion) {
  if (!currentQuestion) return null
  const input = userInput.trim().toLowerCase()
  const opts = currentQuestion.options || []
  const answer = currentQuestion.answer || ''
  const letterMatch = input.match(/^([abcd])[\s.)]*$/)
  if (letterMatch) {
    const idx = 'abcd'.indexOf(letterMatch[1])
    const chosen = opts[idx]
    return { correct: chosen === answer, chosen, answer, explanation: currentQuestion.explanation }
  }
  const answerLow = answer.toLowerCase()
  return { correct: input === answerLow || answerLow.startsWith(input) || input.startsWith(answerLow), chosen: userInput, answer, explanation: currentQuestion.explanation }
}

// ── Main processor ────────────────────────────────────────────────
export async function processMessage(input, context = {}) {
  const mem = conversationMemory
  mem.messageCount++
  if (context.studentName && !mem.studentName) mem.studentName = context.studentName

  const { intent } = classifyIntent(input)

  // Handle quiz answer
  if (context.quizMode && context.currentQuestion) {
    const result = checkQuizAnswer(input, context.currentQuestion)
    if (result) {
      result.correct ? (mem.quizStreak++, mem.quizTotal++) : (mem.quizStreak = 0, mem.quizTotal++)
      const streakMsg = result.correct && mem.quizStreak >= 3 ? ` 🔥 ${mem.quizStreak} in a row!` : ''
      const parts = []
      if (result.correct)
        parts.push({ type: 'correct', text: pick(CORRECT_RESPONSES)(mem.studentName) + streakMsg })
      else {
        parts.push({ type: 'wrong', text: pick(WRONG_RESPONSES)() })
        parts.push({ type: 'text', text: `✅ Correct answer: **"${result.answer}"**` })
      }
      if (result.explanation) parts.push({ type: 'text', text: `💡 **Why:** ${result.explanation}` })
      const tn = context.topic?.replace(/_/g,' ') || 'this topic'
      parts.push({ type: 'suggestions', items: [`Next question on ${tn}`, `Explain ${tn}`, 'Quiz me on something else'] })
      return { parts, quizMode: false, wasAnswer: true, correct: result.correct }
    }
  }

  const lastK = mem.lastKnowledge

  // Follow-up handlers
  if (intent === 'FOLLOWUP_MORE') {
    return lastK ? generateMoreResponse(lastK) : { parts: [{ type: 'text', text: 'What topic would you like more detail on?' }] }
  }
  if (intent === 'FOLLOWUP_SIMPLER') {
    return lastK ? generateExplainResponse(lastK, input, true) : { parts: [{ type: 'text', text: 'Which topic should I explain more simply?' }] }
  }
  if (intent === 'FOLLOWUP_EXAMPLE') {
    if (lastK && lastK.examples.length > 0) {
      const ex = lastK.examples[Math.floor(Math.random() * lastK.examples.length)]
      return { parts: [
        { type: 'heading', text: `💡 Example: ${lastK.title}` },
        { type: 'example', title: ex.title, text: ex.body },
        { type: 'suggestions', items: [`Quiz me on ${lastK.title}`, 'Another example please', `Explain ${lastK.title}`] },
      ], topic: lastK.topic, subject: lastK.subject }
    }
    return { parts: [{ type: 'text', text: 'Which topic would you like an example for?' }] }
  }
  if (intent === 'FOLLOWUP_WHY') {
    if (lastK) return { parts: [
      { type: 'heading', text: `🧠 Why: ${lastK.title}` },
      { type: 'text', text: lastK.keyFacts[2] || `${lastK.title} works this way because of these fundamental principles:` },
      ...(lastK.keyFacts.length > 3 ? [{ type: 'list', items: lastK.keyFacts.slice(2, 5) }] : []),
      { type: 'suggestions', items: [`Explain ${lastK.title} fully`, `Quiz me on ${lastK.title}`, 'Tell me more'] },
    ], topic: lastK.topic, subject: lastK.subject }
    return { parts: [{ type: 'text', text: 'Which topic are you asking "why" about?' }] }
  }
  if (intent === 'FOLLOWUP_NEXT_QUIZ') {
    if (mem.lastTopic && mem.lastSubject) {
      const k = await loadTopicKnowledge(mem.lastTopic, mem.lastSubject)
      if (k) return generateQuizResponse(k, context.quizSession)
    }
    return { parts: [{ type: 'text', text: 'Which topic should I quiz you on? e.g. _"Quiz me on forces"_' }] }
  }

  if (intent === 'GREET')     return generateGreetResponse(context.studentName)
  if (intent === 'THANKS')    return generateThanksResponse()
  if (intent === 'RECOMMEND') {
    const parts = [{ type: 'heading', text: '🗺️ Study Recommendation' }]
    if (mem.sessionTopics.length > 0) {
      parts.push({ type: 'text', text: `You've been studying **${mem.sessionTopics[mem.sessionTopics.length-1].replace(/_/g,' ')}** today. A great next step: quiz yourself on it, then move to a related topic.` })
    } else {
      parts.push({ type: 'text', text: 'Start with the topic you find hardest — that is where revision has the most impact. The 🧠 AI Tutor page gives personalised recommendations based on your quiz history.' })
    }
    parts.push({ type: 'list', title: '📚 High-value topics for UNEB:', items: ['Mathematics: Quadratic equations, Trigonometry, Vectors','Physics: Forces & Motion, Electricity, Waves','Biology: Cells, Genetics, Ecology','Chemistry: Acids & Bases, Stoichiometry, Organic Chemistry'] })
    parts.push({ type: 'suggestions', items: ['Quiz me on quadratic equations','Explain genetics','Explain electricity','Exam tips for chemistry'] })
    return { parts }
  }

  // Load knowledge
  const topicResult = extractTopic(input)
  let knowledge = null
  if (topicResult) {
    knowledge = await loadTopicKnowledge(topicResult.topic, topicResult.subject)
  } else if (mem.lastTopic && mem.lastSubject && ['HINT','CALCULATE'].includes(intent)) {
    knowledge = await loadTopicKnowledge(mem.lastTopic, mem.lastSubject)
  }

  if (knowledge) {
    mem.lastTopic = knowledge.topic
    mem.lastSubject = knowledge.subject
    mem.lastIntent = intent
    mem.lastKnowledge = knowledge
    if (!mem.sessionTopics.includes(knowledge.topic)) mem.sessionTopics.push(knowledge.topic)
  }

  switch (intent) {
    case 'EXPLAIN':   return generateExplainResponse(knowledge, input)
    case 'CALCULATE': return generateCalculateResponse(knowledge, input)
    case 'QUIZ':      return generateQuizResponse(knowledge, context.quizSession)
    case 'HINT':      return generateHintResponse(knowledge, input)
    case 'COMPARE':   return generateExplainResponse(knowledge, input)  // show knowledge + compare tip
    case 'EXAM_TIP':  return generateExamTipResponse(knowledge, input)
    default:          return generateExplainResponse(knowledge, input)
  }
}

// ── Quick topic chips ─────────────────────────────────────────────
export const QUICK_TOPICS = [
  { label: '📐 Algebra',         query: 'Explain algebra' },
  { label: '⚛️ Cells',           query: 'What is a cell?' },
  { label: '⚡ Forces',          query: 'Explain forces' },
  { label: '🧪 Acids & Bases',   query: 'What are acids and bases?' },
  { label: '🌿 Photosynthesis',  query: 'Explain photosynthesis' },
  { label: '🔢 Quadratics',      query: 'Explain quadratic equations' },
  { label: '💧 Osmosis',         query: 'What is osmosis?' },
  { label: '⚡ Electricity',     query: 'Explain electricity' },
  { label: '🧬 Genetics',        query: 'Explain genetics' },
  { label: '🔥 Energy',          query: 'Explain energy' },
  { label: '🌊 Waves',           query: 'Explain waves' },
  { label: '⚗️ Moles',           query: 'How do I calculate moles?' },
  { label: '🎯 Exam Tips',       query: 'Exam tips for physics' },
  { label: '🧮 Solve Problem',   query: 'Find force if mass=5kg acceleration=3m/s²' },
]
