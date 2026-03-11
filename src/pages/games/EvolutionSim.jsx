import { useState, useEffect, useRef } from 'react'

// ── Audio ─────────────────────────────────────────────────────────
const _ac={ref:null}
function ac(){if(!_ac.ref)try{_ac.ref=new(window.AudioContext||window.webkitAudioContext)()}catch{}; if(_ac.ref?.state==='suspended')_ac.ref.resume(); return _ac.ref}
function beep(freq,type,dur,vol=0.15,delay=0){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=freq;const t=a.currentTime+delay;g.gain.setValueAtTime(0.001,t);g.gain.linearRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.start(t);o.stop(t+dur+0.05)}
function sndEvolve(){ [300,400,500,700].forEach((f,i)=>beep(f,'sine',0.2,0.2,i*0.08)) }
function sndExtinct(){ [400,300,200,100].forEach((f,i)=>beep(f,'sawtooth',0.25,0.3,i*0.12)) }
function sndBirth(){ beep(800,'sine',0.1,0.15); beep(1000,'sine',0.1,0.12,0.06) }
function sndMutation(){ beep(1200,'square',0.06,0.1); beep(600,'square',0.06,0.08,0.04) }

// ── Genetic Algorithm Engine ──────────────────────────────────────

// Creature genome: [speed, size, senseRadius, reproductionRate, colorR, colorG, colorB, aggression, efficiency]
const GENOME_SIZE = 9
const GENOME_LABELS = ['Speed','Size','Sense','Repro','ColorR','ColorG','ColorB','Aggression','Efficiency']

function randomGenome() {
  return Array.from({length:GENOME_SIZE}, ()=>Math.random())
}

function mutate(genome, rate=0.1) {
  return genome.map(g => {
    if (Math.random() < rate) {
      sndMutation()
      return Math.max(0, Math.min(1, g + (Math.random()-0.5)*0.3))
    }
    return g
  })
}

function crossover(a, b) {
  const pivot = Math.floor(Math.random()*(GENOME_SIZE-1))+1
  return [...a.slice(0,pivot), ...b.slice(pivot)]
}

function genomeToTraits(g) {
  return {
    speed: 0.5 + g[0] * 3.5,        // 0.5–4
    size:  4 + g[1] * 14,            // 4–18
    sense: 30 + g[2] * 120,          // 30–150
    repro: 0.002 + g[3] * 0.018,     // reproduction chance per tick
    color: `rgb(${Math.round(g[4]*200+55)},${Math.round(g[5]*200+55)},${Math.round(g[6]*200+55)})`,
    aggression: g[7],
    efficiency: 0.3 + g[8] * 0.7,   // energy efficiency
  }
}

function fitness(creature) {
  // Fitness = how long it survived + food eaten + children
  return creature.age * 0.1 + creature.foodEaten * 5 + creature.children * 20
}

const W = 480, H = 320

function createCreature(genome=null, x=null, y=null) {
  const g = genome || randomGenome()
  const t = genomeToTraits(g)
  return {
    id: Math.random().toString(36).slice(2),
    genome: g,
    traits: t,
    x: x ?? (20+Math.random()*(W-40)),
    y: y ?? (20+Math.random()*(H-40)),
    vx: (Math.random()-0.5)*t.speed,
    vy: (Math.random()-0.5)*t.speed,
    energy: 80 + Math.random()*40,
    maxEnergy: 120,
    age: 0,
    foodEaten: 0,
    children: 0,
    alive: true,
    recentFitness: 0,
    blinkTimer: 0,
  }
}

function createFood(x=null, y=null) {
  return {
    id: Math.random().toString(36).slice(2),
    x: x ?? (10+Math.random()*(W-20)),
    y: y ?? (10+Math.random()*(H-20)),
    energy: 20+Math.random()*30,
    size: 4+Math.random()*5,
    color: `hsl(${80+Math.random()*60},80%,50%)`,
    pulse: Math.random()*Math.PI*2,
  }
}

function createPredator() {
  return {
    id: Math.random().toString(36).slice(2),
    x: Math.random()*W,
    y: Math.random()*H,
    vx: (Math.random()-0.5)*2.5,
    vy: (Math.random()-0.5)*2.5,
    energy: 200,
    target: null,
    size: 16,
    alive: true,
    killTimer: 0,
  }
}

export default function EvolutionSimulator({ game, levelData, studentId, onFinish }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const [ui, setUi] = useState({
    generation: 1,
    population: 0,
    extinct: false,
    paused: false,
    speed: 1,
    topFitness: 0,
    avgFitness: 0,
    mutations: 0,
    births: 0,
    deaths: 0,
    fitnessHistory: [],
    predators: false,
    foodScarcity: false,
  })
  const uiRef = useRef(ui)
  uiRef.current = ui

  function init() {
    const creatures = Array.from({length:20}, ()=>createCreature())
    const food = Array.from({length:30}, ()=>createFood())
    stateRef.current = {
      creatures, food,
      predators: [],
      particles: [],
      generation: 1,
      genTimer: 0,
      genInterval: 15, // seconds per gen snapshot
      births: 0, deaths: 0, mutations: 0,
      fitnessHistory: [],
      totalTime: 0,
    }
    refreshUi()
  }

  useEffect(() => {
    init()
    lastRef.current = performance.now()
    function loop(now) {
      const rawDt = (now-(lastRef.current||now))/1000
      lastRef.current = now
      const dt = Math.min(rawDt * uiRef.current.speed, 0.1)
      if (!uiRef.current.paused) {
        update(dt)
        draw()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  function update(dt) {
    const s = stateRef.current
    if (!s) return
    s.totalTime += dt
    s.genTimer += dt

    const u = uiRef.current

    // Spawn food
    const targetFood = u.foodScarcity ? 12 : 35
    while (s.food.length < targetFood && Math.random() < 0.3) {
      s.food.push(createFood())
    }
    for (const f of s.food) f.pulse += dt*3

    // Update predators
    if (u.predators) {
      while (s.predators.length < 2) s.predators.push(createPredator())
    } else {
      s.predators = []
    }

    for (const pred of s.predators) {
      // find nearest creature
      let nearest=null, nearD=9999
      for (const c of s.creatures) {
        if(!c.alive) continue
        const d=Math.hypot(c.x-pred.x,c.y-pred.y)
        if(d<nearD){nearD=d;nearest=c}
      }
      if (nearest && nearD < 200) {
        const dx=nearest.x-pred.x, dy=nearest.y-pred.y
        const d=Math.hypot(dx,dy)||1
        pred.vx += (dx/d)*3*dt
        pred.vy += (dy/d)*3*dt
      }
      const spd=Math.hypot(pred.vx,pred.vy)
      if(spd>2.5){pred.vx=pred.vx/spd*2.5;pred.vy=pred.vy/spd*2.5}
      pred.x+=pred.vx; pred.y+=pred.vy
      if(pred.x<0||pred.x>W)pred.vx*=-1
      if(pred.y<0||pred.y>H)pred.vy*=-1
      pred.x=Math.max(0,Math.min(W,pred.x))
      pred.y=Math.max(0,Math.min(H,pred.y))

      // eat creatures
      for (const c of s.creatures) {
        if(!c.alive)continue
        if(Math.hypot(c.x-pred.x,c.y-pred.y)<pred.size+c.traits.size) {
          c.alive=false; c.deathCause='predator'
          spawnParticles(c.x,c.y,'#ef4444',12)
          s.deaths++
        }
      }
    }

    // Update creatures
    const newBabies = []
    for (const c of s.creatures) {
      if (!c.alive) continue
      c.age += dt
      c.blinkTimer = (c.blinkTimer||0)+dt

      // energy drain: larger = more drain, slower = less drain
      const drain = (c.traits.size * 0.015 + c.traits.speed * 0.01) * (1/c.traits.efficiency) * dt
      c.energy -= drain

      // if low energy, move toward food
      let tx=null,ty=null
      let nearestFood=null, nearestFoodD=9999
      for (const f of s.food) {
        const d=Math.hypot(f.x-c.x,f.y-c.y)
        if(d<c.traits.sense&&d<nearestFoodD){nearestFood=f;nearestFoodD=d}
      }
      if (nearestFood) {
        tx=nearestFood.x; ty=nearestFood.y
        const dx=tx-c.x, dy=ty-c.y, d=Math.hypot(dx,dy)||1
        c.vx += (dx/d)*c.traits.speed*0.4*dt*10
        c.vy += (dy/d)*c.traits.speed*0.4*dt*10
      } else {
        // wander
        c.vx += (Math.random()-0.5)*0.8
        c.vy += (Math.random()-0.5)*0.8
      }

      // cap speed
      const spd = Math.hypot(c.vx,c.vy)
      if (spd > c.traits.speed) { c.vx=c.vx/spd*c.traits.speed; c.vy=c.vy/spd*c.traits.speed }

      c.x += c.vx*dt*60; c.y += c.vy*dt*60
      // bounce walls
      if(c.x<c.traits.size){c.x=c.traits.size;c.vx*=-0.8}
      if(c.x>W-c.traits.size){c.x=W-c.traits.size;c.vx*=-0.8}
      if(c.y<c.traits.size){c.y=c.traits.size;c.vy*=-0.8}
      if(c.y>H-c.traits.size){c.y=H-c.traits.size;c.vy*=-0.8}

      // eat food
      for (let fi=s.food.length-1;fi>=0;fi--) {
        const f=s.food[fi]
        if(Math.hypot(f.x-c.x,f.y-c.y)<c.traits.size+f.size) {
          c.energy=Math.min(c.maxEnergy,c.energy+f.energy*c.traits.efficiency)
          c.foodEaten++
          spawnParticles(f.x,f.y,f.color,6,2)
          s.food.splice(fi,1)
        }
      }

      // reproduce
      if (c.energy > c.maxEnergy*0.7 && Math.random() < c.traits.repro * dt * 60) {
        if (s.creatures.filter(x=>x.alive).length < 60) {
          const childGenome = mutate(crossover(c.genome, c.genome), 0.15)
          const baby = createCreature(childGenome, c.x+(Math.random()-0.5)*20, c.y+(Math.random()-0.5)*20)
          newBabies.push(baby)
          c.energy -= 30
          c.children++
          s.births++
          sndBirth()
          spawnParticles(c.x,c.y,'#fbbf24',8,1.5)
        }
      }

      // die of old age or starvation
      if (c.energy <= 0 || c.age > 60+Math.random()*30) {
        c.alive=false; c.deathCause=c.energy<=0?'starvation':'oldAge'
        spawnParticles(c.x,c.y,'#475569',8)
        s.deaths++
      }
    }

    s.creatures.push(...newBabies)
    s.creatures = s.creatures.filter(c=>c.alive||c.age<0.1) // clean up

    // particles
    for(let i=s.particles.length-1;i>=0;i--){
      const p=s.particles[i]
      p.x+=p.vx;p.y+=p.vy;p.vx*=0.92;p.vy*=0.92;p.life-=p.decay
      if(p.life<=0)s.particles.splice(i,1)
    }

    // generation snapshot
    if (s.genTimer >= s.genInterval) {
      s.genTimer=0; s.generation++
      sndEvolve()
      const alive=s.creatures.filter(c=>c.alive)
      const fits=alive.map(fitness)
      const avg=fits.length>0?fits.reduce((a,b)=>a+b,0)/fits.length:0
      const top=fits.length>0?Math.max(...fits):0
      s.fitnessHistory.push({gen:s.generation,avg:Math.round(avg),top:Math.round(top),pop:alive.length})
      if(s.fitnessHistory.length>20)s.fitnessHistory.shift()
    }

    // extinction check
    const alive = s.creatures.filter(c=>c.alive)
    if (alive.length === 0 && s.creatures.length > 0) {
      sndExtinct()
      // auto-respawn with evolved mix
      const survivors = s.creatures.sort((a,b)=>fitness(b)-fitness(a)).slice(0,5)
      for (let i=0;i<15;i++) {
        const parent=survivors[i%survivors.length]
        s.creatures.push(createCreature(mutate(parent.genome,0.2)))
      }
      s.generation++
    }

    refreshUi()
  }

  function spawnParticles(x,y,color,count=10,spd=3){
    for(let i=0;i<count;i++){
      const a=(Math.PI*2*i)/count
      stateRef.current.particles.push({x,y,vx:Math.cos(a)*spd*(0.5+Math.random()),vy:Math.sin(a)*spd*(0.5+Math.random()),color,life:1,decay:0.04+Math.random()*0.04,size:2+Math.random()*3})
    }
  }

  function refreshUi() {
    const s=stateRef.current
    if(!s)return
    const alive=s.creatures.filter(c=>c.alive)
    const fits=alive.map(fitness)
    const avg=fits.length>0?Math.round(fits.reduce((a,b)=>a+b,0)/fits.length):0
    const top=fits.length>0?Math.round(Math.max(...fits)):0
    setUi(prev=>({
      ...prev,
      generation:s.generation,
      population:alive.length,
      topFitness:top,avgFitness:avg,
      mutations:s.births,births:s.births,deaths:s.deaths,
      fitnessHistory:[...s.fitnessHistory],
    }))
  }

  function draw() {
    const canvas=canvasRef.current; if(!canvas)return
    const ctx=canvas.getContext('2d')
    const s=stateRef.current; if(!s)return
    ctx.clearRect(0,0,W,H)

    // background — ecosystem
    const grad=ctx.createLinearGradient(0,0,0,H)
    grad.addColorStop(0,'#0a1a0a')
    grad.addColorStop(1,'#0a150a')
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H)

    // grid dots
    ctx.fillStyle='rgba(255,255,255,0.02)'
    for(let x=0;x<W;x+=20) for(let y=0;y<H;y+=20) {
      ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill()
    }

    // food
    for(const f of s.food){
      const pulse=Math.sin(f.pulse)*2
      ctx.save()
      ctx.shadowColor=f.color; ctx.shadowBlur=8+pulse
      ctx.fillStyle=f.color
      ctx.beginPath();ctx.arc(f.x,f.y,f.size+pulse*0.3,0,Math.PI*2);ctx.fill()
      ctx.restore()
    }

    // predators
    for(const pred of s.predators){
      ctx.save()
      ctx.shadowColor='#dc2626'; ctx.shadowBlur=20
      ctx.font=`${pred.size*1.5}px serif`
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText('🔴',pred.x,pred.y)
      ctx.restore()
    }

    // creatures — draw with their evolved traits
    const alive=s.creatures.filter(c=>c.alive)
    for(const c of alive){
      const t=c.traits
      ctx.save()

      // energy glow
      const energyPct=c.energy/c.maxEnergy
      ctx.shadowColor=t.color
      ctx.shadowBlur=4+energyPct*12

      // body
      ctx.fillStyle=t.color
      ctx.globalAlpha=0.7+energyPct*0.3
      ctx.beginPath()
      ctx.arc(c.x,c.y,t.size,0,Math.PI*2)
      ctx.fill()

      // highlight
      ctx.fillStyle='rgba(255,255,255,0.25)'
      ctx.beginPath()
      ctx.arc(c.x-t.size*0.25,c.y-t.size*0.25,t.size*0.35,0,Math.PI*2)
      ctx.fill()

      // direction indicator
      const angle=Math.atan2(c.vy,c.vx)
      ctx.fillStyle='rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(c.x+Math.cos(angle)*t.size*0.65,c.y+Math.sin(angle)*t.size*0.65,t.size*0.2,0,Math.PI*2)
      ctx.fill()

      // energy bar
      ctx.globalAlpha=1
      ctx.fillStyle='#111'
      ctx.fillRect(c.x-t.size,c.y-t.size-5,t.size*2,3)
      ctx.fillStyle=energyPct>0.5?'#22c55e':energyPct>0.25?'#f59e0b':'#ef4444'
      ctx.fillRect(c.x-t.size,c.y-t.size-5,t.size*2*energyPct,3)

      ctx.restore()
    }

    // particles
    for(const p of s.particles){
      ctx.save()
      ctx.globalAlpha=p.life
      ctx.fillStyle=p.color
      ctx.shadowColor=p.color; ctx.shadowBlur=4
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill()
      ctx.restore()
    }

    // population overlay (corner)
    ctx.fillStyle='rgba(0,0,0,0.5)'
    ctx.fillRect(0,0,90,24)
    ctx.fillStyle='#4ade80'; ctx.font='bold 11px monospace'
    ctx.textAlign='left'; ctx.textBaseline='top'
    ctx.fillText(`Pop: ${alive.length} | Gen: ${s.generation}`,4,4)
  }

  const u = ui

  // fitness chart data
  const maxFit = Math.max(...(u.fitnessHistory.map(h=>h.top)),1)
  const chartW=240, chartH=50

  return (
    <div style={{fontFamily:'monospace',background:'#050810',borderRadius:16,overflow:'hidden'}}>
      <style>{`@keyframes pulse3{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Stats bar */}
      <div style={{background:'#0a150a',padding:'8px 12px',borderBottom:'1px solid #14291a',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{color:'#4ade80',fontWeight:800,fontSize:12}}>🌿 Gen {u.generation}</span>
        <span style={{color:'#60a5fa',fontSize:11}}>Pop: <b>{u.population}</b></span>
        <span style={{color:'#fbbf24',fontSize:11}}>🏆 {u.topFitness}</span>
        <span style={{color:'#a855f7',fontSize:11}}>Born: {u.births}</span>
        <span style={{color:'#ef4444',fontSize:11}}>Died: {u.deaths}</span>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={W} height={H} style={{width:'100%',display:'block'}}/>

      {/* Controls */}
      <div style={{background:'#060f06',borderTop:'1px solid #14291a',padding:'10px 12px'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <button onClick={()=>setUi(p=>({...p,paused:!p.paused}))}
            style={{padding:'6px 12px',borderRadius:8,background:u.paused?'#22c55e':'#475569',color:'white',fontWeight:700,border:'none',cursor:'pointer',fontSize:12}}>
            {u.paused?'▶ Resume':'⏸ Pause'}
          </button>
          {[1,2,4,8].map(sp=>(
            <button key={sp} onClick={()=>setUi(p=>({...p,speed:sp}))}
              style={{padding:'6px 10px',borderRadius:8,background:u.speed===sp?'#0891B2':'#111827',color:u.speed===sp?'white':'#64748b',fontWeight:700,border:'1px solid #1a2642',cursor:'pointer',fontSize:11}}>
              {sp}x
            </button>
          ))}
          <button onClick={()=>setUi(p=>({...p,predators:!p.predators}))}
            style={{padding:'6px 10px',borderRadius:8,background:u.predators?'#dc2626':'#111827',color:'white',fontWeight:700,border:'1px solid #1a2642',cursor:'pointer',fontSize:11}}>
            🔴 {u.predators?'Remove Predators':'Add Predators'}
          </button>
          <button onClick={()=>setUi(p=>({...p,foodScarcity:!p.foodScarcity}))}
            style={{padding:'6px 10px',borderRadius:8,background:u.foodScarcity?'#f59e0b':'#111827',color:'white',fontWeight:700,border:'1px solid #1a2642',cursor:'pointer',fontSize:11}}>
            🍃 {u.foodScarcity?'Normal Food':'Food Scarcity'}
          </button>
          <button onClick={init} style={{padding:'6px 10px',borderRadius:8,background:'#1a2642',color:'#94a3b8',fontWeight:700,border:'1px solid #1a2642',cursor:'pointer',fontSize:11}}>
            🔄 Reset
          </button>
        </div>

        {/* Fitness history chart */}
        {u.fitnessHistory.length > 1 && (
          <div style={{marginTop:4}}>
            <p style={{color:'#475569',fontSize:10,marginBottom:4}}>FITNESS OVER GENERATIONS</p>
            <svg width={chartW} height={chartH} style={{background:'rgba(0,0,0,0.3)',borderRadius:6,display:'block'}}>
              <polyline
                points={u.fitnessHistory.map((h,i)=>`${i*(chartW/19)},${chartH-(h.avg/maxFit)*chartH}`).join(' ')}
                fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.8"
              />
              <polyline
                points={u.fitnessHistory.map((h,i)=>`${i*(chartW/19)},${chartH-(h.top/maxFit)*chartH}`).join(' ')}
                fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8"
              />
            </svg>
            <p style={{color:'#1e3a1e',fontSize:9,marginTop:2}}>
              <span style={{color:'#4ade80'}}>■</span> Avg Fitness &nbsp;
              <span style={{color:'#fbbf24'}}>■</span> Top Fitness
            </p>
          </div>
        )}

        <p style={{color:'#1a2e1a',fontSize:9,marginTop:6}}>
          Watch creatures evolve in real-time · Smarter traits survive · Add pressures to drive evolution
        </p>
      </div>
    </div>
  )
}
