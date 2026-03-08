import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { bookmarkDB } from '../db/progressDB.js'
import Navbar from '../components/Navbar.jsx'

const SUBJECT_FILES = {
  mathematics: { s1:['algebra','sets','numbers','geometry','ratio_indices'], s2:['quadratic','trigonometry','statistics','simultaneous'], s3:['functions','coordinate_sequences','matrices_probability'], s4:['calculus','vectors','permcomb'], s5:['further_calculus','differential_equations','complex_numbers','mechanics'], s6:['pure_mathematics','statistics_probability','applied_mathematics'] },
  physics:     { s1:['forces','measurement','light','energy'], s2:['waves_electricity','magnetism_heat'], s3:['radioactivity','electromagnetic'], s4:['circular_gravitation'], s5:['mechanics_advanced','thermal_physics','waves_optics'], s6:['modern_physics','quantum_mechanics','astrophysics'] },
  biology:     { s1:['cells','photosynthesis_respiration','diffusion_osmosis'], s2:['transport','digestion_ecology'], s3:['genetics','hormones_homeostasis'], s4:['evolution_immunity'], s5:['cell_biology_advanced','biochemistry','genetics_advanced'], s6:['developmental_biology','immunology','molecular_biology'] },
  chemistry:   { s1:['atoms','matter','bonding'], s2:['acids_periodic','reactions_metals'], s3:['organic_rates','electrochemistry'], s4:['thermochemistry'], s5:['advanced_organic','spectroscopy','transition_metals'], s6:['pharmaceuticals','polymers','green_chemistry'] },
}
const SUBJECT_ICONS = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJECT_COLORS = { mathematics:'text-teal-400', physics:'text-cyan-400', biology:'text-green-400', chemistry:'text-violet-400' }

async function lessonById(lessonId) {
  for (const [subject, classes] of Object.entries(SUBJECT_FILES)) {
    for (const [cls, files] of Object.entries(classes)) {
      for (const file of files) {
        try {
          const mod = await import(`../curriculum/${subject}/${cls}/${file}.json`)
          const data = mod.default
          const lesson = (data.lessons || []).find(l => l.id === lessonId)
          if (lesson) return { lesson, subject, topicId: data.topic_id, topicTitle: data.topic_title, classLevel: cls.toUpperCase() }
        } catch(e) {}
      }
    }
  }
  return null
}

export default function Bookmarks() {
  const { student } = useUser()
  const [bookmarks, setBookmarks] = useState([])
  const [lessonData, setLessonData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    bookmarkDB.getAll(student.id).then(async (bks) => {
      setBookmarks(bks)
      const resolved = await Promise.all(bks.map(b => lessonById(b.lesson_id)))
      setLessonData(resolved)
      setLoading(false)
    })
  }, [student])

  async function handleRemove(lessonId) {
    await bookmarkDB.toggle(student.id, lessonId)
    setBookmarks(prev => prev.filter(b => b.lesson_id !== lessonId))
    setLessonData(prev => {
      const idx = bookmarks.findIndex(b => b.lesson_id === lessonId)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const items = bookmarks.map((b, i) => ({ bookmark: b, data: lessonData[i] })).filter(x => x.data)

  return (
    <div className="min-h-screen  pb-24" style={{background:"#0C0F1A"}}>
      <div className=" px-5 pt-12 pb-6 border-b border-night-border">
        <h1 className="text-2xl font-display font-bold text-white">🔖 Bookmarks</h1>
        <p className="text-slate-400 text-sm">{items.length} saved lesson{items.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">🔖</p>
            <p className="text-white font-semibold">No bookmarks yet</p>
            <p className="text-slate-400 text-sm mt-1">While reading a lesson, tap the bookmark icon to save it here for quick access.</p>
          </div>
        )}

        {items.map(({ bookmark, data }) => data && (
          <div key={bookmark.id} className="glass rounded-2xl p-4 flex items-start gap-3">
            <Link
              to={`/lesson/${bookmark.lesson_id}`}
              state={{ lesson: data.lesson, subject: data.subject, topicId: data.topicId }}
              className="flex-1 flex items-start gap-3 min-w-0"
            >
              <div className="text-2xl shrink-0 mt-0.5">{SUBJECT_ICONS[data.subject]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">{data.lesson.title}</div>
                <div className="text-slate-400 text-xs mt-0.5">{data.topicTitle}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium capitalize ${SUBJECT_COLORS[data.subject]}`}>{data.subject}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-500 text-xs">{data.classLevel}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-teal-400 text-xs">⏱ {data.lesson.duration_minutes} min</span>
                </div>
              </div>
            </Link>
            <button
              onClick={() => handleRemove(bookmark.lesson_id)}
              className="text-slate-500 hover:text-red-400 transition-colors shrink-0 p-1"
              title="Remove bookmark"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
      <Navbar />
    </div>
  )
}
