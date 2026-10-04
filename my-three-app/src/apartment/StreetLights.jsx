import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import WetStreet from '../weather/WetStreet'
import { lampHeads } from '../weather/weatherState'

// Sodium streetlights along the sidewalks (spots come from City.jsx). The city is
// unlit, so the light is faked: a glowing head, an additive halo, and an orange
// pool on the wet street, plus reflections and splashes (weather/WetStreet.jsx).
// No real lights, so dozens of lamps cost almost nothing.

const SODIUM = '#ffb35c'
const POLE_HEIGHT = 6.5
const ARM = 1.6

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3(1, 1, 1)
const UP = new THREE.Vector3(0, 1, 0)

export default function StreetLights({ spots }) {
  const glow = useMemo(glowTexture, [])
  const poles = useRef()
  const arms = useRef()
  const heads = useRef()
  const pools = useRef()

  // Head position for each lamp: top of the pole, out along the arm
  const headsAt = useMemo(
    () => spots.map(({ position: [x, y, z], facing }) => [x + Math.sin(facing) * ARM, y + POLE_HEIGHT, z + Math.cos(facing) * ARM]),
    [spots]
  )

  useLayoutEffect(() => {
    spots.forEach(({ position: [x, y, z], facing }, i) => {
      _q.setFromAxisAngle(UP, facing)
      poles.current.setMatrixAt(i, _m.compose(_p.set(x, y + POLE_HEIGHT / 2, z), _q, _s))
      arms.current.setMatrixAt(i, _m.compose(_p.set(x + Math.sin(facing) * ARM / 2, y + POLE_HEIGHT, z + Math.cos(facing) * ARM / 2), _q, _s))
      const [hx, hy, hz] = headsAt[i]
      heads.current.setMatrixAt(i, _m.compose(_p.set(hx, hy - 0.1, hz), _q, _s))
      pools.current.setMatrixAt(i, _m.compose(_p.set(hx, y + 0.04, hz), _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), _s))
    })
    for (const r of [poles, arms, heads, pools]) r.current.instanceMatrix.needsUpdate = true
    // Rain near the lamps glows (weather/Weather.jsx)
    lampHeads.length = 0
    lampHeads.push(...headsAt)
  }, [spots, headsAt])

  const halos = useMemo(() => new Float32Array(headsAt.flat()), [headsAt])
  const n = spots.length
  if (!n) return null

  return (
    <group raycast={() => {}}>
      <instancedMesh ref={poles} args={[null, null, n]} raycast={() => {}}>
        <boxGeometry args={[0.16, POLE_HEIGHT, 0.16]} />
        <meshBasicMaterial color="#1a1c22" />
      </instancedMesh>
      <instancedMesh ref={arms} args={[null, null, n]} raycast={() => {}}>
        <boxGeometry args={[0.1, 0.1, ARM]} />
        <meshBasicMaterial color="#1a1c22" />
      </instancedMesh>
      <instancedMesh ref={heads} args={[null, null, n]} raycast={() => {}}>
        <boxGeometry args={[0.35, 0.14, 0.7]} />
        <meshBasicMaterial color="#ffe2a8" toneMapped={false} />
      </instancedMesh>
      {/* Orange pools on the wet street */}
      <instancedMesh ref={pools} args={[null, null, n]} raycast={() => {}}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial map={glow} color={SODIUM} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      {/* Halos around each head, always facing you; rain haze makes them big */}
      <points raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[halos, 3]} />
        </bufferGeometry>
        <pointsMaterial map={glow} color={SODIUM} size={5} sizeAttenuation transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <WetStreet heads={headsAt} streetY={spots[0].position[1]} />
    </group>
  )
}
