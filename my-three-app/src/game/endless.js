// Endless mode ("Pager Duty"): no 7 AM. Incidents come in named waves that get
// bigger and faster; three strikes ends the run. Between waves there's a short
// break where you can nap: the dream is a bonus stage.
//
// Wave timings are real seconds (state.elapsed). Each wave is seeded from the
// shift seed, so a daily endless run is the same for everyone.

// Wave names and the opening message: content/night.json
import { makeRng } from './rng'
import { GATES } from './gates'
import NIGHT_TEXT from '../content/night.json'

export const ENDLESS_SCRIPT = NIGHT_TEXT.endlessScript

export const FIRST_BREAK_SECONDS = 6 // before wave 1
export const BREAK_SECONDS = 15
export const NAP_SECONDS = 40 // a bonus-stage dream may run this long into the break
export const BOSS_EVERY = 5

const WAVE_NAMES = NIGHT_TEXT.waveNames

// Escalation meters fill this much faster each wave
export const waveSpeed = (n) => 1 + 0.07 * (n - 1)

// One incident type in wave 1, more from wave 2, the hard ones later (gates.js)
function poolFor(n) {
  if (n === 1) return ['cpu-spike']
  const pool = ['cpu-spike', 'disk', 'checkout']
  if (n >= GATES.hardIncidents.wave) pool.push('queue', 'cascade')
  return pool
}

// { n, name, boss, spawns: [{ at, id }], wifiAt, powerAt, pickups: [at] } with
// times relative to the wave start
export function makeWave(seed, n) {
  const rng = makeRng((seed + n * 7919) >>> 0)
  const boss = n % BOSS_EVERY === 0
  const count = Math.min(3 + n, 12)
  const gap = Math.max(3.5, 13 - n)
  const spawns = []
  let t = 2
  for (let i = 0; i < count; i++) {
    spawns.push({ at: t, id: rng.pick(poolFor(n)) })
    // Later waves stack incidents on top of each other
    if (rng.chance(Math.min(0.5, 0.06 * n))) spawns.push({ at: t + 0.5 + rng.range(0, 1.5), id: rng.pick(poolFor(n)) })
    t += gap + rng.range(-1.5, 1.5)
  }
  if (boss) spawns.push({ at: t + 2, id: 'director' })
  return {
    n,
    name: boss ? NIGHT_TEXT.bossWaveName : WAVE_NAMES[(n - 1) % WAVE_NAMES.length],
    boss,
    spawns,
    // The first wave each one unlocks, it always happens (that's how you meet it)
    wifiAt: n === GATES.wifi.wave || (n > GATES.wifi.wave && rng.chance(0.35)) ? rng.range(4, t) : null,
    powerAt: n === GATES.power.wave || (n > GATES.power.wave && rng.chance(0.3)) ? rng.range(4, t) : null,
    pickups: Array.from({ length: 1 + rng.int(2) }, () => rng.range(3, t)),
  }
}

// Points for clearing a wave, and for doing it without a strike
export const waveClearPoints = (n) => 400 * n
export const PERFECT_WAVE_POINTS = 1000
