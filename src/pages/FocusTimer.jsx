import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { studentDB } from '../db/progressDB.js'
import { SoundEngine, Haptics, Speaker } from '../utils/soundEngine.js'
import { recordStudySession } from '../ai/learning.js'
import { recordStudyActivity } from '../utils/notifications.js'
import { invalidateProfileCache } from '../ai/chatbot.js'
import ParticleBurst from '../components/ParticleBurst.jsx'

const SESSIONS=[{label:'15 min',secs:15*60,xp:30},{label:'25 min',secs:25*60,xp:50},{label:'45 min',secs:45*60,xp:80}]
const SIZE=220, R=92, CIRC=2*Math.PI*R

export default function FocusTimer(){
  const {student,refreshStudent}=useUser()
  const navigate=useNavigate()
  const [si,setSi]=useState(1)
  const [tl,setTl]=useState(SESSIONS[1].secs)
  const [running,setRunning]=useState(false)
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const ref=useRef(null)
  const sess=SESSIONS[si]
  const pct=1-tl/sess.secs
  const dash=CIRC*(1-pct)
  const mins=Math.floor(tl/60).toString().padStart(2,'0')
  const secs=(tl%60).toString().padStart(2,'0')
  const acc=done?'#F59E0B':running?'#14B8A6':'#3A4560'

  useEffect(()=>{setTl(sess.secs);setRunning(false);setDone(false)},[si])
  useEffect(()=>{
    if(!running){clearInterval(ref.current);return}
    ref.current=setInterval(()=>{
      setTl(t=>{if(t<=1){clearInterval(ref.current);finish();return 0}return t-1})
    },1000)
    return()=>clearInterval(ref.current)
  },[running])

  async function finish(){
    setRunning(false);setDone(true)
    SoundEngine.timerComplete();Haptics.timerDone()
    if(Speaker.isSupported()&&Speaker.isEnabled())Speaker.speak('Focus session complete! Great work. Take a short break.')
    setBurst(true);setTimeout(()=>setBurst(false),1400)
    if(student){
      await studentDB.update(student.id,{total_xp:(student.total_xp||0)+sess.xp})
      recordStudySession(student.id, 100, Math.round(sess.secs/60)).catch(()=>{})
      recordStudyActivity()
      invalidateProfileCache()
      refreshStudent()
    }
  }

  function toggle(){if(done)return;SoundEngine.tap();setRunning(r=>!r)}
  function reset(){clearInterval(ref.current);setRunning(false);setDone(false);setTl(sess.secs)}

  return(
    <div className="min-h-screen flex flex-col pb-24" style={{background:'#0C0F1A'}}>
      <ParticleBurst active={burst} count={28}/>
      <div className="px-5 pt-12 pb-5 border-b" style={{background:'#131829',borderColor:'#1A2035'}}>
        <button onClick={()=>navigate('/dashboard')} className="text-slate-400 text-sm mb-3 block">← Dashboard</button>
        <h1 className="text-2xl font-display font-extrabold text-white">⏱ Focus Timer</h1>
        <p className="text-slate-400 text-sm">Study focused, earn bonus XP</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        {/* Session picker */}
        <div className="flex gap-2 mb-10">
          {SESSIONS.map((s,i)=>(
            <button key={i} onClick={()=>{if(!running){setSi(i);SoundEngine.tap()}}}
              disabled={running} className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-90"
              style={si===i?{background:'linear-gradient(135deg,#0D9488,#0369A1)',color:'#fff'}:{background:'#131829',border:'1px solid #252D45',color:'#94A3B8'}}>
              {s.label}<span className="block text-xs opacity-70">+{s.xp} XP</span>
            </button>
          ))}
        </div>

        {/* SVG Ring */}
        <div className="relative" style={{width:SIZE,height:SIZE}}>
          <svg width={SIZE} height={SIZE}>
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#1A2035" strokeWidth="14"/>
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={acc} strokeWidth="14"
              strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dash}
              className="timer-ring" style={{filter:running?`drop-shadow(0 0 8px ${acc})`:'none'}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
            style={{background:running?'rgba(13,148,136,0.05)':done?'rgba(245,158,11,0.05)':'transparent',transition:'background 0.5s'}}>
            {done?(
              <div className="text-center">
                <div className="text-4xl mb-1">🎉</div>
                <div className="font-display font-extrabold text-xl" style={{color:'#F59E0B'}}>+{sess.xp} XP!</div>
              </div>
            ):(
              <>
                <span className="font-mono text-4xl font-bold text-white tabular-nums">{mins}:{secs}</span>
                <span className="text-slate-500 text-xs mt-1">{running?'Focus mode':'Ready'}</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mt-10">
          {!done&&(
            <button onClick={toggle}
              className="w-20 h-20 rounded-full font-bold text-white text-2xl transition-all active:scale-90"
              style={{background:running?'#131829':'linear-gradient(135deg,#0D9488,#0369A1)',border:running?`2px solid ${acc}`:'none',boxShadow:running?`0 0 20px ${acc}50`:'none'}}>
              {running?'⏸':'▶'}
            </button>
          )}
          <button onClick={reset}
            className="w-20 h-20 rounded-full font-bold text-slate-400 text-2xl transition-all active:scale-90 glass">↺</button>
          {done&&(
            <button onClick={()=>navigate('/dashboard')}
              className="px-6 py-3 rounded-2xl font-bold text-black transition-all active:scale-95"
              style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
              Go Home →
            </button>
          )}
        </div>

        <div className="mt-8 glass rounded-2xl p-4 max-w-xs text-center">
          <p className="text-slate-400 text-sm">
            {running?'📵 Put your phone face down and focus!':done?`🌟 Amazing session! You earned ${sess.xp} XP.`:'💡 Remove distractions before starting.'}
          </p>
        </div>
      </div>
    </div>
  )
}
