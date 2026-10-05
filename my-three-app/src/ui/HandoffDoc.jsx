import { useGameStore } from '../game/GameState'
import { buildHandoff } from '../game/handoff'
import { GRADES } from '../game/scoring'
import { formatScore } from './format'
import Rich from './Rich'
import { fill } from '../game/text'
import { text } from '../content'

const UI = text('ui')
const T = UI.handoffDoc

// The 7 AM score screen's main panel: your night as a Qwip doc (the company
// Google-Docs), a passdown for the next on-call. Text comes from game/handoff.js.

function rating(score, stats, fired) {
  if (fired) return T.ratings.fired
  if (score < 0 || stats.breached > 1) return T.ratings.pip
  if (score < 15000) return T.ratings.low
  // There is no rating above this. That's the joke.
  return T.ratings.meets
}

export default function HandoffDoc() {
  const state = useGameStore()
  const { stats, score, nightBonuses, mode, shift, length } = state
  const fired = state.endReason === 'fired'
  const doc = buildHandoff(state)
  const shiftName = mode === 'daily' ? fill(T.daily, { shift }) : T.random

  // "S×2 A×1 F×1", best letters first
  const gradeCounts = [...GRADES].reverse()
    .map((g) => [g, stats.grades.filter((x) => x === g).length])
    .filter(([, n]) => n > 0)

  return (
    <div className="qw-window">
      <div className="qw-chrome">
        <span className="qw-tab">{fill(T.tab, { shift: shiftName })}</span>
        <span className="qw-url">{T.url}</span>
      </div>
      <div className="qw-body">
        <div className="qw-page">
          <div className="qw-title">{fill(T.title, { shift: shiftName })}{length !== 'story' ? fill(T.length, { length: UI.lengths[length] }) : ''}</div>
          <div className="qw-byline">{fill(T.byline, { when: fired ? T.endedEarly : T.dawn })}</div>
          <div className="qw-score">
            <span>{T.score}</span>
            <b>{formatScore(score)}</b>
          </div>

          <div className="qw-h">{T.tldr}</div>
          <p>{doc.tldr}</p>

          <div className="qw-h">{T.happened}</div>
          <ul>
            {doc.happened.map((line) => <li key={line}>{line}</li>)}
            {gradeCounts.length > 0 && (
              <li>{T.grades}{gradeCounts.map(([g, n]) => <b key={g} className={`grade-${g}`}>{g}×{n} </b>)}</li>
            )}
          </ul>

          <div className="qw-h">{T.stillOpen}</div>
          {doc.stillOpen.length ? (
            <ul>{doc.stillOpen.map((t, i) => <li key={i} className="qw-fire">🔥 {t}</li>)}</ul>
          ) : (
            <p>{T.nothingOpen}</p>
          )}

          <div className="qw-h">{T.rootCause}</div>
          <p>{doc.rootCause}</p>

          <div className="qw-h">{T.actions}</div>
          <ul className="qw-todo">
            {doc.actions.map((a) => <li key={a}>☐ {a}</li>)}
          </ul>

          {nightBonuses.length > 0 && (
            <>
              <div className="qw-h">{T.principles}</div>
              <ul>
                {nightBonuses.map((b) => (
                  <li key={b.id}>{b.principle} <span className="qw-dim">({b.label})</span> <b className="qw-points">+{formatScore(b.points)}</b></li>
                ))}
              </ul>
            </>
          )}

          <div className="qw-perf"><Rich text={fill(T.perf, { rating: rating(score, stats, fired) })} /></div>
        </div>

        <div className="qw-margin">
          {doc.comments.map((c) => (
            <div key={c.who} className="qw-comment">
              <b>{c.who}</b>
              <div>{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
