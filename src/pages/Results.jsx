import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { getGrade, getXpForScore } from '../utils/scoring.js'
import { Speaker } from '../utils/soundEngine.js'
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
  const [speakingIdx,setSpeakingIdx]=useState(null)

  useEffect(()=>{
    if(passed){setBurst(true);setTimeout(()=>setBurst(false),1200)}
    if(Speaker.isSupported()&&Speaker.isEnabled()){
      const s=passed
        ?`Congratulations! You scored ${score}%, getting ${correct} out of ${questions.length} correct. Well done!`
        :`You scored ${score}%, getting ${correct} out of ${questions.length} correct. Review the explanations below and try again.`
      setTimeout(()=>Speaker.speak(s),800)
    }
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

  function speakReview(q,i,userAns){
    if(speakingIdx===i){Speaker.stop();setSpeakingIdx(null);return}
    Speaker.stop()
    const ok=userAns===q.answer
    const t=`Question ${i+1}. ${q.question}. ${ok?'Correct.':('Incorrect. '+(userAns?`You answered ${userAns}. `:'')+(q.answer?`The correct answer is ${q.answer}. `:''))}${q.explanation||''}`
    Speaker.speak(t);setSpeakingIdx(i)
    const poll=setInterval(()=>{if(!Speaker.isSpeaking()){setSpeakingIdx(null);clearInterval(poll)}},500)
  }

  async function share(){
    const text=`📚 ${student?.name} completed "${lesson?.title}" in ${subject} — scored ${score}%! Studying with Eqla Learn.`
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
              style={{background:ok?'rgba(34,197,94,0.05)':'rgba(239,68,68,0.07)',border:`1px solid ${ok?'rgba(34,197,94,0.18)':'rgba(239,68,68,0.3)'}`}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{ok?'✅':'❌'}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{background:ok?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',color:ok?'#4ADE80':'#FB7185'}}>
                    {ok?'Correct':'Incorrect'}
                  </span>
                </div>
                {Speaker.isSupported()&&(
                  <button onClick={()=>speakReview(q,i,answers[i])}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:speakingIdx===i?'#14B8A6':'#475569'}}>
                    <span style={{fontSize:12}}>{speakingIdx===i?'⏹':'🔊'}</span>
                  </button>
                )}
              </div>
              {/* Question */}
              <p className="text-white text-sm font-semibold mb-3">{i+1}. {q.question}</p>
              {/* Options if available */}
              {q.options&&(
                <div className="space-y-1.5 mb-3">
                  {q.options.map((opt,j)=>{
                    const isCorrect=opt===q.answer
                    const isChosen=opt===answers[i]
                    let bg='rgba(255,255,255,0.03)', border='rgba(255,255,255,0.08)', color='#94A3B8'
                    if(isCorrect){bg='rgba(34,197,94,0.12)';border='rgba(34,197,94,0.4)';color='#4ADE80'}
                    else if(isChosen&&!ok){bg='rgba(239,68,68,0.12)';border='rgba(239,68,68,0.4)';color='#FB7185'}
                    return(
                      <div key={j} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
                        style={{background:bg,border:`1px solid ${border}`,color}}>
                        <span className="font-bold">{isCorrect?'✓':isChosen&&!ok?'✗':'○'}</span>
                        <span className={isCorrect||isChosen?'font-semibold':''}>{opt}</span>
                        {isCorrect&&<span className="ml-auto font-bold">Correct answer</span>}
                        {isChosen&&!ok&&<span className="ml-auto">Your answer</span>}
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Explanation — prominent for wrong answers */}
              {q.explanation&&(
                <div className="rounded-xl px-3 py-2.5 mt-1"
                  style={{background:ok?'rgba(255,255,255,0.03)':'rgba(245,158,11,0.08)',border:`1px solid ${ok?'rgba(255,255,255,0.06)':'rgba(245,158,11,0.25)'}`}}>
                  <p className="text-xs font-bold mb-0.5" style={{color:ok?'#475569':'#F59E0B'}}>
                    {ok?'💡 Note':'💡 Explanation'}
                  </p>
                  <p className="text-xs leading-relaxed" style={{color:ok?'#64748B':'#CBD5E1'}}>{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}

        <div className="space-y-3 pt-2 page-delay-3">
          <button onClick={share} className="w-full py-3 rounded-2xl font-semibold text-sm glass active:scale-95 transition-all" style={{color:'#F59E0B'}}>
            📤 Share with Parent / Guardian
          </button>
          {!passed && (
            <button onClick={()=>navigate('/ai-tutor')}
              className="w-full py-3 rounded-2xl font-bold transition-all active:scale-95"
              style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.35)',color:'#A78BFA'}}>
              🧠 Ask AI to explain what I got wrong
            </button>
          )}

          {/* ── Weak-topic deep-link: only show when failed ── */}
          {!passed && (
            <div className="rounded-2xl p-4" style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)'}}>
              <p className="text-xs font-black mb-2" style={{color:'#F87171'}}>📖 Review the lesson first</p>
              <p className="text-xs mb-3" style={{color:'#64748B'}}>
                Re-reading <span style={{color:'#fff',fontWeight:700}}>"{lesson?.title}"</span> before retrying will help you score higher.
              </p>
              <button onClick={()=>navigate(`/lesson/${lesson.id}`,{state:{lesson,subject,topicId}})}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{background:'rgba(239,68,68,0.15)',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)'}}>
                📚 Go back to "{lesson?.title}"
              </button>
            </div>
          )}

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
