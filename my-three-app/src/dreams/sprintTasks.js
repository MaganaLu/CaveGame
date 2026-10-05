// The Dream Sprint task pool: tiny parodies of a developer's day, one decision
// each. The words are in content/locales/en/dreams/*.json; this deals them out.
// makeTask() deals one; DreamSprint.jsx draws it. Every task has `choices`
// ({ id, label, key }) and the `answer` id.

import { BINS, TICKETS } from './tickets'
import { PULL_REQUESTS } from './pullRequests'
import { COES, COE_FIELDS } from './coe'
import { shuffle } from './dreams'
import { text } from '../content'

const SPRINT_TEXT = text('dreams/sprint')
const UI = SPRINT_TEXT.ui
const C = UI.choices

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const keyed = (choices) => choices.map((c, i) => ({ ...c, key: String(i + 1) }))

// The big flashed instruction before each card, WarioWare-style
export const INSTRUCTIONS = SPRINT_TEXT.instructions

// Story shifts explain each one the first time you meet it (DreamSprint pauses
// the game while the card is up). `sprint` explains the Dream Sprint itself;
// `leak` the real incident sneaking into the dream.
export const INTROS = SPRINT_TEXT.intros

// ------------------------------------------------------------------ Reply-All
const EMAILS = SPRINT_TEXT.emails

// ------------------------------------------------------------------ Friday deploy
const DEPLOYS = SPRINT_TEXT.deploys

// ------------------------------------------------------------------ Story-point poker
const STORIES = SPRINT_TEXT.stories

// ------------------------------------------------------------------ dealing
function triage(leak) {
  const ticket = leak ? { sev: 1, title: leak.title, from: UI.leakFrom, flavor: UI.leakFlavor, answer: 'now', leak: true } : pick(TICKETS)
  return {
    kind: 'triage',
    ticket,
    choices: BINS.map((b) => ({ id: b.id, label: b.label, rule: b.rule, key: b.key })),
    answer: ticket.answer,
    leak: Boolean(leak),
  }
}

function review() {
  const pr = pick(PULL_REQUESTS)
  return {
    kind: 'review',
    pr,
    choices: keyed([{ id: 'approve', label: C.approve }, { id: 'request', label: C.request }]),
    answer: pr.answer,
  }
}

function coe() {
  const doc = pick(COES)
  const field = Math.floor(Math.random() * doc.answers.length)
  const { options, correct } = doc.answers[field]
  const order = shuffle(options.map((text, i) => ({ id: String(i), label: text })))
  return { kind: 'coe', doc, field: COE_FIELDS[field], choices: keyed(order), answer: String(correct) }
}

function replyall() {
  const email = pick(EMAILS)
  // The buttons swap places every time: read before you click
  const choices = shuffle([
    { id: 'reply', label: email.answer === 'reply' ? C.reply : C.replyAll },
    { id: 'ignore', label: email.answer === 'reply' ? C.archive : C.archiveMove },
  ])
  return { kind: 'replyall', email, choices: keyed(choices), answer: email.answer }
}

function friday() {
  const deploy = pick(DEPLOYS)
  return {
    kind: 'friday',
    deploy,
    choices: keyed(shuffle([{ id: 'deploy', label: C.deploy }, { id: 'wait', label: C.wait }])),
    answer: deploy.answer,
  }
}

function poker() {
  const story = pick(STORIES)
  // The team agrees; the Director always says 40. Go with the team.
  const team = pick([1, 2, 3, 5, 8])
  const decoys = shuffle([1, 2, 3, 5, 8, 13].filter((n) => n !== team)).slice(0, 2)
  const choices = shuffle([team, 40, ...decoys]).map((n) => ({ id: String(n), label: String(n) }))
  return { kind: 'poker', story, team, choices: keyed(choices), answer: String(team) }
}

const DEALERS = { triage, review, coe, replyall, friday, poker }

// A random task, never the same kind twice in a row. `leak` (the incoming
// incident) forces a triage card about it.
export function makeTask(previousKind, leak) {
  if (leak) return triage(leak)
  const kinds = Object.keys(DEALERS).filter((k) => k !== previousKind)
  return DEALERS[pick(kinds)]()
}
