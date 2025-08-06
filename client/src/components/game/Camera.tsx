import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { gridToWorld } from '../../lib/utils/grid';
import { NPCControlMode } from '../../lib/constants';

export default function Camera() {
  const { camera } = useThree();
  const cameraRef = useRef({
    targetX: 0,
    targetZ: 10,
    targetY: 10
  });

  const npcs = useNPCStore(state => state.npcs);
  const selectedNPC = useGameStore(state => state.selectedNPC);

  useFrame(() => {
    // Follow selected NPC if in controlled mode
    if (selectedNPC) {
      const npc = npcs[selectedNPC];
      if (npc && npc.controlMode === NPCControlMode.CONTROLLED) {
        const worldPos = gridToWorld(npc.position);
        cameraRef.current.targetX = worldPos.x;
        cameraRef.current.targetZ = worldPos.z + 10;
      }
    }

    // Smooth camera movement
    camera.position.x += (cameraRef.current.targetX - camera.position.x) * 0.05;
    camera.position.z += (cameraRef.current.targetZ - camera.position.z) * 0.05;
    camera.position.y += (cameraRef.current.targetY - camera.position.y) * 0.05;

    // Always look at the center or selected NPC
    if (selectedNPC) {
      const npc = npcs[selectedNPC];
      if (npc) {
        const worldPos = gridToWorld(npc.position);
        camera.lookAt(worldPos.x, 0, worldPos.z);
      }
    } else {
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}
