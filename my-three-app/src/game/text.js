import { withKeys } from './controls'

// Content lives in src/content/locales/en/*.json. Some strings are templates:
//   {name}         replaced with vars.name
//   {name|suffix}  the suffix, unless vars.name is 1 (plurals: "{n} page{n|s}")
//   {key:action}   the key the player has bound to that action (game/controls.js)
export function fill(template, vars = {}) {
  return withKeys(
    template.replace(/\{(\w+)(?:\|(\w*))?\}/g, (match, key, suffix) =>
      suffix !== undefined ? (vars[key] === 1 ? '' : suffix) : String(vars[key] ?? match)
    )
  )
}
