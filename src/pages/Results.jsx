import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { getGrade, getXpForScore } from '../utils/scoring.js'
import ParticleBurst from '../components/ParticleBurst.jsx'
import { GAMES, getUnlockStatus } from '../utils/gameUnlocks.js'

const ICONS={mathematics:'📐',physics:'⚡',biology:'🧬',chemistry:'🧪'}

export default function Results(){
  const {state}=useLocation(), navigate=useNavigate(), {student}=useUser()
  const {lesson,questions=[],answers=[],score=0,subject,topicId}=state||{}
  const {grade,label,color}=getGrade(score)
  const xp=getXpForScore(score)
  const passed=score>=(lesson?.quiz?.pass_score||60)
  const correct=answers.filter((a,i)=>a===questions[i]?.answer).length
  const [burst,setBurst]=useState(false)
  const [newUnlock,setNewUnlock]=useState(null)

  useEffect(()=>{
    if(passed){setBurst(true);setTimeout(()=>setBurst(false),1200)}
    // Check for newly unlocked game levels
    if(student && passed){
      getUnlockStatus(student.id).then(data=>{
        // Find any game that just got a new level (simple heuristic: check level 1 of each)
        for(const game of GAMES){
          const ul = data.status[game.id]?.unlockedLevels || []
          if(ul.length > 0){
            const lvl = game.levels.find(l => l.level === ul[ul.length-1])
            // Only show if first time reaching this level (no high score yet)
            const hs = data.status[game.id]?.highScores[ul[ul.length-1]]
            if(lvl && !hs){
              setNewUnlock({ game, level: lvl })
              break
            }
          }
        }
      })
    }
  },[])

  async function share(){
    const text=`📚 ${student?.name} completed "${lesson?.title}" in ${subject} — scored ${score}%! Studying with Elimu Learn.`
    try{if(navigator.share)await navigator.share({text});else await navigator.clipboard?.writeText(text)}catch(e){}
  }

  if(!lesson)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <button onClick={()=>navigate('/dashboard')} style={{color:'#14B8A6'}}>← Dashboard</button>
    </div>
  )

  const scoreCol=score>=80?'#4ADE80':score>=60?'#14B8A6':score>=40?'#F59E0B':'#FB7185'

  return(
    <div className="min-h-screen pb-8" style={{background:'#0C0F1A'}}>
      <ParticleBurst active={burst} count={30}/>

      <div className="relative px-5 pt-16 pb-10 text-center overflow-hidden"
        style={{background:`linear-gradient(180deg,${passed?'rgba(13,148,136,0.1)':'rgba(239,68,68,0.06)'} 0%,#0C0F1A 100%)`}}>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(circle at 50% 0%,${passed?'rgba(13,148,136,0.18)':'rgba(239,68,68,0.1)'} 0%,transparent 70%)`}}/>
        <div className="page-enter">
          <div className="text-7xl font-display font-extrabold mb-2 tabular-nums" style={{color:scoreCol}}>{score}%</div>
          <div className={`text-xl font-display font-bold mb-1 ${color}`}>{grade} — {label}</div>
          <div className="text-slate-400 text-sm">{correct} / {questions.length} correct</div>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full page-delay-1"
          style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)'}}>
          <span>⭐</span><span className="font-bold text-sm" style={{color:'#F59E0B'}}>+{xp} XP earned!</span>
        </div>
      </div>

      <div className="px-5 space-y-3 max-w-2xl mx-auto">
        <h2 className="text-white font-display font-bold text-base page-delay-2">Answer Review</h2>
        {questions.map((q,i)=>{
          const ok=answers[i]===q.answer
          return(
            <div key={i} className="rounded-2xl p-4 page-delay-2"
              style={{background:ok?'rgba(34,197,94,0.05)':'rgba(239,68,68,0.05)',border:`1px solid ${ok?'rgba(34,197,94,0.18)':'rgba(239,68,68,0.18)'}`}}>
              <p className="text-white text-sm font-semibold mb-2">{i+1}. {q.question}</p>
              <p className="text-xs mb-1 font-medium" style={{color:ok?'#4ADE80':'#FB7185'}}>Your answer: {answers[i]||'(no answer)'}</p>
              {!ok&&<p className="text-xs mb-1 font-medium" style={{color:'#4ADE80'}}>Correct: {q.answer}</p>}
              <p className="text-slate-500 text-xs">{q.explanation}</p>
            </div>
          )
        })}

        <div className="space-y-3 pt-2 page-delay-3">
          <button onClick={share} className="w-full py-3 rounded-2xl font-semibold text-sm glass active:scale-95 transition-all" style={{color:'#F59E0B'}}>
            📤 Share with Parent / Guardian
          </button>
          <button onClick={()=>navigate(`/quiz/${lesson.id}`,{state:{lesson,subject,topicId}})}
            className="w-full py-3 rounded-2xl font-bold transition-all active:scale-95"
            style={{background:'#1A2035',border:'1px solid #252D45',color:'#14B8A6'}}>
            🔄 Try Again
          </button>
          <button onClick={()=>navigate(`/subject/${subject}`)}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-white transition-all active:scale-95"
            style={{background:`linear-gradient(135deg,${subject==='biology'?'#16A34A,#15803D':subject==='physics'?'#06B6D4,#0369A1':subject==='chemistry'?'#7C3AED,#6D28D9':'#0D9488,#0F766E'})`}}>
            {ICONS[subject]} Back to {subject}
          </button>
          <button onClick={()=>navigate('/dashboard')} className="w-full py-2 text-slate-500 text-sm">Go to Dashboard</button>
        </div>

        {/* 🎮 Game unlock notification */}
        {newUnlock && (
          <div className="mt-4 rounded-2xl p-4 page-delay-3"
            style={{background:`linear-gradient(135deg, ${newUnlock.game.color}18, ${newUnlock.game.color}08)`,border:`1px solid ${newUnlock.game.color}44`,boxShadow:`0 0 20px ${newUnlock.game.glow}`}}>
            <div className="flex items-center gap-3">
              <div className="text-3xl flex-shrink-0">{newUnlock.game.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-black uppercase tracking-widest" style={{color:'#F59E0B'}}>🔓 Game Unlocked!</span>
                </div>
                <p className="text-white font-bold text-sm">{newUnlock.game.name}</p>
                <p className="text-xs" style={{color:newUnlock.game.color}}>Level {newUnlock.level.level}: {newUnlock.level.name}</p>
              </div>
              <button onClick={()=>navigate('/games')}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
                style={{background:newUnlock.game.color}}>
                Play →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
