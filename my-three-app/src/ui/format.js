import { LANG, text } from '../content'
import { fill } from '../game/text'

const UI = text('ui')

// Same scale as the CSS tokens --sev-high / --sev-med / --sev-low (psx/psx-ui.css).
// Severity and escalation stage share it, so "how bad" always reads the same.
export const SEV_COLORS = { 1: '#ff5d64', 2: '#f89256', 3: '#f2cd54' }
export const SEV_ICONS = { 1: '🔴', 2: '🟠', 3: '🟡' }

export function meterBar(value, width = 10) {
  const filled = Math.round((value / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

// Digit grouping in the player's language (1,234 / 1.234 / 1 234)
export const formatScore = (n) => n.toLocaleString(LANG)

// NORMAL (neutral) → DEGRADED → CRITICAL → OUTAGE
export const STAGE_COLORS = ['#8d99a8', '#f2cd54', '#f89256', '#ff5d64']

// Most urgent first: severity, then closest to OUTAGE
export const byUrgency = (a, b) => a.severity - b.severity || b.meter - a.meter

// "SHIFT #12 · QUICK · TOP 5": the leaderboard heading for a shift
export const boardTitle = (mode, shift, length, n) =>
  (mode === 'daily' ? fill(UI.board.daily, { shift }) : UI.board.random) +
  (length !== 'story' ? fill(UI.board.length, { length: UI.lengths[length] }) : '') +
  fill(UI.board.top, { n })
