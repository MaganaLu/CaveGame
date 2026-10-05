// Qwip COE content (Dream Sprint): postmortems that parody famous public ones. The
// right answer is always the calm, blameless, corporate one; `correct` is the index
// of the right option. Text: content/locales/en/dreams/coe.json
import { text } from '../content'

const COE_TEXT = text('dreams/coe')

export const COE_RULES = COE_TEXT.rules
export const COE_FIELDS = COE_TEXT.fields
export const COES = COE_TEXT.coes
export const COE_CORRECT = COE_TEXT.correctLines
export const COE_WRONG = COE_TEXT.wrongLines
