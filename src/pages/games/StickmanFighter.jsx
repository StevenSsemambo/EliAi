import { useState, useEffect, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
//  AUDIO ENGINE  – procedural Web Audio, level-aware music themes
// ═══════════════════════════════════════════════════════════════════
let _ac = null
function AC() {
  if (!_ac) try { _ac = new (window.AudioContext || window.webkitAudioContext)() } catch {}
  if (_ac?.state === 'suspended') _ac.resume()
  return _ac
}

// ── Master compressor so nothing clips ──
let _master = null
function master() {
  const a = AC(); if (!a) return null
  if (!_master) {
    _master = a.createDynamicsCompressor()
    _master.threshold.value = -12
    _master.ratio.value = 4
    _master.connect(a.destination)
  }
  return _master
}

function osc(freq, type, dur, vol, delay = 0, detune = 0) {
  const a = AC(), m = master(); if (!a || !m) return
  const o = a.createOscillator(), g = a.createGain()
  o.connect(g); g.connect(m)
  o.type = type; o.frequency.value = freq; o.detune.value = detune
  const t = a.currentTime + delay
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t); o.stop(t + dur + 0.05)
}

function noise(vol, dur, lpf = 600, hpf = 0, delay = 0) {
  const a = AC(), m = master(); if (!a || !m) return
  const len = Math.ceil(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource(), g = a.createGain()
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf
  src.buffer = buf
  let chain = src
  chain.connect(lp); chain = lp
  if (hpf > 0) {
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpf
    chain.connect(hp); chain = hp
  }
  chain.connect(g); g.connect(m)
  const t = a.currentTime + delay
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.start(t); src.stop(t + dur + 0.1)
}

// ── Per-level SFX sets (attack sounds change as game gets harder) ──
const SFX_SETS = [
  // Levels 1-3: clean, bright hits
  {
    punch:   () => { noise(0.45,0.05,600,80); osc(200,'sawtooth',0.07,0.22,0.018) },
    kick:    () => { noise(0.6,0.09,350,40); osc(120,'sawtooth',0.10,0.32,0.02) },
    block:   () => { osc(880,'square',0.04,0.28); osc(600,'square',0.035,0.18,0.03) },
    hurt:    () => { noise(0.35,0.12,450,60); osc(150,'sawtooth',0.12,0.22,0.04) },
    whoosh:  () => { noise(0.12,0.14,1600,400) },
    special: () => { [200,320,480,720,1040].forEach((f,i)=>osc(f,'sine',0.3,0.22,i*0.05)) },
    land:    () => { noise(0.25,0.06,220) },
    ko:      () => { [320,260,200,150,100].forEach((f,i)=>osc(f,'sawtooth',0.5,0.38,i*0.24)) },
    victory: () => { [523,659,784,1047,1319].forEach((f,i)=>osc(f,'triangle',0.32,0.26,i*0.14)) },
    metal:   () => { osc(1200,'square',0.04,0.2); osc(800,'square',0.035,0.14,0.04) },
  },
  // Levels 4-6: heavier, more distorted
  {
    punch:   () => { noise(0.6,0.06,500,60); osc(160,'sawtooth',0.09,0.3,0.02); osc(80,'sawtooth',0.05,0.15,0.04) },
    kick:    () => { noise(0.75,0.10,300,30); osc(100,'sawtooth',0.12,0.4,0.02); osc(55,'sine',0.08,0.2,0.04) },
    block:   () => { noise(0.2,0.04,800); osc(700,'square',0.05,0.3); osc(450,'square',0.04,0.2,0.04) },
    hurt:    () => { noise(0.5,0.14,400,50); osc(130,'sawtooth',0.15,0.3,0.05) },
    whoosh:  () => { noise(0.18,0.16,2000,600); osc(260,'sine',0.08,0.1,0.04) },
    special: () => { [160,280,440,680,1000,1400].forEach((f,i)=>osc(f,'sawtooth',0.28,0.2,i*0.045)) },
    land:    () => { noise(0.35,0.08,180); osc(80,'sine',0.06,0.15,0.02) },
    ko:      () => { [280,220,170,120,80].forEach((f,i)=>osc(f,'sawtooth',0.6,0.42,i*0.26)); noise(0.4,0.5,200,0,0.1) },
    victory: () => { [440,554,659,880,1108].forEach((f,i)=>osc(f,'triangle',0.3,0.25,i*0.12)) },
    metal:   () => { osc(1800,'square',0.05,0.28,0,50); osc(1200,'square',0.04,0.18,0.04) },
  },
  // Levels 7-10: brutal, distorted, cinematic
  {
    punch:   () => { noise(0.8,0.07,450,40); osc(140,'sawtooth',0.11,0.38,0.025,20); osc(70,'sine',0.1,0.25,0.05) },
    kick:    () => { noise(0.9,0.12,280,20); osc(90,'sawtooth',0.14,0.48,0.025,30); osc(45,'sine',0.1,0.28,0.06) },
    block:   () => { noise(0.3,0.05,1000,200); osc(600,'sawtooth',0.06,0.35); osc(380,'square',0.05,0.25,0.05) },
    hurt:    () => { noise(0.65,0.16,360,40); osc(110,'sawtooth',0.18,0.38,0.06); osc(60,'sine',0.1,0.2,0.1) },
    whoosh:  () => { noise(0.25,0.18,2400,800); osc(200,'sawtooth',0.1,0.15,0.05) },
    special: () => {
      noise(0.4,0.4,300,0,0.05)
      const _a=[140,240,400,640,1000,1600];_a.forEach((f,i)=>osc(f,'sawtooth',0.35,0.24,i*0.04,i*10))
    },
    land:    () => { noise(0.5,0.10,160); osc(70,'sine',0.08,0.2,0.02) },
    ko:      () => {
      noise(0.6,0.8,200,0,0.05)
      const _a=[240,190,145,100,60];_a.forEach((f,i)=>osc(f,'sawtooth',0.7,0.48,i*0.28))
    },
    victory: () => { [349,440,523,698,880].forEach((f,i)=>osc(f,'triangle',0.32,0.28,i*0.11)) },
    metal:   () => { noise(0.15,0.06,2000,800); osc(2200,'square',0.06,0.32,0,100); osc(1400,'square',0.05,0.2,0.05) },
  },
]

// ── Background music engine (level-aware looping) ──
let _musicNodes = []
let _currentTheme = -1

const MUSIC_THEMES = [
  // Theme 0: Dojo — tense ceremonial drums + pentatonic
  (a,m) => {
    const bpm = 88, beat = 60/bpm
    const sched = (fn, t) => { try { fn(t) } catch {} }
    let t = a.currentTime + 0.1
    const loop = () => {
      // Kick on 1,3
      const _a=[0,beat*2];_a.forEach(off=>{
        noise(0.35,0.08,120,0, t+off)
        osc(60,'sine',0.2,0.3, t+off)
      })
      // Snare on 2,4
      const _a=[beat,beat*3];_a.forEach(off=>{
        noise(0.2,0.06,800,200, t+off)
      })
      // Pentatonic arpeggio D minor pent
      const notes=[294,349,392,440,523]
      notes.forEach((f,i)=>osc(f,'triangle',0.5,0.06, t+i*beat*0.5, 0))
      t += beat*4
    }
    const id = setInterval(loop, beat*4000); return id
  },
  // Theme 1: City — electronic pulse
  (a,m) => {
    const bpm=120, beat=60/bpm; let t=a.currentTime+0.1
    const loop=()=>{
      for(let i=0;i<8;i++){
        noise(0.2,0.04,300,0,t+i*beat*0.5)
        if(i%2===0)osc(80,'sine',0.15,0.2,t+i*beat*0.5)
      }
      const _a=[330,392,440,494,392,330,294,330];_a.forEach((f,i)=>osc(f,'square',0.4,0.03,t+i*beat*0.5))
      t+=beat*4
    }
    const id=setInterval(loop,beat*4000); return id
  },
  // Theme 2: Forest — eerie ambient
  (a,m) => {
    const bpm=70,beat=60/bpm; let t=a.currentTime+0.1
    const loop=()=>{
      const _a=[174,220,261];_a.forEach((f,i)=>osc(f,'sine',beat*4,0.04,t+i*beat*1.3))
      noise(0.06,beat*4,400,50,t)
      t+=beat*4
    }
    const id=setInterval(loop,beat*4000); return id
  },
  // Theme 3: Shadow realm — dark industrial
  (a,m) => {
    const bpm=100,beat=60/bpm; let t=a.currentTime+0.1
    const loop=()=>{
      const _a=[0,beat,beat*1.5,beat*2,beat*3,beat*3.5];_a.forEach(off=>noise(0.3,0.07,200,0,t+off))
      const _a=[55,55,65,55,73,65,55,49];_a.forEach((f,i)=>osc(f,'sawtooth',beat*0.9,0.05,t+i*beat*0.5))
      t+=beat*4
    }
    const id=setInterval(loop,beat*4000); return id
  },
]

function startMusic(themeIdx) {
  if (_currentTheme === themeIdx) return
  stopMusic()
  _currentTheme = themeIdx
  const a = AC(); if (!a) return
  try {
    const id = MUSIC_THEMES[themeIdx % MUSIC_THEMES.length](a, master())
    _musicNodes.push(id)
  } catch {}
}
function stopMusic() {
  _musicNodes.forEach(id=>clearInterval(id))
  _musicNodes = []; _currentTheme = -1
}

// ═══════════════════════════════════════════════════════════════════
//  CANVAS DIMENSIONS
// ═══════════════════════════════════════════════════════════════════
const CW = 480, CH = 340, FLOOR = CH - 50

// ═══════════════════════════════════════════════════════════════════
//  SKELETON — 17 joints, y-UP in local space, hip at origin
// ═══════════════════════════════════════════════════════════════════
const J = {
  HIP:0, SPINE:1, CHEST:2, NECK:3, HEAD:4,
  LS:5, LE:6, LH:7,   // Left  shoulder/elbow/hand
  RS:8, RE:9, RH:10,  // Right shoulder/elbow/hand
  LHip:11, LK:12, LF:13,  // Left  hip/knee/foot
  RHip:14, RK:15, RF:16,  // Right hip/knee/foot
}
const NJ = 17

// Bone definitions: [joint_a, joint_b, lineWidth]
const BONES = [
  [J.HIP, J.SPINE, 5.5],[J.SPINE, J.CHEST, 5.0],[J.CHEST, J.NECK, 4.5],[J.NECK, J.HEAD, 4.0],
  [J.CHEST, J.LS, 4.0],[J.LS, J.LE, 3.8],[J.LE, J.LH, 3.2],
  [J.CHEST, J.RS, 4.0],[J.RS, J.RE, 3.8],[J.RE, J.RH, 3.2],
  [J.HIP, J.LHip, 4.5],[J.LHip, J.LK, 4.8],[J.LK, J.LF, 4.2],
  [J.HIP, J.RHip, 4.5],[J.RHip, J.RK, 4.8],[J.RK, J.RF, 4.2],
]

function emptyPose() { return Array.from({length:NJ}, ()=>({x:0,y:0})) }

// Flat array [x0,y0, x1,y1, ...] → pose
function P(a) {
  const p = emptyPose()
  for (let i=0;i<NJ;i++) p[i]={x:a[i*2], y:a[i*2+1]}
  return p
}

// ═══════════════════════════════════════════════════════════════════
//  POSE LIBRARY  (y-up, hip = 0,0)
//  Body proportions: torso ~62px, arms ~44px, legs ~56px, head r=13
// ═══════════════════════════════════════════════════════════════════
const POSES = {
  idle: P([
    0,0, 0,20, 0,42, 1,56, 3,70,
    -20,40, -35,26, -33,10,
     20,40,  33,26,  31,10,
    -11,-2,-17,-30,-18,-57,
     11,-2, 17,-30, 18,-57,
  ]),
  // Walk cycle keyframes
  walk_a: P([
    0,3, 0,23, 1,45, 2,59, 4,73,
    -18,41,-36,30,-44,16,
     21,41, 28,27, 20,13,
    -13,-2,-28,-22,-42,-52,
     13,-2,  9,-32,  7,-58,
  ]),
  walk_b: P([
    0,3, 0,23,-1,45,-2,59,-4,73,
    -21,41,-28,27,-20,13,
     18,41, 36,30, 44,16,
    -13,-2, -9,-32, -7,-58,
     13,-2, 28,-22, 42,-52,
  ]),
  // Run is faster/more extreme than walk
  run_a: P([
    2,6,-1,26,-1,48, 0,62, 1,76,
    -16,44,-42,36,-56,22,
     24,44, 30,28, 22,12,
    -14,-2,-35,-16,-55,-44,
     14,-2, 10,-38,  6,-66,
  ]),
  run_b: P([
    -2,6, 1,26, 1,48, 0,62,-1,76,
    -24,44,-30,28,-22,12,
     16,44, 42,36, 56,22,
    -14,-2,-10,-38, -6,-66,
     14,-2, 35,-16, 55,-44,
  ]),
  // Jump
  jump_rise: P([
    0,0, 0,22, 0,45, 0,59, 0,73,
    -21,43,-40,57,-46,70,
     21,43, 40,57, 46,70,
    -13,-2,-24,-18,-26,-40,
     13,-2, 24,-18, 26,-40,
  ]),
  jump_peak: P([
    0,0, 0,20, 0,43, 0,57, 0,71,
    -23,41,-44,34,-58,20,
     23,41, 44,34, 58,20,
    -15,-2,-22,-24,-20,-50,
     15,-2, 22,-24, 20,-50,
  ]),
  jump_fall: P([
    0,0, 0,20, 0,42, 0,56, 0,70,
    -22,40,-40,30,-50,14,
     22,40, 40,30, 50,14,
    -13,-2,-18,-28,-16,-55,
     13,-2, 18,-28, 16,-55,
  ]),
  // Crouch / land absorb
  crouch: P([
    0,-12, 0,8, 0,28, 1,40, 3,52,
    -18,26,-32,12,-30,-2,
     18,26, 32,12, 30,-2,
    -13,-14,-22,-40,-26,-66,
     13,-14, 22,-40, 26,-66,
  ]),
  // Punches
  punch_R_wind: P([
    -4,0,-3,20,-2,42,-1,56, 1,70,
    -21,40,-38,28,-40,14,
     18,40, 12,56,  6,66,
    -11,-2,-15,-30,-16,-56,
     11,-2, 15,-30, 16,-56,
  ]),
  punch_R_ext: P([
    6,0, 6,20, 7,42, 8,55, 9,69,
    -17,40,-24,28,-20,14,
     22,43, 44,46, 66,48,
    -11,-2,-14,-30,-15,-56,
     11,-2, 14,-30, 15,-56,
  ]),
  punch_L_wind: P([
    4,0, 3,20, 2,42, 1,56,-1,70,
    -18,40,-12,56, -6,66,
     21,40, 38,28, 40,14,
    -11,-2,-15,-30,-16,-56,
     11,-2, 15,-30, 16,-56,
  ]),
  punch_L_ext: P([
    -6,0,-6,20,-7,42,-8,55,-9,69,
    -22,43,-44,46,-66,48,
     17,40, 24,28, 20,14,
    -11,-2,-14,-30,-15,-56,
     11,-2, 14,-30, 15,-56,
  ]),
  // Kick
  kick_R_wind: P([
    -4,0,-3,20,-2,42,-1,56,-1,70,
    -21,40,-40,28,-54,14,
     20,40, 30,30, 24,18,
    -13,-2,-15,-30,-14,-57,
     11,-2, 14,-14, 16, -6,
  ]),
  kick_R_ext: P([
    8,0, 8,19, 9,41,10,55,11,69,
    -18,39,-24,52,-20,64,
     22,40, 26,30, 22,18,
    -13,-2,-14,-30,-13,-57,
     11,-2, 38,-14, 64,-10,
  ]),
  kick_L_wind: P([
    4,0, 3,20, 2,42, 1,56, 1,70,
    -20,40,-30,30,-24,18,
     21,40, 40,28, 54,14,
    -11,-2,-14,-14,-16, -6,
     13,-2, 15,-30, 14,-57,
  ]),
  kick_L_ext: P([
    -8,0,-8,19,-9,41,-10,55,-11,69,
    -22,40,-26,30,-22,18,
     18,39, 24,52, 20,64,
    -11,-2,-38,-14,-64,-10,
     13,-2, 14,-30, 13,-57,
  ]),
  // Uppercut
  uppercut_wind: P([
    0,-8, 0,12, 0,32, 1,45, 2,58,
    -18,30,-32,16,-34, 2,
     18,30, 16,12, 10,-2,
    -13,-14,-20,-40,-24,-66,
     13,-14, 18,-38, 16,-64,
  ]),
  uppercut_strike: P([
    6,-12, 6,10, 7,34, 8,50,10,66,
    -16,32,-10,46, -8,58,
     24,40, 32,60, 28,78,
    -13,-14,-16,-40,-18,-66,
     13,-14, 14,-38, 12,-64,
  ]),
  // Sweep kick (low)
  sweep: P([
    -6,-6,-5,14,-4,34,-3,48,-2,62,
    -20,32,-36,18,-40, 4,
     16,32, 24,20, 18, 8,
    -13,-8,-20,-34,-22,-60,
     11,-8, 34,-4, 56, 0,
  ]),
  // Block (crossed forearms X-guard)
  block: P([
    -2,0,-2,20,-2,40,-1,54, 0,67,
    -21,38,-11,52,  1,64,
     19,38,  9,52, -3,64,
    -13,-2,-17,-32,-19,-59,
     13,-2, 17,-32, 19,-59,
  ]),
  // Hurt / stagger
  hurt: P([
    -11,0,-10,18,-9,38,-11,52,-14,65,
    -27,36,-46,22,-58,10,
     11,36, 20,20, 18, 6,
    -11,-2,-13,-28,-12,-54,
     11,-2, 17,-26, 20,-52,
  ]),
  // Knockdown — sprawled on ground
  knockdown: P([
    0,-9,-22,-15,-44,-18,-59,-16,-71,-12,
    -32,-8,-46, 4,-56,16,
    -29,-26,-21,-18,-15,-8,
     -7,-7,  2, 9, 14,26,
      8,-7, 22, 5, 38,18,
  ]),
  // Get up sequence
  getup_mid: P([
    -4,-4,-2,16, 0,36, 1,50, 2,64,
    -19,34,-32,20,-30, 6,
     17,34, 25,20, 21, 6,
    -13,-4,-20,-28,-22,-54,
     10,-4,  8,-24,  6,-50,
  ]),
  // Special — dramatic charge + release
  special_charge: P([
    0,0, 0,22, 0,46, 0,61, 0,76,
    -25,46,-46,60,-40,74,
     25,46, 46,60, 40,74,
    -13,-2,-20,-32,-24,-59,
     13,-2, 20,-32, 24,-59,
  ]),
  special_release: P([
    10,0,10,21,11,44,12,58,13,72,
    -12,44, 14,46, 36,48,
     26,46, 48,48, 68,48,
    -13,-2,-17,-32,-20,-59,
     11,-2, 12,-32, 10,-59,
  ]),
  // Victory pose
  victory_pose: P([
    0,4, 0,24, 0,46, 0,60, 0,74,
    -22,44,-44,56,-42,70,
     22,44, 40,62, 36,78,
    -12,-2,-16,-30,-18,-57,
     12,-2, 16,-30, 18,-57,
  ]),
}

// Ease-in-out cubic
function eio(t) { return t<0.5?4*t*t*t:(t-1)*(2*t-2)*(2*t-2)+1 }

function lerpPose(a, b, t) {
  const e = eio(Math.max(0,Math.min(1,t)))
  const out = emptyPose()
  for (let i=0;i<NJ;i++) out[i]={x:a[i].x+(b[i].x-a[i].x)*e, y:a[i].y+(b[i].y-a[i].y)*e}
  return out
}

// ═══════════════════════════════════════════════════════════════════
//  ANIMATION SEQUENCES
//  Each is array of {from, to, dur, hitFrame?}
//  hitFrame=true means the hit window is active during this segment
// ═══════════════════════════════════════════════════════════════════
const ANIMS = {
  idle:     [{f:'idle',     t:'idle',     d:0.5}],
  walk:     [{f:'walk_a',   t:'walk_b',   d:0.15},{f:'walk_b',   t:'walk_a',  d:0.15}],
  run:      [{f:'run_a',    t:'run_b',    d:0.10},{f:'run_b',    t:'run_a',   d:0.10}],
  jump:     [{f:'jump_rise',t:'jump_peak',d:0.16},{f:'jump_peak',t:'jump_fall',d:0.5}],
  crouch:   [{f:'crouch',   t:'crouch',   d:0.3}],
  punch_R:  [{f:'punch_R_wind',t:'punch_R_ext',d:0.07,hit:true},{f:'punch_R_ext',t:'idle',d:0.10},{f:'idle',t:'idle',d:0.06}],
  punch_L:  [{f:'punch_L_wind',t:'punch_L_ext',d:0.07,hit:true},{f:'punch_L_ext',t:'idle',d:0.10},{f:'idle',t:'idle',d:0.06}],
  kick_R:   [{f:'kick_R_wind',t:'kick_R_ext',d:0.09,hit:true},{f:'kick_R_ext',t:'idle',d:0.14},{f:'idle',t:'idle',d:0.08}],
  kick_L:   [{f:'kick_L_wind',t:'kick_L_ext',d:0.09,hit:true},{f:'kick_L_ext',t:'idle',d:0.14},{f:'idle',t:'idle',d:0.08}],
  uppercut: [{f:'uppercut_wind',t:'uppercut_strike',d:0.08,hit:true},{f:'uppercut_strike',t:'idle',d:0.16},{f:'idle',t:'idle',d:0.09}],
  sweep:    [{f:'crouch',t:'sweep',d:0.10,hit:true},{f:'sweep',t:'idle',d:0.18},{f:'idle',t:'idle',d:0.09}],
  block:    [{f:'block',t:'block',d:0.5}],
  hurt:     [{f:'hurt',t:'hurt',d:0.20},{f:'hurt',t:'idle',d:0.12}],
  knockdown:[{f:'knockdown',t:'knockdown',d:1.4}],
  getup:    [{f:'knockdown',t:'getup_mid',d:0.28},{f:'getup_mid',t:'idle',d:0.18}],
  special:  [{f:'special_charge',t:'special_charge',d:0.14},{f:'special_charge',t:'special_release',d:0.12,hit:true},{f:'special_release',t:'idle',d:0.20}],
  victory:  [{f:'victory_pose',t:'victory_pose',d:1.5}],
}

const LOOPING = new Set(['idle','walk','run','block','knockdown','crouch'])

// ═══════════════════════════════════════════════════════════════════
//  FIGHTER STATE
// ═══════════════════════════════════════════════════════════════════
function newFighter(isPlayer, bossIdx = 0) {
  const b = BOSSES[bossIdx]
  return {
    x: isPlayer ? 100 : 375,
    y: FLOOR,
    vy: 0, vx: 0, lastVx: 0,
    onGround: true,
    facingRight: isPlayer,
    hp: isPlayer ? 100 : b.hp,
    maxHp: isPlayer ? 100 : b.hp,
    // Anim
    animName: 'idle',
    animSeqIdx: 0,
    animT: 0,
    pose: POSES.idle ? [...POSES.idle] : emptyPose(),
    locked: false,          // locked during attack animation
    hitActive: false,
    hitConnected: false,
    // Combat
    action: 'idle',
    blocking: false,
    stunTimer: 0,
    invTimer: 0,
    comboCnt: 0,
    comboTimer: 0,
    // Visual
    color: isPlayer ? '#0a0a0a' : b.color,
    glowColor: isPlayer ? '#1E90FF' : b.glowColor,
    hitFlash: 0,
    weapon: isPlayer ? 'none' : b.weapon,
    // Cosmetic
    isPlayer, bossIdx,
    diff: b.diff || 0.5,
    style: b.style || 'brawler',
    speed: b.speed || 140,
    // AI
    aiTimer: 0, aiDir: 0, aiJump: false,
  }
}

// ── Anim controller ──
function setAnim(f, name) {
  if (!ANIMS[name]) return
  // Don't restart same looping anim
  if (f.animName === name && LOOPING.has(name)) return
  f.animName = name
  f.animSeqIdx = 0
  f.animT = 0
  f.locked = !LOOPING.has(name)
  f.hitActive = false
}

function tickAnim(f, dt) {
  const seq = ANIMS[f.animName]; if (!seq) return
  const frame = seq[f.animSeqIdx]; if (!frame) return
  f.animT += dt
  const t = Math.min(f.animT / frame.d, 1)
  const pA = POSES[frame.f] || POSES.idle
  const pB = POSES[frame.t] || POSES.idle
  f.pose = lerpPose(pA, pB, t)
  f.hitActive = !!(frame.hit && !f.hitConnected && t > 0.35 && t < 0.9)
  if (f.animT >= frame.d) {
    f.animT -= frame.d
    f.animSeqIdx++
    if (f.animSeqIdx >= seq.length) {
      if (LOOPING.has(f.animName)) {
        f.animSeqIdx = 0
      } else {
        f.animSeqIdx = seq.length - 1
        f.locked = false
        f.hitActive = false
        setAnim(f, 'idle')
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════
function spawnHit(pts, x, y, col, n=16, spd=4) {
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n+Math.random()*0.8-0.4
    pts.push({x,y,vx:Math.cos(a)*spd*(0.4+Math.random()*0.8),vy:Math.sin(a)*spd*(0.4+Math.random()*0.8)-1.5,col,life:1,d:0.045+Math.random()*0.04,sz:2+Math.random()*3.5,trail:[]})
  }
}
function spawnSpecial(pts,x,y,col) {
  for(let i=0;i<50;i++){
    const a=Math.PI*2*i/50,spd=4+Math.random()*9
    pts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-3,col,life:1,d:0.018+Math.random()*0.02,sz:3+Math.random()*6,trail:[]})
  }
}
function spawnBlood(pts,x,y) {
  for(let i=0;i<8;i++){
    const a=-Math.PI/2+(-0.8+Math.random()*1.6)
    pts.push({x,y,vx:Math.cos(a)*(1+Math.random()*3),vy:Math.sin(a)*(2+Math.random()*5)-2,col:'#cc0000',life:1,d:0.03+Math.random()*0.025,sz:2+Math.random()*2.5,trail:[]})
  }
}
function spawnDust(pts,x,y) {
  for(let i=0;i<6;i++){
    pts.push({x:x+Math.random()*20-10,y,vx:(Math.random()-0.5)*2,vy:-Math.random()*2.5,col:'rgba(200,180,140,0.6)',life:1,d:0.04+Math.random()*0.03,sz:4+Math.random()*6,trail:[]})
  }
}

function tickParticles(pts, dt) {
  for(let i=pts.length-1;i>=0;i--){
    const p=pts[i]
    p.trail.push({x:p.x,y:p.y})
    if(p.trail.length>4) p.trail.shift()
    p.x+=p.vx; p.y+=p.vy
    p.vx*=0.88; p.vy*=0.88; p.vy+=0.25
    p.life-=p.d
    if(p.life<=0) pts.splice(i,1)
  }
}

function drawParticles(ctx, pts) {
  pts.forEach(p=>{
    if(p.trail.length>1){
      ctx.save()
      ctx.strokeStyle=p.col; ctx.lineWidth=p.sz*p.life*0.5; ctx.globalAlpha=p.life*0.35
      ctx.beginPath(); ctx.moveTo(p.trail[0].x,p.trail[0].y)
      p.trail.forEach(pt=>ctx.lineTo(pt.x,pt.y))
      ctx.stroke(); ctx.restore()
    }
    ctx.save()
    ctx.globalAlpha=p.life*0.9
    ctx.fillStyle=p.col; ctx.shadowColor=p.col; ctx.shadowBlur=8
    ctx.beginPath(); ctx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2); ctx.fill()
    ctx.restore()
  })
}

// ═══════════════════════════════════════════════════════════════════
//  BACKGROUND RENDERER — 4 distinct cinematic environments
// ═══════════════════════════════════════════════════════════════════
// Pre-generated static layer cache
const BG_CACHE = {}

function getBgCanvas(key, w, h, drawFn) {
  if (!BG_CACHE[key]) {
    const c = document.createElement('canvas'); c.width=w; c.height=h
    drawFn(c.getContext('2d'))
    BG_CACHE[key] = c
  }
  return BG_CACHE[key]
}

function drawBG(ctx, bgType, time) {
  ctx.clearRect(0,0,CW,CH)

  if (bgType === 'dojo') {
    // Static layer (cached)
    const st = getBgCanvas('dojo_static', CW, CH, (c2)=>{
      c2.fillStyle='#0f0400'; c2.fillRect(0,0,CW,CH)
      // Back wall gradient
      const wg=c2.createLinearGradient(0,0,0,FLOOR)
      wg.addColorStop(0,'#180800'); wg.addColorStop(0.7,'#251200'); wg.addColorStop(1,'#1a0c00')
      c2.fillStyle=wg; c2.fillRect(0,0,CW,FLOOR)
      // Wall panels horizontal
      c2.strokeStyle='#2e1500'; c2.lineWidth=1
      for(let y=30;y<FLOOR;y+=55){c2.beginPath();c2.moveTo(0,y);c2.lineTo(CW,y);c2.stroke()}
      // Wall panels vertical
      for(let x=0;x<CW;x+=78){c2.beginPath();c2.moveTo(x,0);c2.lineTo(x,FLOOR);c2.stroke()}
      // Pillars
      const pillar=(px)=>{
        c2.fillStyle='#120600'; c2.fillRect(px,0,26,FLOOR)
        c2.fillStyle='#1e0c00'; c2.fillRect(px+2,0,6,FLOOR); c2.fillRect(px+18,0,6,FLOOR)
        c2.fillStyle='#2a1200'; c2.fillRect(px+8,0,10,FLOOR)
      }
      pillar(0); pillar(CW-26)
      // Floor boards
      const fg=c2.createLinearGradient(0,FLOOR,0,CH)
      fg.addColorStop(0,'#2e1600'); fg.addColorStop(1,'#140a00')
      c2.fillStyle=fg; c2.fillRect(0,FLOOR,CW,CH-FLOOR)
      c2.strokeStyle='rgba(0,0,0,0.3)'; c2.lineWidth=1
      for(let x=0;x<CW;x+=48){c2.beginPath();c2.moveTo(x,FLOOR);c2.lineTo(x+24,CH);c2.stroke()}
      // Baseboard
      c2.fillStyle='#3d1c00'; c2.fillRect(0,FLOOR,CW,3)
    })
    ctx.drawImage(st,0,0)
    // Dynamic lanterns with flicker
    const lantern=(lx,ly)=>{
      const flicker=0.9+Math.sin(time*7.3+lx)*0.06+Math.sin(time*13.1+ly)*0.04
      ctx.save()
      // Glow pool on wall/floor
      ctx.globalAlpha=(0.08+Math.sin(time*1.5+lx)*0.015)*flicker
      const rg=ctx.createRadialGradient(lx,ly+10,0,lx,ly+10,120)
      rg.addColorStop(0,'#FF7700'); rg.addColorStop(1,'transparent')
      ctx.fillStyle=rg; ctx.fillRect(lx-120,ly-100,240,240)
      ctx.restore()
      ctx.save()
      // Chain
      ctx.strokeStyle='#555'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(lx,ly-16); ctx.lineTo(lx,ly); ctx.stroke()
      // Lantern body
      ctx.shadowColor='#FF5500'; ctx.shadowBlur=20*flicker
      ctx.fillStyle='#8B1A00'; ctx.fillRect(lx-10,ly,20,18)
      ctx.fillStyle='#FF4400'
      ctx.fillRect(lx-2,ly+2,4,14); ctx.fillRect(lx-2,ly+2,14,4)
      // Flame
      ctx.globalAlpha=0.6+Math.sin(time*8+lx)*0.2
      ctx.fillStyle='#FFAA00'
      ctx.beginPath(); ctx.ellipse(lx,ly+5,3,5,0,0,Math.PI*2); ctx.fill()
      ctx.restore()
    }
    lantern(34,32); lantern(CW-34,32); lantern(CW/2,18); lantern(155,45); lantern(325,45)

  } else if (bgType === 'city') {
    const st=getBgCanvas('city_static',CW,CH,(c2)=>{
      // Deep night sky
      const sky=c2.createLinearGradient(0,0,0,FLOOR)
      sky.addColorStop(0,'#010008'); sky.addColorStop(0.5,'#04000f'); sky.addColorStop(1,'#08001e')
      c2.fillStyle=sky; c2.fillRect(0,0,CW,CH)
      // Stars
      for(let i=0;i<80;i++){
        const sx=Math.sin(i*73.1)*CW/2+CW/2, sy=Math.sin(i*41.3)*(FLOOR*0.5)+10
        c2.fillStyle=`rgba(255,255,255,${0.2+Math.sin(i)*0.3})`
        c2.fillRect(sx,sy,1,1)
      }
      // Building silhouettes
      const bdata=[[0,145,55],[50,110,40],[96,158,50],[150,80,44],[198,132,54],[258,92,40],[302,152,48],[354,72,42],[398,122,46],[444,95,38]]
      bdata.forEach(([bx,bh,bw])=>{
        const bg2=c2.createLinearGradient(bx,FLOOR-bh,bx,FLOOR)
        bg2.addColorStop(0,'#05001a'); bg2.addColorStop(1,'#08002a')
        c2.fillStyle=bg2; c2.fillRect(bx,FLOOR-bh,bw,bh)
        c2.fillStyle='#04000f'; c2.fillRect(bx,FLOOR-bh,2,bh); c2.fillRect(bx+bw-2,FLOOR-bh,2,bh)
        // Antenna
        c2.strokeStyle='#0a0025'; c2.lineWidth=1.5
        c2.beginPath(); c2.moveTo(bx+bw/2,FLOOR-bh); c2.lineTo(bx+bw/2,FLOOR-bh-18); c2.stroke()
      })
      // Floor (wet reflection)
      c2.fillStyle='#04000f'; c2.fillRect(0,FLOOR,CW,CH-FLOOR)
    })
    ctx.drawImage(st,0,0)
    // Dynamic: windows (slowly twinkling), neon signs, rain
    // Building windows
    const bdata=[[0,145,55],[50,110,40],[96,158,50],[150,80,44],[198,132,54],[258,92,40],[302,152,48],[354,72,42],[398,122,46],[444,95,38]]
    bdata.forEach(([bx,bh,bw])=>{
      for(let wy=FLOOR-bh+8;wy<FLOOR-8;wy+=14){
        for(let wx=bx+4;wx<bx+bw-4;wx+=9){
          if((wx^wy^bx)%5<3){
            const flicker=Math.sin(time*0.5+wx*0.3+wy*0.2)
            if(flicker>-0.3){
              ctx.globalAlpha=(0.4+flicker*0.2)*Math.max(0,1)
              ctx.fillStyle=(wx*wy)%7===0?'#00CCFF':'#FFD700'
              ctx.fillRect(wx,wy,4,6); ctx.globalAlpha=1
            }
          }
        }
      }
    })
    // Neon signs — animated
    const neon=(nx,ny,col,t2,len=34)=>{
      ctx.save(); ctx.globalAlpha=0.7+Math.sin(t2)*0.3
      ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.shadowColor=col; ctx.shadowBlur=16
      ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(nx+len,ny); ctx.stroke(); ctx.restore()
    }
    neon(54,FLOOR-38,'#FF00FF',time*2); neon(158,FLOOR-54,'#00FFFF',time*1.7,40)
    neon(278,FLOOR-32,'#FF2200',time*2.4); neon(370,FLOOR-46,'#FFAA00',time*1.5)
    // Rain streaks
    ctx.save(); ctx.strokeStyle='rgba(150,180,255,0.08)'; ctx.lineWidth=0.6
    for(let i=0;i<60;i++){
      const rx=(i*53+time*150)%CW, ry=(time*220+i*61)%CH
      ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx+1.5,ry+10); ctx.stroke()
    }
    ctx.restore()
    // Reflections in wet floor
    ctx.save(); ctx.globalAlpha=0.15
    const ref=ctx.createLinearGradient(0,FLOOR,0,CH)
    ref.addColorStop(0,'#2200CC'); ref.addColorStop(0.5,'#001166'); ref.addColorStop(1,'transparent')
    ctx.fillStyle=ref; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
    // Neon reflection ripples
    ctx.globalAlpha=0.08+Math.sin(time*3)*0.04
    ctx.fillStyle='#FF00FF'; ctx.fillRect(54,FLOOR+2,34,6)
    ctx.fillStyle='#00FFFF'; ctx.fillRect(158,FLOOR+2,40,6)
    ctx.restore()

  } else if (bgType === 'forest') {
    const st=getBgCanvas('forest_static',CW,CH,(c2)=>{
      c2.fillStyle='#000e00'; c2.fillRect(0,0,CW,CH)
      // Moonlit sky gradient
      const sg=c2.createRadialGradient(380,50,0,380,50,200)
      sg.addColorStop(0,'#0a1a00'); sg.addColorStop(1,'#000e00')
      c2.fillStyle=sg; c2.fillRect(0,0,CW,FLOOR)
      // Moon
      c2.save(); c2.shadowColor='#CCFFAA'; c2.shadowBlur=40
      c2.fillStyle='#EEFFD8'; c2.beginPath(); c2.arc(382,48,20,0,Math.PI*2); c2.fill(); c2.restore()
      // Moon craters
      c2.fillStyle='rgba(0,20,0,0.25)'
      c2.beginPath(); c2.arc(376,44,5,0,Math.PI*2); c2.fill()
      c2.beginPath(); c2.arc(388,52,3,0,Math.PI*2); c2.fill()
      // Far tree layer
      const drawTrees=(count,baseY,sz,alpha,col)=>{
        c2.globalAlpha=alpha; c2.fillStyle=col
        for(let i=0;i<count;i++){
          const tx=i*(CW/(count-1)),th=sz*(0.8+Math.sin(i*2.3)*0.2)
          c2.fillRect(tx-sz/10,baseY-th,sz/5,th)
          c2.beginPath(); c2.moveTo(tx,baseY-th-sz*0.7); c2.lineTo(tx-sz/2,baseY-th+sz*0.2); c2.lineTo(tx+sz/2,baseY-th+sz*0.2); c2.closePath(); c2.fill()
          c2.beginPath(); c2.moveTo(tx,baseY-th-sz); c2.lineTo(tx-sz/3,baseY-th-sz*0.1); c2.lineTo(tx+sz/3,baseY-th-sz*0.1); c2.closePath(); c2.fill()
        }
        c2.globalAlpha=1
      }
      drawTrees(10,FLOOR-10,42,0.22,'#001a00')
      drawTrees(8,FLOOR-5,62,0.45,'#001e00')
      drawTrees(6,FLOOR,85,0.70,'#002200')
      // Ground
      const fg=c2.createLinearGradient(0,FLOOR,0,CH)
      fg.addColorStop(0,'#001e00'); fg.addColorStop(1,'#000a00')
      c2.fillStyle=fg; c2.fillRect(0,FLOOR,CW,CH-FLOOR)
      // Grass tufts
      c2.strokeStyle='#003300'; c2.lineWidth=1.5
      for(let x=0;x<CW;x+=8){c2.beginPath();c2.moveTo(x,FLOOR);c2.lineTo(x-2,FLOOR-6+Math.sin(x)*3);c2.stroke()}
    })
    ctx.drawImage(st,0,0)
    // Moonbeam sweep
    ctx.save(); ctx.globalAlpha=0.04+Math.sin(time*0.3)*0.02
    const mb=ctx.createLinearGradient(382,48,240,FLOOR)
    mb.addColorStop(0,'#CCFFAA'); mb.addColorStop(1,'transparent')
    ctx.fillStyle=mb; ctx.beginPath(); ctx.moveTo(382,48); ctx.lineTo(280,FLOOR); ctx.lineTo(420,FLOOR); ctx.closePath(); ctx.fill(); ctx.restore()
    // Animated fireflies
    for(let i=0;i<24;i++){
      const fx=(i*91+time*14)%CW, fy=FLOOR-18-(i*51)%100
      const glow=0.25+Math.sin(time*2.4+i*1.1)*0.5
      ctx.save(); ctx.globalAlpha=Math.max(0,glow)
      ctx.fillStyle='#88FF44'; ctx.shadowColor='#88FF44'; ctx.shadowBlur=12
      ctx.beginPath(); ctx.arc(fx,fy,1.8,0,Math.PI*2); ctx.fill()
      ctx.restore()
    }
    // Fog wisps near ground
    for(let i=0;i<5;i++){
      const fx=(i*110+time*6)%CW
      ctx.save(); ctx.globalAlpha=0.04+Math.sin(time*0.5+i)*0.02
      const wg=ctx.createRadialGradient(fx,FLOOR-5,0,fx,FLOOR-5,50)
      wg.addColorStop(0,'#88FFAA'); wg.addColorStop(1,'transparent')
      ctx.fillStyle=wg; ctx.fillRect(fx-50,FLOOR-30,100,40); ctx.restore()
    }

  } else { // shadow realm
    ctx.fillStyle='#000'; ctx.fillRect(0,0,CW,CH)
    // Void tendrils — slow animated
    ctx.save()
    for(let i=0;i<8;i++){
      const ox=60+i*52, oy=20+Math.sin(time*0.6+i*0.8)*35
      ctx.globalAlpha=0.08+Math.sin(time*0.8+i)*0.04
      const vg=ctx.createRadialGradient(ox,oy,0,ox,oy,60)
      vg.addColorStop(0,'#9900FF'); vg.addColorStop(1,'transparent')
      ctx.fillStyle=vg; ctx.fillRect(ox-62,oy-62,124,124)
    }
    ctx.restore()
    // Floating rune circles
    for(let i=0;i<3;i++){
      const rx=CW/4*(i+1), ry=FLOOR/2+Math.sin(time*0.4+i*2.1)*20
      ctx.save(); ctx.globalAlpha=0.07+Math.sin(time+i)*0.04
      ctx.strokeStyle='#6600AA'; ctx.lineWidth=1
      ctx.beginPath(); ctx.arc(rx,ry,30+i*15,time*0.2*(i%2===0?1:-1),time*0.2*(i%2===0?1:-1)+Math.PI*2); ctx.stroke()
      ctx.beginPath(); ctx.arc(rx,ry,20+i*10,-time*0.3,Math.PI*2-time*0.3); ctx.stroke()
      ctx.restore()
    }
    // Ground cracks with glow
    ctx.save(); ctx.strokeStyle='#7700CC'; ctx.lineWidth=2; ctx.shadowColor='#AA00FF'; ctx.shadowBlur=10
    const cracks=[[70,FLOOR,105,FLOOR-10,90,FLOOR-5],[190,FLOOR,225,FLOOR-14,215,FLOOR-7],[305,FLOOR,340,FLOOR-9,330,FLOOR-4],[400,FLOOR,445,FLOOR-12]]
    cracks.forEach(pts=>{
      ctx.beginPath(); ctx.moveTo(pts[0],pts[1])
      for(let pi=2;pi<pts.length;pi+=2) ctx.lineTo(pts[pi],pts[pi+1])
      ctx.stroke()
    })
    ctx.restore()
    // Energy floor grid
    ctx.save(); ctx.globalAlpha=0.12+Math.sin(time*2)*0.06
    ctx.strokeStyle='#8800FF'; ctx.lineWidth=1; ctx.shadowColor='#9900FF'; ctx.shadowBlur=6
    for(let fx=0;fx<CW;fx+=30){ctx.beginPath();ctx.moveTo(fx,FLOOR);ctx.lineTo(fx+15,CH);ctx.stroke()}
    ctx.restore()
    // Shadow floor
    const sf=ctx.createLinearGradient(0,FLOOR,0,CH)
    sf.addColorStop(0,'#0e001e'); sf.addColorStop(1,'#000')
    ctx.fillStyle=sf; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
    // Portal swirl (boss specific)
    ctx.save(); ctx.globalAlpha=0.06+Math.sin(time*0.7)*0.03
    const pg=ctx.createRadialGradient(CW/2,FLOOR,0,CW/2,FLOOR,180)
    pg.addColorStop(0,'#AA00FF'); pg.addColorStop(0.5,'#440088'); pg.addColorStop(1,'transparent')
    ctx.fillStyle=pg; ctx.fillRect(0,FLOOR-80,CW,160); ctx.restore()
  }

  // Universal floor line
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.lineTo(CW,FLOOR); ctx.stroke()
}

// ═══════════════════════════════════════════════════════════════════
//  FIGHTER RENDERER
// ═══════════════════════════════════════════════════════════════════
function drawFighter(ctx, f, time) {
  const pose = f.pose
  const rx = f.x, ry = f.y
  // Convert local (y-up) to screen (y-down)
  const sx = j => rx + (f.facingRight ? pose[j].x : -pose[j].x)
  const sy = j => ry - pose[j].y

  ctx.save()

  // Ground shadow (ellipse)
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#000'
  const shadowW = f.onGround ? 22 : Math.max(7, 22*(1-(FLOOR-f.y)/200))
  ctx.beginPath(); ctx.ellipse(rx, FLOOR+6, shadowW, 4.5, 0, 0, Math.PI*2); ctx.fill()
  ctx.globalAlpha = 1

  // Hit flash
  if (f.hitFlash > 0) {
    ctx.save(); ctx.globalAlpha = f.hitFlash * 0.6
    ctx.fillStyle = '#FF1100'
    ctx.beginPath(); ctx.arc(sx(J.HEAD), sy(J.HEAD), 19, 0, Math.PI*2); ctx.fill()
    ctx.restore()
  }

  // Base glow
  const glowIntensity = f.blocking ? 18 : (f.animName === 'special' ? 36 : 7)
  ctx.shadowColor = f.glowColor; ctx.shadowBlur = glowIntensity

  // Body fill for silhouette
  ctx.strokeStyle = f.color; ctx.fillStyle = f.color
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'

  // Draw bones
  BONES.forEach(([a,b,lw])=>{
    ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(sx(a),sy(a)); ctx.lineTo(sx(b),sy(b)); ctx.stroke()
  })

  // Head
  ctx.beginPath(); ctx.arc(sx(J.HEAD), sy(J.HEAD), 12.5, 0, Math.PI*2); ctx.fill()

  // Eyes (facing direction)
  ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = f.glowColor
  const ex = sx(J.HEAD)+(f.facingRight?4:-4), ey = sy(J.HEAD)-2
  ctx.globalAlpha = 0.9
  ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI*2); ctx.fill()
  ctx.restore()

  // Joint highlights
  ctx.shadowBlur = 0; ctx.fillStyle = f.color
  const _a=[J.LE,J.RE,J.LK,J.RK,J.LS,J.RS];_a.forEach(ji=>{
    ctx.beginPath(); ctx.arc(sx(ji),sy(ji),3,0,Math.PI*2); ctx.fill()
  })

  // Weapon
  if (f.weapon && f.weapon !== 'none') drawWeapon(ctx, f, sx, sy, time)

  // Block shield effect
  if (f.blocking) {
    ctx.save(); ctx.globalAlpha=0.25+Math.sin(time*6)*0.1
    ctx.fillStyle=f.glowColor; ctx.shadowColor=f.glowColor; ctx.shadowBlur=20
    ctx.beginPath(); ctx.ellipse(sx(J.CHEST)+6*(f.facingRight?1:-1),sy(J.CHEST),22,28,0,0,Math.PI*2); ctx.fill()
    ctx.restore()
  }

  ctx.restore()
}

function drawWeapon(ctx, f, sx, sy, time) {
  const hx=sx(J.RH), hy=sy(J.RH)
  const ex=sx(J.RE), ey=sy(J.RE)
  const ang=Math.atan2(hy-ey, hx-ex)
  ctx.save(); ctx.translate(hx,hy); ctx.rotate(ang); ctx.lineCap='round'

  if (f.weapon==='sword') {
    ctx.shadowColor='#6699FF'; ctx.shadowBlur=16
    // Blade core
    ctx.strokeStyle='#C8E8FF'; ctx.lineWidth=2.8
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(46,0); ctx.stroke()
    // Blade edge highlight
    ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(4,-1.8); ctx.lineTo(44,-1.8); ctx.stroke()
    // Blade fuller
    ctx.strokeStyle='rgba(100,150,255,0.3)'; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(4,1); ctx.lineTo(42,1); ctx.stroke()
    // Guard
    ctx.strokeStyle='#8899AA'; ctx.lineWidth=4.5
    ctx.beginPath(); ctx.moveTo(8,-9); ctx.lineTo(8,9); ctx.stroke()
    // Grip
    ctx.strokeStyle='#4A2515'; ctx.lineWidth=4
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-14,0); ctx.stroke()
    // Pommel
    ctx.fillStyle='#6688AA'; ctx.beginPath(); ctx.arc(-16,0,3.5,0,Math.PI*2); ctx.fill()
  } else if (f.weapon==='staff') {
    ctx.shadowColor='#BB44FF'; ctx.shadowBlur=16
    ctx.strokeStyle='#7A3D0A'; ctx.lineWidth=4.5
    ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(56,0); ctx.stroke()
    // Wood grain
    ctx.strokeStyle='rgba(60,20,0,0.3)'; ctx.lineWidth=1.5
    const _a=[-8,8,24];_a.forEach(px=>{ctx.beginPath();ctx.moveTo(px,-2);ctx.lineTo(px+4,2);ctx.stroke()})
    const puls=Math.sin(time*4)*1.5
    ctx.fillStyle='#CC44FF'; ctx.shadowColor='#EE88FF'; ctx.shadowBlur=20+puls
    ctx.beginPath(); ctx.arc(58,0,7,0,Math.PI*2); ctx.fill()
    ctx.shadowBlur=14+puls
    ctx.beginPath(); ctx.arc(-28,0,5.5,0,Math.PI*2); ctx.fill()
  } else if (f.weapon==='nunchucks') {
    const swT=time*7, swA=Math.sin(swT)*1.4
    ctx.strokeStyle='#3C200E'; ctx.lineWidth=5; ctx.shadowColor='#FF9900'; ctx.shadowBlur=10
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(20,0); ctx.stroke()
    const c2x=20+Math.cos(swA)*14, c2y=Math.sin(swA)*14
    // Chain links
    ctx.strokeStyle='rgba(180,180,180,0.8)'; ctx.lineWidth=2; ctx.setLineDash([3,3])
    ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(c2x,c2y); ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle='#3C200E'; ctx.lineWidth=5
    const endX=c2x+Math.cos(swA+0.5)*20, endY=c2y+Math.sin(swA+0.5)*20
    ctx.beginPath(); ctx.moveTo(c2x,c2y); ctx.lineTo(endX,endY); ctx.stroke()
    // Grip wraps
    ctx.strokeStyle='rgba(220,0,0,0.5)'; ctx.lineWidth=1.5
    const _a=[5,10,15];_a.forEach(px=>{ctx.beginPath();ctx.moveTo(px,-2.5);ctx.lineTo(px,2.5);ctx.stroke()})
  }
  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════════
//  BOSS DEFINITIONS
// ═══════════════════════════════════════════════════════════════════
const BOSSES = [
  {name:'GRUNT',      hp:80, speed:118,color:'#151515',glowColor:'#404040',weapon:'none',      style:'brawler',  bg:'dojo',  diff:0.28,sfxSet:0,musicTheme:0,intro:'A rookie thug. Time to warm up.'},
  {name:'BLADE',      hp:105,speed:130,color:'#080820',glowColor:'#3355FF',weapon:'sword',     style:'swordsman',bg:'dojo',  diff:0.40,sfxSet:0,musicTheme:0,intro:'Cold steel. Colder eyes.'},
  {name:'STRIKER',    hp:115,speed:182,color:'#1e0000',glowColor:'#FF1100',weapon:'none',      style:'speedster',bg:'city',  diff:0.52,sfxSet:0,musicTheme:1,intro:'He\'s already moving. Keep up.'},
  {name:'STAFF MONK', hp:132,speed:128,color:'#0b0018',glowColor:'#9933FF',weapon:'staff',     style:'mage',     bg:'city',  diff:0.60,sfxSet:1,musicTheme:1,intro:'He bends reality. You must bend too.'},
  {name:'CHAIN',      hp:144,speed:155,color:'#181200',glowColor:'#FFAA00',weapon:'nunchucks', style:'trickster',bg:'forest',diff:0.68,sfxSet:1,musicTheme:2,intro:'Unpredictable. Vicious. Never stops.'},
  {name:'PHANTOM',    hp:160,speed:192,color:'#002000',glowColor:'#00FF55',weapon:'none',      style:'speedster',bg:'forest',diff:0.74,sfxSet:1,musicTheme:2,intro:'You can\'t hit what you can\'t see.'},
  {name:'WARLORD',    hp:180,speed:140,color:'#1a0700',glowColor:'#FF6600',weapon:'sword',     style:'brawler',  bg:'shadow',diff:0.80,sfxSet:2,musicTheme:3,intro:'The executioner. Hundred victories.'},
  {name:'SHADOW MONK',hp:196,speed:148,color:'#0c0013',glowColor:'#FF00BB',weapon:'staff',     style:'mage',     bg:'shadow',diff:0.86,sfxSet:2,musicTheme:3,intro:'Between worlds. Between life and nothing.'},
  {name:'DEATH CHAIN',hp:218,speed:164,color:'#130000',glowColor:'#FF0000',weapon:'nunchucks', style:'master',   bg:'shadow',diff:0.92,sfxSet:2,musicTheme:3,intro:'The last sound is always chains.'},
  {name:'SHADOW KING',hp:270,speed:170,color:'#040004',glowColor:'#AA00FF',weapon:'sword',     style:'master',   bg:'shadow',diff:1.00,sfxSet:2,musicTheme:3,intro:'I am the shadow you cast. I always win.'},
]

// ═══════════════════════════════════════════════════════════════════
//  AI ENGINE
// ═══════════════════════════════════════════════════════════════════
const AI_MOVE_SETS = {
  brawler:   ['punch_R','punch_R','kick_R','uppercut','punch_L'],
  speedster: ['punch_R','punch_L','punch_R','punch_L','kick_R','kick_L'],
  mage:      ['kick_R','uppercut','special','punch_R','sweep'],
  trickster: ['kick_L','kick_R','punch_R','punch_L','sweep','kick_R'],
  swordsman: ['punch_R','kick_R','uppercut','punch_R','kick_R'],
  master:    ['punch_R','punch_L','kick_R','uppercut','special','sweep','kick_L','punch_R'],
}

function aiTick(e, p, dt, diffMult) {
  e.aiTimer -= dt
  if (e.aiTimer > 0) return
  if (e.stunTimer > 0 || e.locked) return

  const dist = Math.abs(e.x - p.x)
  const eff = Math.min(1, e.diff * diffMult)

  // Reactive block
  if (p.hitActive && dist < 110 && Math.random() < eff * 0.55) {
    doAttack(e, 'block'); e.aiTimer = 0.3; return
  }

  const idealDist = e.style === 'speedster' ? 75 : 90
  if (dist > idealDist + 30) {
    // Approach — run if far
    e.aiDir = e.x > p.x ? -1 : 1
    e.aiTimer = 0.04
  } else if (dist < 50 && Math.random() < 0.35) {
    // Too close — back off
    e.aiDir = e.x > p.x ? 1 : -1; e.aiTimer = 0.12
  } else {
    e.aiDir = 0
    if (Math.random() < eff && dist <= idealDist + 15) {
      const pool = AI_MOVE_SETS[e.style] || AI_MOVE_SETS.brawler
      const act = pool[Math.floor(Math.random() * pool.length)]
      doAttack(e, act)
      e.aiTimer = 0.20 + Math.random() * (0.45 - eff * 0.22)
    } else {
      // Random jump
      if (dist > 160 && Math.random() < 0.15 * eff) doJump(e)
      e.aiTimer = 0.06
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════════════
const ATTACK_DMG   = {punch_R:9,punch_L:10,kick_R:15,kick_L:14,uppercut:22,sweep:12,special:40}
const ATTACK_STUN  = {punch_R:0.22,punch_L:0.22,kick_R:0.34,kick_L:0.34,uppercut:0.58,sweep:0.38,special:1.0}
const ATTACK_RANGE = {punch_R:84,punch_L:84,kick_R:102,kick_L:102,uppercut:78,sweep:110,special:122}
const ATTACK_PUSH  = {punch_R:5,punch_L:5,kick_R:7,kick_L:7,uppercut:0,sweep:6,special:10}
const ATTACK_PUSHUP= {uppercut:420,special:300}

function getSFX(f) {
  const bossIdx = f.isPlayer ? 0 : f.bossIdx
  const boss = BOSSES[bossIdx]
  const setIdx = f.isPlayer ? Math.floor(bossIdx/3.5) : (boss.sfxSet || 0)
  return SFX_SETS[Math.min(setIdx, SFX_SETS.length-1)]
}

function doAttack(f, name) {
  if ((f.locked && name !== 'block') || f.stunTimer > 0) return false
  f.action = name; f.hitConnected = false
  setAnim(f, name)
  const sfx = getSFX(f)
  if (name.startsWith('punch')) sfx.punch()
  else if (name.startsWith('kick') || name === 'sweep') sfx.kick()
  else if (name === 'uppercut') { sfx.whoosh(); setTimeout(sfx.punch,60) }
  else if (name === 'special') sfx.special()
  return true
}

function doJump(f) {
  if (!f.onGround) return
  f.vy = -540; f.onGround = false
  setAnim(f, 'jump')
  getSFX(f).whoosh()
}

function resolveHits(atk, def, pts, sfx) {
  if (!atk.hitActive || atk.hitConnected) return null
  const dist = Math.abs(atk.x - def.x)
  const rng = (ATTACK_RANGE[atk.action] || 86) +
    (atk.weapon === 'sword' ? 22 : atk.weapon === 'staff' ? 14 : 0)
  if (dist > rng) return null
  const facing = atk.facingRight ? atk.x < def.x : atk.x > def.x
  if (!facing) return null

  atk.hitConnected = true; atk.hitActive = false

  // BLOCK
  if (def.blocking && atk.action !== 'special') {
    sfx.block()
    spawnHit(pts, (atk.x+def.x)/2, def.y-58, '#FFD700', 8, 2)
    return { type:'block' }
  }
  if (def.invTimer > 0) return null

  const wpBonus = atk.weapon==='sword'?10:atk.weapon==='staff'?6:atk.weapon==='nunchucks'?5:0
  const comboBonus = Math.min(atk.comboCnt * 2, 12)
  const rawDmg = ATTACK_DMG[atk.action] || 9
  const dmg = Math.round(rawDmg + wpBonus + comboBonus)

  def.hp = Math.max(0, def.hp - dmg)
  def.stunTimer = ATTACK_STUN[atk.action] || 0.24
  def.hitFlash = 1; def.invTimer = 0.14

  const dir = atk.x < def.x ? 1 : -1
  def.vx = dir * (ATTACK_PUSH[atk.action] || 5) * 65
  const pushUp = ATTACK_PUSHUP[atk.action]
  if (pushUp) { def.vy = -pushUp; def.onGround = false }

  const heavy = def.stunTimer > 0.5
  setAnim(def, heavy ? 'knockdown' : 'hurt')
  sfx.hurt(); if (atk.weapon !== 'none') sfx.metal()

  const hx = (atk.x + def.x) / 2, hy = def.y - 55
  if (atk.action === 'special') spawnSpecial(pts, hx, hy, atk.glowColor)
  else { spawnHit(pts, hx, hy, '#FF3300', 16, 4.5); spawnBlood(pts, hx, hy-10) }
  if (atk.weapon !== 'none') spawnHit(pts, hx, hy, atk.glowColor, 8, 3)

  atk.comboCnt++; atk.comboTimer = 1.8

  return { type:'hit', dmg, heavy }
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function StickmanFighter({ game, levelData, studentId, onFinish }) {
  const canvasRef = useRef(null)
  const gRef      = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const keysRef   = useRef({})
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
    playerHp: 100,
    enemyHp: 100,
    maxEnemyHp: 100,
    lastHitDmg: 0,
    paused: false,
  })
  const uiRef = useRef(ui); uiRef.current = ui

  // ── Start / reset fight ──────────────────────────────────────────
  function startFight(mode, bossIdx = 0) {
    const boss = BOSSES[bossIdx]
    const u = uiRef.current
    const diffMult = { rookie:0.48, fighter:0.68, champion:0.86, legend:1.0, master:1.20 }[u.difficulty] || 0.68

    const player = newFighter(true, bossIdx)
    player.weapon = u.weapon
    const enemy = newFighter(false, bossIdx)
    enemy.diff = boss.diff * diffMult

    gRef.current = {
      player, enemy,
      particles: [],
      time: 0,
      phase: 'fight',
      koTimer: 0,
      bgType: boss.bg,
      shake: 0, shakeDir: {x:0,y:0},
      diffMult,
      roundTimer: 60,
      sfx: SFX_SETS[boss.sfxSet || 0],
    }

    startMusic(boss.musicTheme || 0)

    setUi(p=>({...p,
      screen:'fight', bossIdx, mode,
      playerHp:100, enemyHp:boss.hp, maxEnemyHp:boss.hp,
      combo:0, message:boss.intro, lastHitDmg:0
    }))
    setTimeout(()=>setUi(p=>({...p,message:''})),2800)
  }

  // ── Main game loop ───────────────────────────────────────────────
  useEffect(()=>{
    lastRef.current = performance.now()
    const loop = (now)=>{
      const rawDt = (now - (lastRef.current||now)) / 1000
      lastRef.current = now
      const dt = Math.min(rawDt, 0.05)
      if (uiRef.current.screen==='fight' && !uiRef.current.paused) {
        update(dt); render()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKey=(e)=>{
      const down = e.type==='keydown'
      keysRef.current[e.code] = down
      if (down) handleKeyDown(e.code)
      e.preventDefault()
    }
    window.addEventListener('keydown',onKey,{passive:false})
    window.addEventListener('keyup',onKey,{passive:false})
    return ()=>{
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown',onKey)
      window.removeEventListener('keyup',onKey)
      stopMusic()
    }
  },[])

  function handleKeyDown(code) {
    const g=gRef.current; if(!g||g.phase!=='fight') return
    const p=g.player; const sfx=g.sfx
    if(code==='KeyZ'||code==='KeyJ') doAttack(p,'punch_R')
    if(code==='KeyX'||code==='KeyK') doAttack(p,'punch_L')
    if(code==='KeyC'||code==='KeyL') doAttack(p,'kick_R')
    if(code==='KeyV')                doAttack(p,'uppercut')
    if(code==='KeyN')                doAttack(p,'sweep')
    if(code==='KeyB')                doAttack(p,'special')
    if((code==='ArrowUp'||code==='KeyW')&&p.onGround) doJump(p)
    if(code==='Escape') setUi(u=>({...u,paused:!u.paused}))
  }

  // ── UPDATE ──────────────────────────────────────────────────────
  function update(dt) {
    const g = gRef.current; if (!g) return
    g.time += dt
    if (g.shake > 0) { g.shake -= dt*4; if(g.shake<0)g.shake=0 }

    if (g.phase === 'ko') {
      g.koTimer -= dt
      if (g.koTimer <= 0) resolveKO()
      return
    }

    g.roundTimer -= dt
    const p=g.player, e=g.enemy

    // ── Player input ──────────────────────────────────────────────
    const K = keysRef.current
    if (!p.locked && p.stunTimer <= 0) {
      const dx = (K['ArrowRight']||K['KeyD']?1:0)-(K['ArrowLeft']||K['KeyA']?1:0)
      const isBlocking = !!(K['ArrowDown']||K['KeyS'])
      p.blocking = isBlocking && p.onGround && p.stunTimer <= 0
      if (p.blocking) {
        if (!p.locked) setAnim(p, 'block')
      } else if (dx !== 0) {
        const speed = (K['Shift'] ? 220 : 170)  // sprint with Shift
        p.vx = dx * speed
        p.facingRight = dx > 0
        if (p.onGround) setAnim(p, Math.abs(p.vx)>185?'run':'walk')
      } else {
        p.vx *= 0.5
        if (p.onGround && !p.locked) setAnim(p, 'idle')
      }
    } else {
      p.vx *= 0.62
      p.blocking = false
    }

    // ── AI ────────────────────────────────────────────────────────
    e.facingRight = e.x < p.x
    aiTick(e, p, dt, g.diffMult)
    if (!e.locked && e.stunTimer <= 0) {
      const spd = e.speed + (g.diffMult>0.8?20:0)
      e.vx = e.aiDir * spd
      if (e.aiDir !== 0 && e.onGround) setAnim(e, 'walk')
      else if (e.onGround && !e.locked) setAnim(e, 'idle')
    } else { e.vx *= 0.62; e.blocking = e.animName==='block' }

    // ── Physics ───────────────────────────────────────────────────
    const GRAVITY = 1900
    for (const f of [p, e]) {
      // Timers
      if (f.stunTimer>0) {
        f.stunTimer-=dt
        if (f.stunTimer<=0 && f.animName==='knockdown') setAnim(f,'getup')
      }
      if (f.hitFlash>0) f.hitFlash-=dt*4
      if (f.invTimer>0) f.invTimer-=dt
      if (f.comboTimer>0) {
        f.comboTimer-=dt
        if (f.comboTimer<=0) { f.comboCnt=0; if(f.isPlayer)setUi(u=>({...u,combo:0})) }
      }

      // Vertical
      if (!f.onGround) {
        f.vy += GRAVITY*dt
        f.y  += f.vy*dt
        if (f.y >= FLOOR) {
          // Landing
          const vel=Math.abs(f.vy)
          f.y=FLOOR; f.vy=0; f.onGround=true
          g.sfx.land()
          if (vel>300) spawnDust(g.particles,f.x,FLOOR)
          if (!f.locked) setAnim(f,'idle')
        }
      }

      // Horizontal
      f.x += f.vx * dt
      f.x = Math.max(30, Math.min(CW-30, f.x))

      // Step anim
      tickAnim(f, dt)

      // Auto-face
      if (!f.locked && f.onGround && f.isPlayer &&
          !(K['ArrowLeft']||K['KeyA']||K['ArrowRight']||K['KeyD'])) {
        p.facingRight = p.x < e.x
      }
    }

    // ── Hit resolution ─────────────────────────────────────────────
    const hitRes1 = resolveHits(p, e, g.particles, g.sfx)
    const hitRes2 = resolveHits(e, p, g.particles, g.sfx)
    if (hitRes1?.type==='hit') {
      g.shake=hitRes1.heavy?0.35:0.15
      setUi(u=>({...u,lastHitDmg:hitRes1.dmg}))
    }
    if (hitRes2?.type==='hit') g.shake=hitRes2.heavy?0.28:0.12

    tickParticles(g.particles, dt)

    // ── KO check ──────────────────────────────────────────────────
    if ((p.hp<=0||e.hp<=0||g.roundTimer<=0) && g.phase==='fight') {
      g.phase='ko'; g.koTimer=2.5
      const pWin=p.hp>0&&(e.hp<=0||(g.roundTimer<=0&&p.hp>e.hp))
      if (pWin) {
        setAnim(e,'knockdown'); setAnim(p,'victory')
        g.sfx.ko(); g.sfx.victory()
        setUi(u=>({...u,message:g.roundTimer<=0?'⏱ TIME OUT — YOU WIN!':'🏆 KO — YOU WIN!'}))
      } else {
        setAnim(p,'knockdown')
        g.sfx.ko()
        setUi(u=>({...u,message:g.roundTimer<=0?'⏱ TIME OUT — YOU LOSE':'💀 KO — YOU LOSE'}))
      }
    }

    setUi(prev=>({...prev,
      playerHp: Math.max(0,Math.round(p.hp)),
      enemyHp:  Math.max(0,Math.round(e.hp)),
      combo: p.comboCnt,
    }))
  }

  function resolveKO() {
    const g=gRef.current; const u=uiRef.current
    const pWin = g.player.hp>0 && (g.enemy.hp<=0||(g.roundTimer<=0&&g.player.hp>g.enemy.hp))
    if (u.mode==='story') {
      if (pWin) {
        const next=u.bossIdx+1
        if(next>=BOSSES.length) { stopMusic(); setUi(p=>({...p,screen:'victory'})) }
        else setTimeout(()=>startFight('story',next),1200)
      } else { stopMusic(); setUi(p=>({...p,screen:'gameover'})) }
    } else {
      if (pWin) {
        const nr=u.survivalRound+1
        const nscore=u.score+Math.round(140*nr*0.65)
        setUi(p=>({...p,survivalRound:nr,score:nscore}))
        setTimeout(()=>startFight('survival',(nr-1)%BOSSES.length),1200)
      } else { stopMusic(); setUi(p=>({...p,screen:'gameover'})) }
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────
  function render() {
    const canvas=canvasRef.current; if(!canvas)return
    const ctx=canvas.getContext('2d')
    const g=gRef.current; if(!g)return

    ctx.save()
    if (g.shake>0) {
      const s=g.shake*8
      ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s)
    }
    drawBG(ctx,g.bgType,g.time)

    // Close-range danger vignette
    const dist=Math.abs(g.player.x-g.enemy.x)
    if(dist<70){
      ctx.save(); ctx.globalAlpha=(1-dist/70)*0.08
      ctx.fillStyle='#FF0000'; ctx.fillRect(0,0,CW,CH); ctx.restore()
    }

    // Draw fighters (closer one on top)
    if(g.player.x<g.enemy.x){
      drawFighter(ctx,g.player,g.time)
      drawFighter(ctx,g.enemy,g.time)
    } else {
      drawFighter(ctx,g.enemy,g.time)
      drawFighter(ctx,g.player,g.time)
    }
    drawParticles(ctx,g.particles)

    // Round timer bar (thin line at top)
    if(g.roundTimer>0){
      const tw=CW*(g.roundTimer/60)
      ctx.fillStyle=g.roundTimer<15?'#FF4400':g.roundTimer<30?'#FFAA00':'#00CC44'
      ctx.fillRect(0,0,tw,3)
    }

    ctx.restore()
  }

  // ── TOUCH CONTROLS ───────────────────────────────────────────────
  const tbAttack=(act)=>{ const g=gRef.current;if(g)doAttack(g.player,act) }
  const tbJump=()=>{ const g=gRef.current;if(g&&g.player.onGround)doJump(g.player) }
  const tbBlock=(down)=>{
    const g=gRef.current; if(!g)return
    keysRef.current['ArrowDown']=down
    if(!down&&g.player.animName==='block') setAnim(g.player,'idle')
  }
  const tbMove=(dir,down)=>{
    keysRef.current['ArrowLeft']=dir==='L'&&down
    keysRef.current['ArrowRight']=dir==='R'&&down
  }

  const u=ui
  const boss=BOSSES[u.bossIdx]||BOSSES[0]
  const pPct=u.playerHp
  const ePct=Math.max(0,u.enemyHp/u.maxEnemyHp*100)

  // ── MENU ─────────────────────────────────────────────────────────
  if(u.screen==='menu') return (
    <div style={{background:'#030008',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace',color:'#EEE',userSelect:'none'}}>
      <style>{`
        @keyframes sfGlow{0%,100%{text-shadow:0 0 14px #9900FF,0 0 32px #6600CC,0 0 64px #33006688}50%{text-shadow:0 0 24px #CC55FF,0 0 56px #9900FF,0 0 100px #66009944}}
        @keyframes sfFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes sfPulse{0%,100%{opacity:0.6}50%{opacity:1}}
        .sf-btn{transition:all 0.15s;} .sf-btn:hover{transform:translateY(-1px);filter:brightness(1.2)}
        .sf-btn:active{transform:scale(0.95)}
      `}</style>
      {/* Header */}
      <div style={{padding:'30px 20px 24px',textAlign:'center',background:'linear-gradient(180deg,#0a0015,#030008)',borderBottom:'1px solid #1a0033'}}>
        <div style={{fontSize:52,marginBottom:8,animation:'sfFloat 4s ease-in-out infinite',display:'inline-block'}}>⚔️</div>
        <h1 style={{fontSize:28,fontWeight:900,letterSpacing:7,color:'#E0D0FF',animation:'sfGlow 3s infinite',margin:'0 0 2px'}}>SHADOW FIGHT</h1>
        <p style={{color:'#44006688',fontSize:9,letterSpacing:4,textTransform:'uppercase',margin:'0 0 28px'}}>Stickman Edition · 10 Bosses</p>

        {/* Weapon select */}
        <p style={{color:'#55228866',fontSize:9,letterSpacing:3,textTransform:'uppercase',marginBottom:9}}>Select Weapon</p>
        <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:20,flexWrap:'wrap'}}>
          {[['none','👊','Bare Fists'],['sword','🗡','Sword'],['staff','🪄','Staff'],['nunchucks','🔗','Chains']].map(([w,ic,lb])=>(
            <button key={w} className="sf-btn" onClick={()=>setUi(p=>({...p,weapon:w}))}
              style={{padding:'9px 13px',borderRadius:10,border:`2px solid ${u.weapon===w?'#9900FF':'#2a0044'}`,background:u.weapon===w?'rgba(153,0,255,0.18)':'rgba(10,0,20,0.8)',color:u.weapon===w?'#CC88FF':'#553377',fontWeight:700,fontSize:10,cursor:'pointer',minWidth:72}}>
              <div style={{fontSize:20,marginBottom:2}}>{ic}</div>{lb}
            </button>
          ))}
        </div>

        {/* Difficulty */}
        <p style={{color:'#55228866',fontSize:9,letterSpacing:3,textTransform:'uppercase',marginBottom:9}}>Difficulty</p>
        <div style={{display:'flex',gap:5,justifyContent:'center',marginBottom:28}}>
          {[['rookie','🟢'],['fighter','🟡'],['champion','🟠'],['legend','🔴'],['master','💀']].map(([d,ic])=>(
            <button key={d} className="sf-btn" onClick={()=>setUi(p=>({...p,difficulty:d}))}
              style={{padding:'6px 10px',borderRadius:8,border:`1px solid ${u.difficulty===d?'#FF4400':'#220033'}`,background:u.difficulty===d?'rgba(255,68,0,0.18)':'rgba(8,0,16,0.8)',color:u.difficulty===d?'#FF9977':'#44224466',fontWeight:700,fontSize:9,cursor:'pointer',textTransform:'capitalize'}}>
              {ic} {d}
            </button>
          ))}
        </div>

        {/* Mode buttons */}
        <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:16}}>
          <button className="sf-btn" onClick={()=>startFight('story',0)}
            style={{padding:'14px 32px',borderRadius:12,background:'linear-gradient(135deg,#3a0077,#9900FF)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer',letterSpacing:2,boxShadow:'0 4px 24px rgba(153,0,255,0.4)'}}>
            ⚔️ STORY MODE
          </button>
          <button className="sf-btn" onClick={()=>{setUi(p=>({...p,survivalRound:1,score:0}));startFight('survival',0)}}
            style={{padding:'14px 32px',borderRadius:12,background:'linear-gradient(135deg,#770000,#EE1100)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer',letterSpacing:2,boxShadow:'0 4px 24px rgba(220,0,0,0.4)'}}>
            💀 SURVIVAL
          </button>
        </div>

        {/* Controls hint */}
        <div style={{background:'rgba(100,0,200,0.08)',borderRadius:8,padding:'8px 12px',border:'1px solid #22004433'}}>
          <p style={{color:'#33115566',fontSize:8,margin:0,lineHeight:1.8}}>
            ← →/AD: Move · ↑/W: Jump · ↓/S: Block · Shift+Move: Sprint<br/>
            Z=Punch · X=Jab · C=Kick · V=Uppercut · N=Sweep · B=Special
          </p>
        </div>
      </div>
    </div>
  )

  if(u.screen==='gameover'||u.screen==='victory') return (
    <div style={{background:'#030008',borderRadius:16,padding:'44px 24px',textAlign:'center',fontFamily:'"Courier New",monospace',color:'#EEE',userSelect:'none'}}>
      <style>{`@keyframes rPop{from{transform:scale(0.2);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      <div style={{fontSize:68,marginBottom:16,animation:'rPop 0.5s cubic-bezier(0.3,1.4,0.6,1)'}}>{u.screen==='victory'?'🏆':'💀'}</div>
      <h2 style={{fontSize:26,fontWeight:900,color:u.screen==='victory'?'#FFD700':'#EF4444',letterSpacing:5,marginBottom:12}}>
        {u.screen==='victory'?'CHAMPION!':'DEFEATED'}
      </h2>
      {u.mode==='survival'&&<p style={{color:'#AA55CC',fontSize:13,marginBottom:4}}>Survived {u.survivalRound} rounds · Score: {u.score.toLocaleString()}</p>}
      <p style={{color:'#440066',fontSize:11,marginBottom:24}}>{u.screen==='victory'?'You conquered all 10 bosses.':'Train harder. Rise again.'}</p>
      <div style={{display:'flex',gap:12,justifyContent:'center'}}>
        <button onClick={()=>{stopMusic();setUi(p=>({...p,screen:'menu'}))}}
          style={{padding:'12px 28px',borderRadius:11,background:'linear-gradient(135deg,#3a0077,#9900FF)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer',letterSpacing:2}}>
          ← MENU
        </button>
        {u.screen==='gameover'&&<button onClick={()=>startFight(u.mode,u.bossIdx)}
          style={{padding:'12px 28px',borderRadius:11,background:'linear-gradient(135deg,#770000,#EE1100)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer',letterSpacing:2}}>
          RETRY ↺
        </button>}
      </div>
    </div>
  )

  // ── FIGHT HUD + CANVAS ───────────────────────────────────────────
  return (
    <div style={{background:'#030008',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace',userSelect:'none',touchAction:'none'}}>
      <style>{`
        @keyframes comboAnim{0%{transform:scale(0.2) rotate(-15deg);opacity:0}70%{transform:scale(1.4) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes dmgAnim{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-30px)}}
        @keyframes msgIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        .sf-cbtn{transition:all 0.1s;} .sf-cbtn:active{transform:scale(0.92);filter:brightness(0.85)}
      `}</style>

      {/* ── HP BARS ── */}
      <div style={{background:'#07000e',padding:'8px 12px 6px',borderBottom:'1px solid #150026',display:'flex',alignItems:'center',gap:8}}>
        {/* Player HP */}
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{color:'#AACCFF',fontSize:9,fontWeight:800,letterSpacing:1}}>YOU</span>
            <span style={{color:pPct>50?'#22c55e':pPct>25?'#f59e0b':'#ef4444',fontSize:9,fontWeight:700}}>{u.playerHp}</span>
          </div>
          <div style={{height:9,background:'#0c001a',borderRadius:5,border:'1px solid #220040',overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',inset:0,background:'rgba(30,0,60,0.4)'}}/>
            <div style={{height:'100%',width:`${pPct}%`,background:pPct>50?'linear-gradient(90deg,#16a34a,#4ade80)':pPct>25?'linear-gradient(90deg,#d97706,#fbbf24)':'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:5,transition:'width 0.12s',boxShadow:'0 0 8px currentColor'}}/>
          </div>
        </div>

        {/* Center */}
        <div style={{textAlign:'center',minWidth:58,position:'relative'}}>
          {u.combo>1&&<div key={u.combo} style={{color:'#FF5500',fontWeight:900,fontSize:16,lineHeight:1,animation:'comboAnim 0.25s cubic-bezier(0.3,1.4,0.6,1)',textShadow:'0 0 10px #FF5500'}}>{u.combo}✕</div>}
          <div style={{color:'#2d0044',fontSize:7,textTransform:'uppercase',letterSpacing:1}}>{u.mode==='survival'?`RD ${u.survivalRound}`:boss.name}</div>
        </div>

        {/* Enemy HP */}
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{color:'#EF4444',fontSize:9,fontWeight:700}}>{u.enemyHp}</span>
            <span style={{color:'#FFAAAA',fontSize:9,fontWeight:800,letterSpacing:1}}>{boss.name}</span>
          </div>
          <div style={{height:9,background:'#0c001a',borderRadius:5,border:'1px solid #220040',overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',inset:0,background:'rgba(30,0,60,0.4)'}}/>
            <div style={{height:'100%',width:`${ePct}%`,background:'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:5,transition:'width 0.12s',marginLeft:'auto',boxShadow:'0 0 8px #ff4444'}}/>
          </div>
        </div>
      </div>

      {/* Message banner */}
      {u.message&&<div style={{background:'rgba(153,0,255,0.10)',borderBottom:'1px solid rgba(153,0,255,0.20)',padding:'5px 12px',textAlign:'center',color:'#CC88FF',fontSize:11,fontWeight:700,animation:'msgIn 0.3s ease',letterSpacing:1}}>{u.message}</div>}

      {/* Canvas */}
      <canvas ref={canvasRef} width={CW} height={CH} style={{width:'100%',display:'block'}}/>

      {/* ── CONTROLS ── */}
      <div style={{background:'#07000e',borderTop:'1px solid #150026',padding:'10px 10px 14px'}}>
        <div style={{display:'flex',gap:5,justifyContent:'center',alignItems:'flex-end'}}>

          {/* D-PAD */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,36px)',gridTemplateRows:'repeat(3,36px)',gap:3,flexShrink:0}}>
            {[
              [null,{l:'↑',a:tbJump},null],
              [{l:'←',a:()=>tbMove('L',true),u:()=>tbMove('L',false)},{l:'🥋',a:null},{l:'→',a:()=>tbMove('R',true),u:()=>tbMove('R',false)}],
              [null,{l:'⬇',a:()=>tbBlock(true),u:()=>tbBlock(false)},null],
            ].map((row,ri)=>row.map((c,ci)=>{
              if(!c)return<div key={`d${ri}${ci}`}/>
              if(c.l==='🥋')return<div key={`d${ri}${ci}`} style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{c.l}</div>
              return(
                <button key={`d${ri}${ci}`} className="sf-cbtn"
                  onPointerDown={e=>{e.preventDefault();c.a&&c.a()}}
                  onPointerUp={e=>{e.preventDefault();c.u&&c.u()}}
                  onPointerLeave={e=>{e.preventDefault();c.u&&c.u()}}
                  style={{width:36,height:36,borderRadius:8,border:'1px solid #2a0044',background:'linear-gradient(135deg,#0e0020,#0a0018)',color:'#9966BB',fontWeight:900,fontSize:14,cursor:'pointer',WebkitTapHighlightColor:'transparent',touchAction:'none',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05)'}}>
                  {c.l}
                </button>
              )
            }))}
          </div>

          {/* ATTACK BUTTONS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,flex:1,maxWidth:260}}>
            {[
              ['PUNCH','punch_R','#FF4400'],
              ['JAB',  'punch_L','#FF6600'],
              ['KICK', 'kick_R', '#CC0044'],
              ['UPPER','uppercut','#AA00AA'],
              ['SWEEP','sweep',  '#006688'],
              ['BLOCK','block',  '#0055EE'],
              ['⭐ SPECIAL','special','#9900FF'],
            ].map(([lb,act,col])=>(
              <button key={act} className="sf-cbtn"
                onPointerDown={e=>{e.preventDefault();act==='block'?tbBlock(true):tbAttack(act)}}
                onPointerUp={e=>{e.preventDefault();act==='block'&&tbBlock(false)}}
                onPointerLeave={e=>{e.preventDefault();act==='block'&&tbBlock(false)}}
                style={{padding:'8px 2px',borderRadius:9,border:`1px solid ${col}44`,background:`linear-gradient(135deg,${col}18,${col}08)`,color,fontWeight:800,fontSize:9,cursor:'pointer',letterSpacing:0.3,WebkitTapHighlightColor:'transparent',touchAction:'none',gridColumn:lb==='⭐ SPECIAL'?'span 3':'auto',boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05),0 2px 8px ${col}22`}}>
                {lb}
              </button>
            ))}
          </div>
        </div>

        {u.mode==='survival'&&<p style={{color:'#3d0055',fontSize:9,textAlign:'center',marginTop:6,letterSpacing:1}}>SCORE: {u.score.toLocaleString()} · ROUND {u.survivalRound}</p>}
      </div>
    </div>
  )
}
