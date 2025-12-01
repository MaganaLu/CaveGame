import { useEffect, useCallback } from 'react';
import { loadProgress } from '../storage/ElectronAPI';
import { useGameStateStore } from '../storage/stores/gameStateStore';
import { useInventoryStore } from '../storage/stores/inventoryStore';

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
      console.log('🎮 Loading game...');

      const savedData = await loadProgress();

      if (!savedData) {
        console.log('ℹ️ No save data found - starting new game');
        resetGame();
        clearInventory();

        if (onLoadComplete) {
          onLoadComplete({ isNewGame: true });
        }
        return;
      }

      // Restore game state
      loadFromSave(savedData);

      // Restore inventory
      if (savedData.inventory && savedData.inventory.length > 0) {
        setInventoryItems(savedData.inventory);
      }

      console.log('✅ Game loaded successfully!');

      if (onLoadComplete) {
        onLoadComplete({ isNewGame: false, saveData: savedData });
      }

    } catch (error) {
      console.error('❌ Failed to load game:', error);

      // Fallback to new game on error
      resetGame();
      clearInventory();

      if (onLoadError) {
        onLoadError(error);
      }
    }
  }, [
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
  const startNewGame = useCallback(() => {
    console.log('🆕 Starting new game...');

    resetGame();
    clearInventory();

    console.log('✅ New game started!');

    // Trigger callback to start the game
    if (onLoadComplete) {
      onLoadComplete({ isNewGame: true });
    }
  }, [resetGame, clearInventory, onLoadComplete]);

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
