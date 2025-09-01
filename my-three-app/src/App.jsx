import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Physics, RigidBody } from '@react-three/rapier'
import FirstPersonPlayer from './components/Player/FirstPersonPlayer'
import TunnelModel from './components/Environment/TunnelModel'
import { useState } from 'react'

export default function App() {
  const [scene, setScene] = useState('menu')

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

      <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed">
          <mesh position={[0, -1, 0]}>
            <meshStandardMaterial color="red" />
          </mesh>
        </RigidBody>

        <TunnelModel />
        <FirstPersonPlayer />
      </Physics>
    </Canvas>
  )
}
