/**
 * ELIMU LEARN — AI BRAIN (Rule-Based Engine)
 * ─────────────────────────────────────────────
 * 100% offline. No API. No internet needed.
 * All intelligence derived from the student's own quiz and lesson data.
 *
 * Architecture:
 *   Raw progress data → Pattern Analyser → Weakness Profile
 *   Weakness Profile  → Smart Tutor, Adaptive Difficulty, Daily Mission,
 *                        Exam Predictor, Mistake Engine, Flashcard ranker
 */

import db from '../db/schema.js'

// ── Constants ─────────────────────────────────────────────────────
const SUBJECTS = ['mathematics', 'physics', 'biology', 'chemistry']

// UNEB exam topic weight map (rule-based: past paper frequency analysis)
// Higher = more likely to appear in national exams
const UNEB_WEIGHTS = {
  mathematics: {
    algebra: 0.92, linear_equations: 0.88, quadratic_equations: 0.85,
    geometry: 0.80, trigonometry: 0.78, statistics: 0.75,
    mensuration: 0.72, number_theory: 0.68, matrices: 0.82,
    calculus: 0.88, vectors: 0.76, probability: 0.70,
  },
  physics: {
    forces: 0.90, electricity: 0.92, waves: 0.85, optics: 0.80,
    thermodynamics: 0.78, mechanics: 0.88, magnetism: 0.82,
    nuclear_physics: 0.72, motion: 0.90, energy: 0.85,
  },
  biology: {
    cells: 0.92, genetics: 0.88, ecology: 0.80, photosynthesis: 0.85,
    respiration: 0.82, reproduction: 0.78, nutrition: 0.75,
    transport: 0.80, nervous_system: 0.76, classification: 0.70,
  },
  chemistry: {
    atomic_structure: 0.90, bonding: 0.88, reactions: 0.85,
    acids_bases: 0.82, organic_chemistry: 0.88, electrolysis: 0.78,
    rates: 0.75, equilibrium: 0.72, periodic_table: 0.80,
    stoichiometry: 0.85,
  },
}

// Mistake pattern classifiers (rule-based text matching)
const MISTAKE_PATTERNS = [
  { id: 'calculation',  label: 'Calculation Errors',    keywords: ['calculate','solve','find the value','compute','evaluate','simplify'] },
  { id: 'concept',      label: 'Conceptual Gaps',       keywords: ['what is','define','explain','describe','which of','what does'] },
  { id: 'application',  label: 'Application Problems',  keywords: ['apply','use','given that','a student','a car','a plant','if x'] },
  { id: 'memory',       label: 'Recall & Memory',       keywords: ['name','list','state','identify','recall','what are the'] },
  { id: 'diagram',      label: 'Diagram/Visual',        keywords: ['diagram','label','draw','show','figure','graph','chart'] },
]

// ── Core analyser ─────────────────────────────────────────────────
export async function analyseStudent(studentId) {
  if (!studentId) return null

  const [allProgress, quizAttempts, examResults] = await Promise.all([
    db.progress.where('student_id').equals(studentId).toArray(),
    db.quiz_attempts.where('student_id').equals(studentId).toArray(),
    db.exam_results.where('student_id').equals(studentId).toArray().catch(() => []),
  ])

  const completed = allProgress.filter(p => p.status === 'completed')
  const inProgress = allProgress.filter(p => p.status === 'in_progress')

  // ── Per-subject breakdown ─────────────────────────────────────
  const bySubject = {}
  for (const subj of SUBJECTS) {
    const sub = completed.filter(p => p.subject === subj)
    const scores = sub.map(p => p.best_score || 0)
    bySubject[subj] = {
      lessons:   sub.length,
      avgScore:  scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      topScore:  scores.length ? Math.max(...scores) : 0,
      lowScore:  scores.length ? Math.min(...scores) : 0,
      topics:    [...new Set(sub.map(p => p.topic_id))],
      weakTopics: sub.filter(p => (p.best_score || 0) < 60).map(p => p.topic_id),
      strongTopics: sub.filter(p => (p.best_score || 0) >= 80).map(p => p.topic_id),
    }
  }

  // ── Overall weakness score per subject (0-100, lower = weaker) ─
  const subjectStrength = {}
  for (const subj of SUBJECTS) {
    const s = bySubject[subj]
    if (s.lessons === 0) { subjectStrength[subj] = 0; continue }
    // Weighted: avg score 60%, consistency 20%, coverage 20%
    const consistency = s.topScore - s.lowScore   // lower spread = more consistent
    const consistencyScore = Math.max(0, 100 - consistency)
    subjectStrength[subj] = Math.round(
      s.avgScore * 0.6 + consistencyScore * 0.2 + Math.min(100, s.lessons * 5) * 0.2
    )
  }

  // ── Adaptive difficulty level per subject (1-5) ───────────────
  const adaptiveDifficulty = {}
  for (const subj of SUBJECTS) {
    const avg = bySubject[subj].avgScore
    if (avg >= 85) adaptiveDifficulty[subj] = 5       // Expert
    else if (avg >= 72) adaptiveDifficulty[subj] = 4  // Advanced
    else if (avg >= 60) adaptiveDifficulty[subj] = 3  // Intermediate
    else if (avg >= 45) adaptiveDifficulty[subj] = 2  // Developing
    else adaptiveDifficulty[subj] = 1                 // Foundation
  }

  // ── Identify weakest topics globally ─────────────────────────
  const allWeakTopics = completed
    .filter(p => (p.best_score || 0) < 65)
    .sort((a, b) => (a.best_score || 0) - (b.best_score || 0))
    .slice(0, 10)
    .map(p => ({ subject: p.subject, topic: p.topic_id, score: p.best_score || 0, lessonId: p.lesson_id }))

  // ── Mistake pattern analysis ──────────────────────────────────
  // Load recent quiz attempts with wrong answers
  const recentAttempts = quizAttempts
    .sort((a, b) => new Date(b.attempted_at) - new Date(a.attempted_at))
    .slice(0, 100)

  const mistakeCounts = {}
  MISTAKE_PATTERNS.forEach(p => { mistakeCounts[p.id] = 0 })

  for (const attempt of recentAttempts) {
    if (!attempt.wrong_questions) continue
    const wrongs = typeof attempt.wrong_questions === 'string'
      ? JSON.parse(attempt.wrong_questions) : attempt.wrong_questions
    for (const q of (wrongs || [])) {
      const qText = (q.question || '').toLowerCase()
      for (const pattern of MISTAKE_PATTERNS) {
        if (pattern.keywords.some(kw => qText.includes(kw))) {
          mistakeCounts[pattern.id]++
        }
      }
    }
  }

  const dominantMistakes = MISTAKE_PATTERNS
    .map(p => ({ ...p, count: mistakeCounts[p.id] }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  // ── Exam predictor: score UNEB weight × weakness ─────────────
  const examPredictions = {}
  for (const subj of SUBJECTS) {
    const weights = UNEB_WEIGHTS[subj] || {}
    const weak = new Set(bySubject[subj].weakTopics)
    const predictions = Object.entries(weights)
      .map(([topic, examWeight]) => {
        const studentScore = completed.find(p => p.subject === subj && p.topic_id === topic)?.best_score
        const mastery = studentScore !== undefined ? studentScore / 100 : 0.3
        const riskScore = examWeight * (1 - mastery)   // high = important + weak
        return { topic, examWeight, mastery: Math.round(mastery * 100), riskScore, isWeak: weak.has(topic) }
      })
      .sort((a, b) => b.riskScore - a.riskScore)
    examPredictions[subj] = predictions.slice(0, 5)   // top 5 at-risk topics
  }

  // ── Rolling 7-day activity ────────────────────────────────────
  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
  const recentLessons = completed.filter(p => p.completed_at && new Date(p.completed_at) >= weekAgo)
  const studyDaysThisWeek = new Set(recentLessons.map(p => p.completed_at?.split('T')[0])).size

  return {
    studentId,
    summary: {
      totalCompleted: completed.length,
      totalInProgress: inProgress.length,
      globalAvg: completed.length
        ? Math.round(completed.reduce((s, p) => s + (p.best_score || 0), 0) / completed.length) : 0,
      studyDaysThisWeek,
      streakRisk: studyDaysThisWeek < 3,   // hasn't studied enough this week
    },
    bySubject,
    subjectStrength,
    adaptiveDifficulty,
    allWeakTopics,
    dominantMistakes,
    examPredictions,
  }
}

// ── Smart Tutor: recommended lessons ─────────────────────────────
export function getSmartRecommendations(analysis, count = 5) {
  if (!analysis) return []
  const recs = []

  // Rule 1: Weak topics that have been attempted (retry)
  for (const weak of analysis.allWeakTopics.slice(0, 3)) {
    recs.push({
      type: 'retry', priority: 10 - (weak.score / 10),
      subject: weak.subject, topic: weak.topic,
      reason: `You scored ${weak.score}% — revision needed`,
      icon: '🔄', lessonId: weak.lessonId,
    })
  }

  // Rule 2: Weakest subject — suggest its next untried topic
  const weakestSubject = Object.entries(analysis.subjectStrength)
    .sort((a, b) => a[1] - b[1])[0]?.[0]
  if (weakestSubject) {
    recs.push({
      type: 'strengthen', priority: 8,
      subject: weakestSubject, topic: null,
      reason: `${weakestSubject} is your weakest subject — boost it`,
      icon: '💪',
    })
  }

  // Rule 3: High UNEB risk topics
  for (const [subj, preds] of Object.entries(analysis.examPredictions)) {
    const top = preds[0]
    if (top && top.mastery < 60) {
      recs.push({
        type: 'exam_risk', priority: 9,
        subject: subj, topic: top.topic,
        reason: `High chance in UNEB — only ${top.mastery}% mastery`,
        icon: '🎓',
      })
    }
  }

  // Rule 4: Hasn't studied in 2+ days
  if (analysis.summary.streakRisk) {
    recs.push({
      type: 'streak', priority: 7,
      subject: SUBJECTS[0], topic: null,
      reason: 'Keep your streak going — study today!',
      icon: '🔥',
    })
  }

  return recs
    .sort((a, b) => b.priority - a.priority)
    .slice(0, count)
}

// ── Daily Mission generator ───────────────────────────────────────
export function generateDailyMission(analysis) {
  if (!analysis) return null
  const today = new Date().toISOString().split('T')[0]

  // Seed missions from weak areas
  const weak = analysis.allWeakTopics
  const weakSubject = Object.entries(analysis.subjectStrength)
    .sort((a, b) => a[1] - b[1])[0]?.[0] || 'mathematics'
  const examRisk = Object.entries(analysis.examPredictions)
    .flatMap(([subj, preds]) => preds.slice(0, 1).map(p => ({ ...p, subject: subj })))
    .sort((a, b) => b.riskScore - a.riskScore)[0]

  const tasks = []

  // Task 1: Retry weakest topic quiz
  if (weak[0]) {
    tasks.push({
      id: 'retry_weak',
      type: 'quiz',
      icon: '🔄',
      title: `Retry ${weak[0].topic.replace(/_/g,' ')}`,
      subtitle: `You scored ${weak[0].score}% — aim for 70%+`,
      subject: weak[0].subject,
      topic: weak[0].topic,
      xpReward: 75,
      done: false,
    })
  } else {
    tasks.push({
      id: 'daily_lesson',
      type: 'lesson',
      icon: '📚',
      title: `Study ${weakSubject}`,
      subtitle: 'Complete any lesson in your weakest subject',
      subject: weakSubject,
      topic: null,
      xpReward: 50,
      done: false,
    })
  }

  // Task 2: Exam risk topic
  if (examRisk) {
    tasks.push({
      id: 'exam_prep',
      type: 'lesson',
      icon: '🎓',
      title: `Exam Prep: ${examRisk.topic.replace(/_/g,' ')}`,
      subtitle: `High UNEB probability · ${examRisk.mastery}% mastery`,
      subject: examRisk.subject,
      topic: examRisk.topic,
      xpReward: 100,
      done: false,
    })
  }

  // Task 3: Brain game
  tasks.push({
    id: 'brain_game',
    type: 'game',
    icon: '🎮',
    title: 'Play a Brain Game',
    subtitle: 'Any game in Space Academy',
    subject: null,
    topic: null,
    xpReward: 40,
    done: false,
  })

  return {
    date: today,
    tasks: tasks.slice(0, 3),
    totalXp: tasks.slice(0, 3).reduce((s, t) => s + t.xpReward, 0),
    generatedFrom: {
      weakestSubject,
      topWeakTopic: weak[0]?.topic,
      topExamRisk: examRisk?.topic,
    }
  }
}

// ── Adaptive difficulty: filter questions by level ────────────────
// diffLevel 1-5:
//   1 = Foundation   (first 25% of questions, recall-type)
//   2 = Developing   (first 50%)
//   3 = Intermediate (middle 50%)
//   4 = Advanced     (top 50%)
//   5 = Expert       (top 25%, application-heavy)
export function filterQuestionsByDifficulty(questions, diffLevel) {
  if (!questions || questions.length === 0) return []

  // Score each question by its estimated difficulty
  const scored = questions.map(q => {
    const text = (q.question || '').toLowerCase()
    let score = 50  // default medium

    // Rule: application questions are harder
    if (['apply','calculate','solve','prove','derive','evaluate'].some(w => text.includes(w))) score += 25
    // Rule: recall questions are easier
    if (['what is','define','name','state','list','which'].some(w => text.startsWith(w))) score -= 20
    // Rule: multi-step indicated by 'hence', 'therefore', 'show that'
    if (['hence','therefore','show that','it follows'].some(w => text.includes(w))) score += 30
    // Rule: longer questions tend to be harder
    score += Math.min(20, Math.floor(text.length / 40))

    return { ...q, _diffScore: Math.max(0, Math.min(100, score)) }
  }).sort((a, b) => a._diffScore - b._diffScore)

  const n = scored.length
  const ranges = {
    1: [0, Math.floor(n * 0.35)],
    2: [0, Math.floor(n * 0.55)],
    3: [Math.floor(n * 0.20), Math.floor(n * 0.80)],
    4: [Math.floor(n * 0.45), n],
    5: [Math.floor(n * 0.65), n],
  }
  const [lo, hi] = ranges[diffLevel] || [0, n]
  const pool = scored.slice(lo, hi)
  // Return shuffled selection of up to 20
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(20, shuffled.length))
}

// ── Flashcard generator from lesson content ───────────────────────
export function generateFlashcards(lesson, topicData) {
  const cards = []

  // Rule 1: generate from quiz Q&A
  const questions = lesson?.quiz?.questions || topicData?.quiz?.questions || []
  for (const q of questions.slice(0, 15)) {
    if (q.question && q.answer) {
      cards.push({
        id: `fc_q_${q.id || cards.length}`,
        type: 'qa',
        front: q.question,
        back: q.answer,
        hint: q.explanation || '',
        subject: topicData?.subject,
        topic: topicData?.topic_id,
        difficulty: 'medium',
        mastered: false,
      })
    }
  }

  // Rule 2: generate from content blocks (formulas & key terms)
  const content = lesson?.content || []
  for (const block of content) {
    if (block.type === 'formula' && block.content) {
      cards.push({
        id: `fc_f_${cards.length}`,
        type: 'formula',
        front: `What is the formula for: ${block.title || 'this concept'}?`,
        back: block.content,
        hint: block.explanation || '',
        subject: topicData?.subject,
        topic: topicData?.topic_id,
        difficulty: 'hard',
        mastered: false,
      })
    }
    if (block.type === 'definition' && block.term) {
      cards.push({
        id: `fc_d_${cards.length}`,
        type: 'definition',
        front: `Define: ${block.term}`,
        back: block.definition || block.content || '',
        hint: '',
        subject: topicData?.subject,
        topic: topicData?.topic_id,
        difficulty: 'easy',
        mastered: false,
      })
    }
  }

  return cards
}

// ── Spaced repetition sorter (Leitner-style rules) ────────────────
// Rule: cards seen recently and answered correctly move to "mastered"
// Rule: cards never seen or previously wrong come first
export function sortFlashcardsForReview(cards, masteredIds = new Set(), wrongIds = new Set()) {
  return [...cards].sort((a, b) => {
    const aWrong = wrongIds.has(a.id) ? -1 : 0
    const bWrong = wrongIds.has(b.id) ? -1 : 0
    const aMastered = masteredIds.has(a.id) ? 1 : 0
    const bMastered = masteredIds.has(b.id) ? 1 : 0
    return (aWrong - bWrong) || (aMastered - bMastered) || (a.difficulty === 'hard' ? -1 : 1)
  })
}

// ── Save quiz attempt with wrong questions (for mistake engine) ───
export async function saveDetailedAttempt(studentId, lessonId, questions, answers) {
  const wrongQuestions = questions
    .map((q, i) => answers[i] !== q.answer ? { question: q.question, userAnswer: answers[i], correct: q.answer } : null)
    .filter(Boolean)

  await db.quiz_attempts.add({
    student_id: studentId,
    lesson_id: lessonId,
    attempted_at: new Date().toISOString(),
    wrong_questions: JSON.stringify(wrongQuestions),
    total: questions.length,
    wrong: wrongQuestions.length,
    synced: false,
  })
}

// ── Persist daily mission completion ─────────────────────────────
export async function markMissionTaskDone(studentId, taskId, xpReward) {
  const today = new Date().toISOString().split('T')[0]
  const key = `mission_${studentId}_${today}`
  const existing = localStorage.getItem(key)
  const done = existing ? JSON.parse(existing) : []
  if (!done.includes(taskId)) {
    done.push(taskId)
    localStorage.setItem(key, JSON.stringify(done))
  }
  // Award XP
  const student = await db.students.get(studentId)
  if (student) {
    await db.students.update(studentId, { total_xp: (student.total_xp || 0) + xpReward })
  }
  return done
}

export function getMissionProgress(studentId) {
  const today = new Date().toISOString().split('T')[0]
  const key = `mission_${studentId}_${today}`
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
