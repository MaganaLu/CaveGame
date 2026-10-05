import TIP_TEXT from '../content/tips.json'

// Introduce one thing at a time. Each mechanic switches on at an Endless wave, or
// a time of night in a story shift (game minutes since 11 PM). Story spaces them
// out: the first hour is just the pager and the PC. Quick shifts are for players
// who know the game: everything is on from the start.
export const GATES = {
  greg: { wave: 3, gameTime: 120 }, // 1 AM: Greg starts calling (and pages escalate to him)
  partner: { wave: 2, gameTime: 120 }, // 1 AM: the phone starts waking your partner
  rack: { wave: 4, gameTime: 180 }, // 2 AM: some fixes need the server rack
  wifi: { wave: 8, gameTime: 150 }, // the Wi-Fi can drop
  power: { wave: 6, gameTime: 240 }, // 3 AM: the breaker can trip
  lever: { wave: 7, gameTime: 270 }, // 3:30 AM: the Big Red Lever, and its first charge
  hardIncidents: { wave: 8, gameTime: 200 }, // queue backlogs and cascades
}

export function unlocked(s, feature) {
  if (s.length === 'quick') return true
  const gate = GATES[feature]
  return s.wave ? s.wave.n >= gate.wave : s.gameTime >= gate.gameTime
}

// Dave's notes: one line the first time each thing shows up (content/tips.json)
export const TIPS = TIP_TEXT
