// Procedural incidents. Each archetype picks a hidden root cause and builds the
// dashboard around it: the real culprit, red herrings that also look bad but have
// innocent explanations, and a fix button for EVERY plausible cause. All actions
// are visible from the start, so the player has to diagnose, not memorize.
//
// Output shape (an incident "def"): { id, severity, service, title, summary,
// timeLimit, reward, metrics, services, nodes, actions, hint }
//   hint: { text, row } - what a caller tells you if you answer the phone, and
//   which overview/drill row it points at.

import { FIXED_INCIDENTS } from './incidents'

const row = (label, value, status = 'ok', link) => ({ label, value, status, link })
const pct = (n) => `${Math.round(n)}%`


// Wrong fixes say something specific when we have it, otherwise one of these
const SHRUGS = ['Done. Nothing changed.', 'That was not it.', 'Completed successfully. Still broken.', 'Greg saw you try that.']

function fixes(causes, correctId, rng, extraWrong = []) {
  const causeActions = causes.map((c) => ({
    id: c.fix,
    label: c.fixLabel,
    correct: c.id === correctId,
    feedback: c.id === correctId ? undefined : c.wrong ?? rng.pick(SHRUGS),
  }))
  return rng.shuffle([...causeActions, ...extraWrong])
}

// ------------------------------------------------------------------ API CPU spike
function cpuSpike(rng) {
  const hosts = ['API-01', 'API-02', 'API-03', 'API-04']
  const hot = rng.int(hosts.length)
  const herring = rng.chance(0.7) ? (hot + 1 + rng.int(hosts.length - 1)) % hosts.length : -1
  const causes = [
    { id: 'image-worker', proc: 'image-worker', fix: 'restart-image-worker', fixLabel: 'RESTART IMAGE WORKER', log: 'image-worker: resizing avatar_final_FINAL(3).png (48000x48000)', wrong: 'Image worker restarted. It was resizing nothing.' },
    { id: 'log-shipper', proc: 'log-shipper', fix: 'restart-log-shipper', fixLabel: 'RESTART LOG SHIPPER', log: 'log-shipper: retrying batch 1 of 1 (attempt 88,412)', wrong: 'Log shipper restarted. Logs shipped. CPU unbothered.' },
    { id: 'miner', proc: 'kevin-totally-not-a-miner', fix: 'kill-rogue-process', fixLabel: 'KILL ROGUE PROCESS', log: 'kevin-totally-not-a-miner: hashrate 4.2 MH/s 💰', wrong: 'No rogue processes found. Kevin is relieved.' },
    { id: 'gc', proc: 'api (GC thrash)', fix: 'raise-heap', fixLabel: 'RAISE HEAP LIMIT', log: 'api: GC overhead limit exceeded (heap: 512MB, set in 2014)', wrong: 'Heap raised. The API was not the problem.' },
  ]
  const cause = rng.pick(causes)
  const nodes = {
    overview: {
      title: 'API HOSTS · CPU',
      rows: hosts.map((h, i) => {
        if (i === hot) return row(h, pct(94 + rng.int(6)), 'bad', 'hot')
        if (i === herring) return row(h, pct(66 + rng.int(12)), 'warn', 'herring')
        return row(h, pct(12 + rng.int(18)))
      }),
    },
    hot: {
      title: `${hosts[hot]} · TOP PROCESSES`,
      rows: rng.shuffle([
        row(cause.proc, pct(78 + rng.int(12)), 'bad'),
        ...(cause.id === 'gc' ? [] : [row('api', pct(6 + rng.int(6)))]),
        row('nginx', pct(1 + rng.int(3))),
      ]),
      log: [cause.log],
    },
  }
  if (herring >= 0) {
    nodes.herring = {
      title: `${hosts[herring]} · TOP PROCESSES`,
      rows: [row('backup-agent', pct(55 + rng.int(15)), 'warn'), row('api', pct(9))],
      log: ['backup-agent: nightly backup, 01:00–05:00. Expected. Nothing to see here.'],
    }
  }
  return {
    id: 'cpu-spike',
    severity: 3,
    service: 'API',
    title: 'API DEGRADED',
    summary: `CPU: ${94 + rng.int(6)}% on one host`,
    timeLimit: 60,
    reward: 350,
    metrics: { cpu: 97 },
    services: { API: 'DEGRADED' },
    nodes,
    actions: fixes(causes, cause.id, rng, [{ id: 'scale-api', label: 'SCALE API +2', feedback: 'New hosts are healthy. The hot one is still hot.' }]),
    hint: { text: `Customers on the ${hosts[hot]} shard say everything is slow`, row: hosts[hot] },
  }
}

// ------------------------------------------------------------------ Checkout errors
function checkout(rng) {
  const causes = [
    { id: 'deploy', fix: 'rollback', fixLabel: 'ROLLBACK DEPLOY', wrong: 'Rolled back. Errors continue. The deploy was fine.' },
    { id: 'db-pool', fix: 'recycle-db-pool', fixLabel: 'RECYCLE DB CONNECTIONS', wrong: 'Pool recycled. Connections were fine.' },
    { id: 'cert', fix: 'renew-cert', fixLabel: 'RENEW TLS CERT', wrong: 'Cert renewed. It had 11 months left.' },
    { id: 'flag', fix: 'disable-flag', fixLabel: 'DISABLE FLAG new_checkout_v2', wrong: 'Flag disabled. Marketing is upset. Errors continue.' },
  ]
  const cause = rng.pick(causes)
  const version = `v2.${10 + rng.int(9)}.${rng.int(5)}`
  // Red herring: a recent deploy that isn't the culprit
  const recentDeploy = cause.id === 'deploy' || rng.chance(0.6)
  const errorLogs = {
    deploy: [`TypeError: cannot read properties of undefined (reading 'currency') ×${1000 + rng.int(900)}`, `first seen 41s after ${version} rolled out`],
    'db-pool': ['TimeoutError: could not acquire connection from pool (30s)', 'checkout waiting on database'],
    cert: ['TLS handshake failed: certificate has expired', 'payments.bananaplantation.io cert expired 00:00 UTC'],
    flag: ['NullPointerException in NewCheckoutV2.applyCoupon()', 'flag new_checkout_v2 enabled 4 min ago by marketing-bot'],
  }[cause.id]
  return {
    id: 'checkout',
    severity: 2,
    service: 'CHECKOUT',
    title: 'CHECKOUT DEGRADED',
    summary: `5xx errors: ${25 + rng.int(20)}%`,
    timeLimit: 45,
    reward: 750,
    metrics: { cpu: 46 },
    services: { CHECKOUT: 'ERROR' },
    nodes: {
      overview: {
        title: 'CHECKOUT · HEALTH',
        rows: rng.shuffle([
          row('Error rate', `${25 + rng.int(20)}% ↑`, 'bad', 'errors'),
          row('Database', cause.id === 'db-pool' ? '500/500 conns' : `${80 + rng.int(60)}/500 conns`, cause.id === 'db-pool' ? 'bad' : 'ok', 'db'),
          row('Last deploy', recentDeploy ? `${3 + rng.int(20)} min ago` : '3 days ago', recentDeploy ? 'warn' : 'ok', 'deploys'),
          row('Latency p99', `${(2 + rng.next() * 3).toFixed(1)}s`, 'warn'),
        ]),
      },
      errors: { title: 'CHECKOUT · TOP ERRORS', rows: [row('5xx / min', `${2000 + rng.int(3000)}`, 'bad')], log: errorLogs },
      db: {
        title: 'DATABASE · CONNECTIONS',
        rows: cause.id === 'db-pool'
          ? [row('checkout', '497', 'bad'), row('reports', '3')]
          : [row('checkout', `${60 + rng.int(40)}`), row('reports', `${2 + rng.int(9)}`)],
        log: cause.id === 'db-pool' ? ['connections opened 18,221 · closed 0'] : ['healthy'],
      },
      deploys: {
        title: 'CHECKOUT · DEPLOYS',
        rows: [row(`${version}  ci-bot`, recentDeploy ? 'recent' : '3 days ago', cause.id === 'deploy' ? 'bad' : 'ok')],
        log: [cause.id === 'deploy' ? 'changes: refactor currency handling' : 'changes: docs and comments only'],
      },
    },
    actions: fixes(causes, cause.id, rng, [{ id: 'scale-checkout', label: 'SCALE CHECKOUT', feedback: 'More pods, same errors.' }]),
    hint: {
      text: { deploy: 'It broke right after the last release', 'db-pool': 'Pages hang forever, then fail', cert: 'My browser says the site is not secure', flag: 'Only fails when I use a coupon' }[cause.id],
      row: { deploy: 'Last deploy', 'db-pool': 'Database', cert: 'Error rate', flag: 'Error rate' }[cause.id],
    },
  }
}

// ------------------------------------------------------------------ Queue backlog
function queue(rng) {
  const causes = [
    { id: 'workers', fix: 'restart-workers', fixLabel: 'RESTART WORKERS', wrong: 'Workers restarted. They were never the problem.' },
    { id: 'poison', fix: 'dead-letter', fixLabel: 'DEAD-LETTER BAD MESSAGE', wrong: 'Nothing in the queue is malformed.' },
    { id: 'broker-disk', fix: 'expand-broker-disk', fixLabel: 'EXPAND BROKER DISK', wrong: 'Disk expanded. It had plenty.' },
  ]
  const cause = rng.pick(causes)
  const depth = 12000 + rng.int(20000)
  return {
    id: 'queue',
    severity: 2,
    service: 'WORKERS',
    title: 'ORDERS DELAYED',
    summary: `Queue depth: ${depth.toLocaleString('en-US')} ↑`,
    timeLimit: 50,
    reward: 700,
    metrics: { queue: depth },
    services: { WORKERS: cause.id === 'workers' ? 'DOWN' : 'DEGRADED' },
    nodes: {
      overview: {
        title: 'ORDER PIPELINE',
        rows: rng.shuffle([
          row('Queue depth', `${depth.toLocaleString('en-US')} ↑`, 'bad'),
          row('Consumers', cause.id === 'workers' ? '0 / 8' : '8 / 8', cause.id === 'workers' ? 'bad' : 'warn', 'workers'),
          row('Broker', cause.id === 'broker-disk' ? 'disk 100%' : 'disk 41%', cause.id === 'broker-disk' ? 'bad' : 'ok', 'broker'),
          row('Ingest rate', `${400 + rng.int(400)}/min`),
        ]),
      },
      workers: {
        title: 'ORDER WORKERS',
        rows: cause.id === 'workers'
          ? [row('worker-1..8', 'IDLE', 'bad')]
          : cause.id === 'poison'
            ? [row('worker-1..8', 'CRASHLOOP', 'bad')]
            : [row('worker-1..8', 'WAITING', 'warn')],
        log: {
          workers: ['amqp: connection reset by peer. reconnect=false'],
          poison: [`crash on msg #${80000 + rng.int(9999)}: invalid fruit "banana; DROP TABLE"`],
          'broker-disk': ['blocked: broker refusing publishes (disk alarm)'],
        }[cause.id],
      },
      broker: {
        title: 'BROKER',
        rows: [row('disk', cause.id === 'broker-disk' ? '100%' : '41%', cause.id === 'broker-disk' ? 'bad' : 'ok'), row('memory', `${30 + rng.int(20)}%`)],
        log: [cause.id === 'broker-disk' ? 'disk alarm set · all publishers blocked' : 'healthy'],
      },
    },
    actions: fixes(causes, cause.id, rng, [
      { id: 'purge-queue', label: 'PURGE QUEUE', feedback: `${depth.toLocaleString('en-US')} orders deleted. Finance will notice.`, penalty: 2 },
    ]),
    hint: {
      text: { workers: 'Orders just sit there, nothing picks them up', poison: 'One weird order keeps failing over and over', 'broker-disk': 'Nothing new is being accepted at all' }[cause.id],
      row: { workers: 'Consumers', poison: 'Consumers', 'broker-disk': 'Broker' }[cause.id],
    },
  }
}

// ------------------------------------------------------------------ Disk filling up
function disk(rng) {
  const causes = [
    { id: 'debug-logs', fix: 'rotate-logs', fixLabel: 'ROTATE CHECKOUT LOGS', file: 'checkout.log', size: '41 GB', log: 'LOG_LEVEL=DEBUG (set 4 days ago by "temp-fix")', wrong: 'Logs rotated. They were 2 MB.' },
    { id: 'core-dumps', fix: 'delete-core-dumps', fixLabel: 'DELETE CORE DUMPS', file: 'core.*', size: '312 GB', log: 'api crashed 4,112 times tonight; each crash left a souvenir', wrong: 'No core dumps found.' },
    { id: 'kevin', fix: 'delete-kevin-movies', fixLabel: "DELETE KEVIN'S MOVIES", file: '/home/kevin/movies', size: '400 GB', log: '"it\'s for a demo" — kevin', wrong: 'Kevin has no movies. Allegedly.' },
  ]
  const cause = rng.pick(causes)
  const used = 95 + rng.int(5)
  return {
    id: 'disk',
    severity: 3,
    service: 'LOGGING',
    title: `LOGGING DISK ${used}%`,
    summary: `log-01 /var: ${used}% used`,
    timeLimit: 70,
    reward: 300,
    metrics: {},
    services: { LOGGING: 'DEGRADED' },
    nodes: {
      overview: {
        title: 'LOG-01 · DISK USAGE',
        rows: [row('/', `${20 + rng.int(20)}%`), row('/var', `${used}%`, 'bad', 'var'), row('/tmp', `${rng.chance(0.5) ? 70 + rng.int(10) : 4}%`, 'ok', 'tmp')],
      },
      var: {
        title: '/var · LARGEST',
        rows: rng.shuffle([row(cause.file, cause.size, 'bad'), row('auth.log', '220 MB'), row('syslog', '96 MB')]),
        log: [cause.log],
      },
      tmp: { title: '/tmp · LARGEST', rows: [row('build-cache', '3 GB')], log: ['cleared nightly, harmless'] },
    },
    actions: fixes(causes, cause.id, rng, [{ id: 'resize-volume', label: 'RESIZE VOLUME', feedback: 'Resize needs approval. Ticket OPS-4471 opened. ETA: Q3.' }]),
    hint: { text: 'Logs stopped showing up in the dashboard', row: '/var' },
  }
}

// ------------------------------------------------------------------ SEV-1 cascade
function cascade(rng) {
  const causes = [
    { id: 'retry-storm', fix: 'restart-workers', fixLabel: 'RESTART WORKERS', wrong: 'Workers restarted. The fire continues.' },
    { id: 'dns', fix: 'flush-dns', fixLabel: 'FLUSH DNS', wrong: 'DNS flushed. It was not DNS. (This time.)' },
    { id: 'failover', fix: 'promote-replica', fixLabel: 'PROMOTE REPLICA', wrong: 'Replica promoted. The old primary was fine. Now there are two.' },
  ]
  const cause = rng.pick(causes)
  const nodes = {
    overview: {
      title: 'INCIDENT · SYMPTOMS',
      rows: rng.shuffle([
        row('Checkout errors', `${50 + rng.int(30)}%`, 'bad', 'checkout'),
        row('DB connections', cause.id === 'retry-storm' ? '498 / 500' : `${100 + rng.int(150)} / 500`, cause.id === 'retry-storm' ? 'bad' : 'ok', 'database'),
        row('Queue depth', `${(40000 + rng.int(30000)).toLocaleString('en-US')} ↑`, 'bad', 'queue'),
        row('Auth latency', `${(5 + rng.next() * 6).toFixed(1)}s`, 'warn', 'auth'),
      ]),
    },
    checkout: {
      title: 'CHECKOUT · ERRORS',
      rows: [row('top error', { 'retry-storm': 'DB timeout', dns: 'cannot resolve', failover: 'read-only DB' }[cause.id], 'bad', { 'retry-storm': 'database', dns: 'dns', failover: 'database' }[cause.id])],
    },
    database: {
      title: 'DATABASE',
      rows: cause.id === 'failover'
        ? [row('primary', 'READ-ONLY', 'bad'), row('failover', 'stuck at 50%', 'bad')]
        : cause.id === 'retry-storm'
          ? [row('order-workers', '412 conns', 'bad', 'workers'), row('checkout', '61 conns')]
          : [row('primary', 'healthy'), row('connections', 'normal')],
      log: cause.id === 'failover' ? ['automatic failover began 03:12, never finished'] : [],
    },
    queue: {
      title: 'ORDER QUEUE',
      rows: [row('backlog', 'growing', 'warn')],
      log: ['backlog is downstream of checkout failures: a symptom, not the cause'],
    },
    auth: { title: 'AUTH', rows: [row('latency', 'elevated', 'warn')], log: ['slow because everything is slow'] },
    workers: {
      title: 'ORDER WORKERS',
      rows: [row('worker-1..8', 'RETRY STORM', 'bad')],
      log: ['each retry opens a DB connection and never closes it'],
    },
    dns: {
      title: 'DNS RESOLVER',
      rows: [row('orders.internal', 'NXDOMAIN', 'bad'), row('cache', 'poisoned (TTL 0)', 'bad')],
      log: ['it was DNS. it is always DNS.'],
    },
  }
  return {
    id: 'cascade',
    severity: 1,
    service: 'CHECKOUT',
    title: 'PRODUCTION CASCADE',
    summary: 'Multiple services failing',
    timeLimit: 60,
    reward: 1500,
    metrics: { cpu: 91, memory: 88, database: cause.id === 'failover' ? 'READ-ONLY' : 'SLOW', queue: 52113 },
    services: { API: 'DEGRADED', WORKERS: 'DEGRADED', CHECKOUT: 'ERROR', AUTH: 'DEGRADED' },
    nodes,
    actions: fixes(causes, cause.id, rng, [{ id: 'scale-db', label: 'SCALE DB', feedback: 'Bigger database, same fire.' }]),
    hint: {
      text: { 'retry-storm': 'Our order workers look really busy', dns: 'Some internal sites say "not found"', failover: 'We can read but cannot save anything' }[cause.id],
      row: { 'retry-storm': 'DB connections', dns: 'Checkout errors', failover: 'Checkout errors' }[cause.id],
    },
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
