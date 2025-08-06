import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import Grid from './Grid';
import House from './House';
import NPC from './NPC';
import Camera from './Camera';
import GameInput from './GameInput';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';

export default function GameWorld() {
  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const updateNPCMovement = useNPCStore(state => state.updateNPCMovement);

  // Update NPC movement each frame
  useFrame(() => {
    updateNPCMovement();
  });

  return (
    <>
      <Camera />
      <Grid />
      <GameInput />
      
      {/* Render all houses */}
      {Object.values(houses).map((house) => (
        <House key={house.id} house={house} />
      ))}
      
      {/* Render all NPCs */}
      {Object.values(npcs).map((npc) => (
        <NPC key={npc.id} npc={npc} />
      ))}
      
      {/* Ground plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial color="#90EE90" />
      </mesh>
    </>
  );
}
