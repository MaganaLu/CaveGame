import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

/**
 * Full Adventurer Model
 *
 * @param {boolean} showHead
 * @param {boolean} showBackpack
 * @param {boolean} showTorso
 */
const AdventurerModel = forwardRef(function AdventurerModel({
  showHead = true,
  showBackpack = true,
  showTorso = true,
  ...props
}, ref) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF('assets/models/player/Adventurer.gltf');
  const { actions } = useAnimations(animations, group);

  // Expose group, actions, and bone references to parent
  useImperativeHandle(ref, () => {
    // Find and cache bone references once
    const bones = {};
    group.current?.traverse(obj => {
      if (obj.isBone) {
        if (obj.name === 'Head') bones.head = obj;
        if (obj.name === 'WristL' || obj.name === 'Wrist.L' || obj.name === 'wristL') bones.wristL = obj;
        if (obj.name === 'WristR' || obj.name === 'Wrist.R' || obj.name === 'wristR') bones.wristR = obj;
      }
    });

    return {
      group: group.current,
      actions,
      bones,
      traverse: (callback) => group.current?.traverse(callback),
      updateMatrixWorld: () => group.current?.updateMatrixWorld()
    };
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="CharacterArmature">
          {/* Body */}
          <group name="Adventurer_Body" visible={showTorso}>
            <skinnedMesh
              name="Cube063"
              geometry={nodes.Cube063.geometry}
              material={materials.Skin}
              skeleton={nodes.Cube063.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube063_1"
              geometry={nodes.Cube063_1.geometry}
              material={materials.Green}
              skeleton={nodes.Cube063_1.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube063_2"
              geometry={nodes.Cube063_2.geometry}
              material={materials.LightGreen}
              skeleton={nodes.Cube063_2.skeleton}
              castShadow
              receiveShadow
            />
          </group>

          {/* Feet */}
          <group name="Adventurer_Feet">
            <skinnedMesh
              name="Cube052"
              geometry={nodes.Cube052.geometry}
              material={materials.Grey}
              skeleton={nodes.Cube052.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube052_1"
              geometry={nodes.Cube052_1.geometry}
              material={materials.Black}
              skeleton={nodes.Cube052_1.skeleton}
              castShadow
              receiveShadow
            />
          </group>

          {/* Head */}
          <group name="Adventurer_Head" visible={showHead}>
            <skinnedMesh
              name="Cube039"
              geometry={nodes.Cube039.geometry}
              material={materials.Skin}
              skeleton={nodes.Cube039.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube039_1"
              geometry={nodes.Cube039_1.geometry}
              material={materials.Eyebrows}
              skeleton={nodes.Cube039_1.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube039_2"
              geometry={nodes.Cube039_2.geometry}
              material={materials.Hair}
              skeleton={nodes.Cube039_2.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube039_3"
              geometry={nodes.Cube039_3.geometry}
              material={materials.Eye}
              skeleton={nodes.Cube039_3.skeleton}
              castShadow
              receiveShadow
            />
          </group>

          {/* Legs */}
          <group name="Adventurer_Legs">
            <skinnedMesh
              name="Cube020"
              geometry={nodes.Cube020.geometry}
              material={materials.Brown}
              skeleton={nodes.Cube020.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Cube020_1"
              geometry={nodes.Cube020_1.geometry}
              material={materials.Brown2}
              skeleton={nodes.Cube020_1.skeleton}
              castShadow
              receiveShadow
            />
          </group>

          {/* Backpack */}
          <group name="Backpack" visible={showBackpack}>
            <skinnedMesh
              name="Plane"
              geometry={nodes.Plane.geometry}
              material={materials.Brown}
              skeleton={nodes.Plane.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Plane_1"
              geometry={nodes.Plane_1.geometry}
              material={materials.LightGreen}
              skeleton={nodes.Plane_1.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Plane_2"
              geometry={nodes.Plane_2.geometry}
              material={materials.Gold}
              skeleton={nodes.Plane_2.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              name="Plane_3"
              geometry={nodes.Plane_3.geometry}
              material={materials.Green}
              skeleton={nodes.Plane_3.skeleton}
              castShadow
              receiveShadow
            />
          </group>

          <primitive object={nodes.Root} />
        </group>
      </group>
    </group>
  );
});

export default AdventurerModel;

useGLTF.preload('assets/models/player/Adventurer.gltf');
