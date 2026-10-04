// Local arcade high scores: one top-10 per daily shift, plus one for random
// shifts, each separately per shift length (quick and endless boards get a
// suffix, so story boards from before those existed still load). Stored in localStorage; every access is guarded so private windows or
// blocked storage just mean "no leaderboard", never a crash.

const KEY = 'oncall.highscores.v1'
export const BOARD_SIZE = 10

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { daily: {}, random: [] }
  } catch {
    return { daily: {}, random: [] }
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage full or blocked: scores just won't persist
  }
}

const dailyKey = (shift, length) => (length === 'story' ? `${shift}` : `${shift}:${length}`)
const randomKey = (length) => ({ story: 'random', quick: 'randomQuick', endless: 'randomEndless' })[length]
const boardOf = (data, mode, shift, length) =>
  (mode === 'daily' ? data.daily[dailyKey(shift, length)] : data[randomKey(length)]) ?? []

export function getBoard(mode, shift, length = 'story') {
  return boardOf(load(), mode, shift, length)
}

export function qualifies(mode, shift, length, score) {
  const board = getBoard(mode, shift, length)
  return board.length < BOARD_SIZE || score > board[board.length - 1].score
}

// Returns the new entry's rank (0-based), or -1 if it didn't make the board
export function addScore(mode, shift, length, entry) {
  const data = load()
  const stamped = { ...entry, id: Date.now() }
  const board = [...boardOf(data, mode, shift, length), stamped].sort((a, b) => b.score - a.score).slice(0, BOARD_SIZE)
  if (mode === 'daily') data.daily[dailyKey(shift, length)] = board
  else data[randomKey(length)] = board
  save(data)
  return board.findIndex((e) => e.id === stamped.id)
}
