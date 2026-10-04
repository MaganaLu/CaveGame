import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/GameState'
import * as sfx from '../game/audio'
import { PSX } from '../psx/config'
import { SILLS } from '../apartment/layout'
import { NIGHT, FLASH, SODIUM, MAX_LAMPS, cityMaterials, lampHeads, weatherUniforms } from './weatherState'
import { streakVertex, streakFragment, sheetVertex, sheetFragment, sillSplashVertex, splashFragment } from './shaders'

// Rainy night outside the windows. All the rain is animated in shaders (see
// shaders.js); this file builds the geometry once and drives the shared uniforms:
// time, wind gusts and lightning.

const noRaycast = () => {}

// ------------------------------------------------------------------ falling streaks
// Two layers of drops wrapped in boxes around the apartment: a dense near one you
// see right outside the windows, and a sparse wide one over the whole district
const LAYERS = [
  { count: 3000, half: 22 },
  { count: 2500, half: 75 },
]
const TOP = 30 // drops wrap from up here...
const BOTTOM = -16 // ...to just under the street (15 m below the apartment floor)

function streakGeometry() {
  const total = LAYERS.reduce((n, l) => n + l.count, 0)
  const drop = new Float32Array(total * 4 * 4)
  const corner = new Float32Array(total * 4 * 3)
  const index = new Uint32Array(total * 6)
  const CORNERS = [[-1, 0], [1, 0], [-1, 1], [1, 1]]
  let i = 0
  for (const { count, half } of LAYERS) {
    for (let n = 0; n < count; n++, i++) {
      const x = (Math.random() * 2 - 1) * half
      const z = (Math.random() * 2 - 1) * half
      const phase = Math.random()
      const speed = 14 + Math.random() * 6
      for (let c = 0; c < 4; c++) {
        drop.set([x, z, phase, speed], (i * 4 + c) * 4)
        corner.set([CORNERS[c][0], CORNERS[c][1], half], (i * 4 + c) * 3)
      }
      const v = i * 4
      index.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], i * 6)
    }
  }
  const g = new THREE.BufferGeometry()
  // Positions come from the shader; three still wants a position attribute
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 4 * 3), 3))
  g.setAttribute('aDrop', new THREE.BufferAttribute(drop, 4))
  g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 3))
  g.setIndex(new THREE.BufferAttribute(index, 1))
  return g
}

function RainStreaks() {
  const geometry = useMemo(streakGeometry, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...weatherUniforms,
          uLamps: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector3()) },
          uLampCount: { value: 0 },
          uSodium: { value: SODIUM },
        },
        defines: {
          MAX_LAMPS,
          TOP: TOP.toFixed(1),
          BOTTOM: BOTTOM.toFixed(1),
          // Apartment footprint (walls at x ±5, z ±7.5) plus the window ledges
          APT_X: '5.15',
          APT_Z: '7.65',
        },
        vertexShader: streakVertex,
        fragmentShader: streakFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  // Streetlights arrive once the city has loaded
  useFrame(() => {
    const u = material.uniforms
    if (u.uLampCount.value === lampHeads.length) return
    const n = Math.min(lampHeads.length, MAX_LAMPS)
    for (let i = 0; i < n; i++) u.uLamps.value[i].fromArray(lampHeads[i])
    u.uLampCount.value = n
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} raycast={noRaycast} />
}

// ------------------------------------------------------------------ rain sheets
// Curtains of rain between the buildings, at two distances
const SHEETS = [
  { radius: 32, columns: 420, speed: 17, alpha: 0.14 },
  { radius: 58, columns: 560, speed: 15, alpha: 0.1 },
]

function RainSheet({ radius, columns, speed, alpha }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: weatherUniforms.uTime,
          uFlash: weatherUniforms.uFlash,
          uWind: weatherUniforms.uWind,
          uColumns: { value: columns },
          uSpeed: { value: speed },
          uAlpha: { value: alpha },
          uSodium: { value: SODIUM },
        },
        vertexShader: sheetVertex,
        fragmentShader: sheetFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [columns, speed, alpha]
  )
  return (
    <mesh position={[0, 5, 0]} material={material} frustumCulled={false} raycast={noRaycast}>
      <cylinderGeometry args={[radius, radius, 70, 48, 1, true]} />
    </mesh>
  )
}

// ------------------------------------------------------------------ window ledge splashes
const SPLASHES_PER_METER = 14

function sillGeometry() {
  const sill = []
  const info = []
  for (const s of SILLS) {
    const count = Math.round((s.b - s.a) * SPLASHES_PER_METER)
    // Ledge top: the frame's bottom bar is centered on the sill and 6 cm tall
    const ledge = s.y0 + 0.03
    for (let i = 0; i < count; i++) {
      sill.push(s.a, s.b, s.at, ledge)
      info.push(s.along === 'x' ? 1 : 0, s.out, Math.random(), 1.2 + Math.random() * 1.6)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sill.length / 4 * 3), 3))
  g.setAttribute('aSill', new THREE.BufferAttribute(new Float32Array(sill), 4))
  g.setAttribute('aInfo', new THREE.BufferAttribute(new Float32Array(info), 4))
  return g
}

function SillSplashes() {
  const geometry = useMemo(sillGeometry, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: weatherUniforms.uTime,
          uFlash: weatherUniforms.uFlash,
          uPixelAngle: weatherUniforms.uPixelAngle,
        },
        vertexShader: sillSplashVertex,
        fragmentShader: splashFragment,
        transparent: true,
        depthWrite: false,
      }),
    []
  )
  return <points geometry={geometry} material={material} frustumCulled={false} raycast={noRaycast} />
}

// ------------------------------------------------------------------ wind
// A steady breeze with gusts every 8–20 s: the rain leans harder, drifts faster
// and gets louder for a few seconds
const BREEZE = new THREE.Vector2(2.2, 0.8) // m/s
const GUST = new THREE.Vector2(6.5, 2.2)

function Wind({ rainVolume }) {
  const { camera } = useThree()
  const gust = useRef({ level: 0, start: 8, end: 12, next: 8, lastSound: 0 })

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    const g = gust.current
    const u = weatherUniforms

    if (t > g.next) {
      g.start = t
      g.end = t + 1.5 + 2 + Math.random() * 2 // attack + hold
      g.next = g.end + 3 + 8 + Math.random() * 12
    }
    const target = t >= g.start && t < g.end ? 1 : 0
    g.level += (target - g.level) * Math.min(1, dt * (target ? 0.9 : 0.4))

    const sway = Math.sin(t * 0.37) * 0.4 + Math.sin(t * 1.3) * 0.15
    u.uWind.value.set(BREEZE.x + sway, BREEZE.y).addScaledVector(GUST, g.level)
    u.uWindOffset.value.addScaledVector(u.uWind.value, dt)
    u.uTime.value = t
    u.uPixelAngle.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / PSX.height

    // The rain gets louder with the gust (setRain ramps smoothly on its own)
    if (rainVolume.current > 0 && t - g.lastSound > 0.3) {
      g.lastSound = t
      sfx.setRain(rainVolume.current * (1 + 0.8 * g.level))
    }
  })
  return null
}

// ------------------------------------------------------------------ lightning
// A double flash of sky, city, rain and a cold light through the windows, then
// thunder a moment later. Every 25–60 s while a night is running.
function Lightning() {
  const { scene } = useThree()
  const light = useRef()
  const next = useRef(15)
  const flashT = useRef(-1)
  const thunderAt = useRef(-1)
  const sky = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const s = useGameStore.getState()
    const running = s.phase !== 'MENU' && s.phase !== 'NIGHT_COMPLETE'
    if (running && t > next.current) {
      flashT.current = t
      thunderAt.current = t + 0.8 + Math.random() * 2
      next.current = t + 25 + Math.random() * 35
    }
    if (thunderAt.current > 0 && t > thunderAt.current) {
      sfx.thunder()
      thunderAt.current = -1
    }

    // Two quick pulses over ~0.5 s
    const since = t - flashT.current
    const k = flashT.current < 0 || since > 0.5 ? 0 : since < 0.08 ? 1 : since < 0.16 ? 0.15 : since < 0.26 ? 0.8 : 1 - (since - 0.26) / 0.24
    const amount = Math.max(0, k)

    sky.copy(NIGHT.sky).lerp(FLASH.sky, amount)
    if (scene.background?.isColor) scene.background.copy(sky)
    if (scene.fog) scene.fog.color.copy(NIGHT.fog).lerp(FLASH.fog, amount)
    for (const m of cityMaterials) m.color.copy(NIGHT.city).lerp(FLASH.city, amount)
    weatherUniforms.uFlash.value = amount
    light.current.intensity = amount * 2.5
  })

  return <directionalLight ref={light} position={[-20, 40, -30]} color="#c8d4ff" intensity={0} />
}

export default function Weather() {
  // Rain sound for the whole night, quieter in dreams; Wind swells it in gusts
  const phase = useGameStore((s) => s.phase)
  const rainVolume = useRef(0)
  useEffect(() => {
    const running = phase !== 'MENU' && phase !== 'NIGHT_COMPLETE'
    rainVolume.current = !running ? 0 : phase === 'DREAM' ? 0.02 : 0.06
    sfx.setRain(rainVolume.current)
  }, [phase])

  return (
    <>
      <Wind rainVolume={rainVolume} />
      <RainStreaks />
      {SHEETS.map((s) => (
        <RainSheet key={s.radius} {...s} />
      ))}
      <SillSplashes />
      <Lightning />
    </>
  )
}
