
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NPC, Position, NPCControlMode, NPCProfession, NPCState } from '../types';
import { MOVEMENT_SPEED, LUMBERJACK_CHOP_INTERVAL, LUMBERJACK_WORK_RANGE, CHOPPING_ANIMATION_DURATION } from '../constants';
import { nanoid } from 'nanoid';
import { isValidGridPosition, getNeighbors, positionsEqual } from '../utils/grid';
import { getRandomDirection, findPath } from '../utils/pathfinding';

interface NPCStore {
  npcs: Record<string, NPC>;
  
  addNPC: (position: Position, profession?: NPCProfession) => string;
  removeNPC: (id: string) => void;
  moveNPC: (id: string, direction: Position) => void;
  setNPCTarget: (id: string, target: Position) => void;
  setNPCControlMode: (id: string, mode: NPCControlMode) => void;
  setNPCProfession: (id: string, profession: NPCProfession) => void;
  assignNPCToHouse: (npcId: string, houseId: string) => void;
  unassignNPCFromHouse: (npcId: string) => void;
  updateNPCMovement: () => void;
  updateLumberjackBehavior: (npc: NPC) => void;
}

export const useNPCStore = create<NPCStore>()(
  subscribeWithSelector((set, get) => ({
    npcs: {},

    addNPC: (position, profession = NPCProfession.NONE) => {
      const id = nanoid();
      const npc: NPC = {
        id,
        position,
        controlMode: NPCControlMode.AUTONOMOUS,
        profession,
        state: NPCState.IDLE,
        isMoving: false,
        lastMovement: Date.now()
      };
      
      set((state) => ({
        npcs: { ...state.npcs, [id]: npc }
      }));
      
      console.log('Novo NPC criado:', id, 'na posição:', position, 'profissão:', profession);
      return id;
    },

    removeNPC: (id) => set((state) => {
      const { [id]: removed, ...rest } = state.npcs;
      return { npcs: rest };
    }),

    moveNPC: (id, direction) => {
      const npcs = get().npcs;
      const npc = npcs[id];
      if (!npc) {
        console.log('NPC não encontrado:', id);
        return;
      }

      if (npc.isMoving) {
        console.log('NPC já está se movendo:', id);
        return;
      }

      const newPosition = {
        x: npc.position.x + direction.x,
        z: npc.position.z + direction.z
      };

      console.log('Tentando mover NPC:', id, 'de', npc.position, 'para', newPosition);

      if (isValidGridPosition(newPosition)) {
        console.log('Posição válida, movendo NPC');
        set((state) => ({
          npcs: {
            ...state.npcs,
            [id]: { 
              ...state.npcs[id], 
              position: newPosition,
              isMoving: true,
              lastMovement: Date.now()
            }
          }
        }));

        // Parar movimento após delay
        setTimeout(() => {
          const currentState = get();
          if (currentState.npcs[id]) {
            console.log('Parando movimento do NPC:', id);
            set((state) => ({
              npcs: {
                ...state.npcs,
                [id]: { ...state.npcs[id], isMoving: false }
              }
            }));
          }
        }, MOVEMENT_SPEED);
      } else {
        console.log('Posição inválida:', newPosition);
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

    setNPCProfession: (id, profession) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], profession }
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
          const currentTime = Date.now();
          if (!npc.lastMovement || currentTime - npc.lastMovement > 2000) {
            if (Math.random() < 0.4) { // 40% chance de se mover
              const direction = getRandomDirection();
              const newPosition = {
                x: npc.position.x + direction.x,
                z: npc.position.z + direction.z
              };

              if (isValidGridPosition(newPosition)) {
                updates[npc.id] = {
                  position: newPosition,
                  isMoving: true,
                  lastMovement: currentTime
                };
                
                // Parar movimento após delay
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.npcs[npc.id]) {
                    set((state) => ({
                      npcs: {
                        ...state.npcs,
                        [npc.id]: { ...state.npcs[npc.id], isMoving: false }
                      }
                    }));
                  }
                }, MOVEMENT_SPEED);
              } else {
                // Se não pode mover, reset timer
                updates[npc.id] = {
                  lastMovement: currentTime
                };
              }
            } else {
              // Se não moveu, reset timer para tentar novamente
              updates[npc.id] = {
                lastMovement: currentTime
              };
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
                lastMovement: Date.now()
              };
              
              // Remover alvo se alcançado
              if (positionsEqual(newPosition, npc.targetPosition)) {
                updates[npc.id].targetPosition = undefined;
              }
            }
          }
        }
      });

      // Aplicar atualizações se houver
      if (Object.keys(updates).length > 0) {
        set((state) => {
          const newNPCs = { ...state.npcs };
          Object.entries(updates).forEach(([id, update]) => {
            if (newNPCs[id]) {
              newNPCs[id] = { ...newNPCs[id], ...update };
            }
          });
          return { npcs: newNPCs };
        });
      }
    },

    updateLumberjackBehavior: (npc) => {
      if (npc.profession !== NPCProfession.LUMBERJACK || npc.controlMode !== NPCControlMode.AUTONOMOUS) {
        return;
      }

      const currentTime = Date.now();
      
      // Simple store access without imports to avoid circular dependency
      console.log('Atualizando lenhador - estado atual:', npc.state);
      
      // For now, let's use hardcoded trees data to test the behavior
      const mockTrees = {
        'tree1': { id: 'tree1', position: { x: 1, z: 1 }, health: 3, maxHealth: 3 },
        'tree2': { id: 'tree2', position: { x: 2, z: 2 }, health: 3, maxHealth: 3 }
      };
      
      const getNearestTree = (position: Position, range: number) => {
        const trees = Object.values(mockTrees);
        let nearestTree = null;
        let nearestDistance = Infinity;
        
        for (const tree of trees) {
          const distance = Math.sqrt(
            Math.pow(tree.position.x - position.x, 2) + 
            Math.pow(tree.position.z - position.z, 2)
          );
          
          if (distance <= range && distance < nearestDistance) {
            nearestTree = tree;
            nearestDistance = distance;
          }
        }
        
        return nearestTree;
      };
      
      console.log('Árvores disponíveis:', Object.keys(mockTrees).length);
      if (Object.keys(mockTrees).length > 0) {
        console.log('Primeira árvore:', Object.values(mockTrees)[0]);
      }

      switch (npc.state) {
        case NPCState.IDLE: {
          // Look for nearest tree within range
          const nearestTree = getNearestTree(npc.position, LUMBERJACK_WORK_RANGE);
          console.log('Procurando árvore próxima de:', npc.position, 'encontrou:', nearestTree ? nearestTree.id : 'nenhuma');
          
          if (nearestTree) {
            // Check if adjacent to tree
            const distance = Math.abs(nearestTree.position.x - npc.position.x) + 
                           Math.abs(nearestTree.position.z - npc.position.z);
            
            if (distance === 1) {
              // Adjacent to tree - start working
              set((state) => ({
                npcs: {
                  ...state.npcs,
                  [npc.id]: {
                    ...state.npcs[npc.id],
                    state: NPCState.WORKING,
                    currentTask: {
                      type: 'cut_tree',
                      targetId: nearestTree.id,
                      targetPosition: nearestTree.position,
                      progress: 0,
                      maxProgress: nearestTree.health
                    },
                    lastMovement: currentTime
                  }
                }
              }));
            } else {
              // Move towards tree
              const direction = {
                x: nearestTree.position.x > npc.position.x ? 1 : 
                   nearestTree.position.x < npc.position.x ? -1 : 0,
                z: nearestTree.position.z > npc.position.z ? 1 : 
                   nearestTree.position.z < npc.position.z ? -1 : 0
              };
              
              // Move only one tile at a time
              if (direction.x !== 0 && direction.z !== 0) {
                direction.z = 0; // Prioritize horizontal movement
              }
              
              const newPosition = {
                x: npc.position.x + direction.x,
                z: npc.position.z + direction.z
              };
              
              if (isValidGridPosition(newPosition)) {
                set((state) => ({
                  npcs: {
                    ...state.npcs,
                    [npc.id]: {
                      ...state.npcs[npc.id],
                      state: NPCState.MOVING,
                      position: newPosition,
                      isMoving: true,
                      lastMovement: currentTime
                    }
                  }
                }));
                
                // Stop movement after delay
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.npcs[npc.id]) {
                    set((state) => ({
                      npcs: {
                        ...state.npcs,
                        [npc.id]: { 
                          ...state.npcs[npc.id], 
                          isMoving: false,
                          state: NPCState.IDLE 
                        }
                      }
                    }));
                  }
                }, MOVEMENT_SPEED);
              }
            }
          }
          break;
        }
        
        case NPCState.WORKING: {
          if (!npc.currentTask || npc.currentTask.type !== 'cut_tree') {
            // Invalid task - return to idle
            set((state) => ({
              npcs: {
                ...state.npcs,
                [npc.id]: {
                  ...state.npcs[npc.id],
                  state: NPCState.IDLE,
                  currentTask: undefined
                }
              }
            }));
            return;
          }
          
          // Check if tree still exists (using mock trees for now)
          const tree = mockTrees[npc.currentTask.targetId];
          if (!tree) {
            // Tree is gone - return to idle
            set((state) => ({
              npcs: {
                ...state.npcs,
                [npc.id]: {
                  ...state.npcs[npc.id],
                  state: NPCState.IDLE,
                  currentTask: undefined
                }
              }
            }));
            return;
          }
          
          // Check if enough time has passed since last chop
          if (currentTime - npc.lastMovement >= LUMBERJACK_CHOP_INTERVAL) {
            // Perform chop (mock damage for now)
            const currentHealth = tree.health - 1;
            const treeDestroyed = currentHealth <= 0;
            
            // Add "TOC" visual effect (mock for now)
            console.log('TOC! Efeito de corte na posição:', tree.position);
            
            // Add chopping animation
            set((state) => ({
              npcs: {
                ...state.npcs,
                [npc.id]: {
                  ...state.npcs[npc.id],
                  animation: {
                    type: 'chopping',
                    startTime: currentTime,
                    duration: CHOPPING_ANIMATION_DURATION
                  },
                  lastMovement: currentTime,
                  currentTask: treeDestroyed ? undefined : npc.currentTask ? {
                    ...npc.currentTask,
                    progress: npc.currentTask.progress + 1
                  } : undefined,
                  state: treeDestroyed ? NPCState.IDLE : NPCState.WORKING
                }
              }
            }));
          }
          break;
        }
      }
    }
  }))
);
