import { useGameStore } from '../game/GameState'
import { formatScore } from '../ui/format'
import { modMultiplier } from '../game/shifts'
import { PERFECT_WAKE_BONUS, YANKED_KEEP } from './dreams'
import DreamSprint from './DreamSprint'
import useStageScale, { STAGE_W, STAGE_H } from '../psx/useStageScale'
import './dreams.css'

// The Dream Sprint, on a fixed 640x360 PS1 stage scaled up: the bank and its
// multiplier up top, the task in the middle, and the pager bleeding in as it gets
// close. W wakes you up and banks it.
export default function DreamScreen() {
  const dream = useGameStore((s) => s.dream)
  const warning = useGameStore((s) => s.dreamWarning)
  const modMult = modMultiplier(useGameStore((s) => s.mods))
  const wakeUp = useGameStore((s) => s.wakeUp)
  const scale = useStageScale()
  if (!dream) return null

  const bank = Math.round(dream.bank * modMult)
  return (
    <div className={`dream dream-warn-${warning}`} style={{ '--px': `${scale}px` }}>
      <div className="dream-bg" />

      <div className="psx-stage" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        <div className="ff-window dream-status">
          <div>
            <div className="dream-label">💤 DREAM SPRINT · NAILED {dream.cleared}</div>
            <div className="dream-title">YOU ARE ON CALL IN YOUR SLEEP</div>
          </div>
          <div className="dream-intro">
            Every task you nail goes in the bank. Wake up to keep it. If the pager wakes you, you keep {Math.round(YANKED_KEEP * 100)}%.
          </div>
          <div className="dream-reward">
            <div className="dream-count">💤 {formatScore(bank)}</div>
            <div className="dream-mult">×{dream.mult.toFixed(2)}</div>
          </div>
          <button className={`dream-wake ${warning === 2 ? 'perfect' : ''}`} onClick={wakeUp}>
            [W] {warning === 2 ? `WAKE NOW · ×${PERFECT_WAKE_BONUS}` : 'WAKE UP'}
          </button>
        </div>

        <DreamSprint key={dream.id} />

        {warning > 0 && <div className="dream-bzzt">{warning === 1 ? 'bzzt...' : 'BZZZZZT'}</div>}
      </div>

      <div className="dream-dither" />
    </div>
  )
}
