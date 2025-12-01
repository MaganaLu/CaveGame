import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameInput from '../../hooks/useGameInput';
import { useInventoryStore } from '../../storage/stores/inventoryStore';

/**
 * DropHandler Component
 * Detects drop key press and handles dropping items from inventory
 * Reusable across multiple scenes
 *
 * @param {Object} props
 * @param {React.RefObject} props.playerRef - Reference to the player object
 * @param {Function} props.setDroppedItems - Function to add item to dropped items array
 * @param {Function} props.onDrop - Optional callback after item is dropped
 */
export default function DropHandler({ playerRef, setDroppedItems, onDrop }) {
  const { keys } = useGameInput();
  const { scene: rootScene } = useThree();
  const wasDropPressed = useRef(false);
  const removeItem = useInventoryStore((state) => state.removeItem);
  const clearHeldItem = useInventoryStore((state) => state.clearHeldItem);
  const currentlyHeldItem = useInventoryStore((state) => state.currentlyHeldItem);

  // Find PickupController API
  function findPickupController() {
    let api = null;
    rootScene.traverse((obj) => {
      if (obj.userData?.unpickItem) api = obj.userData;
    });
    return api;
  }

  useFrame(() => {
    const isDropPressed = keys.drop;
    const justPressed = isDropPressed && !wasDropPressed.current;
    wasDropPressed.current = isDropPressed;

    if (justPressed && currentlyHeldItem) {
      console.log("🗑️ DROP KEY PRESSED - Dropping:", currentlyHeldItem.id);

      // Get player position
      if (!playerRef.current) {
        console.error("❌ Player ref not ready!");
        return;
      }

      // Save current hand children before removal (to prevent side effects)
      const handChildren = playerRef.current.handR ? [...playerRef.current.handR.children] : [];

      // Get player position for drop calculation
      const playerPosition = new THREE.Vector3();
      if (playerRef.current.getWorldPosition) {
        playerRef.current.getWorldPosition(playerPosition);
      } else {
        // Fallback to position if getWorldPosition not available
        playerPosition.copy(playerRef.current.position || new THREE.Vector3());
      }

      // Calculate drop position (in front of player, at ground level)
      const dropPosition = [
        playerPosition.x,
        0, // Ground level
        playerPosition.z + 1.5 // 1.5 units in front of player
      ];

      console.log(`📍 Dropping ${currentlyHeldItem.itemType} at position:`, dropPosition);

      // Remove from hand (properly dispose to prevent transform issues)
      if (playerRef.current.handR) {
        handChildren.forEach(child => {
          // Detach from parent without affecting transforms
          playerRef.current.handR.remove(child);
          // Dispose of geometries and materials to prevent memory leaks
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        console.log("🧹 Removed item from hand");
      }

      // Remove from inventory
      removeItem(currentlyHeldItem.id);
      console.log(`📤 Removed ${currentlyHeldItem.id} from inventory`);

      // Remove from PickupController's pickedUpItems set so it can be picked up again
      const pickupAPI = findPickupController();
      if (pickupAPI && pickupAPI.unpickItem) {
        pickupAPI.unpickItem(currentlyHeldItem.id);
      } else {
        console.warn("⚠️ Could not find PickupController to unpick item");
      }

      // Add to dropped items list
      setDroppedItems(prev => [...prev, {
        id: currentlyHeldItem.id,
        itemType: currentlyHeldItem.itemType,
        position: dropPosition,
        timestamp: Date.now()
      }]);
      console.log(`✅ Added to dropped items in scene`);

      // Clear held item reference
      clearHeldItem();

      // Call onDrop callback if provided
      if (onDrop) {
        onDrop();
      }
    }
  });

  return null; // This component doesn't render anything
}
