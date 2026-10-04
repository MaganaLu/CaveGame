import { useGameStore, CALL_TIMES } from '../game/GameState'
import TimerBar from '../dreams/TimerBar'

const CALLER = {
  GREG: { initials: 'GR', title: 'Manager · CodeMonkey Corp', color: '#414d5c' },
}

const clock = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`

// Greg on the line. Above the room; at the PC it docks in the notification rail
// on the right (see .hud-top.busy) so it never covers the monitor.
export default function CallScreen() {
  const call = useGameStore((s) => s.call)
  const elapsed = useGameStore((s) => s.elapsed)
  if (!call) return null

  const caller = CALLER[call.from] ?? CALLER.GREG
  const step = call.script.steps[call.step]

  return (
    <div className={`call ${call.status === 'ringing' ? 'call-ringing' : ''}`}>
      <div className="call-head">
        <span className="call-avatar" style={{ background: caller.color }}>{caller.initials}</span>
        <div>
          <div className="call-name">{call.from}</div>
          <div className="call-title">{caller.title}</div>
        </div>
        <div className="call-status">
          {call.status === 'ringing' ? '📞 INCOMING CALL' : call.status === 'ending' ? 'CALL ENDED' : `🔴 ${clock(elapsed - call.answeredAt)}`}
        </div>
      </div>

      {call.status === 'ringing' ? (
        <>
          <div className="call-keys"><span>[Q] ANSWER</span><span>[X] DECLINE</span></div>
          <TimerBar key={`ring-${call.id}`} duration={CALL_TIMES.ring * 1000} />
        </>
      ) : (
        <>
          <div className="call-transcript">
            {call.transcript.slice(-4).map((line, i) => (
              <div key={i} className={line.who === 'you' ? 'call-you' : 'call-them'}>
                <b>{line.who === 'you' ? 'YOU' : call.from}:</b> {line.text}
              </div>
            ))}
          </div>
          {call.status === 'active' && call.phase === 'line' && (
            <>
              <div className="call-choices">
                {step.choices.map((c, i) => (
                  <div key={c.text} className="call-choice"><span className="call-key">{i + 1}</span> {c.text}</div>
                ))}
              </div>
              <TimerBar key={`step-${call.id}-${call.step}`} duration={CALL_TIMES.choice * 1000} />
            </>
          )}
        </>
      )}
    </div>
  )
}
