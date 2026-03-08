import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  detectDeviceCapability, initEngine, onProgress,
  getEngineStatus, MODELS, saveModelPreference,
  isModelCached, resetEngine,
} from '../ai/llmEngine.js'
import { SoundEngine } from '../utils/soundEngine.js'

const MODEL_LIST = Object.entries(MODELS).map(([key, val]) => ({ key, ...val }))

function CapabilityBadge({ capability, theme }) {
  if (!capability) return null
  const items = [
    { label: 'WebGPU', ok: capability.hasWebGPU, good: 'Supported ✅', bad: 'Not available' },
    { label: 'WebAssembly', ok: capability.hasWASM, good: 'Supported ✅', bad: 'Not available' },
    { label: 'Device RAM', ok: true, good: `~${navigator.deviceMemory || '?'} GB detected` },
  ]
  return (
    <div className="rounded-2xl p-4 mb-5"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <p className="text-xs font-black mb-3" style={{ color: theme.muted }}>📱 Your Device</p>
      {items.map(item => (
        <div key={item.label} className="flex items-center justify-between mb-2 last:mb-0">
          <span className="text-sm" style={{ color: theme.subtext }}>{item.label}</span>
          <span className="text-xs font-bold" style={{ color: item.ok ? '#4ADE80' : '#94A3B8' }}>
            {item.ok ? item.good : item.bad}
          </span>
        </div>
      ))}
      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
        <p className="text-xs" style={{ color: theme.muted }}>
          {capability.reason}
        </p>
      </div>
    </div>
  )
}

function ModelCard({ model, selected, onSelect, cached, theme }) {
  const tierColors = { 1: '#7C3AED', 2: '#0891B2', 3: '#16A34A' }
  const tierLabels = { 1: 'Best Quality', 2: 'Balanced', 3: 'Lightweight' }
  const col = tierColors[model.tier]

  return (
    <button onClick={() => onSelect(model.key)}
      className="w-full rounded-2xl p-4 text-left transition-all active:scale-98 mb-3"
      style={{
        background: selected ? `${col}18` : theme.card,
        border: `2px solid ${selected ? col : theme.border}`,
      }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${col}22` }}>
            {model.tier === 1 ? '🧠' : model.tier === 2 ? '⚡' : '🔋'}
          </div>
          <div>
            <p className="font-black text-sm" style={{ color: theme.text }}>{model.name}</p>
            <p className="text-xs" style={{ color: theme.muted }}>by {model.maker}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${col}22`, color: col }}>
            {tierLabels[model.tier]}
          </span>
          {cached && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}>
              ✅ Downloaded
            </span>
          )}
        </div>
      </div>

      <p className="text-xs mb-2" style={{ color: theme.subtext }}>{model.description}</p>

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold" style={{ color: theme.muted }}>
          💾 {model.size}
        </span>
        {selected && (
          <span className="text-xs font-bold" style={{ color: col }}>● Selected</span>
        )}
      </div>
    </button>
  )
}

function DownloadProgress({ progress, label, theme }) {
  const pct = Math.round(progress)
  const col = pct < 30 ? '#F59E0B' : pct < 70 ? '#0891B2' : '#4ADE80'

  return (
    <div className="rounded-2xl p-5 text-center"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      {/* Animated ring */}
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none"
            stroke={theme.border} strokeWidth="6"/>
          <circle cx="48" cy="48" r="40" fill="none"
            stroke={col} strokeWidth="6"
            strokeDasharray={`${(pct / 100) * 251} 251`}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black" style={{ color: col }}>{pct}%</span>
        </div>
      </div>

      <p className="font-black text-base mb-1" style={{ color: theme.text }}>
        {pct < 100 ? 'Downloading AI Model...' : '✅ AI Ready!'}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>
        {label || 'Please keep the app open. This only happens once.'}
      </p>

      {pct < 100 && (
        <div className="mt-4 rounded-xl overflow-hidden" style={{ background: theme.border }}>
          <div className="h-2 rounded-xl transition-all duration-400"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${col}, #7C3AED)` }}/>
        </div>
      )}

      {pct < 100 && (
        <p className="text-xs mt-3" style={{ color: theme.muted }}>
          💡 After this download, Elimu AI works with no internet — forever.
        </p>
      )}
    </div>
  )
}

export default function AISetup() {
  const { theme }     = useTheme()
  const navigate      = useNavigate()
  const [step, setStep]           = useState('detect')   // detect | choose | download | ready | unavailable
  const [capability, setCapability] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [progress, setProgress]   = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [cachedModels, setCachedModels]   = useState({})
  const [error, setError]         = useState(null)

  useEffect(() => {
    // Detect device on mount
    detectDeviceCapability().then(cap => {
      setCapability(cap)
      if (cap.recommendedModel) {
        // Find model key
        const key = Object.entries(MODELS).find(([, v]) => v.id === cap.recommendedModel.id)?.[0]
        setSelectedKey(key || 'TINYLLAMA')
      }
      setStep(cap.tier === 3 ? 'unavailable' : 'choose')

      // Check which models are already cached
      Promise.all(MODEL_LIST.map(async m => ({
        key: m.key,
        cached: await isModelCached(m.id),
      }))).then(results => {
        const map = {}
        results.forEach(r => map[r.key] = r.cached)
        setCachedModels(map)

        // If recommended model is already cached, jump straight to ready
        const recKey = Object.entries(MODELS).find(([, v]) => v.id === cap.recommendedModel?.id)?.[0]
        if (recKey && map[recKey]) {
          setStep('ready')
        }
      })
    })
  }, [])

  async function startDownload() {
    if (!selectedKey) return
    SoundEngine.tap()

    const model = MODELS[selectedKey]
    saveModelPreference(selectedKey)
    setStep('download')
    setProgress(0)

    // Subscribe to progress
    const unsub = onProgress((pct, label) => {
      setProgress(pct)
      setProgressLabel(label)
      if (pct >= 100) {
        unsub()
        setTimeout(() => setStep('ready'), 800)
      }
    })

    resetEngine()
    const success = await initEngine(model)

    if (success) {
      // Save preference so chatbot auto-inits on next visit
      localStorage.setItem('elimu_ai_model_preference', selectedKey)
    } else {
      setError('Download failed. Check your connection and try again.')
      setStep('choose')
    }
  }

  const selectedModel = selectedKey ? MODELS[selectedKey] : null

  return (
    <div className="min-h-screen pb-10" style={{ background: theme.bg }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-6 text-center relative overflow-hidden"
        style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%)' }}/>
        <button onClick={() => navigate(-1)} className="absolute left-5 top-12 text-sm"
          style={{ color: theme.muted }}>← Back</button>

        <div className="text-5xl mb-3" style={{ animation: 'float 3s ease infinite' }}>🧠</div>
        <h1 className="text-2xl font-black mb-1" style={{ color: theme.text }}>Elimu AI Setup</h1>
        <p className="text-sm" style={{ color: theme.muted }}>
          Download a real AI model to your device. One time only. Works offline forever.
        </p>
      </div>

      <div className="px-5 pt-5 max-w-lg mx-auto">

        {/* ── DETECTING ── */}
        {step === 'detect' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3" style={{ animation: 'float 1s ease infinite' }}>🔍</div>
            <p className="font-black" style={{ color: theme.text }}>Checking your device...</p>
          </div>
        )}

        {/* ── UNAVAILABLE ── */}
        {step === 'unavailable' && (
          <>
            <div className="rounded-2xl p-5 mb-4 text-center"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="text-4xl mb-3">📱</div>
              <p className="font-black text-lg mb-2" style={{ color: '#F59E0B' }}>
                On-device AI not available
              </p>
              <p className="text-sm leading-relaxed" style={{ color: theme.subtext }}>
                Your device doesn't support WebGPU or WebAssembly yet. This is common on older Android devices or some browsers.
              </p>
            </div>
            <CapabilityBadge capability={capability} theme={theme} />
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="font-black text-sm mb-1" style={{ color: '#4ADE80' }}>✅ Good news</p>
              <p className="text-sm" style={{ color: theme.subtext }}>
                Elimu AI still works on your device using our rule-based engine — it knows all 116 curriculum topics, explains concepts, quizzes you, and gives hints. It just can't generate completely new responses.
              </p>
            </div>
            <button onClick={() => navigate('/ai-tutor')}
              className="w-full py-4 rounded-2xl font-black text-white"
              style={{ background: `linear-gradient(135deg,${theme.accent},#7C3AED)` }}>
              Continue with Rule-Based AI →
            </button>
          </>
        )}

        {/* ── CHOOSE MODEL ── */}
        {step === 'choose' && (
          <>
            <CapabilityBadge capability={capability} theme={theme} />

            {error && (
              <div className="rounded-xl px-4 py-3 mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <p className="text-sm font-bold" style={{ color: '#EF4444' }}>⚠️ {error}</p>
              </div>
            )}

            <p className="text-sm font-black mb-3" style={{ color: theme.text }}>
              🤖 Choose your AI model
            </p>
            <p className="text-xs mb-4" style={{ color: theme.muted }}>
              {capability?.recommendedModel
                ? `✨ We recommend ${capability.recommendedModel.name} for your device`
                : 'Choose based on your available storage'}
            </p>

            {MODEL_LIST.map(model => (
              <ModelCard key={model.key} model={model}
                selected={selectedKey === model.key}
                cached={cachedModels[model.key]}
                onSelect={setSelectedKey}
                theme={theme} />
            ))}

            {/* What you get */}
            <div className="rounded-2xl p-4 mb-5"
              style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p className="font-black text-sm mb-2" style={{ color: '#A78BFA' }}>
                🚀 What you unlock with on-device AI
              </p>
              {[
                'Generates unique explanations for any question',
                'Adapts language — "explain it simpler" actually works',
                'Multi-turn conversation with real memory',
                'Solves maths problems it has never seen before',
                'Answers unexpected questions, not just pre-programmed ones',
                'Works 100% offline after this one download',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <span style={{ color: '#A78BFA' }}>→</span>
                  <p className="text-xs" style={{ color: theme.subtext }}>{item}</p>
                </div>
              ))}
            </div>

            <button onClick={startDownload} disabled={!selectedKey}
              className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
              {cachedModels[selectedKey]
                ? `✅ Load ${selectedModel?.name} (Already Downloaded)`
                : `⬇️ Download ${selectedModel?.name} (${selectedModel?.size})`}
            </button>

            <p className="text-xs text-center mt-3" style={{ color: theme.muted }}>
              Requires internet for the download only. After that — fully offline.
            </p>

            <button onClick={() => navigate(-1)}
              className="w-full py-3 mt-2 rounded-2xl text-sm font-bold"
              style={{ color: theme.muted }}>
              Skip — use rule-based AI
            </button>
          </>
        )}

        {/* ── DOWNLOADING ── */}
        {step === 'download' && (
          <DownloadProgress progress={progress} label={progressLabel} theme={theme} />
        )}

        {/* ── READY ── */}
        {step === 'ready' && (
          <div className="text-center">
            <div className="rounded-2xl p-6 mb-5"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <div className="text-6xl mb-3" style={{ animation: 'float 2s ease infinite' }}>🎉</div>
              <h2 className="text-2xl font-black mb-2" style={{ color: '#4ADE80' }}>AI is Ready!</h2>
              <p className="text-sm" style={{ color: theme.subtext }}>
                {selectedModel?.name || 'Elimu AI'} is loaded and running on your device.
                It will work offline from now on — no internet needed.
              </p>
            </div>

            <div className="rounded-2xl p-4 mb-5 text-left"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="font-black text-sm mb-2" style={{ color: theme.text }}>Try asking me:</p>
              {[
                '"Explain osmosis like I am 12 years old"',
                '"Show me step by step how to solve x² + 5x + 6 = 0"',
                '"Why do plants need chlorophyll? Give me 3 reasons"',
                '"I got this wrong — can you explain it differently?"',
              ].map((q, i) => (
                <p key={i} className="text-xs mb-1.5 last:mb-0" style={{ color: theme.muted }}>
                  💬 {q}
                </p>
              ))}
            </div>

            <button onClick={() => { SoundEngine.levelComplete(); navigate('/ai-tutor') }}
              className="w-full py-4 rounded-2xl font-black text-xl text-white"
              style={{ background: 'linear-gradient(135deg,#4ADE80,#0891B2)' }}>
              Start Chatting 🧠 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
