// Placeholder SFX synthesized with WebAudio so the slice needs no audio assets.
let ctx = null

export function initAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
}

function tone({ freq, type = 'sine', start = 0, duration = 0.2, gain = 0.2, slideTo }) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

// Real pager recording, looped for as long as an alert is unanswered.
// Guarded so the store can still run outside a browser (e.g. simulations).
const pager = typeof Audio !== 'undefined'
  ? new Audio(`${import.meta.env.BASE_URL}assets/sounds/OnCallPagerSound.mp3`)
  : null
if (pager) {
  pager.loop = true
  pager.preload = 'auto'
}

// volume 0 stops it. Partial volume is the pager bleeding into a dream before it wakes you.
export function setPager(volume) {
  if (!pager) return
  if (volume > 0) {
    pager.volume = volume
    if (pager.paused) {
      pager.currentTime = 0
      pager.play().catch(() => {}) // blocked until the first user gesture; START NIGHT is one
    }
  } else if (!pager.paused) {
    pager.pause()
  }
}

export function messageDing() {
  tone({ freq: 880, start: 0, duration: 0.1, gain: 0.06 })
  tone({ freq: 1175, start: 0.08, duration: 0.15, gain: 0.06 })
}

// Each consecutive fix plays a semitone higher, so you can hear the streak
export function success(streak = 1) {
  const pitch = 2 ** (Math.min(streak - 1, 12) / 12)
  ;[523, 659, 784, 1047].forEach((f, i) => tone({ freq: f * pitch, type: 'triangle', start: i * 0.07, duration: 0.2, gain: 0.12 }))
}

export function error() {
  tone({ freq: 140, type: 'square', duration: 0.25, gain: 0.1 })
}

export function click() {
  tone({ freq: 2200, type: 'square', duration: 0.02, gain: 0.03 })
}

export function heartbeat() {
  tone({ freq: 60, start: 0, duration: 0.12, gain: 0.3, slideTo: 40 })
  tone({ freq: 55, start: 0.22, duration: 0.12, gain: 0.2, slideTo: 38 })
}

export function wakeGlitch() {
  tone({ freq: 2000, type: 'sawtooth', duration: 0.5, gain: 0.08, slideTo: 80 })
}

// ------------------------------------------------------------------ horror + calls

function noise({ start = 0, duration = 0.3, gain = 0.2, filter = 800, pan = 0 }) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = filter
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null
  let node = src.connect(lp).connect(g)
  if (panner) {
    panner.pan.value = pan
    node = node.connect(panner)
  }
  node.connect(ctx.destination)
  src.start(t)
  src.stop(t + duration + 0.05)
}

// Old-phone "brrring brrring": Greg is calling (distinct from the pager)
export function ringtone() {
  for (let i = 0; i < 2; i++) {
    tone({ freq: 440, type: 'square', start: i * 0.5, duration: 0.4, gain: 0.05 })
    tone({ freq: 480, type: 'square', start: i * 0.5, duration: 0.4, gain: 0.05 })
  }
}

// Arcade fanfare: a wave starts, the Director joins
export function sting() {
  ;[523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'square', start: i * 0.09, duration: 0.22, gain: 0.05 }))
}

export function staticBurst() {
  noise({ duration: 0.4, gain: 0.12, filter: 5000 })
}

// ------------------------------------------------------------------ weather

// Looping rain: filtered noise, faded in/out with setRain(volume)
let rainGain = null
export function setRain(volume) {
  if (!ctx) return
  if (!rainGain) {
    const length = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1600
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 300
    rainGain = ctx.createGain()
    rainGain.gain.value = 0
    src.connect(lp).connect(hp).connect(rainGain).connect(ctx.destination)
    src.start()
  }
  rainGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.8)
}

// Distant thunder: a long low rumble
export function thunder() {
  noise({ duration: 3.2, gain: 0.35, filter: 140 })
  tone({ freq: 48, type: 'sawtooth', duration: 2.5, gain: 0.08, slideTo: 30 })
}
