// Every word the player sees comes from here. Each language is a folder under
// locales/ with the same files as locales/en; anything a translation leaves out
// falls back to English, so a language can be added a file (or a line) at a time.
// The language is picked once at startup: ?lang=xx in the URL, then the player's
// saved choice, then the browser's language, then English.
const FILES = import.meta.glob('./locales/*/**/*.json', { eager: true, import: 'default' })
const FALLBACK = 'en'

export const LANGUAGES = [...new Set(Object.keys(FILES).map((path) => path.split('/')[2]))].sort()

function pickLanguage() {
  const wanted = []
  try {
    wanted.push(new URLSearchParams(location.search).get('lang'), localStorage.getItem('lang'))
  } catch {
    // storage blocked: use the browser's language
  }
  wanted.push(...(navigator.languages ?? [navigator.language]))
  for (const tag of wanted) {
    if (!tag) continue
    const lang = tag.toLowerCase()
    if (LANGUAGES.includes(lang)) return lang
    if (LANGUAGES.includes(lang.split('-')[0])) return lang.split('-')[0]
  }
  return FALLBACK
}

export const LANG = pickLanguage()

// A translation's objects merge into English key by key; its lists and strings replace
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v)
function merge(base, over) {
  if (!isObject(base) || !isObject(over)) return over ?? base
  const out = { ...base }
  for (const key of Object.keys(over)) out[key] = merge(base[key], over[key])
  return out
}

// text('hud') → the contents of locales/<LANG>/hud.json (over the English one)
export function text(name) {
  const base = FILES[`./locales/${FALLBACK}/${name}.json`]
  if (!base) throw new Error(`No text file locales/${FALLBACK}/${name}.json`)
  const local = LANG === FALLBACK ? null : FILES[`./locales/${LANG}/${name}.json`]
  return local ? merge(base, local) : base
}

// Switching language reloads: the game reads its text once, at startup
export function setLanguage(lang) {
  try {
    localStorage.setItem('lang', lang)
  } catch {
    // can't remember it; the URL still works
  }
  const url = new URL(location.href)
  url.searchParams.set('lang', lang)
  location.href = url.toString()
}
