// The 7 AM handoff: your night, written up as a passdown for the next on-call,
// in Qwip (the company's Google-Docs). Pure: takes the final store state and
// returns the doc's text; ui/HandoffDoc.jsx lays it out.

const pick = (list, seed) => list[Math.abs(seed) % list.length]

const ROOT_CAUSES = [
  'Kevin.',
  'A process gap (Kevin).',
  'DNS. It is always DNS.',
  'A config change nobody remembers approving.',
  'The Director turned NTP off "to test something". In 2019.',
  'Under investigation. Indefinitely.',
]

function tldr(s) {
  const { stats } = s
  if (s.endReason === 'fired') {
    return s.length === 'endless'
      ? `Survived ${stats.waves} wave${stats.waves === 1 ? '' : 's'}. Then ${stats.breached} SLA breaches. Badge has been deactivated.`
      : `Did not make it to 7 AM. ${stats.breached} SLA breaches. HR would like 15 minutes.`
  }
  if (stats.breached === 0 && stats.outages === 0) return 'Quiet night. Nothing burned down. Do not get used to it.'
  if (stats.breached === 0) return 'Things broke, things got fixed. Nobody important noticed.'
  return 'Made it to 7 AM. Not everything else did.'
}

// What happened, in the order a manager would ask about it
function happened(s) {
  const { stats } = s
  const lines = []
  if (s.length === 'endless') lines.push(`Survived ${stats.waves} wave${stats.waves === 1 ? '' : 's'} of pages.`)
  lines.push(`Fixed ${stats.resolved} incident${stats.resolved === 1 ? '' : 's'}${stats.bestStreak >= 3 ? `, best streak x${stats.bestStreak}` : ''}.`)
  if (stats.outages) lines.push(`${stats.outages} went all the way to OUTAGE. The status page knows.`)
  if (stats.breached) lines.push(`${stats.breached} SLA breach${stats.breached === 1 ? '' : 'es'}. Greg has been informed. Greg informed Dana.`)
  if (stats.missed) lines.push(`Missed ${stats.missed} page${stats.missed === 1 ? '' : 's'}.`)
  if (stats.escalations) lines.push(`${stats.escalations} page${stats.escalations === 1 ? '' : 's'} escalated to Greg.`)
  if (stats.directorVisits) lines.push(`The Director joined the call ${stats.directorVisits === 1 ? 'once' : `${stats.directorVisits} times`}. He was "just listening".`)
  if (stats.leverPulls) lines.push(`Pulled the Big Red Lever ${stats.leverPulls}× (${stats.risky} came back).`)
  if (stats.naps) lines.push(`Napped ${stats.naps}× (${stats.perfectWakes} perfect wake${stats.perfectWakes === 1 ? '' : 's'}), yanked awake ${stats.yanked}×.`)
  else if (stats.yanked) lines.push(`Yanked awake by the pager ${stats.yanked}×.`)
  if (s.onCouch) lines.push('Was sent to the couch. Still on the couch.')
  if (stats.callsAnswered + stats.callsMissed) lines.push(`Greg called ${stats.callsAnswered + stats.callsMissed}× (answered ${stats.callsAnswered}, managed up ${stats.managedUp}).`)
  return lines
}

function actionItems(s) {
  const { stats } = s
  const items = []
  if (stats.missed || stats.escalations) items.push('Turn the pager volume up. (Already at max.)')
  if (s.onCouch) items.push('Buy a second phone. Or earplugs. For them.')
  if (stats.directorVisits) items.push("Turn NTP back on on the Director's laptop. Permanently.")
  if (stats.leverPulls) items.push('Stop pulling the lever. (Will pull the lever again.)')
  if (stats.breached) items.push('Write the COE. Blamelessly. It was Kevin.')
  items.push('Kevin: please stop.')
  return items
}

// Margin comments, Google-Docs style
function comments(s) {
  const out = [{ who: 'Greg', text: 'Can we turn this into a six-pager by 9?' }]
  if (s.stats.directorVisits) out.push({ who: 'The Director', text: '👍' })
  if (s.onCouch) out.push({ who: 'Partner', text: 'Couch.' })
  return out
}

export function buildHandoff(s) {
  return {
    tldr: tldr(s),
    happened: happened(s),
    stillOpen: s.stillOpen,
    rootCause: pick(ROOT_CAUSES, s.seed + s.stats.resolved),
    actions: actionItems(s),
    comments: comments(s),
  }
}
