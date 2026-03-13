/**
 * AppShell — responsive layout wrapper
 *
 * Mobile  (<768px): full-width, bottom navbar (existing Navbar component)
 * Desktop (≥768px): centered max-w-md content column with a fixed left sidebar nav
 *
 * Usage: wrap <Routes> inside <AppShell>. Pages keep their own structure unchanged.
 */
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { SoundEngine } from '../utils/soundEngine.js'

const NAV_LINKS = [
  { path: '/dashboard',        icon: '🏠', label: 'Home'      },
  { path: '/ai-tutor',         icon: '🧠', label: 'AI Tutor'  },
  { path: '/games',            icon: '🎮', label: 'Games'     },
  { path: '/exam-center',      icon: '🎓', label: 'Exams'     },
  { path: '/progress',         icon: '📊', label: 'Progress'  },
  { path: '/search',           icon: '🔍', label: 'Search'    },
  { path: '/settings',         icon: '⚙️', label: 'Settings'  },
]

export default function AppShell({ children }) {
  const { theme } = useTheme()
  const { student } = useUser()
  const loc = useLocation()
  const isLight = theme.dark === false

  // Don't show sidebar on welcome/splash
  const hideSidebar = !student || loc.pathname === '/'

  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ background: isLight ? theme.bg : '#000' }}
    >
      {/* ── Desktop sidebar ─────────────────────────── */}
      {!hideSidebar && (
        <aside
          className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-40 w-56"
          style={{
            background: theme.surface,
            borderRight: `1px solid ${theme.border}`,
          }}
        >
          {/* Brand */}
          <Link to="/dashboard"
            className="flex items-center gap-2 px-5 py-5 border-b"
            style={{ borderColor: theme.border }}
            onClick={() => SoundEngine.tap()}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)', color: '#fff' }}
            >S</div>
            <div>
              <p className="font-black text-xs tracking-widest uppercase" style={{ color: theme.accent }}>EQLA LEARN</p>
              <p className="text-xs" style={{ color: theme.muted }}>Uganda</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {NAV_LINKS.map(l => {
              const active = loc.pathname === l.path || (l.path !== '/dashboard' && loc.pathname.startsWith(l.path))
              return (
                <Link
                  key={l.path}
                  to={l.path}
                  onClick={() => SoundEngine.tap()}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all"
                  style={{
                    background: active ? `${theme.accent}18` : 'transparent',
                    color: active ? theme.accent : theme.subtext,
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    border: active ? `1px solid ${theme.accent}30` : '1px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{l.icon}</span>
                  <span>{l.label}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: theme.accent }} />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Student pill at bottom */}
          {student && (
            <div
              className="px-4 py-3 mx-2 mb-4 rounded-xl"
              style={{ background: `${theme.accent}10`, border: `1px solid ${theme.accent}25` }}
            >
              <p className="text-xs font-bold truncate" style={{ color: theme.text }}>{student.name}</p>
              <p className="text-xs" style={{ color: theme.muted }}>{student.class_level} · {(student.total_xp || 0).toLocaleString()} XP</p>
            </div>
          )}
        </aside>
      )}

      {/* ── Content column ───────────────────────────── */}
      <div
        className={`flex-1 min-h-screen ${!hideSidebar ? 'md:ml-56' : ''}`}
        style={{ maxWidth: hideSidebar ? '100%' : undefined }}
      >
        {/* Inner content capped at phone width on very wide screens */}
        <div
          className="mx-auto w-full"
          style={{ maxWidth: 480 }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
