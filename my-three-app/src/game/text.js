// Content lives in src/content/*.json. Some strings are templates:
//   {name}         replaced with vars.name
//   {name|suffix}  the suffix, unless vars.name is 1 (plurals: "{n} page{n|s}")
export function fill(template, vars = {}) {
  return template.replace(/\{(\w+)(?:\|(\w*))?\}/g, (match, key, suffix) =>
    suffix !== undefined ? (vars[key] === 1 ? '' : suffix) : String(vars[key] ?? match)
  )
}
