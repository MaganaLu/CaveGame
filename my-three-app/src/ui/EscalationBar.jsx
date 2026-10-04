import { STAGES, secondsToOutage, OUTAGE } from '../game/scoring'
import { formatCountdown } from '../game/GameClock'
import { meterBar, STAGE_COLORS } from './format'

// NORMAL → DEGRADED → CRITICAL → OUTAGE, with time left until OUTAGE
export default function EscalationBar({ inc, width = 10 }) {
  const color = STAGE_COLORS[inc.stage]
  const outage = inc.stage === OUTAGE
  return (
    <span className="escalation" style={{ color }}>
      <span className="bar">{meterBar(inc.meter, width)}</span>{' '}
      <span className={inc.stage >= 2 ? 'blink' : ''}>{STAGES[inc.stage]}</span>
      {!outage && <span className="escalation-eta"> {formatCountdown(secondsToOutage(inc))}</span>}
    </span>
  )
}
