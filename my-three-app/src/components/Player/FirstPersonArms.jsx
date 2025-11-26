import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import LampModel from './LampModel';

export default function FirstPersonArms({ camera, lampVisible, onHandAnchorsReady }) {
  const group = useRef();
  const lampAnchor = useRef(new THREE.Group());
  const handAnchorR = useRef(new THREE.Group());
  
  const wristL = useRef();
  const wristR = useRef();
  
  const [rotationApplied, setRotationApplied] = useState(false);
  const [anchorsAttached, setAnchorsAttached] = useState(false);

  const { scene, animations } = useGLTF('./assets/models/player/AdventurerArms.glb');
  const { actions } = useAnimations(animations, scene);

  const armRotation = { upperArmRx: 0.0, upperArmRy: 1.47, upperArmRz: -0.2 };
  const groupTransform = { posX: 0, posY: 0.2, posZ: -1.4, rotX: 2, rotY: 2.85, rotZ: 0 };

  useEffect(() => {
    console.log("👐 FirstPersonArms: Setting up...");
    
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = obj.receiveShadow = true;
      }
      
      if (obj.name === 'WristL' || obj.name === 'Wrist.L' || obj.name === 'wristL') {
        wristL.current = obj;
      }
      if (obj.name === 'WristR' || obj.name === 'Wrist.R' || obj.name === 'wristR') {
        wristR.current = obj;
      }
    });

    camera.add(group.current);
    group.current.add(scene);

    if (group.current) {
      group.current.position.set(groupTransform.posX, groupTransform.posY, groupTransform.posZ);
      group.current.rotation.set(groupTransform.rotX, groupTransform.rotY, groupTransform.rotZ);
    }

    actions['Idle']?.play();
    console.log("✅ FirstPersonArms ready");
  }, [scene, actions, camera]);

  useEffect(() => {
    if (!wristL.current || !wristR.current || anchorsAttached) return;
    
    // Attach lamp to LEFT wrist
    wristL.current.add(lampAnchor.current);
    lampAnchor.current.position.set(-0.19, 0.6, -0.38);
    lampAnchor.current.rotation.set(0, -4.5, 1);
    lampAnchor.current.scale.setScalar(2.2);

    // Attach weapon anchor to RIGHT wrist
    wristR.current.add(handAnchorR.current);
    handAnchorR.current.position.set(0, 0, 0);
    handAnchorR.current.rotation.set(0, 0, 0);

    if (onHandAnchorsReady) {
      onHandAnchorsReady(lampAnchor.current, handAnchorR.current);
    }
    
    setAnchorsAttached(true);
    console.log("✅ Hand anchors ready");
  }, [wristL.current, wristR.current, anchorsAttached, onHandAnchorsReady]);

  useFrame(() => {
    if (wristL.current && wristR.current && !rotationApplied) {
      wristL.current.rotation.set(armRotation.upperArmRx, armRotation.upperArmRy, armRotation.upperArmRz);
      wristR.current.rotation.set(armRotation.upperArmRx, armRotation.upperArmRy, armRotation.upperArmRz);
      setRotationApplied(true);
    }
  });

  return (
    <group ref={group}>
      <group ref={lampAnchor} visible={lampVisible}>
        <LampModel intensity={10} scale={2} />
      </group>
    </group>
  );
}