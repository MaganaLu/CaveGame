import { useEffect, useState } from 'react'
import { useGameStore, isRinging, isIncapacitated, PHASE, MAX_STRIKES } from '../game/GameState'
import { formatClock } from '../game/GameClock'
import { meterBar, formatScore, STAGE_COLORS, byUrgency } from './format'
import {
  streakMultiplier, secondsToOutage, STREAK_SECONDS, OUTAGE, BREACH_AFTER, CLUTCH_METER,
} from '../game/scoring'
import { hasMod, modIcons, modMultiplier } from '../game/shifts'
import useRollingNumber from './useRollingNumber'
import CallScreen from './CallScreen'

function usePointerLocked() {
  const [locked, setLocked] = useState(() => document.pointerLockElement === document.body)
  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement === document.body)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])
  return locked
}

function Toasts() {
  const toasts = useGameStore((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.slice(-4).map((t) => (
        <div key={t.id} className={`toast ff-window ${{ bad: 'danger', good: 'success' }[t.kind] ?? ''}`}>{t.text}</div>
      ))}
    </div>
  )
}

// After each fix: the grade, and what it paid. One letter, a few lines.
function ResolveCard() {
  const r = useGameStore((s) => (s.lastResolve && s.lastResolve.until > s.elapsed ? s.lastResolve : null))
  // Never cover a fix microgame you've already started
  const busy = useGameStore((s) => s.microgame !== null)
  if (!r || busy) return null
  return (
    <div className="resolve-card ff-window" key={r.id}>
      <div className={`grade-stamp grade-${r.grade}`}>{r.grade}</div>
      <div className="resolve-title">{r.lever ? 'RESTARTED (BIG RED LEVER)' : 'INCIDENT RESOLVED'}</div>
      <div className="resolve-sub">{r.title}</div>
      <div className="resolve-row"><span>GRADE {r.grade}</span><span>+{formatScore(r.base)}</span></div>
      {r.clutch > 0 && <div className="resolve-bonus"><span>CLUTCH · last 10%</span><span>+{formatScore(r.clutch)}</span></div>}
      {r.streakMult > 1 && <div className="resolve-row"><span>STREAK x{r.streak}</span><span>×{r.streakMult.toFixed(2)}</span></div>}
      {r.buffMult > 1 && <div className="resolve-row"><span>🍌 GOLDEN BANANA</span><span>×2</span></div>}
      {r.modMult > 1 && <div className="resolve-row"><span>SHIFT MODIFIERS</span><span>×{r.modMult.toFixed(2)}</span></div>}
      <div className="resolve-total"><span>TOTAL</span><span>+{formatScore(r.total)}</span></div>
    </div>
  )
}

// Woken mid-dream: the reward is gone
// How the nap ended: woke up on your own, perfect wake, or yanked by the pager
const WAKE_TITLES = {
  woke: ['NAP BANKED', 'You woke up on your own. Smart.'],
  perfect: ['PERFECT WAKE', 'Seconds before the pager. ×1.5'],
  yanked: ['YANKED AWAKE', 'The pager got you first. Half the bank.'],
}
function DreamResultCard() {
  const r = useGameStore((s) => (s.dreamResult && s.dreamResult.until > s.elapsed ? s.dreamResult : null))
  if (!r) return null
  const [title, sub] = WAKE_TITLES[r.kind]
  return (
    <div className={`dream-result ff-window ${r.kind === 'yanked' ? 'danger' : 'success'}`}>
      <div className="dream-result-title">{title}</div>
      <div>{sub}</div>
      <div className="dream-result-kept">💤 +{formatScore(r.kept)}</div>
    </div>
  )
}

// Every score change pops up mid-screen: gains fly up into the score counter,
// losses drop away in red. Several at once fan out instead of stacking.
function ScorePops() {
  const pops = useGameStore((s) => s.pops)
  return pops.map((p, i) => (
    <div
      key={p.id}
      className={`score-pop ${p.amount < 0 ? 'loss' : ''}`}
      style={{ '--fan': `${(i % 3) - 1}` }}
    >
      {p.amount >= 0 ? '+' : ''}{formatScore(p.amount)}
      <span className="score-pop-label">{p.label}</span>
    </div>
  ))
}

// Big center-screen callouts: streak tiers, CLUTCH
function Banners() {
  const banners = useGameStore((s) => s.banners)
  return (
    <div className="banners">
      {banners.map((b) => (
        <div key={b.id} className={`banner banner-${b.kind}`}>
          <div className="banner-text">{b.text}</div>
          <div className="banner-sub">{b.sub}</div>
        </div>
      ))}
    </div>
  )
}

// Every open incident, most urgent first, so you can juggle them from anywhere in
// the apartment. In the last 10% before OUTAGE it flashes CLUTCH: fix it now for
// the bonus.
const TRACKER_ROWS = 4

function IncidentTracker() {
  const incidents = useGameStore((s) => s.incidents)
  if (!incidents.length) return null
  const sorted = [...incidents].sort(byUrgency)
  const hidden = sorted.length - TRACKER_ROWS
  return (
    <div className="tracker ff-window">
      {sorted.slice(0, TRACKER_ROWS).map((inc) => {
        const outage = inc.stage === OUTAGE
        const clutch = inc.meter >= CLUTCH_METER && !outage
        const eta = secondsToOutage(inc)
        return (
          <div key={inc.uid} className={`tracker-row ${outage ? 'outage' : ''}`}>
            <span className={`tracker-icon ${inc.acknowledged ? '' : 'blink'}`}>{!inc.acknowledged ? '📳' : inc.awaitingRack ? '🔧' : '●'}</span>
            <span className="tracker-name">{inc.def.service}</span>
            <span className="tracker-bar" style={{ color: STAGE_COLORS[inc.stage] }}>{meterBar(inc.meter, 6)}</span>
            <span className="tracker-eta" style={{ color: STAGE_COLORS[inc.stage] }}>
              {outage
                ? `BREACH ${Math.max(0, Math.ceil(BREACH_AFTER - inc.outageTime))}s`
                : Number.isFinite(eta) ? `${Math.ceil(eta)}s` : '??'}
            </span>
            {clutch && <span className="tracker-stakes brink">CLUTCH!</span>}
          </div>
        )
      })}
      {hidden > 0 && <div className="tracker-more">+{hidden} more</div>}
    </div>
  )
}

// The streak's own timer: drains while incidents are open, a fix refills it,
// empty = the streak cools a step
const TIMER_BLOCKS = 12
function StreakTimer() {
  const left = useGameStore((s) => s.streakLeft)
  const working = useGameStore((s) => s.incidents.length > 0)
  const filled = Math.ceil((left / STREAK_SECONDS) * TIMER_BLOCKS)
  const low = left < STREAK_SECONDS * 0.25
  return (
    <div className={`hud-combo ${low && working ? 'low' : ''} ${working ? '' : 'paused'}`}>
      <span className="hud-combo-bar">
        {Array.from({ length: TIMER_BLOCKS }, (_, i) => (
          <span key={i} className={i < filled ? 'on' : ''} />
        ))}
      </span>
    </div>
  )
}

// One line under the score: streak, its multiplier, and its timer
function Streak() {
  const streak = useGameStore((s) => s.streak)
  if (streak < 2) return null
  return (
    <div className="hud-streak" key={streak}>
      <span className="hud-streak-count">🔥x{streak}</span>
      <span className="hud-streak-mult">×{streakMultiplier(streak).toFixed(2)}</span>
      <StreakTimer />
    </div>
  )
}

function SleepPrompt() {
  const goToSleep = useGameStore((s) => s.goToSleep)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  return (
    <div className="modal-backdrop">
      <div className="modal ff-window">
        <div className="modal-title">GO TO SLEEP?</div>
        <div className="modal-buttons">
          <button onClick={goToSleep}>[Y] Sleep</button>
          <button onClick={() => { closeOverlay(); document.body.requestPointerLock() }}>[N] Stay up</button>
        </div>
      </div>
    </div>
  )
}

// Warnings about the apartment, and the golden banana's time left
function Buffs() {
  const doubleUntil = useGameStore((s) => s.doubleUntil)
  const elapsed = useGameStore((s) => s.elapsed)
  const home = useGameStore((s) => s.home)
  const hasFlashlight = useGameStore((s) => s.hasFlashlight)
  const flashlightOn = useGameStore((s) => s.flashlightOn)
  const darkMod = useGameStore((s) => hasMod(s, 'dark'))
  const left = (until) => Math.ceil(until - elapsed)
  const chips = []
  if (!home.power) chips.push(['bad', '⚡ NO POWER · breaker in kitchen'])
  const dark = !home.power || darkMod
  if (dark && !hasFlashlight) chips.push(['bad', '🔦 flashlight on the kitchen counter'])
  if (hasFlashlight && !flashlightOn && dark) chips.push(['bad', '🔦 [F] FLASHLIGHT'])
  if (!home.wifi) chips.push(['bad', '📶 NO WI-FI · router in living room'])
  if (elapsed < doubleUntil) chips.push(['good', `🍌 ×2 SCORE ${left(doubleUntil)}s`])
  if (!chips.length) return null
  return (
    <div className="hud-buffs">
      {chips.map(([kind, text]) => (
        <div key={text.slice(0, 4)} className={`hud-chip ff-window ${kind === 'bad' ? 'danger' : 'success'}`}>{text}</div>
      ))}
    </div>
  )
}

// Stress at 100: you lose control for a few seconds
function Meltdown() {
  const active = useGameStore((s) => s.elapsed < s.meltdownUntil)
  if (!active) return null
  return (
    <div className="meltdown">
      <div className="meltdown-title">MELTDOWN</div>
      <div className="meltdown-sub">staring at the wall · rebooting yourself…</div>
    </div>
  )
}

export default function HUD() {
  const phase = useGameStore((s) => s.phase)
  const overlay = useGameStore((s) => s.overlay)
  const busy = overlay === 'computer' || overlay === 'rack' || overlay === 'lever'
  const gameTime = useGameStore((s) => s.gameTime)
  const stress = useGameStore((s) => s.stress)
  const target = useGameStore((s) => s.score)
  const score = useRollingNumber(target)
  const slowmo = useGameStore((s) => s.slowmoUntil) > performance.now()
  const prompt = useGameStore((s) => s.prompt)
  const hasPhone = useGameStore((s) => s.hasPhone)
  const ringing = useGameStore(isRinging)
  const justWoke = useGameStore((s) => s.elapsed - s.wakeAt < 1.2)
  const strikes = useGameStore((s) => s.stats.breached)
  const mods = useGameStore((s) => s.mods)
  const length = useGameStore((s) => s.length)
  const wave = useGameStore((s) => s.wave)
  const charges = useGameStore((s) => s.charges)
  const patience = useGameStore((s) => Math.round(s.patience))
  const onCouch = useGameStore((s) => s.onCouch)
  const leverGiven = useGameStore((s) => s.leverGiven)
  const rebooting = useGameStore((s) => s.reboot !== null)
  const elapsed = useGameStore((s) => s.elapsed)
  const incapacitated = useGameStore(isIncapacitated)
  const locked = usePointerLocked()

  const sleeping = phase === PHASE.SLEEPING
  const stressVignette = Math.max(0, stress - 50) / 50

  return (
    <>
      <div className="hud">
        <div className="vignette" style={{ opacity: 0.35 }} />
        <div className="vignette vignette-stress" style={{ opacity: stressVignette * 0.7 }} />
        {slowmo && <div className="slowmo" />}
        {rebooting && <div className="reboot-screen"><span className="blink">RESTARTING EVERYTHING…</span></div>}

        <div className="hud-clock ff-window">
          <div className="hud-time">{formatClock(gameTime)}</div>
          <div className="hud-sub">
            {wave ? (
              wave.status === 'active'
                ? <span className={phase === PHASE.INCIDENT ? 'red' : ''}>WAVE {wave.n}{wave.def.boss && ' · BOSS'}</span>
                : <span>NEXT WAVE {Math.max(0, Math.ceil(wave.breakUntil - elapsed))}s · 💤 nap = bonus</span>
            ) : phase === PHASE.INCIDENT ? <span className="blink red">● INCIDENT OPEN</span> : 'ON CALL'}
          </div>
        </div>

        <div className="hud-score ff-window">
          <span className="hud-label">SCORE</span> <span className="hud-score-num" key={target}>{formatScore(score)}</span>
          <div className="hud-strikes" title="SLA breaches: 3 and you're fired">
            {Array.from({ length: MAX_STRIKES }, (_, i) => (i < strikes ? '❌' : '⬜')).join(' ')}
          </div>
          {leverGiven && (
            <div className="hud-charges" title="Big Red Lever charges (server rack)">{charges > 0 ? '🧨'.repeat(charges) : '🧨×0'}</div>
          )}
          {(mods.length > 0 || length !== 'story') && (
            <div className="hud-mods">
              {length !== 'story' && `${length.toUpperCase()} `}
              {mods.length > 0 && `${modIcons(mods)} ×${modMultiplier(mods).toFixed(2)}`}
            </div>
          )}
        </div>
        <div className="hud-left">
          <IncidentTracker />
          <Buffs />
        </div>

        <div className="hud-meters ff-window">
          <div>
            STRESS <span className={`bar ${stress > 70 ? 'red' : ''}`}>{meterBar(stress)}</span>
          </div>
          {/* Shows up once the phone has woken them at least once */}
          {onCouch ? (
            <div className="red">🛋️ ON THE COUCH</div>
          ) : patience < 100 && (
            <div>
              PARTNER <span className={`bar ${patience < 30 ? 'red' : ''}`}>{meterBar(patience)}</span>
            </div>
          )}
        </div>

        {!overlay && !sleeping && !incapacitated && (
          <>
            <div className="crosshair" />
            {prompt && <div className="prompt ff-window">▶ [E] {prompt}</div>}
            {!locked && <div className="lock-hint">CLICK TO LOOK AROUND</div>}
          </>
        )}

        <div className="hud-phone">
          {!hasPhone && ringing && !sleeping && <span className="blink red">📳 BZZZT — your phone is on the nightstand</span>}
        </div>

        <Streak />

        {overlay === 'sleepPrompt' && <SleepPrompt />}

        {sleeping && (
          <div className="sleep-screen">
            <div className="zzz">z z z</div>
            <div className="sleep-clock">{formatClock(gameTime)}</div>
          </div>
        )}

        {justWoke && <div className="wake-glitch">BZZZZZZZZZZZZT</div>}
        <Meltdown />
      </div>

      {/* Sibling of .hud so it stacks above the computer and phone, where you score */}
      {/* At a screen (PC, rack, lever) the calls and notes move to a rail on the
          right so they never cover what you're working on */}
      <div className={`hud-top ${busy ? 'busy' : ''}`}>
        <ResolveCard />
        <ScorePops />
        <Banners />
        <CallScreen />
        <DreamResultCard />
        <Toasts />
      </div>
    </>
  )
}
