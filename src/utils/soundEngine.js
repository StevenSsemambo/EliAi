let _ctx = null, _on = true

function ac() {
  if (!_ctx) try { _ctx = new (window.AudioContext || window.webkitAudioContext)() } catch(e) { return null }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function tone(a, freq, type, t, dur, vol=0.25) {
  try {
    const o = a.createOscillator(), g = a.createGain()
    o.connect(g); g.connect(a.destination)
    o.type=type; o.frequency.setValueAtTime(freq,t)
    g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(vol,t+0.015)
    g.gain.exponentialRampToValueAtTime(0.001,t+dur)
    o.start(t); o.stop(t+dur+0.05)
  } catch(e) {}
}

// Noise burst (for wrong buzz)
function noise(a, t, dur, vol=0.15) {
  try {
    const buf = a.createBuffer(1, a.sampleRate*dur, a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)
    const src = a.createBufferSource()
    const g = a.createGain(), filt = a.createBiquadFilter()
    src.buffer=buf; filt.type='bandpass'; filt.frequency.value=200; filt.Q.value=0.5
    src.connect(filt); filt.connect(g); g.connect(a.destination)
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur)
    src.start(t); src.stop(t+dur+0.05)
  } catch(e) {}
}

export const SoundEngine = {
  setEnabled(v) { _on=v },
  isEnabled() { return _on },

  // ── UI ───────────────────────────────────────────
  tap() {
    if(!_on)return; const a=ac();if(!a)return
    tone(a,280,'sine',a.currentTime,0.08,0.1)
  },

  // ── Quiz / lesson ────────────────────────────────
  correct() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    tone(a,523.25,'sine',t,0.18,0.28); tone(a,659.25,'sine',t+0.13,0.25,0.32)
  },
  wrong() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    tone(a,220,'sawtooth',t,0.12,0.2); tone(a,165,'sawtooth',t+0.1,0.15,0.12)
  },
  quizComplete() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    tone(a,523.25,'triangle',t,0.18,0.30); tone(a,659.25,'triangle',t+0.16,0.18,0.32)
    tone(a,783.99,'triangle',t+0.32,0.40,0.38); tone(a,1046.5,'sine',t+0.32,0.35,0.12)
  },
  xpEarned() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    ;[880,1108,1318,1568,1760].forEach((f,i)=>tone(a,f,'sine',t+i*0.05,0.12,0.14))
  },
  badgeUnlocked() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    ;[392,493,587,698,783].forEach((f,i)=>tone(a,f,'triangle',t+i*0.09,0.22,0.25))
  },
  streakMilestone() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    ;[523,659,783,1046].forEach((f,i)=>tone(a,f,'sine',t+i*0.1,0.28,0.28))
  },
  timerComplete() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    ;[0,0.35,0.7].forEach(d=>{tone(a,440,'sine',t+d,0.22,0.3);tone(a,880,'sine',t+d+0.04,0.18,0.1)})
    tone(a,660,'triangle',t+1.0,0.45,0.35)
  },

  // ── GAME SOUNDS ──────────────────────────────────

  // ✅ Bright satisfying chime — rising major arpeggio
  gameCorrect() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    const notes=[523.25,659.25,783.99,1046.5]
    notes.forEach((f,i)=>{
      tone(a,f,'sine',t+i*0.07,0.18,0.3)
      tone(a,f*2,'sine',t+i*0.07,0.08,0.06)  // shimmer octave
    })
  },

  // ❌ Soft low thud — not harsh, just clearly wrong
  gameWrong() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    tone(a,160,'triangle',t,0.14,0.18)
    noise(a,t+0.02,0.12,0.08)
  },

  // 🎉 Level complete fanfare — triumphant 6-note melody
  levelComplete() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    const melody=[523,659,784,1047,784,1047,1319]
    const timings=[0,0.12,0.24,0.36,0.50,0.58,0.70]
    const durs   =[0.2, 0.2, 0.2, 0.3, 0.15,0.15,0.55]
    melody.forEach((f,i)=>{
      tone(a,f,'triangle',t+timings[i],durs[i],0.35)
      if(i===melody.length-1) tone(a,f*1.5,'sine',t+timings[i]+0.02,0.6,0.12)
    })
    // Bass hit
    tone(a,130,'sawtooth',t,0.08,0.25)
    tone(a,130,'sawtooth',t+0.36,0.08,0.25)
  },

  // 🔓 Unlock — cosmic shimmer sweep upward
  unlockSound() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    try {
      const o=a.createOscillator(), g=a.createGain()
      const rev=a.createConvolver()
      o.connect(g); g.connect(a.destination)
      o.type='sine'
      o.frequency.setValueAtTime(200,t)
      o.frequency.exponentialRampToValueAtTime(2400,t+0.9)
      g.gain.setValueAtTime(0.001,t)
      g.gain.linearRampToValueAtTime(0.3,t+0.05)
      g.gain.exponentialRampToValueAtTime(0.001,t+0.9)
      o.start(t); o.stop(t+1)
      // Harmony
      const o2=a.createOscillator(), g2=a.createGain()
      o2.connect(g2); g2.connect(a.destination)
      o2.type='sine'
      o2.frequency.setValueAtTime(300,t+0.1)
      o2.frequency.exponentialRampToValueAtTime(3600,t+1.0)
      g2.gain.setValueAtTime(0.001,t+0.1)
      g2.gain.linearRampToValueAtTime(0.15,t+0.15)
      g2.gain.exponentialRampToValueAtTime(0.001,t+1.0)
      o2.start(t+0.1); o2.stop(t+1.1)
      // Sparkle high notes
      ;[1200,1800,2400,3000].forEach((f,i)=>tone(a,f,'sine',t+0.4+i*0.12,0.15,0.08))
    } catch(e) {}
  },

  // ⏰ Timer warning — escalating ticks when time is low
  timerTick(urgency=1) {
    // urgency 1-3: 1=yellow, 2=orange, 3=red
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    const freq = urgency===1 ? 880 : urgency===2 ? 1047 : 1320
    const vol  = urgency===1 ? 0.12 : urgency===2 ? 0.18 : 0.28
    tone(a,freq,'square',t,0.05,vol)
    if(urgency>=3) tone(a,freq*0.5,'square',t+0.03,0.04,vol*0.5)
  },

  // 🔥 Combo/streak — escalating tone per combo level
  combo(level=1) {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    const baseFreq = 440 * Math.pow(1.15, Math.min(level-1, 10))
    tone(a,baseFreq,'sine',t,0.12,0.2)
    tone(a,baseFreq*1.5,'sine',t+0.06,0.1,0.15)
    if(level>=3) tone(a,baseFreq*2,'sine',t+0.1,0.08,0.12)
    if(level>=5) tone(a,baseFreq*3,'sine',t+0.13,0.06,0.1)
  },

  // Card flip
  cardFlip() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    tone(a,1200,'sine',t,0.04,0.08); tone(a,800,'sine',t+0.03,0.04,0.06)
  },

  // Tile move
  tileMove() {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    tone(a,400,'sine',t,0.05,0.07)
  },

  // Button press in sequence game
  seqButton(idx) {
    if(!_on)return; const a=ac();if(!a)return; const t=a.currentTime
    const freqs=[261,294,329,349,392,440,494,523,587]
    tone(a,freqs[idx%freqs.length],'sine',t,0.2,0.28)
  },
}

export const Haptics = {
  tap()           { try{navigator.vibrate?.(8)}catch(e){} },
  correct()       { try{navigator.vibrate?.(40)}catch(e){} },
  wrong()         { try{navigator.vibrate?.([50,30,50])}catch(e){} },
  badgeUnlocked() { try{navigator.vibrate?.(180)}catch(e){} },
  timerDone()     { try{navigator.vibrate?.([80,40,80,40,160])}catch(e){} },
}
