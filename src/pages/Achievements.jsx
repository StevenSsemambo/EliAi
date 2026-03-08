import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { achievementsDB, progressDB } from '../db/progressDB.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const RANKS=[
  {id:'beginner',label:'Beginner',icon:'🌱',min:0,   max:99,   color:'#64748B'},
  {id:'learner', label:'Learner', icon:'📗',min:100,  max:299,  color:'#16A34A'},
  {id:'explorer',label:'Explorer',icon:'🧭',min:300,  max:599,  color:'#0891B2'},
  {id:'scholar', label:'Scholar', icon:'📘',min:600,  max:999,  color:'#7C3AED'},
  {id:'achiever',label:'Achiever',icon:'⭐',min:1000, max:1999, color:'#F59E0B'},
  {id:'expert',  label:'Expert',  icon:'🔥',min:2000, max:3999, color:'#EF4444'},
  {id:'champion',label:'Champion',icon:'🏆',min:4000, max:7999, color:'#D97706'},
  {id:'legend',  label:'Legend',  icon:'👑',min:8000, max:Infinity,color:'#FCD34D'},
]
const CAT_ICONS={All:'🏅',Learning:'📚',Performance:'🎯',Streaks:'🔥',Subjects:'🔬',XP:'⭐',AI:'🧠',Games:'🎮',Special:'✨'}
const CAT_COLORS={Learning:'#0891B2',Performance:'#16A34A',Streaks:'#EF4444',Subjects:'#7C3AED',XP:'#F59E0B',AI:'#A78BFA',Games:'#0D9488',Special:'#F472B6'}
const CATS=['All','Learning','Performance','Streaks','Subjects','XP','AI','Games','Special']

function getRank(xp){return RANKS.find(r=>xp>=r.min&&xp<=r.max)||RANKS[0]}
function getNext(xp){const i=RANKS.findIndex(r=>xp>=r.min&&xp<=r.max);return RANKS[i+1]||null}

function BadgePopup({badges,onDismiss,theme}){
  useEffect(()=>{
    try{SoundEngine.unlockSound?.()}catch{}
    const t=setTimeout(onDismiss,6000);return()=>clearTimeout(t)
  },[])
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)'}}>
      <div className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{background:'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(8,145,178,0.2))',border:'2px solid rgba(124,58,237,0.5)'}}>
        <div className="text-5xl mb-2" style={{animation:'pop 0.5s ease'}}>🎉</div>
        <p className="font-black text-xl text-white mb-1">{badges.length===1?'Badge Unlocked!':`${badges.length} Badges Unlocked!`}</p>
        <div className="flex justify-center gap-4 my-4 flex-wrap">
          {badges.map(b=>(
            <div key={b.id} className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-1"
                style={{background:`${CAT_COLORS[b.cat]||'#7C3AED'}22`,border:`2px solid ${CAT_COLORS[b.cat]||'#7C3AED'}`}}>{b.icon}</div>
              <p className="text-xs font-black text-white">{b.label}</p>
            </div>
          ))}
        </div>
        <button onClick={onDismiss}
          className="px-8 py-3 rounded-2xl font-black text-white text-sm"
          style={{background:'linear-gradient(135deg,#7C3AED,#0891B2)'}}>Awesome! 🚀</button>
      </div>
    </div>
  )
}

function RankCard({xp,theme}){
  const rank=getRank(xp),next=getNext(xp)
  const pct=next?Math.min(100,Math.round(((xp-rank.min)/(rank.max===Infinity?rank.min*2:rank.max-rank.min+1))*100)):100
  return(
    <div className="rounded-3xl p-5 mb-5 relative overflow-hidden"
      style={{background:`linear-gradient(135deg,${rank.color}18,${rank.color}08)`,border:`2px solid ${rank.color}44`}}>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{background:`${rank.color}22`,border:`2px solid ${rank.color}66`}}>{rank.icon}</div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{color:rank.color}}>Current Rank</p>
          <p className="text-2xl font-black" style={{color:rank.color}}>{rank.label}</p>
          <p className="text-xs mt-0.5" style={{color:theme.muted}}>{xp.toLocaleString()} XP</p>
        </div>
      </div>
      {next&&(
        <>
          <div className="flex justify-between mb-1">
            <p className="text-xs" style={{color:theme.muted}}>→ {next.icon} {next.label}</p>
            <p className="text-xs font-bold" style={{color:rank.color}}>{pct}%</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{background:theme.border}}>
            <div className="h-full rounded-full" style={{width:`${pct}%`,background:`linear-gradient(90deg,${rank.color},${next.color})`}}/>
          </div>
          <p className="text-xs mt-1" style={{color:theme.muted}}>{(next.min-xp).toLocaleString()} XP to go</p>
        </>
      )}
    </div>
  )
}

function BadgeCard({badge,theme}){
  const col=CAT_COLORS[badge.cat]||'#7C3AED'
  return(
    <div className="rounded-2xl p-4 flex flex-col h-full"
      style={{background:badge.earned?`${col}12`:theme.card,border:`1px solid ${badge.earned?col+'44':theme.border}`,opacity:badge.earned?1:0.55}}>
      <div className="text-3xl mb-2" style={{filter:badge.earned?'none':'grayscale(1)'}}>{badge.icon}</div>
      <p className="text-sm font-black leading-tight mb-1" style={{color:badge.earned?theme.text:theme.muted}}>{badge.label}</p>
      <p className="text-xs leading-relaxed flex-1" style={{color:theme.muted}}>{badge.desc}</p>
      {badge.earned&&badge.earned_at&&(
        <p className="text-xs mt-2 font-bold" style={{color:col}}>
          ✅ {new Date(badge.earned_at).toLocaleDateString('en-UG',{day:'numeric',month:'short'})}
        </p>
      )}
      {!badge.earned&&<p className="text-xs mt-2" style={{color:theme.muted}}>🔒 Locked</p>}
    </div>
  )
}

export default function Achievements(){
  const {student}=useUser()
  const {theme}=useTheme()
  const [badges,setBadges]=useState([])
  const [newBadges,setNewBadges]=useState([])
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState('All')

  useEffect(()=>{
    if(!student)return
    async function load(){
      const progress=await progressDB.getAllProgress(student.id)
      const fresh=await achievementsDB.checkAndAward(student.id,progress,student)
      if(fresh.length>0)setNewBadges(fresh)
      const all=await achievementsDB.getEarned(student.id)
      setBadges(all);setLoading(false)
    }
    load()
  },[student])

  const xp=student?.total_xp||0
  const earned=badges.filter(b=>b.earned)
  const filtered=tab==='All'?badges:badges.filter(b=>b.cat===tab)
  const fEarned=filtered.filter(b=>b.earned)
  const fLocked=filtered.filter(b=>!b.earned)

  return(
    <div className="min-h-screen pb-28" style={{background:theme.bg}}>
      <style>{`@keyframes pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>

      {newBadges.length>0&&<BadgePopup badges={newBadges} theme={theme} onDismiss={()=>setNewBadges([])}/>}

      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{background:theme.surface,borderBottom:`1px solid ${theme.border}`}}>
        <h1 className="text-2xl font-black mb-0.5" style={{color:theme.text}}>🏅 Achievements</h1>
        <p className="text-sm" style={{color:theme.muted}}>{earned.length} / {badges.length} badges earned</p>
      </div>

      <div className="px-5 pt-4">
        {loading?(
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
              style={{borderColor:theme.accent,borderTopColor:'transparent'}}/>
          </div>
        ):(
          <>
            <RankCard xp={xp} theme={theme}/>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {label:'Earned',value:earned.length,col:theme.accent},
                {label:'Locked',value:badges.length-earned.length,col:theme.muted},
                {label:'Total XP',value:xp.toLocaleString(),col:'#F59E0B'},
              ].map(s=>(
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{background:theme.card,border:`1px solid ${theme.border}`}}>
                  <p className="text-xl font-black" style={{color:s.col}}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{color:theme.muted}}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" style={{scrollbarWidth:'none'}}>
              {CATS.map(cat=>{
                const catBadges=cat==='All'?badges:badges.filter(b=>b.cat===cat)
                const catEarned=catBadges.filter(b=>b.earned).length
                const isActive=tab===cat
                const col=CAT_COLORS[cat]||theme.accent
                return(
                  <button key={cat} onClick={()=>{SoundEngine.tap();setTab(cat)}}
                    className="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold"
                    style={{background:isActive?`${col}22`:theme.card,color:isActive?col:theme.subtext,border:`1px solid ${isActive?col+'44':theme.border}`}}>
                    {CAT_ICONS[cat]} {cat}{catEarned>0?` (${catEarned})`:''}
                  </button>
                )
              })}
            </div>

            {fEarned.length>0&&(
              <>
                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{color:theme.muted}}>✅ Earned ({fEarned.length})</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {fEarned.map(b=><BadgeCard key={b.id} badge={b} theme={theme}/>)}
                </div>
              </>
            )}
            {fLocked.length>0&&(
              <>
                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{color:theme.muted}}>🔒 Locked ({fLocked.length})</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {fLocked.map(b=><BadgeCard key={b.id} badge={b} theme={theme}/>)}
                </div>
              </>
            )}
            {filtered.length===0&&(
              <div className="text-center py-10">
                <p className="text-3xl mb-2">🔍</p>
                <p style={{color:theme.muted}}>No badges in this category yet</p>
              </div>
            )}
          </>
        )}
      </div>
      <Navbar/>
    </div>
  )
}
