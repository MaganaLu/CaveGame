import { Suspense, useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import Interactable from '../interactions/Interactable'
import Phone from './Phone'
import Computer from './Computer'
import { TableLamp, FloorLamp, CeilingLight, Pendants, VanityLight } from './Lamps'
import Posters from './Posters'
import { Router, BreakerBox, Pickups, DirectorBoss } from './HomeSystems'
import { Laptop, ServerRackWithLever } from './Hardware'
import { tiled } from '../psx/textures'
import Props from './Props'
import { WINDOWS } from './layout'
import { rainGlassMaterial } from '../weather/weatherState'

// Greybox apartment. Footprint x: -5..5, z: -7.5..7.5
//
//   z=-7.5 ┌─────────────────────┐
//          │      BEDROOM        │
//   z=-2.5 ├────  ───────────────┤
//          │  LIVING   ┊  DESK   │
//   z= 2.5 ├──   ──────┼──  ─────┤
//          │  KITCHEN  │ BATHROOM│
//   z= 7.5 └─────────────────────┘
//        x=-5         x=0       x=5

const H = 2.6 // wall height
const T = 0.1 // wall thickness
const DOOR_H = 2.1


const COLORS = {
  wall: '#4a4e58',
  floor: '#6b5644',
  ceiling: '#1c1d21',
  wood: '#4a3526',
  fabric: '#3b4a5c',
  white: '#a9adb3',
}

// PSX texel density: one 32px texture tile per ~meter
const TILES_PER_METER = 1.2

function Box({ position, size, color, texture = 'grime', repeat, collide = true, ...props }) {
  const [x, y, z] = size
  const map = useMemo(() => {
    if (!texture) return null
    const [rx, ry] = repeat ?? [Math.max(x, z) * TILES_PER_METER, y * TILES_PER_METER]
    return tiled(texture, Math.round(rx), Math.round(ry))
  }, [texture, repeat, x, y, z])
  const mesh = (
    <mesh position={position} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} map={map} roughness={0.95} />
    </mesh>
  )
  return collide ? <RigidBody type="fixed" colliders="cuboid">{mesh}</RigidBody> : mesh
}

// Splits a [from, to] span into solid segments around door gaps
function solidSegments(from, to, gaps) {
  const segs = []
  let cursor = from
  for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (g0 > cursor) segs.push([cursor, g0])
    cursor = g1
  }
  if (cursor < to) segs.push([cursor, to])
  return segs
}

// A glass pane with a chunky frame, centered in a wall opening. Built along local
// x and turned 90° for walls that run along z.
const FRAME = '#cfcac0'
function WindowPane({ axis, at, a, b, y0, y1 }) {
  const w = b - a
  const h = y1 - y0
  const mid = (a + b) / 2
  const y = (y0 + y1) / 2
  const bar = (position, size) => (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={FRAME} />
    </mesh>
  )
  return (
    <group position={axis === 'x' ? [mid, y, at] : [at, y, mid]} rotation-y={axis === 'x' ? 0 : Math.PI / 2}>
      {/* Rain-streaked glass (droplets scroll down, see weather/Weather.jsx) */}
      <mesh material={rainGlassMaterial}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {bar([0, h / 2, 0], [w, 0.06, 0.14])}
      {bar([0, -h / 2, 0], [w + 0.1, 0.06, 0.22])}
      {bar([-w / 2, 0, 0], [0.06, h, 0.14])}
      {bar([w / 2, 0, 0], [0.06, h, 0.14])}
      {bar([0, 0, 0], [0.04, h, 0.1])}
    </group>
  )
}

// Axis-aligned wall along x (at fixed z) or along z (at fixed x), with doorway
// gaps (full height, header above) and window openings [a, b, y0, y1] (solid
// sill below, header above; the sill keeps you from climbing out).
function Wall({ axis, at, from, to, gaps = [], windows = [] }) {
  const place = (a, b, y0, y1) => {
    const len = b - a
    const mid = (a + b) / 2
    const y = (y0 + y1) / 2
    const h = y1 - y0
    return axis === 'x'
      ? { position: [mid, y, at], size: [len, h, T] }
      : { position: [at, y, mid], size: [T, h, len] }
  }
  return (
    <>
      {solidSegments(from, to, [...gaps, ...windows]).map(([a, b]) => (
        <Box key={`w${a}`} {...place(a, b, 0, H)} color={COLORS.wall} />
      ))}
      {gaps.map(([a, b]) => (
        <Box key={`h${a}`} {...place(a, b, DOOR_H, H)} color={COLORS.wall} collide={false} />
      ))}
      {windows.map(([a, b, y0, y1]) => (
        <group key={`win${a}`}>
          <Box {...place(a, b, 0, y0)} color={COLORS.wall} />
          <Box {...place(a, b, y1, H)} color={COLORS.wall} collide={false} />
          <WindowPane axis={axis} at={at} a={a} b={b} y0={y0} y1={y1} />
        </group>
      ))}
    </>
  )
}

function Shell() {
  return (
    <>
      {/* Floor + ceiling */}
      <Box position={[0, -0.05, 0]} size={[10.2, 0.1, 15.2]} color={COLORS.floor} texture="planks" repeat={[10, 15]} />
      <Box position={[0, H + 0.05, 0]} size={[10.2, 0.1, 15.2]} color={COLORS.ceiling} collide={false} />

      {/* Outer walls, with windows onto the city (see City.jsx) */}
      <Wall axis="x" at={-7.5} from={-5} to={5} windows={[WINDOWS.bedroom, WINDOWS.overBed]} />
      <Wall axis="x" at={7.5} from={-5} to={5} windows={[WINDOWS.kitchen]} />
      <Wall axis="z" at={-5} from={-7.5} to={7.5} />
      <Wall axis="z" at={5} from={-7.5} to={7.5} windows={[WINDOWS.desk]} />

      {/* Interior walls */}
      <Wall axis="x" at={-2.5} from={-5} to={5} gaps={[[-3.2, -1.8]]} />
      <Wall axis="x" at={2.5} from={-5} to={5} gaps={[[-4, -1], [2, 3.2]]} />
      <Wall axis="z" at={0} from={-2.5} to={2.5} gaps={[[-0.7, 0.7]]} />
      <Wall axis="z" at={0} from={2.5} to={7.5} />
    </>
  )
}

function Bedroom() {
  return (
    <>
      {/* The bed is a model now (Props.jsx) */}

      {/* Nightstand + lamp */}
      <Box position={[0.25, 0.275, -7.1]} size={[0.5, 0.55, 0.5]} color={COLORS.wood} />
      <TableLamp position={[0.1, 0.55, -7.25]} />

      <Phone position={[0.35, 0.56, -7.0]} />

      {/* Moonlight spilling in through the bedroom window */}
      <pointLight position={[-3, 1.5, -6.6]} color="#5470b0" intensity={0.8} distance={5} decay={2} />

      {/* Wardrobe */}
      <Box position={[-4.65, 1, -4.5]} size={[0.6, 2, 1.4]} color={COLORS.wood} />

      <FloorLamp position={[-4.5, 0, -6.95]} />
      <CeilingLight position={[0, -5]} intensity={6} />
    </>
  )
}

function LivingRoom() {
  return (
    <>
      {/* Couch against the desk-room wall, facing west, so the kitchen opening
          (x -4..-1 along z=2.5) and the desk doorway (z -0.7..0.7) stay clear */}
      {/* Also your bed, once you've been sent to the couch */}
      <Interactable id="couch">
        <Box position={[-0.5, 0.25, 1.55]} size={[0.8, 0.5, 1.8]} color={COLORS.fabric} />
        <Box position={[-0.2, 0.65, 1.55]} size={[0.2, 0.5, 1.8]} color={COLORS.fabric} />
      </Interactable>
      <Box position={[-1.6, 0.2, 1.55]} size={[0.6, 0.4, 1.1]} color={COLORS.wood} />

      {/* Front door */}
      <Interactable id="door">
        <Box position={[-4.93, DOOR_H / 2, -0.8]} size={[0.06, DOOR_H, 1]} color="#5a3f2c" />
        <mesh position={[-4.88, 1.0, -0.45]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#b8a060" metalness={0.8} roughness={0.3} />
        </mesh>
      </Interactable>
      {/* Corner west of the kitchen opening */}
      <FloorLamp position={[-4.6, 0, 2.15]} />
      <Router position={[-4.8, 0.9, 0.35]} />
      <CeilingLight position={[-2.5, -0.3]} />
    </>
  )
}

function DeskRoom() {
  return (
    <>
      <Box position={[4.5, 0.375, 0]} size={[0.8, 0.75, 1.8]} color={COLORS.wood} />
      <Suspense fallback={null}>
        <Computer position={[4.55, 0.75, 0]} />
      </Suspense>
      {/* The chair is a model now (Props.jsx) */}

      <TableLamp position={[4.6, 0.75, 0.65]} intensity={2.5} />
      <CeilingLight position={[2.5, 0]} color="#dfe8ff" intensity={6} />
    </>
  )
}

function Kitchen() {
  return (
    <>
      {/* Counter along the south wall */}
      <Box position={[-2.75, 0.45, 7.15]} size={[4.3, 0.9, 0.6]} color={COLORS.white} />
      {/* Fridge */}
      <Box position={[-4.6, 0.95, 3.1]} size={[0.7, 1.9, 0.7]} color="#c4c8cc" />
      <pointLight position={[-4.0, 1.4, 3.1]} color="#cfe8ff" intensity={0.5} distance={3} decay={2} />

      <Pendants positions={[[-3.6, 6.7], [-1.9, 6.7]]} />
      <BreakerBox position={[-4.93, 1.4, 4.4]} />
      {/* Second terminal, facing into the kitchen */}
      <Laptop position={[-3.55, 0.9, 7.1]} rotation={Math.PI} />

      {/* Coffee machine (decor: there's no sleep meter to fight anymore) */}
      <group>
        <Box position={[-2.2, 1.1, 7.2]} size={[0.3, 0.4, 0.3]} color="#1a1a1a" collide={false} />
        <mesh position={[-2.2, 0.95, 7.05]}>
          <cylinderGeometry args={[0.05, 0.045, 0.1, 12]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        <mesh position={[-2.12, 1.22, 7.04]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial color="#ff3030" emissive="#ff2020" emissiveIntensity={2} />
        </mesh>
      </group>
    </>
  )
}

function Bathroom() {
  return (
    <>
      <Box position={[4.4, 0.25, 6.0]} size={[1, 0.5, 2.6]} color={COLORS.white} />
      <Box position={[1.0, 0.2, 7.1]} size={[0.45, 0.4, 0.6]} color={COLORS.white} />
      <Box position={[2.4, 0.85, 7.25]} size={[0.6, 0.15, 0.4]} color={COLORS.white} />
      <mesh position={[2.4, 1.6, 7.44]}>
        <planeGeometry args={[0.6, 0.8]} />
        <meshStandardMaterial color="#202830" metalness={1} roughness={0.1} />
      </mesh>
      <VanityLight position={[2.4, 2.1, 7.4]} />
      {/* The server rack lives in the bathroom. Nobody remembers why. */}
      <ServerRackWithLever position={[0.4, 0, 3.1]} rotation={Math.PI / 2} />
      <CeilingLight position={[2.5, 4.5]} color="#e8f0ff" intensity={5} />
    </>
  )
}

export default function Apartment() {
  return (
    <>
      {/* Rainy night sky; the haze starts past the apartment so the city fades
          into the rain. Weather.jsx animates both for lightning. */}
      <color attach="background" args={['#04060c']} />
      <fog attach="fog" args={['#0a0f1a', 20, 140]} />
      <ambientLight intensity={0.8} color="#8aa0c8" />

      <Shell />
      <Posters />
      <Pickups />
      <DirectorBoss />
      {/* Model props (PC is in Computer.jsx); stream in without blocking the room */}
      <Suspense fallback={null}>
        <Props />
      </Suspense>
      <Bedroom />
      <LivingRoom />
      <DeskRoom />
      <Kitchen />
      <Bathroom />
    </>
  )
}
