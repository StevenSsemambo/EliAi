import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { progressDB } from '../db/progressDB.js'
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
    s5: ['physics_s5_measurement_dimensions','physics_s5_statics','physics_s5_linear_motion','physics_s5_motion_gravity','physics_s5_work_energy_power','physics_s5_solid_friction','physics_s5_fluid_mechanics','physics_s5_mechanical_properties','physics_s5_thermometry','physics_s5_heat_quantities','physics_s5_transfer_of_heat','physics_s5_behaviour_of_gases','physics_s5_thermodynamics','physics_s5_reflection_of_light','physics_s5_refraction_of_light','physics_s5_optical_instruments'],
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

export default function TopicList() {
  const { subject, topicId } = useParams()
  const { student } = useUser()
  const [lessons, setLessons] = useState([])
  const [topicTitle, setTopicTitle] = useState('')
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const classLevel = student?.class_level?.toLowerCase() || 's1'
      const files = SUBJECT_FILES[subject]?.[classLevel] || []
      let found = []
      for (const file of files) {
        try {
          const mod = await import(`../curriculum/${subject}/${classLevel}/${file}.json`)
          const data = mod.default
          if (data.topic_id === topicId) {
            setTopicTitle(data.topic_title)
            found = data.lessons
            break
          }
        } catch (e) {}
      }
      setLessons(found)
      setLoading(false)
    }
    if (student) {
      load()
      progressDB.getAllProgress(student.id).then(setProgress)
    }
  }, [subject, topicId, student])

  function getStatus(lessonId) {
    const p = progress.find(x => x.lesson_id === lessonId)
    return p?.status || 'not_started'
  }
  function getBestScore(lessonId) {
    const p = progress.find(x => x.lesson_id === lessonId)
    return p?.best_score || 0
  }

  const statusIcon = { completed: '✅', in_progress: '🔄', not_started: '○' }
  const statusColor = { completed: 'text-emerald-400', in_progress: 'text-yellow-400', not_started: 'text-slate-500' }

  return (
    <div className="min-h-screen night-DEFAULT pb-24" style={{background:"#0C0F1A"}}>
      <div className="night-card px-5 pt-12 pb-6 border-b night-border">
        <Link to={`/subject/${subject}`} className="text-slate-400 text-sm mb-3 block">← {subject.charAt(0).toUpperCase() + subject.slice(1)}</Link>
        <h1 className="text-2xl font-display font-extrabold text-white">{topicTitle || topicId}</h1>
        <p className="text-slate-400 text-sm">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="px-5 mt-5 space-y-3">
        {loading && <p className="text-slate-400 text-center py-8">Loading lessons...</p>}
        {!loading && lessons.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-slate-400">Lessons coming soon for this topic!</p>
          </div>
        )}
        {lessons.map((lesson) => {
          const status = getStatus(lesson.id)
          const score = getBestScore(lesson.id)
          return (
            <Link key={lesson.id} to={`/lesson/${lesson.id}`}
              state={{ lesson, subject, topicId }}
              className="glass rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all block">
              <div className={`text-xl shrink-0 ${statusColor[status]}`}>{statusIcon[status]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">{lesson.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-slate-400 text-xs">⏱ {lesson.duration_minutes} min</span>
                  <span className="text-teal-400 text-xs">+{lesson.xp_reward} XP</span>
                  {score > 0 && <span className="text-yellow-400 text-xs">Best: {score}%</span>}
                </div>
              </div>
              <div className="text-slate-500 shrink-0">›</div>
            </Link>
          )
        })}
      </div>
      <Navbar />
    </div>
  )
}
