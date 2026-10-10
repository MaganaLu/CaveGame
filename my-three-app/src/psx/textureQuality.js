import * as THREE from 'three'
import { PRESETS } from './config'

// Per-preset texture size and filtering, for every texture in the scene
// (PSXMaterials applies it; models.js applies it as models load).
//   retro:  big model textures drawn down to 256 px, and each texture keeps the
//           hard PS1 filtering it was made with
//   smooth: model textures up to 512 px, smoothed when magnified, mipmapped in
//           the distance
// Textures we draw ourselves (canvases: posters, signs, the rug) are made at the
// size they need and never resized. Pixel art marked `userData.pixelArt` keeps
// its hard pixels in both presets.

const KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap']

const sources = new WeakMap() // texture → its original image
const resized = new WeakMap() // original image → Map(size → canvas)

function fitTexture(tex, max) {
  if (!sources.has(tex)) sources.set(tex, tex.image)
  const img = sources.get(tex)
  let next = img
  if (img.width > max || img.height > max) {
    let sizes = resized.get(img)
    if (!sizes) resized.set(img, (sizes = new Map()))
    next = sizes.get(max)
    if (!next) {
      const k = max / Math.max(img.width, img.height)
      next = document.createElement('canvas')
      next.width = Math.max(1, Math.round(img.width * k))
      next.height = Math.max(1, Math.round(img.height * k))
      next.getContext('2d').drawImage(img, 0, 0, next.width, next.height)
      sizes.set(max, next)
    }
  }
  if (tex.image === next) return
  // A new size can't be uploaded into the old GPU texture: free it, and it's
  // re-created at the new size on the next draw
  if (tex.image.width !== next.width || tex.image.height !== next.height) tex.dispose()
  tex.image = next
}

export function applyTexturePreset(tex, preset) {
  if (!tex?.image || tex.isRenderTargetTexture || tex.userData.psxPreset === preset) return
  const p = PRESETS[preset]
  // Remember how the texture was made, to go back to it in retro
  tex.userData.retro ??= { mag: tex.magFilter, min: tex.minFilter, mips: tex.generateMipmaps }
  const hadMips = tex.generateMipmaps
  const source = sources.get(tex) ?? tex.image
  if (!(source instanceof HTMLCanvasElement) && !(source instanceof HTMLVideoElement) && source.width) fitTexture(tex, p.maxTexture)
  if (p.smooth && !tex.userData.pixelArt) {
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.generateMipmaps = true
  } else {
    const { mag, min, mips } = tex.userData.retro
    tex.magFilter = tex.userData.pixelArt ? THREE.NearestFilter : mag
    tex.minFilter = min
    tex.generateMipmaps = mips
  }
  // The GPU texture was allocated with or without mip levels: re-create it
  if (tex.generateMipmaps !== hadMips) tex.dispose()
  tex.userData.psxPreset = preset
  tex.needsUpdate = true
}

export function applyMaterialPreset(material, preset) {
  for (const key of KEYS) applyTexturePreset(material[key], preset)
}
