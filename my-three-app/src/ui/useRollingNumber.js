import { useEffect, useRef, useState } from 'react'

// Arcade score counter: rolls toward the target instead of jumping
export default function useRollingNumber(target, duration = 700) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  const shown = useRef(target)

  useEffect(() => {
    from.current = shown.current
    const start = performance.now()
    let raf
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      shown.current = Math.round(from.current + (target - from.current) * eased)
      setValue(shown.current)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
