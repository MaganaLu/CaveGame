// The 16 Banana Principles™ of CodeMonkey Corp, as adopted by The Banana Plantation.
// Used for wall posters (meme format: top text / emoji "image" / bottom text),
// style-bonus names, night-end bonuses and Greg's messages. Text: content/locales/en/principles.json
import { text } from '../content'

const PRINCIPLE_TEXT = text('principles')

export const PRINCIPLES = PRINCIPLE_TEXT.principles

export const principleIndex = (name) => PRINCIPLES.findIndex((p) => p.name === name)

// Which principles hang on the apartment walls (see apartment/Posters.jsx)
export const POSTER_PRINCIPLES = PRINCIPLE_TEXT.posters
