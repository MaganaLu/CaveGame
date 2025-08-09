import React from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { AxesHelper } from 'three'


export default function TunnelModel(props) {
  const gltf = useGLTF('/Tunnelz.glb')

  /*
  React.useEffect(() => {
    const originHelper = new AxesHelper(1)
    gltf.scene.add(originHelper)
    return () => gltf.scene.remove(originHelper)
  }, [gltf.scene])
*/
  return (
    <RigidBody type="fixed" colliders="trimesh" position={[10, -25, 5]} {...props}>
        
      <primitive object={gltf.scene} scale={[12, 12, 12]}/>
    </RigidBody>
  )
}
