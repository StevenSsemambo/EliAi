import { useEffect, useState } from 'react'
const COLORS = ['#F59E0B','#FCD34D','#14B8A6','#22C55E','#8B5CF6','#06B6D4','#FB7185']
const SHAPES = ['●','★','◆','▲','■','✦']
function r(mn,mx){return Math.random()*(mx-mn)+mn}
export default function ParticleBurst({active,count=22}){
  const [ps,setPs]=useState([])
  useEffect(()=>{
    if(!active)return
    setPs(Array.from({length:count},(_,i)=>({id:i,color:COLORS[i%COLORS.length],shape:SHAPES[i%6],px:r(-130,130),py:-r(40,160),pr:r(-180,180),size:r(8,16),delay:r(0,0.18)})))
    const t=setTimeout(()=>setPs([]),1100)
    return()=>clearTimeout(t)
  },[active])
  if(!ps.length)return null
  return(
    <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center overflow-hidden">
      {ps.map(p=>(
        <span key={p.id} className="absolute particle"
          style={{'--px':`${p.px}px`,'--py':`${p.py}px`,'--pr':`${p.pr}deg`,color:p.color,fontSize:p.size,animationDelay:`${p.delay}s`,left:'50%',top:'50%'}}>
          {p.shape}
        </span>
      ))}
    </div>
  )
}
