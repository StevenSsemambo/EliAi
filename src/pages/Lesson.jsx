import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { progressDB, bookmarkDB, notesDB } from '../db/progressDB.js'
import { useSubjectTheme } from '../context/SubjectThemeContext.jsx'
import { SoundEngine, Speaker } from '../utils/soundEngine.js'
import { AmbientEngine, AMBIENT_SOUNDS } from '../utils/ambientSounds.js'
import { recordLessonLearned, recordStudySession } from '../ai/learning.js'
import { invalidateProfileCache } from '../ai/cache.js'
import { LessonSkeleton } from '../components/Skeletons.jsx'

// Curriculum file map — used to look up lessons when navigating directly by URL
const ALL_SUBJECT_FILES={
  mathematics:{s1:['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],s2:['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],s3:['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],s4:['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],s5:['maths_s5_t1_numerical_concepts','maths_s5_t2_equations_inequalities','maths_s5_t3_coordinate_geometry_1','maths_s5_t4_partial_fractions','maths_s5_t5_trigonometry','maths_s5_t6_descriptive_statistics','maths_s5_t7_scatter_correlations','maths_s5_t8_dynamics_1','maths_s5_t9_probability_theory','maths_s5_t10_differentiation_1','maths_s5_t11_integration_1','maths_s5_t12_permutations_combinations','maths_s5_t13_series','maths_s5_t14_random_variables','maths_s5_t15_probability_distributions','maths_s5_t16_error_analysis'],s6:['maths_s6_t17_vectors','maths_s6_t18_differentiation_2','maths_s6_t19_integration_2','maths_s6_t20_dynamics_2','maths_s6_t21_trapezium_rule','maths_s6_t22_sampling_distribution','maths_s6_t23_iterative_methods','maths_s6_t24_coordinate_geometry_2','maths_s6_t25_complex_numbers']},
  physics:{s1:['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],s2:['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],s3:['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],s4:['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],s5:['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],s6:['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity']},
  biology:{s1:['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],s2:['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],s3:['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],s4:['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],s5:['biology_s5_cell_biology','biology_s5_homeostasis','biology_s5_nutrition_plants','biology_s5_respiration','biology_s5_transport_humans'],s6:['biology_s6_coordination','biology_s6_ecology','biology_s6_growth_development','biology_s6_inheritance_evolution']},
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
  const [speaking,setSpeaking]=useState(false)
  const [handsFree,setHandsFree]=useState(false)
  const [showAmbient,setShowAmbient]=useState(false)
  const [ambientId,setAmbientId]=useState(AmbientEngine.lastUsed()||null)
  const saveTimer=useRef(null)
  const startTime=useRef(Date.now())
  const subject=state?.subject||fallbackSubject

  // Stop TTS + ambient when leaving lesson
  useEffect(()=>{ return ()=>{ Speaker.stop(); setSpeaking(false); AmbientEngine.stop() } },[])
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

  function startHandsFree(){
    if(!lesson)return
    setHandsFree(true)
    // Build lesson text
    const parts=[`${lesson.title}. `]
    ;(lesson.content||[]).forEach(item=>{ if(item.body) parts.push(item.body) })
    const fullText=parts.join('. ')
    Speaker.speak(fullText)
    setSpeaking(true)
    // When lesson finishes reading, auto-read first quiz question
    const poll=setInterval(()=>{
      if(!Speaker.isSpeaking()){
        clearInterval(poll)
        setSpeaking(false)
        if(lesson.quiz?.questions?.length>0){
          const q=lesson.quiz.questions[0]
          const qText=`Lesson complete! Now let us do the quiz. Question 1. ${q.question}. A: ${q.options[0]}. B: ${q.options[1]}. C: ${q.options[2]}. D: ${q.options[3]}.`
          setTimeout(()=>{
            Speaker.speak(qText)
          },1000)
        }
      }
    },600)
  }

  function stopHandsFree(){
    Speaker.stop(); setSpeaking(false); setHandsFree(false)
  }

  function toggleAmbient(id){
    const isNowPlaying = AmbientEngine.toggle(id)
    setAmbientId(isNowPlaying ? id : null)
  }

  function speakLesson(){
    if(!lesson)return
    if(speaking){ Speaker.stop(); setSpeaking(false); return }
    // Build full text from all content items
    const parts=[lesson.title]
    ;(lesson.content||[]).forEach(item=>{
      if(item.body) parts.push(item.body)
      if(item.title) parts.push(item.title)
    })
    const fullText=parts.join('. ')
    Speaker.speak(fullText)
    setSpeaking(true)
    // Poll until done
    const poll=setInterval(()=>{
      if(!Speaker.isSpeaking()){ setSpeaking(false); clearInterval(poll) }
    },500)
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

  if(lookingUp)return <LessonSkeleton/>

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
            {/* Ambient sound toggle */}
            {AmbientEngine.isSupported()&&(
              <button onClick={()=>{SoundEngine.tap();setShowAmbient(a=>!a)}}
                title="Study background sounds"
                className="text-xl transition-all active:scale-125"
                style={{color:ambientId?'#A78BFA':'#475569'}}>
                {ambientId?'🎵':'🎶'}
              </button>
            )}
            {/* Hands-free mode */}
            {Speaker.isSupported()&&lesson?.quiz?.questions?.length>0&&!handsFree&&(
              <button onClick={()=>{SoundEngine.tap();startHandsFree()}}
                title="Hands-free: reads lesson then quizzes you"
                className="text-xl transition-all active:scale-125"
                style={{color:'#64748B'}}>
                🎧
              </button>
            )}
            {Speaker.isSupported()&&(
              <button onClick={speakLesson}
                title={speaking?'Stop reading':'Read lesson aloud'}
                className="text-xl transition-all active:scale-125"
                style={{color:speaking?'#14B8A6':'#475569'}}>
                {speaking?'⏹':'🔊'}
              </button>
            )}
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

      {/* ── Hands-Free mode active banner ── */}
      {handsFree&&(
        <div className="mx-5 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{background:'rgba(13,148,136,0.12)',border:'1px solid rgba(13,148,136,0.35)'}}>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{color:'#5EEAD4'}}>🎧 Hands-Free Mode Active</p>
            <p className="text-xs mt-0.5" style={{color:'#64748B'}}>Put your phone down — I will read the lesson then quiz you automatically.</p>
          </div>
          <button onClick={stopHandsFree}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{background:'rgba(239,68,68,0.15)',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)'}}>
            Stop
          </button>
        </div>
      )}

      {/* ── Ambient sound drawer ── */}
      {showAmbient&&(
        <div className="mx-5 mt-3 rounded-2xl overflow-hidden"
          style={{background:'#131829',border:'1px solid rgba(124,58,237,0.3)'}}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{borderColor:'rgba(124,58,237,0.2)'}}>
            <div>
              <span className="text-sm font-bold text-white">🎵 Study Sounds</span>
              <p className="text-xs mt-0.5" style={{color:'#64748B'}}>Play in background while you read</p>
            </div>
            {ambientId&&(
              <button onClick={()=>toggleAmbient(ambientId)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{background:'rgba(239,68,68,0.15)',color:'#F87171'}}>
                Stop
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1 p-3">
            {AMBIENT_SOUNDS.map(s=>(
              <button key={s.id} onClick={()=>toggleAmbient(s.id)}
                className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all active:scale-95"
                style={{
                  background:ambientId===s.id?'rgba(124,58,237,0.25)':'rgba(255,255,255,0.04)',
                  border:`1px solid ${ambientId===s.id?'rgba(124,58,237,0.6)':'rgba(255,255,255,0.08)'}`,
                }}>
                <span style={{fontSize:22}}>{s.emoji}</span>
                <span className="text-center leading-tight"
                  style={{fontSize:9,color:ambientId===s.id?'#A78BFA':'#64748B',fontWeight:ambientId===s.id?700:400}}>
                  {s.label.split(' ')[0]}
                </span>
                {ambientId===s.id&&<div className="w-1.5 h-1.5 rounded-full" style={{background:'#A78BFA'}}/>}
              </button>
            ))}
          </div>
          {ambientId&&(
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{color:'#64748B'}}>Vol</span>
                <input type="range" min="0" max="1" step="0.05"
                  defaultValue={AmbientEngine.getVolume()}
                  onChange={e=>AmbientEngine.setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1" style={{accentColor:'#7C3AED'}}/>
              </div>
            </div>
          )}
        </div>
      )}

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
