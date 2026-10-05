// SIMian triage content (Dream Sprint). Every ticket has exactly one right answer
// under the Plantation Priority Matrix™: each bin's `rule` is shown on its column.
// Bin labels are Amazon-isms; the ids are what the tickets answer with.
// Text: content/locales/en/dreams/tickets.json
import { text } from '../content'

const TICKET_TEXT = text('dreams/tickets')

export const BINS = TICKET_TEXT.bins
export const TICKETS = TICKET_TEXT.tickets
export const CORRECT_LINES = TICKET_TEXT.correctLines
export const WRONG_LINES = TICKET_TEXT.wrongLines
