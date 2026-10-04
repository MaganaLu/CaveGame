// Shift setup picked on the sign-in screen: how long the night is, and which
// modifiers make it harder (and worth more).

// Game minutes per real second (the clock always runs 11 PM → 7 AM; asleep and
// dreaming run at their own rates), and how often Greg calls (a multiplier on his
// timers).
export const LENGTHS = {
  story: {
    id: 'story',
    name: 'Story shift',
    note: '11 PM → 7 AM · about 12 minutes',
    awake: 0.667,
    sleep: 3,
    dream: 0.8, // slower while dreaming so the mini-game has room to breathe
    calls: 1,
  },
  quick: {
    id: 'quick',
    name: 'Quick shift',
    note: '4 minutes · pages from the first minute',
    awake: 2,
    sleep: 4,
    dream: 2,
    calls: 0.6,
  },
  // Waves until you're fired (endless.js). Naps between waves are bonus stages.
  endless: {
    id: 'endless',
    name: 'Endless',
    note: 'Waves until you get fired · nap between waves',
    awake: 0.667,
    sleep: 3,
    dream: 0.8,
    calls: 0.8,
  },
}

export const MODIFIERS = [
  { id: 'greg', icon: '☎️', name: 'Greg calls twice as often', note: 'He just wants a quick sync', mult: 1.3 },
  { id: 'dark', icon: '🌑', name: 'Lights stay off', note: 'Facilities is "looking into it"', mult: 1.5 },
]

export const hasMod = (state, id) => state.mods.includes(id)

// Every score gain is multiplied by this (penalties are not)
export const modMultiplier = (mods) => mods.reduce((m, id) => m * (MODIFIERS.find((x) => x.id === id)?.mult ?? 1), 1)

export const modIcons = (mods = []) => mods.map((id) => MODIFIERS.find((x) => x.id === id)?.icon ?? '').join('')
