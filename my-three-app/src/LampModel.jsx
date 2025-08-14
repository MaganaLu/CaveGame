import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function LampModel({ intensity = 5 }) {
  const group = useRef();
  const { scene } = useGLTF('/oilLamp.glb');

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
    <group ref={group} scale={0.05} position={[0, 0, 0]}>
      <primitive object={scene.clone()} />
      <pointLight 
        position={[0, 0.2, 0]}
        intensity={intensity}
        distance={7}
        decay={2}
        color={'#ffffcc'}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </group>
  );
}