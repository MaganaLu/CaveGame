import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/GameState'
import { makeTask, INSTRUCTIONS, INTROS, ALARM } from './sprintTasks'
import { formatScore } from '../ui/format'
import { timesSeen, countSeen, introSeen, markIntroSeen } from '../game/unlocks'
import { easeOf } from '../game/shifts'
import { taskSeconds, NEW_TASK_BONUS, NEW_TASK_TIMES } from './dreams'
import { fileFor } from './pullRequests'
import { COE_RULES } from './coe'
import AppWindow from './AppWindow'
import Avatar from './Avatar'
import TimerBar from './TimerBar'
import useDeadline from './useDeadline'
import { text } from '../content'
import { fill } from '../game/text'
import Rich from '../ui/Rich'
import { pressed, withKeys } from '../game/controls'

const SPRINT_TEXT = text('dreams/sprint')

// The Dream Sprint: one tiny developer-parody task after another. Each flashes
// its instruction, then you answer (click or keys 1-4) before the bar runs out.
// The store keeps the bank; this deals the cards. The first few times you meet a
// kind of task you get more time; in a story shift you also get a short
// explanation card the first time, and the whole night pauses while it's up.

const FLASH_MS = 550
const FEEDBACK = SPRINT_TEXT.feedback
const UI = SPRINT_TEXT.ui
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// The explanation this task still needs (story shifts only), the sprint's first
// (The email card got Report / Forward later: it has a new intro key, so players
// who saw the old two-button one get the new explanation once)
const INTRO_KEY = { replyall: 'inbox' }
const introFor = (task, story) =>
  story ? ['sprint', task.leak ? 'leakGraph' : INTRO_KEY[task.kind] ?? task.kind].find((k) => !introSeen(k)) ?? null : null

function deal(previous, leak, cleared, ease = 1) {
  const task = makeTask(previous?.task.kind, leak)
  const seenKey = `task:${task.kind}`
  const fresh = timesSeen(seenKey) < NEW_TASK_TIMES
  countSeen(seenKey)
  const limit = taskSeconds(cleared) * (fresh ? NEW_TASK_BONUS : 1) * ease * 1000
  const shownAt = performance.now() + FLASH_MS
  return { task, limit, shownAt, deadline: shownAt + limit, id: (previous?.id ?? 0) + 1 }
}

export default function DreamSprint() {
  const cleared = useGameStore((s) => s.dream?.cleared ?? 0)
  const leak = useGameStore((s) => s.dreamLeak)
  const dreamTask = useGameStore((s) => s.dreamTask)
  const leakShown = useRef(null)
  const ease = useGameStore((s) => easeOf(s).dreamTask)
  const story = useGameStore((s) => s.length === 'story')
  const setPaused = useGameStore((s) => s.setPaused)
  const [round, setRound] = useState(() => deal(null, null, 0, ease))
  const [intro, setIntro] = useState(() => introFor(round.task, story))
  const [flashing, setFlashing] = useState(true)

  // Story: the first time the pager rings in a dream, explain LET IT RING (the
  // night, and the fuse, wait while you read)
  const ringing = useGameStore((s) => Boolean(s.dreamRinging))
  useEffect(() => {
    if (ringing && story && !introSeen('ring')) setIntro('ring')
  }, [ringing, story])

  // The whole night waits while you read (and resumes if the dream ends)
  useEffect(() => {
    setPaused(Boolean(intro))
  }, [intro, setPaused])
  useEffect(() => () => setPaused(false), [setPaused])

  // Read it, then the task starts fresh: flash, then its full time
  const dismissIntro = () => {
    markIntroSeen(intro)
    const next = introFor(round.task, story)
    if (next) return setIntro(next)
    setIntro(null)
    const shownAt = performance.now() + FLASH_MS
    setRound({ ...round, shownAt, deadline: shownAt + round.limit, id: round.id + 1 })
  }
  const [feedback, setFeedback] = useState(null)

  // Instruction flash, then the card
  useEffect(() => {
    setFlashing(true)
    const id = setTimeout(() => setFlashing(false), FLASH_MS)
    return () => clearTimeout(id)
  }, [round.id])

  const answer = (choiceId) => {
    if (flashing && choiceId !== null) return
    const { task } = round
    const ok = choiceId === task.answer
    dreamTask(ok, { leakKey: task.leak && leak ? leak.key : null })
    setFeedback({ ok, text: task.leak && ok ? UI.remember : choiceId === null ? UI.tooSlow : pick(FEEDBACK[ok ? 'ok' : 'bad']), id: round.id })
    // The incoming incident leaks in as the next card, once
    const leakNow = leak && leakShown.current !== leak.key ? leak : null
    if (leakNow) leakShown.current = leak.key
    const next = deal(round, leakNow, cleared + (ok ? 1 : 0), ease)
    setRound(next)
    setIntro(introFor(next.task, story))
  }

  const answerRef = useRef(answer)
  answerRef.current = answer
  useDeadline(round.deadline, !intro, answerRef)

  // Keys 1-4 pick a choice; Space / Enter close an explanation card
  const dismissRef = useRef(dismissIntro)
  dismissRef.current = dismissIntro
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return
      if (intro) {
        if (pressed(e, 'confirm') || e.key === 'Enter') {
          e.preventDefault()
          dismissRef.current()
        }
        return
      }
      const choice = round.task.choices.find((c) => c.key === e.key)
      if (choice) answerRef.current(choice.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [round, intro])

  const Card = CARDS[round.task.kind]
  if (intro) {
    const { title, lines, keys } = INTROS[intro]
    return (
      <div className="ds">
        <div className="ds-intro ff-window" key={intro}>
          <div className="ds-intro-label">{intro === 'sprint' || intro === 'ring' ? UI.howItWorks : UI.newTask}{UI.paused}</div>
          <div className="ds-intro-title">{title}</div>
          {lines.map((line) => <p key={line}>{withKeys(line)}</p>)}
          {keys && <div className="ds-intro-keys"><Rich text={fill(UI.answerWith, { keys })} /></div>}
          <button className="ds-intro-go" onClick={dismissIntro}>{fill(UI.gotIt)}</button>
        </div>
      </div>
    )
  }
  return (
    <div className="ds">
      {flashing ? (
        <div className="ds-flash" key={`f${round.id}`}>{INSTRUCTIONS[round.task.kind]}</div>
      ) : (
        <Card task={round.task} onAnswer={answer} timer={<TimerBar key={round.id} duration={round.limit} />} />
      )}
      {feedback && <div key={`fb${feedback.id}`} className={`dream-feedback ${feedback.ok ? 'ok' : 'bad'}`}>{feedback.text}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ cards
function Choices({ task, onAnswer }) {
  return (
    <div className="ds-choices">
      {task.choices.map((c) => (
        <button key={c.id} className="ds-choice" onClick={() => onAnswer(c.id)}>
          <span className="ds-key">{c.key}</span> {c.label}
          {c.rule && <span className="ds-rule">{c.rule}</span>}
        </button>
      ))}
    </div>
  )
}

// Spot the spike: four dashboards, click the one on fire NOW (above the alarm
// line at the right edge). The leaked incident is the burning one, by name.
function Spike({ task, onAnswer, timer }) {
  const S = UI.spike
  return (
    <AppWindow icon="📈" tab={S.tab} url={S.url}>
      <div className={`ds-card ${task.leak ? 'ds-leak' : ''}`}>
        <div className="ds-app">{S.app}</div>
        {task.leak && <div className="jr-desc">{UI.leakFlavor}</div>}
        {timer}
        <div className="ds-graphs">
          {task.graphs.map((g) => {
            const line = g.points.map((v, i) => `${(i / (g.points.length - 1)) * 100},${40 - v * 40}`).join(' ')
            return (
              <button key={g.id} className="ds-graph" onClick={() => onAnswer(g.id)}>
                <span className="ds-graph-head">
                  <span><span className="ds-key">{g.key}</span> {g.service}</span>
                  <span className="ds-graph-value">{formatScore(g.value)}{g.metric.unit}</span>
                </span>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                  <line x1="0" x2="100" y1={40 - ALARM * 40} y2={40 - ALARM * 40} className="ds-alarm" />
                  <polyline points={line} className="ds-line" />
                </svg>
                <span className="ds-graph-foot"><span>{g.metric.name}</span><span className="ds-alarm-label">{S.alarm}</span></span>
              </button>
            )
          })}
        </div>
      </div>
    </AppWindow>
  )
}

function Review({ task, onAnswer, timer }) {
  const { pr } = task
  return (
    <AppWindow icon="🐙" tab={fill(UI.review.tab, { title: pr.title })} url={UI.review.url}>
      <div className="ds-card">
        <div className="ds-app">{UI.review.app}<Avatar name={pr.author} />{fill(UI.review.wants, { author: pr.author })}<span className="ds-stats">{pr.stats}</span></div>
        <div className="ds-title">{pr.title}</div>
        {pr.description && <div className="jr-desc">&quot;{pr.description}&quot;</div>}
        <div className="ds-diff">
          <div className="ds-file">{fileFor(pr)}</div>
          {pr.diff.map(([sign, line], i) => (
            <div key={i} className={`ds-line ${sign === '+' ? 'add' : sign === '-' ? 'del' : ''}`}>{sign} {line}</div>
          ))}
        </div>
        {timer}
        <Choices task={task} onAnswer={onAnswer} />
      </div>
    </AppWindow>
  )
}

function Coe({ task, onAnswer, timer }) {
  const { doc, field } = task
  return (
    <AppWindow icon="Q" tab={fill(UI.coe.tab, { title: doc.title })} url={UI.coe.url}>
      <div className="ds-card ds-doc">
        <div className="ds-app">{fill(UI.coe.app, { company: doc.company })}</div>
        <div className="ds-title">{fill(UI.coe.title, doc)}</div>
        <div className="ds-story">{doc.story}</div>
        <div className="ds-rule-line">{fill(UI.coe.rule, { rule: COE_RULES[0] })}</div>
        <div className="ds-field">{field}: <span className="ds-blank">________</span></div>
        {timer}
        <Choices task={task} onAnswer={onAnswer} />
      </div>
    </AppWindow>
  )
}

function ReplyAll({ task, onAnswer, timer }) {
  const { email } = task
  return (
    <AppWindow icon="📧" tab={UI.mail.tab} url={UI.mail.url}>
      <div className="ds-card">
        <div className="ds-app">{UI.mail.app}</div>
        <div className="ds-title">{email.subject}</div>
        <div className="ds-meta">
          <span>
            {UI.mail.from}<Avatar name={email.from} /> {email.from}{' '}
            {email.address && <span className="ds-address">{fill(UI.mail.address, email)}</span>}
          </span>
          <span>{fill(UI.mail.to, email)}</span>
        </div>
        {timer}
        <Choices task={task} onAnswer={onAnswer} />
      </div>
    </AppWindow>
  )
}

function Friday({ task, onAnswer, timer }) {
  const { deploy } = task
  return (
    <AppWindow icon="🚀" tab={UI.deploy.tab} url={UI.deploy.url}>
      <div className="ds-card">
        <div className="ds-app">{UI.deploy.app}</div>
        <div className="ds-title">{deploy.what}</div>
        <div className="ds-meta">
          <span>🕔 {deploy.when}</span>
          <span>{fill(UI.deploy.approvals, { n: deploy.approvals })}</span>
        </div>
        {timer}
        <Choices task={task} onAnswer={onAnswer} />
      </div>
    </AppWindow>
  )
}

function Poker({ task, onAnswer, timer }) {
  return (
    <AppWindow icon="🃏" tab={UI.poker.tab} url={UI.poker.url}>
      <div className="ds-card">
        <div className="ds-app">{UI.poker.app}</div>
        <div className="ds-title">&quot;{task.story}&quot;</div>
        <div className="ds-table">
          {UI.poker.team.map((name) => (
            <span key={name} className="ds-poker"><Avatar name={name} /> {task.team}</span>
          ))}
          <span className="ds-poker director"><Avatar name={UI.poker.director} /> 40</span>
        </div>
        {timer}
        <Choices task={task} onAnswer={onAnswer} />
      </div>
    </AppWindow>
  )
}

const CARDS = { spike: Spike, review: Review, coe: Coe, replyall: ReplyAll, friday: Friday, poker: Poker }
