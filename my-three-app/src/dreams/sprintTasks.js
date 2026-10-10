// The Dream Sprint task pool: tiny parodies of a developer's day, one decision
// each. The words are in content/locales/en/dreams/*.json; this deals them out.
// makeTask() deals one; DreamSprint.jsx draws it. Every task has `choices`
// ({ id, label, key }) and the `answer` id.

import { PULL_REQUESTS } from './pullRequests'
import { COES, COE_FIELDS } from './coe'
import { shuffle } from './dreams'
import { text } from '../content'

const SPRINT_TEXT = text('dreams/sprint')
const UI = SPRINT_TEXT.ui
const C = UI.choices
const SPIKE = UI.spike

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

// ------------------------------------------------------------------ Spot the spike
// Four dashboards; one service is on fire NOW (above the alarm line at the right
// edge). Half the time a decoy had a spike earlier that already came back down.
// Values are 0..1 of the graph's height; the alarm line is at ALARM.
export const ALARM = 0.7
const POINTS = 24
const wobble = () => (Math.random() - 0.5) * 0.08

function series(shape) {
  const base = 0.12 + Math.random() * 0.22
  const peakAt = 6 + Math.floor(Math.random() * 8) // the decoy's spike, mid-graph
  return Array.from({ length: POINTS }, (_, i) => {
    let v = base + wobble() + 0.04 * Math.sin(i / 2.5)
    if (shape === 'fire' && i >= POINTS - 7) v = base + (0.94 - base) * ((i - (POINTS - 8)) / 7) ** 1.6 + wobble() / 2
    if (shape === 'decoy' && Math.abs(i - peakAt) <= 1) v = i === peakAt ? 0.9 : 0.62
    return Math.max(0.02, Math.min(0.98, v))
  })
}

// `leak` (the incoming incident) is the burning graph, under its real service name
function spike(leak) {
  // (the leak's name is lowercased like the rest, so its case doesn't give it away)
  const leaked = leak?.service.toLowerCase()
  const services = shuffle(SPIKE.services.filter((s) => s !== leaked)).slice(0, 4)
  const fire = Math.floor(Math.random() * 4)
  if (leak) services[fire] = leaked
  const decoy = Math.random() < 0.5 ? (fire + 1 + Math.floor(Math.random() * 3)) % 4 : -1
  const graphs = services.map((service, i) => {
    const metric = pick(SPIKE.metrics)
    const points = series(i === fire ? 'fire' : i === decoy ? 'decoy' : 'calm')
    return { id: String(i), key: String(i + 1), service, metric, points, value: Math.round(points.at(-1) * metric.max) }
  })
  return { kind: 'spike', graphs, choices: graphs.map(({ id, key, service }) => ({ id, key, label: service })), answer: String(fire), leak: Boolean(leak) }
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
  // Reply / Archive / Report phishing / Forward to Tech Support. The buttons swap
  // places every time: read before you click. Mass emails tempt you with Reply All.
  const mass = email.answer === 'ignore'
  const choices = shuffle([
    { id: 'reply', label: mass ? C.replyAll : C.reply },
    { id: 'ignore', label: mass ? C.archiveMove : C.archive },
    { id: 'report', label: C.report },
    { id: 'forward', label: C.forward },
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

const DEALERS = { spike, review, coe, replyall, friday, poker }

// A random task, never the same kind twice in a row. `leak` (the incoming
// incident) forces a Spot-the-spike card with it on fire.
export function makeTask(previousKind, leak) {
  if (leak) return spike(leak)
  const kinds = Object.keys(DEALERS).filter((k) => k !== previousKind)
  return DEALERS[pick(kinds)]()
}
