// Procedural incidents. Each archetype picks a hidden root cause and builds the
// dashboard around it: the real culprit, red herrings that also look bad but have
// innocent explanations, and a fix button for EVERY plausible cause. All actions
// are visible from the start, so the player has to diagnose, not memorize.
//
// The words (causes, fix labels, logs, hints, dashboard titles and rows) live in
// content/incidents.json; this file decides which ones show up and fills in the
// numbers. Keep the order of rng calls as it is: daily shifts depend on it.
//
// Output shape (an incident "def"): { id, severity, service, title, summary,
// timeLimit, reward, metrics, services, nodes, actions, hint }
//   hint: { text, row } - what a caller tells you if you answer the phone, and
//   which overview/drill row it points at.

import CONTENT from '../content/incidents.json'
import { FIXED_INCIDENTS } from './incidents'
import { fill } from './text'

const A = CONTENT.archetypes
const row = (label, value, status = 'ok', link) => ({ label, value, status, link })
const pct = (n) => `${Math.round(n)}%`
const thousands = (n) => n.toLocaleString('en-US')

// The fields every archetype copies straight from its content
const headline = (t, vars = {}) => ({
  severity: t.severity,
  service: t.service,
  title: fill(t.title, vars),
  timeLimit: t.timeLimit,
  reward: t.reward,
})

// Wrong fixes say something specific when we have it, otherwise a shrug
function fixes(causes, correctId, rng, extraWrong = []) {
  const causeActions = causes.map((c) => ({
    id: c.fix,
    label: c.fixLabel,
    correct: c.id === correctId,
    feedback: c.id === correctId ? undefined : c.wrong ?? rng.pick(CONTENT.shrugs),
  }))
  return rng.shuffle([...causeActions, ...extraWrong])
}

// ------------------------------------------------------------------ API CPU spike
function cpuSpike(rng) {
  const t = A['cpu-spike']
  const { hosts, causes } = t
  const hot = rng.int(hosts.length)
  const herring = rng.chance(0.7) ? (hot + 1 + rng.int(hosts.length - 1)) % hosts.length : -1
  const cause = rng.pick(causes)
  const nodes = {
    overview: {
      title: t.titles.overview,
      rows: hosts.map((h, i) => {
        if (i === hot) return row(h, pct(94 + rng.int(6)), 'bad', 'hot')
        if (i === herring) return row(h, pct(66 + rng.int(12)), 'warn', 'herring')
        return row(h, pct(12 + rng.int(18)))
      }),
    },
    hot: {
      title: fill(t.titles.processes, { host: hosts[hot] }),
      rows: rng.shuffle([
        row(cause.proc, pct(78 + rng.int(12)), 'bad'),
        ...(cause.id === 'gc' ? [] : [row(t.procs.api, pct(6 + rng.int(6)))]),
        row(t.procs.web, pct(1 + rng.int(3))),
      ]),
      log: [cause.log],
    },
  }
  if (herring >= 0) {
    nodes.herring = {
      title: fill(t.titles.processes, { host: hosts[herring] }),
      rows: [row(t.procs.backup, pct(55 + rng.int(15)), 'warn'), row(t.procs.api, pct(9))],
      log: [t.herringLog],
    }
  }
  return {
    id: 'cpu-spike',
    ...headline(t),
    summary: fill(t.summary, { cpu: 94 + rng.int(6) }),
    metrics: { cpu: 97 },
    services: { [t.service]: 'DEGRADED' },
    nodes,
    actions: fixes(causes, cause.id, rng, t.extraActions),
    hint: { text: fill(t.hint, { host: hosts[hot] }), row: hosts[hot] },
  }
}

// ------------------------------------------------------------------ Checkout errors
function checkout(rng) {
  const t = A.checkout
  const { causes, rows: R, values: V, titles } = t
  const cause = rng.pick(causes)
  const version = `v2.${10 + rng.int(9)}.${rng.int(5)}`
  // Red herring: a recent deploy that isn't the culprit
  const recentDeploy = cause.id === 'deploy' || rng.chance(0.6)
  const count = 1000 + rng.int(900) // always drawn, whatever the cause (keeps the rng order)
  const errorLogs = t.errorLogs[cause.id].map((line) => fill(line, { count, version }))
  const summary = fill(t.summary, { pct: 25 + rng.int(20) })
  return {
    id: 'checkout',
    ...headline(t),
    summary,
    metrics: { cpu: 46 },
    services: { [t.service]: 'ERROR' },
    nodes: {
      overview: {
        title: titles.overview,
        rows: rng.shuffle([
          row(R.errorRate, fill(V.errorRate, { pct: 25 + rng.int(20) }), 'bad', 'errors'),
          row(R.database, cause.id === 'db-pool' ? V.dbFull : fill(V.dbConns, { n: 80 + rng.int(60) }), cause.id === 'db-pool' ? 'bad' : 'ok', 'db'),
          row(R.lastDeploy, recentDeploy ? fill(V.minutesAgo, { n: 3 + rng.int(20) }) : V.daysAgo, recentDeploy ? 'warn' : 'ok', 'deploys'),
          row(R.latency, fill(V.latency, { s: (2 + rng.next() * 3).toFixed(1) }), 'warn'),
        ]),
      },
      errors: { title: titles.errors, rows: [row(R.errorsPerMin, `${2000 + rng.int(3000)}`, 'bad')], log: errorLogs },
      db: {
        title: titles.db,
        rows: cause.id === 'db-pool'
          ? [row(R.checkout, V.poolFull, 'bad'), row(R.reports, '3')]
          : [row(R.checkout, `${60 + rng.int(40)}`), row(R.reports, `${2 + rng.int(9)}`)],
        log: cause.id === 'db-pool' ? [t.logs.poolLeak] : [t.logs.healthy],
      },
      deploys: {
        title: titles.deploys,
        rows: [row(fill(R.deploy, { version }), recentDeploy ? V.recent : V.daysAgo, cause.id === 'deploy' ? 'bad' : 'ok')],
        log: [cause.id === 'deploy' ? t.logs.badDeploy : t.logs.harmlessDeploy],
      },
    },
    actions: fixes(causes, cause.id, rng, t.extraActions),
    hint: t.hints[cause.id],
  }
}

// ------------------------------------------------------------------ Queue backlog
function queue(rng) {
  const t = A.queue
  const { causes, rows: R, values: V, titles } = t
  const cause = rng.pick(causes)
  const depthN = 12000 + rng.int(20000)
  const depth = thousands(depthN)
  return {
    id: 'queue',
    ...headline(t),
    summary: fill(t.summary, { depth }),
    metrics: { queue: depthN },
    services: { [t.service]: cause.id === 'workers' ? 'DOWN' : 'DEGRADED' },
    nodes: {
      overview: {
        title: titles.overview,
        rows: rng.shuffle([
          row(R.depth, fill(V.depth, { depth }), 'bad'),
          row(R.consumers, cause.id === 'workers' ? V.consumersDown : V.consumersUp, cause.id === 'workers' ? 'bad' : 'warn', 'workers'),
          row(R.broker, cause.id === 'broker-disk' ? V.brokerFull : V.brokerOk, cause.id === 'broker-disk' ? 'bad' : 'ok', 'broker'),
          row(R.ingest, fill(V.ingest, { n: 400 + rng.int(400) })),
        ]),
      },
      workers: {
        title: titles.workers,
        rows: cause.id === 'workers'
          ? [row(R.workers, V.idle, 'bad')]
          : cause.id === 'poison'
            ? [row(R.workers, V.crashloop, 'bad')]
            : [row(R.workers, V.waiting, 'warn')],
        // The poison message number is always drawn, whatever the cause (rng order)
        log: ((msg) => t.workerLogs[cause.id].map((line) => fill(line, { msg })))(80000 + rng.int(9999)),
      },
      broker: {
        title: titles.broker,
        rows: [row(R.disk, cause.id === 'broker-disk' ? V.diskFull : V.diskOk, cause.id === 'broker-disk' ? 'bad' : 'ok'), row(R.memory, fill(V.memory, { n: 30 + rng.int(20) }))],
        log: [cause.id === 'broker-disk' ? t.logs.brokerFull : t.logs.healthy],
      },
    },
    actions: fixes(causes, cause.id, rng, t.extraActions.map((a) => ({ ...a, feedback: fill(a.feedback, { depth }) }))),
    hint: t.hints[cause.id],
  }
}

// ------------------------------------------------------------------ Disk filling up
function disk(rng) {
  const t = A.disk
  const { causes, rows: R, values: V, titles } = t
  const cause = rng.pick(causes)
  const used = 95 + rng.int(5)
  return {
    id: 'disk',
    ...headline(t, { used }),
    summary: fill(t.summary, { used }),
    metrics: {},
    services: { [t.service]: 'DEGRADED' },
    nodes: {
      overview: {
        title: titles.overview,
        rows: [
          row(R.root, fill(V.pct, { n: 20 + rng.int(20) })),
          row(R.var, fill(V.pct, { n: used }), 'bad', 'var'),
          row(R.tmp, fill(V.pct, { n: rng.chance(0.5) ? 70 + rng.int(10) : 4 }), 'ok', 'tmp'),
        ],
      },
      var: {
        title: titles.var,
        rows: rng.shuffle([row(cause.file, cause.size, 'bad'), row(R.auth, V.auth), row(R.syslog, V.syslog)]),
        log: [cause.log],
      },
      tmp: { title: titles.tmp, rows: [row(R.cache, V.cache)], log: [t.logs.tmp] },
    },
    actions: fixes(causes, cause.id, rng, t.extraActions),
    hint: t.hint,
  }
}

// ------------------------------------------------------------------ SEV-1 cascade
function cascade(rng) {
  const t = A.cascade
  const { causes, rows: R, values: V, titles, logs } = t
  const cause = rng.pick(causes)
  const nodes = {
    overview: {
      title: titles.overview,
      rows: rng.shuffle([
        row(R.checkoutErrors, fill(V.pct, { n: 50 + rng.int(30) }), 'bad', 'checkout'),
        row(R.dbConns, cause.id === 'retry-storm' ? V.dbFull : fill(V.dbConns, { n: 100 + rng.int(150) }), cause.id === 'retry-storm' ? 'bad' : 'ok', 'database'),
        row(R.depth, fill(V.depth, { depth: thousands(40000 + rng.int(30000)) }), 'bad', 'queue'),
        row(R.authLatency, fill(V.latency, { s: (5 + rng.next() * 6).toFixed(1) }), 'warn', 'auth'),
      ]),
    },
    checkout: {
      title: titles.checkout,
      rows: [row(R.topError, t.topErrors[cause.id], 'bad', { 'retry-storm': 'database', dns: 'dns', failover: 'database' }[cause.id])],
    },
    database: {
      title: titles.database,
      rows: cause.id === 'failover'
        ? [row(R.primary, V.readOnly, 'bad'), row(R.failover, V.stuck, 'bad')]
        : cause.id === 'retry-storm'
          ? [row(R.workersConns, V.workerConns, 'bad', 'workers'), row(R.checkout, V.checkoutConns)]
          : [row(R.primary, V.healthy), row(R.connections, V.normal)],
      log: cause.id === 'failover' ? [logs.failover] : [],
    },
    queue: { title: titles.queue, rows: [row(R.backlog, V.growing, 'warn')], log: [logs.queue] },
    auth: { title: titles.auth, rows: [row(R.latency, V.elevated, 'warn')], log: [logs.auth] },
    workers: { title: titles.workers, rows: [row(R.workers, V.retryStorm, 'bad')], log: [logs.workers] },
    dns: { title: titles.dns, rows: [row(R.orders, V.nxdomain, 'bad'), row(R.cache, V.poisoned, 'bad')], log: [logs.dns] },
  }
  return {
    id: 'cascade',
    ...headline(t),
    summary: t.summary,
    metrics: { cpu: 91, memory: 88, database: cause.id === 'failover' ? V.readOnly : V.dbSlow, queue: 52113 },
    services: { API: 'DEGRADED', WORKERS: 'DEGRADED', CHECKOUT: 'ERROR', AUTH: 'DEGRADED' },
    nodes,
    actions: fixes(causes, cause.id, rng, t.extraActions),
    hint: t.hints[cause.id],
  }
}

const GENERATORS = { 'cpu-spike': cpuSpike, checkout, queue, disk, cascade }

export const ARCHETYPES = Object.keys(GENERATORS)

// Fixed story incidents (status-page fallout, the Director boss) get shuffled
// action order, but keep their hand-written content.
export function generateIncident(id, rng) {
  if (GENERATORS[id]) return GENERATORS[id](rng)
  const fixed = FIXED_INCIDENTS[id]
  return { ...fixed, id, actions: rng.shuffle(fixed.actions) }
}
