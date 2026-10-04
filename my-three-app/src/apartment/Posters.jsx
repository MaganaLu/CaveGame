import { useMemo } from 'react'
import * as THREE from 'three'
import { PRINCIPLES, POSTER_PRINCIPLES, principleIndex } from '../game/principles'

// Banana Principle meme posters on the walls. Rendered as tiny canvas textures
// (crunchy on purpose); press E to read the full-size version (ui/PosterCard.jsx).

const W = 96
const H = 128

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

function memeText(ctx, text, y, fromBottom) {
  ctx.font = 'bold 11px Impact, "Arial Black", sans-serif'
  ctx.textAlign = 'center'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'
  const lines = wrap(ctx, text, W - 10)
  const start = fromBottom ? y - (lines.length - 1) * 12 : y
  lines.forEach((l, i) => {
    ctx.strokeText(l, W / 2, start + i * 12)
    ctx.fillText(l, W / 2, start + i * 12)
  })
}

function posterTexture(principle, number) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = principle.bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#f5e6b0'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, W - 4, H - 4)

  memeText(ctx, principle.meme.top, 16, false)
  ctx.font = '40px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(principle.meme.emoji, W / 2, 80)
  memeText(ctx, principle.meme.bottom, 108, true)

  ctx.font = '7px sans-serif'
  ctx.fillStyle = '#f5e6b0'
  ctx.fillText(`BANANA PRINCIPLE #${number}`, W / 2, H - 6)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  return tex
}

// [position, rotationY] for each wall slot, in POSTER_PRINCIPLES order
const SLOTS = [
  [[-1.3, 1.5, -7.44], 0], // bedroom, north wall
  [[4.94, 1.5, -5.2], -Math.PI / 2], // bedroom, east wall
  [[-0.06, 1.5, 1.6], -Math.PI / 2], // living room, wall shared with desk room
  [[-4.2, 1.5, -2.44], 0], // living room, north wall
  [[4.94, 1.85, 0], -Math.PI / 2], // desk room, above the CRT
  [[2.5, 1.5, -2.44], 0], // desk room, north wall
  [[-4.94, 1.5, 5.5], Math.PI / 2], // kitchen, west wall
  [[4.94, 1.6, 3.6], -Math.PI / 2], // bathroom, east wall
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
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    )
  })
}
