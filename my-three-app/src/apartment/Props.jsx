import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import Interactable from '../interactions/Interactable'
import { useGameStore } from '../game/GameState'
import { PROP_FILES, useModel } from './models'
import * as THREE from 'three'
import { makeRng } from '../game/rng'

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
  const arms = useMemo(() => {
    const hours = model.getObjectByName('clock_2_arm_hours')
    const minutes = model.getObjectByName('clock_2_arm_minutes')
    // The hands sit 1-2 mm off the face in the model: nudge them forward and
    // depth-bias them, or the PS1 vertex snapping makes them flicker into it
    for (const arm of [hours, minutes]) {
      arm.position.z += 0.004
      arm.traverse((o) => {
        if (!o.isMesh) return
        o.material = o.material.clone()
        Object.assign(o.material, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })
      })
    }
    return { hours, minutes }
  }, [model])

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

// ------------------------------------------------------------------ sofa
// The living room couch (also your bed, once you're sent to it). The model is
// ~18 units long and faces +x; scaled to SOFA_LENGTH and centered with its feet
// on the floor. `turn` π faces it west.
const SOFA_LENGTH = 1.72
export function Sofa({ position, turn = 0 }) {
  const model = useModel(PROP_FILES.sofa)
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    return { scale: SOFA_LENGTH / Math.max(size.x, size.z), offset: [-c.x, -box.min.y, -c.z] }
  }, [model])
  return (
    <group position={position} rotation-y={turn} scale={scale}>
      <primitive object={model} position={offset} />
    </group>
  )
}

// ------------------------------------------------------------------ fitted furniture
// A model stretched to an exact size [w, h, d] in meters (each axis on its own,
// measured before `turn`), centered on x/z with its bottom at `position`. Handy
// for furniture that has to match a gameplay footprint (the table top height
// bananas sit on, the desk the PC sits on).
export function Fit({ file, size, position, turn = 0, solid = false }) {
  const source = useModel(file)
  const [w, h, d] = size
  // Measured on a fresh, detached copy: measuring the copy already in the scene
  // would include the scale applied below and stretch it more on every re-render
  const { model, scale, offset } = useMemo(() => {
    const m = source.clone(true)
    const box = new THREE.Box3().setFromObject(m)
    const s = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    return { model: m, scale: [w / s.x, h / s.y, d / s.z], offset: [-c.x, -box.min.y, -c.z] }
  }, [source, w, h, d])
  const body = (
    <group position={position} rotation-y={turn}>
      <group scale={scale}>
        <primitive object={model} position={offset} />
      </group>
    </group>
  )
  return solid ? <RigidBody type="fixed" colliders="trimesh">{body}</RigidBody> : body
}

// ------------------------------------------------------------------ living room rug
// Thin (8 mm) and lying on the floor's huge triangles, which the PS1 vertex
// snapping jiggles in depth: lifted 2 cm and depth-biased so the floor never
// flickers through it
function Rug({ position }) {
  const model = useModel(PROP_FILES.carpet)
  useMemo(() => {
    model.traverse((o) => {
      if (!o.isMesh) return
      o.material = o.material.clone()
      Object.assign(o.material, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })
    })
  }, [model])
  return <primitive object={model} position={position} rotation-y={Math.PI / 2} scale={0.8} />
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
    <RigidBody type="fixed" colliders={false} position={[3.5, 0.45, -0.95]} rotation-y={Math.PI / 2}>
      <CuboidCollider args={[0.3, 0.45, 0.3]} position={[0, 0, 0]} />
      <Model file={PROP_FILES.chair} />
    </RigidBody>
  )
}

// ------------------------------------------------------------------ everything else
// ------------------------------------------------------------------ banana clutter
// Plain bananas left around the apartment (the glowing, spinning one is the golden
// pickup, HomeSystems.jsx). Each night picks a few of these spots, seeded, so a
// daily shift looks the same for everyone. Spots are [x, surface height, z], kept
// clear of everything you interact with.
const BANANA_SPOTS = [
  [-4.65, 2.0, -4.75], // on top of the wardrobe
  [-3.6, 0, -3.7], // bedroom floor, by the boxes
  [2.0, 0.85, -5.3], // on the bed, by your feet
  [-1.65, 0.4, 1.25], // coffee table
  [-1.5, 0.4, 1.85], // coffee table
  [-0.65, 0.41, 1.5], // couch seat, between the pillows
  [-3.3, 0, 0.9], // living room floor
  [4.25, 0.75, -2.05], // desk, by the lamp
  [2.3, 0, -2.3], // desk room floor
  [-2.75, 0.9, 7.0], // kitchen counter
  [-4.6, 1.9, 3.1], // on top of the fridge
  [-1.1, 0, 5.0], // kitchen floor
  [4.3, 0.1, 5.4], // in the tub
  [-0.75, 1.8, -2.27], // on top of the living-room bookshelf
  [0.6, 1.4, 2.27], // on top of the desk-room bookcase
]
const CLUTTER_COUNT = 7
const CLUTTER_SIZE = 0.2

// A plain banana, `length` m long, resting on `position` (also the banana pyramid)
export function DecorBanana({ position, turn, tilt = 0, length = CLUTTER_SIZE }) {
  const model = useModel(PROP_FILES.banana)
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const s = length / Math.max(size.x, size.y, size.z)
    // Centered, then lifted so it rests on the surface
    return { scale: s, offset: [-center.x, -center.y + size.y / 2, -center.z] }
  }, [model, length])
  return (
    <group position={position} rotation={[0, turn, tilt]} scale={scale}>
      <primitive object={model} position={offset} />
    </group>
  )
}

function BananaClutter() {
  const seed = useGameStore((s) => s.seed)
  const picks = useMemo(() => {
    const rng = makeRng((seed ^ 0xba7a7a) >>> 0)
    return rng.shuffle(BANANA_SPOTS).slice(0, CLUTTER_COUNT).map((p) => ({ p, turn: rng.next() * Math.PI * 2 }))
  }, [seed])
  return picks.map(({ p, turn }) => <DecorBanana key={p.join()} position={p} turn={turn} />)
}

const Solid = ({ children, ...props }) => (
  <RigidBody type="fixed" colliders="cuboid" {...props}>
    {children}
  </RigidBody>
)

export default function Props() {
  return (
    <>
      {/* Living room rug, under the coffee table */}
      <Rug position={[-1.8, 0.02, 1.25]} />

      {/* Moving boxes nobody ever unpacked: bedroom corner and desk room corner */}
      <Solid position={[-4.45, 0, -3.15]}><Model file={PROP_FILES.box} /></Solid>
      <Solid position={[-4.45, 0.37, -3.1]} rotation-y={0.3}><Model file={PROP_FILES.box} scale={0.85} /></Solid>
      <Solid position={[4.45, 0, 1.92]} rotation-y={-0.2}><Model file={PROP_FILES.box} /></Solid>

      {/* Bedroom wall clock (east wall, facing into the room) */}
      {/* 4 cm deep from its front: at x 4.905 its back clears the wall face (4.95) */}
      <WallClock position={[4.905, 1.9, -3.6]} rotation-y={-Math.PI / 2} scale={1.9} />

      {/* Outlets */}
      <Model file={PROP_FILES.outlet} position={[-0.45, 0.3, -7.44]} />
      <Model file={PROP_FILES.outlet} position={[4.94, 0.3, 1.15]} rotation-y={-Math.PI / 2} />
      <Model file={PROP_FILES.outlet} position={[-1.0, 1.1, 7.44]} rotation-y={Math.PI} />

      {/* Front door: padlocked (from the outside?) */}
      <Interactable id="door">
        <Model file={PROP_FILES.padlock} position={[-4.87, 1.17, -0.42]} rotation-y={Math.PI / 2} scale={1.4} />
      </Interactable>

      {/* Desk: the previous on-call engineer's notebook, and a floppy */}
      <Model file={PROP_FILES.notebook} position={[4.55, 0.752, -1.55]} rotation-y={0.4} />
      <Model file={PROP_FILES.floppy} position={[4.25, 0.752, -1.6]} rotation-y={-0.3} />

      <FlashlightPickup position={[-1.75, 0.9, 7.05]} rotation-y={0.6} />

      {/* It's the Banana Plantation: bananas everywhere, different ones every night */}
      <BananaClutter />

      <Bed />
      <Partner />
      <DeskChair />
    </>
  )
}
