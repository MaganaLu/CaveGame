import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { text } from '../content'
import { PORTRAITS } from '../ui/portraits'
import { DecorBanana } from './Props'

// You're a monkey, on call for CodeMonkey Corp. The apartment shows it: bananas,
// a tire swing, vines, and big-tech office memes (parodies: no real logos or
// brands). Signs are tiny canvas textures; every word is in ui.json → decor.
const T = text('ui').decor

// ------------------------------------------------------------------ signs
const PX_PER_M = 320
const FONT = '"Pixelify Sans", "DotGothic16", monospace'

function drawPortrait(ctx, who, x, y, size) {
  const p = PORTRAITS[who]
  const cell = size / p.rows.length
  p.rows.forEach((row, ry) =>
    [...row].forEach((c, rx) => {
      if (!p.palette[c]) return
      ctx.fillStyle = p.palette[c]
      ctx.fillRect(Math.floor(x + rx * cell), Math.floor(y + ry * cell), Math.ceil(cell), Math.ceil(cell))
    })
  )
}

// The frugality picture: a door on two sawhorses, with a monitor on it
function drawDoorDesk(ctx, w, h) {
  ctx.fillStyle = '#8a5a36'
  ctx.fillRect(w * 0.15, h * 0.42, w * 0.7, h * 0.08) // the door, as a desk
  ctx.fillStyle = '#6b4428'
  for (const x of [0.22, 0.7]) {
    ctx.fillRect(w * x, h * 0.5, w * 0.03, h * 0.22)
    ctx.fillRect(w * (x + 0.06), h * 0.5, w * 0.03, h * 0.22)
  }
  ctx.fillStyle = '#d8d2c4'
  ctx.fillRect(w * 0.42, h * 0.2, w * 0.2, h * 0.2) // monitor
  ctx.fillStyle = '#3ff0b0'
  ctx.fillRect(w * 0.44, h * 0.22, w * 0.16, h * 0.14)
  ctx.fillStyle = '#d8b54a'
  ctx.beginPath()
  ctx.arc(w * 0.3, h * 0.42, h * 0.04, Math.PI, 0) // a banana-yellow mug
  ctx.fill()
}

// lines: [text, size (0..1 of the sign height), color]. `art` draws a picture
// in the top part, the text then sits below it.
function signTexture({ size: [w, h], lines, bg, border, art, artShare = 0 }) {
  const cw = Math.round(w * PX_PER_M)
  const ch = Math.round(h * PX_PER_M)
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cw, ch)
  if (border) {
    ctx.strokeStyle = border
    ctx.lineWidth = Math.max(4, ch * 0.05)
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, cw - ctx.lineWidth, ch - ctx.lineWidth)
  }
  const artH = ch * artShare
  if (art) art(ctx, cw, artH)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const total = lines.reduce((sum, [, s]) => sum + s, 0)
  let y = artH + (ch - artH - total * ch) / 2
  for (const [line, s, color] of lines) {
    const px = s * ch
    ctx.font = `bold ${Math.round(px * 0.72)}px ${FONT}`
    ctx.fillStyle = color
    ctx.fillText(line, cw / 2, y + px / 2, cw * 0.92)
    y += px
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearFilter
  return tex
}

// A sign on a thin backing board. Faces +z before `turn`; `flat` lays it face up.
// The backing reaches `depth` behind `position`: keep that 1.5 cm+ off any wall.
function Sign({ position, turn = 0, flat = false, depth = 0.02, backing = '#3a2a1c', ...spec }) {
  const material = useMemo(() => {
    const map = signTexture(spec)
    // A little self-light so the words stay readable at night
    // Depth-biased toward the camera: flat on a wall or a box, it must never lose
    // to the surface behind it when the PS1 vertex snapping jiggles depths
    return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.18, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [w, h] = spec.size
  return (
    <group position={position} rotation={flat ? [-Math.PI / 2, 0, turn] : [0, turn, 0]}>
      {depth > 0 && (
        <mesh position={[0, 0, -depth / 2]}>
          <boxGeometry args={[w + 0.03, h + 0.03, depth]} />
          <meshStandardMaterial color={backing} roughness={0.9} />
        </mesh>
      )}
      <mesh material={material} position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}

const lines = (words, sizes, colors) => words.map((t, i) => [t, sizes[i] ?? sizes.at(-1), colors[i] ?? colors.at(-1)])

// ------------------------------------------------------------------ monkey stuff
const MAT = {}
const mat = (color) => (MAT[color] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.9 }))
const Block = ({ size, color, ...props }) => (
  <mesh material={mat(color)} {...props}>
    <boxGeometry args={size} />
  </mesh>
)

// The Community Banana Stand, with a little banana pyramid on top
function BananaStand({ position }) {
  const [x, , z] = position
  const top = 0.8
  // [x offset, y layer, z offset]: two rows deep at the bottom, tapering to one
  const bunches = []
  const layers = [[4, [-0.09, 0.09]], [3, [-0.09, 0.09]], [2, [0]], [1, [0]]]
  layers.forEach(([n, rows], layer) => {
    for (const dx of rows) for (let i = 0; i < n; i++) bunches.push([dx, layer, (i - (n - 1) / 2) * 0.2])
  })
  return (
    <group>
      <Block size={[0.5, 0.04, 0.9]} color="#8a5a36" position={[x, top - 0.02, z]} />
      <Block size={[0.5, 0.18, 0.02]} color="#f2c230" position={[x, top - 0.13, z - 0.44]} />
      <Block size={[0.5, 0.18, 0.02]} color="#f2c230" position={[x, top - 0.13, z + 0.44]} />
      <Block size={[0.02, 0.18, 0.9]} color="#f2c230" position={[x - 0.24, top - 0.13, z]} />
      {[[-0.22, -0.42], [-0.22, 0.42], [0.22, -0.42], [0.22, 0.42]].map(([lx, lz]) => (
        <Block key={`${lx},${lz}`} size={[0.04, top - 0.04, 0.04]} color="#6b4428" position={[x + lx, (top - 0.04) / 2, z + lz]} />
      ))}
      {bunches.map(([dx, layer, dz], i) => (
        <DecorBanana key={i} position={[x + dx, top + layer * 0.088, z + dz]} turn={Math.PI / 2 + (i % 3) * 0.15 - 0.15} length={0.19} />
      ))}
    </group>
  )
}

// A tire on a rope, swaying a little (a monkey lives here)
function TireSwing({ position }) {
  const pivot = useRef()
  useFrame(({ clock }) => {
    pivot.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.05
    pivot.current.rotation.x = Math.sin(clock.elapsedTime * 0.6 + 1) * 0.03
  })
  const [x, , z] = position
  const ceiling = 2.6
  const tireY = 0.55
  return (
    <group ref={pivot} position={[x, ceiling, z]}>
      <mesh material={mat('#a8865a')} position={[0, -(ceiling - tireY - 0.32) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, ceiling - tireY - 0.32, 5]} />
      </mesh>
      <mesh material={mat('#1c1c1f')} position={[0, tireY - ceiling, 0]} rotation-y={0.4}>
        <torusGeometry args={[0.3, 0.1, 6, 12]} />
      </mesh>
    </group>
  )
}

// Jungle vines hanging from the ceiling: a stem and a few leaves
function Vine({ position, length = 1.1 }) {
  const [x, , z] = position
  const leaves = Math.round(length / 0.22)
  return (
    <group position={[x, 2.6, z]}>
      <mesh material={mat('#3f6b2a')} position={[0, -length / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, length, 4]} />
      </mesh>
      {Array.from({ length: leaves }, (_, i) => (
        <mesh key={i} material={mat('#4f8f34')} position={[0.05 * (i % 2 ? 1 : -1), -0.15 - i * 0.22, 0]} rotation={[0.3, i * 1.3, (i % 2 ? -1 : 1) * 0.6]}>
          <boxGeometry args={[0.14, 0.01, 0.07]} />
        </mesh>
      ))}
    </group>
  )
}

// A banana peel, dropped wherever it was finished
function Peel({ position: [x, y, z], turn = 0 }) {
  // A touch higher than flat on the floor, so the floor can't flicker through it
  return (
    <group position={[x, y + 0.01, z]} rotation-y={turn}>
      {[0, 1.6, 3.2, 4.6].map((a, i) => (
        <Block key={i} size={[0.13, 0.012, 0.035]} color={i % 2 ? '#e8c23a' : '#d9b02e'} position={[Math.cos(a) * 0.06, 0.008, Math.sin(a) * 0.06]} rotation-y={-a} />
      ))}
      <Block size={[0.04, 0.02, 0.025]} color="#5a3a1a" position={[0, 0.012, 0]} />
    </group>
  )
}

// Your badge, hung on a hook by the front door
function Badge({ position, turn }) {
  return (
    <group position={position} rotation-y={turn}>
      <Block size={[0.03, 0.03, 0.03]} color="#b8a060" position={[0, 0.2, 0.015]} />
      <Block size={[0.012, 0.2, 0.004]} color="#2f6fd6" position={[-0.035, 0.1, 0.02]} rotation-z={-0.33} />
      <Block size={[0.012, 0.2, 0.004]} color="#2f6fd6" position={[0.035, 0.1, 0.02]} rotation-z={0.33} />
      <Sign
        position={[0, -0.04, 0.025]}
        depth={0.004}
        backing="#2f6fd6"
        size={[0.11, 0.15]}
        bg="#f4f1ea"
        artShare={0.62}
        art={(ctx, w, h) => {
          ctx.fillStyle = '#2f6fd6'
          ctx.fillRect(0, 0, w, h * 0.18)
          drawPortrait(ctx, 'YOU', w * 0.22, h * 0.2, w * 0.56)
        }}
        lines={lines(T.badge, [0.13, 0.1], ['#16191f', '#5f6b7a'])}
      />
    </group>
  )
}

export default function MemeDecor() {
  return (
    <>
      {/* Kitchen: the Community Banana Stand, and its sign */}
      <BananaStand position={[-0.32, 0, 4.6]} />
      <Sign
        position={[-0.085, 1.38, 4.6]}
        turn={-Math.PI / 2}
        size={[0.8, 0.46]}
        bg="#f2c230"
        border="#6b4428"
        lines={lines(T.bananaStand, [0.17, 0.22, 0.12, 0.11], ['#3a2a1c', '#3a2a1c', '#6b4428', '#8a5a36'])}
      />
      {/* On the fridge door */}
      <Sign
        position={[-4.21, 1.42, 2.95]}
        turn={Math.PI / 2}
        depth={0.004}
        backing="#c8c8c8"
        size={[0.3, 0.3]}
        bg="#f4f4ee"
        border="#c0392b"
        lines={lines(T.sev1, [0.16, 0.16, 0.42], ['#16191f', '#16191f', '#c0392b'])}
      />

      {/* Front door: Day 1 over it, a Prime-ate delivery stack beside it, your badge */}
      <Sign
        position={[-4.915, 2.33, -0.8]}
        turn={Math.PI / 2}
        size={[0.95, 0.2]}
        bg="#6b4428"
        lines={lines(T.day1, [0.6], ['#f2c230'])}
      />
      <Block size={[0.45, 0.3, 0.42]} color="#b88a55" position={[-4.55, 0.15, -0.05]} />
      <Block size={[0.36, 0.24, 0.32]} color="#c49a62" position={[-4.57, 0.42, -0.08]} rotation-y={0.25} />
      <Sign
        position={[-4.322, 0.15, -0.05]}
        turn={Math.PI / 2}
        depth={0}
        size={[0.34, 0.2]}
        bg="#d9c49a"
        lines={lines(T.primeate, [0.36, 0.24, 0.22], ['#3a2a1c', '#5a4a2c', '#8a3a2a'])}
      />
      <Badge position={[-4.925, 1.3, -1.6]} turn={Math.PI / 2} />

      {/* Living room: the frugality picture over the TV */}
      <Sign
        position={[-4.915, 1.65, 1.25]}
        turn={Math.PI / 2}
        size={[0.6, 0.45]}
        bg="#e8e0cc"
        border="#3a2a1c"
        artShare={0.62}
        art={drawDoorDesk}
        lines={lines(T.frugality, [0.15, 0.1], ['#3a2a1c', '#6b4428'])}
      />
      {/* Pizza boxes by the sofa: the team */}
      <Sign position={[-0.53, 0.152, 0.28]} flat turn={-0.6} depth={0} size={[0.3, 0.14]} bg="#c9a46b" lines={lines(T.pizza, [0.42, 0.3], ['#8a2a22', '#5a3a1a'])} />

      {/* Bedroom: employee of the month (you), a certificate, the tire swing */}
      <Sign
        position={[2.8, 1.5, -2.59]}
        turn={Math.PI}
        size={[0.5, 0.65]}
        bg="#f2c230"
        border="#3a2a1c"
        artShare={0.68}
        art={(ctx, w, h) => drawPortrait(ctx, 'YOU', w * 0.18, h * 0.12, w * 0.64)}
        lines={lines(T.employee, [0.13, 0.13], ['#3a2a1c', '#3a2a1c'])}
      />
      <Sign
        position={[0.9, 1.6, -2.59]}
        turn={Math.PI}
        size={[0.45, 0.34]}
        bg="#f4efe0"
        border="#b8a060"
        lines={lines(T.barRaiser, [0.15, 0.22, 0.13, 0.13], ['#5f6b7a', '#3a2a1c', '#5f6b7a', '#8a3a2a'])}
      />
      <TireSwing position={[-3.0, 0, -5.8]} />

      {/* Jungle vines in the corners */}
      <Vine position={[-4.78, 0, -2.25]} length={1.2} />
      <Vine position={[-4.6, 0, -2.3]} length={0.8} />
      <Vine position={[-0.18, 0, -2.3]} length={1.0} />
      <Vine position={[4.82, 0, 2.3]} length={1.1} />
      <Vine position={[-4.8, 0, -7.3]} length={0.9} />

      {/* Banana peels, wherever they were finished */}
      <Peel position={[-0.55, 0, 5.7]} turn={0.4} />
      <Peel position={[3.85, 0, -0.15]} turn={1.2} />
      <Peel position={[-1.1, 0, 0.35]} turn={2.3} />
      <Peel position={[1.6, 0, 6.5]} turn={0.9} />
    </>
  )
}
