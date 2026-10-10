import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { PROP_FILES } from './models'

// Decor from the retro PS1 room props pack (one .glb, one texture atlas). Its
// pieces are named by Blender default ("Cube.001"…, loaded without the dot), so
// PIECES says what each is.
// Every piece faces +z in the file; `turn` rotates it (π/2 faces +x, -π/2 faces -x,
// π faces -z). The branded pieces (movie/band posters, the cola can) are left
// out on purpose.
const PIECES = {
  tv: 'Cube', // CRT TV
  wardrobe: 'Cube001',
  door: 'Cube002',
  clock: 'Cylinder001',
  amp: 'Cube003', // guitar amp
  guitar: 'Plane',
  console: 'Cube004',
  padWhite: 'Plane007',
  padBlue: 'Plane008',
  cabinet: 'Cube005', // TV cabinet
  books: 'Cube006', // a row of books
}

// One piece, scaled (uniformly) so its height is `height` m, centered on x/z
// with its bottom at y = 0 (so `position` is the spot on the floor or surface)
export function PackPiece({ piece, height, position, turn = 0, tilt, solid = false, ...props }) {
  const { nodes } = useGLTF(PROP_FILES.pack)
  const prepared = useMemo(() => {
    const source = nodes[PIECES[piece]]
    // A missing piece is skipped, never allowed to take the whole apartment down
    if (!source) {
      console.warn(`PackPiece: no "${PIECES[piece]}" in the props pack`)
      return null
    }
    const m = source.clone()
    m.position.set(0, 0, 0)
    m.material = m.material.clone()
    if (m.material.map) m.material.map.magFilter = THREE.NearestFilter
    m.material.alphaTest = 0.5
    const box = new THREE.Box3().setFromObject(m)
    const size = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    return { mesh: m, scale: height / size.y, offset: [-c.x, -box.min.y, -c.z] }
  }, [nodes, piece, height])
  if (!prepared) return null
  const { mesh, scale, offset } = prepared
  const body = (
    <group position={position} rotation={[tilt ?? 0, turn, 0]} {...props}>
      <group scale={scale}>
        <primitive object={mesh} position={offset} />
      </group>
    </group>
  )
  return solid ? <RigidBody type="fixed" colliders="cuboid">{body}</RigidBody> : body
}

// Controllers lie flat, face up: the file has them standing. Tipped back about x,
// then lifted half their thickness and re-centered.
const PAD_LENGTH = 0.1
function Pad({ color, position, turn = 0 }) {
  return (
    <group position={position} rotation-y={turn}>
      <group rotation-x={-Math.PI / 2} position={[0, 0.014, PAD_LENGTH / 2]}>
        <PackPiece piece={color} height={PAD_LENGTH} position={[0, 0, 0]} />
      </group>
    </group>
  )
}

export default function PackProps() {
  return (
    <>
      {/* Living room: TV cabinet + CRT against the west wall, facing the couch */}
      <PackPiece piece="cabinet" height={0.6} position={[-4.62, 0, 1.25]} turn={Math.PI / 2} solid />
      <PackPiece piece="tv" height={0.44} position={[-4.65, 0.6, 1.25]} turn={Math.PI / 2} />
      <PackPiece piece="console" height={0.07} position={[-4.1, 0, 1.95]} turn={1.9} />
      <Pad color="padWhite" position={[-1.75, 0.4, 1.7]} turn={2.2} />
      <Pad color="padBlue" position={[-0.55, 0.44, 1.05]} turn={-1.2} />

      {/* Desk room, north corner: the guitar nobody plays, leaning on the wall */}
      <PackPiece piece="amp" height={0.42} position={[0.45, 0, -2.15]} turn={0.5} solid />
      <PackPiece piece="guitar" height={1.0} position={[1.0, 0, -2.285]} tilt={-0.12} />

      {/* Desk: books along the back edge, by the lamp */}
      <PackPiece piece="books" height={0.17} position={[4.86, 0.75, -1.75]} turn={-Math.PI / 2} />

      {/* Kitchen: a wall clock on the bathroom-side wall */}
      <PackPiece piece="clock" height={0.38} position={[-0.085, 1.7, 5.2]} turn={-Math.PI / 2} />
    </>
  )
}
