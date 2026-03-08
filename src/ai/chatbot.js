/**
 * ELIMU LEARN — AI CHATBOT ENGINE
 * ─────────────────────────────────────────────────────────────────
 * Pure rule-based. 100% offline. Zero API cost.
 * Knowledge sourced from the app's own curriculum JSON files.
 *
 * Pipeline:
 *   User input → Normalise → Classify Intent → Extract Topic
 *               → Load Curriculum Knowledge → Generate Response
 *               → Suggest follow-ups
 */

// ═══════════════════════════════════════════════════════════════════
// INTENT CLASSIFIER
// ═══════════════════════════════════════════════════════════════════
const INTENT_PATTERNS = [
  {
    intent: 'EXPLAIN',
    patterns: [
      /what is (.+)/i, /what are (.+)/i, /define (.+)/i,
      /explain (.+)/i, /tell me about (.+)/i, /describe (.+)/i,
      /meaning of (.+)/i, /what does (.+) mean/i,
      /how does (.+) work/i, /what is meant by (.+)/i,
    ],
    examples: ['What is osmosis?', 'Explain photosynthesis', 'Define a force'],
  },
  {
    intent: 'CALCULATE',
    patterns: [
      /calculate (.+)/i, /solve (.+)/i, /find (.+)/i,
      /how do (i|you|we) (calculate|solve|find|work out) (.+)/i,
      /work out (.+)/i, /what is the (formula|equation) for (.+)/i,
      /formula for (.+)/i, /how to calculate (.+)/i,
      /step(s)? (to|for) (solving|calculating) (.+)/i,
    ],
    examples: ['How do I calculate force?', 'Formula for speed', 'Solve quadratic equations'],
  },
  {
    intent: 'QUIZ',
    patterns: [
      /quiz me (on )?(.+)/i, /test me (on )?(.+)/i,
      /ask me (a question|questions) (about|on) (.+)/i,
      /give me (a question|questions) (about|on) (.+)/i,
      /practice (.+)/i, /i want to practice (.+)/i,
      /let'?s? practice (.+)/i, /drill me on (.+)/i,
    ],
    examples: ['Quiz me on algebra', 'Test me on cells', 'Practice forces'],
  },
  {
    intent: 'HINT',
    patterns: [
      /i('?m| am) stuck/i, /give me a hint/i, /i don'?t understand/i,
      /help me (with|understand) (.+)/i, /i need help (with )?(.+)/i,
      /i'?m? confused (about|by)? ?(.+)?/i, /hint please/i,
      /can you help me (.+)/i, /struggling with (.+)/i,
    ],
    examples: ["I'm stuck", "I don't understand photosynthesis", 'Help me with algebra'],
  },
  {
    intent: 'GREET',
    patterns: [
      /^(hi|hello|hey|good morning|good evening|helo|hi there)[\s!.]*$/i,
      /^(how are you|what can you do|who are you)[\s?]*$/i,
    ],
    examples: ['Hello', 'Hi', 'Good morning'],
  },
  {
    intent: 'THANKS',
    patterns: [/^(thanks?|thank you|ok thanks?|great|awesome|cool|perfect|got it|i see)[\s!.]*$/i],
  },
  {
    intent: 'RECOMMEND',
    patterns: [
      /what should i (study|learn|do) (next|now)?/i,
      /recommend (.+)/i, /what topic should i/i,
      /what'?s? next/i, /guide me/i,
    ],
  },
]

export function classifyIntent(input) {
  const text = input.trim().toLowerCase()
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return { intent, match, raw: input }
    }
  }
  // Default: try to explain whatever they typed
  return { intent: 'EXPLAIN', match: [text, text], raw: input }
}

// ═══════════════════════════════════════════════════════════════════
// TOPIC EXTRACTOR
// ═══════════════════════════════════════════════════════════════════

// All known curriculum topics and their aliases
const TOPIC_ALIASES = {
  // Mathematics
  algebra:          ['algebra','variable','expression','equation','coefficient','like terms'],
  linear_equations: ['linear equation','simultaneous','system of equations','solve for x','one variable'],
  quadratic_equations:['quadratic','quadratic equation','x squared','parabola','factorisation','completing the square'],
  geometry:         ['geometry','angle','triangle','circle','polygon','parallel','perpendicular','shape'],
  trigonometry:     ['trigonometry','trig','sine','cosine','tangent','sin','cos','tan','sohcahtoa'],
  mensuration:      ['mensuration','area','volume','perimeter','surface area','circumference'],
  statistics:       ['statistics','mean','median','mode','average','data','frequency','histogram','pie chart'],
  number_theory:    ['number','prime','factor','multiple','hcf','lcm','highest common factor','indices','index','power'],
  matrices:         ['matrix','matrices','determinant','inverse matrix','2x2'],
  vectors:          ['vector','scalar','magnitude','direction','displacement','resultant'],
  probability:      ['probability','chance','likelihood','event','outcome','sample space'],
  sets:             ['sets','union','intersection','subset','universal set','venn diagram'],
  ratio_indices:    ['ratio','proportion','indices','index notation','standard form'],
  calculus:         ['calculus','derivative','differentiation','integration','gradient','rate of change','d/dx'],

  // Physics
  forces:           ['force','newton','gravity','weight','friction','tension','push','pull','contact force'],
  motion:           ['motion','velocity','acceleration','speed','distance','displacement','kinematics'],
  energy:           ['energy','work','power','kinetic','potential','joule','conservation of energy'],
  waves_electricity:['wave','frequency','amplitude','wavelength','transverse','longitudinal'],
  light:            ['light','reflection','refraction','lens','mirror','ray','optics','prism','spectrum'],
  electricity:      ['electricity','current','voltage','resistance','circuit','ohm','series','parallel'],
  magnetism:        ['magnet','magnetism','magnetic field','electromagnet','solenoid','poles'],
  thermodynamics:   ['heat','temperature','thermal','conduction','convection','radiation','specific heat'],
  properties_matter:['density','pressure','buoyancy','flotation','archimedes','pascal'],
  measurement:      ['measurement','unit','si unit','significant figure','error','accuracy','precision'],
  nuclear_physics:  ['nuclear','radioactive','radiation','alpha','beta','gamma','half-life','fission','fusion'],

  // Biology
  cells:            ['cell','nucleus','membrane','cytoplasm','organelle','mitochondria','prokaryotic','eukaryotic','chloroplast'],
  photosynthesis_respiration:['photosynthesis','respiration','glucose','oxygen','carbon dioxide','chlorophyll','atp'],
  diffusion_osmosis:['diffusion','osmosis','active transport','concentration gradient','semi-permeable'],
  genetics:         ['genetics','gene','dna','chromosome','allele','dominant','recessive','inheritance','mendel'],
  reproduction:     ['reproduction','sexual','asexual','fertilisation','mitosis','meiosis','gamete'],
  nutrition:        ['nutrition','nutrient','protein','carbohydrate','fat','vitamin','mineral','diet'],
  transport:        ['transport','blood','heart','circulatory','xylem','phloem','haemoglobin'],
  classification:   ['classification','kingdom','phylum','species','taxonomy','binomial','vertebrate','invertebrate'],
  ecology:          ['ecology','ecosystem','food chain','food web','habitat','population','community','biome'],
  digestion_ecology:['digestion','stomach','enzyme','intestine','absorption','bile','amylase','pepsin'],

  // Chemistry
  atoms:            ['atom','element','proton','neutron','electron','atomic number','mass number','isotope'],
  bonding:          ['bond','ionic','covalent','metallic','bond','electronegativity','dot and cross','lewis'],
  matter:           ['matter','solid','liquid','gas','state','change of state','melting','boiling','sublimation'],
  reactions_metals: ['reaction','reactivity','metal','acid','alkali','neutralisation','salt','displacement'],
  acids_bases:      ['acid','base','alkali','ph','indicator','neutralisation','litmus','universal'],
  organic_chemistry:['organic','hydrocarbon','alkane','alkene','alcohol','carboxylic','polymer','homologous'],
  periodic_table:   ['periodic table','group','period','element','valence','electron configuration'],
  stoichiometry:    ['mole','stoichiometry','molar mass','avogadro','concentration','molarity'],
  mole_calculations:['mole','molar','avogadro','relative molecular mass','empirical formula'],
  water:            ['water','hydrogen bond','hard water','soft water','electrolysis of water'],
  gases_solutions:  ['gas','solution','solute','solvent','solubility','concentration','dissolve'],
  energy_changes:   ['exothermic','endothermic','enthalpy','bond energy','activation energy','catalyst'],
}

// Map topics to their subjects
const TOPIC_SUBJECTS = {}
const TOPIC_FILES = {
  mathematics: ['algebra','linear_equations','quadratic_equations','geometry','trigonometry',
                'mensuration','statistics','number_theory','matrices','vectors','probability',
                'sets','ratio_indices','calculus','numbers'],
  physics:     ['forces','motion','energy','waves_electricity','light','electricity','magnetism',
                'thermodynamics','properties_matter','measurement','nuclear_physics','density_flotation'],
  biology:     ['cells','photosynthesis_respiration','diffusion_osmosis','genetics','reproduction',
                'nutrition','transport','classification','ecology','digestion_ecology'],
  chemistry:   ['atoms','bonding','matter','reactions_metals','acids_bases','organic_chemistry',
                'periodic_table','stoichiometry','mole_calculations','water','gases_solutions','energy_changes'],
}
for (const [subj, topics] of Object.entries(TOPIC_FILES)) {
  for (const t of topics) TOPIC_SUBJECTS[t] = subj
}

export function extractTopic(input) {
  const text = input.toLowerCase()
  let bestTopic = null, bestScore = 0

  for (const [topic, aliases] of Object.entries(TOPIC_ALIASES)) {
    for (const alias of aliases) {
      if (text.includes(alias)) {
        const score = alias.length  // longer match = more specific
        if (score > bestScore) { bestScore = score; bestTopic = topic }
      }
    }
  }

  return bestTopic
    ? { topic: bestTopic, subject: TOPIC_SUBJECTS[bestTopic] || 'general' }
    : null
}

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM KNOWLEDGE LOADER
// ═══════════════════════════════════════════════════════════════════
const KNOWLEDGE_CACHE = {}

export async function loadTopicKnowledge(topic, subject) {
  const cacheKey = `${subject}_${topic}`
  if (KNOWLEDGE_CACHE[cacheKey]) return KNOWLEDGE_CACHE[cacheKey]

  const levels = ['s1','s2','s3','s4','s5','s6']
  for (const level of levels) {
    try {
      const data = await import(`../curriculum/${subject}/${level}/${topic}.json`)
      const knowledge = extractKnowledge(data, topic, subject)
      KNOWLEDGE_CACHE[cacheKey] = knowledge
      return knowledge
    } catch {}
  }
  return null
}

function extractKnowledge(data, topic, subject) {
  const lessons = data.lessons || []
  const knowledge = {
    topic, subject,
    title: data.topic_title || topic.replace(/_/g,' '),
    definitions: [],
    keyFacts: [],
    formulas: [],
    examples: [],
    quizQuestions: [],
    steps: [],
  }

  for (const lesson of lessons) {
    const content = lesson.content || []
    for (const block of content) {
      switch (block.type) {
        case 'text':
          // Extract as key fact (first sentence is often definition)
          if (block.body) {
            const sentences = block.body.split(/[.!]\s+/).filter(s => s.length > 20)
            knowledge.keyFacts.push(...sentences.slice(0, 2))
          }
          break
        case 'formula':
          if (block.body) knowledge.formulas.push({
            label: block.title || 'Formula',
            content: block.body.trim(),
          })
          break
        case 'example':
          if (block.body) knowledge.examples.push({
            title: block.title || 'Example',
            body: block.body,
          })
          break
        case 'definition':
          if (block.term && block.definition) knowledge.definitions.push({
            term: block.term, definition: block.definition,
          })
          break
        case 'steps':
          if (block.items) knowledge.steps.push({
            title: block.title || 'Steps',
            items: block.items,
          })
          break
      }
    }
    // Collect quiz questions for quiz mode
    const qs = lesson.quiz?.questions || []
    knowledge.quizQuestions.push(...qs.slice(0, 5))
  }

  // Deduplicate key facts
  knowledge.keyFacts = [...new Set(knowledge.keyFacts)].slice(0, 6)
  knowledge.formulas = knowledge.formulas.slice(0, 4)
  knowledge.examples = knowledge.examples.slice(0, 3)
  knowledge.quizQuestions = knowledge.quizQuestions.slice(0, 20)

  return knowledge
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSE GENERATORS
// ═══════════════════════════════════════════════════════════════════

export function generateExplainResponse(knowledge, query) {
  if (!knowledge) return fallbackResponse(query)

  const parts = []
  const title = knowledge.title

  // Opening
  parts.push({
    type: 'heading',
    text: `📖 ${title}`,
  })

  // Key definition / first fact
  if (knowledge.keyFacts.length > 0) {
    parts.push({ type: 'text', text: knowledge.keyFacts[0] })
  }

  // Additional key facts
  if (knowledge.keyFacts.length > 1) {
    parts.push({
      type: 'list',
      title: '🔑 Key Points',
      items: knowledge.keyFacts.slice(1, 4),
    })
  }

  // Formulas if any
  if (knowledge.formulas.length > 0) {
    parts.push({
      type: 'formula',
      title: '📐 Key Formulas',
      items: knowledge.formulas.map(f => `${f.label}: ${f.content}`),
    })
  }

  // Example if any
  if (knowledge.examples.length > 0) {
    const ex = knowledge.examples[0]
    parts.push({
      type: 'example',
      title: `💡 Example: ${ex.title}`,
      text: ex.body,
    })
  }

  // Follow-up suggestions
  parts.push({
    type: 'suggestions',
    items: [
      `Quiz me on ${knowledge.title}`,
      `Give me an example of ${knowledge.title}`,
      `What is the formula for ${knowledge.title}`,
    ],
  })

  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

export function generateCalculateResponse(knowledge, query) {
  if (!knowledge) return fallbackResponse(query)

  const parts = []

  parts.push({ type: 'heading', text: `🔢 How to Calculate: ${knowledge.title}` })

  if (knowledge.formulas.length > 0) {
    parts.push({
      type: 'formula',
      title: '📐 Formula(s)',
      items: knowledge.formulas.map(f => f.content),
    })

    // Step-by-step method
    parts.push({
      type: 'list',
      title: '📋 Method (Step by Step)',
      items: [
        '1. Read the question and identify what is given (known values)',
        '2. Identify what you need to find (the unknown)',
        '3. Choose the correct formula from above',
        '4. Substitute the known values into the formula',
        '5. Solve for the unknown and write the correct unit',
      ],
    })
  } else {
    parts.push({
      type: 'text',
      text: knowledge.keyFacts[0] || `Here are the key things to know about ${knowledge.title}:`,
    })
    if (knowledge.keyFacts.length > 1) {
      parts.push({ type: 'list', items: knowledge.keyFacts.slice(1, 4) })
    }
  }

  // Worked example
  if (knowledge.examples.length > 0) {
    parts.push({
      type: 'example',
      title: `💡 Worked Example`,
      text: knowledge.examples[0].body,
    })
  }

  parts.push({
    type: 'suggestions',
    items: [
      `Quiz me on ${knowledge.title}`,
      `Explain ${knowledge.title} in simple terms`,
      `What are common mistakes in ${knowledge.title}?`,
    ],
  })

  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

export function generateQuizResponse(knowledge, existingSession = null) {
  if (!knowledge || knowledge.quizQuestions.length === 0) {
    return {
      parts: [{ type: 'text', text: `I don't have quiz questions for that topic yet. Try asking me to explain it instead!` }],
      quizMode: false,
    }
  }

  // Pick a random question not in existing session
  const used = existingSession?.usedIds || new Set()
  const available = knowledge.quizQuestions.filter(q => !used.has(q.id))
  const pool = available.length > 0 ? available : knowledge.quizQuestions
  const q = pool[Math.floor(Math.random() * pool.length)]

  return {
    parts: [
      { type: 'heading', text: `❓ Quiz: ${knowledge.title}` },
      { type: 'quiz_question', question: q.question, options: q.options, answer: q.answer, explanation: q.explanation, id: q.id },
    ],
    quizMode: true,
    currentQuestion: q,
    topic: knowledge.topic,
    subject: knowledge.subject,
    newUsedId: q.id,
  }
}

export function generateHintResponse(knowledge, query) {
  const parts = []

  if (!knowledge) {
    // Generic stuck response
    parts.push({ type: 'heading', text: '💡 Let me help you' })
    parts.push({
      type: 'list',
      title: 'General tips when you are stuck:',
      items: [
        'Re-read the question carefully — what is it actually asking?',
        'List everything the question gives you (the known values)',
        'Think about which topic this question relates to',
        'Look back at the lesson examples for a similar solved problem',
        'Try eliminating wrong options first in multiple-choice questions',
      ],
    })
    parts.push({
      type: 'suggestions',
      items: ['Explain algebra', 'Explain photosynthesis', 'Quiz me on forces'],
    })
    return { parts }
  }

  parts.push({ type: 'heading', text: `💡 Hint: ${knowledge.title}` })

  // Socratic approach — don't give the answer, give a direction
  const hints = [
    `Start by asking yourself: what do I already know about ${knowledge.title}?`,
    knowledge.keyFacts[0] ? `Key idea to remember: ${knowledge.keyFacts[0]}` : null,
    knowledge.formulas[0] ? `Think about this formula: ${knowledge.formulas[0].content}` : null,
    `If you are stuck on a calculation, write down all the values the question gives you, then find the formula that connects them.`,
  ].filter(Boolean)

  parts.push({ type: 'list', title: 'Think about these hints:', items: hints })

  if (knowledge.examples.length > 0) {
    parts.push({
      type: 'example',
      title: `💡 Similar Example`,
      text: knowledge.examples[0].body,
    })
  }

  parts.push({
    type: 'suggestions',
    items: [
      `Explain ${knowledge.title} fully`,
      `Quiz me on ${knowledge.title}`,
      `Show me the formula for ${knowledge.title}`,
    ],
  })

  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

// ═══════════════════════════════════════════════════════════════════
// SPECIAL RESPONSES
// ═══════════════════════════════════════════════════════════════════

export function generateGreetResponse(studentName) {
  const greetings = [
    `Hello ${studentName || 'there'}! 👋 I am Elimu AI — your study assistant.\n\nI can help you with:\n• **Explain** any topic (e.g. "What is osmosis?")\n• **Calculate** step by step (e.g. "How do I find force?")\n• **Quiz** you on any topic (e.g. "Quiz me on algebra")\n• **Hints** when you are stuck (e.g. "I don't understand cells")\n\nWhat would you like to learn today?`,
  ]
  return {
    parts: [{ type: 'text', text: greetings[0] }],
    suggestions: ['Explain photosynthesis', 'Quiz me on forces', 'How do I calculate speed?', 'I am stuck on algebra'],
  }
}

export function generateThanksResponse() {
  const msgs = [
    'You\'re welcome! 😊 Keep up the great work. What else would you like to learn?',
    'Happy to help! 🌟 Is there another topic you want to explore?',
    'Great! 🚀 Remember — every question you ask makes you smarter. What\'s next?',
  ]
  return {
    parts: [{ type: 'text', text: msgs[Math.floor(Math.random() * msgs.length)] }],
    suggestions: ['Explain photosynthesis', 'Quiz me on algebra', 'How do I calculate force?'],
  }
}

function fallbackResponse(query) {
  return {
    parts: [
      { type: 'heading', text: '🤔 I\'m not sure about that one' },
      {
        type: 'text',
        text: `I couldn\'t find "${query}" in the curriculum. Try being more specific, for example:\n• "What is photosynthesis?"\n• "Explain quadratic equations"\n• "Quiz me on forces"`,
      },
      {
        type: 'suggestions',
        items: ['Explain photosynthesis', 'Explain algebra', 'Quiz me on cells', 'How do I calculate force?'],
      },
    ],
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUIZ ANSWER CHECKER
// ═══════════════════════════════════════════════════════════════════

export function checkQuizAnswer(userInput, currentQuestion) {
  if (!currentQuestion) return null

  const input = userInput.trim().toLowerCase()
  const opts  = currentQuestion.options || []
  const answer = currentQuestion.answer || ''

  // Match by option letter (A/B/C/D)
  const letterMatch = input.match(/^([abcd])[\s.)]*$/)
  if (letterMatch) {
    const idx = 'abcd'.indexOf(letterMatch[1])
    const chosen = opts[idx]
    const correct = chosen === answer
    return { correct, chosen, answer, explanation: currentQuestion.explanation }
  }

  // Match by typing the answer text
  const answerLow = answer.toLowerCase()
  const correct   = input === answerLow || answerLow.startsWith(input) || input.startsWith(answerLow)
  return { correct, chosen: userInput, answer, explanation: currentQuestion.explanation }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CHAT PROCESSOR
// ═══════════════════════════════════════════════════════════════════

export async function processMessage(input, context = {}) {
  const { intent, match } = classifyIntent(input)
  const topicResult       = extractTopic(input)

  // Handle quiz answer if in quiz mode
  if (context.quizMode && context.currentQuestion) {
    const result = checkQuizAnswer(input, context.currentQuestion)
    if (result) {
      const parts = []
      if (result.correct) {
        parts.push({ type: 'correct', text: `✅ Correct! "${result.answer}" is right.` })
        if (result.explanation) parts.push({ type: 'text', text: `💡 ${result.explanation}` })
        parts.push({
          type: 'suggestions',
          items: [`Another question on ${context.topic?.replace(/_/g,' ')}`, `Explain ${context.topic?.replace(/_/g,' ')}`, 'Quiz me on something else'],
        })
      } else {
        parts.push({ type: 'wrong', text: `❌ Not quite. The correct answer is: "${result.answer}"` })
        if (result.explanation) parts.push({ type: 'text', text: `💡 ${result.explanation}` })
        parts.push({
          type: 'suggestions',
          items: [`Try another question on ${context.topic?.replace(/_/g,' ')}`, `Explain ${context.topic?.replace(/_/g,' ')} to me`, 'Quiz me on a different topic'],
        })
      }
      return { parts, quizMode: false, wasAnswer: true, correct: result.correct }
    }
  }

  // Handle special intents
  if (intent === 'GREET')   return generateGreetResponse(context.studentName)
  if (intent === 'THANKS')  return generateThanksResponse()

  // Load curriculum knowledge
  let knowledge = null
  if (topicResult) {
    knowledge = await loadTopicKnowledge(topicResult.topic, topicResult.subject)
  }

  // Generate response by intent
  switch (intent) {
    case 'EXPLAIN':
      return generateExplainResponse(knowledge, input)
    case 'CALCULATE':
      return generateCalculateResponse(knowledge, input)
    case 'QUIZ':
      return generateQuizResponse(knowledge, context.quizSession)
    case 'HINT':
      return generateHintResponse(knowledge, input)
    case 'RECOMMEND':
      return {
        parts: [
          { type: 'heading', text: '🗺️ Study Recommendation' },
          { type: 'text', text: 'Open the 🧠 AI Tutor from the navbar for personalised recommendations based on your quiz history.' },
          { type: 'suggestions', items: ['Explain algebra', 'Quiz me on cells', 'How do I calculate velocity?'] },
        ],
      }
    default:
      return generateExplainResponse(knowledge, input)
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUICK-ACCESS TOPIC LIST (for suggestion chips)
// ═══════════════════════════════════════════════════════════════════

export const QUICK_TOPICS = [
  { label: '📐 Algebra',        query: 'Explain algebra' },
  { label: '⚛️ Cells',          query: 'What is a cell?' },
  { label: '⚡ Forces',         query: 'Explain forces' },
  { label: '🧪 Acids & Bases',  query: 'What are acids and bases?' },
  { label: '🌿 Photosynthesis', query: 'Explain photosynthesis' },
  { label: '🔢 Quadratics',     query: 'Explain quadratic equations' },
  { label: '💧 Osmosis',        query: 'What is osmosis?' },
  { label: '⚡ Electricity',    query: 'Explain electricity' },
  { label: '🧬 DNA & Genetics', query: 'Explain genetics' },
  { label: '🔥 Energy',         query: 'Explain energy' },
  { label: '🌊 Waves',          query: 'Explain waves' },
  { label: '⚗️ Moles',          query: 'How do I calculate moles?' },
]
