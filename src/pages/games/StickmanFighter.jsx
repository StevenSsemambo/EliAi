import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────
//  AUDIO  (all inside functions — zero module-level execution)
// ─────────────────────────────────────────────────────────────────
function getAC() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    const a = new Ctx()
    if (a.state === 'suspended') a.resume()
    return a
  } catch (e) { return null }
}

let _sharedAC = null
function AC() {
  if (!_sharedAC || _sharedAC.state === 'closed') {
    _sharedAC = getAC()
  } else if (_sharedAC.state === 'suspended') {
    _sharedAC.resume()
  }
  return _sharedAC
}

function playTone(freq, type, dur, vol, delay) {
  var d = delay || 0
  try {
    var a = AC(); if (!a) return
    var o = a.createOscillator()
    var g = a.createGain()
    o.connect(g); g.connect(a.destination)
    o.type = type || 'sine'
    o.frequency.value = freq
    var t = a.currentTime + d
    g.gain.setValueAtTime(0.001, t)
    g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.start(t); o.stop(t + dur + 0.05)
  } catch (e) {}
}

function playNoise(vol, dur, cutoff, delay) {
  var d = delay || 0
  try {
    var a = AC(); if (!a) return
    var len = Math.ceil(a.sampleRate * Math.min(dur, 1))
    var buf = a.createBuffer(1, len, a.sampleRate)
    var data = buf.getChannelData(0)
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    var src = a.createBufferSource()
    var g = a.createGain()
    var f = a.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = cutoff || 500
    src.buffer = buf
    src.connect(f); f.connect(g); g.connect(a.destination)
    var t = a.currentTime + d
    g.gain.setValueAtTime(vol || 0.3, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.start(t); src.stop(t + dur + 0.1)
  } catch (e) {}
}

// Sound sets — indexed 0,1,2 for early/mid/late game
var SOUNDS = [
  {
    punch:   function() { playNoise(0.4,0.05,600); playTone(200,'sawtooth',0.07,0.2,0.02) },
    kick:    function() { playNoise(0.55,0.09,350); playTone(120,'sawtooth',0.10,0.3,0.02) },
    block:   function() { playTone(880,'square',0.04,0.25); playTone(600,'square',0.035,0.18,0.03) },
    hurt:    function() { playNoise(0.35,0.12,450); playTone(150,'sawtooth',0.12,0.22,0.04) },
    whoosh:  function() { playNoise(0.12,0.13,1600) },
    special: function() { var n=[200,320,480,720,1040]; for(var i=0;i<n.length;i++) playTone(n[i],'sine',0.3,0.2,i*0.05) },
    land:    function() { playNoise(0.25,0.06,220) },
    ko:      function() { var n=[320,260,200,150,100]; for(var i=0;i<n.length;i++) playTone(n[i],'sawtooth',0.5,0.35,i*0.24) },
    victory: function() { var n=[523,659,784,1047,1319]; for(var i=0;i<n.length;i++) playTone(n[i],'triangle',0.32,0.24,i*0.14) },
    metal:   function() { playTone(1200,'square',0.04,0.2); playTone(800,'square',0.035,0.14,0.04) },
  },
  {
    punch:   function() { playNoise(0.55,0.06,500); playTone(160,'sawtooth',0.09,0.28,0.02); playTone(80,'sawtooth',0.05,0.12,0.04) },
    kick:    function() { playNoise(0.7,0.10,300); playTone(100,'sawtooth',0.12,0.38,0.02); playTone(55,'sine',0.08,0.18,0.04) },
    block:   function() { playNoise(0.18,0.04,800); playTone(700,'square',0.05,0.28); playTone(450,'square',0.04,0.18,0.04) },
    hurt:    function() { playNoise(0.5,0.14,400); playTone(130,'sawtooth',0.15,0.28,0.05) },
    whoosh:  function() { playNoise(0.18,0.16,2000); playTone(260,'sine',0.08,0.1,0.04) },
    special: function() { var n=[160,280,440,680,1000,1400]; for(var i=0;i<n.length;i++) playTone(n[i],'sawtooth',0.28,0.18,i*0.045) },
    land:    function() { playNoise(0.35,0.08,180); playTone(80,'sine',0.06,0.15,0.02) },
    ko:      function() { playNoise(0.4,0.5,200,0.1); var n=[280,220,170,120,80]; for(var i=0;i<n.length;i++) playTone(n[i],'sawtooth',0.6,0.4,i*0.26) },
    victory: function() { var n=[440,554,659,880,1108]; for(var i=0;i<n.length;i++) playTone(n[i],'triangle',0.3,0.24,i*0.12) },
    metal:   function() { playTone(1800,'square',0.05,0.25,0); playTone(1200,'square',0.04,0.16,0.04) },
  },
  {
    punch:   function() { playNoise(0.75,0.07,450); playTone(140,'sawtooth',0.11,0.36,0.025); playTone(70,'sine',0.1,0.22,0.05) },
    kick:    function() { playNoise(0.85,0.12,280); playTone(90,'sawtooth',0.14,0.45,0.025); playTone(45,'sine',0.1,0.25,0.06) },
    block:   function() { playNoise(0.28,0.05,1000); playTone(600,'sawtooth',0.06,0.32); playTone(380,'square',0.05,0.22,0.05) },
    hurt:    function() { playNoise(0.62,0.16,360); playTone(110,'sawtooth',0.18,0.36,0.06); playTone(60,'sine',0.1,0.18,0.1) },
    whoosh:  function() { playNoise(0.25,0.18,2400); playTone(200,'sawtooth',0.1,0.14,0.05) },
    special: function() { playNoise(0.4,0.4,300,0.05); var n=[140,240,400,640,1000,1600]; for(var i=0;i<n.length;i++) playTone(n[i],'sawtooth',0.35,0.22,i*0.04) },
    land:    function() { playNoise(0.5,0.10,160); playTone(70,'sine',0.08,0.18,0.02) },
    ko:      function() { playNoise(0.6,0.8,200,0.05); var n=[240,190,145,100,60]; for(var i=0;i<n.length;i++) playTone(n[i],'sawtooth',0.7,0.45,i*0.28) },
    victory: function() { var n=[349,440,523,698,880]; for(var i=0;i<n.length;i++) playTone(n[i],'triangle',0.32,0.26,i*0.11) },
    metal:   function() { playNoise(0.15,0.06,2000); playTone(2200,'square',0.06,0.3,0); playTone(1400,'square',0.05,0.18,0.05) },
  },
]

// Background music — stored as intervalId
var _musicId = -1

function startBGMusic(theme) {
  stopBGMusic()
  try {
    var a = AC(); if (!a) return
    var bpm = [88,120,70,100][theme] || 88
    var beat = 60 / bpm
    var t = { v: a.currentTime + 0.1 }

    if (theme === 0) {
      _musicId = setInterval(function() {
        try {
          var a2 = AC(); if (!a2) return
          var bt = a2.currentTime + 0.05
          playNoise(0.3,0.07,120,0); playTone(60,'sine',0.18,0.25,0)
          playNoise(0.18,0.055,800,0,beat); playNoise(0.18,0.055,800,0,beat*3)
          var pn=[294,349,392,440,523]
          for(var i=0;i<pn.length;i++) playTone(pn[i],'triangle',0.45,0.05,i*beat*0.5)
        } catch(e) {}
      }, Math.round(beat*4*1000))
    } else if (theme === 1) {
      _musicId = setInterval(function() {
        try {
          for(var i=0;i<8;i++){ playNoise(0.18,0.04,300,0,i*beat*0.5); if(i%2===0) playTone(80,'sine',0.14,0.18,i*beat*0.5) }
          var mn=[330,392,440,494,392,330,294,330]
          for(var i=0;i<mn.length;i++) playTone(mn[i],'square',0.38,0.025,i*beat*0.5)
        } catch(e) {}
      }, Math.round(beat*4*1000))
    } else if (theme === 2) {
      _musicId = setInterval(function() {
        try {
          var fn=[174,220,261]
          for(var i=0;i<fn.length;i++) playTone(fn[i],'sine',beat*3.8,0.035,i*beat*1.2)
          playNoise(0.055,beat*4,400)
        } catch(e) {}
      }, Math.round(beat*4*1000))
    } else {
      _musicId = setInterval(function() {
        try {
          var offs=[0,beat,beat*1.5,beat*2,beat*3,beat*3.5]
          for(var i=0;i<offs.length;i++) playNoise(0.28,0.07,200,0,offs[i])
          var sn=[55,55,65,55,73,65,55,49]
          for(var i=0;i<sn.length;i++) playTone(sn[i],'sawtooth',beat*0.85,0.045,i*beat*0.5)
        } catch(e) {}
      }, Math.round(beat*4*1000))
    }
  } catch(e) {}
}

function stopBGMusic() {
  if (_musicId !== -1) { clearInterval(_musicId); _musicId = -1 }
}

// ─────────────────────────────────────────────────────────────────
//  CANVAS CONSTANTS
// ─────────────────────────────────────────────────────────────────
var CW = 480, CH = 340, FLOOR = CH - 50

// ─────────────────────────────────────────────────────────────────
//  SKELETON  (17 joints, y-up local space, hip = origin)
// ─────────────────────────────────────────────────────────────────
var J = { HIP:0,SPINE:1,CHEST:2,NECK:3,HEAD:4, LS:5,LE:6,LH:7, RS:8,RE:9,RH:10, LHip:11,LK:12,LF:13, RHip:14,RK:15,RF:16 }
var NJ = 17

// Bones: [from, to, lineWidth]
var BONES = [
  [0,1,5.5],[1,2,5.0],[2,3,4.5],[3,4,4.0],
  [2,5,4.0],[5,6,3.8],[6,7,3.2],
  [2,8,4.0],[8,9,3.8],[9,10,3.2],
  [0,11,4.5],[11,12,4.8],[12,13,4.2],
  [0,14,4.5],[14,15,4.8],[15,16,4.2],
]

function emptyPose() {
  var p = []
  for (var i = 0; i < NJ; i++) p.push({ x: 0, y: 0 })
  return p
}

function P(a) {
  var p = emptyPose()
  for (var i = 0; i < NJ; i++) { p[i] = { x: a[i * 2], y: a[i * 2 + 1] } }
  return p
}

var POSES = {
  idle:    P([0,0, 0,20, 0,42, 1,56, 3,70, -20,40,-35,26,-33,10, 20,40,33,26,31,10, -11,-2,-17,-30,-18,-57, 11,-2,17,-30,18,-57]),
  walk_a:  P([0,3, 0,23, 1,45, 2,59, 4,73, -18,41,-36,30,-44,16, 21,41,28,27,20,13, -13,-2,-28,-22,-42,-52, 13,-2,9,-32,7,-58]),
  walk_b:  P([0,3, 0,23,-1,45,-2,59,-4,73, -21,41,-28,27,-20,13, 18,41,36,30,44,16, -13,-2,-9,-32,-7,-58, 13,-2,28,-22,42,-52]),
  run_a:   P([2,6,-1,26,-1,48, 0,62, 1,76, -16,44,-42,36,-56,22, 24,44,30,28,22,12, -14,-2,-35,-16,-55,-44, 14,-2,10,-38,6,-66]),
  run_b:   P([-2,6,1,26,1,48,0,62,-1,76, -24,44,-30,28,-22,12, 16,44,42,36,56,22, -14,-2,-10,-38,-6,-66, 14,-2,35,-16,55,-44]),
  jump_r:  P([0,0, 0,22, 0,45, 0,59, 0,73, -21,43,-40,57,-46,70, 21,43,40,57,46,70, -13,-2,-24,-18,-26,-40, 13,-2,24,-18,26,-40]),
  jump_p:  P([0,0, 0,20, 0,43, 0,57, 0,71, -23,41,-44,34,-58,20, 23,41,44,34,58,20, -15,-2,-22,-24,-20,-50, 15,-2,22,-24,20,-50]),
  crouch:  P([0,-12, 0,8, 0,28, 1,40, 3,52, -18,26,-32,12,-30,-2, 18,26,32,12,30,-2, -13,-14,-22,-40,-26,-66, 13,-14,22,-40,26,-66]),
  pRw:     P([-4,0,-3,20,-2,42,-1,56,1,70, -21,40,-38,28,-40,14, 18,40,12,56,6,66, -11,-2,-15,-30,-16,-56, 11,-2,15,-30,16,-56]),
  pRe:     P([6,0,6,20,7,42,8,55,9,69, -17,40,-24,28,-20,14, 22,43,44,46,66,48, -11,-2,-14,-30,-15,-56, 11,-2,14,-30,15,-56]),
  pLw:     P([4,0,3,20,2,42,1,56,-1,70, -18,40,-12,56,-6,66, 21,40,38,28,40,14, -11,-2,-15,-30,-16,-56, 11,-2,15,-30,16,-56]),
  pLe:     P([-6,0,-6,20,-7,42,-8,55,-9,69, -22,43,-44,46,-66,48, 17,40,24,28,20,14, -11,-2,-14,-30,-15,-56, 11,-2,14,-30,15,-56]),
  kRw:     P([-4,0,-3,20,-2,42,-1,56,-1,70, -21,40,-40,28,-54,14, 20,40,30,30,24,18, -13,-2,-15,-30,-14,-57, 11,-2,14,-14,16,-6]),
  kRe:     P([8,0,8,19,9,41,10,55,11,69, -18,39,-24,52,-20,64, 22,40,26,30,22,18, -13,-2,-14,-30,-13,-57, 11,-2,38,-14,64,-10]),
  kLw:     P([4,0,3,20,2,42,1,56,1,70, -20,40,-30,30,-24,18, 21,40,40,28,54,14, -11,-2,-14,-14,-16,-6, 13,-2,15,-30,14,-57]),
  kLe:     P([-8,0,-8,19,-9,41,-10,55,-11,69, -22,40,-26,30,-22,18, 18,39,24,52,20,64, -11,-2,-38,-14,-64,-10, 13,-2,14,-30,13,-57]),
  upw:     P([0,-8,0,12,0,32,1,45,2,58, -18,30,-32,16,-34,2, 18,30,16,12,10,-2, -13,-14,-20,-40,-24,-66, 13,-14,18,-38,16,-64]),
  upe:     P([6,-12,6,10,7,34,8,50,10,66, -16,32,-10,46,-8,58, 24,40,32,60,28,78, -13,-14,-16,-40,-18,-66, 13,-14,14,-38,12,-64]),
  block:   P([-2,0,-2,20,-2,40,-1,54,0,67, -21,38,-11,52,1,64, 19,38,9,52,-3,64, -13,-2,-17,-32,-19,-59, 13,-2,17,-32,19,-59]),
  hurt:    P([-11,0,-10,18,-9,38,-11,52,-14,65, -27,36,-46,22,-58,10, 11,36,20,20,18,6, -11,-2,-13,-28,-12,-54, 11,-2,17,-26,20,-52]),
  down:    P([0,-9,-22,-15,-44,-18,-59,-16,-71,-12, -32,-8,-46,4,-56,16, -29,-26,-21,-18,-15,-8, -7,-7,2,9,14,26, 8,-7,22,5,38,18]),
  getup:   P([-4,-4,-2,16,0,36,1,50,2,64, -19,34,-32,20,-30,6, 17,34,25,20,21,6, -13,-4,-20,-28,-22,-54, 10,-4,8,-24,6,-50]),
  spCh:    P([0,0,0,22,0,46,0,61,0,76, -25,46,-46,60,-40,74, 25,46,46,60,40,74, -13,-2,-20,-32,-24,-59, 13,-2,20,-32,24,-59]),
  spRe:    P([10,0,10,21,11,44,12,58,13,72, -12,44,14,46,36,48, 26,46,48,48,68,48, -13,-2,-17,-32,-20,-59, 11,-2,12,-32,10,-59]),
  victory: P([0,4,0,24,0,46,0,60,0,74, -22,44,-44,56,-42,70, 22,44,40,62,36,78, -12,-2,-16,-30,-18,-57, 12,-2,16,-30,18,-57]),
}

// ─────────────────────────────────────────────────────────────────
//  ANIMATION SEQUENCES  {f: fromPose, t: toPose, d: duration, hit: bool}
// ─────────────────────────────────────────────────────────────────
var ANIMS = {
  idle:     [{f:'idle',   t:'idle',   d:0.5}],
  walk:     [{f:'walk_a', t:'walk_b', d:0.15},{f:'walk_b',t:'walk_a',d:0.15}],
  run:      [{f:'run_a',  t:'run_b',  d:0.10},{f:'run_b', t:'run_a', d:0.10}],
  jump:     [{f:'jump_r', t:'jump_p', d:0.18},{f:'jump_p',t:'jump_p',d:0.6}],
  punch_R:  [{f:'pRw',t:'pRe',d:0.07,hit:true},{f:'pRe',t:'idle',d:0.10},{f:'idle',t:'idle',d:0.06}],
  punch_L:  [{f:'pLw',t:'pLe',d:0.07,hit:true},{f:'pLe',t:'idle',d:0.10},{f:'idle',t:'idle',d:0.06}],
  kick_R:   [{f:'kRw',t:'kRe',d:0.09,hit:true},{f:'kRe',t:'idle',d:0.14},{f:'idle',t:'idle',d:0.08}],
  kick_L:   [{f:'kLw',t:'kLe',d:0.09,hit:true},{f:'kLe',t:'idle',d:0.14},{f:'idle',t:'idle',d:0.08}],
  uppercut: [{f:'upw',t:'upe',d:0.08,hit:true},{f:'upe',t:'idle',d:0.16},{f:'idle',t:'idle',d:0.09}],
  block:    [{f:'block',t:'block',d:0.5}],
  hurt:     [{f:'hurt',t:'hurt',d:0.20},{f:'hurt',t:'idle',d:0.12}],
  knockdown:[{f:'down',t:'down',d:1.4}],
  getup:    [{f:'down',t:'getup',d:0.28},{f:'getup',t:'idle',d:0.18}],
  special:  [{f:'spCh',t:'spCh',d:0.14},{f:'spCh',t:'spRe',d:0.12,hit:true},{f:'spRe',t:'idle',d:0.20}],
  victory:  [{f:'victory',t:'victory',d:1.5}],
}

var LOOP_ANIMS = { idle:1, walk:1, run:1, block:1, knockdown:1 }

function eio(t) {
  if (t < 0.5) return 4*t*t*t
  return (t-1)*(2*t-2)*(2*t-2)+1
}

function lerpPose(a, b, t) {
  var e = eio(t < 0 ? 0 : t > 1 ? 1 : t)
  var out = emptyPose()
  for (var i = 0; i < NJ; i++) {
    out[i] = { x: a[i].x + (b[i].x - a[i].x)*e, y: a[i].y + (b[i].y - a[i].y)*e }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────
//  BOSSES
// ─────────────────────────────────────────────────────────────────
var BOSSES = [
  {name:'GRUNT',      hp:80, spd:118,color:'#151515',glow:'#404040',weapon:'none',      style:'brawler',  bg:'dojo',  diff:0.28,sfx:0,music:0,intro:'A rookie thug. Warm-up time.'},
  {name:'BLADE',      hp:105,spd:130,color:'#08082a',glow:'#3355FF',weapon:'sword',     style:'swordsman',bg:'dojo',  diff:0.40,sfx:0,music:0,intro:'Cold steel. Colder eyes.'},
  {name:'STRIKER',    hp:115,spd:182,color:'#1e0000',glow:'#FF1100',weapon:'none',      style:'speedster',bg:'city',  diff:0.52,sfx:0,music:1,intro:"He's already moving. Keep up."},
  {name:'STAFF MONK', hp:132,spd:128,color:'#0b0018',glow:'#9933FF',weapon:'staff',     style:'mage',     bg:'city',  diff:0.60,sfx:1,music:1,intro:'Ancient power. Respect it.'},
  {name:'CHAIN',      hp:144,spd:155,color:'#181200',glow:'#FFAA00',weapon:'nunchucks', style:'trickster',bg:'forest',diff:0.68,sfx:1,music:2,intro:'Unpredictable. Vicious.'},
  {name:'PHANTOM',    hp:160,spd:192,color:'#002000',glow:'#00FF55',weapon:'none',      style:'speedster',bg:'forest',diff:0.74,sfx:1,music:2,intro:"You can't hit what you can't see."},
  {name:'WARLORD',    hp:180,spd:140,color:'#1a0700',glow:'#FF6600',weapon:'sword',     style:'brawler',  bg:'shadow',diff:0.80,sfx:2,music:3,intro:'A hundred men fell. You are next.'},
  {name:'SHADOW MONK',hp:196,spd:148,color:'#0c0013',glow:'#FF00BB',weapon:'staff',     style:'mage',     bg:'shadow',diff:0.86,sfx:2,music:3,intro:'Between worlds. Between life and nothing.'},
  {name:'DEATH CHAIN',hp:218,spd:164,color:'#130000',glow:'#FF0000',weapon:'nunchucks', style:'master',   bg:'shadow',diff:0.92,sfx:2,music:3,intro:'Last sound you hear is chains.'},
  {name:'SHADOW KING',hp:270,spd:170,color:'#040004',glow:'#AA00FF',weapon:'sword',     style:'master',   bg:'shadow',diff:1.00,sfx:2,music:3,intro:'I am the darkness itself.'},
]

// ─────────────────────────────────────────────────────────────────
//  FIGHTER FACTORY
// ─────────────────────────────────────────────────────────────────
function newFighter(isPlayer, bossIdx) {
  var b = BOSSES[bossIdx] || BOSSES[0]
  return {
    x: isPlayer ? 100 : 375, y: FLOOR,
    vy: 0, vx: 0,
    onGround: true,
    facingRight: !!isPlayer,
    hp: isPlayer ? 100 : b.hp,
    maxHp: isPlayer ? 100 : b.hp,
    animName: 'idle', animIdx: 0, animT: 0,
    pose: POSES.idle.slice(),
    locked: false,
    hitActive: false, hitConnected: false,
    action: 'idle',
    blocking: false,
    stunTimer: 0, invTimer: 0,
    comboCnt: 0, comboTimer: 0,
    color: isPlayer ? '#0a0a0a' : b.color,
    glowColor: isPlayer ? '#1E90FF' : b.glow,
    hitFlash: 0,
    weapon: isPlayer ? 'none' : b.weapon,
    isPlayer: !!isPlayer,
    bossIdx: bossIdx || 0,
    diff: isPlayer ? 0 : b.diff,
    style: isPlayer ? 'player' : b.style,
    speed: isPlayer ? 170 : b.spd,
    aiTimer: 0, aiDir: 0,
  }
}

// ─────────────────────────────────────────────────────────────────
//  ANIMATION ENGINE
// ─────────────────────────────────────────────────────────────────
function setAnim(f, name) {
  var seq = ANIMS[name]
  if (!seq) return
  if (f.animName === name && LOOP_ANIMS[name]) return
  f.animName = name; f.animIdx = 0; f.animT = 0
  f.locked = !LOOP_ANIMS[name]
  f.hitActive = false
}

function tickAnim(f, dt) {
  var seq = ANIMS[f.animName]
  if (!seq) return
  var frame = seq[f.animIdx]
  if (!frame) return
  f.animT += dt
  var t = f.animT / frame.d
  if (t > 1) t = 1
  var pA = POSES[frame.f] || POSES.idle
  var pB = POSES[frame.t] || POSES.idle
  f.pose = lerpPose(pA, pB, t)
  f.hitActive = !!(frame.hit && !f.hitConnected && t > 0.35 && t < 0.9)
  if (f.animT >= frame.d) {
    f.animT -= frame.d
    f.animIdx++
    if (f.animIdx >= seq.length) {
      if (LOOP_ANIMS[f.animName]) { f.animIdx = 0 }
      else { f.animIdx = seq.length - 1; f.locked = false; f.hitActive = false; setAnim(f, 'idle') }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  COMBAT
// ─────────────────────────────────────────────────────────────────
var DMG   = {punch_R:9,punch_L:10,kick_R:15,kick_L:14,uppercut:22,special:40}
var STUN  = {punch_R:0.22,punch_L:0.22,kick_R:0.34,kick_L:0.34,uppercut:0.58,special:0.95}
var RANGE = {punch_R:84,punch_L:84,kick_R:102,kick_L:102,uppercut:78,special:120}
var PUSHV = {uppercut:420,special:300}

function doAction(f, name, sfx) {
  if ((f.locked && name !== 'block') || f.stunTimer > 0) return false
  f.action = name; f.hitConnected = false
  setAnim(f, name)
  if (!sfx) return true
  if (name === 'punch_R' || name === 'punch_L') sfx.punch()
  else if (name === 'kick_R' || name === 'kick_L') sfx.kick()
  else if (name === 'uppercut') { sfx.whoosh(); setTimeout(function() { sfx.punch() }, 60) }
  else if (name === 'special') sfx.special()
  return true
}

function doJump(f, sfx) {
  if (!f.onGround) return
  f.vy = -540; f.onGround = false
  setAnim(f, 'jump')
  if (sfx) sfx.whoosh()
}

// AI move pools
var AI_POOLS = {
  brawler:   ['punch_R','punch_R','kick_R','uppercut','punch_L'],
  speedster: ['punch_R','punch_L','punch_R','punch_L','kick_R','kick_L'],
  mage:      ['kick_R','uppercut','special','punch_R'],
  trickster: ['kick_L','kick_R','punch_R','punch_L','kick_R'],
  swordsman: ['punch_R','kick_R','uppercut','punch_R'],
  master:    ['punch_R','punch_L','kick_R','uppercut','special','kick_L','punch_R'],
}

function aiTick(e, p, dt, sfx) {
  e.aiTimer -= dt
  if (e.aiTimer > 0) return
  if (e.stunTimer > 0 || e.locked) return
  var dist = Math.abs(e.x - p.x)
  var eff = e.diff < 1 ? e.diff : 1
  if (p.hitActive && dist < 110 && Math.random() < eff * 0.55) {
    doAction(e, 'block', null); e.aiTimer = 0.3; return
  }
  if (dist > 110) {
    e.aiDir = e.x > p.x ? -1 : 1; e.aiTimer = 0.05
  } else if (dist < 52 && Math.random() < 0.35) {
    e.aiDir = e.x > p.x ? 1 : -1; e.aiTimer = 0.12
  } else {
    e.aiDir = 0
    if (Math.random() < eff && dist < 115) {
      var pool = AI_POOLS[e.style] || AI_POOLS.brawler
      var act = pool[Math.floor(Math.random() * pool.length)]
      doAction(e, act, sfx)
      e.aiTimer = 0.2 + Math.random() * (0.45 - eff * 0.2)
    } else {
      if (dist > 160 && Math.random() < 0.15 * eff) doJump(e, sfx)
      e.aiTimer = 0.07
    }
  }
}

function resolveHits(atk, def, pts, sfx) {
  if (!atk.hitActive || atk.hitConnected) return null
  var dist = Math.abs(atk.x - def.x)
  var wpnBonus = atk.weapon === 'sword' ? 22 : atk.weapon === 'staff' ? 14 : 0
  var rng = (RANGE[atk.action] || 86) + wpnBonus
  if (dist > rng) return null
  var facing = atk.facingRight ? atk.x < def.x : atk.x > def.x
  if (!facing) return null
  atk.hitConnected = true; atk.hitActive = false

  if (def.blocking && atk.action !== 'special') {
    if (sfx) sfx.block()
    spawnHit(pts, (atk.x+def.x)/2, def.y-58, '#FFD700', 8, 2)
    return 'block'
  }
  if (def.invTimer > 0) return null

  var wpDmg = atk.weapon === 'sword' ? 10 : atk.weapon === 'staff' ? 6 : atk.weapon === 'nunchucks' ? 5 : 0
  var comboDmg = atk.comboCnt * 2; if (comboDmg > 12) comboDmg = 12
  var dmg = Math.round((DMG[atk.action] || 9) + wpDmg + comboDmg)

  def.hp -= dmg; if (def.hp < 0) def.hp = 0
  def.stunTimer = STUN[atk.action] || 0.24
  def.hitFlash = 1; def.invTimer = 0.14

  var dir = atk.x < def.x ? 1 : -1
  def.vx = dir * 65 * 5
  var pv = PUSHV[atk.action]
  if (pv) { def.vy = -pv; def.onGround = false }

  setAnim(def, def.stunTimer > 0.5 ? 'knockdown' : 'hurt')
  if (sfx) { sfx.hurt(); if (atk.weapon !== 'none') sfx.metal() }

  var hx = (atk.x + def.x) / 2, hy = def.y - 55
  if (atk.action === 'special') spawnSpecial(pts, hx, hy, atk.glowColor)
  else { spawnHit(pts, hx, hy, '#FF3300', 16, 4.5); spawnBlood(pts, hx, hy - 10) }
  if (atk.weapon !== 'none') spawnHit(pts, hx, hy, atk.glowColor, 7, 3)

  atk.comboCnt++; atk.comboTimer = 1.8
  return dmg
}

// ─────────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────────
function spawnHit(pts, x, y, col, n, spd) {
  for (var i = 0; i < n; i++) {
    var a = Math.PI * 2 * i / n + Math.random() * 0.8 - 0.4
    var s = spd * (0.4 + Math.random() * 0.8)
    pts.push({ x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-1.5, col:col, life:1, d:0.046+Math.random()*0.04, sz:2+Math.random()*3.5 })
  }
}
function spawnSpecial(pts, x, y, col) {
  for (var i = 0; i < 50; i++) {
    var a = Math.PI * 2 * i / 50, s = 4 + Math.random() * 9
    pts.push({ x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-3, col:col, life:1, d:0.018+Math.random()*0.02, sz:3+Math.random()*6 })
  }
}
function spawnBlood(pts, x, y) {
  for (var i = 0; i < 8; i++) {
    var a = -Math.PI / 2 + (-0.8 + Math.random() * 1.6)
    pts.push({ x:x, y:y, vx:Math.cos(a)*(1+Math.random()*3), vy:Math.sin(a)*(2+Math.random()*5)-2, col:'#cc0000', life:1, d:0.032+Math.random()*0.025, sz:2+Math.random()*2.5 })
  }
}
function spawnDust(pts, x, y) {
  for (var i = 0; i < 6; i++) {
    pts.push({ x:x+Math.random()*20-10, y:y, vx:(Math.random()-0.5)*2, vy:-Math.random()*2.5, col:'rgba(200,180,140,0.5)', life:1, d:0.04+Math.random()*0.03, sz:4+Math.random()*6 })
  }
}
function tickParticles(pts, dt) {
  for (var i = pts.length - 1; i >= 0; i--) {
    var p = pts[i]
    p.x += p.vx; p.y += p.vy
    p.vx *= 0.88; p.vy *= 0.88; p.vy += 0.25
    p.life -= p.d
    if (p.life <= 0) pts.splice(i, 1)
  }
}
function drawParticles(ctx, pts) {
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i]
    ctx.save()
    ctx.globalAlpha = p.life * 0.88
    ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 8
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
    var wg = ctx.createLinearGradient(0,0,0,FLOOR)
    wg.addColorStop(0,'#180800'); wg.addColorStop(1,'#251000')
    ctx.fillStyle = wg; ctx.fillRect(0,0,CW,FLOOR)
    ctx.strokeStyle = '#2e1500'; ctx.lineWidth = 1
    for (var y2 = 30; y2 < FLOOR; y2 += 55) { ctx.beginPath(); ctx.moveTo(0,y2); ctx.lineTo(CW,y2); ctx.stroke() }
    for (var x2 = 0; x2 < CW; x2 += 78) { ctx.beginPath(); ctx.moveTo(x2,0); ctx.lineTo(x2,FLOOR); ctx.stroke() }
    // Pillars
    var pil = function(px) {
      ctx.fillStyle = '#120600'; ctx.fillRect(px,0,26,FLOOR)
      ctx.fillStyle = '#1e0c00'; ctx.fillRect(px+2,0,6,FLOOR); ctx.fillRect(px+18,0,6,FLOOR)
    }
    pil(0); pil(CW-26)
    // Lanterns (animated)
    var lan = function(lx, ly) {
      var fl = 0.9 + Math.sin(t*7.3+lx)*0.06
      ctx.save()
      ctx.globalAlpha = (0.08 + Math.sin(t*1.5+lx)*0.015) * fl
      var rg = ctx.createRadialGradient(lx,ly,0,lx,ly,110)
      rg.addColorStop(0,'#FF7700'); rg.addColorStop(1,'transparent')
      ctx.fillStyle = rg; ctx.fillRect(lx-110,ly-100,220,220)
      ctx.restore()
      ctx.save(); ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 18 * fl
      ctx.fillStyle = '#8B1A00'; ctx.fillRect(lx-10,ly,20,18)
      ctx.fillStyle = '#FF4400'; ctx.fillRect(lx-2,ly+2,4,14); ctx.fillRect(lx-2,ly+2,14,4)
      ctx.restore()
    }
    lan(34,32); lan(CW-34,32); lan(CW/2,18)
    var fg = ctx.createLinearGradient(0,FLOOR,0,CH)
    fg.addColorStop(0,'#2e1600'); fg.addColorStop(1,'#140a00')
    ctx.fillStyle = fg; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1
    for (var x3 = 0; x3 < CW; x3 += 48) { ctx.beginPath(); ctx.moveTo(x3,FLOOR); ctx.lineTo(x3+24,CH); ctx.stroke() }
    ctx.fillStyle = '#3d1c00'; ctx.fillRect(0,FLOOR,CW,3)

  } else if (bg === 'city') {
    var sk = ctx.createLinearGradient(0,0,0,FLOOR)
    sk.addColorStop(0,'#010008'); sk.addColorStop(1,'#08001e')
    ctx.fillStyle = sk; ctx.fillRect(0,0,CW,FLOOR)
    var bdata = [[0,145,55],[50,110,40],[96,158,50],[150,80,44],[198,132,54],[258,92,40],[302,152,48],[354,72,42],[398,122,46],[444,95,38]]
    for (var bi = 0; bi < bdata.length; bi++) {
      var bx=bdata[bi][0], bh=bdata[bi][1], bw=bdata[bi][2]
      ctx.fillStyle = '#05001a'; ctx.fillRect(bx,FLOOR-bh,bw,bh)
      for (var wy = FLOOR-bh+8; wy < FLOOR-8; wy += 14) {
        for (var wx = bx+4; wx < bx+bw-4; wx += 9) {
          if ((wx^wy^bx)%5 < 3) {
            var fl2 = Math.sin(t*0.5+wx*0.3+wy*0.2)
            if (fl2 > -0.3) {
              ctx.globalAlpha = 0.4 + fl2*0.2
              ctx.fillStyle = (wx*wy)%7===0 ? '#00CCFF' : '#FFD700'
              ctx.fillRect(wx,wy,4,6); ctx.globalAlpha = 1
            }
          }
        }
      }
    }
    // Neon signs
    var neon = function(nx, ny, col, len) {
      ctx.save(); ctx.globalAlpha = 0.7 + Math.sin(t)*0.3
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(nx+len,ny); ctx.stroke(); ctx.restore()
    }
    neon(54,FLOOR-38,'#FF00FF',30); neon(158,FLOOR-54,'#00FFFF',40); neon(278,FLOOR-32,'#FF2200',30); neon(370,FLOOR-46,'#FFAA00',28)
    // Rain
    ctx.save(); ctx.strokeStyle = 'rgba(140,180,255,0.07)'; ctx.lineWidth = 0.6
    for (var ri = 0; ri < 55; ri++) {
      var rx = (ri*53+t*150)%CW, ry2 = (t*220+ri*61)%CH
      ctx.beginPath(); ctx.moveTo(rx,ry2); ctx.lineTo(rx+1.5,ry2+10); ctx.stroke()
    }
    ctx.restore()
    ctx.fillStyle = '#04000f'; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)

  } else if (bg === 'forest') {
    ctx.fillStyle = '#000e00'; ctx.fillRect(0,0,CW,CH)
    ctx.save(); ctx.shadowColor = '#DDFFD0'; ctx.shadowBlur = 38
    ctx.fillStyle = '#EEFFD8'; ctx.beginPath(); ctx.arc(382,48,20,0,Math.PI*2); ctx.fill(); ctx.restore()
    var doTree = function(tx, th, tw, al) {
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = '#001600'
      ctx.fillRect(tx-tw/10,FLOOR-th,tw/5,th)
      ctx.beginPath(); ctx.moveTo(tx,FLOOR-th-tw*0.65); ctx.lineTo(tx-tw/2,FLOOR-th+tw*0.18); ctx.lineTo(tx+tw/2,FLOOR-th+tw*0.18); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(tx,FLOOR-th-tw*0.98); ctx.lineTo(tx-tw/3,FLOOR-th-tw*0.14); ctx.lineTo(tx+tw/3,FLOOR-th-tw*0.14); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    for (var ti = 0; ti < 8; ti++) doTree(ti*68+34, 65, 52, 0.33)
    for (var ti = 0; ti < 6; ti++) doTree(ti*88+18, 105, 68, 0.58)
    for (var ti = 0; ti < 4; ti++) doTree(ti*138+12, 148, 88, 0.82)
    for (var fi = 0; fi < 24; fi++) {
      var fx = (fi*91+t*14)%CW, fy = FLOOR-18-(fi*51)%100
      var glow = 0.25 + Math.sin(t*2.4+fi*1.1)*0.5
      ctx.save(); ctx.globalAlpha = glow > 0 ? glow : 0
      ctx.fillStyle = '#88FF44'; ctx.shadowColor = '#88FF44'; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(fx,fy,1.8,0,Math.PI*2); ctx.fill(); ctx.restore()
    }
    var flf = ctx.createLinearGradient(0,FLOOR,0,CH)
    flf.addColorStop(0,'#001e00'); flf.addColorStop(1,'#000a00')
    ctx.fillStyle = flf; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)

  } else {
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,CW,CH)
    for (var vi = 0; vi < 8; vi++) {
      var ox = 60+vi*52, oy = 20+Math.sin(t*0.6+vi*0.8)*35
      ctx.save(); ctx.globalAlpha = 0.08+Math.sin(t*0.8+vi)*0.04
      var vg = ctx.createRadialGradient(ox,oy,0,ox,oy,60)
      vg.addColorStop(0,'#9900FF'); vg.addColorStop(1,'transparent')
      ctx.fillStyle = vg; ctx.fillRect(ox-62,oy-62,124,124); ctx.restore()
    }
    ctx.save(); ctx.strokeStyle = '#7700CC'; ctx.lineWidth = 2; ctx.shadowColor = '#AA00FF'; ctx.shadowBlur = 10
    var cracks = [[70,FLOOR,105,FLOOR-10],[190,FLOOR,225,FLOOR-14],[305,FLOOR,340,FLOOR-9],[400,FLOOR,445,FLOOR-12]]
    for (var ci = 0; ci < cracks.length; ci++) {
      ctx.beginPath(); ctx.moveTo(cracks[ci][0],cracks[ci][1]); ctx.lineTo(cracks[ci][2],cracks[ci][3]); ctx.stroke()
    }
    ctx.restore()
    var sf = ctx.createLinearGradient(0,FLOOR,0,CH)
    sf.addColorStop(0,'#0e001e'); sf.addColorStop(1,'#000')
    ctx.fillStyle = sf; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.lineTo(CW,FLOOR); ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────
//  FIGHTER RENDERER
// ─────────────────────────────────────────────────────────────────
function drawFighter(ctx, f, time) {
  var pose = f.pose
  var rx = f.x, ry = f.y
  var sx = function(j) { return rx + (f.facingRight ? pose[j].x : -pose[j].x) }
  var sy = function(j) { return ry - pose[j].y }

  ctx.save()
  // Ground shadow
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#000'
  var sw = f.onGround ? 22 : Math.max(7, 22*(1-(FLOOR-f.y)/200))
  ctx.beginPath(); ctx.ellipse(rx, FLOOR+6, sw, 4.5, 0, 0, Math.PI*2); ctx.fill()
  ctx.globalAlpha = 1

  if (f.hitFlash > 0) {
    ctx.save(); ctx.globalAlpha = f.hitFlash * 0.6
    ctx.fillStyle = '#FF1100'; ctx.beginPath(); ctx.arc(sx(J.HEAD),sy(J.HEAD),19,0,Math.PI*2); ctx.fill()
    ctx.restore()
  }

  ctx.shadowColor = f.glowColor
  ctx.shadowBlur = f.blocking ? 18 : (f.animName === 'special' ? 34 : 7)
  ctx.strokeStyle = f.color; ctx.fillStyle = f.color
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'

  for (var bi = 0; bi < BONES.length; bi++) {
    var a = BONES[bi][0], b = BONES[bi][1], lw = BONES[bi][2]
    ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(sx(a),sy(a)); ctx.lineTo(sx(b),sy(b)); ctx.stroke()
  }

  ctx.beginPath(); ctx.arc(sx(J.HEAD),sy(J.HEAD),12.5,0,Math.PI*2); ctx.fill()

  // Eye
  ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = f.glowColor; ctx.globalAlpha = 0.9
  var eyeX = sx(J.HEAD) + (f.facingRight ? 4 : -4)
  ctx.beginPath(); ctx.arc(eyeX, sy(J.HEAD)-2, 2.5, 0, Math.PI*2); ctx.fill()
  ctx.restore()

  // Joint dots
  ctx.shadowBlur = 0; ctx.fillStyle = f.color
  var joints = [J.LE,J.RE,J.LK,J.RK,J.LS,J.RS]
  for (var ji = 0; ji < joints.length; ji++) {
    ctx.beginPath(); ctx.arc(sx(joints[ji]),sy(joints[ji]),3,0,Math.PI*2); ctx.fill()
  }

  // Block aura
  if (f.blocking) {
    ctx.save(); ctx.globalAlpha = 0.22+Math.sin(time*6)*0.08
    ctx.fillStyle = f.glowColor; ctx.shadowColor = f.glowColor; ctx.shadowBlur = 20
    var bx2 = sx(J.CHEST) + 6*(f.facingRight?1:-1)
    ctx.beginPath(); ctx.ellipse(bx2, sy(J.CHEST), 22, 28, 0, 0, Math.PI*2); ctx.fill()
    ctx.restore()
  }

  if (f.weapon && f.weapon !== 'none') drawWeapon(ctx, f, sx, sy, time)
  ctx.restore()
}

function drawWeapon(ctx, f, sx, sy, time) {
  var hx=sx(J.RH), hy=sy(J.RH), ex=sx(J.RE), ey=sy(J.RE)
  var ang = Math.atan2(hy-ey, hx-ex)
  ctx.save(); ctx.translate(hx,hy); ctx.rotate(ang); ctx.lineCap = 'round'
  if (f.weapon === 'sword') {
    ctx.shadowColor = '#6699FF'; ctx.shadowBlur = 16
    ctx.strokeStyle = '#C8E8FF'; ctx.lineWidth = 2.8
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(46,0); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(4,-1.8); ctx.lineTo(44,-1.8); ctx.stroke()
    ctx.strokeStyle = '#8899AA'; ctx.lineWidth = 4.5
    ctx.beginPath(); ctx.moveTo(8,-9); ctx.lineTo(8,9); ctx.stroke()
    ctx.strokeStyle = '#4A2515'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-14,0); ctx.stroke()
  } else if (f.weapon === 'staff') {
    ctx.shadowColor = '#BB44FF'; ctx.shadowBlur = 16
    ctx.strokeStyle = '#7A3D0A'; ctx.lineWidth = 4.5
    ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(56,0); ctx.stroke()
    var puls = Math.sin(time*4)*1.5
    ctx.fillStyle = '#CC44FF'; ctx.shadowColor = '#EE88FF'; ctx.shadowBlur = 20+puls
    ctx.beginPath(); ctx.arc(58,0,7,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(-28,0,5.5,0,Math.PI*2); ctx.fill()
  } else if (f.weapon === 'nunchucks') {
    var swA = Math.sin(time*7)*1.4
    ctx.strokeStyle = '#3C200E'; ctx.lineWidth = 5; ctx.shadowColor = '#FF9900'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(20,0); ctx.stroke()
    var c2x = 20+Math.cos(swA)*14, c2y = Math.sin(swA)*14
    ctx.strokeStyle = 'rgba(180,180,180,0.8)'; ctx.lineWidth = 2
    ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(c2x,c2y); ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = '#3C200E'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(c2x,c2y); ctx.lineTo(c2x+Math.cos(swA+0.5)*20,c2y+Math.sin(swA+0.5)*20); ctx.stroke()
  }
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function StickmanFighter(props) {
  var canvasRef = useRef(null)
  var gRef      = useRef(null)
  var rafRef    = useRef(null)
  var lastRef   = useRef(null)
  var keysRef   = useRef({})

  var initUi = {
    screen: 'menu', weapon: 'none', difficulty: 'fighter',
    bossIdx: 0, mode: 'story', survivalRound: 1, score: 0,
    combo: 0, message: '', playerHp: 100, enemyHp: 100, maxEnemyHp: 100,
  }
  var uiState = useState(initUi)
  var ui = uiState[0], setUi = uiState[1]
  var uiRef = useRef(ui); uiRef.current = ui

  function startFight(mode, bossIdx) {
    var idx = bossIdx || 0
    var boss = BOSSES[idx]
    var u = uiRef.current
    var diffMap = {rookie:0.48,fighter:0.68,champion:0.86,legend:1.0,master:1.20}
    var diffMult = diffMap[u.difficulty] || 0.68

    var player = newFighter(true, idx)
    player.weapon = u.weapon
    var enemy = newFighter(false, idx)
    enemy.diff = boss.diff * diffMult
    enemy.speed = boss.spd

    gRef.current = {
      player: player, enemy: enemy,
      particles: [], time: 0,
      phase: 'fight', koTimer: 0,
      bgType: boss.bg, shake: 0,
      diffMult: diffMult,
      sfx: SOUNDS[boss.sfx] || SOUNDS[0],
    }

    startBGMusic(boss.music || 0)

    setUi(function(p) { return Object.assign({}, p, {
      screen:'fight', bossIdx:idx, mode:mode,
      playerHp:100, enemyHp:boss.hp, maxEnemyHp:boss.hp,
      combo:0, message:boss.intro,
    }) })
    setTimeout(function() { setUi(function(p) { return Object.assign({}, p, {message:''}) }) }, 2800)
  }

  useEffect(function() {
    lastRef.current = performance.now()

    function loop(now) {
      var rawDt = (now - (lastRef.current || now)) / 1000
      lastRef.current = now
      var dt = rawDt > 0.05 ? 0.05 : rawDt
      if (uiRef.current.screen === 'fight') { update(dt); renderFrame() }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    function onKey(e) {
      var down = e.type === 'keydown'
      keysRef.current[e.code] = down
      if (down) handleKey(e.code)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey, false)
    window.addEventListener('keyup', onKey, false)

    return function() {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      stopBGMusic()
    }
  }, [])

  function handleKey(code) {
    var g = gRef.current; if (!g || g.phase !== 'fight') return
    var p = g.player, sfx = g.sfx
    if (code==='KeyZ'||code==='KeyJ') doAction(p,'punch_R',sfx)
    if (code==='KeyX'||code==='KeyK') doAction(p,'punch_L',sfx)
    if (code==='KeyC'||code==='KeyL') doAction(p,'kick_R',sfx)
    if (code==='KeyV')                doAction(p,'uppercut',sfx)
    if (code==='KeyB')                doAction(p,'special',sfx)
    if (code==='ArrowUp'||code==='KeyW') { if(p.onGround) doJump(p,sfx) }
  }

  function update(dt) {
    var g = gRef.current; if (!g) return
    g.time += dt
    if (g.shake > 0) { g.shake -= dt*4; if(g.shake<0) g.shake=0 }
    if (g.phase === 'ko') { g.koTimer -= dt; if(g.koTimer<=0) resolveKO(); return }

    var p = g.player, e = g.enemy, K = keysRef.current

    // Player movement
    if (!p.locked && p.stunTimer <= 0) {
      var dx = (K['ArrowRight']||K['KeyD']?1:0) - (K['ArrowLeft']||K['KeyA']?1:0)
      var blk = !!(K['ArrowDown']||K['KeyS'])
      p.blocking = blk && p.onGround
      if (p.blocking) {
        if (!p.locked) setAnim(p, 'block')
      } else if (dx !== 0) {
        var spd = K['Shift'] ? 220 : 170
        p.vx = dx * spd; p.facingRight = dx > 0
        if (p.onGround) setAnim(p, Math.abs(p.vx) > 185 ? 'run' : 'walk')
      } else {
        p.vx *= 0.5
        if (p.onGround && !p.locked) setAnim(p, 'idle')
      }
    } else { p.vx *= 0.62; p.blocking = false }

    // AI
    e.facingRight = e.x < p.x
    aiTick(e, p, dt, g.sfx)
    if (!e.locked && e.stunTimer <= 0) {
      e.vx = e.aiDir * e.speed
      if (e.aiDir !== 0 && e.onGround) setAnim(e, 'walk')
      else if (e.onGround && !e.locked) setAnim(e, 'idle')
    } else { e.vx *= 0.62 }

    // Physics
    var fighters = [p, e]
    for (var fi = 0; fi < fighters.length; fi++) {
      var f = fighters[fi]
      if (f.stunTimer > 0) {
        f.stunTimer -= dt
        if (f.stunTimer <= 0 && f.animName === 'knockdown') setAnim(f, 'getup')
      }
      if (f.hitFlash > 0) f.hitFlash -= dt * 4
      if (f.invTimer > 0) f.invTimer -= dt
      if (f.comboTimer > 0) {
        f.comboTimer -= dt
        if (f.comboTimer <= 0) {
          f.comboCnt = 0
          if (f.isPlayer) setUi(function(u2) { return Object.assign({},u2,{combo:0}) })
        }
      }
      if (!f.onGround) {
        f.vy += 1900*dt; f.y += f.vy*dt
        if (f.y >= FLOOR) {
          var vel = Math.abs(f.vy)
          f.y = FLOOR; f.vy = 0; f.onGround = true
          g.sfx.land()
          if (vel > 300) spawnDust(g.particles, f.x, FLOOR)
          if (!f.locked) setAnim(f, 'idle')
        }
      }
      f.x += f.vx * dt
      if (f.x < 30) f.x = 30
      if (f.x > CW-30) f.x = CW-30
      tickAnim(f, dt)
      if (!f.locked && f.onGround && f.isPlayer) {
        if (!(K['ArrowLeft']||K['KeyA']||K['ArrowRight']||K['KeyD'])) p.facingRight = p.x < e.x
      }
    }

    var h1 = resolveHits(p, e, g.particles, g.sfx)
    var h2 = resolveHits(e, p, g.particles, g.sfx)
    if (h1 && h1 !== 'block') g.shake = h1 > 20 ? 0.35 : 0.15
    if (h2 && h2 !== 'block') g.shake = h2 > 20 ? 0.28 : 0.12

    tickParticles(g.particles, dt)

    if ((p.hp <= 0 || e.hp <= 0) && g.phase === 'fight') {
      g.phase = 'ko'; g.koTimer = 2.5
      var pWin = p.hp > 0
      if (pWin) { setAnim(e,'knockdown'); setAnim(p,'victory'); g.sfx.ko(); g.sfx.victory(); setUi(function(u2){return Object.assign({},u2,{message:'KO — YOU WIN!'})}) }
      else       { setAnim(p,'knockdown'); g.sfx.ko(); setUi(function(u2){return Object.assign({},u2,{message:'KO — YOU LOSE'})}) }
    }

    var ph = p.hp < 0 ? 0 : Math.round(p.hp)
    var eh = e.hp < 0 ? 0 : Math.round(e.hp)
    setUi(function(prev) { return Object.assign({},prev,{playerHp:ph,enemyHp:eh,combo:p.comboCnt}) })
  }

  function resolveKO() {
    var g = gRef.current; if(!g) return
    var u = uiRef.current
    var pWin = g.player.hp >= g.enemy.hp
    if (u.mode === 'story') {
      if (pWin) {
        var next = u.bossIdx + 1
        if (next >= BOSSES.length) { stopBGMusic(); setUi(function(p){return Object.assign({},p,{screen:'victory'})}) }
        else setTimeout(function(){startFight('story',next)}, 1200)
      } else { stopBGMusic(); setUi(function(p){return Object.assign({},p,{screen:'gameover'})}) }
    } else {
      if (pWin) {
        var nr = u.survivalRound + 1
        var ns = u.score + Math.round(140 * nr * 0.65)
        setUi(function(p){return Object.assign({},p,{survivalRound:nr,score:ns})})
        setTimeout(function(){startFight('survival',(nr-1)%BOSSES.length)},1200)
      } else { stopBGMusic(); setUi(function(p){return Object.assign({},p,{screen:'gameover'})}) }
    }
  }

  function renderFrame() {
    var canvas = canvasRef.current; if(!canvas) return
    var ctx = canvas.getContext('2d')
    var g = gRef.current; if(!g) return
    ctx.save()
    if (g.shake > 0) { var s=g.shake*8; ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s) }
    drawBG(ctx, g.bgType, g.time)
    var dist = Math.abs(g.player.x - g.enemy.x)
    if (dist < 70) { ctx.save(); ctx.globalAlpha=(1-dist/70)*0.08; ctx.fillStyle='#FF0000'; ctx.fillRect(0,0,CW,CH); ctx.restore() }
    if (g.player.x < g.enemy.x) { drawFighter(ctx,g.player,g.time); drawFighter(ctx,g.enemy,g.time) }
    else { drawFighter(ctx,g.enemy,g.time); drawFighter(ctx,g.player,g.time) }
    drawParticles(ctx, g.particles)
    ctx.restore()
  }

  // Touch helpers
  function tbAttack(act) { var g=gRef.current; if(g) doAction(g.player,act,g.sfx) }
  function tbJump()      { var g=gRef.current; if(g&&g.player.onGround) doJump(g.player,g.sfx) }
  function tbBlock(down) {
    keysRef.current['ArrowDown'] = down
    var g = gRef.current; if(!g) return
    g.player.blocking = down
    if (down && !g.player.locked) setAnim(g.player,'block')
    else if (!down) setAnim(g.player,'idle')
  }
  function tbMove(dir, down) {
    keysRef.current['ArrowLeft']  = dir==='L' && down
    keysRef.current['ArrowRight'] = dir==='R' && down
  }

  var u = ui
  var boss = BOSSES[u.bossIdx] || BOSSES[0]
  var pPct = u.playerHp
  var ePct = u.maxEnemyHp > 0 ? Math.max(0, u.enemyHp/u.maxEnemyHp*100) : 0

  // ── MENU ──────────────────────────────────────────────────────────
  if (u.screen === 'menu') {
    return (
      <div style={{background:'#030008',borderRadius:16,overflow:'hidden',fontFamily:'Courier New,monospace',color:'#EEE',userSelect:'none'}}>
        <div style={{padding:'28px 18px 22px',textAlign:'center',background:'linear-gradient(180deg,#0a0015,#030008)',borderBottom:'1px solid #1a0033'}}>
          <div style={{fontSize:50,marginBottom:8}}>⚔️</div>
          <h1 style={{fontSize:26,fontWeight:900,letterSpacing:6,color:'#E0D0FF',textShadow:'0 0 20px #9900FF',margin:'0 0 2px'}}>SHADOW FIGHT</h1>
          <p style={{color:'#330055',fontSize:9,letterSpacing:4,margin:'0 0 24px'}}>STICKMAN EDITION</p>

          <p style={{color:'#442266',fontSize:9,letterSpacing:2,marginBottom:8}}>WEAPON</p>
          <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:18,flexWrap:'wrap'}}>
            {[['none','👊','Fists'],['sword','🗡','Sword'],['staff','🪄','Staff'],['nunchucks','🔗','Chains']].map(function(item) {
              var w=item[0],ic=item[1],lb=item[2]
              return (
                <button key={w} onClick={function(){setUi(function(p){return Object.assign({},p,{weapon:w})})}}
                  style={{padding:'8px 11px',borderRadius:10,border:'2px solid '+(u.weapon===w?'#9900FF':'#1e0033'),background:u.weapon===w?'rgba(153,0,255,0.18)':'rgba(10,0,20,0.8)',color:u.weapon===w?'#CC88FF':'#442255',fontWeight:700,fontSize:10,cursor:'pointer',minWidth:68}}>
                  <div style={{fontSize:18,marginBottom:2}}>{ic}</div>{lb}
                </button>
              )
            })}
          </div>

          <p style={{color:'#442266',fontSize:9,letterSpacing:2,marginBottom:8}}>DIFFICULTY</p>
          <div style={{display:'flex',gap:5,justifyContent:'center',marginBottom:24}}>
            {[['rookie','🟢'],['fighter','🟡'],['champion','🟠'],['legend','🔴'],['master','💀']].map(function(item) {
              var d=item[0],ic=item[1]
              return (
                <button key={d} onClick={function(){setUi(function(p){return Object.assign({},p,{difficulty:d})})}}
                  style={{padding:'5px 9px',borderRadius:7,border:'1px solid '+(u.difficulty===d?'#FF4400':'#1e0033'),background:u.difficulty===d?'rgba(255,68,0,0.18)':'rgba(8,0,16,0.8)',color:u.difficulty===d?'#FF9977':'#331133',fontWeight:700,fontSize:9,cursor:'pointer',textTransform:'capitalize'}}>
                  {ic} {d}
                </button>
              )
            })}
          </div>

          <div style={{display:'flex',gap:12,justifyContent:'center',marginBottom:16}}>
            <button onClick={function(){startFight('story',0)}}
              style={{padding:'13px 28px',borderRadius:12,background:'linear-gradient(135deg,#3a0077,#9900FF)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer',letterSpacing:2,boxShadow:'0 4px 20px rgba(153,0,255,0.4)'}}>
              ⚔️ STORY
            </button>
            <button onClick={function(){setUi(function(p){return Object.assign({},p,{survivalRound:1,score:0})});startFight('survival',0)}}
              style={{padding:'13px 28px',borderRadius:12,background:'linear-gradient(135deg,#770000,#EE1100)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer',letterSpacing:2,boxShadow:'0 4px 20px rgba(220,0,0,0.4)'}}>
              💀 SURVIVAL
            </button>
          </div>
          <p style={{color:'#1a0033',fontSize:8,margin:0}}>Arrow keys: move/jump/block · Z=Punch · X=Jab · C=Kick · V=Uppercut · B=Special</p>
        </div>
      </div>
    )
  }

  if (u.screen === 'gameover' || u.screen === 'victory') {
    return (
      <div style={{background:'#030008',borderRadius:16,padding:'40px 22px',textAlign:'center',fontFamily:'Courier New,monospace',color:'#EEE',userSelect:'none'}}>
        <div style={{fontSize:64,marginBottom:14}}>{u.screen==='victory'?'🏆':'💀'}</div>
        <h2 style={{fontSize:24,fontWeight:900,color:u.screen==='victory'?'#FFD700':'#EF4444',letterSpacing:4,marginBottom:12}}>
          {u.screen==='victory'?'CHAMPION!':'DEFEATED'}
        </h2>
        {u.mode==='survival' && <p style={{color:'#AA55CC',fontSize:13,marginBottom:4}}>Survived {u.survivalRound} rounds · Score: {u.score}</p>}
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:20}}>
          <button onClick={function(){stopBGMusic();setUi(function(p){return Object.assign({},p,{screen:'menu'})})}}
            style={{padding:'11px 26px',borderRadius:11,background:'linear-gradient(135deg,#3a0077,#9900FF)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer'}}>
            ← MENU
          </button>
          {u.screen==='gameover' && (
            <button onClick={function(){startFight(u.mode,u.bossIdx)}}
              style={{padding:'11px 26px',borderRadius:11,background:'linear-gradient(135deg,#770000,#EE1100)',color:'white',fontWeight:900,fontSize:13,border:'none',cursor:'pointer'}}>
              RETRY ↺
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── FIGHT SCREEN ──────────────────────────────────────────────────
  var dpadRows = [
    [null, {l:'↑',pd:function(){tbJump()},pu:null}, null],
    [{l:'←',pd:function(){tbMove('L',true)},pu:function(){tbMove('L',false)}}, {l:'🥋',pd:null,pu:null}, {l:'→',pd:function(){tbMove('R',true)},pu:function(){tbMove('R',false)}}],
    [null, {l:'↓',pd:function(){tbBlock(true)},pu:function(){tbBlock(false)}}, null],
  ]
  var attackBtns = [
    ['PUNCH','punch_R','#FF4400'],['JAB','punch_L','#FF6600'],['KICK','kick_R','#CC0044'],
    ['UPPER','uppercut','#AA00AA'],['BLOCK','block','#0055EE'],['⭐ SPECIAL','special','#9900FF'],
  ]

  return (
    <div style={{background:'#030008',borderRadius:16,overflow:'hidden',fontFamily:'Courier New,monospace',userSelect:'none',touchAction:'none'}}>

      {/* HP BARS */}
      <div style={{background:'#07000e',padding:'8px 12px 6px',borderBottom:'1px solid #150026',display:'flex',alignItems:'center',gap:8}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{color:'#AACCFF',fontSize:9,fontWeight:800}}>YOU</span>
            <span style={{color:pPct>50?'#22c55e':pPct>25?'#f59e0b':'#ef4444',fontSize:9,fontWeight:700}}>{u.playerHp}</span>
          </div>
          <div style={{height:9,background:'#0c001a',borderRadius:5,border:'1px solid #220040',overflow:'hidden'}}>
            <div style={{height:'100%',width:pPct+'%',background:pPct>50?'linear-gradient(90deg,#16a34a,#4ade80)':pPct>25?'linear-gradient(90deg,#d97706,#fbbf24)':'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:5,transition:'width 0.12s'}}/>
          </div>
        </div>
        <div style={{textAlign:'center',minWidth:56}}>
          {u.combo > 1 && <div style={{color:'#FF5500',fontWeight:900,fontSize:15,lineHeight:1}}>{u.combo}✕</div>}
          <div style={{color:'#2d0044',fontSize:7,textTransform:'uppercase'}}>{boss.name}</div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{color:'#EF4444',fontSize:9,fontWeight:700}}>{u.enemyHp}</span>
            <span style={{color:'#FFAAAA',fontSize:9,fontWeight:800}}>{boss.name}</span>
          </div>
          <div style={{height:9,background:'#0c001a',borderRadius:5,border:'1px solid #220040',overflow:'hidden'}}>
            <div style={{height:'100%',width:ePct+'%',background:'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:5,transition:'width 0.12s',marginLeft:'auto'}}/>
          </div>
        </div>
      </div>

      {u.message && <div style={{background:'rgba(153,0,255,0.10)',borderBottom:'1px solid rgba(153,0,255,0.20)',padding:'5px 12px',textAlign:'center',color:'#CC88FF',fontSize:11,fontWeight:700}}>{u.message}</div>}

      <canvas ref={canvasRef} width={CW} height={CH} style={{width:'100%',display:'block'}}/>

      {/* CONTROLS */}
      <div style={{background:'#07000e',borderTop:'1px solid #150026',padding:'10px 10px 14px'}}>
        <div style={{display:'flex',gap:5,justifyContent:'center',alignItems:'flex-end'}}>

          {/* D-PAD */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,36px)',gridTemplateRows:'repeat(3,36px)',gap:3,flexShrink:0}}>
            {dpadRows.map(function(row, ri) {
              return row.map(function(c, ci) {
                var key = 'dp'+ri+ci
                if (!c) return <div key={key}/>
                if (c.l === '🥋') return <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{c.l}</div>
                return (
                  <button key={key}
                    onPointerDown={function(e){e.preventDefault(); if(c.pd) c.pd()}}
                    onPointerUp={function(e){e.preventDefault(); if(c.pu) c.pu()}}
                    onPointerLeave={function(e){e.preventDefault(); if(c.pu) c.pu()}}
                    style={{width:36,height:36,borderRadius:8,border:'1px solid #2a0044',background:'linear-gradient(135deg,#0e0020,#0a0018)',color:'#9966BB',fontWeight:900,fontSize:13,cursor:'pointer',WebkitTapHighlightColor:'transparent',touchAction:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {c.l}
                  </button>
                )
              })
            })}
          </div>

          {/* ATTACK BUTTONS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,flex:1,maxWidth:260}}>
            {attackBtns.map(function(item) {
              var lb=item[0],act=item[1],col=item[2]
              var isSpecial = lb === '⭐ SPECIAL'
              var isBlock = act === 'block'
              return (
                <button key={act}
                  onPointerDown={function(e){e.preventDefault(); isBlock ? tbBlock(true) : tbAttack(act)}}
                  onPointerUp={function(e){e.preventDefault(); if(isBlock) tbBlock(false)}}
                  onPointerLeave={function(e){e.preventDefault(); if(isBlock) tbBlock(false)}}
                  style={{padding:'8px 2px',borderRadius:9,border:'1px solid '+col+'44',background:'linear-gradient(135deg,'+col+'18,'+col+'08)',color:col,fontWeight:800,fontSize:9,cursor:'pointer',WebkitTapHighlightColor:'transparent',touchAction:'none',gridColumn:isSpecial?'span 3':'auto'}}>
                  {lb}
                </button>
              )
            })}
          </div>
        </div>
        {u.mode==='survival' && <p style={{color:'#3d0055',fontSize:9,textAlign:'center',marginTop:6}}>Score: {u.score} · Round {u.survivalRound}</p>}
      </div>
    </div>
  )
}
