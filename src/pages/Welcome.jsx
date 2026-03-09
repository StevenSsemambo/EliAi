import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { studentDB } from '../db/progressDB.js'
import { SoundEngine } from '../utils/soundEngine.js'

const AVATARS=['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋']
const CLASSES=['S1','S2','S3','S4','S5','S6']

export default function Welcome() {
  const { createStudent, loginAsStudent } = useUser()
  const [step,setStep]=useState(0)
  const [name,setName]=useState('')
  const [avatar,setAvatar]=useState(0)
  const [cls,setCls]=useState('S1')
  const [loading,setLoading]=useState(false)
  const [existingStudents,setExistingStudents]=useState([])
  const [showReturning,setShowReturning]=useState(false)

  // On mount: check if any students already exist in DB
  useEffect(()=>{
    studentDB.getAll().then(all => {
      if(all.length > 0) { setExistingStudents(all); setShowReturning(true) }
    })
  },[])

  function next(n){ SoundEngine.tap(); setStep(n) }

  async function handleCreate(){
    if(!name.trim())return
    SoundEngine.tap(); setLoading(true)
    // Check if a student with this exact name already exists
    const all = await studentDB.getAll()
    const existing = all.find(s => s.name.toLowerCase() === name.trim().toLowerCase())
    if(existing) {
      // Log back in as the existing student — restore all their progress
      await loginAsStudent(existing.id)
    } else {
      await createStudent(name.trim(),cls,avatar)
    }
  }

  const BG = { background:'linear-gradient(160deg,#0C0F1A 0%,#111827 100%)' }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={BG}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="ambient-glow w-96 h-96 rounded-full" style={{background:'radial-gradient(circle,rgba(13,148,136,0.18) 0%,transparent 70%)'}}/>
      </div>

      {/* ── Returning student picker ── */}
      {showReturning && step===0 && (
        <div className="page-enter text-center max-w-sm w-full relative z-10">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-2xl font-display font-extrabold text-white mb-2">Welcome back!</h2>
          <p className="text-slate-400 text-sm mb-6">Who is studying today?</p>
          <div className="flex flex-col gap-3 mb-6">
            {existingStudents.map(s => (
              <button key={s.id}
                onClick={async () => { SoundEngine.tap(); await loginAsStudent(s.id) }}
                className="flex items-center gap-4 p-4 rounded-2xl glass text-left transition-all active:scale-95 hover:border-teal-500"
                style={{border:'2px solid #252D45'}}>
                <div className="text-3xl">{['🦁','🐯','🦊','🐺','🦅','🐘','🦒','🦓','🐬','🦋'][s.avatar??0]}</div>
                <div>
                  <div className="text-white font-bold">{s.name}</div>
                  <div className="text-slate-400 text-xs">{s.class_level} · {s.total_xp||0} XP · {s.streak_days||0} day streak</div>
                </div>
                <div className="ml-auto text-teal-400 text-lg">→</div>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowReturning(false)}
            className="w-full py-3 rounded-2xl text-slate-400 text-sm glass transition-all active:scale-95"
            style={{border:'1px solid #252D45'}}>
            + Add new student
          </button>
        </div>
      )}

      {!showReturning && step===0 && (
        <div className="page-enter text-center max-w-sm w-full relative z-10">
          <div className="mb-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5 glow-teal"
              style={{background:'linear-gradient(135deg,#0D9488,#0369A1)'}}>
              <svg viewBox="0 0 192 192" width="62" height="62">
                <rect x="40" y="42" width="58" height="13" rx="6.5" fill="#FCD34D"/>
                <rect x="40" y="88" width="46" height="13" rx="6.5" fill="#FCD34D"/>
                <rect x="40" y="134" width="58" height="13" rx="6.5" fill="#FCD34D"/>
                <rect x="40" y="42" width="13" height="105" rx="6.5" fill="#FCD34D"/>
              </svg>
            </div>
            <h1 className="text-4xl font-display font-extrabold text-white mb-2">
              Elimu <span style={{color:'#F59E0B'}}>Learn</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">Science learning that works everywhere — even without internet.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[['📐','Mathematics','#0D9488'],['⚡','Physics','#06B6D4'],['🧬','Biology','#22C55E'],['🧪','Chemistry','#8B5CF6']].map(([ic,lb,col],i)=>(
              <div key={lb} className={`card-spring rounded-2xl p-4 text-center glass`} style={{animationDelay:`${i*0.07}s`}}>
                <div className="text-3xl mb-2">{ic}</div>
                <div className="text-xs font-semibold" style={{color:col}}>{lb}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>next(1)} className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-black transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            Get Started →
          </button>
          <p className="text-slate-500 text-xs mt-4">Works 100% offline after first load</p>
        </div>
      )}

      {step===1 && (
        <div className="page-enter text-center max-w-sm w-full relative z-10">
          <h2 className="text-2xl font-display font-extrabold text-white mb-2">What's your name?</h2>
          <p className="text-slate-400 text-sm mb-6">We'll personalise your learning experience.</p>
          <input
            className="w-full rounded-2xl px-5 py-4 text-lg text-center text-white placeholder-slate-500 focus:outline-none mb-6"
            style={{background:'#131829',border:'2px solid #252D45',transition:'border-color 0.2s'}}
            onFocus={e=>e.target.style.borderColor='#F59E0B'}
            onBlur={e=>e.target.style.borderColor='#252D45'}
            placeholder="Enter your name..."
            value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&name.trim()&&next(2)} autoFocus/>
          <button onClick={()=>name.trim()&&next(2)} disabled={!name.trim()}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-black disabled:opacity-40 transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            Next →
          </button>
          <button onClick={()=>next(0)} className="mt-3 text-slate-500 text-sm w-full">← Back</button>
        </div>
      )}

      {step===2 && (
        <div className="page-enter text-center max-w-sm w-full relative z-10">
          <h2 className="text-2xl font-display font-extrabold text-white mb-2">Choose your avatar</h2>
          <p className="text-slate-400 text-sm mb-6">Hi {name}! Pick an avatar.</p>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {AVATARS.map((a,i)=>(
              <button key={i} onClick={()=>{SoundEngine.tap();setAvatar(i)}}
                className={`text-3xl p-3 rounded-2xl transition-all active:scale-90 ${avatar===i?'glow-amber':'glass'}`}
                style={avatar===i?{background:'rgba(245,158,11,0.2)',border:'2px solid #F59E0B'}:{}}>
                {a}
              </button>
            ))}
          </div>
          <button onClick={()=>next(3)}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-black transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            Next →
          </button>
          <button onClick={()=>next(1)} className="mt-3 text-slate-500 text-sm w-full">← Back</button>
        </div>
      )}

      {step===3 && (
        <div className="page-enter text-center max-w-sm w-full relative z-10">
          <div className="text-6xl mb-4">{AVATARS[avatar]}</div>
          <h2 className="text-2xl font-display font-extrabold text-white mb-2">What class are you in?</h2>
          <p className="text-slate-400 text-sm mb-6">Select your current class level.</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {CLASSES.map(c=>(
              <button key={c} onClick={()=>{SoundEngine.tap();setCls(c)}}
                className="py-4 rounded-2xl font-display font-extrabold text-lg transition-all active:scale-90"
                style={cls===c?{background:'linear-gradient(135deg,#0D9488,#0369A1)',color:'#fff',boxShadow:'0 0 20px rgba(13,148,136,0.4)'}:{background:'#131829',border:'1px solid #252D45',color:'#94A3B8'}}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg text-black disabled:opacity-60 transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            {loading?'⏳ Setting up...':'🚀 Start Learning!'}
          </button>
          <button onClick={()=>next(2)} className="mt-3 text-slate-500 text-sm w-full">← Back</button>
        </div>
      )}
    </div>
  )
}
