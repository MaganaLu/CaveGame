import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useEffect, useState, useCallback } from 'react'
import './styles/startscreen.css'
import CaveScene from './scenes/CaveScene'
import { saveProgress, loadProgress } from './storage/ElectronAPI'
import StartScreen from './components/UI/StartScreen'
import FirstSceneOverScreen from './components/UI/FirstSceneOverScreen'
import SecondScene from './scenes/CaveScenePart2'
import { usePlayerStore } from './storage/stores/playerStore'
import RadialMenu from './components/UI/RadialMenu'
import InventoryFullNotification from './components/UI/InventoryFullNotification'
import { useGameLoader } from './hooks/useGameLoader'
import { useGameStateStore } from './storage/stores/gameStateStore'
import { useInventoryStore } from './storage/stores/inventoryStore'
import { useLampFuelStore } from './storage/stores/lampFuelStore'
import { usePeriodicSave } from './hooks/usePeriodicSave'
import { buildGameState } from './hooks/useGameSave'


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
    } else {
      // New game - go to first scene
      setScene('cave');
    }
    // Note: progress state is legacy - new system uses global stores
    setProgress(null);
  }, []); // Empty deps - this callback doesn't depend on anything that changes

  // Initialize game loader - manual load (not auto)
  const { isLoading, loadGame, startNewGame } = useGameLoader({
    autoLoad: false, // Don't auto-load, wait for user to click Continue
    onLoadComplete: handleLoadComplete,
  });

  // Check if save data exists on mount
  useEffect(() => {
    loadProgress().then(data => {
      // Check for new save format (has currentScene or version)
      const hasSave = !!data && (data.currentScene || data.version);
      setHasSaveData(hasSave);
      console.log("save data check:", {hasSave, data})
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

  const handlePlayerCaught = () => {
    // Show caught UI
    setScene('caught')

    setTimeout(() => {
      // Update global state for scene transition
      const gameState = useGameStateStore.getState();
      const playerPosition = usePlayerStore.getState().position;

      gameState.setCurrentScene('secondScene');
      gameState.setPlayerPosition(playerPosition);

      // Save the updated game state
      const saveData = buildGameState({
        currentScene: 'secondScene',
        playerPosition: playerPosition,
        pickedUpItemsByScene: gameState.pickedUpItemsByScene,
        droppedItemsByScene: gameState.droppedItemsByScene,
        inventory: useInventoryStore.getState().items,
        lampFuel: useLampFuelStore.getState().getSaveData(),
      });

      saveProgress(saveData);
      setScene('secondScene');
    }, firstSceneEndTimeout)
  }

  // ============================================================================
  // Centralized Periodic Auto-Save (reads from global stores)
  // ============================================================================

  // Function to get current game state from all global stores
  const getGlobalGameState = useCallback(() => {
    const gameState = useGameStateStore.getState();
    const inventoryState = useInventoryStore.getState();
    const lampFuelState = useLampFuelStore.getState();

    // Build complete save data from global stores
    return buildGameState({
      currentScene: gameState.currentScene,
      playerPosition: gameState.playerPosition,
      pickedUpItemsByScene: gameState.pickedUpItemsByScene,
      droppedItemsByScene: gameState.droppedItemsByScene,
      inventory: inventoryState.items,
      lampFuel: lampFuelState.getSaveData(),
    });
  }, []);

  // Save function
  const handlePeriodicSave = useCallback((saveData) => {
    saveProgress(saveData);
  }, []);

  // Periodic auto-save every 30 seconds (only when game is active, not on menu)
  usePeriodicSave(getGlobalGameState, {
    interval: 30000,
    onSave: handlePeriodicSave,
    enabled: scene !== 'menu' && scene !== 'caught', // Only save during actual gameplay
    logSaves: true,
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
