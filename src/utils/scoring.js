// scoring.js
export function calculateScore(answers, questions) {
  if (!questions.length) return 0
  const correct = answers.filter((a, i) => a === questions[i].answer).length
  return Math.round((correct / questions.length) * 100)
}

export function getGrade(score) {
  if (score >= 80) return { grade: 'A', label: 'Excellent!', color: 'text-emerald-400' }
  if (score >= 70) return { grade: 'B', label: 'Good Work!', color: 'text-teal-400' }
  if (score >= 60) return { grade: 'C', label: 'Keep Going', color: 'text-yellow-400' }
  if (score >= 50) return { grade: 'D', label: 'Try Again', color: 'text-orange-400' }
  return { grade: 'F', label: 'Need More Study', color: 'text-red-400' }
}

export function getXpForScore(score) {
  if (score >= 90) return 100
  if (score >= 70) return 50
  if (score >= 50) return 25
  return 10
}
