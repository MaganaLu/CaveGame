import React, { useRef } from 'react';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer';
import TunnelModel from '../components/Environment/TunnelModel';
import MainMonster from '../components/Enemies/MainMonster';
import PickupItem from '../components/Props/PickUpItem';
import PickupController from '../components/Player/PickupController';
import { getItemConfig } from '../config/pickupItems';
import { useInventoryStore } from '../storage/inventoryStore';

export default function CaveScenePart2({ progress, setProgress, onPlayerCaught, onInventoryFull }) {
  const capsuleHeight = 1.6;
  const spawnPoint = [0, capsuleHeight / 2, 0];
  const playerRef = useRef();
  const addItem = useInventoryStore((state) => state.addItem);

  const handlePickup = (id, itemType, item) => {
    // Try to add item to inventory
    const success = addItem(id, itemType);

    if (!success) {
      // Inventory is full, show notification
      console.warn(`⚠️ Inventory full! Cannot pick up ${itemType}`);
      if (onInventoryFull) {
        onInventoryFull();
      }
      return false; // Return false to indicate pickup failed
    }

    console.log(`📥 Added ${itemType} (${id}) to inventory`);
    console.log("════════════════════════════════════");
    console.log(`🎯 PICKUP: ${id} (Type: ${itemType})`);

    if (!playerRef.current?.handR) {
      console.error("❌ Hand anchor not ready!");
      return false; // Return false if hand not ready
    }

    const hand = playerRef.current.handR;
    const clone = item.scene;

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

    console.log(`✅ ${itemType} (${id}) attached to hand:`);
    console.log(`   Scale: ${config.scale}`);
    console.log(`   Position: (${config.position.join(', ')})`);
    console.log(`   Rotation: (${config.rotation.map(r => r.toFixed(2)).join(', ')}) rad`);
    console.log("════════════════════════════════════");

    return true; // Return true to indicate successful pickup
  };

  return (
    <Physics gravity={[0, -10.81, 0]}>
      <TunnelModel position={[0, -5, 0]} />

      <FirstPersonPlayer
        ref={playerRef}
        progress={progress}
        setProgress={setProgress}
        spawnPoint={spawnPoint}
      />

      <MainMonster
        position={[0, 0, 6]}
        scale={0.8}
        onPlayerCaught={onPlayerCaught}
      />

      <PickupController
        playerRef={playerRef}
        onPickup={handlePickup}
      />

      {/* IDs are now optional - auto-generated if not provided */}
      <PickupItem
        itemType="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[2, 0, 6]}
      />

      <PickupItem
        itemType="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[2, 1, 6]}
      />

      <PickupItem
        itemType="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[3, 2, 4]}
      />

      <PickupItem
        itemType="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[4, 0, 5]}
      />

      <PickupItem
        itemType="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[-2, 0, 8]}
      />
      
    </Physics>
  );
}