import React, { useRef, useEffect } from 'react';
import { useGLTF, useHelper } from '@react-three/drei';
import * as THREE from 'three';

export default function LampModel({ intensity = 5 }) {
  const group = useRef();
  const { scene } = useGLTF('./assets/models/lamps/lowPolyLantern.glb');

  const lightRef = useRef()

  // Attach the helper
  useHelper(lightRef, THREE.PointLightHelper, 0.01) // 0.5 is the size

  useEffect(() => {
    if (!group.current) return;
    group.current.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, []);

  return (
    <group ref={group} scale={.5} position={[-0.1, -.19, .1]} rotation={[-.4,1,.1]}>
      <primitive object={scene.clone()} />
      <pointLight 
        ref={lightRef}
        position={[0, .15, .0]}
        intensity={intensity}
        distance={50}
        decay={.7}
        color={'#FFB450'}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </group>
  );
}