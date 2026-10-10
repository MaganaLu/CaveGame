import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGraphics } from '../psx/config'
import { applyMaterialPreset } from '../psx/textureQuality'

// Prop models (public/assets/models/misc) and a loader that gives each use its
// own copy with PS1-style unfiltered textures.

const url = (file) => `${import.meta.env.BASE_URL}assets/models/misc/${encodeURIComponent(file)}`
export const PROP_FILES = {
  pc: url('Low Poly PC.glb'),
  box: url('cardboard_box_1.glb'),
  clock: url('clock_2.glb'),
  outlet: url('electrical_outlet_1.glb'),
  flashlight: url('flashlight_1.glb'),
  floppy: url('floppy_disc_1.glb'),
  notebook: url('notebook_1.glb'),
  padlock: url('padlock_1.glb'),
  chair: url('office_chair_psx.glb'), // CC-BY 4.0, credited in src/credits.js
  bed: url('low-poly_psx_style_double_bed.glb'), // CC-BY 4.0, credited in src/credits.js
  sofa: url('sofa_modular_low_poly_com_almofadas.glb'), // Sketchfab Standard, credited
  coffeeTable: url('rustic_coffee_table_cartoon.glb'), // Sketchfab Standard, credited
  banana: url('retro_banana.glb'), // the golden banana pickup; Sketchfab Standard, credited
  monkey: url('Main Monkey - VR by Victor Karlsson - 4PPyUavd-Yy.glb'), // you; CC-BY, Poly Pizza, credited
  pack: `${import.meta.env.BASE_URL}assets/models/misc/retro-ps1-room-props-pack/source/PS1RoomAssets.glb`, // retro room props (PackProps.jsx)
}
Object.values(PROP_FILES).forEach((f) => useGLTF.preload(f))

// A fresh copy of a model. Its color textures start PS1-style unfiltered; the
// graphics preset (psx/textureQuality.js) sizes them (a 2048 px sofa texture is
// just GPU memory at 240p) and picks the filtering, before the first upload
export function useModel(file) {
  const { scene } = useGLTF(file)
  return useMemo(() => {
    const root = scene.clone(true)
    const preset = useGraphics.getState().preset
    root.traverse((o) => {
      if (!o.isMesh) return
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.map && !m.map.userData.retro) m.map.magFilter = THREE.NearestFilter
        applyMaterialPreset(m, preset)
      }
    })
    return root
  }, [scene])
}

