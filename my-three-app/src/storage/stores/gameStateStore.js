import { create } from 'zustand';

/**
 * Global Game State Store
 *
 * Centralized store for all game state that needs to persist across scenes.
 * This is loaded once at app start and used by all scenes.
 *
 * Loading flow:
 * 1. App starts → shows loading screen
 * 2. Load saved data → populate this store
 * 3. Route to correct scene
 * 4. Scenes read from this store
 */
export const useGameStateStore = create((set, get) => ({
  // ============================================================================
  // Loading State
  // ============================================================================
  isInitialLoading: false, // Only true during initial game load (when user clicks Continue/New Game)
  isLoading: false, // Generic loading flag (kept for compatibility)
  loadingMessage: 'Initializing...',
  loadingProgress: 0, // 0-100

  setLoading: (isLoading, message = '', progress = 0) =>
    set({ isLoading, loadingMessage: message, loadingProgress: progress }),

  setInitialLoading: (isLoading, message = '', progress = 0) =>
    set({
      isInitialLoading: isLoading,
      isLoading,
      loadingMessage: message,
      loadingProgress: progress
    }),

  // ============================================================================
  // Current Scene
  // ============================================================================
  currentScene: 'CaveScenePart2', // Default starting scene
  setCurrentScene: (sceneName) => set({ currentScene: sceneName }),

  // ============================================================================
  // Player State
  // ============================================================================
  playerPosition: [0, 0.8, 0], // Default spawn
  playerRotation: [0, 0, 0],

  setPlayerPosition: (position) => set({ playerPosition: position }),
  setPlayerRotation: (rotation) => set({ playerRotation: rotation }),

  // ============================================================================
  // Item State (Per Scene)
  // ============================================================================
  // Maps scene name → Set of picked up item IDs
  pickedUpItemsByScene: {},

  // Maps scene name → array of dropped items
  droppedItemsByScene: {},

  // Get picked up items for current scene
  getPickedUpItems: (sceneName) => {
    const sceneItems = get().pickedUpItemsByScene[sceneName];
    return sceneItems ? new Set(sceneItems) : new Set();
  },

  // Get dropped items for current scene
  getDroppedItems: (sceneName) => {
    return get().droppedItemsByScene[sceneName] || [];
  },

  // Add picked up item for a scene
  addPickedUpItem: (sceneName, itemId) =>
    set((state) => {
      const sceneItems = state.pickedUpItemsByScene[sceneName] || [];
      return {
        pickedUpItemsByScene: {
          ...state.pickedUpItemsByScene,
          [sceneName]: [...new Set([...sceneItems, itemId])],
        },
      };
    }),

  // Set all picked up items for a scene
  setPickedUpItems: (sceneName, itemIds) =>
    set((state) => ({
      pickedUpItemsByScene: {
        ...state.pickedUpItemsByScene,
        [sceneName]: Array.isArray(itemIds) ? itemIds : Array.from(itemIds),
      },
    })),

  // Set dropped items for a scene
  setDroppedItems: (sceneName, items) =>
    set((state) => ({
      droppedItemsByScene: {
        ...state.droppedItemsByScene,
        [sceneName]: items,
      },
    })),

  // Add dropped item for a scene
  addDroppedItem: (sceneName, item) =>
    set((state) => {
      const sceneItems = state.droppedItemsByScene[sceneName] || [];
      return {
        droppedItemsByScene: {
          ...state.droppedItemsByScene,
          [sceneName]: [...sceneItems, item],
        },
      };
    }),

  // Remove dropped item (when picked back up)
  removeDroppedItem: (sceneName, itemId) =>
    set((state) => {
      const sceneItems = state.droppedItemsByScene[sceneName] || [];
      return {
        droppedItemsByScene: {
          ...state.droppedItemsByScene,
          [sceneName]: sceneItems.filter((item) => item.id !== itemId),
        },
      };
    }),

  // ============================================================================
  // Game Metadata
  // ============================================================================
  saveVersion: '1.0.0',
  lastSaveTime: null,
  totalPlayTime: 0, // in seconds

  setSaveMetadata: (metadata) =>
    set({
      saveVersion: metadata.version || '1.0.0',
      lastSaveTime: metadata.timestamp || null,
    }),

  // ============================================================================
  // Load Saved Game Data
  // ============================================================================
  loadFromSave: (saveData) => {
    if (!saveData) {
      console.log('ℹ️ No save data found, starting fresh game');
      set({ isLoading: false, isInitialLoading: false });
      return;
    }

    console.log('📂 Loading saved game data:', saveData);

    set({
      currentScene: saveData.currentScene || 'CaveScenePart2',
      playerPosition: saveData.player?.position || [0, 0.8, 0],
      playerRotation: saveData.player?.rotation || [0, 0, 0],
      saveVersion: saveData.version || '1.0.0',
      lastSaveTime: saveData.timestamp || null,
    });

    // Load picked up items (convert array to Set, then back to array for storage)
    if (saveData.items?.pickedUp) {
      const sceneName = saveData.currentScene || 'CaveScenePart2';
      set((state) => ({
        pickedUpItemsByScene: {
          ...state.pickedUpItemsByScene,
          [sceneName]: Array.from(
            Array.isArray(saveData.items.pickedUp)
              ? saveData.items.pickedUp
              : Array.from(saveData.items.pickedUp)
          ),
        },
      }));
    }

    // Load dropped items
    if (saveData.items?.dropped) {
      const sceneName = saveData.currentScene || 'CaveScenePart2';
      set((state) => ({
        droppedItemsByScene: {
          ...state.droppedItemsByScene,
          [sceneName]: saveData.items.dropped,
        },
      }));
    }

    console.log('✅ Game state loaded successfully');
  },

  // ============================================================================
  // Export to Save Format
  // ============================================================================
  exportForSave: () => {
    const state = get();
    const sceneName = state.currentScene;

    return {
      version: state.saveVersion,
      timestamp: new Date().toISOString(),
      currentScene: state.currentScene,
      player: {
        position: state.playerPosition,
        rotation: state.playerRotation,
      },
      items: {
        pickedUp: state.pickedUpItemsByScene[sceneName] || [],
        dropped: state.droppedItemsByScene[sceneName] || [],
      },
    };
  },

  // ============================================================================
  // Reset (New Game)
  // ============================================================================
  resetGame: () =>
    set({
      currentScene: 'CaveScenePart2',
      playerPosition: [0, 0.8, 0],
      playerRotation: [0, 0, 0],
      pickedUpItemsByScene: {},
      droppedItemsByScene: {},
      lastSaveTime: null,
      totalPlayTime: 0,
    }),
}));
