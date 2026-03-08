/**
 * ELIMU LEARN — ON-DEVICE LLM ENGINE
 * ─────────────────────────────────────────────────────────────────
 * Uses WebLLM to run real transformer models directly in the browser.
 * No server. No API key. Downloads once, runs forever offline.
 *
 * Tier system (auto-selected by device capability):
 *   Tier 1 — WebGPU available  → Gemma-2-2b-it (best quality, ~1.5GB)
 *   Tier 2 — WASM fallback     → Phi-1.5 (good quality, ~900MB)
 *   Tier 3 — No LLM support    → Rule-based chatbot.js (instant, 0MB)
 *
 * The student never sees tiers — the app just works.
 */

// ── WebLLM CDN import (loaded dynamically to avoid blocking) ──────
const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm'

// ── Model catalogue ───────────────────────────────────────────────
export const MODELS = {
  // Best quality — needs WebGPU + ~2GB RAM
  GEMMA_2B: {
    id: 'gemma-2-2b-it-q4f32_1-MLC',
    name: 'Gemma 2B',
    maker: 'Google',
    size: '1.5 GB',
    tier: 1,
    minVRAM: 2000,   // MB
    description: 'Best quality answers, advanced reasoning',
  },
  // Good quality — works on most mid-range phones
  PHI_15: {
    id: 'Phi-1_5-q4f32_1-MLC',
    name: 'Phi-1.5',
    maker: 'Microsoft',
    size: '900 MB',
    tier: 1,
    minVRAM: 1200,
    description: 'Great for maths and science explanations',
  },
  // Lightweight — works on low-end devices
  TINYLLAMA: {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC',
    name: 'TinyLlama 1.1B',
    maker: 'Community',
    size: '600 MB',
    tier: 2,
    minVRAM: 800,
    description: 'Fast, works on most Android phones',
  },
}

// ── Elimu curriculum system prompt ───────────────────────────────
// This tells the model exactly who it is and what it knows
const buildSystemPrompt = (studentName, subject, topic) => `You are Elimu AI, an expert tutor for Ugandan secondary school students (S1-S6).

Your role:
- Help students understand the Uganda National Curriculum (UNEB syllabus)
- Teach Mathematics, Physics, Biology, and Chemistry
- Give clear, simple explanations suitable for secondary school level
- Use examples relevant to Uganda and East Africa when helpful
- Be encouraging, patient, and supportive
- When explaining calculations, always show step-by-step working
- Keep answers focused and appropriately detailed — not too long

Current student: ${studentName || 'a secondary school student'}
${subject ? `Current subject: ${subject}` : ''}
${topic ? `Current topic: ${topic}` : ''}

Key topics you know deeply:
Mathematics: Algebra, Linear Equations, Quadratic Equations, Geometry, Trigonometry, Mensuration, Statistics, Calculus, Vectors, Matrices, Probability, Sets
Physics: Forces, Motion, Energy, Waves, Light, Electricity, Magnetism, Thermodynamics, Nuclear Physics, Measurement
Biology: Cells, Photosynthesis, Respiration, Osmosis, Diffusion, Genetics, Reproduction, Nutrition, Transport, Classification, Ecology
Chemistry: Atoms, Bonding, Matter, Reactions, Acids and Bases, Organic Chemistry, The Periodic Table, Moles, Stoichiometry, Energy Changes

Rules:
- Always answer in English (unless student writes in another language)
- For calculations: write the formula first, then substitute values, then solve
- For definitions: give a clear one-sentence definition, then elaborate
- For "why" questions: use cause → process → effect structure
- Maximum response length: 300 words unless a calculation requires more
- End responses with a short follow-up question or suggestion to deepen learning`

// ── Device capability detector ────────────────────────────────────
export async function detectDeviceCapability() {
  const result = {
    hasWebGPU: false,
    hasWASM: false,
    estimatedVRAM: 0,
    recommendedModel: null,
    tier: 3,
    reason: '',
  }

  // Check WebAssembly (nearly universal)
  try {
    result.hasWASM = typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function'
  } catch { result.hasWASM = false }

  // Check WebGPU
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) {
        result.hasWebGPU = true
        // Estimate VRAM from adapter info
        const info = await adapter.requestAdapterInfo?.()
        // Heuristic: assume 2GB minimum if WebGPU works on mobile
        result.estimatedVRAM = navigator.deviceMemory
          ? Math.min(navigator.deviceMemory * 256, 4096)  // rough estimate
          : 1500
      }
    }
  } catch { result.hasWebGPU = false }

  // RAM estimate
  const ramGB = navigator.deviceMemory || 2  // default assume 2GB

  // Select best model for this device
  if (result.hasWebGPU && ramGB >= 4) {
    result.recommendedModel = MODELS.GEMMA_2B
    result.tier = 1
    result.reason = 'WebGPU detected with sufficient memory'
  } else if (result.hasWebGPU && ramGB >= 2) {
    result.recommendedModel = MODELS.PHI_15
    result.tier = 1
    result.reason = 'WebGPU detected, using efficient model'
  } else if (result.hasWASM) {
    result.recommendedModel = MODELS.TINYLLAMA
    result.tier = 2
    result.reason = 'Using WASM-compatible lightweight model'
  } else {
    result.recommendedModel = null
    result.tier = 3
    result.reason = 'Device uses rule-based AI (instant, no download needed)'
  }

  return result
}

// ── LLM Engine singleton ──────────────────────────────────────────
let engineInstance = null
let engineStatus = 'idle'   // idle | loading | ready | error | unavailable
let loadProgress = 0
let progressCallbacks = []
let selectedModel = null

export function getEngineStatus() { return engineStatus }
export function getLoadProgress() { return loadProgress }
export function getSelectedModel() { return selectedModel }

export function onProgress(cb) {
  progressCallbacks.push(cb)
  return () => { progressCallbacks = progressCallbacks.filter(c => c !== cb) }
}

function notifyProgress(pct, label) {
  loadProgress = pct
  progressCallbacks.forEach(cb => cb(pct, label))
}

export async function initEngine(modelOverride = null) {
  if (engineStatus === 'ready') return true
  if (engineStatus === 'loading') return false

  engineStatus = 'loading'
  notifyProgress(0, 'Detecting device capabilities...')

  try {
    // Detect device
    const capability = await detectDeviceCapability()
    const model = modelOverride || capability.recommendedModel

    if (!model) {
      engineStatus = 'unavailable'
      notifyProgress(100, 'Using rule-based AI (device not compatible with on-device LLM)')
      return false
    }

    selectedModel = model
    notifyProgress(5, `Loading ${model.name} (${model.size})...`)

    // Dynamically import WebLLM
    let webllm
    try {
      webllm = await import(/* @vite-ignore */ WEBLLM_CDN)
    } catch (e) {
      // Try local package if CDN fails
      try {
        webllm = await import('@mlc-ai/web-llm')
      } catch {
        throw new Error('WebLLM library could not be loaded. Check internet connection for first-time setup.')
      }
    }

    // Create engine
    const engine = new webllm.MLCEngine()

    // Progress tracking
    engine.setInitProgressCallback((report) => {
      const pct = Math.round((report.progress || 0) * 90) + 5
      const label = report.text || `Downloading ${model.name}...`
      notifyProgress(pct, label)
    })

    // Load model (downloads if not cached, instant if cached)
    await engine.reload(model.id)

    engineInstance = engine
    engineStatus = 'ready'
    notifyProgress(100, `${model.name} ready`)
    return true

  } catch (err) {
    console.error('LLM Engine init failed:', err)
    engineStatus = 'error'
    notifyProgress(100, 'AI setup failed — using rule-based mode')
    return false
  }
}

// ── Main generation function ──────────────────────────────────────
export async function generateResponse(messages, options = {}) {
  if (!engineInstance || engineStatus !== 'ready') {
    throw new Error('Engine not ready')
  }

  const {
    studentName = '',
    subject = '',
    topic = '',
    onToken = null,   // streaming callback: called with each new token
    maxTokens = 400,
    temperature = 0.7,
  } = options

  const systemPrompt = buildSystemPrompt(studentName, subject, topic)

  // Build message array for the model
  const modelMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // Streaming generation
  if (onToken) {
    const stream = await engineInstance.chat.completions.create({
      messages: modelMessages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    })

    let fullText = ''
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || ''
      if (token) {
        fullText += token
        onToken(token, fullText)
      }
    }
    return fullText
  }

  // Non-streaming generation
  const response = await engineInstance.chat.completions.create({
    messages: modelMessages,
    max_tokens: maxTokens,
    temperature,
  })

  return response.choices[0]?.message?.content || ''
}

// ── Check if model is already cached ─────────────────────────────
export async function isModelCached(modelId) {
  try {
    const caches = await window.caches?.keys()
    if (!caches) return false
    // WebLLM uses Cache API with specific key patterns
    return caches.some(name => name.includes('webllm') || name.includes(modelId?.split('-')[0]))
  } catch {
    return false
  }
}

// ── Reset engine (for model switching) ───────────────────────────
export function resetEngine() {
  engineInstance = null
  engineStatus = 'idle'
  loadProgress = 0
  selectedModel = null
}

// ── Storage key for user's model preference ───────────────────────
const MODEL_PREF_KEY = 'elimu_ai_model_preference'
export function saveModelPreference(modelKey) {
  localStorage.setItem(MODEL_PREF_KEY, modelKey)
}
export function getModelPreference() {
  return localStorage.getItem(MODEL_PREF_KEY)
}
