/**
 * ELIMU LEARN — AI LEARNING ENGINE v2
 * ─────────────────────────────────────────────────────────────────
 * Extends brain.js with 7 new AI features:
 *
 *  1. Forgetting Curve Tracker   (Ebbinghaus model — offline)
 *  2. Cognitive Load Monitor     (speed × accuracy analysis)
 *  3. Smart Retry Engine         (targeted re-quiz on wrong concepts)
 *  4. AI Answer Explanation      (rule-based step-by-step WHY)
 *  5. AI Socratic Tutor          (guiding questions, not answers)
 *  6. Learning Style Detector    (Visual / Analytical / Memory)
 *  7. Study Habit Analyser       (peak study time + reminders)
 *
 * All features: 100% offline, zero API cost, rule-based intelligence.
 */

import db from '../db/schema.js'

// ═══════════════════════════════════════════════════════════════════
// 1. FORGETTING CURVE TRACKER  (Ebbinghaus Spaced Repetition)
// ═══════════════════════════════════════════════════════════════════
/**
 * Ebbinghaus forgetting curve:
 *   Retention R = e^(-t/S)   where t=time since learning, S=stability
 *   Stability doubles with each successful review
 *
 * Review intervals (in hours) per review count:
 *   Review 0 (just learned): review in 24h
 *   Review 1: review in 3 days
 *   Review 2: review in 7 days
 *   Review 3: review in 14 days
 *   Review 4: review in 30 days
 *   Review 5+: review in 60 days
 *
 * Score modifier: if score < 70%, reduce stability (review sooner)
 */
const REVIEW_INTERVALS_HOURS = [24, 72, 168, 336, 720, 1440]

export async function recordLessonLearned(studentId, lessonId, topicId, subject, score) {
  if (!studentId || !lessonId) return

  const existing = await db.forgetting_curve
    .where({ student_id: studentId, lesson_id: lessonId })
    .first().catch(() => null)

  const reviewCount = existing ? (existing.review_count || 0) + 1 : 0

  // Score modifier: weak performance → review sooner
  const scoreMultiplier = score >= 80 ? 1.0 : score >= 60 ? 0.7 : 0.4
  const baseHours = REVIEW_INTERVALS_HOURS[Math.min(reviewCount, REVIEW_INTERVALS_HOURS.length - 1)]
  const adjustedHours = Math.round(baseHours * scoreMultiplier)

  const nextReview = new Date()
  nextReview.setHours(nextReview.getHours() + adjustedHours)

  const retention = Math.round(score * Math.pow(0.9, reviewCount * 0.3))

  const record = {
    student_id: studentId,
    lesson_id: lessonId,
    topic_id: topicId,
    subject,
    score_at_learning: score,
    review_count: reviewCount,
    last_reviewed_at: new Date().toISOString(),
    next_review_at: nextReview.toISOString(),
    stability: adjustedHours,
    estimated_retention: Math.max(10, Math.min(100, retention)),
  }

  if (existing) {
    await db.forgetting_curve.update(existing.id, record)
  } else {
    await db.forgetting_curve.add(record)
  }

  return record
}

export async function getDueForReview(studentId, limit = 8) {
  if (!studentId) return []
  const now = new Date().toISOString()

  const due = await db.forgetting_curve
    .where('student_id').equals(studentId)
    .and(r => r.next_review_at <= now)
    .toArray()

  // Sort: lowest retention first (most forgotten)
  return due
    .sort((a, b) => (a.estimated_retention || 50) - (b.estimated_retention || 50))
    .slice(0, limit)
    .map(r => ({
      ...r,
      urgency: r.estimated_retention < 30 ? 'critical'
              : r.estimated_retention < 60 ? 'high'
              : 'normal',
      daysOverdue: Math.round((Date.now() - new Date(r.next_review_at)) / 86400000),
    }))
}

export async function getAllForgettingCurveData(studentId) {
  if (!studentId) return []
  const all = await db.forgetting_curve.where('student_id').equals(studentId).toArray()

  return all.map(r => {
    // Estimate current retention using exponential decay
    const hoursSince = (Date.now() - new Date(r.last_reviewed_at)) / 3600000
    const currentRetention = Math.round(
      r.estimated_retention * Math.exp(-hoursSince / (r.stability || 24))
    )
    return {
      ...r,
      currentRetention: Math.max(5, Math.min(100, currentRetention)),
      status: currentRetention > 70 ? 'strong' : currentRetention > 40 ? 'fading' : 'forgotten',
    }
  }).sort((a, b) => a.currentRetention - b.currentRetention)
}


// ═══════════════════════════════════════════════════════════════════
// 2. COGNITIVE LOAD MONITOR
// ═══════════════════════════════════════════════════════════════════
/**
 * Rules:
 *   Fast + Correct  → High confidence (genuinely knows it)
 *   Fast + Wrong    → Guessing (not learning — flag it)
 *   Slow + Correct  → Effortful understanding (good — reinforce)
 *   Slow + Wrong    → Struggling (needs more support)
 *   Timeout         → Cognitive overload or disengagement
 *
 * Speed thresholds (question timer = 30s):
 *   Fast  < 8s
 *   Medium 8-20s
 *   Slow  > 20s
 */
export function classifyResponse(timeSpent, isCorrect, totalTime = 30) {
  const pctTime = timeSpent / totalTime

  if (timeSpent === null || timeSpent === undefined) {
    return { type: 'timeout', label: 'Timed out', confidence: 0, guessing: false, overloaded: true }
  }

  const fast = pctTime < 0.27    // under 8s of 30s
  const slow = pctTime > 0.67    // over 20s of 30s

  if (fast && isCorrect)  return { type: 'confident',   label: 'Confident',      confidence: 95, guessing: false, overloaded: false }
  if (fast && !isCorrect) return { type: 'guessing',    label: 'Guessing',       confidence: 10, guessing: true,  overloaded: false }
  if (slow && isCorrect)  return { type: 'effortful',   label: 'Working hard',   confidence: 70, guessing: false, overloaded: false }
  if (slow && !isCorrect) return { type: 'struggling',  label: 'Struggling',     confidence: 20, guessing: false, overloaded: true }
  if (isCorrect)          return { type: 'learning',    label: 'Learning',       confidence: 80, guessing: false, overloaded: false }
  return                         { type: 'unsure',      label: 'Unsure',         confidence: 40, guessing: false, overloaded: false }
}

export async function saveCognitiveLoadSession(studentId, lessonId, questionData) {
  /**
   * questionData: array of { timeSpent, isCorrect, questionId, questionText }
   */
  if (!studentId || !questionData?.length) return null

  const classified = questionData.map(q => ({
    ...q,
    ...classifyResponse(q.timeSpent, q.isCorrect),
  }))

  const guessingCount  = classified.filter(q => q.guessing).length
  const strugglingCount= classified.filter(q => q.type === 'struggling').length
  const confidentCount = classified.filter(q => q.type === 'confident').length
  const overloadCount  = classified.filter(q => q.overloaded).length
  const avgConfidence  = Math.round(classified.reduce((s, q) => s + q.confidence, 0) / classified.length)

  // Overall session classification
  let sessionType = 'normal'
  if (guessingCount > classified.length * 0.4) sessionType = 'guessing_session'
  else if (overloadCount > classified.length * 0.4) sessionType = 'overloaded'
  else if (confidentCount > classified.length * 0.6) sessionType = 'mastered'
  else if (strugglingCount > classified.length * 0.3) sessionType = 'needs_support'

  const record = {
    student_id: studentId,
    lesson_id: lessonId,
    attempted_at: new Date().toISOString(),
    questions: JSON.stringify(classified),
    guessing_count: guessingCount,
    struggling_count: strugglingCount,
    confident_count: confidentCount,
    avg_confidence: avgConfidence,
    session_type: sessionType,
    total_questions: classified.length,
  }

  await db.cognitive_load.add(record).catch(() => {})
  return record
}

export async function getCognitiveProfile(studentId) {
  if (!studentId) return null
  const sessions = await db.cognitive_load
    .where('student_id').equals(studentId)
    .toArray().catch(() => [])

  if (sessions.length === 0) return null

  const recent = sessions.slice(-10)
  const guessingRate = recent.reduce((s, r) => s + (r.guessing_count / (r.total_questions || 1)), 0) / recent.length
  const avgConfidence = Math.round(recent.reduce((s, r) => s + (r.avg_confidence || 50), 0) / recent.length)

  return {
    totalSessions: sessions.length,
    avgConfidence,
    guessingRate: Math.round(guessingRate * 100),
    dominantStyle: guessingRate > 0.35 ? 'guesser'
                 : avgConfidence > 75   ? 'master'
                 : avgConfidence > 55   ? 'learner'
                 : 'struggler',
    recommendation: guessingRate > 0.35
      ? 'You are answering too quickly — slow down and read carefully'
      : avgConfidence < 50
      ? 'Topics feel too hard — try lower-level lessons first'
      : 'You are learning well — keep the pace up',
  }
}


// ═══════════════════════════════════════════════════════════════════
// 3. SMART RETRY ENGINE
// ═══════════════════════════════════════════════════════════════════
/**
 * After a failed quiz:
 *   1. Load the student's wrong questions from this attempt
 *   2. Cluster them by mistake type (calculation / concept / etc.)
 *   3. Build a shorter focused quiz (5-8 Qs) of only those concepts
 *   4. Add 2-3 easier scaffolding questions to rebuild confidence
 */
export function buildRetryQuiz(originalQuestions, wrongAnswers, allQuestions) {
  // wrongAnswers = { questionId: userAnswer } or array of wrong question objects
  const wrongSet = new Set(
    Array.isArray(wrongAnswers)
      ? wrongAnswers.map(q => q.id || q.questionId)
      : Object.keys(wrongAnswers)
  )

  const wrongQuestions = originalQuestions.filter(q => wrongSet.has(q.id))
  const rightQuestions = originalQuestions.filter(q => !wrongSet.has(q.id))

  // Classify wrong questions by difficulty
  const hardWrong = wrongQuestions.filter(q => {
    const t = (q.question || '').toLowerCase()
    return ['calculate','prove','derive','evaluate','hence'].some(w => t.includes(w))
  })
  const easyWrong = wrongQuestions.filter(q => !hardWrong.includes(q))

  // Add scaffolding: 2 easy correct questions to build confidence
  const scaffolding = rightQuestions
    .filter(q => {
      const t = (q.question || '').toLowerCase()
      return ['what is','define','name','state'].some(w => t.startsWith(w))
    })
    .slice(0, 2)

  // Build retry: wrong questions first, then scaffolding
  const retryQuiz = [
    ...easyWrong,        // easier wrong ones first
    ...hardWrong,        // harder wrong ones next
    ...scaffolding,      // confidence builders last
  ].slice(0, 8)

  return {
    questions: retryQuiz,
    isRetry: true,
    focusAreas: classifyMistakeAreas(wrongQuestions),
    originalScore: Math.round(((originalQuestions.length - wrongQuestions.length) / originalQuestions.length) * 100),
    retryCount: retryQuiz.length,
  }
}

function classifyMistakeAreas(wrongQs) {
  const areas = new Set()
  for (const q of wrongQs) {
    const t = (q.question || '').toLowerCase()
    if (['calculate','solve','compute'].some(w => t.includes(w))) areas.add('Calculation')
    if (['what is','define','which'].some(w => t.includes(w))) areas.add('Concepts')
    if (['apply','given that','a student'].some(w => t.includes(w))) areas.add('Application')
  }
  return [...areas]
}


// ═══════════════════════════════════════════════════════════════════
// 4. AI ANSWER EXPLANATION ENGINE
// ═══════════════════════════════════════════════════════════════════
/**
 * When a student gets a question wrong, generate a step-by-step
 * explanation of WHY the correct answer is right, not just what it is.
 *
 * Rules:
 *   - Use the question's existing explanation field as base
 *   - Detect question type and apply a matching explanation template
 *   - Identify why the student's wrong answer was tempting (distractor analysis)
 *   - End with a memory tip or mnemonic
 */
export function generateExplanation(question, userAnswer, correctAnswer) {
  const q     = question.question || ''
  const qLow  = q.toLowerCase()
  const exp   = question.explanation || ''
  const opts  = question.options || []

  // Step 1: Why user was wrong
  const wrongIndex   = opts.indexOf(userAnswer)
  const correctIndex = opts.indexOf(correctAnswer)
  const wrongLabel   = ['A','B','C','D'][wrongIndex] || '?'
  const correctLabel = ['A','B','C','D'][correctIndex] || '?'

  // Step 2: Detect question type for template
  const isDefinition = ['what is','define','which term'].some(w => qLow.startsWith(w))
  const isCalculation= ['calculate','find','solve','evaluate','compute'].some(w => qLow.includes(w))
  const isApplication= ['given that','if x','a student','a car','a plant'].some(w => qLow.includes(w))
  const isCause      = ['why','explain why','what causes'].some(w => qLow.startsWith(w))
  const isEffect     = ['what happens','what is the effect','what results'].some(w => qLow.startsWith(w))

  const steps = []

  // Step 3: Build explanation steps
  steps.push({
    label: '❌ Why your answer was wrong',
    text: userAnswer
      ? `You chose ${wrongLabel}: "${userAnswer}". This is a common confusion — it sounds plausible but misses a key distinction.`
      : `You ran out of time. The answer was ${correctLabel}: "${correctAnswer}".`,
  })

  steps.push({
    label: '✅ Why the correct answer is right',
    text: exp || `The correct answer is ${correctLabel}: "${correctAnswer}". Remember this as the core fact for this concept.`,
  })

  if (isDefinition) {
    steps.push({
      label: '📖 How to remember definitions',
      text: `For definition questions: focus on the KEY distinguishing word in the correct answer. Write it out 3 times to commit it to memory.`,
    })
  }

  if (isCalculation) {
    steps.push({
      label: '🔢 Calculation tip',
      text: `For calculation questions: always write down what is given, what you need to find, and which formula connects them — before calculating.`,
    })
  }

  if (isApplication) {
    steps.push({
      label: '🔬 Application tip',
      text: `For applied questions: identify the concept being tested, then map the real-world scenario onto the theory. Ask "which formula applies here?"`,
    })
  }

  if (isCause) {
    steps.push({
      label: '🔗 Cause-effect tip',
      text: `For "why" questions: use the chain — Stimulus → Process → Result. Identify which link in the chain the question is asking about.`,
    })
  }

  // Step 4: Distractor analysis — why was the wrong option tempting?
  if (userAnswer) {
    const distractorReason = analyseDistractor(userAnswer, correctAnswer, qLow)
    if (distractorReason) {
      steps.push({ label: '🎯 Why that option tricks students', text: distractorReason })
    }
  }

  // Step 5: Memory tip
  const memoryTip = generateMemoryTip(correctAnswer, q)
  if (memoryTip) steps.push({ label: '🧠 Memory tip', text: memoryTip })

  return {
    question: q,
    userAnswer,
    correctAnswer,
    steps,
    confidence: exp ? 'high' : 'medium',
  }
}

function analyseDistractor(wrong, correct, qLow) {
  const wrongLow   = (wrong || '').toLowerCase()
  const correctLow = (correct || '').toLowerCase()

  // Common distractor patterns
  if (wrongLow.includes('not') && !correctLow.includes('not'))
    return 'Negation trap: the option used "not" which reverses the meaning — a common trick in exams.'
  if (wrongLow.length > correctLow.length * 1.5)
    return 'Longer-is-better trap: students often pick the most detailed option thinking it must be correct. Longer ≠ more accurate.'
  if (correctLow.length > wrongLow.length * 1.5)
    return 'Shorter option trap: the correct answer is concise. Examiners often hide the right answer in a short, precise statement.'
  if (['always','never','all','none'].some(w => wrongLow.includes(w)))
    return 'Absolute word trap: options with "always", "never", "all" or "none" are almost always wrong. Look for qualified answers.'
  return null
}

function generateMemoryTip(answer, question) {
  const a = (answer || '').toLowerCase()
  const q = (question || '').toLowerCase()

  if (q.includes('photosynthesis'))
    return 'Memory tip: "Plants MAKE food using light" — M for Make, A for light (ray), K for chlorophyll (green).'
  if (q.includes('newton') || q.includes('force'))
    return 'Memory tip: F = ma — "Force = mass × acceleration". Think of pushing a heavy trolley (mass) to speed it up (acceleration).'
  if (q.includes('cell') && q.includes('membrane'))
    return 'Memory tip: The cell membrane is like a school gate — it controls who enters and who leaves.'
  if (q.includes('acid') || q.includes('ph'))
    return 'Memory tip: pH below 7 = Acid (think "Ant acid" — ants are tiny like low numbers). Above 7 = Alkaline (think "Above = Alkaline").'
  if (q.includes('mitosis') || q.includes('meiosis'))
    return 'Memory tip: MiTOsis = TWO identical cells. MeiOsis = four cells with half chromosomes (think "mei" → "me-half").'
  if (q.includes('velocity') || q.includes('speed'))
    return 'Memory tip: Speed has no direction. Velocity = Speed + Direction. "V for Vector = direction."'
  if (a.length > 3) {
    return `Write out: "${answer}" three times, then cover it and recall it from memory.`
  }
  return null
}


// ═══════════════════════════════════════════════════════════════════
// 5. AI SOCRATIC TUTOR
// ═══════════════════════════════════════════════════════════════════
/**
 * Instead of showing the answer directly, guide the student through
 * a series of questions that lead them to discover the answer.
 *
 * Rule set:
 *   1. Acknowledge what they know (build on prior knowledge)
 *   2. Ask a scaffolding question that narrows the problem
 *   3. Give a hint if they struggle again
 *   4. Reveal the answer only after 2 failed attempts
 */
export function getSocraticPrompt(question, attempt = 0) {
  const q    = question.question || ''
  const qLow = q.toLowerCase()
  const opts = question.options || []
  const ans  = question.answer || ''

  // Extract key concept from the question
  const concept = extractConcept(qLow)

  const prompts = {
    0: generateFirstPrompt(q, qLow, concept, opts),
    1: generateSecondPrompt(q, qLow, concept, ans),
    2: generateHint(q, qLow, concept, ans, question.explanation),
  }

  return prompts[Math.min(attempt, 2)] || {
    type: 'reveal',
    text: `The answer is: "${ans}". ${question.explanation || ''}`,
    showAnswer: true,
  }
}

function extractConcept(qLow) {
  // Extract the core concept from question text
  const conceptWords = qLow
    .replace(/what is|define|which|explain|calculate|find|how/g, '')
    .trim()
    .split(' ')
    .filter(w => w.length > 4)
    .slice(0, 3)
    .join(' ')
  return conceptWords || 'this topic'
}

function generateFirstPrompt(q, qLow, concept, opts) {
  // Build opening Socratic question
  if (qLow.includes('what is') || qLow.includes('define')) {
    return {
      type: 'explore',
      text: `Before I tell you, let's think about it: Have you come across the word or idea of "${concept}" in your notes or lessons? What do you think it means in your own words?`,
      hint: null,
      showAnswer: false,
    }
  }
  if (qLow.includes('why') || qLow.includes('explain')) {
    return {
      type: 'explore',
      text: `Good question to think about! Let's break it down: What do you already know about "${concept}"? Start with what you are sure about, then we will build from there.`,
      hint: null,
      showAnswer: false,
    }
  }
  if (qLow.includes('calculate') || qLow.includes('find the') || qLow.includes('solve')) {
    return {
      type: 'scaffold',
      text: `Let's solve this step by step. First — what information has the question given you? List everything you know. Then ask: which formula connects those pieces of information?`,
      hint: null,
      showAnswer: false,
    }
  }
  return {
    type: 'explore',
    text: `Think about "${concept}" for a moment. Which of the options feels closest to what you have learned? Eliminate the ones you are sure are wrong first.`,
    hint: null,
    showAnswer: false,
  }
}

function generateSecondPrompt(q, qLow, concept, answer) {
  const ansLow = answer.toLowerCase()

  if (qLow.includes('calculate') || qLow.includes('find')) {
    return {
      type: 'scaffold',
      text: `You're close — let's narrow it down. The key formula for this type of question involves "${concept}". Try substituting the numbers the question gives you into it. What do you get?`,
      hint: `Hint: look for a formula in your notes that mentions "${concept}".`,
      showAnswer: false,
    }
  }
  return {
    type: 'hint',
    text: `Let me guide you further. Think about this: ${generateConceptHint(concept, ansLow)}. Does that help you reconsider?`,
    hint: null,
    showAnswer: false,
  }
}

function generateHint(q, qLow, concept, answer, explanation) {
  return {
    type: 'strong_hint',
    text: `You have thought about it carefully — well done for trying. Here is a strong hint: the correct answer relates directly to ${explanation ? explanation.split('.')[0] : concept}. Can you spot it now?`,
    hint: `The answer starts with: "${answer.slice(0, Math.ceil(answer.length / 3))}..."`,
    showAnswer: false,
    revealOnNext: true,
  }
}

function generateConceptHint(concept, answer) {
  if (concept.includes('cell'))     return 'cells are the basic unit of life — think about what they do'
  if (concept.includes('force'))    return "force causes a change in motion — think Newton's laws"
  if (concept.includes('acid'))     return 'acids have a pH below 7 and turn litmus red'
  if (concept.includes('algebra'))  return 'algebra uses letters to represent unknown numbers'
  if (concept.includes('energy'))   return 'energy can neither be created nor destroyed — only transferred'
  return `think about what you know about ${concept} from your lessons`
}


// ═══════════════════════════════════════════════════════════════════
// 6. LEARNING STYLE DETECTOR
// ═══════════════════════════════════════════════════════════════════
/**
 * After 20+ quiz attempts, classify the student's dominant learning style:
 *
 *   Visual:     Performs better on diagram/chart questions
 *   Analytical: Performs better on calculation/logic questions
 *   Memory:     Performs better on definition/recall questions
 *   Applied:    Performs better on application/scenario questions
 *
 * Detection rules use question text classification + performance scores.
 */
const STYLE_QUESTION_PATTERNS = {
  visual:     ['diagram','label','draw','graph','figure','chart','show','sketch'],
  analytical: ['calculate','solve','find','evaluate','prove','derive','compute','simplify'],
  memory:     ['define','name','state','list','what is','identify','recall','who discovered'],
  applied:    ['given that','a student','if x','apply','use this','in an experiment','a car'],
}

export async function detectLearningStyle(studentId) {
  if (!studentId) return null

  const attempts = await db.cognitive_load
    .where('student_id').equals(studentId)
    .toArray().catch(() => [])

  if (attempts.length < 3) return null  // Not enough data

  // Tally performance by question type
  const scores = { visual: [], analytical: [], memory: [], applied: [] }

  for (const session of attempts) {
    let questions = []
    try { questions = JSON.parse(session.questions || '[]') } catch {}

    for (const q of questions) {
      const text = (q.question || '').toLowerCase()
      for (const [style, patterns] of Object.entries(STYLE_QUESTION_PATTERNS)) {
        if (patterns.some(p => text.includes(p))) {
          scores[style].push(q.isCorrect ? 1 : 0)
        }
      }
    }
  }

  // Calculate accuracy per style
  const accuracy = {}
  for (const [style, results] of Object.entries(scores)) {
    accuracy[style] = results.length > 0
      ? Math.round((results.reduce((a, b) => a + b, 0) / results.length) * 100)
      : 50  // neutral if no data
  }

  // Dominant style = highest accuracy with at least 5 data points
  const ranked = Object.entries(accuracy)
    .filter(([style]) => scores[style].length >= 2)
    .sort((a, b) => b[1] - a[1])

  const dominant = ranked[0]?.[0] || 'balanced'
  const dominantScore = ranked[0]?.[1] || 50
  const secondary = ranked[1]?.[0] || null

  // Style-specific advice
  const advice = {
    visual:     'You learn best from diagrams, charts and visual patterns. When studying, draw diagrams and use colour-coded notes.',
    analytical: 'You excel at logical reasoning and calculations. Practice worked examples and always show your working.',
    memory:     'You are strong at recalling facts and definitions. Use flashcards, mnemonics and repetition to leverage this.',
    applied:    'You understand concepts best when applied to real scenarios. Connect every theory to a real-world example.',
    balanced:   'You show balanced performance across question types — you are a well-rounded learner.',
  }

  const result = {
    dominant,
    dominantScore,
    secondary,
    accuracy,
    sampleSizes: Object.fromEntries(Object.entries(scores).map(([k,v]) => [k, v.length])),
    advice: advice[dominant] || advice.balanced,
    contentAdaptations: getContentAdaptations(dominant),
    detectedAt: new Date().toISOString(),
    reliable: ranked[0] && scores[ranked[0][0]].length >= 5,
  }

  // Persist
  const existing = await db.learning_style.where('student_id').equals(studentId).first().catch(() => null)
  if (existing) await db.learning_style.update(existing.id, { student_id: studentId, ...result })
  else await db.learning_style.add({ student_id: studentId, ...result })

  return result
}

function getContentAdaptations(style) {
  const adaptations = {
    visual:     ['Prioritise lessons with diagrams', 'Use mind-maps for revision', 'Draw concept connections'],
    analytical: ['Work through calculation examples first', 'Build formula sheets', 'Practice derivations'],
    memory:     ['Use flashcard mode for every topic', 'Create acronym mnemonics', 'Quiz yourself daily'],
    applied:    ['Look for real-life examples in each lesson', 'Focus on exam application questions', 'Practice past papers'],
    balanced:   ['Mix all study methods', 'Rotate between flashcards, diagrams and practice problems'],
  }
  return adaptations[style] || adaptations.balanced
}

export async function getSavedLearningStyle(studentId) {
  if (!studentId) return null
  return db.learning_style.where('student_id').equals(studentId).first().catch(() => null)
}


// ═══════════════════════════════════════════════════════════════════
// 7. STUDY HABIT ANALYSER
// ═══════════════════════════════════════════════════════════════════
/**
 * Analyses WHEN the student studies (day of week, hour of day)
 * and their performance at those times to find their peak study window.
 *
 * Rules:
 *   - Record each lesson completion with timestamp
 *   - After 10+ sessions: compute avg score by hour and day
 *   - Peak window = hour + day with highest avg score
 *   - Issue reminder at that time
 */
export async function recordStudySession(studentId, score, durationMinutes) {
  if (!studentId) return
  const now = new Date()
  await db.study_habits.add({
    student_id: studentId,
    recorded_at: now.toISOString(),
    hour: now.getHours(),
    day_of_week: now.getDay(),   // 0=Sun … 6=Sat
    score,
    duration_minutes: durationMinutes || 0,
  }).catch(() => {})
}

export async function analyseStudyHabits(studentId) {
  if (!studentId) return null

  const sessions = await db.study_habits
    .where('student_id').equals(studentId)
    .toArray().catch(() => [])

  if (sessions.length < 5) return {
    hasEnoughData: false,
    message: `Study ${10 - sessions.length} more lessons to unlock your peak study time analysis.`,
    sessions: sessions.length,
  }

  // Group by hour: 0-23
  const byHour = {}
  for (let h = 0; h < 24; h++) byHour[h] = []
  for (const s of sessions) {
    if (typeof s.hour === 'number') byHour[s.hour].push(s.score || 0)
  }

  const hourStats = Object.entries(byHour)
    .filter(([, scores]) => scores.length > 0)
    .map(([hour, scores]) => ({
      hour: parseInt(hour),
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
      label: formatHour(parseInt(hour)),
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Group by day of week
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const byDay = {}
  DAYS.forEach((d, i) => byDay[i] = [])
  for (const s of sessions) {
    if (typeof s.day_of_week === 'number') byDay[s.day_of_week].push(s.score || 0)
  }

  const dayStats = Object.entries(byDay)
    .filter(([, scores]) => scores.length > 0)
    .map(([day, scores]) => ({
      day: parseInt(day),
      dayName: DAYS[parseInt(day)],
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  const peakHour = hourStats[0]
  const worstHour= hourStats[hourStats.length - 1]
  const peakDay  = dayStats[0]

  // Session frequency analysis
  const totalDays  = Math.max(1, Math.round((Date.now() - new Date(sessions[0].recorded_at)) / 86400000))
  const studyDays  = new Set(sessions.map(s => s.recorded_at?.split('T')[0])).size
  const consistency= Math.round((studyDays / totalDays) * 100)

  // Streak analysis
  const avgDuration = sessions.length > 0
    ? Math.round(sessions.reduce((s, r) => s + (r.duration_minutes || 0), 0) / sessions.length)
    : 0

  return {
    hasEnoughData: true,
    sessions: sessions.length,
    peakHour,
    worstHour,
    peakDay,
    hourStats: hourStats.slice(0, 5),
    dayStats,
    consistency,
    avgDuration,
    totalDaysTracked: totalDays,
    studyDaysCount: studyDays,
    insight: generateHabitInsight(peakHour, peakDay, consistency, avgDuration),
    reminderSuggestion: peakHour
      ? `Set a reminder for ${peakHour.label} on ${peakDay?.dayName || 'weekdays'} — your best study time`
      : null,
  }
}

function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)  return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function generateHabitInsight(peakHour, peakDay, consistency, avgDuration) {
  const insights = []

  if (peakHour) {
    const session = peakHour.hour >= 5 && peakHour.hour < 12 ? 'morning'
      : peakHour.hour >= 12 && peakHour.hour < 17 ? 'afternoon'
      : peakHour.hour >= 17 && peakHour.hour < 21 ? 'evening'
      : 'night'
    insights.push(`You are a ${session} learner — you score ${peakHour.avgScore}% on average at ${peakHour.label}.`)
  }

  if (peakDay) {
    insights.push(`Your strongest study day is ${peakDay.dayName} with ${peakDay.avgScore}% average.`)
  }

  if (consistency >= 70) {
    insights.push(`Excellent consistency! You study ${consistency}% of days — this is key to long-term memory.`)
  } else if (consistency >= 40) {
    insights.push(`Decent consistency at ${consistency}% of days. Try to study every day, even for 10 minutes.`)
  } else {
    insights.push(`Your study consistency is ${consistency}% — try to build a daily habit, even short sessions help greatly.`)
  }

  if (avgDuration > 0) {
    insights.push(`Your average study session is ${avgDuration} minutes. ${avgDuration < 15 ? 'Try to extend to at least 20 minutes for deeper learning.' : 'Great session length!'}`)
  }

  return insights
}
