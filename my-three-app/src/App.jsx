import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import './ui/ui.css'
import { useGameStore, PHASE } from './game/GameState'
import GameManager from './game/GameManager'
import Apartment from './apartment/Apartment'
import City from './apartment/City'
import PlayerController from './player/PlayerController'
import Flashlight from './player/Flashlight'
import Weather from './weather/Weather'
import InteractionSystem from './interactions/InteractionSystem'
import HUD from './ui/HUD'
import PhoneUI from './ui/PhoneUI'
import ComputerUI from './ui/ComputerUI'
import RackUI from './ui/RackUI'
import LeverUI from './ui/LeverUI'
import MenuScreen from './ui/MenuScreen'
import ScoreScreen from './ui/ScoreScreen'
import DreamScreen from './dreams/DreamScreen'
import PSXEffect from './psx/PSXEffect'
import PSXMaterials from './psx/PSXMaterials'
import useStageScale from './psx/useStageScale'

// Next to the bed, facing the nightstand
const SPAWN = { position: [0.2, 0.9, -4.6], yaw: 0 }

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const nightId = useGameStore((s) => s.nightId)

  // --px = one pixel of the 640x360 PS1 virtual screen; all 2D UI is sized in it
  const scale = useStageScale()
  useEffect(() => {
    document.documentElement.style.setProperty('--px', `${scale}px`)
  }, [scale])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GameManager />

      {/* PSX look: no AA, 1:1 pixels; PSXEffect renders at 240p and upscales */}
      <Canvas gl={{ antialias: false }} dpr={1}>
        <PerspectiveCamera makeDefault fov={70} near={0.05} far={250} />
        {/* Remount the world each night so the player respawns */}
        {/* The view out the windows; loads in the background */}
        <Suspense fallback={null}>
          <City />
        </Suspense>
        <Weather />
        <Physics key={nightId} gravity={[0, -9.81, 0]}>
          <Apartment />
          <PlayerController spawnPoint={SPAWN.position} spawnYaw={SPAWN.yaw} />
        </Physics>
        <InteractionSystem />
        <Flashlight />
        <PSXMaterials />
        <PSXEffect />
      </Canvas>

      {phase !== PHASE.MENU && phase !== PHASE.NIGHT_COMPLETE && (
        <>
          {/* The dream covers the whole screen, so don't keep the HUD animating under it */}
          {phase === PHASE.DREAM ? <DreamScreen /> : <HUD />}
          <PhoneUI />
          <ComputerUI />
          <RackUI />
          <LeverUI />
        </>
      )}
      {phase === PHASE.MENU && <MenuScreen />}
      {phase === PHASE.NIGHT_COMPLETE && <ScoreScreen />}
    </div>
  )
}
