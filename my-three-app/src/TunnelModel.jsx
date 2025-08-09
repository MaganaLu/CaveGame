import React from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { AxesHelper } from 'three'


export default function TunnelModel(props) {
  const gltf = useGLTF('/Tunnelz.glb')

  React.useEffect(() => {
    const originHelper = new AxesHelper(1)
    gltf.scene.add(originHelper)
    return () => gltf.scene.remove(originHelper)
  }, [gltf.scene])

  return (
    <RigidBody type="fixed" colliders="trimesh" position={[0, -2, 0]} {...props}>
        
      <primitive object={gltf.scene} scale={[1, 1, 1]}/>
    </RigidBody>
  )
}
