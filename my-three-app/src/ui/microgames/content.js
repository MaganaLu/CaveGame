// Words and numbers for the fix microgames (games.jsx)

export const pick = (list) => list[Math.floor(Math.random() * list.length)]
export const shuffle = (list) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export const lerp = (a, b, t) => a + (b - a) * t

// Shown above each game
export const BRIEFS = {
  whack: { title: 'KILL IT', how: 'Click the process eating the CPU. It moves.' },
  purge: { title: 'FREE THE DISK', how: 'Delete every huge file before the disk fills. NOT prod.db.' },
  type: { title: 'TYPE IT', how: 'Type the command exactly. No pressure.' },
  timing: { title: 'DRAIN THE QUEUE', how: 'Press SPACE (or click) when the marker is in the green.' },
  order: { title: 'RESTART IN ORDER', how: 'Restart the services in dependency order. They shuffle.' },
  cables: { title: 'RE-CABLE IT', how: 'Plug each cable into the port that SAYS its color.' },
}

// whack: `top`
export const PROCESSES = [
  'nginx', 'postgres', 'api', 'cron', 'sshd', 'node', 'banana-agent', 'log-shipper', 'image-worker',
  'kevin-totally-not-a-miner', 'slack-helper', 'java (why)', 'chrome (147 tabs)',
]

// purge: huge files to delete, small ones you must not
export const HUGE_FILES = [
  ['core.4112', '312 GB'], ['/home/kevin/movies', '400 GB'], ['checkout.log', '41 GB'], ['tmp_backup_FINAL.tar', '120 GB'],
  ['heapdump.hprof', '64 GB'], ['node_modules (copy 3)', '88 GB'], ['debug.log.1', '57 GB'],
]
export const SMALL_FILES = [
  ['prod.db', '2 GB'], ['nginx.conf', '4 KB'], ['.env', '1 KB'], ['payroll.csv', '11 MB'], ['id_rsa', '3 KB'], ['README.md', '2 KB'],
]

// type: rollback / restart commands, longer as the night goes on
const hash = () => Math.random().toString(16).slice(2, 8)
export const COMMANDS = {
  checkout: () => [`git revert ${hash()}`, 'kubectl rollout undo deploy/checkout', `git revert --no-edit ${hash()} && git push`],
  director: () => ['sudo ntpdate pool.ntp.org', 'sudo systemctl enable --now ntpd', 'git blame kevin && sudo ntpdate -u time.banana.corp'],
  generic: () => ['sudo systemctl restart banana', 'kubectl delete pod status-0', 'sudo reboot --i-mean-it', 'kubectl scale deploy/api --replicas=0 && pray'],
}

// order: dependency chain, shortest first
export const SERVICE_CHAIN = ['DNS', 'DATABASE', 'CACHE', 'AUTH', 'API', 'WORKERS']

// cables: the plug colors (ink) and the words on the ports
export const CABLE_COLORS = [
  ['RED', '#ff5d64'], ['BLUE', '#539fe5'], ['GREEN', '#5fd06a'], ['YELLOW', '#f2cd54'], ['ORANGE', '#f89256'],
]
