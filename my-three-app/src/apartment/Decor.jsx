import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Piece } from './Furniture'

// The lived-in pass: things that make the apartment feel like someone (on call,
// at 3 AM) actually lives here, all cheap. No lights, no colliders, tiny shared
// textures and materials:
//   - contact shadows: a soft dark blob under each piece of furniture
//   - corner shading: a dark gradient along every wall, on the floor
//   - wall clutter: a corkboard of sticky notes, a calendar,
//     light switches by the doors, a wall shelf
//   - on-call mess: laundry, shoes, pizza boxes, cans, mugs, papers, dishes
//   - small motion: a ceiling fan, the TV left on

// ------------------------------------------------------------------ shared textures
function gradientTexture(draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  draw(canvas.getContext('2d'))
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
const BLOB = gradientTexture((ctx) => {
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32)
  g.addColorStop(0, 'rgba(0,0,0,0.55)')
  g.addColorStop(0.6, 'rgba(0,0,0,0.3)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
})
// Dark at the top edge (the wall), clear at the bottom (into the room)
const EDGE = gradientTexture((ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
})
const shadowMat = (map) =>
  new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })
const BLOB_MAT = shadowMat(BLOB)
const EDGE_MAT = shadowMat(EDGE)

// One material per flat color, shared by everything that uses it
const MATS = {}
const mat = (color) => (MATS[color] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.9 }))

// ------------------------------------------------------------------ contact shadows
// [x, z, width (x), depth (z), height (optional: above the living-room rug)]
const BLOBS = [
  [1.56, -6.17, 2.4, 2.8], // bed
  [0.25, -7.1, 0.7, 0.65], // nightstand
  [-4.68, -4.5, 0.8, 1.5], // wardrobe
  [4.5, -7.0, 0.6, 0.6], // bedroom plant
  [-0.47, 1.58, 1.1, 2.0, 0.035], // sofa (partly on the rug)
  [-1.6, 1.55, 0.85, 1.3, 0.035], // coffee table (on the rug)
  [-4.62, 1.25, 0.6, 1.0], // TV cabinet
  [-0.75, -2.27, 1.1, 0.5], // living bookshelf
  [-4.55, -2.1, 0.6, 0.6], // cactus
  [4.45, -1.3, 1.2, 2.0], // desk
  [3.5, -0.95, 0.8, 0.8], // desk chair
  [0.6, 2.27, 1.1, 0.5], // desk-room bookcase
  [0.45, -2.15, 0.8, 0.6], // amp
  [-4.6, 3.1, 0.9, 0.9], // fridge
  [-2.75, 7.15, 4.5, 0.8], // kitchen run
  [4.45, 6.0, 1.2, 2.6], // tub
  [1.0, 7.1, 0.6, 0.8], // toilet
  [2.4, 7.25, 0.55, 0.45], // sink
  [0.4, 3.1, 0.8, 0.8], // server rack
]

// ------------------------------------------------------------------ corner shading
// Every room's floor rectangle [x0, x1, z0, z1]; a dark strip runs along each side
const ROOMS = [
  [-5, 5, -7.5, -2.5], // bedroom
  [-5, 0, -2.5, 2.5], // living room
  [0, 5, -2.5, 2.5], // desk room
  [-5, 0, 2.5, 7.5], // kitchen
  [0, 5, 2.5, 7.5], // bathroom
]
const EDGE_W = 0.45
function edgeStrips() {
  const strips = []
  for (const [x0, x1, z0, z1] of ROOMS) {
    const w = x1 - x0
    const d = z1 - z0
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    // [x, z, length, rotation so the dark edge faces the wall]
    strips.push([cx, z0 + EDGE_W / 2, w, 0], [cx, z1 - EDGE_W / 2, w, Math.PI])
    strips.push([x0 + EDGE_W / 2, cz, d, -Math.PI / 2], [x1 - EDGE_W / 2, cz, d, Math.PI / 2])
  }
  return strips
}

// ------------------------------------------------------------------ small builders
const Block = ({ size, color, ...props }) => (
  <mesh material={mat(color)} {...props}>
    <boxGeometry args={size} />
  </mesh>
)
const Can = ({ color, ...props }) => (
  <mesh material={mat(color)} {...props}>
    <cylinderGeometry args={[0.033, 0.033, 0.12, 8]} />
  </mesh>
)

// Cork board with sticky notes (Dave's, presumably)
const NOTES = [
  [-0.3, 0.18, '#ffe66b', 0.1], [-0.05, 0.2, '#ff9bb8', -0.08], [0.22, 0.15, '#9be3ff', 0.05],
  [-0.25, -0.08, '#b6f29a', -0.12], [0.02, -0.05, '#ffe66b', 0.15], [0.28, -0.12, '#ffc27a', -0.05],
]
function Corkboard({ position, turn = 0 }) {
  return (
    <group position={position} rotation-y={turn}>
      <Block size={[0.9, 0.6, 0.03]} color="#6b4a2e" />
      <Block size={[0.82, 0.52, 0.01]} color="#b98a5a" position={[0, 0, 0.018]} />
      {NOTES.map(([x, y, color, r], i) => (
        <Block key={i} size={[0.13, 0.13, 0.005]} color={color} position={[x, y, 0.026]} rotation-z={r} />
      ))}
    </group>
  )
}

// A wall calendar: header + grid of days (one day circled red: today, on call)
function Calendar({ position, turn = 0 }) {
  return (
    <group position={position} rotation-y={turn}>
      <Block size={[0.32, 0.45, 0.01]} color="#f2efe6" />
      <Block size={[0.32, 0.12, 0.012]} color="#c0392b" position={[0, 0.165, 0.002]} />
      {Array.from({ length: 20 }, (_, i) => (
        <Block key={i} size={[0.045, 0.04, 0.012]} color={i === 13 ? '#e04030' : '#cfc8b8'} position={[-0.12 + (i % 5) * 0.06, 0.05 - Math.floor(i / 5) * 0.06, 0.002]} />
      ))}
    </group>
  )
}

const Switch = ({ position, turn = 0 }) => (
  <group position={position} rotation-y={turn}>
    <Block size={[0.08, 0.12, 0.012]} color="#f4f1ea" />
    <Block size={[0.025, 0.045, 0.01]} color="#d8d2c4" position={[0, 0.01, 0.01]} />
  </group>
)

// ------------------------------------------------------------------ the on-call mess
function Laundry({ position, turn = 0 }) {
  return (
    <group position={position} rotation-y={turn}>
      <Block size={[0.55, 0.08, 0.4]} color="#3d5a80" position={[0, 0.04, 0]} rotation-y={0.2} />
      <Block size={[0.45, 0.07, 0.35]} color="#9c2f2f" position={[0.06, 0.1, 0.03]} rotation-y={-0.4} />
      <Block size={[0.35, 0.06, 0.3]} color="#d9d4c7" position={[-0.05, 0.155, -0.02]} rotation-y={0.9} />
      <Block size={[0.3, 0.05, 0.12]} color="#2f2f35" position={[0.25, 0.03, 0.22]} rotation-y={1.2} />
    </group>
  )
}

const Shoe = ({ position, turn, color = '#26262b' }) => (
  <group position={position} rotation-y={turn}>
    <Block size={[0.11, 0.07, 0.27]} color={color} position={[0, 0.035, 0]} />
    <Block size={[0.115, 0.02, 0.28]} color="#e8e4da" position={[0, 0.01, 0]} />
  </group>
)

function PizzaBoxes({ position, turn = 0 }) {
  return (
    <group position={position} rotation-y={turn}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0.02 * i, 0.025 + i * 0.05, -0.015 * i]} rotation-y={i * 0.15}>
          <Block size={[0.4, 0.045, 0.4]} color="#c9a46b" />
          <Block size={[0.18, 0.005, 0.12]} color="#b8322a" position={[0, 0.025, 0]} />
        </group>
      ))}
    </group>
  )
}

const Papers = ({ position, turn = 0 }) => (
  <group position={position} rotation-y={turn}>
    <Block size={[0.21, 0.004, 0.29]} color="#f4f4ee" position={[0, 0.002, 0]} />
    <Block size={[0.21, 0.004, 0.29]} color="#ecebe4" position={[0.03, 0.006, 0.02]} rotation-y={0.3} />
    <Block size={[0.21, 0.004, 0.29]} color="#f8f8f2" position={[-0.02, 0.01, -0.01]} rotation-y={-0.2} />
  </group>
)

// ------------------------------------------------------------------ motion
// The living room ceiling fan, turning slowly
function CeilingFan({ position }) {
  const spin = useRef()
  useFrame((_, dt) => {
    spin.current.rotation.y += dt * 2.2
  })
  return (
    <group ref={spin} position={position}>
      <Piece path="Miscellaneous/Ceiling Fan.fbx" size={[1.0, 0.3, 1.0]} position={[0, 0, 0]} />
    </group>
  )
}

// The pack's CRT, left on: a screen that flickers through late-night channels
function TVGlow({ position, turn }) {
  const screen = useRef()
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6f8fd8', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const channel = Math.floor(t / 3.7) % 4
    const flicker = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 5.1)
    material.color.setHSL([0.6, 0.08, 0.35, 0.55][channel], 0.45, 0.32 * flicker)
  })
  return (
    <mesh ref={screen} position={position} rotation-y={turn} material={material}>
      <planeGeometry args={[0.46, 0.3]} />
    </mesh>
  )
}

export default function Decor() {
  const strips = useMemo(edgeStrips, [])
  return (
    <>
      {/* Grounding: soft shadows under furniture, darker floor along the walls */}
      {BLOBS.map(([x, z, w, d, y = 0.008], i) => (
        <mesh key={`b${i}`} material={BLOB_MAT} position={[x, y, z]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[w, d]} />
        </mesh>
      ))}
      {strips.map(([x, z, len, rot], i) => (
        <mesh key={`e${i}`} material={EDGE_MAT} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, rot]} renderOrder={1}>
          <planeGeometry args={[len, EDGE_W]} />
        </mesh>
      ))}

      {/* Bedroom: rug by the bed, laundry nobody folded (the pictures are memes:
          MemeDecor.jsx) */}
      <Piece path="Carpets/Carpet A.fbx" size={[1.0, 0.02, 1.6]} position={[-0.9, 0.006, -5.7]} />
      <Laundry position={[-2.3, 0, -4.4]} turn={0.4} />
      <Switch position={[-1.62, 1.2, -2.575]} turn={Math.PI} />

      {/* Living room: a picture over the TV, shoes by the door, pizza boxes,
          cans on the coffee table, the fan, the TV left on */}
      <TVGlow position={[-4.47, 0.83, 1.25]} turn={Math.PI / 2} />
      <Shoe position={[-4.6, 0, -1.55]} turn={1.3} />
      <Shoe position={[-4.55, 0, -1.78]} turn={1.75} />
      <Shoe position={[-4.25, 0, -1.6]} turn={0.4} color="#7a2e2e" />
      <PizzaBoxes position={[-0.55, 0, 0.3]} turn={0.3} />
      <Can color="#2fb06a" position={[-1.38, 0.46, 1.5]} />
      <Can color="#d9302f" position={[-1.45, 0.46, 1.62]} rotation-z={Math.PI / 2} />
      <Switch position={[-1.62, 1.2, -2.425]} />
      <Switch position={[-0.075, 1.2, -0.88]} turn={-Math.PI / 2} />
      <CeilingFan position={[-2.2, 2.3, 0.9]} />

      {/* Desk room: rug under the chair, a corkboard of sticky notes, coffee,
          an energy drink, printouts */}
      <Piece path="Carpets/Carpet C.fbx" size={[1.3, 0.02, 1.0]} position={[3.35, 0.006, -1.0]} />
      <Corkboard position={[0.085, 1.5, 1.35]} turn={Math.PI / 2} />
      <Piece path="Miscellaneous/Mug.fbx" size={[0.1, 0.1, 0.08]} position={[4.1, 0.75, -1.5]} turn={-0.6} />
      <Can color="#1a1a1a" position={[4.42, 0.81, -1.95]} />
      <Papers position={[4.12, 0.752, -1.85]} turn={0.3} />
      <Switch position={[0.075, 1.2, 0.88]} turn={Math.PI / 2} />

      {/* Kitchen: a pan on the stove, a stack of dishes, a kettle, a calendar,
          a wall shelf, the bin */}
      <Piece path="Miscellaneous/Pan.fbx" size={[0.42, 0.08, 0.24]} position={[-4.62, 0.9, 7.05]} turn={0.5} />
      <Piece path="Miscellaneous/Plate.fbx" size={[0.24, 0.03, 0.24]} position={[-3.88, 0.9, 7.05]} />
      <Piece path="Miscellaneous/Plate.fbx" size={[0.24, 0.03, 0.24]} position={[-3.88, 0.93, 7.05]} />
      <Piece path="Miscellaneous/Bowl.fbx" size={[0.16, 0.07, 0.16]} position={[-3.86, 0.96, 7.04]} />
      <Piece path="Kitchen/Kettle.fbx" size={[0.18, 0.24, 0.14]} position={[-3.0, 0.9, 7.3]} turn={Math.PI} />
      <Calendar position={[-4.92, 1.45, 6.4]} turn={Math.PI / 2} />
      <Piece path="Shelves/Wall Shelf A.fbx" size={[0.7, 0.06, 0.2]} position={[-0.165, 1.45, 3.6]} turn={-Math.PI / 2} />
      <Piece path="Miscellaneous/Books A.fbx" size={[0.4, 0.2, 0.14]} position={[-0.165, 1.51, 3.55]} turn={-Math.PI / 2} />
      <Piece path="Miscellaneous/Bin.fbx" size={[0.28, 0.38, 0.28]} position={[-0.35, 0, 6.0]} />

      {/* Bathroom: bath mat, spare toilet rolls */}
      <Piece path="Carpets/Carpet B.fbx" size={[0.5, 0.02, 0.8]} position={[3.55, 0.006, 6.0]} />
      <Piece path="Bathroom/Toilet Rolls.fbx" size={[0.2, 0.2, 0.1]} position={[0.5, 0, 7.3]} />
    </>
  )
}
