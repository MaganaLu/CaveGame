import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useEffect, useState, useCallback } from 'react'
import './styles/startscreen.css'
import CaveScene from './scenes/CaveScene'
import { saveProgress, loadProgress } from './storage/ElectronAPI'
import StartScreen from './components/UI/StartScreen'
import FirstSceneOverScreen from './components/UI/FirstSceneOverScreen'
import SecondScene from './scenes/CaveScenePart2'
import { usePlayerStore } from './storage/playerStore'
import RadialMenu from './components/UI/RadialMenu'
import InventoryFullNotification from './components/UI/InventoryFullNotification'
import LoadingScreen from './components/UI/LoadingScreen'
import { useGameLoader } from './hooks/useGameLoader'
import { useGameStateStore } from './storage/gameStateStore'


export default function App() {
  const [scene, setScene] = useState('menu')
  const [progress, setProgress] = useState(null)
  const [showInventoryFull, setShowInventoryFull] = useState(false)
  const [hasSaveData, setHasSaveData] = useState(false)

  const firstSceneEndTimeout = 5000;

  // Stable callback for load complete
  const handleLoadComplete = useCallback((result) => {
    console.log('Game loaded:', result);
    // Route to saved scene
    if (!result.isNewGame && result.saveData) {
      const savedScene = result.saveData.currentScene || 'secondScene';
      // Map saved scene names to local scene state
      if (savedScene === 'CaveScenePart2' || savedScene === 'secondScene') {
        setScene('secondScene');
      } else {
        setScene('cave');
      }
      setProgress({ hasStarted: true });
    } else {
      // New game - go to first scene
      setScene('cave');
      setProgress({ hasStarted: true });
    }
  }, []); // Empty deps - this callback doesn't depend on anything that changes

  // Initialize game loader - manual load (not auto)
  const { isLoading, loadGame, startNewGame } = useGameLoader({
    autoLoad: false, // Don't auto-load, wait for user to click Continue
    onLoadComplete: handleLoadComplete,
  });

  // Check if save data exists on mount
  useEffect(() => {
    loadProgress().then(data => {
      // Check for new format (has currentScene or version) or old format (hasStarted)
      const hasSave = !!data && (data.currentScene || data.version || data.hasStarted);
      setHasSaveData(hasSave);
      console.log('Save data check:', { hasSave, data });
    });
  }, []);

  // Get current scene from global state
  const currentGlobalScene = useGameStateStore((state) => state.currentScene);

  // Handle Continue Game (load from save)
  const handleContinue = () => {
    loadGame(); // This will trigger handleLoadComplete when done
  };

  // Handle New Game (start fresh)
  const handleNewGame = () => {
    startNewGame(); // This will reset everything and trigger handleLoadComplete
  };

  // Legacy handler (keeping for compatibility)
  const handleStart = () => {
    const newProgress = { hasStarted: true, playerPosition: [0, 0, 0] }
    saveProgress(newProgress)
    setProgress(newProgress)
    setScene('cave')
  }

  const handlePlayerCaught = () => {
    // Show caught UI
    setScene('caught')

    setTimeout(() => {
      const playerPosition = usePlayerStore.getState().position

      const newProgress = {
        hasStarted: true,
        currentScene: 'secondScene',
        playerPosition, // Save latest position
      }

      saveProgress(newProgress)
      setProgress(newProgress)
      setScene('secondScene')
    }, firstSceneEndTimeout)
  }


  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Loading Screen - shows while loading save data */}
      <LoadingScreen />

      {scene === 'menu' && (
        <StartScreen
          hasSaveData={hasSaveData}
          onContinue={handleContinue}
          onNewGame={handleNewGame}
        />
      )}
      {scene === 'caught' && <FirstSceneOverScreen />}

      <Canvas shadows>
        <PerspectiveCamera makeDefault near={0.01} far={1000} position={[0, 0, 0]} />
        {/*<ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[5, 10, 5]}
          intensity={1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />*/}

        {scene === 'cave' && (
          <CaveScene progress={progress} setProgress={setProgress} onPlayerCaught={handlePlayerCaught} />
        )}

        {scene === 'secondScene' && (
          <SecondScene
            progress={progress}
            setProgress={setProgress}
            onInventoryFull={() => setShowInventoryFull(true)}
          />
        )}

      </Canvas>

      {/* Radial Menu - Fixed camera overlay */}
      <RadialMenu />

      {/* Inventory Full Notification */}
      <InventoryFullNotification
        show={showInventoryFull}
        onHide={() => setShowInventoryFull(false)}
      />
    </div>
  )
}
