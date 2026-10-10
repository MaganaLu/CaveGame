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
import PackProps, { PackPiece } from './PackProps'
import { Sofa, Fit } from './Props'
import Furniture from './Furniture'
import Decor from './Decor'
import MemeDecor from './MemeDecor'
import Ambience from './Ambience'
import { PROP_FILES } from './models'
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


// Clean, flat-colored rooms: warm cream walls (one deep red accent wall behind the
// TV), a plain tan floor, light skirting boards
const COLORS = {
  wall: '#e3d3ae',
  accent: '#b23a2c',
  skirting: '#f1e9d6',
  trim: '#8a5a36',
  floor: '#b48c63',
  tiles: '#e8eef2', // bathroom floor tint
  ceiling: '#d8ccb2',
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
// `accent`: [from, to] along the wall painted COLORS.accent instead of cream.
// Every solid stretch gets a skirting board (a little thicker than the wall, so it
// shows on both faces).
const SKIRTING_H = 0.1
const FRAME_W = 0.07
function Wall({ axis, at, from, to, gaps = [], windows = [], accent }) {
  const place = (a, b, y0, y1, thick = T) => {
    const len = b - a
    const mid = (a + b) / 2
    const y = (y0 + y1) / 2
    const h = y1 - y0
    return axis === 'x'
      ? { position: [mid, y, at], size: [len, h, thick] }
      : { position: [at, y, mid], size: [thick, h, len] }
  }
  // Split a stretch where the accent paint starts and stops
  const painted = ([a, b]) => {
    if (!accent) return [[a, b, COLORS.wall]]
    const cuts = [a, ...accent.filter((c) => c > a && c < b), b]
    return cuts.slice(1).map((c, i) => {
      const mid = (cuts[i] + c) / 2
      return [cuts[i], c, mid > accent[0] && mid < accent[1] ? COLORS.accent : COLORS.wall]
    })
  }
  const flat = { texture: null }
  return (
    <>
      {solidSegments(from, to, [...gaps, ...windows]).flatMap(painted).map(([a, b, color]) => (
        <group key={`w${a}`}>
          <Box {...place(a, b, 0, H)} color={color} {...flat} />
          <Box {...place(a, b, 0, SKIRTING_H, T + 0.04)} color={COLORS.skirting} collide={false} {...flat} />
        </group>
      ))}
      {gaps.map(([a, b]) => (
        <group key={`h${a}`}>
          <Box {...place(a, b, DOOR_H, H)} color={COLORS.wall} collide={false} {...flat} />
          {/* Wooden door frame: two jambs and a header, proud of both faces */}
          <Box {...place(a, a + FRAME_W, 0, DOOR_H, T + 0.05)} color={COLORS.trim} collide={false} {...flat} />
          <Box {...place(b - FRAME_W, b, 0, DOOR_H, T + 0.05)} color={COLORS.trim} collide={false} {...flat} />
          <Box {...place(a, b, DOOR_H, DOOR_H + FRAME_W, T + 0.05)} color={COLORS.trim} collide={false} {...flat} />
        </group>
      ))}
      {windows.map(([a, b, y0, y1]) => (
        <group key={`win${a}`}>
          <Box {...place(a, b, 0, y0)} color={COLORS.wall} {...flat} />
          <Box {...place(a, b, 0, SKIRTING_H, T + 0.04)} color={COLORS.skirting} collide={false} {...flat} />
          <Box {...place(a, b, y1, H)} color={COLORS.wall} collide={false} {...flat} />
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
      {/* Floor in three pieces, so the bathroom gets tiles at the same height as
          the rest (a tile layer laid on top would flicker): everything north of
          z 2.5, the kitchen, and the bathroom. The walls hide the seams. */}
      <Box position={[0, -0.05, -2.55]} size={[10.2, 0.1, 10.1]} color={COLORS.floor} texture={null} />
      <Box position={[-2.55, -0.05, 5.05]} size={[5.1, 0.1, 5.1]} color={COLORS.floor} texture={null} />
      <Box position={[2.55, -0.05, 5.05]} size={[5.1, 0.1, 5.1]} color={COLORS.tiles} texture="tiles" repeat={[9, 9]} />
      <Box position={[0, H + 0.05, 0]} size={[10.2, 0.1, 15.2]} color={COLORS.ceiling} collide={false} texture={null} />

      {/* Outer walls, with windows onto the city (see City.jsx) */}
      <Wall axis="x" at={-7.5} from={-5} to={5} windows={[WINDOWS.bedroom, WINDOWS.overBed]} />
      <Wall axis="x" at={7.5} from={-5} to={5} windows={[WINDOWS.kitchen]} />
      {/* West wall: red behind the living room TV */}
      <Wall axis="z" at={-5} from={-7.5} to={7.5} accent={[-2.5, 2.5]} />
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
      <Box position={[0.25, 0.275, -7.1]} size={[0.5, 0.55, 0.5]} color={COLORS.wood} visible={false} raycast={() => null} />
      <TableLamp position={[0.1, 0.55, -7.25]} />

      <Phone position={[0.35, 0.56, -7.0]} />

      {/* Moonlight spilling in through the bedroom window */}
      <pointLight position={[-3, 1.5, -6.6]} color="#5470b0" intensity={0.8} distance={5} decay={2} />

      {/* Wardrobe (the model; this box is just its collider) */}
      <Box position={[-4.65, 1, -4.5]} size={[0.6, 2, 1.2]} color={COLORS.wood} visible={false} raycast={() => null} />
      <PackPiece piece="wardrobe" height={2.0} position={[-4.68, 0, -4.5]} turn={Math.PI / 2} />

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
        {/* The sofa model; the boxes are its colliders (invisible, and the
            interaction ray goes through them to the model) */}
        <Suspense fallback={null}>
          <Sofa position={[-0.47, 0, 1.58]} turn={Math.PI} />
        </Suspense>
        <Box position={[-0.5, 0.25, 1.55]} size={[0.8, 0.5, 1.8]} color={COLORS.fabric} visible={false} raycast={() => null} />
        <Box position={[-0.2, 0.65, 1.55]} size={[0.2, 0.5, 1.8]} color={COLORS.fabric} visible={false} raycast={() => null} />
      </Interactable>
      {/* Coffee table: the model, fitted to the old table's exact size (bananas and
          a controller sit on its 0.4 m top); the box is its collider */}
      <Suspense fallback={null}>
        <Fit file={PROP_FILES.coffeeTable} size={[1.1, 0.4, 0.65]} position={[-1.6, 0, 1.55]} turn={Math.PI / 2} />
      </Suspense>
      <Box position={[-1.6, 0.2, 1.55]} size={[0.6, 0.4, 1.1]} color={COLORS.wood} visible={false} raycast={() => null} />

      {/* Front door */}
      <Interactable id="door">
        {/* Collider only: invisible, and the interaction ray goes through it to the model */}
        <Box position={[-4.93, DOOR_H / 2, -0.8]} size={[0.06, DOOR_H, 1]} color="#5a3f2c" visible={false} raycast={() => null} />
        <PackPiece piece="door" height={DOOR_H} position={[-4.93, 0, -0.8]} turn={Math.PI / 2} />
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
      {/* The desk (Furniture.jsx) runs along the east wall under the window */}
      <Suspense fallback={null}>
        <Computer position={[4.55, 0.75, -0.95]} />
      </Suspense>
      {/* The chair is a model now (Props.jsx) */}

      <TableLamp position={[4.6, 0.75, -2.1]} intensity={2.5} />
      <CeilingLight position={[2.5, 0]} color="#dfe8ff" intensity={6} />
    </>
  )
}

function Kitchen() {
  return (
    <>
      {/* Counter along the south wall */}
      <Box position={[-2.75, 0.45, 7.15]} size={[4.3, 0.9, 0.6]} color={COLORS.white} visible={false} raycast={() => null} />
      {/* Fridge */}
      <Box position={[-4.6, 0.95, 3.1]} size={[0.7, 1.9, 0.7]} color="#c4c8cc" visible={false} raycast={() => null} />

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
      <Box position={[4.4, 0.25, 6.0]} size={[1, 0.5, 2.6]} color={COLORS.white} visible={false} raycast={() => null} />
      <Box position={[1.0, 0.2, 7.1]} size={[0.45, 0.4, 0.6]} color={COLORS.white} visible={false} raycast={() => null} />
      <Box position={[2.4, 0.85, 7.25]} size={[0.6, 0.15, 0.4]} color={COLORS.white} visible={false} raycast={() => null} />
      {/* Mirror: 3 cm off the wall and depth-biased, or it flickers into the wall */}
      <mesh position={[2.4, 1.6, 7.42]} rotation-y={Math.PI}>
        <planeGeometry args={[0.6, 0.8]} />
        <meshStandardMaterial color="#202830" metalness={1} roughness={0.1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
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
        <PackProps />
        <Furniture />
        <Decor />
        <MemeDecor />
      </Suspense>
      <Ambience />
      <Bedroom />
      <LivingRoom />
      <DeskRoom />
      <Kitchen />
      <Bathroom />
    </>
  )
}
