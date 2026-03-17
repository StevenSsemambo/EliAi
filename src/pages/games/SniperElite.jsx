import { useState, useEffect, useRef } from 'react';

// ── Constants & Config ───────────────────────────────────────────────
const W = 800;
const H = 500;
const SCOPE_R = 130;

const TARGET_TYPES = [
  { type: 'static', icon: '👤', label: 'Guard', points: 100, size: 38, color: '#4b5563' },
  { type: 'running', icon: '🏃', label: 'Runner', points: 150, size: 34, color: '#ef4444', spd: 95 },
  { type: 'patrol', icon: '🚶', label: 'Patrol', points: 120, size: 38, color: '#eab308', spd: 48 },
  { type: 'peek', icon: '🕵️', label: 'Sniper', points: 220, size: 32, color: '#22c55e' },
  { type: 'boss', icon: '🪖', label: 'Boss', points: 350, size: 48, color: '#8b00ff', spd: 28, hp: 3 },
];

const RIFLE_STATS = [
  { name: 'M82 Bolt', magazine: 5, reloadTime: 2.8, sway: 7.5, accuracy: 0.98 },
  { name: 'M110 Semi', magazine: 10, reloadTime: 1.1, sway: 11, accuracy: 0.89 },
];

// ── Audio (much more realistic) ───────────────────────────────────────
const _ac = { ref: null as AudioContext | null };
function ac() {
  if (!_ac.ref) {
    try {
      _ac.ref = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {}
  }
  if (_ac.ref?.state === 'suspended') _ac.ref.resume();
  return _ac.ref;
}

function playShot() {
  const a = ac(); if (!a) return;
  // Main bang
  const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180;
  const g = a.createGain(); g.gain.value = 0;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
  o.connect(f); f.connect(g); g.connect(a.destination);
  const t = a.currentTime;
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(1.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.start(t); o.stop(t + 0.4);

  // Click + echo
  const noise = a.createBufferSource();
  const buf = a.createBuffer(1, a.sampleRate * 0.12, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;
  const ng = a.createGain(); ng.gain.value = 0.6;
  noise.connect(ng); ng.connect(a.destination);
  noise.start(t + 0.01);
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
function makeEnvironment(level: number) {
  const windSpeed = 1.8 + Math.random() * (level * 0.7);
  const windDir = Math.random() > 0.5 ? 1 : -1;
  const distance = 280 + level * 35;
  const rain = level > 4 && Math.random() > 0.4;
  const night = level > 6;
  return { windSpeed, windDir, distance, rain, night };
}

function makeTargets(level: number) {
  const count = Math.min(2 + Math.floor(level / 2), 6);
  return Array.from({ length: count }, (_, i) => {
    const typeIdx = Math.min(Math.floor(level / 2 + Math.random() * 2.2), TARGET_TYPES.length - 1);
    const t = TARGET_TYPES[typeIdx];
    const yPos = 195 + Math.random() * 75;
    const hp = t.hp || 1;
    return {
      id: i,
      ...t,
      x: 110 + Math.random() * (W - 220),
      y: yPos,
      vx: t.type === 'patrol' || t.type === 'boss'
        ? (i % 2 === 0 ? t.spd! : -t.spd!) 
        : t.type === 'running' ? t.spd! * (Math.random() < 0.5 ? 1 : -1) : 0,
      hp,
      maxHp: hp,
      alive: true,
      peekTimer: 0,
      peekInterval: 1.8 + Math.random() * 3.5,
      visible: t.type !== 'peek',
      hitFlash: 0,
      headshot: false,
    };
  });
}

// ── Main Component (fully improved) ──────────────────────────────────
export default function SniperElite({ levelData, onFinish }: { levelData?: { level: number }; onFinish?: () => void }) {
  const level = levelData?.level || 1;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  // Single source of truth (no constant re-renders)
  const gameRef = useRef({
    scoped: false,
    ammo: 5,
    maxAmmo: 5,
    score: 0,
    shots: 0,
    hits: 0,
    phase: 'playing' as 'playing' | 'replay' | 'victory' | 'gameover',
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
  });

  const scopePos = useRef({ x: W / 2, y: H / 2 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const breathHeld = useRef(false);
  const replayRef = useRef<any>(null);

  // ── Init ───────────────────────────────────────────────────────────
  function initGame(rifleIdx = 0) {
    const env = makeEnvironment(level);
    const targets = makeTargets(level);
    const rifle = RIFLE_STATS[Math.min(rifleIdx, RIFLE_STATS.length - 1)];

    stateRef.current = {
      env,
      targets,
      rifle,
      particles: [] as any[],
      bulletTrails: [] as any[],
      swayX: 0,
      swayY: 0,
      swayVX: 0.35,
      swayVY: 0.22,
      breathTimer: 0,
    };

    scopePos.current = { x: W / 2, y: H / 2 };

    gameRef.current = {
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
    };

    forceUpdate();
  }

  const [, forceUpdate] = useState(0); // only call when UI must change

  // ── Game Loop ──────────────────────────────────────────────────────
  useEffect(() => {
    initGame(0);
    lastRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - (lastRef.current || now)) / 1000, 0.05);
      lastRef.current = now;

      update(dt);
      draw();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current!);
  }, [level]);

  // ── Core Update ────────────────────────────────────────────────────
  function update(dt: number) {
    const s = stateRef.current;
    if (!s) return;
    const g = gameRef.current;
    if (g.phase !== 'playing') return;

    // Target movement
    for (const t of s.targets) {
      if (!t.alive) continue;
      if (t.hitFlash > 0) t.hitFlash -= dt;

      if (t.type === 'patrol' || t.type === 'boss' || t.type === 'running') {
        t.x += t.vx * dt;
        if (t.x < 60) { t.x = 60; t.vx *= -1; }
        if (t.x > W - 60) { t.x = W - 60; t.vx *= -1; }
      }
      if (t.type === 'peek') {
        t.peekTimer += dt;
        if (t.peekTimer > t.peekInterval) {
          t.visible = !t.visible;
          t.peekTimer = 0;
          t.peekInterval = t.visible ? 0.9 + Math.random() : 2.2 + Math.random() * 3.5;
        }
      }
    }

    // Scope sway
    if (g.scoped) {
      const amp = s.rifle.sway * (breathHeld.current ? 0.18 : 1);
      s.swayX += s.swayVX * dt * 2.8;
      s.swayY += s.swayVY * dt * 2.8;
      if (Math.abs(s.swayX) > amp) s.swayVX *= -1;
      if (Math.abs(s.swayY) > amp) s.swayVY *= -1;
    }

    // Breath hold
    if (breathHeld.current) {
      s.breathTimer += dt;
      const breath = Math.max(0, 1 - s.breathTimer / 3.8);
      g.breath = breath;
      if (breath <= 0) {
        breathHeld.current = false;
        s.breathTimer = 0;
      }
    } else if (s.breathTimer > 0) {
      s.breathTimer = Math.max(0, s.breathTimer - dt * 1.4);
      g.breath = Math.max(0, 1 - s.breathTimer / 3.8);
    }

    // Replay slow-mo
    if (replayRef.current) {
      const r = replayRef.current;
      r.progress += dt * 0.65;
      r.bullet.x += r.bullet.vx * dt * 0.65;
      r.bullet.y += r.bullet.vy * dt * 0.65;
      r.bullet.vy += (9.8 * g.distance / 420) * dt * 0.45;
      r.bullet.vx += g.wind.speed * g.wind.dir * dt * 0.35;

      if (r.progress > r.duration) {
        replayRef.current = null;
        g.phase = 'playing';
        forceUpdate();
      }
    }

    // Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.92; p.vy *= 0.92;
      p.life -= p.decay;
      if (p.life <= 0) s.particles.splice(i, 1);
    }

    // Trails fade
    for (let i = s.bulletTrails.length - 1; i >= 0; i--) {
      s.bulletTrails[i].alpha -= dt * 1.1;
      if (s.bulletTrails[i].alpha <= 0) s.bulletTrails.splice(i, 1);
    }

    // All targets dead?
    const alive = s.targets.filter((t: any) => t.alive);
    if (alive.length === 0 && g.targetsLeft > 0) {
      g.phase = 'victory';
      setTimeout(() => onFinish?.(), 2800);
      forceUpdate();
    }
  }

  // ── Shooting Logic (with headshot + recoil) ─────────────────────────
  function shoot() {
    const g = gameRef.current;
    const s = stateRef.current;
    if (!s || g.phase !== 'playing' || g.ammo <= 0) return;

    playShot();

    const bx = scopePos.current.x + s.swayX;
    const by = scopePos.current.y + s.swayY;

    // Ballistics
    const windDrift = s.env.windSpeed * s.env.windDir * (s.env.distance / 480) * 19;
    const bulletDrop = (s.env.distance / 380) * 15 * (breathHeld.current ? 0.45 : 1);
    const hitX = bx + windDrift;
    const hitY = by + bulletDrop;

    // Trail
    s.bulletTrails.push({ x1: bx, y1: by, x2: hitX, y2: hitY, alpha: 1 });

    // Recoil + muzzle
    scopePos.current.y -= 28; // kick up
    g.muzzleFlash = 0.18;

    // Hit detection
    let hitTarget: any = null;
    let isHeadshot = false;

    for (const t of s.targets) {
      if (!t.alive || !t.visible) continue;
      const dist = Math.hypot(hitX - t.x, hitY - t.y);
      if (dist < t.size) {
        hitTarget = t;
        // Headshot if hit is in top 35% of target
        if (hitY < t.y - t.size * 0.32) isHeadshot = true;
        break;
      }
    }

    let msg = '';
    let newScore = g.score;
    let newStreak = g.streak;
    let newHits = g.hits;

    if (hitTarget) {
      playShot(); // extra hit sound
      hitTarget.hitFlash = 0.35;
      hitTarget.hp -= 1;
      newHits++;

      if (hitTarget.hp <= 0) {
        hitTarget.alive = false;
        const streakBonus = newStreak > 1 ? newStreak * 45 : 0;
        const headBonus = isHeadshot ? 180 : 0;
        const distBonus = Math.round(s.env.distance / 9) * 6;
        const points = hitTarget.points + streakBonus + headBonus + distBonus;

        newScore += points;
        newStreak++;
        msg = isHeadshot 
          ? `🎯 HEADSHOT! +${points}` 
          : `💥 ${hitTarget.label} DOWN +${points}`;
        spawnParticles(hitX, hitY, isHeadshot ? '#fef08c' : '#f59e0b', 38, 6.5);
      } else {
        msg = '⚡ HIT!';
        newScore += 65;
        spawnParticles(hitX, hitY, '#94a3b8', 14, 3);
      }
    } else {
      playMiss();
      newStreak = 0;
      msg = Math.abs(bx - W / 2) < 12 ? '🌬 WIND GOT YOU' : '❌ MISS';
      spawnParticles(hitX, hitY, '#64748b', 11, 2.5);
    }

    // Start replay
    replayRef.current = {
      bullet: { x: bx, y: by, vx: (hitX - bx) * 1.9, vy: (hitY - by) * 1.9 },
      progress: 0,
      duration: 1.65,
      env: s.env,
    };

    const newAmmo = g.ammo - 1;
    g.ammo = newAmmo;
    g.shots++;
    g.score = newScore;
    g.streak = newStreak;
    g.highestStreak = Math.max(g.highestStreak, newStreak);
    g.hits = newHits;
    g.phase = 'replay';
    g.message = msg;

    // Auto reload
    if (newAmmo === 0) {
      playReload();
      setTimeout(() => {
        g.ammo = g.maxAmmo;
        g.message = '🔄 RELOADED';
        forceUpdate();
        setTimeout(() => { g.message = ''; forceUpdate(); }, 700);
      }, g.rifle.reloadTime * 1000);
    }

    forceUpdate();

    // Return to playing after replay
    setTimeout(() => {
      if (!replayRef.current) {
        g.phase = 'playing';
        g.message = '';
        forceUpdate();
      }
    }, 1950);
  }

  function spawnParticles(x: number, y: number, color: string, count: number, speed: number) {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      s.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2 - 1,
        life: 0.6 + Math.random() * 0.7,
        decay: 0.035 + Math.random() * 0.03,
        color,
        size: 2.5 + Math.random() * 3,
      });
    }
  }

  // ── Drawing (much richer graphics) ─────────────────────────────────
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const g = gameRef.current;
    const s = stateRef.current;
    if (!s) return;

    ctx.clearRect(0, 0, W, H);

    // Background sky
    const sky = ctx.createLinearGradient(0, 0, 0, 220);
    sky.addColorStop(0, g.night ? '#0a0f1f' : '#1e3a5f');
    sky.addColorStop(1, g.night ? '#1a2538' : '#4a7bb3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 220);

    // Hills / ground
    ctx.fillStyle = g.night ? '#0c150f' : '#1a3a1f';
    ctx.fillRect(0, 185, W, H - 185);

    // Rain
    if (g.rain) {
      ctx.strokeStyle = 'rgba(180,220,255,0.45)';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 55; i++) {
        const rx = (i * 29 + Date.now() * 0.07) % W;
        const ry = (Date.now() * 0.13 + i * 41) % (H + 100) - 50;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + g.wind.dir * 4, ry + 22);
        ctx.stroke();
      }
    }

    // Targets (drawn bodies + heads)
    for (const t of s.targets) {
      if (!t.alive || !t.visible) continue;

      const bob = t.type === 'static' ? 0 : Math.sin(Date.now() * 0.0035 + t.id) * 4;
      const tx = t.x;
      const ty = t.y + bob;

      ctx.save();
      if (t.hitFlash > 0) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 22;
      }

      // Body
      ctx.fillStyle = t.color;
      ctx.fillRect(tx - t.size * 0.38, ty - 8, t.size * 0.76, t.size * 1.1);

      // Head
      ctx.beginPath();
      ctx.arc(tx, ty - t.size * 0.45, t.size * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Helmet / cap for boss
      if (t.type === 'boss') {
        ctx.fillStyle = '#111';
        ctx.fillRect(tx - t.size * 0.45, ty - t.size * 0.82, t.size * 0.9, 12);
      }

      ctx.restore();
    }

    // Bullet trails
    for (const tr of s.bulletTrails) {
      ctx.save();
      ctx.globalAlpha = tr.alpha * 0.75;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(tr.x1, tr.y1);
      ctx.lineTo(tr.x2, tr.y2);
      ctx.stroke();
      ctx.restore();
    }

    // Replay bullet
    if (replayRef.current) {
      const rb = replayRef.current.bullet;
      ctx.save();
      ctx.shadowColor = '#fef08c';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#fef08c';
      ctx.beginPath();
      ctx.arc(rb.x, rb.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Scope (only when scoped)
    if (g.scoped) {
      const cx = scopePos.current.x + s.swayX;
      const cy = scopePos.current.y + s.swayY;

      // Vignette
      const vignette = ctx.createRadialGradient(cx, cy, SCOPE_R * 0.6, cx, cy, SCOPE_R * 1.35);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Scope ring
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, SCOPE_R, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, SCOPE_R - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Crosshair
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 38, cy);
      ctx.lineTo(cx + 38, cy);
      ctx.moveTo(cx, cy - 38);
      ctx.lineTo(cx, cy + 38);
      ctx.stroke();

      // Mil-dots
      ctx.fillStyle = '#f1f5f9';
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        ctx.beginPath();
        ctx.arc(cx + i * 19, cy, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + i * 19, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Wind & distance text inside scope
      ctx.fillStyle = 'rgba(163,230,187,0.9)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`WIND ${g.wind.speed.toFixed(1)}${g.wind.dir > 0 ? '→' : '←'}`, cx - SCOPE_R + 14, cy + SCOPE_R - 34);
      ctx.fillText(`DIST ${g.distance}m`, cx - SCOPE_R + 14, cy + SCOPE_R - 20);

      // Breath arc
      ctx.save();
      ctx.strokeStyle = g.breath > 0.35 ? '#22c55e' : '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, SCOPE_R - 9, Math.PI * 1.45, Math.PI * 1.45 + g.breath * Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();

      // Muzzle flash
      if (g.muzzleFlash > 0) {
        ctx.save();
        ctx.globalAlpha = g.muzzleFlash * 1.6;
        ctx.fillStyle = '#fef08c';
        ctx.shadowColor = '#fef08c';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(cx - 12, cy - 8, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        g.muzzleFlash -= 0.055; // will be clamped in next frame
      }
    }

    // Particles
    for (const p of s.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // HUD (React-managed)
    forceUpdate(); // only once per frame if needed - but we keep it light
  }

  // ── Pointer Controls (drag to aim) ─────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    const g = gameRef.current;
    if (!g.scoped) return;
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !gameRef.current.scoped) return;

    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;

    scopePos.current.x = Math.max(60, Math.min(W - 60, scopePos.current.x + dx * 1.05));
    scopePos.current.y = Math.max(80, Math.min(H - 80, scopePos.current.y + dy * 1.05));

    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // ── Render ─────────────────────────────────────────────────────────
  const g = gameRef.current;

  return (
    <div className="relative w-full max-w-[800px] mx-auto bg-[#0a0f1f] overflow-hidden rounded-2xl shadow-2xl border border-[#1e293b]">
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
      <div className="absolute top-4 left-4 right-4 flex justify-between text-white text-sm font-mono">
        <div>⭐ {g.score.toLocaleString()}</div>
        <div className="flex gap-6">
          <div>💨 {g.wind.speed.toFixed(1)} {g.wind.dir > 0 ? '→' : '←'}</div>
          <div>📏 {g.distance}m</div>
          {g.rain && <div>🌧 RAIN</div>}
          {g.night && <div>🌙 NIGHT</div>}
          {g.streak > 2 && <div>🔥 {g.streak}x</div>}
        </div>
        <div>🎯 {g.targetsLeft} LEFT</div>
      </div>

      {/* Ammo */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
        {Array.from({ length: g.maxAmmo }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-1.5 rounded transition-all ${i < g.ammo ? 'bg-orange-400' : 'bg-slate-700'}`}
          />
        ))}
      </div>

      {/* Message */}
      {g.message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-8 py-3 rounded-xl font-mono text-xl shadow-xl">
          {g.message}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => {
            const newScoped = !g.scoped;
            g.scoped = newScoped;
            forceUpdate();
          }}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
            g.scoped
              ? 'bg-blue-600 border-blue-400 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-300'
          }`}
        >
          🔭 {g.scoped ? 'UNSCOPE' : 'SCOPE IN'}
        </button>

        {g.scoped && (
          <>
            <button
              onPointerDown={() => {
                breathHeld.current = true;
                stateRef.current.breathTimer = 0;
              }}
              onPointerUp={() => { breathHeld.current = false; }}
              className="px-6 py-3 bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-500 text-emerald-400 rounded-xl font-bold text-sm transition-all active:scale-95"
            >
              💨 HOLD BREATH
            </button>

            <button
              onClick={shoot}
              disabled={g.ammo <= 0}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95"
            >
              🔥 FIRE
            </button>
          </>
        )}
      </div>

      {/* Victory Screen */}
      {g.phase === 'victory' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white">
          <div className="text-5xl mb-6">🎯 MISSION COMPLETE</div>
          <div className="text-3xl mb-8">SCORE: {g.score}</div>
          <div className="text-xl text-emerald-400">ACCURACY: {g.shots > 0 ? Math.round((g.hits / g.shots) * 100) : 0}%</div>
          <button
            onClick={() => initGame()}
            className="mt-12 px-10 py-4 bg-yellow-400 text-black font-bold text-lg rounded-2xl hover:bg-yellow-300 active:scale-95"
          >
            NEXT MISSION →
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-400 font-mono">
        DRAG to aim • HOLD BREATH • FIRE<br />
        Account for wind + drop
      </div>
    </div>
  );
}
