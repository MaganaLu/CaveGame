// Words and numbers for the fix microgames (games.jsx). The words are in
// content/microgames.json.
import MG from '../../content/microgames.json'
import { fill } from '../../game/text'

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
export const BRIEFS = MG.briefs

// whack: the EC2 console, sorted by CPU (until it isn't)
export const INSTANCES = MG.instances
export const instanceId = () => `i-0${Math.random().toString(16).slice(2, 9)}`

// purge: S3 objects and CloudWatch log groups; delete the huge ones, never the small vital ones
export const HUGE_FILES = MG.hugeFiles
export const SMALL_FILES = MG.smallFiles
export const purgeOops = (name) => MG.purgeOops[name] ?? fill(MG.purgeOops.default, { name })

// type: AWS CLI rollbacks and restarts; the first one in each list is the short
// one used early in the night. {hash} / {version} are filled in fresh each time.
const hash = () => Math.random().toString(16).slice(2, 8)
const version = () => 30 + Math.floor(Math.random() * 60)
export const COMMANDS = Object.fromEntries(
  Object.entries(MG.commands).map(([id, list]) => [id, () => list.map((cmd) => fill(cmd, { hash: hash(), version: version() }))])
)

// order: dependency chain, DNS first
export const SERVICE_CHAIN = MG.serviceChain

// cables: the plug colors (ink) and the words on the ports
export const CABLE_COLORS = MG.cableColors
