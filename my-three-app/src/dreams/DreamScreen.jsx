import { useGameStore } from '../game/GameState'
import { formatScore } from '../ui/format'
import { modMultiplier } from '../game/shifts'
import { hazardAt, FUSE_JITTER } from './dreams'
import DreamSprint from './DreamSprint'
import useStageScale, { STAGE_W, STAGE_H } from '../psx/useStageScale'
import './dreams.css'
import { fill } from '../game/text'
import { text } from '../content'

const T = text('ui').dream

// The Dream Sprint, on a fixed 640x360 PS1 stage scaled up: the bank up top, the
// task in the middle. When a page comes in the pager rings *in the dream* (LET IT
// RING): hazard pay climbs every beat and the wake button shows what you'd keep.
// The escalation bar hints at the fuse, wobbling so it can't be timed exactly
// (story shifts show it straight for the first few rings). W wakes you up.
export default function DreamScreen() {
  const dream = useGameStore((s) => s.dream)
  const ring = useGameStore((s) => s.dreamRinging)
  const elapsed = useGameStore((s) => s.elapsed)
  const story = useGameStore((s) => s.length === 'story')
  const modMult = modMultiplier(useGameStore((s) => s.mods))
  const wakeUp = useGameStore((s) => s.wakeUp)
  const scale = useStageScale()
  if (!dream) return null

  const bank = Math.round(dream.bank * modMult)
  const ringFor = ring ? elapsed - ring.since : 0
  const hazard = ring ? hazardAt(ringFor) : 1
  return (
    <div className={`dream ${ring ? 'dream-ringing' : ''}`} style={{ '--px': `${scale}px` }}>
      <div className="dream-bg" />

      <div className="psx-stage" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        <div className="ff-window dream-status">
          <div>
            <div className="dream-label">{fill(T.label, { n: dream.cleared })}</div>
            <div className="dream-title">{T.title}</div>
          </div>
          <div className="dream-intro">
            {T.intro}
          </div>
          <div className="dream-reward">
            <div className="dream-count">💤 {formatScore(bank)}</div>
            <div className="dream-mult">×{dream.mult.toFixed(2)}</div>
          </div>
          <button className={`dream-wake ${ring ? 'cash' : ''}`} onClick={wakeUp}>
            {ring ? fill(T.cashOut, { kept: formatScore(Math.round(bank * hazard)) }) : fill(T.wake)}
          </button>
        </div>

        <DreamSprint key={dream.id} />

        {ring && <HazardPay ring={ring} ringFor={ringFor} hazard={hazard} story={story} />}
      </div>

      <div className="dream-dither" />
    </div>
  )
}

// The pager, ringing in the dream: hazard pay (re-keyed every beat so it pops) and
// the escalation bar. The bar wobbles around the truth, so it hints at the fuse
// without giving away the moment; story shifts show it straight at first.
function HazardPay({ ring, ringFor, hazard, story }) {
  const truth = Math.min(1, ringFor / ring.fuse)
  const wobble = ring.fuseShown ? 0 : FUSE_JITTER * Math.sin(ringFor * 7.3) * Math.sin(ringFor * 2.1 + 1)
  const fill_ = Math.max(0.03, Math.min(0.97, truth + wobble))
  return (
    <>
      <div className="dream-hazard">
        <div className="dream-hazard-label">{T.ringing}</div>
        <div className="dream-hazard-mult" key={ring.beats}>×{hazard.toFixed(2)}</div>
        <div className="dream-fuse">
          <span>{T.escalation}</span>
          <span className="dream-fuse-bar"><span style={{ width: `${fill_ * 100}%` }} /></span>
        </div>
      </div>
      <div className="dream-phone">📱</div>
      {story && <div className="dream-sign-caption">{fill(T.ringCaption)}</div>}
    </>
  )
}
