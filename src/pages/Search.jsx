import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import Navbar from '../components/Navbar.jsx'

const SUBJECT_FILES = {
  mathematics: {
    s1: ['algebra','sets','numbers','geometry','ratio_indices'],
    s2: ['quadratic','trigonometry','statistics','simultaneous'],
    s3: ['functions','coordinate_sequences','matrices_probability'],
    s4: ['calculus','vectors','permcomb'],
    s5: ['further_calculus','differential_equations','complex_numbers','mechanics'],
    s6: ['pure_mathematics','statistics_probability','applied_mathematics'],
  },
  physics: {
    s1: ['forces','measurement','light','energy'],
    s2: ['waves_electricity','magnetism_heat'],
    s3: ['radioactivity','electromagnetic'],
    s4: ['circular_gravitation'],
    s5: ['mechanics_advanced','thermal_physics','waves_optics'],
    s6: ['modern_physics','quantum_mechanics','astrophysics'],
  },
  biology: {
    s1: ['cells','photosynthesis_respiration','diffusion_osmosis'],
    s2: ['transport','digestion_ecology'],
    s3: ['genetics','hormones_homeostasis'],
    s4: ['evolution_immunity'],
    s5: ['cell_biology_advanced','biochemistry','genetics_advanced'],
    s6: ['developmental_biology','immunology','molecular_biology'],
  },
  chemistry: {
    s1: ['atoms','matter','bonding'],
    s2: ['acids_periodic','reactions_metals'],
    s3: ['organic_rates','electrochemistry'],
    s4: ['thermochemistry'],
    s5: ['advanced_organic','spectroscopy','transition_metals'],
    s6: ['pharmaceuticals','polymers','green_chemistry'],
  },
}

const SUBJECT_ICONS = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJECT_COLORS = { mathematics:'text-teal-400', physics:'text-cyan-400', biology:'text-green-400', chemistry:'text-violet-400' }

let cachedIndex = null

async function buildSearchIndex() {
  if (cachedIndex) return cachedIndex
  const results = []
  for (const [subject, classes] of Object.entries(SUBJECT_FILES)) {
    for (const [cls, files] of Object.entries(classes)) {
      for (const file of files) {
        try {
          const mod = await import(`../curriculum/${subject}/${cls}/${file}.json`)
          const data = mod.default
          const topicTitle = data.topic_title || ''
          for (const lesson of (data.lessons || [])) {
            const contentText = (lesson.content || []).map(c => c.body || '').join(' ')
            results.push({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              topicTitle,
              topicId: data.topic_id,
              subject,
              classLevel: cls.toUpperCase(),
              xpReward: lesson.xp_reward || 0,
              durationMinutes: lesson.duration_minutes || 0,
              searchText: `${lesson.title} ${topicTitle} ${contentText}`.toLowerCase(),
              lesson,
            })
          }
        } catch (e) {}
      }
    }
  }
  cachedIndex = results
  return results
}

export default function Search() {
  const { student } = useUser()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [indexed, setIndexed] = useState(false)
  const [indexSize, setIndexSize] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    buildSearchIndex().then(idx => { setIndexed(true); setIndexSize(idx.length) })
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const idx = await buildSearchIndex()
      const q = query.toLowerCase().trim()
      const words = q.split(/\s+/).filter(Boolean)
      const scored = idx
        .map(item => {
          let score = 0
          for (const word of words) {
            if (item.lessonTitle.toLowerCase().includes(word)) score += 10
            if (item.topicTitle.toLowerCase().includes(word)) score += 5
            if (item.subject.includes(word)) score += 4
            if (item.searchText.includes(word)) score += 1
          }
          return { ...item, score }
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
      setResults(scored)
      setLoading(false)
    }, 200)
  }, [query])

  return (
    <div className="min-h-screen  pb-24" style={{background:"#0C0F1A"}}>
      {/* Header */}
      <div className=" px-5 pt-12 pb-4 border-b border-night-border sticky top-0 z-30">
        <h1 className="text-xl font-display font-bold text-white mb-3">🔍 Search</h1>
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search lessons, topics, subjects..."
            className="w-full  border border-slate-600 text-white rounded-2xl px-4 py-3 pl-10 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-lg">×</button>
          )}
        </div>
        {indexed && !query && (
          <p className="text-slate-500 text-xs mt-2">{indexSize} lessons indexed · search works offline</p>
        )}
      </div>

      <div className="px-5 mt-4">
        {/* Empty state */}
        {!query && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm font-medium">Browse by subject</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SUBJECT_ICONS).map(([subj, icon]) => (
                <button key={subj} onClick={() => setQuery(subj)}
                  className="glass rounded-2xl p-4 text-left active:scale-95 transition-all">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className={`text-sm font-semibold capitalize ${SUBJECT_COLORS[subj]}`}>{subj}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Results */}
        {!loading && query && (
          <>
            <p className="text-slate-400 text-xs mb-3">
              {results.length === 0 ? 'No results found' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
            </p>
            <div className="space-y-2">
              {results.map(r => (
                <Link
                  key={r.lessonId}
                  to={`/lesson/${r.lessonId}`}
                  state={{ lesson: r.lesson, subject: r.subject, topicId: r.topicId }}
                  className="glass rounded-2xl p-4 flex items-start gap-3 active:scale-95 transition-all block"
                >
                  <div className="text-2xl shrink-0 mt-0.5">{SUBJECT_ICONS[r.subject]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm leading-snug">{r.lessonTitle}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{r.topicTitle}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium capitalize ${SUBJECT_COLORS[r.subject]}`}>{r.subject}</span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-slate-500 text-xs">{r.classLevel}</span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-teal-400 text-xs">+{r.xpReward} XP</span>
                    </div>
                  </div>
                  <span className="text-slate-500 shrink-0">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      <Navbar />
    </div>
  )
}
