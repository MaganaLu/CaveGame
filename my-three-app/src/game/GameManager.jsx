import { useEffect } from 'react'
import { useGameStore } from './GameState'

const TICK_MS = 100
const SLOWMO_SCALE = 0.3 // CLUTCH saves slow the world down for a moment

// Drives the night: clock, incident timers, meters, scripted events.
// Runs outside the Canvas at a fixed 10Hz so React UI updates stay cheap.
// The world never pauses; reading the phone or the dashboard does not stop timers.
export default function GameManager() {
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      // Clamp so a backgrounded tab doesn't dump minutes of time in one tick
      let dt = Math.min((now - last) / 1000, 0.5)
      last = now
      const state = useGameStore.getState()
      if (now < state.slowmoUntil) dt *= SLOWMO_SCALE
      state.tick(dt)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const s = useGameStore.getState()
      const key = e.key.toLowerCase()
      // A ringing call from Greg takes priority over the pager
      const gregRinging = s.call?.status === 'ringing'
      if (key === 'q') gregRinging ? s.answerCall() : s.answerPhone('answer')
      if (key === 'x') gregRinging ? s.declineCall() : s.answerPhone('decline')
      if (['1', '2', '3'].includes(key) && s.call?.status === 'active') s.chooseCallOption(Number(key) - 1)
      if (key === 'f') s.toggleFlashlight()
      // Asleep: W wakes you up and banks the dream
      if (key === 'w' && (s.phase === 'SLEEPING' || s.phase === 'DREAM')) s.wakeUp()
      if (key === 'escape' && s.overlay) s.closeOverlay()
      if (s.overlay === 'sleepPrompt') {
        if (key === 'y') s.goToSleep()
        if (key === 'n') s.closeOverlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
