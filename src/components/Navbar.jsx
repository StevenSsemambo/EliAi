import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'

const LINKS = [
  { path:'/dashboard',  icon:'🏠', label:'Home'   },
  { path:'/ai-tutor',   icon:'🧠', label:'AI'     },
  { path:'/games',      icon:'🎮', label:'Games'  },
  { path:'/flashcards', icon:'🃏', label:'Cards'  },
  { path:'/progress',   icon:'📊', label:'Progress'},
]

export default function Navbar() {
  const loc = useLocation()
  const { theme } = useTheme()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: theme.navBg, backdropFilter:'blur(20px)', borderColor: theme.border }}>
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {LINKS.map(l => {
          const active = loc.pathname === l.path || loc.pathname.startsWith(l.path + '/')
          return (
            <Link key={l.path} to={l.path} onClick={() => SoundEngine.tap()}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? theme.accent : theme.muted }}>
              <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{l.icon}</span>
              <span className="text-xs font-semibold">{l.label}</span>
              {active && <div className="w-1 h-1 rounded-full" style={{ background: theme.accent }} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
