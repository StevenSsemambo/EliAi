import { useState, useEffect, useRef } from 'react';

// ── Constants & Config ───────────────────────────────────────────────
const W = 800;
const H = 500;
const SCOPE_R = 130;

const TARGET_TYPES = [
  { type: 'static', label: 'Guard', points: 100, size: 38, color: '#4b5563' },
  { type: 'running', label: 'Runner', points: 150, size: 34, color: '#ef4444', spd: 95 },
  { type: 'patrol', label: 'Patrol', points: 120, size: 38, color: '#eab308', spd: 48 },
  { type: 'peek', label: 'Sniper', points: 220, size: 32, color: '#22c55e' },
  { type: 'boss', label: 'Boss', points: 350, size: 48, color: '#8b00ff', spd: 28, hp: 3 },
  { type: 'civilian', label: 'Civilian', points: -500, size: 36, color: '#22c55e', spd: 35 }, // DANGER
];

const RIFLE_STATS = [
  { name: 'M82 Bolt', magazine: 5, reloadTime: 2.8, sway: 7.5, accuracy: 0.98, color: '#4b5563', suppressor: false, thermal: false, power: 1 },
  { name: 'M110 Semi', magazine: 10, reloadTime: 1.1, sway: 11, accuracy: 0.89, color: '#ef4444', suppressor: false, thermal: false, power: 1.2 },
  { name: 'DSR-1 Suppressed', magazine: 6, reloadTime: 2.2, sway: 6, accuracy: 0.97, color: '#64748b', suppressor: true, thermal: false, power: 1.1 },
  { name: 'AX50 Anti-Mat', magazine: 5, reloadTime: 3.1, sway: 9, accuracy: 0.99, color: '#8b00ff', suppressor: false, thermal: false, power: 2.5 },
  { name: 'M107 Thermal', magazine: 8, reloadTime: 1.8, sway: 8, accuracy: 0.95, color: '#22c55e', suppressor: true, thermal: true, power: 1.4 },
];

const MISSIONS = [
  { id: 1, title: "FIRST CONTRACT", objective: "Clear the compound. NO CIVILIANS.", maxCivilians: 1, reward: 800 },
  { id: 2, title: "NIGHT RAID", objective: "Headshot the boss. 100% accuracy.", maxCivilians: 2, reward: 1200 },
  { id: 3, title: "HOSTAGE RESCUE", objective: "Don't hit any civilians.", maxCivilians: 3, reward: 1500 },
  { id: 4, title: "THE TRAITOR", objective: "One-shot the boss through 3 guards.", maxCivilians: 1, reward: 2000 },
];

// ── Audio (enhanced with gore sounds) ───────────────────────────────────────
const _ac = { ref: null };

function ac() {
  if (!_ac.ref) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      _ac.ref = new AudioContextClass();
    } catch {}
  }
  if (_ac.ref?.state === 'suspended') _ac.ref.resume();
  return _ac.ref;
}

function playShot() {
  const a = ac(); if (!a) return;
  // Big gunshot
  const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 160;
  const g = a.createGain(); g.gain.value = 0;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
  o.connect(f); f.connect(g); g.connect(a.destination);
  const t = a.currentTime;
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(1.4, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.start(t); o.stop(t + 0.5);

  // Echo + shell click
  const noise = a.createBufferSource();
  const buf = a.createBuffer(1, a.sampleRate * 0.15, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;
  const ng = a.createGain(); ng.gain.value = 0.65;
  noise.connect(ng); ng.connect(a.destination);
  noise.start(t + 0.015);
}

function playGoreHit() {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = 120;
  const g = a.createGain();
  o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.8, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.4);
  o.start(); o.stop(a.currentTime + 0.4);
}

function playReload() {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(320, a.currentTime);
  const g = a.createGain();
  o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.4, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.6);
  o.start(); o.stop(a.currentTime + 0.6);
}

function playMiss() {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = 280;
  const g = a.createGain();
  o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.3, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
  o.start(); o.stop(a.currentTime + 0.2);
}

// ── Environment & Targets ────────────────────────────────────────────
function makeEnvironment(level) {
  const windSpeed = 1.8 + Math.random() * (level * 0.7);
  const windDir = Math.random() > 0.5 ? 1 : -1;
  const distance = 280 + level * 35;
  const rain = level > 3 && Math.random() > 0.35;
  const night = level > 5;
  return { windSpeed, windDir, distance, rain, night };
}

function makeTargets(level) {
  const mission = MISSIONS[Math.min(level - 1, MISSIONS.length - 1)] || MISSIONS[0];
  const count = Math.min(3 + Math.floor(level / 2), 7);
  const civCount = Math.floor(Math.random() * mission.maxCivilians) + 1;

  const targets = [];
  for (let i = 0; i < count; i++) {
    const isCivilian = i < civCount;
    const typeIdx = isCivilian ? 5 : Math.min(Math.floor(level / 2 + Math.random() * 2.5), 4);
    const t = TARGET_TYPES[typeIdx];
    const yPos = 195 + Math.random() * 75;

    targets.push({
      id: i,
      ...t,
      x: 110 + Math.random() * (W - 220),
      y: yPos,
      vx: t.spd ? (i % 2 === 0 ? t.spd : -t.spd) * (t.type === 'running' ? 1.4 : 1) : 0,
      hp: t.hp || 1,
      maxHp: t.hp || 1,
      alive: true,
      visible: t.type !== 'peek',
      peekTimer: 0,
      peekInterval: 1.8 + Math.random() * 3.5,
      hitFlash: 0,
      ragdoll: null, // will be set on death
      bloodStain: 0,
    });
  }
  return targets;
}

// ── Main Component (ULTIMATE VERSION) ──────────────────────────────────
export default function SniperElite({ levelData, onFinish }) {
  const level = levelData?.level || 1;
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  const gameRef = useRef({
    scoped: false,
    ammo: 5,
    maxAmmo: 5,
    score: 0,
    shots: 0,
    hits: 0,
    phase: 'playing',
    wind: { speed: 1, dir: 1 },
    distance: 300,
    rifle: RIFLE_STATS[0],
    breath: 1,
    targetsLeft: 0,
    rain: false,
    night: false,
    message: '',
    streak: 0,
    highestStreak: 0,
    muzzleFlash: 0,
    cameraShake: 0,
    shellCasings: [],
    bloodSprays: [],
    mission: MISSIONS[0],
    ghostMode: false,
    dailySeed: null,
  });

  const scopePos = useRef({ x: W / 2, y: H / 2 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const breathHeld = useRef(false);
  const replayRef = useRef(null);
  const killCamRef = useRef(null); // new: per-kill slow-mo gore cam

  const [, forceUpdate] = useState(0);
  const [showLoadout, setShowLoadout] = useState(false);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showGhostButton, setShowGhostButton] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────
  function initGame(rifleIdx = 0, isDaily = false) {
    const env = makeEnvironment(level);
    const targets = makeTargets(level);
    const rifle = RIFLE_STATS[Math.min(rifleIdx, RIFLE_STATS.length - 1)];

    stateRef.current = {
      env,
      targets,
      rifle,
      particles: [],
      bulletTrails: [],
      bloodStains: [],
      swayX: 0,
      swayY: 0,
      swayVX: 0.35,
      swayVY: 0.22,
      breathTimer: 0,
    };

    scopePos.current = { x: W / 2, y: H / 2 };
    gameRef.current = {
      ...gameRef.current,
      scoped: false,
      ammo: rifle.magazine,
      maxAmmo: rifle.magazine,
      score: 0,
      shots: 0,
      hits: 0,
      phase: 'playing',
      wind: { speed: Math.abs(env.windSpeed), dir: env.windDir },
      distance: env.distance,
      rifle,
      breath: 1,
      targetsLeft: targets.length,
      rain: env.rain,
      night: env.night,
      message: '',
      streak: 0,
      highestStreak: 0,
      muzzleFlash: 0,
      cameraShake: 0,
      shellCasings: [],
      bloodSprays: [],
      mission: MISSIONS[Math.min(level - 1, MISSIONS.length - 1)],
      ghostMode: false,
      dailySeed: isDaily ? Date.now() : null,
    };
    forceUpdate();
    setShowBriefing(true);
  }

  // ── Game Loop ──────────────────────────────────────────────────────
  useEffect(() => {
    initGame(0);
    lastRef.current = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05);
      lastRef.current = now;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [level]);

  // ── Core Update (now with ragdoll, shells, blood, shake) ─────────────
  function update(dt) {
    const s = stateRef.current;
    if (!s) return;
    const g = gameRef.current;
    if (g.phase !== 'playing' && !killCamRef.current) return;

    // Camera shake decay
    if (g.cameraShake > 0) g.cameraShake *= 0.88;

    // Target movement + ragdoll physics
    for (const t of s.targets) {
      if (!t.alive) {
        if (t.ragdoll) {
          t.ragdoll.vy += 18 * dt;
          t.ragdoll.x += t.ragdoll.vx * dt;
          t.ragdoll.y += t.ragdoll.vy * dt;
          t.ragdoll.angle += t.ragdoll.angularVel * dt;
          t.ragdoll.angularVel *= 0.96;
          if (t.ragdoll.y > H - 40) {
            t.ragdoll.y = H - 40;
            t.ragdoll.vy = 0;
            t.ragdoll.angularVel *= 0.4;
          }
        }
        continue;
      }

      if (t.hitFlash > 0) t.hitFlash -= dt;

      if (t.type === 'patrol' || t.type === 'boss' || t.type === 'running' || t.type === 'civilian') {
        t.x += t.vx * dt;
        if (t.x < 60 || t.x > W - 60) t.vx *= -1;
      }

      if (t.type === 'peek') {
        t.peekTimer += dt;
        if (t.peekTimer > t.peekInterval) {
          t.visible = !t.visible;
          t.peekTimer = 0;
          t.peekInterval = t.visible ? 0.8 + Math.random() : 2.5 + Math.random() * 4;
        }
      }
    }

    // Scope sway + breath
    if (g.scoped) {
      const amp = g.rifle.sway * (breathHeld.current ? 0.15 : 1);
      s.swayX += s.swayVX * dt * 3.2;
      s.swayY += s.swayVY * dt * 3.2;
      if (Math.abs(s.swayX) > amp) s.swayVX *= -1;
      if (Math.abs(s.swayY) > amp) s.swayVY *= -1;
    }

    if (breathHeld.current) {
      s.breathTimer += dt;
      g.breath = Math.max(0, 1 - s.breathTimer / 3.8);
      if (g.breath <= 0) breathHeld.current = false;
    } else if (s.breathTimer > 0) {
      s.breathTimer = Math.max(0, s.breathTimer - dt * 1.6);
      g.breath = Math.max(0, 1 - s.breathTimer / 3.8);
    }

    // Shell casings physics
    for (let i = g.shellCasings.length - 1; i >= 0; i--) {
      const c = g.shellCasings[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 220 * dt;
      c.angle += c.spin * dt;
      c.life -= dt;
      if (c.life <= 0) g.shellCasings.splice(i, 1);
    }

    // Blood sprays
    for (let i = g.bloodSprays.length - 1; i >= 0; i--) {
      const b = g.bloodSprays[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 140 * dt;
      b.life -= dt * 1.8;
      if (b.life <= 0) g.bloodSprays.splice(i, 1);
    }

    // Particles & trails
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.9; p.vy *= 0.9;
      p.life -= p.decay;
      if (p.life <= 0) s.particles.splice(i, 1);
    }
    for (let i = s.bulletTrails.length - 1; i >= 0; i--) {
      s.bulletTrails[i].alpha -= dt * 1.3;
      if (s.bulletTrails[i].alpha <= 0) s.bulletTrails.splice(i, 1);
    }

    // Victory check
    const alive = s.targets.filter(t => t.alive);
    if (alive.length === 0 && g.targetsLeft > 0) {
      const accuracy = g.shots > 0 ? g.hits / g.shots : 0;
      g.phase = 'victory';
      if (accuracy === 1 && g.streak >= 5) {
        g.ghostMode = true;
        setShowGhostButton(true);
      }
      setTimeout(() => onFinish?.(), 2200);
      forceUpdate();
    }
  }

  // ── Shooting (now with gore, ragdoll, fatality, shake) ───────────────
  function shoot() {
    const g = gameRef.current;
    const s = stateRef.current;
    if (!s || g.phase !== 'playing' || g.ammo <= 0) return;

    playShot();
    const bx = scopePos.current.x + s.swayX + (Math.random() - 0.5) * 3;
    const by = scopePos.current.y + s.swayY + (Math.random() - 0.5) * 3;

    const windDrift = s.env.windSpeed * s.env.windDir * (s.env.distance / 420) * 22;
    const bulletDrop = (s.env.distance / 360) * 19 * (breathHeld.current ? 0.35 : 1);
    const hitX = bx + windDrift;
    const hitY = by + bulletDrop;

    s.bulletTrails.push({ x1: bx, y1: by, x2: hitX, y2: hitY, alpha: 1 });

    // Recoil + muzzle + shake
    scopePos.current.y -= 32;
    g.muzzleFlash = 0.22;
    g.cameraShake = g.rifle.power * 4.5;

    // Eject shell
    g.shellCasings.push({
      x: scopePos.current.x - 25,
      y: scopePos.current.y + 12,
      vx: -80 + Math.random() * 40,
      vy: -120 - Math.random() * 80,
      angle: 0,
      spin: (Math.random() - 0.5) * 25,
      life: 1.8,
    });

    let hitTarget = null;
    let isHeadshot = false;
    let isCivilian = false;

    for (const t of s.targets) {
      if (!t.alive || !t.visible) continue;
      const dist = Math.hypot(hitX - t.x, hitY - t.y);
      if (dist < t.size * 1.1) {
        hitTarget = t;
        if (hitY < t.y - t.size * 0.38) isHeadshot = true;
        isCivilian = t.type === 'civilian';
        break;
      }
    }

    let msg = '';
    let newScore = g.score;
    let newStreak = g.streak;

    if (hitTarget) {
      playGoreHit();
      hitTarget.hitFlash = 0.45;
      hitTarget.hp -= 1;
      g.hits++;

      if (isCivilian) {
        g.phase = 'gameover';
        msg = '💀 CIVILIAN DOWN — MISSION FAILED';
        forceUpdate();
        return;
      }

      if (hitTarget.hp <= 0) {
        hitTarget.alive = false;
        // RAGDOLL + BLOOD EXPLOSION
        hitTarget.ragdoll = {
          x: hitTarget.x,
          y: hitTarget.y,
          vx: (Math.random() - 0.5) * 60,
          vy: -80,
          angle: 0,
          angularVel: isHeadshot ? (Math.random() - 0.5) * 16 : (Math.random() - 0.5) * 9,
        };

        // Massive blood
        for (let i = 0; i < 42; i++) {
          g.bloodSprays.push({
            x: hitX,
            y: hitY,
            vx: (Math.random() - 0.5) * (isHeadshot ? 380 : 240),
            vy: (Math.random() - 0.5) * (isHeadshot ? 260 : 180) - 90,
            life: 0.9 + Math.random() * 0.6,
            size: 4 + Math.random() * 7,
          });
        }
        // Ground stain
        s.bloodStains.push({ x: hitX, y: hitY + 28, size: isHeadshot ? 68 : 42, alpha: 0.95 });

        const streakBonus = newStreak > 1 ? newStreak * 55 : 0;
        const headBonus = isHeadshot ? 240 : 0;
        const distBonus = Math.round(g.distance / 8) * 8;
        const points = hitTarget.points + streakBonus + headBonus + distBonus;
        newScore += points;
        newStreak++;

        msg = isHeadshot ? `☠️ FATALITY! +${points}` : `💥 ${hitTarget.label} TERMINATED +${points}`;

        // Kill cam (slow-mo gore replay)
        killCamRef.current = {
          progress: 0,
          duration: 1.4,
          hitX, hitY,
          isHeadshot,
        };
      } else {
        msg = '⚡ CRITICAL HIT!';
        newScore += 75;
      }
    } else {
      playMiss();
      newStreak = 0;
      msg = Math.abs(bx - W / 2) < 15 ? '🌬 WIND PUNISHED YOU' : '❌ MISS';
    }

    replayRef.current = {
      bullet: { x: bx, y: by, vx: (hitX - bx) * 1.85, vy: (hitY - by) * 1.85 },
      progress: 0,
      duration: 1.55,
    };

    g.ammo--;
    g.shots++;
    g.score = newScore;
    g.streak = newStreak;
    g.highestStreak = Math.max(g.highestStreak, newStreak);
    g.phase = 'replay';
    g.message = msg;

    if (g.ammo === 0) {
      playReload();
      setTimeout(() => {
        g.ammo = g.maxAmmo;
        g.message = '🔄 RELOADED';
        forceUpdate();
      }, g.rifle.reloadTime * 1000);
    }

    forceUpdate();

    setTimeout(() => {
      if (!replayRef.current && !killCamRef.current) {
        g.phase = 'playing';
        g.message = '';
        forceUpdate();
      }
    }, 1800);
  }

  function spawnParticles(x, y, color, count, speed) {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      s.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * speed * 2.4,
        vy: (Math.random() - 0.5) * speed * 2.4 - 30,
        life: 0.7 + Math.random() * 0.6,
        decay: 0.04,
        color,
      });
    }
  }

  // ── Drawing (best possible Canvas graphics + motion) ─────────────────
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    const s = stateRef.current;
    if (!s) return;

    const shakeX = (Math.random() - 0.5) * g.cameraShake * 1.6;
    const shakeY = (Math.random() - 0.5) * g.cameraShake * 1.2;

    ctx.clearRect(0, 0, W, H);

    // Sky + ground
    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, g.night ? '#0a0f1f' : '#1e3a5f');
    sky.addColorStop(1, g.night ? '#1a2538' : '#4a7bb3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 240);

    ctx.fillStyle = g.night ? '#0c150f' : '#1a3a1f';
    ctx.fillRect(0, 185, W, H - 185);

    // Rain
    if (g.rain) {
      ctx.strokeStyle = 'rgba(180,220,255,0.55)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 70; i++) {
        const rx = (i * 23 + Date.now() * 0.09) % W;
        const ry = (Date.now() * 0.17 + i * 37) % (H + 120) - 60;
        ctx.beginPath();
        ctx.moveTo(rx + shakeX, ry + shakeY);
        ctx.lineTo(rx + g.wind.dir * 7 + shakeX, ry + 32 + shakeY);
        ctx.stroke();
      }
    }

    // Blood stains on ground
    for (const b of s.bloodStains) {
      ctx.save();
      ctx.globalAlpha = b.alpha * 0.75;
      ctx.fillStyle = '#4a0000';
      ctx.beginPath();
      ctx.ellipse(b.x + shakeX, b.y + shakeY, b.size * 1.1, b.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Targets (gory drawing)
    for (const t of s.targets) {
      if (!t.visible) continue;
      const bob = t.type === 'static' ? 0 : Math.sin(Date.now() * 0.0038 + t.id) * 5;
      let tx = t.x + shakeX;
      let ty = t.y + bob + shakeY;

      ctx.save();

      if (t.ragdoll) {
        ctx.translate(t.ragdoll.x + shakeX, t.ragdoll.y + shakeY);
        ctx.rotate(t.ragdoll.angle * Math.PI / 180);
        tx = 0;
        ty = 0;
      }

      if (t.hitFlash > 0) {
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 35;
      }

      // Body (tactical vest look)
      ctx.fillStyle = t.color;
      ctx.fillRect(tx - t.size * 0.42, ty - 12, t.size * 0.84, t.size * 1.25);

      // Arms
      ctx.fillStyle = '#2a2f38';
      ctx.fillRect(tx - t.size * 0.55, ty - 6, t.size * 0.22, t.size * 0.75);
      ctx.fillRect(tx + t.size * 0.33, ty - 6, t.size * 0.22, t.size * 0.75);

      // Head (with helmet for boss)
      ctx.fillStyle = '#2c2c2c';
      ctx.beginPath();
      ctx.arc(tx, ty - t.size * 0.48, t.size * 0.39, 0, Math.PI * 2);
      ctx.fill();

      if (t.type === 'boss') {
        ctx.fillStyle = '#111';
        ctx.fillRect(tx - t.size * 0.48, ty - t.size * 0.88, t.size * 0.96, 14);
      }

      // Blood on body if damaged
      if (t.hp < t.maxHp) {
        ctx.fillStyle = '#4a0000';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(tx - t.size * 0.3, ty - 8, t.size * 0.45, 12);
      }

      ctx.restore();
    }

    // Bullet trails
    for (const tr of s.bulletTrails) {
      ctx.save();
      ctx.globalAlpha = tr.alpha * 0.8;
      ctx.strokeStyle = '#fef08c';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(tr.x1 + shakeX, tr.y1 + shakeY);
      ctx.lineTo(tr.x2 + shakeX, tr.y2 + shakeY);
      ctx.stroke();
      ctx.restore();
    }

    // Replay bullet + kill cam bullet
    if (replayRef.current || killCamRef.current) {
      const rb = (replayRef.current || killCamRef.current).bullet || { x: 0, y: 0 };
      ctx.save();
      ctx.shadowColor = '#fef08c';
      ctx.shadowBlur = 32;
      ctx.fillStyle = '#fef08c';
      ctx.beginPath();
      ctx.arc(rb.x + shakeX, rb.y + shakeY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Shell casings
    for (const c of g.shellCasings) {
      ctx.save();
      ctx.translate(c.x + shakeX, c.y + shakeY);
      ctx.rotate(c.angle * Math.PI / 180);
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(-4, -2, 9, 4);
      ctx.restore();
    }

    // Blood sprays (gore)
    ctx.fillStyle = '#4a0000';
    for (const b of g.bloodSprays) {
      ctx.globalAlpha = b.life * 0.9;
      ctx.beginPath();
      ctx.arc(b.x + shakeX, b.y + shakeY, b.size * b.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Particles
    for (const p of s.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x + shakeX - 2, p.y + shakeY - 2, 4, 4);
      ctx.restore();
    }

    // SCOPE
    if (g.scoped) {
      const cx = scopePos.current.x + s.swayX + shakeX;
      const cy = scopePos.current.y + s.swayY + shakeY;

      // Vignette + chromatic edge
      const vignette = ctx.createRadialGradient(cx, cy, SCOPE_R * 0.55, cx, cy, SCOPE_R * 1.45);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.8, 'rgba(0,0,0,0.85)');
      vignette.addColorStop(1, 'rgba(20,0,0,0.95)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Scope ring + glass reflection
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(cx, cy, SCOPE_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, SCOPE_R - 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Crosshair + mil-dots
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 42, cy); ctx.lineTo(cx + 42, cy);
      ctx.moveTo(cx, cy - 42); ctx.lineTo(cx, cy + 42);
      ctx.stroke();

      ctx.fillStyle = '#f1f5f9';
      for (let i = -4; i <= 4; i++) {
        if (i === 0) continue;
        ctx.beginPath();
        ctx.arc(cx + i * 18, cy, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + i * 18, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // HUD inside scope
      ctx.fillStyle = 'rgba(163,230,187,0.95)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`WIND ${g.wind.speed.toFixed(1)}${g.wind.dir > 0 ? '→' : '←'}`, cx - SCOPE_R + 18, cy + SCOPE_R - 38);
      ctx.fillText(`DIST ${g.distance}m`, cx - SCOPE_R + 18, cy + SCOPE_R - 22);
      ctx.fillText(`RFL ${g.rifle.name.slice(0,6)}`, cx - SCOPE_R + 18, cy + SCOPE_R - 6);

      // Breath arc
      ctx.save();
      ctx.strokeStyle = g.breath > 0.4 ? '#22c55e' : '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, SCOPE_R - 11, Math.PI * 1.4, Math.PI * 1.4 + g.breath * Math.PI * 2.1);
      ctx.stroke();
      ctx.restore();

      // Muzzle flash
      if (g.muzzleFlash > 0) {
        ctx.save();
        ctx.globalAlpha = g.muzzleFlash * 1.8;
        ctx.fillStyle = '#fef08c';
        ctx.shadowColor = '#fef08c';
        ctx.shadowBlur = 55;
        ctx.beginPath();
        ctx.arc(cx - 18, cy - 10, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        g.muzzleFlash -= 0.065;
      }
    }

    // Kill cam overlay text
    if (killCamRef.current) {
      const kc = killCamRef.current;
      kc.progress += 0.016;
      if (kc.progress > kc.duration) killCamRef.current = null;
    }
  }

  // ── Pointer Controls ───────────────────────────────────────────────
  const handlePointerDown = (e) => {
    const g = gameRef.current;
    if (!g.scoped) return;
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || !gameRef.current.scoped) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    scopePos.current.x = Math.max(50, Math.min(W - 50, scopePos.current.x + dx * 1.08));
    scopePos.current.y = Math.max(70, Math.min(H - 70, scopePos.current.y + dy * 1.08));
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => { isDragging.current = false; };

  // ── Render UI ───────────────────────────────────────────────────────
  const g = gameRef.current;

  return (
    <div className="relative w-full max-w-[800px] mx-auto bg-[#0a0f1f] overflow-hidden rounded-3xl shadow-2xl border border-[#1e293b]">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between text-white text-sm font-mono tracking-widest">
        <div>⭐ {g.score.toLocaleString()}</div>
        <div className="flex gap-6">
          <div>💨 {g.wind.speed.toFixed(1)} {g.wind.dir > 0 ? '→' : '←'}</div>
          <div>📏 {g.distance}m</div>
          {g.rain && <div>🌧 RAIN</div>}
          {g.night && <div>🌙 NIGHT</div>}
          {g.streak > 3 && <div>🔥 {g.streak}x FATAL</div>}
        </div>
        <div>🎯 {g.targetsLeft} LEFT</div>
      </div>

      {/* Ammo */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {Array.from({ length: g.maxAmmo }).map((_, i) => (
          <div key={i} className={`w-6 h-1.5 rounded transition-all duration-200 ${i < g.ammo ? 'bg-orange-400 shadow-lg' : 'bg-slate-700'}`} />
        ))}
      </div>

      {/* Message */}
      {g.message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-black/80 text-white px-10 py-4 rounded-2xl font-mono text-2xl shadow-2xl border border-red-500">
          {g.message}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => { g.scoped = !g.scoped; forceUpdate(); }}
          className={`px-7 py-3 rounded-2xl font-bold text-sm border-2 transition-all ${g.scoped ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
        >
          🔭 {g.scoped ? 'UNSCOPE' : 'SCOPE IN'}
        </button>

        {g.scoped && (
          <>
            <button
              onPointerDown={() => { breathHeld.current = true; stateRef.current.breathTimer = 0; }}
              onPointerUp={() => { breathHeld.current = false; }}
              className="px-7 py-3 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400 text-emerald-300 rounded-2xl font-bold text-sm active:scale-95"
            >
              💨 HOLD BREATH
            </button>
            <button
              onClick={shoot}
              disabled={g.ammo <= 0}
              className="px-10 py-5 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all"
            >
              🔥 FIRE
            </button>
          </>
        )}

        <button
          onClick={() => setShowLoadout(true)}
          className="px-6 py-2 bg-slate-800 border border-slate-500 text-slate-300 rounded-xl text-xs font-bold"
        >
          🔫 LOADOUT
        </button>
      </div>

      {/* Mission Briefing */}
      {showBriefing && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-white z-50">
          <div className="text-4xl mb-3 font-black tracking-widest">{g.mission.title}</div>
          <div className="text-xl mb-8 text-center max-w-xs">{g.mission.objective}</div>
          <button
            onClick={() => setShowBriefing(false)}
            className="px-12 py-4 bg-red-600 text-white font-bold text-lg rounded-2xl hover:bg-red-700 active:scale-95"
          >
            BEGIN MISSION
          </button>
        </div>
      )}

      {/* Loadout Modal */}
      {showLoadout && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-[#111827] p-8 rounded-3xl border border-slate-700 max-w-md w-full">
            <div className="text-2xl mb-6 text-center font-bold">RIFLE LOADOUT</div>
            <div className="grid grid-cols-1 gap-3">
              {RIFLE_STATS.map((rifle, i) => (
                <button
                  key={i}
                  onClick={() => {
                    g.rifle = rifle;
                    initGame(i);
                    setShowLoadout(false);
                  }}
                  className={`p-4 rounded-2xl flex justify-between items-center border transition-all ${g.rifle.name === rifle.name ? 'border-red-500 bg-red-950/60' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <div>
                    <div className="font-bold">{rifle.name}</div>
                    <div className="text-xs text-slate-400">{rifle.magazine}rd • {rifle.suppressor ? 'SUPPRESSED' : ''} {rifle.thermal ? 'THERMAL' : ''}</div>
                  </div>
                  <div className="text-red-400 text-xl">→</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowLoadout(false)} className="mt-6 w-full py-3 text-slate-400">CLOSE</button>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {g.phase === 'victory' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-white">
          <div className="text-6xl mb-4">☠️ MISSION COMPLETE</div>
          <div className="text-4xl mb-6">SCORE: {g.score}</div>
          <div className="text-2xl mb-8">ACCURACY: {g.shots > 0 ? Math.round((g.hits / g.shots) * 100) : 0}%</div>
          
          {showGhostButton && (
            <button
              onClick={() => {
                g.ghostMode = true;
                replayRef.current = null;
                killCamRef.current = null;
                g.phase = 'playing';
                forceUpdate();
              }}
              className="mb-6 px-8 py-3 bg-purple-600 text-white rounded-2xl text-lg font-bold hover:bg-purple-700"
            >
              👻 ENTER GHOST MODE (SLOW-MO)
            </button>
          )}

          <button
            onClick={() => { initGame(0); setShowGhostButton(false); }}
            className="px-12 py-4 bg-yellow-400 text-black font-bold text-lg rounded-2xl hover:bg-yellow-300"
          >
            NEXT MISSION →
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 font-mono leading-tight">
        DRAG TO AIM • HOLD BREATH FOR STABILITY<br />
        HEADSHOTS = FATALITY • AVOID CIVILIANS
      </div>
    </div>
  );
}
