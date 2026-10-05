import { useState } from 'react'
import { useGameStore } from '../game/GameState'
import { getBoard, qualifies, addScore } from '../game/highscores'
import { Leaderboard, InitialsEntry } from './Leaderboard'
import { NIGHT_GRADE_TITLES } from '../game/scoring'
import HandoffDoc from './HandoffDoc'
import { modIcons, modMultiplier } from '../game/shifts'
import { boardTitle } from './format'
import { formatClock } from '../game/GameClock'
import { fill } from '../game/text'
import { text } from '../content'

const UI = text('ui')
const T = UI.score

// 7 AM (or fired): the handoff doc on the left, your grade and the leaderboard on
// the right
export default function ScoreScreen() {
  const stats = useGameStore((s) => s.stats)
  const score = useGameStore((s) => s.score)
  const mode = useGameStore((s) => s.mode)
  const shift = useGameStore((s) => s.shift)
  const fired = useGameStore((s) => s.endReason === 'fired')
  const gameTime = useGameStore((s) => s.gameTime)
  const startNight = useGameStore((s) => s.startNight)
  const toMenu = useGameStore((s) => s.toMenu)
  const grade = useGameStore((s) => s.grade) ?? 'F'
  const length = useGameStore((s) => s.length)
  const mods = useGameStore((s) => s.mods)
  const endless = length === 'endless'

  // Initials entry if this run makes the board; afterwards highlight it
  const [rank, setRank] = useState(null)
  const [entering, setEntering] = useState(() => qualifies(mode, shift, length, score))
  const board = getBoard(mode, shift, length)

  const save = (initials) => {
    setRank(addScore(mode, shift, length, { initials, score, fired, bestStreak: stats.bestStreak, grade, mods, waves: endless ? stats.waves : undefined }))
    setEntering(false)
  }

  const firedAt = formatClock(gameTime)

  return (
    <div className="screen score-screen">
      <h1 className={`screen-title ${fired ? 'fired' : ''}`}>{fired ? T.fired : T.complete}</h1>
      <p className="screen-sub">
        {mode === 'daily' ? fill(T.daily, { shift }) : T.random}
        {length !== 'story' && fill(T.part, { text: UI.lengths[length] })}
        {mods.length > 0 && fill(T.part, { text: `${modIcons(mods)} ×${modMultiplier(mods).toFixed(2)}` })}
        {fired && fill(endless ? T.firedEndless : T.firedAt, { waves: stats.waves, breached: stats.breached, time: firedAt })}
      </p>

      <div className="score-columns">
        <HandoffDoc />

        <div className="score-side-column">
          <div className="night-grade ff-window">
            <div className={`night-grade-letter grade-${grade}`}>{grade}</div>
            <div>
              <div className="score-label">{T.grade}</div>
              <div className="night-grade-title">{NIGHT_GRADE_TITLES[grade]}</div>
            </div>
          </div>
          <div className="score-side ff-window">
            {entering ? <InitialsEntry onSave={save} /> : <Leaderboard title={boardTitle(mode, shift, length, 10)} entries={board} highlight={rank ?? -1} />}
          </div>
        </div>
      </div>

      <div className="screen-buttons">
        <button className="screen-button" onClick={() => { startNight(mode); document.body.requestPointerLock() }}>
          {mode === 'daily' ? T.retry : T.newRandom}
        </button>
        <button className="screen-button secondary" onClick={toMenu}>{T.menu}</button>
      </div>
    </div>
  )
}
