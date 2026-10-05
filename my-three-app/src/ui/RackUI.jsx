import { useGameStore } from '../game/GameState'
import Microgame from './microgames/Microgame'
import { fill } from '../game/text'
import { text } from '../content'

const T = text('ui').rack

// The server rack in the bathroom: the hardware half of some fixes (a cable
// microgame). Closes itself when the step is done; C walks away.
export default function RackUI() {
  const open = useGameStore((s) => s.overlay === 'rack')
  const game = useGameStore((s) => (s.microgame?.where === 'rack' ? s.microgame : null))
  const task = useGameStore((s) => s.incidents.find((i) => i.uid === s.microgame?.incUid)?.rackTask)
  const useRack = useGameStore((s) => s.useRack)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const waiting = useGameStore((s) => s.incidents.some((i) => i.awaitingRack))
  if (!open) return null

  const leave = () => {
    closeOverlay()
    document.body.requestPointerLock()
  }
  return (
    <div className="rack-backdrop">
      <div className="rack-panel ff-window">
        <div className="rack-title">
          <span>{T.title}</span>
          <button className="crt-link" onClick={leave}>{fill(T.leave)}</button>
        </div>
        {game ? (
          <>
            <div className="rack-task">{fill(T.task, { task })}</div>
            <Microgame where="rack" />
          </>
        ) : waiting ? (
          <div>
            <div className="red">{T.dropped}</div>
            <button className="screen-button" onClick={useRack}>{T.retry}</button>
          </div>
        ) : (
          <div>
            <div className="rack-task">{T.fixed}</div>
            <button className="screen-button" onClick={leave}>{T.backToWork}</button>
          </div>
        )}
      </div>
    </div>
  )
}
