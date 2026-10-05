import { create } from 'zustand'
import { text } from '../content'

// Rebindable controls. Each action is bound to one physical key (KeyboardEvent.code),
// so WASD stays where it is on any keyboard layout; labels show what's printed on
// the player's own keys when the browser can tell us (Chrome's keyboard layout map).
// Bindings are saved per browser. Settings → Controls on the sign-in screen edits them.
//
// `groups`: actions in the same group can't share a key. Wake only happens asleep,
// so it may share a key with walking (W does both by default).
export const ACTIONS = [
  { id: 'forward', code: 'KeyW', groups: ['awake'] },
  { id: 'left', code: 'KeyA', groups: ['awake'] },
  { id: 'backward', code: 'KeyS', groups: ['awake'] },
  { id: 'right', code: 'KeyD', groups: ['awake'] },
  { id: 'sprint', code: 'ShiftLeft', groups: ['awake'] },
  { id: 'interact', code: 'KeyE', groups: ['awake'] },
  { id: 'close', code: 'KeyC', groups: ['awake'] },
  { id: 'flashlight', code: 'KeyF', groups: ['awake'] },
  { id: 'phone', code: 'Tab', groups: ['awake'] },
  { id: 'answer', code: 'KeyQ', groups: ['awake'] },
  { id: 'decline', code: 'KeyX', groups: ['awake'] },
  { id: 'yes', code: 'KeyY', groups: ['awake'] },
  { id: 'no', code: 'KeyN', groups: ['awake'] },
  { id: 'confirm', code: 'Space', groups: ['awake', 'asleep'] },
  { id: 'wake', code: 'KeyW', groups: ['asleep'] },
]

// Taken: ESC always frees the mouse (the browser does that), and 1-4 pick answers
// on calls and in the Dream Sprint
export const RESERVED = ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4']

const DEFAULTS = Object.fromEntries(ACTIONS.map((a) => [a.id, a.code]))
const STORAGE_KEY = 'controls'

// Left and right Shift (Ctrl, Alt, Cmd) count as the same key
export const normalize = (code) => code.replace(/Right$/, 'Left')

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const valid = Object.entries(saved).filter(([id, code]) => id in DEFAULTS && typeof code === 'string' && code)
    return { ...DEFAULTS, ...Object.fromEntries(valid) }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(bindings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
  } catch {
    // storage blocked: the change lasts until the page reloads
  }
}

export const useControls = create((set, get) => ({
  bindings: load(),
  layout: null, // code → printed character, when the browser shares it

  // Bind `id` to `code`. If that key already does something that can clash, the two
  // actions swap keys. Returns the action that got swapped, if any.
  bind: (id, code) => {
    code = normalize(code)
    const { bindings } = get()
    const groups = ACTIONS.find((a) => a.id === id).groups
    const clash = ACTIONS.find(
      (a) => a.id !== id && bindings[a.id] === code && a.groups.some((g) => groups.includes(g))
    )
    const next = { ...bindings, [id]: code }
    if (clash) next[clash.id] = bindings[id]
    save(next)
    set({ bindings: next })
    return clash?.id ?? null
  },
  reset: () => {
    save(DEFAULTS)
    set({ bindings: { ...DEFAULTS } })
  },
}))

// Labels from the player's real layout (AZERTY shows Z where QWERTY has W)
navigator.keyboard?.getLayoutMap?.().then(
  (map) => useControls.setState({ layout: Object.fromEntries(map) }),
  () => {}
)

// Is this key event the key bound to `id`?
export const pressed = (e, id) => normalize(e.code) === useControls.getState().bindings[id]

// Names for keys that don't print a character (ui.json → keyNames)
const KEY_NAMES = text('ui').keyNames

export function keyLabel(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code]
  const printed = useControls.getState().layout?.[code]
  if (printed && printed.trim()) return printed.toUpperCase()
  const m = code.match(/^(?:Key|Digit)(.+)$/)
  if (m) return m[1]
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`
  return code.toUpperCase()
}

export const labelFor = (id) => keyLabel(useControls.getState().bindings[id])

// "[{key:interact}] Use" → "[E] Use": fills in the current key for each action
export const withKeys = (text) => text.replace(/\{key:(\w+)\}/g, (match, id) => (id in DEFAULTS ? labelFor(id) : match))
