// The 7 AM handoff: your night, written up as a passdown for the next on-call,
// in Qwip (the company's Google-Docs). Pure: takes the final store state and
// returns the doc's text; ui/HandoffDoc.jsx lays it out. The words are in
// content/handoff.json; this decides which lines apply.
import TEXT from '../content/handoff.json'
import { fill } from './text'

const pick = (list, seed) => list[Math.abs(seed) % list.length]

function tldr(s) {
  const { stats } = s
  const t = TEXT.tldr
  if (s.endReason === 'fired') return fill(s.length === 'endless' ? t.firedEndless : t.fired, stats)
  if (stats.breached === 0 && stats.outages === 0) return t.quiet
  if (stats.breached === 0) return t.noBreaches
  return t.rough
}

// What happened, in the order a manager would ask about it
function happened(s) {
  const { stats } = s
  const t = TEXT.happened
  const lines = []
  if (s.length === 'endless') lines.push(fill(t.waves, stats))
  lines.push(fill(t.fixed, { ...stats, streak: stats.bestStreak >= 3 ? fill(t.streak, stats) : '' }))
  if (stats.outages) lines.push(fill(t.outages, stats))
  if (stats.breached) lines.push(fill(t.breached, stats))
  if (stats.missed) lines.push(fill(t.missed, stats))
  if (stats.escalations) lines.push(fill(t.escalations, stats))
  if (stats.directorVisits) {
    const times = stats.directorVisits === 1 ? t.directorOnce : fill(t.directorMany, { n: stats.directorVisits })
    lines.push(fill(t.director, { times }))
  }
  if (stats.leverPulls) lines.push(fill(t.lever, stats))
  if (stats.naps) lines.push(fill(t.naps, stats))
  else if (stats.yanked) lines.push(fill(t.yankedOnly, stats))
  if (s.onCouch) lines.push(t.couch)
  const calls = stats.callsAnswered + stats.callsMissed
  if (calls) lines.push(fill(t.greg, { ...stats, calls }))
  return lines
}

function actionItems(s) {
  const { stats } = s
  const t = TEXT.actions
  const items = []
  if (stats.missed || stats.escalations) items.push(t.pager)
  if (s.onCouch) items.push(t.couch)
  if (stats.directorVisits) items.push(t.director)
  if (stats.leverPulls) items.push(t.lever)
  if (stats.breached) items.push(t.coe)
  items.push(t.always)
  return items
}

// Margin comments, Google-Docs style
function comments(s) {
  const c = TEXT.comments
  const out = [c.greg]
  if (s.stats.directorVisits) out.push(c.director)
  if (s.onCouch) out.push(c.partner)
  return out
}

export function buildHandoff(s) {
  return {
    tldr: tldr(s),
    happened: happened(s),
    stillOpen: s.stillOpen,
    rootCause: pick(TEXT.rootCauses, s.seed + s.stats.resolved),
    actions: actionItems(s),
    comments: comments(s),
  }
}
