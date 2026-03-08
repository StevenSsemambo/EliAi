import { createContext, useContext, useEffect, useState } from 'react'
const CLASSES = { mathematics:'subj-math', physics:'subj-physics', biology:'subj-bio', chemistry:'subj-chem' }
const ACCENTS = { mathematics:{color:'#14B8A6',dim:'rgba(13,148,136,0.12)'}, physics:{color:'#06B6D4',dim:'rgba(6,182,212,0.12)'}, biology:{color:'#22C55E',dim:'rgba(34,197,94,0.12)'}, chemistry:{color:'#8B5CF6',dim:'rgba(139,92,246,0.12)'} }
const DEF = {color:'#14B8A6',dim:'rgba(13,148,136,0.12)'}
const Ctx = createContext({accent:DEF,setSubject:()=>{},clearSubject:()=>{}})
export function SubjectThemeProvider({children}) {
  const [subj, setSubj] = useState(null)
  useEffect(()=>{
    Object.values(CLASSES).forEach(c=>document.documentElement.classList.remove(c))
    if(subj && CLASSES[subj]) document.documentElement.classList.add(CLASSES[subj])
  },[subj])
  return <Ctx.Provider value={{subject:subj,accent:ACCENTS[subj]||DEF,setSubject:setSubj,clearSubject:()=>setSubj(null)}}>{children}</Ctx.Provider>
}
export const useSubjectTheme = () => useContext(Ctx)
