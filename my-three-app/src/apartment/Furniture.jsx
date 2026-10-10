import { useMemo } from 'react'
import { useFBX } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

// Furniture from the "Low Poly Furniture" pack (public/assets/models/misc/Low Poly
// Furniture, flat-colored .fbx). Most of it dresses up a greybox piece that stays
// in Apartment.jsx as the (invisible) collider, so gameplay heights don't move:
// counter top 0.9 m, nightstand 0.55 m, and so on.
//
// Every model faces +z in its file. `size` is [w, h, d] in meters measured before
// `turn` (π/2 faces +x, -π/2 faces -x, π faces -z).
const file = (path) => `${import.meta.env.BASE_URL}assets/models/misc/Low%20Poly%20Furniture/${path.split('/').map(encodeURIComponent).join('/')}`

const USED = [
  'Kitchen/Oven.fbx', 'Kitchen/Cupboard C.fbx', 'Kitchen/Cupboard E.fbx', 'Kitchen/Dishwasher.fbx',
  'Kitchen/Cupboard D.fbx', 'Kitchen/Cupboard Sink.fbx', 'Kitchen/Fridge A.fbx', 'Kitchen/Knife Block.fbx',
  'Bathroom/Bath.fbx', 'Bathroom/Toilet.fbx', 'Bathroom/Sink.fbx', 'Bathroom/Toilet Roll Holder.fbx', 'Bathroom/Towel Holder.fbx',
  'Drawers/Drawer B.fbx', 'Miscellaneous/Radiator A.fbx', 'Miscellaneous/Plant A.fbx', 'Miscellaneous/Plant B.fbx',
  'Miscellaneous/Bin.fbx', 'Shelves/Shelf D.fbx', 'Shelves/Shelf E.fbx', 'Tables/Desk.fbx',
  // Decor.jsx
  'Carpets/Carpet A.fbx', 'Carpets/Carpet B.fbx', 'Carpets/Carpet C.fbx', 'Miscellaneous/Ceiling Fan.fbx', 'Miscellaneous/Mug.fbx',
  'Miscellaneous/Pan.fbx', 'Miscellaneous/Plate.fbx', 'Miscellaneous/Bowl.fbx', 'Kitchen/Kettle.fbx', 'Shelves/Wall Shelf A.fbx',
  'Miscellaneous/Books A.fbx', 'Bathroom/Toilet Rolls.fbx',
]
USED.forEach((p) => useFBX.preload(file(p)))

export function Piece({ path, size, position, turn = 0, solid = false }) {
  const source = useFBX(file(path))
  const [w, h, d] = size
  const { model, scale, offset } = useMemo(() => {
    const m = source.clone(true)
    m.traverse((o) => {
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((x) => x.clone()) : o.material.clone()
        o.castShadow = o.receiveShadow = false
      }
    })
    const box = new THREE.Box3().setFromObject(m)
    const s = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    return { model: m, scale: [w / s.x, h / s.y, d / s.z], offset: [-c.x, -box.min.y, -c.z] }
  }, [source, w, h, d])
  const body = (
    <group position={position} rotation-y={turn}>
      <group scale={scale}>
        <primitive object={model} position={offset} />
      </group>
    </group>
  )
  return solid ? <RigidBody type="fixed" colliders="cuboid">{body}</RigidBody> : body
}

// The kitchen run along the south wall, west → east, 4.3 m in all, 0.9 m tall
// (the counter the laptop, coffee machine and flashlight sit on)
const KITCHEN = [
  ['Kitchen/Oven.fbx', 0.6],
  ['Kitchen/Cupboard C.fbx', 0.65],
  ['Kitchen/Cupboard E.fbx', 1.0],
  ['Kitchen/Dishwasher.fbx', 0.6],
  ['Kitchen/Cupboard D.fbx', 0.65],
  ['Kitchen/Cupboard Sink.fbx', 0.8],
]

export default function Furniture() {
  let x = -4.9
  const kitchen = KITCHEN.map(([path, w]) => {
    const at = x + w / 2
    x += w
    return <Piece key={path} path={path} size={[w, 0.9, 0.6]} position={[at, 0, 7.15]} turn={Math.PI} />
  })
  return (
    <>
      {/* Bedroom: nightstand (phone + lamp on top), radiator under the window, a plant */}
      <Piece path="Drawers/Drawer B.fbx" size={[0.5, 0.55, 0.45]} position={[0.25, 0, -7.1]} />
      <Piece path="Miscellaneous/Radiator A.fbx" size={[1.0, 0.5, 0.08]} position={[-3.0, 0.12, -7.395]} />
      <Piece path="Miscellaneous/Plant A.fbx" size={[0.45, 0.9, 0.45]} position={[4.5, 0, -7.0]} solid />

      {/* Living room: a bookshelf by the bedroom door, a plant in the corner */}
      <Piece path="Shelves/Shelf D.fbx" size={[0.9, 1.8, 0.35]} position={[-0.75, 0, -2.27]} solid />
      <Piece path="Miscellaneous/Plant B.fbx" size={[0.5, 0.9, 0.5]} position={[-4.55, 0, -2.1]} solid />

      {/* Desk room: the desk along the east wall under the window, drawers to the
          south. 1.0 m deep, back to the wall: the model's top is inset ~10 cm from
          its frame, and the keyboard + mouse reach x 4.14 */}
      <Piece path="Tables/Desk.fbx" size={[1.8, 0.75, 1.0]} position={[4.45, 0, -1.3]} turn={-Math.PI / 2} solid />

      {/* Desk room: a short bookcase by the bathroom door, a bin by the desk */}
      <Piece path="Shelves/Shelf E.fbx" size={[0.9, 1.4, 0.35]} position={[0.6, 0, 2.27]} turn={Math.PI} solid />
      <Piece path="Miscellaneous/Bin.fbx" size={[0.28, 0.38, 0.28]} position={[4.7, 0, -0.12]} />

      {/* Kitchen */}
      {kitchen}
      <Piece path="Kitchen/Fridge A.fbx" size={[0.7, 1.9, 0.7]} position={[-4.6, 0, 3.1]} turn={Math.PI / 2} />
      <Piece path="Kitchen/Knife Block.fbx" size={[0.12, 0.25, 0.2]} position={[-4.0, 0.9, 7.3]} turn={Math.PI} />

      {/* Bathroom */}
      <Piece path="Bathroom/Bath.fbx" size={[2.4, 0.55, 0.95]} position={[4.45, 0, 6.0]} turn={Math.PI / 2} />
      <Piece path="Bathroom/Toilet.fbx" size={[0.45, 0.8, 0.65]} position={[1.0, 0, 7.1]} turn={Math.PI} />
      <Piece path="Bathroom/Sink.fbx" size={[0.55, 0.9, 0.4]} position={[2.4, 0, 7.25]} turn={Math.PI} />
      <Piece path="Bathroom/Toilet Roll Holder.fbx" size={[0.16, 0.12, 0.12]} position={[1.5, 0.6, 7.38]} turn={Math.PI} />
      <Piece path="Bathroom/Towel Holder.fbx" size={[0.5, 0.26, 0.09]} position={[4.89, 1.1, 4.4]} turn={-Math.PI / 2} />
    </>
  )
}
