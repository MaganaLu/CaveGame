import { useGameStore } from '../game/GameState'
import { buildHandoff } from '../game/handoff'
import { GRADES } from '../game/scoring'
import { formatScore } from './format'

// The 7 AM score screen's main panel: your night as a Qwip doc (the company
// Google-Docs), a passdown for the next on-call. Text comes from game/handoff.js.

function rating(score, stats, fired) {
  if (fired) return 'TERMINATED'
  if (score < 0 || stats.breached > 1) return 'PERFORMANCE IMPROVEMENT PLAN'
  if (score < 15000) return 'NEEDS IMPROVEMENT'
  // There is no rating above this. That's the joke.
  return 'MEETS EXPECTATIONS'
}

export default function HandoffDoc() {
  const state = useGameStore()
  const { stats, score, nightBonuses, mode, shift, length } = state
  const fired = state.endReason === 'fired'
  const doc = buildHandoff(state)
  const shiftName = mode === 'daily' ? `Shift #${shift}` : 'Random shift'

  // "S×2 A×1 F×1", best letters first
  const gradeCounts = [...GRADES].reverse()
    .map((g) => [g, stats.grades.filter((x) => x === g).length])
    .filter(([, n]) => n > 0)

  return (
    <div className="qw-window">
      <div className="qw-chrome">
        <span className="qw-tab">Q On-Call Handoff · {shiftName} - Qwip</span>
        <span className="qw-url">🔒 qwip.monkey.corp/banana-oncall/handoff</span>
      </div>
      <div className="qw-body">
        <div className="qw-page">
          <div className="qw-title">On-Call Handoff — {shiftName}{length !== 'story' ? ` (${length})` : ''}</div>
          <div className="qw-byline">oncall-you → next on-call · {fired ? 'shift ended early' : '07:00 AM'} · Last edited by Bar Raiser</div>
          <div className="qw-score">
            <span>SCORE</span>
            <b>{formatScore(score)}</b>
          </div>

          <div className="qw-h">TL;DR</div>
          <p>{doc.tldr}</p>

          <div className="qw-h">What happened</div>
          <ul>
            {doc.happened.map((line) => <li key={line}>{line}</li>)}
            {gradeCounts.length > 0 && (
              <li>Grades: {gradeCounts.map(([g, n]) => <b key={g} className={`grade-${g}`}>{g}×{n} </b>)}</li>
            )}
          </ul>

          <div className="qw-h">Still on fire</div>
          {doc.stillOpen.length ? (
            <ul>{doc.stillOpen.map((t, i) => <li key={i} className="qw-fire">🔥 {t}</li>)}</ul>
          ) : (
            <p>Nothing. (For now.)</p>
          )}

          <div className="qw-h">Root cause</div>
          <p>{doc.rootCause}</p>

          <div className="qw-h">Action items</div>
          <ul className="qw-todo">
            {doc.actions.map((a) => <li key={a}>☐ {a}</li>)}
          </ul>

          {nightBonuses.length > 0 && (
            <>
              <div className="qw-h">Banana Principles demonstrated</div>
              <ul>
                {nightBonuses.map((b) => (
                  <li key={b.label}>{b.principle} <span className="qw-dim">({b.label})</span> <b className="qw-points">+{formatScore(b.points)}</b></li>
                ))}
              </ul>
            </>
          )}

          <div className="qw-perf">Performance: <b>{rating(score, stats, fired)}</b> · Bonus: <b>$0.00</b></div>
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
