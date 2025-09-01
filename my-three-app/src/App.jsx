import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useState } from 'react'
import './styles/startscreen.css'
import CaveScene from './scenes/CaveScene'
import StartScene from './components/UI/StartScreen'

export default function App() {
  const [scene, setScene] = useState('menu')

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {scene === 'menu' && <StartScene onStart={() => setScene('tunnel')} />}

      <Canvas shadows>
        <PerspectiveCamera makeDefault near={0.01} far={1000} position={[0, 1.6, 0]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[5, 10, 5]} intensity={1} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

        {scene === 'tunnel' && <CaveScene />}
      </Canvas>
    </div>
  )
}
