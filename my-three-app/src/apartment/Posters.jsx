import { useMemo } from 'react'
import * as THREE from 'three'
import { PRINCIPLES, POSTER_PRINCIPLES, principleIndex } from '../game/principles'
import { text } from '../content'
import { fill } from '../game/text'
import { POSTER_ART } from './posterArt'

const UI = text('ui')

// Banana Principle meme posters on the walls. Rendered as tiny canvas textures
// (crunchy on purpose); press E to read the full-size version (ui/PosterCard.jsx).

// Laid out on a 96×128 grid and drawn SCALE× larger, so the words are sharp
// enough to read from across the room while the art stays chunky
const W = 96
const H = 128
const SCALE = 3
const MEME_FONT = 'Impact, "Arial Black", sans-serif'

function wrap(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// The biggest size (max..min) at which `text` fits in `maxLines` lines
function fit(ctx, text, { max, min, maxLines, width, font }) {
  let size = max
  let lines
  for (; size >= min; size -= 0.5) {
    ctx.font = `${size}px ${font}`
    lines = wrap(ctx, text, width)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= width)) break
  }
  return { size: Math.max(size, min), lines }
}

// White meme text with a black outline; `y` is the top line, or the bottom one
// when `fromBottom`
function memeText(ctx, text, y, fromBottom) {
  const { size, lines } = fit(ctx, text, { max: 15, min: 7, maxLines: 2, width: W - 12, font: MEME_FONT })
  const lead = size * 1.05
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size * 0.28
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'
  const start = fromBottom ? y - (lines.length - 1) * lead : y
  lines.forEach((l, i) => {
    ctx.strokeText(l, W / 2, start + i * lead)
    ctx.fillText(l, W / 2, start + i * lead)
  })
}

// The picture: 16×16 pixel art (posterArt.js), 2 poster pixels per art pixel,
// with a hard drop shadow so it pops off the poster's color
const ART_SIZE = 32
function drawArt(ctx, art, x, y) {
  if (!art) return
  const cell = ART_SIZE / art.rows.length
  const paint = (dx, color) =>
    art.rows.forEach((row, ry) =>
      [...row].forEach((c, rx) => {
        if (!art.palette[c]) return
        ctx.fillStyle = color ?? art.palette[c]
        ctx.fillRect(x + dx + rx * cell, y + dx + ry * cell, cell, cell)
      })
    )
  paint(1.5, 'rgba(0, 0, 0, 0.45)')
  paint(0)
}

function posterTexture(principle, number) {
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = principle.bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#f5e6b0'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, W - 4, H - 4)

  // Header: which principle this is
  ctx.fillStyle = '#f5e6b0'
  ctx.fillRect(4, 4, W - 8, 15)
  const name = fit(ctx, principle.name.toUpperCase(), { max: 8, min: 5, maxLines: 2, width: W - 14, font: MEME_FONT })
  ctx.font = `${name.size}px ${MEME_FONT}`
  ctx.fillStyle = principle.bg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  name.lines.forEach((l, i) => ctx.fillText(l, W / 2, 11.5 + (i - (name.lines.length - 1) / 2) * name.size * 0.95))

  memeText(ctx, principle.meme.top, 29, false)
  drawArt(ctx, POSTER_ART[principle.meme.art], W / 2 - ART_SIZE / 2, 66 - ART_SIZE / 2)
  memeText(ctx, principle.meme.bottom, 106, true)

  ctx.font = `6px ${MEME_FONT}`
  ctx.fillStyle = '#f5e6b0'
  ctx.fillText(fill(UI.posters.footer, { n: number }), W / 2, H - 8)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  // Crunchy up close, but mipmapped so the words don't shimmer apart at a distance
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

// [position, rotationY] for each wall slot, in POSTER_PRINCIPLES order. Posters
// hang 3 cm off the wall (wall faces are at ±0.05 from the wall's center line):
// closer, and the PS1 vertex snapping makes them flicker against the wall
const SLOTS = [
  [[-1.3, 1.5, -7.42], 0], // bedroom, north wall
  [[4.92, 1.5, -5.2], -Math.PI / 2], // bedroom, east wall
  [[-0.08, 1.5, 1.6], -Math.PI / 2], // living room, wall shared with desk room
  [[-4.2, 1.5, -2.42], 0], // living room, north wall
  [[4.92, 1.85, -0.95], -Math.PI / 2], // desk room, above the CRT
  [[2.5, 1.5, -2.42], 0], // desk room, north wall
  [[-4.92, 1.5, 5.5], Math.PI / 2], // kitchen, west wall
  [[4.92, 1.6, 3.6], -Math.PI / 2], // bathroom, east wall
]

export default function Posters() {
  const posters = useMemo(
    () =>
      POSTER_PRINCIPLES.map((name, slot) => {
        const index = principleIndex(name)
        const p = PRINCIPLES[index]
        return {
          index,
          slot,
          texture: posterTexture(p, index + 1),
        }
      }),
    []
  )

  return posters.map(({ index, slot, texture }) => {
    const [position, rotationY] = SLOTS[slot]
    return (
      <mesh key={index} position={position} rotation-y={rotationY}>
        <planeGeometry args={[0.6, 0.8]} />
        {/* A little self-light so they stay readable at night, like the other signs */}
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.18} roughness={0.9} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
      </mesh>
    )
  })
}
