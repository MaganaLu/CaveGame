import { forwardRef, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import Interactable from '../interactions/Interactable'
import { useGameStore, DIRECTOR_ID } from '../game/GameState'

// Things in the apartment that break (router, breaker) and things that appear
// (pickups). Their state lives in the store: home.wifi, home.power, pickups.

// Wi-Fi router on a shelf by the front door. LEDs blink red while it's down.
export function Router({ position }) {
  const leds = useRef([])
  useFrame(({ clock }) => {
    const down = !useGameStore.getState().home.wifi
    const on = !down || Math.floor(clock.elapsedTime * 3) % 2 === 0
    for (const m of leds.current) {
      if (!m) continue
      m.emissive.set(down ? '#ff2020' : '#30ff60')
      m.emissiveIntensity = on ? 2 : 0
    }
  })
  return (
    <Interactable id="router" position={position}>
      {/* Shelf */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.35, 0.04, 0.5]} />
        <meshStandardMaterial color="#4a3526" />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.3]} />
        <meshStandardMaterial color="#1c1d22" />
      </mesh>
      {[-0.07, 0.07].map((z) => (
        <mesh key={z} position={[0, 0.16, z]}>
          <boxGeometry args={[0.015, 0.2, 0.015]} />
          <meshStandardMaterial color="#1c1d22" />
        </mesh>
      ))}
      {[-0.08, -0.03, 0.02, 0.07].map((z, i) => (
        <mesh key={z} position={[0.092, 0.05, z]}>
          <boxGeometry args={[0.005, 0.012, 0.02]} />
          <meshStandardMaterial ref={(m) => (leds.current[i] = m)} color="#111" />
        </mesh>
      ))}
    </Interactable>
  )
}

// Breaker box on the kitchen wall; its warning light is on while power is out
export function BreakerBox({ position, rotationY = Math.PI / 2 }) {
  const warn = useRef()
  useFrame(({ clock }) => {
    const out = !useGameStore.getState().home.power
    warn.current.emissiveIntensity = out && Math.floor(clock.elapsedTime * 2) % 2 === 0 ? 3 : 0
  })
  return (
    <Interactable id="breaker" position={position} rotation-y={rotationY}>
      <mesh>
        <boxGeometry args={[0.4, 0.55, 0.08]} />
        <meshStandardMaterial color="#7d8288" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[0.32, 0.45, 0.01]} />
        <meshStandardMaterial color="#9aa0a6" />
      </mesh>
      <mesh position={[0.12, 0.2, 0.055]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial ref={warn} color="#400" emissive="#ff2020" emissiveIntensity={0} />
      </mesh>
      {/* Emergency glow so you can find it in the dark */}
      <pointLight position={[0, 0, 0.3]} color="#ff3030" intensity={0.4} distance={2.5} decay={2} />
    </Interactable>
  )
}

// ------------------------------------------------------------------ pickups
// Where pickups can appear, room by room (schedule picks spot % length)
const SPOTS = [
  [-2.5, 1.0, -5.4], // bedroom, by the wardrobe
  [3.6, 1.0, -3.4], // bedroom, foot of the bed
  [-1.6, 0.75, 1.55], // living room, coffee table
  [-2.6, 1.0, 0.4], // living room, middle of the floor
  [2.0, 1.0, 1.6], // desk room
  [3.0, 1.0, -1.8], // desk room, by the door
  [-3.0, 1.25, 7.0], // kitchen counter
  [-1.5, 1.0, 4.0], // kitchen
  [1.8, 1.0, 4.0], // bathroom
  [3.2, 1.0, 3.4], // bathroom
]


// Emoji drawn into a tiny nearest-filtered texture: crunchy on purpose
const textureCache = {}
function emojiTexture(emoji) {
  if (textureCache[emoji]) return textureCache[emoji]
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')
  ctx.font = '26px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 16, 18)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  textureCache[emoji] = tex
  return tex
}

function Pickup({ pickup }) {
  const group = useRef()
  const texture = useMemo(() => emojiTexture('🍌'), [])
  const [x, y, z] = SPOTS[pickup.spot % SPOTS.length]
  useFrame(({ clock }) => {
    group.current.position.y = y + Math.sin(clock.elapsedTime * 2.5 + pickup.uid) * 0.06
  })
  return (
    <Interactable id={`pickup:${pickup.uid}`}>
      <group ref={group} position={[x, y, z]}>
        <Billboard>
          <mesh>
            <planeGeometry args={[0.35, 0.35]} />
            <meshBasicMaterial map={texture} transparent alphaTest={0.4} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
        {/* Big invisible hitbox; sprites are small */}
        <mesh>
          <sphereGeometry args={[0.3, 6, 6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </Interactable>
  )
}

export function Pickups() {
  const pickups = useGameStore((s) => s.pickups)
  return pickups.map((p) => <Pickup key={p.uid} pickup={p} />)
}

// ------------------------------------------------------------------ the Director
// The comedy boss. Gold badge (25+ years of tenure, at a company that is 12),
// sunglasses indoors at 3 AM, a WORLD'S OKAYEST DIRECTOR mug. While his incident
// is open he stands right behind your desk chair, "just listening", turning to
// keep you in sight wherever you go.
const HOVER_SPOT = [3.1, 0, 0.95] // desk room, over your shoulder at the PC

const _cam = new THREE.Vector3()

export function DirectorBoss() {
  const here = useGameStore((s) => s.incidents.some((i) => i.def.id === DIRECTOR_ID))
  const { camera } = useThree()
  const group = useRef()

  useFrame(({ clock }) => {
    if (!group.current) return
    camera.getWorldPosition(_cam)
    group.current.lookAt(_cam.x, 0, _cam.z)
    // A little impatient bounce
    group.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 3)) * 0.03
  })

  if (!here) return null
  return (
    <group position={HOVER_SPOT}>
      <Director ref={group} />
    </group>
  )
}

// Gold tenure badge
let badgeTexture = null
function goldBadge() {
  if (badgeTexture) return badgeTexture
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ff9900' // brand orange: --brand
  ctx.fillRect(0, 0, 24, 32)
  ctx.fillStyle = '#ffd08a'
  ctx.fillRect(0, 0, 24, 3)
  ctx.fillStyle = '#c98a5a' // a very tanned photo
  ctx.fillRect(6, 6, 12, 12)
  ctx.fillStyle = '#1a1206'
  ctx.fillRect(7, 9, 10, 3) // sunglasses in the photo too
  ctx.fillStyle = '#5a3e00'
  ctx.font = 'bold 6px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('DIR', 12, 25)
  ctx.fillText('25+', 12, 31)
  badgeTexture = new THREE.CanvasTexture(canvas)
  badgeTexture.colorSpace = THREE.SRGBColorSpace
  badgeTexture.magFilter = badgeTexture.minFilter = THREE.NearestFilter
  badgeTexture.generateMipmaps = false
  return badgeTexture
}

const SUIT = '#2b2f3a'
const SKIN = '#c98a5a' // golf tan
const Part = ({ position, size, color = SUIT }) => (
  <mesh position={position}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>
)

// Low-poly exec: suit, open collar, sunglasses, a big grin, a mug
function DirectorModel(props, ref) {
  const badge = useMemo(goldBadge, [])
  return (
    <group ref={ref} {...props}>
      {/* Legs, torso, arms */}
      <Part position={[-0.1, 0.45, 0]} size={[0.15, 0.9, 0.16]} />
      <Part position={[0.1, 0.45, 0]} size={[0.15, 0.9, 0.16]} />
      <Part position={[0, 1.25, 0]} size={[0.52, 0.75, 0.24]} />
      <Part position={[-0.32, 1.05, 0]} size={[0.12, 0.85, 0.14]} />
      {/* Right arm raised, holding the mug */}
      <Part position={[0.32, 1.25, 0.12]} size={[0.12, 0.45, 0.14]} />
      <Part position={[0.32, 1.48, 0.2]} size={[0.11, 0.13, 0.11]} color="#f2f2ee" />
      {/* Shirt, no tie (he's "casual"), quarter-zip vest */}
      <Part position={[0, 1.48, 0.125]} size={[0.16, 0.24, 0.01]} color="#dfe6f2" />
      <Part position={[0, 1.3, 0.128]} size={[0.3, 0.42, 0.01]} color="#1d3a7a" />
      {/* Head: tan, sunglasses, a very wide grin, slicked hair */}
      <Part position={[0, 1.7, 0]} size={[0.1, 0.1, 0.1]} color={SKIN} />
      <Part position={[0, 1.88, 0]} size={[0.24, 0.28, 0.24]} color={SKIN} />
      <Part position={[0, 2.03, -0.01]} size={[0.25, 0.05, 0.25]} color="#3a2a1a" />
      <Part position={[0, 1.92, 0.123]} size={[0.2, 0.05, 0.01]} color="#0b0b0e" />
      <Part position={[0, 1.81, 0.123]} size={[0.13, 0.025, 0.01]} color="#f5f5f0" />
      {/* Lanyard and the gold badge */}
      <Part position={[-0.06, 1.42, 0.134]} size={[0.012, 0.28, 0.006]} color="#ff9900" />
      <Part position={[0.06, 1.42, 0.134]} size={[0.012, 0.28, 0.006]} color="#ff9900" />
      <mesh position={[0, 1.22, 0.14]}>
        <planeGeometry args={[0.1, 0.135]} />
        <meshBasicMaterial map={badge} toneMapped={false} />
      </mesh>
    </group>
  )
}
const Director = forwardRef(DirectorModel)
