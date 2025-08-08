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
        inventory: {}
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
      const startingItems = STARTING_INVENTORIES[profession] || {};
      const inventory: Record<string, number> = {};
      
      Object.entries(startingItems).forEach(([itemId, quantity]) => {
        if (GAME_ITEMS[itemId as keyof typeof GAME_ITEMS]) {
          inventory[itemId] = quantity as number;
        }
      });
      
      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory
          }
        }
      }));
      
      console.log('Inventário inicializado para NPC', npcId, 'profissão:', profession, 'itens:', inventory);
    },

    getTotalWeight: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return 0;
      
      let totalWeight = 0;
      Object.entries(npc.inventory).forEach(([itemId, quantity]) => {
        const item = GAME_ITEMS[itemId as keyof typeof GAME_ITEMS];
        if (item && quantity > 0) {
          totalWeight += item.weight * quantity;
        }
      });
      
      return Math.round(totalWeight * 10) / 10; // Arredondar para 1 casa decimal
    },

    getMaxCarryWeight: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return MAX_CARRY_WEIGHT;
      
      let maxWeight = MAX_CARRY_WEIGHT;
      
      // Verificar se tem mochila para aumentar capacidade
      const backpackCount = npc.inventory['BACKPACK'] || 0;
      if (backpackCount > 0) {
        maxWeight += 20; // Mochila adiciona 20kg de capacidade
      }
      
      return maxWeight;
    },

    isOverweight: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return false;
      
      let totalWeight = 0;
      Object.entries(npc.inventory).forEach(([itemId, quantity]) => {
        const item = GAME_ITEMS[itemId as keyof typeof GAME_ITEMS];
        if (item && quantity > 0) {
          totalWeight += item.weight * quantity;
        }
      });
      
      let maxWeight = MAX_CARRY_WEIGHT;
      const backpackCount = npc.inventory['BACKPACK'] || 0;
      if (backpackCount > 0) {
        maxWeight += 20;
      }
      
      return totalWeight > maxWeight;
    },

    canCarryItem: (npcId: string, itemId: string, quantity: number) => {
      const item = GAME_ITEMS[itemId as keyof typeof GAME_ITEMS];
      if (!item) {
        return { canCarry: false, reason: 'Item não encontrado' };
      }
      
      const store = get();
      const currentWeight = store.getTotalWeight(npcId);
      const maxWeight = store.getMaxCarryWeight(npcId);
      const itemWeight = item.weight * quantity;
      
      if (currentWeight + itemWeight > maxWeight) {
        const availableWeight = maxWeight - currentWeight;
        const maxQuantity = Math.floor(availableWeight / item.weight);
        return { 
          canCarry: false, 
          reason: `Muito pesado! Peso atual: ${currentWeight}kg/${maxWeight}kg. Máximo que pode carregar: ${maxQuantity} ${item.name}` 
        };
      }
      
      return { canCarry: true };
    },

    addItemToInventory: (npcId: string, itemId: string, quantity: number) => {
      const npc = get().npcs[npcId];
      if (!npc) {
        return { success: false, reason: 'NPC não encontrado' };
      }
      
      const item = GAME_ITEMS[itemId as keyof typeof GAME_ITEMS];
      if (!item) {
        return { success: false, reason: 'Item não existe' };
      }
      
      if (quantity <= 0) {
        return { success: false, reason: 'Quantidade deve ser positiva' };
      }
      
      // Verificar peso
      const store = get();
      const weightCheck = store.canCarryItem(npcId, itemId, quantity);
      if (!weightCheck.canCarry) {
        return { success: false, reason: weightCheck.reason };
      }
      
      // Verificar limite de stack
      const currentQuantity = npc.inventory?.[itemId] || 0;
      const newQuantity = currentQuantity + quantity;
      
      if (newQuantity > item.maxStack) {
        const canAdd = item.maxStack - currentQuantity;
        return { 
          success: false, 
          reason: `Stack cheio! Máximo: ${item.maxStack}, atual: ${currentQuantity}, pode adicionar: ${canAdd}` 
        };
      }
      
      // Adicionar item
      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory: {
              ...state.npcs[npcId].inventory,
              [itemId]: newQuantity
            }
          }
        }
      }));
      
      console.log('Item adicionado:', quantity, 'x', item.name, 'para NPC', npcId);
      return { success: true };
    },

    removeItemFromInventory: (npcId: string, itemId: string, quantity: number) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return false;
      
      const currentQuantity = npc.inventory[itemId] || 0;
      if (currentQuantity < quantity) return false;
      
      const newQuantity = currentQuantity - quantity;
      
      set((state) => {
        const newInventory = { ...state.npcs[npcId].inventory };
        
        if (newQuantity <= 0) {
          delete newInventory[itemId];
        } else {
          newInventory[itemId] = newQuantity;
        }
        
        return {
          npcs: {
            ...state.npcs,
            [npcId]: {
              ...state.npcs[npcId],
              inventory: newInventory
            }
          }
        };
      });
      
      console.log('Item removido:', quantity, 'x', itemId, 'de NPC', npcId);
      return true;
    },

    getInventoryItem: (npcId: string, itemId: string) => {
      const npc = get().npcs[npcId];
      return npc?.inventory?.[itemId] || 0;
    },

    getInventoryCount: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc?.inventory) return 0;
      
      return Object.keys(npc.inventory).length;
    },


    transferItem: (fromNpcId: string, toNpcId: string, itemId: string, quantity: number) => {
      const fromNpc = get().npcs[fromNpcId];
      const toNpc = get().npcs[toNpcId];
      
      if (!fromNpc || !toNpc) {
        return { success: false, reason: 'NPC não encontrado' };
      }
      
      const currentQuantity = fromNpc.inventory?.[itemId] || 0;
      if (currentQuantity < quantity) {
        return { success: false, reason: 'Quantidade insuficiente no inventário de origem' };
      }
      
      // Verificar se o NPC de destino pode carregar
      const store = get();
      const weightCheck = store.canCarryItem(toNpcId, itemId, quantity);
      if (!weightCheck.canCarry) {
        return { success: false, reason: weightCheck.reason };
      }
      
      // Tentar adicionar ao destino
      const addResult = store.addItemToInventory(toNpcId, itemId, quantity);
      if (!addResult.success) {
        return addResult;
      }
      
      // Remover da origem
      store.removeItemFromInventory(fromNpcId, itemId, quantity);
      
      console.log('Item transferido:', quantity, 'x', itemId, 'de', fromNpcId, 'para', toNpcId);
      return { success: true };
    },

    clearInventory: (npcId: string) => {
      set((state) => ({
        npcs: {
          ...state.npcs,
          [npcId]: {
            ...state.npcs[npcId],
            inventory: {}
          }
        }
      }));
      
      console.log('Inventário limpo para NPC', npcId);
    },

    getInventoryItems: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return [];

      return Object.entries(npc.inventory)
        .filter(([_, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({
          id: itemId,
          quantity,
          item: GAME_ITEMS[itemId as keyof typeof GAME_ITEMS]
        }));
    },

    getTotalWeight: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return 0;

      return Object.entries(npc.inventory)
        .reduce((total, [itemId, quantity]) => {
          const item = GAME_ITEMS[itemId as keyof typeof GAME_ITEMS];
          return total + (item ? item.weight * quantity : 0);
        }, 0);
    },

    getMaxCarryWeight: (npcId: string) => {
      const npc = get().npcs[npcId];
      if (!npc || !npc.inventory) return MAX_CARRY_WEIGHT;

      // Check if NPC has backpack (increases carry weight)
      const hasBackpack = (npc.inventory.BACKPACK || 0) > 0;
      return MAX_CARRY_WEIGHT + (hasBackpack ? 20 : 0);
    },

    canCarryItem: (npcId: string, itemId: string, quantity: number) => {
      const item = GAME_ITEMS[itemId as keyof typeof GAME_ITEMS];
      if (!item) return false;

      const currentWeight = get().getTotalWeight(npcId);
      const maxWeight = get().getMaxCarryWeight(npcId);
      const itemWeight = item.weight * quantity;

      return currentWeight + itemWeight <= maxWeight;
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
                    lastMovement: currentTime
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
          if (currentTime - npc.lastMovement >= MINER_MINE_INTERVAL) {
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
                  lastMovement: currentTime,
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
              console.log('Pedra destruída! Minerador volta ao idle');
              // Adicionar itens de mineração ao inventário
              get().addItemToInventory(npc.id, 'STONE', 3);
              console.log('Item adicionado:', 3, 'x', 'Pedra', 'para NPC', npc.id);
            }
          }
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