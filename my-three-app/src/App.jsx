import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import FirstPersonPlayer from './FirstPersonPlayer'
import * as THREE from 'three'

export default function App() {
  return (
    <Canvas shadows>
      <PerspectiveCamera
        makeDefault
        near={0.01}
        far={1000}
        position={[0, 1.6, 0]}
      />
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        position={[5, 10, 5]}
        intensity={1}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* temp floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="gray" />
      </mesh>

      <FirstPersonPlayer />
    </Canvas>
  )
}
