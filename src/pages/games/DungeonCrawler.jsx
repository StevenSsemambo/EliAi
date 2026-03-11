import { useState, useEffect, useRef, useCallback } from 'react'

// ── Audio ─────────────────────────────────────────────────────────
const _ac = { ref: null }
function ac() {
  if (!_ac.ref) try { _ac.ref = new (window.AudioContext || window.webkitAudioContext)() } catch {}
  if (_ac.ref?.state === 'suspended') _ac.ref.resume()
  return _ac.ref
}
function beep(freq, type, dur, vol=0.2, delay=0) {
  const a=ac(); if(!a)return
  const o=a.createOscillator(), g=a.createGain()
  o.connect(g); g.connect(a.destination)
  o.type=type; o.frequency.value=freq
  const t=a.currentTime+delay
  g.gain.setValueAtTime(0.001,t)
  g.gain.linearRampToValueAtTime(vol,t+0.01)
  g.gain.exponentialRampToValueAtTime(0.001,t+dur)
  o.start(t); o.stop(t+dur+0.05)
}
function sndStep()   { beep(80+Math.random()*20,'sine',0.04,0.05) }
function sndHit()    { beep(300,'sawtooth',0.08,0.25); beep(180,'square',0.06,0.15,0.04) }
function sndHurt()   { beep(200,'sawtooth',0.2,0.35); beep(120,'sawtooth',0.15,0.25,0.05) }
function sndPickup() { [600,800,1000].forEach((f,i)=>beep(f,'sine',0.1,0.15,i*0.06)) }
function sndDead()   { [300,250,200,150,100].forEach((f,i)=>beep(f,'sawtooth',0.3,0.3,i*0.15)) }
function sndLvlUp()  { [400,500,600,800,1000].forEach((f,i)=>beep(f,'triangle',0.25,0.3,i*0.08)) }
function sndDoor()   { beep(400,'square',0.1,0.2); beep(500,'square',0.1,0.2,0.1) }

// ── Constants ─────────────────────────────────────────────────────
const TILE = 32
const VIEW_W = 15  // tiles visible
const VIEW_H = 13
const MAP_W  = 40
const MAP_H  = 30

const TILE_WALL   = 0
const TILE_FLOOR  = 1
const TILE_DOOR   = 2
const TILE_CHEST  = 3
const TILE_STAIRS = 4
const TILE_TORCH  = 5

// ── Procedural dungeon generator ──────────────────────────────────
function generateDungeon(level) {
  const grid = Array.from({length:MAP_H}, ()=>Array(MAP_W).fill(TILE_WALL))
  const rooms = []

  function carveRoom(x,y,w,h) {
    for (let ry=y;ry<y+h;ry++) for (let rx=x;rx<x+w;rx++) grid[ry][rx]=TILE_FLOOR
    rooms.push({x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)})
  }

  function carveH(x1,x2,y) { for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++) if(grid[y][x]===TILE_WALL) grid[y][x]=TILE_FLOOR }
  function carveV(x,y1,y2) { for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++) if(grid[y][x]===TILE_WALL) grid[y][x]=TILE_FLOOR }

  const numRooms = 8 + level
  for (let i=0; i<numRooms*10 && rooms.length<numRooms; i++) {
    const w=5+Math.floor(Math.random()*6)
    const h=4+Math.floor(Math.random()*5)
    const x=1+Math.floor(Math.random()*(MAP_W-w-2))
    const y=1+Math.floor(Math.random()*(MAP_H-h-2))
    const overlap = rooms.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y)
    if(!overlap) carveRoom(x,y,w,h)
  }

  // connect rooms with corridors
  for (let i=1;i<rooms.length;i++) {
    const a=rooms[i-1], b=rooms[i]
    if (Math.random()<0.5) { carveH(a.cx,b.cx,a.cy); carveV(b.cx,a.cy,b.cy) }
    else { carveV(a.cx,a.cy,b.cy); carveH(a.cx,b.cx,b.cy) }
  }

  // add doors at room entrances
  rooms.forEach(r => {
    // simple door placement at room edges
    if (Math.random()<0.5 && r.x>0) grid[r.cy][r.x]=TILE_DOOR
  })

  // place chests
  const numChests = 2 + level
  for (let i=0;i<numChests;i++) {
    const r=rooms[1+Math.floor(Math.random()*(rooms.length-2))]
    const cx=r.x+1+Math.floor(Math.random()*(r.w-2))
    const cy=r.y+1+Math.floor(Math.random()*(r.h-2))
    grid[cy][cx]=TILE_CHEST
  }

  // torches
  for (let i=0;i<8+level;i++) {
    const r=rooms[Math.floor(Math.random()*rooms.length)]
    grid[r.y][r.cx]=TILE_TORCH
  }

  // stairs in last room
  const last=rooms[rooms.length-1]
  grid[last.cy][last.cx]=TILE_STAIRS

  // spawn enemies in rooms 2+
  const enemies = []
  rooms.slice(1).forEach((r,ri) => {
    const count = 1 + Math.floor(Math.random()*(level+ri))
    for (let i=0;i<count;i++) {
      const types = ['SLIME','SKELETON','ORC','MAGE','TROLL','DEMON']
      const typeIdx = Math.min(Math.floor(level/2)+Math.floor(Math.random()*2), types.length-1)
      const type = types[typeIdx]
      enemies.push({
        id: Math.random().toString(36).slice(2),
        type,
        x: r.x+1+Math.floor(Math.random()*(r.w-2)),
        y: r.y+1+Math.floor(Math.random()*(r.h-2)),
        hp: 20+level*8+ri*5,
        maxHp: 20+level*8+ri*5,
        dmg: 5+level*2,
        xp: 10+level*3,
        gold: Math.floor(Math.random()*(5+level*2)),
        moveTimer: 0,
        moveRate: 0.8+Math.random()*0.5,
        alive: true,
        animFrame: 0,
        animTimer: 0,
      })
    }
  })

  return { grid, rooms, enemies, playerStart: { x:rooms[0].cx, y:rooms[0].cy } }
}

const ENEMY_GFX = {
  SLIME:    { icon:'🟢', color:'#22c55e', name:'Slime'    },
  SKELETON: { icon:'💀', color:'#e2e8f0', name:'Skeleton' },
  ORC:      { icon:'👹', color:'#ef4444', name:'Orc'      },
  MAGE:     { icon:'🧙', color:'#a855f7', name:'Mage'     },
  TROLL:    { icon:'👾', color:'#f97316', name:'Troll'    },
  DEMON:    { icon:'😈', color:'#dc2626', name:'Demon'    },
}

const WEAPON_TYPES = [
  { name:'Rusty Sword',   dmg:8,  icon:'🗡',  color:'#94a3b8' },
  { name:'Iron Blade',    dmg:14, icon:'⚔️',  color:'#60a5fa' },
  { name:'Fire Staff',    dmg:20, icon:'🔥',  color:'#f97316' },
  { name:'Thunder Axe',   dmg:18, icon:'⚡',  color:'#fbbf24' },
  { name:'Shadow Dagger', dmg:12, icon:'🌑',  color:'#a855f7' },
  { name:'Holy Blade',    dmg:25, icon:'✨',  color:'#fde68a' },
]

const ARMOR_TYPES = [
  { name:'Cloth Robe',    def:2,  icon:'👕', color:'#94a3b8' },
  { name:'Leather Vest',  def:5,  icon:'🧥', color:'#92400e' },
  { name:'Iron Mail',     def:10, icon:'🛡', color:'#60a5fa' },
  { name:'Dragon Plate',  def:18, icon:'🐉', color:'#ef4444' },
]

function getRandomLoot(level) {
  const r = Math.random()
  if (r < 0.5) {
    const idx = Math.min(Math.floor(Math.random()*(level+1)), WEAPON_TYPES.length-1)
    return { type:'weapon', ...WEAPON_TYPES[idx] }
  } else if (r < 0.75) {
    const idx = Math.min(Math.floor(Math.random()*(level+1)), ARMOR_TYPES.length-1)
    return { type:'armor', ...ARMOR_TYPES[idx] }
  } else {
    return { type:'potion', name:'Health Potion', heal:30+level*10, icon:'🧪', color:'#ef4444' }
  }
}

// ── FOG OF WAR ────────────────────────────────────────────────────
function computeFog(grid, px, py, radius=5) {
  const fog = Array.from({length:MAP_H}, ()=>Array(MAP_W).fill(0)) // 0=hidden,1=visible,2=seen
  for (let dy=-radius;dy<=radius;dy++) {
    for (let dx=-radius;dx<=radius;dx++) {
      if (dx*dx+dy*dy > radius*radius) continue
      const tx=px+dx, ty=py+dy
      if (tx<0||tx>=MAP_W||ty<0||ty>=MAP_H) continue
      fog[ty][tx]=1
    }
  }
  return fog
}

// ── Main Component ────────────────────────────────────────────────
export default function DungeonCrawler({ game, levelData, studentId, onFinish }) {
  const dungeonLevel = levelData?.level || 1
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)
  const keysRef   = useRef({})
  const lastRef   = useRef(null)
  const moveRef   = useRef(0)
  const [ui, setUi] = useState(null)
  const uiRef = useRef(null)

  function initGame() {
    const dungeon = generateDungeon(dungeonLevel)
    const player = {
      x: dungeon.playerStart.x,
      y: dungeon.playerStart.y,
      hp: 80, maxHp: 80,
      mp: 40, maxMp: 40,
      atk: 10, def: 2,
      xp: 0, xpNext: 50,
      level: 1,
      gold: 20,
      weapon: WEAPON_TYPES[0],
      armor:  ARMOR_TYPES[0],
      inventory: [],
      facing: 's',
      animFrame: 0,
      animTimer: 0,
      hitFlash: 0,
      attackAnim: 0,
    }
    const fog = computeFog(dungeon.grid, player.x, player.y)
    const seenGrid = Array.from({length:MAP_H}, ()=>Array(MAP_W).fill(false))
    // mark visible as seen
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) if(fog[y][x]===1) seenGrid[y][x]=true

    stateRef.current = { dungeon, player, fog, seenGrid, particles:[], floatingTexts:[], phase:'playing', lootPopup:null }
    const uiData = { player, phase:'playing', lootPopup:null, dungeon: dungeonLevel, message:'' }
    uiRef.current = uiData
    setUi(uiData)
  }

  useEffect(() => {
    initGame()
    lastRef.current = performance.now()
    function loop(now) {
      const dt = Math.min((now-(lastRef.current||now))/1000, 0.05)
      lastRef.current = now
      update(dt)
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKey = e => { keysRef.current[e.key] = e.type==='keydown'; e.preventDefault() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  function tryMove(dx, dy) {
    const s = stateRef.current
    if (!s || s.phase !== 'playing') return
    const p = s.player
    const nx = p.x + dx, ny = p.y + dy
    if (nx<0||nx>=MAP_W||ny<0||ny>=MAP_H) return
    const tile = s.dungeon.grid[ny][nx]
    if (tile === TILE_WALL) return

    // check enemy
    const enemy = s.dungeon.enemies.find(e=>e.alive&&e.x===nx&&e.y===ny)
    if (enemy) {
      // attack
      const dmg = Math.max(1, p.atk + p.weapon.dmg - Math.floor(Math.random()*4))
      enemy.hp -= dmg
      sndHit()
      addFloat(nx, ny, `-${dmg}`, '#ef4444')
      p.attackAnim = 0.15
      if (enemy.hp <= 0) {
        enemy.alive = false
        sndPickup()
        p.xp += enemy.xp
        p.gold += enemy.gold
        addFloat(nx, ny, `+${enemy.xp}xp`, '#fbbf24')
        spawnParticles(nx*TILE+TILE/2, ny*TILE+TILE/2, ENEMY_GFX[enemy.type].color, 20, 4)
        // level up?
        if (p.xp >= p.xpNext) {
          p.level++; p.xp -= p.xpNext; p.xpNext = Math.round(p.xpNext*1.5)
          p.maxHp += 15; p.hp = Math.min(p.hp+20, p.maxHp)
          p.atk += 2
          sndLvlUp()
          addFloat(p.x, p.y, '⬆ LEVEL UP!', '#a855f7')
        }
      }
      refreshUi()
      return
    }

    // door
    if (tile === TILE_DOOR) { sndDoor(); s.dungeon.grid[ny][nx] = TILE_FLOOR }

    // chest
    if (tile === TILE_CHEST) {
      s.dungeon.grid[ny][nx] = TILE_FLOOR
      const loot = getRandomLoot(dungeonLevel)
      sndPickup()
      s.lootPopup = loot
      applyLoot(loot)
      addFloat(nx, ny, `Found ${loot.name}!`, '#fde68a')
      setTimeout(() => { if(stateRef.current) stateRef.current.lootPopup=null; refreshUi() }, 2000)
    }

    // stairs
    if (tile === TILE_STAIRS) {
      sndLvlUp()
      onFinish?.()
      return
    }

    p.x = nx; p.y = ny
    p.facing = dx>0?'e':dx<0?'w':dy>0?'s':'n'
    sndStep()

    // update fog
    s.fog = computeFog(s.dungeon.grid, p.x, p.y)
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) if(s.fog[y][x]===1) s.seenGrid[y][x]=true

    refreshUi()
  }

  function applyLoot(loot) {
    const p = stateRef.current.player
    if (loot.type==='weapon') p.weapon=loot
    else if (loot.type==='armor') { p.armor=loot; p.def=loot.def }
    else if (loot.type==='potion') { p.hp=Math.min(p.maxHp, p.hp+loot.heal) }
  }

  function addFloat(tx, ty, text, color) {
    stateRef.current.floatingTexts.push({
      x:tx*TILE+TILE/2, y:ty*TILE, text, color, life:1, vy:-1.5
    })
  }
  function spawnParticles(x,y,color,count=12,spd=3) {
    for(let i=0;i<count;i++) {
      const a=(Math.PI*2*i)/count
      stateRef.current.particles.push({ x,y, vx:Math.cos(a)*spd*(0.5+Math.random()), vy:Math.sin(a)*spd*(0.5+Math.random()), color, life:1, decay:0.04+Math.random()*0.03, size:3+Math.random()*3 })
    }
  }

  function refreshUi() {
    const s = stateRef.current
    if (!s) return
    const newUi = { player:{...s.player}, phase:s.phase, lootPopup:s.lootPopup, dungeon:dungeonLevel, message:'' }
    uiRef.current = newUi
    setUi(newUi)
  }

  function update(dt) {
    const s = stateRef.current
    if (!s || s.phase !== 'playing') return
    const p = s.player

    // player animation
    p.animTimer += dt
    if (p.animTimer > 0.2) { p.animFrame=(p.animFrame+1)%2; p.animTimer=0 }
    if (p.hitFlash>0) p.hitFlash-=dt
    if (p.attackAnim>0) p.attackAnim-=dt

    // keyboard movement with delay
    moveRef.current += dt
    if (moveRef.current >= 0.18) {
      const k = keysRef.current
      if (k['ArrowLeft']||k['a'])  { tryMove(-1,0); moveRef.current=0 }
      if (k['ArrowRight']||k['d']) { tryMove(1,0);  moveRef.current=0 }
      if (k['ArrowUp']||k['w'])    { tryMove(0,-1); moveRef.current=0 }
      if (k['ArrowDown']||k['s'])  { tryMove(0,1);  moveRef.current=0 }
    }

    // enemy AI
    for (const e of s.dungeon.enemies) {
      if (!e.alive) continue
      e.animTimer = (e.animTimer||0)+dt
      if (e.animTimer>0.3) { e.animFrame=(e.animFrame+1)%2; e.animTimer=0 }
      e.moveTimer += dt
      if (e.moveTimer < e.moveRate) continue
      e.moveTimer = 0

      // only move if player is nearby
      const dx = p.x-e.x, dy = p.y-e.y
      const dist = Math.abs(dx)+Math.abs(dy)
      if (dist > 8) continue

      // attack if adjacent
      if (dist===1) {
        const dmg = Math.max(1, e.dmg - p.def - p.armor.def + Math.floor(Math.random()*4))
        p.hp -= dmg
        p.hitFlash = 0.3
        sndHurt()
        addFloat(p.x, p.y, `-${dmg}`, '#ef4444')
        if (p.hp <= 0) {
          s.phase = 'dead'
          sndDead()
          refreshUi()
        }
        continue
      }

      // simple move toward player
      const mdx = dx!==0 ? Math.sign(dx) : 0
      const mdy = dy!==0 ? Math.sign(dy) : 0
      const moves = Math.abs(dx)>Math.abs(dy) ? [[mdx,0],[0,mdy]] : [[0,mdy],[mdx,0]]
      for (const [mx,my] of moves) {
        const nx=e.x+mx, ny=e.y+my
        if (nx<0||nx>=MAP_W||ny<0||ny>=MAP_H) continue
        const tile=s.dungeon.grid[ny][nx]
        if (tile===TILE_WALL) continue
        if (s.dungeon.enemies.some(o=>o.alive&&o!==e&&o.x===nx&&o.y===ny)) continue
        if (p.x===nx&&p.y===ny) continue
        e.x=nx; e.y=ny; break
      }
    }

    // floating texts
    for(let i=s.floatingTexts.length-1;i>=0;i--) {
      const ft=s.floatingTexts[i]
      ft.y+=ft.vy; ft.life-=0.025
      if(ft.life<=0) s.floatingTexts.splice(i,1)
    }

    // particles
    for(let i=s.particles.length-1;i>=0;i--) {
      const p=s.particles[i]
      p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.life-=p.decay
      if(p.life<=0) s.particles.splice(i,1)
    }
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    if (!s) return
    const p = s.player

    const cw = canvas.width, ch = canvas.height
    ctx.clearRect(0,0,cw,ch)

    // camera centered on player
    const camX = p.x*TILE - cw/2 + TILE/2
    const camY = p.y*TILE - ch/2 + TILE/2

    ctx.save()
    ctx.translate(-camX, -camY)

    // ── Draw tiles ──
    const startCol = Math.max(0, Math.floor(camX/TILE)-1)
    const endCol   = Math.min(MAP_W, startCol+VIEW_W+2)
    const startRow = Math.max(0, Math.floor(camY/TILE)-1)
    const endRow   = Math.min(MAP_H, startRow+VIEW_H+2)

    for (let row=startRow; row<endRow; row++) {
      for (let col=startCol; col<endCol; col++) {
        const vis = s.fog[row]?.[col] || 0
        const seen = s.seenGrid[row]?.[col]
        if (!vis && !seen) continue

        const tile = s.dungeon.grid[row][col]
        const x = col*TILE, y = row*TILE
        const dimmed = !vis

        ctx.save()
        if (dimmed) ctx.globalAlpha = 0.35

        if (tile === TILE_WALL) {
          // stone wall
          ctx.fillStyle = '#1e293b'
          ctx.fillRect(x,y,TILE,TILE)
          ctx.fillStyle = '#0f172a'
          ctx.fillRect(x+1,y+1,TILE-2,TILE-2)
          // brick pattern
          ctx.strokeStyle = '#334155'
          ctx.lineWidth = 0.5
          if (row%2===0) {
            ctx.strokeRect(x,y,TILE/2,TILE/2)
            ctx.strokeRect(x+TILE/2,y,TILE/2,TILE/2)
          } else {
            ctx.strokeRect(x+TILE/4,y,TILE/2,TILE/2)
          }
        } else if (tile === TILE_FLOOR) {
          ctx.fillStyle = '#1c1410'
          ctx.fillRect(x,y,TILE,TILE)
          ctx.fillStyle = '#211810'
          // floor texture dots
          ctx.fillRect(x+4,y+4,2,2)
          ctx.fillRect(x+TILE-8,y+TILE-8,2,2)
        } else if (tile === TILE_DOOR) {
          ctx.fillStyle = '#78350f'
          ctx.fillRect(x,y,TILE,TILE)
          ctx.font=`${TILE*0.8}px serif`
          ctx.textAlign='center'; ctx.textBaseline='middle'
          ctx.fillText('🚪',x+TILE/2,y+TILE/2)
        } else if (tile === TILE_CHEST) {
          ctx.fillStyle = '#1c1410'; ctx.fillRect(x,y,TILE,TILE)
          ctx.font=`${TILE*0.8}px serif`
          ctx.textAlign='center'; ctx.textBaseline='middle'
          if (!dimmed) {
            ctx.shadowColor='#fbbf24'; ctx.shadowBlur=10
          }
          ctx.fillText('📦',x+TILE/2,y+TILE/2)
        } else if (tile === TILE_STAIRS) {
          ctx.fillStyle = '#1c1410'; ctx.fillRect(x,y,TILE,TILE)
          ctx.font=`${TILE*0.8}px serif`
          ctx.textAlign='center'; ctx.textBaseline='middle'
          if (!dimmed) { ctx.shadowColor='#a855f7'; ctx.shadowBlur=15 }
          ctx.fillText('🔽',x+TILE/2,y+TILE/2)
        } else if (tile === TILE_TORCH) {
          ctx.fillStyle = '#1c1410'; ctx.fillRect(x,y,TILE,TILE)
          ctx.font=`${TILE*0.7}px serif`
          ctx.textAlign='center'; ctx.textBaseline='middle'
          if (!dimmed) { ctx.shadowColor='#f97316'; ctx.shadowBlur=20 }
          ctx.fillText('🔦',x+TILE/2,y+TILE/2)
          // torch light glow
          if (!dimmed) {
            ctx.save()
            ctx.globalAlpha=0.06
            const grad=ctx.createRadialGradient(x+TILE/2,y+TILE/2,0,x+TILE/2,y+TILE/2,TILE*3)
            grad.addColorStop(0,'#f97316')
            grad.addColorStop(1,'transparent')
            ctx.fillStyle=grad
            ctx.fillRect(x-TILE*2,y-TILE*2,TILE*5,TILE*5)
            ctx.restore()
          }
        }
        ctx.restore()
      }
    }

    // ── Enemies ──
    for (const e of s.dungeon.enemies) {
      if (!e.alive) continue
      if (!s.fog[e.y]?.[e.x]) continue
      const gfx = ENEMY_GFX[e.type]
      const ex = e.x*TILE, ey = e.y*TILE
      const bob = Math.sin(Date.now()*0.004+e.x)*2

      ctx.save()
      ctx.shadowColor=gfx.color; ctx.shadowBlur=10
      ctx.font=`${TILE*0.85}px serif`
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText(gfx.icon, ex+TILE/2, ey+TILE/2+bob)

      // HP bar
      const bw=TILE*0.9, bh=3, bx=ex+TILE*0.05, by=ey+1
      ctx.fillStyle='#111'; ctx.fillRect(bx,by,bw,bh)
      ctx.fillStyle=gfx.color; ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),bh)
      ctx.restore()
    }

    // ── Player ──
    const px2 = p.x*TILE, py2 = p.y*TILE
    const bob = Math.sin(Date.now()*0.005)*2

    // attack flash
    if (p.attackAnim > 0) {
      ctx.save()
      ctx.globalAlpha = p.attackAnim/0.15
      ctx.fillStyle = '#fbbf24'
      const atkX = px2 + (p.facing==='e'?TILE:p.facing==='w'?-TILE:0)
      const atkY = py2 + (p.facing==='s'?TILE:p.facing==='n'?-TILE:0)
      ctx.fillRect(atkX+4, atkY+4, TILE-8, TILE-8)
      ctx.restore()
    }

    ctx.save()
    if (p.hitFlash>0) { ctx.globalAlpha=0.5+Math.sin(Date.now()*0.04)*0.5 }
    ctx.shadowColor='#60a5fa'; ctx.shadowBlur=15
    ctx.font=`${TILE*0.95}px serif`
    ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText('🧙‍♂️', px2+TILE/2, py2+TILE/2+bob)
    ctx.restore()

    // floating texts
    for (const ft of s.floatingTexts) {
      ctx.save()
      ctx.globalAlpha=ft.life
      ctx.fillStyle=ft.color
      ctx.font='bold 13px monospace'
      ctx.textAlign='center'
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.restore()
    }

    // particles
    for (const pt of s.particles) {
      ctx.save()
      ctx.globalAlpha=pt.life
      ctx.fillStyle=pt.color
      ctx.shadowColor=pt.color; ctx.shadowBlur=6
      ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size*pt.life,0,Math.PI*2); ctx.fill()
      ctx.restore()
    }

    ctx.restore()

    // ── Death/overlay ──
    if (s.phase === 'dead') {
      ctx.fillStyle='rgba(0,0,0,0.8)'
      ctx.fillRect(0,0,cw,ch)
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.font='bold 32px monospace'
      ctx.fillStyle='#ef4444'
      ctx.shadowColor='#ef4444'; ctx.shadowBlur=30
      ctx.fillText('💀 YOU DIED', cw/2, ch/2-20)
      ctx.font='16px monospace'
      ctx.fillStyle='#94a3b8'; ctx.shadowBlur=0
      ctx.fillText(`Level ${p.level} · Gold: ${p.gold} · XP: ${p.xp}`, cw/2, ch/2+20)
    }
  }

  const u = ui
  if (!u) return <div style={{background:'#050810',height:500,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#475569'}}>Loading dungeon...</span></div>

  const pData = u.player

  return (
    <div style={{fontFamily:'monospace',background:'#050810',borderRadius:16,overflow:'hidden',userSelect:'none'}}>
      <style>{`
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {/* HUD */}
      <div style={{background:'#0a0d1a',padding:'8px 12px',borderBottom:'1px solid #1a2642',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <div style={{height:8,width:80,background:'#111',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(pData.hp/pData.maxHp)*100}%`,background:'linear-gradient(90deg,#ef4444,#f97316)',borderRadius:4,transition:'width 0.3s'}}/>
          </div>
          <span style={{color:'#ef4444',fontSize:10,fontWeight:700}}>{pData.hp}/{pData.maxHp}</span>
        </div>
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <div style={{height:8,width:60,background:'#111',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(pData.xp/pData.xpNext)*100}%`,background:'linear-gradient(90deg,#a855f7,#ec4899)',borderRadius:4}}/>
          </div>
          <span style={{color:'#a855f7',fontSize:10,fontWeight:700}}>Lv{pData.level}</span>
        </div>
        <span style={{color:'#fbbf24',fontSize:10,fontWeight:700}}>💰{pData.gold}</span>
        <span style={{color:'#60a5fa',fontSize:10,fontWeight:700}}>{pData.weapon.icon}{pData.weapon.name}</span>
        <span style={{color:'#94a3b8',fontSize:10}}>🏰 Floor {dungeonLevel}</span>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={480} height={400} style={{width:'100%',display:'block'}}/>

      {/* Controls */}
      <div style={{background:'#060a14',borderTop:'1px solid #1a2642',padding:'10px 12px'}}>
        {u.phase==='dead' ? (
          <div style={{textAlign:'center'}}>
            <button onClick={initGame} style={{padding:'10px 28px',borderRadius:10,background:'#ef4444',color:'white',fontWeight:800,border:'none',cursor:'pointer',fontSize:14}}>
              ⚔️ Try Again
            </button>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4,width:120,margin:'0 auto'}}>
            {[
              ['','↑',''],
              ['←','·','→'],
              ['','↓',''],
            ].map((row,ri)=>row.map((btn,ci)=>(
              <button key={`${ri}-${ci}`}
                onPointerDown={()=>{
                  if(btn==='↑') tryMove(0,-1)
                  if(btn==='↓') tryMove(0,1)
                  if(btn==='←') tryMove(-1,0)
                  if(btn==='→') tryMove(1,0)
                }}
                style={{
                  height:36,borderRadius:8,border:'1px solid #1a2642',
                  background:btn&&btn!=='·'?'#0f1629':'transparent',
                  color:'#60a5fa',fontWeight:800,fontSize:16,cursor:btn&&btn!=='·'?'pointer':'default',
                  visibility:btn?'visible':'hidden'
                }}>
                {btn==='·'?'🧙':btn}
              </button>
            )))}
          </div>
        )}
        {u.lootPopup && (
          <div style={{textAlign:'center',marginTop:8,padding:'6px 12px',borderRadius:8,background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.4)',animation:'fadeIn 0.3s ease'}}>
            <span style={{fontSize:18}}>{u.lootPopup.icon}</span>
            <span style={{color:'#fde68a',fontWeight:700,fontSize:12,marginLeft:6}}>Found: {u.lootPopup.name}!</span>
          </div>
        )}
        <p style={{color:'#1e293b',fontSize:9,textAlign:'center',marginTop:6}}>Arrow keys / WASD · Reach the stairs 🔽 to advance</p>
      </div>
    </div>
  )
}
