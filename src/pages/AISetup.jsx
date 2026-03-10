import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  detectDeviceCapability, initEngine, onProgress,
  getEngineStatus, MODELS, saveModelPreference, resetEngine,
} from '../ai/llmEngine.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const MODEL_KEYS = Object.keys(MODELS)

export default function AISetup() {
  const { theme } = useTheme()
  const navigate  = useNavigate()
  const [capability, setCapability] = useState(null)
  const [selectedKey, setSelectedKey] = useState('LLAMA_1B')
  const [step, setStep]   = useState('detect') // detect | choose | downloading | ready | mobile
  const [progress, setProgress]   = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already ready
    if (getEngineStatus() === 'ready') { setStep('ready'); return }
    detectDeviceCapability().then(cap => {
      setCapability(cap)
      if (cap.isMobile) {
        setStep('mobile')
      } else if (cap.recommendedModel) {
        // Pre-select recommended model
        const match = MODEL_KEYS.find(k => MODELS[k].id === cap.recommendedModel.id)
        if (match) setSelectedKey(match)
        setStep('choose')
      } else {
        setStep('mobile') // no WebGPU desktop falls here too, show rule-based info
      }
    })
  }, [])

  async function handleDownload() {
    setError('')
    setStep('downloading')
    setProgress(0)
    const unsub = onProgress((pct, label) => {
      setProgress(pct)
      setProgressLabel(label)
    })
    resetEngine()
    const model = MODELS[selectedKey]
    const ok = await initEngine(model)
    unsub()
    if (ok) {
      saveModelPreference(selectedKey)
      SoundEngine.badgeUnlocked?.()
      setStep('ready')
    } else {
      setError('Download failed. Make sure you have a stable internet connection and try again.')
      setStep('choose')
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bg }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-5 relative text-center"
        style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => navigate(-1)} className="absolute left-5 top-12 text-sm" style={{ color: theme.muted }}>← Back</button>
        <div className="text-5xl mb-2" style={{ animation: 'float 3s ease-in-out infinite' }}>🧠</div>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>AI Engine</h1>
        <p className="text-sm mt-1" style={{ color: theme.muted }}>On-device AI · No internet needed after download</p>
      </div>

      <div className="px-5 mt-5 space-y-4">

        {/* DETECTING */}
        {step === 'detect' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 animate-spin">🔍</div>
            <p style={{ color: theme.subtext }}>Detecting your device...</p>
          </div>
        )}

        {/* MOBILE — rule-based only */}
        {step === 'mobile' && (
          <>
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(6,182,212,0.08)', border: '2px solid rgba(6,182,212,0.4)' }}>
              <div className="text-4xl mb-3">📱</div>
              <p className="font-black text-base" style={{ color: '#06B6D4' }}>Rule-Based AI Active</p>
              <p className="text-sm mt-2" style={{ color: theme.muted }}>
                Your device uses our fast built-in AI. It knows all 139 curriculum topics, can quiz you, explain concepts, and give hints — all offline.
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="font-black text-sm mb-3" style={{ color: theme.subtext }}>💡 Why not on mobile?</p>
              <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
                Full AI models (800MB–2GB) need WebGPU which is only available on desktop Chrome. On mobile, our rule-based AI is faster, works offline, and uses no data.
              </p>
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                <p className="text-xs font-bold" style={{ color: theme.accent }}>
                  💻 Use Elimu on a desktop/laptop browser to download the full AI model.
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-4 rounded-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)' }}>
              Back to Dashboard
            </button>
          </>
        )}

        {/* CHOOSE MODEL */}
        {step === 'choose' && (
          <>
            {/* Device info */}
            {capability && (
              <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs font-black mb-2" style={{ color: theme.muted }}>🖥️ Your Device</p>
                <div className="flex gap-3">
                  <span className="text-xs px-2 py-1 rounded-full font-bold"
                    style={{ background: capability.hasWebGPU ? 'rgba(74,222,128,0.12)' : 'rgba(148,163,184,0.1)', color: capability.hasWebGPU ? '#4ADE80' : '#94A3B8' }}>
                    {capability.hasWebGPU ? '✅ WebGPU' : '⚠️ No WebGPU'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full font-bold"
                    style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>
                    ✅ WASM
                  </span>
                </div>
                <p className="text-xs mt-2" style={{ color: theme.muted }}>{capability.reason}</p>
              </div>
            )}

            <p className="font-black text-sm" style={{ color: theme.subtext }}>Choose AI Model</p>
            {MODEL_KEYS.map(key => {
              const m = MODELS[key]
              const isRec = capability?.recommendedModel?.id === m.id
              return (
                <button key={key} onClick={() => setSelectedKey(key)}
                  className="w-full rounded-2xl p-4 text-left transition-all active:scale-98"
                  style={{
                    background: selectedKey === key ? `${theme.accent}15` : theme.card,
                    border: `2px solid ${selectedKey === key ? theme.accent : theme.border}`,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm" style={{ color: theme.text }}>{m.name}</span>
                      {isRec && <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${theme.accent}22`, color: theme.accent }}>Recommended</span>}
                    </div>
                    <span className="text-xs font-bold" style={{ color: theme.muted }}>{m.size}</span>
                  </div>
                  <p className="text-xs" style={{ color: theme.muted }}>{m.description} · by {m.maker}</p>
                </button>
              )
            })}

            {error && (
              <p className="text-sm font-bold px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>⚠️ {error}</p>
            )}

            <button onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
              ⬇️ Download {MODELS[selectedKey]?.name}
            </button>

            <p className="text-center text-xs" style={{ color: theme.muted }}>
              Downloads once (~{MODELS[selectedKey]?.size}). Stored in your browser cache. Works offline forever after.
            </p>
          </>
        )}

        {/* DOWNLOADING */}
        {step === 'downloading' && (
          <div className="rounded-2xl p-6 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-4xl mb-4" style={{ animation: 'float 2s ease-in-out infinite' }}>⬇️</div>
            <p className="font-black text-base mb-1" style={{ color: theme.text }}>Downloading AI Model</p>
            <p className="text-xs mb-4" style={{ color: theme.muted }}>{progressLabel || 'Connecting...'}</p>
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: theme.border }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7C3AED,#0891B2)' }} />
            </div>
            <p className="text-xs font-bold" style={{ color: theme.accent }}>{progress}%</p>
            <p className="text-xs mt-4" style={{ color: theme.muted }}>Keep this page open. Do not close the browser.</p>
          </div>
        )}

        {/* READY */}
        {step === 'ready' && (
          <>
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(74,222,128,0.08)', border: '2px solid #4ADE80' }}>
              <div className="text-5xl mb-3">✅</div>
              <p className="font-black text-lg" style={{ color: '#4ADE80' }}>AI Model Ready!</p>
              <p className="text-sm mt-2" style={{ color: theme.muted }}>
                {getEngineStatus() === 'ready'
                  ? 'On-device AI is running. Open the 💬 chat on any page — it now uses real AI.'
                  : 'Model downloaded. It will load automatically next time you open the chat.'}
              </p>
            </div>
            <button onClick={() => setStep('choose')}
              className="w-full py-3 rounded-2xl text-sm font-bold"
              style={{ background: theme.card, color: theme.subtext, border: `1px solid ${theme.border}` }}>
              🔄 Change Model
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-4 rounded-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg,#059669,#0D9488)' }}>
              Go to Dashboard →
            </button>
          </>
        )}
      </div>
      <Navbar />
    </div>
  )
}
