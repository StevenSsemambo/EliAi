import { useState, useEffect, useRef, useCallback } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ── Audio ─────────────────────────────────────────────────────────────────────

const _ac = { ref: null }
function ac() {
  if (!_ac.ref) try { _ac.ref = new (window.AudioContext || window.webkitAudioContext)() } catch {}
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
const sndStep   = () => beep(80 + Math.random() * 20, 'sine', 0.03, 0.04)
const sndHit    = () => { beep(320, 'sawtooth', 0.07, 0.2); beep(180, 'square', 0.05, 0.12, 0.03) }
const sndHurt   = () => { beep(180, 'sawtooth', 0.18, 0.3); beep(100, 'sawtooth', 0.12, 0.2, 0.04) }
const sndPickup = () => [600, 800, 1000].forEach((f, i) => beep(f, 'sine', 0.09, 0.12, i * 0.05))
const sndDead   = () => [280, 220, 180, 130, 90].forEach((f, i) => beep(f, 'sawtooth', 0.28, 0.28, i * 0.14))
const sndLvlUp  = () => [400, 500, 650, 800, 1000].forEach((f, i) => beep(f, 'triangle', 0.22, 0.28, i * 0.07))
const sndSpell  = () => { beep(600, 'sine', 0.05, 0.3); beep(900, 'sine', 0.12, 0.25, 0.05); beep(1200, 'sine', 0.08, 0.2, 0.1) }
const sndDoor   = () => { beep(380, 'square', 0.09, 0.18); beep(480, 'square', 0.09, 0.18, 0.09) }

// ── Constants ─────────────────────────────────────────────────────────────────

const TILE_SIZE = 32
const VIEW_W = 15
const VIEW_H = 13
const MAP_W  = 40
const MAP_H  = 30

const WALL = 0, FLOOR = 1, DOOR = 2, CHEST = 3, STAIRS = 4, TORCH = 5

// ── Dungeon generator ─────────────────────────────────────────────────────────

function generateDungeon(floor) {
  const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(WALL))
  const rooms = []

  function carveRoom(x, y, w, h) {
    for (let ry = y; ry < y + h; ry++)
      for (let rx = x; rx < x + w; rx++) grid[ry][rx] = FLOOR
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) })
  }
  function carveH(x1, x2, y) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      if (grid[y][x] === WALL) grid[y][x] = FLOOR
  }
  function carveV(x, y1, y2) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      if (grid[y][x] === WALL) grid[y][x] = FLOOR
  }

  const numRooms = Math.min(8 + floor, 20)
  for (let i = 0; i < numRooms * 12 && rooms.length < numRooms; i++) {
    const w = 5 + Math.floor(Math.random() * 6)
    const h = 4 + Math.floor(Math.random() * 4)
    const x = 1 + Math.floor(Math.random() * (MAP_W - w - 2))
    const y = 1 + Math.floor(Math.random() * (MAP_H - h - 2))
    const overlap = rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)
    if (!overlap) carveRoom(x, y, w, h)
  }
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i]
    if (Math.random() < 0.5) { carveH(a.cx, b.cx, a.cy); carveV(b.cx, a.cy, b.cy) }
    else { carveV(a.cx, a.cy, b.cy); carveH(a.cx, b.cx, b.cy) }
  }

  rooms.forEach(r => { if (Math.random() < 0.5 && r.x > 0) grid[r.cy][r.x] = DOOR })

  for (let i = 0; i < 3 + floor; i++) {
    const r = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))]
    const cx = r.x + 1 + Math.floor(Math.random() * (r.w - 2))
    const cy = r.y + 1 + Math.floor(Math.random() * (r.h - 2))
    grid[cy][cx] = CHEST
  }
  for (let i = 0; i < 8 + floor; i++) {
    const r = rooms[Math.floor(Math.random() * rooms.length)]
    grid[r.y][r.cx] = TORCH
  }

  const last = rooms[rooms.length - 1]
  grid[last.cy][last.cx] = STAIRS

  const enemies = []
  const ENEMY_TYPES = ['SLIME', 'GOBLIN', 'SKELETON', 'ORC', 'MAGE', 'TROLL', 'DEMON']
  rooms.slice(1).forEach((r, ri) => {
    const count = 1 + Math.floor(Math.random() * (floor + 1 + ri))
    for (let i = 0; i < count; i++) {
      const typeIdx = Math.min(Math.floor(floor / 2) + Math.floor(Math.random() * 2), ENEMY_TYPES.length - 1)
      enemies.push({
        id: Math.random().toString(36).slice(2),
        type: ENEMY_TYPES[typeIdx],
        x: r.x + 1 + Math.floor(Math.random() * (r.w - 2)),
        y: r.y + 1 + Math.floor(Math.random() * (r.h - 2)),
        hp: 15 + floor * 8 + ri * 4,
        maxHp: 15 + floor * 8 + ri * 4,
        dmg: 4 + floor * 2,
        xp: 8 + floor * 3,
        gold: Math.floor(Math.random() * (4 + floor * 2)),
        moveTimer: 0, moveRate: 0.9 + Math.random() * 0.6,
        alive: true, animTimer: 0, animFrame: 0,
      })
    }
  })

  return { grid, rooms, enemies, start: { x: rooms[0].cx, y: rooms[0].cy } }
}

// ── Data tables ───────────────────────────────────────────────────────────────

const ENEMY_GFX = {
  SLIME:    { icon: '🟢', color: '#22c55e', name: 'Slime'    },
  GOBLIN:   { icon: '👺', color: '#84cc16', name: 'Goblin'   },
  SKELETON: { icon: '💀', color: '#cbd5e1', name: 'Skeleton' },
  ORC:      { icon: '👹', color: '#ef4444', name: 'Orc'      },
  MAGE:     { icon: '🧙', color: '#a855f7', name: 'Dark Mage' },
  TROLL:    { icon: '👾', color: '#f97316', name: 'Troll'    },
  DEMON:    { icon: '😈', color: '#dc2626', name: 'Demon'    },
}

const WEAPONS = [
  { name: 'Rusty Sword',   dmg: 8,  icon: '🗡',  color: '#94a3b8' },
  { name: 'Iron Blade',    dmg: 14, icon: '⚔️',  color: '#60a5fa' },
  { name: 'Fire Staff',    dmg: 20, icon: '🔥',  color: '#f97316' },
  { name: 'Thunder Axe',   dmg: 18, icon: '⚡',  color: '#fbbf24' },
  { name: 'Shadow Dagger', dmg: 12, icon: '🌑',  color: '#a855f7' },
  { name: 'Holy Blade',    dmg: 25, icon: '✨',  color: '#fde68a' },
]

const ARMORS = [
  { name: 'Cloth Robe',   def: 2,  icon: '👕' },
  { name: 'Leather Vest', def: 5,  icon: '🧥' },
  { name: 'Iron Mail',    def: 10, icon: '🛡' },
  { name: 'Dragon Plate', def: 18, icon: '🐉' },
]

const SPELLS = [
  { name: 'Fireball', icon: '🔥', mp: 15, dmg: 35, color: '#f97316', desc: 'Hits nearest visible enemy' },
  { name: 'Freeze',   icon: '❄️', mp: 20, dmg: 25, color: '#67e8f9', desc: 'Hits all enemies within 4 tiles' },
  { name: 'Heal',     icon: '💚', mp: 25, heal: 40, color: '#4ade80', desc: 'Restores 40+ HP' },
]

function getRandomLoot(floor) {
  const r = Math.random()
  if (r < 0.4) {
    const idx = Math.min(Math.floor(Math.random() * (floor + 1)), WEAPONS.length - 1)
    return { type: 'weapon', ...WEAPONS[idx] }
  } else if (r < 0.6) {
    const idx = Math.min(Math.floor(Math.random() * (floor + 1)), ARMORS.length - 1)
    return { type: 'armor', ...ARMORS[idx] }
  } else if (r < 0.85) {
    return { type: 'potion', name: 'Health Potion', heal: 30 + floor * 10, icon: '🧪' }
  } else {
    return { type: 'spell', ...SPELLS[Math.floor(Math.random() * SPELLS.length)] }
  }
}

// ── Fog of war ────────────────────────────────────────────────────────────────

function computeFog(px, py, radius = 5) {
  const fog = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0))
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue
      const tx = px + dx, ty = py + dy
      if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) continue
      fog[ty][tx] = 1
    }
  }
  return fog
}

// ── Canvas drawing helpers ────────────────────────────────────────────────────

const T = TILE_SIZE

function drawTile(ctx, x, y, tile, lit) {
  if (tile === WALL) {
    ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, T, T)
    ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2)
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, T / 2, T / 2)
  } else if (tile === FLOOR) {
    ctx.fillStyle = '#1a0f0a'; ctx.fillRect(x, y, T, T)
    ctx.fillStyle = '#211510'
    ctx.fillRect(x + 4, y + 4, 2, 2)
    ctx.fillRect(x + T - 8, y + T - 8, 2, 2)
  } else if (tile === DOOR) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(x, y, T, T)
    ctx.font = `${T * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🚪', x + T / 2, y + T / 2)
  } else if (tile === CHEST) {
    ctx.fillStyle = '#1a0f0a'; ctx.fillRect(x, y, T, T)
    if (lit) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10 }
    ctx.font = `${T * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('📦', x + T / 2, y + T / 2); ctx.shadowBlur = 0
  } else if (tile === STAIRS) {
    ctx.fillStyle = '#1a0f0a'; ctx.fillRect(x, y, T, T)
    if (lit) { ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14 }
    ctx.font = `${T * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🔽', x + T / 2, y + T / 2); ctx.shadowBlur = 0
  } else if (tile === TORCH) {
    ctx.fillStyle = '#1a0f0a'; ctx.fillRect(x, y, T, T)
    if (lit) { ctx.shadowColor = '#f97316'; ctx.shadowBlur = 18 }
    ctx.font = `${T * 0.7}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🕯', x + T / 2, y + T / 2); ctx.shadowBlur = 0
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DungeonCrawler({ game, levelData, studentId, onFinish }) {
  const startFloor = levelData?.level ?? 1

  const canvasRef   = useRef(null)
  const minimapRef  = useRef(null)
  const stateRef    = useRef(null)
  const rafRef      = useRef(null)
  const keysRef     = useRef({})
  const lastRef     = useRef(null)
  const moveRef     = useRef(0)
  const lootTimerRef = useRef(null)
  const msgTimerRef  = useRef(null)

  const [ui, setUi] = useState(null)

  // ── Init ───────────────────────────────────────────────────────────────────

  function makePlayer() {
    return {
      x: 0, y: 0,
      hp: 80, maxHp: 80,
      mp: 40, maxMp: 40,
      atk: 10, def: 2,
      xp: 0, xpNext: 50,
      level: 1,
      gold: 20, totalGold: 20, kills: 0,
      weapon: WEAPONS[0],
      armor: ARMORS[0],
      spells: [SPELLS[0]],
      facing: 's',
      hitFlash: 0, attackAnim: 0,
      animFrame: 0, animTimer: 0,
    }
  }

  function loadFloor(floor, existingPlayer) {
    const dungeon = generateDungeon(floor)
    const player = existingPlayer ?? makePlayer()
    player.x = dungeon.start.x
    player.y = dungeon.start.y

    const fog = computeFog(player.x, player.y)
    const seen = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false))
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++)
        if (fog[y][x]) seen[y][x] = true

    stateRef.current = {
      floor, dungeon, player, fog, seen,
      particles: [], floats: [],
      phase: 'playing',
      totalScore: stateRef.current?.totalScore ?? 0,
      lootMsg: null,
    }
    refreshUi()
    setMsg(`Floor ${floor} — ${dungeon.enemies.length} enemies lurk in the dark`)
  }

  function initRun() {
    stateRef.current = null
    loadFloor(startFloor, null)
  }

  // ── Fog update ─────────────────────────────────────────────────────────────

  function updateFog() {
    const s = stateRef.current
    if (!s) return
    const { player, seen } = s
    const fog = computeFog(player.x, player.y)
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++)
        if (fog[y][x]) seen[y][x] = true
    s.fog = fog
  }

  // ── Move / interact ────────────────────────────────────────────────────────

  function tryMove(dx, dy) {
    const s = stateRef.current
    if (!s || s.phase !== 'playing') return
    const { player: p, dungeon } = s
    const nx = p.x + dx, ny = p.y + dy
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return
    const tile = dungeon.grid[ny][nx]
    if (tile === WALL) return

    // Attack enemy
    const ei = dungeon.enemies.findIndex(e => e.alive && e.x === nx && e.y === ny)
    if (ei >= 0) {
      const e = dungeon.enemies[ei]
      const dmg = Math.max(1, p.atk + p.weapon.dmg - Math.floor(Math.random() * 4))
      e.hp -= dmg
      sndHit()
      addFloat(nx, ny, `-${dmg}`, '#ef4444')
      p.attackAnim = 0.15
      p.facing = dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n'
      if (e.hp <= 0) {
        e.alive = false
        p.xp += e.xp; p.gold += e.gold; p.totalGold += e.gold; p.kills++
        sndPickup()
        addFloat(nx, ny, `+${e.xp}xp`, '#fbbf24')
        spawnParticles(nx * T + T / 2, ny * T + T / 2, ENEMY_GFX[e.type].color, 16, 4)
        checkLevelUp()
      }
      refreshUi()
      return
    }

    if (tile === DOOR) { sndDoor(); dungeon.grid[ny][nx] = FLOOR }
    if (tile === CHEST) {
      dungeon.grid[ny][nx] = FLOOR
      const loot = getRandomLoot(s.floor)
      sndPickup()
      applyLoot(loot)
      showLoot(`${loot.icon || loot.e || ''} ${loot.name || loot.n}`)
    }
    if (tile === STAIRS) {
      sndLvlUp()
      const floorScore = s.floor * 50 + p.kills * 10 + p.gold
      s.totalScore = (s.totalScore ?? 0) + floorScore
      setMsg(`⬇ Descending to Floor ${s.floor + 1}…`)
      const nextFloor = s.floor + 1
      setTimeout(() => loadFloor(nextFloor, p), 400)
      return
    }

    p.x = nx; p.y = ny
    p.facing = dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n'
    sndStep()
    updateFog()
    refreshUi()
  }

  // ── Spell casting ──────────────────────────────────────────────────────────

  function castSpell(spellIdx) {
    const s = stateRef.current
    if (!s || s.phase !== 'playing') return
    const p = s.player
    const spell = p.spells[spellIdx]
    if (!spell || p.mp < spell.mp) { setMsg('Not enough MP!'); return }
    p.mp = Math.max(0, p.mp - spell.mp)
    sndSpell()

    if (spell.name === 'Fireball') {
      let best = null, bd = 99
      for (const e of s.dungeon.enemies) {
        if (!e.alive || !s.fog[e.y]?.[e.x]) continue
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y)
        if (d < bd) { bd = d; best = e }
      }
      if (best) {
        const dmg = spell.dmg + p.atk
        best.hp -= dmg
        addFloat(best.x, best.y, `🔥-${dmg}`, '#f97316')
        spawnParticles(best.x * T + T / 2, best.y * T + T / 2, '#f97316', 24, 5)
        if (best.hp <= 0) { best.alive = false; p.xp += best.xp; p.kills++; checkLevelUp() }
        setMsg(`🔥 Fireball hits ${ENEMY_GFX[best.type].name} for ${dmg} damage!`)
      } else setMsg('No visible enemies to target.')
    } else if (spell.name === 'Freeze') {
      let hit = 0
      for (const e of s.dungeon.enemies) {
        if (!e.alive) continue
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y)
        if (d > 4) continue
        const dmg = Math.floor(spell.dmg * (0.7 + Math.random() * 0.6))
        e.hp -= dmg; hit++
        addFloat(e.x, e.y, `❄-${dmg}`, '#67e8f9')
        spawnParticles(e.x * T + T / 2, e.y * T + T / 2, '#67e8f9', 12, 3)
        if (e.hp <= 0) { e.alive = false; p.xp += e.xp; p.kills++; checkLevelUp() }
      }
      setMsg(hit ? `❄️ Freeze hits ${hit} enemies!` : 'No enemies nearby.')
    } else if (spell.name === 'Heal') {
      const h = spell.heal ?? 40
      p.hp = Math.min(p.maxHp, p.hp + h)
      addFloat(p.x, p.y, `+${h}HP`, '#4ade80')
      spawnParticles(p.x * T + T / 2, p.y * T + T / 2, '#4ade80', 16, 3)
      setMsg(`💚 Healed for ${h} HP!`)
    }
    refreshUi()
  }

  // ── Level up ───────────────────────────────────────────────────────────────

  function checkLevelUp() {
    const p = stateRef.current?.player
    if (!p) return
    while (p.xp >= p.xpNext) {
      p.level++
      p.xp -= p.xpNext
      p.xpNext = Math.round(p.xpNext * 1.6)
      p.maxHp += 12; p.hp = Math.min(p.hp + 20, p.maxHp)
      p.maxMp += 8;  p.mp = Math.min(p.mp + 15, p.maxMp)
      p.atk += 2
      sndLvlUp()
      addFloat(p.x, p.y, '⬆ LEVEL UP!', '#a855f7')
      setMsg(`⬆ Level ${p.level}! HP +12 · MP +8 · ATK +2`)
      // Unlock spells at level milestones
      if (p.level === 3 && !p.spells.find(s => s.name === 'Freeze')) p.spells.push(SPELLS[1])
      if (p.level === 6 && !p.spells.find(s => s.name === 'Heal'))   p.spells.push(SPELLS[2])
    }
  }

  // ── Loot ──────────────────────────────────────────────────────────────────

  function applyLoot(loot) {
    const p = stateRef.current?.player
    if (!p) return
    if (loot.type === 'weapon') p.weapon = loot
    else if (loot.type === 'armor') { p.armor = loot; p.def = loot.def }
    else if (loot.type === 'potion') p.hp = Math.min(p.maxHp, p.hp + (loot.heal ?? 30))
    else if (loot.type === 'spell' && !p.spells.find(s => s.name === (loot.name ?? loot.n))) {
      p.spells.push(loot)
    }
    refreshUi()
  }

  // ── Particles / floats ─────────────────────────────────────────────────────

  function addFloat(tx, ty, text, color) {
    stateRef.current?.floats.push({ x: tx * T + T / 2, y: ty * T, text, color, life: 1, vy: -1.2 })
  }

  function spawnParticles(x, y, color, count = 12, spd = 3) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count
      stateRef.current?.particles.push({
        x, y,
        vx: Math.cos(a) * spd * (0.5 + Math.random()),
        vy: Math.sin(a) * spd * (0.5 + Math.random()),
        color, life: 1,
        decay: 0.04 + Math.random() * 0.03,
        size: 2 + Math.random() * 3,
      })
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  function showLoot(txt) {
    clearTimeout(lootTimerRef.current)
    const s = stateRef.current
    if (s) s.lootMsg = txt
    refreshUi()
    lootTimerRef.current = setTimeout(() => {
      if (stateRef.current) stateRef.current.lootMsg = null
      refreshUi()
    }, 2200)
  }

  function setMsg(text) {
    clearTimeout(msgTimerRef.current)
    const s = stateRef.current
    if (s) s.message = text
    refreshUi()
    msgTimerRef.current = setTimeout(() => {
      if (stateRef.current) stateRef.current.message = ''
      refreshUi()
    }, 4000)
  }

  function refreshUi() {
    const s = stateRef.current
    if (!s) return
    setUi({
      player: { ...s.player, spells: [...s.player.spells] },
      phase: s.phase,
      floor: s.floor,
      totalScore: s.totalScore ?? 0,
      lootMsg: s.lootMsg,
      message: s.message ?? '',
    })
  }

  // ── Enemy AI ───────────────────────────────────────────────────────────────

  function updateEnemies(dt) {
    const s = stateRef.current
    if (!s || s.phase !== 'playing') return
    const { player: p, dungeon } = s

    // Occupancy set prevents stacking — built fresh each frame
    const occ = new Set()
    dungeon.enemies.forEach(e => { if (e.alive) occ.add(`${e.x},${e.y}`) })

    for (const e of dungeon.enemies) {
      if (!e.alive) continue
      e.animTimer = (e.animTimer ?? 0) + dt
      if (e.animTimer > 0.35) { e.animFrame = (e.animFrame + 1) % 2; e.animTimer = 0 }
      e.moveTimer += dt
      if (e.moveTimer < e.moveRate) continue
      e.moveTimer = 0

      const dx = p.x - e.x, dy = p.y - e.y
      const dist = Math.abs(dx) + Math.abs(dy)
      if (dist > 9) continue

      if (dist === 1) {
        const dmg = Math.max(1, e.dmg - p.def - (p.armor?.def ?? 0) + Math.floor(Math.random() * 3))
        p.hp -= dmg; p.hitFlash = 0.3; sndHurt()
        addFloat(p.x, p.y, `-${dmg}`, '#ef4444')
        if (p.hp <= 0) {
          p.hp = 0; s.phase = 'dead'; sndDead()
          // Save score on death
          const finalScore = (s.totalScore ?? 0) + s.floor * 20 + p.kills * 5
          if (studentId) saveGameScore(studentId, game?.id, levelData?.level, finalScore)
          refreshUi()
        } else refreshUi()
        continue
      }

      const moves = Math.abs(dx) > Math.abs(dy)
        ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
        : [[0, Math.sign(dy)], [Math.sign(dx), 0]]

      for (const [mx, my] of moves) {
        const nx = e.x + mx, ny = e.y + my
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue
        if (dungeon.grid[ny][nx] === WALL) continue
        const key = `${nx},${ny}`
        // Don't move onto another enemy's tile (prevents stacking)
        if (occ.has(key) && !(nx === p.x && ny === p.y)) continue
        occ.delete(`${e.x},${e.y}`)
        e.x = nx; e.y = ny
        occ.add(key)
        break
      }
    }
  }

  // ── Canvas draw ────────────────────────────────────────────────────────────

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = stateRef.current
    if (!s) return
    const ctx = canvas.getContext('2d')
    const p = s.player
    const cw = canvas.width, ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    // Scale to fit
    const scale = cw / (VIEW_W * T)
    ctx.save()
    ctx.scale(scale, scale)
    const camX = p.x * T - (VIEW_W * T) / 2 + T / 2
    const camY = p.y * T - (VIEW_H * T) / 2 + T / 2
    ctx.translate(-camX, -camY)

    const sc = Math.max(0, Math.floor(camX / T) - 1)
    const ec = Math.min(MAP_W, sc + VIEW_W + 2)
    const sr = Math.max(0, Math.floor(camY / T) - 1)
    const er = Math.min(MAP_H, sr + VIEW_H + 2)

    // Tiles
    for (let row = sr; row < er; row++) {
      for (let col = sc; col < ec; col++) {
        const vis = s.fog[row]?.[col]
        const seen = s.seen[row]?.[col]
        if (!vis && !seen) continue
        ctx.save()
        if (!vis) ctx.globalAlpha = 0.32
        drawTile(ctx, col * T, row * T, s.dungeon.grid[row][col], !!vis)
        ctx.restore()
      }
    }

    // Enemies
    for (const e of s.dungeon.enemies) {
      if (!e.alive || !s.fog[e.y]?.[e.x]) continue
      const gfx = ENEMY_GFX[e.type]
      const ex = e.x * T, ey = e.y * T
      const bob = Math.sin(Date.now() * 0.004 + e.x) * 1.5
      ctx.save()
      ctx.shadowColor = gfx.color; ctx.shadowBlur = 8
      ctx.font = `${T * 0.85}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(gfx.icon, ex + T / 2, ey + T / 2 + bob)
      // HP bar
      const bw = T * 0.88, bh = 3, bx = ex + T * 0.06, by = ey + 1
      ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh)
      ctx.fillStyle = gfx.color; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh)
      ctx.restore()
    }

    // Player attack flash
    if (p.attackAnim > 0) {
      ctx.save(); ctx.globalAlpha = (p.attackAnim / 0.15) * 0.5; ctx.fillStyle = '#fbbf24'
      const ax = p.x * T + (p.facing === 'e' ? T : p.facing === 'w' ? -T : 0)
      const ay = p.y * T + (p.facing === 's' ? T : p.facing === 'n' ? -T : 0)
      ctx.fillRect(ax + 3, ay + 3, T - 6, T - 6); ctx.restore()
    }

    // Player
    const px = p.x * T, py = p.y * T
    const bob = Math.sin(Date.now() * 0.005) * 1.5
    ctx.save()
    if (p.hitFlash > 0) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.06) * 0.5
    ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 14
    ctx.font = `${T * 0.95}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🧙‍♂️', px + T / 2, py + T / 2 + bob)
    ctx.restore()

    // Floating texts
    for (const ft of s.floats) {
      ctx.save(); ctx.globalAlpha = ft.life; ctx.fillStyle = ft.color
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y); ctx.restore()
    }

    // Particles
    for (const pt of s.particles) {
      ctx.save(); ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color
      ctx.shadowColor = pt.color; ctx.shadowBlur = 5
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    ctx.restore()

    // Minimap
    drawMinimap()
  }, [])

  function drawMinimap() {
    const mm = minimapRef.current
    if (!mm || !stateRef.current) return
    const s = stateRef.current
    const mctx = mm.getContext('2d')
    const mw = mm.width, mh = mm.height
    const sx = mw / MAP_W, sy = mh / MAP_H
    mctx.fillStyle = 'rgba(5,8,16,0.9)'; mctx.fillRect(0, 0, mw, mh)
    for (let row = 0; row < MAP_H; row++) {
      for (let col = 0; col < MAP_W; col++) {
        if (!s.seen[row]?.[col]) continue
        const t = s.dungeon.grid[row][col]
        mctx.fillStyle = t === WALL ? '#1e293b' : t === STAIRS ? '#a855f7' : t === CHEST ? '#fbbf24' : t === FLOOR ? '#334155' : '#475569'
        mctx.fillRect(col * sx, row * sy, Math.max(1, sx - 0.2), Math.max(1, sy - 0.2))
      }
    }
    for (const e of s.dungeon.enemies) {
      if (!e.alive || !s.fog[e.y]?.[e.x]) continue
      mctx.fillStyle = ENEMY_GFX[e.type].color
      mctx.fillRect(e.x * sx - 1, e.y * sy - 1, 3, 3)
    }
    const p = s.player
    mctx.fillStyle = '#60a5fa'
    mctx.fillRect(p.x * sx - 1.5, p.y * sy - 1.5, 4, 4)
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  useEffect(() => {
    initRun()
    lastRef.current = performance.now()

    function loop(now) {
      const dt = Math.min((now - (lastRef.current ?? now)) / 1000, 0.05)
      lastRef.current = now
      const s = stateRef.current
      if (s && s.phase === 'playing') {
        const p = s.player
        p.animTimer = (p.animTimer ?? 0) + dt
        if (p.animTimer > 0.2) { p.animFrame = (p.animFrame + 1) % 2; p.animTimer = 0 }
        if (p.hitFlash > 0) p.hitFlash -= dt
        if (p.attackAnim > 0) p.attackAnim -= dt
        // MP regeneration
        if (p.mp < p.maxMp) { p.mp = Math.min(p.maxMp, p.mp + dt * 1.5) }
        // Keyboard movement
        moveRef.current += dt
        if (moveRef.current >= 0.16) {
          const k = keysRef.current
          if (k['ArrowLeft']  || k['a']) { tryMove(-1,  0); moveRef.current = 0 }
          else if (k['ArrowRight'] || k['d']) { tryMove(1,  0); moveRef.current = 0 }
          else if (k['ArrowUp']   || k['w']) { tryMove(0, -1); moveRef.current = 0 }
          else if (k['ArrowDown'] || k['s']) { tryMove(0,  1); moveRef.current = 0 }
        }
        updateEnemies(dt)
        // Floats
        for (let i = s.floats.length - 1; i >= 0; i--) {
          const f = s.floats[i]; f.y += f.vy; f.life -= 0.022
          if (f.life <= 0) s.floats.splice(i, 1)
        }
        // Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i]
          pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.91; pt.vy *= 0.91; pt.life -= pt.decay
          if (pt.life <= 0) s.particles.splice(i, 1)
        }
      }
      drawFrame()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    const onKey = e => {
      keysRef.current[e.key] = e.type === 'keydown'
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      clearTimeout(lootTimerRef.current)
      clearTimeout(msgTimerRef.current)
    }
  }, [])

  // ── Resize canvas on mount ─────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const resize = () => {
      cv.width = cv.offsetWidth || 360
      cv.height = Math.round(cv.width * (VIEW_H / VIEW_W))
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── D-pad handlers ─────────────────────────────────────────────────────────

  function dpad(dx, dy) {
    ac() // unlock audio on first interaction
    tryMove(dx, dy)
  }

  const u = ui
  if (!u) {
    return (
      <div style={{ background: '#050810', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#475569', fontFamily: 'monospace' }}>Loading dungeon…</span>
      </div>
    )
  }

  const p = u.player
  const hpPct  = Math.max(0, (p.hp / p.maxHp) * 100)
  const mpPct  = Math.max(0, (p.mp / p.maxMp) * 100)
  const xpPct  = Math.max(0, (p.xp / p.xpNext) * 100)

  return (
    <div style={{ fontFamily: 'monospace', background: '#050810', borderRadius: 16, overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* HUD */}
      <div style={{ background: '#07090f', padding: '8px 10px', borderBottom: '1px solid #1a2642', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <BarGroup label="❤ HP" pct={hpPct} fill="linear-gradient(90deg,#ef4444,#f97316)" width={80} />
        <BarGroup label="✨ MP" pct={mpPct} fill="linear-gradient(90deg,#6366f1,#a855f7)" width={60} />
        <BarGroup label="⚡ XP" pct={xpPct} fill="linear-gradient(90deg,#fbbf24,#f59e0b)" width={60} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <Badge color="#818cf8" bg="#6366f120" border="#6366f144">Lv{p.level}</Badge>
          <Badge color="#fbbf24" bg="#fbbf2420" border="#fbbf2444">💰{p.gold}</Badge>
          <Badge color="#67e8f9" bg="#06b6d420" border="#06b6d444">🏰F{u.floor}</Badge>
          <Badge color="#94a3b8" bg="#1a2642" border="#1e2d4a">
            {p.weapon.icon || '🗡'} {p.weapon.name?.split(' ')[0]}
          </Badge>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', background: '#050810', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block', imageRendering: 'pixelated' }} />
        {/* Minimap */}
        <div style={{ position: 'absolute', top: 6, right: 6, opacity: 0.88 }}>
          <canvas ref={minimapRef} width={80} height={60} style={{ border: '1px solid #1a2642', borderRadius: 3, display: 'block' }} />
        </div>
        {/* Loot popup */}
        {u.lootMsg && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: '#07090f', border: '1px solid #fbbf2466', borderRadius: 8,
            padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#fde68a',
            whiteSpace: 'nowrap', animation: 'fadeIn .25s ease',
          }}>
            ✨ {u.lootMsg}
          </div>
        )}
        {/* Death overlay */}
        {u.phase === 'dead' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(3,5,12,.94)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>💀</div>
            <div style={{ color: '#ef4444', fontSize: 22, fontWeight: 900, marginBottom: 6, textShadow: '0 0 20px #ef4444' }}>
              YOU DIED
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 20, textAlign: 'center', lineHeight: 1.7 }}>
              Floor {u.floor} · Level {p.level}<br />
              Enemies slain: {p.kills} · Gold: {p.gold}<br />
              Score: {u.totalScore + u.floor * 20}
            </div>
            <button onClick={initRun} style={{ padding: '10px 24px', borderRadius: 10, background: '#ef4444', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14 }}>
              ⚔️ Start New Run
            </button>
          </div>
        )}
      </div>

      {/* Message bar */}
      <div style={{ background: '#07090f', borderTop: '1px solid #1a2642', minHeight: 24, padding: '4px 10px', fontSize: 10, color: '#64748b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {u.message || 'Use arrow keys / d-pad to move. Reach 🔽 stairs to descend.'}
      </div>

      {/* Controls */}
      <div style={{ background: '#060a14', borderTop: '1px solid #1a2642', padding: '8px 10px' }}>
        {/* D-pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,38px)', gap: 3, margin: '0 auto', width: 'fit-content' }}>
          {[['', null], ['↑', [0,-1]], [''],
            ['←', [-1,0]], ['🧙', null], ['→', [1,0]],
            ['', null], ['↓', [0,1]], ['']
          ].map(([label, move], i) => (
            <button
              key={i}
              onPointerDown={move ? () => dpad(...move) : undefined}
              style={{
                height: 38, width: 38, borderRadius: 8,
                border: '1px solid #1a2642',
                background: label && label !== '🧙' ? '#0d1526' : 'transparent',
                color: '#60a5fa', fontWeight: 800, fontSize: label === '🧙' ? 18 : 15,
                cursor: move ? 'pointer' : 'default',
                visibility: label ? 'visible' : 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Spell bar */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          {p.spells.map((spell, i) => (
            <button
              key={spell.name}
              onClick={() => { ac(); castSpell(i) }}
              style={{
                padding: '4px 8px', borderRadius: 6,
                border: `1px solid ${spell.color ?? '#818cf8'}44`,
                background: `${spell.color ?? '#818cf8'}11`,
                color: spell.color ?? '#818cf8',
                fontSize: 10, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3,
                opacity: p.mp >= spell.mp ? 1 : 0.4,
              }}
            >
              {spell.icon} {spell.name}
              <span style={{ color: '#475569', fontSize: 9 }}>{spell.mp}MP</span>
            </button>
          ))}
        </div>

        <p style={{ color: '#1e293b', fontSize: 9, textAlign: 'center', marginTop: 6 }}>
          Arrow keys / WASD to move · Bump enemies to attack · 🔽 stairs to go deeper
        </p>
      </div>
    </div>
  )
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function BarGroup({ label, pct, fill, width }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: width }}>
      <div style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ height: 6, background: '#0d1526', borderRadius: 3, overflow: 'hidden', width }}>
        <div style={{ height: '100%', width: `${pct}%`, background: fill, borderRadius: 3, transition: 'width 0.25s' }} />
      </div>
    </div>
  )
}

function Badge({ children, color, bg, border }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      color, background: bg, border: `1px solid ${border}`,
    }}>
      {children}
    </span>
  )
}
