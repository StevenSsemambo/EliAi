import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { progressDB, goalsDB, achievementsDB } from '../db/progressDB.js'
import { useSubjectTheme } from '../context/SubjectThemeContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'
import XPOdometer from '../components/XPOdometer.jsx'
import ParticleBurst from '../components/ParticleBurst.jsx'
import Navbar from '../components/Navbar.jsx'
import SmartTutorWidget from '../components/SmartTutorWidget.jsx'

const AVATARS=['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋']

const SUBJECTS=[
  {id:'mathematics',label:'Mathematics',icon:'📐',grad:'linear-gradient(135deg,#0D9488,#0F766E)',glow:'glow-teal'},
  {id:'physics',    label:'Physics',    icon:'⚡',grad:'linear-gradient(135deg,#06B6D4,#0369A1)',glow:'glow-cyan'},
  {id:'biology',    label:'Biology',    icon:'🧬',grad:'linear-gradient(135deg,#16A34A,#15803D)',glow:'glow-green'},
  {id:'chemistry',  label:'Chemistry',  icon:'🧪',grad:'linear-gradient(135deg,#7C3AED,#6D28D9)',glow:'glow-violet'},
]

const ALL_SUBJECT_FILES={
  mathematics:{s1:['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],s2:['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],s3:['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],s4:['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],s5:['complex_numbers','differential_equations','further_calculus','mechanics','numerical_methods','probability_advanced'],s6:['applied_mathematics','further_pure','number_theory','pure_mathematics','statistics_probability']},
  physics:{s1:['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],s2:['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],s3:['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],s4:['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],s5:['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],s6:['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity']},
  biology:{s1:['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],s2:['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],s3:['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],s4:['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],s5:['biochemistry','bioenergetics','cell_biology_advanced','ecology_advanced','genetics_advanced','microbiology'],s6:['bioethics','developmental_biology','immunology','molecular_biology']},
  chemistry:{s1:['atoms','bonding','matter','separation_techniques','water'],s2:['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],s3:['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],s4:['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],s5:['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],s6:['biochemistry','green_chemistry','industrial_chemistry','pharmaceuticals','polymers']},
}

async function getLessonById(lessonId,classLevel){
  const cls=classLevel?.toLowerCase()||'s1'
  for(const [subject,classes] of Object.entries(ALL_SUBJECT_FILES)){
    for(const file of (classes[cls]||[])){
      try{
        const mod=await import(`../curriculum/${subject}/${cls}/${file}.json`)
        const lesson=(mod.default.lessons||[]).find(l=>l.id===lessonId)
        if(lesson)return{lesson,subject,topicId:mod.default.topic_id}
      }catch(e){}
    }
  }
  return null
}

function XPBar({xp}){
  const level=Math.floor(xp/500)+1
  const pct=(xp%500)/500*100
  return(
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-bold" style={{color:'#F59E0B'}}>Level {level}</span>
        <span className="text-xs text-slate-500 font-mono">{xp} / {level*500} XP</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{background:'#1A2035'}}>
        <div className="h-full rounded-full xp-fill" style={{width:`${pct}%`,background:'linear-gradient(90deg,#0D9488,#F59E0B)'}}/>
      </div>
    </div>
  )
}

function GoalWidget({student}){
  const [goal,setGoal]=useState(null)
  const [week,setWeek]=useState([])
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState(2)
  useEffect(()=>{
    if(!student)return
    goalsDB.getTodayGoal(student.id).then(g=>{
      setGoal(g)
      if(!g)goalsDB.setTodayGoal(student.id,2).then(()=>goalsDB.getTodayGoal(student.id).then(setGoal))
    })
    goalsDB.getWeekHistory(student.id).then(setWeek)
  },[student])
  const target=goal?.target||2,done=goal?.completed||0,pct=Math.min(100,done/target*100),met=done>=target
  const dow=new Date().getDay(),DL=['S','M','T','W','T','F','S']
  async function save(){await goalsDB.setTodayGoal(student.id,draft);goalsDB.getTodayGoal(student.id).then(setGoal);setEditing(false)}
  return(
    <div className={`rounded-2xl p-4 transition-all ${met?'glass-amber':'glass'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xl ${met?'streak-flame':''}`}>{met?'🎉':'🎯'}</span>
          <span className="text-white font-bold text-sm">Today's Goal</span>
        </div>
        <button onClick={()=>{setEditing(!editing);setDraft(target);SoundEngine.tap()}}
          className="text-xs font-semibold" style={{color:editing?'#94A3B8':'#F59E0B'}}>
          {editing?'✕ Cancel':'✏️ Edit'}
        </button>
      </div>
      {editing?(
        <div className="mb-3">
          <p className="text-slate-400 text-xs mb-2">Daily lesson target:</p>
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>setDraft(n)} className="w-9 h-9 rounded-xl text-sm font-extrabold transition-all active:scale-90"
                style={{background:draft===n?'#F59E0B':'#1A2035',color:draft===n?'#0C0F1A':'#94A3B8'}}>
                {n}
              </button>
            ))}
            <button onClick={save} className="ml-auto px-4 py-2 rounded-xl text-sm font-bold text-black" style={{background:'#F59E0B'}}>Save</button>
          </div>
        </div>
      ):(
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">{met?'✅ Goal met!':`${done} of ${target} lessons`}</span>
            <span className="font-bold" style={{color:met?'#F59E0B':'#94A3B8'}}>{Math.round(pct)}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{background:'#1A2035'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{width:`${pct}%`,background:met?'#F59E0B':'linear-gradient(90deg,#0D9488,#14B8A6)'}}/>
          </div>
        </div>
      )}
      {week.length>0&&(
        <div className="flex justify-between mt-2">
          {week.map((d,i)=>{
            const isToday=i===6,letter=DL[(dow-(6-i)+7)%7]
            return(
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="text-xs" style={{color:isToday?'#F59E0B':'#4A5568',fontWeight:isToday?700:400}}>{letter}</div>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{background:d.met?'#F59E0B':d.completed>0?'#252D45':'#1A2035',color:d.met?'#0C0F1A':d.completed>0?'#94A3B8':'#3A4560',outline:isToday?'2px solid #F59E0B':'none',outlineOffset:'1px'}}>
                  {d.met?'✓':d.completed>0?d.completed:'·'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Dashboard(){
  const {student}=useUser()
  const navigate=useNavigate()
  const {theme}=useTheme()
  const {clearSubject}=useSubjectTheme()
  const [stats,setStats]=useState({completed:0,avgScore:0})
  const [cont,setCont]=useState(null)
  const [weak,setWeak]=useState([])
  const [badgeCount,setBadgeCount]=useState(0)
  const [burst,setBurst]=useState(false)
  const [badgeOverlay,setBadgeOverlay]=useState(null)
  const prevXP=useRef(student?.total_xp||0)

  useEffect(()=>{clearSubject()},[])

  useEffect(()=>{
    if(!student)return
    progressDB.getStats(student.id).then(setStats)
    progressDB.getAllProgress(student.id).then(async prog=>{
      const fresh=await achievementsDB.checkAndAward(student.id,prog,student)
      if(fresh.length>0){
        setBadgeOverlay(fresh[0]);SoundEngine.badgeUnlocked()
        setBurst(true);setTimeout(()=>setBurst(false),1200)
      }
      const all=await achievementsDB.getEarned(student.id)
      setBadgeCount(all.filter(b=>b.earned).length)
      const sorted=[...prog].sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0))
      const tgt=sorted.find(p=>p.status==='in_progress')||sorted.find(p=>p.status==='completed')
      if(tgt){getLessonById(tgt.lesson_id,student.class_level).then(d=>{if(d)setCont({...d,status:tgt.status})})}
      const wk=prog.filter(p=>p.status==='completed'&&p.best_score<70).sort((a,b)=>a.best_score-b.best_score).slice(0,3)
      Promise.all(wk.map(async p=>{const d=await getLessonById(p.lesson_id,student.class_level);return d?{...d,score:p.best_score,lessonId:p.lesson_id}:null})).then(r=>setWeak(r.filter(Boolean)))
    })
  },[student])

  useEffect(()=>{
    if(student&&student.total_xp>prevXP.current){SoundEngine.xpEarned();prevXP.current=student.total_xp}
  },[student?.total_xp])

  if(!student)return null

  return(
    <div className="min-h-screen pb-24" style={{background:theme.bg}}>
      <ParticleBurst active={burst}/>

      {/* Badge overlay */}
      {badgeOverlay&&(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center" style={{background:'rgba(12,15,26,0.92)',backdropFilter:'blur(12px)'}} onClick={()=>setBadgeOverlay(null)}>
          <div className="text-center badge-reveal">
            <div className="text-7xl mb-4">{badgeOverlay.icon}</div>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:'#F59E0B'}}>Badge Unlocked!</div>
            <div className="text-white text-2xl font-display font-extrabold mb-1">{badgeOverlay.label}</div>
            <div className="text-slate-400 text-sm mb-6">{badgeOverlay.desc}</div>
            <div className="text-slate-600 text-xs">Tap anywhere to continue</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-6 relative overflow-hidden" style={{background:'linear-gradient(180deg,#131829 0%,#0C0F1A 100%)'}}>
        <div className="absolute top-0 right-0 w-56 h-56 pointer-events-none" style={{background:'radial-gradient(circle,rgba(13,148,136,0.1) 0%,transparent 70%)'}}/>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-slate-500 text-sm mb-0.5">Welcome back,</p>
            <h1 className="text-2xl font-display font-extrabold text-white leading-tight">{student.name} {AVATARS[student.avatar||0]}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm font-bold" style={{color:'#F59E0B'}}>{student.class_level}</span>
              <span className="text-slate-700">·</span>
              <span className="text-sm">
                <span className="streak-flame">🔥</span>
                <span className="text-slate-300 font-semibold ml-1">{student.streak_days||1} day streak</span>
              </span>
            </div>
          </div>
          <Link to="/achievements" onClick={()=>SoundEngine.tap()}
            className="flex flex-col items-center glass rounded-2xl p-3 active:scale-90 transition-all">
            <span className="text-2xl">🏅</span>
            <span className="text-xs font-bold mt-0.5" style={{color:'#F59E0B'}}>{badgeCount}</span>
          </Link>
        </div>
        <XPBar xp={student.total_xp||0}/>
      </div>

      <div className="px-5 space-y-4 mt-2">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 page-enter">
          {[{label:'Lessons',val:stats.completed,icon:'✅'},{label:'Avg Score',val:`${stats.avgScore}%`,icon:'🎯'},{label:'Total XP',val:<XPOdometer value={student.total_xp||0}/>,icon:'⭐'}].map(s=>(
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-base font-display font-extrabold text-white">{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Goal */}
        <div className="page-delay-1"><GoalWidget student={student}/></div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 page-delay-1">
          <Link to="/quick-quiz" onClick={()=>SoundEngine.tap()} className="rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all"
            style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)'}}>
            <span className="text-2xl">🎲</span>
            <div><div className="text-white font-bold text-sm">Quick Quiz</div><div className="text-slate-400 text-xs">Random revision</div></div>
          </Link>
          <Link to="/exam-center" onClick={()=>SoundEngine.tap()} className="rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all"
            style={{background:'linear-gradient(135deg,#F59E0B22,#EF444422)',border:'1px solid #F59E0B44'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#F59E0B22'}}>📋</div>
            <div><div className="text-white font-bold text-sm">Exam Centre</div><div className="text-slate-400 text-xs">Mock exams &amp; tests</div></div>
          </Link>
        <Link to="/focus-timer" onClick={()=>SoundEngine.tap()} className="rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all"
            style={{background:'rgba(13,148,136,0.08)',border:'1px solid rgba(13,148,136,0.2)'}}>
            <span className="text-2xl">⏱</span>
            <div><div className="text-white font-bold text-sm">Focus Timer</div><div className="text-slate-400 text-xs">Earn bonus XP</div></div>
          </Link>
        </div>

        {/* 🎮 Space Academy Game Hub Banner */}
        <Link to="/games" onClick={()=>SoundEngine.tap()}
          className="block rounded-2xl overflow-hidden active:scale-95 transition-all page-delay-1"
          style={{background:'linear-gradient(135deg,#050810 0%,#0A0D1A 50%,#0F1629 100%)',border:'1px solid rgba(124,58,237,0.35)',boxShadow:'0 0 20px rgba(124,58,237,0.15)'}}>
          <div className="p-4 relative overflow-hidden">
            {/* Starfield dots */}
            <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'radial-gradient(circle, rgba(200,220,255,0.4) 1px, transparent 1px)',backgroundSize:'20px 20px',opacity:0.3}}/>
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{background:'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(8,145,178,0.3))',border:'1px solid rgba(124,58,237,0.4)'}}>
                  🚀
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-black text-base">Space Academy</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{background:'rgba(124,58,237,0.2)',color:'#A78BFA',border:'1px solid rgba(124,58,237,0.3)'}}>
                    6 GAMES
                  </span>
                </div>
                <p className="text-xs leading-tight mb-2" style={{color:'#64748B'}}>
                  Study to unlock cosmic game levels 🌌
                </p>
                <div className="flex gap-2 text-xs flex-wrap">
                  {['🌌 Memory','🔭 Puzzle','🔢 Warp','🧠 Sequence','🌀 Logic','⚛️ Chain'].map(g=>(
                    <span key={g} className="px-2 py-0.5 rounded-full" style={{background:'rgba(124,58,237,0.12)',color:'#A78BFA'}}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-slate-600 text-lg flex-shrink-0">›</span>
            </div>
          </div>
        </Link>

        {/* Continue */}
        {cont&&(
          <div className="page-delay-2">
            <h2 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">▶ Continue Learning</h2>
            <button onClick={()=>{SoundEngine.tap();navigate(`/lesson/${cont.lesson.id}`,{state:{lesson:cont.lesson,subject:cont.subject,topicId:cont.topicId}})}}
              className="w-full glass rounded-2xl p-4 text-left active:scale-95 transition-all" style={{border:'1px solid rgba(13,148,136,0.2)'}}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:'rgba(13,148,136,0.15)'}}>
                  {cont.status==='in_progress'?'🔄':'🔁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm truncate">{cont.lesson.title}</div>
                  <div className="text-xs mt-0.5 capitalize" style={{color:'#14B8A6'}}>{cont.subject} · {cont.status==='in_progress'?'In progress':'Review'}</div>
                </div>
                <span className="text-xl" style={{color:'#14B8A6'}}>›</span>
              </div>
            </button>
          </div>
        )}

        {/* Weak areas */}
        {weak.length>0&&(
          <div className="page-delay-2">
            <h2 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">⚠ Needs Review</h2>
            <div className="space-y-2">
              {weak.map(w=>(
                <button key={w.lessonId} onClick={()=>{SoundEngine.tap();navigate(`/lesson/${w.lessonId}`,{state:{lesson:w.lesson,subject:w.subject,topicId:w.topicId}})}}
                  className="w-full glass rounded-2xl p-3 text-left active:scale-95 transition-all" style={{border:'1px solid rgba(239,68,68,0.18)'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0" style={{background:'rgba(239,68,68,0.12)',color:'#FB7185'}}>{w.score}%</div>
                    <div className="flex-1 min-w-0"><div className="text-white font-semibold text-sm truncate">{w.lesson.title}</div><div className="text-slate-500 text-xs capitalize">{w.subject}</div></div>
                    <span className="text-xs font-bold" style={{color:'#FB7185'}}>Retry →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject cards */}
        <div className="page-delay-3">
          <h2 className="text-white font-display font-extrabold text-lg mb-3">📚 Your Subjects</h2>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((s,i)=>(
              <Link key={s.id} to={`/subject/${s.id}`} onClick={()=>SoundEngine.tap()}
                className={`card-spring-${i} rounded-2xl p-5 active:scale-95 transition-all relative overflow-hidden ${s.glow}`}
                style={{background:s.grad,border:'1px solid rgba(255,255,255,0.07)'}}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{background:'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)',transform:'translate(30%,-30%)'}}/>
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-white font-display font-extrabold text-sm">{s.label}</div>
                <div className="text-white/60 text-xs mt-0.5">{student.class_level} →</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <Link to="/leaderboard" onClick={()=>SoundEngine.tap()} className="glass rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all block page-delay-4">
          <span className="text-2xl">🏆</span>
          <div className="flex-1"><div className="text-white font-bold text-sm">Household Leaderboard</div><div className="text-slate-400 text-xs">Who's leading on this device?</div></div>
          <span className="text-slate-500">›</span>
        </Link>
      </div>
      <Navbar/>
    </div>
  )
}
