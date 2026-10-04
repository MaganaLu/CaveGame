import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { NIGHT, cityMaterials } from '../weather/weatherState'
import StreetLights from './StreetLights'

// The city outside the windows. The apartment is a unit on the ~5th floor of one
// of these concrete slab blocks; we hide that block's own mesh so it doesn't
// cover the windows, and everything else is the view.
//
// Model: "street city buildings (8)" by dasy444
// https://sketchfab.com/3d-models/street-city-buildings-8-873c5f14ec464966a11a4d772d187270
// Sketchfab Standard license.

const URL = `${import.meta.env.BASE_URL}assets/models/buildings/street_city_buildings_8.glb`

// Model units → meters: blocks are ~2.5 units tall with ~10 floors (~30 m)
const CITY_SCALE = 12
// Apartment floor height above the street
const FLOOR_HEIGHT = 15
// Point in model space where the apartment's origin sits: inside the long slab
// block "Cube011" (x 0.4..3.9, z -0.6..0.9), north wall flush with its facade.
const ANCHOR = { x: 2.4, z: 0.075 }
// Our building: the slab plus the wing joined to it ("Cube012", x 2..3.5,
// z 0.2..3.8), which would otherwise cut through the kitchen and bathroom
const HOST_BLOCKS = ['Cube011', 'Cube012']

// Streetlights hug the sidewalks: open ground within this distance (model units)
// of a building, never inside one, spaced at least LAMP_SPACING apart
const SIDEWALK = { margin: 0.22, reach: 0.55 }
const LAMP_SPACING = 2.0
const GROUND_HALF = 7 // the district's ground plane spans about ±7.2

// Lamp spots in world meters, from building footprints in model space
function findLampSpots(root) {
  const boxes = []
  root.traverse((o) => {
    if (/^(Cube|Plane)/.test(o.name) && o.name !== 'Plane002' && o.children.length) {
      boxes.push(new THREE.Box3().setFromObject(o))
    }
  })
  const near = (x, z, pad) => boxes.some((b) => x > b.min.x - pad && x < b.max.x + pad && z > b.min.z - pad && z < b.max.z + pad)
  const spots = []
  for (let x = -GROUND_HALF; x <= GROUND_HALF; x += 0.25) {
    for (let z = -GROUND_HALF; z <= GROUND_HALF; z += 0.25) {
      if (near(x, z, SIDEWALK.margin) || !near(x, z, SIDEWALK.reach)) continue
      if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < LAMP_SPACING)) continue
      spots.push([x, z])
    }
  }
  // Each lamp's arm reaches away from its nearest building, over the road
  return spots.map(([x, z]) => {
    let best = null
    for (const b of boxes) {
      const cx = Math.max(b.min.x, Math.min(x, b.max.x))
      const cz = Math.max(b.min.z, Math.min(z, b.max.z))
      const d = Math.hypot(x - cx, z - cz)
      if (!best || d < best.d) best = { d, dx: x - cx, dz: z - cz }
    }
    return {
      position: [(x - ANCHOR.x) * CITY_SCALE, -FLOOR_HEIGHT, (z - ANCHOR.z) * CITY_SCALE],
      facing: Math.atan2(best.dx, best.dz),
    }
  })
}

export default function City() {
  const { scene } = useGLTF(URL)

  const { city, lamps } = useMemo(() => {
    const root = scene.clone(true)
    root.updateMatrixWorld(true)
    const lamps = findLampSpots(root)
    cityMaterials.length = 0
    root.traverse((o) => {
      if (HOST_BLOCKS.includes(o.name)) o.visible = false
      if (!o.isMesh) return
      const map = o.material.map
      if (map) map.magFilter = THREE.NearestFilter
      // Night: unlit and tinted (Weather.jsx flashes these for lightning)
      o.material = new THREE.MeshBasicMaterial({ map, color: NIGHT.city })
      cityMaterials.push(o.material)
      // Scenery only: never a target for interaction raycasts (77k triangles)
      o.raycast = () => {}
    })
    return { city: root, lamps }
  }, [scene])

  return (
    <>
      <primitive
        object={city}
        scale={CITY_SCALE}
        position={[-ANCHOR.x * CITY_SCALE, -FLOOR_HEIGHT, -ANCHOR.z * CITY_SCALE]}
      />
      <StreetLights spots={lamps} />
    </>
  )
}

useGLTF.preload(URL)
