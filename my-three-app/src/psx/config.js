import { create } from 'zustand'

// Graphics presets, picked in Settings → Graphics and saved per browser. Shared by
// PSXEffect (render), PSXMaterials (vertex snap, texture size/filtering) and the
// weather (rain streak width).
//   retro:  the PS1 look. 240p, hard pixels, 5-bit dithered color, small textures
//   smooth: same low-poly world, cleaner picture. 480p with sharp-bilinear
//           upscaling, full color, bigger filtered textures, lighter wobble
// Both get the color grade, vignette and lamp glow.
export const PRESETS = {
  retro: { height: 240, smooth: false, levels: 31, dither: 1, maxTexture: 256, bloom: 0.7, vignette: 0.35 },
  smooth: { height: 480, smooth: true, levels: 0, dither: 0, maxTexture: 512, bloom: 0.8, vignette: 0.3 },
}
export const DEFAULT_PRESET = 'smooth'
const STORAGE_KEY = 'graphics'

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved in PRESETS ? saved : DEFAULT_PRESET
  } catch {
    return DEFAULT_PRESET
  }
}

export const useGraphics = create((set) => ({
  preset: load(),
  setPreset: (preset) => {
    if (!(preset in PRESETS)) return
    try {
      localStorage.setItem(STORAGE_KEY, preset)
    } catch {
      // storage blocked: the choice lasts until the page reloads
    }
    set({ preset })
  },
}))

// The current preset's settings, read live (PSX.height etc.)
export const PSX = new Proxy({}, { get: (_, key) => PRESETS[useGraphics.getState().preset][key] })
