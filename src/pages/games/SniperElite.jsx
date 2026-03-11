import { useState, useEffect, useRef } from 'react'

// ── Audio ─────────────────────────────────────────────────────────
const _ac={ref:null}
function ac(){if(!_ac.ref)try{_ac.ref=new(window.AudioContext||window.webkitAudioContext)()}catch{}; if(_ac.ref?.state==='suspended')_ac.ref.resume(); return _ac.ref}
function beep(freq,type,dur,vol=0.2,delay=0){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=freq;const t=a.currentTime+delay;g.gain.setValueAtTime(0.001,t);g.gain.linearRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.start(t);o.stop(t+dur+0.05)}
function noise(dur,vol=0.3){const a=ac();if(!a)return;const buf=a.createBuffer(1,a.sampleRate*dur,a.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);const src=a.createBufferSource();const g=a.createGain();const f=a.createBiquadFilter();src.buffer=buf;f.type='lowpass';f.frequency.value=800;src.connect(f);f.connect(g);g.connect(a.destination);const t=a.currentTime;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);src.start(t);src.stop(t+dur+0.1)}
function sndShot(){noise(0.4,0.5);beep(120,'sawtooth',0.3,0.4,0.02)}
function sndHit(){beep(800,'sine',0.05,0.3);noise(0.15,0.2,0.02);beep(200,'sawtooth',0.2,0.3,0.03)}
function sndMiss(){beep(400,'sine',0.15,0.2);beep(300,'sine',0.1,0.15,0.1)}
function sndBreath(){beep(200,'sine',0.8,0.06)}
function sndReload(){beep(600,'square',0.06,0.2);beep(400,'square',0.06,0.15,0.12);beep(500,'square',0.06,0.18,0.22)}
function sndWind(){const a=ac();if(!a)return;const buf=a.createBuffer(1,a.sampleRate*1.5,a.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.3;const src=a.createBufferSource();const g=a.createGain();const f=a.createBiquadFilter();src.buffer=buf;f.type='bandpass';f.frequency.value=200;f.Q.value=0.3;src.connect(f);f.connect(g);g.connect(a.destination);const t=a.currentTime;g.gain.setValueAtTime(0.05,t);g.gain.exponentialRampToValueAtTime(0.001,t+1.5);src.start(t);src.stop(t+1.6)}

const W=480, H=340
const SCOPE_R = 90  // scope circle radius

const RIFLE_STATS = [
  { name:'Bolt Action M40', velocity:600, sway:0.6, reloadTime:2,   magazine:5,  dmg:95,  icon:'🎯', color:'#94a3b8' },
  { name:'AWP Sniper',      velocity:900, sway:0.4, reloadTime:2.5, magazine:5,  dmg:100, icon:'⚡', color:'#60a5fa' },
  { name:'Barrett .50 Cal', velocity:750, sway:1.0, reloadTime:3.5, magazine:10, dmg:150, icon:'💥', color:'#f97316' },
]

const TARGET_TYPES = [
  { type:'static',  icon:'🎯', size:28, spd:0,   points:100, color:'#ef4444', label:'Static'  },
  { type:'patrol',  icon:'🪖', size:22, spd:60,  points:200, color:'#f97316', label:'Patrol'  },
  { type:'running', icon:'🏃', size:18, spd:120, points:350, color:'#a855f7', label:'Runner'  },
  { type:'peek',    icon:'👤', size:20, spd:0,   points:500, color:'#22c55e', label:'Sniper'  },
]

function makeEnvironment(level) {
  const windSpeed = (0.5 + level * 0.3) * (Math.random() < 0.5 ? 1 : -1)
  const windDir   = Math.random() < 0.5 ? 1 : -1
  const distance  = 200 + level * 80  // metres (affects drop)
  const rain      = level > 3
  const night     = level > 5
  return { windSpeed, windDir, distance, rain, night }
}

function makeTargets(level) {
  const count = Math.min(2 + Math.floor(level/2), 5)
  return Array.from({length:count}, (_, i) => {
    const typeIdx = Math.min(Math.floor(level/2+Math.random()*2), TARGET_TYPES.length-1)
    const t = TARGET_TYPES[typeIdx]
    const yPos = 180 + Math.random()*80
    return {
      id: i,
      ...t,
      x: 100+Math.random()*(W-200),
      y: yPos,
      vx: t.type==='patrol'?(i%2===0?t.spd:-t.spd):t.type==='running'?t.spd*(Math.random()<0.5?1:-1):0,
      hp: t.type==='boss'?3:1,
      maxHp:t.type==='boss'?3:1,
      alive: true,
      peekTimer: 0,
      peekInterval: 2+Math.random()*3,
      visible: t.type!=='peek',
      hitFlash: 0,
    }
  })
}

// ── Main Component ────────────────────────────────────────────────
export default function SniperElite({ game, levelData, studentId, onFinish }) {
  const level = levelData?.level || 1
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const [ui, setUi] = useState({
    scoped: false,
    ammo: 5,
    maxAmmo: 5,
    score: 0,
    shots: 0,
    hits: 0,
    phase: 'playing', // playing | replay | reload | victory | gameover
    wind: { speed:1, dir:1 },
    distance: 300,
    rifle: RIFLE_STATS[0],
    breath: 1,
    sway: 0,
    targetsLeft: 0,
    rain: false,
    night: false,
    message: '',
    streak: 0,
    highestStreak: 0,
  })
  const uiRef = useRef(ui)
  uiRef.current = ui

  // Scope position (crosshair)
  const scopePos = useRef({ x: W/2, y: H/2 })
  const isDragging = useRef(false)
  const dragStart  = useRef({ x:0, y:0, sx:0, sy:0 })
  const breathHeld = useRef(false)
  const replayRef  = useRef(null)

  function initGame(rifleIdx=0) {
    const env = makeEnvironment(level)
    const targets = makeTargets(level)
    const rifle = RIFLE_STATS[Math.min(rifleIdx, RIFLE_STATS.length-1)]
    stateRef.current = {
      env, targets, rifle,
      particles: [],
      bulletTrails: [],
      swayX: 0, swayY: 0,
      swayVX:0.3, swayVY:0.2,
      breathTimer: 0,
    }
    scopePos.current = { x:W/2, y:H/2 }
    setUi(prev=>({
      ...prev,
      scoped:false, ammo:rifle.magazine, maxAmmo:rifle.magazine,
      score:0, shots:0, hits:0, phase:'playing',
      wind:{speed:Math.abs(env.windSpeed),dir:env.windDir},
      distance:env.distance, rifle,
      breath:1, targetsLeft:targets.length,
      rain:env.rain, night:env.night, message:'', streak:0,
    }))
  }

  useEffect(()=>{
    initGame()
    lastRef.current=performance.now()
    function loop(now){
      const dt=Math.min((now-(lastRef.current||now))/1000,0.05)
      lastRef.current=now
      update(dt)
      draw()
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    return ()=>cancelAnimationFrame(rafRef.current)
  },[])

  function update(dt) {
    const s=stateRef.current; if(!s)return
    const u=uiRef.current
    if(u.phase!=='playing')return

    // move targets
    for(const t of s.targets){
      if(!t.alive)continue
      if(t.hitFlash>0)t.hitFlash-=dt
      if(t.type==='patrol'||t.type==='running'){
        t.x+=t.vx*dt
        if(t.x<50){t.x=50;t.vx*=-1}
        if(t.x>W-50){t.x=W-50;t.vx*=-1}
      }
      if(t.type==='peek'){
        t.peekTimer+=dt
        if(t.peekTimer>t.peekInterval){
          t.visible=!t.visible
          t.peekTimer=0
          t.peekInterval=t.visible?1+Math.random():2+Math.random()*3
        }
      }
    }

    // scope sway
    if(u.scoped){
      const swayAmp=s.rifle.sway*(breathHeld.current?0.2:1)
      s.swayX+=s.swayVX*dt*2
      s.swayY+=s.swayVY*dt*2
      if(Math.abs(s.swayX)>swayAmp){s.swayVX*=-1}
      if(Math.abs(s.swayY)>swayAmp){s.swayVY*=-1}
    }

    // breath
    if(breathHeld.current){
      stateRef.current.breathTimer+=dt
      const breath=Math.max(0,1-stateRef.current.breathTimer/4)
      setUi(prev=>({...prev,breath}))
      if(breath<=0){breathHeld.current=false; stateRef.current.breathTimer=0}
    } else if(stateRef.current.breathTimer>0){
      stateRef.current.breathTimer=Math.max(0,stateRef.current.breathTimer-dt*0.5)
    }

    // replay
    if(replayRef.current){
      const r=replayRef.current
      r.progress+=dt*0.6  // slow-mo
      r.bullet.x+=r.bullet.vx*dt*0.6
      r.bullet.y+=r.bullet.vy*dt*0.6
      r.bullet.vy+=9.8*r.env.distance/500*dt*0.4  // drop
      r.bullet.vx+=r.env.windSpeed*r.env.windDir*dt*0.5  // drift
      if(r.progress>r.duration){replayRef.current=null; setUi(prev=>({...prev,phase:'playing'}))}
    }

    // particles
    for(let i=s.particles.length-1;i>=0;i--){
      const p=s.particles[i]
      p.x+=p.vx;p.y+=p.vy;p.vx*=0.93;p.vy*=0.93;p.life-=p.decay
      if(p.life<=0)s.particles.splice(i,1)
    }

    // bullet trails fade
    for(let i=s.bulletTrails.length-1;i>=0;i--){
      s.bulletTrails[i].alpha-=dt*0.8
      if(s.bulletTrails[i].alpha<=0)s.bulletTrails.splice(i,1)
    }

    // check all dead
    const alive=s.targets.filter(t=>t.alive)
    if(alive.length===0&&u.targetsLeft>0){
      setUi(prev=>({...prev,phase:'victory',targetsLeft:0}))
      setTimeout(()=>onFinish?.(),3000)
    }
  }

  function shoot() {
    const u=uiRef.current; const s=stateRef.current
    if(!s||u.phase!=='playing'||u.ammo<=0||u.phase==='reload')return
    sndShot()

    // bullet origin = scope center + sway
    const bx=scopePos.current.x+s.swayX
    const by=scopePos.current.y+s.swayY
    // Apply wind and drop to actual hit point
    const windDrift=s.env.windSpeed*s.env.windDir*(s.env.distance/500)*15
    const bulletDrop=s.env.distance/400*12*(breathHeld.current?0.5:1)
    const hitX=bx+windDrift
    const hitY=by+bulletDrop

    // store trail
    s.bulletTrails.push({x1:bx,y1:by,x2:hitX,y2:hitY,alpha:1})

    // check hit
    let hit=null
    for(const t of s.targets){
      if(!t.alive||!t.visible)continue
      if(Math.hypot(hitX-t.x,hitY-t.y)<t.size*0.9){hit=t;break}
    }

    const newShots=u.shots+1
    let newHits=u.hits, newScore=u.score, newStreak=u.streak
    let msg=''

    if(hit){
      sndHit()
      hit.hp--
      hit.hitFlash=0.4
      spawnParticles(hitX,hitY,'#ef4444',20,4)
      if(hit.hp<=0){
        hit.alive=false
        newStreak++
        newHits++
        const streakBonus=newStreak>1?newStreak*50:0
        const distBonus=Math.round(s.env.distance/10)*5
        const pointsEarned=hit.points+streakBonus+distBonus
        newScore+=pointsEarned
        msg=newStreak>2?`🔥 ${newStreak}x STREAK! +${pointsEarned}`:`💥 ${hit.label} down! +${pointsEarned}`
        spawnParticles(hit.x,hit.y,'#fbbf24',30,5)
      } else {
        msg='⚠️ Hit but not down!'
        newScore+=50
      }
    } else {
      sndMiss()
      newStreak=0
      msg=Math.abs(bx-W/2)<5?'❌ Wind got you!':'❌ Miss'
      spawnParticles(hitX,hitY,'#475569',8,2)
    }

    // start replay
    replayRef.current={
      startX:bx,startY:by,endX:hitX,endY:hitY,
      bullet:{x:bx,y:by,vx:(hitX-bx)*2,vy:(hitY-by)*2},
      progress:0,duration:1.5,
      env:s.env,hit:!!hit,hitTarget:hit
    }

    const newAmmo=u.ammo-1
    const targetsLeft=s.targets.filter(t=>t.alive).length-(hit?.hp===0?1:0)

    setUi(prev=>({
      ...prev,
      ammo:newAmmo,shots:newShots,hits:newHits,score:newScore,
      streak:newStreak,highestStreak:Math.max(prev.highestStreak,newStreak),
      phase:'replay',message:msg,targetsLeft:Math.max(0,targetsLeft),
    }))
    setTimeout(()=>{
      if(replayRef.current===null)setUi(p=>({...p,phase:'playing',message:''}))
    },2000)

    // auto reload
    if(newAmmo===0){
      sndReload()
      setTimeout(()=>{
        setUi(p=>({...p,ammo:p.maxAmmo,message:'🔄 Reloaded'}))
        setTimeout(()=>setUi(p=>({...p,message:''})),800)
      },s.rifle.reloadTime*1000)
    }
  }

  function spawnParticles(x,y,color,count=10,spd=3){
    for(let i=0;i<count;i++){
      const a=(Math.PI*2*i)/count+Math.random()*0.5
      stateRef.current.particles.push({x,y,vx:Math.cos(a)*spd*(0.5+Math.random()),vy:Math.sin(a)*spd*(0.5+Math.random()),color,life:1,decay:0.04+Math.random()*0.04,size:2+Math.random()*4})
    }
  }

  function draw() {
    const canvas=canvasRef.current; if(!canvas)return
    const ctx=canvas.getContext('2d')
    const s=stateRef.current; if(!s)return
    const u=uiRef.current
    ctx.clearRect(0,0,W,H)

    // ── SCENE ──
    // sky
    const sky=ctx.createLinearGradient(0,0,0,H)
    if(u.night){sky.addColorStop(0,'#030712');sky.addColorStop(1,'#0c1a2e')}
    else{sky.addColorStop(0,'#1e3a5f');sky.addColorStop(0.6,'#2d5a8e');sky.addColorStop(1,'#3d7a6e')}
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)

    // stars at night
    if(u.night){
      ctx.fillStyle='rgba(255,255,255,0.7)'
      for(let i=0;i<80;i++){
        const sx=(i*137.5)%W, sy=(i*73)%100
        ctx.beginPath();ctx.arc(sx,sy,0.8+Math.random()*0.8,0,Math.PI*2);ctx.fill()
      }
    }

    // mountains
    ctx.fillStyle=u.night?'#0a0f1a':'#1a3d2e'
    ctx.beginPath();ctx.moveTo(0,200)
    ;[0,60,120,180,240,300,360,420,480].forEach((x,i)=>ctx.lineTo(x,150+Math.sin(i*0.8)*40))
    ctx.lineTo(W,200);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill()

    // ground
    const ground=ctx.createLinearGradient(0,200,0,H)
    ground.addColorStop(0,u.night?'#0d1a0d':'#1a3a1a')
    ground.addColorStop(1,u.night?'#050f05':'#0d1f0d')
    ctx.fillStyle=ground; ctx.fillRect(0,200,W,H-200)

    // rain
    if(u.rain){
      ctx.strokeStyle='rgba(150,200,255,0.15)'
      ctx.lineWidth=0.5
      for(let i=0;i<40;i++){
        const rx=(i*37+Date.now()*0.05)%W
        const ry=(Date.now()*0.1+i*53)%H
        ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+3,ry+15);ctx.stroke()
      }
    }

    // wind indicator
    const windVis=s.env.windSpeed*s.env.windDir
    ctx.save()
    ctx.globalAlpha=0.4
    for(let i=0;i<5;i++){
      const wy=60+i*15
      ctx.strokeStyle=`rgba(${windVis>0?'100,200,255':'255,200,100'},0.6)`
      ctx.lineWidth=1.5
      const wlen=windVis*8
      ctx.beginPath();ctx.moveTo(W/2,wy);ctx.lineTo(W/2+wlen,wy)
      ctx.stroke()
    }
    ctx.restore()

    // bullet trails
    for(const tr of s.bulletTrails){
      ctx.save()
      ctx.globalAlpha=tr.alpha*0.6
      ctx.strokeStyle='#fde68a'
      ctx.lineWidth=1.5
      ctx.setLineDash([4,4])
      ctx.beginPath();ctx.moveTo(tr.x1,tr.y1);ctx.lineTo(tr.x2,tr.y2);ctx.stroke()
      ctx.restore()
    }

    // replay bullet
    if(replayRef.current){
      const rb=replayRef.current.bullet
      ctx.save()
      ctx.shadowColor='#fde68a';ctx.shadowBlur=15
      ctx.fillStyle='#fde68a'
      ctx.beginPath();ctx.arc(rb.x,rb.y,4,0,Math.PI*2);ctx.fill()
      // trail
      ctx.globalAlpha=0.3
      ctx.fillStyle='#f97316'
      ctx.beginPath();ctx.arc(rb.x-rb.vx*0.05,rb.y-rb.vy*0.05,2.5,0,Math.PI*2);ctx.fill()
      ctx.restore()
    }

    // targets
    for(const t of s.targets){
      if(!t.alive||!t.visible)continue
      const bob=t.type==='static'?0:Math.sin(Date.now()*0.004+t.id)*3
      ctx.save()
      if(t.hitFlash>0){ctx.shadowColor='#ef4444';ctx.shadowBlur=20}
      ctx.font=`${t.size*1.3}px serif`
      ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.fillText(t.icon,t.x,t.y+bob)
      // HP dots
      if(t.maxHp>1){
        for(let h=0;h<t.maxHp;h++){
          ctx.fillStyle=h<t.hp?t.color:'#1e293b'
          ctx.beginPath();ctx.arc(t.x-6+h*6,t.y-t.size-5,3,0,Math.PI*2);ctx.fill()
        }
      }
      ctx.restore()
    }

    // particles
    for(const p of s.particles){
      ctx.save()
      ctx.globalAlpha=p.life
      ctx.fillStyle=p.color
      ctx.shadowColor=p.color;ctx.shadowBlur=5
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill()
      ctx.restore()
    }

    // ── SCOPE OVERLAY ──
    if(u.scoped){
      // dark overlay outside scope
      ctx.save()
      ctx.fillStyle='rgba(0,0,0,0.92)'
      ctx.fillRect(0,0,W,H)
      ctx.globalCompositeOperation='destination-out'
      ctx.beginPath();ctx.arc(W/2,H/2,SCOPE_R,0,Math.PI*2);ctx.fill()
      ctx.restore()

      const cx=W/2, cy=H/2
      const sx=s.swayX, sy=s.swayY

      // scope glass
      ctx.save()
      ctx.beginPath();ctx.arc(cx,cy,SCOPE_R,0,Math.PI*2);ctx.clip()

      // scope tint
      ctx.fillStyle='rgba(0,20,0,0.3)';ctx.fillRect(cx-SCOPE_R,cy-SCOPE_R,SCOPE_R*2,SCOPE_R*2)

      // scope edge vignette
      const vignette=ctx.createRadialGradient(cx,cy,SCOPE_R*0.5,cx,cy,SCOPE_R)
      vignette.addColorStop(0,'transparent')
      vignette.addColorStop(1,'rgba(0,0,0,0.6)')
      ctx.fillStyle=vignette;ctx.fillRect(cx-SCOPE_R,cy-SCOPE_R,SCOPE_R*2,SCOPE_R*2)
      ctx.restore()

      // reticle
      ctx.save()
      ctx.strokeStyle='rgba(255,60,60,0.9)'
      ctx.lineWidth=0.8
      // crosshair lines
      const cr=SCOPE_R*0.85
      ctx.beginPath()
      ctx.moveTo(cx+sx-cr,cy+sy);ctx.lineTo(cx+sx-20,cy+sy)
      ctx.moveTo(cx+sx+20,cy+sy);ctx.lineTo(cx+sx+cr,cy+sy)
      ctx.moveTo(cx+sx,cy+sy-cr);ctx.lineTo(cx+sx,cy+sy-20)
      ctx.moveTo(cx+sx,cy+sy+20);ctx.lineTo(cx+sx,cy+sy+cr)
      ctx.stroke()
      // mil-dots
      ctx.fillStyle='rgba(255,60,60,0.8)'
      ;[-3,-2,-1,0,1,2,3].forEach(d=>{if(d!==0){ctx.beginPath();ctx.arc(cx+sx+d*20,cy+sy,1.5,0,Math.PI*2);ctx.fill()}})
      ;[-3,-2,-1,0,1,2,3].forEach(d=>{if(d!==0){ctx.beginPath();ctx.arc(cx+sx,cy+sy+d*20,1.5,0,Math.PI*2);ctx.fill()}})
      // center dot
      ctx.fillStyle='#ff3c3c'
      ctx.beginPath();ctx.arc(cx+sx,cy+sy,2,0,Math.PI*2);ctx.fill()
      // outer circle
      ctx.strokeStyle='rgba(255,60,60,0.3)'
      ctx.lineWidth=1.5
      ctx.setLineDash([8,4])
      ctx.beginPath();ctx.arc(cx+sx,cy+sy,40,0,Math.PI*2);ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // scope border
      ctx.save()
      ctx.strokeStyle='#1e293b'
      ctx.lineWidth=8
      ctx.beginPath();ctx.arc(cx,cy,SCOPE_R,0,Math.PI*2);ctx.stroke()
      ctx.strokeStyle='#334155'
      ctx.lineWidth=2
      ctx.beginPath();ctx.arc(cx,cy,SCOPE_R,0,Math.PI*2);ctx.stroke()
      ctx.restore()

      // wind & drop indicators inside scope
      ctx.save()
      ctx.fillStyle='rgba(100,200,100,0.8)'
      ctx.font='9px monospace'
      ctx.textAlign='left'
      ctx.fillText(`WIND: ${Math.abs(s.env.windSpeed).toFixed(1)} ${s.env.windDir>0?'→':'←'}`,cx-SCOPE_R+8,cy+SCOPE_R-28)
      ctx.fillText(`DIST: ${s.env.distance}m`,cx-SCOPE_R+8,cy+SCOPE_R-16)
      ctx.restore()

      // breath indicator
      ctx.save()
      ctx.globalAlpha=0.7
      ctx.strokeStyle=u.breath>0.4?'#22c55e':'#f59e0b'
      ctx.lineWidth=2
      ctx.beginPath();ctx.arc(cx,cy,SCOPE_R-6,Math.PI*1.5,Math.PI*1.5+u.breath*Math.PI*2);ctx.stroke()
      ctx.restore()
    }

    // ── HUD overlays ──
    // accuracy text
    if(u.shots>0){
      ctx.fillStyle='rgba(0,0,0,0.6)'
      ctx.fillRect(W-90,0,90,20)
      ctx.fillStyle='#94a3b8'; ctx.font='10px monospace'; ctx.textAlign='right'
      ctx.fillText(`${u.hits}/${u.shots} hits · ${Math.round(u.hits/u.shots*100)}%`,W-4,14)
    }

    // victory / gameover
    if(u.phase==='victory'){
      ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(0,0,W,H)
      ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.shadowColor='#fbbf24';ctx.shadowBlur=40
      ctx.fillStyle='#fbbf24';ctx.font='bold 28px monospace'
      ctx.fillText('🎯 MISSION COMPLETE',W/2,H/2-20)
      ctx.shadowBlur=0;ctx.fillStyle='#94a3b8';ctx.font='14px monospace'
      ctx.fillText(`Score: ${u.score} · Accuracy: ${u.shots>0?Math.round(u.hits/u.shots*100):0}%`,W/2,H/2+20)
    }
  }

  const u=ui
  const s=stateRef.current

  return (
    <div style={{fontFamily:'monospace',background:'#050810',borderRadius:16,overflow:'hidden',userSelect:'none'}}>
      <style>{`
        @keyframes flash{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes msgIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* HUD */}
      <div style={{background:'#0a0d1a',padding:'8px 12px',borderBottom:'1px solid #1a2642',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{color:'#fbbf24',fontWeight:800,fontSize:12}}>⭐ {u.score}</span>
        <div style={{display:'flex',gap:3}}>
          {Array.from({length:u.maxAmmo}).map((_,i)=>(
            <div key={i} style={{width:8,height:18,borderRadius:2,background:i<u.ammo?'#f97316':'#1e293b',border:'1px solid #334155'}}/>
          ))}
        </div>
        <span style={{color:'#60a5fa',fontSize:11}}>💨 Wind {u.wind.speed.toFixed(1)} {u.wind.dir>0?'→':'←'}</span>
        <span style={{color:'#94a3b8',fontSize:11}}>📏 {u.distance}m</span>
        {u.rain&&<span style={{color:'#60a5fa',fontSize:11}}>🌧 Rain</span>}
        {u.night&&<span style={{color:'#a855f7',fontSize:11}}>🌙 Night</span>}
        {u.streak>1&&<span style={{color:'#f97316',fontWeight:800,fontSize:11,animation:'flash 0.5s infinite'}}>🔥 x{u.streak}</span>}
        <span style={{color:'#475569',fontSize:11,marginLeft:'auto'}}>🎯 {u.targetsLeft} left</span>
      </div>

      {/* Message */}
      {u.message&&(
        <div style={{background:'rgba(251,191,36,0.1)',borderBottom:'1px solid rgba(251,191,36,0.2)',padding:'5px 12px',textAlign:'center',color:'#fde68a',fontWeight:700,fontSize:12,animation:'msgIn 0.2s ease'}}>
          {u.message}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={W} height={H} style={{width:'100%',display:'block'}}/>

      {/* Controls */}
      <div style={{background:'#060a14',borderTop:'1px solid #1a2642',padding:'10px 12px'}}>
        {u.phase==='victory'?(
          <div style={{textAlign:'center'}}>
            <button onClick={()=>initGame()} style={{padding:'10px 24px',borderRadius:10,background:'#fbbf24',color:'#0a0d1a',fontWeight:800,border:'none',cursor:'pointer',fontSize:14}}>
              🎯 Next Mission
            </button>
          </div>
        ):(
          <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
            <button
              onPointerDown={()=>{setUi(p=>({...p,scoped:!p.scoped}))}}
              style={{padding:'10px 20px',borderRadius:10,background:u.scoped?'#1e3a5f':'#0f1629',color:u.scoped?'#60a5fa':'#94a3b8',fontWeight:800,border:`2px solid ${u.scoped?'#3b82f6':'#1e293b'}`,cursor:'pointer',fontSize:13}}>
              🔭 {u.scoped?'Unscope':'Scope In'}
            </button>
            {u.scoped&&(
              <>
                <button
                  onPointerDown={()=>{if(!breathHeld.current){breathHeld.current=true;sndBreath()}}}
                  onPointerUp={()=>{breathHeld.current=false}}
                  style={{padding:'10px 16px',borderRadius:10,background:'rgba(34,197,94,0.15)',color:'#22c55e',fontWeight:800,border:'2px solid rgba(34,197,94,0.4)',cursor:'pointer',fontSize:13}}>
                  💨 Hold Breath
                </button>
                <button
                  onPointerDown={shoot}
                  disabled={u.ammo<=0}
                  style={{padding:'10px 20px',borderRadius:10,background:u.ammo>0?'#ef4444':'#374151',color:'white',fontWeight:800,border:'none',cursor:u.ammo>0?'pointer':'not-allowed',fontSize:13,opacity:u.ammo>0?1:0.5}}>
                  🔫 FIRE
                </button>
              </>
            )}
            {/* Directional scope aim controls */}
            {u.scoped&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,width:100}}>
                {[['','↑',''],['←','·','→'],['','↓','']].map((row,ri)=>row.map((btn,ci)=>(
                  <button key={`${ri}-${ci}`}
                    onPointerDown={()=>{
                      if(!btn||btn==='·')return
                      const step=6
                      if(btn==='↑')scopePos.current.y=Math.max(0,scopePos.current.y-step)
                      if(btn==='↓')scopePos.current.y=Math.min(H,scopePos.current.y+step)
                      if(btn==='←')scopePos.current.x=Math.max(0,scopePos.current.x-step)
                      if(btn==='→')scopePos.current.x=Math.min(W,scopePos.current.x+step)
                    }}
                    style={{height:28,borderRadius:6,border:'1px solid #1a2642',background:btn&&btn!=='·'?'#0f1629':'transparent',color:'#60a5fa',fontWeight:800,fontSize:13,cursor:btn&&btn!=='·'?'pointer':'default',visibility:btn?'visible':'hidden'}}>
                    {btn==='·'?'🎯':btn}
                  </button>
                )))}
              </div>
            )}
          </div>
        )}
        <p style={{color:'#1e293b',fontSize:9,textAlign:'center',marginTop:8}}>
          Scope in → Aim crosshairs → Hold breath → Fire · Account for wind {u.wind.dir>0?'→':'←'} and bullet drop
        </p>
      </div>
    </div>
  )
}
