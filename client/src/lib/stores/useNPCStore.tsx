import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NPC, Position, NPCControlMode, NPCProfession, NPCState, NPCAnimation } from '../types';
import { MOVEMENT_SPEED, LUMBERJACK_CHOP_INTERVAL, LUMBERJACK_WORK_RANGE, CHOPPING_ANIMATION_DURATION } from '../constants';
import { nanoid } from 'nanoid';
import { isValidGridPosition, getNeighbors, positionsEqual } from '../utils/grid';
import { getRandomDirection, findPath } from '../utils/pathfinding';
import { NPCActionSystem } from '../systems/NPCActionSystem';

interface NPCStore {
  npcs: Record<string, NPC>;
  npcCooldowns: Record<string, number>; // Cooldowns por NPC

  // Actions
  addNPC: (position: Position, profession?: NPCProfession, houseId?: string) => string;
  removeNPC: (id: string) => void;
  moveNPC: (id: string, direction: { x: number; z: number }) => void;
  selectNPC: (id: string) => void;
  setNPCControlMode: (id: string, mode: NPCControlMode) => void;
  setNPCState: (id: string, state: NPCState, task?: any) => void;
  setNPCAnimation: (id: string, animation: NPCAnimation | undefined) => void;
  updateNPCMovement: () => void;
  updateControlledNPCWork: () => void;
  updateNPCTask: (id: string, task: any) => void;
  performWork: (id: string) => { success: boolean; message: string };
  stopWork: (id: string) => { success: boolean; message: string };
  startManualTreeCutting: (id: string) => boolean;
  startCuttingTree: (npcId: string, treeId: string) => void;
  isNPCOnCooldown: (id: string) => boolean;
  setNPCCooldown: (id: string, duration: number) => void;
  updateCooldowns: () => void;
}

export const useNPCStore = create<NPCStore>()(
  subscribeWithSelector((set, get) => ({
    npcs: {},
    npcCooldowns: {},

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

      console.log('Atualizando lenhador - estado atual:', npc.state);

      switch (npc.state) {
        case NPCState.IDLE: {
          // Get tree store dynamically to avoid circular imports
          const getTreeStore = () => {
            try {
              // Access the store directly from window if available, or use a simpler approach
              const { useTreeStore } = require('../../stores/useTreeStore');
              return useTreeStore.getState();
            } catch {
              // If require fails, we need an alternative approach
              return null;
            }
          };

          // For now, let's use a simpler approach - access trees through the component
          // We'll modify the GameWorld2D to pass tree data to the lumberjack behavior

          // Find nearest tree within range using mock data for testing
          // This will be replaced with real tree data
          const mockTrees = [
            { id: 'tree1', position: { x: 5, z: 5 }, health: 3, maxHealth: 3 },
            { id: 'tree2', position: { x: 3, z: 7 }, health: 3, maxHealth: 3 },
            { id: 'tree3', position: { x: 8, z: 2 }, health: 3, maxHealth: 3 }
          ];

          let nearestTree = null;
          let nearestDistance = Infinity;

          for (const tree of mockTrees) {
            const distance = Math.abs(tree.position.x - npc.position.x) + 
                           Math.abs(tree.position.z - npc.position.z);

            if (distance <= LUMBERJACK_WORK_RANGE && distance < nearestDistance) {
              nearestTree = tree;
              nearestDistance = distance;
            }
          }

          console.log('Procurando árvore próxima de:', npc.position, 'encontrou:', nearestTree ? nearestTree.id : 'nenhuma');

          if (nearestTree) {
            // Check if adjacent to tree (distance = 1)
            const distance = Math.abs(nearestTree.position.x - npc.position.x) + 
                           Math.abs(nearestTree.position.z - npc.position.z);

            if (distance === 1) {
              // Adjacent to tree - start working
              console.log('Lenhador adjacente à árvore, começando trabalho');
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
              // Move towards tree one step at a time
              console.log('Movendo lenhador em direção à árvore');

              const dx = nearestTree.position.x - npc.position.x;
              const dz = nearestTree.position.z - npc.position.z;

              let direction = { x: 0, z: 0 };

              // Choose direction - prioritize getting closer
              if (Math.abs(dx) > Math.abs(dz)) {
                direction.x = dx > 0 ? 1 : -1;
              } else {
                direction.z = dz > 0 ? 1 : -1;
              }

              const newPosition = {
                x: npc.position.x + direction.x,
                z: npc.position.z + direction.z
              };

              console.log('Nova posição calculada:', newPosition);

              if (isValidGridPosition(newPosition)) {
                set((state) => ({
                  npcs: {
                    ...state.npcs,
                    [npc.id]: {
                      ...state.npcs[npc.id],
                      state: NPCState.MOVING,
                      position: newPosition,
                      isMoving: true,
                      lastMovement: currentTime,
                      targetPosition: nearestTree.position // Set target for pathfinding
                    }
                  }
                }));

                // Stop movement after delay and return to idle to recalculate
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.npcs[npc.id]) {
                    set((state) => ({
                      npcs: {
                        ...state.npcs,
                        [npc.id]: { 
                          ...state.npcs[npc.id], 
                          isMoving: false,
                          state: NPCState.IDLE  // Return to idle to recalculate path
                        }
                      }
                    }));
                  }
                }, MOVEMENT_SPEED);
              } else {
                console.log('Posição inválida para movimento:', newPosition);
                // Try a different direction next time
                set((state) => ({
                  npcs: {
                    ...state.npcs,
                    [npc.id]: {
                      ...state.npcs[npc.id],
                      lastMovement: currentTime
                    }
                  }
                }));
              }
            }
          } else {
            console.log('Nenhuma árvore encontrada no alcance');
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

          console.log('Lenhador trabalhando - progresso:', npc.currentTask.progress, 'de', npc.currentTask.maxProgress);

          // Check if enough time has passed since last chop
          if (currentTime - npc.lastMovement >= LUMBERJACK_CHOP_INTERVAL) {
            const newProgress = npc.currentTask.progress + 1;
            const treeDestroyed = newProgress >= npc.currentTask.maxProgress;

            console.log('TOC! Cortando árvore - progresso:', newProgress, 'destruída:', treeDestroyed);

            // Add chopping animation and update progress
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
                  currentTask: treeDestroyed ? undefined : {
                    type: npc.currentTask.type,
                    targetId: npc.currentTask.targetId,
                    targetPosition: npc.currentTask.targetPosition,
                    progress: newProgress,
                    maxProgress: npc.currentTask.maxProgress
                  },
                  state: treeDestroyed ? NPCState.IDLE : NPCState.WORKING
                }
              }
            }));

            // TODO: Actually damage the tree in the tree store
            // This will be implemented when we integrate with the real tree store
            if (treeDestroyed) {
              console.log('Árvore destruída! Lenhador volta ao modo idle.');
            }
          }
          break;
        }

        case NPCState.MOVING: {
          // Let the normal movement system handle this
          // The lumberjack will return to IDLE after movement completes
          break;
        }
      }
    },

    setNPCState: (id, state, task) => set((storeState) => ({
      npcs: {
        ...storeState.npcs,
        [id]: {
          ...storeState.npcs[id],
          state,
          currentTask: task,
          lastMovement: Date.now()
        }
      }
    })),

    updateNPCTask: (id, task) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: {
          ...state.npcs[id],
          currentTask: task,
          lastMovement: Date.now()
        }
      }
    })),

    setNPCAnimation: (id, animation) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: {
          ...state.npcs[id],
          animation,
          lastMovement: Date.now()
        }
      }
    })),

    // Ações manuais para NPCs controlados
    performWork: (id) => {
      const npc = get().npcs[id];
      if (!npc) {
        return { success: false, message: 'NPC não encontrado!' };
      }

      if (npc.controlMode !== NPCControlMode.CONTROLLED) {
        return { success: false, message: 'NPC não está em modo controlado!' };
      }

      // Verifica cooldown antes de realizar a ação
      if (get().isNPCOnCooldown(id)) {
        return { success: false, message: 'Ação em cooldown!' };
      }

      if (npc.state === NPCState.WORKING) {
        return { success: false, message: 'NPC já está trabalhando!' };
      }

      // Implementar ação específica da profissão usando o sistema existente
      switch (npc.profession) {
        case NPCProfession.LUMBERJACK:
          // Ao iniciar o corte manual, aplicamos um cooldown
          const { adjacentPositions } = get().startManualTreeCutting(id);
          if (adjacentPositions) {
            // Define o cooldown para o lenhador (ex: 1 segundo após tentar cortar)
            get().setNPCCooldown(id, 1000); 
            return { success: true, message: 'Procurando árvores adjacentes para cortar...', adjacentPositions };
          } else {
            return { success: false, message: 'Não foi possível iniciar o corte.' };
          }
        case NPCProfession.FARMER:
          return { success: false, message: 'Sistema de farming ainda não implementado!' };
        case NPCProfession.MINER:
          return { success: false, message: 'Sistema de mineração ainda não implementado!' };
        default:
          return { success: false, message: 'NPC não tem profissão definida!' };
      }
    },

    // Função específica para corte manual de árvores
    startManualTreeCutting: (npcId) => {
      const { npcs } = get();
      const npc = npcs[npcId];

      if (!npc || npc.profession !== NPCProfession.LUMBERJACK) {
        return { success: false, message: 'Apenas lenhadores podem cortar árvores!' };
      }

      // Esta função agora é integrada com o sistema de treeStore via GameWorld2D
      // Retornar as posições adjacentes para validação externa
      const adjacentPositions = [
        { x: npc.position.x + 1, z: npc.position.z },
        { x: npc.position.x - 1, z: npc.position.z },
        { x: npc.position.x, z: npc.position.z + 1 },
        { x: npc.position.x, z: npc.position.z - 1 }
      ];

      console.log('Tentativa de corte manual, posições adjacentes:', adjacentPositions);

      return { 
        success: true, 
        message: 'Procurando árvores adjacentes...', 
        adjacentPositions 
      };
    },

    // Iniciar trabalho de corte com árvore específica
    startCuttingTree: (npcId, treeId) => {
      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            currentTreeId: treeId,
            state: NPCState.WORKING // Ensure state is WORKING
          }
        }
      }));
      console.log('Lenhador começou a cortar árvore:', treeId);
    },

    stopWork: (id) => {
      const npc = get().npcs[id];
      if (!npc) {
        return { success: false, message: 'NPC não encontrado!' };
      }

      const result = NPCActionSystem.stopWork(npc);

      if (result.success && result.updates) {
        set((state) => ({
          npcs: {
            ...state.npcs,
            [id]: { ...state.npcs[id], ...result.updates }
          }
        }));
      }

      return { success: result.success, message: result.message };
    },

    // Atualizar trabalho de NPCs controlados (chamado no loop principal)
    updateControlledNPCWork: () => {
      const npcs = get().npcs;
      const currentTime = Date.now();
      const updates: Record<string, Partial<NPC>> = {};

      Object.values(npcs).forEach((npc) => {
        if (npc.controlMode === NPCControlMode.CONTROLLED && 
            npc.state === NPCState.WORKING && 
            npc.currentTask) {

          // Continuar trabalho baseado na profissão
          switch (npc.profession) {
            case NPCProfession.LUMBERJACK:
              // Verificar se é hora de fazer o próximo corte
              if (currentTime - npc.lastMovement >= LUMBERJACK_CHOP_INTERVAL) {
                const newProgress = npc.currentTask.progress + 1;
                const workCompleted = newProgress >= npc.currentTask.maxProgress;

                console.log('TOC! Cortando árvore manualmente -', 'progresso:', newProgress, 'completo:', workCompleted);

                updates[npc.id] = {
                  animation: {
                    type: 'chopping',
                    startTime: currentTime,
                    duration: CHOPPING_ANIMATION_DURATION
                  },
                  lastMovement: currentTime,
                  currentTask: workCompleted ? undefined : {
                    type: npc.currentTask.type,
                    targetId: npc.currentTask.targetId,
                    targetPosition: npc.currentTask.targetPosition,
                    progress: newProgress,
                    maxProgress: npc.currentTask.maxProgress
                  },
                  state: workCompleted ? NPCState.IDLE : NPCState.WORKING
                };

                // Se o trabalho foi completado, destruir a árvore
                if (workCompleted && npc.currentTask.targetId) {
                  // A árvore será destruída automaticamente pelo sistema existente
                  console.log('Árvore cortada com sucesso pelo NPC controlado!');
                }
              }
              break;
            default:
              return;
          }
        }
      });

      // Aplicar todas as atualizações
      if (Object.keys(updates).length > 0) {
        set((state) => {
          const newNpcs = { ...state.npcs };
          Object.entries(updates).forEach(([id, update]) => {
            newNpcs[id] = { ...newNpcs[id], ...update };
          });
          return { npcs: newNpcs };
        });
      }
    },

    // Funções de cooldown
    isNPCOnCooldown: (id) => {
      const cooldowns = get().npcCooldowns;
      return cooldowns[id] && cooldowns[id] > Date.now();
    },

    setNPCCooldown: (id, duration) => {
      set((state) => ({
        npcCooldowns: {
          ...state.npcCooldowns,
          [id]: Date.now() + duration
        }
      }));
    },

    updateCooldowns: () => {
      const now = Date.now();
      set((state) => {
        const updatedCooldowns = { ...state.npcCooldowns };
        Object.keys(updatedCooldowns).forEach(npcId => {
          if (updatedCooldowns[npcId] <= now) {
            delete updatedCooldowns[npcId];
          }
        });
        return { npcCooldowns: updatedCooldowns };
      });
    }
  }))
);