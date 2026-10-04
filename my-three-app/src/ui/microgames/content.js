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

// Shown above each game. Everything runs on AWS (CodeMonkey Corp is a very
// good customer).
export const BRIEFS = {
  whack: { title: 'STOP THE INSTANCE', how: 'Click the EC2 instance pinning the CPU. The console keeps re-sorting.' },
  purge: { title: 'EMPTY THE BUCKET', how: "Delete the bucket's huge objects before the bill alarm. NOT terraform.tfstate." },
  type: { title: 'TYPE IT', how: 'Type the AWS CLI command exactly. No pressure.' },
  timing: { title: 'DRAIN THE SQS QUEUE', how: 'Press SPACE (or click) when the marker is in the green.' },
  order: { title: 'RESTART IN ORDER', how: 'Bring the AWS services back in dependency order. They shuffle.' },
  cables: { title: 'RE-CABLE DIRECT CONNECT', how: 'Plug each cable into the port that SAYS its color.' },
}

// whack: the EC2 console, sorted by CPU (until it isn't)
export const INSTANCES = [
  'api-prod-1', 'api-prod-2', 'worker-spot-7', 'bastion-host', 'nat-instance', 'legacy-monolith',
  'jenkins (do not touch)', 'kevin-test-DO-NOT-DELETE', 'crypto-miner-totally-legit', 'image-resizer',
  'dev-sandbox-2019', 'p4d.24xlarge (why)', 'log-shipper',
]
export const instanceId = () => `i-0${Math.random().toString(16).slice(2, 9)}`

// purge: S3 objects and CloudWatch log groups; delete the huge ones, never the small vital ones
export const HUGE_FILES = [
  ['/aws/lambda/recursive-fn', '412 GB'], ['s3://kevin-movies/', '400 GB'], ['cloudtrail-copy-copy-FINAL/', '180 GB'],
  ['ami-snapshot-unused-2021', '120 GB'], ['/aws/ecs/debug-logs', '88 GB'], ['heapdump.hprof', '64 GB'], ['glacier-restore-oops/', '57 GB'],
]
export const SMALL_FILES = [
  ['terraform.tfstate', '2 MB'], ['prod-db-backup-latest', '2 GB'], ['.env', '1 KB'], ['payroll.csv', '11 MB'],
  ['index.html (the website)', '8 KB'], ['iam-policy.json', '3 KB'],
]

// type: AWS CLI rollbacks and restarts; the first one in each list is the short
// one used early in the night
const version = () => 30 + Math.floor(Math.random() * 60)
export const COMMANDS = {
  checkout: () => [
    'aws deploy stop-deployment',
    `aws lambda update-alias --name live --function-version ${version()}`,
    'aws ecs update-service --service checkout --force-new-deployment',
  ],
  director: () => ['sudo chronyc makestep', 'sudo systemctl restart chronyd', 'sudo chronyc makestep && git blame kevin'],
  generic: () => [
    'aws ec2 reboot-instances',
    'aws lambda put-function-concurrency --reserved 0',
    'aws autoscaling set-desired-capacity --desired-capacity 0 && pray',
  ],
}

// order: dependency chain, DNS first
export const SERVICE_CHAIN = ['ROUTE 53', 'RDS', 'ELASTICACHE', 'COGNITO', 'API GATEWAY', 'LAMBDA']

// cables: the plug colors (ink) and the words on the ports
export const CABLE_COLORS = [
  ['RED', '#ff5d64'], ['BLUE', '#539fe5'], ['GREEN', '#5fd06a'], ['YELLOW', '#f2cd54'], ['ORANGE', '#f89256'],
]
