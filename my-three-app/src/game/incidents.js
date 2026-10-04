// Hand-written incidents. Most incidents are procedural (incidentGen.js); these
// two are story beats: the status page that dies with everything else, and the
// Director boss. Same shape as generated defs (nodes, actions, hint).

export const FIXED_INCIDENTS = {
  // Fallout: spawned when another incident hits OUTAGE (see FALLOUT_INCIDENT)
  'status-page': {
    severity: 3,
    service: 'STATUS',
    title: 'STATUS PAGE DOWN',
    summary: "Hosted on the thing that's down",
    timeLimit: 50,
    reward: 250,
    metrics: {},
    services: {},
    hint: { text: 'Your status page says everything is fine?', row: 'Hosted on' },
    nodes: {
      overview: {
        title: 'status.bananaplantation.io',
        rows: [
          { label: 'HTTP', value: '503', status: 'bad' },
          { label: 'Last updated', value: '2019', status: 'warn' },
          { label: 'Hosted on', value: 'see below 🙃', status: 'bad', link: 'hosting' },
        ],
      },
      hosting: {
        title: 'STATUS PAGE · HOSTING',
        rows: [
          { label: 'primary', value: 'prod-1 (on fire)', status: 'bad' },
          { label: 'backup', value: "Dave's laptop (asleep)", status: 'warn' },
        ],
        log: ['Dave set this up before the CodeMonkey Corp offsite. Dave never came back from the offsite.'],
      },
    },
    actions: [
      { id: 'restart-status', label: 'RESTART STATUS PAGE', feedback: 'It restarted onto prod-1. prod-1 is on fire.' },
      { id: 'wake-dave', label: 'PAGE DAVE', feedback: "Dave's out-of-office: 'Gone bananas. Back never.'" },
      { id: 'static-banner', label: "POST STATIC 'WE'RE ON IT 🍌' BANNER", correct: true },
    ],
  },

  // The boss: the Director can't log in to the WBR deck. Everything is green,
  // except his session, which expires the moment it's issued (his laptop's clock
  // is in 2014). While it's open he "just listens" and everything escalates faster.
  director: {
    severity: 1,
    service: 'EXEC',
    title: "DIRECTOR CAN'T LOG IN",
    summary: 'The WBR deck will not open. He has 25 years of tenure.',
    timeLimit: 70,
    reward: 2500,
    metrics: { cpu: 12, memory: 32 },
    services: {},
    noRestart: true, // the Big Red Lever won't fix it: "The Director does not restart."
    hint: { text: 'It logs me in and out at the same time. My laptop says it is 2014. Is that bad?', row: 'Session length' },
    nodes: {
      overview: {
        title: 'INCIDENT · SYMPTOMS',
        rows: [
          { label: 'CPU', value: '12%', status: 'ok' },
          { label: 'Network', value: 'ONLINE', status: 'ok' },
          { label: 'Errors', value: '0', status: 'ok' },
          { label: 'Session length', value: '0.0s', status: 'bad', link: 'logs' },
        ],
      },
      logs: {
        title: 'AUTH · RECENT LOGS (user: the-director)',
        rows: [
          { label: 'session issued', value: 'valid from 2026', status: 'ok' },
          { label: 'client clock', value: '2014-03-17', status: 'warn' },
          { label: 'session expired', value: '12 years ago', status: 'warn' },
          { label: 'retrying', value: 'x 4,112', status: 'bad', link: 'clock' },
        ],
      },
      clock: {
        title: "DIRECTOR'S LAPTOP · SYSTEM",
        rows: [
          { label: 'system time', value: '2014-03-17 03:17', status: 'bad' },
          { label: 'ntp', value: 'DISABLED', status: 'bad' },
          { label: 'disabled by', value: 'kevin (2019)', status: 'warn' },
        ],
        log: ['# TODO(kevin): turn ntp back on after the demo'],
      },
    },
    actions: [
      { id: 'restart-auth', label: 'RESTART AUTH', feedback: 'Auth restarted. The Director is still logged out. He is typing in all caps.' },
      { id: 'rollback', label: 'ROLLBACK', feedback: 'Rolled back. "To what?" asks the Director. Nobody knows.' },
      { id: 'failover', label: 'FAILOVER', feedback: 'Failed over. The replica also refuses a laptop from 2014.' },
      { id: 'resync-clock', label: "RESYNC HIS CLOCK", requires: 'clock', correct: true },
    ],
  },
}

// An OUTAGE spawns this once, unless it's already open
export const FALLOUT_INCIDENT = 'status-page'
