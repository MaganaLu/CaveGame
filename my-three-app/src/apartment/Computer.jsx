import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Interactable from '../interactions/Interactable'
import { useGameStore } from '../game/GameState'
import { PROP_FILES, useModel } from './models'

// "Low Poly PC" is modeled ~3 m wide with the screen facing +x; scale it to a
// desk and turn it to face the chair (-x)
const PC_SCALE = 0.25
const PC_OFFSET = [-0.2, 0.0275, -0.15]

// Beige PC on the desk. The screen glows green when quiet, flickers red with open
// incidents, and goes to white static while "greg" is screen sharing.
export default function Computer({ position }) {
  const screen = useRef()
  const light = useRef()
  const pc = useModel(PROP_FILES.pc)

  useFrame(({ clock }) => {
    const state = useGameStore.getState()
    // No power: dead black screen
    if (!state.home.power) {
      screen.current.emissiveIntensity = 0
      light.current.intensity = 0
      return
    }
    const t = clock.elapsedTime
    const alarm = state.incidents.length > 0
    const flicker = 0.85 + 0.15 * Math.sin(t * 60) * Math.sin(t * 7)
    const pulse = alarm ? 0.6 + 0.4 * Math.abs(Math.sin(t * 3)) : 1
    screen.current.emissive.set(alarm ? '#ff3b2f' : '#39ff88')
    screen.current.emissiveIntensity = 0.9 * flicker * pulse
    light.current.color.set(alarm ? '#ff4030' : '#40ffa0')
    light.current.intensity = 1.6 * flicker * pulse
  })

  return (
    <Interactable id="computer" position={position}>
      <primitive object={pc} position={PC_OFFSET} rotation-y={Math.PI} scale={PC_SCALE} />
      {/* Glowing panel fitted over the model's screen, facing -x toward the chair */}
      <mesh position={[-0.14, 0.365, -0.15]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[0.36, 0.26]} />
        <meshStandardMaterial ref={screen} color="#081008" emissive="#39ff88" />
      </mesh>
      <pointLight ref={light} position={[-0.8, 0.4, -0.15]} distance={4} decay={2} />
    </Interactable>
  )
}
