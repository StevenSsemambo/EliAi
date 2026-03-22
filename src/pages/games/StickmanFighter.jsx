import { useState, useEffect, useRef, useCallback } from 'react'
import { saveGameScore } from '../../utils/gameUnlocks.js'

// ═══════════════════════════════════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════════
let _ac = null
function AC() {
  if (!_ac || _ac.state === 'closed') { try { _ac = new (window.AudioContext || window.webkitAudioContext)() } catch {} }
  if (_ac?.state === 'suspended') _ac.resume()
  return _ac
}
function tone(f, t, d, v = 0.15, dl = 0) {
  try {
    const a = AC(); if (!a) return
    const o = a.createOscillator(), g = a.createGain()
    o.connect(g); g.connect(a.destination); o.type = t; o.frequency.value = f
    const T = a.currentTime + dl
    g.gain.setValueAtTime(0.001, T); g.gain.linearRampToValueAtTime(v, T + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, T + d)
    o.start(T); o.stop(T + d + 0.05)
  } catch {}
}
function noise(v, d, c = 500, dl = 0) {
  try {
    const a = AC(); if (!a) return
    const ln = Math.ceil(a.sampleRate * Math.min(d, 0.8)), buf = a.createBuffer(1, ln, a.sampleRate)
    const dt = buf.getChannelData(0); for (let i = 0; i < ln; i++) dt[i] = Math.random() * 2 - 1
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = c; s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination)
    const T = a.currentTime + dl; g.gain.setValueAtTime(v, T); g.gain.exponentialRampToValueAtTime(0.0001, T + d)
    s.start(T); s.stop(T + d + 0.1)
  } catch {}
}
const SFX = {
  punch:   () => { noise(0.50, 0.04, 800); tone(180, 'sawtooth', 0.06, 0.25, 0.02) },
  heavy:   () => { noise(0.75, 0.07, 480); tone(110, 'sawtooth', 0.10, 0.38, 0.02); tone(70, 'sine', 0.13, 0.22, 0.05) },
  kick:    () => { noise(0.62, 0.06, 580); tone(145, 'sawtooth', 0.08, 0.32, 0.02) },
  block:   () => { tone(1000, 'square', 0.03, 0.32); tone(680, 'square', 0.025, 0.22, 0.025); noise(0.22, 0.04, 1200) },
  hurt:    () => { noise(0.42, 0.10, 380); tone(155, 'sawtooth', 0.11, 0.28, 0.04) },
  special: () => { noise(0.3, 0.3, 280, 0.04); [200, 340, 540, 800, 1100].forEach((f, i) => tone(f, 'sawtooth', 0.26, 0.24, i * 0.044)) },
  ko:      () => { noise(0.52, 0.6, 180, 0.04); [300, 240, 188, 138, 88].forEach((f, i) => tone(f, 'sawtooth', 0.56, 0.40, i * 0.23)) },
  land:    () => { noise(0.32, 0.05, 180) },
  victory: () => { [500, 630, 800, 1000, 1260].forEach((f, i) => tone(f, 'triangle', 0.3, 0.26, i * 0.12)) },
  step:    () => { noise(0.07, 0.03, 140) },
  menu:    () => { tone(440, 'sine', 0.08, 0.12); tone(660, 'sine', 0.08, 0.10, 0.06) },
  select:  () => { [300, 500, 700].forEach((f, i) => tone(f, 'sine', 0.06, 0.14, i * 0.04)) },
}
let _musicId = -1
function startMusic(theme) {
  stopMusic()
  try {
    const a = AC(); if (!a) return
    const bpm = [88, 108, 70, 118][theme] ?? 88, beat = 60 / bpm
    if (theme === 0) _musicId = setInterval(() => { try { noise(0.28, 0.07, 110); tone(60, 'sine', 0.18, 0.24); noise(0.16, 0.05, 800, beat); noise(0.16, 0.05, 800, beat * 3); [294, 349, 392, 440, 523].forEach((f, i) => tone(f, 'triangle', 0.45, 0.04, i * beat * 0.5)) } catch {} }, beat * 4 * 1000 | 0)
    else if (theme === 1) _musicId = setInterval(() => { try { for (let i = 0; i < 8; i++) { noise(0.16, 0.04, 290, i * beat * 0.5); if (i % 2 === 0) tone(80, 'sine', 0.14, 0.16, i * beat * 0.5) }; [330, 392, 440, 494, 392, 330, 294, 330].forEach((f, i) => tone(f, 'square', 0.38, 0.022, i * beat * 0.5)) } catch {} }, beat * 4 * 1000 | 0)
    else if (theme === 2) _musicId = setInterval(() => { try { [174, 220, 261].forEach((f, i) => tone(f, 'sine', beat * 3.8, 0.032, i * beat * 1.2)); noise(0.05, beat * 4, 380) } catch {} }, beat * 4 * 1000 | 0)
    else _musicId = setInterval(() => { try { [55, 55, 65, 55, 73, 65, 55, 49].forEach((f, i) => tone(f, 'sawtooth', beat * 0.85, 0.04, i * beat * 0.5)); [0, beat, beat * 1.5, beat * 2, beat * 3, beat * 3.5].forEach(o => noise(0.26, 0.07, 190, o)) } catch {} }, beat * 4 * 1000 | 0)
  } catch {}
}
function stopMusic() { if (_musicId !== -1) { clearInterval(_musicId); _musicId = -1 } }

// ═══════════════════════════════════════════════════════════════════
//  GAME DATA
// ═══════════════════════════════════════════════════════════════════
const PLAYER_CHARS = [
  { id: 'warrior',  name: 'WARRIOR',  icon: '🛡', bc: '#1a1420', sc: '#d4a870', gc: '#4488ff', ec: '#00ccff', stats: { hp: 100, spd: 170, atk: 1.00 }, desc: 'Balanced. Master of all weapons.' },
  { id: 'assassin', name: 'ASSASSIN', icon: '🗡', bc: '#0a0a18', sc: '#c89060', gc: '#00ffcc', ec: '#88ffee', stats: { hp: 82,  spd: 212, atk: 1.12 }, desc: 'Blazing speed. Punishing combos.' },
  { id: 'titan',    name: 'TITAN',    icon: '⚡', bc: '#1a0800', sc: '#e0a060', gc: '#ff6600', ec: '#ffaa00', stats: { hp: 130, spd: 138, atk: 1.28 }, desc: 'Slow but devastating. Breaks guards.' },
  { id: 'phantom',  name: 'PHANTOM',  icon: '👁', bc: '#080014', sc: '#b890a0', gc: '#cc00ff', ec: '#ff88ff', stats: { hp: 88,  spd: 192, atk: 0.95 }, desc: 'Mystical power. Double special hits.' },
  { id: 'ronin',    name: 'RONIN',    icon: '🌙', bc: '#0c1818', sc: '#c8b080', gc: '#00ccaa', ec: '#44ffdd', stats: { hp: 112, spd: 158, atk: 1.18 }, desc: 'Counter-fighter. Blocks power up.' },
]
const WEAPONS = [
  { id: 'fists',     name: 'FISTS',  icon: '👊', spdBonus: +16, dmgBonus: 0,   rngBonus: 0,  desc: 'Fastest, shortest range' },
  { id: 'sword',     name: 'SWORD',  icon: '🗡', spdBonus: 0,   dmgBonus: +12, rngBonus: +20, desc: 'Balanced reach & power' },
  { id: 'staff',     name: 'STAFF',  icon: '🪄', spdBonus: 0,   dmgBonus: +8,  rngBonus: +30, desc: 'Longest range, magic hits' },
  { id: 'nunchucks', name: 'CHAINS', icon: '🔗', spdBonus: +10, dmgBonus: +6,  rngBonus: +10, desc: 'Unpredictable combo weapon' },
]
const DIFFICULTIES = [
  { id: 'rookie',   label: 'ROOKIE',   col: '#22cc55', mult: 0.44 },
  { id: 'fighter',  label: 'FIGHTER',  col: '#ffcc00', mult: 0.68 },
  { id: 'champion', label: 'CHAMPION', col: '#ff6600', mult: 0.88 },
  { id: 'legend',   label: 'LEGEND',   col: '#ff2200', mult: 1.00 },
]
const BOSSES = [
  { name: 'GRUNT',       rank: '🥋', bc: '#141414', sc: '#d0a070', gc: '#666666', ec: '#bbbbbb', weapon: 'fists',     style: 'brawler',   hp: 90,  spd: 122, diff: 0.30, bg: 'dojo',   music: 0, intro: "A street thug. Don't underestimate size." },
  { name: 'BLADE',       rank: '⚔️',  bc: '#080820', sc: '#c0a060', gc: '#3355ff', ec: '#88aaff', weapon: 'sword',     style: 'swordsman', hp: 112, spd: 134, diff: 0.42, bg: 'dojo',   music: 0, intro: 'Cold steel. Colder heart.' },
  { name: 'SERPENT',     rank: '🐍', bc: '#041808', sc: '#b8a860', gc: '#00dd44', ec: '#88ff88', weapon: 'fists',     style: 'speedster', hp: 106, spd: 196, diff: 0.56, bg: 'city',   music: 1, intro: 'Strikes like lightning. Gone before you blink.' },
  { name: 'ORACLE',      rank: '🔮', bc: '#0a0520', sc: '#d0a880', gc: '#aa44ff', ec: '#dd88ff', weapon: 'staff',     style: 'mage',      hp: 130, spd: 126, diff: 0.64, bg: 'city',   music: 1, intro: 'She sees every move before you make it.' },
  { name: 'IRON CHAIN',  rank: '⛓',  bc: '#181000', sc: '#c89050', gc: '#ffaa00', ec: '#ffd060', weapon: 'nunchucks', style: 'trickster', hp: 148, spd: 156, diff: 0.74, bg: 'city',   music: 1, intro: 'The chains never stop moving.' },
  { name: 'PHANTOM',     rank: '👻', bc: '#080020', sc: '#c0a8c0', gc: '#ff00cc', ec: '#ff88ee', weapon: 'fists',     style: 'speedster', hp: 164, spd: 198, diff: 0.82, bg: 'shadow', music: 2, intro: 'You cannot fight what you cannot see.' },
  { name: 'WARLORD',     rank: '🔱', bc: '#180800', sc: '#d4a050', gc: '#ff4400', ec: '#ff8844', weapon: 'sword',     style: 'brawler',   hp: 188, spd: 144, diff: 0.90, bg: 'shadow', music: 2, intro: 'A hundred warriors fell. You are next.' },
  { name: 'SHADOW KING', rank: '👑', bc: '#040008', sc: '#c89060', gc: '#9900ff', ec: '#ffffff', weapon: 'sword',     style: 'master',    hp: 245, spd: 166, diff: 1.00, bg: 'shadow', music: 3, intro: 'I am the end. There is nothing beyond me.' },
]
const COMBO_NAMES = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'RAMPAGE!', 'UNSTOPPABLE!', 'GODLIKE!']
const AI_POOLS = {
  brawler:   ['punch_R','kick_R','heavy','punch_L','kick_R'],
  speedster: ['punch_R','punch_L','punch_R','kick_R','punch_L'],
  mage:      ['kick_R','heavy','special','punch_R'],
  trickster: ['punch_L','kick_R','punch_R','kick_R','heavy'],
  swordsman: ['punch_R','kick_R','heavy','punch_R'],
  master:    ['punch_R','punch_L','kick_R','heavy','special','kick_R'],
}

// ═══════════════════════════════════════════════════════════════════
//  SKELETON & POSES
// ═══════════════════════════════════════════════════════════════════
const CW = 520, CH = 350, FL = CH - 52
const NJ = 17
const HIP=0,SPINE=1,CHEST=2,NECK=3,HEAD=4,LS=5,LE=6,LH=7,RS=8,RE=9,RH=10,LHIP=11,LK=12,LF=13,RHIP=14,RK=15,RF=16
const SEGS = [
  [HIP,SPINE,10,9,1],[SPINE,CHEST,9,12,1],[CHEST,NECK,8,7,1],[NECK,HEAD,6,0,1],
  [CHEST,LS,7,7,0],[LS,LE,7,6,0],[LE,LH,6,5,0],
  [HIP,LHIP,9,9,0],[LHIP,LK,9,8,0],[LK,LF,8,10,0],
  [CHEST,RS,7,7,2],[RS,RE,7,6,2],[RE,RH,6,5,2],
  [HIP,RHIP,9,9,2],[RHIP,RK,9,8,2],[RK,RF,8,10,2],
]
function P(a) { return new Float32Array(a) }
const POSES = {
  idle:    P([0,0,0,20,0,42,1,57,3,72,-20,40,-35,26,-33,10,20,40,33,26,31,10,-11,-2,-17,-32,-18,-58,11,-2,17,-32,18,-58]),
  walk_a:  P([0,3,0,23,1,45,2,60,4,74,-18,41,-36,30,-44,16,21,41,28,27,20,13,-13,-2,-28,-22,-42,-52,13,-2,9,-32,7,-60]),
  walk_b:  P([0,3,0,23,-1,45,-2,60,-4,74,-21,41,-28,27,-20,13,18,41,36,30,44,16,-13,-2,-9,-32,-7,-60,13,-2,28,-22,42,-52]),
  run_a:   P([2,6,-1,26,-1,50,0,64,1,78,-16,44,-44,36,-58,22,24,44,30,28,22,12,-14,-2,-36,-16,-58,-42,14,-2,10,-38,6,-68]),
  run_b:   P([-2,6,1,26,1,50,0,64,-1,78,-24,44,-30,28,-22,12,16,44,44,36,58,22,-14,-2,-10,-38,-6,-68,14,-2,36,-16,58,-42]),
  pRw:     P([-4,0,-3,20,-2,42,-1,57,1,71,-21,40,-38,28,-40,14,18,40,12,56,6,67,-11,-2,-15,-30,-16,-57,11,-2,15,-30,16,-57]),
  pRe:     P([7,0,7,20,8,42,9,56,10,70,-17,40,-24,28,-20,14,24,43,46,46,68,48,-11,-2,-14,-30,-15,-57,11,-2,14,-30,15,-57]),
  pLw:     P([4,0,3,20,2,42,1,57,-1,71,-18,40,-12,56,-6,67,21,40,38,28,40,14,-11,-2,-15,-30,-16,-57,11,-2,15,-30,16,-57]),
  pLe:     P([-7,0,-7,20,-8,42,-9,56,-10,70,-24,43,-46,46,-68,48,17,40,24,28,20,14,-11,-2,-14,-30,-15,-57,11,-2,14,-30,15,-57]),
  kRw:     P([-4,0,-3,20,-2,42,-1,57,-1,71,-21,40,-40,28,-54,14,20,40,30,30,24,18,-13,-2,-15,-30,-14,-58,11,-2,14,-14,16,-6]),
  kRe:     P([8,2,8,21,9,43,10,57,11,71,-18,39,-24,52,-20,65,22,40,26,30,22,18,-13,-2,-14,-30,-13,-58,11,-2,40,-12,66,-8]),
  hw:      P([0,-10,0,10,0,30,1,44,2,58,-18,28,-32,14,-34,0,18,28,16,10,10,-4,-13,-16,-22,-42,-26,-68,13,-16,18,-40,16,-66]),
  he:      P([7,-14,7,8,8,32,9,48,11,64,-16,30,-10,44,-8,56,25,42,34,62,30,80,-13,-16,-16,-42,-18,-68,13,-16,14,-40,12,-66]),
  block:   P([-2,0,-2,20,-2,40,-1,54,0,67,-20,38,-10,52,2,64,19,38,9,52,-2,64,-13,-2,-17,-32,-19,-60,13,-2,17,-32,19,-60]),
  hurt:    P([-12,0,-11,18,-10,38,-12,52,-15,65,-28,36,-47,22,-59,10,11,36,20,20,18,6,-11,-2,-13,-28,-12,-54,11,-2,17,-26,20,-52]),
  down:    P([0,-10,-22,-16,-44,-19,-60,-17,-72,-13,-32,-8,-46,4,-56,16,-29,-27,-21,-18,-15,-8,-7,-7,2,9,14,27,8,-7,22,5,38,18]),
  getup:   P([-4,-5,-2,15,0,35,1,49,2,63,-19,33,-32,19,-30,5,17,33,25,19,21,5,-13,-5,-20,-29,-22,-55,10,-5,8,-25,6,-51]),
  spCh:    P([0,0,0,22,0,46,0,61,0,76,-26,46,-47,60,-41,74,26,46,47,60,41,74,-13,-2,-20,-32,-24,-60,13,-2,20,-32,24,-60]),
  spRe:    P([10,0,10,21,11,44,12,58,13,72,-12,44,14,46,36,48,27,46,49,48,69,48,-13,-2,-17,-32,-20,-60,11,-2,12,-32,10,-60]),
  victory: P([0,5,0,25,0,47,0,61,0,75,-22,44,-44,56,-42,70,22,44,40,62,36,78,-12,-2,-16,-30,-18,-57,12,-2,16,-30,18,-57]),
}
const ANIMS = {
  idle:      [{ f:'idle',  t:'idle',  d:0.5 }],
  walk:      [{ f:'walk_a',t:'walk_b',d:0.14 },{ f:'walk_b',t:'walk_a',d:0.14 }],
  run:       [{ f:'run_a', t:'run_b', d:0.10 },{ f:'run_b', t:'run_a', d:0.10 }],
  punch_R:   [{ f:'pRw',  t:'pRe',   d:0.065, hit:1 },{ f:'pRe',t:'idle',d:0.09 },{ f:'idle',t:'idle',d:0.05 }],
  punch_L:   [{ f:'pLw',  t:'pLe',   d:0.065, hit:1 },{ f:'pLe',t:'idle',d:0.09 },{ f:'idle',t:'idle',d:0.05 }],
  heavy:     [{ f:'hw',   t:'he',    d:0.09,  hit:1 },{ f:'he', t:'idle',d:0.18 },{ f:'idle',t:'idle',d:0.08 }],
  kick_R:    [{ f:'kRw',  t:'kRe',   d:0.08,  hit:1 },{ f:'kRe',t:'idle',d:0.13 },{ f:'idle',t:'idle',d:0.07 }],
  special:   [{ f:'spCh', t:'spCh',  d:0.12 },{ f:'spCh',t:'spRe',d:0.10,hit:1 },{ f:'spRe',t:'idle',d:0.18 }],
  block:     [{ f:'block',t:'block', d:0.5 }],
  hurt:      [{ f:'hurt', t:'hurt',  d:0.18 },{ f:'hurt',t:'idle',d:0.10 }],
  knockdown: [{ f:'down', t:'down',  d:1.2 }],
  getup:     [{ f:'down', t:'getup', d:0.26 },{ f:'getup',t:'idle',d:0.16 }],
  victory:   [{ f:'victory',t:'victory',d:1.5 }],
}
const LOOP_A = { idle:1, walk:1, run:1, block:1, knockdown:1 }
const DMG   = { punch_R:10, punch_L:11, heavy:27, kick_R:17, special:46 }
const STUN  = { punch_R:0.20, punch_L:0.20, heavy:0.62, kick_R:0.36, special:1.05 }
const RANGE = { punch_R:86, punch_L:86, heavy:80, kick_R:108, special:132 }
const PUSHV = { heavy:460, special:330 }

// ═══════════════════════════════════════════════════════════════════
//  COLOUR HELPERS
// ═══════════════════════════════════════════════════════════════════
function lighten(h, a) { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return `rgb(${Math.min(255,r+a*255|0)},${Math.min(255,g+a*255|0)},${Math.min(255,b+a*255|0)})` }
function darken(h, a)  { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return `rgb(${Math.max(0,r-a*255|0)},${Math.max(0,g-a*255|0)},${Math.max(0,b-a*255|0)})` }

// ═══════════════════════════════════════════════════════════════════
//  ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════════
function eio(t) { t=t<0?0:t>1?1:t; return t<0.5?4*t*t*t:1-((-2*t+2)**3)/2 }
function lerpPose(a, b, t) { const e=eio(t),o=new Float32Array(NJ*2); for(let i=0;i<NJ*2;i++)o[i]=a[i]+(b[i]-a[i])*e; return o }
function setAnim(f, name) { const s=ANIMS[name]; if(!s)return; if(f.animName===name&&LOOP_A[name])return; f.animName=name;f.animIdx=0;f.animT=0;f.locked=!LOOP_A[name];f.hitActive=false }
function tickAnim(f, dt) {
  const s=ANIMS[f.animName]; if(!s)return; const fr=s[f.animIdx]; if(!fr)return
  f.animT+=dt; const t=Math.min(f.animT/fr.d,1)
  f.pose=lerpPose(POSES[fr.f]??POSES.idle,POSES[fr.t]??POSES.idle,t)
  f.hitActive=!!(fr.hit&&!f.hitConnected&&t>.35&&t<.9)
  if(f.animT>=fr.d){f.animT-=fr.d;f.animIdx++;if(f.animIdx>=s.length){if(LOOP_A[f.animName])f.animIdx=0;else{f.animIdx=s.length-1;f.locked=false;f.hitActive=false;setAnim(f,'idle')}}}
}

// ═══════════════════════════════════════════════════════════════════
//  FIGHTER FACTORY
// ═══════════════════════════════════════════════════════════════════
function makeFighter(isPlayer, bossIdx, charCfg, wpnCfg, diffMult) {
  const boss = BOSSES[bossIdx % BOSSES.length]
  if (isPlayer) {
    return { x:110, y:FL, vy:0, vx:0, onGround:true, facingRight:true, hp:charCfg.stats.hp, maxHp:charCfg.stats.hp, animName:'idle', animIdx:0, animT:0, pose:new Float32Array(POSES.idle), locked:false, hitActive:false, hitConnected:false, action:'idle', blocking:false, stunTimer:0, invTimer:0, comboCnt:0, comboTimer:0, hitFlash:0, bodyColor:charCfg.bc, skinColor:charCfg.sc, glowColor:charCfg.gc, eyeColor:charCfg.ec, weapon:wpnCfg.id, isPlayer:true, speed:charCfg.stats.spd+wpnCfg.spdBonus, dmgMult:charCfg.stats.atk, wpnDmg:wpnCfg.dmgBonus, wpnRng:wpnCfg.rngBonus }
  }
  return { x:410, y:FL, vy:0, vx:0, onGround:true, facingRight:false, hp:boss.hp, maxHp:boss.hp, animName:'idle', animIdx:0, animT:0, pose:new Float32Array(POSES.idle), locked:false, hitActive:false, hitConnected:false, action:'idle', blocking:false, stunTimer:0, invTimer:0, comboCnt:0, comboTimer:0, hitFlash:0, bodyColor:boss.bc, skinColor:boss.sc, glowColor:boss.gc, eyeColor:boss.ec, weapon:boss.weapon, isPlayer:false, speed:boss.spd, diff:boss.diff*diffMult, style:boss.style, dmgMult:1, wpnDmg:0, wpnRng:0, aiTimer:0, aiDir:0 }
}

// ═══════════════════════════════════════════════════════════════════
//  VOLUMETRIC RENDERING
// ═══════════════════════════════════════════════════════════════════
function drawSeg(ctx, x1, y1, x2, y2, r1, r2, c1, c2, stroke, glow, alpha=1) {
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy); if(len<0.5)return
  const nx=dy/len,ny=-dx/len
  ctx.save(); ctx.globalAlpha=alpha
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=14}
  const path=new Path2D()
  path.moveTo(x1+nx*r1,y1+ny*r1); path.lineTo(x2+nx*r2,y2+ny*r2)
  path.arcTo(x2+nx*r2+dx*.01,y2+ny*r2+dy*.01,x2-nx*r2,y2-ny*r2,r2); path.lineTo(x2-nx*r2,y2-ny*r2)
  path.lineTo(x1-nx*r1,y1-ny*r1); path.arcTo(x1-nx*r1-dx*.01,y1-ny*r1-dy*.01,x1+nx*r1,y1+ny*r1,r1); path.closePath()
  const gr=ctx.createLinearGradient(x1,y1,x2,y2); gr.addColorStop(0,c1); gr.addColorStop(1,c2??c1)
  ctx.fillStyle=gr; ctx.fill(path)
  ctx.strokeStyle=stroke??'rgba(255,255,255,.11)'; ctx.lineWidth=0.8; ctx.stroke(path)
  const hl=ctx.createLinearGradient(x1+nx*r1*.5,y1+ny*r1*.5,x1-nx*r1*.55,y1-ny*r1*.55)
  hl.addColorStop(0,'rgba(255,255,255,.20)'); hl.addColorStop(1,'rgba(255,255,255,0)')
  ctx.fillStyle=hl; ctx.fill(path); ctx.restore()
}
function drawJoint(ctx, x, y, r, col, glow) {
  ctx.save(); if(glow){ctx.shadowColor=glow;ctx.shadowBlur=10}
  const g=ctx.createRadialGradient(x-r*.32,y-r*.32,r*.04,x,y,r); g.addColorStop(0,'rgba(255,255,255,.35)'); g.addColorStop(.5,col); g.addColorStop(1,'rgba(0,0,0,.55)')
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.restore()
}
function drawHead(ctx, x, y, r, faceRight, bc, gc, ec, time) {
  ctx.save(); ctx.shadowColor=gc; ctx.shadowBlur=20
  const ox=faceRight?-r*.28:r*.28
  const g=ctx.createRadialGradient(x+ox,y-r*.3,r*.04,x,y,r); g.addColorStop(0,lighten(bc,.42)); g.addColorStop(.55,bc); g.addColorStop(1,darken(bc,.45))
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,.17)'; ctx.lineWidth=1.4; ctx.stroke(); ctx.shadowBlur=0
  // Brow ridge
  const bx=x+(faceRight?r*.2:-r*.2),by=y-r*.4
  const bg=ctx.createLinearGradient(bx-r*.3,by,bx+r*.3,by); bg.addColorStop(0,'transparent'); bg.addColorStop(.5,darken(bc,.3)); bg.addColorStop(1,'transparent')
  ctx.fillStyle=bg; ctx.fillRect(bx-r*.3,by-1,r*.6,3)
  // Eye socket
  const ex=x+(faceRight?r*.4:-r*.4),ey=y-r*.08
  ctx.fillStyle='rgba(0,0,0,.78)'; ctx.beginPath(); ctx.arc(ex,ey,r*.33,0,Math.PI*2); ctx.fill()
  // Glowing iris
  ctx.shadowColor=ec; ctx.shadowBlur=20
  const eg=ctx.createRadialGradient(ex,ey,0,ex,ey,r*.28); eg.addColorStop(0,'#fff'); eg.addColorStop(.35,ec); eg.addColorStop(1,'rgba(0,0,0,.8)')
  ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(ex,ey,r*.28,0,Math.PI*2); ctx.fill()
  // Slit pupil with subtle pulse
  ctx.shadowBlur=0; ctx.fillStyle='rgba(0,0,0,.92)'
  ctx.beginPath(); ctx.ellipse(ex,ey,r*.07,r*.24+Math.sin(time*3)*.02,0,0,Math.PI*2); ctx.fill()
  ctx.restore()
}

function drawFighter(ctx, f, time, floorY=FL) {
  const pose=f.pose, flip=f.facingRight?1:-1
  const wx=j=>f.x+flip*pose[j*2], wy=j=>f.y-pose[j*2+1]
  // Ground shadow
  ctx.save(); ctx.globalAlpha=0.20
  const sw=f.onGround?26:Math.max(5,26*(1-(floorY-f.y)/260))
  const sg=ctx.createRadialGradient(f.x,floorY+4,0,f.x,floorY+4,sw); sg.addColorStop(0,'rgba(0,0,0,.7)'); sg.addColorStop(1,'transparent')
  ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(f.x,floorY+4,sw,6,0,0,Math.PI*2); ctx.fill(); ctx.restore()
  const bc=f.bodyColor, sc=f.skinColor, gc=f.glowColor
  const bcD=darken(bc,.32), bcB=lighten(bc,.18), scD=darken(sc,.22)
  const isSp=f.animName==='special', flash=f.hitFlash>0?f.hitFlash*.68:0
  for (const layer of [0,1,2]) {
    for (const [jA,jB,wA,wB,l] of SEGS) {
      if(l!==layer)continue
      const isBack=layer===0, isSkin=jA===LE||jA===RE||jB===LH||jB===RH||jA===NECK
      const c1=isSkin?(isBack?darken(sc,.3):sc):(isBack?darken(bc,.28):bc)
      const c2=isSkin?(isBack?darken(scD,.3):scD):(isBack?darken(bcD,.28):bcD)
      const ra=wA*(isBack?.84:1),rb=wB*(isBack?.84:1)
      const glow=(!isBack&&isSp)?gc:null, str=isBack?'rgba(255,255,255,.05)':'rgba(255,255,255,.13)'
      drawSeg(ctx,wx(jA),wy(jA),wx(jB),wy(jB),ra,rb,c1,c2,str,glow)
      if(flash>0)drawSeg(ctx,wx(jA),wy(jA),wx(jB),wy(jB),ra,rb,'#ff2200','#ff5500',null,null,flash*.42)
      if(layer===2&&jB!==LF&&jB!==RF)drawJoint(ctx,wx(jB),wy(jB),Math.max(wB-1,3.5),isSkin?sc:bcB,isSp?gc:null)
    }
  }
  // Boots
  for(const[j,isL]of[[LF,true],[RF,false]]){
    const l=isL?0:2,fx=wx(j),fy=wy(j),kj=isL?LK:RK,ang=Math.atan2(wy(kj)-fy,wx(kj)-fx),bd=flip*(isL?-1:1)
    ctx.save(); ctx.fillStyle=l===0?darken(bc,.38):darken(bc,.10); ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=0.7
    ctx.beginPath(); ctx.ellipse(fx+bd*9,fy+2,14,6,ang,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore()
  }
  drawHead(ctx,wx(HEAD),wy(HEAD),13.5,f.facingRight,bc,gc,f.eyeColor,time)
  // Block shield
  if(f.blocking){
    ctx.save(); ctx.globalAlpha=0.28+Math.sin(time*8)*.08
    const shg=ctx.createRadialGradient(wx(CHEST),wy(CHEST),0,wx(CHEST),wy(CHEST),42); shg.addColorStop(0,gc+'aa'); shg.addColorStop(.6,gc+'44'); shg.addColorStop(1,'transparent')
    ctx.fillStyle=shg; ctx.beginPath(); ctx.arc(wx(CHEST),wy(CHEST),42,0,Math.PI*2); ctx.fill(); ctx.restore()
  }
  // Special double-ring aura
  if(isSp){
    for(const[r,a]of[[68,.4],[98,.18]]){
      ctx.save(); ctx.globalAlpha=a+Math.sin(time*11)*.1
      const ag=ctx.createRadialGradient(f.x,f.y-42,r*.2,f.x,f.y-42,r); ag.addColorStop(0,gc+'cc'); ag.addColorStop(.7,gc+'44'); ag.addColorStop(1,'transparent')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(f.x,f.y-42,r,0,Math.PI*2); ctx.fill(); ctx.restore()
    }
  }
  if(f.weapon&&f.weapon!=='fists')drawWeapon(ctx,f,wx,wy,time)
  if(f.hitFlash>0)f.hitFlash=Math.max(0,f.hitFlash-.055)
}

function drawWeapon(ctx, f, wx, wy, time) {
  const hx=wx(RH),hy=wy(RH),ex=wx(RE),ey=wy(RE),ang=Math.atan2(hy-ey,hx-ex)
  ctx.save(); ctx.translate(hx,hy); ctx.rotate(ang); ctx.lineCap='round'
  if(f.weapon==='sword'){
    const bg=ctx.createLinearGradient(0,-2.2,0,2.2); bg.addColorStop(0,'#ddeeff'); bg.addColorStop(.5,'#8ab4ff'); bg.addColorStop(1,'#334477')
    ctx.fillStyle=bg; ctx.shadowColor='#5599ff'; ctx.shadowBlur=22
    ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(50,-1.8); ctx.lineTo(52,0); ctx.lineTo(50,1.8); ctx.closePath(); ctx.fill()
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=.5; ctx.shadowBlur=0; ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(46,0); ctx.stroke()
    ctx.fillStyle='#778899'; ctx.shadowBlur=4; ctx.beginPath(); ctx.roundRect(5,-10,6,20,3); ctx.fill()
    ctx.fillStyle='#3a2010'; ctx.shadowBlur=0; ctx.beginPath(); ctx.roundRect(-14,-3.5,14,7,3); ctx.fill()
    ctx.fillStyle='rgba(255,200,100,.32)'; for(let i=-12;i<0;i+=4)ctx.fillRect(i,-3,2,6)
  } else if(f.weapon==='staff'){
    ctx.fillStyle='#c8a060'; ctx.shadowColor=f.glowColor; ctx.shadowBlur=18
    const sg=ctx.createLinearGradient(0,-3,0,3); sg.addColorStop(0,'#c8a060'); sg.addColorStop(1,'#6a4a20')
    ctx.fillStyle=sg; ctx.beginPath(); ctx.roundRect(-32,-3.2,92,6.4,3.2); ctx.fill()
    for(const[ox,or]of[[62,9.5],[-30,7]]){
      const og=ctx.createRadialGradient(ox,-3,0,ox,-3,or); og.addColorStop(0,'#fff'); og.addColorStop(.4,f.glowColor); og.addColorStop(1,'rgba(0,0,0,.65)')
      ctx.fillStyle=og; ctx.shadowColor=f.glowColor; ctx.shadowBlur=24; ctx.beginPath(); ctx.arc(ox,-3,or,0,Math.PI*2); ctx.fill()
    }
  } else if(f.weapon==='nunchucks'){
    const swA=Math.sin(time*7)*1.4,c2x=22+Math.cos(swA)*15,c2y=Math.sin(swA)*15
    ctx.strokeStyle='#3c200e'; ctx.lineWidth=5.5; ctx.shadowColor='#ff9900'; ctx.shadowBlur=12
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(22,0); ctx.stroke()
    ctx.strokeStyle='rgba(200,200,200,.8)'; ctx.lineWidth=2; ctx.setLineDash([3,3])
    ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(c2x,c2y); ctx.stroke(); ctx.setLineDash([])
    ctx.strokeStyle='#3c200e'; ctx.lineWidth=5.5; ctx.shadowBlur=0
    ctx.beginPath(); ctx.moveTo(c2x,c2y); ctx.lineTo(c2x+Math.cos(swA+.5)*22,c2y+Math.sin(swA+.5)*22); ctx.stroke()
  }
  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════════
//  BACKGROUNDS
// ═══════════════════════════════════════════════════════════════════
function drawBG(ctx, W, H, FLOOR, type, time) {
  ctx.clearRect(0,0,W,H)
  if(type==='dojo'){
    ctx.fillStyle='#100500'; ctx.fillRect(0,0,W,H)
    ctx.strokeStyle='#180800'; ctx.lineWidth=0.6
    for(let y=0;y<FLOOR;y+=28)for(let x=(y%56===0?0:28);x<W;x+=56)ctx.strokeRect(x+1,y+1,54,26)
    for(let x=0;x<W;x+=44){ctx.fillStyle=x%88===0?'#2a1008':'#241005';ctx.fillRect(x,FLOOR,44,H-FLOOR);ctx.strokeStyle='#180904';ctx.lineWidth=0.4;ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.lineTo(x,H);ctx.stroke()}
    for(const px of[0,W-28]){const pg=ctx.createLinearGradient(px,0,px+28,0);pg.addColorStop(0,'#0a0400');pg.addColorStop(.4,'#1c0900');pg.addColorStop(1,'#0a0400');ctx.fillStyle=pg;ctx.fillRect(px,0,28,FLOOR)}
    for(const[lx,ly]of[[28,30],[W/2,18],[W-28,30]]){
      const fl=.88+Math.sin(time*6.8+lx)*.06, rg=ctx.createRadialGradient(lx,ly,0,lx,ly,120); rg.addColorStop(0,`rgba(255,140,0,${.10*fl})`); rg.addColorStop(1,'transparent')
      ctx.fillStyle=rg; ctx.fillRect(lx-120,ly-80,240,200)
      ctx.save(); ctx.shadowColor='#ff6600'; ctx.shadowBlur=22*fl; ctx.fillStyle='#6b1200'; ctx.beginPath(); ctx.roundRect(lx-11,ly,22,24,4); ctx.fill()
      ctx.fillStyle=`rgba(255,${(100+Math.sin(time*9+lx)*22)|0},0,.9)`; ctx.beginPath(); ctx.roundRect(lx-8,ly+4,16,16,2); ctx.fill(); ctx.restore()
    }
    ctx.strokeStyle='rgba(255,100,0,.14)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.lineTo(W,FLOOR); ctx.stroke()
  } else if(type==='city'){
    ctx.fillStyle='#00000e'; ctx.fillRect(0,0,W,H)
    ctx.save(); ctx.shadowColor='#aaccff'; ctx.shadowBlur=48; ctx.fillStyle='#cce0ff'; ctx.beginPath(); ctx.arc(W*.84,42,22,0,Math.PI*2); ctx.fill(); ctx.restore()
    for(const[bx,bh,bw,col]of[[0,150,50,'#05000f'],[50,110,40,'#07001a'],[94,162,46,'#04000c'],[144,80,42,'#08001f'],[192,138,52,'#050012'],[252,96,38,'#09001f'],[298,160,44,'#040010'],[348,72,40,'#0a0020'],[394,130,44,'#06001a'],[442,88,36,'#080020']]){
      ctx.fillStyle=col; ctx.fillRect(bx,FLOOR-bh,bw,bh)
      for(let wy=FLOOR-bh+10;wy<FLOOR-10;wy+=13)for(let wx=bx+5;wx<bx+bw-5;wx+=9)if((wx*7^wy*3^bx)%6<3){const br=.3+Math.sin(time*.4+wx*.4+wy*.3)*.18;if(br>.18){ctx.globalAlpha=br;ctx.fillStyle=(wx*wy*bx)%5===0?'#00ccff':'#ffee88';ctx.fillRect(wx,wy,5,8);ctx.globalAlpha=1}}
      if(bh>100){ctx.strokeStyle='#1a0030';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(bx+bw/2,FLOOR-bh);ctx.lineTo(bx+bw/2,FLOOR-bh-20);ctx.stroke()}
    }
    ctx.strokeStyle='rgba(140,180,255,.055)'; ctx.lineWidth=.7
    for(let i=0;i<60;i++){const rx=(i*57+time*200)%W,ry=(time*280+i*73)%(FLOOR+20);ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+2,ry+13);ctx.stroke()}
    ctx.fillStyle='#00000a'; ctx.fillRect(0,FLOOR,W,H-FLOOR)
    for(const[nx,col]of[[60,'#ff00ff'],[200,'#00ffcc'],[340,'#ff4400'],[440,'#ffaa00']]){ctx.save();ctx.globalAlpha=.06+Math.sin(time+nx)*.025;ctx.fillStyle=col;ctx.fillRect(nx,FLOOR,40,H-FLOOR);ctx.restore()}
    ctx.strokeStyle='rgba(0,200,255,.08)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.lineTo(W,FLOOR); ctx.stroke()
  } else {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H)
    for(let i=0;i<10;i++){const ox=52+i*46,oy=28+Math.sin(time*.5+i*.7)*42;const or=ctx.createRadialGradient(ox,oy,0,ox,oy,55);or.addColorStop(0,`rgba(140,0,255,${.12+Math.sin(time*.7+i)*.05})`);or.addColorStop(1,'transparent');ctx.fillStyle=or;ctx.fillRect(ox-56,oy-56,112,112)}
    ctx.save(); ctx.strokeStyle='#6600cc'; ctx.lineWidth=1.5; ctx.shadowColor='#9900ff'; ctx.shadowBlur=14
    for(const[x1,y1,x2,y2]of[[55,FLOOR,96,FLOOR-11],[175,FLOOR,218,FLOOR-15],[298,FLOOR,340,FLOOR-10],[398,FLOOR,444,FLOOR-14],[148,FLOOR,118,FLOOR-9]]){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}; ctx.restore()
    for(let i=0;i<5;i++){const mx=(i*115+time*22)%W;ctx.save();ctx.globalAlpha=.04+Math.sin(time*.4+i)*.02;ctx.fillStyle='#8800cc';ctx.fillRect(mx,FLOOR-32,85+Math.sin(time+i)*18,42);ctx.restore()}
    ctx.fillStyle='#060003'; ctx.fillRect(0,FLOOR,W,H-FLOOR)
    ctx.strokeStyle='rgba(150,0,255,.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.lineTo(W,FLOOR); ctx.stroke()
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════════
function spawnHit(pts,x,y,col,n=20,spd=5.5){for(let i=0;i<n;i++){const a=Math.PI*2*i/n+Math.random()*.7-.35,s=spd*(.4+Math.random()*.9);pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,life:1,d:.042+Math.random()*.04,sz:2.5+Math.random()*4})}}
function spawnBurst(pts,x,y,col){for(let i=0;i<66;i++){const a=Math.PI*2*i/66,s=5+Math.random()*14;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-4,col,life:1,d:.012+Math.random()*.017,sz:3+Math.random()*8})}}
function spawnBlood(pts,x,y){for(let i=0;i<12;i++){const a=-Math.PI/2+(-.9+Math.random()*1.8);pts.push({x,y,vx:Math.cos(a)*(1+Math.random()*4),vy:Math.sin(a)*(2+Math.random()*6)-3,col:'#cc0000',life:1,d:.027+Math.random()*.022,sz:2+Math.random()*3})}}
function spawnDust(pts,x,y){for(let i=0;i<9;i++)pts.push({x:x+Math.random()*28-14,y,vx:(Math.random()-.5)*3,vy:-Math.random()*3.8,col:`rgba(${(160+Math.random()*40)|0},${(140+Math.random()*30)|0},${(100+Math.random()*20)|0},.6)`,life:1,d:.028+Math.random()*.03,sz:4+Math.random()*9})}
function tickPFX(pts,dt){for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vx*=.86;p.vy*=.86;p.vy+=.35;p.life-=p.d;if(p.life<=0)pts.splice(i,1)}}
function drawPFX(ctx,pts){for(const p of pts){ctx.save();ctx.globalAlpha=p.life*.9;ctx.shadowColor=p.col;ctx.shadowBlur=10;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2);ctx.fill();ctx.restore()}}

// ═══════════════════════════════════════════════════════════════════
//  COMBAT
// ═══════════════════════════════════════════════════════════════════
function doAction(f, name) {
  if((f.locked&&name!=='block')||f.stunTimer>0)return false
  f.action=name; f.hitConnected=false; setAnim(f,name)
  if(name==='punch_R'||name==='punch_L')SFX.punch()
  else if(name==='heavy')SFX.heavy()
  else if(name==='kick_R')SFX.kick()
  else if(name==='special')SFX.special()
  return true
}
function doJump(f){if(!f.onGround)return;f.vy=-570;f.onGround=false;SFX.step()}
function aiTick(e,p,dt){
  e.aiTimer-=dt; if(e.aiTimer>0||e.stunTimer>0||e.locked)return
  const dist=Math.abs(e.x-p.x),eff=Math.min(e.diff,1)
  if(p.hitActive&&dist<114&&Math.random()<eff*.56){doAction(e,'block');e.aiTimer=.28;return}
  if(dist>118){e.aiDir=e.x>p.x?-1:1;e.aiTimer=.05}
  else if(dist<50&&Math.random()<.3){e.aiDir=e.x>p.x?1:-1;e.aiTimer=.10}
  else{e.aiDir=0;if(Math.random()<eff&&dist<122){const pool=AI_POOLS[e.style]??AI_POOLS.brawler;doAction(e,pool[Math.floor(Math.random()*pool.length)]);e.aiTimer=.18+Math.random()*(.45-eff*.22)}else{if(dist>168&&Math.random()<.12*eff)doJump(e);e.aiTimer=.07}}
}
function resolveHit(atk,def,pts){
  if(!atk.hitActive||atk.hitConnected)return null
  const dist=Math.abs(atk.x-def.x), wpRng=(atk.weapon==='sword'?22:atk.weapon==='staff'?14:0)+(atk.wpnRng??0)
  const rng=(RANGE[atk.action]??86)+wpRng; if(dist>rng)return null
  const facing=atk.facingRight?atk.x<def.x:atk.x>def.x; if(!facing)return null
  atk.hitConnected=true; atk.hitActive=false
  if(def.blocking&&atk.action!=='special'){SFX.block();spawnHit(pts,(atk.x+def.x)/2,def.y-58,'#ffd700',10,3);return'block'}
  if(def.invTimer>0)return null
  const wpDmg=(atk.weapon==='sword'?12:atk.weapon==='staff'?7:atk.weapon==='nunchucks'?6:0)+(atk.wpnDmg??0)
  const comboDmg=Math.min((atk.comboCnt??0)*2,14)
  let dmg=Math.round((DMG[atk.action]??9)+wpDmg+comboDmg); if(atk.isPlayer)dmg=Math.round(dmg*(atk.dmgMult??1))
  def.hp=Math.max(0,def.hp-dmg); def.stunTimer=STUN[atk.action]??0.22; def.hitFlash=1; def.invTimer=.12
  def.vx=(atk.x<def.x?1:-1)*380; const pv=PUSHV[atk.action]; if(pv){def.vy=-pv;def.onGround=false}
  setAnim(def,def.stunTimer>.5?'knockdown':'hurt'); SFX.hurt()
  const hx=(atk.x+def.x)/2,hy=def.y-56
  if(atk.action==='special')spawnBurst(pts,hx,hy,atk.glowColor); else{spawnHit(pts,hx,hy,'#ff3300',20,5.5);spawnBlood(pts,hx,hy-8)}
  atk.comboCnt=(atk.comboCnt??0)+1; atk.comboTimer=1.9; return dmg
}

// ═══════════════════════════════════════════════════════════════════
//  PREVIEW CANVAS HOOK — animates a fighter on any canvas ref
// ═══════════════════════════════════════════════════════════════════
function usePreviewCanvas(canvasRef, getFighter, W, H, floorY) {
  const rafRef = useRef(null), lastRef = useRef(0), timeRef = useRef(0)
  useEffect(() => {
    let fighter = getFighter()
    function loop(now) {
      const dt = Math.min((now-(lastRef.current||now))/1000,.05); lastRef.current=now; timeRef.current+=dt
      const cv = canvasRef.current; if(!cv){rafRef.current=requestAnimationFrame(loop);return}
      const ctx = cv.getContext('2d'); ctx.clearRect(0,0,W,H)
      const g = ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,'#050008'); g.addColorStop(.5,'#0f001e'); g.addColorStop(1,'#050008')
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      const rg = ctx.createRadialGradient(W/2,H*.6,0,W/2,H*.6,W*.35); rg.addColorStop(0,fighter.glowColor+'44'); rg.addColorStop(1,'transparent')
      ctx.fillStyle=rg; ctx.fillRect(0,0,W,H)
      fighter.y = floorY + Math.sin(timeRef.current*2)*.9; tickAnim(fighter,dt); drawFighter(ctx,fighter,timeRef.current,floorY)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if(rafRef.current)cancelAnimationFrame(rafRef.current) }
  }, [getFighter])
}

// ═══════════════════════════════════════════════════════════════════
//  SHARED STYLES
// ═══════════════════════════════════════════════════════════════════
const S = {
  root:      { background:'#000', borderRadius:16, overflow:'hidden', fontFamily:'Courier New,monospace', color:'#EEE', userSelect:'none' },
  menuRoot:  { background:'radial-gradient(ellipse at 50% 20%,#1e0038,#070010 55%,#000)', borderRadius:16, fontFamily:'Courier New,monospace', color:'#EEE', userSelect:'none', overflowY:'auto', padding:'18px 14px 28px', display:'flex', flexDirection:'column', alignItems:'center' },
  navBtn:    (bg, extra={}) => ({ padding:'11px 22px', borderRadius:12, fontWeight:900, fontSize:11, cursor:'pointer', fontFamily:'inherit', letterSpacing:'2px', border:'none', ...bg, ...extra }),
  pill:      (active, col, bg) => ({ padding:'6px 10px', borderRadius:9, cursor:'pointer', fontSize:8, fontWeight:900, letterSpacing:'1px', textAlign:'center', transition:'all .12s', border:`1px solid ${active?col+'99':col+'22'}`, background:active?col+'22':col+'08', color:active?col:'#442244', transform:active?'scale(1.05)':'scale(1)' }),
  dpBtn:     { width:38, height:38, borderRadius:9, border:'1px solid #28003c', background:'linear-gradient(145deg,#0c001a,#070010)', color:'#6644aa', fontWeight:900, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none', WebkitTapHighlightColor:'transparent', fontFamily:'inherit' },
}
const cvStyle = { borderRadius:10, border:'1px solid #22003a', display:'block', width:'100%' }

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function StickmanFighterPremium({ game, levelData, studentId, onFinish }) {

  // ── Persistent ────────────────────────────────────────────────────
  const [storyProgress, setStoryProgress] = useState(() => { try{return parseInt(localStorage.getItem('sf_prog')||'0')}catch{return 0} })
  const [highScore,     setHighScore]     = useState(() => { try{return parseInt(localStorage.getItem('sf_hs')||'0')}catch{return 0} })

  // ── Navigation ─────────────────────────────────────────────────────
  const [screen, setScreen] = useState('title')   // title | story | charsel | fight | over

  // ── Selections ─────────────────────────────────────────────────────
  const [selChar,    setSelChar]    = useState(PLAYER_CHARS[0])
  const [selWeapon,  setSelWeapon]  = useState(WEAPONS[1])
  const [selDiff,    setSelDiff]    = useState(DIFFICULTIES[1])
  const [selBossIdx, setSelBossIdx] = useState(0)
  const [gameMode,   setGameMode]   = useState('story')

  // ── Fight HUD ──────────────────────────────────────────────────────
  const [hud, setHud] = useState({ pHp:100, pMax:100, eHp:100, eMax:100, combo:0, comboName:'', msg:'', roundLabel:'BOSS 1/8' })
  const [overState, setOverState] = useState(null)

  // ── Survival counters ──────────────────────────────────────────────
  const [survRound, setSurvRound] = useState(1)
  const [survScore, setSurvScore] = useState(0)

  // ── Refs ───────────────────────────────────────────────────────────
  const canvasRef       = useRef(null)
  const titlePrevRef    = useRef(null)
  const charPrevRef     = useRef(null)
  const bossPreviewRef  = useRef(null)
  const gRef            = useRef(null)
  const keysRef         = useRef({})
  const rafRef          = useRef(null)
  const lastRef         = useRef(null)
  const msgTimerRef     = useRef(null)
  // Mutable copies for use inside rAF without stale closure
  const modeRef       = useRef('story')
  const bossIdxRef    = useRef(0)
  const survRoundRef  = useRef(1)
  const survScoreRef  = useRef(0)
  const progressRef   = useRef(storyProgress)
  const hsRef         = useRef(highScore)
  const charRef       = useRef(selChar)
  const wpnRef        = useRef(selWeapon)
  const diffRef       = useRef(selDiff)

  useEffect(()=>{modeRef.current=gameMode},[gameMode])
  useEffect(()=>{charRef.current=selChar},[selChar])
  useEffect(()=>{wpnRef.current=selWeapon},[selWeapon])
  useEffect(()=>{diffRef.current=selDiff},[selDiff])
  useEffect(()=>{survRoundRef.current=survRound},[survRound])
  useEffect(()=>{survScoreRef.current=survScore},[survScore])
  useEffect(()=>{progressRef.current=storyProgress},[storyProgress])
  useEffect(()=>{hsRef.current=highScore},[highScore])

  // ── Preview canvases ───────────────────────────────────────────────
  const getTitleFighter = useCallback(() => {
    const c=PLAYER_CHARS[0]; return{ x:150,y:125,vy:0,vx:0,onGround:true,facingRight:true,hp:100,maxHp:100,animName:'idle',animIdx:0,animT:0,pose:new Float32Array(POSES.idle),locked:false,hitActive:false,hitConnected:false,action:'idle',blocking:false,stunTimer:0,invTimer:0,comboCnt:0,comboTimer:0,hitFlash:0,bodyColor:c.bc,skinColor:c.sc,glowColor:c.gc,eyeColor:c.ec,weapon:'sword',isPlayer:true,speed:170,dmgMult:1,wpnDmg:0,wpnRng:0 }
  },[])
  usePreviewCanvas(titlePrevRef, getTitleFighter, 300, 155, 125)

  const getCharFighter = useCallback(() => {
    const c=charRef.current,w=wpnRef.current; return{ x:160,y:100,vy:0,vx:0,onGround:true,facingRight:true,hp:100,maxHp:100,animName:'idle',animIdx:0,animT:0,pose:new Float32Array(POSES.idle),locked:false,hitActive:false,hitConnected:false,action:'idle',blocking:false,stunTimer:0,invTimer:0,comboCnt:0,comboTimer:0,hitFlash:0,bodyColor:c.bc,skinColor:c.sc,glowColor:c.gc,eyeColor:c.ec,weapon:w.id,isPlayer:true,speed:170,dmgMult:1,wpnDmg:0,wpnRng:0 }
  },[selChar,selWeapon])
  usePreviewCanvas(charPrevRef, getCharFighter, 320, 115, 100)

  const getBossFighter = useCallback(() => {
    const b=BOSSES[selBossIdx]; return{ x:160,y:93,vy:0,vx:0,onGround:true,facingRight:true,hp:100,maxHp:100,animName:'idle',animIdx:0,animT:0,pose:new Float32Array(POSES.idle),locked:false,hitActive:false,hitConnected:false,action:'idle',blocking:false,stunTimer:0,invTimer:0,comboCnt:0,comboTimer:0,hitFlash:0,bodyColor:b.bc,skinColor:b.sc,glowColor:b.gc,eyeColor:b.ec,weapon:b.weapon,isPlayer:false,speed:b.spd,dmgMult:1,wpnDmg:0,wpnRng:0 }
  },[selBossIdx])
  usePreviewCanvas(bossPreviewRef, getBossFighter, 320, 110, 93)

  // ── Message helper ─────────────────────────────────────────────────
  function showMsg(txt, dur=3000) {
    setHud(h=>({...h,msg:txt})); clearTimeout(msgTimerRef.current)
    if(dur>0)msgTimerRef.current=setTimeout(()=>setHud(h=>({...h,msg:''})),dur)
  }

  // ── Start fight ────────────────────────────────────────────────────
  function startFight(bossIdx) {
    const boss=BOSSES[bossIdx%BOSSES.length], dm=diffRef.current.mult
    const player=makeFighter(true,bossIdx,charRef.current,wpnRef.current,dm)
    const enemy=makeFighter(false,bossIdx,null,null,dm)
    gRef.current = { player, enemy, particles:[], time:0, phase:'fight', koTimer:0, bgType:boss.bg, shake:0 }
    bossIdxRef.current = bossIdx
    setScreen('fight')
    setHud({ pHp:player.hp, pMax:player.maxHp, eHp:boss.hp, eMax:boss.hp, combo:0, comboName:'', msg:boss.intro, roundLabel:modeRef.current==='survival'?`ROUND ${survRoundRef.current}`:`BOSS ${bossIdx+1}/${BOSSES.length}` })
    clearTimeout(msgTimerRef.current); msgTimerRef.current=setTimeout(()=>setHud(h=>({...h,msg:''})),3000)
    startMusic(boss.music??0)
  }

  // ── Resolve KO ─────────────────────────────────────────────────────
  const resolveKO = useCallback(() => {
    const g=gRef.current; if(!g)return
    const pWin=g.player.hp>0, bossIdx=bossIdxRef.current, mode=modeRef.current
    stopMusic(); gRef.current=null
    if(mode==='story'){
      if(pWin){
        const np=Math.max(progressRef.current,bossIdx+1); setStoryProgress(np); progressRef.current=np; try{localStorage.setItem('sf_prog',np)}catch{}
        const isLast=bossIdx>=BOSSES.length-1
        if(studentId)saveGameScore(studentId,game?.id,levelData?.level,isLast?1000:Math.round((bossIdx+1)*125))
        setOverState({ win:true, bossIdx, mode, score:0, next:isLast?-1:bossIdx+1 })
      } else {
        setOverState({ win:false, bossIdx, mode, score:0, next:-1 })
      }
    } else {
      if(pWin){
        const nr=survRoundRef.current+1, ns=survScoreRef.current+Math.round(120*nr*.7+charRef.current.stats.atk*40)
        setSurvRound(nr); survRoundRef.current=nr; setSurvScore(ns); survScoreRef.current=ns
        if(ns>hsRef.current){setHighScore(ns);hsRef.current=ns;try{localStorage.setItem('sf_hs',ns)}catch{}}
        if(studentId)saveGameScore(studentId,game?.id,levelData?.level,ns)
        setOverState({ win:true, bossIdx, mode, score:ns, next:(bossIdx+1)%BOSSES.length })
      } else {
        const fs=survScoreRef.current
        if(fs>hsRef.current){setHighScore(fs);hsRef.current=fs;try{localStorage.setItem('sf_hs',fs)}catch{}}
        if(studentId)saveGameScore(studentId,game?.id,levelData?.level,fs)
        setOverState({ win:false, bossIdx, mode, score:fs, next:-1 })
      }
    }
    setScreen('over')
  },[studentId,game,levelData])

  // ── Game loop ──────────────────────────────────────────────────────
  useEffect(() => {
    lastRef.current = performance.now()
    function loop(now) {
      const dt=Math.min((now-(lastRef.current??now))/1000,.05); lastRef.current=now
      if(gRef.current){updateG(dt);renderF()}
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    const onKey=e=>{keysRef.current[e.code]=e.type==='keydown';if(e.type==='keydown')handleKey(e.code);e.preventDefault()}
    window.addEventListener('keydown',onKey); window.addEventListener('keyup',onKey)
    return()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown',onKey); window.removeEventListener('keyup',onKey); stopMusic(); clearTimeout(msgTimerRef.current) }
  },[])

  function handleKey(code) {
    const g=gRef.current; if(!g||g.phase!=='fight')return; const p=g.player
    if(code==='KeyZ'||code==='KeyJ')doAction(p,'punch_R')
    if(code==='KeyX'||code==='KeyK')doAction(p,'heavy')
    if(code==='KeyC'||code==='KeyL')doAction(p,'kick_R')
    if(code==='KeyV')doAction(p,'special')
    if(code==='ArrowUp'||code==='KeyW'){if(p.onGround)doJump(p)}
  }

  function updateG(dt) {
    const g=gRef.current; if(!g)return; g.time+=dt
    if(g.shake>0){g.shake-=dt*5;if(g.shake<0)g.shake=0}
    if(g.phase==='ko'){g.koTimer-=dt;if(g.koTimer<=0)resolveKO();return}
    const p=g.player,e=g.enemy,K=keysRef.current
    if(!p.locked&&p.stunTimer<=0){
      const dx=(K.ArrowRight||K.KeyD?1:0)-(K.ArrowLeft||K.KeyA?1:0), blk=!!(K.ArrowDown||K.KeyS)
      p.blocking=blk&&p.onGround
      if(p.blocking){if(!p.locked)setAnim(p,'block')}
      else if(dx!==0){const spd=K.ShiftLeft||K.ShiftRight?225:p.speed;p.vx=dx*spd;p.facingRight=dx>0;if(p.onGround)setAnim(p,Math.abs(p.vx)>195?'run':'walk')}
      else{p.vx*=.5;if(p.onGround&&!p.locked)setAnim(p,'idle')}
    }else{p.vx*=.6;p.blocking=false}
    e.facingRight=e.x<p.x; aiTick(e,p,dt)
    if(!e.locked&&e.stunTimer<=0){e.vx=e.aiDir*e.speed;if(e.aiDir!==0&&e.onGround)setAnim(e,'walk');else if(e.onGround&&!e.locked)setAnim(e,'idle')}else e.vx*=.6
    for(const f of[p,e]){
      if(f.stunTimer>0){f.stunTimer-=dt;if(f.stunTimer<=0&&f.animName==='knockdown')setAnim(f,'getup')}
      if(f.invTimer>0)f.invTimer-=dt
      if((f.comboTimer??0)>0){f.comboTimer-=dt;if(f.comboTimer<=0)f.comboCnt=0}
      if(!f.onGround){f.vy+=1950*dt;f.y+=f.vy*dt;if(f.y>=FL){f.y=FL;f.vy=0;f.onGround=true;SFX.land();spawnDust(g.particles,f.x,FL);if(!f.locked)setAnim(f,'idle')}}
      f.x+=f.vx*dt; f.x=Math.max(28,Math.min(CW-28,f.x)); tickAnim(f,dt)
      if(!f.locked&&f.onGround&&f.isPlayer&&!(K.ArrowLeft||K.KeyA||K.ArrowRight||K.KeyD))p.facingRight=p.x<e.x
    }
    const h1=resolveHit(p,e,g.particles),h2=resolveHit(e,p,g.particles)
    if(h1&&h1!=='block')g.shake=h1>20?.38:.18; if(h2&&h2!=='block')g.shake=h2>20?.30:.14
    tickPFX(g.particles,dt)
    if((p.hp<=0||e.hp<=0)&&g.phase==='fight'){
      g.phase='ko'; g.koTimer=2.6; const pWin=p.hp>0
      if(pWin){setAnim(e,'knockdown');setAnim(p,'victory');SFX.ko();SFX.victory();showMsg('⚡ KO — VICTORY!',99999)}
      else{setAnim(p,'knockdown');SFX.ko();showMsg('💀 KO — DEFEATED',99999)}
    }
    setHud(h=>({...h,pHp:Math.max(0,p.hp),pMax:p.maxHp,eHp:Math.max(0,e.hp),eMax:e.maxHp,combo:p.comboCnt??0,comboName:COMBO_NAMES[Math.min(p.comboCnt??0,COMBO_NAMES.length-1)]??'',roundLabel:modeRef.current==='survival'?`ROUND ${survRoundRef.current}`:`BOSS ${bossIdxRef.current+1}/${BOSSES.length}`}))
  }

  function renderF() {
    const cv=canvasRef.current; if(!cv)return; const g=gRef.current; if(!g)return
    const ctx=cv.getContext('2d'); ctx.save()
    if(g.shake>0){const s=g.shake*9;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s)}
    drawBG(ctx,CW,CH,FL,g.bgType,g.time)
    const dist=Math.abs(g.player.x-g.enemy.x)
    if(dist<68){ctx.save();ctx.globalAlpha=(1-dist/68)*.12;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,CW,CH);ctx.restore()}
    if(g.player.x<g.enemy.x){drawFighter(ctx,g.player,g.time);drawFighter(ctx,g.enemy,g.time)}else{drawFighter(ctx,g.enemy,g.time);drawFighter(ctx,g.player,g.time)}
    drawPFX(ctx,g.particles); ctx.restore()
  }

  // ── Touch helpers ──────────────────────────────────────────────────
  function dpadDown(dir){AC();if(dir==='up'){const g=gRef.current;if(g?.player?.onGround)doJump(g.player)}else{const m={lf:'ArrowLeft',rt:'ArrowRight',dn:'ArrowDown'};keysRef.current[m[dir]]=true}}
  function dpadUp(dir){const m={lf:'ArrowLeft',rt:'ArrowRight',dn:'ArrowDown'};keysRef.current[m[dir]]=false;if(dir==='dn'&&gRef.current){gRef.current.player.blocking=false;if(!gRef.current.player.locked)setAnim(gRef.current.player,'idle')}}
  function tbAtk(act){AC();const g=gRef.current;if(g)doAction(g.player,act)}
  function setBlock(down){keysRef.current.ArrowDown=down;const g=gRef.current;if(!g)return;g.player.blocking=down&&g.player.onGround;if(down&&!g.player.locked)setAnim(g.player,'block');else if(!down&&!g.player.locked)setAnim(g.player,'idle')}

  // ═══════════════════════════════════════════════════════════════════
  //  TITLE SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'title') return (
    <div style={S.menuRoot}>
      <div style={{fontSize:48,marginBottom:8,filter:'drop-shadow(0 0 24px #cc00ff)'}}>⚔️</div>
      <div style={{fontSize:28,fontWeight:900,letterSpacing:7,color:'#e8d0ff',textShadow:'0 0 30px #cc00ff,0 0 80px #8800cc',marginBottom:2}}>SHADOW FIGHT</div>
      <div style={{fontSize:8,letterSpacing:6,color:'#440066',marginBottom:16}}>PREMIUM EDITION</div>
      <canvas ref={titlePrevRef} width={300} height={155} style={{...cvStyle,maxWidth:300,marginBottom:18}}/>
      {/* Story mode */}
      <div onClick={()=>{AC();SFX.menu();setGameMode('story');setSelBossIdx(Math.min(storyProgress,BOSSES.length-1));setScreen('story')}}
        style={{width:'100%',maxWidth:320,padding:'14px 18px',borderRadius:14,border:'1px solid #6600aa88',background:'linear-gradient(135deg,rgba(80,0,140,.3),rgba(40,0,70,.4))',cursor:'pointer',marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:900,letterSpacing:2,color:'#cc88ff',marginBottom:3}}>⚔️  STORY MODE</div>
        <div style={{fontSize:9,color:'#9966cc',lineHeight:1.5}}>Battle 8 legendary bosses. Unlock each one. Choose your fighter and weapon.</div>
        <div style={{fontSize:8,color:'#550077',marginTop:4}}>Progress: {storyProgress}/{BOSSES.length} bosses defeated</div>
      </div>
      {/* Survival mode */}
      <div onClick={()=>{AC();SFX.menu();setGameMode('survival');setScreen('charsel')}}
        style={{width:'100%',maxWidth:320,padding:'14px 18px',borderRadius:14,border:'1px solid #cc220088',background:'linear-gradient(135deg,rgba(140,0,0,.3),rgba(70,0,0,.4))',cursor:'pointer',marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:900,letterSpacing:2,color:'#ff8866',marginBottom:3}}>💀  SURVIVAL MODE</div>
        <div style={{fontSize:9,color:'#cc6644',lineHeight:1.5}}>Endless rounds. Score multipliers stack each wave.</div>
        {highScore>0&&<div style={{fontSize:8,color:'#884422',marginTop:4}}>Best score: {highScore}</div>}
      </div>
      <div style={{color:'#220033',fontSize:7,letterSpacing:1,textAlign:'center'}}>Arrow keys / D-pad · Z=Punch · X=Heavy · C=Kick · V=Special · Shift=Sprint</div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════
  //  STORY PROGRESS SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'story') {
    const boss = BOSSES[selBossIdx]
    return (
      <div style={S.menuRoot}>
        <div style={{fontSize:10,letterSpacing:4,color:'#550088',marginBottom:12,marginTop:4}}>STORY PROGRESS</div>
        {/* Boss grid */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',width:'100%',maxWidth:400,marginBottom:14}}>
          {BOSSES.map((b,i)=>{
            const locked=i>storyProgress, isCurr=i===selBossIdx
            return(
              <div key={i} onClick={()=>{if(!locked){setSelBossIdx(i);SFX.menu()}}}
                style={{width:66,padding:'10px 4px',borderRadius:10,border:`2px solid ${locked?'#1a0028':isCurr?b.gc+'aa':b.gc+'44'}`,background:isCurr?b.gc+'22':'rgba(0,0,0,.4)',textAlign:'center',cursor:locked?'default':'pointer',opacity:locked?0.35:1,transform:isCurr?'scale(1.1)':'scale(1)',transition:'all .15s',position:'relative'}}>
                <div style={{fontSize:18,marginBottom:3}}>{b.rank}</div>
                <div style={{fontSize:7,fontWeight:900,letterSpacing:.5,color:locked?'#440066':b.gc}}>{b.name}</div>
                <div style={{fontSize:6,opacity:.55}}>{'★'.repeat(Math.ceil(b.diff*5))}</div>
                {locked&&<div style={{position:'absolute',top:3,right:4,fontSize:9}}>🔒</div>}
                {i<storyProgress&&<div style={{position:'absolute',top:3,left:4,fontSize:9,color:b.gc}}>✓</div>}
              </div>
            )
          })}
        </div>
        {/* Selected boss detail */}
        <div style={{width:'100%',maxWidth:360,padding:14,borderRadius:12,border:'1px solid #2a0044',background:'rgba(0,0,0,.6)',marginBottom:12,textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:900,letterSpacing:3,color:boss.gc,marginBottom:4}}>{boss.rank} {boss.name}</div>
          <div style={{fontSize:10,opacity:.55,fontStyle:'italic',marginBottom:8}}>"{boss.intro}"</div>
          <div style={{display:'flex',justifyContent:'center',gap:14,fontSize:9,opacity:.7}}>
            <span>HP: {boss.hp}</span><span>SPD: {boss.spd}</span><span>WPN: {boss.weapon.toUpperCase()}</span><span>{'★'.repeat(Math.ceil(boss.diff*5))}</span>
          </div>
        </div>
        {/* Boss preview */}
        <canvas ref={bossPreviewRef} width={320} height={110} style={{...cvStyle,maxWidth:320,marginBottom:14}}/>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{SFX.menu();setScreen('title')}} style={S.navBtn({background:'#1a0028',color:'#664488',border:'1px solid #330044'})}>← MENU</button>
          <button onClick={()=>{SFX.select();setScreen('charsel')}} style={S.navBtn({background:'linear-gradient(135deg,#5500cc,#aa00ff)',color:'white',boxShadow:'0 4px 20px rgba(150,0,255,.4)'})}>SELECT FIGHTER →</button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTER SELECT
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'charsel') return (
    <div style={S.menuRoot}>
      <div style={{fontSize:10,letterSpacing:4,color:'#440066',marginBottom:6,marginTop:4}}>SELECT YOUR FIGHTER</div>
      {/* Live character preview */}
      <canvas ref={charPrevRef} width={320} height={115} style={{...cvStyle,maxWidth:320,marginBottom:6}}/>
      <div style={{fontSize:9,color:selChar.gc,marginBottom:12,textAlign:'center',height:16}}>{selChar.desc}</div>

      {/* ── FIGHTERS ── */}
      <div style={{fontSize:9,letterSpacing:3,color:'#550088',marginBottom:8}}>FIGHTER</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,width:'100%',maxWidth:360,marginBottom:16}}>
        {PLAYER_CHARS.map(c=>(
          <div key={c.id} onClick={()=>{setSelChar(c);SFX.select()}}
            style={{padding:'11px 7px',borderRadius:12,border:`2px solid ${c===selChar?c.gc+'99':c.gc+'33'}`,background:c===selChar?c.gc+'22':c.gc+'0a',textAlign:'center',cursor:'pointer',transform:c===selChar?'scale(1.06)':'scale(1)',transition:'all .15s',color:c===selChar?c.gc:'#664488'}}>
            <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
            <div style={{fontSize:8,fontWeight:900,letterSpacing:1,marginBottom:2}}>{c.name}</div>
            <div style={{fontSize:7,opacity:.6}}>HP:{c.stats.hp} SPD:{c.stats.spd}</div>
          </div>
        ))}
      </div>

      {/* ── WEAPONS ── */}
      <div style={{fontSize:9,letterSpacing:3,color:'#550088',marginBottom:8}}>WEAPON</div>
      <div style={{display:'flex',gap:7,width:'100%',maxWidth:360,justifyContent:'center',marginBottom:16}}>
        {WEAPONS.map(w=>(
          <div key={w.id} onClick={()=>{setSelWeapon(w);SFX.select()}}
            style={{flex:1,maxWidth:82,padding:'10px 4px',borderRadius:10,border:`2px solid ${w===selWeapon?'#aa66ff':'#330044'}`,background:w===selWeapon?'rgba(120,0,200,.2)':'rgba(20,0,30,.5)',textAlign:'center',cursor:'pointer',transform:w===selWeapon?'scale(1.06)':'scale(1)',transition:'all .15s',color:w===selWeapon?'#cc99ff':'#553366'}}>
            <div style={{fontSize:20,marginBottom:3}}>{w.icon}</div>
            <div style={{fontSize:8,fontWeight:700,marginBottom:2}}>{w.name}</div>
            <div style={{fontSize:7,opacity:.5}}>{w.desc}</div>
          </div>
        ))}
      </div>

      {/* ── DIFFICULTY ── */}
      <div style={{fontSize:9,letterSpacing:3,color:'#550088',marginBottom:8}}>DIFFICULTY</div>
      <div style={{display:'flex',gap:6,width:'100%',maxWidth:360,justifyContent:'center',marginBottom:18}}>
        {DIFFICULTIES.map(d=>(
          <div key={d.id} onClick={()=>{setSelDiff(d);SFX.select()}} style={S.pill(d===selDiff,d.col)}>{d.label}</div>
        ))}
      </div>

      {/* ── NAV ── */}
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>{SFX.menu();setScreen(gameMode==='story'?'story':'title')}} style={S.navBtn({background:'#1a0028',color:'#664488',border:'1px solid #330044'})}>← BACK</button>
        <button onClick={()=>{
          SFX.select()
          if(gameMode==='survival'){setSurvRound(1);survRoundRef.current=1;setSurvScore(0);survScoreRef.current=0;startFight(0)}
          else startFight(selBossIdx)
        }} style={S.navBtn({background:'linear-gradient(135deg,#5500cc,#aa00ff)',color:'white',boxShadow:'0 4px 20px rgba(150,0,255,.4)'})}>FIGHT →</button>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════
  //  GAME OVER / VICTORY
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'over' && overState) {
    const {win,bossIdx,mode,score,next}=overState
    const isChamp=win&&bossIdx>=BOSSES.length-1
    return (
      <div style={{...S.menuRoot,justifyContent:'center'}}>
        <div style={{fontSize:52,marginBottom:12}}>{isChamp?'👑':win?'🏆':'💀'}</div>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:4,marginBottom:10,color:win?'#ffd700':'#ef4444',textShadow:win?'0 0 30px #ffd700':'0 0 30px #ef4444'}}>
          {isChamp?'CHAMPION!':win?'VICTORY!':'DEFEATED'}
        </div>
        <div style={{color:'#664488',fontSize:11,marginBottom:8,lineHeight:1.8,textAlign:'center'}}>
          {mode==='story'?(win?`${BOSSES[bossIdx].name} defeated!${isChamp?' You are the Shadow King!':''}`):`Fell to ${BOSSES[bossIdx].name}.`}
          {mode==='survival'&&`\n${survRoundRef.current-1} rounds · Score: ${score}`}
        </div>
        {mode==='survival'&&<div style={{color:'#ffd700',fontSize:14,fontWeight:900,marginBottom:8}}>SCORE: {score}</div>}
        {highScore>0&&<div style={{color:'#441166',fontSize:9,marginBottom:16}}>Best: {highScore}</div>}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
          <button onClick={()=>{stopMusic();gRef.current=null;setScreen('title')}} style={S.navBtn({background:'#1a0028',color:'#aa88cc',border:'1px solid #330044'})}>← MENU</button>
          <button onClick={()=>{stopMusic();gRef.current=null;startFight(bossIdx)}} style={S.navBtn({background:'linear-gradient(135deg,#770000,#ee1100)',color:'white'})}>RETRY ↺</button>
          {win&&next>=0&&<button onClick={()=>{stopMusic();gRef.current=null;startFight(next)}} style={S.navBtn({background:'linear-gradient(135deg,#5500cc,#aa00ff)',color:'white'})}>NEXT BOSS →</button>}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIGHT SCREEN
  // ═══════════════════════════════════════════════════════════════════
  const boss = BOSSES[bossIdxRef.current % BOSSES.length]
  const pPct = Math.max(0,(hud.pHp/hud.pMax)*100), ePct = Math.max(0,(hud.eHp/hud.eMax)*100)
  const pBg = pPct>50?'linear-gradient(90deg,#1a7a3a,#4ade80)':pPct>25?'linear-gradient(90deg,#7a6010,#f59e0b)':'linear-gradient(90deg,#7a1a1a,#ef4444)'

  return (
    <div style={S.root}>
      {/* ── HUD ── */}
      <div style={{background:'linear-gradient(180deg,#060010,#03000a)',padding:'9px 12px 7px',borderBottom:'1px solid #180028'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{color:'#88aaff',fontSize:8,fontWeight:900,letterSpacing:.8}}>{selChar.name}</span>
              <span style={{color:pPct>50?'#4ade80':pPct>25?'#fbbf24':'#f87171',fontSize:8,fontWeight:700}}>{Math.ceil(hud.pHp)}</span>
            </div>
            <div style={{height:10,background:'#080016',borderRadius:5,border:'1px solid #220036',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pPct}%`,background:pBg,borderRadius:5,transition:'width .1s'}}/>
            </div>
          </div>
          <div style={{textAlign:'center',minWidth:60}}>
            {(hud.combo??0)>=2&&<><div style={{color:(hud.combo??0)>=5?'#ff0000':'#ff6600',fontWeight:900,fontSize:18,lineHeight:1}}>{hud.combo}✕</div><div style={{fontSize:7,color:'#ff8800',letterSpacing:1,height:11}}>{hud.comboName}</div></>}
            <div style={{fontSize:7,color:'#330044',letterSpacing:1}}>{hud.roundLabel}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{color:'#f87171',fontSize:8,fontWeight:700}}>{Math.ceil(hud.eHp)}</span>
              <span style={{color:'#ff8888',fontSize:8,fontWeight:900,letterSpacing:.8}}>{boss.name}</span>
            </div>
            <div style={{height:10,background:'#080016',borderRadius:5,border:'1px solid #220036',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${ePct}%`,background:'linear-gradient(270deg,#7a1a1a,#f87171)',borderRadius:5,transition:'width .1s',marginLeft:'auto'}}/>
            </div>
          </div>
        </div>
      </div>
      {/* ── Message ── */}
      {hud.msg&&<div style={{minHeight:20,padding:'3px 12px',textAlign:'center',fontSize:10,fontWeight:900,letterSpacing:1.5,color:'#cc88ff',background:'linear-gradient(90deg,transparent,rgba(100,0,180,.1),transparent)',borderBottom:'1px solid rgba(100,0,180,.12)'}}>{hud.msg}</div>}
      {/* ── Canvas ── */}
      <canvas ref={canvasRef} width={CW} height={CH} style={{width:'100%',display:'block'}}/>
      {/* ── Controls ── */}
      <div style={{background:'linear-gradient(180deg,#030008,#010004)',borderTop:'1px solid #130022',padding:'8px 8px 12px',display:'flex',gap:5,alignItems:'flex-end',justifyContent:'center'}}>
        {/* D-pad */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,38px)',gridTemplateRows:'repeat(3,38px)',gap:3,flexShrink:0}}>
          {[
            [null],[{id:'up',l:'↑'}],[null],
            [{id:'lf',l:'←'}],[{cx:true}],[{id:'rt',l:'→'}],
            [null],[{id:'dn',l:'↓'}],[null],
          ].map((item,i)=>{
            const c=item[0]; if(!c)return<div key={i}/>
            if(c.cx)return<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>⚔️</div>
            return(<button key={i} onPointerDown={e=>{e.preventDefault();dpadDown(c.id)}} onPointerUp={e=>{e.preventDefault();if(c.id!=='up')dpadUp(c.id)}} onPointerLeave={e=>{if(c.id!=='up')dpadUp(c.id)}} onPointerCancel={e=>{if(c.id!=='up')dpadUp(c.id)}} style={S.dpBtn}>{c.l}</button>)
          })}
        </div>
        {/* Attack buttons */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,flex:1,maxWidth:268}}>
          {[
            ['PUNCH','punch_R','#ff4400',false,false],
            ['HEAVY','heavy','#cc1100',false,false],
            ['KICK','kick_R','#aa0055',false,false],
            ['BLOCK','block','#0044ee',true,false],
            ['★ SPECIAL','special','#8800ff',false,true],
          ].map(([lb,act,col,isBlock,span])=>(
            <button key={act}
              onPointerDown={e=>{e.preventDefault();isBlock?setBlock(true):tbAtk(act)}}
              onPointerUp={e=>{e.preventDefault();if(isBlock)setBlock(false)}}
              onPointerLeave={e=>{if(isBlock)setBlock(false)}}
              onPointerCancel={e=>{if(isBlock)setBlock(false)}}
              style={{padding:'8px 2px',borderRadius:9,border:`1px solid ${col}44`,background:`linear-gradient(135deg,${col}1a,${col}08)`,color:col,fontWeight:900,fontSize:8,cursor:'pointer',touchAction:'none',WebkitTapHighlightColor:'transparent',fontFamily:'inherit',letterSpacing:'.5px',boxShadow:`0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05)`,gridColumn:span?'span 2':'auto'}}>
              {lb}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
