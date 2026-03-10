import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { goalsDB, quizDB } from '../db/progressDB.js'
import { calculateScore } from '../utils/scoring.js'
import { SoundEngine, Haptics } from '../utils/soundEngine.js'
import { saveDetailedAttempt } from '../ai/brain.js'
import { recordStudySession } from '../ai/learning.js'
import { invalidateProfileCache } from '../ai/chatbot.js'

const SUBJ_FILES={
  mathematics:{s1:['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],s2:['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],s3:['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],s4:['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],s5:['complex_numbers','differential_equations','further_calculus','mechanics','numerical_methods','probability_advanced'],s6:['applied_mathematics','further_pure','number_theory','pure_mathematics','statistics_probability']},
  physics:{s1:['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],s2:['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],s3:['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],s4:['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],s5:['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],s6:['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity']},
  biology:{s1:['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],s2:['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],s3:['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],s4:['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],s5:['biochemistry','bioenergetics','cell_biology_advanced','ecology_advanced','genetics_advanced','microbiology'],s6:['bioethics','developmental_biology','immunology','molecular_biology']},
  chemistry:{s1:['atoms','bonding','matter','separation_techniques','water'],s2:['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],s3:['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],s4:['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],s5:['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],s6:['biochemistry','green_chemistry','industrial_chemistry','pharmaceuticals','polymers']},
}
const ICONS={mathematics:'📐',physics:'⚡',biology:'🧬',chemistry:'🧪'}
const Q_TIME=25

async function fetchQuestions(cls='s1',count=5){
  const all=[]
  for(const [subj,classes] of Object.entries(SUBJ_FILES)){
    for(const file of (classes[cls]||[])){
      try{
        const m=await import(`../curriculum/${subj}/${cls}/${file}.json`)
        for(const l of (m.default.lessons||[])){
          for(const q of (l.quiz?.questions||[])){
            all.push({...q,lessonTitle:l.title,subj,icon:ICONS[subj]})
          }
        }
      }catch(e){}
    }
  }
  for(let i=all.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[all[i],all[j]]=[all[j],all[i]]}
  return all.slice(0,count)
}

export default function QuickQuiz(){
  const {student}=useUser()
  const navigate=useNavigate()
  const [qs,setQs]=useState([])
  const [loading,setLoading]=useState(true)
  const [cur,setCur]=useState(0)
  const [answers,setAnswers]=useState([])
  const [selected,setSelected]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [timeLeft,setTimeLeft]=useState(Q_TIME)
  const [done,setDone]=useState(false)
  const [score,setScore]=useState(0)
  const timerRef=useRef(null)
  const confirmRef=useRef(null)

  function load(){
    setLoading(true);setDone(false);setAnswers([]);setCur(0);setSelected(null);setConfirmed(false)
    fetchQuestions(student?.class_level?.toLowerCase()||'s1').then(q=>{setQs(q);setLoading(false)})
  }
  useEffect(()=>{load()},[])

  useEffect(()=>{
    if(loading||confirmed||done)return
    setTimeLeft(Q_TIME)
    timerRef.current=setInterval(()=>{setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);confirmRef.current?.('__timeout__');return 0}return t-1})},1000)
    return()=>clearInterval(timerRef.current)
  },[cur,loading,confirmed])

  async function confirm(forced){
    const ans=forced||selected
    clearInterval(timerRef.current)
    const final=forced==='__timeout__'?null:ans
    const ok=final===qs[cur]?.answer
    if(ok){SoundEngine.correct();Haptics.correct()}else{SoundEngine.wrong();Haptics.wrong()}
    const newA=[...answers,final];setAnswers(newA);setConfirmed(true)
    setTimeout(async()=>{
      if(cur+1<qs.length){setCur(c=>c+1);setSelected(null);setConfirmed(false)}
      else{
        const s=Math.round(newA.filter((a,i)=>a===qs[i]?.answer).length/qs.length*100)
        setScore(s);setDone(true);SoundEngine.quizComplete()
        if(student){
          const attemptId = `quickquiz_${Date.now()}`
          await goalsDB.incrementCompleted(student.id)
          // Save to quiz history so brain.js can analyse it
          await quizDB.saveAttempt(student.id, attemptId, newA, s, qs.length * 25)
          await saveDetailedAttempt(student.id, attemptId, qs, newA)
          recordStudySession(student.id, s, Math.round(qs.length * 25 / 60)).catch(()=>{})
          invalidateProfileCache()
        }
      }
    },1000)
  }
  confirmRef.current=confirm

  const q=qs[cur]
  const timerPct=timeLeft/Q_TIME*100
  const timerCol=timeLeft>15?'#14B8A6':timeLeft>7?'#F59E0B':'#EF4444'

  if(loading)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center"><div className="text-5xl mb-4" style={{animation:'bounce 0.8s ease infinite'}}>🎲</div><p className="text-slate-400">Picking questions for you...</p></div>
    </div>
  )

  if(done)return(
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background:'#0C0F1A'}}>
      <div className="text-center">
        <div className="text-7xl mb-3">{score>=80?'🏆':score>=60?'🎯':'📚'}</div>
        <div className="text-5xl font-display font-extrabold text-white mb-1 tabular-nums">{score}%</div>
        <p className="text-slate-400 mb-8">{qs.filter((q,i)=>answers[i]===q.answer).length} / {qs.length} correct</p>
        <div className="space-y-3 w-full max-w-xs mx-auto">
          <button onClick={load} className="w-full py-4 rounded-2xl font-display font-extrabold text-white active:scale-95 transition-all"
            style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            🎲 New Round
          </button>
          <button onClick={()=>navigate('/dashboard')} className="w-full py-3 rounded-2xl font-semibold glass active:scale-95 transition-all" style={{color:'#94A3B8'}}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  return(
    <div className="min-h-screen flex flex-col" style={{background:'#0C0F1A'}}>
      <div className="px-5 pt-10 pb-4 border-b" style={{background:'#131829',borderColor:'#1A2035'}}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={()=>navigate('/dashboard')} className="text-slate-400 text-sm">✕ Exit</button>
          <span className="text-sm font-bold" style={{color:'#F59E0B'}}>🎲 Quick Quiz</span>
          <span className="text-slate-400 text-sm">{cur+1}/{qs.length}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{background:'#1A2035'}}>
          <div className="h-full rounded-full transition-all" style={{width:`${cur/qs.length*100}%`,background:'linear-gradient(90deg,#F59E0B,#0D9488)'}}/>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono w-6 text-right" style={{color:timerCol}}>{timeLeft}s</span>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background:'#1A2035'}}>
            <div className="h-full rounded-full" style={{width:`${timerPct}%`,background:timerCol,transition:'width 1s linear'}}/>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6">
        {q&&(
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{q.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{q.lessonTitle}</span>
            </div>
            <p className="text-white font-display font-extrabold text-lg leading-snug mb-6">{q.question}</p>
            <div className="space-y-3">
              {q.options?.map((opt,i)=>{
                let style={background:'#1A2035',border:'1px solid #252D45'},cls=''
                if(!confirmed){if(selected===opt)style={background:'rgba(13,148,136,0.15)',border:'2px solid #14B8A6'}}
                else{
                  if(opt===q.answer){style={background:'rgba(34,197,94,0.12)',border:'2px solid #22C55E'};cls='correct-answer'}
                  else if(opt===selected){style={background:'rgba(239,68,68,0.12)',border:'2px solid #EF4444'};cls='wrong-answer'}
                  else style={background:'#0C0F1A',border:'1px solid #131829',opacity:0.4}
                }
                return(
                  <button key={i} onClick={()=>!confirmed&&(SoundEngine.tap(),setSelected(opt))}
                    className={`w-full rounded-2xl p-4 text-left transition-all active:scale-95 ${cls}`} style={style}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{background:'#252D45',color:'#94A3B8'}}>
                        {['A','B','C','D'][i]}
                      </span>
                      <span className="text-sm text-slate-200">{opt}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {confirmed&&(
              <div className="mt-4 rounded-2xl p-3 text-sm text-slate-400 glass">{q.explanation}</div>
            )}
          </>
        )}
      </div>
      <div className="px-5 pb-8">
        <button onClick={()=>confirm()} disabled={!selected||confirmed}
          className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-white transition-all active:scale-95 disabled:opacity-30"
          style={{background:!selected||confirmed?'#1A2035':'linear-gradient(135deg,#F59E0B,#D97706)'}}>
          {confirmed?'Next →':'Confirm'}
        </button>
      </div>
    </div>
  )
}
