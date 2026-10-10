import * as THREE from 'three'

// Tiny procedural textures, sampled with no filtering or mipmaps like the PS1.
// Drawn near-white so they tint whatever color the material already has.

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

// Seeded so every load looks the same
function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

const grime = canvasTexture(32, (ctx, n) => {
  const r = rng(7)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = 200 + Math.floor(r() * 40)
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  // A few stains
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(90,80,60,${0.15 + r() * 0.2})`
    ctx.fillRect(Math.floor(r() * n), Math.floor(r() * n), 2 + Math.floor(r() * 4), 1 + Math.floor(r() * 3))
  }
})

const planks = canvasTexture(32, (ctx, n) => {
  const r = rng(13)
  for (let row = 0; row < 4; row++) {
    const base = 190 + Math.floor(r() * 50)
    for (let y = row * 8; y < row * 8 + 8; y++) {
      for (let x = 0; x < n; x++) {
        const v = base + Math.floor(r() * 18) - (y % 8 === 7 ? 90 : 0)
        ctx.fillStyle = `rgb(${v},${Math.floor(v * 0.92)},${Math.floor(v * 0.85)})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
    const seam = Math.floor(r() * n)
    ctx.fillStyle = 'rgba(40,30,20,0.6)'
    ctx.fillRect(seam, row * 8, 1, 7)
  }
})

// Bathroom floor: a 2×2 block of square tiles with dark grout lines, each tile a
// slightly different white so the floor doesn't look printed
const tiles = canvasTexture(32, (ctx, n) => {
  const r = rng(29)
  const t = n / 2
  ctx.fillStyle = 'rgb(120,126,132)' // grout
  ctx.fillRect(0, 0, n, n)
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      for (let y = 1; y < t; y++) {
        for (let x = 1; x < t; x++) {
          const v = 228 + Math.floor(r() * 14) - (tx + ty) * 6
          ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`
          ctx.fillRect(tx * t + x, ty * t + y, 1, 1)
        }
      }
    }
  }
})

export const TEXTURES = { grime, planks, tiles }

// Clone with a per-mesh repeat (clones share the image, so this is cheap)
export function tiled(name, repeatX, repeatY) {
  const tex = TEXTURES[name].clone()
  tex.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY))
  tex.needsUpdate = true
  return tex
}
