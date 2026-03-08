import { useEffect, useState } from 'react'
const ICONS = [{e:'📐',l:'Math'},{e:'⚡',l:'Physics'},{e:'🧬',l:'Biology'},{e:'🧪',l:'Chemistry'}]
const POS = [{top:'20%',left:'8%'},{top:'20%',right:'8%'},{bottom:'26%',left:'8%'},{bottom:'26%',right:'8%'}]
export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false)
  useEffect(()=>{
    const t1 = setTimeout(()=>setFading(true), 1900)
    const t2 = setTimeout(()=>onDone?.(), 2300)
    return ()=>{ clearTimeout(t1); clearTimeout(t2) }
  },[])
  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400 ${fading?'opacity-0 pointer-events-none':'opacity-100'}`}
      style={{background:'linear-gradient(145deg,#0C0F1A 0%,#111827 60%,#0C1420 100%)'}}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="ambient-glow w-80 h-80 rounded-full" style={{background:'radial-gradient(circle,rgba(13,148,136,0.22) 0%,transparent 70%)'}}/>
      </div>
      {ICONS.map((ic,i)=>(
        <div key={i} className={`absolute splash-icon-${i}`} style={POS[i]}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl glass">{ic.e}</div>
          <p className="text-center text-xs mt-1 text-slate-500 font-medium">{ic.l}</p>
        </div>
      ))}
      <div className="splash-logo flex flex-col items-center gap-4 z-10">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center glow-teal"
          style={{background:'linear-gradient(135deg,#0D9488,#0369A1)'}}>
          <svg viewBox="0 0 192 192" width="62" height="62">
            <rect x="40" y="42" width="58" height="13" rx="6.5" fill="#FCD34D"/>
            <rect x="40" y="88" width="46" height="13" rx="6.5" fill="#FCD34D"/>
            <rect x="40" y="134" width="58" height="13" rx="6.5" fill="#FCD34D"/>
            <rect x="40" y="42" width="13" height="105" rx="6.5" fill="#FCD34D"/>
          </svg>
        </div>
        <div className="splash-wordmark text-center">
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            <span className="text-white">Elimu </span><span style={{color:'#F59E0B'}}>Learn</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Offline · Everywhere · For You</p>
        </div>
        <div className="mt-4 flex items-center gap-1.5 opacity-60">
          <div className="w-4 h-4 rounded flex items-center justify-center text-xs font-black" style={{background:'linear-gradient(135deg,#7C3AED,#0891B2)',color:'white',fontSize:'0.5rem'}}>S</div>
          <p className="text-slate-600 text-xs tracking-widest uppercase font-semibold">SEMATECH DEVELOPERS</p>
        </div>
      </div>
    </div>
  )
}
