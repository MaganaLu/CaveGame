// Fix microgames. Picking the right fix on a terminal is the diagnosis; actually
// doing it is a 5–10 second skill test, so you can get better at it. Some
// incidents also need hands-on work at the server rack (in the bathroom).

import { makeRng } from './rng'

// Which microgame executes each incident type's fix (UI in ui/microgames/)
const TERMINAL_GAME = {
  'cpu-spike': 'whack', // click the rogue process as `top` reshuffles
  disk: 'purge', // delete the huge files, not prod.db
  checkout: 'type', // type the rollback command
  queue: 'timing', // drain the queue on the beat
  cascade: 'order', // restart services in dependency order
}
export const terminalGameFor = (def) => TERMINAL_GAME[def.id] ?? 'type'
export const RACK_GAME = 'cables'

// Mistakes allowed before you fumble it
export const MAX_MISTAKES = 3

// 0 early in the night → 1 late (or deep into an endless run)
export function difficultyOf(s) {
  if (s.length === 'endless') return Math.min(1, ((s.wave?.n ?? 1) - 1) / 8)
  return Math.min(1, s.gameTime / 420)
}
export const timeLimitFor = (difficulty) => 11 - 5.5 * difficulty // 11 s at first, 5.5 s at the end

// 1 = instant and clean. Each mistake costs a quarter, slowness up to half.
export function executionQuality({ mistakes, used, limit }) {
  const q = (1 - 0.25 * mistakes) * (1 - 0.5 * Math.min(1, used / limit))
  return Math.max(0, Math.min(1, q))
}

// ------------------------------------------------------------------ the rack
// Hardware incidents need a second step at the rack once the software side is
// done. Seeded per incident, so a daily shift is the same for everyone.
const RACK_CHANCE = { disk: 0.6, cascade: 0.5, 'cpu-spike': 0.35, queue: 0.2 }
const RACK_TASKS = {
  disk: (rng) => `Swap the failed drive in BAY ${1 + rng.int(8)}`,
  cascade: () => 'Power-cycle DB-01 (the loud one)',
  'cpu-spike': (rng) => `Reseat the API-0${1 + rng.int(4)} blade`,
  queue: () => 'Re-cable the message broker',
}

export function rackTaskFor(def, seed) {
  const rng = makeRng((seed ^ 0x5eed) >>> 0)
  const chance = RACK_CHANCE[def.id] ?? 0
  return rng.chance(chance) ? RACK_TASKS[def.id](rng) : null
}
