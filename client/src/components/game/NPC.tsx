import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { NPC as NPCType } from '../../lib/types';
import { NPC_COLOR, CELL_SIZE } from '../../lib/constants';
import { useGameStore } from '../../lib/stores/useGameStore';
import { gridToWorld } from '../../lib/utils/grid';

interface NPCProps {
  npc: NPCType;
}

export default function NPC({ npc }: NPCProps) {
  const meshRef = useRef<Mesh>(null);
  const selectNPC = useGameStore(state => state.selectNPC);
  const selectedNPC = useGameStore(state => state.selectedNPC);
  
  const worldPos = gridToWorld(npc.position);
  const isSelected = selectedNPC === npc.id;

  // Add bounce animation when moving
  useFrame((state) => {
    if (meshRef.current) {
      const bounce = npc.isMoving ? Math.sin(state.clock.elapsedTime * 8) * 0.1 + 0.1 : 0;
      meshRef.current.position.y = CELL_SIZE / 4 + bounce;
      
      if (isSelected) {
        meshRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectNPC(npc.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={[worldPos.x, CELL_SIZE / 4, worldPos.z]}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[CELL_SIZE * 0.3, CELL_SIZE * 0.3, CELL_SIZE * 0.5]} />
      <meshLambertMaterial 
        color={NPC_COLOR}
        transparent
        opacity={isSelected ? 0.8 : 1.0}
      />
      {/* Eyes */}
      <mesh position={[-0.1, 0.1, 0.25]}>
        <sphereGeometry args={[0.05]} />
        <meshLambertMaterial color="white" />
      </mesh>
      <mesh position={[0.1, 0.1, 0.25]}>
        <sphereGeometry args={[0.05]} />
        <meshLambertMaterial color="white" />
      </mesh>
      <mesh position={[-0.1, 0.1, 0.28]}>
        <sphereGeometry args={[0.02]} />
        <meshLambertMaterial color="black" />
      </mesh>
      <mesh position={[0.1, 0.1, 0.28]}>
        <sphereGeometry args={[0.02]} />
        <meshLambertMaterial color="black" />
      </mesh>
    </mesh>
  );
}
