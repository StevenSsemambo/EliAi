import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { progressDB } from '../db/progressDB.js'
import { useSubjectTheme } from '../context/SubjectThemeContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const META={
  mathematics:{label:'Mathematics',icon:'📐',grad:'linear-gradient(135deg,#0D9488,#0F766E)',glow:'glow-teal'},
  physics:    {label:'Physics',    icon:'⚡',grad:'linear-gradient(135deg,#06B6D4,#0369A1)',glow:'glow-cyan'},
  biology:    {label:'Biology',    icon:'🧬',grad:'linear-gradient(135deg,#16A34A,#15803D)',glow:'glow-green'},
  chemistry:  {label:'Chemistry',  icon:'🧪',grad:'linear-gradient(135deg,#7C3AED,#6D28D9)',glow:'glow-violet'},
}

export default function SubjectHome(){
  const {subject}=useParams()
  const {student}=useUser()
  const {setSubject,accent}=useSubjectTheme()
  const [index,setIndex]=useState(null)
  const [progress,setProgress]=useState([])
  const meta=META[subject]||{}

  useEffect(()=>{
    setSubject(subject)
    import(`../curriculum/${subject}/index.json`).then(m=>setIndex(m.default)).catch(()=>setIndex(null))
    if(student)progressDB.getSubjectProgress(student.id,subject).then(setProgress)
  },[subject,student])

  const cls=student?.class_level?.toLowerCase()||'s1'
  const topics=index?.topics?.[cls]||[]
  const done=progress.filter(p=>p.status==='completed').length

  if(!index)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0C0F1A'}}>
      <div className="text-center"><div className="text-4xl mb-3">{meta.icon}</div><p className="text-slate-400">Loading...</p></div>
    </div>
  )

  return(
    <div className="min-h-screen pb-24" style={{background:'#0C0F1A'}}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6 relative overflow-hidden" style={{background:'linear-gradient(180deg,#131829 0%,#0C0F1A 100%)'}}>
        <div className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(circle at 80% 50%,${accent.dim} 0%,transparent 60%)`}}/>
        <Link to="/dashboard" onClick={()=>SoundEngine.tap()} className="text-slate-400 text-sm mb-4 block">← Dashboard</Link>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${meta.glow}`} style={{background:meta.grad}}>
            {meta.icon}
          </div>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-white">{meta.label}</h1>
            <p className="text-slate-400 text-sm">{student?.class_level} · {done} lessons completed</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        <h2 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Topics for {student?.class_level}</h2>
        {topics.length===0&&(
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-slate-400">No topics available yet.</p>
          </div>
        )}
        {topics.map((topic,i)=>{
          const tp=progress.filter(p=>p.topic_id===topic.id)
          const tdone=tp.filter(p=>p.status==='completed').length
          const pct=topic.lessons>0?Math.round(tdone/topic.lessons*100):0
          return(
            <Link key={topic.id} to={`/subject/${subject}/topic/${topic.id}`}
              onClick={()=>SoundEngine.tap()}
              className={`glass rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all block card-spring`}
              style={{animationDelay:`${i*0.05}s`}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
                style={{background:pct===100?accent.dim:'#1A2035',color:pct===100?accent.color:'#94A3B8',border:`1px solid ${pct===100?accent.color:'#252D45'}`}}>
                {pct===100?'✓':i+1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">{topic.title}</div>
                <div className="text-slate-500 text-xs mt-1">{tdone}/{topic.lessons} lessons</div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{background:'#252D45'}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:accent.color}}/>
                </div>
              </div>
              <div className="text-slate-600">›</div>
            </Link>
          )
        })}
      </div>
      <Navbar/>
    </div>
  )
}
