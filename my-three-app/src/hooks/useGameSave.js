import { useCallback, useRef, useEffect } from 'react';
import { saveProgress, loadProgress } from '../storage/stores/ElectronAPI';

/**
 * Game Save Hook
 *
 * Provides save/load functionality with automatic debouncing and cleanup.
 * Handles both immediate saves (for critical events) and debounced saves
 * (for continuous events like player movement).
 *
 * @param {Object} options - Configuration options
 * @param {number} options.debounceDelay - Delay in ms for debounced saves (default: 3000)
 * @param {Function} options.onSaveSuccess - Callback when save succeeds
 * @param {Function} options.onSaveError - Callback when save fails
 * @param {boolean} options.logSaves - Whether to log save events (default: true in dev)
 *
 * @returns {Object} Save/load functions
 *
 * @example
 * const { saveNow, saveDebounced, loadGame } = useGameSave();
 *
 * // Save immediately on critical events
 * onItemPickup(() => saveNow(gameState));
 *
 * // Save after inactivity for continuous events
 * onPlayerMove(() => saveDebounced(gameState));
 */
export function useGameSave(options = {}) {
  const {
    debounceDelay = 3000,
    onSaveSuccess,
    onSaveError,
    logSaves = process.env.NODE_ENV === 'development',
  } = options;

  const saveTimeoutRef = useRef(null);
  const lastSaveTimeRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Save game immediately
   * Use for critical events: item pickup, scene change, player death, etc.
   *
   * @param {Object} gameState - Current game state to save
   * @returns {Promise<boolean>} Success status
   */
  const saveNow = useCallback(async (gameState) => {
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    try {
      if (logSaves) {
        console.log('💾 Saving game (immediate)...', gameState);
      }

      await saveProgress(gameState);
      lastSaveTimeRef.current = Date.now();

      if (logSaves) {
        console.log('✅ Game saved successfully');
      }

      if (onSaveSuccess) {
        onSaveSuccess(gameState);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to save game:', error);

      if (onSaveError) {
        onSaveError(error);
      }

      return false;
    }
  }, [logSaves, onSaveSuccess, onSaveError]);

  /**
   * Save game after a delay (debounced)
   * Use for continuous events: player movement, camera rotation, etc.
   * Only saves after the specified delay of inactivity.
   *
   * @param {Object} gameState - Current game state to save
   * @param {number} customDelay - Optional custom delay (overrides default)
   */
  const saveDebounced = useCallback((gameState, customDelay) => {
    const delay = customDelay ?? debounceDelay;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (logSaves) {
          console.log('💾 Saving game (debounced)...', gameState);
        }

        await saveProgress(gameState);
        lastSaveTimeRef.current = Date.now();

        if (logSaves) {
          console.log('✅ Game saved successfully (after inactivity)');
        }

        if (onSaveSuccess) {
          onSaveSuccess(gameState);
        }
      } catch (error) {
        console.error('❌ Failed to save game:', error);

        if (onSaveError) {
          onSaveError(error);
        }
      }

      saveTimeoutRef.current = null;
    }, delay);
  }, [debounceDelay, logSaves, onSaveSuccess, onSaveError]);

  /**
   * Load saved game
   *
   * @returns {Promise<Object|null>} Saved game state or null if no save exists
   */
  const loadGame = useCallback(async () => {
    try {
      if (logSaves) {
        console.log('📂 Loading saved game...');
      }

      const savedData = await loadProgress();

      if (savedData) {
        if (logSaves) {
          console.log('✅ Game loaded successfully:', savedData);
        }
        return savedData;
      } else {
        if (logSaves) {
          console.log('ℹ️ No saved game found');
        }
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to load game:', error);
      return null;
    }
  }, [logSaves]);

  /**
   * Get time of last save
   *
   * @returns {number|null} Timestamp of last save, or null if never saved
   */
  const getLastSaveTime = useCallback(() => {
    return lastSaveTimeRef.current;
  }, []);

  /**
   * Check if there's a pending debounced save
   *
   * @returns {boolean} True if a save is scheduled
   */
  const hasPendingSave = useCallback(() => {
    return saveTimeoutRef.current !== null;
  }, []);

  /**
   * Cancel any pending debounced save
   */
  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;

      if (logSaves) {
        console.log('🚫 Cancelled pending save');
      }
    }
  }, [logSaves]);

  return {
    saveNow,
    saveDebounced,
    loadGame,
    getLastSaveTime,
    hasPendingSave,
    cancelPendingSave,
  };
}

/**
 * Helper function to build game state from current game data
 * Use this to consistently format your save data
 *
 * @param {Object} params - Game state parameters
 * @returns {Object} Formatted game state ready to save
 *
 * @example
 * const gameState = buildGameState({
 *   currentScene: 'CaveScenePart2',
 *   playerPosition: playerRef.current.position.toArray(),
 *   pickedUpItemIds: Array.from(pickedUpItemIds),
 *   droppedItems: droppedItems,
 *   inventory: useInventoryStore.getState().items,
 * });
 */
export function buildGameState({
  currentScene,
  playerPosition = [0, 0, 0],
  playerRotation = [0, 0, 0],
  pickedUpItemIds = [],
  droppedItems = [],
  inventory = [],
  customData = {},
}) {
  return {
    version: '1.0.0',  // For future migration support
    timestamp: new Date().toISOString(),
    currentScene,
    player: {
      position: playerPosition,
      rotation: playerRotation,
    },
    items: {
      pickedUp: Array.isArray(pickedUpItemIds)
        ? pickedUpItemIds
        : Array.from(pickedUpItemIds),
      dropped: droppedItems,
    },
    inventory,
    customData,  // For any game-specific data
  };
}
