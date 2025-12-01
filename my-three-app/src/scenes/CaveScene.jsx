import React, { useState, useRef } from 'react'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer'
import TunnelModel from '../components/Environment/TunnelModel'
import MainMonster from '../components/Enemies/MainMonster'
import LampFuelController from '../components/Gameplay/LampFuelController'

export default function CaveScene({ progress, setProgress, onPlayerCaught }) {
  const playerRef = useRef();

  // Floor dimensions
  const floorSize = [50, 1, 50] // width, height, depth
  const floorHeight = 0;

  // Capsule height (match FirstPersonPlayer)
  const capsuleHeight = 1.6

  // Spawn point: bottom of capsule sits on floor
  const spawnPoint = [0, floorHeight + capsuleHeight / 2, 0]

  // Note: Periodic auto-save is handled centrally in App.jsx
  // This scene only handles event-based saves if needed

  return (
    <>
      <Physics gravity={[0, -10.81, 0]}>

        {/* Floor 
      <RigidBody type="fixed">
        <mesh receiveShadow position={[0, floorHeight, 0]}>
          <boxGeometry args={floorSize} />
          <meshStandardMaterial color="green" />
        </mesh>
        <CuboidCollider args={[floorSize[0]/2, floorSize[1]/2, floorSize[2]/2]} />
      </RigidBody>
*/}
        <TunnelModel position={[0, -5, 0]} />

        {/* Lighting 
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        position={[10, 10, 10]}
        intensity={1}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />*/}

        {/* Player */}
        <FirstPersonPlayer
          ref={playerRef}
          //progress={progress}
          //setProgress={setProgress}
          spawnPoint={spawnPoint}
        />

        {/* Lamp Fuel System - Controls fuel depletion and refueling */}
        <LampFuelController playerRef={playerRef} />

        <MainMonster position={[0, 0, 6]}
          scale={.8}
          onPlayerCaught={onPlayerCaught}
        />

      </Physics>
    </>
  )
}
