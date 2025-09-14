import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useEffect, useState } from 'react'
import './styles/startscreen.css'
import CaveScene from './scenes/CaveScene'
import { saveProgress, loadProgress } from './storage/ElectronAPI'
import StartScreen from './components/UI/StartScreen'


export default function App() {
  const [scene, setScene] = useState('menu')
  const [progress, setProgress] = useState(null)



  // Load saved progress on startup
  // uncomment to test saving 
  /*
  useEffect(() => {
    loadProgress().then(data => {
      if (data?.hasStarted) setScene('cave')
      setProgress(data)
    })
  }, [])
*/
  const handleStart = () => {
    const newProgress = { hasStarted: true, playerPosition: [0, 0, 0] }
    saveProgress(newProgress)
    setProgress(newProgress)
    setScene('cave')
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {scene === 'menu' && <StartScreen onStart={handleStart} />}

      <Canvas shadows>
        <PerspectiveCamera makeDefault near={0.01} far={1000} position={[0, 0, 0]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[5, 10, 5]}
          intensity={1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {scene === 'cave' && (
          <CaveScene progress={progress} setProgress={setProgress} />
        )}
      </Canvas>
    </div>
  )
}
