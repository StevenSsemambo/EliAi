import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { analyseStudent } from '../ai/brain.js'
import Navbar from '../components/Navbar.jsx'

const SUBJECT_FILES = {
  mathematics: {
    s1: ['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],
    s2: ['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],
    s3: ['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],
    s4: ['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],
    s5: ['complex_numbers','differential_equations','further_calculus','mechanics','numerical_methods','probability_advanced'],
    s6: ['applied_mathematics','further_pure','number_theory','pure_mathematics','statistics_probability'],
  },
  physics: {
    s1: ['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],
    s2: ['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],
    s3: ['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],
    s4: ['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],
    s5: ['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],
    s6: ['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity'],
  },
  biology: {
    s1: ['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],
    s2: ['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],
    s3: ['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],
    s4: ['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],
    s5: ['biochemistry','bioenergetics','cell_biology_advanced','ecology_advanced','genetics_advanced','microbiology'],
    s6: ['bioethics','developmental_biology','immunology','molecular_biology'],
  },
  chemistry: {
    s1: ['atoms','bonding','matter','separation_techniques','water'],
    s2: ['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],
    s3: ['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],
    s4: ['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],
    s5: ['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],
    s6: ['biochemistry','green_chemistry','industrial_chemistry','pharmaceuticals','polymers'],
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
  const [weakTopics, setWeakTopics] = useState(new Set())
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    buildSearchIndex().then(idx => { setIndexed(true); setIndexSize(idx.length) })
    // Load weak topics from brain.js to personalise ranking
    if (student?.id) {
      analyseStudent(student.id)
        .then(a => setWeakTopics(new Set((a.allWeakTopics || []).map(t => t.topic))))
        .catch(() => {})
    }
  }, [student])

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
          // Boost weak topics so they appear at top as revision priority
          const topicKey = item.topicId || item.lessonId?.split('_')[0]
          if (score > 0 && weakTopics.has(topicKey)) score += 8
          return { ...item, score, isWeak: weakTopics.has(topicKey) }
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
                      {r.isWeak && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{background:'rgba(239,68,68,0.15)',color:'#F87171'}}>⚠️ Revise</span>}
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
