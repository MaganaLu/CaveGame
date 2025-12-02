import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import LampModel from './LampModel';
import AdventurerArmsModel from './AdventurerArmsModel';

export default function FirstPersonArms({ camera, lampVisible, onHandAnchorsReady }) {
  const group = useRef();
  const armsModelRef = useRef();
  const lampAnchor = useRef(new THREE.Group());
  const handAnchorR = useRef(new THREE.Group());

  const wristL = useRef();
  const wristR = useRef();

  const [rotationApplied, setRotationApplied] = useState(false);
  const [anchorsAttached, setAnchorsAttached] = useState(false);

  const armRotation = { upperArmRx: 0.0, upperArmRy: 1.47, upperArmRz: -0.2 };
  const groupTransform = { posX: 0, posY: 0.2, posZ: -1.4, rotX: 2, rotY: 2.85, rotZ: 0 };

  useEffect(() => {
    if (!armsModelRef.current) return;

    console.log("👐 FirstPersonArms: Setting up...");

    // Get wrist bones directly
    if (armsModelRef.current.bones) {
      wristL.current = armsModelRef.current.bones.wristL;
      wristR.current = armsModelRef.current.bones.wristR;
    }

    // Attach group to camera
    camera.add(group.current);

    // Set group transform
    if (group.current) {
      group.current.position.set(groupTransform.posX, groupTransform.posY, groupTransform.posZ);
      group.current.rotation.set(groupTransform.rotX, groupTransform.rotY, groupTransform.rotZ);
    }

    // Play idle animation
    armsModelRef.current.actions?.['Idle']?.play();
    console.log("✅ FirstPersonArms ready");
  }, [camera]);

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
      <AdventurerArmsModel ref={armsModelRef} />
      <group ref={lampAnchor} visible={lampVisible}>
        <LampModel intensity={10} scale={2} />
      </group>
    </group>
  );
}