/**
 * ELIMU LEARN — ON-DEVICE LLM ENGINE
 * Uses WebLLM to run AI models directly in the browser.
 * Desktop with WebGPU → real AI model (download once, works offline)
 * Mobile / no WebGPU → rule-based chatbot (instant, no download)
 */

const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm'

export const MODELS = {
  GEMMA_2B: {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2B',
    maker: 'Google',
    size: '1.5 GB',
    tier: 1,
    minRAM: 4,
    description: 'Best quality — needs a good GPU',
  },
  PHI_35: {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Mini',
    maker: 'Microsoft',
    size: '2.2 GB',
    tier: 1,
    minRAM: 4,
    description: 'Excellent at science and maths',
  },
  LLAMA_1B: {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    maker: 'Meta',
    size: '800 MB',
    tier: 2,
    minRAM: 2,
    description: 'Smaller and faster, good for most PCs',
  },
}

// ── Singleton state ───────────────────────────────────────────────
let engineInstance  = null
let engineStatus    = 'idle'  // idle | loading | ready | error | unavailable
let loadProgress    = 0
let progressCallbacks = []
let selectedModel   = null

export function getEngineStatus()  { return engineStatus }
export function getLoadProgress()  { return loadProgress }
export function getSelectedModel() { return selectedModel }
export function isModelCached()    { return !!localStorage.getItem('elimu_ai_model_preference') }
export function saveModelPreference(key) { localStorage.setItem('elimu_ai_model_preference', key) }
export function resetEngine() {
  engineInstance = null
  engineStatus   = 'idle'
  loadProgress   = 0
  selectedModel  = null
}

export function onProgress(cb) {
  progressCallbacks.push(cb)
  return () => { progressCallbacks = progressCallbacks.filter(c => c !== cb) }
}

function notifyProgress(pct, label) {
  loadProgress = pct
  progressCallbacks.forEach(cb => cb(pct, label))
}

// ── Device capability detection ───────────────────────────────────
export async function detectDeviceCapability() {
  const result = {
    hasWebGPU:        false,
    hasWASM:          false,
    isMobile:         false,
    recommendedModel: null,
    tier:             3,
    reason:           '',
  }

  // Detect mobile
  result.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

  // Check WASM
  try {
    result.hasWASM = typeof WebAssembly !== 'undefined'
  } catch { result.hasWASM = false }

  // Check WebGPU (desktop Chrome mainly)
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) result.hasWebGPU = true
    }
  } catch { result.hasWebGPU = false }

  const ramGB = navigator.deviceMemory || 2

  if (result.isMobile) {
    result.tier   = 3
    result.reason = 'Mobile device — using fast rule-based AI (no download needed)'
    result.recommendedModel = null
  } else if (result.hasWebGPU && ramGB >= 4) {
    result.recommendedModel = MODELS.GEMMA_2B
    result.tier   = 1
    result.reason = 'WebGPU detected — can run full AI model'
  } else if (result.hasWebGPU) {
    result.recommendedModel = MODELS.LLAMA_1B
    result.tier   = 1
    result.reason = 'WebGPU detected — using lightweight model'
  } else if (!result.isMobile && result.hasWASM) {
    result.recommendedModel = MODELS.LLAMA_1B
    result.tier   = 2
    result.reason = 'No WebGPU — using WASM-compatible model (slower)'
  } else {
    result.tier   = 3
    result.reason = 'Using rule-based AI (instant, works offline)'
  }

  return result
}

// ── Init / download engine ────────────────────────────────────────
export async function initEngine(modelOverride = null) {
  if (engineStatus === 'ready')   return true
  if (engineStatus === 'loading') return false

  engineStatus = 'loading'
  notifyProgress(0, 'Detecting device...')

  try {
    const capability = await detectDeviceCapability()

    // Mobile or unsupported → rule-based only
    if (capability.isMobile || (!capability.hasWebGPU && !capability.hasWASM)) {
      engineStatus = 'unavailable'
      notifyProgress(100, 'Using rule-based AI')
      return false
    }

    const model = modelOverride || capability.recommendedModel
    if (!model) {
      engineStatus = 'unavailable'
      notifyProgress(100, 'Using rule-based AI')
      return false
    }

    selectedModel = model
    notifyProgress(5, `Loading ${model.name} (${model.size})...`)

    // Load WebLLM from CDN
    let webllm
    try {
      webllm = await import(/* @vite-ignore */ WEBLLM_CDN)
    } catch(e) {
      throw new Error('Could not load WebLLM library. Check your internet connection.')
    }

    const engine = new webllm.MLCEngine()
    engine.setInitProgressCallback(report => {
      const pct   = Math.round((report.progress || 0) * 90) + 5
      const label = report.text || `Downloading ${model.name}...`
      notifyProgress(pct, label)
    })

    await engine.reload(model.id)

    engineInstance = engine
    engineStatus   = 'ready'
    notifyProgress(100, `${model.name} ready ✅`)
    return true

  } catch(err) {
    console.error('LLM init failed:', err)
    engineStatus = 'error'
    notifyProgress(100, `Setup failed: ${err.message}`)
    return false
  }
}

// ── Generate response ─────────────────────────────────────────────
function buildSystemPrompt(studentName, subject, topic) {
  return `You are Elimu AI, a friendly expert tutor for Ugandan secondary school students (S1-S6).
You specialize in Mathematics, Physics, Biology, and Chemistry (UNEB curriculum).
${studentName ? `Student: ${studentName}.` : ''}
${subject ? `Subject: ${subject}.` : ''}
${topic ? `Topic: ${topic}.` : ''}
- Give clear, step-by-step explanations at secondary school level
- Use simple language with Ugandan examples where helpful
- For maths/physics always show full working
- Be encouraging and supportive
- Use **bold** for key terms`
}

export async function generateResponse(messages, options = {}) {
  if (!engineInstance || engineStatus !== 'ready') {
    throw new Error('Engine not ready')
  }

  const { studentName='', subject='', topic='', onToken=null, maxTokens=400 } = options

  const modelMessages = [
    { role: 'system', content: buildSystemPrompt(studentName, subject, topic) },
    ...messages,
  ]

  if (onToken) {
    // Streaming mode
    let fullText = ''
    const chunks = await engineInstance.chat.completions.create({
      messages: modelMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    })
    for await (const chunk of chunks) {
      const token = chunk.choices[0]?.delta?.content || ''
      if (token) { fullText += token; onToken(token) }
    }
    return fullText
  } else {
    const reply = await engineInstance.chat.completions.create({
      messages: modelMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
    })
    return reply.choices[0]?.message?.content || ''
  }
}
