// Things you unlock by playing, kept in this browser. Every access is guarded:
// blocked storage just means nothing stays unlocked between visits.

const KEY = 'oncall.unlocks.v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

// Shift modifiers show up on the sign-in screen after your first finished shift
export const modifiersUnlocked = () => load().modifiers === true

export function unlockModifiers() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), modifiers: true }))
  } catch {
    // storage blocked: they'll unlock again next shift
  }
}

// How many times you've met each kind of dream task (new ones get extra time)
export const timesSeen = (key) => load().seen?.[key] ?? 0

export function countSeen(key) {
  try {
    const data = load()
    const seen = typeof data.seen === 'object' && !Array.isArray(data.seen) ? data.seen : {}
    localStorage.setItem(KEY, JSON.stringify({ ...data, seen: { ...seen, [key]: (seen[key] ?? 0) + 1 } }))
  } catch {
    // storage blocked: every task just counts as new
  }
}
