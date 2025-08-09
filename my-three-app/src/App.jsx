import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, KeyboardControls } from '@react-three/drei'
import { Physics, RigidBody } from '@react-three/rapier'
import FirstPersonPlayer from './FirstPersonPlayer'
import TunnelModel from './TunnelModel'

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

      <KeyboardControls
        map={[
          { name: 'forward', keys: ['w', 'ArrowUp'] },
          { name: 'backward', keys: ['s', 'ArrowDown'] },
          { name: 'left', keys: ['a', 'ArrowLeft'] },
          { name: 'right', keys: ['d', 'ArrowRight'] },
        ]}
      >
        <Physics gravity={[0, -9.81, 0]}>
        
<RigidBody type="fixed">
  <mesh position={[0, -1, 0]}>
    { /* <boxGeometry args={[100, 0.1, 100]} /> */}
    <meshStandardMaterial color="red" />
  </mesh>
</RigidBody>
          <TunnelModel />
          <FirstPersonPlayer />
        </Physics>
      </KeyboardControls>
    </Canvas>
  )
}
