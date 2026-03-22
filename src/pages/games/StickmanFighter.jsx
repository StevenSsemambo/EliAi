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
function playTone(freq, type, dur, vol = 0.15, delay = 0) {
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
    const len = Math.ceil(a.sampleRate * Math.min(dur, 0.8))
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
  punch:   () => { playNoise(0.5, 0.04, 800); playTone(180, 'sawtooth', 0.06, 0.25, 0.02) },
  heavy:   () => { playNoise(0.7, 0.07, 500); playTone(120, 'sawtooth', 0.09, 0.35, 0.02); playTone(80, 'sine', 0.12, 0.2, 0.04) },
  kick:    () => { playNoise(0.6, 0.06, 600); playTone(140, 'sawtooth', 0.08, 0.3, 0.02) },
  block:   () => { playTone(1000, 'square', 0.03, 0.3); playTone(700, 'square', 0.025, 0.2, 0.025); playNoise(0.2, 0.04, 1200) },
  hurt:    () => { playNoise(0.4, 0.10, 400); playTone(160, 'sawtooth', 0.1, 0.25, 0.04) },
  special: () => { playNoise(0.3, 0.3, 300, 0.05); [200, 350, 550, 800, 1100].forEach((f, i) => playTone(f, 'sawtooth', 0.25, 0.22, i * 0.045)) },
  ko:      () => { playNoise(0.5, 0.6, 200, 0.05); [300, 240, 190, 140, 90].forEach((f, i) => playTone(f, 'sawtooth', 0.55, 0.38, i * 0.22)) },
  land:    () => { playNoise(0.3, 0.05, 200) },
  victory: () => { [500, 630, 800, 1000, 1260].forEach((f, i) => playTone(f, 'triangle', 0.3, 0.25, i * 0.12)) },
  step:    () => { playNoise(0.08, 0.03, 150) },
}

let _musicId = -1
function startBGMusic(theme) {
  stopBGMusic()
  try {
    const a = AC(); if (!a) return
    const bpm = [88, 120, 70][theme] ?? 88
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
          for (let i = 0; i < 8; i++) {
            playNoise(0.18, 0.04, 300, i * beat * 0.5)
            if (i % 2 === 0) playTone(80, 'sine', 0.14, 0.18, i * beat * 0.5)
          }
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
//  CANVAS & SKELETON CONSTANTS
// ─────────────────────────────────────────────────────────────────
const CW = 520, CH = 360, FLOOR = CH - 52

// Joint indices (17 joints, y-up local space, hip = origin)
const HIP=0, SPINE=1, CHEST=2, NECK=3, HEAD=4
const LS=5, LE=6, LH=7
const RS=8, RE=9, RH=10
const LHIP=11, LK=12, LF=13
const RHIP=14, RK=15, RF=16
const NJ = 17

// Segment definitions: [jointA, jointB, radiusAtA, radiusAtB, layer]
// layer: 0=back, 1=mid-body, 2=front
const SEGS = [
  // Torso
  [HIP, SPINE, 10, 9, 1],
  [SPINE, CHEST, 9, 12, 1],
  [CHEST, NECK, 8, 7, 1],
  [NECK, HEAD, 6, 0, 1],
  // Left arm (back layer)
  [CHEST, LS, 7, 7, 0],
  [LS, LE, 7, 6, 0],
  [LE, LH, 6, 5, 0],
  // Left leg (back layer)
  [HIP, LHIP, 9, 9, 0],
  [LHIP, LK, 9, 8, 0],
  [LK, LF, 8, 10, 0],
  // Right arm (front layer)
  [CHEST, RS, 7, 7, 2],
  [RS, RE, 7, 6, 2],
  [RE, RH, 6, 5, 2],
  // Right leg (front layer)
  [HIP, RHIP, 9, 9, 2],
  [RHIP, RK, 9, 8, 2],
  [RK, RF, 8, 10, 2],
]

// Pose data as flat Float32Arrays: [x0,y0, x1,y1, ...] — y positive = up
function P(a) { return new Float32Array(a) }

const POSES = {
  idle:      P([0,0, 0,20, 0,42, 1,57, 3,72, -20,40,-35,26,-33,10, 20,40,33,26,31,10, -11,-2,-17,-32,-18,-58, 11,-2,17,-32,18,-58]),
  walk_a:    P([0,3, 0,23, 1,45, 2,60, 4,74, -18,41,-36,30,-44,16, 21,41,28,27,20,13, -13,-2,-28,-22,-42,-52, 13,-2,9,-32,7,-60]),
  walk_b:    P([0,3, 0,23,-1,45,-2,60,-4,74, -21,41,-28,27,-20,13, 18,41,36,30,44,16, -13,-2,-9,-32,-7,-60, 13,-2,28,-22,42,-52]),
  run_a:     P([2,6,-1,26,-1,50,0,64,1,78, -16,44,-44,36,-58,22, 24,44,30,28,22,12, -14,-2,-36,-16,-58,-42, 14,-2,10,-38,6,-68]),
  run_b:     P([-2,6,1,26,1,50,0,64,-1,78, -24,44,-30,28,-22,12, 16,44,44,36,58,22, -14,-2,-10,-38,-6,-68, 14,-2,36,-16,58,-42]),
  pRw:       P([-4,0,-3,20,-2,42,-1,57,1,71, -21,40,-38,28,-40,14, 18,40,12,56,6,67, -11,-2,-15,-30,-16,-57, 11,-2,15,-30,16,-57]),
  pRe:       P([7,0,7,20,8,42,9,56,10,70, -17,40,-24,28,-20,14, 24,43,46,46,68,48, -11,-2,-14,-30,-15,-57, 11,-2,14,-30,15,-57]),
  pLw:       P([4,0,3,20,2,42,1,57,-1,71, -18,40,-12,56,-6,67, 21,40,38,28,40,14, -11,-2,-15,-30,-16,-57, 11,-2,15,-30,16,-57]),
  pLe:       P([-7,0,-7,20,-8,42,-9,56,-10,70, -24,43,-46,46,-68,48, 17,40,24,28,20,14, -11,-2,-14,-30,-15,-57, 11,-2,14,-30,15,-57]),
  kRw:       P([-4,0,-3,20,-2,42,-1,57,-1,71, -21,40,-40,28,-54,14, 20,40,30,30,24,18, -13,-2,-15,-30,-14,-58, 11,-2,14,-14,16,-6]),
  kRe:       P([8,2,8,21,9,43,10,57,11,71, -18,39,-24,52,-20,65, 22,40,26,30,22,18, -13,-2,-14,-30,-13,-58, 11,-2,40,-12,66,-8]),
  heavy_w:   P([0,-10,0,10,0,30,1,44,2,58, -18,28,-32,14,-34,0, 18,28,16,10,10,-4, -13,-16,-22,-42,-26,-68, 13,-16,18,-40,16,-66]),
  heavy_e:   P([7,-14,7,8,8,32,9,48,11,64, -16,30,-10,44,-8,56, 25,42,34,62,30,80, -13,-16,-16,-42,-18,-68, 13,-16,14,-40,12,-66]),
  block:     P([-2,0,-2,20,-2,40,-1,54,0,67, -20,38,-10,52,2,64, 19,38,9,52,-2,64, -13,-2,-17,-32,-19,-60, 13,-2,17,-32,19,-60]),
  hurt:      P([-12,0,-11,18,-10,38,-12,52,-15,65, -28,36,-47,22,-59,10, 11,36,20,20,18,6, -11,-2,-13,-28,-12,-54, 11,-2,17,-26,20,-52]),
  down:      P([0,-10,-22,-16,-44,-19,-60,-17,-72,-13, -32,-8,-46,4,-56,16, -29,-27,-21,-18,-15,-8, -7,-7,2,9,14,27, 8,-7,22,5,38,18]),
  getup:     P([-4,-5,-2,15,0,35,1,49,2,63, -19,33,-32,19,-30,5, 17,33,25,19,21,5, -13,-5,-20,-29,-22,-55, 10,-5,8,-25,6,-51]),
  spCh:      P([0,0,0,22,0,46,0,61,0,76, -26,46,-47,60,-41,74, 26,46,47,60,41,74, -13,-2,-20,-32,-24,-60, 13,-2,20,-32,24,-60]),
  spRe:      P([10,0,10,21,11,44,12,58,13,72, -12,44,14,46,36,48, 27,46,49,48,69,48, -13,-2,-17,-32,-20,-60, 11,-2,12,-32,10,-60]),
  victory:   P([0,5,0,25,0,47,0,61,0,75, -22,44,-44,56,-42,70, 22,44,40,62,36,78, -12,-2,-16,-30,-18,-57, 12,-2,16,-30,18,-57]),
}

const ANIMS = {
  idle:      [{ f: 'idle',    t: 'idle',    d: 0.5 }],
  walk:      [{ f: 'walk_a',  t: 'walk_b',  d: 0.14 }, { f: 'walk_b', t: 'walk_a', d: 0.14 }],
  run:       [{ f: 'run_a',   t: 'run_b',   d: 0.10 }, { f: 'run_b',  t: 'run_a',  d: 0.10 }],
  punch_R:   [{ f: 'pRw',     t: 'pRe',     d: 0.065, hit: true }, { f: 'pRe', t: 'idle', d: 0.09 }, { f: 'idle', t: 'idle', d: 0.05 }],
  punch_L:   [{ f: 'pLw',     t: 'pLe',     d: 0.065, hit: true }, { f: 'pLe', t: 'idle', d: 0.09 }, { f: 'idle', t: 'idle', d: 0.05 }],
  heavy:     [{ f: 'heavy_w', t: 'heavy_e', d: 0.09,  hit: true }, { f: 'heavy_e', t: 'idle', d: 0.18 }, { f: 'idle', t: 'idle', d: 0.08 }],
  kick_R:    [{ f: 'kRw',     t: 'kRe',     d: 0.08,  hit: true }, { f: 'kRe', t: 'idle', d: 0.13 }, { f: 'idle', t: 'idle', d: 0.07 }],
  special:   [{ f: 'spCh',    t: 'spCh',    d: 0.12 }, { f: 'spCh', t: 'spRe', d: 0.10, hit: true }, { f: 'spRe', t: 'idle', d: 0.18 }],
  block:     [{ f: 'block',   t: 'block',   d: 0.5 }],
  hurt:      [{ f: 'hurt',    t: 'hurt',    d: 0.18 }, { f: 'hurt', t: 'idle', d: 0.10 }],
  knockdown: [{ f: 'down',    t: 'down',    d: 1.2 }],
  getup:     [{ f: 'down',    t: 'getup',   d: 0.26 }, { f: 'getup', t: 'idle', d: 0.16 }],
  victory:   [{ f: 'victory', t: 'victory', d: 1.5 }],
}

const LOOP_ANIMS = { idle: 1, walk: 1, run: 1, block: 1, knockdown: 1 }

const DMG   = { punch_R: 10, punch_L: 11, heavy: 26, kick_R: 17, special: 44 }
const STUN  = { punch_R: 0.20, punch_L: 0.20, heavy: 0.60, kick_R: 0.36, special: 1.0 }
const RANGE = { punch_R: 86, punch_L: 86, heavy: 80, kick_R: 106, special: 128 }
const PUSHV = { heavy: 440, special: 320 }

// ─────────────────────────────────────────────────────────────────
//  BOSS / CHARACTER CONFIGS
// ─────────────────────────────────────────────────────────────────
const BOSS_CONFIGS = [
  { name: 'IRON FIST',    bc: '#1a1a2e', sc: '#c8a875', gc: '#4488ff', ec: '#00ccff', weapon: 'sword',  style: 'swordsman', hp: 100, spd: 165, diff: 0.55, bg: 'dojo',   music: 0, intro: 'The first true test begins.' },
  { name: 'SHADOW MAGE',  bc: '#1e0a2a', sc: '#b89060', gc: '#cc44ff', ec: '#ee88ff', weapon: 'staff',  style: 'mage',      hp: 120, spd: 145, diff: 0.70, bg: 'city',   music: 1, intro: 'Ancient power flows through her.' },
  { name: 'RED PHANTOM',  bc: '#1a0005', sc: '#d0a070', gc: '#ff2200', ec: '#ff6600', weapon: 'none',   style: 'speedster', hp: 105, spd: 198, diff: 0.82, bg: 'city',   music: 1, intro: 'Too fast to see. Too deadly to ignore.' },
  { name: 'VOID BLADE',   bc: '#0c0018', sc: '#c0a060', gc: '#aa00ff', ec: '#dd88ff', weapon: 'sword',  style: 'swordsman', hp: 138, spd: 152, diff: 0.88, bg: 'shadow', music: 2, intro: 'From the void, I come for you.' },
  { name: 'STORM MONK',   bc: '#001a1a', sc: '#b8a050', gc: '#00ffcc', ec: '#88ffee', weapon: 'staff',  style: 'mage',      hp: 158, spd: 135, diff: 0.94, bg: 'shadow', music: 2, intro: 'The storm does not negotiate.' },
  { name: 'SHADOW KING',  bc: '#040004', sc: '#c09060', gc: '#aa00ff', ec: '#ffffff', weapon: 'sword',  style: 'master',    hp: 200, spd: 162, diff: 1.00, bg: 'shadow', music: 2, intro: 'I am the darkness itself.' },
]

const AI_POOLS = {
  swordsman: ['punch_R', 'kick_R', 'heavy', 'punch_L', 'kick_R'],
  mage:      ['kick_R', 'heavy', 'special', 'punch_R'],
  speedster: ['punch_R', 'punch_L', 'punch_R', 'kick_R', 'punch_L'],
  master:    ['punch_R', 'punch_L', 'kick_R', 'heavy', 'special', 'kick_R'],
}

const COMBO_NAMES = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'RAMPAGE!', 'UNSTOPPABLE!', 'GODLIKE!']

// ─────────────────────────────────────────────────────────────────
//  COLOUR HELPERS
// ─────────────────────────────────────────────────────────────────
function lighten(hex, amt) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + (amt * 255) | 0)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + (amt * 255) | 0)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + (amt * 255) | 0)
  return `rgb(${r},${g},${b})`
}
function darken(hex, amt) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - (amt * 255) | 0)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - (amt * 255) | 0)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - (amt * 255) | 0)
  return `rgb(${r},${g},${b})`
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
  const out = new Float32Array(NJ * 2)
  for (let i = 0; i < NJ * 2; i++) out[i] = a[i] + (b[i] - a[i]) * e
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
function newFighter(isPlayer, bossIdx) {
  const PLAYER_CFG = { bc: '#1a1a2e', sc: '#c8a875', gc: '#4488ff', ec: '#00ccff', weapon: 'sword' }
  const cfg = isPlayer ? PLAYER_CFG : BOSS_CONFIGS[bossIdx % BOSS_CONFIGS.length]
  const boss = BOSS_CONFIGS[bossIdx % BOSS_CONFIGS.length]
  return {
    x: isPlayer ? 110 : 410,
    y: FLOOR, vy: 0, vx: 0,
    onGround: true, facingRight: !!isPlayer,
    hp: isPlayer ? 100 : boss.hp,
    maxHp: isPlayer ? 100 : boss.hp,
    animName: 'idle', animIdx: 0, animT: 0,
    pose: new Float32Array(POSES.idle),
    locked: false, hitActive: false, hitConnected: false,
    action: 'idle', blocking: false,
    stunTimer: 0, invTimer: 0,
    comboCnt: 0, comboTimer: 0,
    hitFlash: 0,
    bodyColor: cfg.bc,
    skinColor: cfg.sc,
    glowColor: cfg.gc,
    eyeColor: cfg.ec,
    weapon: cfg.weapon,
    isPlayer: !!isPlayer,
    speed: isPlayer ? 170 : boss.spd,
    aiTimer: 0, aiDir: 0,
    diff: isPlayer ? 0 : boss.diff,
    style: isPlayer ? 'player' : boss.style,
  }
}

// ─────────────────────────────────────────────────────────────────
//  CANVAS DRAWING — VOLUMETRIC BODY SEGMENTS
// ─────────────────────────────────────────────────────────────────

/**
 * Draw a filled capsule between two points with radii r1 and r2.
 * Includes radial-gradient shading to simulate 3D volume.
 */
function drawSegment(ctx, x1, y1, x2, y2, r1, r2, fillA, fillB, strokeCol, glowColor) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
  if (len < 1) return
  const nx = dy / len, ny = -dx / len

  ctx.save()
  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14 }

  const path = new Path2D()
  path.moveTo(x1 + nx * r1, y1 + ny * r1)
  path.lineTo(x2 + nx * r2, y2 + ny * r2)
  path.arcTo(x2 + nx * r2 + dx * 0.01, y2 + ny * r2 + dy * 0.01, x2 - nx * r2, y2 - ny * r2, r2)
  path.lineTo(x2 - nx * r2, y2 - ny * r2)
  path.lineTo(x1 - nx * r1, y1 - ny * r1)
  path.arcTo(x1 - nx * r1 - dx * 0.01, y1 - ny * r1 - dy * 0.01, x1 + nx * r1, y1 + ny * r1, r1)
  path.closePath()

  // Base gradient along segment length
  const gr = ctx.createLinearGradient(x1, y1, x2, y2)
  gr.addColorStop(0, fillA); gr.addColorStop(1, fillB ?? fillA)
  ctx.fillStyle = gr
  ctx.fill(path)

  // Edge highlight (rim light effect)
  ctx.strokeStyle = strokeCol ?? 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 0.8
  ctx.stroke(path)

  // Highlight strip — makes it look cylindrical/3D
  const hl = ctx.createLinearGradient(
    x1 + nx * r1 * 0.5, y1 + ny * r1 * 0.5,
    x1 - nx * r1 * 0.6, y1 - ny * r1 * 0.6
  )
  hl.addColorStop(0, 'rgba(255,255,255,0.18)')
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hl
  ctx.fill(path)

  ctx.restore()
}

/** Sphere with radial gradient for joints */
function drawJoint(ctx, x, y, r, col, glowColor) {
  ctx.save()
  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 10 }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r)
  g.addColorStop(0, 'rgba(255,255,255,0.35)')
  g.addColorStop(0.5, col)
  g.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

/** Detailed head with glowing slit-pupil eye — Shadow Fight 2 aesthetic */
function drawHead(ctx, x, y, r, faceRight, bodyCol, glowCol, eyeCol) {
  ctx.save()
  if (glowCol) { ctx.shadowColor = glowCol; ctx.shadowBlur = 20 }

  // Head sphere
  const g = ctx.createRadialGradient(
    x - (faceRight ? r * 0.3 : -r * 0.3), y - r * 0.3, r * 0.05,
    x, y, r
  )
  g.addColorStop(0, lighten(bodyCol, 0.4))
  g.addColorStop(0.6, bodyCol)
  g.addColorStop(1, darken(bodyCol, 0.4))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()

  // Head rim
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.shadowBlur = 0

  // Eye socket (dark)
  const ex = x + (faceRight ? r * 0.38 : -r * 0.38), ey = y - r * 0.08
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.beginPath(); ctx.arc(ex, ey, r * 0.32, 0, Math.PI * 2); ctx.fill()

  // Glowing iris
  ctx.shadowColor = eyeCol; ctx.shadowBlur = 16
  const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 0.28)
  eg.addColorStop(0, '#ffffff')
  eg.addColorStop(0.35, eyeCol)
  eg.addColorStop(1, 'rgba(0,0,0,0.8)')
  ctx.fillStyle = eg
  ctx.beginPath(); ctx.arc(ex, ey, r * 0.28, 0, Math.PI * 2); ctx.fill()

  // Slit pupil
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,0,0,0.95)'
  ctx.beginPath()
  ctx.ellipse(ex + (faceRight ? 0.015 : -0.015) * r, ey, r * 0.07, r * 0.23, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/** Draw the full fighter using volumetric segment rendering */
function drawFighter(ctx, f, time) {
  const pose = f.pose
  const flip = f.facingRight ? 1 : -1
  const wx = j => f.x + flip * pose[j * 2]
  const wy = j => f.y - pose[j * 2 + 1]

  // Ground shadow
  ctx.save()
  ctx.globalAlpha = 0.22
  const sw = f.onGround ? 28 : Math.max(6, 28 * (1 - (FLOOR - f.y) / 220))
  const sgr = ctx.createRadialGradient(f.x, FLOOR + 4, 0, f.x, FLOOR + 4, sw)
  sgr.addColorStop(0, 'rgba(0,0,0,0.7)'); sgr.addColorStop(1, 'transparent')
  ctx.fillStyle = sgr
  ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 4, sw, 6, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  const bc = f.bodyColor, sc = f.skinColor, gc = f.glowColor
  const bcDark = darken(bc, 0.3), bcBright = lighten(bc, 0.15)
  const scDark = darken(sc, 0.2)
  const isSpecial = f.animName === 'special'
  const flashAlpha = f.hitFlash > 0 ? f.hitFlash * 0.65 : 0

  // Draw segments layer by layer (back=0, mid=1, front=2)
  for (const layer of [0, 1, 2]) {
    for (const [jA, jB, wA, wB, l] of SEGS) {
      if (l !== layer) continue

      const isBack = layer === 0
      const isSkin = (jA === LE || jA === RE || jB === LH || jB === RH || jA === NECK)
      const baseA = isSkin ? sc : (isBack ? darken(bc, 0.22) : bc)
      const baseB = isSkin ? scDark : (isBack ? darken(bcDark, 0.28) : bcDark)
      const stroke = isBack ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.13)'
      const glow = (!isBack && isSpecial) ? gc : null
      const ra = wA * (isBack ? 0.86 : 1)
      const rb = wB * (isBack ? 0.86 : 1)

      ctx.save()
      drawSegment(ctx, wx(jA), wy(jA), wx(jB), wy(jB), ra, rb, baseA, baseB, stroke, glow)
      // Hit flash tint
      if (flashAlpha > 0) {
        ctx.globalAlpha = flashAlpha * 0.45
        drawSegment(ctx, wx(jA), wy(jA), wx(jB), wy(jB), ra, rb, '#ff3300', '#ff6600', null, null)
      }
      ctx.restore()

      // Front-layer joints
      if (layer === 2 && jB !== LF && jB !== RF) {
        drawJoint(ctx, wx(jB), wy(jB), Math.max(wB - 1, 3.5), isSkin ? sc : bcBright, isSpecial ? gc : null)
      }
    }
  }

  // Boot / foot shapes
  for (const [j, isLeft] of [[LF, true], [RF, false]]) {
    const layer = isLeft ? 0 : 2
    const fx = wx(j), fy = wy(j)
    const kneeJ = isLeft ? LK : RK
    const ang = Math.atan2(wy(kneeJ) - fy, wx(kneeJ) - fx)
    const bootDir = flip * (isLeft ? -1 : 1)
    ctx.save()
    ctx.fillStyle = layer === 0 ? darken(bc, 0.36) : darken(bc, 0.08)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.ellipse(fx + bootDir * 9, fy + 2, 14, 6, ang, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  // Head
  drawHead(ctx, wx(HEAD), wy(HEAD), 13.5, f.facingRight, bc, gc, f.eyeColor)

  // Blocking energy shield
  if (f.blocking) {
    ctx.save()
    ctx.globalAlpha = 0.28 + Math.sin(time * 8) * 0.08
    const shx = wx(CHEST), shy = wy(CHEST)
    const sg = ctx.createRadialGradient(shx, shy, 0, shx, shy, 40)
    sg.addColorStop(0, gc + '99'); sg.addColorStop(0.6, gc + '44'); sg.addColorStop(1, 'transparent')
    ctx.fillStyle = sg
    ctx.beginPath(); ctx.arc(shx, shy, 40, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  // Special move full-body aura
  if (isSpecial) {
    ctx.save()
    ctx.globalAlpha = 0.38 + Math.sin(time * 12) * 0.14
    const ag = ctx.createRadialGradient(f.x, f.y - 42, 0, f.x, f.y - 42, 72)
    ag.addColorStop(0, gc + 'cc'); ag.addColorStop(1, 'transparent')
    ctx.fillStyle = ag
    ctx.beginPath(); ctx.arc(f.x, f.y - 42, 72, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  // Weapon
  if (f.weapon && f.weapon !== 'none') drawWeapon(ctx, f, wx, wy, time)

  // Decrement hit flash
  if (f.hitFlash > 0) f.hitFlash = Math.max(0, f.hitFlash - 0.055)
}

function drawWeapon(ctx, f, wx, wy, time) {
  const hx = wx(RH), hy = wy(RH), ex = wx(RE), ey = wy(RE)
  const ang = Math.atan2(hy - ey, hx - ex)
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.lineCap = 'round'

  if (f.weapon === 'sword') {
    // Blade
    const bg = ctx.createLinearGradient(0, -2.2, 0, 2.2)
    bg.addColorStop(0, '#ddeeff'); bg.addColorStop(0.5, '#8ab4ff'); bg.addColorStop(1, '#334477')
    ctx.fillStyle = bg; ctx.shadowColor = '#6699ff'; ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(-2, 0); ctx.lineTo(48, -1.8); ctx.lineTo(50, 0); ctx.lineTo(48, 1.8)
    ctx.closePath(); ctx.fill()
    // Fuller
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.6; ctx.shadowBlur = 0
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(44, 0); ctx.stroke()
    // Guard
    ctx.fillStyle = '#778899'; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.roundRect(5, -10, 6, 20, 3); ctx.fill()
    // Grip
    ctx.fillStyle = '#3a2010'; ctx.shadowBlur = 0
    ctx.beginPath(); ctx.roundRect(-14, -3.5, 14, 7, 3); ctx.fill()
    ctx.fillStyle = 'rgba(255,200,100,0.35)'
    for (let i = -12; i < 0; i += 4) ctx.fillRect(i, -3, 2, 6)
  } else if (f.weapon === 'staff') {
    const sg = ctx.createLinearGradient(0, -3, 0, 3)
    sg.addColorStop(0, '#c8a060'); sg.addColorStop(1, '#6a4a20')
    ctx.fillStyle = sg; ctx.shadowColor = f.glowColor; ctx.shadowBlur = 16
    ctx.beginPath(); ctx.roundRect(-30, -3, 88, 6, 3); ctx.fill()
    for (const [ox, or] of [[62, 9], [-28, 7]]) {
      const og = ctx.createRadialGradient(ox, -3, 0, ox, -3, or)
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, f.glowColor); og.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = og; ctx.shadowColor = f.glowColor; ctx.shadowBlur = 22
      ctx.beginPath(); ctx.arc(ox, -3, or, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
//  BACKGROUNDS
// ─────────────────────────────────────────────────────────────────
function drawBG(ctx, bgType, time) {
  ctx.clearRect(0, 0, CW, CH)

  if (bgType === 'dojo') {
    // Dark wood + stone
    ctx.fillStyle = '#120600'; ctx.fillRect(0, 0, CW, CH)
    // Stone wall blocks
    ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 0.7
    for (let y = 0; y < FLOOR; y += 28) {
      for (let x = (y % 56 === 0 ? 0 : 28); x < CW; x += 56) {
        ctx.strokeRect(x + 1, y + 1, 54, 26)
      }
    }
    // Wooden floor planks
    for (let x = 0; x < CW; x += 44) {
      ctx.fillStyle = x % 88 === 0 ? '#2a1008' : '#251006'
      ctx.fillRect(x, FLOOR, 44, CH - FLOOR)
      ctx.strokeStyle = '#1a0904'; ctx.lineWidth = 0.4
      ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x, CH); ctx.stroke()
    }
    // Dark pillars with depth gradient
    for (const px of [0, CW - 28]) {
      const pg = ctx.createLinearGradient(px, 0, px + 28, 0)
      pg.addColorStop(0, '#0a0400'); pg.addColorStop(0.35, '#1a0900'); pg.addColorStop(1, '#0a0400')
      ctx.fillStyle = pg; ctx.fillRect(px, 0, 28, FLOOR)
    }
    // Animated lanterns
    for (const [lx, ly] of [[28, 30], [CW / 2, 18], [CW - 28, 30]]) {
      const fl = 0.88 + Math.sin(time * 6.8 + lx) * 0.06
      const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 120)
      rg.addColorStop(0, `rgba(255,140,0,${0.10 * fl})`); rg.addColorStop(1, 'transparent')
      ctx.fillStyle = rg; ctx.fillRect(lx - 120, ly - 80, 240, 200)
      ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 22 * fl
      ctx.fillStyle = '#6b1200'
      ctx.beginPath(); ctx.roundRect(lx - 11, ly, 22, 24, 4); ctx.fill()
      ctx.fillStyle = `rgba(255,${100 + (Math.sin(time * 9 + lx) * 22) | 0},0,0.9)`
      ctx.beginPath(); ctx.roundRect(lx - 8, ly + 4, 16, 16, 2); ctx.fill()
      ctx.restore()
    }
    ctx.strokeStyle = 'rgba(255,100,0,0.14)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(CW, FLOOR); ctx.stroke()

  } else if (bgType === 'city') {
    ctx.fillStyle = '#00000e'; ctx.fillRect(0, 0, CW, CH)
    // Moon
    ctx.save(); ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 45
    ctx.fillStyle = '#cce0ff'; ctx.beginPath(); ctx.arc(430, 44, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    // Buildings with lit windows
    for (const [bx, bh, bw, col] of [
      [0,145,50,'#05000f'],[48,105,38,'#07001a'],[90,165,46,'#04000c'],
      [140,78,42,'#08001f'],[190,135,52,'#050012'],[250,95,38,'#09001f'],
      [295,158,44,'#040010'],[345,72,40,'#0a0020'],[390,128,44,'#06001a'],[440,90,36,'#080020'],
    ]) {
      ctx.fillStyle = col; ctx.fillRect(bx, FLOOR - bh, bw, bh)
      for (let wy = FLOOR - bh + 10; wy < FLOOR - 10; wy += 13) {
        for (let wx2 = bx + 5; wx2 < bx + bw - 5; wx2 += 9) {
          if ((wx2 * 7 ^ wy * 3 ^ bx) % 6 < 3) {
            const br = 0.3 + Math.sin(time * 0.4 + wx2 * 0.4 + wy * 0.3) * 0.18
            if (br > 0.18) {
              ctx.globalAlpha = br
              ctx.fillStyle = (wx2 * wy * bx) % 5 === 0 ? '#00ccff' : '#ffee88'
              ctx.fillRect(wx2, wy, 5, 8)
              ctx.globalAlpha = 1
            }
          }
        }
      }
      // Rooftop antenna
      if (bh > 100) {
        ctx.strokeStyle = '#1a0030'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(bx + bw / 2, FLOOR - bh); ctx.lineTo(bx + bw / 2, FLOOR - bh - 20); ctx.stroke()
      }
    }
    // Rain
    ctx.strokeStyle = 'rgba(140,180,255,0.06)'; ctx.lineWidth = 0.7
    for (let i = 0; i < 60; i++) {
      const rx = (i * 57 + time * 200) % CW, ry = (time * 280 + i * 73) % (FLOOR + 20)
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 2, ry + 13); ctx.stroke()
    }
    ctx.fillStyle = '#00000a'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
    // Neon reflections on wet floor
    for (const [nx, col] of [[60, '#ff00ff'], [200, '#00ffcc'], [340, '#ff4400'], [440, '#ffaa00']]) {
      ctx.save(); ctx.globalAlpha = 0.06 + Math.sin(time + nx) * 0.025
      ctx.fillStyle = col; ctx.fillRect(nx, FLOOR, 40, CH - FLOOR); ctx.restore()
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.08)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(CW, FLOOR); ctx.stroke()

  } else {
    // Shadow realm
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH)
    // Animated void orbs
    for (let i = 0; i < 10; i++) {
      const ox = 52 + i * 46, oy = 28 + Math.sin(time * 0.5 + i * 0.7) * 42
      const or = ctx.createRadialGradient(ox, oy, 0, ox, oy, 55)
      or.addColorStop(0, `rgba(140,0,255,${0.12 + Math.sin(time * 0.7 + i) * 0.05})`)
      or.addColorStop(1, 'transparent')
      ctx.fillStyle = or; ctx.fillRect(ox - 56, oy - 56, 112, 112)
    }
    // Ground cracks with purple glow
    ctx.save(); ctx.strokeStyle = '#6600cc'; ctx.lineWidth = 1.5; ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 14
    for (const [x1, y1, x2, y2] of [
      [55, FLOOR, 96, FLOOR - 11], [175, FLOOR, 218, FLOOR - 15],
      [298, FLOOR, 340, FLOOR - 10], [398, FLOOR, 444, FLOOR - 14],
      [148, FLOOR, 118, FLOOR - 9],
    ]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    }
    ctx.restore()
    // Rising mist
    for (let i = 0; i < 5; i++) {
      const mx = (i * 115 + time * 22) % CW
      ctx.save(); ctx.globalAlpha = 0.04 + Math.sin(time * 0.4 + i) * 0.02
      ctx.fillStyle = '#8800cc'; ctx.fillRect(mx, FLOOR - 32, 85 + Math.sin(time + i) * 18, 42)
      ctx.restore()
    }
    ctx.fillStyle = '#060003'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
    ctx.strokeStyle = 'rgba(150,0,255,0.2)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(CW, FLOOR); ctx.stroke()
  }
}

// ─────────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────────
function spawnHit(pts, x, y, col, n = 20, spd = 5.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + Math.random() * 0.7 - 0.35
    const s = spd * (0.4 + Math.random() * 0.9)
    pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, col, life: 1, d: 0.042 + Math.random() * 0.04, sz: 2.5 + Math.random() * 4, glow: true })
  }
}
function spawnSpecialBurst(pts, x, y, col) {
  for (let i = 0; i < 64; i++) {
    const a = Math.PI * 2 * i / 64, s = 5 + Math.random() * 13
    pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, col, life: 1, d: 0.013 + Math.random() * 0.017, sz: 3 + Math.random() * 7, glow: true })
  }
}
function spawnBlood(pts, x, y) {
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (-0.9 + Math.random() * 1.8)
    pts.push({ x, y, vx: Math.cos(a) * (1 + Math.random() * 4), vy: Math.sin(a) * (2 + Math.random() * 6) - 3, col: '#cc0000', life: 1, d: 0.028 + Math.random() * 0.022, sz: 2 + Math.random() * 3, glow: false })
  }
}
function spawnDust(pts, x, y) {
  for (let i = 0; i < 9; i++) {
    pts.push({
      x: x + Math.random() * 28 - 14, y,
      vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3.8,
      col: `rgba(${160 + (Math.random() * 40) | 0},${140 + (Math.random() * 30) | 0},${100 + (Math.random() * 20) | 0},0.6)`,
      life: 1, d: 0.028 + Math.random() * 0.03, sz: 4 + Math.random() * 9, glow: false,
    })
  }
}
function tickParticles(pts, dt) {
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    p.x += p.vx; p.y += p.vy; p.vx *= 0.86; p.vy *= 0.86; p.vy += 0.35; p.life -= p.d
    if (p.life <= 0) pts.splice(i, 1)
  }
}
function drawParticles(ctx, pts) {
  for (const p of pts) {
    ctx.save(); ctx.globalAlpha = p.life * 0.9
    if (p.glow) { ctx.shadowColor = p.col; ctx.shadowBlur = 12 }
    ctx.fillStyle = p.col
    ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────
//  COMBAT
// ─────────────────────────────────────────────────────────────────
function doAction(f, name) {
  if ((f.locked && name !== 'block') || f.stunTimer > 0) return false
  f.action = name; f.hitConnected = false; setAnim(f, name)
  if (name === 'punch_R' || name === 'punch_L') SFX.punch()
  else if (name === 'heavy') SFX.heavy()
  else if (name === 'kick_R') SFX.kick()
  else if (name === 'special') SFX.special()
  return true
}

function doJump(f) {
  if (!f.onGround) return
  f.vy = -570; f.onGround = false; SFX.step()
}

function aiTick(e, p, dt) {
  e.aiTimer -= dt
  if (e.aiTimer > 0 || e.stunTimer > 0 || e.locked) return
  const dist = Math.abs(e.x - p.x)
  const eff = Math.min(e.diff, 1)
  if (p.hitActive && dist < 112 && Math.random() < eff * 0.55) { doAction(e, 'block'); e.aiTimer = 0.28; return }
  if (dist > 116) { e.aiDir = e.x > p.x ? -1 : 1; e.aiTimer = 0.05 }
  else if (dist < 50 && Math.random() < 0.3) { e.aiDir = e.x > p.x ? 1 : -1; e.aiTimer = 0.10 }
  else {
    e.aiDir = 0
    if (Math.random() < eff && dist < 120) {
      const pool = AI_POOLS[e.style] ?? AI_POOLS.swordsman
      doAction(e, pool[Math.floor(Math.random() * pool.length)])
      e.aiTimer = 0.18 + Math.random() * (0.45 - eff * 0.22)
    } else {
      if (dist > 165 && Math.random() < 0.12 * eff) doJump(e)
      e.aiTimer = 0.07
    }
  }
}

function resolveHit(atk, def, pts) {
  if (!atk.hitActive || atk.hitConnected) return null
  const dist = Math.abs(atk.x - def.x)
  const wpBonus = atk.weapon === 'sword' ? 22 : atk.weapon === 'staff' ? 14 : 0
  const rng = (RANGE[atk.action] ?? 86) + wpBonus
  if (dist > rng) return null
  const facing = atk.facingRight ? atk.x < def.x : atk.x > def.x
  if (!facing) return null
  atk.hitConnected = true; atk.hitActive = false

  if (def.blocking && atk.action !== 'special') {
    SFX.block(); spawnHit(pts, (atk.x + def.x) / 2, def.y - 58, '#ffd700', 10, 3); return 'block'
  }
  if (def.invTimer > 0) return null

  const wpDmg = atk.weapon === 'sword' ? 12 : atk.weapon === 'staff' ? 7 : 0
  const comboDmg = Math.min((atk.comboCnt ?? 0) * 2, 14)
  const dmg = Math.round((DMG[atk.action] ?? 9) + wpDmg + comboDmg)

  def.hp = Math.max(0, def.hp - dmg)
  def.stunTimer = STUN[atk.action] ?? 0.22
  def.hitFlash = 1; def.invTimer = 0.12
  const dir = atk.x < def.x ? 1 : -1
  def.vx = dir * 380
  const pv = PUSHV[atk.action]
  if (pv) { def.vy = -pv; def.onGround = false }

  setAnim(def, def.stunTimer > 0.5 ? 'knockdown' : 'hurt')
  SFX.hurt()

  const hx = (atk.x + def.x) / 2, hy = def.y - 56
  if (atk.action === 'special') spawnSpecialBurst(pts, hx, hy, atk.glowColor)
  else { spawnHit(pts, hx, hy, '#ff3300', 20, 5.5); spawnBlood(pts, hx, hy - 8) }

  atk.comboCnt = (atk.comboCnt ?? 0) + 1
  atk.comboTimer = 1.9
  return dmg
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function StickmanFighterPremium({ game, levelData, studentId, onFinish }) {
  const canvasRef  = useRef(null)
  const gRef       = useRef(null)
  const rafRef     = useRef(null)
  const lastRef    = useRef(null)
  const keysRef    = useRef({})
  const moveRef    = useRef(0)

  const [screen, setScreen]   = useState('menu')   // 'menu' | 'fight' | 'gameover' | 'victory'
  const [bossIdx, setBossIdx] = useState(0)
  const [hud, setHud]         = useState({ playerHp: 100, maxPlayerHp: 100, enemyHp: 100, maxEnemyHp: 100, combo: 0, comboName: '', round: 1, message: '' })

  const bossIdxRef = useRef(bossIdx)
  useEffect(() => { bossIdxRef.current = bossIdx }, [bossIdx])

  const msgTimerRef = useRef(null)
  function showMsg(txt, dur = 3000) {
    setHud(h => ({ ...h, message: txt }))
    clearTimeout(msgTimerRef.current)
    if (dur > 0) msgTimerRef.current = setTimeout(() => setHud(h => ({ ...h, message: '' })), dur)
  }

  // ── Start fight ──────────────────────────────────────────────────
  function startFight(idx) {
    const boss = BOSS_CONFIGS[idx % BOSS_CONFIGS.length]
    const player = newFighter(true, idx)
    const enemy = newFighter(false, idx)

    gRef.current = {
      player, enemy,
      particles: [], time: 0,
      phase: 'fight', koTimer: 0,
      bgType: boss.bg, shake: 0,
      bossIdx: idx,
    }

    setBossIdx(idx)
    setScreen('fight')
    setHud({
      playerHp: 100, maxPlayerHp: 100,
      enemyHp: boss.hp, maxEnemyHp: boss.hp,
      combo: 0, comboName: '', round: idx + 1, message: boss.intro,
    })
    clearTimeout(msgTimerRef.current)
    msgTimerRef.current = setTimeout(() => setHud(h => ({ ...h, message: '' })), 3000)
    startBGMusic(boss.music ?? 0)
  }

  // ── Game loop ────────────────────────────────────────────────────
  useEffect(() => {
    lastRef.current = performance.now()

    function loop(now) {
      const dt = Math.min((now - (lastRef.current ?? now)) / 1000, 0.05)
      lastRef.current = now
      if (gRef.current) { updateGame(dt); renderFrame() }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKey = e => {
      keysRef.current[e.code] = e.type === 'keydown'
      if (e.type === 'keydown') handleKeyDown(e.code)
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
    if (code === 'KeyZ') doAction(p, 'punch_R')
    if (code === 'KeyX') doAction(p, 'heavy')
    if (code === 'KeyC') doAction(p, 'kick_R')
    if (code === 'KeyV') doAction(p, 'special')
    if (code === 'ArrowUp' || code === 'KeyW') { if (p.onGround) doJump(p) }
  }

  function updateGame(dt) {
    const g = gRef.current; if (!g) return
    g.time += dt
    if (g.shake > 0) { g.shake -= dt * 5; if (g.shake < 0) g.shake = 0 }

    if (g.phase === 'ko') {
      g.koTimer -= dt
      if (g.koTimer <= 0) {
        const idx = g.bossIdx, pWin = g.player.hp > 0
        gRef.current = null
        if (pWin) {
          const next = idx + 1
          if (next >= BOSS_CONFIGS.length) {
            stopBGMusic()
            if (studentId) saveGameScore(studentId, game?.id, levelData?.level, 1000)
            setScreen('victory')
          } else {
            setTimeout(() => startFight(next), 800)
          }
        } else {
          stopBGMusic()
          if (studentId) saveGameScore(studentId, game?.id, levelData?.level, Math.round(idx * 100))
          setScreen('gameover')
        }
      }
      return
    }

    const p = g.player, e = g.enemy, K = keysRef.current

    // Player movement
    if (!p.locked && p.stunTimer <= 0) {
      const dx = (K['ArrowRight'] || K['KeyD'] ? 1 : 0) - (K['ArrowLeft'] || K['KeyA'] ? 1 : 0)
      const blk = !!(K['ArrowDown'] || K['KeyS'])
      p.blocking = blk && p.onGround
      if (p.blocking) { if (!p.locked) setAnim(p, 'block') }
      else if (dx !== 0) {
        const spd = K['ShiftLeft'] || K['ShiftRight'] ? 230 : 170
        p.vx = dx * spd; p.facingRight = dx > 0
        if (p.onGround) setAnim(p, Math.abs(p.vx) > 190 ? 'run' : 'walk')
      } else { p.vx *= 0.5; if (p.onGround && !p.locked) setAnim(p, 'idle') }
    } else { p.vx *= 0.6; p.blocking = false }

    // AI — facing always from position (prevents phantom hits)
    e.facingRight = e.x < p.x
    aiTick(e, p, dt)
    if (!e.locked && e.stunTimer <= 0) {
      e.vx = e.aiDir * e.speed
      if (e.aiDir !== 0 && e.onGround) setAnim(e, 'walk')
      else if (e.onGround && !e.locked) setAnim(e, 'idle')
    } else e.vx *= 0.6

    // Physics
    for (const f of [p, e]) {
      if (f.stunTimer > 0) { f.stunTimer -= dt; if (f.stunTimer <= 0 && f.animName === 'knockdown') setAnim(f, 'getup') }
      if (f.invTimer > 0) f.invTimer -= dt
      if ((f.comboTimer ?? 0) > 0) { f.comboTimer -= dt; if (f.comboTimer <= 0) f.comboCnt = 0 }
      if (!f.onGround) {
        f.vy += 1950 * dt; f.y += f.vy * dt
        if (f.y >= FLOOR) {
          f.y = FLOOR; f.vy = 0; f.onGround = true
          SFX.land(); spawnDust(g.particles, f.x, FLOOR)
          if (!f.locked) setAnim(f, 'idle')
        }
      }
      f.x += f.vx * dt; f.x = Math.max(28, Math.min(CW - 28, f.x))
      tickAnim(f, dt)
      if (!f.locked && f.onGround && f.isPlayer) {
        if (!(K['ArrowLeft'] || K['KeyA'] || K['ArrowRight'] || K['KeyD'])) p.facingRight = p.x < e.x
      }
    }

    const h1 = resolveHit(p, e, g.particles)
    const h2 = resolveHit(e, p, g.particles)
    if (h1 && h1 !== 'block') g.shake = h1 > 20 ? 0.38 : 0.18
    if (h2 && h2 !== 'block') g.shake = h2 > 20 ? 0.30 : 0.14

    tickParticles(g.particles, dt)

    if ((p.hp <= 0 || e.hp <= 0) && g.phase === 'fight') {
      g.phase = 'ko'; g.koTimer = 2.6
      const pWin = p.hp > 0
      if (pWin) { setAnim(e, 'knockdown'); setAnim(p, 'victory'); SFX.ko(); SFX.victory(); showMsg('⚡ KO — VICTORY!', 99999) }
      else { setAnim(p, 'knockdown'); SFX.ko(); showMsg('💀 KO — DEFEATED', 99999) }
    }

    // Update HUD
    setHud(h => ({
      ...h,
      playerHp: Math.max(0, p.hp),
      enemyHp: Math.max(0, e.hp),
      combo: p.comboCnt ?? 0,
      comboName: COMBO_NAMES[Math.min(p.comboCnt ?? 0, COMBO_NAMES.length - 1)] ?? '',
    }))
  }

  function renderFrame() {
    const canvas = canvasRef.current; if (!canvas) return
    const g = gRef.current; if (!g) return
    const ctx = canvas.getContext('2d')
    ctx.save()
    if (g.shake > 0) {
      const s = g.shake * 9
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
    }
    drawBG(ctx, g.bgType, g.time)
    const dist = Math.abs(g.player.x - g.enemy.x)
    if (dist < 68) {
      ctx.save(); ctx.globalAlpha = (1 - dist / 68) * 0.12; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, CW, CH); ctx.restore()
    }
    if (g.player.x < g.enemy.x) { drawFighter(ctx, g.player, g.time); drawFighter(ctx, g.enemy, g.time) }
    else { drawFighter(ctx, g.enemy, g.time); drawFighter(ctx, g.player, g.time) }
    drawParticles(ctx, g.particles)
    ctx.restore()
  }

  // ── Touch controls ───────────────────────────────────────────────
  function dpadDown(dir) {
    AC()
    if (dir === 'up') { const g = gRef.current; if (g?.player?.onGround) doJump(g.player) }
    else {
      const kmap = { lf: 'ArrowLeft', rt: 'ArrowRight', dn: 'ArrowDown' }
      keysRef.current[kmap[dir]] = true
    }
  }
  function dpadUp(dir) {
    const kmap = { lf: 'ArrowLeft', rt: 'ArrowRight', dn: 'ArrowDown' }
    keysRef.current[kmap[dir]] = false
    if (dir === 'dn') {
      const g = gRef.current
      if (g) { g.player.blocking = false; if (!g.player.locked) setAnim(g.player, 'idle') }
    }
  }
  function tbAttack(act) {
    AC(); const g = gRef.current; if (g) doAction(g.player, act)
  }
  function setBlock(down) {
    keysRef.current['ArrowDown'] = down
    const g = gRef.current; if (!g) return
    g.player.blocking = down && g.player.onGround
    if (down && !g.player.locked) setAnim(g.player, 'block')
    else if (!down && !g.player.locked) setAnim(g.player, 'idle')
  }

  // ── Style helpers ────────────────────────────────────────────────
  const dpBtn = {
    width: 40, height: 40, borderRadius: 10,
    border: '1px solid #2a0044',
    background: 'linear-gradient(135deg,#0e0020,#080014)',
    color: '#7755aa', fontWeight: 900, fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    touchAction: 'none', WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04)',
    fontFamily: 'inherit',
  }

  const boss = BOSS_CONFIGS[bossIdx % BOSS_CONFIGS.length]
  const pPct = Math.max(0, (hud.playerHp / hud.maxPlayerHp) * 100)
  const ePct = Math.max(0, (hud.enemyHp / hud.maxEnemyHp) * 100)
  const pBarBg = pPct > 50 ? 'linear-gradient(90deg,#1a7a3a,#4ade80)' : pPct > 25 ? 'linear-gradient(90deg,#7a6010,#f59e0b)' : 'linear-gradient(90deg,#7a1a1a,#ef4444)'

  // ── MENU ──────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <div style={{ background: 'radial-gradient(ellipse at 50% 30%,#1a0035,#050010 70%)', borderRadius: 16, padding: '32px 20px', textAlign: 'center', fontFamily: 'Courier New, monospace', color: '#EEE' }}>
        <div style={{ fontSize: 52, marginBottom: 10, filter: 'drop-shadow(0 0 20px #aa00ff)' }}>⚔️</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 6, color: '#e0c0ff', textShadow: '0 0 30px #cc00ff, 0 0 60px #9900cc', margin: '0 0 4px' }}>SHADOW FIGHT</h1>
        <p style={{ color: '#440066', fontSize: 8, letterSpacing: 5, margin: '0 0 28px' }}>PREMIUM EDITION</p>
        <div style={{ marginBottom: 12 }}>
          {BOSS_CONFIGS.map((b, i) => (
            <div key={i} style={{ color: i === 0 ? '#aa66ff' : '#220033', fontSize: 10, marginBottom: 2 }}>
              {i === 0 ? '▶' : ' '} Round {i + 1}: {b.name}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '20px 0 14px' }}>
          <button
            onClick={() => { AC(); startFight(0) }}
            style={{ padding: '15px 36px', borderRadius: 14, background: 'linear-gradient(135deg,#5500cc,#aa00ff)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', letterSpacing: 2, boxShadow: '0 6px 28px rgba(170,0,255,.5), inset 0 1px 0 rgba(255,255,255,.15)', fontFamily: 'inherit' }}
          >
            ⚔️ FIGHT
          </button>
        </div>
        <p style={{ color: '#220033', fontSize: 8, letterSpacing: 1 }}>Arrow keys: move/block · Z=Punch · X=Heavy · C=Kick · V=Special · Shift=Sprint</p>
      </div>
    )
  }

  // ── GAMEOVER / VICTORY ────────────────────────────────────────────
  if (screen === 'gameover' || screen === 'victory') {
    const isVic = screen === 'victory'
    return (
      <div style={{ background: 'radial-gradient(ellipse at 50% 30%,#1a0035,#050010 70%)', borderRadius: 16, padding: '44px 24px', textAlign: 'center', fontFamily: 'Courier New, monospace', color: '#EEE' }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>{isVic ? '🏆' : '💀'}</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: isVic ? '#ffd700' : '#ef4444', letterSpacing: 4, marginBottom: 12, textShadow: isVic ? '0 0 30px #ffd700' : '0 0 30px #ef4444' }}>
          {isVic ? 'CHAMPION!' : 'DEFEATED'}
        </h2>
        <p style={{ color: '#664488', fontSize: 12, marginBottom: 20, lineHeight: 1.7 }}>
          {isVic ? `All ${BOSS_CONFIGS.length} opponents defeated.\nYou are the Shadow King.` : `Fell in round ${bossIdx + 1} against ${boss.name}.`}
        </p>
        <button
          onClick={() => { stopBGMusic(); setScreen('menu'); setBossIdx(0) }}
          style={{ padding: '13px 30px', borderRadius: 12, background: 'linear-gradient(135deg,#5500cc,#aa00ff)', color: 'white', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← MENU
        </button>
      </div>
    )
  }

  // ── FIGHT SCREEN ──────────────────────────────────────────────────
  return (
    <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', fontFamily: 'Courier New, monospace', userSelect: 'none', touchAction: 'none' }}>

      {/* HUD */}
      <div style={{ background: 'linear-gradient(180deg,#070010,#040008)', padding: '10px 14px 8px', borderBottom: '1px solid #1a0030' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Player HP */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#88aaff', fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>YOU</span>
              <span style={{ color: pPct > 50 ? '#4ade80' : pPct > 25 ? '#fbbf24' : '#f87171', fontSize: 9, fontWeight: 700 }}>{Math.ceil(hud.playerHp)}</span>
            </div>
            <div style={{ height: 11, background: '#0a001a', borderRadius: 6, border: '1px solid #2a0040', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pPct}%`, background: pBarBg, borderRadius: 6, transition: 'width 0.1s' }} />
            </div>
          </div>

          {/* Centre info */}
          <div style={{ textAlign: 'center', minWidth: 62 }}>
            {(hud.combo ?? 0) >= 2 && (
              <>
                <div style={{ color: (hud.combo ?? 0) >= 5 ? '#ff0000' : '#ff6600', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{hud.combo}✕</div>
                <div style={{ fontSize: 7, color: '#ff8800', fontWeight: 700, letterSpacing: 1, height: 11 }}>{hud.comboName}</div>
              </>
            )}
            <div style={{ color: '#550066', fontSize: 7, letterSpacing: 1 }}>ROUND {hud.round}</div>
          </div>

          {/* Enemy HP */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#f87171', fontSize: 9, fontWeight: 700 }}>{Math.ceil(hud.enemyHp)}</span>
              <span style={{ color: '#ff8888', fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>{boss.name}</span>
            </div>
            <div style={{ height: 11, background: '#0a001a', borderRadius: 6, border: '1px solid #2a0040', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${ePct}%`, background: 'linear-gradient(270deg,#7a1a1a,#f87171)', borderRadius: 6, transition: 'width 0.1s', marginLeft: 'auto' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Message bar */}
      {hud.message && (
        <div style={{ minHeight: 22, padding: '4px 14px', textAlign: 'center', fontSize: 11, fontWeight: 900, letterSpacing: 2, color: '#cc88ff', background: 'linear-gradient(90deg,transparent,rgba(120,0,200,.12),transparent)', borderBottom: '1px solid rgba(120,0,200,.15)' }}>
          {hud.message}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={CW} height={CH} style={{ width: '100%', display: 'block' }} />

      {/* Controls */}
      <div style={{ background: 'linear-gradient(180deg,#040008,#020005)', borderTop: '1px solid #15002a', padding: '10px 10px 14px', display: 'flex', gap: 6, alignItems: 'flex-end', justifyContent: 'center' }}>

        {/* D-pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,40px)', gridTemplateRows: 'repeat(3,40px)', gap: 4, flexShrink: 0 }}>
          {[
            [null], [{ id: 'up', label: '↑' }], [null],
            [{ id: 'lf', label: '←' }], [{ center: true }], [{ id: 'rt', label: '→' }],
            [null], [{ id: 'dn', label: '↓' }], [null],
          ].map((item, i) => {
            const c = item[0]
            if (!c) return <div key={i} />
            if (c.center) return <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚔️</div>
            return (
              <button key={i}
                onPointerDown={e => { e.preventDefault(); dpadDown(c.id) }}
                onPointerUp={e => { e.preventDefault(); if (c.id !== 'up') dpadUp(c.id) }}
                onPointerLeave={e => { if (c.id !== 'up') dpadUp(c.id) }}
                onPointerCancel={e => { if (c.id !== 'up') dpadUp(c.id) }}
                style={dpBtn}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Attack buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, flex: 1, maxWidth: 270 }}>
          {[
            ['PUNCH', 'punch_R', '#ff4400', false],
            ['HEAVY', 'heavy',   '#cc2200', false],
            ['KICK',  'kick_R',  '#aa0066', false],
            ['BLOCK', 'block',   '#0055ee', true],
            ['⭐ SPECIAL', 'special', '#8800ff', false],
          ].map(([lb, act, col, isBlock]) => (
            <button key={act}
              onPointerDown={e => { e.preventDefault(); isBlock ? setBlock(true) : tbAttack(act) }}
              onPointerUp={e => { e.preventDefault(); if (isBlock) setBlock(false) }}
              onPointerLeave={e => { if (isBlock) setBlock(false) }}
              onPointerCancel={e => { if (isBlock) setBlock(false) }}
              style={{
                padding: '9px 2px', borderRadius: 10,
                border: `1px solid ${col}44`,
                background: `linear-gradient(135deg,${col}1a,${col}08)`,
                color: col, fontWeight: 900, fontSize: 9, cursor: 'pointer',
                touchAction: 'none', WebkitTapHighlightColor: 'transparent',
                fontFamily: 'inherit', letterSpacing: '0.5px',
                boxShadow: `0 2px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06)`,
                gridColumn: act === 'special' ? 'span 2' : 'auto',
              }}
            >
              {lb}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
