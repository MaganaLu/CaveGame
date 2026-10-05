// Dream Sprint: asleep, you get quick developer-parody tasks (sprintTasks.js),
// one decision each. Every task you nail goes into a bank and raises the
// multiplier. Wake up (W) any time to keep the bank.
//
// LET IT RING: when a page comes in, the pager goes off *inside the dream* and you
// keep sleeping. Every beat it rings, HAZARD PAY climbs (×1.08 per beat, rising
// tone). Wake up to cash out: bank × hazard pay. But each ring has a hidden fuse
// (3-10 s): when it runs out the page escalates and you're yanked awake, keeping a
// quarter of the bank. Meanwhile the incident is escalating for real and your
// partner is losing patience, so greed costs you awake too.

// Seconds of sleep before the dream starts
export const FALL_ASLEEP_SECONDS = 1.5

// The incoming incident shows up as a ticket in the dream this close to the pager
// (triage it right and it starts pre-diagnosed when you wake)
export const LEAK_SECONDS = 15

// Hazard pay: × HAZARD_GROWTH every beat the pager rings, up to HAZARD_MAX
export const HAZARD_BEAT = 0.6 // seconds
export const HAZARD_GROWTH = 1.08
export const HAZARD_MAX = 4
export const hazardAt = (seconds) => Math.min(HAZARD_MAX, HAZARD_GROWTH ** Math.floor(seconds / HAZARD_BEAT))

// The fuse: how long it rings before it escalates and yanks you awake. Random each
// time, so there's no "right" moment to learn. Story shifts never go below 5 s,
// and show the fuse exactly for the first few rings.
export const FUSE_SECONDS = [3, 10]
export const STORY_FUSE_MIN = 5
export const STORY_FUSE_SHOWN = 2 // rings
export const FUSE_JITTER = 0.15 // the escalation bar's wobble otherwise (± of the bar)

// Bank and multiplier
export const TASK_POINTS = 150
export const MULT_STEP = 0.25 // per success
export const MULT_DROP = 0.5 // per fumble
export const MULT_MAX = 3
export const YANKED_KEEP = 0.25 // share of the bank you keep when it escalates and yanks you awake
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
