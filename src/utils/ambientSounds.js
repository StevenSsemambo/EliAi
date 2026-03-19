/**
 * EQLA LEARN — Ambient Sound Engine
 * Generates study background sounds entirely via Web Audio API.
 * No files, no downloads, 100% offline.
 *
 * Sounds: ocean, rain, breeze, fire, crickets, coffee shop, lofi, white noise
 */

let _ctx = null
let _masterGain = null
let _currentNodes = []
let _currentSound = null
let _volume = 0.4
let _enabled = false

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)()
      _masterGain = _ctx.createGain()
      _masterGain.gain.value = _volume
      _masterGain.connect(_ctx.destination)
    } catch(e) { return null }
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function stopAll() {
  _currentNodes.forEach(n => { try { n.stop?.(); n.disconnect?.() } catch(e){} })
  _currentNodes = []
  _currentSound = null
}

function noise(type = 'white') {
  const ctx = getCtx(); if (!ctx) return null
  const bufSize = ctx.sampleRate * 3
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  if (type === 'white') {
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  } else if (type === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1
      b0=0.99886*b0+white*0.0555179; b1=0.99332*b1+white*0.0750759
      b2=0.96900*b2+white*0.1538520; b3=0.86650*b3+white*0.3104856
      b4=0.55000*b4+white*0.5329522; b5=-0.7616*b5-white*0.0168980
      data[i]=(b0+b1+b2+b3+b4+b5+b6+white*0.5362)*0.11
      b6=white*0.115926
    }
  } else if (type === 'brown') {
    let last = 0
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (last + 0.02 * white) / 1.02
      last = data[i]; data[i] *= 3.5
    }
  }
  const src = ctx.createBufferSource()
  src.buffer = buf; src.loop = true
  return src
}

function osc(freq, type='sine') {
  const ctx = getCtx(); if (!ctx) return null
  const o = ctx.createOscillator()
  o.type = type; o.frequency.value = freq
  return o
}

function lfo(target, min, max, rate) {
  const ctx = getCtx(); if (!ctx) return null
  const l = ctx.createOscillator()
  const g = ctx.createGain()
  l.frequency.value = rate
  g.gain.value = (max - min) / 2
  const offset = ctx.createConstantSource?.() || null
  l.connect(g); g.connect(target)
  l.start()
  if (offset) { offset.offset.value = (max + min) / 2; offset.connect(target); offset.start() }
  return [l, g, offset].filter(Boolean)
}

// ── SOUND GENERATORS ──────────────────────────────────────────────

function playOcean() {
  const ctx = getCtx(); if (!ctx) return
  // Deep rumble (low waves)
  const rumble = noise('brown')
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 180
  const rumbleGain = ctx.createGain(); rumbleGain.gain.value = 1.2
  rumble.connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(_masterGain)

  // Mid crash (wave crest)
  const crash = noise('pink')
  const crashFilter = ctx.createBiquadFilter()
  crashFilter.type = 'bandpass'; crashFilter.frequency.value = 700; crashFilter.Q.value = 0.5
  const crashGain = ctx.createGain(); crashGain.gain.value = 0.6

  // Wave rhythm LFO — slow swell
  const lfoNode = ctx.createOscillator()
  lfoNode.frequency.value = 0.12 // ~8 second wave cycle
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.5
  lfoNode.connect(lfoGain); lfoGain.connect(crashGain.gain)
  crashGain.gain.value = 0.3
  crash.connect(crashFilter); crashFilter.connect(crashGain); crashGain.connect(_masterGain)

  // High foam hiss
  const hiss = noise('white')
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'highpass'; hissFilter.frequency.value = 3500
  const hissGain = ctx.createGain(); hissGain.gain.value = 0.08
  hiss.connect(hissFilter); hissFilter.connect(hissGain); hissGain.connect(_masterGain)

  rumble.start(); crash.start(); hiss.start(); lfoNode.start()
  _currentNodes.push(rumble, crash, hiss, lfoNode)
}

function playRain() {
  const ctx = getCtx(); if (!ctx) return
  // Main rain static
  const rain = noise('pink')
  const rainFilter = ctx.createBiquadFilter()
  rainFilter.type = 'bandpass'; rainFilter.frequency.value = 1200; rainFilter.Q.value = 0.3
  const rainGain = ctx.createGain(); rainGain.gain.value = 0.9
  rain.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(_masterGain)

  // Roof drum — low thuds
  const drum = noise('brown')
  const drumFilter = ctx.createBiquadFilter()
  drumFilter.type = 'lowpass'; drumFilter.frequency.value = 120
  const drumGain = ctx.createGain(); drumGain.gain.value = 0.5
  drum.connect(drumFilter); drumFilter.connect(drumGain); drumGain.connect(_masterGain)

  // High drip sparkle
  const drip = noise('white')
  const dripFilter = ctx.createBiquadFilter()
  dripFilter.type = 'highpass'; dripFilter.frequency.value = 6000
  const dripGain = ctx.createGain(); dripGain.gain.value = 0.04
  drip.connect(dripFilter); dripFilter.connect(dripGain); dripGain.connect(_masterGain)

  rain.start(); drum.start(); drip.start()
  _currentNodes.push(rain, drum, drip)
}

function playBreeze() {
  const ctx = getCtx(); if (!ctx) return
  // Soft wind base
  const wind = noise('pink')
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'; windFilter.frequency.value = 400; windFilter.Q.value = 0.8
  const windGain = ctx.createGain(); windGain.gain.value = 0.0

  // Gentle LFO swell for gusts
  const gustLfo = ctx.createOscillator()
  gustLfo.frequency.value = 0.08
  const gustLfoGain = ctx.createGain(); gustLfoGain.gain.value = 0.35
  gustLfo.connect(gustLfoGain); gustLfoGain.connect(windGain.gain)
  windGain.gain.value = 0.15
  wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(_masterGain)

  // Rustling leaves — high shimmer
  const leaves = noise('white')
  const leafFilter = ctx.createBiquadFilter()
  leafFilter.type = 'highpass'; leafFilter.frequency.value = 4000
  const leafGain = ctx.createGain(); leafGain.gain.value = 0.07
  leaves.connect(leafFilter); leafFilter.connect(leafGain); leafGain.connect(_masterGain)

  wind.start(); leaves.start(); gustLfo.start()
  _currentNodes.push(wind, leaves, gustLfo)
}

function playFire() {
  const ctx = getCtx(); if (!ctx) return
  // Crackle base
  const crackle = noise('brown')
  const crackleFilter = ctx.createBiquadFilter()
  crackleFilter.type = 'lowpass'; crackleFilter.frequency.value = 500
  const crackleGain = ctx.createGain(); crackleGain.gain.value = 0.8
  crackle.connect(crackleFilter); crackleFilter.connect(crackleGain); crackleGain.connect(_masterGain)

  // Pop/snap — random high transients using modulated white noise
  const snap = noise('white')
  const snapFilter = ctx.createBiquadFilter()
  snapFilter.type = 'bandpass'; snapFilter.frequency.value = 2000; snapFilter.Q.value = 2
  const snapGain = ctx.createGain(); snapGain.gain.value = 0.1

  // Irregular LFO for fire breath
  const flameLfo = ctx.createOscillator()
  flameLfo.type = 'sawtooth'; flameLfo.frequency.value = 0.6
  const flameLfoGain = ctx.createGain(); flameLfoGain.gain.value = 0.3
  flameLfo.connect(flameLfoGain); flameLfoGain.connect(crackleGain.gain)

  snap.connect(snapFilter); snapFilter.connect(snapGain); snapGain.connect(_masterGain)
  crackle.start(); snap.start(); flameLfo.start()
  _currentNodes.push(crackle, snap, flameLfo)
}

function playCrickets() {
  const ctx = getCtx(); if (!ctx) return
  // Multiple cricket chirp oscillators at slightly different frequencies
  const freqs = [3200, 3400, 3600, 3100, 3500]
  freqs.forEach((freq, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'; o.frequency.value = freq
    const g = ctx.createGain(); g.gain.value = 0

    // Chirp rhythm — each cricket slightly offset
    const chirpLfo = ctx.createOscillator()
    chirpLfo.type = 'square'
    chirpLfo.frequency.value = 1.8 + (i * 0.15) // slightly different chirp rates
    const chirpLfoGain = ctx.createGain(); chirpLfoGain.gain.value = 0.04
    chirpLfo.connect(chirpLfoGain); chirpLfoGain.connect(g.gain)

    o.connect(g); g.connect(_masterGain)
    o.start(); chirpLfo.start()

    // Offset start
    setTimeout(() => {}, i * 200)
    _currentNodes.push(o, chirpLfo)
  })

  // Background night wind (very soft)
  const nightWind = noise('pink')
  const nwFilter = ctx.createBiquadFilter()
  nwFilter.type = 'lowpass'; nwFilter.frequency.value = 300
  const nwGain = ctx.createGain(); nwGain.gain.value = 0.15
  nightWind.connect(nwFilter); nwFilter.connect(nwGain); nwGain.connect(_masterGain)
  nightWind.start()
  _currentNodes.push(nightWind)
}

function playCoffeeShop() {
  const ctx = getCtx(); if (!ctx) return
  // Murmur base — bandpass pink noise in voice frequency range
  const murmur = noise('pink')
  const murmurFilter = ctx.createBiquadFilter()
  murmurFilter.type = 'bandpass'; murmurFilter.frequency.value = 800; murmurFilter.Q.value = 0.4
  const murmurGain = ctx.createGain(); murmurGain.gain.value = 0.5
  murmur.connect(murmurFilter); murmurFilter.connect(murmurGain); murmurGain.connect(_masterGain)

  // Cup clinks — occasional high transient
  const clink = noise('white')
  const clinkFilter = ctx.createBiquadFilter()
  clinkFilter.type = 'bandpass'; clinkFilter.frequency.value = 3500; clinkFilter.Q.value = 5
  const clinkGain = ctx.createGain(); clinkGain.gain.value = 0.03
  clink.connect(clinkFilter); clinkFilter.connect(clinkGain); clinkGain.connect(_masterGain)

  // Low ambient rumble (espresso machine etc)
  const rumble = noise('brown')
  const rumbleF = ctx.createBiquadFilter(); rumbleF.type='lowpass'; rumbleF.frequency.value=100
  const rumbleG = ctx.createGain(); rumbleG.gain.value = 0.4
  rumble.connect(rumbleF); rumbleF.connect(rumbleG); rumbleG.connect(_masterGain)

  murmur.start(); clink.start(); rumble.start()
  _currentNodes.push(murmur, clink, rumble)
}

function playLofi() {
  const ctx = getCtx(); if (!ctx) return
  // Vinyl crackle
  const vinyl = noise('white')
  const vinylFilter = ctx.createBiquadFilter()
  vinylFilter.type = 'bandpass'; vinylFilter.frequency.value = 1800; vinylFilter.Q.value = 0.5
  const vinylGain = ctx.createGain(); vinylGain.gain.value = 0.04
  vinyl.connect(vinylFilter); vinylFilter.connect(vinylGain); vinylGain.connect(_masterGain)

  // Simple melodic tones — Cmin pentatonic: C D Eb G Ab
  const pentatonic = [261.63, 293.66, 311.13, 392.00, 415.30]
  // Lazy slow chord stack
  const chordFreqs = [130.81, 164.81, 196.00] // C3 E3 G3
  chordFreqs.forEach((freq, i) => {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = 0.06
    // Gentle vibrato
    const vib = ctx.createOscillator()
    vib.frequency.value = 4
    const vibG = ctx.createGain(); vibG.gain.value = 1.5
    vib.connect(vibG); vibG.connect(o.frequency)
    o.connect(g); g.connect(_masterGain)
    o.start(); vib.start()
    _currentNodes.push(o, vib)
  })

  // Soft kick drum — low thud every ~0.5s using scheduled oscillator
  const kick = ctx.createOscillator()
  kick.type = 'sine'; kick.frequency.value = 55
  const kickEnv = ctx.createGain(); kickEnv.gain.value = 0
  kick.connect(kickEnv); kickEnv.connect(_masterGain)
  kick.start()

  // Schedule kick hits
  const bpm = 70
  const beat = 60 / bpm
  let t = ctx.currentTime + 0.1
  const scheduleKicks = setInterval(() => {
    if (!_ctx || _currentSound !== 'lofi') { clearInterval(scheduleKicks); return }
    for (let i = 0; i < 4; i++) {
      kickEnv.gain.setValueAtTime(0.3, t + i * beat)
      kickEnv.gain.exponentialRampToValueAtTime(0.001, t + i * beat + 0.15)
    }
    t += beat * 4
  }, beat * 4 * 1000 - 50)

  vinyl.start()
  _currentNodes.push(vinyl, kick)
}

function playWhiteNoise() {
  const ctx = getCtx(); if (!ctx) return
  const w = noise('pink') // pink is less harsh than true white
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 8000
  const g = ctx.createGain(); g.gain.value = 0.7
  w.connect(f); f.connect(g); g.connect(_masterGain)
  w.start()
  _currentNodes.push(w)
}

// ── PUBLIC API ────────────────────────────────────────────────────

export const AMBIENT_SOUNDS = [
  { id:'ocean',    label:'Ocean Waves',     emoji:'🌊', desc:'Rhythmic waves, calms anxiety' },
  { id:'rain',     label:'Rain on Roof',    emoji:'☔', desc:'Most popular study sound' },
  { id:'breeze',   label:'Gentle Breeze',   emoji:'🌬️', desc:'Soft wind, masks distractions' },
  { id:'fire',     label:'Crackling Fire',  emoji:'🔥', desc:'Warm and grounding' },
  { id:'crickets', label:'Night Crickets',  emoji:'🌙', desc:'Familiar Ugandan night sounds' },
  { id:'coffee',   label:'Coffee Shop',     emoji:'☕', desc:'Low chatter, boosts focus' },
  { id:'lofi',     label:'Lo-fi Beats',     emoji:'🎵', desc:'Gentle rhythm, no lyrics' },
  { id:'white',    label:'White Noise',     emoji:'🤫', desc:'Pure focus, blocks everything' },
]

export const AmbientEngine = {
  isSupported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
  },

  isPlaying() { return _enabled && _currentSound !== null },

  current() { return _currentSound },

  getVolume() { return _volume },

  setVolume(v) {
    _volume = Math.max(0, Math.min(1, v))
    if (_masterGain) _masterGain.gain.setValueAtTime(_volume, _ctx?.currentTime || 0)
    try { localStorage.setItem('elimu_ambient_vol', String(_volume)) } catch{}
  },

  play(soundId) {
    stopAll()
    const ctx = getCtx(); if (!ctx) return
    _enabled = true
    _currentSound = soundId

    // Restore saved volume
    try { _volume = parseFloat(localStorage.getItem('elimu_ambient_vol') || '0.4') } catch {}
    if (_masterGain) _masterGain.gain.value = _volume

    switch(soundId) {
      case 'ocean':    playOcean();      break
      case 'rain':     playRain();       break
      case 'breeze':   playBreeze();     break
      case 'fire':     playFire();       break
      case 'crickets': playCrickets();   break
      case 'coffee':   playCoffeeShop(); break
      case 'lofi':     playLofi();       break
      case 'white':    playWhiteNoise(); break
    }

    try { localStorage.setItem('elimu_ambient_last', soundId) } catch{}
  },

  stop() {
    stopAll()
    _enabled = false
    _currentSound = null
  },

  toggle(soundId) {
    if (_currentSound === soundId) { this.stop(); return false }
    this.play(soundId); return true
  },

  lastUsed() {
    try { return localStorage.getItem('elimu_ambient_last') } catch { return null }
  },
}
