import { useState, useEffect, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// AUDIO ENGINE — level-aware, layered synthesis
// ═══════════════════════════════════════════════════════════════════
let _audioCtx = null
function AC() {
  if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch {}
  if (_audioCtx?.state === 'suspended') _audioCtx.resume()
  return _audioCtx
}

function osc(freq, type, dur, vol, delay = 0, pitchEnd = null) {
  const a = AC(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.connect(g); g.connect(a.destination)
  o.type = type
  const t = a.currentTime + delay
  o.frequency.setValueAtTime(freq, t)
  if (pitchEnd) o.frequency.exponentialRampToValueAtTime(pitchEnd, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.start(t); o.stop(t + dur + 0.05)
}

function noise(vol, dur, lo = 200, hi = 800, delay = 0) {
  const a = AC(); if (!a) return
  const len = Math.ceil(a.sampleRate * (dur + 0.05))
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  const g = a.createGain()
  const fLo = a.createBiquadFilter(), fHi = a.createBiquadFilter()
  fLo.type = 'lowpass';  fLo.frequency.value = hi
  fHi.type = 'highpass'; fHi.frequency.value = lo
  src.buffer = buf
  src.connect(fHi); fHi.connect(fLo); fLo.connect(g); g.connect(a.destination)
  const t = a.currentTime + delay
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.start(t); src.stop(t + dur + 0.1)
}

// Level-aware SFX — sounds evolve as player progresses through bosses
function makeSFX(bossIdx = 0) {
  const lvl = Math.min(bossIdx, 9)
  const tier = lvl < 3 ? 0 : lvl < 6 ? 1 : lvl < 9 ? 2 : 3

  return {
    punch: () => {
      // Tier 0: dry thud. Tier 1: crack. Tier 2: meaty hit. Tier 3: bone-crunching
      const base = [180, 210, 240, 260][tier]
      noise(0.45 + tier * 0.08, 0.06 + tier * 0.01, 300, 700)
      osc(base, 'sawtooth', 0.07 + tier * 0.01, 0.25 + tier * 0.04, 0.015, base * 0.55)
    },
    kick: () => {
      noise(0.55 + tier * 0.1, 0.09 + tier * 0.015, 150, 500)
      osc(100 + tier * 15, 'sawtooth', 0.12, 0.35 + tier * 0.05, 0.02, 70)
    },
    block: () => {
      // Tier 0: soft thump. Tier 3: steel clash
      if (tier < 2) {
        noise(0.3, 0.06, 400, 1000)
        osc(800, 'square', 0.04, 0.2)
      } else {
        osc(1200 + tier * 150, 'square', 0.035, 0.32)
        osc(750, 'square', 0.05, 0.22, 0.02)
        noise(0.25, 0.08, 600, 2000)
      }
    },
    whoosh: () => {
      noise(0.12 + tier * 0.04, 0.14, 800, 3000)
      osc(250 + tier * 50, 'sine', 0.1, 0.08, 0.02, 180)
    },
    hurt: () => {
      noise(0.35 + tier * 0.05, 0.14, 200, 600)
      osc(130 + tier * 10, 'sawtooth', 0.16, 0.28, 0.04, 80)
    },
    land: () => {
      noise(0.22 + tier * 0.04, 0.07, 60, 250)
    },
    special: () => {
      const freqs = [[180,340,520,780],[200,380,600,900,1200],[150,300,500,750,1100,1600],[100,220,400,700,1100,1800,2600]][tier]
      freqs.forEach((f, i) => osc(f, 'sine', 0.32 + tier * 0.06, 0.28 - i * 0.02, i * 0.045))
      noise(0.15 + tier * 0.08, 0.4, 300, 4000 + tier * 1000)
    },
    ko: () => {
      [320, 250, 190, 135, 90].forEach((f, i) => osc(f, 'sawtooth', 0.5, 0.4 + tier * 0.05, i * 0.24))
      noise(0.3, 0.6, 100, 400, 0.1)
    },
    victory: () => {
      const melody = [
        [523, 659, 784],
        [523, 659, 784, 1047],
        [523, 659, 784, 1047, 1319],
        [523, 659, 784, 1047, 1319, 1568],
      ][tier]
      melody.forEach((f, i) => osc(f, 'triangle', 0.38, 0.3 - i * 0.01, i * 0.12))
    },
    metal: () => {
      osc(1400 + tier * 200, 'square', 0.04 + tier * 0.01, 0.22 + tier * 0.05)
      osc(900, 'square', 0.035, 0.16, 0.035)
    },
    crowd: () => {
      // ambient crowd roar, intensifies with tier
      noise(0.06 + tier * 0.025, 0.8, 80, 600)
    },
    announcer: (text) => {
      // synthesised "voice" effect — rising then falling tone burst
      const pitches = text === 'fight' ? [320, 420, 340] : text === 'ko' ? [200, 140, 100] : [380, 480, 380]
      pitches.forEach((f, i) => osc(f, 'sawtooth', 0.18, 0.22, i * 0.14, f * 0.7))
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const CW = 480, CH = 340, FLOOR = CH - 56
const GRAVITY = 1900
const WALK_SPEED = 168
const JUMP_VY = -540
const WALL_L = 28, WALL_R = CW - 28

// ═══════════════════════════════════════════════════════════════════
// SKELETON — 17 joints, y+ = UP in local space
// ═══════════════════════════════════════════════════════════════════
const J = {
  HIP:0, SPINE:1, CHEST:2, NECK:3, HEAD:4,
  LS:5, LE:6, LH:7,   // left shoulder/elbow/hand
  RS:8, RE:9, RH:10,  // right shoulder/elbow/hand
  LHip:11, LK:12, LF:13,  // left hip/knee/foot
  RHip:14, RK:15, RF:16,  // right hip/knee/foot
}
const NJ = 17

// Bones: [a, b, width, isLimb]
const BONES = [
  [J.HIP, J.SPINE, 5.5, false],
  [J.SPINE, J.CHEST, 5.0, false],
  [J.CHEST, J.NECK, 4.2, false],
  [J.CHEST, J.LS, 4.0, false],
  [J.LS, J.LE, 3.8, true],
  [J.LE, J.LH, 3.2, true],
  [J.CHEST, J.RS, 4.0, false],
  [J.RS, J.RE, 3.8, true],
  [J.RE, J.RH, 3.2, true],
  [J.HIP, J.LHip, 4.5, false],
  [J.LHip, J.LK, 4.5, true],
  [J.LK, J.LF, 4.0, true],
  [J.HIP, J.RHip, 4.5, false],
  [J.RHip, J.RK, 4.5, true],
  [J.RK, J.RF, 4.0, true],
]

function ep() { return Array.from({ length: NJ }, () => ({ x: 0, y: 0 })) }

// Pack flat array [x0,y0, x1,y1,...] into pose array
function pose(flat) {
  const p = ep()
  for (let i = 0; i < NJ; i++) p[i] = { x: flat[i * 2] || 0, y: flat[i * 2 + 1] || 0 }
  return p
}

// ─── POSE LIBRARY ────────────────────────────────────────────────
// Every pose hand-crafted for natural stickman proportions:
// torso ~62px tall, arms ~40px each segment, legs ~48px each
const POSES = {

  idle: pose([
    0,0,          // HIP
    0,22,         // SPINE
    0,44,         // CHEST
    2,57,         // NECK
    4,71,         // HEAD
    -18,41,       // LS
    -32,26,       // LE
    -30,10,       // LH
    18,41,        // RS
    32,26,        // RE
    30,10,        // RH
    -10,-1,       // LHip
    -14,-26,      // LK
    -14,-52,      // LF
    10,-1,        // RHip
    14,-26,       // RK
    14,-52,       // RF
  ]),

  // Walk frames — exaggerated for clarity
  walk_a: pose([
    0,3,2,25,2,47,4,60,6,74,
    -16,43,-34,30,-42,16,
    20,43,26,28,18,14,
    -13,-1,-28,-18,-40,-46,
    13,-1,8,-28,6,-54,
  ]),
  walk_b: pose([
    0,3,-2,25,-2,47,-4,60,-6,74,
    -20,43,-26,28,-18,14,
    16,43,34,30,42,16,
    -13,-1,-8,-28,-6,-54,
    13,-1,28,-18,40,-46,
  ]),

  // Crouched walk — used at close range
  walk_low_a: pose([
    0,-8,0,12,0,32,2,44,4,57,
    -18,30,-34,18,-42,6,
    18,30,28,18,20,6,
    -13,-8,-24,-26,-38,-48,
    13,-8,6,-28,4,-52,
  ]),
  walk_low_b: pose([
    0,-8,0,12,0,32,-2,44,-4,57,
    -18,30,-28,18,-20,6,
    18,30,34,18,42,6,
    -13,-8,-6,-28,-4,-52,
    13,-8,24,-26,38,-48,
  ]),

  jump_rise: pose([
    0,0,0,22,0,44,0,58,0,72,
    -20,42,-38,56,-42,70,
    20,42,38,56,42,70,
    -12,-1,-22,-14,-24,-34,
    12,-1,22,-14,24,-34,
  ]),
  jump_peak: pose([
    0,0,0,20,0,42,0,56,0,70,
    -22,40,-44,30,-58,16,
    22,40,44,30,58,16,
    -14,-1,-18,-20,-16,-44,
    14,-1,18,-20,16,-44,
  ]),
  jump_fall: pose([
    0,0,0,21,0,43,1,57,2,71,
    -20,41,-38,28,-52,14,
    20,41,38,28,52,14,
    -12,-1,-14,-24,-12,-50,
    12,-1,14,-24,12,-50,
  ]),

  // PUNCHES — right hand jabs forward
  pR_wind: pose([
    -5,0,-4,21,-3,43,-1,57,1,71,
    -20,40,-36,27,-38,12,
    16,41,8,54,2,64,       // arm cocked back, elbow behind body
    -10,-1,-13,-26,-13,-53,
    10,-1,14,-26,14,-53,
  ]),
  pR_mid: pose([
    2,0,2,21,3,43,4,57,5,71,
    -18,41,-30,28,-28,14,
    20,43,38,46,56,48,     // arm extending
    -10,-1,-12,-27,-12,-54,
    10,-1,13,-27,13,-54,
  ]),
  pR_ext: pose([
    6,0,7,21,8,44,9,58,10,72,
    -16,41,-24,28,-22,15,
    22,44,46,46,68,47,     // full reach, torso rotated
    -10,-1,-12,-27,-12,-54,
    11,-1,14,-27,14,-54,
  ]),

  // Left jab
  pL_wind: pose([
    5,0,4,21,3,43,1,57,-1,71,
    -16,41,-8,54,-2,64,    // left arm cocked
    20,40,36,27,38,12,
    -10,-1,-14,-26,-14,-53,
    10,-1,13,-26,13,-53,
  ]),
  pL_ext: pose([
    -6,0,-7,21,-8,44,-9,58,-10,72,
    -22,44,-46,46,-68,47,  // left arm full reach
    16,41,24,28,22,15,
    -11,-1,-14,-27,-14,-54,
    10,-1,12,-27,12,-54,
  ]),

  // KICK — right leg sweeps forward
  kR_wind: pose([
    -4,0,-3,21,-2,43,-1,57,0,71,
    -20,40,-38,26,-52,12,
    18,41,28,28,22,16,
    -12,-1,-14,-26,-13,-53,
    10,-1,12,-10,14,-2,    // knee rising
  ]),
  kR_mid: pose([
    2,0,3,20,4,42,5,56,6,70,
    -18,39,-24,50,-20,62,
    20,41,26,30,22,18,
    -12,-1,-13,-26,-12,-53,
    10,-1,30,-6,50,-2,     // kick extending
  ]),
  kR_ext: pose([
    8,0,9,19,10,41,11,55,12,69,
    -16,38,-18,52,-14,64,
    21,42,26,31,22,19,
    -12,-1,-13,-26,-12,-53,
    10,-1,38,-8,64,-4,     // full extension
  ]),

  // UPPERCUT — explosive rising punch
  up_crouch: pose([
    0,-10,0,10,0,30,1,42,2,54,
    -18,28,-32,14,-36,1,
    18,28,14,12,8,-2,      // right arm low, coiled
    -12,-8,-20,-32,-26,-56,
    12,-8,16,-32,14,-56,
  ]),
  up_rise: pose([
    4,-4,5,18,7,42,9,58,11,74,
    -16,39,-12,52,-10,64,
    22,40,28,58,24,76,     // fist driving upward
    -14,-6,-16,-32,-18,-58,
    12,-6,13,-30,11,-56,
  ]),

  // BLOCK — forearms crossed, knees bent
  block_hi: pose([
    -2,0,-2,21,-2,42,-1,55,0,68,
    -20,40,-8,54,4,66,     // left arm crossing up-right
    18,40,6,54,-2,66,      // right arm crossing up-left
    -12,-2,-16,-30,-18,-57,
    12,-2,16,-30,18,-57,
  ]),
  block_lo: pose([
    -2,-5,-2,15,-2,36,-1,49,0,62,
    -20,34,-10,46,2,56,
    18,34,8,46,0,56,
    -14,-6,-20,-34,-22,-60,
    14,-6,20,-34,22,-60,
  ]),

  // HURT — staggering back
  hurt_hi: pose([
    -12,0,-11,19,-10,39,-12,52,-14,65,
    -26,36,-44,22,-56,10,
    10,37,18,22,16,8,
    -10,-1,-12,-26,-11,-52,
    12,-1,16,-26,18,-52,
  ]),
  hurt_lo: pose([
    -16,-4,-14,14,-12,34,-14,47,-16,59,
    -28,32,-46,18,-58,6,
    8,33,14,18,12,4,
    -10,-3,-11,-28,-10,-54,
    12,-3,17,-27,20,-52,
  ]),

  // KNOCKDOWN — flat on ground
  knockdown: pose([
    0,-9,-22,-15,-44,-19,-56,-17,-68,-13,
    -30,-10,-44,3,-54,16,
    -28,-27,-22,-18,-16,-8,
    -6,-7,2,9,14,26,
    8,-7,22,5,38,18,
  ]),

  // GET UP
  getup_a: pose([
    -4,-6,-2,14,0,34,1,47,2,60,
    -18,32,-28,18,-26,5,
    16,32,24,18,20,5,
    -12,-6,-20,-30,-24,-56,
    10,-6,8,-26,6,-52,
  ]),

  // SPECIAL — explosive double-palm strike
  sp_charge: pose([
    0,0,0,22,0,46,0,61,0,76,
    -24,44,-44,60,-38,74,
    24,44,44,60,38,74,
    -12,-1,-18,-30,-22,-57,
    12,-1,18,-30,22,-57,
  ]),
  sp_release: pose([
    10,0,11,21,12,44,13,59,14,74,
    -14,44,8,48,32,50,
    26,46,50,48,72,50,
    -14,-1,-16,-30,-18,-57,
    12,-1,13,-30,11,-57,
  ]),

  // TAUNT — optional flair at turn start
  taunt: pose([
    0,0,0,22,0,44,0,58,0,72,
    -22,42,-40,34,-48,22,
    22,42,30,28,22,16,
    -10,-1,-12,-26,-12,-52,
    12,-1,14,-22,14,-48,
  ]),
}

// ─── LERP ────────────────────────────────────────────────────────
function lerpPose(a, b, t) {
  // Smooth step
  t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  t = Math.max(0, Math.min(1, t))
  const out = ep()
  for (let i = 0; i < NJ; i++) {
    out[i] = { x: a[i].x + (b[i].x - a[i].x) * t, y: a[i].y + (b[i].y - a[i].y) * t }
  }
  return out
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATION SEQUENCES
// [{from, to, dur, hitOpen?}]  — hitOpen means hit detection active
// ═══════════════════════════════════════════════════════════════════
const ANIMS = {
  idle:     [{ from:'idle',     to:'idle',     dur:0.5 }],
  walk:     [{ from:'walk_a',   to:'walk_b',   dur:0.17 }, { from:'walk_b', to:'walk_a', dur:0.17 }],
  walk_low: [{ from:'walk_low_a',to:'walk_low_b',dur:0.15 }, { from:'walk_low_b',to:'walk_low_a',dur:0.15 }],
  jump:     [{ from:'jump_rise',to:'jump_peak',dur:0.2  }, { from:'jump_peak',to:'jump_fall',dur:0.5 }],
  punch_R:  [{ from:'pR_wind',  to:'pR_mid',   dur:0.06 }, { from:'pR_mid', to:'pR_ext', dur:0.05, hitOpen:true }, { from:'pR_ext', to:'idle', dur:0.13 }],
  punch_L:  [{ from:'pL_wind',  to:'pL_ext',   dur:0.06, hitOpen:true }, { from:'pL_ext', to:'idle', dur:0.13 }],
  kick_R:   [{ from:'kR_wind',  to:'kR_mid',   dur:0.08 }, { from:'kR_mid', to:'kR_ext', dur:0.07, hitOpen:true }, { from:'kR_ext', to:'idle', dur:0.16 }],
  uppercut: [{ from:'up_crouch',to:'up_rise',  dur:0.08, hitOpen:true }, { from:'up_rise', to:'idle', dur:0.18 }],
  block:    [{ from:'block_hi', to:'block_lo', dur:0.12 }, { from:'block_lo', to:'block_hi', dur:0.12 }],
  hurt:     [{ from:'hurt_hi',  to:'hurt_lo',  dur:0.15 }, { from:'hurt_lo', to:'idle',   dur:0.14 }],
  knockdown:[{ from:'knockdown',to:'knockdown',dur:1.4  }],
  getup:    [{ from:'knockdown',to:'getup_a',  dur:0.3  }, { from:'getup_a', to:'idle',   dur:0.2  }],
  special:  [{ from:'sp_charge',to:'sp_charge',dur:0.16 }, { from:'sp_charge', to:'sp_release', dur:0.10, hitOpen:true }, { from:'sp_release', to:'idle', dur:0.2 }],
  taunt:    [{ from:'taunt',    to:'idle',     dur:0.6  }],
}

// ═══════════════════════════════════════════════════════════════════
// FIGHTER STATE
// ═══════════════════════════════════════════════════════════════════
function newFighter(isPlayer, bossIdx = 0) {
  const b = BOSSES[bossIdx]
  return {
    x: isPlayer ? 108 : 372,
    y: FLOOR, vy: 0, vx: 0,
    onGround: true,
    facingRight: isPlayer,

    hp: isPlayer ? 100 : b.hp,
    maxHp: isPlayer ? 100 : b.hp,
    stamina: 100,   // stamina for blocking multiple hits
    maxStamina: 100,

    // Animation
    animName: 'idle',
    animFi: 0,       // frame index
    animT: 0,        // time in frame
    pose: [...POSES.idle],
    hitActive: false,
    hitDone: false,
    locked: false,   // action locked (can't interrupt)

    // Combat
    action: 'idle',
    blocking: false,
    stunT: 0,
    invT: 0,
    comboCnt: 0,
    comboT: 0,
    cooldown: 0,

    // Visual
    color: isPlayer ? '#0a0a0a' : b.color,
    glowColor: isPlayer ? '#2255FF' : b.glowColor,
    hitFlash: 0,
    weapon: isPlayer ? 'none' : b.weapon,
    trailPts: [],   // motion trail for weapon/fists

    // AI
    isPlayer,
    aiT: 0,
    aiDir: 0,
    bossIdx,
    diff: isPlayer ? 0 : b.diff,
    style: isPlayer ? 'player' : b.style,
  }
}

// ─── ANIM ENGINE ─────────────────────────────────────────────────
function setAnim(f, name) {
  if (f.animName === name && (name === 'idle' || name === 'walk' || name === 'block')) return
  f.animName = name
  f.animFi = 0
  f.animT = 0
  f.locked = !['idle','walk','walk_low','block','jump'].includes(name)
  f.hitActive = false
  f.hitDone = false
}

function tickAnim(f, dt) {
  const seq = ANIMS[f.animName]
  if (!seq) return
  const fi = Math.min(f.animFi, seq.length - 1)
  const frame = seq[fi]
  f.animT += dt
  const t = f.animT / frame.dur
  const pA = POSES[frame.from] || POSES.idle
  const pB = POSES[frame.to] || POSES.idle
  f.pose = lerpPose(pA, pB, Math.min(t, 1))
  f.hitActive = !!frame.hitOpen && !f.hitDone && t > 0.2 && t < 1.1

  if (f.animT >= frame.dur) {
    f.animT -= frame.dur
    f.animFi++
    if (f.animFi >= seq.length) {
      const loops = new Set(['idle','walk','walk_low','block','knockdown'])
      f.animFi = loops.has(f.animName) ? 0 : seq.length - 1
      if (!loops.has(f.animName)) {
        f.locked = false
        f.hitActive = false
        if (f.animName !== 'knockdown') setAnim(f, 'idle')
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUNDS — richly layered, parallax-aware
// ═══════════════════════════════════════════════════════════════════
function drawBG(ctx, bgType, time, camShake) {
  ctx.clearRect(0, 0, CW, CH)

  if (bgType === 'dojo') drawDojo(ctx, time)
  else if (bgType === 'city') drawCity(ctx, time)
  else if (bgType === 'forest') drawForest(ctx, time)
  else if (bgType === 'arena') drawArena(ctx, time)
  else drawShadowRealm(ctx, time)

  // Floor line
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(CW, FLOOR); ctx.stroke()
}

function drawDojo(ctx, t) {
  // Back wall gradient
  const wall = ctx.createLinearGradient(0, 0, 0, FLOOR)
  wall.addColorStop(0, '#0f0400')
  wall.addColorStop(0.5, '#1e0a00')
  wall.addColorStop(1, '#2a1000')
  ctx.fillStyle = wall; ctx.fillRect(0, 0, CW, CH)

  // Wood grain panels
  ctx.save()
  for (let px = 0; px < CW; px += 68) {
    const panelG = ctx.createLinearGradient(px, 0, px + 68, 0)
    panelG.addColorStop(0, 'rgba(50,20,0,0.4)')
    panelG.addColorStop(0.5, 'rgba(30,12,0,0.1)')
    panelG.addColorStop(1, 'rgba(50,20,0,0.4)')
    ctx.fillStyle = panelG
    ctx.fillRect(px, 0, 68, FLOOR)
    ctx.strokeStyle = 'rgba(60,25,0,0.5)'; ctx.lineWidth = 1
    ctx.strokeRect(px + 1, 2, 66, FLOOR - 4)
  }
  ctx.restore()

  // Ornate pillars
  const pillar = (px) => {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000'; ctx.fillRect(px + 20, 0, 10, FLOOR)
    ctx.restore()
    // Pillar body
    const pg = ctx.createLinearGradient(px, 0, px + 30, 0)
    pg.addColorStop(0, '#1a0800')
    pg.addColorStop(0.3, '#2e1200')
    pg.addColorStop(0.7, '#2e1200')
    pg.addColorStop(1, '#0f0400')
    ctx.fillStyle = pg; ctx.fillRect(px, 0, 30, FLOOR)
    // Highlight stripe
    ctx.fillStyle = 'rgba(80,35,0,0.5)'; ctx.fillRect(px + 3, 0, 4, FLOOR)
    // Capital/base moldings
    ctx.fillStyle = '#3d1800'; ctx.fillRect(px - 3, 0, 36, 18)
    ctx.fillRect(px - 3, FLOOR - 18, 36, 18)
  }
  pillar(14); pillar(CW - 44)

  // Hanging lanterns with glow
  const lantern = (lx, ly, phase = 0) => {
    const swing = Math.sin(t * 0.7 + phase) * 3
    ctx.save(); ctx.translate(lx + swing, ly)
    // Cord
    ctx.strokeStyle = '#3a1800'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 0); ctx.stroke()
    // Lantern body glow
    ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 30 + Math.sin(t * 2.1 + phase) * 8
    ctx.fillStyle = '#CC2800'
    ctx.beginPath()
    ctx.ellipse(0, 8, 14, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FF8800'
    ctx.beginPath()
    ctx.ellipse(0, 8, 9, 13, 0, 0, Math.PI * 2)
    ctx.fill()
    // Caps
    ctx.fillStyle = '#8B3000'; ctx.fillRect(-10, -2, 20, 5); ctx.fillRect(-8, 26, 16, 5)
    ctx.restore()
    // Floor light pool
    ctx.save(); ctx.globalAlpha = 0.06 + Math.sin(t * 2 + phase) * 0.02
    const lg = ctx.createRadialGradient(lx + swing, FLOOR, 0, lx + swing, FLOOR, 80)
    lg.addColorStop(0, '#FF6600'); lg.addColorStop(1, 'transparent')
    ctx.fillStyle = lg; ctx.fillRect(lx - 80, FLOOR - 20, 160, 80); ctx.restore()
  }
  lantern(28, 62, 0); lantern(CW - 42, 62, 1.4); lantern(CW / 2, 48, 0.7)

  // Wall banner
  ctx.save()
  ctx.fillStyle = '#8B0000'; ctx.fillRect(CW / 2 - 16, 80, 32, 80)
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.strokeRect(CW / 2 - 16, 80, 32, 80)
  // Simple kanji-like strokes
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(CW / 2, 92); ctx.lineTo(CW / 2, 120); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(CW / 2 - 8, 104); ctx.lineTo(CW / 2 + 8, 104); ctx.stroke()
  ctx.restore()

  // Floor
  const fl = ctx.createLinearGradient(0, FLOOR, 0, CH)
  fl.addColorStop(0, '#2a1400')
  fl.addColorStop(1, '#100700')
  ctx.fillStyle = fl; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  // Planks
  ctx.save(); ctx.globalAlpha = 0.18
  ctx.strokeStyle = '#000'
  for (let px = 0; px < CW; px += 52) {
    ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px, FLOOR); ctx.lineTo(px + 26, CH); ctx.stroke()
  }
  ctx.restore()
  // Floor shine
  ctx.save(); ctx.globalAlpha = 0.08
  const shine = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 18)
  shine.addColorStop(0, '#FF9900'); shine.addColorStop(1, 'transparent')
  ctx.fillStyle = shine; ctx.fillRect(0, FLOOR, CW, 18); ctx.restore()
}

function drawCity(ctx, t) {
  // Dark sky
  const sky = ctx.createLinearGradient(0, 0, 0, CH)
  sky.addColorStop(0, '#01000e')
  sky.addColorStop(0.6, '#05001a')
  sky.addColorStop(1, '#0a0028')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH)

  // Stars
  ctx.save()
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.5) % CW)
    const sy = ((i * 89.2) % (FLOOR * 0.7))
    const bri = 0.3 + Math.sin(t * 2.2 + i) * 0.25
    ctx.globalAlpha = bri
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(sx, sy, i % 3 === 0 ? 1.5 : 1, i % 3 === 0 ? 1.5 : 1)
  }
  ctx.restore()

  // Moon
  ctx.save()
  ctx.shadowColor = '#4488FF'; ctx.shadowBlur = 25
  ctx.fillStyle = '#C0D8FF'
  ctx.beginPath(); ctx.arc(42, 36, 18, 0, Math.PI * 2); ctx.fill()
  // Crater
  ctx.fillStyle = 'rgba(0,0,40,0.25)'
  ctx.beginPath(); ctx.arc(48, 30, 6, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Buildings — layered for depth
  const bldgs = [
    // far (dark, small)
    { x:  0, h:90, w:45, col:'#03000f' }, { x:48, h:65, w:32, col:'#03000f' },
    { x:85, h:110,w:50, col:'#04001a' }, { x:140,h:55, w:38, col:'#03000f' },
    { x:185,h:95, w:48, col:'#04001a' }, { x:240,h:70, w:40, col:'#03000f' },
    { x:288,h:120,w:52, col:'#04001a' }, { x:348,h:60, w:36, col:'#03000f' },
    { x:392,h:88, w:44, col:'#04001a' }, { x:444,h:72, w:38, col:'#03000f' },
    // mid
    { x:-10,h:130,w:52, col:'#05001e' }, { x:50, h:85, w:42, col:'#06001e' },
    { x:100,h:150,w:55, col:'#05001e' }, { x:162,h:75, w:45, col:'#06001e' },
    { x:215,h:140,w:58, col:'#05001e' }, { x:282,h:80, w:42, col:'#06001e' },
    { x:332,h:160,w:52, col:'#05001e' }, { x:392,h:68, w:44, col:'#06001e' },
    { x:444,h:130,w:50, col:'#05001e' },
  ]
  bldgs.forEach(({ x, h, w, col }) => {
    ctx.fillStyle = col; ctx.fillRect(x, FLOOR - h, w, h)
    // Windows
    for (let wy = FLOOR - h + 8; wy < FLOOR - 6; wy += 13) {
      for (let wx = x + 5; wx < x + w - 5; wx += 9) {
        if (((wx * 7 + wy * 3 + x) % 11) > 4) {
          const on = ((wx + wy + x) % 5) < 3
          if (on) {
            ctx.globalAlpha = 0.45 + Math.sin(t * 0.4 + wx * 0.2) * 0.15
            ctx.fillStyle = (wx * wy) % 7 === 0 ? '#00CCFF' : ((wx + wy) % 5 === 0 ? '#FF8800' : '#FFE066')
            ctx.fillRect(wx, wy, 4, 5)
            ctx.globalAlpha = 1
          }
        }
      }
    }
  })

  // Neon signs
  const neon = (nx, ny, col, w = 34, text = '') => {
    ctx.save()
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + w, ny); ctx.stroke()
    if (text) {
      ctx.shadowBlur = 8; ctx.font = '7px monospace'; ctx.fillStyle = col
      ctx.fillText(text, nx + 2, ny - 4)
    }
    ctx.restore()
  }
  neon(55, FLOOR - 45, '#FF00FF', 38, 'FIGHT')
  neon(165, FLOOR - 62, '#00FFFF', 44)
  neon(290, FLOOR - 38, '#FF4400', 32, 'KO')
  neon(378, FLOOR - 52, '#44FF00', 28)

  // Rain
  ctx.save()
  const rainAlpha = 0.08
  ctx.strokeStyle = `rgba(160,200,255,${rainAlpha})`
  ctx.lineWidth = 0.6
  for (let i = 0; i < 80; i++) {
    const rx = (i * 43.7 + t * 220) % (CW + 20) - 10
    const ry = (t * 280 + i * 67.3) % (CH + 20) - 10
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 1.5, ry + 15); ctx.stroke()
  }
  ctx.restore()

  // Wet floor
  ctx.fillStyle = '#05001a'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  ctx.save(); ctx.globalAlpha = 0.22
  const refl = ctx.createLinearGradient(0, FLOOR, 0, CH)
  refl.addColorStop(0, '#4400FF'); refl.addColorStop(0.5, '#8800FF'); refl.addColorStop(1, 'transparent')
  ctx.fillStyle = refl; ctx.fillRect(0, FLOOR, CW, CH - FLOOR); ctx.restore()
}

function drawForest(ctx, t) {
  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR)
  sky.addColorStop(0, '#000a00')
  sky.addColorStop(0.6, '#001400')
  sky.addColorStop(1, '#002000')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH)

  // Moon + halo
  ctx.save()
  ctx.shadowColor = '#CCFFCC'; ctx.shadowBlur = 60
  ctx.fillStyle = '#DFFFD8'
  ctx.beginPath(); ctx.arc(380, 44, 26, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Stars
  ctx.save()
  for (let i = 0; i < 80; i++) {
    const sx = (i * 113.7) % CW, sy = (i * 71.3) % (FLOOR * 0.8)
    ctx.globalAlpha = 0.2 + Math.sin(t * 1.8 + i) * 0.18
    ctx.fillStyle = '#CCFFCC'; ctx.fillRect(sx, sy, 1, 1)
  }
  ctx.restore()

  // Tree layers (back to front)
  const tree = (tx, th, tw, alpha, tint = '#001200') => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = tint
    // Trunk
    ctx.fillRect(tx - tw / 14, FLOOR - th, tw / 7, th)
    // Layers of foliage
    for (let layer = 0; layer < 3; layer++) {
      const ly = FLOOR - th - tw * (0.4 + layer * 0.28)
      const lw = tw * (0.9 - layer * 0.22)
      ctx.beginPath()
      ctx.moveTo(tx, ly - lw * 0.35)
      ctx.lineTo(tx - lw / 2, ly + lw * 0.25)
      ctx.lineTo(tx + lw / 2, ly + lw * 0.25)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
  // Far trees
  for (let i = 0; i < 10; i++) tree(i * 52 + 26, 55, 42, 0.28, '#001000')
  // Mid trees
  for (let i = 0; i < 7; i++) tree(i * 76 + 14, 95, 62, 0.52, '#001800')
  // Near trees
  for (let i = 0; i < 5; i++) tree(i * 110 + 8, 140, 84, 0.8, '#002200')

  // Fireflies
  ctx.save()
  for (let i = 0; i < 28; i++) {
    const px = (i * 97.3 + t * 14) % CW
    const py = FLOOR - 14 - (i * 43.7 + Math.sin(t * 1.1 + i) * 20) % 110
    const bri = 0.25 + Math.sin(t * 2.4 + i * 1.7) * 0.5
    if (bri < 0.05) continue
    ctx.globalAlpha = bri; ctx.fillStyle = '#AAFFAA'
    ctx.shadowColor = '#88FF44'; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()

  // Mist near floor
  ctx.save(); ctx.globalAlpha = 0.12
  const mist = ctx.createLinearGradient(0, FLOOR - 28, 0, FLOOR + 8)
  mist.addColorStop(0, 'transparent'); mist.addColorStop(1, '#88FFAA')
  ctx.fillStyle = mist; ctx.fillRect(0, FLOOR - 28, CW, 36)
  ctx.restore()

  // Floor
  const fl = ctx.createLinearGradient(0, FLOOR, 0, CH)
  fl.addColorStop(0, '#001a00'); fl.addColorStop(1, '#000a00')
  ctx.fillStyle = fl; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
}

function drawArena(ctx, t) {
  // Crowd background
  const crowd = ctx.createLinearGradient(0, 0, 0, FLOOR)
  crowd.addColorStop(0, '#0a0008')
  crowd.addColorStop(0.3, '#150010')
  crowd.addColorStop(1, '#200018')
  ctx.fillStyle = crowd; ctx.fillRect(0, 0, CW, CH)

  // Crowd silhouettes
  ctx.save()
  for (let row = 0; row < 4; row++) {
    const rowY = 20 + row * 38
    const rowAlpha = 0.15 + row * 0.08
    ctx.globalAlpha = rowAlpha
    ctx.fillStyle = '#1a001a'
    for (let ci = 0; ci < 26; ci++) {
      const cx = ci * 20 + (row % 2) * 10
      const cheering = Math.sin(t * 3.5 + ci * 1.2 + row) > 0.5
      // Head
      ctx.beginPath(); ctx.arc(cx + 10, rowY + (cheering ? -6 : 0), 7, 0, Math.PI * 2); ctx.fill()
      // Body
      ctx.fillRect(cx + 5, rowY + (cheering ? -6 : 0) + 7, 10, 16)
      if (cheering) {
        // Arms raised
        ctx.fillRect(cx + 2, rowY - 10, 5, 10)
        ctx.fillRect(cx + 13, rowY - 10, 5, 10)
      }
    }
  }
  ctx.restore()

  // Spotlights
  ctx.save()
  const spots = [[80, -20, '#FF0044'], [240, -10, '#4400FF'], [400, -20, '#FF6600']]
  spots.forEach(([sx, sy, sc]) => {
    ctx.globalAlpha = 0.06 + Math.sin(t * 1.3 + sx) * 0.02
    const sg = ctx.createConicalGradient ? null : null
    // Fallback triangle beam
    ctx.fillStyle = sc
    ctx.beginPath()
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx - 40, FLOOR)
    ctx.lineTo(sx + 40, FLOOR)
    ctx.closePath(); ctx.fill()
  })
  ctx.restore()

  // Ring ropes
  const ropeY = [FLOOR - 28, FLOOR - 16, FLOOR - 6]
  ropeY.forEach(ry => {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(CW, ry); ctx.stroke()
    ctx.globalAlpha = 1
  })
  // Corner posts
  const post = (px) => {
    ctx.fillStyle = '#888'; ctx.fillRect(px - 4, 10, 8, FLOOR - 10)
    ctx.fillStyle = '#AAA'; ctx.fillRect(px - 6, 8, 12, 10)
  }
  post(8); post(CW - 8)

  // Canvas mat
  const mat = ctx.createLinearGradient(0, FLOOR, 0, CH)
  mat.addColorStop(0, '#2a0020'); mat.addColorStop(1, '#150010')
  ctx.fillStyle = mat; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  // Ring markings
  ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1
  ctx.strokeRect(20, FLOOR + 2, CW - 40, CH - FLOOR - 4); ctx.restore()
}

function drawShadowRealm(ctx, t) {
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, CW, CH)

  // Pulsing void
  for (let i = 0; i < 8; i++) {
    const ox = (i % 4) * 130 + 60 + Math.sin(t * 0.6 + i) * 20
    const oy = 30 + Math.floor(i / 4) * 100 + Math.cos(t * 0.5 + i) * 15
    ctx.save()
    ctx.globalAlpha = 0.08 + Math.sin(t * 0.9 + i * 1.4) * 0.04
    const vg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 70)
    vg.addColorStop(0, '#9900FF'); vg.addColorStop(0.5, '#440088'); vg.addColorStop(1, 'transparent')
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(ox, oy, 70, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  // Shadow tendrils
  ctx.save()
  ctx.strokeStyle = '#330055'; ctx.lineWidth = 1.5
  for (let i = 0; i < 12; i++) {
    const tx = i * 42 + Math.sin(t * 0.8 + i) * 10
    const amp = 15 + i * 3
    ctx.globalAlpha = 0.3 + Math.sin(t + i) * 0.15
    ctx.beginPath()
    for (let y = 0; y < FLOOR; y += 4) {
      const x = tx + Math.sin(t + y * 0.06 + i) * amp
      y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()

  // Cracked ground with energy
  ctx.save()
  ctx.strokeStyle = '#9900FF'; ctx.lineWidth = 2
  ctx.shadowColor = '#BB00FF'; ctx.shadowBlur = 12
  const cracks = [
    [60, FLOOR, 95, FLOOR - 12, 80, FLOOR - 5, 110, FLOOR - 8],
    [180, FLOOR, 215, FLOOR - 10, 200, FLOOR - 4],
    [300, FLOOR, 335, FLOOR - 14, 318, FLOOR - 6, 355, FLOOR - 10],
    [400, FLOOR, 430, FLOOR - 8],
  ]
  ctx.globalAlpha = 0.7 + Math.sin(t * 2.2) * 0.15
  cracks.forEach(pts => {
    ctx.beginPath()
    for (let pi = 0; pi < pts.length; pi += 2) {
      pi === 0 ? ctx.moveTo(pts[pi], pts[pi + 1]) : ctx.lineTo(pts[pi], pts[pi + 1])
    }
    ctx.stroke()
  })
  ctx.restore()

  // Energy floor grid
  ctx.save(); ctx.globalAlpha = 0.12 + Math.sin(t * 1.6) * 0.06
  ctx.strokeStyle = '#6600AA'; ctx.lineWidth = 0.8; ctx.shadowColor = '#9900FF'; ctx.shadowBlur = 6
  for (let gx = 0; gx < CW; gx += 32) {
    ctx.beginPath(); ctx.moveTo(gx, FLOOR); ctx.lineTo(gx + 16, CH); ctx.stroke()
  }
  ctx.restore()

  // Floating shadow particles
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const px = (i * 113 + t * 18) % CW
    const py = FLOOR - 10 - ((t * 22 + i * 37) % (FLOOR - 20))
    ctx.globalAlpha = 0.15 + Math.sin(t + i) * 0.12
    ctx.fillStyle = '#AA00FF'; ctx.shadowColor = '#CC00FF'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()

  // Floor
  const sfl = ctx.createLinearGradient(0, FLOOR, 0, CH)
  sfl.addColorStop(0, '#0d001a'); sfl.addColorStop(1, '#000000')
  ctx.fillStyle = sfl; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
  ctx.save(); ctx.globalAlpha = 0.2 + Math.sin(t * 1.8) * 0.08
  const fglow = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 20)
  fglow.addColorStop(0, '#8800CC'); fglow.addColorStop(1, 'transparent')
  ctx.fillStyle = fglow; ctx.fillRect(0, FLOOR, CW, 20); ctx.restore()
}

// ═══════════════════════════════════════════════════════════════════
// DRAW FIGHTER
// ═══════════════════════════════════════════════════════════════════
function drawFighter(ctx, f) {
  const pose = f.pose
  const rx = f.x, ry = f.y
  const flip = !f.facingRight

  // Convert local (y-up) to screen (y-down)
  const wx = (j) => rx + (flip ? -pose[j].x : pose[j].x)
  const wy = (j) => ry - pose[j].y

  ctx.save()

  // Shadow on ground
  const shadowScale = f.onGround ? 1 : Math.max(0.3, 1 - (FLOOR - f.y) / 200)
  ctx.globalAlpha = 0.2 * shadowScale
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(rx, FLOOR + 5, 26 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Hit flash
  if (f.hitFlash > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(f.hitFlash, 1) * 0.7
    ctx.fillStyle = '#FF1100'
    ctx.beginPath()
    ctx.arc(wx(J.HEAD), wy(J.HEAD), 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Stamina low — flicker
  if (f.stamina < 25 && Math.sin(Date.now() * 0.012) > 0) {
    ctx.save(); ctx.globalAlpha = 0.18
    ctx.fillStyle = '#FF3300'
    ctx.beginPath(); ctx.arc(rx, ry - 40, 40, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  // Glow
  ctx.shadowColor = f.glowColor
  ctx.shadowBlur = f.blocking ? 14 : (f.action === 'special' ? 32 : 7)

  // Draw bones with tapered width
  ctx.strokeStyle = f.color
  ctx.fillStyle = f.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  BONES.forEach(([a, b, lw]) => {
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(wx(a), wy(a))
    ctx.lineTo(wx(b), wy(b))
    ctx.stroke()
  })

  // Head
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(wx(J.HEAD), wy(J.HEAD), 13, 0, Math.PI * 2)
  ctx.fill()

  // Joint dots
  ctx.shadowBlur = 0
  const dots = [J.LS, J.LE, J.RS, J.RE, J.LK, J.RK, J.CHEST, J.LHip, J.RHip]
  dots.forEach(ji => {
    ctx.beginPath()
    ctx.arc(wx(ji), wy(ji), 3.5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Weapon
  if (f.weapon && f.weapon !== 'none') {
    drawWeapon(ctx, f, wx, wy)
  }

  ctx.restore()
}

function drawWeapon(ctx, f, wx, wy) {
  const hx = wx(J.RH), hy = wy(J.RH)
  const ex = wx(J.RE), ey = wy(J.RE)
  const angle = Math.atan2(hy - ey, hx - ex)

  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(angle)
  ctx.lineCap = 'round'

  const now = Date.now() * 0.001

  if (f.weapon === 'sword') {
    // Blade shine
    ctx.shadowColor = '#88CCFF'; ctx.shadowBlur = 18
    ctx.strokeStyle = '#E8F2FF'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(48, 0); ctx.stroke()
    // Edge
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(4, -1.5); ctx.lineTo(46, -1.5); ctx.stroke()
    // Tip taper
    ctx.strokeStyle = '#E8F2FF'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(44, -1.5); ctx.lineTo(52, 0); ctx.lineTo(44, 1.5); ctx.stroke()
    // Guard
    ctx.shadowBlur = 4; ctx.strokeStyle = '#BBBBBB'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(8, 10); ctx.stroke()
    // Grip with wrapping
    ctx.strokeStyle = '#5C3317'; ctx.lineWidth = 4.5
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, 0); ctx.stroke()
    ctx.strokeStyle = '#3A2010'; ctx.lineWidth = 1.5
    for (let gi = 0; gi < 4; gi++) {
      ctx.beginPath(); ctx.moveTo(-2 - gi * 3, -3); ctx.lineTo(-2 - gi * 3, 3); ctx.stroke()
    }

  } else if (f.weapon === 'staff') {
    const pulse = Math.sin(now * 5) * 2
    ctx.shadowColor = '#CC55FF'; ctx.shadowBlur = 16 + pulse
    ctx.strokeStyle = '#7A4010'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(56, 0); ctx.stroke()
    // Bands
    ctx.strokeStyle = '#5C2E08'; ctx.lineWidth = 2
    for (let bi = 0; bi < 4; bi++) {
      const bx = -20 + bi * 20
      ctx.beginPath(); ctx.moveTo(bx, -4); ctx.lineTo(bx, 4); ctx.stroke()
    }
    // Orbs
    ctx.fillStyle = '#AA33FF'; ctx.shadowColor = '#DD66FF'; ctx.shadowBlur = 20 + pulse
    ctx.beginPath(); ctx.arc(58, 0, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#CC55FF'
    ctx.beginPath(); ctx.arc(58, 0, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#AA33FF'; ctx.shadowBlur = 14 + pulse
    ctx.beginPath(); ctx.arc(-28, 0, 6, 0, Math.PI * 2); ctx.fill()

  } else if (f.weapon === 'nunchucks') {
    const swingAngle = Math.sin(now * 7) * 1.5 + Math.sin(now * 3.3) * 0.5
    // Stick 1
    ctx.strokeStyle = '#3C2010'; ctx.lineWidth = 5; ctx.shadowColor = '#FF9900'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke()
    // Chain
    const c2x = 20 + Math.cos(swingAngle) * 14
    const c2y = Math.sin(swingAngle) * 14
    ctx.strokeStyle = '#999999'; ctx.lineWidth = 1.8; ctx.setLineDash([2.5, 2])
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(c2x, c2y); ctx.stroke()
    ctx.setLineDash([])
    // Stick 2
    const s2angle = swingAngle + 0.6
    ctx.strokeStyle = '#3C2010'; ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(c2x, c2y)
    ctx.lineTo(c2x + Math.cos(s2angle) * 20, c2y + Math.sin(s2angle) * 20)
    ctx.stroke()
    // End caps
    ctx.fillStyle = '#5C3020'
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(c2x + Math.cos(s2angle) * 20, c2y + Math.sin(s2angle) * 20, 4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════
function spawnHit(pts, x, y, col, n = 16, spd = 4) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + (Math.random() - 0.5) * 0.8
    const s = spd * (0.4 + Math.random() * 0.9)
    pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, col, life: 1, d: 0.04 + Math.random() * 0.04, sz: 2 + Math.random() * 3.5, type: 'spark' })
  }
}
function spawnSpecial(pts, x, y, col) {
  for (let i = 0; i < 50; i++) {
    const a = Math.PI * 2 * i / 50
    const s = 3 + Math.random() * 9
    pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, col, life: 1, d: 0.018 + Math.random() * 0.02, sz: 3 + Math.random() * 6, type: 'spark' })
  }
  // Shockwave ring
  pts.push({ x, y, life: 1, d: 0.06, sz: 8, col, type: 'ring', vx: 0, vy: 0 })
}
function spawnBlood(pts, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5
    pts.push({ x, y, vx: Math.cos(a) * (2 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 3) - 1, col: '#CC0000', life: 1, d: 0.03 + Math.random() * 0.04, sz: 1.5 + Math.random() * 2.5, type: 'drip' })
  }
}
function tickParticles(pts, dt) {
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    p.x += p.vx; p.y += p.vy
    p.vx *= 0.91; p.vy *= 0.91
    if (p.type !== 'ring') p.vy += 0.22
    p.life -= p.d
    if (p.life <= 0) pts.splice(i, 1)
  }
}
function drawParticles(ctx, pts) {
  pts.forEach(p => {
    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life * 0.9)
    if (p.type === 'ring') {
      ctx.strokeStyle = p.col; ctx.lineWidth = 2.5; ctx.shadowColor = p.col; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (2 - p.life) * 30, 0, Math.PI * 2); ctx.stroke()
    } else if (p.type === 'drip') {
      ctx.fillStyle = p.col
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz * 0.6, p.sz, 0, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 7
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  })
}

// ═══════════════════════════════════════════════════════════════════
// BOSSES — 10 with escalating difficulty, art, and audio tier
// ═══════════════════════════════════════════════════════════════════
const BOSSES = [
  { name:'GRUNT',       hp:80,  speed:112, color:'#181818', glowColor:'#505050', weapon:'none',       style:'brawler',   bg:'arena',  diff:0.28, intro:'A street thug. Don\'t get cocky.',         tier:0 },
  { name:'BLADE',       hp:100, speed:126, color:'#080822', glowColor:'#4466FF', weapon:'sword',      style:'swordsman', bg:'dojo',   diff:0.40, intro:'Cold steel. Colder heart.',                tier:0 },
  { name:'STRIKER',     hp:112, speed:182, color:'#1e0000', glowColor:'#FF2200', weapon:'none',       style:'speedster', bg:'city',   diff:0.52, intro:'Blink and you\'re dead.',                  tier:1 },
  { name:'STAFF MONK',  hp:130, speed:124, color:'#0c001a', glowColor:'#AA44FF', weapon:'staff',      style:'mage',      bg:'dojo',   diff:0.60, intro:'Ancient power. Ancient fury.',             tier:1 },
  { name:'CHAIN',       hp:144, speed:154, color:'#1a1300', glowColor:'#FFBB00', weapon:'nunchucks',  style:'trickster', bg:'forest', diff:0.68, intro:'Speed and steel. He never stops.',         tier:1 },
  { name:'PHANTOM',     hp:160, speed:192, color:'#002100', glowColor:'#00FF66', weapon:'none',       style:'speedster', bg:'forest', diff:0.75, intro:'He\'s already behind you.',               tier:2 },
  { name:'WARLORD',     hp:180, speed:136, color:'#1a0700', glowColor:'#FF7700', weapon:'sword',      style:'brawler',   bg:'arena',  diff:0.81, intro:'A hundred men fell. You\'re next.',       tier:2 },
  { name:'SHADOW MONK', hp:195, speed:148, color:'#0c0013', glowColor:'#FF00CC', weapon:'staff',      style:'mage',      bg:'shadow', diff:0.87, intro:'Between dimensions. Between lives.',       tier:2 },
  { name:'DEATH CHAIN', hp:220, speed:164, color:'#130000', glowColor:'#FF0000', weapon:'nunchucks',  style:'trickster', bg:'shadow', diff:0.93, intro:'The last sound you\'ll hear is chains.',   tier:3 },
  { name:'SHADOW KING', hp:270, speed:170, color:'#040004', glowColor:'#9900FF', weapon:'sword',      style:'master',    bg:'shadow', diff:1.00, intro:'He is shadow itself. Can you beat the dark?', tier:3 },
]

// ═══════════════════════════════════════════════════════════════════
// AI
// ═══════════════════════════════════════════════════════════════════
const AI_MOVE_SETS = {
  brawler:   ['punch_R','punch_R','punch_L','kick_R','uppercut'],
  speedster: ['punch_R','punch_L','punch_R','punch_L','kick_R','punch_R'],
  mage:      ['kick_R','uppercut','special','punch_R','special'],
  trickster: ['kick_R','punch_L','kick_R','punch_R','kick_R','punch_L'],
  swordsman: ['punch_R','kick_R','uppercut','punch_R','kick_R'],
  master:    ['punch_R','punch_L','kick_R','uppercut','special','punch_R','kick_R','uppercut'],
}

function runAI(enemy, player, dt, diffMult) {
  enemy.aiT -= dt
  if (enemy.aiT > 0) return
  if (enemy.stunT > 0 || enemy.locked) return

  const dist = Math.abs(enemy.x - player.x)
  const eff = Math.min(enemy.diff * diffMult, 1.2)

  // React to incoming hit
  if (player.hitActive && dist < 108 && Math.random() < eff * 0.55) {
    doAction(enemy, 'block')
    enemy.aiT = 0.25 + Math.random() * 0.15
    return
  }

  const ideal = 85 + Math.random() * 20

  if (dist > ideal + 30) {
    // Approach
    enemy.aiDir = enemy.x > player.x ? -1 : 1
    enemy.aiT = 0.04 + Math.random() * 0.04
  } else if (dist < 50 && Math.random() < 0.35) {
    // Retreat for space
    enemy.aiDir = enemy.x > player.x ? 1 : -1
    enemy.aiT = 0.08 + Math.random() * 0.08
  } else {
    enemy.aiDir = 0
    const threshold = 0.3 + eff * 0.4
    if (Math.random() < threshold) {
      // Jump at long range occasionally
      if (dist > 160 && Math.random() < 0.22 * eff) {
        doJump(enemy); enemy.aiT = 0.5; return
      }
      const moves = AI_MOVE_SETS[enemy.style] || AI_MOVE_SETS.brawler
      doAction(enemy, moves[Math.floor(Math.random() * moves.length)])
      enemy.aiT = 0.18 + Math.random() * (0.45 - eff * 0.2)
    } else {
      enemy.aiT = 0.06 + Math.random() * 0.06
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMBAT
// ═══════════════════════════════════════════════════════════════════
const DAMAGE = { punch_R:9, punch_L:10, kick_R:15, uppercut:24, special:40 }
const STUN   = { punch_R:0.20, punch_L:0.20, kick_R:0.34, uppercut:0.58, special:0.95 }
const RANGE  = { punch_R:84, punch_L:84, kick_R:102, uppercut:80, special:122 }
const PUSH   = { punch_R:4.5, punch_L:4.5, kick_R:6, uppercut:0, special:10 }
const WPNBONUS = { sword:10, staff:6, nunchucks:5, none:0 }

function doAction(f, name) {
  if (f.locked && !['hurt','block'].includes(name)) return false
  if (f.stunT > 0 && name !== 'block') return false
  f.action = name
  f.hitDone = false
  setAnim(f, name)
  return true
}

function doJump(f) {
  if (!f.onGround) return false
  f.vy = JUMP_VY
  f.onGround = false
  setAnim(f, 'jump')
  return true
}

function resolveHit(atk, def, g, sfx) {
  if (!atk.hitActive || atk.hitDone) return
  const dist = Math.abs(atk.x - def.x)
  const wpn = atk.weapon || 'none'
  const range = (RANGE[atk.animName] || 85) + (WPNBONUS[wpn] > 6 ? 18 : wpn !== 'none' ? 10 : 0)
  if (dist > range) return
  const facingOk = atk.facingRight ? atk.x < def.x : atk.x > def.x
  if (!facingOk) return

  atk.hitDone = true
  atk.hitActive = false

  // Block check
  if (def.blocking && atk.animName !== 'special') {
    sfx.block()
    def.stamina = Math.max(0, def.stamina - 18)
    spawnHit(g.particles, (atk.x + def.x) / 2, def.y - 60, '#FFD700', 10, 2.5)
    g.shake = 0.1
    if (def.stamina <= 0) {
      // Guard broken!
      def.blocking = false
      doAction(def, 'hurt')
      g.guardBreak = def.isPlayer ? 'YOUR GUARD IS BROKEN!' : null
    }
    return
  }
  if (def.invT > 0) return

  // Damage calculation
  const base = DAMAGE[atk.animName] || 9
  const bonus = WPNBONUS[wpn] || 0
  const comboBonus = Math.min(atk.comboCnt * 2, 14)
  const dmg = Math.round(base + bonus + comboBonus)

  def.hp = Math.max(0, def.hp - dmg)
  def.stunT = STUN[atk.animName] || 0.22
  def.hitFlash = 1.0
  def.invT = 0.14

  // Knockback
  const dir = atk.x < def.x ? 1 : -1
  def.vx = dir * (PUSH[atk.animName] || 5) * 70
  if (atk.animName === 'uppercut') { def.vy = -420; def.onGround = false }
  if (atk.animName === 'special')  { def.vy = -300; def.onGround = false }

  doAction(def, def.stunT > 0.55 ? 'knockdown' : 'hurt')
  sfx.hurt()
  if (wpn !== 'none') sfx.metal()

  // Particles
  const hx = (atk.x + def.x) / 2, hy = def.y - 55
  if (atk.animName === 'special') {
    spawnSpecial(g.particles, hx, hy, atk.glowColor)
    sfx.crowd()
  } else {
    spawnHit(g.particles, hx, hy, '#FF3300', 16, 4.5)
    if (wpn !== 'none') spawnHit(g.particles, hx, hy, atk.glowColor, 8, 3)
  }
  // Tier 2+ — blood drops
  if (atk.bossIdx >= 5) spawnBlood(g.particles, hx, hy)

  g.shake = atk.animName === 'special' ? 0.4 : atk.animName === 'uppercut' ? 0.24 : 0.14

  // Combo
  atk.comboCnt++
  atk.comboT = 1.8
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function StickmanFighter({ game, levelData, studentId, onFinish }) {
  const canvasRef = useRef(null)
  const gRef      = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const keysRef   = useRef({})
  const sfxRef    = useRef(makeSFX(0))

  const [ui, setUi] = useState({
    screen: 'menu',
    weapon: 'none',
    difficulty: 'fighter',
    bossIdx: 0,
    mode: 'story',
    survivalRound: 1,
    score: 0,
    combo: 0,
    message: '',
    playerHp: 100, enemyHp: 100, maxEnemyHp: 100,
    playerStamina: 100,
    guardBreak: '',
    roundTime: 60,
  })
  const uiRef = useRef(ui)
  uiRef.current = ui

  // ── START FIGHT ──────────────────────────────────────────────
  const startFight = useCallback((mode, bossIdx = 0) => {
    const boss = BOSSES[bossIdx]
    const u = uiRef.current
    const diffScale = { rookie:0.48, fighter:0.68, champion:0.86, legend:1.0, master:1.2 }[u.difficulty] || 0.68

    sfxRef.current = makeSFX(bossIdx)

    const player = newFighter(true, bossIdx)
    player.weapon = u.weapon

    const enemy = newFighter(false, bossIdx)
    enemy.diff = boss.diff * diffScale

    gRef.current = {
      player, enemy,
      particles: [],
      time: 0,
      phase: 'intro',   // intro → fight → ko
      introT: 1.8,
      koTimer: 0,
      roundTime: 60,
      bgType: boss.bg,
      shake: 0,
      diffScale,
      guardBreak: null,
      guardBreakT: 0,
    }

    setUi(p => ({
      ...p, screen: 'fight', bossIdx, mode,
      playerHp: 100, enemyHp: boss.hp, maxEnemyHp: boss.hp,
      playerStamina: 100, combo: 0,
      message: boss.intro, guardBreak: '',
      roundTime: 60,
    }))
    setTimeout(() => setUi(p => ({ ...p, message: '' })), 2800)

    sfxRef.current.crowd()
    setTimeout(() => sfxRef.current.announcer('fight'), 1600)
  }, [])

  // ── GAME LOOP ────────────────────────────────────────────────
  useEffect(() => {
    lastRef.current = performance.now()

    const loop = (now) => {
      const dt = Math.min((now - (lastRef.current || now)) / 1000, 0.05)
      lastRef.current = now
      if (uiRef.current.screen === 'fight') {
        update(dt)
        render()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKey = (e) => {
      const down = e.type === 'keydown'
      keysRef.current[e.code] = down
      if (down) handleKey(e.code)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  function handleKey(code) {
    const g = gRef.current; if (!g || g.phase !== 'fight') return
    const p = g.player
    if (code === 'KeyZ' || code === 'KeyJ') doAction(p, 'punch_R')
    if (code === 'KeyX' || code === 'KeyK') doAction(p, 'punch_L')
    if (code === 'KeyC' || code === 'KeyL') doAction(p, 'kick_R')
    if (code === 'KeyV') doAction(p, 'uppercut')
    if (code === 'KeyB') doAction(p, 'special')
    if ((code === 'ArrowUp' || code === 'KeyW') && p.onGround) {
      doJump(p); sfxRef.current.whoosh()
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────
  function update(dt) {
    const g = gRef.current; if (!g) return
    g.time += dt

    // Intro phase
    if (g.phase === 'intro') {
      g.introT -= dt
      if (g.introT <= 0) g.phase = 'fight'
      // Still animate fighters during intro
      tickAnim(g.player, dt); tickAnim(g.enemy, dt)
      return
    }

    // KO phase
    if (g.phase === 'ko') {
      g.koTimer -= dt
      tickAnim(g.player, dt); tickAnim(g.enemy, dt)
      tickParticles(g.particles, dt)
      if (g.koTimer <= 0) endKO()
      return
    }

    g.shake = Math.max(0, g.shake - dt * 3.5)
    g.roundTime -= dt

    // Guard break message
    if (g.guardBreak) {
      g.guardBreakT += dt
      if (g.guardBreakT > 1.5) { g.guardBreak = null; g.guardBreakT = 0 }
    }

    const p = g.player, e = g.enemy

    // ── PLAYER INPUT ─────────────────────────────────────────
    const kL = keysRef.current['ArrowLeft']  || keysRef.current['KeyA']
    const kR = keysRef.current['ArrowRight'] || keysRef.current['KeyD']
    const kU = keysRef.current['ArrowUp']    || keysRef.current['KeyW']
    const kD = keysRef.current['KeyS']       || keysRef.current['ArrowDown']

    if (!p.locked && p.stunT <= 0) {
      const blocking = kD && p.onGround
      p.blocking = blocking

      if (blocking) {
        if (p.animName !== 'block') setAnim(p, 'block')
      } else if (kL) {
        p.vx = -WALK_SPEED; p.facingRight = p.x > e.x  // auto-face when walking away
        if (p.onGround && !p.locked) setAnim(p, 'walk')
      } else if (kR) {
        p.vx = WALK_SPEED; p.facingRight = p.x < e.x
        if (p.onGround && !p.locked) setAnim(p, 'walk')
      } else {
        p.vx *= 0.55
        if (p.onGround && !p.locked && p.animName === 'walk') setAnim(p, 'idle')
      }

      if (kU && p.onGround) { doJump(p); sfxRef.current.whoosh() }
    } else {
      p.vx *= 0.6
    }

    // ── AI ───────────────────────────────────────────────────
    e.facingRight = e.x < p.x
    runAI(e, p, dt, g.diffScale)
    if (!e.locked && e.stunT <= 0) {
      e.vx = e.aiDir * e.speed
      if (e.aiDir !== 0 && e.onGround && !e.locked) setAnim(e, 'walk')
      else if (e.onGround && !e.locked && e.stunT <= 0 && e.animName === 'walk') setAnim(e, 'idle')
    } else {
      e.vx *= 0.6
    }

    // ── PHYSICS ──────────────────────────────────────────────
    for (const f of [p, e]) {
      // Timers
      if (f.stunT > 0) {
        f.stunT -= dt
        if (f.stunT <= 0 && f.animName === 'knockdown') setAnim(f, 'getup')
      }
      if (f.invT > 0) f.invT -= dt
      if (f.hitFlash > 0) f.hitFlash -= dt * 4
      if (f.comboT > 0) {
        f.comboT -= dt
        if (f.comboT <= 0) {
          f.comboCnt = 0
          if (f.isPlayer) setUi(u => ({ ...u, combo: 0 }))
        }
      }
      // Stamina regen when not blocking
      if (!f.blocking) f.stamina = Math.min(f.maxStamina, f.stamina + 14 * dt)

      // Gravity
      if (!f.onGround) {
        f.vy += GRAVITY * dt
        f.y += f.vy * dt
        if (f.y >= FLOOR) {
          f.y = FLOOR; f.vy = 0; f.onGround = true
          sfxRef.current.land()
          if (!f.locked) setAnim(f, 'idle')
        }
      }

      // Horizontal movement
      f.x += f.vx * dt
      f.x = Math.max(WALL_L, Math.min(WALL_R, f.x))

      // Auto-face when idle
      if (f.isPlayer && !f.locked && p.onGround && !kL && !kR) {
        p.facingRight = p.x < e.x
      }

      tickAnim(f, dt)
    }

    // Hit detection
    resolveHit(p, e, g, sfxRef.current)
    resolveHit(e, p, g, sfxRef.current)

    tickParticles(g.particles, dt)

    // KO / timeout
    if ((p.hp <= 0 || e.hp <= 0 || g.roundTime <= 0) && g.phase === 'fight') {
      g.phase = 'ko'
      g.koTimer = 2.5
      sfxRef.current.announcer('ko')
      if (p.hp <= 0) {
        setAnim(p, 'knockdown')
        sfxRef.current.ko()
        setUi(u => ({ ...u, message: '💀 KO — YOU LOSE' }))
      } else {
        const timeWin = g.roundTime <= 0 && p.hp >= e.hp
        setAnim(e, 'knockdown')
        sfxRef.current.ko()
        sfxRef.current.victory()
        setUi(u => ({ ...u, message: g.roundTime <= 0 ? (timeWin ? '⏱ TIME! YOU WIN!' : '⏱ TIME! YOU LOSE!') : '🏆 KO — YOU WIN!' }))
      }
    }

    setUi(u => ({
      ...u,
      playerHp: Math.max(0, Math.round(p.hp)),
      enemyHp: Math.max(0, Math.round(e.hp)),
      playerStamina: Math.round(p.stamina),
      combo: p.comboCnt,
      roundTime: Math.max(0, Math.ceil(g.roundTime)),
      guardBreak: g.guardBreak || '',
    }))
  }

  function endKO() {
    const g = gRef.current; const u = uiRef.current
    const won = g.enemy.hp <= 0 || (g.roundTime <= 0 && g.player.hp >= g.enemy.hp)

    if (u.mode === 'story') {
      if (won) {
        const next = u.bossIdx + 1
        if (next >= BOSSES.length) setUi(p => ({ ...p, screen: 'victory' }))
        else setTimeout(() => startFight('story', next), 1100)
      } else {
        setUi(p => ({ ...p, screen: 'gameover' }))
      }
    } else {
      if (won) {
        const nr = u.survivalRound + 1
        const bonus = Math.round(140 * nr * 0.6)
        setUi(p => ({ ...p, survivalRound: nr, score: p.score + bonus }))
        setTimeout(() => startFight('survival', (nr - 1) % BOSSES.length), 1100)
      } else {
        setUi(p => ({ ...p, screen: 'gameover' }))
      }
    }
  }

  // ── RENDER ────────────────────────────────────────────────────
  function render() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gRef.current; if (!g) return

    ctx.save()
    if (g.shake > 0) {
      const s = g.shake * 8
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6)
    }

    drawBG(ctx, g.bgType, g.time, g.shake)

    // Danger vignette when low HP
    const lowHp = g.player.hp < 25
    if (lowHp) {
      ctx.save()
      ctx.globalAlpha = 0.12 + Math.sin(g.time * 4) * 0.06
      const vig = ctx.createRadialGradient(CW / 2, CH / 2, CW * 0.3, CW / 2, CH / 2, CW * 0.8)
      vig.addColorStop(0, 'transparent'); vig.addColorStop(1, '#FF0000')
      ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH)
      ctx.restore()
    }

    // Intro countdown overlay
    if (g.phase === 'intro') {
      const t = g.introT
      ctx.save()
      ctx.globalAlpha = Math.min(t, 1) * 0.85
      ctx.fillStyle = t > 0.9 ? '#FFFF00' : t > 0.4 ? '#FF8800' : '#FF2200'
      ctx.font = `bold ${Math.round(60 - t * 10)}px monospace`
      ctx.textAlign = 'center'
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 30
      ctx.fillText(t > 1.4 ? '3' : t > 0.8 ? '2' : t > 0.2 ? '1' : 'FIGHT!', CW / 2, CH / 2 + 20)
      ctx.restore()
    }

    // Draw fighters — further one first
    const drawOrder = g.player.x < g.enemy.x
      ? [g.player, g.enemy]
      : [g.enemy, g.player]
    drawOrder.forEach(f => drawFighter(ctx, f))

    drawParticles(ctx, g.particles)

    // Guard break text
    if (g.guardBreak) {
      ctx.save()
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FF6600'; ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 14
      ctx.fillText('⚡ GUARD BROKEN!', CW / 2, FLOOR - 70)
      ctx.restore()
    }

    ctx.restore()
  }

  // ── TOUCH CONTROLS ────────────────────────────────────────────
  const tb = (act) => {
    const g = gRef.current; if (!g || g.phase !== 'fight') return
    doAction(g.player, act)
    if (act.startsWith('punch')) sfxRef.current.whoosh()
    if (act === 'kick_R') sfxRef.current.whoosh()
    if (act === 'uppercut') sfxRef.current.whoosh()
    if (act === 'special') sfxRef.current.whoosh()
  }
  const tbJump = () => {
    const g = gRef.current; if (!g || g.phase !== 'fight') return
    if (doJump(g.player)) sfxRef.current.whoosh()
  }
  const setKey = (code, val) => { keysRef.current[code] = val }
  const tbBlock = (d) => {
    setKey('KeyS', d)
    const g = gRef.current; if (!g) return
    g.player.blocking = d
    if (d && !g.player.locked) setAnim(g.player, 'block')
    else if (!d && g.player.animName === 'block') setAnim(g.player, 'idle')
  }

  const u = ui
  const boss = BOSSES[u.bossIdx] || BOSSES[0]
  const pHpPct = u.playerHp
  const eHpPct = Math.max(0, (u.enemyHp / u.maxEnemyHp) * 100)
  const staPct = u.playerStamina

  // ════════════════════════════════════════════════════════════
  // MENU SCREEN
  // ════════════════════════════════════════════════════════════
  if (u.screen === 'menu') return (
    <div style={{ background: 'linear-gradient(160deg,#04000a,#080010)', borderRadius: 16, overflow: 'hidden', fontFamily: 'monospace', color: '#EEE', userSelect: 'none' }}>
      <style>{`
        @keyframes titleGlow{0%,100%{text-shadow:0 0 14px #9900FF,0 0 32px #6600CC,0 0 60px #330066}50%{text-shadow:0 0 28px #CC44FF,0 0 60px #9900FF,0 0 100px #440099}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-12px) rotate(2deg)}}
        @keyframes selPulse{0%,100%{box-shadow:0 0 0 0 rgba(153,0,255,0.4)}50%{box-shadow:0 0 0 6px rgba(153,0,255,0)}}
      `}</style>

      {/* Header */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center', background: 'radial-gradient(ellipse at top,rgba(100,0,200,0.18),transparent)' }}>
        <div style={{ fontSize: 52, animation: 'float 3.5s ease-in-out infinite', display: 'inline-block' }}>⚔️</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 7, color: '#E0E0E0', animation: 'titleGlow 2.8s infinite', margin: '6px 0 2px' }}>SHADOW FIGHT</h1>
        <p style={{ color: '#44006a', fontSize: 9, letterSpacing: 4, marginBottom: 18 }}>STICKMAN EDITION — REMASTERED</p>
      </div>

      {/* Boss preview row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '0 12px 16px', flexWrap: 'wrap' }}>
        {BOSSES.map((b, i) => (
          <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: `${b.glowColor}22`, border: `1px solid ${b.glowColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, title: b.name }}>
            {['👊','⚔️','💨','🪄','🔗','👻','🗡','🌑','⛓','👑'][i]}
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 22px' }}>
        {/* Weapon select */}
        <p style={{ color: '#5a2288', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 7, textAlign: 'center' }}>Choose Weapon</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 18 }}>
          {[['none', '👊', 'Fists'], ['sword', '🗡', 'Sword'], ['staff', '🪄', 'Staff'], ['nunchucks', '🔗', 'Chains']].map(([w, ico, lb]) => (
            <button key={w} onClick={() => setUi(p => ({ ...p, weapon: w }))}
              style={{ padding: '10px 4px', borderRadius: 10, border: `2px solid ${u.weapon === w ? '#9900FF' : '#1e0033'}`, background: u.weapon === w ? 'rgba(153,0,255,0.18)' : 'rgba(255,255,255,0.03)', color: u.weapon === w ? '#CC88FF' : '#441166', fontWeight: 700, fontSize: 11, cursor: 'pointer', animation: u.weapon === w ? 'selPulse 1.5s infinite' : 'none' }}>
              <div style={{ fontSize: 20, marginBottom: 3 }}>{ico}</div>
              {lb}
            </button>
          ))}
        </div>

        {/* Difficulty */}
        <p style={{ color: '#5a2288', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 7, textAlign: 'center' }}>Difficulty</p>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 22 }}>
          {[['rookie', '🌱', '#44AA44'], ['fighter', '🔥', '#FF8800'], ['champion', '⚡', '#FFDD00'], ['legend', '💀', '#FF2200'], ['master', '👑', '#9900FF']].map(([d, ico, col]) => (
            <button key={d} onClick={() => setUi(p => ({ ...p, difficulty: d }))}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${u.difficulty === d ? col : '#1e0033'}`, background: u.difficulty === d ? `${col}22` : 'rgba(255,255,255,0.02)', color: u.difficulty === d ? col : '#331144', fontWeight: 800, fontSize: 9, cursor: 'pointer', textTransform: 'capitalize', minWidth: 52 }}>
              <div style={{ fontSize: 14 }}>{ico}</div>
              {d}
            </button>
          ))}
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => startFight('story', 0)}
            style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#3d0077,#9900FF)', color: 'white', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', letterSpacing: 2, boxShadow: '0 4px 24px rgba(153,0,255,0.45)' }}>
            ⚔️ STORY MODE
            <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 3 }}>10 Bosses</div>
          </button>
          <button onClick={() => { setUi(p => ({ ...p, survivalRound: 1, score: 0 })); startFight('survival', 0) }}
            style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#770000,#EE2200)', color: 'white', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', letterSpacing: 2, boxShadow: '0 4px 24px rgba(238,34,0,0.45)' }}>
            💀 SURVIVAL
            <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 3 }}>Endless Rounds</div>
          </button>
        </div>

        <p style={{ color: '#1e0033', fontSize: 9, textAlign: 'center', marginTop: 14 }}>
          Arrows / WASD: Move · ↑/W: Jump · ↓/S: Block · Z=Punch · X=Jab · C=Kick · V=Uppercut · B=Special
        </p>
      </div>
    </div>
  )

  if (u.screen === 'gameover' || u.screen === 'victory') return (
    <div style={{ background: 'linear-gradient(160deg,#04000a,#080010)', borderRadius: 16, padding: '40px 24px', textAlign: 'center', fontFamily: 'monospace', color: '#EEE', userSelect: 'none' }}>
      <div style={{ fontSize: 64, marginBottom: 14 }}>{u.screen === 'victory' ? '🏆' : '💀'}</div>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: u.screen === 'victory' ? '#FFD700' : '#EF4444', letterSpacing: 5, marginBottom: 10 }}>
        {u.screen === 'victory' ? 'SHADOW KING DEFEATED!' : 'DEFEATED'}
      </h2>
      {u.screen === 'victory' && <p style={{ color: '#9944BB', fontSize: 12, marginBottom: 4 }}>You mastered all 10 shadows.</p>}
      {u.mode === 'survival' && <p style={{ color: '#9944BB', fontSize: 13, marginBottom: 6 }}>Survived {u.survivalRound} rounds · Score: {u.score}</p>}
      <button onClick={() => setUi(p => ({ ...p, screen: 'menu' }))}
        style={{ marginTop: 20, padding: '12px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#3d0077,#9900FF)', color: 'white', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(153,0,255,0.4)' }}>
        ← MAIN MENU
      </button>
    </div>
  )

  // ════════════════════════════════════════════════════════════
  // FIGHT HUD + CANVAS + CONTROLS
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ background: '#04000a', borderRadius: 16, overflow: 'hidden', fontFamily: 'monospace', userSelect: 'none', touchAction: 'none' }}>
      <style>{`
        @keyframes comboPop{0%{transform:scale(0.2);opacity:0}60%{transform:scale(1.4)}100%{transform:scale(1);opacity:1}}
        @keyframes msgIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gbFlash{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      {/* ── TOP HUD ── */}
      <div style={{ background: 'rgba(0,0,0,0.85)', padding: '8px 10px 6px', borderBottom: '1px solid #1a0030', backdropFilter: 'blur(4px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Player side */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#BBBBBB', fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>YOU</span>
              <span style={{ color: pHpPct > 50 ? '#22c55e' : pHpPct > 25 ? '#f59e0b' : '#ef4444', fontSize: 9, fontWeight: 700 }}>{u.playerHp}</span>
            </div>
            {/* HP bar */}
            <div style={{ height: 9, background: '#0c0018', borderRadius: 5, border: '1px solid #280040', overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ height: '100%', width: `${pHpPct}%`, background: pHpPct > 50 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : pHpPct > 25 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 5, transition: 'width 0.1s ease' }} />
            </div>
            {/* Stamina bar */}
            <div style={{ height: 4, background: '#0c0018', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${staPct}%`, background: staPct > 50 ? '#3B82F6' : '#EF4444', borderRadius: 3, transition: 'width 0.1s ease' }} />
            </div>
          </div>

          {/* Center — timer + combo */}
          <div style={{ textAlign: 'center', minWidth: 58 }}>
            <div style={{ color: u.roundTime <= 10 ? '#FF2200' : '#666', fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{u.roundTime}</div>
            {u.combo > 1 && (
              <div key={u.combo} style={{ color: '#FF5500', fontWeight: 900, fontSize: 13, animation: 'comboPop 0.2s ease' }}>{u.combo}✕</div>
            )}
          </div>

          {/* Enemy side */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#EF4444', fontSize: 9, fontWeight: 700 }}>{u.enemyHp}</span>
              <span style={{ color: '#BBBBBB', fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>{boss.name}</span>
            </div>
            <div style={{ height: 9, background: '#0c0018', borderRadius: 5, border: '1px solid #280040', overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ height: '100%', width: `${eHpPct}%`, background: 'linear-gradient(270deg,#ef4444,#dc2626)', borderRadius: 5, transition: 'width 0.1s ease', marginLeft: 'auto' }} />
            </div>
            {/* Boss tier indicator */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {Array.from({ length: Math.min(boss.tier + 1, 4) }).map((_, i) => (
                <div key={i} style={{ width: 6, height: 4, borderRadius: 1, background: ['#888','#FF8800','#FF2200','#9900FF'][boss.tier] }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Message banner */}
      {u.message && (
        <div style={{ background: 'rgba(100,0,180,0.15)', borderBottom: '1px solid rgba(150,0,255,0.25)', padding: '5px', textAlign: 'center', color: '#BB77FF', fontSize: 11, fontWeight: 700, animation: 'msgIn 0.3s ease' }}>
          {u.message}
        </div>
      )}
      {u.guardBreak && (
        <div style={{ background: 'rgba(255,80,0,0.15)', borderBottom: '1px solid rgba(255,80,0,0.3)', padding: '4px', textAlign: 'center', color: '#FF8844', fontSize: 10, fontWeight: 800, animation: 'gbFlash 0.4s ease' }}>
          ⚡ GUARD BROKEN!
        </div>
      )}

      {/* CANVAS */}
      <canvas ref={canvasRef} width={CW} height={CH} style={{ width: '100%', display: 'block' }} />

      {/* ── TOUCH CONTROLS ── */}
      <div style={{ background: 'rgba(4,0,10,0.96)', borderTop: '1px solid #1a0030', padding: '10px 10px 14px' }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', justifyContent: 'center' }}>

          {/* D-PAD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,38px)', gridTemplateRows: 'repeat(3,38px)', gap: 3 }}>
            {/* Row 0 */}
            <div />
            <button
              onPointerDown={tbJump} onPointerUp={() => {}}
              style={dPadStyle('#9900FF', false)}>↑</button>
            <div />
            {/* Row 1 */}
            <button
              onPointerDown={() => setKey('ArrowLeft', true)} onPointerUp={() => setKey('ArrowLeft', false)} onPointerLeave={() => setKey('ArrowLeft', false)}
              style={dPadStyle('#444488', false)}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🥋</div>
            <button
              onPointerDown={() => setKey('ArrowRight', true)} onPointerUp={() => setKey('ArrowRight', false)} onPointerLeave={() => setKey('ArrowRight', false)}
              style={dPadStyle('#444488', false)}>→</button>
            {/* Row 2 */}
            <div />
            <button
              onPointerDown={() => tbBlock(true)} onPointerUp={() => tbBlock(false)} onPointerLeave={() => tbBlock(false)}
              style={dPadStyle('#0044AA', false)}>🛡</button>
            <div />
          </div>

          {/* ATTACK BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, flex: 1, maxWidth: 224 }}>
            {[
              ['PUNCH', 'punch_R', '#FF4400', '👊'],
              ['JAB',   'punch_L', '#FF6600', '✊'],
              ['KICK',  'kick_R',  '#CC0044', '🦵'],
              ['UPPER', 'uppercut','#AA00AA', '⬆️'],
            ].map(([lb, act, col, ico]) => (
              <button key={act} onPointerDown={() => tb(act)}
                style={{ padding: '10px 4px', borderRadius: 9, border: `1px solid ${col}55`, background: `${col}18`, color, fontWeight: 800, fontSize: 11, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
                <span style={{ fontSize: 16 }}>{ico}</span><br />{lb}
              </button>
            ))}
            <button onPointerDown={() => tb('special')}
              style={{ padding: '10px 4px', borderRadius: 9, border: '1px solid #9900FF55', background: 'rgba(153,0,255,0.14)', color: '#CC66FF', fontWeight: 900, fontSize: 11, cursor: 'pointer', gridColumn: 'span 2', WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
              ✨ SPECIAL ATTACK
            </button>
          </div>
        </div>

        {u.mode === 'survival' && (
          <p style={{ color: '#330055', fontSize: 9, textAlign: 'center', marginTop: 7 }}>
            Score: {u.score} · Survival Round {u.survivalRound}
          </p>
        )}
      </div>
    </div>
  )
}

function dPadStyle(col, active) {
  return {
    width: 38, height: 38, borderRadius: 8,
    border: `1px solid ${col}66`,
    background: active ? `${col}44` : `${col}18`,
    color: '#9988BB', fontWeight: 900, fontSize: 15,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent', touchAction: 'none',
  }
}
