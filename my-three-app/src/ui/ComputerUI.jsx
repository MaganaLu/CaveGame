import { useGameStore } from '../game/GameState'
import { formatClock } from '../game/GameClock'
import { meterBar, SEV_COLORS, STAGE_COLORS, byUrgency } from './format'
import EscalationBar from './EscalationBar'
import { STAGES, streakMultiplier } from '../game/scoring'
import Microgame from './microgames/Microgame'

const BASE_METRICS = { cpu: 18, memory: 41, database: 'OK', queue: 212 }
const BASE_SERVICES = ['API', 'WORKERS', 'CHECKOUT', 'AUTH', 'LOGGING']
const STATUS_RANK = { ONLINE: 0, DEGRADED: 1, ERROR: 2, DOWN: 3 }

// Global dashboard reflects the worst of every open incident
function aggregate(incidents) {
  const metrics = { ...BASE_METRICS }
  const services = Object.fromEntries(BASE_SERVICES.map((name) => [name, 'ONLINE']))
  for (const inc of incidents) {
    const { def } = inc
    const m = def.metrics
    if (m.cpu) metrics.cpu = Math.max(metrics.cpu, m.cpu)
    if (m.memory) metrics.memory = Math.max(metrics.memory, m.memory)
    if (m.queue) metrics.queue = Math.max(metrics.queue, m.queue)
    if (m.database) metrics.database = m.database
    for (const [name, status] of Object.entries(def.services)) {
      if (STATUS_RANK[status] > STATUS_RANK[services[name]]) services[name] = status
    }
  }
  return { metrics, services }
}

function statusClass(value) {
  if (['DOWN', 'ERROR', 'bad'].includes(value)) return 'crt-bad'
  if (['DEGRADED', 'SLOW', 'warn'].includes(value)) return 'crt-warn'
  return ''
}

function Metrics({ incidents }) {
  const { metrics, services } = aggregate(incidents)
  const pct = (v) => (v > 85 ? 'crt-bad' : v > 65 ? 'crt-warn' : '')
  return (
    <div className="crt-col">
      <div className="crt-heading">SYSTEM</div>
      <div className="crt-row"><span>CPU</span><span className={pct(metrics.cpu)}>{metrics.cpu}% {meterBar(metrics.cpu)}</span></div>
      <div className="crt-row"><span>MEMORY</span><span className={pct(metrics.memory)}>{metrics.memory}% {meterBar(metrics.memory)}</span></div>
      <div className="crt-row"><span>DATABASE</span><span className={statusClass(metrics.database)}>{metrics.database}</span></div>
      <div className="crt-row">
        <span>QUEUE</span>
        <span className={metrics.queue > 1000 ? 'crt-bad' : ''}>{metrics.queue.toLocaleString('en-US')}{metrics.queue > 1000 && ' ↑'}</span>
      </div>

      <div className="crt-heading">SERVICES</div>
      {Object.entries(services).map(([name, status]) => (
        <div key={name} className="crt-row"><span>{name}</span><span className={statusClass(status)}>{status}</span></div>
      ))}
    </div>
  )
}

function IncidentPanel({ inc }) {
  const inspect = useGameStore((s) => s.inspect)
  const runAction = useGameStore((s) => s.runAction)
  const { def } = inc
  const node = def.nodes[inc.node]
  const actions = def.actions.filter((a) => !a.requires || inc.inspected.includes(a.requires))
  // Answering the phone marks the row the caller was talking about
  const hintRow = inc.hinted ? def.hint?.row : null

  return (
    <div className="crt-incident">
      <div className="crt-escalation">
        <span>SEV-{inc.severity} · {def.title}</span>
        <EscalationBar inc={inc} width={16} />
      </div>
      <div className="crt-heading">
        {inc.node !== 'overview' && (
          <button className="crt-link" onClick={() => inspect(inc.uid, 'overview')}>◂ BACK</button>
        )}
        {node.title}
      </div>
      {node.rows.map((row, i) => (
        <div
          key={i}
          className={`crt-row ${row.link ? 'crt-drill' : ''}`}
          onClick={row.link ? () => inspect(inc.uid, row.link) : undefined}
        >
          <span>{row.link ? '▸ ' : '  '}{row.label}{row.label === hintRow && <span className="crt-hint"> 📞</span>}</span>
          <span className={statusClass(row.status)}>{row.value}</span>
        </div>
      ))}

      <div className="crt-log">
        {inc.hinted && def.hint && inc.node === 'overview' && <div className="crt-hint">📞 caller: &quot;{def.hint.text}&quot;</div>}
        {(node.log ?? []).map((line, i) => <div key={`n${i}`} className="crt-dim">{line}</div>)}
        {inc.log.slice(-6).map((line, i) => (
          <div key={`l${i}`} className={line.startsWith('>') ? '' : 'crt-warn'}>{line}</div>
        ))}
      </div>

      {inc.awaitingRack ? (
        <div className="crt-rack-step">
          🔧 Software side done. Hardware step: <b>{inc.rackTask}</b>
          <div className="crt-dim">Go to the server rack (bathroom). Yes, the bathroom.</div>
        </div>
      ) : (
      <div className="crt-actions">
        {actions.map((a) => {
          // You triaged this in your dream: the fix glows
          const dreamed = inc.prediagnosed && a.correct
          return (
            <button key={a.id} className={`crt-button ${dreamed ? 'dreamed' : ''}`} onClick={() => runAction(inc.uid, a.id)}>
              [ {dreamed && '💭 '}{a.label} ]
            </button>
          )
        })}
      </div>
      )}
    </div>
  )
}

export default function ComputerUI() {
  const overlay = useGameStore((s) => s.overlay)
  const incidents = useGameStore((s) => s.incidents)
  const selected = useGameStore((s) => s.selectedIncident)
  const gameTime = useGameStore((s) => s.gameTime)
  const streak = useGameStore((s) => s.streak)
  const hitId = useGameStore((s) => s.lastResolve?.id)
  const selectIncident = useGameStore((s) => s.selectIncident)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const wifi = useGameStore((s) => s.home.wifi)
  const laptop = useGameStore((s) => s.terminal === 'laptop')
  const executing = useGameStore((s) => s.microgame?.where === 'terminal')
  if (overlay !== 'computer') return null

  const sorted = [...incidents].sort(byUrgency)
  const current = incidents.find((i) => i.uid === selected) ?? sorted[0]

  const logOut = () => {
    closeOverlay()
    document.body.requestPointerLock()
  }

  return (
    <div className="crt-backdrop">
      {/* Beige monitor case around the screen */}
      <div className="crt-case psx-beige">
        {/* Re-keyed on every fix so the flash + shake replays */}
        <div className={`crt ${hitId ? 'crt-hit' : ''}`} key={hitId}>
          <div className="crt-title">
            <span>{laptop ? 'LAPTOP · 🔋 on battery' : 'PROD MONITOR'}</span>
            <span>{formatClock(gameTime)}</span>
            <span className={streak >= 2 ? 'crt-streak' : 'crt-dim'}>
              STREAK x{streak}{streak >= 2 && ` · ×${streakMultiplier(streak).toFixed(2)}`}
            </span>
          <button className="crt-link" onClick={logOut}>[E] LOG OUT</button>
          </div>
          <div className="crt-body">
            <Metrics incidents={incidents} />
            <div className="crt-main">
              {!wifi ? (
              <div className="crt-nominal crt-bad">
                📶 ERR_INTERNET_DISCONNECTED
                <div className="crt-dim">The dashboard is in the cloud. The cloud is behind the router.</div>
                <div className="crt-dim">Reset the router (living room).</div>
              </div>
            ) : executing ? (
              <Microgame where="terminal" />
            ) : sorted.length === 0 ? (
                <div className="crt-nominal">
                  ALL SYSTEMS NOMINAL
                  <div className="crt-dim">Go back to bed.</div>
                </div>
              ) : (
                <>
                  <div className="crt-tabs">
                    {sorted.map((inc) => (
                      <button
                        key={inc.uid}
                        className={`crt-tab ${inc.uid === current.uid ? 'active' : ''} ${inc.acknowledged ? '' : 'blink'}`}
                        style={{ borderColor: SEV_COLORS[inc.severity], color: SEV_COLORS[inc.severity] }}
                        onClick={() => selectIncident(inc.uid)}
                      >
                        SEV-{inc.severity} {inc.def.service}{' '}
                        <span style={{ color: STAGE_COLORS[inc.stage] }}>{meterBar(inc.meter, 4)} {STAGES[inc.stage]}</span>
                      </button>
                    ))}
                  </div>
                  <IncidentPanel inc={current} />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="crt-badge">
          <span>CodeMonkey CRT-14&quot;</span>
          <span className={`crt-led ${incidents.length ? 'alarm' : ''}`} />
        </div>
      </div>
    </div>
  )
}
