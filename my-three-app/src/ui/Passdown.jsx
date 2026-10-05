import { useEffect, useRef } from 'react'
import { MAX_STRIKES } from '../game/GameState'
import { LENGTHS, MODIFIERS, modMultiplier } from '../game/shifts'
import { fill } from '../game/text'
import Rich from './Rich'
import { text } from '../content'

const PASSDOWN = text('passdown')

// The on-call passdown: the outgoing on-call's handoff doc, shown right after
// sign-in. It's the how-to-play screen, written as a Banana Plantation wiki page.

// Just the loop. Everything else is introduced in play: Dave left a note for
// each thing, shown the first time it comes up (game/gates.js). The words are in
// content/locales/en/passdown.json.
const SECTIONS = PASSDOWN.sections
const META = PASSDOWN.meta

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
      <div className="sso-url">{fill(PASSDOWN.url, { page: shift ? fill(PASSDOWN.shiftPage, { shift }) : PASSDOWN.latest })}</div>

      <div className="pd-doc">
        <div className="pd-head">
          <div>
            <div className="pd-crumbs">{PASSDOWN.crumbs}</div>
            <h1 className="pd-title">{PASSDOWN.title}</h1>
          </div>
          <div className="pd-meta">
            <div><span>{META.rotation}</span> {role}</div>
            <div><span>{META.shift}</span> {LENGTHS[length].name}</div>
            <div><span>{META.outgoing}</span> {META.outgoingName} <i>{META.outgoingNote}</i></div>
            <div><span>{META.incoming}</span> {META.incomingName}</div>
          </div>
        </div>

        <div className="pd-goal">
          <Rich
            text={length === 'endless' ? PASSDOWN.tldrEndless : fill(PASSDOWN.tldrStory, { quick: length === 'quick' ? PASSDOWN.quickSuffix : '' })}
          />
          {picked.length > 0 && (
            <div className="pd-mods">
              <Rich text={fill(PASSDOWN.mods, { mods: picked.map((m) => `${m.icon} ${m.name}`).join(' · '), mult: modMultiplier(mods).toFixed(2) })} />
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
            <Rich text={PASSDOWN.keys} />
          </span>
          <button className="sso-submit pd-ack" onClick={onAck} autoFocus>
            {PASSDOWN.ack} <span className="pd-key">{PASSDOWN.ackKey}</span>
          </button>
        </div>
        <div className="pd-fine">{PASSDOWN.fine}</div>
      </div>
    </div>
  )
}
