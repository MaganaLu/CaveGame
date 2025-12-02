import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

/**
 * 
 * Used in FirstPersonArms component for the FPV arm display
 */
const AdventurerArmsModel = forwardRef(function AdventurerArmsModel(props, ref) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF('./assets/models/player/AdventurerArms.glb');
  const { actions } = useAnimations(animations, group);

  // Expose group, actions, and bone references to parent
  useImperativeHandle(ref, () => {
    // Find and cache bone references once
    const bones = {};
    group.current?.traverse(obj => {
      if (obj.isBone || obj.name.includes('Wrist')) {
        if (obj.name === 'WristL' || obj.name === 'Wrist.L' || obj.name === 'wristL') bones.wristL = obj;
        if (obj.name === 'WristR' || obj.name === 'Wrist.R' || obj.name === 'wristR') bones.wristR = obj;
      }
    });

    return {
      group: group.current,
      actions,
      bones,
      traverse: (callback) => group.current?.traverse(callback)
    };
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="Adventurergltf">
          <group name="CharacterArmature">
            <group name="Adventurer_Body">
              <skinnedMesh
                name="Cube063"
                geometry={nodes.Cube063.geometry}
                material={materials.Skin}
                skeleton={nodes.Cube063.skeleton}
                castShadow
                receiveShadow
              />
            </group>
            <primitive object={nodes.Root} />
          </group>
        </group>
      </group>
    </group>
  );
});

export default AdventurerArmsModel;

useGLTF.preload('./assets/models/player/AdventurerArms.glb');
