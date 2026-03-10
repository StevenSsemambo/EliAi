import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { progressDB, bookmarkDB, notesDB } from '../db/progressDB.js'
import { useSubjectTheme } from '../context/SubjectThemeContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'
import { recordLessonLearned, recordStudySession } from '../ai/learning.js'
import { invalidateProfileCache } from '../ai/chatbot.js'

// Curriculum file map — used to look up lessons when navigating directly by URL
const ALL_SUBJECT_FILES={
  mathematics:{s1:['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],s2:['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],s3:['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],s4:['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],s5:['complex_numbers','differential_equations','further_calculus','mechanics','numerical_methods','probability_advanced'],s6:['applied_mathematics','further_pure','number_theory','pure_mathematics','statistics_probability']},
  physics:{s1:['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],s2:['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],s3:['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],s4:['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],s5:['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],s6:['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity']},
  biology:{s1:['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],s2:['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],s3:['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],s4:['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],s5:['biochemistry','bioenergetics','cell_biology_advanced','ecology_advanced','genetics_advanced','microbiology'],s6:['bioethics','developmental_biology','immunology','molecular_biology']},
  chemistry:{s1:['atoms','bonding','matter','separation_techniques','water'],s2:['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],s3:['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],s4:['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],s5:['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],s6:['biochemistry','green_chemistry','industrial_chemistry','pharmaceuticals','polymers']},
}

async function findLessonById(lessonId, classLevel){
  const cls=(classLevel||'s1').toLowerCase()
  for(const [subj,levels] of Object.entries(ALL_SUBJECT_FILES)){
    for(const file of (levels[cls]||[])){
      try{
        const mod=await import(`../curriculum/${subj}/${cls}/${file}.json`)
        const data=mod.default
        const found=(data.lessons||[]).find(l=>l.id===lessonId)
        if(found) return {lesson:found, subject:subj, topicId:data.topic_id}
      }catch(e){}
    }
  }
  return null
}

export default function Lesson(){
  const {lessonId}=useParams()
  const {state}=useLocation()
  const navigate=useNavigate()
  const {student}=useUser()
  const {setSubject}=useSubjectTheme()
  const [lesson,setLesson]=useState(state?.lesson||null)
  const [fallbackSubject,setFallbackSubject]=useState(null)
  const [fallbackTopicId,setFallbackTopicId]=useState(null)
  const [lookingUp,setLookingUp]=useState(!state?.lesson)
  const [scrollPct,setScrollPct]=useState(0)
  const [isBookmarked,setIsBookmarked]=useState(false)
  const [notes,setNotes]=useState('')
  const [notesOpen,setNotesOpen]=useState(false)
  const [notesSaved,setNotesSaved]=useState(false)
  const [progressDone,setProgressDone]=useState(false)
  const saveTimer=useRef(null)
  const startTime=useRef(Date.now())
  const subject=state?.subject||fallbackSubject
  const topicId=state?.topicId||fallbackTopicId

  // Fallback: if page was loaded directly via URL with no router state, scan curriculum
  useEffect(()=>{
    if(state?.lesson||!lessonId)return
    setLookingUp(true)
    findLessonById(lessonId, student?.class_level).then(result=>{
      if(result){
        setLesson(result.lesson)
        setFallbackSubject(result.subject)
        setFallbackTopicId(result.topicId)
      }
      setLookingUp(false)
    })
  },[lessonId, student?.class_level])

  useEffect(()=>{
    if(subject)setSubject(subject)
    return()=>{}
  },[subject])

  useEffect(()=>{
    if(!lesson||!student||!subject||!topicId)return
    progressDB.getOrCreate(student.id,lesson.id,subject,topicId).then(()=>progressDB.markInProgress(student.id,lesson.id))
    bookmarkDB.isBookmarked(student.id,lesson.id).then(setIsBookmarked)
    notesDB.get(student.id,lesson.id).then(n=>{if(n)setNotes(n.text||'')})
  },[lesson,student])

  useEffect(()=>{
    const onScroll=()=>{
      const el=document.documentElement
      const pct=(el.scrollTop/(el.scrollHeight-el.clientHeight))*100
      const clamped=Math.min(100,Math.round(pct))
      setScrollPct(clamped)
      if(clamped>=98&&!progressDone){
        setProgressDone(true)
        // Record to forgetting curve and study activity
        if(student&&lesson&&subject&&topicId){
          const timeSpentMin = Math.round((Date.now()-startTime.current)/60000)
          recordLessonLearned(student.id, lesson.id, topicId, subject, 100).catch(()=>{})
          recordStudySession(student.id, 100, timeSpentMin).catch(()=>{})
          invalidateProfileCache()  // chatbot gets fresh data next time it opens
        }
      }
    }
    window.addEventListener('scroll',onScroll)
    return()=>window.removeEventListener('scroll',onScroll)
  },[progressDone, student, lesson, subject, topicId])

  function handleNotesChange(v){
    setNotes(v);setNotesSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(async()=>{
      if(student&&lesson)await notesDB.save(student.id,lesson.id,v)
      setNotesSaved(true)
    },800)
  }

  async function toggleBookmark(){
    if(!student)return
    SoundEngine.tap()
    const result=await bookmarkDB.toggle(student.id,lesson.id)
    setIsBookmarked(result)
  }

  function renderContent(item,i){
    switch(item.type){
      case 'text':
        return <p key={i} className="text-slate-300 leading-relaxed text-sm">{item.body}</p>
      case 'formula':
        return(
          <div key={i} className="rounded-2xl p-4 font-mono" style={{background:'rgba(13,148,136,0.08)',border:'1px solid rgba(13,148,136,0.25)'}}>
            <p className="text-sm whitespace-pre-line" style={{color:'#5EEAD4'}}>{item.body}</p>
          </div>
        )
      case 'example':
        return(
          <div key={i} className="rounded-r-2xl p-4" style={{borderLeft:'3px solid var(--acc,#14B8A6)',background:'rgba(255,255,255,0.03)'}}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2 acc-color">📝 {item.title}</p>
            <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
          </div>
        )
      case 'image':
        return(
          <div key={i} className="rounded-2xl overflow-hidden glass">
            <img src={item.src} alt={item.caption||'Diagram'} className="w-full object-contain max-h-64" onError={e=>{e.target.style.display='none'}}/>
            {item.caption&&<p className="text-slate-400 text-xs text-center py-2 px-3">{item.caption}</p>}
          </div>
        )
      case 'note':
        return(
          <div key={i} className="rounded-2xl p-4" style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)'}}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:'#F59E0B'}}>💡 Note</p>
            <p className="text-slate-300 text-sm leading-relaxed">{item.body}</p>
          </div>
        )
      default:
        return <p key={i} className="text-slate-400 text-sm">{item.body}</p>
    }
  }

  if(lookingUp)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4" style={{borderColor:'#14B8A6',borderTopColor:'transparent'}}/>
        <p className="text-slate-500 text-sm">Loading lesson…</p>
      </div>
    </div>
  )

  if(!lesson)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center px-6">
        <p className="text-4xl mb-4">📚</p>
        <p className="text-slate-300 font-semibold mb-2">Lesson not found</p>
        <p className="text-slate-500 text-sm mb-6">This lesson may not be available for your class level.</p>
        <button onClick={()=>navigate('/dashboard')} className="px-6 py-3 rounded-2xl font-bold text-white" style={{background:'linear-gradient(135deg,#0D9488,#0369A1)'}}>← Dashboard</button>
      </div>
    </div>
  )

  return(
    <div className="min-h-screen pb-32" style={{background:'#0C0F1A'}}>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1" style={{background:'#1A2035'}}>
        <div className={`h-full transition-all ${progressDone?'progress-done':''}`}
          style={{width:`${scrollPct}%`,background:progressDone?'#F59E0B':'var(--acc,#14B8A6)'}}/>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 px-5 pt-8 pb-4 border-b" style={{background:'rgba(12,15,26,0.95)',backdropFilter:'blur(16px)',borderColor:'#1A2035'}}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={()=>navigate(-1)} className="text-slate-400 text-sm">← Back</button>
          <div className="flex items-center gap-3">
            <button onClick={()=>{SoundEngine.tap();setNotesOpen(!notesOpen)}}
              className={`text-sm font-semibold transition-all ${notesOpen?'':'text-slate-500'}`}
              style={notesOpen?{color:'#F59E0B'}:{}}>
              📝 Notes
            </button>
            <button onClick={toggleBookmark}
              className={`text-xl transition-all active:scale-125 ${isBookmarked?'':'text-slate-600'}`}
              style={isBookmarked?{color:'#F59E0B'}:{}}>
              {isBookmarked?'🔖':'🏷️'}
            </button>
          </div>
        </div>
        <h1 className="text-xl font-display font-extrabold text-white leading-tight">{lesson.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-slate-500 text-xs">⏱ {lesson.duration_minutes} min</span>
          <span className="text-xs font-semibold acc-color">+{lesson.xp_reward} XP</span>
          {scrollPct>5&&<span className="text-xs text-slate-500">{scrollPct}% read</span>}
        </div>
      </div>

      {/* Notes panel */}
      {notesOpen&&(
        <div className="mx-5 mt-4 rounded-2xl overflow-hidden" style={{background:'#131829',border:'1px solid rgba(245,158,11,0.2)'}}>
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{borderColor:'rgba(245,158,11,0.15)'}}>
            <span className="text-xs font-bold" style={{color:'#F59E0B'}}>📝 My Notes</span>
            {notesSaved&&<span className="text-xs text-slate-500">✓ Saved</span>}
          </div>
          <textarea
            value={notes}
            onChange={e=>handleNotesChange(e.target.value)}
            placeholder="Type your notes here… they're saved automatically."
            className="w-full px-4 py-3 text-sm text-slate-300 resize-none focus:outline-none"
            style={{background:'transparent',minHeight:'120px'}}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-5 py-6 space-y-5 max-w-2xl mx-auto">
        {lesson.content?.map((item,i)=>renderContent(item,i))}
      </div>

      {/* Take Quiz */}
      {lesson.quiz?.questions?.length>0&&(
        <div className="fixed bottom-0 left-0 right-0 p-5 border-t" style={{background:'rgba(12,15,26,0.97)',backdropFilter:'blur(16px)',borderColor:'#1A2035'}}>
          <button onClick={()=>navigate(`/quiz/${lesson.id}`,{state:{lesson,subject,topicId}})}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-white transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#0D9488,#0369A1)'}}>
            Take Quiz → ({lesson.quiz.questions.length} questions)
          </button>
        </div>
      )}
    </div>
  )
}
