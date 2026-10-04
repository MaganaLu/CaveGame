import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Prop models (public/assets/models/misc) and a loader that gives each use its
// own copy with PS1-style unfiltered textures.

const url = (file) => `${import.meta.env.BASE_URL}assets/models/misc/${encodeURIComponent(file)}`
export const PROP_FILES = {
  pc: url('Low Poly PC.glb'),
  box: url('cardboard_box_1.glb'),
  carpet: url('carpet_mp_1.glb'),
  clock: url('clock_2.glb'),
  outlet: url('electrical_outlet_1.glb'),
  flashlight: url('flashlight_1.glb'),
  floppy: url('floppy_disc_1.glb'),
  notebook: url('notebook_1.glb'),
  padlock: url('padlock_1.glb'),
  chair: url('office_chair_psx.glb'), // CC-BY 4.0, credited in src/credits.js
  bed: url('low-poly_psx_style_double_bed.glb'), // CC-BY 4.0, credited in src/credits.js
}
Object.values(PROP_FILES).forEach((f) => useGLTF.preload(f))

// A fresh copy of a model with PS1-style unfiltered textures
export function useModel(file) {
  const { scene } = useGLTF(file)
  return useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => {
      if (o.isMesh && o.material.map) o.material.map.magFilter = THREE.NearestFilter
    })
    return root
  }, [scene])
}

