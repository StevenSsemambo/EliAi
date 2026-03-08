import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'
import { GAMES, getUnlockStatus } from '../utils/gameUnlocks.js'
import Navbar from '../components/Navbar.jsx'

// ── Starfield background ─────────────────────────────────────────
function Starfield() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    c.width = c.offsetWidth; c.height = c.offsetHeight
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 1.5, a: Math.random(), s: 0.003 + Math.random() * 0.005
    }))
    let raf
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height)
      stars.forEach(s => {
        s.a += s.s; if (s.a > 1 || s.a < 0) s.s *= -1
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,220,255,${s.a})`; ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

// ── Orbital ring decoration ──────────────────────────────────────
function OrbitRing({ size, duration, color, delay = 0 }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
      <div style={{
        width: size, height: size, border: `1px solid ${color}`,
        borderRadius: '50%', opacity: 0.15,
        animation: `spin ${duration}s linear infinite`,
        animationDelay: `${delay}s`
      }} />
    </div>
  )
}

// ── Progress bar toward next unlock ─────────────────────────────
function UnlockBar({ label, current, required, color }) {
  const pct = Math.min(100, Math.round((current / required) * 100))
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-xs mb-0.5">
        <span style={{ color: '#94A3B8' }}>{label}</span>
        <span style={{ color: pct >= 100 ? '#4ADE80' : color }}>{current}/{required}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1A2035' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: pct >= 100 ? '#4ADE80' : color }} />
      </div>
    </div>
  )
}

// ── Single game card ─────────────────────────────────────────────
function GameCard({ game, unlockedLevels, highScores, stats, onPlay }) {
  const [expanded, setExpanded] = useState(false)
  const maxUnlocked = unlockedLevels.length > 0 ? Math.max(...unlockedLevels) : 0
  const nextLevel = game.levels.find(l => !unlockedLevels.includes(l.level))
  const totalLevels = game.levels.length
  const pctUnlocked = Math.round((maxUnlocked / totalLevels) * 100)

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{
      background: 'linear-gradient(135deg, #0F1629 0%, #131829 100%)',
      border: `1px solid ${maxUnlocked > 0 ? game.color + '55' : '#1A2035'}`,
      boxShadow: maxUnlocked > 0 ? `0 0 20px ${game.glow}` : 'none'
    }}>
      {/* Header */}
      <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 relative"
          style={{ background: maxUnlocked > 0 ? game.color + '22' : '#0C0F1A', border: `1px solid ${maxUnlocked > 0 ? game.color : '#252D45'}` }}>
          <span style={{ filter: maxUnlocked === 0 ? 'grayscale(1) opacity(0.4)' : 'none' }}>{game.icon}</span>
          {maxUnlocked === 0 && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <span className="text-base">🔒</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-bold text-base">{game.name}</span>
            {maxUnlocked > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: game.color + '22', color: game.color }}>
                Lvl {maxUnlocked}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs leading-tight mb-1.5">{game.description}</p>
          {game.cogSkill && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-2 font-semibold"
              style={{ background:`${game.color}15`, color:game.color, border:`1px solid ${game.color}30` }}>
              🧠 {game.cogSkill}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1A2035' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pctUnlocked}%`, background: game.color }} />
            </div>
            <span className="text-xs font-bold" style={{ color: game.color }}>
              {maxUnlocked}/{totalLevels}
            </span>
          </div>
        </div>
        <span className="text-slate-600 text-lg">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded level list */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#1A2035' }}>
          {/* Next unlock progress */}
          {nextLevel && (
            <div className="mt-3 mb-4 p-3 rounded-xl" style={{ background: '#0C0F1A', border: '1px solid #1A2035' }}>
              <p className="text-xs font-bold mb-2" style={{ color: game.color }}>
                🔓 Next: {nextLevel.name} (Level {nextLevel.level})
              </p>
              <UnlockBar label="Lessons" current={stats.lessonsCompleted} required={nextLevel.req.lessons} color={game.color} />
              {nextLevel.req.avgScore > 0 && (
                <UnlockBar label="Avg Quiz Score" current={stats.avgScore} required={nextLevel.req.avgScore} color={game.color} />
              )}
              {nextLevel.req.exams > 0 && (
                <UnlockBar label="Exams Passed" current={stats.examsCompleted} required={nextLevel.req.exams} color={game.color} />
              )}
            </div>
          )}

          {/* Level grid */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {game.levels.map(lvl => {
              const unlocked = unlockedLevels.includes(lvl.level)
              const hs = highScores[lvl.level]
              return (
                <button key={lvl.level}
                  onClick={() => unlocked && onPlay(game, lvl)}
                  disabled={!unlocked}
                  className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all active:scale-95"
                  style={{
                    background: unlocked ? game.color + '18' : '#0C0F1A',
                    border: `1px solid ${unlocked ? game.color + '55' : '#1A2035'}`,
                    opacity: unlocked ? 1 : 0.5
                  }}>
                  <span className="text-base">{unlocked ? (hs ? '⭐' : '▶') : '🔒'}</span>
                  <span className="text-xs font-bold" style={{ color: unlocked ? game.color : '#3A4560' }}>
                    L{lvl.level}
                  </span>
                  {hs > 0 && <span className="text-xs" style={{ color: '#F59E0B' }}>{hs}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Unlock popup ─────────────────────────────────────────────────
function UnlockCelebration({ game, level, onClose }) {
  useEffect(() => { setTimeout(onClose, 4000) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="text-center" style={{ animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
        <div className="text-7xl mb-4" style={{ animation: 'float 2s ease-in-out infinite' }}>{game.icon}</div>
        <div className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-1">🎉 Level Unlocked!</div>
        <div className="text-white font-black text-3xl mb-1">{game.name}</div>
        <div style={{ color: game.color }} className="font-bold text-lg mb-4">
          Level {level.level}: {level.name}
        </div>
        <button onClick={onClose}
          className="px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: game.color }}>
          Play Now →
        </button>
      </div>
    </div>
  )
}

// ── Main Game Hub ────────────────────────────────────────────────
export default function GameHub() {
  const { student } = useUser()
  const navigate = useNavigate()
  const [unlockData, setUnlockData] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (student) {
      getUnlockStatus(student.id).then(data => {
        setUnlockData(data)
        setLoading(false)
      })
    }
  }, [student])

  function handlePlay(game, level) {
    navigate(`/games/${game.id}/${level.level}`, { state: { game, level } })
  }

  const stats = unlockData ? {
    lessonsCompleted: unlockData.lessonsCompleted,
    avgScore: unlockData.avgScore,
    examsCompleted: unlockData.examsCompleted
  } : { lessonsCompleted: 0, avgScore: 0, examsCompleted: 0 }

  const totalUnlocked = unlockData
    ? Object.values(unlockData.status).reduce((s, g) => s + g.unlockedLevels.length, 0) : 0

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: '#050810' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* Starfield */}
      <Starfield />

      {/* Deep space gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(8,145,178,0.12) 0%, transparent 50%)',
        zIndex: 1
      }} />

      <div className="relative" style={{ zIndex: 2 }}>
        {/* Header */}
        <div className="px-5 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate('/dashboard')} className="text-slate-500 text-sm">← Back</button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#7C3AED' }}>
                ◆ SPACE ACADEMY
              </p>
              <h1 className="text-3xl font-black text-white leading-none">Game</h1>
              <h1 className="text-3xl font-black leading-none" style={{
                background: 'linear-gradient(135deg, #7C3AED, #0891B2, #059669)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>Hub</h1>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white">{totalUnlocked}</div>
              <div className="text-xs text-slate-500">levels unlocked</div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-3 mt-4">
            {[
              { label: 'Lessons', value: stats.lessonsCompleted, icon: '📚', color: '#7C3AED' },
              { label: 'Avg Score', value: `${stats.avgScore}%`, icon: '🎯', color: '#0891B2' },
              { label: 'Exams', value: stats.examsCompleted, icon: '🎓', color: '#059669' },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl p-2.5 text-center"
                style={{ background: '#0F1629', border: `1px solid ${s.color}33` }}>
                <div className="text-base">{s.icon}</div>
                <div className="font-black text-white text-sm">{s.value}</div>
                <div className="text-xs" style={{ color: '#3A4560' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works banner */}
        <div className="mx-5 mb-5 rounded-2xl p-4" style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(8,145,178,0.15))',
          border: '1px solid rgba(124,58,237,0.25)'
        }}>
          <p className="text-xs font-bold text-white mb-1">🚀 How to Unlock Games</p>
          <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
            Complete lessons <span style={{ color: '#7C3AED' }}>+</span> pass quizzes with good scores <span style={{ color: '#7C3AED' }}>+</span> sit exams → unlock higher game levels. The more you study, the further you explore the cosmos!
          </p>
        </div>

        {/* Games */}
        <div className="px-5">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3" style={{ animation: 'float 2s ease-in-out infinite' }}>🌌</div>
              <p className="text-slate-500 text-sm">Scanning the cosmos...</p>
            </div>
          ) : (
            GAMES.map(game => (
              <GameCard
                key={game.id}
                game={game}
                unlockedLevels={unlockData?.status[game.id]?.unlockedLevels || []}
                highScores={unlockData?.status[game.id]?.highScores || {}}
                stats={stats}
                onPlay={handlePlay}
              />
            ))
          )}
        </div>

        {/* Motivation footer */}
        {!loading && stats.lessonsCompleted < 3 && (
          <div className="mx-5 mt-2 mb-4 rounded-2xl p-4 text-center" style={{ background: '#0F1629', border: '1px solid #1A2035' }}>
            <div className="text-2xl mb-2">🌠</div>
            <p className="text-sm font-bold text-white mb-1">Your journey begins!</p>
            <p className="text-xs text-slate-500">Complete <strong style={{ color: '#7C3AED' }}>3 lessons</strong> to unlock your first game level. Start exploring your subjects now!</p>
          </div>
        )}
      </div>

      {celebration && (
        <UnlockCelebration
          game={celebration.game}
          level={celebration.level}
          onClose={() => { SoundEngine.unlockSound(); setCelebration(null) }}
        />
      )}

      <Navbar />
    </div>
  )
}
