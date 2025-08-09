import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NPC, Position, NPCControlMode, NPCProfession, NPCState, NPCAnimation } from '../types';
import { MOVEMENT_SPEED, LUMBERJACK_CHOP_INTERVAL, LUMBERJACK_WORK_RANGE, CHOPPING_ANIMATION_DURATION, GAME_ITEMS, STARTING_INVENTORIES, INVENTORY_MAX_SLOTS, MAX_CARRY_WEIGHT } from '../constants';

// Miner constants
const MINER_WORK_RANGE = 5; // How far miner will search for stones
const MINER_MINE_INTERVAL = 1200; // ms between mining hits
const MINING_ANIMATION_DURATION = 900; // ms
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
  setNPCTarget: (id: string, target: Position) => void;
  setNPCProfession: (id: string, profession: NPCProfession) => void;
  assignNPCToHouse: (npcId: string, houseId: string) => void;
  unassignNPCFromHouse: (npcId: string) => void;
  updateLumberjackBehavior: (npc: any) => void;
  updateMinerBehavior: (npc: any) => void;
  setNPCControlMode: (id: string, mode: NPCControlMode) => void;
  setNPCState: (id: string, state: NPCState, task?: any) => void;
  setNPCAnimation: (id: string, animation: NPCAnimation | undefined) => void;
  updateNPCMovement: () => void;
  updateControlledNPCWork: () => void;
  updateNPCTask: (id: string, task: any) => void;
  performWork: (id: string) => { success: boolean; message: string };
  stopWork: (id: string) => { success: boolean; message: string };
  startManualTreeCutting: (id: string) => { success: boolean; message: string; adjacentPositions?: Position[] };
  startCuttingTree: (npcId: string, treeId: string) => void;
  isNPCOnCooldown: (id: string) => boolean;
  setNPCCooldown: (id: string, duration: number) => void;
  updateCooldowns: () => void;

  // Inventory functions
  addItemToInventory: (npcId: string, itemId: string, quantity: number) => { success: boolean; message?: string };
  removeItemFromInventory: (npcId: string, itemId: string, quantity: number) => boolean;
  getInventoryItem: (npcId: string, itemId: string) => number;
  getInventoryCount: (npcId: string) => number;
  initializeInventory: (npcId: string, profession: NPCProfession) => void;
  transferItem: (fromNpcId: string, toNpcId: string, itemId: string, quantity: number) => { success: boolean; message?: string; };
  clearInventory: (npcId: string) => void;
  getInventoryItems: (npcId: string) => Array<{id: string, quantity: number, item: any}>;
  getTotalWeight: (npcId: string) => number;
  getMaxCarryWeight: (npcId: string) => number;
  canCarryItem: (npcId: string, itemId: string, quantity: number) => boolean;
  startManualStoneMining: (npcId: string) => { success: boolean; message: string; adjacentPositions?: Position[] };
  startMiningStone: (npcId: string, stoneId: string) => void;
  
  // Resource management functions
  addResourceToNPC: (npcId: string, resource: string, amount: number) => boolean;
  removeResourceFromNPC: (npcId: string, resource: string, amount: number) => void;
  shouldReturnHome: (npcId: string) => boolean;
  transferResourcesToHouse: (npcId: string, houseId: string) => boolean;
}

export const useNPCStore = create<NPCStore>()(
  subscribeWithSelector((set, get) => ({
    npcs: {},
    npcCooldowns: {},

    addNPC: (position, profession = NPCProfession.NONE, houseId) => {
      const id = nanoid();
      const npc: NPC = {
        id,
        position,
        controlMode: NPCControlMode.AUTONOMOUS,
        profession,
        state: NPCState.IDLE,
        isMoving: false,
        lastMovement: Date.now(),
        houseId,
        inventory: {
          wood: 0,
          stone: 0,
          food: 0
        },
        maxCarryCapacity: 20, // Default capacity
        currentCarriedWeight: 0
      };

      set((state) => ({
        npcs: { ...state.npcs, [id]: npc }
      }));

      // Initialize inventory based on profession
      get().initializeInventory(id, profession);

      console.log('Novo NPC criado:', id, 'na posição:', position, 'profissão:', profession);
      return id;
    },

    removeNPC: (id) => set((state) => {
      const { [id]: removed, ...rest } = state.npcs;
      return { npcs: rest };
    }),

    selectNPC: (id) => {
      console.log('NPC selecionado:', id);
      // This function can be expanded later for NPC selection behavior
    },

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

    setNPCTarget: (id: string, target: Position) => set((state) => ({
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

    setNPCProfession: (id: string, profession: NPCProfession) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], profession }
      }
    })),

    assignNPCToHouse: (npcId: string, houseId: string) => set((state) => ({
      npcs: {
        ...state.npcs,
        [npcId]: { ...state.npcs[npcId], houseId }
      }
    })),

    unassignNPCFromHouse: (npcId: string) => set((state) => ({
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

    updateLumberjackBehavior: (npc: any) => {
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
                    lastActionTime: currentTime // Use lastActionTime for interval checks
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
          if (currentTime - (npc.lastActionTime || 0) >= LUMBERJACK_CHOP_INTERVAL) {
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
                  lastActionTime: currentTime, // Update lastActionTime for interval checks
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
          const result = get().startManualTreeCutting(id);
          if (result.adjacentPositions) {
            // Define o cooldown para o lenhador (ex: 1 segundo após tentar cortar)
            get().setNPCCooldown(id, 1000); 
            return { success: true, message: 'Procurando árvores adjacentes para cortar...', adjacentPositions: result.adjacentPositions };
          } else {
            return { success: false, message: 'Não foi possível iniciar o corte.' };
          }
        case NPCProfession.FARMER:
          return { success: false, message: 'Sistema de farming ainda não implementado!' };
        case NPCProfession.MINER:
          // Ao iniciar a mineração manual, aplicamos um cooldown
          const minerResult = get().startManualStoneMining(id);
          if (minerResult.adjacentPositions) {
            // Define o cooldown para o minerador (ex: 1.2 segundos após tentar minerar)
            get().setNPCCooldown(id, 1200); 
            return { success: true, message: 'Procurando pedras adjacentes para minerar...', adjacentPositions: minerResult.adjacentPositions };
          } else {
            return { success: false, message: 'Não foi possível iniciar a mineração.' };
          }
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

    // Continuar trabalho de corte de árvore (comportamento controlado)
    continueCuttingTree: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || npc.state !== NPCState.WORKING || !npc.currentTask || npc.currentTask.type !== 'cut_tree') return;

      const currentTime = Date.now();
      const timeSinceLastAction = currentTime - (npc.lastActionTime || 0);

      if (timeSinceLastAction >= LUMBERJACK_CHOP_INTERVAL) {
        const newProgress = npc.currentTask.progress + 1;
        const treeDestroyed = newProgress >= npc.currentTask.maxProgress;

        console.log('TOC! Cortando árvore manualmente - progresso:', newProgress, 'completo:', treeDestroyed);

        set((state) => ({
          npcs: {
            ...state.npcs,
            [npcId]: {
              ...state.npcs[npcId],
              animation: { type: 'chopping', startTime: currentTime, duration: CHOPPING_ANIMATION_DURATION },
              lastActionTime: currentTime,
              currentTask: treeDestroyed ? undefined : {
                ...npc.currentTask,
                progress: newProgress
              },
              state: treeDestroyed ? NPCState.IDLE : NPCState.WORKING
            }
          }
        }));

        if (treeDestroyed && npc.currentTask.targetId) {
          console.log('Árvore cortada com sucesso:', npc.currentTask.targetId);
        }
      }
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
              // Check if it's time to make the next chop
              if (currentTime - (npc.lastActionTime || 0) >= LUMBERJACK_CHOP_INTERVAL) {
                const newProgress = npc.currentTask.progress + 1;
                const workCompleted = newProgress >= npc.currentTask.maxProgress;

                console.log('TOC! Cortando árvore manualmente -', 'progresso:', newProgress, 'completo:', workCompleted);

                updates[npc.id] = {
                  animation: {
                    type: 'chopping',
                    startTime: currentTime,
                    duration: CHOPPING_ANIMATION_DURATION
                  },
                  lastActionTime: currentTime,
                  currentTask: workCompleted ? undefined : {
                    type: npc.currentTask.type,
                    targetId: npc.currentTask.targetId,
                    targetPosition: npc.currentTask.targetPosition,
                    progress: newProgress,
                    maxProgress: npc.currentTask.maxProgress
                  },
                  state: workCompleted ? NPCState.IDLE : NPCState.WORKING
                };

                // If work was completed, destroy the tree
                if (workCompleted && npc.currentTask.targetId) {
                  // The tree will be destroyed automatically by the existing system
                  console.log('Árvore cortada com sucesso pelo NPC controlado!');
                }
              }
              break;
            default:
              return;
          }
        }
      });

      // Apply all updates
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
    isNPCOnCooldown: (id: string) => {
      const cooldowns = get().npcCooldowns;
      return !!(cooldowns[id] && cooldowns[id] > Date.now());
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
    },

    // ===== INVENTORY SYSTEM =====

    initializeInventory: (npcId: string, profession: NPCProfession) => {
      // Simple resource-based starting inventory
      let startingInventory = { wood: 0, stone: 0, food: 0 };

      switch (profession) {
        case NPCProfession.LUMBERJACK:
          startingInventory = { wood: 5, stone: 0, food: 2 };
          break;
        case NPCProfession.MINER:
          startingInventory = { wood: 0, stone: 3, food: 2 };
          break;
        case NPCProfession.FARMER:
          startingInventory = { wood: 1, stone: 1, food: 5 };
          break;
      }

      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory: startingInventory,
            currentCarriedWeight: startingInventory.wood + (startingInventory.stone * 2) + (startingInventory.food * 0.5)
          }
        }
      }));

      console.log('Inventário inicializado para NPC', npcId, 'profissão:', profession, 'itens:', startingInventory);
    },

    // Simple resource management for NPCs
    addResourceToNPC: (npcId: string, resource: keyof ResourceInventory, amount: number) => {
      const npc = get().npcs[npcId];
      if (!npc) {
        console.log('NPC não encontrado:', npcId);
        return false;
      }

      const currentWeight = npc.currentCarriedWeight || 0;
      const resourceWeight = amount * (resource === 'wood' ? 1 : resource === 'stone' ? 2 : 0.5);

      if (currentWeight + resourceWeight > npc.maxCarryCapacity) {
        console.log('Capacidade excedida para NPC', npcId, 'peso atual:', currentWeight, 'peso adicional:', resourceWeight, 'capacidade:', npc.maxCarryCapacity);
        return false; // Capacity exceeded
      }

      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory: {
              ...state.npcs[npcId].inventory,
              [resource]: state.npcs[npcId].inventory[resource] + amount
            },
            currentCarriedWeight: currentWeight + resourceWeight
          }
        }
      }));

      console.log('Adicionado', amount, resource, 'ao inventário do NPC', npcId);
      return true;
    },

    removeResourceFromNPC: (npcId: string, resource: keyof ResourceInventory, amount: number) => {
      const npc = get().npcs[npcId];
      if (!npc || npc.inventory[resource] < amount) return false;

      const resourceWeight = amount * (resource === 'wood' ? 1 : resource === 'stone' ? 2 : 0.5);

      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory: {
              ...state.npcs[npcId].inventory,
              [resource]: Math.max(0, state.npcs[npcId].inventory[resource] - amount)
            },
            currentCarriedWeight: Math.max(0, state.npcs[npcId].currentCarriedWeight - resourceWeight)
          }
        }
      }));
      return true;
    },

    // Transfer resources from NPC to house storage
    transferResourcesToHouse: (npcId: string, houseId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.houseId || npc.houseId !== houseId) return false;

      // Import house store dynamically
      import('./useHouseStore').then(({ useHouseStore }) => {
        const houseStore = useHouseStore.getState();
        let totalTransferred = 0;

        // Transfer each resource type
        Object.entries(npc.inventory).forEach(([resource, amount]) => {
          if (amount > 0) {
            const success = houseStore.addResourceToHouse(houseId, resource as keyof ResourceInventory, amount);
            if (success) {
              get().removeResourceFromNPC(npcId, resource as keyof ResourceInventory, amount);
              totalTransferred += amount;
              console.log(`Transferido ${amount} ${resource} de NPC ${npcId} para casa ${houseId}`);
            }
          }
        });

        if (totalTransferred > 0) {
          console.log(`Total de ${totalTransferred} recursos transferidos para a casa`);
        }

        // Set NPC state back to IDLE after storing resources
        get().setNPCState(npcId, NPCState.IDLE);
      });

      return true;
    },

    // Check if NPC should return home (when carrying capacity is reached)
    shouldReturnHome: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc) return false;

      // Verificar tanto peso quanto quantidade de slots
      const totalWeight = npc.currentCarriedWeight >= npc.maxCarryCapacity * 0.8;
      const totalItems = Object.values(npc.inventory).reduce((sum, count) => sum + count, 0) >= 15; // Máximo 15 itens

      return totalWeight || totalItems;
    },

    // Verificar se é hora de trabalhar (6h às 18h horário do jogo)
    isWorkTime: (npcId: string) => {
      const { useTimeStore } = require('../stores/useTimeStore');
      const currentHour = useTimeStore.getState().getCurrentGameHour();
      return currentHour >= 6 && currentHour < 18;
    },

    // Verificar se NPC deve descansar
    shouldRest: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc) return false;

      // NPCs devem descansar à noite (18h às 6h horário do jogo)
      const { useTimeStore } = require('../stores/useTimeStore');
      const currentHour = useTimeStore.getState().getCurrentGameHour();
      return currentHour >= 18 || currentHour < 6;
    },

    addItemToInventory: (npcId: string, itemId: string, quantity: number) => {
      // Simplified version for compatibility
      console.log('Legacy addItemToInventory called, use addResourceToNPC instead');
      return { success: false, message: 'Use specific resource functions' };
    },

    removeItemFromInventory: (npcId: string, itemId: string, quantity: number) => {
      console.log('Legacy removeItemFromInventory called, use removeResourceFromNPC instead');
      return false;
    },

    getInventoryItem: (npcId: string, itemId: string) => {
      const npc = get().npcs[npcId];
      if (!npc) return 0;

      // Map old item IDs to new resource system
      if (itemId === 'wood' || itemId === 'WOOD') return npc.inventory.wood;
      if (itemId === 'stone' || itemId === 'STONE') return npc.inventory.stone;
      if (itemId === 'food' || itemId === 'FOOD') return npc.inventory.food;

      return 0;
    },

    getInventoryCount: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc) return 0;

      return npc.inventory.wood + npc.inventory.stone + npc.inventory.food;
    },

    transferItem: (fromNpcId: string, toNpcId: string, itemId: string, quantity: number) => {
      console.log('Legacy transferItem called');
      return { success: false, message: 'Use resource transfer functions' };
    },

    clearInventory: (npcId: string) => {
      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory: { wood: 0, stone: 0, food: 0 },
            currentCarriedWeight: 0
          }
        }
      }));
    },

    getInventoryItems: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc) return [];

      const items = [];
      if (npc.inventory.wood > 0) items.push({ id: 'wood', quantity: npc.inventory.wood, name: 'Madeira' });
      if (npc.inventory.stone > 0) items.push({ id: 'stone', quantity: npc.inventory.stone, name: 'Pedra' });
      if (npc.inventory.food > 0) items.push({ id: 'food', quantity: npc.inventory.food, name: 'Comida' });

      return items;
    },

    getTotalWeight: (npcId: string) => {
      const npc = get().npcs[npcId];
      return npc?.currentCarriedWeight || 0;
    },

    getMaxCarryWeight: (npcId: string) => {
      const npc = get().npcs[npcId];
      return npc?.maxCarryCapacity || 20;
    },

    canCarryItem: (npcId: string, itemId: string, quantity: number) => {
      const npc = get().npcs[npcId];
      if (!npc) return false;

      const weight = quantity * (itemId === 'wood' ? 1 : itemId === 'stone' ? 2 : 0.5);
      return npc.currentCarriedWeight + weight <= npc.maxCarryCapacity;
    },

    // Função específica para mineração manual de pedras
    startManualStoneMining: (npcId) => {
      const { npcs } = get();
      const npc = npcs[npcId];

      if (!npc || npc.profession !== NPCProfession.MINER) {
        return { success: false, message: 'Apenas mineradores podem minerar pedras!' };
      }

      // Esta função agora é integrada com o sistema de stoneStore via GameWorld2D
      // Retornar as posições adjacentes para validação externa
      const adjacentPositions = [
        { x: npc.position.x + 1, z: npc.position.z },
        { x: npc.position.x - 1, z: npc.position.z },
        { x: npc.position.x, z: npc.position.z + 1 },
        { x: npc.position.x, z: npc.position.z - 1 }
      ];

      console.log('Tentativa de mineração manual, posições adjacentes:', adjacentPositions);

      return { 
        success: true, 
        message: 'Procurando pedras adjacentes...', 
        adjacentPositions 
      };
    },

    // Iniciar trabalho de mineração com pedra específica
    startMiningStone: (npcId, stoneId) => {
      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            currentStoneId: stoneId,
            state: NPCState.WORKING // Ensure state is WORKING
          }
        }
      }));
      console.log('Minerador começou a minerar pedra:', stoneId);
    },

    updateMinerBehavior: (npc: any) => {
      if (npc.profession !== NPCProfession.MINER || npc.controlMode !== NPCControlMode.AUTONOMOUS) {
        return;
      }

      const currentTime = Date.now();

      console.log('Atualizando comportamento do minerador:', npc.id, 'estado:', npc.state);
      console.log('Minerador', npc.id, 'estado:', npc.state, 'posição:', npc.position);

      switch (npc.state) {
        case NPCState.IDLE: {
          // Encontrar pedra mais próxima usando dados mock para teste
          // Isto será substituído por dados reais de pedra
          const mockStones = [
            { id: 'stone1', position: { x: 5, z: 5 }, health: 5, maxHealth: 5 },
            { id: 'stone2', position: { x: 3, z: 7 }, health: 5, maxHealth: 5 },
            { id: 'stone3', position: { x: 8, z: 2 }, health: 5, maxHealth: 5 }
          ];

          let nearestStone = null;
          let nearestDistance = Infinity;

          for (const stone of mockStones) {
            const distance = Math.abs(stone.position.x - npc.position.x) + 
                           Math.abs(stone.position.z - npc.position.z);

            if (distance <= MINER_WORK_RANGE && distance < nearestDistance) {
              nearestStone = stone;
              nearestDistance = distance;
            }
          }

          console.log('Pedras disponíveis:', mockStones.length, 'mais próxima:', nearestStone ? nearestStone.id : null, 'distância:', nearestDistance === Infinity ? null : nearestDistance);

          if (nearestStone) {
            // Check if adjacent to stone (distance = 1)
            const distance = Math.abs(nearestStone.position.x - npc.position.x) + 
                           Math.abs(nearestStone.position.z - npc.position.z);

            if (distance === 1) {
              // Adjacent to stone - start working
              console.log('Minerador adjacente à pedra', nearestStone.id, 'começando trabalho');
              set((state) => ({
                npcs: {
                  ...state.npcs,
                  [npc.id]: {
                    ...state.npcs[npc.id],
                    state: NPCState.WORKING,
                    currentTask: {
                      type: 'mine_stone',
                      targetId: nearestStone.id,
                      targetPosition: nearestStone.position,
                      progress: 0,
                      maxProgress: nearestStone.health
                    },
                    lastActionTime: currentTime // Use lastActionTime for interval checks
                  }
                }
              }));
            } else {
              // Move towards stone one step at a time
              console.log('Movendo minerador em direção à pedra', nearestStone.id);

              const dx = nearestStone.position.x - npc.position.x;
              const dz = nearestStone.position.z - npc.position.z;

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
                      targetPosition: nearestStone.position
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
                          state: NPCState.IDLE
                        }
                      }
                    }));
                  }
                }, MOVEMENT_SPEED);
              } else {
                console.log('Posição inválida para movimento:', newPosition);
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
            console.log('Nenhuma pedra encontrada no alcance');
          }
          break;
        }

        case NPCState.WORKING: {
          if (!npc.currentTask || npc.currentTask.type !== 'mine_stone') {
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

          console.log('Minerador trabalhando - progresso:', npc.currentTask.progress, 'de', npc.currentTask.maxProgress);

          // Check if enough time has passed since last mine
          if (currentTime - (npc.lastActionTime || 0) >= MINER_MINE_INTERVAL) {
            const newProgress = npc.currentTask.progress + 1;
            const stoneDestroyed = newProgress >= npc.currentTask.maxProgress;

            console.log('CLANG! Minerando pedra', npc.currentTask.targetId, '- progresso:', newProgress, 'destruída:', stoneDestroyed);

            // Add mining animation and update progress
            set((state) => ({
              npcs: {
                ...state.npcs,
                [npc.id]: {
                  ...state.npcs[npc.id],
                  animation: {
                    type: 'mining',
                    startTime: currentTime,
                    duration: MINING_ANIMATION_DURATION
                  },
                  lastActionTime: currentTime, // Update lastActionTime for interval checks
                  currentTask: stoneDestroyed ? undefined : {
                    type: npc.currentTask.type,
                    targetId: npc.currentTask.targetId,
                    targetPosition: npc.currentTask.targetPosition,
                    progress: newProgress,
                    maxProgress: npc.currentTask.maxProgress
                  },
                  state: stoneDestroyed ? NPCState.IDLE : NPCState.WORKING
                }
              }
            }));

            if (stoneDestroyed) {
              console.log('Pedra destruída! Minerador coletou recursos');
              // Adicionar pedra ao inventário do NPC
              const stoneAdded = get().addResourceToNPC(npc.id, 'stone', 2);
              if (stoneAdded) {
                console.log('2 pedras adicionadas ao inventário do minerador', npc.id);

                // Check if NPC should return home
                if (get().shouldReturnHome(npc.id)) {
                  console.log('Minerador deve voltar para casa - capacidade quase cheia');
                  set((state) => ({
                    npcs: {
                      ...state.npcs,
                      [npc.id]: {
                        ...state.npcs[npc.id],
                        state: NPCState.RETURNING_HOME
                      }
                    }
                  }));
                }
              } else {
                console.log('Minerador não conseguiu carregar mais pedras - voltando para casa');
                set((state) => ({
                  npcs: {
                    ...state.npcs,
                    [npc.id]: {
                      ...state.npcs[npc.id],
                      state: NPCState.RETURNING_HOME
                    }
                  }
                }));
              }
            }
          }
          break;
        }

        case NPCState.RETURNING_HOME: {
          if (!npc.houseId) {
            console.log('Minerador sem casa atribuída - voltando ao estado IDLE');
            set((state) => ({
              npcs: {
                ...state.npcs,
                [npc.id]: {
                  ...state.npcs[npc.id],
                  state: NPCState.IDLE
                }
              }
            }));
            return;
          }

          // Import house store to find house position
          import('./useHouseStore').then(({ useHouseStore }) => {
            const house = useHouseStore.getState().houses[npc.houseId!];
            if (!house) return;

            const distanceToHome = Math.abs(house.position.x - npc.position.x) + 
                                 Math.abs(house.position.z - npc.position.z);

            if (distanceToHome === 0) {
              // At home - transfer resources
              console.log('Minerador chegou em casa - transferindo recursos');
              get().transferResourcesToHouse(npc.id, npc.houseId!);
            } else {
              // Move towards home one step at a time
              const dx = house.position.x - npc.position.x;
              const dz = house.position.z - npc.position.z;

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

                setTimeout(() => {
                  const currentState = get();
                  if (currentState.npcs[npc.id]) {
                    const distanceAfterMove = Math.abs(house.position.x - newPosition.x) + 
                                            Math.abs(house.position.z - newPosition.z);

                    if (distanceAfterMove === 0) {
                      // Reached home - transfer resources
                      currentState.transferResourcesToHouse(npc.id, npc.houseId!);
                    } else {
                      // Continue moving towards home
                      set((state) => ({
                        npcs: {
                          ...state.npcs,
                          [npc.id]: { 
                            ...state.npcs[npc.id], 
                            isMoving: false,
                            state: NPCState.RETURNING_HOME
                          }
                        }
                      }));
                    }
                  }
                }, MOVEMENT_SPEED);
              }
            }
          });
          break;
        }

        case NPCState.MOVING: {
          // Let the normal movement system handle this
          // The miner will return to IDLE after movement completes
          break;
        }
      }
    }
  }))
);