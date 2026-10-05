// Shift setup picked on the sign-in screen: how long the night is, and which
// modifiers make it harder (and worth more). Names, notes and the modifiers
// are in content/locales/en/shifts.json; the pacing numbers are here.

// Game minutes per real second (the clock always runs 11 PM → 7 AM; asleep and
// dreaming run at their own rates), and how often Greg calls (a multiplier on his
// timers).
import { text } from '../content'

const SHIFT_TEXT = text('shifts')
export const LENGTHS = {
  story: {
    id: 'story',
    ...SHIFT_TEXT.lengths.story,
    awake: 0.667,
    sleep: 3,
    dream: 0.8, // slower while dreaming so the mini-game has room to breathe
    calls: 1,
    // The gentle mode: everything is slower and more forgiving, ramping up
    // through the night (see easeOf)
    ease: {
      escalation: [0.35, 0.8], // incident speed for pages at 11 PM → 7 AM
      microgame: 1.5, // × microgame time
      dreamTask: 1.3, // × dream task time
      callRing: 18, // seconds Greg rings before it counts as missed
      callChoice: 14, // seconds to pick a reply
      missedAfter: 40, // seconds a page can ring before it's missed (and escalates to the Director)
      escalateToGreg: 20, // seconds a page rings before it escalates to Greg
      stress: 0.6, // × stress gained
    },
  },
  quick: {
    id: 'quick',
    ...SHIFT_TEXT.lengths.quick,
    awake: 2,
    sleep: 4,
    dream: 2,
    calls: 0.6,
  },
  // Waves until you're fired (endless.js). Naps between waves are bonus stages.
  endless: {
    id: 'endless',
    ...SHIFT_TEXT.lengths.endless,
    awake: 0.667,
    sleep: 3,
    dream: 0.8,
    calls: 0.8,
  },
}

export const MODIFIERS = SHIFT_TEXT.modifiers

export const hasMod = (state, id) => state.mods.includes(id)

// Arcade pace (Quick, Endless): no easing
const ARCADE = {
  escalation: [1, 1],
  microgame: 1,
  dreamTask: 1,
  callRing: 12,
  callChoice: 7,
  missedAfter: 25,
  escalateToGreg: 12,
  stress: 1,
}
export const easeOf = (s) => LENGTHS[s.length]?.ease ?? ARCADE

// Escalation speed for an incident arriving now (Story ramps through the night)
export function escalationFactor(s) {
  const [start, end] = easeOf(s).escalation
  return start + (end - start) * Math.min(1, s.gameTime / 420)
}

// Every score gain is multiplied by this (penalties are not)
export const modMultiplier = (mods) => mods.reduce((m, id) => m * (MODIFIERS.find((x) => x.id === id)?.mult ?? 1), 1)

export const modIcons = (mods = []) => mods.map((id) => MODIFIERS.find((x) => x.id === id)?.icon ?? '').join('')
