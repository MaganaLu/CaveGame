import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/GameState'
import { todaysShift } from '../game/rng'
import { getBoard } from '../game/highscores'
import { Leaderboard } from './Leaderboard'
import { CREDITS } from '../credits'
import Passdown from './Passdown'
import { LENGTHS, MODIFIERS, modMultiplier } from '../game/shifts'
import { modifiersUnlocked } from '../game/unlocks'

// Start screen: a parody of a corporate SSO login ("midwhy", CodeMonkey Corp's
// single sign-on). Username and PIN are pre-filled and read-only on purpose: a
// lookalike login page should never invite anyone to type real credentials.
// Picking a "role" picks the mode; "touching your security key" signs you in, and
// the outgoing on-call's passdown (how to play) comes up before the night starts.

const ROLES = [
  { mode: 'daily', name: 'banana-oncall-primary', note: (shift) => `Shift #${shift} · same night for everyone today` },
  { mode: 'random', name: 'banana-oncall-chaos', note: () => 'Random shift · a brand new night' },
]

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
      <div className="sso-url">🔒 midwhy.monkey.corp/sso/login?next=ON-CALL&amp;reason=you-are-on-call</div>

      <h1 className="screen-title psx-logo sso-logo">ON CALL</h1>

      <div className="sso-row">
        <div className="sso-card">
          <div className="sso-brand">
            <span className="sso-mark">🐒</span>
            <div>
              <div className="sso-name">midwhy</div>
              <div className="sso-tag">CodeMonkey Corp Single Sign-On</div>
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
                  <label className="sso-label">Username</label>
                  <input className="sso-input" value="oncall-you" readOnly tabIndex={-1} aria-label="Username (pre-filled)" />
                  <label className="sso-label">PIN</label>
                  <input className="sso-input" value="••••••" readOnly tabIndex={-1} aria-label="PIN (pre-filled)" />

                  <label className="sso-label">Role</label>
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
                  <label className="sso-label">Shift</label>
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
                        Modifiers <span className="sso-mult">score ×{modMultiplier(mods).toFixed(2)}</span>
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
                    <div className="sso-locked">🔒 Finish a shift to unlock <b>modifiers</b> (harder nights, bigger scores).</div>
                  )}

                  <button type="submit" className="sso-submit" autoFocus>Sign in</button>
                </div>
              </div>
            </form>
          ) : (
            <div className="sso-key">
              <div className="sso-key-title">Touch your security key</div>
              <button className={`sso-key-device ${step === 'verifying' ? 'touched' : ''}`} onClick={touchKey}>
                <span className="sso-key-body">🍌</span>
                <span className="sso-key-led" />
              </button>
              <div className="sso-hint">
                {step === 'verifying' ? 'Verifying… ✓ Authenticated. Your shift starts now.' : 'Press SPACE (or click) to touch your Banana Key™'}
              </div>
              <button className="sso-back" onClick={() => setStep('login')} disabled={step === 'verifying'}>◂ Use a different role</button>
            </div>
          )}

          <div className="sso-foot">
            Trouble signing in? Cut a ticket to IT (current wait: 6 weeks).
            <br />
            Your session expires in 20 hours. Your on-call shift does not.
          </div>
        </div>

        <div className="sso-side">
          <div className="sso-panel">
            <Leaderboard
              title={`${mode === 'daily' ? `SHIFT #${shift}` : 'RANDOM'}${length !== 'story' ? ` · ${length.toUpperCase()}` : ''} · TOP 5`}
              entries={getBoard(mode, shift, length)}
              limit={5}
            />
          </div>
          <div className="sso-panel controls">
            <div><b>WASD</b> move · <b>SHIFT</b> sprint · <b>MOUSE</b> look</div>
            <div><b>E</b>/<b>CLICK</b> interact · <b>F</b> flashlight · <b>ESC</b> close screen</div>
            <div><b>TAB</b> look at phone · <b>Q</b> answer (hint) · <b>X</b> decline</div>
            <div>3 SLA breaches and you&apos;re fired.</div>
          </div>
          <div className="sso-panel sso-credits">
            <div className="score-label">CREDITS</div>
            {CREDITS.map((c) => (
              <div key={c.title}>
                &ldquo;{c.title}&rdquo; by {c.author} · {c.license}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
