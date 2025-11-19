import React from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { AxesHelper } from 'three'


export default function AlienBlade(props) {
  const gltf = useGLTF('./assets/models/weapons/AlienBlade.glb')

  /*
  React.useEffect(() => {
    const originHelper = new AxesHelper(1)
    gltf.scene.add(originHelper)
    return () => gltf.scene.remove(originHelper)
  }, [gltf.scene])
*/
  return (
    <RigidBody type="fixed" colliders="trimesh" {...props}>
        
      <primitive object={gltf.scene} scale={[.01, .01, .01]}/>
    </RigidBody>
  )
}
