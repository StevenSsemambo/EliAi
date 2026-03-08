import Dexie from 'dexie'

export const db = new Dexie('ElimuLearnDB')

db.version(1).stores({students:'++id,name,class_level,created_at,supabase_id',progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced',bookmarks:'++id,student_id,lesson_id,created_at',settings:'key'})
db.version(2).stores({students:'++id,name,class_level,created_at,supabase_id',progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced',bookmarks:'++id,student_id,lesson_id,created_at',settings:'key',achievements:'++id,student_id,badge_id,earned_at',daily_goals:'++id,student_id,date'})
db.version(3).stores({students:'++id,name,class_level,created_at,supabase_id',progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced',bookmarks:'++id,student_id,lesson_id,created_at',settings:'key',achievements:'++id,student_id,badge_id,earned_at',daily_goals:'++id,student_id,date',lesson_notes:'++id,student_id,lesson_id'})
db.version(4).stores({students:'++id,name,class_level,created_at,supabase_id',progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced',bookmarks:'++id,student_id,lesson_id,created_at',settings:'key',achievements:'++id,student_id,badge_id,earned_at',daily_goals:'++id,student_id,date',lesson_notes:'++id,student_id,lesson_id',exam_results:'++id,student_id,exam_id,score,attempted_at'})
db.version(5).stores({students:'++id,name,class_level,created_at,supabase_id',progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced',bookmarks:'++id,student_id,lesson_id,created_at',settings:'key',achievements:'++id,student_id,badge_id,earned_at',daily_goals:'++id,student_id,date',lesson_notes:'++id,student_id,lesson_id',exam_results:'++id,student_id,exam_id,score,attempted_at',game_progress:'++id,student_id,game_id,level,high_score,unlocked_at',game_unlocks:'++id,student_id,game_id,level,unlocked_at'})
db.version(6).stores({students:'++id,name,class_level,created_at,supabase_id',progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced,wrong_questions',bookmarks:'++id,student_id,lesson_id,created_at',settings:'key',achievements:'++id,student_id,badge_id,earned_at',daily_goals:'++id,student_id,date',lesson_notes:'++id,student_id,lesson_id',exam_results:'++id,student_id,exam_id,score,attempted_at',game_progress:'++id,student_id,game_id,level,high_score,unlocked_at',game_unlocks:'++id,student_id,game_id,level,unlocked_at',ai_missions:'++id,student_id,date',flashcard_sessions:'++id,student_id,subject,created_at'})
db.version(7).stores({
  students:'++id,name,class_level,created_at,supabase_id',
  progress:'++id,student_id,subject,topic_id,lesson_id,status,synced',
  quiz_attempts:'++id,student_id,lesson_id,attempted_at,synced,wrong_questions',
  bookmarks:'++id,student_id,lesson_id,created_at',
  settings:'key',
  achievements:'++id,student_id,badge_id,earned_at',
  daily_goals:'++id,student_id,date',
  lesson_notes:'++id,student_id,lesson_id',
  exam_results:'++id,student_id,exam_id,score,attempted_at',
  game_progress:'++id,student_id,game_id,level,high_score,unlocked_at',
  game_unlocks:'++id,student_id,game_id,level,unlocked_at',
  ai_missions:'++id,student_id,date',
  flashcard_sessions:'++id,student_id,subject,created_at',
  forgetting_curve:'++id,student_id,lesson_id,topic_id,subject,next_review_at,review_count',
  cognitive_load:'++id,student_id,lesson_id,attempted_at',
  learning_style:'++id,student_id,updated_at',
  study_habits:'++id,student_id,recorded_at',
})

export default db
