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

  // Setup bones and attach to camera
  useEffect(() => {
    console.log("👐 FirstPersonArms: Scanning model...");
    
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = obj.receiveShadow = true;
      }
      
      if (obj.name === 'WristL' || obj.name === 'Wrist.L' || obj.name === 'wristL') {
        wristL.current = obj;
        console.log("  ✅ FOUND LEFT WRIST:", obj.name);
      }
      if (obj.name === 'WristR' || obj.name === 'Wrist.R' || obj.name === 'wristR') {
        wristR.current = obj;
        console.log("  ✅ FOUND RIGHT WRIST:", obj.name);
      }
    });

    camera.add(group.current);
    group.current.add(scene);

    if (group.current) {
      group.current.position.set(groupTransform.posX, groupTransform.posY, groupTransform.posZ);
      group.current.rotation.set(groupTransform.rotX, groupTransform.rotY, groupTransform.rotZ);
    }

    actions['Idle']?.play();
    console.log("✅ FirstPersonArms attached to camera");
  }, [scene, actions, camera]);

  // Attach lamp and weapon anchor to wrists + ADD HUGE DEBUG SPHERES
  useEffect(() => {
    if (!wristL.current || !wristR.current || anchorsAttached) return;
    
    console.log("🔗 Attaching hand anchors...");
    
    // Attach lamp to LEFT wrist
    wristL.current.add(lampAnchor.current);
    lampAnchor.current.position.set(-0.19, 0.6, -0.38);
    lampAnchor.current.rotation.set(0, -4.5, 1);
    lampAnchor.current.scale.setScalar(2.2);
    console.log("  ✅ Lamp attached to left wrist");

    // Attach weapon anchor to RIGHT wrist
    wristR.current.add(handAnchorR.current);
    
    // Try different positions to find where it appears
    handAnchorR.current.position.set(0, 0, 0); // Start at wrist origin
    handAnchorR.current.rotation.set(0, 0, 0);
    
    console.log("  ✅ Weapon anchor attached to right wrist at origin");

    // ADD MASSIVE BLUE SPHERE at handAnchor location so we can SEE it
    const massiveDebugSphere = new THREE.Mesh(
      new THREE.SphereGeometry(6, 6, 6), // HUGE sphere
      new THREE.MeshBasicMaterial({ 
        color: 0x0000ff,
        wireframe: false,
        transparent: true,
        opacity: 0.8
      })
    );
    handAnchorR.current.add(massiveDebugSphere);
    console.log("  🔵 ADDED MASSIVE BLUE SPHERE at handAnchor origin");

    // ADD ANOTHER SPHERE at the wrist itself
    const wristSphere = new THREE.Mesh(
      new THREE.SphereGeometry(6, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff00ff }) // Magenta
    );
    wristR.current.add(wristSphere);
    console.log("  🟣 ADDED MAGENTA SPHERE at wrist origin");

    // Notify parent
    if (onHandAnchorsReady) {
      console.log("  📤 Calling onHandAnchorsReady...");
      onHandAnchorsReady(lampAnchor.current, handAnchorR.current);
    }
    
    setAnchorsAttached(true);
    console.log("✅ Hand anchors setup complete!");
  }, [wristL.current, wristR.current, anchorsAttached, onHandAnchorsReady]);

  // Apply rotation to wrists
  useFrame(() => {
    if (wristL.current && wristR.current && !rotationApplied) {
      wristL.current.rotation.set(armRotation.upperArmRx, armRotation.upperArmRy, armRotation.upperArmRz);
      wristR.current.rotation.set(armRotation.upperArmRx, armRotation.upperArmRy, armRotation.upperArmRz);
      setRotationApplied(true);
      console.log("✅ Wrist rotations applied");
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