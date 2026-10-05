import { useEffect, useState } from 'react'
import { ACTIONS, RESERVED, useControls, keyLabel, labelFor } from '../game/controls'
import { fill } from '../game/text'
import { useVolume } from '../game/audio'
import { text, LANG, LANGUAGES, setLanguage } from '../content'
import * as sfx from '../game/audio'

const S = text('ui').settings

// "es" → "Español": each language named in itself
function languageName(lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang
  } catch {
    return lang
  }
}

// Settings, inside the midwhy sign-in card: volume, rebind controls (click a key, press the
// new one; a clash swaps the two) and, once there's more than one, pick a language.
export default function Settings({ onDone }) {
  const bindings = useControls((s) => s.bindings)
  useControls((s) => s.layout) // relabel when the keyboard layout arrives
  const bind = useControls((s) => s.bind)
  const reset = useControls((s) => s.reset)
  const [waiting, setWaiting] = useState(null)
  const [note, setNote] = useState(null)
  const volume = useVolume()

  // Listening for the new key: grab it before anything else sees it
  useEffect(() => {
    if (!waiting) return
    const onKey = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!e.code || e.repeat) return
      if (e.code === 'Escape') return setWaiting(null)
      if (RESERVED.includes(e.code)) {
        sfx.error()
        return setNote({ bad: true, text: fill(S.reserved, { key: keyLabel(e.code) }) })
      }
      sfx.plug()
      const swapped = bind(waiting, e.code)
      setNote(swapped ? { text: fill(S.swapped, { action: S.actions[swapped], key: labelFor(swapped) }) } : null)
      setWaiting(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [waiting, bind])

  return (
    <div className="settings">
      <div className="settings-head">
        <span className="sso-key-title">{S.title}</span>
        <div>
          <button
            type="button"
            className="sso-back"
            onClick={() => {
              reset()
              setNote(null)
              setWaiting(null)
            }}
          >
            {S.reset}
          </button>
          <button type="button" className="sso-back" onClick={onDone} disabled={Boolean(waiting)}>{S.done}</button>
        </div>
      </div>

      <label className="sso-label">{S.sound}</label>
      <div className="settings-volumes">
        {['master', 'music', 'sfx'].map((bus) => (
          <label key={bus} className="settings-row">
            <span>{S.volumes[bus]}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume[bus] * 100)}
              onChange={(e) => volume.setVolume(bus, Number(e.target.value) / 100)}
            />
            <span className="settings-pct">{Math.round(volume[bus] * 100)}%</span>
          </label>
        ))}
      </div>

      <label className="sso-label">{S.controls}</label>
      <div className="sso-hint">{S.help}</div>
      <div className="settings-keys">
        {ACTIONS.map((a) => (
          <div key={a.id} className="settings-row">
            <span>{S.actions[a.id]}</span>
            <button
              type="button"
              className={`settings-key ${waiting === a.id ? 'waiting' : ''}`}
              onClick={() => {
                setNote(null)
                setWaiting(waiting === a.id ? null : a.id)
              }}
            >
              {waiting === a.id ? S.waiting : keyLabel(bindings[a.id])}
            </button>
          </div>
        ))}
      </div>
      <div className={`settings-note ${note?.bad ? 'bad' : ''}`}>{note?.text ?? ' '}</div>
      {LANGUAGES.length > 1 && (
        <>
          <label className="sso-label">{S.language}</label>
          <select className="sso-input" value={LANG} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
          </select>
        </>
      )}
    </div>
  )
}
