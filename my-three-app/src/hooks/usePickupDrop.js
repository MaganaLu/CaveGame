import { useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { useInventoryStore } from '../storage/stores/inventoryStore';
import { getItemConfig } from '../config/pickupItems';

/**
 * Custom hook for pickup and drop functionality
 * Reusable across multiple scenes
 *
 * @param {React.RefObject} playerRef - Reference to the player object with handR anchor
 * @param {Object} options - Optional configuration
 * @param {Array} options.initialDroppedItems - Initial dropped items (from save data)
 * @param {Set|Array} options.initialPickedUpItems - Initial picked up item IDs (from save data)
 * @returns {Object} Handlers and state for pickup/drop system
 */
export function usePickupDrop(playerRef, options = {}) {
  const { initialDroppedItems = [], initialPickedUpItems = [] } = options;

  // State for dynamically dropped items
  const [droppedItems, setDroppedItems] = useState(initialDroppedItems);

  // Track IDs of static items that have been picked up (to hide them from rendering)
  const [pickedUpStaticItemIds, setPickedUpStaticItemIds] = useState(
    new Set(Array.isArray(initialPickedUpItems) ? initialPickedUpItems : Array.from(initialPickedUpItems))
  );

  // Inventory store functions
  const addItem = useInventoryStore((state) => state.addItem);
  const setHeldItem = useInventoryStore((state) => state.setHeldItem);
  const items = useInventoryStore((state) => state.items);
  const requestedEquipItemId = useInventoryStore((state) => state.requestedEquipItemId);
  const clearEquipRequest = useInventoryStore((state) => state.clearEquipRequest);

  /**
   * Equip an item from inventory to the player's hand
   * Loads the model dynamically and attaches to hand
   */
  const handleEquip = (itemId) => {
    console.log("🎯 EQUIP REQUEST:", itemId);

    // Find the item in inventory
    const item = items.find(i => i.id === itemId);
    if (!item) {
      console.error("❌ Item not found in inventory:", itemId);
      return;
    }

    if (!playerRef.current?.handR) {
      console.error("❌ Hand anchor not ready!");
      return;
    }

    const hand = playerRef.current.handR;
    const config = getItemConfig(item.itemType);

    console.log(`📦 Equipping ${item.itemType} from inventory...`);

    // Clear hand of current item
    while (hand.children.length > 0) {
      hand.remove(hand.children[0]);
    }
    console.log("🧹 Cleared hand");

    // Load the model
    const loader = new GLTFLoader();
    loader.load(
      config.modelPath,
      (gltf) => {
        console.log(`✅ Loaded model for ${item.itemType}`);

        // Convert SkinnedMesh to regular Mesh (same as handlePickup)
        const meshesToAdd = [];
        gltf.scene.traverse((child) => {
          if (child.isSkinnedMesh || child.isMesh) {
            const geometry = child.geometry.clone();

            if (child.isSkinnedMesh) {
              geometry.applyMatrix4(child.bindMatrix);
            }

            const material = child.material.clone();
            material.side = THREE.DoubleSide;

            const newMesh = new THREE.Mesh(geometry, material);
            newMesh.visible = true;
            newMesh.frustumCulled = false;
            newMesh.castShadow = true;
            newMesh.receiveShadow = true;

            newMesh.position.copy(child.position);
            newMesh.rotation.copy(child.rotation);
            newMesh.scale.copy(child.scale);

            meshesToAdd.push(newMesh);
          }
        });

        const itemGroup = new THREE.Group();
        meshesToAdd.forEach(mesh => itemGroup.add(mesh));

        // Apply configuration
        itemGroup.scale.set(config.scale, config.scale, config.scale);
        itemGroup.position.set(...config.position);
        itemGroup.rotation.set(...config.rotation);

        hand.add(itemGroup);

        // Update currently held item
        setHeldItem(item.id, item.itemType, itemGroup);

        console.log(`✅ Equipped ${item.itemType} (${item.id}) to hand`);
      },
      undefined,
      (error) => {
        console.error(`❌ Error loading model for ${item.itemType}:`, error);
      }
    );
  };

  /**
   * Handle picking up an item
   * Called by PickupController when player presses E near an item
   */
  const handlePickup = (id, itemType, item) => {
    // Try to add item to inventory
    const success = addItem(id, itemType);

    if (!success) {
      // Inventory is full
      console.warn(`⚠️ Inventory full! Cannot pick up ${itemType}`);
      return false; // Return false to indicate pickup failed
    }

    // Check if this item was a dropped item and remove it from the dropped items list
    setDroppedItems(prev => {
      const filtered = prev.filter(droppedItem => droppedItem.id !== id);
      if (filtered.length !== prev.length) {
        console.log(`🗑️ Removed ${id} from droppedItems array (was previously dropped)`);
      }
      return filtered;
    });

    // Mark static item as picked up so it won't render at original position anymore
    setPickedUpStaticItemIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      console.log(`📌 Marked ${id} as picked up (will hide static instance)`);
      return newSet;
    });

    console.log(`📥 Added ${itemType} (${id}) to inventory`);
    console.log("════════════════════════════════════");
    console.log(`🎯 PICKUP: ${id} (Type: ${itemType})`);

    if (!playerRef.current?.handR) {
      console.error("❌ Hand anchor not ready!");
      return false; // Return false if hand not ready
    }

    const hand = playerRef.current.handR;
    const clone = item.scene;

    // Clear hand of any existing items before adding new one
    while (hand.children.length > 0) {
      hand.remove(hand.children[0]);
    }
    console.log("🧹 Cleared hand of previous items");

    // Get configuration for this item TYPE (not the instance id)
    const config = getItemConfig(itemType);

    // Convert SkinnedMesh to regular Mesh
    const meshesToAdd = [];

    clone.traverse((child) => {
      if (child.isSkinnedMesh || child.isMesh) {
        const geometry = child.geometry.clone();

        if (child.isSkinnedMesh) {
          geometry.applyMatrix4(child.bindMatrix);
        }

        const material = child.material.clone();
        material.side = THREE.DoubleSide;

        const newMesh = new THREE.Mesh(geometry, material);
        newMesh.visible = true;
        newMesh.frustumCulled = false;
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;

        newMesh.position.copy(child.position);
        newMesh.rotation.copy(child.rotation);
        newMesh.scale.copy(child.scale);

        meshesToAdd.push(newMesh);
      }
    });

    const itemGroup = new THREE.Group();
    meshesToAdd.forEach(mesh => itemGroup.add(mesh));

    // Apply configuration from config file
    itemGroup.scale.set(config.scale, config.scale, config.scale);
    itemGroup.position.set(...config.position);
    itemGroup.rotation.set(...config.rotation);

    hand.add(itemGroup);

    // Store as currently held item
    setHeldItem(id, itemType, itemGroup);

    console.log(`✅ ${itemType} (${id}) attached to hand:`);
    console.log(`   Scale: ${config.scale}`);
    console.log(`   Position: (${config.position.join(', ')})`);
    console.log(`   Rotation: (${config.rotation.map(r => r.toFixed(2)).join(', ')}) rad`);
    console.log("════════════════════════════════════");

    return true; // Return true to indicate successful pickup
  };

  // Watch for equip requests from RadialMenu
  useEffect(() => {
    if (requestedEquipItemId) {
      console.log("📢 Equip request received:", requestedEquipItemId);
      handleEquip(requestedEquipItemId);
      clearEquipRequest();
    }
  }, [requestedEquipItemId]);

  return {
    droppedItems,
    setDroppedItems,
    pickedUpStaticItemIds,
    handlePickup,
    handleEquip,
  };
}
