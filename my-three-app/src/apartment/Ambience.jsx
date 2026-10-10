import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, PHASE, isAsleep } from '../game/GameState'
import { setAmbience } from '../game/audio'

// Background sounds placed in the apartment: louder the closer you are (walls
// ignored, falls off over a few meters). Quiet when asleep or outside a night.
const SOURCES = {
  fridge: [new THREE.Vector3(-4.6, 1.0, 3.1), 5],
  clock: [new THREE.Vector3(4.93, 1.9, -3.6), 5],
  drip: [new THREE.Vector3(2.4, 0.9, 7.25), 4],
}
const position = new THREE.Vector3()

export default function Ambience() {
  const last = useRef(0)
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current < 0.2) return
    last.current = clock.elapsedTime
    const s = useGameStore.getState()
    const awake = s.phase === PHASE.APARTMENT || s.phase === PHASE.INCIDENT
    camera.getWorldPosition(position)
    const levels = {}
    for (const [name, [at, reach]] of Object.entries(SOURCES)) {
      const near = Math.max(0, 1 - position.distanceTo(at) / reach)
      levels[name] = awake && !isAsleep(s) && s.home.power !== false ? near * near : 0
    }
    // The fridge hums on mains power only; the clock and the tap don't care
    if (awake && !isAsleep(s)) {
      levels.clock = Math.max(0, 1 - position.distanceTo(SOURCES.clock[0]) / SOURCES.clock[1]) ** 2
      levels.drip = Math.max(0, 1 - position.distanceTo(SOURCES.drip[0]) / SOURCES.drip[1]) ** 2
    }
    setAmbience(levels)
  })
  return null
}
