// Seeded randomness so a shift (daily seed) plays the same for everyone.
// mulberry32: tiny, fast, good enough for games.

export function makeRng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng = {
    next,
    int: (n) => Math.floor(next() * n), // 0..n-1
    range: (lo, hi) => lo + next() * (hi - lo),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    shuffle: (list) => {
      const a2 = [...list]
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[a2[i], a2[j]] = [a2[j], a2[i]]
      }
      return a2
    },
  }
  return rng
}

// Daily shift number: same for everyone on the same day
const EPOCH = Date.UTC(2026, 0, 1)
export const todaysShift = () => Math.floor((Date.now() - EPOCH) / 86400000) + 1
export const seedForShift = (shift) => (shift * 2654435761) >>> 0
export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0
