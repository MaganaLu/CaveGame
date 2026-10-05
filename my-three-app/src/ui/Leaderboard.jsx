import { useState } from 'react'
import { formatScore } from './format'
import { modIcons } from '../game/shifts'
import { fill } from '../game/text'
import { text } from '../content'

const T = text('ui').board

// Top-10 table for one shift (or random shifts)
export function Leaderboard({ title, entries, highlight = -1, limit = 10 }) {
  return (
    <div className="board">
      <div className="score-label">{title}</div>
      {entries.length === 0 && <div className="board-empty">{T.empty}</div>}
      {entries.slice(0, limit).map((e, i) => (
        <div key={e.id} className={`board-row ${i === highlight ? 'board-you' : ''}`}>
          <span className="board-rank">{String(i + 1).padStart(2, '0')}</span>
          <span className="board-initials">{e.initials}</span>
          <span className="board-mods" title={T.modsTitle}>{modIcons(e.mods)}</span>
          <span className="board-score">{formatScore(e.score)}</span>
          {e.grade && <span className={`board-grade grade-${e.grade}`}>{e.grade}</span>}
          <span className="board-note">{e.waves != null ? fill(T.waves, { n: e.waves }) : e.fired ? T.fired : fill(T.streak, { n: e.bestStreak })}</span>
        </div>
      ))}
    </div>
  )
}

// Classic 3-letter arcade initials
export function InitialsEntry({ onSave }) {
  const [initials, setInitials] = useState('')
  const save = () => onSave((initials || 'AAA').padEnd(3, 'A'))
  return (
    <form
      className="initials"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="score-label blink">{T.newHigh}</div>
      <input
        className="initials-input"
        autoFocus
        maxLength={3}
        value={initials}
        onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        placeholder="___"
        aria-label={T.initialsAria}
      />
      <button type="submit" className="screen-button">{T.save}</button>
    </form>
  )
}
