import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/GameState'
import { todaysShift } from '../game/rng'
import { getBoard } from '../game/highscores'
import { Leaderboard } from './Leaderboard'
import { CREDITS } from '../credits'
import Passdown from './Passdown'
import { LENGTHS, MODIFIERS, modMultiplier } from '../game/shifts'
import { modifiersUnlocked } from '../game/unlocks'
import { MAX_STRIKES } from '../game/GameState'
import { boardTitle } from './format'
import { fill } from '../game/text'
import Rich from './Rich'
import { text, LANG, LANGUAGES, setLanguage } from '../content'

const UI = text('ui')

// Start screen: a parody of a corporate SSO login ("midwhy", CodeMonkey Corp's
// single sign-on). Username and PIN are pre-filled and read-only on purpose: a
// lookalike login page should never invite anyone to type real credentials.
// Picking a "role" picks the mode; "touching your security key" signs you in, and
// the outgoing on-call's passdown (how to play) comes up before the night starts.

const T = UI.menu

// "es" → "Español": each language named in itself
function languageName(lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang
  } catch {
    return lang
  }
}
const ROLES = ['daily', 'random'].map((mode) => ({
  mode,
  name: T.roles[mode].name,
  note: (shift) => fill(T.roles[mode].note, { shift }),
}))

export default function MenuScreen() {
  const startNight = useGameStore((s) => s.startNight)
  const shift = todaysShift()
  const [mode, setMode] = useState('daily')
  const [length, setLength] = useState('story')
  const [mods, setMods] = useState([])
  const [showMods] = useState(modifiersUnlocked)
  const toggleMod = (id) => setMods((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  const [step, setStep] = useState('login') // 'login' | 'key' | 'verifying' | 'passdown'
  const verifying = useRef(false)

  const touchKey = () => {
    if (verifying.current) return
    verifying.current = true
    setStep('verifying')
    setTimeout(() => setStep('passdown'), 700)
  }

  const takePager = () => {
    // Pointer lock needs this user gesture, so request it now
    document.body.requestPointerLock()
    startNight(mode, { length, mods })
  }

  const touchRef = useRef(touchKey)
  touchRef.current = touchKey
  useEffect(() => {
    if (step !== 'key') return
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        touchRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [step])

  if (step === 'passdown') {
    return (
      <Passdown
        shift={mode === 'daily' ? shift : null}
        role={ROLES.find((r) => r.mode === mode).name}
        length={length}
        mods={mods}
        onAck={takePager}
      />
    )
  }

  return (
    <div className="screen sso">
      <div className="sso-url">{T.url}</div>

      <h1 className="screen-title psx-logo sso-logo">{T.logo}</h1>

      <div className="sso-row">
        <div className="sso-card">
          <div className="sso-brand">
            <span className="sso-mark">🐒</span>
            <div>
              <div className="sso-name">{T.brand}</div>
              <div className="sso-tag">{T.tag}</div>
            </div>
          </div>

          {step === 'login' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep('key')
              }}
            >
              <div className="sso-form-grid">
                <div>
                  <label className="sso-label">{T.username}</label>
                  <input className="sso-input" value={T.usernameValue} readOnly tabIndex={-1} aria-label={T.usernameAria} />
                  <label className="sso-label">{T.pin}</label>
                  <input className="sso-input" value="••••••" readOnly tabIndex={-1} aria-label={T.pinAria} />

                  <label className="sso-label">{T.role}</label>
                  {ROLES.map((r) => (
                    <button
                      type="button"
                      key={r.mode}
                      className={`sso-role ${mode === r.mode ? 'selected' : ''}`}
                      onClick={() => setMode(r.mode)}
                    >
                      <span className="sso-radio">{mode === r.mode ? '◉' : '○'}</span>
                      <span>
                        <b>{r.name}</b>
                        <span className="sso-role-note">{r.note(shift)}</span>
                      </span>
                    </button>
                  ))}

                </div>
                <div>
                  <label className="sso-label">{T.shift}</label>
                  <div className="sso-segments">
                    {Object.values(LENGTHS).map((l) => (
                      <button
                        type="button"
                        key={l.id}
                        className={`sso-segment ${length === l.id ? 'selected' : ''}`}
                        onClick={() => setLength(l.id)}
                        title={l.note}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                  <div className="sso-hint">{LENGTHS[length].note}</div>

                  {showMods ? (
                    <>
                      <label className="sso-label">
                        {T.modifiers} <span className="sso-mult">{fill(T.scoreMult, { mult: modMultiplier(mods).toFixed(2) })}</span>
                      </label>
                      <div className="sso-mods">
                        {MODIFIERS.map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            className={`sso-mod ${mods.includes(m.id) ? 'selected' : ''}`}
                            onClick={() => toggleMod(m.id)}
                            title={m.note}
                          >
                            <span className="sso-radio">{mods.includes(m.id) ? '☑' : '☐'}</span> {m.icon} {m.name} <b>×{m.mult}</b>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="sso-locked"><Rich text={T.modsLocked} /></div>
                  )}

                  <button type="submit" className="sso-submit" autoFocus>{T.signIn}</button>
                </div>
              </div>
            </form>
          ) : (
            <div className="sso-key">
              <div className="sso-key-title">{T.keyTitle}</div>
              <button className={`sso-key-device ${step === 'verifying' ? 'touched' : ''}`} onClick={touchKey}>
                <span className="sso-key-body">🍌</span>
                <span className="sso-key-led" />
              </button>
              <div className="sso-hint">
                {step === 'verifying' ? T.verifying : T.keyHint}
              </div>
              <button className="sso-back" onClick={() => setStep('login')} disabled={step === 'verifying'}>{T.back}</button>
            </div>
          )}

          <div className="sso-foot">
            {T.foot.map((line) => <div key={line}>{line}</div>)}
          </div>
        </div>

        <div className="sso-side">
          <div className="sso-panel">
            <Leaderboard
              title={boardTitle(mode, shift, length, 5)}
              entries={getBoard(mode, shift, length)}
              limit={5}
            />
          </div>
          <div className="sso-panel controls">
            {T.controls.map((line) => <div key={line}><Rich text={fill(line, { strikes: MAX_STRIKES })} /></div>)}
            {LANGUAGES.length > 1 && (
              <label className="sso-lang">
                {T.language}{' '}
                <select value={LANG} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="sso-panel sso-credits">
            <div className="score-label">{T.credits}</div>
            {CREDITS.map((c) => (
              <div key={c.title}>{fill(T.credit, c)}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
