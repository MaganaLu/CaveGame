import React, { useRef } from 'react';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer';
import TunnelModel from '../components/Environment/TunnelModel';
import MainMonster from '../components/Enemies/MainMonster';
import PickupItem from '../components/Props/PickUpItem';
import PickupController from '../components/Player/PickupController';

export default function CaveScenePart2({ progress, setProgress, onPlayerCaught }) {
  const capsuleHeight = 1.6;
  const spawnPoint = [0, capsuleHeight / 2, 0];
  const playerRef = useRef();

  const handlePickup = (id, item) => {
    console.log("════════════════════════════════════");
    console.log(`🎯 PICKUP: ${id}`);

    if (!playerRef.current?.handR) {
      console.error("❌ Hand anchor not ready!");
      return;
    }

    const hand = playerRef.current.handR;
    const clone = item.scene;

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

    const bladeGroup = new THREE.Group();
    meshesToAdd.forEach(mesh => bladeGroup.add(mesh));

    // ═══════════════════════════════════════════════
    // 🎮 ADJUST THESE VALUES TO POSITION THE BLADE
    // ═══════════════════════════════════════════════

    const BLADE_SCALE = .3;
    const BLADE_POS_X = 0.1;
    const BLADE_POS_Y = 0.1;
    const BLADE_POS_Z = 0.1;
    const BLADE_ROT_Y = Math.PI/2;

    bladeGroup.scale.set(BLADE_SCALE, BLADE_SCALE, BLADE_SCALE);
    bladeGroup.position.set(BLADE_POS_X, BLADE_POS_Y, BLADE_POS_Z);
    bladeGroup.rotation.set(0, BLADE_ROT_Y, 0);

    hand.add(bladeGroup);

    // Add BRIGHT GREEN debug sphere at same location
    const debugSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        depthTest: false
      })
    );
    debugSphere.position.set(BLADE_POS_X, BLADE_POS_Y, BLADE_POS_Z);
    debugSphere.renderOrder = 999;
    //hand.add(debugSphere);

    console.log("✅ Blade attached:");
    console.log(`   Scale: ${BLADE_SCALE}`);
    console.log(`   Position: (${BLADE_POS_X}, ${BLADE_POS_Y}, ${BLADE_POS_Z})`);
    console.log(`   Rotation Y: ${BLADE_ROT_Y.toFixed(2)} rad`);
    console.log("🟢 Green sphere added at same position");
    console.log("════════════════════════════════════");
    console.log("👁️ LOOK FOR GREEN SPHERE!");
    console.log("   If you see it, the blade is there too");
    console.log("════════════════════════════════════");
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

      <PickupItem
        id="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[2, 0, 6]}
      />
    </Physics>
  );
}