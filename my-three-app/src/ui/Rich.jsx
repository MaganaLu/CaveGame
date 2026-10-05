import { withKeys } from '../game/controls'

// Text from content/*.json with **bold** markers and {key:action} key names, as
// React (no HTML injection)
export default function Rich({ text }) {
  return withKeys(text).split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part
  )
}
