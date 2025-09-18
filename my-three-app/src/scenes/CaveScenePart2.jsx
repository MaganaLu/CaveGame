import React from 'react'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer'
import TunnelModel from '../components/Environment/TunnelModel'
import MainMonster from '../components/Enemies/MainMonster'

export default function SecondScene({ progress, setProgress, onPlayerCaught }) {
  // Floor dimensions
  const floorSize = [50, 1, 50] // width, height, depth
  const floorHeight = 0

  // Capsule height (match FirstPersonPlayer)
  const capsuleHeight = 1.6

  // Use saved player position or fallback spawn point
  const spawnPoint = progress?.playerPosition || [0, floorHeight + capsuleHeight / 2, 0]

  return (
    <>
      <Physics gravity={[0, -10.81, 0]}>

        {/* Tunnel */}
        <TunnelModel position={[0, -5, 0]} />

        {/* Player */}
        <FirstPersonPlayer
          progress={progress}
          setProgress={setProgress}
          spawnPoint={spawnPoint}
        />

        {/* Enemy */}
        <MainMonster
          position={[0, 0, 6]}
          scale={0.8}
          onPlayerCaught={onPlayerCaught}
        />

      </Physics>
    </>
  )
}
