// Arcade rules: escalation stages, the streak, grades and payouts.
//
// One number per fix: the grade (how early, how clean, how well you executed the
// microgame) sets the payout; the streak multiplies it. CLUTCH (fixing it in the
// last 10%) is the only bonus on top.

// Each incident's escalation meter fills 0 -> 100 over its def.timeLimit seconds.
import { text } from '../content'

const SCORING_TEXT = text('scoring')
export const STAGES = SCORING_TEXT.stages
const STAGE_THRESHOLDS = [0, 25, 60, 100]
export const CRITICAL = 2
export const OUTAGE = 3

// Seconds an incident can sit in OUTAGE before the SLA is breached
export const BREACH_AFTER = 30
// Seconds a wrong action pushes the meter forward
export const WRONG_ACTION_COST = 8

export function stageOf(meter) {
  let stage = 0
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) if (meter >= STAGE_THRESHOLDS[i]) stage = i
  return stage
}

export const meterRate = (def) => 100 / def.timeLimit
export const secondsToOutage = (inc) => Math.max(0, (100 - inc.meter) / inc.rate)

// ------------------------------------------------------------------ streak
// x1 -> x1.0, then +0.25 per consecutive fix, capped at x3. It drains: while
// incidents are open, STREAK_SECONDS without a fix cools it down one step.
export const streakMultiplier = (streak) => Math.min(3, 1 + 0.25 * Math.max(0, streak - 1))
export const STREAK_SECONDS = 45

// Banner when the streak hits these (names in content/locales/en/scoring.json)
export const STREAK_TIERS = SCORING_TEXT.streakTiers

// ------------------------------------------------------------------ CLUTCH
// Fix it in the last 10% before OUTAGE: risky, and worth it
export const CLUTCH_METER = 90
export const CLUTCH_POINTS = 1000
export const isClutch = (inc) => inc.meter >= CLUTCH_METER && stageOf(inc.meter) < OUTAGE

// ------------------------------------------------------------------ grades
// Every fix gets a letter, and so does the night. Points: S 5 … F 0.
export const GRADES = ['F', 'D', 'C', 'B', 'A', 'S']
const gradeOf = (points) => GRADES[Math.max(0, Math.min(5, Math.round(points)))]
export const gradePoints = (letter) => GRADES.indexOf(letter)

// How far the meter got (0-4), +1 for a clean fix (-1 for two or more wrong
// actions), and the microgame nudges it a letter either way. A clean CLUTCH was
// on purpose, so it never drops below a B. The Big Red Lever is always a C.
export function gradeIncident(inc, { lever = false, execution = null } = {}) {
  if (lever) return 'C'
  const early = inc.meter < 20 ? 4 : inc.meter < 40 ? 3 : inc.meter < 60 ? 2 : inc.meter < 85 ? 1 : 0
  const clean = inc.wrong === 0 ? 1 : inc.wrong === 1 ? 0 : -1
  const hands = execution == null ? 0 : execution >= 0.85 ? 1 : execution < 0.4 ? -1 : 0
  const raw = Math.min(5, early + clean + hands)
  return gradeOf(isClutch(inc) && inc.wrong === 0 ? Math.max(3, raw) : raw)
}

// What each letter pays, as a multiple of the incident's reward (an S on a
// 300-point incident is 1,200: fixes stay the main source of points)
const GRADE_PAY = { S: 4, A: 3, B: 2.2, C: 1.5, D: 1, F: 0.5 }

export function resolvePayout(def, inc, { streak, lever = false, double = false, modMult = 1, execution = null }) {
  const grade = gradeIncident(inc, { lever, execution })
  const base = Math.round(def.reward * GRADE_PAY[grade])
  const clutch = !lever && isClutch(inc) ? CLUTCH_POINTS : 0
  const streakMult = streakMultiplier(streak)
  const buffMult = double ? 2 : 1
  return {
    grade,
    base,
    clutch,
    streak,
    streakMult,
    buffMult,
    modMult,
    lever,
    total: Math.round((base + clutch) * streakMult * buffMult * modMult),
  }
}

// ------------------------------------------------------------------ the night
// The shift: the average of every incident's grade (breaches count as F), minus
// a bit for each missed alert. Getting fired is an F, whatever the average.
export const NIGHT_GRADE_TITLES = SCORING_TEXT.nightGradeTitles
export function nightGrade(stats, fired) {
  if (fired || stats.grades.length === 0) return 'F'
  const avg = stats.grades.reduce((sum, g) => sum + gradePoints(g), 0) / stats.grades.length
  return gradeOf(avg - 0.3 * stats.missed)
}

// Awarded on the score screen. Names and points in content/locales/en/scoring.json; the
// rule for each one is here, by its id.
const NIGHT_BONUS_RULES = {
  zeroOutages: (st) => st.resolved > 0 && st.outages === 0,
  inboxZero: (st) => st.resolved > 0 && st.missed === 0,
  streak8: (st) => st.bestStreak >= 8,
}
export const NIGHT_BONUSES = SCORING_TEXT.nightBonuses.map((b) => ({ ...b, test: NIGHT_BONUS_RULES[b.id] }))
