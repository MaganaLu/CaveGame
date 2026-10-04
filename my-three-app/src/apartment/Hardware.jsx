import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import Interactable from '../interactions/Interactable'
import { useGameStore } from '../game/GameState'

// The other places you fix prod from: a laptop on the kitchen counter (a second
// terminal, on battery) and a server rack in the bathroom (hardware steps).
// Low-poly boxes, like the rest of the greybox apartment.

const LED_ROWS = 6

// Laptop, lid open, screen glowing when something is on fire
export function Laptop({ position, rotation = 0 }) {
  const screen = useRef()
  useFrame(() => {
    const s = useGameStore.getState()
    const alarm = s.incidents.length > 0
    screen.current.emissiveIntensity = alarm ? 0.9 + Math.sin(performance.now() / 180) * 0.3 : 0.35
  })
  return (
    <Interactable id="laptop" position={position} rotation-y={rotation}>
      {/* Base */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.36, 0.024, 0.25]} />
        <meshStandardMaterial color="#2c2f36" />
      </mesh>
      {/* Lid, tilted back */}
      <group position={[0, 0.024, -0.12]} rotation-x={-0.35}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.36, 0.24, 0.015]} />
          <meshStandardMaterial color="#2c2f36" />
        </mesh>
        <mesh position={[0, 0.12, 0.009]}>
          <planeGeometry args={[0.32, 0.2]} />
          <meshStandardMaterial ref={screen} color="#0c1a14" emissive="#4fd08a" emissiveIntensity={0.35} />
        </mesh>
      </group>
      {/* Bigger invisible hitbox; the laptop is small */}
      <mesh position={[0, 0.12, -0.02]}>
        <boxGeometry args={[0.5, 0.3, 0.35]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </Interactable>
  )
}

// RESTART EVERYTHING: a big red lever bolted to the side of the rack. Swings
// down while everything reboots.
function Lever() {
  const arm = useRef()
  useFrame(() => {
    const down = useGameStore.getState().reboot !== null
    const target = down ? 0.9 : -0.6
    arm.current.rotation.x += (target - arm.current.rotation.x) * 0.25
  })
  return (
    <Interactable id="lever">
      <group position={[-0.31, 1.15, 0.1]}>
        {/* Mounting plate with hazard stripes (yellow/black boxes) */}
        <mesh position={[-0.01, 0, 0]}>
          <boxGeometry args={[0.02, 0.36, 0.22]} />
          <meshStandardMaterial color="#f2cd54" />
        </mesh>
        {[-0.12, 0, 0.12].map((y) => (
          <mesh key={y} position={[-0.021, y, 0]} rotation-x={0.6}>
            <boxGeometry args={[0.005, 0.05, 0.3]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))}
        <group ref={arm} position={[-0.04, 0, 0]}>
          <mesh position={[-0.02, 0.14, 0]}>
            <boxGeometry args={[0.03, 0.28, 0.03]} />
            <meshStandardMaterial color="#888" metalness={0.6} />
          </mesh>
          <mesh position={[-0.02, 0.3, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#d91515" emissive="#ff2020" emissiveIntensity={0.6} />
          </mesh>
        </group>
        {/* Generous hitbox */}
        <mesh position={[-0.08, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.5, 0.3]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </Interactable>
  )
}

// 19" rack: dark cabinet, a column of status LEDs that blink red while a
// hardware step is waiting, and the Big Red Lever on its side
export function ServerRack({ position, rotation = 0 }) {
  const leds = useRef([])
  useFrame(() => {
    const s = useGameStore.getState()
    const waiting = s.incidents.some((i) => i.awaitingRack)
    const t = performance.now() / 1000
    leds.current.forEach((m, i) => {
      if (!m) return
      const on = waiting ? Math.sin(t * 9 + i) > 0 : Math.sin(t * 2.3 + i * 1.7) > -0.6
      m.emissive.set(waiting ? '#ff3030' : '#40ff70')
      m.emissiveIntensity = on ? 2 : 0.1
    })
  })
  return (
    <Interactable id="rack">
      <RigidBody type="fixed" colliders={false} position={position} rotation-y={rotation}>
        <CuboidCollider args={[0.3, 0.9, 0.3]} position={[0, 0.9, 0]} />
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.6, 1.8, 0.6]} />
          <meshStandardMaterial color="#1b1d22" />
        </mesh>
        {/* Rack units */}
        {Array.from({ length: LED_ROWS }, (_, i) => (
          <group key={i} position={[0, 0.35 + i * 0.24, 0.302]}>
            <mesh>
              <boxGeometry args={[0.52, 0.16, 0.01]} />
              <meshStandardMaterial color="#2e323a" />
            </mesh>
            <mesh position={[0.2, 0, 0.008]}>
              <boxGeometry args={[0.03, 0.03, 0.01]} />
              <meshStandardMaterial ref={(m) => (leds.current[i] = m)} color="#111" emissive="#40ff70" />
            </mesh>
          </group>
        ))}
      </RigidBody>
    </Interactable>
  )
}

// Rack plus its lever (separate interactables, same spot)
export function ServerRackWithLever({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <ServerRack position={[0, 0, 0]} />
      <Lever />
    </group>
  )
}
