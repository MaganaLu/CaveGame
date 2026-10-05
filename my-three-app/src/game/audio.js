import { create } from 'zustand'

// The game's sound. Effects are recordings in public/assets/sounds/ (Kenney's
// Interface Sounds, CC0, plus the pager and the music); each one
// has a synthesized stand-in that plays until it loads, or if the browser can't
// decode it.
// Everything runs through two buses (music, effects) under a master volume, which
// Settings controls.
let ctx = null
let master = null
let sfxBus = null
let musicBus = null

const SOUNDS = `${import.meta.env.BASE_URL}assets/sounds/`
const hasAudio = typeof Audio !== 'undefined'

// ------------------------------------------------------------------ volume (Settings)
const VOLUME_KEY = 'volume'
const DEFAULT_VOLUME = { master: 0.8, music: 0.5, sfx: 0.8 }

function loadVolume() {
  try {
    return { ...DEFAULT_VOLUME, ...JSON.parse(localStorage.getItem(VOLUME_KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT_VOLUME }
  }
}

export const useVolume = create((set, get) => ({
  ...loadVolume(),
  setVolume: (bus, value) => {
    set({ [bus]: value })
    const { master: m, music, sfx } = get()
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify({ master: m, music, sfx }))
    } catch {
      // storage blocked: lasts until reload
    }
    applyVolume()
  },
}))

function applyVolume() {
  if (!ctx) return
  const v = useVolume.getState()
  master.gain.setTargetAtTime(v.master, ctx.currentTime, 0.05)
  musicBus.gain.setTargetAtTime(v.music, ctx.currentTime, 0.05)
  sfxBus.gain.setTargetAtTime(v.sfx, ctx.currentTime, 0.05)
}

// ------------------------------------------------------------------ setup

// Browsers only allow sound after the player clicks or presses a key: start on the
// first one (the sign-in screen), so the menu has music too
export function initAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.connect(master)
    musicBus = ctx.createGain()
    musicBus.connect(master)
    applyVolume()
    if (pager) ctx.createMediaElementSource(pager).connect(sfxBus)
    setupMusic()
    for (const [name, cue] of Object.entries(CUES)) cue.files.forEach((file, i) => loadSample(`${name}:${i}`, file))
  }
  if (ctx.state === 'suspended') ctx.resume()
}
if (typeof window !== 'undefined') {
  const first = () => {
    initAudio()
    window.removeEventListener('pointerdown', first, true)
    window.removeEventListener('keydown', first, true)
  }
  window.addEventListener('pointerdown', first, true)
  window.addEventListener('keydown', first, true)
}

// ------------------------------------------------------------------ the cue sheet
// Which recording plays for what. To try another sound, change the file name here
// (kenney_interface-sounds/Audio/ has ~100 to pick from). Several files = one is
// picked at random each time, so repeated sounds don't feel robotic.
const K = 'kenney_interface-sounds/Audio/'
const CUES = {
  click: { files: [`${K}click_002.ogg`], gain: 0.5 }, // buttons, answering, inspecting
  error: { files: [`${K}error_006.ogg`], gain: 0.6 }, // wrong fix, mistake, something broke
  success: { files: [`${K}confirmation_002.ogg`], gain: 0.7 }, // a fix (pitched up with the streak)
  ping: { files: [`${K}question_001.ogg`], gain: 0.6 }, // a message on the phone
  open: { files: [`${K}open_002.ogg`], gain: 0.5 }, // PC / rack / lever screen opens
  close: { files: [`${K}close_002.ogg`], gain: 0.5 }, // … and closes
  key: { files: [1, 2, 3, 4, 5].map((n) => `${K}click_00${n}.ogg`), gain: 0.25 }, // typing a command
  hit: { files: [`${K}select_002.ogg`], gain: 0.5 }, // a microgame step done
  trash: { files: [`${K}scratch_002.ogg`], gain: 0.5 }, // deleting a file
  plug: { files: [`${K}switch_003.ogg`], gain: 0.6 }, // cable in, service restarted
  toggle: { files: [`${K}toggle_002.ogg`], gain: 0.5 }, // flashlight on/off
  pickup: { files: [`${K}pluck_001.ogg`], gain: 0.6 }, // phone, flashlight
  phoneUp: { files: [`${K}maximize_003.ogg`], gain: 0.35 }, // TAB: look at the phone
  phoneDown: { files: [`${K}minimize_003.ogg`], gain: 0.35 },
  dreamOk: { files: [`${K}glass_002.ogg`], gain: 0.6 }, // nailed a dream task
  glitch: { files: [`${K}glitch_002.ogg`], gain: 0.6 }, // yanked awake
  lever: { files: [`${K}glitch_004.ogg`], gain: 0.7 }, // RESTART EVERYTHING
  bong: { files: [`${K}bong_001.ogg`], gain: 0.7 }, // a wave starts, the Director joins
  tick: { files: [`${K}tick_002.ogg`], gain: 0.4 }, // stress over 70: the clock in your head
}

// Short recordings, decoded once and played as often as needed (they can overlap)
const samples = {}
function loadSample(name, file) {
  fetch(SOUNDS + file)
    .then((r) => r.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      samples[name] = buffer
    })
    .catch(() => {})
}
// Play a cue from the sheet. False if it isn't loaded (the caller then synthesizes)
function play(name, { rate = 1, gain = 1 } = {}) {
  const cue = CUES[name]
  if (!ctx || !cue) return false
  const loaded = cue.files.map((_, i) => samples[`${name}:${i}`]).filter(Boolean)
  if (!loaded.length) return false
  const src = ctx.createBufferSource()
  src.buffer = loaded[Math.floor(Math.random() * loaded.length)]
  src.playbackRate.value = rate
  const g = ctx.createGain()
  g.gain.value = cue.gain * gain
  src.connect(g).connect(sfxBus)
  src.start()
  return true
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
  osc.connect(g).connect(sfxBus)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

// Real pager recording, looped for as long as an alert is unanswered.
// Guarded so the store can still run outside a browser (e.g. simulations).
const pager = hasAudio ? new Audio(`${SOUNDS}OnCallPagerSound.mp3`) : null
if (pager) {
  pager.loop = true
  pager.preload = 'auto'
}

// volume 0 stops it; rate < 1 plays it slowed down
export function setPager(volume, rate = 1) {
  if (!pager) return
  if (volume > 0) {
    pager.volume = volume
    pager.preservesPitch = false
    if (pager.playbackRate !== rate) pager.playbackRate = rate
    if (pager.paused) {
      pager.currentTime = 0
      pager.play().catch(() => {}) // blocked until the first user gesture; START NIGHT is one
    }
  } else if (!pager.paused) {
    pager.pause()
  }
}

// ------------------------------------------------------------------ music
// One looping track that reacts to the night. It's a single mix (not stems), so the
// reaction is in how it's heard: muffled "through the wall" while things are calm,
// opening up and getting louder as incidents escalate, a touch faster on boss waves
// and clutch moments, slowed and dreamy asleep, ducked under the pager and Greg's
// ringtone, warped while the pager rings in a dream, and cut for a moment on an
// SLA breach.
const music = hasAudio ? new Audio(`${SOUNDS}Game-World-Silliness.mp3`) : null
if (music) {
  music.loop = true
  music.preload = 'auto'
  music.preservesPitch = false // the speed-up is meant to sound like an arcade speed-up
}
let musicFilter = null
let musicGain = null
let lastBreaches = 0
let cutUntil = 0

function setupMusic() {
  if (!music) return
  musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 800
  musicGain = ctx.createGain()
  musicGain.gain.value = 0
  ctx.createMediaElementSource(music).connect(musicFilter).connect(musicGain).connect(musicBus)
}

// How bad the night is right now, 0 (nothing open) to 1 (on fire)
function intensity(s) {
  if (!s.incidents.length) return 0
  const worst = Math.max(...s.incidents.map((i) => i.meter)) / 100
  const many = Math.min(1, s.incidents.length / 3)
  let x = Math.max(worst, 0.35 + 0.4 * many)
  if (s.wave?.def?.boss && s.wave.status === 'active') x = Math.max(x, 0.85)
  return Math.min(1, x)
}

// Called every game tick (GameManager) with the store's state
export function updateMusic(s) {
  if (!ctx || !musicGain) return
  if (music.paused) music.play().catch(() => {})
  const now = ctx.currentTime
  const asleep = s.phase === 'SLEEPING' || s.phase === 'DREAM'
  const inNight = s.phase !== 'MENU' && s.phase !== 'NIGHT_COMPLETE'

  // An SLA breach: the music drops out for a moment
  const breaches = s.stats?.breached ?? 0
  if (inNight && breaches > lastBreaches) cutUntil = now + 1.6
  lastBreaches = inNight ? breaches : 0

  let cutoff, volume, rate
  if (!inNight) {
    ;[cutoff, volume, rate] = [1400, 0.5, 1]
  } else if (asleep) {
    // Dreamy; while the pager rings in the dream (let it ring) it warps and sinks
    // under the pager and the hazard-pay ticks
    ;[cutoff, volume, rate] = s.dreamRinging ? [330, 0.3, 0.78] : [500, 0.45, 0.9]
  } else {
    const x = intensity(s)
    cutoff = 700 * Math.pow(18000 / 700, x) // muffled → full, on a log scale
    volume = 0.45 + 0.55 * x
    const clutch = s.incidents.some((i) => i.meter >= 90 && i.stage < 3)
    rate = clutch || (s.wave?.def?.boss && s.wave.status === 'active') ? 1.06 : 1
  }
  // Duck under the pager and Greg's ringtone
  const ringing = s.incidents.some((i) => !i.acknowledged) || s.call?.status === 'ringing'
  if (ringing && inNight && !asleep) volume *= 0.35
  if (now < cutUntil) volume = 0

  musicFilter.frequency.setTargetAtTime(cutoff, now, 0.6)
  musicGain.gain.setTargetAtTime(volume, now, now < cutUntil ? 0.05 : 0.5)
  if (Math.abs(music.playbackRate - rate) > 0.001) music.playbackRate = rate
}

// A message on the phone: a ping (synth ding until it has loaded)
export function messageDing() {
  if (play('ping')) return
  tone({ freq: 880, start: 0, duration: 0.1, gain: 0.06 })
  tone({ freq: 1175, start: 0.08, duration: 0.15, gain: 0.06 })
}

// Each consecutive fix plays a semitone higher, so you can hear the streak
export function success(streak = 1) {
  const pitch = 2 ** (Math.min(streak - 1, 12) / 12)
  if (play('success', { rate: pitch })) return
  ;[523, 659, 784, 1047].forEach((f, i) => tone({ freq: f * pitch, type: 'triangle', start: i * 0.07, duration: 0.2, gain: 0.12 }))
}

export function error() {
  if (play('error')) return
  tone({ freq: 140, type: 'square', duration: 0.25, gain: 0.1 })
}

export function click() {
  if (play('click')) return
  tone({ freq: 2200, type: 'square', duration: 0.02, gain: 0.03 })
}

// Stress over 70: a clock ticking in your head, faster as it climbs
export function stressTick() {
  if (play('tick')) return
  tone({ freq: 1800, type: 'square', duration: 0.03, gain: 0.03 })
}

export function wakeGlitch() {
  if (play('glitch')) return
  tone({ freq: 2000, type: 'sawtooth', duration: 0.5, gain: 0.08, slideTo: 80 })
}

// LET IT RING: each beat of hazard pay ticks a little higher
export function hazardBeat(beat) {
  const rate = 2 ** (Math.min(beat, 24) / 24) // up an octave over ~15 s
  if (play('tick', { rate, gain: 1.4 })) return
  tone({ freq: 1200 * rate, type: 'square', duration: 0.04, gain: 0.04 })
}

// Little sounds with no synth stand-in: silent until loaded
export const screenOpen = () => play('open')
export const screenClose = () => play('close')
export const keystroke = () => play('key')
export const hit = () => play('hit')
export const trash = () => play('trash')
export const plug = () => play('plug')
export const toggle = () => play('toggle') || click()
export const pickup = () => play('pickup') || click()
export const phoneUp = () => play('phoneUp')
export const phoneDown = () => play('phoneDown')
export const dreamOk = () => play('dreamOk') || click()

// ------------------------------------------------------------------ calls

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
  node.connect(sfxBus)
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
  if (play('bong')) return
  ;[523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'square', start: i * 0.09, duration: 0.22, gain: 0.05 }))
}

export function staticBurst() {
  if (play('lever')) return
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
    src.connect(lp).connect(hp).connect(rainGain).connect(sfxBus)
    src.start()
  }
  rainGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.8)
}

// Distant thunder: a long low rumble
export function thunder() {
  noise({ duration: 3.2, gain: 0.35, filter: 140 })
  tone({ freq: 48, type: 'sawtooth', duration: 2.5, gain: 0.08, slideTo: 30 })
}

// What the music is doing right now (for checking the mix from the dev console)
export const musicDebug = () =>
  music && musicGain
    ? { playing: !music.paused, cutoff: Math.round(musicFilter.frequency.value), volume: +musicGain.gain.value.toFixed(2), rate: music.playbackRate }
    : null

// Which cues have loaded (dev console check)
export const cueDebug = () =>
  Object.fromEntries(Object.entries(CUES).map(([name, cue]) => [name, `${cue.files.filter((_, i) => samples[`${name}:${i}`]).length}/${cue.files.length}`]))
