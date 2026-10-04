// The Dream Sprint task pool: tiny parodies of a developer's day, one decision
// each. makeTask() deals one; DreamSprint.jsx draws it. Every task has `choices`
// ({ id, label, key }) and the `answer` id.

import { BINS, TICKETS } from './tickets'
import { PULL_REQUESTS } from './pullRequests'
import { COES, COE_FIELDS } from './coe'
import { shuffle } from './dreams'

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const keyed = (choices) => choices.map((c, i) => ({ ...c, key: String(i + 1) }))

// The big flashed instruction before each card, WarioWare-style
export const INSTRUCTIONS = {
  triage: 'TRIAGE IT!',
  review: 'SHIP IT?',
  coe: 'BLAMELESS!',
  replyall: "DON'T REPLY ALL!",
  friday: 'DEPLOY?',
  poker: 'ESTIMATE!',
}

// Story shifts explain each one the first time you meet it (DreamSprint pauses
// the game while the card is up). `sprint` explains the Dream Sprint itself;
// `leak` the real incident sneaking into the dream.
export const INTROS = {
  sprint: {
    title: '💤 DREAM SPRINT',
    lines: [
      "You're asleep, and still on call. Quick work tasks will pop up: nail them to fill the 💤 bank.",
      'Every one you nail raises the multiplier. Get one wrong (or too slow) and it drops.',
      'Press W to wake up and keep the whole bank. If the pager wakes you first, you only keep half.',
      'When the dream starts buzzing, the pager is close. Wake up right then for a PERFECT WAKE (×1.5).',
    ],
  },
  triage: {
    title: '🐒 SIMian · ticket triage',
    lines: [
      'A ticket comes in. Put it in the right column before the bar runs out.',
      "Each column's rule is written on it: prod down or an exec asking → ANDON CORD; Kevin → DISAGREE & COMMIT.",
    ],
    keys: '1 – 4',
  },
  review: {
    title: '🐙 CRUD Reviews · code review',
    lines: [
      'Someone wants to merge code. Read the title and the diff.',
      'Safe? Ship it. Dangerous (deleting prod, passwords in logs, a "small cleanup" of 84,000 files)? Request changes.',
    ],
    keys: '1 – 2',
  },
  coe: {
    title: '📄 Qwip · write the COE',
    lines: [
      'Fill in one line of the postmortem (the "COE").',
      'Pick the blameless answer: never blame a person. It was a process or a system gap. (It was Kevin.)',
    ],
    keys: '1 – 3',
  },
  replyall: {
    title: '📧 Banana Mail · Reply-All',
    lines: [
      'An email lands. Sent to thousands of people? Archive it. Something actually for you? Reply.',
      'Careful: the buttons swap places every time.',
    ],
    keys: '1 – 2',
  },
  friday: {
    title: '🚀 BananaDeploy · ship it?',
    lines: [
      'A deploy is waiting for you to press the button.',
      'Small and approved on a normal day: deploy. Big, risky, or Friday afternoon: wait.',
    ],
    keys: '1 – 2',
  },
  poker: {
    title: '🃏 Planning Poker · estimate',
    lines: [
      'The team is estimating a piece of work.',
      "Pick the number the team picked. Never the Director's 40.",
    ],
    keys: '1 – 4',
  },
  leak: {
    title: '🔴 A real one',
    lines: [
      'This ticket is the incident that is about to wake you up. The pager is close.',
      'Triage it ANDON CORD and you wake up already knowing the fix (it glows on the PC).',
    ],
    keys: '1',
  },
}

// ------------------------------------------------------------------ Reply-All
const EMAILS = [
  { from: 'Kevin', subject: 'RE: RE: RE: please remove me from this list', to: 'all-banana-plantation@ (4,112)', answer: 'ignore' },
  { from: 'Greg', subject: 'Can you send me the on-call doc?', to: 'you', answer: 'reply' },
  { from: 'HR Bot', subject: 'Mandatory fun: RSVP by EOD', to: 'all-codemonkey@ (88,000)', answer: 'ignore' },
  { from: 'Dana', subject: 'Are you still on the bridge?', to: 'you, greg', answer: 'reply' },
  { from: 'VP of Bananas', subject: 'Thank you all for your hard work 🍌', to: 'all-banana-plantation@ (4,112)', answer: 'ignore' },
  { from: 'Facilities', subject: 'Who left a banana in the server room', to: 'all-codemonkey@ (88,000)', answer: 'ignore' },
]

// ------------------------------------------------------------------ Friday deploy
const DEPLOYS = [
  { when: 'Friday · 4:59 PM', what: 'Rewrite of the payments service', approvals: '0 / 2', answer: 'wait' },
  { when: 'Friday · 5:30 PM', what: '"Tiny" config change', approvals: '1 / 2 (Kevin)', answer: 'wait' },
  { when: 'Tuesday · 10:00 AM', what: 'Typo fix on the about page', approvals: '2 / 2', answer: 'deploy' },
  { when: 'Day before Black Friday', what: 'Brand new checkout', approvals: '"LGTM" (Greg)', answer: 'wait' },
  { when: 'Wednesday · 11:15 AM', what: 'Revert the thing that broke prod', approvals: '2 / 2', answer: 'deploy' },
  { when: 'Friday · 4:58 PM', what: 'Database migration (irreversible)', approvals: '2 / 2', answer: 'wait' },
]

// ------------------------------------------------------------------ Story-point poker
const STORIES = [
  'As a VP, I want the logo bigger',
  'Migrate everything to the new framework',
  'Add a "Like" button to the error page',
  'Make the database faster',
  'Fix the typo in the footer',
  'Rename the company (again)',
]

// ------------------------------------------------------------------ dealing
function triage(leak) {
  const ticket = leak ? { sev: 1, title: leak.title, from: 'Monitoring', flavor: '…wait, this one looks real.', answer: 'now', leak: true } : pick(TICKETS)
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
    choices: keyed([{ id: 'approve', label: '✅ Ship it' }, { id: 'request', label: '✋ Request changes' }]),
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
    { id: 'reply', label: email.answer === 'reply' ? 'Reply' : 'Reply All' },
    { id: 'ignore', label: email.answer === 'reply' ? 'Archive' : 'Archive & move on' },
  ])
  return { kind: 'replyall', email, choices: keyed(choices), answer: email.answer }
}

function friday() {
  const deploy = pick(DEPLOYS)
  return {
    kind: 'friday',
    deploy,
    choices: keyed(shuffle([{ id: 'deploy', label: '🚀 DEPLOY' }, { id: 'wait', label: '🛑 Wait' }])),
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
