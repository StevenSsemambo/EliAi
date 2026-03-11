import { useState, useEffect, useRef } from 'react'

// ── AUDIO ENGINE ──────────────────────────────────────────────────
const _ac = { ref: null }
function getAC() {
  if (!_ac.ref) try { _ac.ref = new (window.AudioContext || window.webkitAudioContext)() } catch {}
  if (_ac.ref?.state === 'suspended') _ac.ref.resume()
  return _ac.ref
}
function tone(freq, type, dur, vol = 0.2, delay = 0) {
  const a = getAC(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.connect(g); g.connect(a.destination)
  o.type = type; o.frequency.value = freq
  const t = a.currentTime + delay
  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.start(t); o.stop(t + dur + 0.05)
}
function noiseHit(vol = 0.4, dur = 0.08) {
  const a = getAC(); if (!a) return
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1)
  const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter()
  src.buffer = buf; f.type = 'lowpass'; f.frequency.value = 600
  src.connect(f); f.connect(g); g.connect(a.destination)
  const t = a.currentTime
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.start(t); src.stop(t + dur + 0.05)
}
function sndPunch()   { noiseHit(0.5, 0.06); tone(180, 'sawtooth', 0.08, 0.3, 0.02) }
function sndKick()    { noiseHit(0.6, 0.1);  tone(120, 'sawtooth', 0.12, 0.4, 0.02) }
function sndBlock()   { tone(800, 'square', 0.05, 0.3); tone(600, 'square', 0.04, 0.2, 0.03) }
function sndWhoosh()  { tone(400, 'sine', 0.12, 0.15); tone(200, 'sine', 0.1, 0.1, 0.05) }
function sndSpecial() { [200,300,500,800,1200].forEach((f,i) => tone(f,'sine',0.2,0.3,i*0.06)) }
function sndKO()      { [300,250,200,150,100].forEach((f,i) => tone(f,'sawtooth',0.4,0.4,i*0.18)) }
function sndWeapon()  { tone(1200,'square',0.06,0.3); tone(800,'square',0.05,0.2,0.04); tone(600,'sine',0.1,0.15,0.08) }
function sndVictory() { [523,659,784,1047,1319].forEach((f,i)=>tone(f,'triangle',0.35,0.35,i*0.12)) }
function sndHurt()    { noiseHit(0.3,0.15); tone(150,'sawtooth',0.2,0.35,0.03) }

// ── CONSTANTS ─────────────────────────────────────────────────────
const W = 480, H = 320
const GROUND = H - 55
const GRAVITY = 1800
const PLAYER_SPEED = 160
const JUMP_FORCE = -520

// ── STICK FIGURE RENDERER ─────────────────────────────────────────
// Each fighter is a collection of joint positions animated by state machine
// HEAD, NECK, SHOULDER_L, SHOULDER_R, ELBOW_L, ELBOW_R, HAND_L, HAND_R
// HIP, KNEE_L, KNEE_R, FOOT_L, FOOT_R

function drawStickman(ctx, f, flip = false) {
  const { x, y, state, animT, color, weapon, glowColor } = f
  ctx.save()
  if (flip) { ctx.scale(-1, 1); ctx.translate(-x * 2, 0) }

  // compute joint positions based on animation state
  const joints = getJoints(f, flip)

  // glow effect
  ctx.shadowColor = glowColor || 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = state === 'special' ? 25 : (f.blocking ? 10 : 4)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // body
  const lw = 4
  ctx.lineWidth = lw

  // torso
  drawLimb(ctx, joints.neck, joints.hip)
  // head
  ctx.beginPath()
  ctx.arc(joints.head.x, joints.head.y, 11, 0, Math.PI * 2)
  ctx.fill()

  // arms
  ctx.lineWidth = 3.5
  drawLimb(ctx, joints.neck, joints.elbowL)
  drawLimb(ctx, joints.elbowL, joints.handL)
  drawLimb(ctx, joints.neck, joints.elbowR)
  drawLimb(ctx, joints.elbowR, joints.handR)

  // legs
  ctx.lineWidth = 4
  drawLimb(ctx, joints.hip, joints.kneeL)
  drawLimb(ctx, joints.kneeL, joints.footL)
  drawLimb(ctx, joints.hip, joints.kneeR)
  drawLimb(ctx, joints.kneeR, joints.footR)

  // weapon
  if (weapon && weapon !== 'none') {
    drawWeapon(ctx, joints, weapon, f.state, color)
  }

  ctx.restore()
}

function drawLimb(ctx, a, b) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
}

function getJoints(f, flip) {
  const { x, y, state, animT, jumping, airY, weapon } = f
  const gy = jumping ? airY : y
  const t = animT

  // base positions (relative to hip)
  let hipX = x, hipY = gy
  let torsoLean = 0
  let neckOff = { x: 0, y: -32 }
  let headOff = { x: 0, y: -10 }

  // arm angles (from shoulder)
  let armLA = -0.5, armRA = -0.5  // resting
  let foreLA = 0.3, foreRA = 0.3
  let legLA = 0, legRA = 0         // thigh angles from hip
  let shinLA = 0.3, shinRA = 0.3

  const punch = Math.max(0, Math.sin(t * Math.PI))
  const kick  = Math.max(0, Math.sin(t * Math.PI))

  switch(state) {
    case 'idle':
      neckOff.y = -32 + Math.sin(t * 3) * 1.5
      armLA = -0.4 + Math.sin(t * 3) * 0.05
      armRA = -0.4 + Math.sin(t * 3 + 0.5) * 0.05
      legLA =  0.1; legRA = -0.1
      break
    case 'walk':
      const wt = t * 8
      legLA = Math.sin(wt) * 0.45; legRA = -Math.sin(wt) * 0.45
      shinLA = Math.max(0, -Math.sin(wt)) * 0.5
      shinRA = Math.max(0,  Math.sin(wt)) * 0.5
      armLA = -Math.sin(wt) * 0.4; armRA = Math.sin(wt) * 0.4
      neckOff.y = -32 + Math.abs(Math.sin(wt * 2)) * 1.5
      break
    case 'jump':
      legLA = -0.5; legRA = -0.5
      shinLA = 0.6; shinRA = 0.6
      armLA = -1.2; armRA = -1.2
      break
    case 'punch1':
      armLA = -0.3; foreLA = 0; armRA = -0.3; foreRA = 0.3
      if (!flip) { armRA = -0.3 + punch * (-0.1); foreRA = 0.3 - punch * 0.3; neckOff.x = punch * 4 }
      else       { armLA = -0.3 + punch * (-0.1); foreLA = 0.3 - punch * 0.3; neckOff.x = punch * 4 }
      torsoLean = punch * 0.15
      break
    case 'punch2':
      if (!flip) { armLA = -0.4 - punch * 0.6; foreLA = 0.4 - punch * 0.4; neckOff.x = -punch * 3 }
      else       { armRA = -0.4 - punch * 0.6; foreRA = 0.4 - punch * 0.4; neckOff.x = -punch * 3 }
      torsoLean = -punch * 0.12
      break
    case 'kick':
      if (!flip) { legRA = -0.3 - kick * 1.0; shinRA = 0.1 + kick * 0.8; torsoLean = kick * 0.3 }
      else       { legLA = -0.3 - kick * 1.0; shinLA = 0.1 + kick * 0.8; torsoLean = -kick * 0.3 }
      armLA = 0.3; armRA = 0.3
      break
    case 'uppercut':
      if (!flip) { armRA = -1.2 - punch * 0.8; foreRA = -0.5 + punch * 0.3 }
      else       { armLA = -1.2 - punch * 0.8; foreLA = -0.5 + punch * 0.3 }
      hipY -= punch * 15; neckOff.y = -35 - punch * 8
      torsoLean = punch * 0.2
      break
    case 'sweep':
      if (!flip) { legRA = 0.8 + kick * 0.6; shinRA = -0.2; hipY += kick * 8 }
      else       { legLA = 0.8 + kick * 0.6; shinLA = -0.2; hipY += kick * 8 }
      torsoLean = kick * 0.4; neckOff.y = -28
      break
    case 'special':
      const sp = Math.sin(t * Math.PI * 2) * 0.5
      armLA = -1.5 + sp; armRA = -1.5 - sp; foreLA = -0.5; foreRA = 0.5
      neckOff.y = -36 - Math.abs(sp) * 5
      torsoLean = sp * 0.3; hipY -= Math.abs(sp) * 10
      break
    case 'block':
      if (!flip) { armRA = -1.0; foreRA = -0.8; armLA = -0.8; foreLA = -0.6 }
      else       { armLA = -1.0; foreLA = -0.8; armRA = -0.8; foreRA = -0.6 }
      torsoLean = flip ? 0.15 : -0.15; neckOff.y = -30
      break
    case 'hurt':
      torsoLean = flip ? -0.4 : 0.4; neckOff.x = flip ? 8 : -8
      armLA = 0.5; armRA = 0.5; neckOff.y = -28
      break
    case 'knockdown':
      neckOff.y = 0; neckOff.x = flip ? 30 : -30
      headOff.y = -8; hipY = gy - 8
      armLA = 1.2; armRA = 0.3; legLA = 0.8; legRA = 0.3
      shinLA = -0.5; shinRA = 0.2
      break
    case 'getup':
      const gu = Math.sin(t * Math.PI)
      neckOff.y = -32 * gu; neckOff.x = (1-gu) * (flip?20:-20)
      legLA = (1-gu)*0.5; legRA = -(1-gu)*0.3
      break
  }

  // build joint tree
  const torsoLen = 28
  const upperArmLen = 16, foreArmLen = 14
  const thighLen = 22, shinLen = 20

  const nx = hipX + neckOff.x, ny = hipY + neckOff.y
  const lean = torsoLean

  // shoulder = upper 1/3 of torso
  const sx = hipX + neckOff.x * 0.4, sy = hipY + neckOff.y * 0.4

  function armJoint(baseAngle, seg, fromX, fromY) {
    return { x: fromX + Math.sin(baseAngle + lean) * seg, y: fromY - Math.cos(baseAngle + lean) * seg * 0.6 }
  }
  function legJoint(baseAngle, seg, fromX, fromY) {
    return { x: fromX + Math.sin(baseAngle) * seg, y: fromY + Math.cos(baseAngle) * seg }
  }

  const eL  = { x: sx + Math.sin(armLA + lean - 0.8) * upperArmLen, y: sy + Math.cos(armLA + lean) * upperArmLen * 0.3 }
  const hL  = { x: eL.x + Math.sin(armLA + foreLA + lean - 0.5) * foreArmLen, y: eL.y + Math.cos(armLA + foreLA) * foreArmLen * 0.3 }
  const eR  = { x: sx + Math.sin(armRA + lean + 0.8) * upperArmLen, y: sy + Math.cos(armRA + lean) * upperArmLen * 0.3 }
  const hR  = { x: eR.x + Math.sin(armRA + foreRA + lean + 0.5) * foreArmLen, y: eR.y + Math.cos(armRA + foreRA) * foreArmLen * 0.3 }

  const kL  = { x: hipX + Math.sin(legLA - 0.12) * thighLen, y: hipY + Math.cos(legLA) * thighLen }
  const fL  = { x: kL.x  + Math.sin(legLA + shinLA - 0.1) * shinLen, y: kL.y + Math.cos(legLA + shinLA) * shinLen }
  const kR  = { x: hipX + Math.sin(legRA + 0.12) * thighLen, y: hipY + Math.cos(legRA) * thighLen }
  const fR  = { x: kR.x  + Math.sin(legRA + shinRA + 0.1) * shinLen, y: kR.y + Math.cos(legRA + shinRA) * shinLen }

  return {
    hip:  { x: hipX, y: hipY },
    neck: { x: nx, y: ny },
    head: { x: nx + headOff.x, y: ny + headOff.y },
    elbowL: eL, handL: hL,
    elbowR: eR, handR: hR,
    kneeL: kL, footL: fL,
    kneeR: kR, footR: fR,
  }
}

function drawWeapon(ctx, joints, weapon, state, color) {
  const hand = joints.handR
  const elbow = joints.elbowR
  const dx = hand.x - elbow.x, dy = hand.y - elbow.y
  const angle = Math.atan2(dy, dx)

  ctx.save()
  ctx.strokeStyle = '#C0C0C0'
  ctx.fillStyle = '#888'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.shadowColor = '#00BFFF'
  ctx.shadowBlur = 8

  if (weapon === 'sword') {
    ctx.save()
    ctx.translate(hand.x, hand.y)
    ctx.rotate(angle - 0.3)
    // blade
    ctx.strokeStyle = '#E0E8FF'
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(38, 0); ctx.stroke()
    // guard
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(8, 7); ctx.stroke()
    // handle
    ctx.strokeStyle = '#6B3A2A'
    ctx.lineWidth = 3.5
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, 0); ctx.stroke()
    ctx.restore()
  } else if (weapon === 'staff') {
    ctx.save()
    ctx.translate(hand.x, hand.y)
    ctx.rotate(angle - 0.5)
    ctx.strokeStyle = '#8B4513'
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(50, 0); ctx.stroke()
    // orb ends
    ctx.fillStyle = '#9B59B6'
    ctx.shadowColor = '#9B59B6'; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(52, 0, 5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(-22, 0, 4, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  } else if (weapon === 'nunchucks') {
    ctx.save()
    ctx.translate(hand.x, hand.y)
    const swing = state === 'punch1' || state === 'punch2' ? Math.sin(Date.now() * 0.01) * 0.8 : 0.3
    // stick 1
    ctx.strokeStyle = '#4A3728'
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 0); ctx.stroke()
    // chain
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2, 2])
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(18 + Math.cos(swing) * 10, Math.sin(swing) * 10); ctx.stroke()
    ctx.setLineDash([])
    // stick 2
    const cx2 = 18 + Math.cos(swing) * 10, cy2 = Math.sin(swing) * 10
    ctx.strokeStyle = '#4A3728'
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(swing + 0.5) * 18, cy2 + Math.sin(swing + 0.5) * 18); ctx.stroke()
    ctx.restore()
  }

  ctx.restore()
}

// ── BACKGROUNDS ───────────────────────────────────────────────────
function drawBackground(ctx, bgType, time) {
  ctx.clearRect(0, 0, W, H)

  if (bgType === 'dojo') {
    // warm wooden dojo
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#1a0a00'); sky.addColorStop(1, '#3d1500')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // floor
    const floor = ctx.createLinearGradient(0, GROUND, 0, H)
    floor.addColorStop(0, '#3d2000'); floor.addColorStop(1, '#1a0d00')
    ctx.fillStyle = floor; ctx.fillRect(0, GROUND, W, H - GROUND)
    // floor planks
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1
    for (let px = 0; px < W; px += 40) { ctx.beginPath(); ctx.moveTo(px, GROUND); ctx.lineTo(px, H); ctx.stroke() }
    // pillars
    ctx.fillStyle = '#2d1500'
    ctx.fillRect(30, GROUND - 160, 18, 160); ctx.fillRect(W - 48, GROUND - 160, 18, 160)
    // lanterns
    ctx.shadowColor = '#FF6B00'; ctx.shadowBlur = 20
    ctx.fillStyle = '#FF4500'
    ctx.fillRect(28, GROUND - 175, 22, 15); ctx.fillRect(W - 50, GROUND - 175, 22, 15)
    // glow pools
    ctx.save(); ctx.globalAlpha = 0.1
    const g1 = ctx.createRadialGradient(39, GROUND - 168, 0, 39, GROUND - 168, 40)
    g1.addColorStop(0, '#FF6B00'); g1.addColorStop(1, 'transparent')
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    ctx.shadowBlur = 0

  } else if (bgType === 'city') {
    // dark cyberpunk city
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#050010'); sky.addColorStop(1, '#100025')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // buildings
    const buildings = [[20,80,60,180],[90,40,50,220],[155,100,45,160],[210,20,60,240],[285,60,55,200],[355,30,50,230],[415,90,50,170]]
    buildings.forEach(([bx, bh, bw, by]) => {
      ctx.fillStyle = '#0a0015'
      ctx.fillRect(bx, GROUND - bh, bw, bh)
      // windows
      ctx.fillStyle = '#FFD700'
      for (let wy = GROUND - bh + 10; wy < GROUND - 10; wy += 18) {
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
          if (Math.random() < 0.6) { ctx.fillStyle = Math.random() < 0.5 ? '#FFD700' : '#00BFFF'; ctx.fillRect(wx, wy, 6, 8) }
        }
      }
    })
    // neon signs
    ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 15
    ctx.strokeStyle = '#FF00FF'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(95, GROUND - 50); ctx.lineTo(130, GROUND - 50); ctx.stroke()
    ctx.shadowColor = '#00FFFF'; ctx.strokeStyle = '#00FFFF'
    ctx.beginPath(); ctx.moveTo(220, GROUND - 80); ctx.lineTo(255, GROUND - 80); ctx.stroke()
    ctx.shadowBlur = 0
    // floor
    const floor = ctx.createLinearGradient(0, GROUND, 0, H)
    floor.addColorStop(0, '#0a0015'); floor.addColorStop(1, '#050010')
    ctx.fillStyle = floor; ctx.fillRect(0, GROUND, W, H - GROUND)
    // wet floor reflection
    ctx.save(); ctx.globalAlpha = 0.15
    ctx.fillStyle = '#6600FF'; ctx.fillRect(0, GROUND, W, H - GROUND)
    ctx.restore()

  } else if (bgType === 'forest') {
    // dark mystical forest
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#000d00'); sky.addColorStop(1, '#001500')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // moon
    ctx.shadowColor = '#FFFFAA'; ctx.shadowBlur = 30
    ctx.fillStyle = '#FFFFCC'
    ctx.beginPath(); ctx.arc(380, 50, 22, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    // trees (parallax layers)
    const drawTree = (tx, th, tw, col) => {
      ctx.fillStyle = col
      ctx.fillRect(tx - tw/6, GROUND - th, tw/3, th)
      // canopy
      ctx.beginPath()
      ctx.moveTo(tx, GROUND - th - 60)
      ctx.lineTo(tx - tw/2, GROUND - th + 20)
      ctx.lineTo(tx + tw/2, GROUND - th + 20)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(tx, GROUND - th - 90)
      ctx.lineTo(tx - tw/3, GROUND - th - 20)
      ctx.lineTo(tx + tw/3, GROUND - th - 20)
      ctx.fill()
    }
    // far trees
    ctx.globalAlpha = 0.4
    const farTrees = [0,60,120,180,240,300,360,420,480]
    farTrees.forEach(tx => drawTree(tx + 30, 80, 50, '#001200'))
    ctx.globalAlpha = 0.7
    // mid trees
    const midTrees = [30,110,200,290,380,450]
    midTrees.forEach(tx => drawTree(tx, 120, 70, '#001a00'))
    ctx.globalAlpha = 1
    // close trees
    const closeTrees = [0, 160, 320, 480]
    closeTrees.forEach(tx => drawTree(tx, 160, 90, '#00250a'))
    // glowing particles
    ctx.save()
    for (let i = 0; i < 20; i++) {
      const px = (i * 73 + time * 10) % W
      const py = GROUND - 20 - (i * 37) % 80
      ctx.globalAlpha = 0.4 + Math.sin(time * 2 + i) * 0.3
      ctx.fillStyle = '#00FF66'
      ctx.shadowColor = '#00FF66'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
    // floor
    ctx.globalAlpha = 1
    const floor = ctx.createLinearGradient(0, GROUND, 0, H)
    floor.addColorStop(0, '#001a00'); floor.addColorStop(1, '#000d00')
    ctx.fillStyle = floor; ctx.fillRect(0, GROUND, W, H - GROUND)

  } else if (bgType === 'shadow') {
    // ominous shadow realm
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#000000'); sky.addColorStop(0.5, '#0d0010'); sky.addColorStop(1, '#1a0000')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // floating dark orbs
    for (let i = 0; i < 8; i++) {
      const ox = 60 + i * 55, oy = 40 + Math.sin(time * 0.8 + i) * 20
      ctx.save()
      ctx.globalAlpha = 0.15
      const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 35)
      og.addColorStop(0, '#9B00FF'); og.addColorStop(1, 'transparent')
      ctx.fillStyle = og; ctx.fillRect(ox - 35, oy - 35, 70, 70)
      ctx.restore()
    }
    // cracks in ground
    ctx.strokeStyle = '#9B00FF'; ctx.lineWidth = 1.5
    ctx.shadowColor = '#9B00FF'; ctx.shadowBlur = 8
    const cracks = [[100, GROUND, 130, GROUND-8], [200, GROUND, 170, GROUND-12], [320, GROUND, 350, GROUND-6]]
    cracks.forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
    })
    ctx.shadowBlur = 0
    // floor
    const floor = ctx.createLinearGradient(0, GROUND, 0, H)
    floor.addColorStop(0, '#0d0010'); floor.addColorStop(1, '#000000')
    ctx.fillStyle = floor; ctx.fillRect(0, GROUND, W, H - GROUND)
    // energy lines on floor
    ctx.save()
    ctx.globalAlpha = 0.2 + Math.sin(time * 2) * 0.1
    ctx.strokeStyle = '#9B00FF'; ctx.lineWidth = 1
    ctx.shadowColor = '#9B00FF'; ctx.shadowBlur = 6
    for (let lx = 0; lx < W; lx += 30) {
      ctx.beginPath(); ctx.moveTo(lx, GROUND); ctx.lineTo(lx + 15, H); ctx.stroke()
    }
    ctx.restore()
  }

  // ground line
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke()
}

// ── PARTICLE SYSTEM ───────────────────────────────────────────────
function spawnHitParticles(particles, x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i / count) + Math.random() * 0.5
    const spd = 2 + Math.random() * 4
    particles.push({ x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - 1, color, life: 1, decay: 0.05 + Math.random()*0.05, size: 2+Math.random()*3 })
  }
}
function spawnBlood(particles, x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({ x, y, vx: (Math.random()-0.5)*5, vy: -Math.random()*5, color:'#8B0000', life:1, decay:0.04, size:2+Math.random()*2, gravity:true })
  }
}
function spawnSpecialFX(particles, x, y, color) {
  for (let i = 0; i < 30; i++) {
    const angle = Math.PI * 2 * i / 30
    const spd = 3 + Math.random() * 5
    particles.push({ x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, color, life:1, decay:0.025, size:3+Math.random()*4 })
  }
}

// ── BOSS DEFINITIONS ──────────────────────────────────────────────
const BOSSES = [
  { name:'GRUNT',       color:'#2d2d2d', glowColor:'#555',    weapon:'none',       hp:80,  speed:130, aggression:0.3, style:'brawler',  bg:'dojo',   intro:'A simple thug. Don\'t get cocky.' },
  { name:'BLADE',       color:'#1a1a2e', glowColor:'#4444FF', weapon:'sword',      hp:100, speed:140, aggression:0.4, style:'swordsman',bg:'dojo',   intro:'He fights with cold steel.' },
  { name:'STRIKER',     color:'#1a0000', glowColor:'#FF2200', weapon:'none',       hp:110, speed:170, aggression:0.5, style:'speedster', bg:'city',   intro:'Fast as lightning. Don\'t blink.' },
  { name:'STAFF MONK',  color:'#0d0d1a', glowColor:'#9B59B6', weapon:'staff',      hp:130, speed:130, aggression:0.45,style:'mage',     bg:'city',   intro:'Ancient power flows through his staff.' },
  { name:'CHAIN',       color:'#1a1500', glowColor:'#FFD700', weapon:'nunchucks',  hp:140, speed:155, aggression:0.55,style:'trickster', bg:'forest', intro:'His nunchucks never stop moving.' },
  { name:'PHANTOM',     color:'#001a00', glowColor:'#00FF66', weapon:'none',       hp:150, speed:180, aggression:0.6, style:'speedster', bg:'forest', intro:'You cannot see him coming.' },
  { name:'WARLORD',     color:'#1a0a00', glowColor:'#FF6B00', weapon:'sword',      hp:170, speed:145, aggression:0.65,style:'brawler',  bg:'shadow', intro:'Defeated a hundred men. You\'re next.' },
  { name:'SHADOW MONK', color:'#0d001a', glowColor:'#FF00FF', weapon:'staff',      hp:190, speed:150, aggression:0.7, style:'mage',     bg:'shadow', intro:'He walks between dimensions.' },
  { name:'DEATH CHAIN', color:'#1a0000', glowColor:'#FF0000', weapon:'nunchucks',  hp:210, speed:165, aggression:0.8, style:'trickster', bg:'shadow', intro:'The last sound you\'ll hear is chains.' },
  { name:'SHADOW KING', color:'#000000', glowColor:'#9B00FF', weapon:'sword',      hp:250, speed:170, aggression:0.9, style:'master',   bg:'shadow', intro:'He is the darkness itself.' },
]

// ── AI ENGINE ─────────────────────────────────────────────────────
function aiDecide(enemy, player, difficulty) {
  const dist = Math.abs(enemy.x - player.x)
  const punchRange = 70, kickRange = 90
  const { aggression, speed: aiSpd, style } = enemy

  const diffMult = { rookie:0.3, fighter:0.55, champion:0.75, legend:0.9, master:1.0 }[difficulty] || 0.5
  const eff = aggression * diffMult

  // reset AI decision
  let move = 0, action = null

  if (enemy.stunTimer > 0 || enemy.state === 'knockdown' || enemy.state === 'getup') return { move:0, action:null }
  if (enemy.actionCooldown > 0) {
    // approach while cooling down
    move = enemy.x > player.x ? -1 : 1
    if (dist < 30) move = 0
    return { move, action:null }
  }

  // block if player is attacking
  if ((player.state === 'punch1'||player.state==='punch2'||player.state==='kick'||player.state==='uppercut') && dist < kickRange) {
    if (Math.random() < eff * 0.6) return { move:0, action:'block' }
  }

  // attack
  if (dist < punchRange) {
    if (Math.random() < eff) {
      const attacks = ['punch1','punch2','kick']
      if (style === 'speedster') attacks.push('punch1','punch2')
      if (style === 'brawler')   attacks.push('kick','uppercut')
      if (style === 'mage')      attacks.push('special')
      if (style === 'master')    attacks.push('uppercut','special','sweep')
      action = attacks[Math.floor(Math.random() * attacks.length)]
      return { move:0, action }
    }
  }

  // approach or keep distance
  if (dist > punchRange) {
    move = enemy.x > player.x ? -1 : 1
  } else if (dist < 40 && Math.random() < 0.3) {
    move = enemy.x > player.x ? 1 : -1  // back off
  }

  // jump sometimes when far
  if (dist > 150 && Math.random() < 0.005 * diffMult * 60) action = 'jump'

  return { move, action }
}

// ── MAIN GAME ─────────────────────────────────────────────────────
const WEAPONS = ['none','sword','staff','nunchucks']

export default function StickmanFighter({ game, levelData, studentId, onFinish }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const keysRef   = useRef({})
  const [ui, setUi] = useState({ screen:'menu', bossIdx:0, round:1, mode:'story', score:0, playerHp:100, enemyHp:100, combo:0, weapon:'none', message:'', difficulty:'fighter', survivalRound:1 })
  const uiRef = useRef(ui)
  uiRef.current = ui

  function makeFighter(isPlayer, bossIdx=0) {
    const boss = BOSSES[bossIdx]
    return {
      x:      isPlayer ? 100 : 360,
      y:      GROUND,
      airY:   GROUND,
      vy:     0,
      vx:     0,
      state:  'idle',
      animT:  0,
      animDur:0,
      facing: isPlayer ? 1 : -1,
      hp:     isPlayer ? 100 : boss.hp,
      maxHp:  isPlayer ? 100 : boss.hp,
      color:  isPlayer ? '#111111' : boss.color,
      glowColor: isPlayer ? '#4444FF' : boss.glowColor,
      weapon: isPlayer ? uiRef.current.weapon : boss.weapon,
      blocking:  false,
      jumping:   false,
      stunTimer: 0,
      actionCooldown: 0,
      comboCount: 0,
      comboTimer: 0,
      aggression: isPlayer ? 0 : boss.aggression,
      speed:     isPlayer ? PLAYER_SPEED : boss.speed,
      style:     isPlayer ? 'player' : boss.style,
      isPlayer,
      hitFlash: 0,
      aiMoveDir: 0,
    }
  }

  function startFight(mode, bossIdx=0, diff='fighter') {
    const boss = BOSSES[bossIdx]
    stateRef.current = {
      player: makeFighter(true, bossIdx),
      enemy:  makeFighter(false, bossIdx),
      particles: [],
      time: 0,
      bgType: boss.bg,
      roundTimer: 60,
      phase: 'fight', // fight | ko | victory | intro
      introTimer: 3.5,
      koTimer: 0,
      aiDecideTimer: 0,
      screenShake: 0,
    }
    setUi(prev => ({
      ...prev,
      screen:'fight',
      mode,
      bossIdx,
      difficulty: diff,
      playerHp:100,
      enemyHp:boss.hp,
      combo:0,
      message: boss.intro,
      score: mode==='survival' ? prev.score : 0,
    }))
    setTimeout(()=>setUi(p=>({...p,message:''})), 3000)
  }

  useEffect(() => {
    lastRef.current = performance.now()
    function loop(now) {
      const dt = Math.min((now - (lastRef.current||now)) / 1000, 0.05)
      lastRef.current = now
      if (uiRef.current.screen === 'fight') { update(dt); draw() }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKey = e => {
      keysRef.current[e.code] = e.type === 'keydown'
      if (e.type === 'keydown') handleKeyAction(e.code)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey) }
  }, [])

  function handleKeyAction(code) {
    const s = stateRef.current; if (!s || s.phase !== 'fight') return
    const p = s.player
    if (code === 'KeyZ' || code === 'KeyJ') doAttack(p, s.enemy, 'punch1', s.particles)
    if (code === 'KeyX' || code === 'KeyK') doAttack(p, s.enemy, 'punch2', s.particles)
    if (code === 'KeyC' || code === 'KeyL') doAttack(p, s.enemy, 'kick',   s.particles)
    if (code === 'KeyV')                    doAttack(p, s.enemy, 'uppercut',s.particles)
    if (code === 'KeyB')                    doAttack(p, s.enemy, 'special', s.particles)
    if (code === 'ArrowUp' || code === 'KeyW') doJump(p)
  }

  function doAttack(attacker, defender, type, particles) {
    if (attacker.actionCooldown > 0 || attacker.stunTimer > 0) return
    if (type === 'special' && attacker.comboCount < 3) { setUi(p=>({...p,message:'Build combo first! (3 hits)'})); setTimeout(()=>setUi(p=>({...p,message:''})),1200); return }

    attacker.state = type
    attacker.animT = 0
    attacker.animDur = type==='kick'?0.35:type==='uppercut'?0.4:type==='special'?0.6:type==='sweep'?0.35:0.28
    attacker.actionCooldown = attacker.animDur + 0.1

    // play sound
    if (type==='punch1'||type==='punch2') sndPunch()
    else if (type==='kick'||type==='sweep') sndKick()
    else if (type==='special') sndSpecial()
    else sndWhoosh()

    // check hit
    const dist = Math.abs(attacker.x - defender.x)
    const range = type==='kick'||type==='sweep'?95:type==='special'?110:75
    const weaponBonus = attacker.weapon==='sword'?20:attacker.weapon==='staff'?15:attacker.weapon==='nunchucks'?10:0

    if (dist < range + weaponBonus) {
      // hit!
      if (defender.blocking && type !== 'special' && type !== 'sweep') {
        sndBlock()
        spawnHitParticles(particles, defender.x, defender.y - 50, '#FFD700', 8)
        return
      }

      const baseDmg = { punch1:8, punch2:10, kick:14, uppercut:18, special:30, sweep:12 }[type] || 10
      const comboDmg = Math.min(attacker.comboCount * 2, 10)
      const totalDmg = baseDmg + comboDmg + weaponBonus*0.5

      defender.hp = Math.max(0, defender.hp - totalDmg)
      defender.stunTimer = type==='special'?0.8:type==='uppercut'?0.5:type==='sweep'?0.6:0.25
      defender.state = type==='uppercut'||type==='special' ? 'knockdown' : 'hurt'
      defender.hitFlash = 0.2

      // knockback
      const dir = attacker.x < defender.x ? 1 : -1
      defender.vx = dir * (type==='special'?8:type==='kick'?6:4)
      if (type==='uppercut'||type==='special') { defender.vy = -400; defender.jumping = true }

      // particles
      const hx = (attacker.x + defender.x) / 2
      const hy = defender.y - 50
      spawnHitParticles(particles, hx, hy, '#FF4444', 15)
      if (attacker.weapon !== 'none') spawnHitParticles(particles, hx, hy, attacker.glowColor, 8)
      if (type === 'special') spawnSpecialFX(particles, hx, hy, attacker.glowColor)

      // shake
      stateRef.current.screenShake = type==='special'?0.4:0.18

      sndHurt()
      if (attacker.weapon !== 'none') sndWeapon()

      // combo
      attacker.comboCount++
      attacker.comboTimer = 1.5
      if (attacker.isPlayer) setUi(p=>({...p, combo:attacker.comboCount, playerHp:stateRef.current.player.hp, enemyHp:Math.round(defender.hp)}))
      else setUi(p=>({...p, enemyHp:Math.round(defender.hp)}))

      // KO check
      if (defender.hp <= 0) {
        sndKO()
        stateRef.current.phase = 'ko'
        stateRef.current.koTimer = 2.5
        defender.state = 'knockdown'
        spawnSpecialFX(particles, defender.x, defender.y-40, defender.glowColor)
        setUi(p=>({...p,message: attacker.isPlayer?'KO! YOU WIN!':'KO! YOU LOSE...'}))
      }
    }
  }

  function doJump(fighter) {
    if (!fighter.jumping && fighter.actionCooldown <= 0) {
      fighter.vy = JUMP_FORCE; fighter.jumping = true
      sndWhoosh()
    }
  }

  function update(dt) {
    const s = stateRef.current; if (!s) return
    s.time += dt
    if (s.screenShake > 0) s.screenShake -= dt * 2

    // intro phase
    if (s.phase === 'intro') { s.introTimer -= dt; if (s.introTimer <= 0) s.phase = 'fight'; return }

    // KO phase
    if (s.phase === 'ko') {
      s.koTimer -= dt
      if (s.koTimer <= 0) {
        const playerWon = s.enemy.hp <= 0
        const u = uiRef.current
        if (playerWon) {
          sndVictory()
          if (u.mode === 'story') {
            const nextBoss = u.bossIdx + 1
            if (nextBoss >= BOSSES.length) {
              setUi(p=>({...p,screen:'victory',message:'YOU DEFEATED THE SHADOW KING!'}))
            } else {
              setTimeout(()=>startFight('story', nextBoss, u.difficulty), 1500)
            }
          } else {
            const nextRound = u.survivalRound + 1
            const bossIdx = (nextRound - 1) % BOSSES.length
            setUi(p=>({...p,survivalRound:nextRound,score:p.score+Math.round(100*nextRound*0.5),message:`Round ${nextRound}!`}))
            setTimeout(()=>startFight('survival', bossIdx, u.difficulty), 1500)
          }
        } else {
          setUi(p=>({...p,screen:'gameover'}))
        }
      }
      return
    }

    // update round timer
    s.roundTimer -= dt
    if (s.roundTimer <= 0) {
      // time out — whoever has more hp wins
      s.phase = 'ko'; s.koTimer = 2
      const playerWins = s.player.hp > s.enemy.hp
      setUi(p=>({...p,message:playerWins?'TIME! YOU WIN!':'TIME! YOU LOSE!'}))
    }

    const p = s.player, e = s.enemy

    // ── PLAYER INPUT ──
    if (p.stunTimer <= 0 && s.phase === 'fight') {
      // movement
      let pdx = 0
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) pdx = -1
      if (keysRef.current['ArrowRight']|| keysRef.current['KeyD']) pdx = 1
      if (keysRef.current['ArrowUp']   || keysRef.current['KeyW']) doJump(p)
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) { p.blocking = true; p.state = 'block' }
      else p.blocking = false

      if (pdx !== 0 && p.actionCooldown <= 0) {
        p.vx = pdx * p.speed
        if (!p.jumping) p.state = 'walk'
        p.facing = pdx
      } else if (p.actionCooldown <= 0 && !p.blocking && !p.jumping) {
        p.state = 'idle'
        p.vx = 0
      }
    }

    // ── AI DECISION ──
    s.aiDecideTimer -= dt
    if (s.aiDecideTimer <= 0) {
      s.aiDecideTimer = 0.08
      const { move, action } = aiDecide(e, p, uiRef.current.difficulty)
      e.aiMoveDir = move
      if (action === 'jump') doJump(e)
      else if (action) doAttack(e, p, action, s.particles)
    }
    if (e.stunTimer <= 0 && e.actionCooldown <= 0 && !e.blocking) {
      e.vx = e.aiMoveDir * e.speed
      if (e.aiMoveDir !== 0 && !e.jumping) e.state = 'walk'
      else if (e.actionCooldown <= 0 && !e.jumping && e.stunTimer <= 0) e.state = 'idle'
      e.facing = e.x > p.x ? -1 : 1
    }

    // ── PHYSICS & STATE ──
    for (const f of [p, e]) {
      // timers
      if (f.actionCooldown > 0) f.actionCooldown -= dt
      if (f.stunTimer > 0) { f.stunTimer -= dt; if (f.stunTimer <= 0 && f.state==='knockdown') { f.state='getup'; f.animT=0; f.animDur=0.5; f.actionCooldown=0.5 } }
      if (f.hitFlash > 0) f.hitFlash -= dt
      if (f.comboTimer > 0) { f.comboTimer -= dt; if (f.comboTimer <= 0) { f.comboCount=0; if(f.isPlayer) setUi(p2=>({...p2,combo:0})) } }

      // animation
      f.animT += dt
      if (f.actionCooldown <= 0 && f.animT > f.animDur && !f.jumping) {
        if (f.state !== 'idle' && f.state !== 'walk' && f.state !== 'block') {
          f.state = 'idle'; f.animT = 0
        }
      }

      // gravity & jumping
      if (f.jumping) {
        f.vy += GRAVITY * dt
        f.airY += f.vy * dt
        if (f.airY >= GROUND) {
          f.airY = GROUND; f.vy = 0; f.jumping = false
          f.state = 'idle'; f.animT = 0
        }
        f.state = 'jump'
      }

      // horizontal movement
      f.x += f.vx * dt
      f.vx *= 0.8
      // wall bounds
      f.x = Math.max(30, Math.min(W - 30, f.x))
    }

    // facing update
    if (p.actionCooldown <= 0) p.facing = p.x < e.x ? 1 : -1
    if (e.actionCooldown <= 0) e.facing = e.x < p.x ? 1 : -1

    // particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const pt = s.particles[i]
      pt.x += pt.vx; pt.y += pt.vy
      if (pt.gravity) pt.vy += 15
      pt.vx *= 0.92; pt.vy *= 0.92
      pt.life -= pt.decay
      if (pt.life <= 0) s.particles.splice(i, 1)
    }

    // sync HP to UI periodically
    setUi(prev=>({...prev, playerHp:Math.round(p.hp), enemyHp:Math.round(e.hp), roundTimer:Math.ceil(s.roundTimer)}))
  }

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current; if (!s) return

    ctx.save()
    if (s.screenShake > 0) {
      const sh = s.screenShake * 6
      ctx.translate((Math.random()-0.5)*sh, (Math.random()-0.5)*sh)
    }

    // background
    drawBackground(ctx, s.bgType, s.time)

    const p = s.player, e = s.enemy

    // shadow under fighters
    for (const f of [p, e]) {
      const gy = f.jumping ? f.airY : f.y
      ctx.save()
      ctx.globalAlpha = 0.3 - (GROUND - gy) / GROUND * 0.25
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(f.x, GROUND + 3, 18, 5, 0, 0, Math.PI*2)
      ctx.fill()
      ctx.restore()
    }

    // draw fighters
    const pFlip = p.facing < 0
    const eFlip = e.facing < 0

    // draw enemy first (behind if overlapping on right)
    if (p.x < e.x) {
      drawStickman(ctx, p, pFlip)
      drawStickman(ctx, e, eFlip)
    } else {
      drawStickman(ctx, e, eFlip)
      drawStickman(ctx, p, pFlip)
    }

    // hit flash
    for (const f of [p, e]) {
      if (f.hitFlash > 0) {
        ctx.save()
        ctx.globalAlpha = f.hitFlash * 0.6
        ctx.fillStyle = '#FF0000'
        ctx.beginPath(); ctx.arc(f.x, (f.jumping?f.airY:f.y) - 40, 30, 0, Math.PI*2); ctx.fill()
        ctx.restore()
      }
    }

    // particles
    for (const pt of s.particles) {
      ctx.save()
      ctx.globalAlpha = pt.life
      ctx.fillStyle = pt.color
      ctx.shadowColor = pt.color; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI*2); ctx.fill()
      ctx.restore()
    }

    // VS distance indicator (close range pulse)
    const dist = Math.abs(p.x - e.x)
    if (dist < 80) {
      ctx.save()
      ctx.globalAlpha = (1 - dist/80) * 0.15
      ctx.fillStyle = '#FF0000'
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    ctx.restore()
  }

  // ── BUTTON ACTIONS ────────────────────────────────────────────────
  function btnAttack(type) {
    const s = stateRef.current; if(!s) return
    doAttack(s.player, s.enemy, type, s.particles)
  }
  function btnJump() { const s=stateRef.current; if(!s)return; doJump(s.player) }
  function btnBlock(down) { const s=stateRef.current; if(!s)return; s.player.blocking=down; if(down){s.player.state='block'} }

  const u = ui
  const bossData = BOSSES[u.bossIdx] || BOSSES[0]

  // ── MENU SCREEN ───────────────────────────────────────────────────
  if (u.screen === 'menu') {
    return (
      <div style={{background:'#050505',borderRadius:16,overflow:'hidden',fontFamily:'monospace',color:'white'}}>
        <style>{`
          @keyframes flicker{0%,100%{opacity:1}50%{opacity:0.85}}
          @keyframes glow{0%,100%{text-shadow:0 0 10px #9B00FF}50%{text-shadow:0 0 30px #9B00FF,0 0 60px #9B00FF}}
          @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        `}</style>
        <div style={{background:'linear-gradient(180deg,#0a0010 0%,#050505 100%)',padding:'30px 20px',textAlign:'center',minHeight:400}}>
          <div style={{fontSize:60,marginBottom:8,animation:'float2 3s ease-in-out infinite'}}>⚔️</div>
          <h1 style={{fontSize:26,fontWeight:900,letterSpacing:4,marginBottom:4,animation:'glow 2s infinite',color:'#EEE'}}>SHADOW FIGHT</h1>
          <p style={{color:'#666',fontSize:11,marginBottom:28,letterSpacing:2}}>STICKMAN EDITION</p>

          {/* Weapon select */}
          <div style={{marginBottom:20}}>
            <p style={{color:'#555',fontSize:11,marginBottom:8,textTransform:'uppercase',letterSpacing:2}}>Choose Weapon</p>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              {WEAPONS.map(w => (
                <button key={w} onClick={()=>setUi(p=>({...p,weapon:w}))}
                  style={{padding:'8px 14px',borderRadius:10,border:`2px solid ${u.weapon===w?'#9B00FF':'#222'}`,background:u.weapon===w?'rgba(155,0,255,0.2)':'#111',color:u.weapon===w?'#CC88FF':'#666',fontWeight:700,fontSize:11,cursor:'pointer',textTransform:'capitalize'}}>
                  {w==='none'?'👊 Fists':w==='sword'?'🗡 Sword':w==='staff'?'🪄 Staff':'🔗 Nunchucks'}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div style={{marginBottom:24}}>
            <p style={{color:'#555',fontSize:11,marginBottom:8,textTransform:'uppercase',letterSpacing:2}}>Difficulty</p>
            <div style={{display:'flex',gap:6,justifyContent:'center'}}>
              {['rookie','fighter','champion','legend','master'].map(d => (
                <button key={d} onClick={()=>setUi(p=>({...p,difficulty:d}))}
                  style={{padding:'6px 10px',borderRadius:8,border:`1px solid ${u.difficulty===d?'#FF4400':'#222'}`,background:u.difficulty===d?'rgba(255,68,0,0.2)':'#0a0a0a',color:u.difficulty===d?'#FF8866':'#444',fontWeight:700,fontSize:10,cursor:'pointer',textTransform:'capitalize'}}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Mode buttons */}
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button onClick={()=>startFight('story',0,u.difficulty)}
              style={{padding:'14px 28px',borderRadius:12,background:'linear-gradient(135deg,#4B0082,#9B00FF)',color:'white',fontWeight:900,fontSize:14,border:'none',cursor:'pointer',letterSpacing:2}}>
              ⚔️ STORY MODE
            </button>
            <button onClick={()=>{ setUi(p=>({...p,survivalRound:1,score:0})); startFight('survival',0,u.difficulty) }}
              style={{padding:'14px 28px',borderRadius:12,background:'linear-gradient(135deg,#8B0000,#FF2200)',color:'white',fontWeight:900,fontSize:14,border:'none',cursor:'pointer',letterSpacing:2}}>
              💀 SURVIVAL
            </button>
          </div>
          <p style={{color:'#333',fontSize:9,marginTop:20}}>Arrow keys to move · Z/X/C to punch/kick · V = uppercut · B = special · S = block</p>
        </div>
      </div>
    )
  }

  // ── GAMEOVER / VICTORY ────────────────────────────────────────────
  if (u.screen === 'gameover' || u.screen === 'victory') {
    return (
      <div style={{background:'#050505',borderRadius:16,overflow:'hidden',fontFamily:'monospace',color:'white',textAlign:'center',padding:'40px 20px',minHeight:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:64,marginBottom:12}}>{u.screen==='victory'?'🏆':'💀'}</div>
        <h2 style={{fontSize:24,fontWeight:900,color:u.screen==='victory'?'#FFD700':'#EF4444',marginBottom:8,letterSpacing:3}}>
          {u.screen==='victory'?'CHAMPION!':'DEFEATED'}
        </h2>
        {u.mode==='survival'&&<p style={{color:'#9B59B6',fontSize:14,marginBottom:8}}>Survived {u.survivalRound} rounds · Score: {u.score}</p>}
        <p style={{color:'#555',fontSize:12,marginBottom:24}}>{u.message}</p>
        <button onClick={()=>setUi(p=>({...p,screen:'menu'}))}
          style={{padding:'12px 32px',borderRadius:12,background:'linear-gradient(135deg,#4B0082,#9B00FF)',color:'white',fontWeight:900,fontSize:14,border:'none',cursor:'pointer'}}>
          ← MAIN MENU
        </button>
      </div>
    )
  }

  // ── FIGHT SCREEN ──────────────────────────────────────────────────
  const pHpPct  = Math.max(0, (u.playerHp / 100) * 100)
  const eHpPct  = Math.max(0, (u.enemyHp / bossData.hp) * 100)

  return (
    <div style={{background:'#050505',borderRadius:16,overflow:'hidden',fontFamily:'monospace',userSelect:'none'}}>
      <style>{`
        @keyframes comboPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.3)}100%{transform:scale(1);opacity:1}}
        @keyframes msgSlide{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* HP BARS */}
      <div style={{background:'#0a0a0a',padding:'10px 12px',borderBottom:'1px solid #1a1a1a',display:'flex',alignItems:'center',gap:8}}>
        {/* Player HP */}
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{color:'#EEE',fontSize:10,fontWeight:700}}>YOU</span>
            <span style={{color:'#EF4444',fontSize:10}}>{u.playerHp}</span>
          </div>
          <div style={{height:10,background:'#111',borderRadius:5,overflow:'hidden',border:'1px solid #222'}}>
            <div style={{height:'100%',width:`${pHpPct}%`,background:`linear-gradient(90deg,${pHpPct>50?'#22c55e':'#f59e0b'},${pHpPct>50?'#4ade80':'#ef4444'})`,borderRadius:5,transition:'width 0.2s'}}/>
          </div>
        </div>

        {/* Center info */}
        <div style={{textAlign:'center',minWidth:60}}>
          {u.combo > 1 && <div style={{color:'#FF4400',fontWeight:900,fontSize:14,animation:'comboPop 0.3s ease',lineHeight:1}}>{u.combo}x</div>}
          <div style={{color:'#333',fontSize:9}}>{u.mode==='survival'?`RD ${u.survivalRound}`:u.roundTimer||''}</div>
        </div>

        {/* Enemy HP */}
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{color:'#EF4444',fontSize:10}}>{u.enemyHp}</span>
            <span style={{color:'#EEE',fontSize:10,fontWeight:700}}>{bossData.name}</span>
          </div>
          <div style={{height:10,background:'#111',borderRadius:5,overflow:'hidden',border:'1px solid #222'}}>
            <div style={{height:'100%',width:`${eHpPct}%`,background:'linear-gradient(90deg,#ef4444,#dc2626)',borderRadius:5,transition:'width 0.2s',marginLeft:'auto'}}/>
          </div>
        </div>
      </div>

      {/* Message */}
      {u.message && (
        <div style={{background:'rgba(155,0,255,0.15)',borderBottom:'1px solid rgba(155,0,255,0.3)',padding:'5px',textAlign:'center',color:'#CC88FF',fontSize:11,fontWeight:700,animation:'msgSlide 0.3s ease'}}>
          {u.message}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={W} height={H} style={{width:'100%',display:'block'}}/>

      {/* CONTROLS */}
      <div style={{background:'#080808',borderTop:'1px solid #1a1a1a',padding:'10px 12px'}}>
        <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
          {/* Move */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,width:100}}>
            {[['','↑',''],['←','','→'],['','↓','']].map((row,ri)=>row.map((btn,ci)=>(
              <button key={`mv-${ri}-${ci}`}
                onPointerDown={()=>{
                  if(!btn)return
                  if(btn==='↑')btnJump()
                  if(btn==='↓')btnBlock(true)
                  if(btn==='←'){const s=stateRef.current;if(s){s.player.vx=-PLAYER_SPEED;s.player.state='walk';s.player.facing=-1}}
                  if(btn==='→'){const s=stateRef.current;if(s){s.player.vx=PLAYER_SPEED;s.player.state='walk';s.player.facing=1}}
                }}
                onPointerUp={()=>{if(btn==='↓')btnBlock(false)}}
                style={{height:32,borderRadius:7,border:'1px solid #222',background:btn?'#111':'transparent',color:'#60a5fa',fontWeight:800,fontSize:14,cursor:btn?'pointer':'default',visibility:btn?'visible':'hidden'}}>
                {btn}
              </button>
            )))}
          </div>

          {/* Attack buttons */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:4,flex:1,maxWidth:240}}>
            {[
              ['PUNCH','punch1','#FF4400'],
              ['JABS','punch2','#FF6600'],
              ['KICK','kick','#FF0066'],
              ['UPPER','uppercut','#FF00AA'],
              ['SPECIAL ★','special','#9B00FF'],
              ['BLOCK','block','#0066FF'],
            ].map(([label,type,color])=>(
              <button key={type}
                onPointerDown={()=>type==='block'?btnBlock(true):btnAttack(type)}
                onPointerUp={()=>type==='block'&&btnBlock(false)}
                style={{padding:'7px 4px',borderRadius:9,border:`1px solid ${color}44`,background:`${color}18`,color,fontWeight:800,fontSize:10,cursor:'pointer',letterSpacing:0.5}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {u.mode==='survival'&&<p style={{color:'#9B59B6',fontSize:9,textAlign:'center',marginTop:6}}>Score: {u.score} · Round {u.survivalRound}</p>}
        <p style={{color:'#222',fontSize:8,textAlign:'center',marginTop:4}}>Keyboard: Z=Punch X=Jab C=Kick V=Uppercut B=Special S=Block</p>
      </div>
    </div>
  )
}
