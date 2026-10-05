import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../game/GameState'
import { MAX_MISTAKES } from '../../game/microgames'
import * as sfx from '../../game/audio'
import { BRIEFS } from './content'
import { Whack, Purge, TypeCommand, Timing, Order, Cables } from './games'
import './microgames.css'
import { withKeys } from '../../game/controls'

// Runs the current fix microgame (store.microgame): the countdown, the mistake
// pips, and reporting the result back to the store. The game itself only says
// "mistake" or "win".

const GAMES = { whack: Whack, purge: Purge, type: TypeCommand, timing: Timing, order: Order, cables: Cables }

function Run({ game, inc }) {
  const finish = useGameStore((s) => s.finishMicrogame)
  const start = useRef(0)
  const mistakes = useRef(0)
  const done = useRef(false)
  const [now, setNow] = useState(0)
  const [misses, setMisses] = useState(0)

  const end = useCallback(
    (success) => {
      if (done.current) return
      done.current = true
      finish({ success, mistakes: mistakes.current, used: (performance.now() - start.current) / 1000 })
    },
    [finish]
  )

  useEffect(() => {
    start.current = performance.now()
    let raf
    const loop = () => {
      const t = performance.now()
      setNow(t)
      if ((t - start.current) / 1000 >= game.limit) end(false)
      else raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [game.limit, end])

  const onMistake = useCallback(() => {
    mistakes.current++
    setMisses(mistakes.current)
    sfx.error()
    if (mistakes.current >= MAX_MISTAKES) end(false)
  }, [end])
  const onWin = useCallback(() => end(true), [end])

  const used = start.current ? (now - start.current) / 1000 : 0
  const left = Math.max(0, game.limit - used)
  const Game = GAMES[game.kind]
  const brief = BRIEFS[game.kind]
  return (
    <div className={`mg mg-${game.where}`}>
      <div className="mg-header">
        <span className="mg-title">{brief.title}</span>
        <span className="mg-target">{inc.def.title}</span>
        <span className="mg-misses">
          {Array.from({ length: MAX_MISTAKES }, (_, i) => (i < misses ? '✗' : '·')).join(' ')}
        </span>
      </div>
      <div className="mg-timer">
        <span style={{ width: `${(left / game.limit) * 100}%` }} className={left < game.limit * 0.3 ? 'low' : ''} />
      </div>
      <div className="mg-how">{withKeys(brief.how)}</div>
      <div className="mg-body">
        {/* Re-keyed per mistake so the red flash replays (the game itself keeps its state) */}
        {misses > 0 && <div className="mg-flash" key={misses} />}
        <Game difficulty={game.difficulty} def={inc.def} progress={used / game.limit} onMistake={onMistake} onWin={onWin} />
      </div>
    </div>
  )
}

export default function Microgame({ where }) {
  const game = useGameStore((s) => (s.microgame?.where === where ? s.microgame : null))
  const inc = useGameStore((s) => s.incidents.find((i) => i.uid === s.microgame?.incUid))
  if (!game || !inc) return null
  return <Run key={game.id} game={game} inc={inc} />
}
