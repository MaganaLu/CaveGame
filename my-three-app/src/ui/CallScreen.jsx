import { useGameStore } from '../game/GameState'
import TimerBar from '../dreams/TimerBar'
import Portrait from './Portrait'
import { formatCountdown } from '../game/GameClock'
import { fill } from '../game/text'
import { text } from '../content'

const T = text('ui').call


// Greg on the line: his portrait and a speech balloon (mint: his color). Above
// the room; at the PC it docks in the notification rail on the right (see
// .hud-top.busy) so it never covers the monitor.
export default function CallScreen() {
  const call = useGameStore((s) => s.call)
  const elapsed = useGameStore((s) => s.elapsed)
  if (!call) return null

  const step = call.script.steps[call.step]

  return (
    <div className={`call ${call.status === 'ringing' ? 'call-ringing' : ''}`}>
      <div className="call-face"><Portrait who={call.from} /></div>
      <div className="call-balloon">
      <div className="call-head">
        <div>
          <div className="call-name">{call.from}</div>
          <div className="call-title">{(T.callers[call.from] ?? T.callers.GREG).title}</div>
        </div>
        <div className="call-status">
          {call.status === 'ringing' ? T.incoming : call.status === 'ending' ? T.ended : fill(T.live, { time: formatCountdown(elapsed - call.answeredAt) })}
        </div>
      </div>

      {call.status === 'ringing' ? (
        <>
          <div className="call-keys"><span>{fill(T.answer)}</span><span>{fill(T.decline)}</span></div>
          <TimerBar key={`ring-${call.id}`} duration={call.ringSeconds * 1000} />
        </>
      ) : (
        <>
          <div className="call-transcript">
            {call.transcript.slice(-4).map((line, i) => (
              <div key={i} className={line.who === 'you' ? 'call-you' : 'call-them'}>
                <b>{line.who === 'you' ? T.you : call.from}:</b> {line.text}
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
              <TimerBar key={`step-${call.id}-${call.step}`} duration={call.choiceSeconds * 1000} />
            </>
          )}
        </>
      )}
      </div>
    </div>
  )
}
