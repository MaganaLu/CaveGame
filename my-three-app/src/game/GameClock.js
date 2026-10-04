// Night runs 11:00 PM -> 7:00 AM, stored as game minutes since 11:00 PM.
export const NIGHT_START_HOUR = 23
export const NIGHT_LENGTH = 8 * 60

// Game minutes per real second. Awake: ~12 real minutes per night.
export const AWAKE_RATE = 0.667
export const SLEEP_RATE = 3
// Slower while dreaming so the mini-game has room to breathe
export const DREAM_RATE = 0.8

export function formatClock(gameTime) {
  const total = Math.floor(NIGHT_START_HOUR * 60 + gameTime) % (24 * 60)
  const h24 = Math.floor(total / 60)
  const m = total % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatCountdown(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
