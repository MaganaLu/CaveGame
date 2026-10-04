import { useEffect, useState } from 'react'

// All 2D UI is designed for a fixed low "virtual" resolution (PS1-era 640x360).
// Dreams render a 640x360 stage scaled by this factor; the HUD uses it as the
// --px CSS unit (one virtual pixel), so borders, fonts and shadows stay chunky.
export const STAGE_W = 640
export const STAGE_H = 360

const fit = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)

export default function useStageScale() {
  const [scale, setScale] = useState(fit)
  useEffect(() => {
    const onResize = () => setScale(fit())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}
