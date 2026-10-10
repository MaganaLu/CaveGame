import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '../game/GameState'
import { hasMod } from '../game/shifts'

// Reusable light fixtures. Each pairs an emissive mesh (so the fixture visibly
// glows) with a point light and a halo sprite. No shadows, to keep the lights cheap.
// All of them go dark when the breaker trips (home.power), or for the whole
// night with the "Lights stay off" modifier.

const WARM = '#ffb766'
const SHADE = '#e8c88a'

// Off when the breaker trips, stuttering during a flicker event, and never on
// at all with the "Lights stay off" shift modifier
const usePower = () => useGameStore((s) => s.home.power && !s.flickerOff && !hasMod(s, 'dark'))

// A soft halo around a glowing shade: one additive sprite, much cheaper than
// another light. Every fixture shares the texture.
const HALO = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
})()
export function Halo({ on, color = WARM, size = 0.7, opacity = 0.55, ...props }) {
  if (!on) return null
  return (
    <sprite scale={[size, size, 1]} {...props}>
      <spriteMaterial map={HALO} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  )
}

function Glow({ color = SHADE, emissive = '#e8b060', intensity = 0.8, on = true, children, ...props }) {
  return (
    <mesh {...props}>
      {children}
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={on ? intensity : 0} />
    </mesh>
  )
}

export function TableLamp({ position, color = WARM, intensity = 3, distance = 6 }) {
  const on = usePower()
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.1, 10]} />
        <meshStandardMaterial color="#3a2e24" />
      </mesh>
      <Glow on={on} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.2, 12]} />
      </Glow>
      <pointLight position={[0, 0.35, 0]} color={color} intensity={on ? intensity : 0} distance={distance} decay={2} />
      <Halo on={on} color={color} position={[0, 0.3, 0]} size={0.6} />
    </group>
  )
}

export function FloorLamp({ position, color = WARM, intensity = 5, distance = 7 }) {
  const on = usePower()
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.04, 12]} />
          <meshStandardMaterial color="#2a2a2e" />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.5, 6]} />
          <meshStandardMaterial color="#2a2a2e" />
        </mesh>
      </RigidBody>
      <Glow on={on} position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 0.28, 12, 1, true]} />
      </Glow>
      <pointLight position={[0, 1.5, 0]} color={color} intensity={on ? intensity : 0} distance={distance} decay={2} />
      <Halo on={on} color={color} position={[0, 1.5, 0]} size={0.8} />
    </group>
  )
}

// Flush ceiling fixture. Height matches the apartment's 2.6m walls.
export function CeilingLight({ position, color = '#ffd9a8', intensity = 8, distance = 9 }) {
  const on = usePower()
  const [x, z] = position
  return (
    <group position={[x, 2.6, z]}>
      <Glow on={on} position={[0, -0.03, 0]} color="#fff3e0" emissive="#ffe2b8" intensity={1.2}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 16]} />
      </Glow>
      <pointLight position={[0, -0.3, 0]} color={color} intensity={on ? intensity : 0} distance={distance} decay={2} />
    </group>
  )
}

// Hanging pendants share one light to save on light count
export function Pendants({ positions, y = 1.9, color = WARM, intensity = 6, distance = 7 }) {
  const on = usePower()
  const cx = positions.reduce((a, p) => a + p[0], 0) / positions.length
  const cz = positions.reduce((a, p) => a + p[1], 0) / positions.length
  return (
    <>
      {positions.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, y, z]}>
          <mesh position={[0, (2.6 - y) / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 2.6 - y, 4]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <Glow on={on}>
            <coneGeometry args={[0.16, 0.18, 12, 1, true]} />
          </Glow>
        </group>
      ))}
      <pointLight position={[cx, y - 0.2, cz]} color={color} intensity={on ? intensity : 0} distance={distance} decay={2} />
      {positions.map(([x, z]) => <Halo key={`${x},${z}`} on={on} color={color} position={[x, y - 0.1, z]} size={0.5} />)}
    </>
  )
}

// Light bar over a mirror, mounted on a wall facing -z
export function VanityLight({ position, width = 0.6, color = '#e8f0ff' }) {
  const on = usePower()
  return (
    <group position={position}>
      <Glow on={on} color="#f4f8ff" emissive="#dfe9ff" intensity={1.2}>
        <boxGeometry args={[width, 0.06, 0.06]} />
      </Glow>
      {/* No light of its own (the bathroom's ceiling light does the work): a halo */}
      <Halo on={on} color={color} size={0.9} opacity={0.4} />
    </group>
  )
}
