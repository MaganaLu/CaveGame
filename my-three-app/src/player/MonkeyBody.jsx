import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { PROP_FILES } from '../apartment/models'
import { useGameStore, PHASE } from '../game/GameState'
import { pressed } from '../game/controls'

// You: the monkey. "Main Monkey - VR" (Victor Karlsson, CC-BY, via Poly Pizza) is
// an OBJ conversion with no skeleton, but it's built PS1-style from 97 separate
// rigid pieces (upper arm, forearm, fingers, thigh, shin, feet, head…). So the rig
// is built here: a joint (Object3D) at each shoulder, elbow, wrist, hip, knee and
// the neck, and every piece re-parented to the joint it belongs to. Rotating a
// joint moves everything below it, which is how PS1 characters were animated.
//
// First person: the body hangs off the player's yaw (it turns with you but doesn't
// tip when you look up/down), the head is hidden (the camera is in it), and you
// see your arms, belly, legs and feet when you look down. Animated in code: a walk
// cycle (faster when sprinting), idle breathing, and a reach when you interact.

// ------------------------------------------------------------------ the model's anatomy
// Points measured in the model's own space: it faces -x, +y up, its right side
// is -z. Feet bottom at y -1.12, eyes at (-0.27, 0.92, 0.04).
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const J = {
  pelvis: V(0.16, 0.0, 0.17),
  neck: V(-0.05, 0.6, 0.12),
  shoulderR: V(0.05, 0.5, 0.03), elbowR: V(0.03, 0.29, -0.32), wristR: V(-0.17, 0.62, -0.49),
  shoulderL: V(0.0, 0.49, 0.25), elbowL: V(-0.05, 0.38, 0.6), wristL: V(0.31, 0.02, 0.34),
  hipR: V(0.19, 0.01, 0.06), kneeR: V(0.12, -0.42, -0.02), ankleR: V(0.21, -1.06, -0.1),
  hipL: V(0.13, 0.0, 0.26), kneeL: V(0.02, -0.47, 0.3), ankleL: V(0.06, -1.12, 0.37),
}
const HEAD_CENTER = V(-0.1, 0.85, 0.08)
const EYES = V(-0.27, 0.92, 0.04)
const FEET_Y = -1.12
// The camera: at eye height, just in front of the (straightened) chest, so
// looking down shows your chest, belly, arms and feet like it would in real life
const VIEW_AHEAD = 0.08 // model units in front of the chest (~6 cm)

// The camera sits 0.8 m above the capsule's center (1.6 m eye level) and the feet
// at 0.8 m below it: scale the monkey so eyes-to-feet is 1.6 m
const EYE_HEIGHT = 1.6
const SCALE = EYE_HEIGHT / (EYES.y - FEET_Y)

// Which joint each piece hangs from: hands and feet by region, everything else by
// the nearest bone segment (or the head)
const SEGMENTS = [
  ['torso', J.pelvis, J.neck],
  ['upperR', J.shoulderR, J.elbowR], ['foreR', J.elbowR, J.wristR],
  ['upperL', J.shoulderL, J.elbowL], ['foreL', J.elbowL, J.wristL],
  ['thighR', J.hipR, J.kneeR], ['shinR', J.kneeR, J.ankleR],
  ['thighL', J.hipL, J.kneeL], ['shinL', J.kneeL, J.ankleL],
]
const segDistance = (p, a, b) => {
  const ab = b.clone().sub(a)
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1)
  return p.distanceTo(a.clone().addScaledVector(ab, t))
}
function partOf(c) {
  if (c.z < -0.36 && c.y > 0.55) return 'handR' // the peace sign
  if (c.x > 0.18 && c.y > -0.2 && c.y < 0.1 && c.z > 0.08) return 'handL' // behind the back
  if (c.y < -0.95) return c.z < 0.12 ? 'footR' : 'footL'
  if (c.y > 0.56) return 'head' // and the neck: right under the camera, it'd be a stump
  let best = ['head', Math.max(0, c.distanceTo(HEAD_CENTER) - 0.25)]
  for (const [name, a, b] of SEGMENTS) {
    const d = segDistance(c, a, b)
    if (d < best[1]) best = [name, d]
  }
  return best[0]
}

// The joint each part hangs from, and each joint's parent
const PART_JOINT = {
  torso: 'pelvis', head: 'neck',
  upperR: 'shoulderR', foreR: 'elbowR', handR: 'wristR',
  upperL: 'shoulderL', foreL: 'elbowL', handL: 'wristL',
  thighR: 'hipR', shinR: 'kneeR', footR: 'ankleR',
  thighL: 'hipL', shinL: 'kneeL', footL: 'ankleL',
}
const PARENT = {
  pelvis: null, neck: 'pelvis',
  shoulderR: 'pelvis', elbowR: 'shoulderR', wristR: 'elbowR',
  shoulderL: 'pelvis', elbowL: 'shoulderL', wristL: 'elbowL',
  hipR: 'pelvis', kneeR: 'hipR', ankleR: 'kneeR',
  hipL: 'pelvis', kneeL: 'hipL', ankleL: 'kneeL',
}

// Rest pose: the file's pose (one hand flashing a peace sign, the other behind
// the back) is turned into arms hanging relaxed at the sides. Model-space
// directions (forward is -x, right is -z).
const REST = {
  upperR: [J.shoulderR, J.elbowR, V(-0.12, -1, -0.22)],
  foreR: [J.elbowR, J.wristR, V(-0.55, -1, -0.12)],
  upperL: [J.shoulderL, J.elbowL, V(-0.12, -1, 0.22)],
  foreL: [J.elbowL, J.wristL, V(-0.55, -1, 0.12)],
}

function buildRig(scene) {
  const root = new THREE.Group()
  const joints = {}
  for (const name of Object.keys(PARENT)) {
    const j = new THREE.Object3D()
    j.name = name
    joints[name] = j
  }
  // Place joints in model space, nested: each one's local position is relative
  // to its parent joint
  for (const [name, parent] of Object.entries(PARENT)) {
    const j = joints[name]
    const at = J[name]
    if (parent) {
      j.position.copy(at).sub(J[parent])
      joints[parent].add(j)
    } else {
      j.position.copy(at)
      root.add(j)
    }
  }
  root.updateMatrixWorld(true)

  // Re-parent every piece to its joint, keeping where it is (attach keeps the
  // world transform). Pieces are cloned so each rig owns its own.
  const model = scene.clone(true)
  model.updateMatrixWorld(true)
  const pieces = []
  model.traverse((o) => o.isMesh && pieces.push(o))
  const parts = {}
  for (const mesh of pieces) {
    const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())
    const part = partOf(center)
    joints[PART_JOINT[part]].attach(mesh)
    ;(parts[part] ??= []).push(mesh)
    // Your own body never blocks the interaction ray
    mesh.raycast = () => {}
  }

  // Stand up straight: the model hunches forward, so its torso slopes back and
  // away from a camera in front of the face. Tilt the torso upright at the pelvis
  // and turn the hips back so the legs stay where they were.
  const spine = J.neck.clone().sub(J.pelvis).normalize()
  const upright = new THREE.Quaternion().setFromUnitVectors(spine, new THREE.Vector3(0, 1, 0))
  joints.pelvis.quaternion.copy(upright)
  joints.hipR.quaternion.copy(upright).invert()
  joints.hipL.quaternion.copy(upright).invert()
  root.updateMatrixWorld(true)

  // Rest pose: bend shoulders/elbows from the file's pose to arms at the sides
  const rest = {}
  for (const [seg, [from, to, target]] of Object.entries(REST)) {
    const joint = joints[PART_JOINT[seg]]
    // The bone's direction in its own (unrotated) frame, turned to point at
    // `target`, which is in model space: bring it into the frame of the already
    // posed parent (the shoulder, for a forearm)
    const current = to.clone().sub(from).normalize()
    const parentQ = joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
    const goal = target.clone().normalize().applyQuaternion(parentQ)
    joint.quaternion.setFromUnitVectors(current, goal)
    joint.updateMatrixWorld(true)
  }
  for (const [name, j] of Object.entries(joints)) rest[name] = j.quaternion.clone()

  // The head (and everything on it) is where the camera is: hide it
  for (const mesh of parts.head ?? []) mesh.visible = false

  // The camera goes in front of the chest, centered on it, at eye height
  const chest = new THREE.Box3()
  for (const mesh of parts.torso ?? []) chest.expandByObject(mesh)
  const view = V(chest.min.x - VIEW_AHEAD, EYES.y, (chest.min.z + chest.max.z) / 2)

  return { root, joints, rest, view }
}

// Swing about the model's side-to-side axis (z): negative swings forward (-x)
const SIDE = new THREE.Vector3(0, 0, 1)
const _q = new THREE.Quaternion()
const swing = (joint, rest, angle) => joint.quaternion.copy(_q.setFromAxisAngle(SIDE, angle).multiply(rest))

const REACH_SECONDS = 0.45

export default function MonkeyBody({ motion }) {
  const { scene } = useGLTF(PROP_FILES.monkey)
  const rig = useMemo(() => buildRig(scene), [scene])
  const holder = useRef()
  const phase = useRef(0)
  const amount = useRef(0) // 0 standing still .. 1 full stride, eased
  const reachAt = useRef(-10)
  const visible = useGameStore((s) => s.phase === PHASE.APARTMENT || s.phase === PHASE.INCIDENT)

  // Interacting: the right hand reaches out in front of you
  useEffect(() => {
    const reach = () => (reachAt.current = performance.now() / 1000)
    const onKey = (e) => pressed(e, 'interact') && !e.repeat && reach()
    const onClick = (e) => e.button === 0 && document.pointerLockElement === document.body && reach()
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const { joints: j, rest } = rig
    const moving = motion.current.moving
    const sprint = motion.current.sprint
    amount.current = THREE.MathUtils.damp(amount.current, moving ? (sprint ? 1.4 : 1) : 0, 8, dt)
    phase.current += dt * (sprint ? 12 : 8) * Math.min(1, amount.current + 0.001)
    const a = amount.current
    const s = Math.sin(phase.current)

    // Legs: thighs swing opposite each other, the knee bends on the way back
    swing(j.hipR, rest.hipR, -0.45 * a * s)
    swing(j.hipL, rest.hipL, 0.45 * a * s)
    swing(j.kneeR, rest.kneeR, 0.7 * a * Math.max(0, s))
    swing(j.kneeL, rest.kneeL, 0.7 * a * Math.max(0, -s))

    // Arms counter-swing; idle, they breathe a little
    const breathe = Math.sin(clock.elapsedTime * 1.6) * 0.04 * (1 - Math.min(1, a))
    swing(j.shoulderL, rest.shoulderL, -0.4 * a * s + breathe)
    swing(j.elbowL, rest.elbowL, -0.25 * a)

    // Right arm: the same, unless reaching out to use something
    const t = performance.now() / 1000 - reachAt.current
    const reach = t < REACH_SECONDS ? Math.sin((t / REACH_SECONDS) * Math.PI) : 0
    swing(j.shoulderR, rest.shoulderR, (0.4 * a * s + breathe) * (1 - reach) - 1.35 * reach)
    swing(j.elbowR, rest.elbowR, -0.25 * a * (1 - reach) + 0.5 * reach)

    // A little bounce in the step
    holder.current.position.y = Math.abs(s) * 0.025 * a
  })

  // Model space → the player: face -z, scaled, the view point at the camera (0.8 m
  // above the capsule's center), feet at the capsule's bottom
  const eye = rig.view.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2).multiplyScalar(SCALE)
  return (
    <group visible={visible} position={[-eye.x, 0.8 - eye.y, -eye.z]}>
      <group ref={holder}>
        <group rotation-y={-Math.PI / 2} scale={SCALE}>
          <primitive object={rig.root} />
        </group>
      </group>
    </group>
  )
}
