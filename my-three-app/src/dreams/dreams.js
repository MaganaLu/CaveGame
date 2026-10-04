// Dream Sprint: asleep, you get quick developer-parody tasks (sprintTasks.js),
// one decision each. Every task you nail goes into a bank and raises the
// multiplier. Wake up (W) to keep the bank; if the pager wakes you first you keep
// half. Waking in the last seconds before it rings is a PERFECT WAKE.

// Seconds of sleep before the dream starts
export const FALL_ASLEEP_SECONDS = 1.5

// Seconds before the next incident when the pager starts bleeding in: [faint, loud].
// Waking inside the loud window is a PERFECT WAKE.
export const WARNING_SECONDS = [10, 4]
export const PERFECT_WAKE_BONUS = 1.5

// The incoming incident shows up as a ticket in the dream this close to the pager
export const LEAK_SECONDS = 14

// Bank and multiplier
export const TASK_POINTS = 150
export const MULT_STEP = 0.25 // per success
export const MULT_DROP = 0.5 // per fumble
export const MULT_MAX = 3
export const YANKED_KEEP = 0.5 // share of the bank you keep when the pager wakes you
export const TASK_STRESS = 3 // stress off per task you nail

// Each task's time limit shrinks the longer you stay asleep (9 s → 3.5 s)
export const taskSeconds = (cleared) => Math.max(3.5, 9 - 0.4 * cleared)
// The first few times you meet a kind of task you get extra time to work it out
export const NEW_TASK_BONUS = 1.6 // × the time limit
export const NEW_TASK_TIMES = 3 // for this many encounters (remembered per browser)

export const shuffle = (list) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
