// Greg's phone calls. Each call is a short timed dialogue: Greg says a line, you
// pick a reply (keys 1-3) before the timer runs out. The blameless corporate answer
// is "good" (calms you down, scores MANAGED UP); anything else adds stress.
//
// Tiers by situation:
//   work - an incident is open: pressure and status updates
//   idle - nothing is broken: Greg is just... checking in
//   late - after 2 AM: Greg is running on cold brew and calendar invites
//
// Escalation: a page left ringing pages Greg, and he calls about it (ESCALATION_CALL).
// The Director (gold badge, 25+ years at a 12-year-old company) is the boss.
//
// All the words are in content/locales/en/calls.json.
import { text } from '../content'

const CALL_TEXT = text('calls')

export const CALLS = CALL_TEXT.calls
export const ESCALATION_CALL = CALL_TEXT.escalationCall
// Voicemail after each missed/declined call, escalating (in calendar invites)
export const VOICEMAILS = CALL_TEXT.voicemails
export const TIMEOUT_REPLY = CALL_TEXT.timeoutReply
export const DIRECTOR_JOIN = CALL_TEXT.director.join
export const DIRECTOR_LINES = CALL_TEXT.director.lines
export const DIRECTOR_LEAVES = CALL_TEXT.director.leaves
