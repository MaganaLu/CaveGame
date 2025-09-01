import React from 'react'
import { Physics, RigidBody } from '@react-three/rapier'
import TunnelModel from '../components/Environment/TunnelModel'
import FirstPersonPlayer from '../components/Player/FirstPersonPlayer'

export default function CaveScene() {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      {/* Floor */}
      <RigidBody type="fixed">
        <mesh position={[0, -1, 0]}>
          <meshStandardMaterial color="red" />
        </mesh>
      </RigidBody>

      <TunnelModel />
      <FirstPersonPlayer />
    </Physics>
  )
}
