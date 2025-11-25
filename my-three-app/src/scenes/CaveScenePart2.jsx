import React, { useRef } from 'react';
import { Physics } from '@react-three/rapier';
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer';
import TunnelModel from '../components/Environment/TunnelModel';
import MainMonster from '../components/Enemies/MainMonster';
import PickupItem from '../components/Props/PickUpItem'; // Match the actual filename

export default function CaveScenePart2({ progress, setProgress, onPlayerCaught }) {
  const capsuleHeight = 1.6;
  const spawnPoint = [0, capsuleHeight/2, 0];
  const playerRef = useRef();

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

      <PickupItem
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[2, 0, 6]}
        pickupRadius={2}
        playerRef={playerRef}
        onPickup={() => console.log("✅ AlienBlade picked up!")}
      />
    </Physics>
  );
}