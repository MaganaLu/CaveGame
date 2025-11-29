import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import PickUpItem from '../PickUpItem';

/**
 * AlienBlade - Pickup item with special effects
 * Wraps PickUpItem with blade-specific visuals and audio
 *
 * Features:
 * - Pulsing cyan glow effect
 * - Hovering/floating animation
 * - Positional audio (blade hum) - can be added later
 * - Particle trail effect - can be added later
 */
export default function AlienBlade({ id, position }) {
  const groupRef = useRef();
  const glowRef = useRef();
  const [isActive, setIsActive] = useState(true);

  // Pulsing glow animation
  useFrame((state) => {
    if (isActive && glowRef.current) {
      // Pulse the glow intensity
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      glowRef.current.intensity = pulse * 1.5;
    }

    // Gentle hovering/floating animation
    if (isActive && groupRef.current) {
      const hover = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      groupRef.current.position.y = position[1] + hover;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Core pickup functionality - handles all pickup/drop logic */}
      <PickUpItem
        id={id}
        itemType="alienBlade"
        modelPath="assets/models/weapons/AlienBlade.glb"
        position={[0, 0, 0]} // Relative to group
      />

      {/* Cyan glow effect around the blade */}
      {isActive && (
        <>
          <pointLight
            ref={glowRef}
            position={[0, 0.3, 0]}
            color="#00ffff"
            intensity={1.5}
            distance={3}
            decay={2}
          />

          {/* Ambient glow sphere */}
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/*
        TODO: Add sound effect
        <PositionalAudio
          url="assets/sounds/blade-hum.mp3"
          distance={5}
          loop
          autoplay
        />
      */}

      {/*
        TODO: Add particle trail effect
        <ParticleTrail color="cyan" />
      */}
    </group>
  );
}
