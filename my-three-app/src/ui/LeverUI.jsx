import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/GameState'
import Rich from './Rich'
import { fill } from '../game/text'
import { text } from '../content'
import { pressed } from '../game/controls'

const T = text('ui').lever

// The Big Red Lever: RESTART EVERYTHING. Hold SPACE (or the button) to pull it;
// letting go early cancels. The ceremony is the point: you came all the way to
// the bathroom for this.

const HOLD_SECONDS = 1.5

export default function LeverUI() {
  const open = useGameStore((s) => s.overlay === 'lever')
  if (!open) return null
  return <Lever />
}

function Lever() {
  const charges = useGameStore((s) => s.charges)
  const openCount = useGameStore((s) => s.incidents.length)
  const finale = useGameStore((s) => s.incidents.some((i) => i.def.noRestart))
  const pullLever = useGameStore((s) => s.pullLever)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const since = useRef(0)

  // Hold to fill; release resets
  useEffect(() => {
    if (!held) return
    since.current = performance.now()
    let raf
    const loop = () => {
      const p = Math.min(1, (performance.now() - since.current) / 1000 / HOLD_SECONDS)
      setProgress(p)
      if (p >= 1) pullLever()
      else raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      setProgress(0)
    }
  }, [held, pullLever])

  useEffect(() => {
    const key = (down) => (e) => {
      if (!pressed(e, 'confirm')) return
      e.preventDefault()
      if (!e.repeat) setHeld(down)
    }
    const onDown = key(true)
    const onUp = key(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const leave = () => {
    closeOverlay()
    document.body.requestPointerLock()
  }

  return (
    <div className="rack-backdrop">
      <div className="lever-panel ff-window danger">
        <div className="rack-title">
          <span>{T.title}</span>
          <button className="crt-link" onClick={leave}>{fill(T.leave)}</button>
        </div>
        <div className="lever-title">{T.question}</div>
        <div className="lever-odds">
          <div><Rich text={fill(T.win, { n: openCount })} /></div>
          <div><Rich text={T.lose} /></div>
          {finale && <div className="red">{T.finale}</div>}
        </div>
        <div className="lever-charges">
          {'🧨'.repeat(charges)} <span className="crt-dim">{fill(T.charges, { n: charges })}</span>
        </div>
        <button
          className="lever-hold"
          onPointerDown={() => setHeld(true)}
          onPointerUp={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
        >
          <span className="lever-fill" style={{ width: `${progress * 100}%` }} />
          <span className="lever-label">{held ? T.pulling : fill(T.hold)}</span>
        </button>
      </div>
    </div>
  )
}
