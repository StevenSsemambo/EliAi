import { createContext, useContext, useState, useEffect } from 'react'
import db from '../db/schema.js'

export const THEMES = {
  // ── Dark themes ──────────────────────────────────────────────────
  dark_space: {
    id: 'dark_space', name: 'Dark Space', icon: '🌌', dark: true,
    bg: '#050810', surface: '#0C0F1A', card: '#0F1629',
    border: '#1A2035', accent: '#F59E0B', text: '#E2E8F0',
    subtext: '#94A3B8', muted: '#3A4560',
    grad: 'linear-gradient(145deg,#050810 0%,#0C0F1A 100%)',
    navBg: 'rgba(5,8,16,0.97)',
  },
  aurora: {
    id: 'aurora', name: 'Aurora', icon: '🌈', dark: true,
    bg: '#030B12', surface: '#071520', card: '#0A1F2E',
    border: '#0D3B52', accent: '#00E5FF', text: '#E0F7FA',
    subtext: '#80DEEA', muted: '#1A4A5E',
    grad: 'linear-gradient(145deg,#030B12 0%,#071B2E 50%,#0A1220 100%)',
    navBg: 'rgba(3,11,18,0.97)',
    glow: 'rgba(0,229,255,0.15)',
  },
  solar_flare: {
    id: 'solar_flare', name: 'Solar Flare', icon: '☀️', dark: true,
    bg: '#0D0500', surface: '#1A0A00', card: '#221000',
    border: '#3D1800', accent: '#FF6B00', text: '#FFF3E0',
    subtext: '#FFCC80', muted: '#5C2800',
    grad: 'linear-gradient(145deg,#0D0500 0%,#1A0800 50%,#0D0300 100%)',
    navBg: 'rgba(13,5,0,0.97)',
    glow: 'rgba(255,107,0,0.15)',
  },
  deep_ocean: {
    id: 'deep_ocean', name: 'Deep Ocean', icon: '🌊', dark: true,
    bg: '#020810', surface: '#051525', card: '#071E30',
    border: '#0A2D45', accent: '#00BFA5', text: '#E0F2F1',
    subtext: '#80CBC4', muted: '#0D3B55',
    grad: 'linear-gradient(145deg,#020810 0%,#051020 50%,#030C18 100%)',
    navBg: 'rgba(2,8,16,0.97)',
    glow: 'rgba(0,191,165,0.15)',
  },
  midnight_purple: {
    id: 'midnight_purple', name: 'Midnight', icon: '🔮', dark: true,
    bg: '#0A0514', surface: '#110A20', card: '#180F2C',
    border: '#2D1A4A', accent: '#A78BFA', text: '#EDE9FE',
    subtext: '#C4B5FD', muted: '#3D2760',
    grad: 'linear-gradient(145deg,#0A0514 0%,#110A20 100%)',
    navBg: 'rgba(10,5,20,0.97)',
    glow: 'rgba(167,139,250,0.15)',
  },
  forest: {
    id: 'forest', name: 'Forest', icon: '🌿', dark: true,
    bg: '#020D07', surface: '#071A0F', card: '#0A2115',
    border: '#123D22', accent: '#4ADE80', text: '#ECFDF5',
    subtext: '#86EFAC', muted: '#1A4A2A',
    grad: 'linear-gradient(145deg,#020D07 0%,#071A0F 100%)',
    navBg: 'rgba(2,13,7,0.97)',
    glow: 'rgba(74,222,128,0.15)',
  },
  // ── Light themes ─────────────────────────────────────────────────
  ivory: {
    id: 'ivory', name: 'Ivory', icon: '🌤️', dark: false,
    bg: '#F8F6F0', surface: '#FFFFFF', card: '#F0EDE4',
    border: '#E5DED0', accent: '#0D9488', text: '#1C1917',
    subtext: '#57534E', muted: '#A8A29E',
    grad: 'linear-gradient(145deg,#F8F6F0 0%,#FFFFFF 100%)',
    navBg: 'rgba(248,246,240,0.97)',
  },
  sky: {
    id: 'sky', name: 'Sky', icon: '☁️', dark: false,
    bg: '#F0F7FF', surface: '#FFFFFF', card: '#E8F2FF',
    border: '#BFDBFE', accent: '#2563EB', text: '#1E3A5F',
    subtext: '#3B6EA8', muted: '#93C5FD',
    grad: 'linear-gradient(145deg,#F0F7FF 0%,#FFFFFF 100%)',
    navBg: 'rgba(240,247,255,0.97)',
  },
  rose: {
    id: 'rose', name: 'Rose Gold', icon: '🌸', dark: false,
    bg: '#FFF5F7', surface: '#FFFFFF', card: '#FFE8EE',
    border: '#FECDD3', accent: '#E11D48', text: '#1C0A10',
    subtext: '#9F1239', muted: '#FDA4AF',
    grad: 'linear-gradient(145deg,#FFF5F7 0%,#FFFFFF 100%)',
    navBg: 'rgba(255,245,247,0.97)',
  },
}

export const BACKGROUNDS = {
  starfield: {
    id: 'starfield', name: 'Star Field', icon: '✨',
    style: {
      backgroundImage: `radial-gradient(circle, rgba(200,220,255,0.8) 1px, transparent 1px),
                        radial-gradient(circle, rgba(200,220,255,0.4) 1px, transparent 1px)`,
      backgroundSize: '40px 40px, 20px 20px',
      backgroundPosition: '0 0, 10px 10px',
    }
  },
  nebula: {
    id: 'nebula', name: 'Nebula', icon: '🔮',
    style: {
      backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.25) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 20%, rgba(8,145,178,0.2) 0%, transparent 50%),
                        radial-gradient(ellipse at 60% 80%, rgba(5,150,105,0.2) 0%, transparent 50%)`,
    }
  },
  planet: {
    id: 'planet', name: 'Planet Surface', icon: '🪐',
    style: {
      backgroundImage: `radial-gradient(ellipse at 50% 120%, rgba(245,158,11,0.3) 0%, transparent 60%),
                        radial-gradient(ellipse at 50% -20%, rgba(124,58,237,0.2) 0%, transparent 60%),
                        repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px)`,
    }
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId]   = useState('dark_space')
  const [bgId, setBgId]         = useState('starfield')

  useEffect(() => {
    Promise.all([
      db.settings.get('app_theme').catch(()=>null),
      db.settings.get('dashboard_bg').catch(()=>null),
    ]).then(([t, b]) => {
      if (t?.value && THEMES[t.value]) setThemeId(t.value)
      if (b?.value && BACKGROUNDS[b.value]) setBgId(b.value)
    })
  }, [])

  const theme = THEMES[themeId] || THEMES.dark_space
  const background = BACKGROUNDS[bgId] || BACKGROUNDS.starfield

  async function setTheme(id) {
    if (!THEMES[id]) return
    setThemeId(id)
    await db.settings.put({ key: 'app_theme', value: id })
  }

  async function setBackground(id) {
    if (!BACKGROUNDS[id]) return
    setBgId(id)
    await db.settings.put({ key: 'dashboard_bg', value: id })
  }

  // Inject CSS variables for theme
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--bg',      theme.bg)
    r.setProperty('--surface', theme.surface)
    r.setProperty('--card',    theme.card)
    r.setProperty('--border',  theme.border)
    r.setProperty('--accent',  theme.accent)
    r.setProperty('--text',    theme.text)
    r.setProperty('--subtext', theme.subtext)
    r.setProperty('--muted',   theme.muted)
    r.setProperty('--nav-bg',  theme.navBg)
    document.body.style.background = theme.bg
    // Light/dark flag for components that need it
    const isLight = theme.dark === false
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark')
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark'
    r.setProperty('--is-light', isLight ? '1' : '0')
  }, [theme])

  // Legacy toggleTheme kept for backward compat
  function toggleTheme() { setTheme(themeId === 'dark_space' ? 'aurora' : 'dark_space') }

  return (
    <ThemeContext.Provider value={{ theme, themeId, background, bgId, setTheme, setBackground, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
