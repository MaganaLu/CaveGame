import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import PickUpItem from '../PickUpItem';

/**
 * OilLampCan - Pickup item with special effects
 * Wraps PickUpItem with lamp-specific visuals and audio
 *
 * Features:
 * - Warm orange ambient light
 * - Flickering light effect (like old oil lamp)
 * - Gentle swaying animation
 * - Positional audio (oil sloshing) - can be added later
 */
export default function OilLampCan({ id, position }) {
  const groupRef = useRef();
  const lightRef = useRef();

  // Flickering light and swaying animation
  useFrame((state) => {
    // Flickering oil lamp light
    if (lightRef.current) {
      const flicker = Math.sin(state.clock.elapsedTime * 8) * 0.1 + 0.9;
      const randomFlicker = Math.random() * 0.1;
      lightRef.current.intensity = (flicker + randomFlicker) * 1.2;
    }

    // Gentle swaying motion
    if (groupRef.current) {
      const sway = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
      groupRef.current.rotation.z = sway;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Core pickup functionality - handles all pickup/drop logic */}
      <PickUpItem
        id={id}
        itemType="oilLampCan"
        modelPath="assets/models/lamps/vintage_oil_can.glb"
        position={[0, 0, 0]} // Relative to group
      />

      {/* Warm orange/amber light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.5, 0]}
        color="#ff9944"
        intensity={1.2}
        distance={5}
        decay={2}
      />

      {/* Subtle ambient glow */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial
          color="#ff9944"
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      {/*
        TODO: Add sound effect
        <PositionalAudio
          url="assets/sounds/oil-slosh.mp3"
          distance={3}
          loop
          autoplay
        />
      */}
    </group>
  );
}
