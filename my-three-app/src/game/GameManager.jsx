import { useEffect } from 'react'
import { useGameStore, PHASE, isIncapacitated } from './GameState'
import { pressed } from './controls'
import { updateMusic } from './audio'

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
      updateMusic(useGameStore.getState())
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Getting the mouse back. ESC always frees the mouse (the browser does that),
  // and the browser only lets us take it back on a click or a key press, never
  // on ESC itself. So: any key in the apartment re-captures it, and C (rebindable) closes a
  // screen and puts you straight back in control (ESC still works, but then the
  // mouse is gone until the next key press).
  useEffect(() => {
    const relock = (retry = true) => {
      if (document.pointerLockElement === document.body) return
      // Chrome refuses for about a second after the mouse was released; the key
      // press still counts as permission for a few seconds, so try once more
      document.body.requestPointerLock()?.catch?.(() => {
        if (retry) setTimeout(() => relock(false), 1100)
      })
    }
    // Capture phase: runs before anything else that listens for keys
    const onKeyCapture = (e) => {
      if (!pressed(e, 'close') || e.repeat) return
      const s = useGameStore.getState()
      // Not mid-microgame: there, C is a letter you're typing
      if (['computer', 'rack', 'lever'].includes(s.overlay) && !s.microgame) {
        e.stopPropagation()
        s.closeOverlay()
        relock()
      }
    }
    // Any other key press while walking around takes the mouse back
    const onKeyDown = (e) => {
      const s = useGameStore.getState()
      const playing = s.phase === PHASE.APARTMENT || s.phase === PHASE.INCIDENT
      if (e.key !== 'Escape' && playing && !s.overlay && !isIncapacitated(s)) relock()
    }
    window.addEventListener('keydown', onKeyCapture, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyCapture, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const s = useGameStore.getState()
      const key = e.key.toLowerCase()
      // Asleep, only the wake key counts (it shares W with walking by default)
      if (s.phase === 'SLEEPING' || s.phase === 'DREAM') {
        if (pressed(e, 'wake')) s.wakeUp()
        return
      }
      // A ringing call from Greg takes priority over the pager
      const gregRinging = s.call?.status === 'ringing'
      if (pressed(e, 'answer')) gregRinging ? s.answerCall() : s.answerPhone('answer')
      if (pressed(e, 'decline')) gregRinging ? s.declineCall() : s.answerPhone('decline')
      if (['1', '2', '3'].includes(key) && s.call?.status === 'active') s.chooseCallOption(Number(key) - 1)
      if (pressed(e, 'flashlight')) s.toggleFlashlight()
      if (key === 'escape' && s.overlay) s.closeOverlay()
      if (s.overlay === 'sleepPrompt') {
        if (pressed(e, 'yes')) s.goToSleep()
        if (pressed(e, 'no')) s.closeOverlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
