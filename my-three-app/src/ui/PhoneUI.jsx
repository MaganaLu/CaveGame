import { useEffect, useState } from 'react'
import { useGameStore, isRinging, isAsleep } from '../game/GameState'
import { formatClock } from '../game/GameClock'
import { SEV_COLORS, SEV_ICONS, STAGE_COLORS, byUrgency, meterBar } from './format'
import EscalationBar from './EscalationBar'
import { fill } from '../game/text'
import { text } from '../content'
import { pressed } from '../game/controls'

const T = text('ui').phone

// Held phone, bottom-right. Always on screen once picked up; you can keep walking
// while reading it, and timers keep running. Q answers when it rings.
//
// Lowered by default (just the top edge peeks up) so it doesn't cover the room.
// It comes up by itself when it rings or a new message arrives, and while you
// hold TAB.
//
// The handset never changes size: the alert that matters (ringing first, then the
// most urgent) gets the full card, a few more get one line each, and the rest
// collapse into "+N more" (the HUD tracker lists them all).
const COMPACT_ROWS = 2

// Unanswered alerts first, then by urgency
const phoneOrder = (a, b) => Number(a.acknowledged) - Number(b.acknowledged) || byUrgency(a, b)
const NEW_MESSAGE_SECONDS = 5

// TAB (rebindable) held = look at the phone
function useHoldTab() {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const onKey = (down) => (e) => {
      if (!pressed(e, 'phone')) return
      e.preventDefault() // don't move focus around the page
      setHeld(down)
    }
    const onDown = onKey(true)
    const onUp = onKey(false)
    const onBlur = () => setHeld(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
  return held
}

// True for a few seconds after a new message comes in
function useNewMessage(lastId) {
  const [fresh, setFresh] = useState(null)
  useEffect(() => {
    if (lastId == null) return
    const show = setTimeout(() => setFresh(lastId), 0)
    const hide = setTimeout(() => setFresh(null), NEW_MESSAGE_SECONDS * 1000)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [lastId])
  return fresh != null && fresh === lastId
}
export default function PhoneUI() {
  const hasPhone = useGameStore((s) => s.hasPhone)
  const asleep = useGameStore(isAsleep)
  const atScreen = useGameStore((s) => ['computer', 'rack', 'lever'].includes(s.overlay))
  const ringing = useGameStore(isRinging)
  const incidents = useGameStore((s) => s.incidents)
  const messages = useGameStore((s) => s.messages)
  const gameTime = useGameStore((s) => s.gameTime)
  const tabHeld = useHoldTab()
  const newMessage = useNewMessage(messages.at(-1)?.id)
  // At a screen (PC, rack, lever) the phone steps aside for the notification rail
  if (!hasPhone || asleep || atScreen) return null

  const raised = ringing || newMessage || tabHeld

  const [top, ...rest] = [...incidents].sort(phoneOrder)
  const compact = rest.slice(0, COMPACT_ROWS)
  const hidden = rest.length - compact.length

  return (
    // Chunky early-2000s handset: speaker slot, LCD screen, nav buttons
    <div className={`phone ${ringing ? 'phone-ringing' : ''} ${raised ? '' : 'phone-lowered'}`}>
      <div className="phone-speaker" />
      <div className="phone-screen">
        <div className="phone-status">
          <span>{formatClock(gameTime)}</span>
          {raised ? <span>{T.battery}</span> : <span className="phone-peek">{incidents.length > 0 ? fill(T.peekOpen, { n: incidents.length }) : ''}{fill(T.peekKey)}</span>}
        </div>

        {ringing && <div className="phone-incoming blink">{fill(T.incoming)}</div>}

        <div className="phone-section">{T.alerts}{incidents.length > 1 && fill(T.alertCount, { n: incidents.length })}</div>
        <div className="phone-alerts">
          {incidents.length === 0 && <div className="phone-empty">{T.empty}</div>}
          {top && (
            <div
              className={`phone-alert ${top.acknowledged ? '' : 'phone-alert-new'}`}
              style={{ borderColor: SEV_COLORS[top.severity] }}
            >
              <div className="phone-alert-head">
                <span style={{ color: SEV_COLORS[top.severity] }}>{SEV_ICONS[top.severity]} {fill(T.sev, { n: top.severity })}</span>
                <span className="phone-alert-service">{top.def.service}</span>
              </div>
              <div className="phone-alert-title">{top.def.title}</div>
              {top.hinted && top.def.hint && <div className="phone-alert-hint">{fill(T.hint, { text: top.def.hint.text })}</div>}
              {top.declined && <div className="phone-alert-declined">{T.declined}</div>}
              <EscalationBar inc={top} />
            </div>
          )}
          {compact.map((inc) => (
            <div key={inc.uid} className={`phone-alert-row ${inc.acknowledged ? '' : 'phone-alert-new'}`}>
              <span>{inc.acknowledged ? SEV_ICONS[inc.severity] : '📳'}</span>
              <span className="phone-alert-row-title">{inc.def.title}</span>
              <span style={{ color: STAGE_COLORS[inc.stage] }}>{meterBar(inc.meter, 5)}</span>
            </div>
          ))}
          {hidden > 0 && <div className="phone-more">{fill(T.more, { n: hidden })}</div>}
        </div>

        <div className="phone-section">{T.messages}</div>
        <div className="phone-messages">
          {messages.slice(-1).map((m) => (
            <div key={m.id} className={`phone-msg ${m.from === 'YOU' || m.from.includes('voicemail') ? 'phone-msg-creepy' : ''}`}>
              <span className="phone-msg-from">{m.from}</span> <span className="phone-msg-time">{formatClock(m.gameTime)}</span>
              <div>{m.text}</div>
            </div>
          ))}
        </div>

        {!ringing && <div className="phone-footer">{T.footer}</div>}
      </div>
      <div className="phone-keys">
        <span className={ringing ? 'phone-key-call' : ''} />
        <span className="phone-key-home" />
        <span />
      </div>
    </div>
  )
}
