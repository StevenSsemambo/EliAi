import db from './schema.js'

export const progressDB = {
  async getOrCreate(studentId, lessonId, subject, topicId) {
    let rec = await db.progress.where({ student_id: studentId, lesson_id: lessonId }).first()
    if (!rec) {
      const id = await db.progress.add({
        student_id: studentId, subject, topic_id: topicId, lesson_id: lessonId,
        status: 'not_started', score: 0, best_score: 0, attempts: 0,
        time_spent: 0, completed_at: null, synced: false
      })
      rec = await db.progress.get(id)
    }
    return rec
  },

  async markInProgress(studentId, lessonId) {
    const rec = await db.progress.where({ student_id: studentId, lesson_id: lessonId }).first()
    if (rec && rec.status === 'not_started') {
      await db.progress.update(rec.id, { status: 'in_progress', synced: false })
    }
  },

  async completeLesson(studentId, lessonId, score, timeSpent) {
    const rec = await db.progress.where({ student_id: studentId, lesson_id: lessonId }).first()
    if (rec) {
      const best = Math.max(rec.best_score || 0, score)
      await db.progress.update(rec.id, {
        status: 'completed', score, best_score: best,
        attempts: (rec.attempts || 0) + 1,
        time_spent: (rec.time_spent || 0) + timeSpent,
        completed_at: new Date().toISOString(), synced: false
      })
    }
    // Award XP
    const xpGain = score >= 70 ? 50 : 20
    const student = await db.students.get(studentId)
    if (student) {
      await db.students.update(studentId, {
        total_xp: (student.total_xp || 0) + xpGain,
        last_active: new Date().toISOString()
      })
    }
    return xpGain
  },

  async getSubjectProgress(studentId, subject) {
    return db.progress.where({ student_id: studentId, subject }).toArray()
  },

  async getAllProgress(studentId) {
    return db.progress.where('student_id').equals(studentId).toArray()
  },

  async getLessonProgress(studentId, lessonId) {
    return db.progress.where({ student_id: studentId, lesson_id: lessonId }).first()
  },

  async getStats(studentId) {
    const all = await db.progress.where('student_id').equals(studentId).toArray()
    const completed = all.filter(p => p.status === 'completed')
    const avgScore = completed.length
      ? Math.round(completed.reduce((s, p) => s + p.score, 0) / completed.length)
      : 0
    return { total: all.length, completed: completed.length, avgScore }
  }
}

export const bookmarkDB = {
  async toggle(studentId, lessonId) {
    const existing = await db.bookmarks.where({ student_id: studentId, lesson_id: lessonId }).first()
    if (existing) { await db.bookmarks.delete(existing.id); return false }
    else { await db.bookmarks.add({ student_id: studentId, lesson_id: lessonId, created_at: new Date().toISOString() }); return true }
  },
  async isBookmarked(studentId, lessonId) {
    const b = await db.bookmarks.where({ student_id: studentId, lesson_id: lessonId }).first()
    return !!b
  },
  async getAll(studentId) {
    return db.bookmarks.where('student_id').equals(studentId).toArray()
  }
}

export const quizDB = {
  async saveAttempt(studentId, lessonId, answers, score, timeTaken) {
    return db.quiz_attempts.add({
      student_id: studentId, lesson_id: lessonId,
      answers: JSON.stringify(answers), score, time_taken: timeTaken,
      attempted_at: new Date().toISOString(), synced: false
    })
  },
  async getAttempts(studentId, lessonId) {
    return db.quiz_attempts.where({ student_id: studentId, lesson_id: lessonId }).toArray()
  }
}

export const studentDB = {
  async create(name, classLevel, avatar) {
    const id = await db.students.add({
      name, class_level: classLevel, avatar,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      total_xp: 0, streak_days: 1, supabase_id: null
    })
    return db.students.get(id)
  },
  async get(id) { return db.students.get(id) },
  async getAll() { return db.students.toArray() },
  async update(id, data) { return db.students.update(id, data) },
  async updateStreak(id) {
    const student = await db.students.get(id)
    if (!student) return
    const last = new Date(student.last_active)
    const now = new Date()
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) await db.students.update(id, { streak_days: (student.streak_days || 0) + 1, last_active: now.toISOString() })
    else if (diffDays > 1) await db.students.update(id, { streak_days: 1, last_active: now.toISOString() })
    else await db.students.update(id, { last_active: now.toISOString() })
  }
}

export const achievementsDB = {
  BADGES: [
    // ── Lesson milestones ──────────────────────────────────────────
    { id:'first_lesson',    label:'First Step',        icon:'🎯', cat:'Learning',    desc:'Complete your first lesson',                    check:(p,s)=>p.filter(x=>x.status==='completed').length>=1 },
    { id:'five_lessons',    label:'Getting Started',   icon:'📚', cat:'Learning',    desc:'Complete 5 lessons',                            check:(p,s)=>p.filter(x=>x.status==='completed').length>=5 },
    { id:'ten_lessons',     label:'Scholar',           icon:'🏆', cat:'Learning',    desc:'Complete 10 lessons',                           check:(p,s)=>p.filter(x=>x.status==='completed').length>=10 },
    { id:'twenty_lessons',  label:'Dedicated Learner', icon:'📖', cat:'Learning',    desc:'Complete 20 lessons',                           check:(p,s)=>p.filter(x=>x.status==='completed').length>=20 },
    { id:'fifty_lessons',   label:'Knowledge Seeker',  icon:'🔭', cat:'Learning',    desc:'Complete 50 lessons',                           check:(p,s)=>p.filter(x=>x.status==='completed').length>=50 },
    { id:'hundred_lessons', label:'Century Scholar',   icon:'💯', cat:'Learning',    desc:'Complete 100 lessons',                          check:(p,s)=>p.filter(x=>x.status==='completed').length>=100 },

    // ── Quiz performance ───────────────────────────────────────────
    { id:'perfect_score',   label:'Perfectionist',     icon:'💯', cat:'Performance', desc:'Score 100% on a quiz',                          check:(p,s)=>p.some(x=>x.best_score===100) },
    { id:'five_perfect',    label:'Flawless',          icon:'✨', cat:'Performance', desc:'Score 100% on 5 different quizzes',             check:(p,s)=>p.filter(x=>x.best_score===100).length>=5 },
    { id:'high_scorer',     label:'High Achiever',     icon:'🎖️', cat:'Performance', desc:'Average score above 80% (min 5 lessons)',       check:(p,s)=>{ const c=p.filter(x=>x.status==='completed'); return c.length>=5&&c.reduce((a,x)=>a+x.score,0)/c.length>=80 } },
    { id:'consistent_80',   label:'Consistent Star',   icon:'⭐', cat:'Performance', desc:'Score 80%+ on 10 lessons',                      check:(p,s)=>p.filter(x=>x.score>=80&&x.status==='completed').length>=10 },
    { id:'comeback',        label:'Comeback King',     icon:'🔁', cat:'Performance', desc:'Improve a score by retrying a quiz',            check:(p,s)=>p.some(x=>x.attempts>=2&&x.best_score>x.score) },
    { id:'speed_demon',     label:'Speed Demon',       icon:'⚡', cat:'Performance', desc:'Complete a quiz in under 2 minutes',            check:(p,s)=>p.some(x=>x.time_spent>0&&x.time_spent<120&&x.status==='completed') },

    // ── Streaks ────────────────────────────────────────────────────
    { id:'streak_3',        label:'On a Roll',         icon:'🔥', cat:'Streaks',     desc:'3-day study streak',                            check:(p,s)=>(s?.streak_days||0)>=3 },
    { id:'streak_7',        label:'Week Warrior',      icon:'🗓️', cat:'Streaks',     desc:'7-day study streak',                            check:(p,s)=>(s?.streak_days||0)>=7 },
    { id:'streak_14',       label:'Fortnight Fighter', icon:'💪', cat:'Streaks',     desc:'14-day study streak',                           check:(p,s)=>(s?.streak_days||0)>=14 },
    { id:'streak_30',       label:'Unstoppable',       icon:'🌟', cat:'Streaks',     desc:'30-day study streak',                           check:(p,s)=>(s?.streak_days||0)>=30 },
    { id:'streak_60',       label:'Iron Discipline',   icon:'🏅', cat:'Streaks',     desc:'60-day study streak',                           check:(p,s)=>(s?.streak_days||0)>=60 },
    { id:'streak_100',      label:'Legend',            icon:'👑', cat:'Streaks',     desc:'100-day study streak',                          check:(p,s)=>(s?.streak_days||0)>=100 },

    // ── Subject mastery ────────────────────────────────────────────
    { id:'math_start',      label:'Mathematician',     icon:'📐', cat:'Subjects',    desc:'Complete a Maths lesson',                       check:(p,s)=>p.some(x=>x.subject==='mathematics'&&x.status==='completed') },
    { id:'physics_start',   label:'Physicist',         icon:'⚡', cat:'Subjects',    desc:'Complete a Physics lesson',                     check:(p,s)=>p.some(x=>x.subject==='physics'&&x.status==='completed') },
    { id:'bio_start',       label:'Biologist',         icon:'🧬', cat:'Subjects',    desc:'Complete a Biology lesson',                     check:(p,s)=>p.some(x=>x.subject==='biology'&&x.status==='completed') },
    { id:'chem_start',      label:'Chemist',           icon:'🧪', cat:'Subjects',    desc:'Complete a Chemistry lesson',                   check:(p,s)=>p.some(x=>x.subject==='chemistry'&&x.status==='completed') },
    { id:'math_master',     label:'Maths Master',      icon:'🔢', cat:'Subjects',    desc:'Complete 20 Maths lessons',                     check:(p,s)=>p.filter(x=>x.subject==='mathematics'&&x.status==='completed').length>=20 },
    { id:'physics_master',  label:'Physics Master',    icon:'🔭', cat:'Subjects',    desc:'Complete 20 Physics lessons',                   check:(p,s)=>p.filter(x=>x.subject==='physics'&&x.status==='completed').length>=20 },
    { id:'bio_master',      label:'Biology Master',    icon:'🌿', cat:'Subjects',    desc:'Complete 20 Biology lessons',                   check:(p,s)=>p.filter(x=>x.subject==='biology'&&x.status==='completed').length>=20 },
    { id:'chem_master',     label:'Chemistry Master',  icon:'⚗️', cat:'Subjects',    desc:'Complete 20 Chemistry lessons',                 check:(p,s)=>p.filter(x=>x.subject==='chemistry'&&x.status==='completed').length>=20 },
    { id:'all_subjects',    label:'Renaissance',       icon:'🌍', cat:'Subjects',    desc:'Complete lessons in all 4 subjects',            check:(p,s)=>['mathematics','physics','biology','chemistry'].every(sub=>p.some(x=>x.subject===sub&&x.status==='completed')) },
    { id:'all_masters',     label:'Quadruple Master',  icon:'🎓', cat:'Subjects',    desc:'Complete 20 lessons in every subject',          check:(p,s)=>['mathematics','physics','biology','chemistry'].every(sub=>p.filter(x=>x.subject===sub&&x.status==='completed').length>=20) },

    // ── XP milestones ──────────────────────────────────────────────
    { id:'xp_100',          label:'XP Starter',        icon:'🌱', cat:'XP',          desc:'Earn 100 XP',                                   check:(p,s)=>(s?.total_xp||0)>=100 },
    { id:'xp_500',          label:'XP Hunter',         icon:'⭐', cat:'XP',          desc:'Earn 500 XP',                                   check:(p,s)=>(s?.total_xp||0)>=500 },
    { id:'xp_1000',         label:'XP Master',         icon:'💎', cat:'XP',          desc:'Earn 1,000 XP',                                 check:(p,s)=>(s?.total_xp||0)>=1000 },
    { id:'xp_2500',         label:'XP Champion',       icon:'🔮', cat:'XP',          desc:'Earn 2,500 XP',                                 check:(p,s)=>(s?.total_xp||0)>=2500 },
    { id:'xp_5000',         label:'XP Legend',         icon:'👑', cat:'XP',          desc:'Earn 5,000 XP',                                 check:(p,s)=>(s?.total_xp||0)>=5000 },

    // ── AI feature badges ──────────────────────────────────────────
    { id:'ai_explorer',     label:'AI Explorer',       icon:'🧠', cat:'AI',          desc:'Use the AI Chatbot for the first time',         check:(p,s)=>!!localStorage.getItem('elimu_chatbot_used') },
    { id:'socratic_learner',label:'Deep Thinker',      icon:'🧑‍🏫', cat:'AI',         desc:'Use the Socratic Tutor 5 times',               check:(p,s)=>parseInt(localStorage.getItem('elimu_socratic_count')||'0')>=5 },
    { id:'retry_winner',    label:'Never Give Up',     icon:'🔁', cat:'AI',          desc:'Pass a quiz after using Smart Retry',           check:(p,s)=>!!localStorage.getItem('elimu_retry_pass') },
    { id:'flashcard_fan',   label:'Flashcard Fan',     icon:'🃏', cat:'AI',          desc:'Review 50 flashcards',                          check:(p,s)=>parseInt(localStorage.getItem('elimu_flashcard_count')||'0')>=50 },
    { id:'memory_guardian', label:'Memory Guardian',   icon:'📉', cat:'AI',          desc:'Review a topic on the Forgetting Curve',        check:(p,s)=>!!localStorage.getItem('elimu_curve_review') },

    // ── Games ──────────────────────────────────────────────────────
    { id:'game_starter',    label:'Game On',           icon:'🎮', cat:'Games',       desc:'Complete your first game level',                check:(p,s)=>!!localStorage.getItem('elimu_game_first') },
    { id:'game_level10',    label:'Level Up',          icon:'🚀', cat:'Games',       desc:'Reach level 10 in any game',                    check:(p,s)=>parseInt(localStorage.getItem('elimu_game_max_level')||'0')>=10 },
    { id:'game_level24',    label:'Space Cadet',       icon:'🌌', cat:'Games',       desc:'Complete all 24 levels in any game',            check:(p,s)=>parseInt(localStorage.getItem('elimu_game_max_level')||'0')>=24 },
    { id:'all_games',       label:'Game Master',       icon:'👾', cat:'Games',       desc:'Play all 6 games at least once',                check:(p,s)=>(JSON.parse(localStorage.getItem('elimu_games_played')||'[]')).length>=6 },

    // ── Special ────────────────────────────────────────────────────
    { id:'early_bird',      label:'Early Bird',        icon:'🌅', cat:'Special',     desc:'Study before 7 AM',                             check:(p,s)=>{ const h=new Date().getHours(); return h>=5&&h<7&&p.some(x=>x.status==='completed') } },
    { id:'night_owl',       label:'Night Owl',         icon:'🦉', cat:'Special',     desc:'Study after 10 PM',                             check:(p,s)=>{ const h=new Date().getHours(); return h>=22&&p.some(x=>x.status==='completed') } },
    { id:'weekend_warrior', label:'Weekend Warrior',   icon:'📅', cat:'Special',     desc:'Study on both Saturday and Sunday',             check:(p,s)=>!!localStorage.getItem('elimu_weekend_study') },
    { id:'exam_ready',      label:'Exam Ready',        icon:'📝', cat:'Special',     desc:'Complete 10 exam practice questions',           check:(p,s)=>parseInt(localStorage.getItem('elimu_exam_count')||'0')>=10 },
  ],

    async checkAndAward(studentId, progress, student) {
    const earned = await db.achievements.where('student_id').equals(studentId).toArray()
    const earnedIds = new Set(earned.map(e => e.badge_id))
    const newBadges = []
    for (const badge of this.BADGES) {
      if (!earnedIds.has(badge.id) && badge.check(progress, student)) {
        await db.achievements.add({ student_id: studentId, badge_id: badge.id, earned_at: new Date().toISOString() })
        newBadges.push(badge)
      }
    }
    return newBadges
  },

  async getEarned(studentId) {
    const earned = await db.achievements.where('student_id').equals(studentId).toArray()
    const earnedMap = new Map(earned.map(e => [e.badge_id, e.earned_at]))
    return this.BADGES.map(b => ({ ...b, earned: earnedMap.has(b.id), earned_at: earnedMap.get(b.id) || null }))
  }
}

export const goalsDB = {
  async getTodayGoal(studentId) {
    const today = new Date().toISOString().split('T')[0]
    return db.daily_goals.where({ student_id: studentId, date: today }).first()
  },

  async setTodayGoal(studentId, target) {
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.daily_goals.where({ student_id: studentId, date: today }).first()
    if (existing) {
      await db.daily_goals.update(existing.id, { target, updated_at: new Date().toISOString() })
    } else {
      await db.daily_goals.add({ student_id: studentId, date: today, target, completed: 0, updated_at: new Date().toISOString() })
    }
  },

  async incrementCompleted(studentId) {
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.daily_goals.where({ student_id: studentId, date: today }).first()
    if (existing) {
      await db.daily_goals.update(existing.id, { completed: (existing.completed || 0) + 1 })
    }
  },

  async getWeekHistory(studentId) {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const date = d.toISOString().split('T')[0]
      const rec = await db.daily_goals.where({ student_id: studentId, date }).first()
      days.push({ date, target: rec?.target || 2, completed: rec?.completed || 0, met: rec ? (rec.completed || 0) >= (rec.target || 2) : false })
    }
    return days
  }
}

export const notesDB = {
  async get(studentId, lessonId) {
    return db.lesson_notes.where({ student_id: studentId, lesson_id: lessonId }).first()
  },
  async save(studentId, lessonId, text) {
    const ex = await db.lesson_notes.where({ student_id: studentId, lesson_id: lessonId }).first()
    if (ex) await db.lesson_notes.update(ex.id, { text, updated_at: new Date().toISOString() })
    else await db.lesson_notes.add({ student_id: studentId, lesson_id: lessonId, text, updated_at: new Date().toISOString() })
  },
}
