import { useState, useEffect, useRef } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ─────────────────────────────────────────────────────────────────
//  AUDIO
// ─────────────────────────────────────────────────────────────────
let _sharedAC = null
function AC() {
  if (!_sharedAC || _sharedAC.state === 'closed') {
    try { _sharedAC = new (window.AudioContext || window.webkitAudioContext)() } catch {}
  }
  if (_sharedAC?.state === 'suspended') _sharedAC.resume()
  return _sharedAC
}
function playTone(freq, type, dur, vol = 0.2, delay = 0) {
  try {
    const a = AC(); if (!a) return
    const o = a.createOscillator(), g = a.createGain()
    o.connect(g); g.connect(a.destination)
    o.type = type; o.frequency.value = freq
    const t = a.currentTime + delay
    g.gain.setValueAtTime(0.001, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.start(t); o.stop(t + dur + 0.05)
  } catch {}
}
function playNoise(vol, dur, cutoff = 500, delay = 0) {
  try {
    const a = AC(); if (!a) return
    const len = Math.ceil(a.sampleRate * Math.min(dur, 1))
    const buf = a.createBuffer(1, len, a.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = cutoff
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(a.destination)
    const t = a.currentTime + delay
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.start(t); src.stop(t + dur + 0.1)
  } catch {}
}

const SFX = {
  punch:   () => { playNoise(0.4, 0.05, 600); playTone(200, 'sawtooth', 0.07, 0.2, 0.02) },
  kick:    () => { playNoise(0.55, 0.09, 350); playTone(120, 'sawtooth', 0.10, 0.3, 0.02) },
  block:   () => { playTone(880, 'square', 0.04, 0.25); playTone(600, 'square', 0.035, 0.18, 0.03) },
  hurt:    () => { playNoise(0.35, 0.12, 450); playTone(150, 'sawtooth', 0.12, 0.22, 0.04) },
  whoosh:  () => playNoise(0.12, 0.13, 1600),
  special: () => { [200, 320, 480, 720, 1040].forEach((f, i) => playTone(f, 'sine', 0.3, 0.2, i * 0.05)) },
  ko:      () => { [320, 260, 200, 150, 100].forEach((f, i) => playTone(f, 'sawtooth', 0.5, 0.35, i * 0.24)) },
  victory: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 'triangle', 0.32, 0.24, i * 0.14)) },
  level_up:() => { [400, 550, 700, 900].forEach((f, i) => playTone(f, 'sine', 0.2, 0.25, i * 0.06)) },
  counter: () => { playTone(1000, 'square', 0.05, 0.3); playTone(600, 'sine', 0.1, 0.2, 0.04) },
}

let _musicId = -1
function startBGMusic(theme) {
  stopBGMusic()
  try {
    const a = AC(); if (!a) return
    const bpm = [88, 120, 70, 100][theme] ?? 88
    const beat = 60 / bpm
    if (theme === 0) {
      _musicId = setInterval(() => {
        try {
          playNoise(0.3, 0.07, 120); playTone(60, 'sine', 0.18, 0.25)
          playNoise(0.18, 0.055, 800, beat); playNoise(0.18, 0.055, 800, beat * 3)
          ;[294, 349, 392, 440, 523].forEach((f, i) => playTone(f, 'triangle', 0.45, 0.05, i * beat * 0.5))
        } catch {}
      }, Math.round(beat * 4 * 1000))
    } else if (theme === 1) {
      _musicId = setInterval(() => {
        try {
          for (let i = 0; i < 8; i++) { playNoise(0.18, 0.04, 300, i * beat * 0.5); if (i % 2 === 0) playTone(80, 'sine', 0.14, 0.18, i * beat * 0.5) }
          ;[330, 392, 440, 494, 392, 330, 294, 330].forEach((f, i) => playTone(f, 'square', 0.38, 0.025, i * beat * 0.5))
        } catch {}
      }, Math.round(beat * 4 * 1000))
    } else {
      _musicId = setInterval(() => {
        try {
          ;[174, 220, 261].forEach((f, i) => playTone(f, 'sine', beat * 3.8, 0.035, i * beat * 1.2))
          playNoise(0.055, beat * 4, 400)
        } catch {}
      }, Math.round(beat * 4 * 1000))
    }
  } catch {}
}
function stopBGMusic() {
  if (_musicId !== -1) { clearInterval(_musicId); _musicId = -1 }
}

// ─────────────────────────────────────────────────────────────────
//  CANVAS CONSTANTS & SKELETON
// ─────────────────────────────────────────────────────────────────
const CW = 480, CH = 340, FLOOR = CH - 50
const J = { HIP:0,SPINE:1,CHEST:2,NECK:3,HEAD:4,LS:5,LE:6,LH:7,RS:8,RE:9,RH:10,LHip:11,LK:12,LF:13,RHip:14,RK:15,RF:16 }
const NJ = 17
const BONES = [
  [0,1,5.5],[1,2,5],[2,3,4.5],[3,4,4],
  [2,5,4],[5,6,3.8],[6,7,3.2],
  [2,8,4],[8,9,3.8],[9,10,3.2],
  [0,11,4.5],[11,12,4.8],[12,13,4.2],
  [0,14,4.5],[14,15,4.8],[15,16,4.2],
]

function P(a) {
  const p = []
  for (let i = 0; i < NJ; i++) p.push({ x: a[i * 2], y: a[i * 2 + 1] })
  return p
}

const POSES = {
  idle:      P([0,0,0,20,0,42,1,56,3,70,-20,40,-35,26,-33,10,20,40,33,26,31,10,-11,-2,-17,-30,-18,-57,11,-2,17,-30,18,-57]),
  walk_a:    P([0,3,0,23,1,45,2,59,4,73,-18,41,-36,30,-44,16,21,41,28,27,20,13,-13,-2,-28,-22,-42,-52,13,-2,9,-32,7,-58]),
  walk_b:    P([0,3,0,23,-1,45,-2,59,-4,73,-21,41,-28,27,-20,13,18,41,36,30,44,16,-13,-2,-9,-32,-7,-58,13,-2,28,-22,42,-52]),
  pRw:       P([-4,0,-3,20,-2,42,-1,56,1,70,-21,40,-38,28,-40,14,18,40,12,56,6,66,-11,-2,-15,-30,-16,-56,11,-2,15,-30,16,-56]),
  pRe:       P([6,0,6,20,7,42,8,55,9,69,-17,40,-24,28,-20,14,22,43,44,46,66,48,-11,-2,-14,-30,-15,-56,11,-2,14,-30,15,-56]),
  pLw:       P([4,0,3,20,2,42,1,56,-1,70,-18,40,-12,56,-6,66,21,40,38,28,40,14,-11,-2,-15,-30,-16,-56,11,-2,15,-30,16,-56]),
  pLe:       P([-6,0,-6,20,-7,42,-8,55,-9,69,-22,43,-44,46,-66,48,17,40,24,28,20,14,-11,-2,-14,-30,-15,-56,11,-2,14,-30,15,-56]),
  kRw:       P([-4,0,-3,20,-2,42,-1,56,-1,70,-21,40,-40,28,-54,14,20,40,30,30,24,18,-13,-2,-15,-30,-14,-57,11,-2,14,-14,16,-6]),
  kRe:       P([8,0,8,19,9,41,10,55,11,69,-18,39,-24,52,-20,64,22,40,26,30,22,18,-13,-2,-14,-30,-13,-57,11,-2,38,-14,64,-10]),
  upw:       P([0,-8,0,12,0,32,1,45,2,58,-18,30,-32,16,-34,2,18,30,16,12,10,-2,-13,-14,-20,-40,-24,-66,13,-14,18,-38,16,-64]),
  upe:       P([6,-12,6,10,7,34,8,50,10,66,-16,32,-10,46,-8,58,24,40,32,60,28,78,-13,-14,-16,-40,-18,-66,13,-14,14,-38,12,-64]),
  block:     P([-2,0,-2,20,-2,40,-1,54,0,67,-21,38,-11,52,1,64,19,38,9,52,-3,64,-13,-2,-17,-32,-19,-59,13,-2,17,-32,19,-59]),
  hurt:      P([-11,0,-10,18,-9,38,-11,52,-14,65,-27,36,-46,22,-58,10,11,36,20,20,18,6,-11,-2,-13,-28,-12,-54,11,-2,17,-26,20,-52]),
  down:      P([0,-9,-22,-15,-44,-18,-59,-16,-71,-12,-32,-8,-46,4,-56,16,-29,-26,-21,-18,-15,-8,-7,-7,2,9,14,26,8,-7,22,5,38,18]),
  getup:     P([-4,-4,-2,16,0,36,1,50,2,64,-19,34,-32,20,-30,6,17,34,25,20,21,6,-13,-4,-20,-28,-22,-54,10,-4,8,-24,6,-50]),
  spCh:      P([0,0,0,22,0,46,0,61,0,76,-25,46,-46,60,-40,74,25,46,46,60,40,74,-13,-2,-20,-32,-24,-59,13,-2,20,-32,24,-59]),
  spRe:      P([10,0,10,21,11,44,12,58,13,72,-12,44,14,46,36,48,26,46,48,48,68,48,-13,-2,-17,-32,-20,-59,11,-2,12,-32,10,-59]),
  victory:   P([0,4,0,24,0,46,0,60,0,74,-22,44,-44,56,-42,70,22,44,40,62,36,78,-12,-2,-16,-30,-18,-57,12,-2,16,-30,18,-57]),
  // NEW: counter-attack pose
  counter_w: P([4,2,3,22,2,44,1,58,0,72,-18,42,-28,30,-22,16,22,42,40,30,46,16,-13,-2,-18,-32,-20,-58,11,-2,14,-14,18,-4]),
  counter_e: P([8,4,7,24,6,46,5,60,4,74,-14,44,-8,58,2,68,28,44,50,46,72,46,-13,-2,-16,-32,-18,-58,11,-2,36,-12,62,-8]),
}

const ANIMS = {
  idle:      [{ f: 'idle',      t: 'idle',      d: 0.5 }],
  walk:      [{ f: 'walk_a',    t: 'walk_b',    d: 0.15 }, { f: 'walk_b', t: 'walk_a', d: 0.15 }],
  punch_R:   [{ f: 'pRw',       t: 'pRe',       d: 0.07, hit: true }, { f: 'pRe', t: 'idle', d: 0.10 }, { f: 'idle', t: 'idle', d: 0.06 }],
  punch_L:   [{ f: 'pLw',       t: 'pLe',       d: 0.07, hit: true }, { f: 'pLe', t: 'idle', d: 0.10 }, { f: 'idle', t: 'idle', d: 0.06 }],
  kick_R:    [{ f: 'kRw',       t: 'kRe',       d: 0.09, hit: true }, { f: 'kRe', t: 'idle', d: 0.14 }, { f: 'idle', t: 'idle', d: 0.08 }],
  uppercut:  [{ f: 'upw',       t: 'upe',       d: 0.08, hit: true }, { f: 'upe', t: 'idle', d: 0.16 }, { f: 'idle', t: 'idle', d: 0.09 }],
  block:     [{ f: 'block',     t: 'block',     d: 0.5 }],
  hurt:      [{ f: 'hurt',      t: 'hurt',      d: 0.20 }, { f: 'hurt', t: 'idle', d: 0.12 }],
  knockdown: [{ f: 'down',      t: 'down',      d: 1.4 }],
  getup:     [{ f: 'down',      t: 'getup',     d: 0.28 }, { f: 'getup', t: 'idle', d: 0.18 }],
  special:   [{ f: 'spCh',      t: 'spCh',      d: 0.14 }, { f: 'spCh', t: 'spRe', d: 0.12, hit: true }, { f: 'spRe', t: 'idle', d: 0.20 }],
  victory:   [{ f: 'victory',   t: 'victory',   d: 1.5 }],
  // NEW: counter-attack animation
  counter:   [{ f: 'counter_w', t: 'counter_e', d: 0.06, hit: true }, { f: 'counter_e', t: 'idle', d: 0.12 }],
}

const LOOP_ANIMS = { idle: 1, walk: 1, block: 1, knockdown: 1 }

const DMG   = { punch_R: 9, punch_L: 10, kick_R: 15, uppercut: 22, special: 40, counter: 28 }
const STUN  = { punch_R: 0.22, punch_L: 0.22, kick_R: 0.34, uppercut: 0.58, special: 0.95, counter: 0.5 }
const RANGE = { punch_R: 84, punch_L: 84, kick_R: 102, uppercut: 78, special: 120, counter: 90 }
const PUSHV = { uppercut: 420, special: 300 }

// ─────────────────────────────────────────────────────────────────
//  BOSSES
// ─────────────────────────────────────────────────────────────────
const BOSSES = [
  { name:'GRUNT',      hp:80,  spd:118, color:'#151515', glow:'#404040', weapon:'none',       style:'brawler',   bg:'dojo',   diff:0.28, music:0, intro:'A rookie thug. Warm-up time.' },
  { name:'BLADE',      hp:105, spd:130, color:'#08082a', glow:'#3355FF', weapon:'sword',      style:'swordsman', bg:'dojo',   diff:0.40, music:0, intro:'Cold steel. Colder eyes.' },
  { name:'STRIKER',    hp:115, spd:182, color:'#1e0000', glow:'#FF1100', weapon:'none',       style:'speedster', bg:'city',   diff:0.52, music:1, intro:"He's already moving. Keep up." },
  { name:'STAFF MONK', hp:132, spd:128, color:'#0b0018', glow:'#9933FF', weapon:'staff',      style:'mage',      bg:'city',   diff:0.60, music:1, intro:'Ancient power. Respect it.' },
  { name:'CHAIN',      hp:144, spd:155, color:'#181200', glow:'#FFAA00', weapon:'nunchucks',  style:'trickster', bg:'forest', diff:0.68, music:2, intro:'Unpredictable. Vicious.' },
  { name:'PHANTOM',    hp:160, spd:192, color:'#002000', glow:'#00FF55', weapon:'none',       style:'speedster', bg:'forest', diff:0.74, music:2, intro:"You can't hit what you can't see." },
  { name:'WARLORD',    hp:180, spd:140, color:'#1a0700', glow:'#FF6600', weapon:'sword',      style:'brawler',   bg:'shadow', diff:0.80, music:2, intro:'A hundred men fell. You are next.' },
  { name:'SHADOW MONK',hp:196, spd:148, color:'#0c0013', glow:'#FF00BB', weapon:'staff',      style:'mage',      bg:'shadow', diff:0.86, music:2, intro:'Between worlds. Between life and nothing.' },
  { name:'DEATH CHAIN',hp:218, spd:164, color:'#130000', glow:'#FF0000', weapon:'nunchucks',  style:'master',    bg:'shadow', diff:0.92, music:2, intro:'Last sound you hear is chains.' },
  { name:'SHADOW KING',hp:270, spd:170, color:'#040004', glow:'#AA00FF', weapon:'sword',      style:'master',    bg:'shadow', diff:1.00, music:2, intro:'I am the darkness itself.' },
]

// ─────────────────────────────────────────────────────────────────
//  UPGRADES — between-fight power-ups
// ─────────────────────────────────────────────────────────────────
const UPGRADES = [
  { id: 'atk',   name: 'Iron Fist',    icon: '👊', desc: '+15% damage',               color: '#FF4400' },
  { id: 'spd',   name: 'Shadow Step',  icon: '💨', desc: '+20% speed',                color: '#00CCFF' },
  { id: 'hp',    name: 'Iron Body',    icon: '🛡', desc: '+20 max HP',                color: '#22c55e' },
  { id: 'combo', name: 'Combo Master', icon: '⚡', desc: 'Longer combo window',        color: '#FFAA00' },
  { id: 'regen', name: 'Life Steal',   icon: '💚', desc: 'Heal 15% of damage dealt',  color: '#44FF88' },
  { id: 'guard', name: 'Counter Art',  icon: '🔄', desc: 'Auto-counter after 3 blocks', color: '#CC44FF' },
]

const COMBO_NAMES = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'RAMPAGE!', 'UNSTOPPABLE!', 'GODLIKE!']

const AI_POOLS = {
  brawler:   ['punch_R', 'punch_R', 'kick_R', 'uppercut', 'punch_L'],
  speedster: ['punch_R', 'punch_L', 'punch_R', 'punch_L', 'kick_R'],
  mage:      ['kick_R', 'uppercut', 'special', 'punch_R'],
  // FIX: trickster now uses mix with uppercut feints, distinct from speedster
  trickster: ['punch_L', 'kick_R', 'punch_R', 'kick_R', 'uppercut'],
  swordsman: ['punch_R', 'kick_R', 'uppercut', 'punch_R'],
  master:    ['punch_R', 'punch_L', 'kick_R', 'uppercut', 'special', 'punch_R'],
}

// ─────────────────────────────────────────────────────────────────
//  ANIMATION ENGINE
// ─────────────────────────────────────────────────────────────────
function eio(t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function lerpPose(a, b, t) {
  const e = eio(t)
  const out = []
  for (let i = 0; i < NJ; i++) out.push({ x: a[i].x + (b[i].x - a[i].x) * e, y: a[i].y + (b[i].y - a[i].y) * e })
  return out
}

function setAnim(f, name) {
  const seq = ANIMS[name]; if (!seq) return
  if (f.animName === name && LOOP_ANIMS[name]) return
  f.animName = name; f.animIdx = 0; f.animT = 0
  f.locked = !LOOP_ANIMS[name]; f.hitActive = false
}

function tickAnim(f, dt) {
  const seq = ANIMS[f.animName]; if (!seq) return
  const frame = seq[f.animIdx]; if (!frame) return
  f.animT += dt
  const t = Math.min(f.animT / frame.d, 1)
  f.pose = lerpPose(POSES[frame.f] ?? POSES.idle, POSES[frame.t] ?? POSES.idle, t)
  f.hitActive = !!(frame.hit && !f.hitConnected && t > 0.35 && t < 0.9)
  if (f.animT >= frame.d) {
    f.animT -= frame.d; f.animIdx++
    if (f.animIdx >= seq.length) {
      if (LOOP_ANIMS[f.animName]) f.animIdx = 0
      else { f.animIdx = seq.length - 1; f.locked = false; f.hitActive = false; setAnim(f, 'idle') }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  FIGHTER FACTORY
// ─────────────────────────────────────────────────────────────────
function newFighter(isPlayer, bossIdx, weapon, upgrades, diffMult) {
  const b = BOSSES[bossIdx] ?? BOSSES[0]
  if (isPlayer) {
    const baseHp = 100 + (upgrades.hp ?? 0) * 20
    return {
      x: 100, y: FLOOR, vy: 0, vx: 0, onGround: true, facingRight: true,
      hp: baseHp, maxHp: baseHp,
      animName: 'idle', animIdx: 0, animT: 0,
      pose: [...POSES.idle], locked: false, hitActive: false, hitConnected: false,
      action: 'idle', blocking: false, stunTimer: 0, invTimer: 0,
      comboCnt: 0, comboTimer: 0, blockStreak: 0, hitFlash: 0,
      color: '#0a0a0a', glowColor: '#1E90FF',
      weapon,
      isPlayer: true,
      speed: 170 * (1 + (upgrades.spd ?? 0) * 0.2),
      dmgMult: 1 + (upgrades.atk ?? 0) * 0.15,
      healOnHit: (upgrades.regen ?? 0) > 0,
      counterOnBlock: (upgrades.guard ?? 0) > 0,
    }
  } else {
    return {
      x: 375, y: FLOOR, vy: 0, vx: 0, onGround: true, facingRight: false,
      hp: b.hp, maxHp: b.hp,
      animName: 'idle', animIdx: 0, animT: 0,
      pose: [...POSES.idle], locked: false, hitActive: false, hitConnected: false,
      action: 'idle', blocking: false, stunTimer: 0, invTimer: 0,
      comboCnt: 0, comboTimer: 0, blockStreak: 0, hitFlash: 0,
      color: b.color, glowColor: b.glow,
      weapon: b.weapon,
      isPlayer: false,
      speed: b.spd,
      aiTimer: 0, aiDir: 0,
      diff: b.diff * diffMult,
      style: b.style,
      dmgMult: 1,
      healOnHit: false,
      counterOnBlock: false,
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  COMBAT
// ─────────────────────────────────────────────────────────────────
function doAction(f, name) {
  if ((f.locked && name !== 'block') || f.stunTimer > 0) return false
  f.action = name; f.hitConnected = false; setAnim(f, name)
  if (name === 'punch_R' || name === 'punch_L') SFX.punch()
  else if (name === 'kick_R') SFX.kick()
  else if (name === 'uppercut') { SFX.whoosh(); setTimeout(SFX.punch, 60) }
  else if (name === 'special') SFX.special()
  else if (name === 'counter') SFX.counter()
  return true
}

function doJump(f) {
  if (!f.onGround) return
  f.vy = -540; f.onGround = false; setAnim(f, 'idle')
}

function aiTick(e, p, dt) {
  e.aiTimer -= dt
  if (e.aiTimer > 0 || e.stunTimer > 0 || e.locked) return
  const dist = Math.abs(e.x - p.x)
  const eff = Math.min(e.diff, 1)
  if (p.hitActive && dist < 110 && Math.random() < eff * 0.55) {
    doAction(e, 'block'); e.aiTimer = 0.3; return
  }
  if (dist > 110) { e.aiDir = e.x > p.x ? -1 : 1; e.aiTimer = 0.05 }
  else if (dist < 52 && Math.random() < 0.35) { e.aiDir = e.x > p.x ? 1 : -1; e.aiTimer = 0.12 }
  else {
    e.aiDir = 0
    if (Math.random() < eff && dist < 115) {
      const pool = AI_POOLS[e.style] ?? AI_POOLS.brawler
      doAction(e, pool[Math.floor(Math.random() * pool.length)])
      e.aiTimer = 0.2 + Math.random() * (0.45 - eff * 0.2)
    } else {
      if (dist > 160 && Math.random() < 0.15 * eff) doJump(e)
      e.aiTimer = 0.07
    }
  }
}

function resolveHits(atk, def, pts, onCounter) {
  if (!atk.hitActive || atk.hitConnected) return null
  const dist = Math.abs(atk.x - def.x)
  const wpBonus = atk.weapon === 'sword' ? 22 : atk.weapon === 'staff' ? 14 : 0
  const rng = (RANGE[atk.action] ?? 86) + wpBonus
  if (dist > rng) return null
  const facing = atk.facingRight ? atk.x < def.x : atk.x > def.x
  if (!facing) return null
  atk.hitConnected = true; atk.hitActive = false

  // Block
  if (def.blocking && atk.action !== 'special') {
    SFX.block()
    spawnHit(pts, (atk.x + def.x) / 2, def.y - 58, '#FFD700', 8, 2)
    def.blockStreak = (def.blockStreak ?? 0) + 1
    // Counter-attack after 3 consecutive blocks (upgrade)
    if (def.isPlayer && def.counterOnBlock && def.blockStreak >= 3) {
      def.blockStreak = 0
      setTimeout(() => onCounter?.(), 80)
    }
    return 'block'
  }
  if (def.invTimer > 0) return null

  const comboDmg = Math.min((atk.comboCnt ?? 0) * 2, 12)
  const wpDmg = atk.weapon === 'sword' ? 10 : atk.weapon === 'staff' ? 6 : atk.weapon === 'nunchucks' ? 5 : 0
  let dmg = Math.round((DMG[atk.action] ?? 9) + wpDmg + comboDmg)
  if (atk.isPlayer) dmg = Math.round(dmg * (atk.dmgMult ?? 1))

  def.hp = Math.max(0, def.hp - dmg)
  def.stunTimer = STUN[atk.action] ?? 0.24
  def.hitFlash = 1; def.invTimer = 0.14; def.blockStreak = 0
  const dir = atk.x < def.x ? 1 : -1
  def.vx = dir * 65 * 5
  const pv = PUSHV[atk.action]
  if (pv) { def.vy = -pv; def.onGround = false }

  setAnim(def, def.stunTimer > 0.5 ? 'knockdown' : 'hurt')
  SFX.hurt()

  // Life steal
  if (atk.isPlayer && atk.healOnHit) atk.hp = Math.min(atk.maxHp, atk.hp + Math.floor(dmg * 0.15))

  atk.comboCnt = (atk.comboCnt ?? 0) + 1
  atk.comboTimer = atk.comboExtended ? 2.4 : 1.8

  const hx = (atk.x + def.x) / 2, hy = def.y - 55
  if (atk.action === 'special') spawnSpecial(pts, hx, hy, atk.glowColor)
  else { spawnHit(pts, hx, hy, '#FF3300', 16, 4.5); spawnBlood(pts, hx, hy - 10) }

  return dmg
}

// ─────────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────────
function spawnHit(pts, x, y, col, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + Math.random() * 0.8 - 0.4
    const s = spd * (0.4 + Math.random() * 0.8)
    pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, col, life: 1, d: 0.046 + Math.random() * 0.04, sz: 2 + Math.random() * 3.5 })
  }
}
function spawnSpecial(pts, x, y, col) {
  for (let i = 0; i < 50; i++) {
    const a = Math.PI * 2 * i / 50, s = 4 + Math.random() * 9
    pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, col, life: 1, d: 0.018 + Math.random() * 0.02, sz: 3 + Math.random() * 6 })
  }
}
function spawnBlood(pts, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (-0.8 + Math.random() * 1.6)
    pts.push({ x, y, vx: Math.cos(a) * (1 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 5) - 2, col: '#cc0000', life: 1, d: 0.032 + Math.random() * 0.025, sz: 2 + Math.random() * 2.5 })
  }
}
function spawnDust(pts, x, y) {
  for (let i = 0; i < 6; i++) {
    pts.push({ x: x + Math.random() * 20 - 10, y, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2.5, col: 'rgba(200,180,140,0.5)', life: 1, d: 0.04 + Math.random() * 0.03, sz: 4 + Math.random() * 6 })
  }
}
function tickParticles(pts, dt) {
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    p.x += p.vx; p.y += p.vy; p.vx *= 0.88; p.vy *= 0.88; p.vy += 0.25; p.life -= p.d
    if (p.life <= 0) pts.splice(i, 1)
  }
}
function drawParticles(ctx, pts) {
  for (const p of pts) {
    ctx.save()
    ctx.globalAlpha = p.life * 0.88; ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────
//  BACKGROUND RENDERER
// ─────────────────────────────────────────────────────────────────
function drawBG(ctx, bg, t) {
  ctx.clearRect(0, 0, CW, CH)
  if (bg === 'dojo') {
    const wg = ctx.createLinearGradient(0, 0, 0, FLOOR)
    wg.addColorStop(0, '#180800'); wg.addColorStop(1, '#251000')
    ctx.fillStyle = wg; ctx.fillRect(0, 0, CW, FLOOR)
    ctx.strokeStyle = '#2e1500'; ctx.lineWidth = 1
    for (let y = 30; y < FLOOR; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke() }
    for (const [lx, ly] of [[34, 32], [CW - 34, 32], [CW / 2, 18]]) {
      const fl = 0.9 + Math.sin(t * 7.3 + lx) * 0.06
      ctx.save(); ctx.globalAlpha = (0.08 + Math.sin(t * 1.5 + lx) * 0.015) * fl
      const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 110)
      rg.addColorStop(0, '#FF7700'); rg.addColorStop(1, 'transparent')
      ctx.fillStyle = rg; ctx.fillRect(lx - 110, ly - 100, 220, 220)
      ctx.restore()
      ctx.save(); ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 18 * fl
      ctx.fillStyle = '#8B1A00'; ctx.fillRect(lx - 10, ly, 20, 18); ctx.restore()
    }
    ctx.fillStyle = '#2e1600'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
    ctx.fillStyle = '#3d1c00'; ctx.fillRect(0, FLOOR, CW, 3)
  } else if (bg === 'city') {
    ctx.fillStyle = '#010008'; ctx.fillRect(0, 0, CW, CH)
    for (const [bx, bh, bw] of [[0,145,55],[50,110,40],[96,158,50],[150,80,44],[198,132,54],[258,92,40],[302,152,48],[354,72,42],[398,122,46],[444,95,38]]) {
      ctx.fillStyle = '#05001a'; ctx.fillRect(bx, FLOOR - bh, bw, bh)
      for (let wy = FLOOR - bh + 8; wy < FLOOR - 8; wy += 14) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 9) {
          if ((wx ^ wy ^ bx) % 5 < 3) {
            const fl = Math.sin(t * 0.5 + wx * 0.3 + wy * 0.2)
            if (fl > -0.3) { ctx.globalAlpha = 0.4 + fl * 0.2; ctx.fillStyle = (wx * wy) % 7 === 0 ? '#00CCFF' : '#FFD700'; ctx.fillRect(wx, wy, 4, 6); ctx.globalAlpha = 1 }
          }
        }
      }
    }
    ctx.fillStyle = '#04000f'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  } else if (bg === 'forest') {
    ctx.fillStyle = '#000e00'; ctx.fillRect(0, 0, CW, CH)
    for (const [tx, th, tw, al] of [[34,65,52,.33],[102,65,52,.33],[170,65,52,.33],[238,65,52,.33],[306,65,52,.33],[374,65,52,.33],[18,105,68,.58],[88,105,68,.58],[158,105,68,.58],[228,105,68,.58],[298,105,68,.58],[368,105,68,.58]]) {
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = '#001600'
      ctx.fillRect(tx - tw / 10, FLOOR - th, tw / 5, th)
      ctx.beginPath(); ctx.moveTo(tx, FLOOR - th - tw * 0.65); ctx.lineTo(tx - tw / 2, FLOOR - th + tw * 0.18); ctx.lineTo(tx + tw / 2, FLOOR - th + tw * 0.18); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#001e00'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  } else {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH)
    for (let i = 0; i < 8; i++) {
      const ox = 60 + i * 52, oy = 20 + Math.sin(t * 0.6 + i * 0.8) * 35
      ctx.save(); ctx.globalAlpha = 0.08 + Math.sin(t * 0.8 + i) * 0.04
      const vg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 60)
      vg.addColorStop(0, '#9900FF'); vg.addColorStop(1, 'transparent')
      ctx.fillStyle = vg; ctx.fillRect(ox - 62, oy - 62, 124, 124); ctx.restore()
    }
    ctx.fillStyle = '#0e001e'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(CW, FLOOR); ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────
//  FIGHTER RENDERER
// ─────────────────────────────────────────────────────────────────
function drawFighter(ctx, f, time) {
  const pose = f.pose
  const sx = j => f.x + (f.facingRight ? pose[j].x : -pose[j].x)
  const sy = j => f.y - pose[j].y
  ctx.save()
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#000'
  const sw = f.onGround ? 22 : Math.max(7, 22 * (1 - (FLOOR - f.y) / 200))
  ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 6, sw, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
  if (f.hitFlash > 0) {
    ctx.save(); ctx.globalAlpha = f.hitFlash * 0.6; ctx.fillStyle = '#FF1100'
    ctx.beginPath(); ctx.arc(sx(J.HEAD), sy(J.HEAD), 19, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.shadowColor = f.glowColor
  ctx.shadowBlur = f.blocking ? 18 : f.animName === 'special' ? 34 : 7
  ctx.strokeStyle = f.color; ctx.fillStyle = f.color
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const [a, b, lw] of BONES) {
    ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(sx(a), sy(a)); ctx.lineTo(sx(b), sy(b)); ctx.stroke()
  }
  ctx.beginPath(); ctx.arc(sx(J.HEAD), sy(J.HEAD), 12.5, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = f.glowColor; ctx.globalAlpha = 0.9
  ctx.beginPath(); ctx.arc(sx(J.HEAD) + (f.facingRight ? 4 : -4), sy(J.HEAD) - 2, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  for (const ji of [J.LE, J.RE, J.LK, J.RK, J.LS, J.RS]) {
    ctx.beginPath(); ctx.arc(sx(ji), sy(ji), 3, 0, Math.PI * 2); ctx.fill()
  }
  if (f.blocking) {
    ctx.save(); ctx.globalAlpha = 0.22 + Math.sin(time * 6) * 0.08
    ctx.fillStyle = f.glowColor; ctx.shadowColor = f.glowColor; ctx.shadowBlur = 20
    ctx.beginPath(); ctx.ellipse(sx(J.CHEST) + 6 * (f.facingRight ? 1 : -1), sy(J.CHEST), 22, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  if (f.weapon && f.weapon !== 'none') drawWeapon(ctx, f, sx, sy, time)
  ctx.restore()
}

function drawWeapon(ctx, f, sx, sy, time) {
  const hx = sx(J.RH), hy = sy(J.RH), ex = sx(J.RE), ey = sy(J.RE)
  const ang = Math.atan2(hy - ey, hx - ex)
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.lineCap = 'round'
  if (f.weapon === 'sword') {
    ctx.shadowColor = '#6699FF'; ctx.shadowBlur = 16
    ctx.strokeStyle = '#C8E8FF'; ctx.lineWidth = 2.8
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, 0); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(4, -1.8); ctx.lineTo(44, -1.8); ctx.stroke()
    ctx.strokeStyle = '#8899AA'; ctx.lineWidth = 4.5
    ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(8, 9); ctx.stroke()
    ctx.strokeStyle = '#4A2515'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, 0); ctx.stroke()
  } else if (f.weapon === 'staff') {
    ctx.shadowColor = '#BB44FF'; ctx.shadowBlur = 16
    ctx.strokeStyle = '#7A3D0A'; ctx.lineWidth = 4.5
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(56, 0); ctx.stroke()
    const puls = Math.sin(time * 4) * 1.5
    ctx.fillStyle = '#CC44FF'; ctx.shadowColor = '#EE88FF'; ctx.shadowBlur = 20 + puls
    ctx.beginPath(); ctx.arc(58, 0, 7, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(-28, 0, 5.5, 0, Math.PI * 2); ctx.fill()
  } else if (f.weapon === 'nunchucks') {
    const swA = Math.sin(time * 7) * 1.4
    ctx.strokeStyle = '#3C200E'; ctx.lineWidth = 5; ctx.shadowColor = '#FF9900'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke()
    const c2x = 20 + Math.cos(swA) * 14, c2y = Math.sin(swA) * 14
    ctx.strokeStyle = 'rgba(180,180,180,0.8)'; ctx.lineWidth = 2
    ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(c2x, c2y); ctx.stroke(); ctx.setLineDash([])
    ctx.strokeStyle = '#3C200E'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(c2x, c2y); ctx.lineTo(c2x + Math.cos(swA + 0.5) * 20, c2y + Math.sin(swA + 0.5) * 20); ctx.stroke()
  }
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function StickmanFighter({ game, levelData, studentId, onFinish }) {
  const canvasRef   = useRef(null)
  const gRef        = useRef(null)   // game state (mutable, not React state)
  const rafRef      = useRef(null)
  const lastRef     = useRef(null)
  const keysRef     = useRef({})
  const moveRef     = useRef(0)

  const DIFF_MAP = { rookie: 0.48, fighter: 0.68, champion: 0.86, legend: 1.0 }

  const [screen, setScreen]         = useState('menu')          // 'menu'|'fight'|'upgrade'|'gameover'|'victory'
  const [weapon, setWeapon]         = useState('none')
  const [difficulty, setDifficulty] = useState('fighter')
  const [mode, setMode]             = useState('story')
  const [upgrades, setUpgrades]     = useState({})              // { atk:0, spd:0, hp:0, combo:0, regen:0, guard:0 }
  const [bossIdx, setBossIdx]       = useState(0)
  const [survivalRound, setSurvivalRound] = useState(1)
  const [score, setScore]           = useState(0)
  const [upgradeOptions, setUpgradeOptions] = useState([])      // 3 random upgrades to pick
  const [nextBossIdx, setNextBossIdx] = useState(0)

  // Derived HUD values (lightweight React state, updated from game loop)
  const [hud, setHud] = useState({ playerHp: 100, maxPlayerHp: 100, enemyHp: 80, maxEnemyHp: 80, combo: 0, message: '' })
  const hudRef = useRef(hud)

  // Persistent high score
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('sf_highscore') ?? '0') } catch { return 0 }
  })

  const weaponRef     = useRef(weapon)
  const difficultyRef = useRef(difficulty)
  const modeRef       = useRef(mode)
  const upgradesRef   = useRef(upgrades)
  const bossIdxRef    = useRef(bossIdx)
  const survivalRoundRef = useRef(survivalRound)
  const scoreRef      = useRef(score)

  // Keep refs in sync
  useEffect(() => { weaponRef.current = weapon }, [weapon])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { upgradesRef.current = upgrades }, [upgrades])
  useEffect(() => { bossIdxRef.current = bossIdx }, [bossIdx])
  useEffect(() => { survivalRoundRef.current = survivalRound }, [survivalRound])
  useEffect(() => { scoreRef.current = score }, [score])

  // ── Message helper ──────────────────────────────────────────────
  const msgTimerRef = useRef(null)
  function showMsg(txt, dur = 3000) {
    setHud(h => ({ ...h, message: txt }))
    clearTimeout(msgTimerRef.current)
    if (dur > 0) msgTimerRef.current = setTimeout(() => setHud(h => ({ ...h, message: '' })), dur)
  }

  // ── Start a fight ───────────────────────────────────────────────
  function startFight(idx, currentMode) {
    const upg = upgradesRef.current
    const diffMult = DIFF_MAP[difficultyRef.current] ?? 0.68
    const boss = BOSSES[idx]

    const player = newFighter(true, idx, weaponRef.current, upg, diffMult)
    player.comboExtended = (upg.combo ?? 0) > 0

    const enemy = newFighter(false, idx, null, {}, diffMult)

    gRef.current = {
      player, enemy,
      particles: [], time: 0,
      phase: 'fight', koTimer: 0,
      bgType: boss.bg, shake: 0,
      bossIdx: idx, mode: currentMode ?? modeRef.current,
    }

    setBossIdx(idx)
    setScreen('fight')
    setHud({ playerHp: player.hp, maxPlayerHp: player.maxHp, enemyHp: boss.hp, maxEnemyHp: boss.hp, combo: 0, message: boss.intro })
    clearTimeout(msgTimerRef.current)
    msgTimerRef.current = setTimeout(() => setHud(h => ({ ...h, message: '' })), 3000)
    startBGMusic(boss.music ?? 0)
  }

  // ── Resolve KO → upgrade screen or gameover ─────────────────────
  function resolveKO(wonBossIdx, currentMode) {
    const g = gRef.current
    const pWin = g.player.hp > 0

    if (currentMode === 'story') {
      if (pWin) {
        const next = wonBossIdx + 1
        if (next >= BOSSES.length) {
          stopBGMusic()
          if (studentId) saveGameScore(studentId, game?.id, levelData?.level, 1000)
          setScreen('victory')
        } else {
          showUpgrades(next, currentMode)
        }
      } else {
        stopBGMusic()
        setScreen('gameover')
        setBossIdx(wonBossIdx)
      }
    } else {
      // Survival
      if (pWin) {
        const nr = survivalRoundRef.current + 1
        const ns = scoreRef.current + Math.round(140 * nr * 0.65)
        setSurvivalRound(nr)
        setScore(ns)
        if (ns > highScore) {
          setHighScore(ns)
          try { localStorage.setItem('sf_highscore', ns) } catch {}
        }
        if (studentId) saveGameScore(studentId, game?.id, levelData?.level, ns)
        showUpgrades((nr - 1) % BOSSES.length, currentMode)
      } else {
        stopBGMusic()
        const finalScore = scoreRef.current
        if (finalScore > highScore) {
          setHighScore(finalScore)
          try { localStorage.setItem('sf_highscore', finalScore) } catch {}
          if (studentId) saveGameScore(studentId, game?.id, levelData?.level, finalScore)
        }
        setScreen('gameover')
        setBossIdx(wonBossIdx)
      }
    }
  }

  function showUpgrades(nextIdx, currentMode) {
    stopBGMusic()
    const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3)
    setUpgradeOptions(shuffled)
    setNextBossIdx(nextIdx)
    setScreen('upgrade')
  }

  function applyUpgrade(upg) {
    SFX.level_up()
    setUpgrades(prev => {
      const next = { ...prev, [upg.id]: (prev[upg.id] ?? 0) + 1 }
      upgradesRef.current = next
      return next
    })
    startFight(nextBossIdx, modeRef.current)
  }

  function handleRetry() {
    setUpgrades({})
    upgradesRef.current = {}
    setSurvivalRound(1)
    setScore(0)
    startFight(bossIdx, modeRef.current)
  }

  // ── Animation + game loop ───────────────────────────────────────
  useEffect(() => {
    lastRef.current = performance.now()

    function loop(now) {
      const dt = Math.min((now - (lastRef.current ?? now)) / 1000, 0.05)
      lastRef.current = now
      if (gRef.current) { update(dt); renderFrame() }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKey = e => {
      const down = e.type === 'keydown'
      keysRef.current[e.code] = down
      if (down) handleKeyDown(e.code)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      stopBGMusic()
      clearTimeout(msgTimerRef.current)
    }
  }, [])

  function handleKeyDown(code) {
    const g = gRef.current; if (!g || g.phase !== 'fight') return
    const p = g.player
    if (code === 'KeyZ' || code === 'KeyJ') doAction(p, 'punch_R')
    if (code === 'KeyX' || code === 'KeyK') doAction(p, 'punch_L')
    if (code === 'KeyC' || code === 'KeyL') doAction(p, 'kick_R')
    if (code === 'KeyV')                    doAction(p, 'uppercut')
    if (code === 'KeyB')                    doAction(p, 'special')
    if (code === 'ArrowUp' || code === 'KeyW') { if (p.onGround) doJump(p) }
  }

  function update(dt) {
    const g = gRef.current; if (!g) return
    g.time += dt
    if (g.shake > 0) { g.shake -= dt * 4; if (g.shake < 0) g.shake = 0 }

    if (g.phase === 'ko') {
      g.koTimer -= dt
      if (g.koTimer <= 0) {
        const idx = g.bossIdx, cm = g.mode
        gRef.current = null
        resolveKO(idx, cm)
      }
      return
    }

    const p = g.player, e = g.enemy, K = keysRef.current

    // ── Player movement (FIX: direct state, not relying on key events for blocking)
    if (!p.locked && p.stunTimer <= 0) {
      const dx = (K['ArrowRight'] || K['KeyD'] ? 1 : 0) - (K['ArrowLeft'] || K['KeyA'] ? 1 : 0)
      const blk = !!(K['ArrowDown'] || K['KeyS'])
      p.blocking = blk && p.onGround
      if (p.blocking) { if (!p.locked) setAnim(p, 'block') }
      else if (dx !== 0) { p.vx = dx * p.speed; p.facingRight = dx > 0; if (p.onGround) setAnim(p, 'walk') }
      else { p.vx *= 0.5; if (p.onGround && !p.locked) setAnim(p, 'idle') }
    } else { p.vx *= 0.62; p.blocking = false }

    // AI — FIX: set facingRight from position, not aiDir (prevents phantom hits)
    e.facingRight = e.x < p.x
    aiTick(e, p, dt)
    if (!e.locked && e.stunTimer <= 0) {
      e.vx = e.aiDir * e.speed
      if (e.aiDir !== 0 && e.onGround) setAnim(e, 'walk')
      else if (e.onGround && !e.locked) setAnim(e, 'idle')
    } else e.vx *= 0.62

    // Physics
    for (const f of [p, e]) {
      if (f.stunTimer > 0) { f.stunTimer -= dt; if (f.stunTimer <= 0 && f.animName === 'knockdown') setAnim(f, 'getup') }
      if (f.hitFlash > 0) f.hitFlash -= dt * 4
      if (f.invTimer > 0) f.invTimer -= dt
      if ((f.comboTimer ?? 0) > 0) {
        f.comboTimer -= dt
        if (f.comboTimer <= 0) f.comboCnt = 0
      }
      if (!f.onGround) {
        f.vy += 1900 * dt; f.y += f.vy * dt
        if (f.y >= FLOOR) {
          f.y = FLOOR; f.vy = 0; f.onGround = true
          spawnDust(g.particles, f.x, FLOOR)
          if (!f.locked) setAnim(f, 'idle')
        }
      }
      f.x += f.vx * dt
      f.x = Math.max(30, Math.min(CW - 30, f.x))
      tickAnim(f, dt)
      if (!f.locked && f.onGround && f.isPlayer) {
        if (!(K['ArrowLeft'] || K['KeyA'] || K['ArrowRight'] || K['KeyD'])) p.facingRight = p.x < e.x
      }
    }

    // Hit resolution — pass counter callback
    const onCounter = () => { if (gRef.current?.phase === 'fight') doAction(p, 'counter') }
    const h1 = resolveHits(p, e, g.particles, onCounter)
    const h2 = resolveHits(e, p, g.particles, null)
    if (h1 && h1 !== 'block') g.shake = h1 > 20 ? 0.35 : 0.15
    if (h2 && h2 !== 'block') g.shake = h2 > 20 ? 0.28 : 0.12

    tickParticles(g.particles, dt)

    // KO check
    if ((p.hp <= 0 || e.hp <= 0) && g.phase === 'fight') {
      g.phase = 'ko'; g.koTimer = 2.5
      const pWin = p.hp > 0
      if (pWin) { setAnim(e, 'knockdown'); setAnim(p, 'victory'); SFX.ko(); SFX.victory(); showMsg('⚡ KO — YOU WIN!', 99999) }
      else       { setAnim(p, 'knockdown'); SFX.ko(); showMsg('💀 KO — YOU LOSE', 99999) }
    }

    // Update HUD (throttled via React batching)
    const comboName = COMBO_NAMES[Math.min(p.comboCnt ?? 0, COMBO_NAMES.length - 1)] ?? ''
    setHud(h => ({ ...h, playerHp: Math.max(0, p.hp), enemyHp: Math.max(0, e.hp), combo: p.comboCnt ?? 0, comboName }))
  }

  function renderFrame() {
    const canvas = canvasRef.current; if (!canvas) return
    const g = gRef.current; if (!g) return
    const ctx = canvas.getContext('2d')
    ctx.save()
    if (g.shake > 0) { const s = g.shake * 8; ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s) }
    drawBG(ctx, g.bgType, g.time)
    const dist = Math.abs(g.player.x - g.enemy.x)
    if (dist < 70) { ctx.save(); ctx.globalAlpha = (1 - dist / 70) * 0.08; ctx.fillStyle = '#FF0000'; ctx.fillRect(0, 0, CW, CH); ctx.restore() }
    if (g.player.x < g.enemy.x) { drawFighter(ctx, g.player, g.time); drawFighter(ctx, g.enemy, g.time) }
    else { drawFighter(ctx, g.enemy, g.time); drawFighter(ctx, g.player, g.time) }
    drawParticles(ctx, g.particles)
    ctx.restore()
  }

  // ── Touch d-pad helpers ─────────────────────────────────────────
  // FIX: use pointerdown/up/cancel/leave to prevent stuck keys on iOS
  function dpadDown(dir) {
    AC()
    if (dir === 'up') { const g = gRef.current; if (g?.player?.onGround) doJump(g.player) }
    else keysRef.current[{ lf: 'ArrowLeft', rt: 'ArrowRight', dn: 'ArrowDown' }[dir]] = true
  }
  function dpadUp(dir) {
    keysRef.current[{ lf: 'ArrowLeft', rt: 'ArrowRight', dn: 'ArrowDown' }[dir]] = false
    if (dir === 'dn') {
      const g = gRef.current
      if (g) { g.player.blocking = false; if (!g.player.locked) setAnim(g.player, 'idle') }
    }
  }
  function tbAttack(act) {
    AC()
    const g = gRef.current; if (g) doAction(g.player, act)
  }
  function setBlockKey(down) {
    keysRef.current['ArrowDown'] = down
    const g = gRef.current; if (!g) return
    g.player.blocking = down && g.player.onGround
    if (down && !g.player.locked) setAnim(g.player, 'block')
    else if (!down && !g.player.locked) setAnim(g.player, 'idle')
  }

  // ── Shared button style ─────────────────────────────────────────
  const dpStyle = {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid #2a0044',
    background: 'linear-gradient(135deg,#0e0020,#0a0018)',
    color: '#9966BB', fontWeight: 900, fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    touchAction: 'none', WebkitTapHighlightColor: 'transparent',
  }

  const boss = BOSSES[bossIdx]
  const pPct  = Math.max(0, (hud.playerHp / hud.maxPlayerHp) * 100)
  const ePct  = hud.maxEnemyHp > 0 ? Math.max(0, hud.enemyHp / hud.maxEnemyHp * 100) : 0
  const pBarColor = pPct > 50 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : pPct > 25 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)'

  // ─────────────────────────────────────────────────────────────
  //  SCREENS
  // ─────────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <div style={{ background: '#030008', borderRadius: 16, overflow: 'hidden', fontFamily: 'Courier New, monospace', color: '#EEE', userSelect: 'none' }}>
        <div style={{ padding: '28px 18px 22px', textAlign: 'center', background: 'linear-gradient(180deg,#0a0015,#030008)', borderBottom: '1px solid #1a0033' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 5, color: '#E0D0FF', textShadow: '0 0 20px #9900FF', margin: '0 0 2px' }}>SHADOW FIGHT</h1>
          <p style={{ color: '#330055', fontSize: 8, letterSpacing: 4, margin: '0 0 22px' }}>STICKMAN EDITION</p>

          <p style={{ color: '#442266', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>WEAPON</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
            {[['none','👊','Fists'],['sword','🗡','Sword'],['staff','🪄','Staff'],['nunchucks','🔗','Chains']].map(([w, ic, lb]) => (
              <button key={w} onClick={() => setWeapon(w)} style={{
                padding: '8px 11px', borderRadius: 10, cursor: 'pointer', minWidth: 68, fontFamily: 'inherit',
                border: `2px solid ${weapon === w ? '#9900FF' : '#1e0033'}`,
                background: weapon === w ? 'rgba(153,0,255,0.18)' : 'rgba(10,0,20,0.8)',
                color: weapon === w ? '#CC88FF' : '#442255', fontWeight: 700, fontSize: 10,
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{ic}</div>{lb}
              </button>
            ))}
          </div>

          <p style={{ color: '#442266', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>DIFFICULTY</p>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 22 }}>
            {[['rookie','🟢'],['fighter','🟡'],['champion','🟠'],['legend','🔴']].map(([d, ic]) => (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${difficulty === d ? '#FF4400' : '#1e0033'}`,
                background: difficulty === d ? 'rgba(255,68,0,0.18)' : 'rgba(8,0,16,0.8)',
                color: difficulty === d ? '#FF9977' : '#331133', fontWeight: 700, fontSize: 9, textTransform: 'capitalize',
              }}>
                {ic} {d}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 14 }}>
            <button onClick={() => { AC(); setUpgrades({}); setMode('story'); startFight(0, 'story') }}
              style={{ padding: '13px 26px', borderRadius: 12, background: 'linear-gradient(135deg,#3a0077,#9900FF)', color: 'white', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', letterSpacing: 2, boxShadow: '0 4px 20px rgba(153,0,255,0.4)', fontFamily: 'inherit' }}>
              ⚔️ STORY
            </button>
            <button onClick={() => { AC(); setUpgrades({}); setSurvivalRound(1); setScore(0); setMode('survival'); startFight(0, 'survival') }}
              style={{ padding: '13px 26px', borderRadius: 12, background: 'linear-gradient(135deg,#770000,#EE1100)', color: 'white', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', letterSpacing: 2, boxShadow: '0 4px 20px rgba(220,0,0,0.4)', fontFamily: 'inherit' }}>
              💀 SURVIVAL
            </button>
          </div>

          {highScore > 0 && <p style={{ color: '#441166', fontSize: 10, marginBottom: 8 }}>🏆 Best survival: {highScore}</p>}
          <p style={{ color: '#1a0033', fontSize: 8 }}>Arrow keys: move/block · Z=Punch · X=Jab · C=Kick · V=Uppercut · B=Special</p>
        </div>
      </div>
    )
  }

  if (screen === 'upgrade') {
    return (
      <div style={{ background: 'rgba(3,0,8,0.97)', borderRadius: 16, padding: '32px 20px', textAlign: 'center', fontFamily: 'Courier New, monospace', color: '#EEE' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⬆️</div>
        <h2 style={{ color: '#FFD700', fontSize: 18, fontWeight: 900, letterSpacing: 3, marginBottom: 6 }}>CHOOSE UPGRADE</h2>
        <p style={{ color: '#664488', fontSize: 11, marginBottom: 20 }}>
          {modeRef.current === 'story'
            ? `Next: ${BOSSES[nextBossIdx]?.name} — ${BOSSES[nextBossIdx]?.intro}`
            : `Round ${survivalRound} complete! Score: ${score}`}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {upgradeOptions.map(upg => (
            <button
              key={upg.id}
              onClick={() => applyUpgrade(upg)}
              style={{
                padding: '16px 14px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${upg.color}44`,
                background: `${upg.color}11`, color: upg.color,
                fontFamily: 'inherit', fontWeight: 700, minWidth: 100,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{upg.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>{upg.name}</div>
              <div style={{ fontSize: 9, color: '#664488', marginTop: 4 }}>{upg.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (screen === 'gameover' || screen === 'victory') {
    const isVic = screen === 'victory'
    return (
      <div style={{ background: '#030008', borderRadius: 16, padding: '40px 22px', textAlign: 'center', fontFamily: 'Courier New, monospace', color: '#EEE' }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>{isVic ? '🏆' : '💀'}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: isVic ? '#FFD700' : '#EF4444', letterSpacing: 4, marginBottom: 12 }}>
          {isVic ? 'CHAMPION!' : 'DEFEATED'}
        </h2>
        {!isVic && <p style={{ color: '#AA55CC', fontSize: 12, marginBottom: 4 }}>Fell to {boss?.name}</p>}
        {mode === 'survival' && <p style={{ color: '#AA55CC', fontSize: 13, marginBottom: 4 }}>Round {survivalRound} · Score: {score}</p>}
        {highScore > 0 && <p style={{ color: '#441166', fontSize: 11, marginBottom: 4 }}>Best: {highScore}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={() => { stopBGMusic(); setScreen('menu') }}
            style={{ padding: '11px 26px', borderRadius: 11, background: 'linear-gradient(135deg,#3a0077,#9900FF)', color: 'white', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← MENU
          </button>
          {!isVic && (
            <button onClick={handleRetry}
              style={{ padding: '11px 26px', borderRadius: 11, background: 'linear-gradient(135deg,#770000,#EE1100)', color: 'white', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              RETRY ↺
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── FIGHT SCREEN ────────────────────────────────────────────────
  return (
    <div style={{ background: '#030008', borderRadius: 16, overflow: 'hidden', fontFamily: 'Courier New, monospace', userSelect: 'none', touchAction: 'none' }}>

      {/* HP bars */}
      <div style={{ background: '#07000e', padding: '8px 12px 6px', borderBottom: '1px solid #150026', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#AACCFF', fontSize: 9, fontWeight: 800 }}>YOU</span>
            <span style={{ color: pPct > 50 ? '#22c55e' : pPct > 25 ? '#f59e0b' : '#ef4444', fontSize: 9, fontWeight: 700 }}>{Math.ceil(hud.playerHp)}</span>
          </div>
          <div style={{ height: 9, background: '#0c001a', borderRadius: 5, border: '1px solid #220040', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pPct}%`, background: pBarColor, borderRadius: 5, transition: 'width 0.12s' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: 56 }}>
          {(hud.combo ?? 0) >= 2 && (
            <>
              <div style={{ color: (hud.combo ?? 0) >= 5 ? '#FF0000' : '#FF5500', fontWeight: 900, fontSize: 16, lineHeight: 1 }}>{hud.combo}✕</div>
              <div style={{ fontSize: 7, color: '#FF8800', fontWeight: 700, height: 12 }}>{hud.comboName}</div>
            </>
          )}
          <div style={{ color: '#FFAAAA', fontSize: 7 }}>{boss?.name}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#EF4444', fontSize: 9, fontWeight: 700 }}>{Math.ceil(hud.enemyHp)}</span>
            <span style={{ color: '#FFAAAA', fontSize: 9, fontWeight: 800 }}>{boss?.name}</span>
          </div>
          <div style={{ height: 9, background: '#0c001a', borderRadius: 5, border: '1px solid #220040', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ePct}%`, background: 'linear-gradient(270deg,#dc2626,#f87171)', borderRadius: 5, transition: 'width 0.12s', marginLeft: 'auto' }} />
          </div>
        </div>
      </div>

      {/* Message bar */}
      {hud.message && (
        <div style={{ background: 'rgba(153,0,255,0.10)', borderBottom: '1px solid rgba(153,0,255,0.20)', padding: '5px 12px', textAlign: 'center', color: '#CC88FF', fontSize: 11, fontWeight: 700 }}>
          {hud.message}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={CW} height={CH} style={{ width: '100%', display: 'block' }} />

      {/* Controls */}
      <div style={{ background: '#07000e', borderTop: '1px solid #150026', padding: '10px 10px 14px', display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'flex-end' }}>

        {/* D-pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,36px)', gridTemplateRows: 'repeat(3,36px)', gap: 3, flexShrink: 0 }}>
          {[
            [null],
            [{ l:'↑', id:'up' }],
            [null],
            [{ l:'←', id:'lf' }],
            [{ l:'🥋', center: true }],
            [{ l:'→', id:'rt' }],
            [null],
            [{ l:'↓', id:'dn' }],
            [null],
          ].map((item, i) => {
            const c = item[0]
            if (!c) return <div key={i} />
            if (c.center) return <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{c.l}</div>
            return (
              <button key={i}
                onPointerDown={e => { e.preventDefault(); dpadDown(c.id) }}
                onPointerUp={e => { e.preventDefault(); if (c.id !== 'up') dpadUp(c.id) }}
                onPointerLeave={e => { if (c.id !== 'up') dpadUp(c.id) }}
                onPointerCancel={e => { if (c.id !== 'up') dpadUp(c.id) }}
                style={dpStyle}
              >
                {c.l}
              </button>
            )
          })}
        </div>

        {/* Attack buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, flex: 1, maxWidth: 260 }}>
          {[
            ['PUNCH', 'punch_R', '#FF4400', false],
            ['JAB',   'punch_L', '#FF6600', false],
            ['KICK',  'kick_R',  '#CC0044', false],
            ['UPPER', 'uppercut','#AA00AA', false],
            ['BLOCK', 'block',   '#0055EE', true],
            ['⭐ SPECIAL','special','#9900FF', false],
          ].map(([lb, act, col, isBlock], i) => (
            <button key={act}
              onPointerDown={e => { e.preventDefault(); isBlock ? setBlockKey(true) : tbAttack(act) }}
              onPointerUp={e => { e.preventDefault(); if (isBlock) setBlockKey(false) }}
              onPointerLeave={e => { if (isBlock) setBlockKey(false) }}
              onPointerCancel={e => { if (isBlock) setBlockKey(false) }}
              style={{
                padding: '8px 2px', borderRadius: 9,
                border: `1px solid ${col}44`,
                background: `linear-gradient(135deg,${col}18,${col}08)`,
                color: col, fontWeight: 800, fontSize: 9, cursor: 'pointer',
                touchAction: 'none', WebkitTapHighlightColor: 'transparent',
                fontFamily: 'inherit',
                gridColumn: act === 'special' ? 'span 3' : 'auto',
              }}
            >
              {lb}
            </button>
          ))}
        </div>
      </div>

      {mode === 'survival' && (
        <div style={{ background: '#07000e', borderTop: '1px solid #0f0020', padding: '4px 12px', textAlign: 'center', fontSize: 9, color: '#3d0055' }}>
          Score: {score} · Round {survivalRound}
        </div>
      )}
    </div>
  )
}
