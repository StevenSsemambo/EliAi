import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { GAMES } from '../utils/gameUnlocks.js'
import db from '../db/schema.js'

// ── Existing games (already in repo) ────────────────────────────
import NebulaMemory      from './games/NebulaMemory.jsx'
import CosmosPuzzle      from './games/CosmosPuzzle.jsx'
import QuasarChain       from './games/QuasarChain.jsx'
import NumberWarp        from './games/NumberWarp.jsx'
import SequenceMemory    from './games/SequenceMemory.jsx'
import LogicGrid         from './games/LogicGrid.jsx'

// ── Subject games (already in repo) ─────────────────────────────
import ChemLabGame       from './games/ChemLabGame.jsx'
import MathsSpeedGame    from './games/MathsSpeedGame.jsx'

// ── 5 NEW cognitive games (upload these with GamePlayer.jsx) ─────
import MindBridge        from './games/MindBridge.jsx'
import FlowState         from './games/FlowState.jsx'
import TowerOfMind       from './games/TowerOfMind.jsx'
import ShadowMatch       from './games/ShadowMatch.jsx'

// ── 4 NEW complex games ──────────────────────────────────────────
import DungeonCrawler    from './games/DungeonCrawler.jsx'
import StickmanFighter   from './games/StickmanFighter.jsx'

const GAME_COMPONENTS = {
  memory:       NebulaMemory,
  sliding:      CosmosPuzzle,
  chain:        QuasarChain,
  arithmetic:   NumberWarp,
  sequence:     SequenceMemory,
  logic:        LogicGrid,
  // 5 new cognitive games
  deduction:    MindBridge,
  flow:         FlowState,
  hanoi:        TowerOfMind,
  
  spatial:      ShadowMatch,
  // 5 complex games
   dungeon:      DungeonCrawler,   
  fighting:     StickmanFighter,
  // Subject-specific games
  subject: {
    chem_lab:       ChemLabGame,    
    maths_speed:    MathsSpeedGame,
  },
}

const CATEGORY_COLORS = {
  Memory:'#7C3AED', Spatial:'#0891B2', Pattern:'#059669',
  Arithmetic:'#F59E0B', Logic:'#06B6D4',
  Algorithmic:'#F59E0B', Analogical:'#A855F7',
}

async function saveGameProgress(studentId, gameId, level, score) {
  if (!studentId) return
  try {
    const existing = await db.game_progress
      .where('[student_id+game_id+level]')
      .equals([studentId, gameId, level])
      .first()
    if (existing) {
      if (score > (existing.high_score || 0)) {
        await db.game_progress.update(existing.id, { high_score: score, played_at: new Date().toISOString() })
      }
    } else {
      await db.game_progress.add({
        student_id: studentId,
        game_id: gameId,
        level,
        high_score: score,
        unlocked_at: new Date().toISOString(),
      })
    }
  } catch(e) {
    try {
      const rows = await db.game_progress.where('student_id').equals(studentId).toArray()
      const existing = rows.find(r => r.game_id === gameId && r.level === level)
      if (existing) {
        if (score > (existing.high_score || 0))
          await db.game_progress.update(existing.id, { high_score: score, played_at: new Date().toISOString() })
      } else {
        await db.game_progress.add({
          student_id: studentId, game_id: gameId, level,
          high_score: score, unlocked_at: new Date().toISOString(),
        })
      }
    } catch {}
  }
}

export default function GamePlayer() {
  const { gameId, levelNum } = useParams()
  const lv = parseInt(levelNum) || 1
  const { state } = useLocation()
  const navigate  = useNavigate()
  const { student } = useUser()
  const [key, setKey] = useState(0)

  const game = GAMES.find(g => g && g.id === gameId) || state?.game
  const levelData = game?.levels.find(l => l.level === parseInt(levelNum)) || state?.level
  const _comp = game ? GAME_COMPONENTS[game.type] : null
  const GameComponent = _comp && typeof _comp === 'object' ? _comp[game.id] : _comp

  if (!game || !levelData || !GameComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:'#050810' }}>
        <div className="text-center px-6">
          <div className="text-5xl mb-4">🌌</div>
          <p className="text-slate-400 mb-2">Game not found</p>
          <button onClick={() => navigate('/games')} className="text-teal-400 font-semibold">← Back to Hub</button>
        </div>
      </div>
    )
  }

  const catColor = CATEGORY_COLORS[game.category] || game.color

  return (
    <div className="min-h-screen flex flex-col" style={{ background:'#050810' }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>

      {/* Header */}
      <div className="px-5 pt-10 pb-3 flex-shrink-0"
        style={{ background:'linear-gradient(180deg,#0A0D1A 0%,#050810 100%)', borderBottom:`1px solid ${game.color}33` }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/games')} className="text-slate-500 text-sm font-semibold active:opacity-70">← Hub</button>
          <div className="text-center flex-1 mx-4">
            <div className="flex items-center gap-2 justify-center mb-0.5">
              <span className="text-xl" style={{ animation:'float 3s ease-in-out infinite' }}>{game.icon}</span>
              <span className="font-black text-white text-base">{game.name}</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:`${game.color}22`, color:game.color }}>
                Level {levelData.level}
              </span>
              <span className="text-xs text-slate-500">{levelData.name}</span>
            </div>
          </div>
          <button onClick={() => setKey(k=>k+1)} className="text-xs px-3 py-1.5 rounded-xl font-bold active:scale-90"
            style={{ background:`${game.color}22`, color:game.color, border:`1px solid ${game.color}44` }}>↺ New</button>
        </div>
        <div className="flex justify-center mt-2">
          <span className="text-xs px-3 py-1 rounded-full font-semibold"
            style={{ background:`${catColor}15`, color:catColor, border:`1px solid ${catColor}30` }}>
            🧠 {game.cogSkill}
          </span>
        </div>
      </div>

      {/* Level progress strip */}
      <div className="px-5 py-2 flex-shrink-0" style={{ background:'#070A14' }}>
        <div className="flex gap-1 max-w-lg mx-auto overflow-x-auto pb-1">
          {game.levels.map(lvl => (
            <div key={lvl.level} className="flex-shrink-0 rounded-full transition-all" style={{
              width: lvl.level===levelData.level ? 24 : 8, height:8,
              background: lvl.level===levelData.level ? game.color : lvl.level<levelData.level ? `${game.color}66` : '#1A2035',
              boxShadow: lvl.level===levelData.level ? `0 0 8px ${game.glow}` : 'none',
            }} />
          ))}
        </div>
        <p className="text-center text-xs mt-1" style={{ color:'#2A3555' }}>Level {levelData.level} of {game.levels.length}</p>
      </div>

      {/* Game */}
      <div className="flex-1 px-4 pt-4 pb-6 overflow-auto max-w-lg mx-auto w-full">
        <GameComponent key={key} game={game} levelData={levelData} studentId={student?.id}
          onFinish={async () => {
            await saveGameProgress(student?.id, gameId, lv, levelData.level * 10)
            navigate('/games')
          }} />
      </div>
    </div>
  )
}
