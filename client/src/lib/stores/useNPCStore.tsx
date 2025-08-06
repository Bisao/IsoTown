
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NPC, Position } from '../types';
import { NPCControlMode, MOVEMENT_SPEED } from '../constants';
import { nanoid } from 'nanoid';
import { isValidGridPosition, getNeighbors, positionsEqual } from '../utils/grid';
import { getRandomDirection } from '../utils/pathfinding';

interface NPCStore {
  npcs: Record<string, NPC>;
  
  addNPC: (position: Position) => string;
  removeNPC: (id: string) => void;
  moveNPC: (id: string, direction: Position) => void;
  setNPCTarget: (id: string, target: Position) => void;
  setNPCControlMode: (id: string, mode: NPCControlMode) => void;
  assignNPCToHouse: (npcId: string, houseId: string) => void;
  unassignNPCFromHouse: (npcId: string) => void;
  updateNPCMovement: () => void;
}

export const useNPCStore = create<NPCStore>()(
  subscribeWithSelector((set, get) => ({
    npcs: {},

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

    moveNPC: (id, direction) => {
      const npcs = get().npcs;
      const npc = npcs[id];
      if (!npc) return;

      const newPosition = {
        x: npc.position.x + direction.x,
        z: npc.position.z + direction.z
      };

      if (isValidGridPosition(newPosition)) {
        set((state) => ({
          npcs: {
            ...state.npcs,
            [id]: { 
              ...state.npcs[id], 
              position: newPosition,
              isMoving: true,
              movementTimer: Date.now()
            }
          }
        }));

        // Parar movimento após delay
        setTimeout(() => {
          set((state) => ({
            npcs: {
              ...state.npcs,
              [id]: { ...state.npcs[id], isMoving: false }
            }
          }));
        }, MOVEMENT_SPEED);
      }
    },

    setNPCTarget: (id, target) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], targetPosition: target }
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

    updateNPCMovement: () => {
      const npcs = get().npcs;
      const updates: Record<string, Partial<NPC>> = {};

      Object.values(npcs).forEach((npc) => {
        if (npc.controlMode === NPCControlMode.AUTONOMOUS && !npc.isMoving) {
          // Movimento aleatório a cada 2 segundos
          if (!npc.movementTimer || Date.now() - npc.movementTimer > 2000) {
            if (Math.random() < 0.3) { // 30% chance de se mover
              const direction = getRandomDirection();
              const newPosition = {
                x: npc.position.x + direction.x,
                z: npc.position.z + direction.z
              };

              if (isValidGridPosition(newPosition)) {
                updates[npc.id] = {
                  position: newPosition,
                  isMoving: true,
                  movementTimer: Date.now()
                };
              }
            }
          }
        }

        // Mover em direção ao alvo se houver
        if (npc.targetPosition && !npc.isMoving) {
          const dx = npc.targetPosition.x - npc.position.x;
          const dz = npc.targetPosition.z - npc.position.z;
          
          if (Math.abs(dx) > 0 || Math.abs(dz) > 0) {
            const direction = {
              x: dx > 0 ? 1 : dx < 0 ? -1 : 0,
              z: dz > 0 ? 1 : dz < 0 ? -1 : 0
            };
            
            // Mover apenas um tile por vez
            if (direction.x !== 0 && direction.z !== 0) {
              direction.z = 0; // Priorizar movimento horizontal
            }
            
            const newPosition = {
              x: npc.position.x + direction.x,
              z: npc.position.z + direction.z
            };

            if (isValidGridPosition(newPosition)) {
              updates[npc.id] = {
                position: newPosition,
                isMoving: true,
                movementTimer: Date.now()
              };
              
              // Remover alvo se alcançado
              if (positionsEqual(newPosition, npc.targetPosition)) {
                updates[npc.id].targetPosition = undefined;
              }
            }
          }
        }
      });

      // Aplicar atualizações
      if (Object.keys(updates).length > 0) {
        set((state) => {
          const newNPCs = { ...state.npcs };
          Object.entries(updates).forEach(([id, update]) => {
            newNPCs[id] = { ...newNPCs[id], ...update };
          });
          return { npcs: newNPCs };
        });
      }
    }
  }))
);
