import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { House as HouseType } from '../../lib/types';
import { HOUSE_COLORS, CELL_SIZE } from '../../lib/constants';
import { useGameStore } from '../../lib/stores/useGameStore';
import { gridToWorld } from '../../lib/utils/grid';

interface HouseProps {
  house: HouseType;
}

export default function House({ house }: HouseProps) {
  const meshRef = useRef<Mesh>(null);
  const selectHouse = useGameStore(state => state.selectHouse);
  const selectedHouse = useGameStore(state => state.selectedHouse);
  
  const worldPos = gridToWorld(house.position);
  const isSelected = selectedHouse === house.id;

  // Add subtle animation for selected house
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (meshRef.current) {
      meshRef.current.rotation.y = 0;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectHouse(house.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={[worldPos.x, CELL_SIZE / 2, worldPos.z]}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[CELL_SIZE * 0.8, CELL_SIZE, CELL_SIZE * 0.8]} />
      <meshLambertMaterial 
        color={HOUSE_COLORS[house.type]} 
        transparent
        opacity={isSelected ? 0.8 : 1.0}
      />
      {/* Roof */}
      <mesh position={[0, CELL_SIZE * 0.3, 0]}>
        <coneGeometry args={[CELL_SIZE * 0.6, CELL_SIZE * 0.4, 4]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
    </mesh>
  );
}
