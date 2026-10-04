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

// Dave's notes: one line the first time each thing shows up
export const TIPS = {
  pager: '📓 Dave: Pager went off? Phone on the nightstand, then the PC in the desk room. This first one: the fix glows.',
  greg: "📓 Dave: That's Greg. Say the boring answer.",
  rack: "📓 Dave: Some fixes need hardware. The server rack is in the bathroom. Don't ask.",
  power: "📓 Dave: Breaker's in the kitchen. The laptop on the counter has a battery.",
  wifi: '📓 Dave: Wi-Fi. Router by the front door. Unplug it, plug it in.',
  lever: '📓 Dave: There is a big red lever on the rack. It restarts EVERYTHING. Half the time.',
  director: '📓 Dave: Oh no. The Director. Fix his laptop first; everything is faster while he watches.',
  escalation: '📓 Dave: Ignore a page and it escalates. Greg first. Then the Director. Ask me how I know.',
  partner: "📓 Dave: Your partner is asleep in there. Every ring wakes them a little more. Answer FAST.",
  couch: '📓 Dave: Welcome to the couch. It is in the living room. It is now your bed.',
  banana: '📓 Dave: Golden banana = double points for 30 seconds. Grab it.',
  nap: '📓 Dave: Nothing on fire? The bed. A nap calms you down (and pays).',
}
