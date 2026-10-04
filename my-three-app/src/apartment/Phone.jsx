import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Interactable from '../interactions/Interactable'
import { useGameStore, isRinging } from '../game/GameState'

// Low-poly phone on the nightstand. Vibrates and flashes while an alert is unanswered;
// hidden while the player is carrying it.
export default function Phone({ position }) {
  const group = useRef()
  const body = useRef()
  const screen = useRef()
  const light = useRef()

  useFrame(({ clock }) => {
    const s = useGameStore.getState()
    group.current.visible = !s.hasPhone
    const ringing = isRinging(s)
    const t = clock.elapsedTime

    // Buzz in bursts, matching the audio pattern
    const burst = ringing && t % 1.6 < 0.8
    body.current.position.x = burst ? (Math.random() - 0.5) * 0.008 : 0
    body.current.rotation.y = burst ? (Math.random() - 0.5) * 0.06 : 0

    const flash = ringing ? 0.6 + 0.4 * Math.sin(t * 10) : 0.02
    screen.current.color.set(ringing ? '#ff2a2a' : '#5aa0ff')
    screen.current.emissive.set(ringing ? '#ff2020' : '#3080ff')
    screen.current.emissiveIntensity = flash * 2
    light.current.color.set(ringing ? '#ff3030' : '#4080ff')
    light.current.intensity = flash * 1.5
  })

  return (
    <Interactable id="phone" position={position}>
      <group ref={group}>
        <group ref={body}>
          <mesh>
            <boxGeometry args={[0.08, 0.012, 0.16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0.0065, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.07, 0.145]} />
            <meshStandardMaterial ref={screen} color="#111" emissive="#000" />
          </mesh>
        </group>
        <pointLight ref={light} position={[0, 0.15, 0]} distance={2} decay={2} intensity={0} />
        {/* The phone is tiny; an invisible-but-raycastable box makes it easy to aim at */}
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </Interactable>
  )
}
