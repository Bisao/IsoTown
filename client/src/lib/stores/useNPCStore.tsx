import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NPC, Position } from '../types';
import { NPCControlMode } from '../constants';
import { nanoid } from 'nanoid';

interface NPCStore {
  npcs: Record<string, NPC>;
  
  // Actions
  addNPC: (position: Position) => string;
  removeNPC: (id: string) => void;
  updateNPCPosition: (id: string, position: Position) => void;
  setNPCTarget: (id: string, target: Position) => void;
  setNPCControlMode: (id: string, mode: NPCControlMode) => void;
  assignNPCToHouse: (npcId: string, houseId: string) => void;
  unassignNPCFromHouse: (npcId: string) => void;
  setNPCPath: (id: string, path: Position[]) => void;
  updateNPCMovement: () => void;
}

export const useNPCStore = create<NPCStore>()(
  subscribeWithSelector((set, get) => ({
    npcs: {
      // Create initial NPC bass
      'npc-bass': {
        id: 'npc-bass',
        position: { x: 0, z: 0 },
        controlMode: NPCControlMode.AUTONOMOUS,
        isMoving: false,
      }
    },

    addNPC: (position) => {
      const id = nanoid();
      const npc: NPC = {
        id,
        position,
        controlMode: NPCControlMode.AUTONOMOUS,
        isMoving: false,
      };
      
      set((state) => ({
        npcs: { ...state.npcs, [id]: npc }
      }));
      
      return id;
    },

    removeNPC: (id) => set((state) => {
      const { [id]: removed, ...rest } = state.npcs;
      return { npcs: rest };
    }),

    updateNPCPosition: (id, position) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], position }
      }
    })),

    setNPCTarget: (id, target) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], targetPosition: target, isMoving: true }
      }
    })),

    setNPCControlMode: (id, mode) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], controlMode: mode }
      }
    })),

    assignNPCToHouse: (npcId, houseId) => set((state) => ({
      npcs: {
        ...state.npcs,
        [npcId]: { ...state.npcs[npcId], houseId }
      }
    })),

    unassignNPCFromHouse: (npcId) => set((state) => ({
      npcs: {
        ...state.npcs,
        [npcId]: { ...state.npcs[npcId], houseId: undefined }
      }
    })),

    setNPCPath: (id, path) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { 
          ...state.npcs[id], 
          path, 
          pathIndex: 0,
          isMoving: path.length > 0
        }
      }
    })),

    updateNPCMovement: () => {
      const npcs = get().npcs;
      const updates: Record<string, Partial<NPC>> = {};

      Object.values(npcs).forEach((npc) => {
        if (npc.controlMode === NPCControlMode.AUTONOMOUS) {
          // If not currently moving, randomly decide to start moving
          if (!npc.isMoving && Math.random() < 0.01) {
            const randomTarget = {
              x: (Math.random() - 0.5) * 15, // Random position within grid bounds
              z: (Math.random() - 0.5) * 15
            };
            updates[npc.id] = {
              targetPosition: randomTarget,
              isMoving: true
            };
            return;
          }
          
          if (npc.isMoving) {
            if (npc.path && npc.pathIndex !== undefined) {
              // Follow path
              if (npc.pathIndex < npc.path.length) {
                const target = npc.path[npc.pathIndex];
                const dx = target.x - npc.position.x;
                const dz = target.z - npc.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance > 0.1) {
                  const newX = npc.position.x + (dx / distance) * 0.05;
                  const newZ = npc.position.z + (dz / distance) * 0.05;
                  updates[npc.id] = {
                    position: { x: newX, z: newZ }
                  };
                } else {
                  // Reached waypoint, move to next
                  if (npc.pathIndex < npc.path.length - 1) {
                    updates[npc.id] = {
                      pathIndex: npc.pathIndex + 1
                    };
                  } else {
                    // Reached end of path
                    updates[npc.id] = {
                      isMoving: false,
                      path: undefined,
                      pathIndex: undefined
                    };
                  }
                }
              }
            } else if (npc.targetPosition) {
              // Move to target
              const dx = npc.targetPosition.x - npc.position.x;
              const dz = npc.targetPosition.z - npc.position.z;
              const distance = Math.sqrt(dx * dx + dz * dz);

              if (distance > 0.1) {
                const newX = npc.position.x + (dx / distance) * 0.05;
                const newZ = npc.position.z + (dz / distance) * 0.05;
                updates[npc.id] = {
                  position: { x: newX, z: newZ }
                };
              } else {
                // Reached target
                updates[npc.id] = {
                  isMoving: false,
                  targetPosition: undefined
                };
              }
            }
          }
        }
      });

      // Apply updates
      if (Object.keys(updates).length > 0) {
        set((state) => {
          const newNPCs = { ...state.npcs };
          Object.entries(updates).forEach(([id, update]) => {
            newNPCs[id] = { ...newNPCs[id], ...update };
          });
          return { npcs: newNPCs };
        });
      }
    },
  }))
);
