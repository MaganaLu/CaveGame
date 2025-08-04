import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import FirstPersonPlayer from './FirstPersonPlayer'

export default function App() {
  return (
    <Canvas shadows camera={{ fov: 75 }}>
      <ambientLight />
      <directionalLight position={[5, 10, 5]} castShadow />
      <Sky />
      <gridHelper args={[100, 100]} />
      <FirstPersonPlayer />
    </Canvas>
  )
}
