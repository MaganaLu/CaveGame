import { useEffect, useRef } from 'react'
import { MAX_STRIKES } from '../game/GameState'
import { LENGTHS, MODIFIERS, modMultiplier } from '../game/shifts'
import { fill } from '../game/text'
import PASSDOWN from '../content/passdown.json'
import Rich from './Rich'

// The on-call passdown: the outgoing on-call's handoff doc, shown right after
// sign-in. It's the how-to-play screen, written as a Banana Plantation wiki page.

// Just the loop. Everything else is introduced in play: Dave left a note for
// each thing, shown the first time it comes up (game/gates.js). The words are in
// content/passdown.json.
const SECTIONS = PASSDOWN.sections

export default function Passdown({ shift, role, length = 'story', mods = [], onAck }) {
  const picked = MODIFIERS.filter((m) => mods.includes(m.id))
  const ackRef = useRef(onAck)
  ackRef.current = onAck
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore key repeat: Space held from the security key step shouldn't skip this
      if (e.repeat) return
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        ackRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="screen sso passdown">
      <div className="sso-url">🔒 wiki.monkey.corp/BananaPlantation/OnCall/Passdown/{shift ? `shift-${shift}` : 'latest'}</div>

      <div className="pd-doc">
        <div className="pd-head">
          <div>
            <div className="pd-crumbs">BananaPlantation › OnCall › Passdown</div>
            <h1 className="pd-title">On-Call Passdown</h1>
          </div>
          <div className="pd-meta">
            <div><span>Rotation</span> {role}</div>
            <div><span>Shift</span> {LENGTHS[length].name}</div>
            <div><span>Outgoing</span> dave <i>(asleep, do not page)</i></div>
            <div><span>Incoming</span> oncall-you</div>
          </div>
        </div>

        <div className="pd-goal">
          <Rich
            text={length === 'endless' ? PASSDOWN.tldrEndless : fill(PASSDOWN.tldrStory, { quick: length === 'quick' ? PASSDOWN.quickSuffix : '' })}
          />
          {picked.length > 0 && (
            <div className="pd-mods">
              Modifiers: {picked.map((m) => `${m.icon} ${m.name}`).join(' · ')} → <b>score ×{modMultiplier(mods).toFixed(2)}</b>
            </div>
          )}
        </div>

        <div className="pd-grid">
          {SECTIONS.map((s) => (
            <section key={s.title} className="pd-section">
              <h2>{s.icon} {s.title}</h2>
              <ul>
                {s.lines.map((line, i) => (
                  <li key={i}><Rich text={fill(line, { strikes: MAX_STRIKES })} /></li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="pd-foot">
          <span className="pd-keys">
            <b>WASD</b> move · <b>SHIFT</b> sprint · <b>E</b>/<b>CLICK</b> interact · <b>E</b>/<b>ESC</b> close screen
          </span>
          <button className="sso-submit pd-ack" onClick={onAck} autoFocus>
            ✓ Acknowledge &amp; take the pager <span className="pd-key">[SPACE]</span>
          </button>
        </div>
        <div className="pd-fine">By acknowledging you confirm you have read this passdown. Nobody has ever read the passdown.</div>
      </div>
    </div>
  )
}
