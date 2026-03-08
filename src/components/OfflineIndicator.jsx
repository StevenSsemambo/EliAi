import { useState, useEffect } from 'react'
import { useOffline } from '../hooks/useOffline.js'
export default function OfflineIndicator(){
  const offline=useOffline()
  const [showOnline,setShowOnline]=useState(false)
  useEffect(()=>{
    if(!offline){setShowOnline(true);const t=setTimeout(()=>setShowOnline(false),3500);return()=>clearTimeout(t)}
  },[offline])
  if(!offline&&!showOnline)return null
  return(
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold transition-all duration-500 ${offline?'bg-amber-500/10 border-b border-amber-500/25 text-amber-400':'bg-teal-500/10 border-b border-teal-500/25 text-teal-400'}`}>
      {offline?(
        <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"/></span>Offline — lessons work normally</>
      ):(
        <><span className="h-2 w-2 rounded-full bg-teal-400"/>Back online · Progress synced ✓</>
      )}
    </div>
  )
}
