import { useEffect } from 'react'

// Calls onExpire when `deadline` (performance.now() ms) passes, while active.
// Replaces polling a clock every 100ms.
export default function useDeadline(deadline, active, onExpireRef) {
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => onExpireRef.current(null), Math.max(0, deadline - performance.now()))
    return () => clearTimeout(id)
  }, [deadline, active, onExpireRef])
}
