import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import Interactable from '../interactions/Interactable'
import { useGameStore } from '../game/GameState'
import { PROP_FILES, useModel } from './models'

// Low-poly props from public/assets/models/misc (loaders in models.js).
// Most are authored in meters; the PC is scaled down (see Computer.jsx).

export function Model({ file, ...props }) {
  const model = useModel(file)
  return <primitive object={model} {...props} />
}

// ------------------------------------------------------------------ wall clock
// Shows the game time
export function WallClock(props) {
  const model = useModel(PROP_FILES.clock)
  const arms = useMemo(() => ({
    hours: model.getObjectByName('clock_2_arm_hours'),
    minutes: model.getObjectByName('clock_2_arm_minutes'),
  }), [model])

  useFrame(() => {
    const s = useGameStore.getState()
    const total = (23 * 60 + s.gameTime) % (12 * 60)
    const minutes = total % 60
    // Clockwise seen from the front (+z) is negative rotation about z
    arms.minutes.rotation.z = -(minutes / 60) * Math.PI * 2
    arms.hours.rotation.z = -((total / 60) % 12) / 12 * Math.PI * 2
  })
  return <primitive object={model} {...props} />
}

// ------------------------------------------------------------------ flashlight
// Sits on the kitchen counter until you pick it up; then F toggles a beam
export function FlashlightPickup(props) {
  const taken = useGameStore((s) => s.hasFlashlight)
  if (taken) return null
  return (
    <Interactable id="flashlight" {...props}>
      <Model file={PROP_FILES.flashlight} />
      {/* Generous invisible hitbox; the model is small */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </Interactable>
  )
}

// ------------------------------------------------------------------ furniture
// Double bed: headboard at the model's -z end, against the bedroom's north wall.
// One simple box collider instead of nine mesh colliders.
export function Bed() {
  return (
    <Interactable id="bed">
      <RigidBody type="fixed" colliders={false} position={[1.5, 0, -6.9]}>
        <CuboidCollider args={[1.0, 0.32, 1.25]} position={[0.06, 0.32, 0.73]} />
        <Model file={PROP_FILES.bed} />
      </RigidBody>
    </Interactable>
  )
}

// Your partner, asleep on the left side of the bed: a lump under the blanket and
// a tuft of hair. Breathes slowly; tosses and turns as their patience runs out,
// and pulls the blanket over their head once you're on the couch.
export function Partner() {
  const body = useRef()
  const head = useRef()
  useFrame(({ clock }) => {
    const s = useGameStore.getState()
    const t = clock.elapsedTime
    const restless = 1 - s.patience / 100
    body.current.scale.y = 1 + Math.sin(t * 1.4) * 0.05
    body.current.rotation.z = Math.sin(t * 9) * 0.06 * restless * restless
    head.current.visible = !s.onCouch
  })
  return (
    // Sunk into the blanket (mattress top ~0.8 m), head on the left pillows. A
    // lying capsule in the blanket's colors reads as "someone under the covers".
    <group position={[1.05, 0.84, -5.8]}>
      <mesh ref={body} rotation-x={Math.PI / 2} scale={[1, 1, 0.55]}>
        <capsuleGeometry args={[0.22, 0.9, 3, 8]} />
        <meshStandardMaterial color="#c7d2e2" roughness={1} flatShading />
      </mesh>
      <mesh ref={head} position={[0, 0.16, -0.82]}>
        <sphereGeometry args={[0.13, 6, 5]} />
        <meshStandardMaterial color="#3a2a1e" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

// Office chair at the desk, facing the PC (+x). Its pivot is at seat height.
export function DeskChair() {
  return (
    <RigidBody type="fixed" colliders={false} position={[3.65, 0.45, -0.15]} rotation-y={Math.PI / 2}>
      <CuboidCollider args={[0.3, 0.45, 0.3]} position={[0, 0, 0]} />
      <Model file={PROP_FILES.chair} />
    </RigidBody>
  )
}

// ------------------------------------------------------------------ everything else
const Solid = ({ children, ...props }) => (
  <RigidBody type="fixed" colliders="cuboid" {...props}>
    {children}
  </RigidBody>
)

export default function Props() {
  return (
    <>
      {/* Living room rug, under the coffee table */}
      <Model file={PROP_FILES.carpet} position={[-1.8, 0.006, 1.25]} rotation-y={Math.PI / 2} scale={0.8} />

      {/* Moving boxes nobody ever unpacked: bedroom corner and desk room corner */}
      <Solid position={[-4.45, 0, -3.15]}><Model file={PROP_FILES.box} /></Solid>
      <Solid position={[-4.45, 0.37, -3.1]} rotation-y={0.3}><Model file={PROP_FILES.box} scale={0.85} /></Solid>
      <Solid position={[4.45, 0, 2.05]} rotation-y={-0.2}><Model file={PROP_FILES.box} /></Solid>

      {/* Bedroom wall clock (east wall, facing into the room) */}
      <WallClock position={[4.93, 1.9, -3.6]} rotation-y={-Math.PI / 2} scale={1.9} />

      {/* Outlets */}
      <Model file={PROP_FILES.outlet} position={[-0.45, 0.3, -7.44]} />
      <Model file={PROP_FILES.outlet} position={[4.94, 0.3, 1.15]} rotation-y={-Math.PI / 2} />
      <Model file={PROP_FILES.outlet} position={[-1.0, 1.1, 7.44]} rotation-y={Math.PI} />

      {/* Front door: padlocked (from the outside?) */}
      <Interactable id="door">
        <Model file={PROP_FILES.padlock} position={[-4.87, 1.17, -0.42]} rotation-y={Math.PI / 2} scale={1.4} />
      </Interactable>

      {/* Desk: the previous on-call engineer's notebook, and a floppy */}
      <Model file={PROP_FILES.notebook} position={[4.27, 0.752, 0.48]} rotation-y={0.4} />
      <Model file={PROP_FILES.floppy} position={[4.3, 0.752, -0.66]} rotation-y={-0.3} />

      <FlashlightPickup position={[-1.25, 0.9, 7.05]} rotation-y={0.6} />

      <Bed />
      <Partner />
      <DeskChair />
    </>
  )
}
