import React, { useRef, useEffect, useCallback } from 'react';
import { Physics } from '@react-three/rapier';
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer';
import TunnelModel from '../components/Environment/TunnelModel';
import MainMonster from '../components/Enemies/MainMonster';
import PickupController from '../components/Player/PickupController';
import DropHandler from '../components/Gameplay/DropHandler';
import LampFuelController from '../components/Gameplay/LampFuelController';
import { usePickupDrop } from '../hooks/usePickupDrop';
import { getItemConfig } from '../config/pickupItems';
import { ITEM_COMPONENTS } from '../components/Props/ItemRegistry';
import { createSceneItems } from '../utils/sceneHelpers';
import { useGameSave, buildGameState } from '../hooks/useGameSave';
import { useInventoryStore } from '../storage/stores/inventoryStore';
import { useGameStateStore } from '../storage/stores/gameStateStore';

/**
 * Scene Items - Define all pickup items for this scene
 * No need to manually specify IDs - they're auto-generated from type + position
 * This keeps items stable for save/load while reducing manual typing
 */
const SCENE_ITEMS = createSceneItems([
  { type: 'alienBlade', position: [2, 0, 6] },
  { type: 'alienBlade', position: [2, 1, 6] },
  { type: 'alienBlade', position: [3, 2, 4] },
  { type: 'oilLampCan', position: [2, 0, 4] },
]);

export default function CaveScenePart2({ progress, setProgress, onPlayerCaught, onInventoryFull }) {
  const capsuleHeight = 1.6;
  const sceneName = 'CaveScenePart2';
  const playerRef = useRef();

  // Get saved state from global store
  const savedPlayerPosition = useGameStateStore((state) => state.playerPosition);
  const getPickedUpItems = useGameStateStore((state) => state.getPickedUpItems);
  const getDroppedItems = useGameStateStore((state) => state.getDroppedItems);
  const setPickedUpItems = useGameStateStore((state) => state.setPickedUpItems);
  const setDroppedItemsGlobal = useGameStateStore((state) => state.setDroppedItems);
  const addPickedUpItemGlobal = useGameStateStore((state) => state.addPickedUpItem);
  const setPlayerPositionGlobal = useGameStateStore((state) => state.setPlayerPosition);

  // Load initial state from global store
  const initialPickedUpItems = getPickedUpItems(sceneName);
  const initialDroppedItems = getDroppedItems(sceneName);
  const spawnPoint = savedPlayerPosition || [0, capsuleHeight / 2, 0];

  // Use the reusable pickup/drop hook with initial state from save
  const {
    droppedItems,
    setDroppedItems,
    pickedUpStaticItemIds,
    handlePickup,
  } = usePickupDrop(playerRef, {
    initialDroppedItems,
    initialPickedUpItems,
  });

  // Initialize save system (only for event-based saves)
  const { saveNow, saveDebounced } = useGameSave({
    debounceDelay: 3000,
    logSaves: false, // Logging handled by App.jsx periodic save
  });

  // Get inventory items from store
  const inventoryItems = useInventoryStore((state) => state.items);

  // Helper to get current game state and sync to global store
  const getCurrentGameState = useCallback(() => {
    const currentPosition = playerRef.current?.translation?.()?.toArray?.() || spawnPoint;

    // Sync to global state store
    setPlayerPositionGlobal(currentPosition);
    setPickedUpItems(sceneName, Array.from(pickedUpStaticItemIds));
    setDroppedItemsGlobal(sceneName, droppedItems);

    return buildGameState({
      currentScene: sceneName,
      playerPosition: currentPosition,
      pickedUpItemIds: pickedUpStaticItemIds,
      droppedItems: droppedItems,
      inventory: inventoryItems,
    });
  }, [
    sceneName,
    pickedUpStaticItemIds,
    droppedItems,
    inventoryItems,
    spawnPoint,
    setPlayerPositionGlobal,
    setPickedUpItems,
    setDroppedItemsGlobal,
  ]);

  // Save on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveNow(getCurrentGameState());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveNow, getCurrentGameState]);

  return (
    <Physics gravity={[0, -10.81, 0]}>
      {/* Drop handler - detects X key and handles dropping */}
      <DropHandler
        playerRef={playerRef}
        setDroppedItems={setDroppedItems}
        onDrop={() => {
          // Save immediately after dropping an item
          saveNow(getCurrentGameState());
        }}
      />

      <TunnelModel position={[0, -5, 0]} />

      <FirstPersonPlayer
        ref={playerRef}
        progress={progress}
        setProgress={setProgress}
        spawnPoint={spawnPoint}
      />

      {/* Lamp Fuel System - Controls fuel depletion and refueling */}
      <LampFuelController playerRef={playerRef} />

      <MainMonster
        position={[0, 0, 6]}
        scale={0.8}
        onPlayerCaught={() => {
          // Save immediately before player death
          saveNow(getCurrentGameState());
          if (onPlayerCaught) {
            onPlayerCaught();
          }
        }}
      />

      <PickupController
        playerRef={playerRef}
        onPickup={(id, itemType, item) => {
          const success = handlePickup(id, itemType, item);
          if (success) {
            // Save immediately after successful pickup
            saveNow(getCurrentGameState());
          } else if (onInventoryFull) {
            onInventoryFull();
          }
          return success;
        }}
      />

      {/* Render all scene items using their registered components */}
      {SCENE_ITEMS.filter(item => !pickedUpStaticItemIds.has(item.id)).map(item => {
        const ItemComponent = ITEM_COMPONENTS[item.type];

        if (!ItemComponent) {
          console.error(`No component found for item type: ${item.type}`);
          return null;
        }

        return (
          <ItemComponent
            key={item.id}
            id={item.id}
            position={item.position}
          />
        );
      })}

      {/* Dynamically dropped items */}
      {droppedItems.map((item) => {
        const config = getItemConfig(item.itemType);
        const ItemComponent = ITEM_COMPONENTS[item.itemType];

        // If item has a custom component, use it; otherwise log a warning
        if (!ItemComponent) {
          console.warn(`No component for dropped item type: ${item.itemType}`);
          return null;
        }

        return (
          <ItemComponent
            key={`dropped_${item.id}_${item.timestamp}`}
            id={item.id}
            position={item.position}
          />
        );
      })}

    </Physics>
  );
}
