import { useEffect, useCallback } from 'react';
import { loadProgress } from '../storage/ElectronAPI';
import { useGameStateStore } from '../storage/gameStateStore';
import { useInventoryStore } from '../storage/inventoryStore';

/**
 * Game Loader Hook
 *
 * Handles loading saved game data at app start.
 * This should be called once in the root App component.
 *
 * Loading sequence:
 * 1. Show loading screen
 * 2. Load save data from electron-store/localStorage
 * 3. Populate global game state store
 * 4. Restore inventory
 * 5. Hide loading screen
 * 6. Game ready to play!
 *
 * @param {Object} options
 * @param {boolean} options.autoLoad - Automatically load on mount (default: true)
 * @param {Function} options.onLoadComplete - Callback when loading finishes
 * @param {Function} options.onLoadError - Callback if loading fails
 *
 * @returns {Object} { isLoading, loadGame, resetGame }
 */
export function useGameLoader(options = {}) {
  const {
    autoLoad = true,
    onLoadComplete,
    onLoadError,
  } = options;

  const setInitialLoading = useGameStateStore((state) => state.setInitialLoading);
  const loadFromSave = useGameStateStore((state) => state.loadFromSave);
  const resetGame = useGameStateStore((state) => state.resetGame);
  const isLoading = useGameStateStore((state) => state.isInitialLoading);

  // Inventory store actions
  const setInventoryItems = useInventoryStore((state) => state.setItems);
  const clearInventory = useInventoryStore((state) => state.clearInventory);

  /**
   * Load game from saved data
   */
  const loadGame = useCallback(async () => {
    try {
      console.log('🎮 Starting game load sequence...');

      // Step 1: Initialize
      setInitialLoading(true, 'Initializing...', 10);
      await delay(300); // Small delay for visual feedback

      // Step 2: Load save data
      setInitialLoading(true, 'Loading save data...', 30);
      const savedData = await loadProgress();

      if (!savedData) {
        console.log('ℹ️ No save data found - starting new game');
        setInitialLoading(true, 'Starting new game...', 70);
        await delay(500);

        // Reset to fresh game state
        resetGame();
        clearInventory();

        setInitialLoading(true, 'Ready!', 100);
        await delay(300);
        setInitialLoading(false);

        if (onLoadComplete) {
          onLoadComplete({ isNewGame: true });
        }

        return;
      }

      // Step 3: Restore game state
      setInitialLoading(true, 'Restoring game state...', 50);
      await delay(300);

      loadFromSave(savedData);

      // Step 4: Restore inventory
      if (savedData.inventory && savedData.inventory.length > 0) {
        setInitialLoading(true, 'Restoring inventory...', 70);
        await delay(300);
        setInventoryItems(savedData.inventory);
      }

      // Step 5: Complete
      setInitialLoading(true, 'Ready!', 100);
      await delay(300);

      console.log('✅ Game loaded successfully!');
      setInitialLoading(false);

      if (onLoadComplete) {
        onLoadComplete({ isNewGame: false, saveData: savedData });
      }

    } catch (error) {
      console.error('❌ Failed to load game:', error);

      setInitialLoading(true, 'Error loading game...', 0);
      await delay(1000);

      // Fallback to new game on error
      resetGame();
      clearInventory();
      setInitialLoading(false);

      if (onLoadError) {
        onLoadError(error);
      }
    }
  }, [
    setInitialLoading,
    loadFromSave,
    resetGame,
    setInventoryItems,
    clearInventory,
    onLoadComplete,
    onLoadError,
  ]);

  /**
   * Start a new game (reset everything)
   */
  const startNewGame = useCallback(async () => {
    console.log('🆕 Starting new game...');

    setInitialLoading(true, 'Resetting game...', 50);
    await delay(500);

    resetGame();
    clearInventory();

    setInitialLoading(true, 'Ready!', 100);
    await delay(300);
    setInitialLoading(false);

    console.log('✅ New game started!');

    // Trigger callback to start the game
    if (onLoadComplete) {
      onLoadComplete({ isNewGame: true });
    }
  }, [setInitialLoading, resetGame, clearInventory, onLoadComplete]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadGame();
    }
  }, [autoLoad, loadGame]);

  return {
    isLoading,
    loadGame,
    startNewGame,
    resetGame,
  };
}

/**
 * Helper to create artificial delay for loading messages
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
