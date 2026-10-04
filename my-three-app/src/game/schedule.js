// Seeded night schedule. Times are game minutes since 11:00 PM (GameClock.js).
// Difficulty ramps: incident gaps shrink, stacks get likelier, SEV-1 cascades
// only appear after ~2 AM, and the Director boss always closes the night.
//
// A quick shift runs the same clock 3x faster (shifts.js), so its schedule is
// written for that: the first page within ~10 real seconds, gaps of ~25 s
// shrinking to ~12 s, and the finale early enough to still be fixable by 7 AM.

// Per length: first incident, gaps (start → end of night), last regular
// incident, the Director boss, home failures, and pickup spacing (game minutes)
const PLANS = {
  // Story: the first page ~1 min in, then gaps of ~2 min shrinking to ~1 min, and
  // no pages piling up until a third of the way through the night
  story: { first: [40, 15], gap: [80, 40], jitter: 8, until: 400, finale: [418, 12], wifi: [150, 90], power: [250, 110], pickups: [35, 30], stackFrom: 0.35 },
  quick: { first: [12, 10], gap: [52, 24], jitter: 6, until: 300, finale: [318, 10], wifi: [60, 80], power: [160, 100], pickups: [40, 30], stackFrom: 0 },
}


import { GATES } from './gates'

const lerp = (a, b, t) => a + (b - a) * t

// Which incidents can show up at a given point in the night: the easy three
// first, queue backlogs and cascades later (story: from GATES.hardIncidents)
function poolAt(t, length) {
  const hard = length === 'story' ? GATES.hardIncidents.gameTime : 120
  if (t < hard) return ['cpu-spike', 'cpu-spike', 'disk', 'checkout']
  if (t < hard + 80) return ['cpu-spike', 'disk', 'checkout', 'queue', 'queue']
  return ['cpu-spike', 'disk', 'checkout', 'queue', 'cascade', 'cascade']
}

export function generateNight(rng, length = 'story') {
  const plan = PLANS[length]
  const events = [
    { at: 0, type: 'message', from: 'PAGERBOT', text: 'You are primary on-call for The Banana Plantation 🍌 (a CodeMonkey Corp company). 23:00 – 07:00.' },
  ]

  let t = plan.first[0] + rng.int(plan.first[1])
  while (t < plan.until) {
    const progress = t / 480
    events.push({ at: t, type: 'incident', id: rng.pick(poolAt(t, length)) })
    // Later in the night incidents arrive in pairs and threes
    const stacking = progress >= plan.stackFrom
    if (stacking && rng.chance(lerp(0.05, 0.55, progress))) events.push({ at: t + 1 + rng.int(4), type: 'incident', id: rng.pick(['cpu-spike', 'disk', 'checkout']) })
    if (stacking && progress > 0.55 && rng.chance(0.25)) events.push({ at: t + 3 + rng.int(4), type: 'incident', id: rng.pick(poolAt(t, length)) })
    t += lerp(plan.gap[0], plan.gap[1], progress) + rng.range(-plan.jitter, plan.jitter)
  }
  events.push({ at: plan.finale[0] + rng.int(plan.finale[1]), type: 'incident', id: 'director' })

  // Things that go wrong at home (fix them physically)
  events.push({ at: plan.wifi[0] + rng.int(plan.wifi[1]), type: 'home', what: 'wifi' })
  events.push({ at: plan.power[0] + rng.int(plan.power[1]), type: 'home', what: 'power' })

  // Golden bananas spawn around the apartment (skipped while you're asleep)
  for (let p = 30 + rng.int(25); p < 460; p += plan.pickups[0] + rng.int(plan.pickups[1])) {
    events.push({ at: p, type: 'pickup', spot: rng.int(1000) })
  }

  return events.sort((a, b) => a.at - b.at)
}
