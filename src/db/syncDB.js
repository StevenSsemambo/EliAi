import db from './schema.js'
import { supabase, isSupabaseConfigured } from '../supabase/client.js'

export const syncDB = {
  async syncAll(studentId) {
    if (!isSupabaseConfigured() || !navigator.onLine) return { synced: 0 }
    let synced = 0
    try {
      // Sync student record
      const student = await db.students.get(studentId)
      if (student) {
        const { data } = await supabase.from('students').upsert({
          local_id: student.id, name: student.name, class_level: student.class_level,
          total_xp: student.total_xp, streak_days: student.streak_days,
          updated_at: new Date().toISOString()
        }, { onConflict: 'local_id' }).select()
        if (data?.[0]) await db.students.update(studentId, { supabase_id: data[0].id })
      }
      // Sync unsynced progress
      const unsynced = await db.progress.where({ student_id: studentId, synced: false }).toArray()
      for (const rec of unsynced) {
        await supabase.from('progress').upsert({
          local_id: rec.id, student_local_id: studentId,
          subject: rec.subject, topic_id: rec.topic_id, lesson_id: rec.lesson_id,
          status: rec.status, score: rec.score, best_score: rec.best_score,
          attempts: rec.attempts, completed_at: rec.completed_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'local_id' })
        await db.progress.update(rec.id, { synced: true })
        synced++
      }
      // Sync quiz attempts
      const attempts = await db.quiz_attempts.where({ student_id: studentId, synced: false }).toArray()
      for (const att of attempts) {
        await supabase.from('quiz_attempts').insert({
          student_local_id: studentId, lesson_id: att.lesson_id,
          score: att.score, time_taken: att.time_taken, attempted_at: att.attempted_at
        })
        await db.quiz_attempts.update(att.id, { synced: true })
        synced++
      }
      return { synced }
    } catch (e) {
      console.warn('Sync failed:', e.message)
      return { synced: 0, error: e.message }
    }
  }
}
