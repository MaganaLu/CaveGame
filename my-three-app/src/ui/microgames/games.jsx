import { useEffect, useState } from 'react'
import { INSTANCES, instanceId, HUGE_FILES, SMALL_FILES, COMMANDS, SERVICE_CHAIN, CABLE_COLORS, pick, shuffle, lerp } from './content'

// The fix microgames. Each gets { difficulty (0..1), def, progress (0..1 of the
// time limit used), onMistake, onWin } from Microgame.jsx, which owns the timer
// and the mistake count.

// Keys go to the microgame only: capture them before the game's hotkeys (Q, X, F…)
function useKeys(handler) {
  useEffect(() => {
    const onKey = (e) => {
      if (handler(e) === false) return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [handler])
}

// ------------------------------------------------------------------ whack: the EC2 console
function topRows(target, difficulty) {
  const others = shuffle(INSTANCES.filter((p) => p !== target)).slice(0, 6)
  const rows = others.map((name) => ({ name, cpu: 1 + Math.random() * 25 }))
  // Later on, a decoy runs hot too
  if (difficulty > 0.4) rows[0].cpu = 70 + Math.random() * 15
  rows.push({ name: target, cpu: 97 + Math.random() * 2.9 })
  return shuffle(rows).map((r) => ({ ...r, pid: instanceId() }))
}

export function Whack({ difficulty, onMistake, onWin }) {
  const needed = 2 + Math.round(difficulty * 3)
  const [target] = useState(() => pick(INSTANCES))
  const [hits, setHits] = useState(0)
  const [rows, setRows] = useState(() => topRows(target, difficulty))
  useEffect(() => {
    const id = setInterval(() => setRows(topRows(target, difficulty)), lerp(1300, 520, difficulty))
    return () => clearInterval(id)
  }, [target, difficulty])

  const hit = (row) => {
    if (row.name !== target) return onMistake()
    const n = hits + 1
    setHits(n)
    setRows(topRows(target, difficulty))
    if (n >= needed) onWin()
  }
  return (
    <div className="mg-top">
      <div className="mg-row mg-head"><span>INSTANCE ID</span><span>CPU %</span><span>NAME</span></div>
      {rows.map((r) => (
        <button key={r.pid} className={`mg-row ${r.cpu > 90 ? 'crt-bad' : r.cpu > 60 ? 'crt-warn' : ''}`} onClick={() => hit(r)}>
          <span>{r.pid}</span><span>{r.cpu.toFixed(1)}</span><span>{r.name}</span>
        </button>
      ))}
      <div className="mg-count">STOPPED {hits}/{needed} · stop the hot one</div>
    </div>
  )
}

// ------------------------------------------------------------------ purge: disk full
export function Purge({ difficulty, progress, onMistake, onWin }) {
  const [files] = useState(() => {
    const huge = shuffle(HUGE_FILES).slice(0, 2 + Math.round(difficulty * 2))
    const small = shuffle(SMALL_FILES).slice(0, 8 - huge.length)
    return shuffle([...huge.map(([name, size]) => ({ name, size, huge: true })), ...small.map(([name, size]) => ({ name, size, huge: false }))])
  })
  const [deleted, setDeleted] = useState([])
  const [oops, setOops] = useState(null)

  const del = (f) => {
    if (deleted.includes(f.name)) return
    if (!f.huge) {
      setOops(f.name === 'terraform.tfstate' ? 'You deleted terraform.tfstate. Terraform no longer knows what exists. Neither do you.' : `You deleted ${f.name}. Versioning saved you. This time.`)
      return onMistake()
    }
    const next = [...deleted, f.name]
    setDeleted(next)
    if (next.length === files.filter((x) => x.huge).length) onWin()
  }
  const disk = Math.min(100, 92 + progress * 8 - deleted.length * 1.5)
  return (
    <div className="mg-purge">
      <div className="mg-disk">s3://banana-plantation-prod · bill alarm at <span className="crt-bad">{disk.toFixed(1)}%</span></div>
      <div className="mg-files">
        {files.map((f) => (
          <button key={f.name} className={`mg-file ${deleted.includes(f.name) ? 'gone' : ''}`} onClick={() => del(f)}>
            <span>{deleted.includes(f.name) ? '🗑' : '📄'} {f.name}</span>
            <span className={f.huge ? 'crt-warn' : 'crt-dim'}>{f.size}</span>
          </button>
        ))}
      </div>
      {oops && <div className="crt-bad">{oops}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ type: the command
export function TypeCommand({ difficulty, def, onMistake, onWin }) {
  const [cmd] = useState(() => {
    const list = (COMMANDS[def.id] ?? COMMANDS.generic)()
    return difficulty < 0.35 ? list[0] : pick(list)
  })
  const [pos, setPos] = useState(0)
  const [wrong, setWrong] = useState(0)
  useKeys((e) => {
    if (e.key.length !== 1) return false
    if (e.key === cmd[pos]) {
      const n = pos + 1
      setPos(n)
      if (n >= cmd.length) onWin()
    } else {
      setWrong((w) => w + 1)
      onMistake()
    }
  })
  return (
    <div className="mg-type">
      <div className="mg-shell">[cloudshell-user@banana-prod ~]$</div>
      <div className="mg-prompt">
        <span className="mg-typed">{cmd.slice(0, pos)}</span>
        <span className={`mg-cursor ${wrong ? 'missed' : ''}`} key={wrong}>{cmd[pos] === ' ' ? '␣' : cmd[pos]}</span>
        <span className="mg-todo">{cmd.slice(pos + 1)}</span>
      </div>
      <div className="mg-progress">{pos} / {cmd.length} · typos count</div>
    </div>
  )
}

// ------------------------------------------------------------------ timing: drain the queue
const newZone = (width) => 0.08 + Math.random() * (0.84 - width)
// A little forgiveness at the zone's edges (fraction of the bar)
const TIMING_GRACE = 0.02

export function Timing({ difficulty, onMistake, onWin }) {
  const needed = 2 + Math.round(difficulty * 3)
  const width = lerp(0.24, 0.12, difficulty)
  const speed = lerp(0.8, 1.5, difficulty) // sweeps per second
  const [zone, setZone] = useState(() => newZone(width))
  const [hits, setHits] = useState(0)
  // The marker's position at any moment (same clock as requestAnimationFrame), so
  // a press is judged where the marker actually is, not where it was last drawn
  const markerAt = (ms) => (Math.sin((ms / 1000) * speed * Math.PI) + 1) / 2
  const [x, setX] = useState(() => markerAt(performance.now()))
  useEffect(() => {
    let raf
    const loop = (t) => {
      setX((Math.sin((t / 1000) * speed * Math.PI) + 1) / 2)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  const press = () => {
    const at = markerAt(performance.now())
    if (at < zone - TIMING_GRACE || at > zone + width + TIMING_GRACE) return onMistake()
    const n = hits + 1
    setHits(n)
    setZone(newZone(width))
    if (n >= needed) onWin()
  }
  useKeys((e) => {
    if (e.code !== 'Space') return false
    if (!e.repeat) press()
  })
  return (
    <div className="mg-timing">
      <div className="mg-queue">SQS checkout-events · ApproximateNumberOfMessages {Math.max(0, 48211 - hits * 12000).toLocaleString('en-US')}</div>
      {/* Fires on press (not release, which comes ~0.1 s later), and never takes
          keyboard focus, so Space can't also "click" it a second time */}
      <div
        className="mg-bar"
        role="button"
        onPointerDown={(e) => {
          e.preventDefault()
          press()
        }}
      >
        <span className="mg-zone" style={{ left: `${zone * 100}%`, width: `${width * 100}%` }} />
        <span className="mg-marker" style={{ left: `${x * 100}%` }} />
      </div>
      <div className="mg-count">BATCHES {hits}/{needed} · SPACE or click when the marker is in the green</div>
    </div>
  )
}

// ------------------------------------------------------------------ order: restart chain
export function Order({ difficulty, onMistake, onWin }) {
  const chain = SERVICE_CHAIN.slice(0, Math.min(SERVICE_CHAIN.length, 3 + Math.round(difficulty * 3)))
  const [next, setNext] = useState(0)
  const [layout, setLayout] = useState(() => shuffle(chain))
  const press = (name) => {
    if (name !== chain[next]) return onMistake()
    const n = next + 1
    setNext(n)
    setLayout(shuffle(chain))
    if (n >= chain.length) onWin()
  }
  return (
    <div className="mg-order">
      <div className="mg-chain">
        {chain.map((name, i) => (
          <span key={name} className={i < next ? 'done' : i === next ? 'now' : ''}>{i > 0 && ' → '}{name}</span>
        ))}
      </div>
      <div className="mg-grid">
        {layout.map((name) => (
          <button key={name} className={`mg-svc ${chain.indexOf(name) < next ? 'done' : ''}`} onClick={() => press(name)}>
            {chain.indexOf(name) < next ? '✓' : '⟳'} {name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ cables: at the rack
// The ports are labeled in the wrong ink. Match the WORD, not the color.
export function Cables({ difficulty, onMistake, onWin }) {
  const count = difficulty > 0.6 ? 5 : difficulty > 0.25 ? 4 : 3
  const [plugs] = useState(() => shuffle(CABLE_COLORS).slice(0, count))
  const [ports] = useState(() => {
    const words = shuffle(plugs)
    return words.map(([word], i) => ({ word, ink: words[(i + 1) % words.length][1] }))
  })
  const [held, setHeld] = useState(null)
  const [done, setDone] = useState([])
  const plugIn = (port) => {
    if (!held || done.includes(port.word)) return
    if (port.word !== held) {
      setHeld(null)
      return onMistake()
    }
    const n = [...done, held]
    setDone(n)
    setHeld(null)
    if (n.length >= plugs.length) onWin()
  }
  return (
    <div className="mg-cables">
      <div className="mg-plugs">
        {plugs.map(([word, color]) => (
          <button
            key={word}
            className={`mg-plug ${held === word ? 'held' : ''} ${done.includes(word) ? 'done' : ''}`}
            style={{ background: color }}
            onClick={() => !done.includes(word) && setHeld(word)}
            aria-label={`${word} cable`}
          />
        ))}
      </div>
      <div className="mg-ports">
        {ports.map((p) => (
          <button key={p.word} className={`mg-port ${done.includes(p.word) ? 'done' : ''}`} style={{ color: p.ink }} onClick={() => plugIn(p)}>
            {done.includes(p.word) ? '●' : '○'} {p.word}
          </button>
        ))}
      </div>
      <div className="mg-count">{held ? `Holding a cable. Pick its port.` : 'Grab a cable.'}</div>
    </div>
  )
}
