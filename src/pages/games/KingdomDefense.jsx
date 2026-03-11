import { useState, useEffect, useRef, useCallback } from 'react'
import { SoundEngine } from '../../utils/soundEngine.js'

// ── Sound helpers using Web Audio ────────────────────────────────
function makeAC() {
  try { return new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
}
const _ac = { ref: null }
function ac() {
  if (!_ac.ref) _ac.ref = makeAC()
  if (_ac.ref?.state === 'suspended') _ac.ref.resume()
  return _ac.ref
}
function beep(freq, type, dur, vol = 0.2, delay = 0) {
  const a = ac(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.connect(g); g.connect(a.destination)
  o.type = type; o.frequency.value = freq
  const t = a.currentTime + delay
  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.start(t); o.stop(t + dur + 0.05)
}
function playShoot()   { beep(800,'square',0.06,0.15); beep(400,'square',0.04,0.08,0.03) }
function playExplode() { beep(120,'sawtooth',0.3,0.3); beep(80,'sawtooth',0.25,0.2,0.05); beep(200,'square',0.1,0.15,0.02) }
function playBuild()   { [400,600,800].forEach((f,i)=>beep(f,'sine',0.12,0.18,i*0.07)) }
function playWave()    { [200,300,400,500,600].forEach((f,i)=>beep(f,'triangle',0.25,0.25,i*0.1)) }
function playDamage()  { beep(200,'sawtooth',0.15,0.35); beep(150,'sawtooth',0.1,0.2,0.05) }
function playVictory() { [523,659,784,1047].forEach((f,i)=>beep(f,'triangle',0.4,0.35,i*0.15)) }
function playGameOver(){ [300,250,200,150].forEach((f,i)=>beep(f,'sawtooth',0.35,0.3,i*0.2)) }

// ── Constants ─────────────────────────────────────────────────────
const CELL = 40
const COLS = 16
const ROWS = 12
const W = COLS * CELL
const H = ROWS * CELL

// ── Map layout: 0=path, 1=buildable, 2=terrain ───────────────────
function makeMap() {
  const m = Array.from({ length: ROWS }, () => Array(COLS).fill(1))
  // carve path
  const path = [
    [0,2],[1,2],[2,2],[3,2],[4,2],[4,3],[4,4],[4,5],
    [5,5],[6,5],[7,5],[8,5],[8,4],[8,3],[8,2],[9,2],
    [10,2],[11,2],[12,2],[12,3],[12,4],[12,5],[12,6],
    [12,7],[11,7],[10,7],[9,7],[8,7],[7,7],[6,7],
    [5,7],[4,7],[4,8],[4,9],[5,9],[6,9],[7,9],[8,9],
    [9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9]
  ]
  path.forEach(([c,r]) => { if(r<ROWS&&c<COLS) m[r][c] = 0 })
  // add some terrain decorations
  [[2,4],[6,2],[10,4],[13,5],[2,8],[6,11],[13,11]].forEach(([c,r])=>{
    if(r<ROWS&&c<COLS&&m[r][c]===1) m[r][c]=2
  })
  return { grid: m, path }
}

const MAP = makeMap()

// ── Tower definitions ─────────────────────────────────────────────
const TOWERS = {
  laser:    { name:'Laser',    cost:75,  dmg:25,  range:3.5, rate:1.2, color:'#00F5FF', icon:'⚡', special:'pierce',   desc:'Pierces multiple enemies' },
  cannon:   { name:'Cannon',   cost:100, dmg:80,  range:2.5, rate:0.5, color:'#FF6B00', icon:'💣', special:'splash',   desc:'Area damage on impact' },
  freeze:   { name:'Freeze',   cost:80,  dmg:5,   range:3,   rate:1,   color:'#60EFFF', icon:'❄️', special:'slow',     desc:'Slows enemies by 60%' },
  poison:   { name:'Poison',   cost:90,  dmg:8,   range:2.8, rate:1.5, color:'#A3FF00', icon:'☠️', special:'dot',      desc:'Damage over time (3s)' },
  lightning:{ name:'Lightning',cost:150, dmg:40,  range:4,   rate:0.8, color:'#FFD700', icon:'🌩', special:'chain',    desc:'Chains to 3 enemies' },
  blackhole:{ name:'Black Hole',cost:250,dmg:15,  range:3,   rate:2,   color:'#9B59B6', icon:'🌀', special:'pull',     desc:'Pulls & slows enemies' },
}

// ── Enemy definitions ─────────────────────────────────────────────
const ENEMY_TYPES = [
  { type:'grunt',   hp:80,  spd:1.2, reward:10, color:'#EF4444', size:10, icon:'👾', armor:0   },
  { type:'scout',   hp:50,  spd:2.2, reward:15, color:'#F97316', size:8,  icon:'💨', armor:0   },
  { type:'brute',   hp:300, spd:0.7, reward:25, color:'#DC2626', size:14, icon:'🤖', armor:0.2 },
  { type:'shielded',hp:150, spd:1,   reward:20, color:'#3B82F6', size:12, icon:'🛡', armor:0.4 },
  { type:'healer',  hp:100, spd:1.1, reward:30, color:'#10B981', size:10, icon:'💚', armor:0   },
  { type:'boss',    hp:1000,spd:0.6, reward:100,color:'#7C3AED', size:20, icon:'👹', armor:0.3 },
]

function getWaveEnemies(wave) {
  const enemies = []
  const count = Math.min(5 + wave * 3, 40)
  for (let i = 0; i < count; i++) {
    const typeIdx = Math.min(Math.floor((wave - 1) / 3), ENEMY_TYPES.length - 2)
    const t = wave % 5 === 0 && i === 0 ? ENEMY_TYPES[5] : // boss every 5 waves
              ENEMY_TYPES[Math.floor(Math.random() * (typeIdx + 1))]
    enemies.push({
      ...t,
      hp: Math.round(t.hp * (1 + wave * 0.15)),
      maxHp: Math.round(t.hp * (1 + wave * 0.15)),
      spd: t.spd * (1 + wave * 0.03),
      id: Math.random().toString(36).slice(2),
      pathIdx: 0,
      x: MAP.path[0][0] * CELL + CELL/2,
      y: MAP.path[0][1] * CELL + CELL/2,
      slow: 0, poison: 0, poisonTimer: 0,
      delay: i * 800,
    })
  }
  return enemies
}

// ── Particle system ───────────────────────────────────────────────
function spawnParticles(particles, x, y, color, count = 12, speed = 3) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const spd = speed * (0.5 + Math.random())
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1, decay: 0.03 + Math.random() * 0.03,
      size: 2 + Math.random() * 4,
      color,
    })
  }
}

// ── A* Pathfinding (precomputed) ──────────────────────────────────
// We use the fixed path array — enemies just follow MAP.path waypoints

// ── Main Game Component ───────────────────────────────────────────
export default function KingdomDefense({ game, levelData, studentId, onFinish }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const [ui, setUi] = useState({
    gold: 200, lives: 20, wave: 0, score: 0,
    phase: 'build', // build | wave | gameover | victory
    selectedTower: 'laser',
    message: '',
  })
  const uiRef = useRef(ui)
  uiRef.current = ui

  // initialise game state
  useEffect(() => {
    stateRef.current = {
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      spawnQueue: [],
      spawnTimer: 0,
      waveActive: false,
    }
    lastRef.current = performance.now()
    startLoop()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  function startLoop() {
    function loop(now) {
      const dt = Math.min((now - (lastRef.current || now)) / 1000, 0.05)
      lastRef.current = now
      update(dt)
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function update(dt) {
    const s = stateRef.current
    const u = uiRef.current
    if (u.phase !== 'wave') return

    // spawn enemies
    s.spawnTimer += dt * 1000
    if (s.spawnQueue.length > 0 && s.spawnTimer >= s.spawnQueue[0].delay) {
      const e = s.spawnQueue.shift()
      e.delay = 0
      s.enemies.push(e)
      s.spawnTimer = 0
      if (s.spawnQueue.length === 0) s.spawnQueue = []
    }

    // move enemies
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i]
      if (e.slow > 0) e.slow -= dt
      const spd = e.spd * CELL * (e.slow > 0 ? 0.4 : 1)

      // poison
      if (e.poison > 0) {
        e.poisonTimer += dt
        if (e.poisonTimer >= 0.5) { e.hp -= e.poison; e.poisonTimer = 0 }
        e.poison -= dt * 0.3
      }

      if (e.pathIdx >= MAP.path.length) {
        // reached end
        s.enemies.splice(i, 1)
        playDamage()
        setUi(prev => {
          const lives = prev.lives - 1
          if (lives <= 0) { gameOver(); return { ...prev, lives: 0, phase: 'gameover' } }
          return { ...prev, lives }
        })
        continue
      }
      const [tc, tr] = MAP.path[e.pathIdx]
      const tx = tc * CELL + CELL / 2
      const ty = tr * CELL + CELL / 2
      const dx = tx - e.x, dy = ty - e.y
      const dist = Math.sqrt(dx*dx+dy*dy)
      if (dist < 2) { e.pathIdx++; continue }
      e.x += (dx/dist) * spd * dt
      e.y += (dy/dist) * spd * dt
      if (e.hp <= 0) {
        spawnParticles(s.particles, e.x, e.y, e.color, 16, 4)
        playExplode()
        const reward = e.reward
        s.enemies.splice(i, 1)
        setUi(prev => ({ ...prev, gold: prev.gold + reward, score: prev.score + reward * 10 }))
      }
    }

    // tower shooting
    for (const tower of s.towers) {
      tower.cooldown = (tower.cooldown || 0) - dt
      if (tower.cooldown > 0) continue
      const def = TOWERS[tower.type]
      const range = def.range * CELL
      // find target
      let target = null, bestProg = -1
      for (const e of s.enemies) {
        const dx = e.x - tower.x, dy = e.y - tower.y
        if (Math.sqrt(dx*dx+dy*dy) <= range && e.pathIdx > bestProg) {
          target = e; bestProg = e.pathIdx
        }
      }
      if (!target) continue
      tower.cooldown = 1 / def.rate
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x)
      playShoot()

      // create projectile
      const proj = {
        x: tower.x, y: tower.y,
        tx: target.x, ty: target.y,
        targetId: target.id,
        speed: 300 + Math.random() * 100,
        color: def.color,
        type: def.special,
        dmg: def.dmg,
        tower,
        life: 1,
        id: Math.random().toString(36).slice(2),
      }
      s.projectiles.push(proj)

      // chain lightning: add chain targets
      if (def.special === 'chain') {
        const near = s.enemies.filter(e => e !== target).slice(0, 2)
        near.forEach(e => {
          s.projectiles.push({ ...proj, targetId: e.id, tx: e.x, ty: e.y, dmg: def.dmg * 0.6, id: Math.random().toString(36).slice(2) })
        })
      }
    }

    // move projectiles
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i]
      const target = s.enemies.find(e => e.id === p.targetId)
      if (target) { p.tx = target.x; p.ty = target.y }
      const dx = p.tx - p.x, dy = p.ty - p.y
      const dist = Math.sqrt(dx*dx+dy*dy)
      if (dist < 8 || !target) {
        // hit
        if (target) {
          const def = TOWERS[p.tower.type]
          if (def.special === 'splash') {
            s.enemies.forEach(e => {
              const d2 = Math.hypot(e.x-p.tx, e.y-p.ty)
              if (d2 < 2*CELL) { e.hp -= p.dmg * (1 - d2/(2*CELL)); spawnParticles(s.particles, e.x, e.y, p.color, 5, 2) }
            })
            spawnParticles(s.particles, p.tx, p.ty, p.color, 30, 6)
          } else if (def.special === 'slow') {
            target.slow = 2
            spawnParticles(s.particles, p.tx, p.ty, '#60EFFF', 8, 2)
          } else if (def.special === 'dot') {
            target.poison = Math.max(target.poison, p.dmg)
            spawnParticles(s.particles, p.tx, p.ty, '#A3FF00', 8, 2)
          } else if (def.special === 'pull') {
            s.enemies.forEach(e => {
              const d2 = Math.hypot(e.x-p.tx, e.y-p.ty)
              if (d2 < 3*CELL) { e.x += (p.tx-e.x)*0.05; e.y += (p.ty-e.y)*0.05; e.slow = 1 }
            })
          } else {
            target.hp -= p.dmg * (1 - (target.armor || 0))
          }
          if (def.special !== 'splash' && def.special !== 'pull') target.hp -= p.dmg * (1 - (target.armor||0))
          spawnParticles(s.particles, p.tx, p.ty, p.color, 6, 2)
        }
        s.projectiles.splice(i, 1)
        continue
      }
      p.x += (dx/dist) * p.speed * dt
      p.y += (dy/dist) * p.speed * dt
    }

    // particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i]
      p.x += p.vx; p.y += p.vy
      p.vx *= 0.95; p.vy *= 0.95
      p.life -= p.decay
      if (p.life <= 0) s.particles.splice(i, 1)
    }

    // check wave complete
    if (s.spawnQueue.length === 0 && s.enemies.length === 0 && s.waveActive) {
      s.waveActive = false
      const maxWaves = 3 + (levelData?.level || 1) * 2
      if (uiRef.current.wave >= maxWaves) {
        playVictory()
        setUi(prev => ({ ...prev, phase: 'victory' }))
        setTimeout(() => onFinish?.(), 3000)
      } else {
        setUi(prev => ({ ...prev, phase: 'build', gold: prev.gold + 50, message: '🏆 Wave cleared! +50 gold' }))
        setTimeout(() => setUi(prev => ({ ...prev, message: '' })), 2500)
      }
    }
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    const u = uiRef.current

    // scale for mobile
    const scale = canvas.width / W
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(scale, scale)

    // ── Background ──
    ctx.fillStyle = '#0a0f1e'
    ctx.fillRect(0, 0, W, H)

    // ── Grid ──
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = MAP.grid[r][c]
        const x = c * CELL, y = r * CELL
        if (cell === 0) {
          // path — dark stone
          ctx.fillStyle = '#1a1205'
          ctx.fillRect(x, y, CELL, CELL)
          // path texture
          ctx.strokeStyle = '#2a1e0a'
          ctx.lineWidth = 0.5
          ctx.strokeRect(x+2, y+2, CELL-4, CELL-4)
          // path arrow hints
          const pi = MAP.path.findIndex(([pc,pr])=>pc===c&&pr===r)
          if (pi >= 0 && pi < MAP.path.length-1) {
            const [nc,nr] = MAP.path[pi+1]
            ctx.fillStyle = '#3a2e1a'
            ctx.font = `${CELL*0.35}px serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const arrow = nc>c?'›':nc<c?'‹':nr>r?'↓':'↑'
            ctx.fillText(arrow, x+CELL/2, y+CELL/2)
          }
        } else if (cell === 1) {
          // buildable grass
          ctx.fillStyle = '#0d1a0d'
          ctx.fillRect(x, y, CELL, CELL)
          ctx.strokeStyle = '#0f1f0f'
          ctx.lineWidth = 0.5
          ctx.strokeRect(x, y, CELL, CELL)
        } else {
          // terrain
          ctx.fillStyle = '#1a1205'
          ctx.fillRect(x, y, CELL, CELL)
          ctx.font = `${CELL*0.5}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('🌲', x+CELL/2, y+CELL/2)
        }
      }
    }

    // ── Tower range preview (when in build mode) ──
    if (u.phase === 'build') {
      const def = TOWERS[u.selectedTower]
      if (def) {
        ctx.save()
        ctx.globalAlpha = 0.05
        ctx.fillStyle = def.color
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (MAP.grid[r][c] === 1 && !s.towers.find(t=>t.col===c&&t.row===r)) {
              ctx.fillRect(c*CELL, r*CELL, CELL, CELL)
            }
          }
        }
        ctx.restore()
      }
    }

    // ── Towers ──
    for (const tower of s.towers) {
      const def = TOWERS[tower.type]
      const x = tower.x, y = tower.y

      // base platform
      ctx.save()
      ctx.shadowColor = def.color
      ctx.shadowBlur = 15
      ctx.fillStyle = '#1a2040'
      ctx.beginPath()
      ctx.arc(x, y, CELL*0.42, 0, Math.PI*2)
      ctx.fill()
      ctx.strokeStyle = def.color
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()

      // rotating barrel
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(tower.angle || 0)
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.roundRect(-4, -CELL*0.35, 8, CELL*0.35, 3)
      ctx.fill()
      ctx.restore()

      // icon
      ctx.font = `${CELL*0.45}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(def.icon, x, y)

      // range ring (subtle)
      ctx.save()
      ctx.globalAlpha = 0.08
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, def.range * CELL, 0, Math.PI*2)
      ctx.stroke()
      ctx.restore()
    }

    // ── Enemies ──
    for (const e of s.enemies) {
      // shadow
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(e.x, e.y+e.size, e.size*0.8, e.size*0.3, 0, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()

      // glow
      ctx.save()
      ctx.shadowColor = e.color
      ctx.shadowBlur = 12
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.size, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()

      // icon
      ctx.font = `${e.size*1.4}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(e.icon, e.x, e.y)

      // HP bar
      const bw = e.size * 2.5, bh = 4
      const bx = e.x - bw/2, by = e.y - e.size - 8
      ctx.fillStyle = '#111'
      ctx.fillRect(bx, by, bw, bh)
      const pct = Math.max(0, e.hp / e.maxHp)
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444'
      ctx.fillRect(bx, by, bw * pct, bh)

      // slow/poison indicator
      if (e.slow > 0) {
        ctx.fillStyle = '#60EFFF'
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.size+4, 0, Math.PI*2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      if (e.poison > 0) {
        ctx.save()
        ctx.globalAlpha = 0.4
        ctx.fillStyle = '#A3FF00'
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.size+2, 0, Math.PI*2)
        ctx.fill()
        ctx.restore()
      }
    }

    // ── Projectiles ──
    for (const p of s.projectiles) {
      ctx.save()
      ctx.shadowColor = p.color
      ctx.shadowBlur = 20
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2)
      ctx.fill()
      // trail
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.arc(p.x - (p.tx-p.x)*0.05, p.y - (p.ty-p.y)*0.05, 2.5, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()
    }

    // ── Particles ──
    for (const p of s.particles) {
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()
    }

    // ── Endpoint castle ──
    const [ec,er] = MAP.path[MAP.path.length-1]
    ctx.font = `${CELL*0.8}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏰', ec*CELL+CELL/2, er*CELL+CELL/2)

    // ── Start spawn point ──
    ctx.font = `${CELL*0.7}px serif`
    const [sc,sr] = MAP.path[0]
    ctx.fillText('⚔️', sc*CELL+CELL/2, sr*CELL+CELL/2)

    // ── Overlay messages ──
    if (u.phase === 'gameover' || u.phase === 'victory') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = u.phase === 'victory' ? '#FFD700' : '#EF4444'
      ctx.shadowBlur = 40
      ctx.font = 'bold 36px monospace'
      ctx.fillStyle = u.phase === 'victory' ? '#FFD700' : '#EF4444'
      ctx.fillText(u.phase === 'victory' ? '🏆 VICTORY!' : '💀 DEFEATED', W/2, H/2-20)
      ctx.font = '18px monospace'
      ctx.fillStyle = '#fff'
      ctx.shadowBlur = 0
      ctx.fillText(`Score: ${u.score}`, W/2, H/2+24)
      ctx.restore()
    }

    ctx.restore()
  }

  function handleCanvasClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scale = W / rect.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    const col = Math.floor(x / CELL)
    const row = Math.floor(y / CELL)
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
    if (MAP.grid[row][col] !== 1) return
    const s = stateRef.current
    const u = uiRef.current
    if (u.phase !== 'build') return
    if (s.towers.find(t => t.col === col && t.row === row)) return
    const def = TOWERS[u.selectedTower]
    if (u.gold < def.cost) { setUi(p => ({ ...p, message: '❌ Not enough gold!' })); setTimeout(() => setUi(p => ({ ...p, message: '' })), 1500); return }
    s.towers.push({ type: u.selectedTower, col, row, x: col*CELL+CELL/2, y: row*CELL+CELL/2, angle: 0, cooldown: 0 })
    playBuild()
    setUi(p => ({ ...p, gold: p.gold - def.cost }))
  }

  function startWave() {
    const s = stateRef.current
    const nextWave = uiRef.current.wave + 1
    s.spawnQueue = getWaveEnemies(nextWave)
    s.waveActive = true
    s.spawnTimer = 0
    playWave()
    setUi(p => ({ ...p, wave: nextWave, phase: 'wave', message: `Wave ${nextWave} incoming!` }))
    setTimeout(() => setUi(p => ({ ...p, message: '' })), 2000)
  }

  function gameOver() { playGameOver() }

  const u = ui
  const maxWaves = 3 + (levelData?.level || 1) * 2

  return (
    <div style={{ fontFamily: 'monospace', userSelect: 'none', background: '#050810', borderRadius: 16, overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes slideIn { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* HUD */}
      <div style={{ background: 'linear-gradient(180deg,#0d1117 0%,#060a14 100%)', padding: '10px 12px', borderBottom: '1px solid #1a2642', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display:'flex', gap:16, flex:1 }}>
          <span style={{ color:'#FFD700', fontWeight:800, fontSize:13 }}>💰 {u.gold}</span>
          <span style={{ color:'#EF4444', fontWeight:800, fontSize:13 }}>❤️ {u.lives}</span>
          <span style={{ color:'#60EFFF', fontWeight:800, fontSize:13 }}>⭐ {u.score}</span>
          <span style={{ color:'#A855F7', fontWeight:800, fontSize:13 }}>🌊 {u.wave}/{maxWaves}</span>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {u.phase === 'build' && (
            <button onClick={startWave} style={{ padding:'6px 14px', borderRadius:8, background:'#ef4444', color:'white', fontWeight:800, fontSize:12, border:'none', cursor:'pointer', animation:'pulse 1.5s infinite' }}>
              ▶ SEND WAVE
            </button>
          )}
          {u.phase === 'wave' && <span style={{ color:'#f59e0b', fontSize:12, fontWeight:700, animation:'pulse 0.8s infinite' }}>⚔️ WAVE IN PROGRESS</span>}
        </div>
      </div>

      {/* Message banner */}
      {u.message && (
        <div style={{ background:'rgba(255,215,0,0.15)', borderBottom:'1px solid rgba(255,215,0,0.3)', padding:'6px 12px', textAlign:'center', color:'#FFD700', fontWeight:700, fontSize:12, animation:'slideIn 0.3s ease' }}>
          {u.message}
        </div>
      )}

      {/* Canvas */}
      <div style={{ position:'relative', width:'100%', aspectRatio:`${W}/${H}` }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{ width:'100%', height:'100%', display:'block', cursor: u.phase==='build'?'crosshair':'default' }}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Tower selector */}
      <div style={{ background:'#060a14', borderTop:'1px solid #1a2642', padding:'10px 8px' }}>
        <p style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8, textAlign:'center' }}>
          🏗️ SELECT TOWER — TAP MAP TO PLACE
        </p>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
          {Object.entries(TOWERS).map(([key, def]) => {
            const sel = u.selectedTower === key
            const canAfford = u.gold >= def.cost
            return (
              <button key={key} onClick={() => setUi(p => ({ ...p, selectedTower: key }))}
                style={{
                  flexShrink:0, padding:'8px 10px', borderRadius:10, border:`2px solid ${sel?def.color:'#1a2642'}`,
                  background: sel ? `${def.color}22` : '#0d1117',
                  opacity: canAfford ? 1 : 0.5,
                  cursor:'pointer', textAlign:'center', minWidth:64,
                  boxShadow: sel ? `0 0 12px ${def.color}88` : 'none',
                  transition:'all 0.2s',
                }}>
                <div style={{ fontSize:18 }}>{def.icon}</div>
                <div style={{ color: sel ? def.color : '#64748b', fontSize:9, fontWeight:800, marginTop:2 }}>{def.name}</div>
                <div style={{ color: canAfford ? '#FFD700' : '#ef4444', fontSize:9, fontWeight:700 }}>💰{def.cost}</div>
              </button>
            )
          })}
        </div>
        {u.selectedTower && (
          <p style={{ color:'#94A3B8', fontSize:10, textAlign:'center', marginTop:6 }}>
            {TOWERS[u.selectedTower]?.desc}
          </p>
        )}
      </div>
    </div>
  )
}
