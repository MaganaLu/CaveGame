import { create } from 'zustand'
import { NIGHT_LENGTH } from './GameClock'
import { LENGTHS, hasMod, modMultiplier, easeOf, escalationFactor } from './shifts'
import {
  ENDLESS_SCRIPT, FIRST_BREAK_SECONDS, BREAK_SECONDS, NAP_SECONDS, makeWave, waveSpeed, waveClearPoints, PERFECT_WAVE_POINTS,
} from './endless'
import { terminalGameFor, RACK_GAME, difficultyOf, timeLimitFor, executionQuality, rackTaskFor } from './microgames'
import { FALLOUT_INCIDENT } from './incidents'
import { unlocked, TIPS } from './gates'
import { fill } from './text'
import { unlockModifiers } from './unlocks'
import { generateIncident } from './incidentGen'
import { generateNight } from './schedule'
import { makeRng, todaysShift, seedForShift, randomSeed } from './rng'
import {
  stageOf, meterRate, resolvePayout, OUTAGE, BREACH_AFTER, WRONG_ACTION_COST, STAGES,
  STREAK_TIERS, NIGHT_BONUSES, STREAK_SECONDS, nightGrade,
} from './scoring'
import { CALLS, VOICEMAILS, TIMEOUT_REPLY, DIRECTOR_JOIN, DIRECTOR_LINES, DIRECTOR_LEAVES, ESCALATION_CALL } from './manager'
import * as sfx from './audio'
import {
  FALL_ASLEEP_SECONDS, LEAK_SECONDS, HAZARD_BEAT, hazardAt, FUSE_SECONDS, STORY_FUSE_MIN, STORY_FUSE_SHOWN, TASK_POINTS, MULT_STEP, MULT_DROP, MULT_MAX,
  YANKED_KEEP, TASK_STRESS,
} from '../dreams/dreams'
import { text } from '../content'

const MSG = text('messages')

export const PHASE = {
  MENU: 'MENU',
  APARTMENT: 'APARTMENT',
  SLEEPING: 'SLEEPING',
  DREAM: 'DREAM', // asleep and in the Dream Sprint
  INCIDENT: 'INCIDENT', // awake with at least one open incident
  NIGHT_COMPLETE: 'NIGHT_COMPLETE',
}

// How long a page can ring before it's missed (and escalates) comes from the
// shift's ease (shifts.js): 25 s in the arcade modes, 40 s in a story shift
const TIP_SECONDS = 7 // how long each of Dave's notes stays up
const SCREENS = ['computer', 'rack', 'lever'] // overlays that make the open/close sound
const FIRST_PICKUP_GRACE = 20 // extra seconds before you've ever picked up the phone (you're still finding it)

// Partner patience: someone is asleep in your bed. Every second something rings
// (an alert or Greg) wakes them a little more; quiet lets them settle. At zero
// you're sent to the couch for the rest of the night.
const PATIENCE_DRAIN = 5 // per second of ringing
const PATIENCE_RECOVER = 0.8 // per second of quiet

// Escalation policy: an alert left ringing pages Greg, then the Director
const DIRECTOR_COOLDOWN = 90 // seconds after he leaves before he can be summoned again

// Greg's phone calls (manager.js)
// How long Greg rings and how long you get to pick a reply: the shift's ease
const CALL_REPLY_SECONDS = 2.4 // Greg's reaction stays on screen this long
const CALL_EVERY = { work: 30, idle: 55, afterDecline: 18 }
const FIRST_CALL_AFTER = 35 // real seconds into the night

// The Director (boss incident): while he's on the call everything else escalates
// faster, Greg goes quiet, and he "just listens" out loud every few seconds
export const DIRECTOR_ID = 'director'
const DIRECTOR_PRESSURE = 1.3
const DIRECTOR_QUIP_SECONDS = 8

// Stakes
export const MAX_STRIKES = 3 // SLA breaches before you're fired
// The Big Red Lever (server rack): RESTART EVERYTHING. Costs a 🧨 charge.
const LEVER_SUCCESS = 0.55 // fixes every open incident (except the finale)
const LEVER_FAIL_METER = 30 // ...or pushes every one of them this much closer to OUTAGE
const REBOOT_SECONDS = 2.5 // lights out while everything restarts
export const MAX_CHARGES = 3
const CHARGE_STREAK = 5 // a streak this long earns a charge
const DECLINE_RATE = 1.3 // declined alerts escalate this much faster
const MELTDOWN_SECONDS = 4
// Yanked awake: answer this fast and the incident escalates slower
const QUICK_ANSWER_SECONDS = 2
const QUICK_ANSWER_RATE = 0.8

// The one pickup: a golden banana, double points for a while
const PICKUP_LIFETIME = 30
const BANANA_SECONDS = 30

let uid = 0
let nightRng = makeRng(1) // runtime randomness for the current night

const clamp = (v) => Math.max(0, Math.min(100, v))

// Greg's timers scale with the shift length, and halve with the Greg modifier
const callScale = (s) => LENGTHS[s.length].calls * (hasMod(s, 'greg') ? 0.5 : 1)

// Score gains (never penalties) are multiplied by the shift modifiers
const gain = (s, points) => Math.round(points * modMultiplier(s.mods))

function freshNight({ seed, shift, mode, length = 'story', mods = [] }) {
  return {
    phase: PHASE.APARTMENT,
    overlay: null, // blocking UI: 'computer' | 'sleepPrompt'
    hasPhone: false, // starts on the nightstand; once picked up, it stays with you
    prompt: null,

    seed,
    shift, // daily shift number, or null for a random shift
    mode, // 'daily' | 'random'
    length, // 'story' | 'quick' (shifts.js)
    mods, // shift modifier ids (shifts.js)
    script: length === 'endless' ? ENDLESS_SCRIPT : generateNight(makeRng(seed), length),
    // Endless mode: the current wave ({ n, def, status: 'break' | 'active', ... })
    wave: length === 'endless' ? { n: 0, def: null, status: 'break', breakUntil: FIRST_BREAK_SECONDS } : null,
    endReason: null, // 'dawn' | 'fired'
    stillOpen: [], // incident titles still open when the night ended (handoff doc)

    gameTime: 0,
    elapsed: 0, // real seconds since the night started
    stress: 10,
    score: 0,
    streak: 0,
    lastResolve: null, // payout breakdown shown on the resolve card
    banners: [], // big center-screen callouts (streak tiers, CLUTCH)
    pops: [], // floating "+350" / "-500" score popups
    charges: length === 'quick' ? 1 : 0, // 🧨 Big Red Lever pulls (the lever unlocks later, see gates.js)
    leverGiven: length === 'quick', // the first charge comes with the lever's unlock
    tips: [], // Dave's first-time notes already shown (gates.js)
    tipQueue: [], // notes waiting for the one on screen to go away
    paused: false, // the whole night is on hold (a story explanation card is up)
    reboot: null, // { until, success } while everything is restarting
    microgame: null, // fix being executed: { id, incUid, kind, where: 'terminal' | 'rack', difficulty, limit }
    terminal: 'pc', // which terminal the computer overlay is: 'pc' (desk) or 'laptop' (kitchen, on battery)
    streakLeft: 0, // seconds until the streak cools a step, see STREAK_SECONDS
    grade: null, // the night's letter grade, set at 7 AM (or when fired)
    slowmoUntil: 0, // performance.now() ms; GameManager slows time until then
    nightBonuses: [], // awarded at 7 AM

    incidents: [],
    selectedIncident: null,
    messages: [],
    toasts: [],

    // The apartment fights back
    home: { wifi: true, power: true },
    pickups: [], // golden bananas lying around: { uid, spot, until }
    doubleUntil: -Infinity, // golden banana: double points until then

    hasFlashlight: false,
    flashlightOn: false,

    // Greg calls
    call: null, // { from, script, status: 'ringing' | 'active' | 'ending', step, phase: 'line' | 'reply', ... }
    callTimer: FIRST_CALL_AFTER * callScale({ length, mods }),
    lastCall: -1,
    missedCalls: 0,
    flickerOff: false, // lamps off (while the Big Red Lever reboots everything)
    directorTimer: 0, // seconds to the Director's next "quick question"
    directorFreeAt: 0, // elapsed: escalations can't summon the Director again before this
    patience: 100, // your partner's, see PATIENCE_DRAIN
    onCouch: false, // patience ran out: you sleep on the couch now

    meltdownUntil: -Infinity, // stress hit 100: no control until then

    scriptIndex: 0,
    heartbeatTimer: 0,
    wakeAt: -Infinity,
    yankedAt: -Infinity, // the pager ripped you awake (the red BZZZT flash); not set when you wake yourself

    sleptAt: -Infinity,
    dreamPending: false, // fall asleep -> dream starts after FALL_ASLEEP_SECONDS
    dream: null, // Dream Sprint: { id, bank, mult, cleared, fumbles }
    dreamRinging: null, // LET IT RING: the pager going off in the dream { since, fuse, beats, fuseShown }
    dreamLeak: null, // the incoming incident, leaking into the dream: { key, title }
    dreamIntel: null, // key of the incident you triaged in the dream (starts pre-diagnosed)
    dreamResult: null, // { kind: 'woke' | 'perfect' | 'yanked', kept, bank, until } after waking
    quickAnswerUntil: -Infinity, // yanked awake: answer before this for a slower escalation

    stats: {
      resolved: 0, outages: 0, missed: 0, breached: 0, bestStreak: 0, naps: 0, yanked: 0, cashOuts: 0, bestHazard: 1, napPoints: 0,
      wrongActions: 0, responseTimes: [], risky: 0, pickups: 0, meltdowns: 0,
      callsAnswered: 0, callsMissed: 0, managedUp: 0,
      grades: [], // a letter per incident: fixed (S..F) or breached (F)
      waves: 0, // endless: waves cleared
      directorVisits: 0, escalations: 0, leverPulls: 0, // for the 7 AM handoff doc
    },
  }
}

// Hot-reloading this module creates a second store: the DOM UI picks it up, but
// components inside the R3F Canvas keep the old one and everything desyncs (e.g. E
// stops working). Reload the page instead. Also covers edits to incidents/scoring.
if (import.meta.hot) import.meta.hot.accept(() => location.reload())

export const isRinging = (s) => s.incidents.some((i) => !i.acknowledged)
export const isAsleep = (s) => s.phase === PHASE.SLEEPING || s.phase === PHASE.DREAM
export const isIncapacitated = (s) => s.elapsed < s.meltdownUntil
export const isBlocked = (s) =>
  s.overlay !== null || s.phase === PHASE.MENU || isAsleep(s) || s.phase === PHASE.NIGHT_COMPLETE || isIncapacitated(s)
export const hasDouble = (s) => s.elapsed < s.doubleUntil

// The next incident that will page you while asleep: { key, id, seed, secs }
// (real seconds away). Story: the next scripted incident. Endless: the first
// incident of the next wave. Keys match the ones addIncident gets.
function nextPager(s, pace) {
  if (s.wave) {
    if (s.wave.status !== 'break') return null
    const n = s.wave.n + 1
    const first = makeWave(s.seed, n).spawns[0]
    return { key: `w${n}-0`, id: first.id, seed: (s.seed + n * 1009) >>> 0, secs: s.wave.breakUntil - s.elapsed + first.at }
  }
  for (let i = s.scriptIndex; i < s.script.length; i++) {
    const ev = s.script[i]
    if (ev.type === 'incident') return { key: `s${i}`, id: ev.id, seed: (s.seed + i * 7919) >>> 0, secs: (ev.at - s.gameTime) / pace.dream }
  }
  return null
}

// Each incident gets its own seeded rng (seed + event index), so a shift's
// incidents are identical for everyone no matter how they play.
function spawnIncident(id, elapsed, rngSeed, extra = {}) {
  const def = generateIncident(id, makeRng(rngSeed))
  return {
    rackTask: rackTaskFor(def, rngSeed), // hardware step at the rack, or null
    awaitingRack: false, // software side fixed, rack step still to do
    softwareExecution: null, // microgame quality of the software step
    uid: ++uid,
    def,
    severity: def.severity,
    meter: 0, // escalation 0..100, see scoring.js
    rate: meterRate(def),
    stage: 0,
    outageTime: 0,
    spawnedAt: elapsed,
    ringingSince: elapsed,
    acknowledged: false,
    answeredByPhone: false, // for the NO-LOOK FIX bonus
    hinted: false, // answered the phone: the caller's hint is shown
    declined: false,
    wrong: 0, // wrong actions taken, for CLEAN FIX
    missedCounted: false,
    node: 'overview',
    inspected: ['overview'],
    log: [],
    ...extra,
  }
}

export const useGameStore = create((set, get) => {
  const toast = (state, text, kind = 'info', duration = 3) => [
    ...state.toasts,
    { id: ++uid, text, kind, until: state.elapsed + duration },
  ]

  // Floating score popup for every change to the score
  const popScore = (state, amount, label) => [
    ...state.pops,
    { id: ++uid, amount, label, until: state.elapsed + 1.2 },
  ]

  // Dave's note, the first time something shows up (gates.js)
  const showTip = (next, key) => {
    next.toasts = [...next.toasts, { id: ++uid, text: TIPS[key], kind: 'tip', tip: key, until: next.elapsed + TIP_SECONDS }]
  }

  // One at a time: if a note is still up, the next waits its turn (see tick)
  const tip = (next, key) => {
    if (next.tips.includes(key)) return
    next.tips = [...next.tips, key]
    const showing = next.toasts.find((t) => t.kind === 'tip')
    if (!showing) return showTip(next, key)
    // The pager and the Director matter right now: they bump the note on screen,
    // which goes back to the front of the line
    if (key === 'pager' || key === 'director') {
      next.toasts = next.toasts.filter((t) => t !== showing)
      next.tipQueue = [showing.tip, ...next.tipQueue]
      return showTip(next, key)
    }
    next.tipQueue = [...next.tipQueue, key]
  }

  // Something at home breaks: the Wi-Fi or the breaker
  const breakHome = (next, what) => {
    next.home = { ...next.home, [what]: false }
    next.toasts = toast(next, what === 'wifi' ? MSG.toasts.wifiDown : MSG.toasts.powerDown, 'bad', 5)
    tip(next, what === 'wifi' ? 'wifi' : 'power')
    sfx.error()
  }

  const dropBanana = (next, spot) => {
    next.pickups = [...next.pickups, { uid: ++uid, spot, until: next.elapsed + PICKUP_LIFETIME }]
    tip(next, 'banana')
    sfx.messageDing()
  }

  // A new incident lands. The signature mechanic: if you're asleep, a hard cut
  // from the dream to a ringing phone.
  const addIncident = (next, inc, key) => {
    // Hardware steps only once the rack is introduced
    if (!unlocked(next, 'rack')) inc.rackTask = null
    // Story shifts start slow and speed up through the night; an incident keeps
    // the speed it arrived with
    inc.rate *= escalationFactor(next)
    // You triaged this one in your dream: the right fix is already highlighted
    if (key && next.dreamIntel === key) {
      inc.prediagnosed = true
      next.dreamIntel = null
    }
    next.incidents = [...next.incidents, inc]
    // The very first page of the night teaches itself: the fix is highlighted
    if (inc.def.id !== DIRECTOR_ID && !next.tips.includes('pager') && next.length !== 'quick') inc.prediagnosed = true
    if (inc.def.id !== DIRECTOR_ID) tip(next, 'pager')
    if (inc.def.id === DIRECTOR_ID) {
      tip(next, 'director')
      next.stats.directorVisits++
      next.banners = [...next.banners, { id: ++uid, text: DIRECTOR_JOIN, sub: MSG.banners.directorJoined, kind: 'clutch', until: next.elapsed + 2.6 }]
      Object.assign(next, pushMessage(next, 'GREG', MSG.greg.directorJoined))
      // Greg hangs up mid-call (no penalty): he would rather not be on this one
      if (next.call) next.call = null
      next.directorTimer = 3
      sfx.sting()
    }
    if (next.phase === PHASE.DREAM && next.dream) {
      // LET IT RING: the pager goes off inside the dream and you keep sleeping;
      // hazard pay climbs until you wake (cash out) or the fuse runs out (dreams.js)
      if (!next.dreamRinging) {
        const story = next.length === 'story'
        const [lo, hi] = FUSE_SECONDS
        const min = story ? Math.max(lo, STORY_FUSE_MIN) : lo
        const rings = next.stats.naps + next.stats.yanked
        next.dreamRinging = { since: next.elapsed, fuse: min + Math.random() * (hi - min), beats: 0, fuseShown: story && rings < STORY_FUSE_SHOWN }
      }
    } else if (isAsleep(next)) {
      // Still falling asleep (no dream yet): straight up
      yankAwake(next)
    }
  }

  // The page escalated before you woke up (or you weren't dreaming yet): the hard
  // cut back to a ringing phone. You keep a quarter of the bank.
  const yankAwake = (next) => {
    const ring = next.dreamRinging
    if (next.dream) {
      const bank = next.dream.bank
      const kept = gain(next, bank * YANKED_KEEP)
      next.score += kept
      if (kept > 0) next.pops = popScore(next, kept, MSG.pops.yanked)
      // The near miss: what you were at when it blew
      const hazard = ring ? hazardAt(ring.fuse) : 1
      next.dreamResult = { kind: 'yanked', kept, bank, fuse: ring?.fuse ?? 0, hazard, until: next.elapsed + 4.5 }
      next.stats.yanked++
      next.stats.napPoints += kept
    }
    next.dream = null
    next.dreamPending = false
    next.dreamRinging = null
    next.dreamLeak = null
    next.phase = PHASE.INCIDENT
    next.wakeAt = next.elapsed
    next.yankedAt = next.elapsed
    next.quickAnswerUntil = next.elapsed + QUICK_ANSWER_SECONDS
    next.stress = clamp(next.stress + 15)
    sfx.wakeGlitch()
  }

  // Endless mode: start waves after each break, spawn their incidents, and score
  // the clear. Napping during a break turns it into a bonus stage (goToSleep).
  const runWave = (next) => {
    let w = next.wave
    if (w.status === 'break' && next.elapsed >= w.breakUntil) {
      const n = w.n + 1
      const def = makeWave(next.seed, n)
      w = { n, def, status: 'active', startAt: next.elapsed, spawned: 0, strikesAtStart: next.stats.breached, wifi: false, power: false, pickups: 0 }
      next.banners = [...next.banners, { id: ++uid, text: fill(MSG.banners.wave, { n }), sub: def.name, kind: def.boss ? 'clutch' : 'tier', until: next.elapsed + 2.4 }]
      sfx.sting()
    }
    if (w.status === 'active') {
      const t = next.elapsed - w.startAt
      const { def } = w
      while (w.spawned < def.spawns.length && def.spawns[w.spawned].at <= t) {
        const inc = spawnIncident(def.spawns[w.spawned].id, next.elapsed, (next.seed + w.n * 1009 + w.spawned * 7919) >>> 0)
        inc.rate *= waveSpeed(w.n)
        addIncident(next, inc, `w${w.n}-${w.spawned}`)
        w = { ...w, spawned: w.spawned + 1 }
      }
      for (const what of ['wifi', 'power']) {
        if (def[`${what}At`] != null && !w[what] && t >= def[`${what}At`]) {
          w = { ...w, [what]: true }
          breakHome(next, what)
        }
      }
      if (w.pickups < def.pickups.length && t >= def.pickups[w.pickups]) {
        dropBanana(next, nightRng.int(1000))
        w = { ...w, pickups: w.pickups + 1 }
      }
      // Cleared: everything spawned and nothing real left open
      if (w.spawned >= def.spawns.length && next.incidents.length === 0) {
        const perfect = next.stats.breached === w.strikesAtStart
        const points = gain(next, waveClearPoints(w.n) + (perfect ? PERFECT_WAVE_POINTS : 0))
        next.score += points
        next.pops = popScore(next, points, perfect ? MSG.pops.perfectWave : MSG.pops.waveClear)
        next.banners = [...next.banners, { id: ++uid, text: fill(MSG.banners.waveClear, { n: w.n }), sub: perfect ? MSG.banners.waveClearPerfect : MSG.banners.waveClearNap, kind: 'tier', until: next.elapsed + 2.4 }]
        next.stats.waves = w.n
        if (next.leverGiven) next.charges = Math.min(MAX_CHARGES, next.charges + 1) // a fresh 🧨 for the next wave
        tip(next, 'nap')
        w = { ...w, status: 'break', breakUntil: next.elapsed + BREAK_SECONDS }
        sfx.success(3)
      }
    }
    next.wave = w
  }

  const pushMessage = (state, from, text) => ({
    messages: [...state.messages, { id: ++uid, from, text, gameTime: state.gameTime }],
  })

  // Escalations, misses, breaches, a failed lever pull and meltdowns end the streak
  const breakStreak = (next, reason) => {
    if (next.streak >= 2) next.toasts = toast(next, fill(MSG.toasts.streakLost, { streak: next.streak, reason }), 'bad', 3)
    next.streak = 0
  }

  const updateIncident = (incUid, fn) =>
    set((s) => ({ incidents: s.incidents.map((i) => (i.uid === incUid ? fn(i) : i)) }))

  // ---------------------------------------------------------------- Greg calls
  // These mutate a working copy (`next`) so tick and the call actions share them.

  // Work calls while something is broken, check-ins when it isn't, and after 2 AM
  // sometimes a late-night special
  const ringCall = (next, script) => {
    const { callRing, callChoice } = easeOf(next)
    next.call = { id: ++uid, script, from: script.from, status: 'ringing', ringSince: next.elapsed, ringTimer: 0, step: 0, transcript: [], ringSeconds: callRing, choiceSeconds: callChoice }
  }

  const pickCall = (next) => {
    let tier = next.incidents.length ? 'work' : 'idle'
    if (next.gameTime >= 180 && Math.random() < 0.4) tier = 'late'
    const options = CALLS.map((c, i) => [c, i]).filter(([c, i]) => c.tier === tier && i !== next.lastCall)
    const [script, index] = options[Math.floor(Math.random() * options.length)]
    next.lastCall = index
    ringCall(next, script)
    tip(next, 'greg')
  }

  const endCall = (next) => {
    next.call = null
    next.callTimer = next.incidents.length ? CALL_EVERY.work : CALL_EVERY.idle
    next.callTimer *= (1 - (next.gameTime / 480) * 0.4) * callScale(next) // calls come faster as the night goes on
  }

  // Declined or missed: he calls back sooner, and the voicemails get worse
  const missCall = (next) => {
    next.missedCalls++
    next.stats.callsMissed++
    next.stress = clamp(next.stress + 4 + 2 * next.missedCalls)
    Object.assign(next, pushMessage(next, fill(MSG.greg.voicemailFrom, { from: next.call.from }), VOICEMAILS[Math.min(next.missedCalls - 1, VOICEMAILS.length - 1)]))
    next.call = null
    next.callTimer = CALL_EVERY.afterDecline * callScale(next)
  }

  const chooseInCall = (next, index) => {
    const c = { ...next.call, transcript: [...next.call.transcript] }
    const step = c.script.steps[c.step]
    const choice = index === null ? null : step.choices[index]
    c.transcript.push({ who: 'you', text: choice ? choice.text : MSG.call.timeout })
    c.transcript.push({ who: c.from, text: choice ? choice.reply : TIMEOUT_REPLY })
    if (choice?.good) {
      next.stress = clamp(next.stress - 6)
      const points = gain(next, 150)
      next.score += points
      next.pops = popScore(next, points, MSG.pops.managedUp)
      next.stats.managedUp++
      next.toasts = toast(next, fill(MSG.toasts.managedUp, { points }), 'good')
      sfx.click()
    } else {
      next.stress = clamp(next.stress + (choice ? 12 : 15))
      sfx.error()
    }
    c.phase = 'reply'
    c.replyUntil = next.elapsed + CALL_REPLY_SECONDS
    next.call = c
  }

  const advanceCall = (next) => {
    const c = { ...next.call, transcript: [...next.call.transcript] }
    if (c.step + 1 < c.script.steps.length) {
      c.step++
      c.phase = 'line'
      c.deadline = next.elapsed + easeOf(next).callChoice
      c.transcript.push({ who: c.from, text: c.script.steps[c.step].line })
      next.call = c
    } else {
      next.call = { ...c, status: 'ending', endAt: next.elapsed + 1.2 }
    }
  }

  // The computer needs power and Wi-Fi; returns a reason if it can't be used
  // The laptop runs on battery, so only the desk PC cares about the breaker
  const computerDown = (s) => (s.reboot ? 'reboot' : !s.home.power && s.terminal !== 'laptop' ? 'power' : !s.home.wifi ? 'wifi' : null)

  const startMicrogame = (s, inc, kind, where) => {
    const difficulty = difficultyOf(s)
    return { id: ++uid, incUid: inc.uid, kind, where, difficulty, limit: timeLimitFor(difficulty) * easeOf(s).microgame }
  }

  // Yanked awake and answered within QUICK_ANSWER_SECONDS: whatever woke you
  // escalates slower
  const quickAnswer = (s, incidents) =>
    s.elapsed > s.quickAnswerUntil ? incidents : incidents.map((i) => (i.spawnedAt >= s.wakeAt ? { ...i, rate: i.rate * QUICK_ANSWER_RATE } : i))
  const quickAnswerToast = (s) =>
    s.elapsed > s.quickAnswerUntil ? {} : { quickAnswerUntil: -Infinity, toasts: toast(s, MSG.toasts.quickAnswer, 'good', 2.5) }

  // Answering (Q / first pickup) hears the caller's hint; declining (X) is faster
  // but the alert escalates quicker and you learn nothing
  const acknowledgeRinging = (s, how) =>
    s.incidents.map((i) => {
      if (i.acknowledged) return i
      if (how === 'decline') return { ...i, acknowledged: true, declined: true, rate: i.rate * DECLINE_RATE }
      return { ...i, acknowledged: true, answeredByPhone: true, hinted: true }
    })

  return {
    ...freshNight({ seed: 1, shift: null, mode: 'daily' }),
    phase: PHASE.MENU,
    nightId: 0,

    // ---------------------------------------------------------------- flow
    // mode 'daily' = today's shared shift; 'random' = a fresh seed
    // Retry from the score screen reuses the last night's length and modifiers
    startNight: (mode = get().mode, { length = get().length, mods = get().mods } = {}) => {
      sfx.initAudio()
      sfx.setPager(0)
      const shift = mode === 'daily' ? todaysShift() : null
      const seed = mode === 'daily' ? seedForShift(shift) : randomSeed()
      nightRng = makeRng(seed ^ 0x9e3779b9)
      set((s) => ({ ...freshNight({ seed, shift, mode, length, mods }), nightId: s.nightId + 1 }))
    },

    toMenu: () => {
      sfx.setPager(0)
      set({ phase: PHASE.MENU })
    },

    endNight: (reason = 'dawn') => {
      document.exitPointerLock?.()
      unlockModifiers() // finishing any shift opens up the modifiers
      sfx.setPager(0)
      set((s) => {
        // Anything still open at 7 AM is a breach, and an F
        const unresolved = reason === 'dawn' ? s.incidents.length : 0
        const stats = {
          ...s.stats,
          breached: s.stats.breached + unresolved,
          grades: [...s.stats.grades, ...Array(unresolved).fill('F')],
        }
        // Fired employees do not demonstrate Banana Principles
        // (Endless always ends in getting fired, so it still gets them)
        const nightBonuses = reason === 'fired' && s.length !== 'endless'
          ? []
          : NIGHT_BONUSES.filter((b) => b.test(stats)).map(({ id, label, principle, points }) => ({ id, label, principle, points: gain(s, points) }))
        return {
          phase: PHASE.NIGHT_COMPLETE,
          endReason: reason,
          stillOpen: s.incidents.map((i) => i.def.title), // for the handoff doc
          dream: null,
          overlay: null,
          incidents: [],
          stats,
          nightBonuses,
          grade: nightGrade(stats, reason === 'fired' && s.length !== 'endless'),
          score: s.score + nightBonuses.reduce((sum, b) => sum + b.points, 0),
        }
      })
    },

    // ---------------------------------------------------------------- tick
    tick: (dt) => {
      const s = get()
      if (s.phase === PHASE.MENU || s.phase === PHASE.NIGHT_COMPLETE || s.paused) return

      const sleeping = isAsleep(s)
      const pace = LENGTHS[s.length]
      const rate = s.phase === PHASE.DREAM ? pace.dream : sleeping ? pace.sleep : pace.awake
      const next = {
        ...s,
        elapsed: s.elapsed + dt,
        gameTime: s.gameTime + dt * rate,
        stats: { ...s.stats },
      }
      next.toasts = s.toasts.filter((t) => t.until > next.elapsed)
      // Dave's queued notes, one at a time
      if (next.tipQueue.length && !next.toasts.some((t) => t.kind === 'tip')) {
        showTip(next, next.tipQueue[0])
        next.tipQueue = next.tipQueue.slice(1)
      }
      next.banners = s.banners.filter((b) => b.until > next.elapsed)
      next.pops = s.pops.filter((p) => p.until > next.elapsed)
      next.pickups = s.pickups.filter((p) => p.until > next.elapsed)
      if (next.reboot) next.flickerOff = true // the whole apartment goes dark while it restarts

      // Falling asleep -> the Dream Sprint starts
      if (next.phase === PHASE.SLEEPING && next.dreamPending && next.elapsed - next.sleptAt >= FALL_ASLEEP_SECONDS) {
        next.phase = PHASE.DREAM
        next.dreamPending = false
        next.dream = { id: ++uid, bank: 0, mult: 1, cleared: 0, fumbles: 0 }
      }

      // Scripted night events
      while (next.scriptIndex < next.script.length && next.script[next.scriptIndex].at <= next.gameTime) {
        const index = next.scriptIndex++
        const ev = next.script[index]
        if (ev.type === 'message') {
          Object.assign(next, pushMessage(next, ev.from, ev.text))
          sfx.messageDing()
        } else if (ev.type === 'home') {
          breakHome(next, ev.what)
        } else if (ev.type === 'pickup') {
          // Nobody collects pickups in their sleep
          if (!isAsleep(next)) dropBanana(next, ev.spot)
        } else if (ev.type === 'incident') {
          addIncident(next, spawnIncident(ev.id, next.elapsed, (next.seed + index * 7919) >>> 0), `s${index}`)
        }
      }
      if (next.wave) runWave(next)

      // The Big Red Lever arrives with its first charge (gates.js)
      if (!next.leverGiven && unlocked(next, 'lever')) {
        next.leverGiven = true
        next.charges = Math.min(MAX_CHARGES, next.charges + 1)
        next.banners = [...next.banners, { id: ++uid, ...MSG.banners.leverNew, kind: 'tier', until: next.elapsed + 2.6 }]
        tip(next, 'lever')
      }

      // Escalation meters, outages, missed alerts
      const directorHere = next.incidents.some((i) => i.def.id === DIRECTOR_ID)
      let summonDirector = false
      const incidents = []
      let fallout = false
      for (const old of next.incidents) {
        // The Director on the call makes everything else escalate faster
        const pressure = directorHere && old.def.id !== DIRECTOR_ID ? DIRECTOR_PRESSURE : 1
        const inc = { ...old, meter: Math.min(100, old.meter + old.rate * pressure * dt) }
        // Escalation policy: ringing too long pages Greg (he calls you about it)...
        const ringingFor = next.elapsed - inc.ringingSince
        const { missedAfter, escalateToGreg } = easeOf(next)
        if (!inc.acknowledged && (inc.escalation ?? 0) < 1 && ringingFor > escalateToGreg && unlocked(next, 'greg')) {
          inc.escalation = 1
          next.stats.escalations++
          next.toasts = toast(next, fill(MSG.toasts.escalatedToGreg, { service: inc.def.service }), 'bad', 3)
          tip(next, 'escalation')
          if (!next.call && next.hasPhone && !isAsleep(next) && !directorHere) ringCall(next, ESCALATION_CALL)
        }
        // ...and still ignored, the Director (see below)
        if (!inc.acknowledged && (inc.escalation ?? 0) < 2 && ringingFor > missedAfter && unlocked(next, 'greg') && inc.def.id !== DIRECTOR_ID) {
          inc.escalation = 2
          summonDirector = true
        }
        if (!inc.acknowledged && !inc.missedCounted && ringingFor > missedAfter + (next.hasPhone ? 0 : FIRST_PICKUP_GRACE)) {
          inc.missedCounted = true
          next.stats.missed++
          next.stress += 10
          next.toasts = toast(next, MSG.toasts.missedAlert, 'bad')
          breakStreak(next, MSG.streakReasons.missedAlert)
        }

        const stage = stageOf(inc.meter)
        if (stage > inc.stage) {
          inc.stage = stage
          if (stage === OUTAGE) {
            // The phone starts screaming again and the fallout begins
            inc.acknowledged = false
            inc.missedCounted = false
            inc.ringingSince = next.elapsed
            next.stats.outages++
            next.stress += 20
            next.toasts = toast(next, fill(MSG.toasts.outage, { service: inc.def.service }), 'bad', 3.5)
            breakStreak(next, MSG.streakReasons.outage)
            fallout = true
          } else {
            next.stress += 5
            next.toasts = toast(next, fill(MSG.toasts.stageUp, { service: inc.def.service, stage: STAGES[stage] }), stage >= 2 ? 'bad' : 'info')
          }
        }

        if (inc.stage === OUTAGE) {
          inc.outageTime += dt
          if (inc.outageTime >= BREACH_AFTER) {
            next.stats.breached++
            next.score -= 500
            next.pops = popScore(next, -500, MSG.pops.breach)
            next.stats.grades = [...next.stats.grades, 'F']
            next.stress += 20
            next.toasts = toast(next, fill(MSG.toasts.breach, { strikes: next.stats.breached, max: MAX_STRIKES }), 'bad', 4)
            breakStreak(next, MSG.streakReasons.breach)
            Object.assign(next, pushMessage(next, 'GREG', next.stats.breached >= MAX_STRIKES - 1 ? MSG.greg.breachLast : MSG.greg.breach))
            continue
          }
        }
        incidents.push(inc)
      }
      if (fallout && !incidents.some((i) => i.def.id === FALLOUT_INCIDENT)) {
        incidents.push(spawnIncident(FALLOUT_INCIDENT, next.elapsed, nightRng.int(2 ** 31)))
      }
      next.incidents = incidents

      // Escalated all the way: the Director joins the call (one at a time, with a cooldown)
      if (summonDirector && !directorHere && next.elapsed >= next.directorFreeAt) {
        addIncident(next, spawnIncident(DIRECTOR_ID, next.elapsed, nightRng.int(2 ** 31)), null)
        next.toasts = toast(next, MSG.toasts.escalatedToDirector, 'bad', 4)
      }

      // The streak drains while there's work open: too long without a fix and it
      // cools down a step
      if (next.streak > 0 && incidents.length > 0) {
        next.streakLeft -= dt
        if (next.streakLeft <= 0) {
          next.streak--
          next.streakLeft = next.streak > 0 ? STREAK_SECONDS : 0
          if (next.streak >= 1) next.toasts = toast(next, fill(MSG.toasts.streakCooled, { streak: next.streak }), 'bad', 2)
        }
      }
      if (!incidents.some((i) => i.uid === next.selectedIncident)) next.selectedIncident = incidents[0]?.uid ?? null
      // The incident you were fixing breached (or vanished): the microgame is moot
      if (next.microgame && !incidents.some((i) => i.uid === next.microgame.incUid)) next.microgame = null

      // Meters
      // Stress: work and noise raise it, quiet and sleep lower it
      if (sleeping) {
        next.stress -= 1 * dt
      } else {
        if (incidents.length === 0) next.stress -= 0.4 * dt
        for (const inc of incidents) if (inc.stage >= 2) next.stress += 0.6 * dt
        if (isRinging(next)) next.stress += 0.3 * dt
        if (!next.home.power) next.stress += 0.3 * dt // no power, no dashboards
      }
      // Story shifts take stress in smaller bites
      if (next.stress > s.stress) next.stress = s.stress + (next.stress - s.stress) * easeOf(next).stress
      next.stress = clamp(next.stress)

      // Partner patience: ringing wakes them, quiet settles them
      if (!next.onCouch && unlocked(next, 'partner')) {
        const ringing = isRinging(next) || next.call?.status === 'ringing'
        next.patience = clamp(next.patience + (ringing ? -PATIENCE_DRAIN : PATIENCE_RECOVER) * dt)
        if (next.patience < 75) tip(next, 'partner')
        if (next.patience <= 0) {
          next.onCouch = true
          next.banners = [...next.banners, { id: ++uid, ...MSG.banners.couch, kind: 'clutch', until: next.elapsed + 2.8 }]
          next.stress = clamp(next.stress + 10)
          tip(next, 'couch')
          sfx.error()
        }
      }

      if (!sleeping) {
        // Maxed out: a meltdown (you lose control for a few seconds)
        if (next.stress >= 100 && next.elapsed >= next.meltdownUntil) {
          next.meltdownUntil = next.elapsed + MELTDOWN_SECONDS
          next.stress = 55
          next.stats.meltdowns++
          breakStreak(next, MSG.streakReasons.meltdown)
          document.exitPointerLock?.()
        }
      }

      // The next page leaks into the dream as a ticket (see DreamSprint)
      if (next.dream && !next.dreamRinging) {
        const upcoming = nextPager(next, pace)
        if (upcoming && upcoming.secs <= LEAK_SECONDS && next.dreamLeak?.key !== upcoming.key) {
          next.dreamLeak = { key: upcoming.key, title: generateIncident(upcoming.id, makeRng(upcoming.seed)).title }
        }
      }
      // LET IT RING: a beat of hazard pay (with a rising tick), until the fuse runs out
      if (next.dreamRinging) {
        const ring = next.dreamRinging
        const t = next.elapsed - ring.since
        const beats = Math.floor(t / HAZARD_BEAT)
        if (beats > ring.beats) {
          next.dreamRinging = { ...ring, beats }
          sfx.hazardBeat(beats)
        }
        if (t >= ring.fuse) yankAwake(next)
      }

      // Pager keeps going until every alert is answered (in a dream too: let it ring)
      sfx.setPager(isRinging(next) ? 1 : 0)

      if (!sleeping) {
        // Greg calls (only once you have the phone, and never while the Director
        // is on: Greg is on mute)
        if (!next.call) {
          if (next.hasPhone && !directorHere && unlocked(next, 'greg')) next.callTimer -= dt
          if (next.callTimer <= 0) pickCall(next)
        } else if (next.call.status === 'ringing') {
          next.call = { ...next.call, ringTimer: next.call.ringTimer - dt }
          if (next.call.ringTimer <= 0) {
            sfx.ringtone()
            next.call.ringTimer = 2.4
          }
          if (next.elapsed - next.call.ringSince > easeOf(next).callRing) missCall(next)
        } else if (next.call.status === 'active') {
          if (next.call.phase === 'line' && next.elapsed > next.call.deadline) chooseInCall(next, null)
          else if (next.call.phase === 'reply' && next.elapsed > next.call.replyUntil) advanceCall(next)
        } else if (next.call.status === 'ending' && next.elapsed > next.call.endAt) {
          endCall(next)
        }

        // The Director "just listens", out loud
        if (directorHere) {
          next.directorTimer -= dt
          if (next.directorTimer <= 0) {
            next.directorTimer = DIRECTOR_QUIP_SECONDS
            next.toasts = toast(next, fill(MSG.toasts.directorQuip, { line: nightRng.pick(DIRECTOR_LINES) }), 'bad', 4)
            next.stress = clamp(next.stress + 3)
          }
        }
      }

      if (next.stress > 70 && !sleeping) {
        next.heartbeatTimer -= dt
        if (next.heartbeatTimer <= 0) {
          sfx.stressTick()
          next.heartbeatTimer = 1.3 - (next.stress - 70) / 60
        }
      }

      if (!sleeping) next.phase = next.incidents.length ? PHASE.INCIDENT : PHASE.APARTMENT

      set(next)
      if (next.reboot && next.elapsed >= next.reboot.until) get().finishReboot()
      if (next.stats.breached >= MAX_STRIKES) get().endNight('fired')
      else if (!next.wave && next.gameTime >= NIGHT_LENGTH) get().endNight('dawn')
    },

    // ---------------------------------------------------------------- UI
    setPrompt: (prompt) => {
      if (get().prompt !== prompt) set({ prompt })
    },
    toast: (text, kind, duration) => set((s) => ({ toasts: toast(s, text, kind, duration) })),
    openOverlay: (overlay) => {
      document.exitPointerLock?.()
      if (SCREENS.includes(overlay) && get().overlay !== overlay) sfx.screenOpen()
      set({ overlay, prompt: null })
    },
    // Walking away from a fix mid-microgame just cancels it
    closeOverlay: () => {
      if (SCREENS.includes(get().overlay)) sfx.screenClose()
      set({ overlay: null, microgame: null })
    },

    // ---------------------------------------------------------------- phone
    // Picking it up the first time also answers whatever is ringing
    pickUpPhone: () => {
      set((s) => ({ hasPhone: true, incidents: quickAnswer(s, acknowledgeRinging(s, 'answer')), ...quickAnswerToast(s) }))
      sfx.pickup()
    },
    // The screen is always visible once you have the phone. Q answers (hear the
    // caller's hint), X declines (silence it now, it escalates faster).
    answerPhone: (how = 'answer') => {
      const s = get()
      if (!s.hasPhone || !isRinging(s) || isBlocked({ ...s, overlay: null })) return
      sfx.click()
      const answered = acknowledgeRinging(s, how)
      set({ incidents: how === 'answer' ? quickAnswer(s, answered) : answered, ...(how === 'answer' ? quickAnswerToast(s) : {}) })
    },

    // Greg's calls: Q answers, X declines, 1-3 reply
    answerCall: () => {
      const s = get()
      if (s.call?.status !== 'ringing') return
      sfx.click()
      const first = s.call.script.steps[0].line
      set({
        call: { ...s.call, status: 'active', phase: 'line', answeredAt: s.elapsed, deadline: s.elapsed + easeOf(s).callChoice, transcript: [{ who: s.call.from, text: first }] },
        missedCalls: 0,
        stats: { ...s.stats, callsAnswered: s.stats.callsAnswered + 1 },
      })
    },
    declineCall: () => {
      const s = get()
      if (s.call?.status !== 'ringing') return
      const next = { ...s, stats: { ...s.stats } }
      missCall(next)
      set(next)
    },
    chooseCallOption: (index) => {
      const s = get()
      const c = s.call
      if (c?.status !== 'active' || c.phase !== 'line' || !c.script.steps[c.step].choices[index]) return
      const next = { ...s, stats: { ...s.stats } }
      chooseInCall(next, index)
      set(next)
    },

    // Flashlight: pick it up once, F toggles it
    pickUpFlashlight: () => {
      sfx.pickup()
      set((s) => ({ hasFlashlight: true, flashlightOn: !s.home.power, toasts: toast(s, MSG.toasts.flashlight, 'good') }))
    },
    toggleFlashlight: () => {
      const s = get()
      if (!s.hasFlashlight || isAsleep(s) || s.phase === PHASE.MENU || s.phase === PHASE.NIGHT_COMPLETE) return
      sfx.toggle()
      set({ flashlightOn: !s.flashlightOn })
    },

    // ---------------------------------------------------------------- computer / IncidentManager
    useComputer: (terminal = 'pc') => {
      const s = get()
      const down = computerDown({ ...s, terminal })
      if (down === 'power') return get().toast(MSG.toasts.noPower, 'bad')
      set({ terminal })
      get().openOverlay('computer')
      const sel = s.selectedIncident ?? s.incidents[0]?.uid
      if (sel) get().selectIncident(sel)
    },
    selectIncident: (incUid) => {
      const s = get()
      const inc = s.incidents.find((i) => i.uid === incUid)
      if (!inc) return
      set({ selectedIncident: incUid })
      updateIncident(incUid, (i) => ({ ...i, acknowledged: true }))
    },
    inspect: (incUid, node) => {
      if (computerDown(get())) return
      sfx.click()
      updateIncident(incUid, (i) => ({
        ...i,
        node,
        inspected: i.inspected.includes(node) ? i.inspected : [...i.inspected, node],
      }))
    },
    // ---------------------------------------------------------------- the Big Red Lever
    // RESTART EVERYTHING, from the server rack. Spends a 🧨 charge, kills the lights
    // for a moment, then: every open incident fixed (except the Director's), or
    // every one of them a lot closer to OUTAGE.
    pullLever: () => {
      const s = get()
      if (s.reboot) return
      if (s.charges <= 0) return get().toast(MSG.toasts.noCharges, 'bad')
      if (!s.incidents.length) return get().toast(MSG.toasts.nothingBroken)
      sfx.staticBurst()
      set({
        overlay: null,
        microgame: null,
        charges: s.charges - 1,
        reboot: { until: s.elapsed + REBOOT_SECONDS, success: Math.random() < LEVER_SUCCESS },
        stats: { ...s.stats, leverPulls: s.stats.leverPulls + 1 },
        toasts: toast(s, MSG.toasts.restarting, 'bad', REBOOT_SECONDS),
      })
    },
    finishReboot: () => {
      const s = get()
      if (!s.reboot) return
      const { success } = s.reboot
      set({ reboot: null, flickerOff: false })
      const open = get().incidents
      if (success) {
        const fixable = open.filter((i) => !i.def.noRestart)
        for (const inc of fixable) get().resolveIncident(inc.uid, { lucky: true })
        const after = get()
        set({
          banners: [...after.banners, { id: ++uid, text: MSG.banners.leverWorked.text, sub: fill(MSG.banners.leverWorked.sub, { n: fixable.length }), kind: 'clutch', until: after.elapsed + 2.4 }],
          stats: { ...after.stats, risky: after.stats.risky + 1 },
          ...(fixable.length < open.length ? { toasts: toast(after, MSG.leverDirector, 'bad', 4) } : {}),
        })
        return
      }
      sfx.error()
      const next = { ...get(), toasts: get().toasts }
      breakStreak(next, MSG.streakReasons.leverFailed)
      set({
        streak: 0,
        incidents: open.map((i) => ({
          ...i,
          wrong: i.wrong + 1,
          meter: Math.min(99.9, i.meter + LEVER_FAIL_METER),
          log: [...i.log, MSG.logs.leverFailed],
        })),
        stress: clamp(next.stress + 15),
        banners: [...next.banners, { id: ++uid, ...MSG.banners.leverFailed, kind: 'clutch', until: next.elapsed + 2.4 }],
        toasts: toast(next, MSG.toasts.restartFailed, 'bad', 3.5),
        stats: { ...next.stats, wrongActions: next.stats.wrongActions + 1 },
      })
    },

    // Close an incident as fixed: payout, banners, streak, stats. `execution` is the
    // microgame quality (null when the Big Red Lever fixed it: `lucky`).
    resolveIncident: (incUid, { lucky = false, execution = null } = {}) => {
      const s = get()
      const inc = s.incidents.find((i) => i.uid === incUid)
      if (!inc) return
      const { def } = inc
      // Lever fixes don't build your streak (or earn back the charge they spent)
      const streak = lucky ? s.streak : s.streak + 1
      const payout = resolvePayout(def, inc, {
        streak, lever: lucky, double: hasDouble(s), modMult: modMultiplier(s.mods), execution,
      })
      const incidents = s.incidents.filter((i) => i.uid !== incUid)

      const banners = [...s.banners]
      const tier = lucky ? null : STREAK_TIERS.find((t) => t.at === streak)
      const earned = !lucky && s.leverGiven && streak === CHARGE_STREAK && s.charges < MAX_CHARGES
      if (def.id === DIRECTOR_ID) set({ directorFreeAt: s.elapsed + DIRECTOR_COOLDOWN })
      if (def.id === DIRECTOR_ID) banners.push({ id: ++uid, text: MSG.banners.directorLeft, sub: nightRng.pick(DIRECTOR_LEAVES), kind: 'clutch', until: s.elapsed + 2.6 })
      if (tier) banners.push({ id: ++uid, text: tier.name, sub: fill(MSG.banners.streakTier, { streak }) + (earned ? MSG.banners.chargeEarned : ''), kind: 'tier', until: s.elapsed + 2.2 })
      if (payout.clutch) banners.push({ id: ++uid, ...MSG.banners.clutch, kind: 'clutch', until: s.elapsed + 1.6 })

      sfx.success(streak)
      set({
        incidents,
        selectedIncident: incidents[0]?.uid ?? null,
        score: s.score + payout.total,
        streak,
        banners,
        streakLeft: lucky ? s.streakLeft : STREAK_SECONDS,
        charges: earned ? s.charges + 1 : s.charges,
        pops: popScore(s, payout.total, fill(MSG.pops.rank, { grade: payout.grade })),
        slowmoUntil: payout.clutch ? performance.now() + 1500 : s.slowmoUntil,
        lastResolve: { ...payout, title: def.title, id: ++uid, until: s.elapsed + 4 },
        stress: clamp(s.stress - 15),
        stats: {
          ...s.stats,
          resolved: s.stats.resolved + 1,
          grades: [...s.stats.grades, payout.grade],
          bestStreak: Math.max(s.stats.bestStreak, streak),
          responseTimes: [...s.stats.responseTimes, s.elapsed - inc.spawnedAt],
        },
      })
      // First quiet moment of a story night: Dave mentions the bed
      if (!incidents.length && !s.wave) {
        const next = { ...get() }
        tip(next, 'nap')
        set({ tips: next.tips, toasts: next.toasts })
      }
    },

    // A microgame ended. Success on a terminal either resolves the incident or, for
    // hardware incidents, sends you to the rack; success at the rack resolves it.
    // Failure fumbles it like a wrong fix (you can try again).
    finishMicrogame: ({ success, mistakes, used }) => {
      const s = get()
      const game = s.microgame
      if (!game) return
      const inc = s.incidents.find((i) => i.uid === game.incUid)
      set({ microgame: null })
      if (!inc) return
      if (!success) {
        sfx.error()
        set({
          score: s.score - 100,
          pops: popScore(s, -100, MSG.pops.fumbled),
          stress: clamp(s.stress + 8),
          stats: { ...s.stats, wrongActions: s.stats.wrongActions + 1 },
        })
        updateIncident(inc.uid, (i) => ({
          ...i,
          wrong: i.wrong + 1,
          meter: Math.min(99.9, i.meter + i.rate * WRONG_ACTION_COST),
          log: [...i.log, game.where === 'rack' ? MSG.logs.rackFumble : MSG.logs.terminalFumble],
        }))
        return
      }
      const quality = executionQuality({ mistakes, used, limit: game.limit })
      if (game.where === 'terminal' && inc.rackTask) {
        sfx.click()
        updateIncident(inc.uid, (i) => ({
          ...i,
          awaitingRack: true,
          softwareExecution: quality,
          log: [...i.log, fill(MSG.logs.softwareDone, { task: i.rackTask })],
        }))
        const next = { ...get() }
        tip(next, 'rack')
        next.toasts = toast(next, fill(MSG.toasts.rackTask, { task: inc.rackTask }), 'info', 4)
        set({ tips: next.tips, toasts: next.toasts })
        return
      }
      const execution = game.where === 'rack' ? ((inc.softwareExecution ?? quality) + quality) / 2 : quality
      if (game.where === 'rack') set({ overlay: null }) // done at the rack: back to the room
      get().resolveIncident(inc.uid, { execution })
    },

    // The server rack: do the hardware step for the most urgent incident waiting on it
    useRack: () => {
      const s = get()
      const waiting = s.incidents.filter((i) => i.awaitingRack).sort((a, b) => b.meter - a.meter)
      if (!waiting.length) return get().toast(MSG.toasts.rackIdle)
      get().openOverlay('rack')
      set({ microgame: startMicrogame(s, waiting[0], RACK_GAME, 'rack') })
    },

    runAction: (incUid, actionId) => {
      const s = get()
      const inc = s.incidents.find((i) => i.uid === incUid)
      if (!inc || computerDown(s)) return
      if (inc.awaitingRack) return get().toast(fill(MSG.toasts.awaitingRack, { task: inc.rackTask }))
      const { def } = inc
      const action = def.actions.find((a) => a.id === actionId)

      // The right fix: now actually do it (microgame)
      if (action.correct) {
        if (s.microgame) return
        sfx.click()
        set({ microgame: startMicrogame(s, inc, terminalGameFor(def), 'terminal') })
        updateIncident(incUid, (i) => ({ ...i, log: [...i.log, `> ${action.label}`] }))
        return
      }

      // Wrong fixes cost time and score, but don't break the streak
      const penalty = action.penalty ?? 1
      sfx.error()
      set({
        score: s.score - 100 * penalty,
        pops: popScore(s, -100 * penalty, MSG.pops.wrongFix),
        stress: clamp(s.stress + 8 * penalty),
        stats: { ...s.stats, wrongActions: s.stats.wrongActions + 1 },
      })
      updateIncident(incUid, (i) => ({
        ...i,
        wrong: i.wrong + 1,
        meter: Math.min(99.9, i.meter + i.rate * WRONG_ACTION_COST * penalty),
        log: [...i.log, `> ${action.label}`, action.feedback],
      }))
    },

    // ---------------------------------------------------------------- apartment
    resetRouter: () => {
      const s = get()
      if (s.home.wifi) return get().toast(MSG.toasts.routerFine)
      sfx.success()
      set({ home: { ...s.home, wifi: true }, toasts: toast(s, MSG.toasts.wifiRestored, 'good') })
    },
    flipBreaker: () => {
      const s = get()
      if (s.home.power) return get().toast(MSG.toasts.breakerFine)
      sfx.success()
      set({ home: { ...s.home, power: true }, toasts: toast(s, MSG.toasts.powerRestored, 'good') })
    },
    // Golden banana: double points for a while
    collectPickup: (pickupUid) => {
      const s = get()
      if (!s.pickups.some((x) => x.uid === pickupUid)) return
      sfx.success()
      set({
        doubleUntil: s.elapsed + BANANA_SECONDS,
        pickups: s.pickups.filter((x) => x.uid !== pickupUid),
        toasts: toast(s, fill(MSG.toasts.banana, { seconds: BANANA_SECONDS }), 'good', 3.5),
        stats: { ...s.stats, pickups: s.stats.pickups + 1 },
      })
    },
    requestSleep: () => {
      const s = get()
      if (s.wave?.status === 'active') return get().toast(MSG.toasts.noNapsInWave, 'bad')
      if (s.incidents.length) {
        const worst = Math.min(...s.incidents.map((i) => i.severity))
        return get().toast(fill(MSG.toasts.cantSleep, { sev: worst }), 'bad')
      }
      get().openOverlay('sleepPrompt')
    },
    goToSleep: () =>
      set((s) => ({
        // Endless: a nap is a bonus stage; the break waits for it (up to NAP_SECONDS)
        wave: s.wave ? { ...s.wave, breakUntil: Math.max(s.wave.breakUntil, s.elapsed + NAP_SECONDS) } : s.wave,
        overlay: null,
        phase: PHASE.SLEEPING,
        sleptAt: s.elapsed,
        dreamPending: true,
        dreamRinging: null,
        call: null,
        flickerOff: false,
        flashlightOn: false,
      })),

    // Hold the whole night (clock, escalation, pager, Greg) while an explanation is read
    setPaused: (paused) => {
      if (get().paused !== paused) set({ paused })
    },

    // ---------------------------------------------------------------- Dream Sprint
    // A dream task was answered: nail it and the bank grows (and so does the
    // multiplier); fumble it and the multiplier drops. Triaging the leaked
    // incident right means it starts pre-diagnosed when it wakes you.
    dreamTask: (success, { leakKey = null } = {}) => {
      const s = get()
      if (!s.dream) return
      const d = s.dream
      if (success) sfx.dreamOk()
      else sfx.error()
      set({
        dream: success
          ? { ...d, bank: d.bank + Math.round(TASK_POINTS * d.mult), mult: Math.min(MULT_MAX, d.mult + MULT_STEP), cleared: d.cleared + 1 }
          : { ...d, mult: Math.max(1, d.mult - MULT_DROP), fumbles: d.fumbles + 1 },
        stress: success ? clamp(s.stress - TASK_STRESS) : s.stress,
        ...(success && leakKey ? { dreamIntel: leakKey } : {}),
      })
    },
    // W: wake up on your own and keep the bank. While the pager is ringing in the
    // dream, that's cashing out: bank × hazard pay.
    wakeUp: () => {
      const s = get()
      if (!isAsleep(s)) return
      const d = s.dream
      const ring = s.dreamRinging
      const hazard = ring ? hazardAt(s.elapsed - ring.since) : 1
      const kept = d ? gain(s, d.bank * hazard) : 0
      if (ring) sfx.success(Math.min(12, 1 + ring.beats))
      else sfx.click()
      set({
        phase: s.incidents.length ? PHASE.INCIDENT : PHASE.APARTMENT,
        dream: null,
        dreamPending: false,
        dreamRinging: null,
        dreamLeak: null,
        wakeAt: s.elapsed,
        score: s.score + kept,
        pops: kept > 0 ? popScore(s, kept, ring ? fill(MSG.pops.cashedOut, { hazard: hazard.toFixed(2) }) : MSG.pops.napBanked) : s.pops,
        dreamResult: d ? { kind: ring ? 'cashed' : 'woke', kept, bank: d.bank, hazard, until: s.elapsed + 3.5 } : null,
        // Endless: back to work, the next wave comes soon
        wave: s.wave && s.wave.status === 'break' ? { ...s.wave, breakUntil: Math.min(s.wave.breakUntil, s.elapsed + 3) } : s.wave,
        stats: {
          ...s.stats,
          naps: s.stats.naps + (d ? 1 : 0),
          cashOuts: s.stats.cashOuts + (ring ? 1 : 0),
          bestHazard: Math.max(s.stats.bestHazard, hazard),
          napPoints: s.stats.napPoints + kept,
        },
      })
    },
  }
})
