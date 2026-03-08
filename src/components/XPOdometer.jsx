import { useState, useEffect, useRef } from 'react'
export default function XPOdometer({value,className=''}){
  const [disp,setDisp]=useState(value)
  const [flash,setFlash]=useState(false)
  const prev=useRef(value)
  useEffect(()=>{
    if(value===prev.current)return
    const s=prev.current,e=value,d=e-s
    if(d<=0){setDisp(value);prev.current=value;return}
    setFlash(true)
    const dur=Math.min(1400,Math.max(600,d*6))
    const t0=performance.now()
    const tick=now=>{
      const p=Math.min(1,(now-t0)/dur)
      const ease=1-Math.pow(1-p,3)
      setDisp(Math.round(s+d*ease))
      if(p<1)requestAnimationFrame(tick)
      else{setDisp(e);prev.current=e;setTimeout(()=>setFlash(false),600)}
    }
    requestAnimationFrame(tick)
  },[value])
  return <span className={`${className} tabular-nums transition-colors duration-300 ${flash?'text-amber-400':''}`}>{disp.toLocaleString()}</span>
}
