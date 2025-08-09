import { useRef, useEffect, useCallback } from 'react';
import { useKeyboardActions } from '../../hooks/useKeyboardActions';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useTreeStore } from '../../lib/stores/useTreeStore';
import { useStoneStore } from '../../lib/stores/useStoneStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useEffectsStore } from '../../lib/stores/useEffectsStore';
import { useVillageStore } from '../../lib/stores/useVillageStore';
import { useTimeStore } from '../../lib/stores/useTimeStore';
import { GRID_SIZE, CELL_SIZE, HOUSE_COLORS, HouseType, TREE_COLOR, LUMBERJACK_WORK_RANGE, LUMBERJACK_CHOP_INTERVAL, CHOPPING_ANIMATION_DURATION, CONTROLLED_CHOP_COOLDOWN } from '../../lib/constants';
import { NPCControlMode, NPCProfession, NPCState } from '../../lib/types';
import { isValidGridPosition } from '../../lib/utils/grid';

export default function GameWorld2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const zoomRef = useRef(1.5);
  const panRef = useRef({ x: 0, y: 0 });
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const spritesLoadedRef = useRef(false);

  const cameraTargetRef = useRef<{ x: number, y: number } | null>(null);

  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const trees = useTreeStore(state => state.trees);
  const stones = useStoneStore(state => state.stones);
  const textEffects = useEffectsStore(state => state.effects);
  const villages = useVillageStore(state => state.villages);
  const roads = useVillageStore(state => state.roads);
  const { moveNPC, updateNPCMovement, updateControlledNPCWork, addNPC, startManualTreeCutting, startCuttingTree, setNPCState, addItemToInventory } = useNPCStore();
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse, selectedNPC, setCameraMode, currentRotation, rotateCurrentPlacement } = useGameStore();
  const { addHouse, getHouseAt, rotateHouse } = useHouseStore();
  const { generateRandomTrees, getTreeAt, updateTree, removeTree } = useTreeStore();
  const { generateRandomStones, getStoneAt, updateStone, damageStone, removeStone } = useStoneStore();
  const { updateEffects, addTextEffect } = useEffectsStore();
  const { createVillage, getRoadAt } = useVillageStore();
  const { getSkyColor, getAmbientLight, getCurrentGameHour } = useTimeStore();

  // Adicionar hooks de teclado para ações
  useKeyboardActions();

  // Função para encontrar árvore prioritária para um NPC
  const getPriorityTreeForNPC = useCallback((npc: any) => {
    const adjacentPositions = [
      { x: npc.position.x + 1, z: npc.position.z },
      { x: npc.position.x - 1, z: npc.position.z },
      { x: npc.position.x, z: npc.position.z + 1 },
      { x: npc.position.x, z: npc.position.z - 1 }
    ];

    // Buscar todas as árvores válidas adjacentes
    const availableTrees = [];
    for (const pos of adjacentPositions) {
      const tree = Object.values(trees).find(t => 
        t.position.x === pos.x && 
        t.position.z === pos.z && 
        !t.isFalling && 
        t.health > 0
      );
      if (tree) {
        availableTrees.push(tree);
      }
    }

    if (availableTrees.length === 0) return null;

    // Priorizar por: 1) Menor vida, 2) Mais próximo do centro (0,0), 3) Posição x menor
    return availableTrees.sort((a, b) => {
      // Prioridade 1: Menor vida (árvores mais danificadas primeiro)
      if (a.health !== b.health) {
        return a.health - b.health;
      }

      // Prioridade 2: Mais próximo do centro
      const distanceA = Math.abs(a.position.x) + Math.abs(a.position.z);
      const distanceB = Math.abs(b.position.x) + Math.abs(b.position.z);
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

      // Prioridade 3: Posição X menor (mais à esquerda)
      return a.position.x - b.position.x;
    })[0];
  }, [trees]);

  // Função para encontrar pedra prioritária para um NPC minerador
  const getPriorityStoneForNPC = useCallback((npc: any) => {
    const adjacentPositions = [
      { x: npc.position.x + 1, z: npc.position.z },
      { x: npc.position.x - 1, z: npc.position.z },
      { x: npc.position.x, z: npc.position.z + 1 },
      { x: npc.position.x, z: npc.position.z - 1 }
    ];

    const availableStones = [];
    for (const pos of adjacentPositions) {
      const stone = Object.values(stones).find(s => 
        s.position.x === pos.x && 
        s.position.z === pos.z && 
        !s.isBreaking && 
        s.health > 0
      );
      if (stone) {
        availableStones.push(stone);
      }
    }

    if (availableStones.length === 0) return null;

    // Priorizar por: 1) Menor vida, 2) Mais próximo do centro (0,0), 3) Posição x menor
    return availableStones.sort((a, b) => {
      if (a.health !== b.health) {
        return a.health - b.health;
      }
      const distanceA = Math.abs(a.position.x) + Math.abs(a.position.z);
      const distanceB = Math.abs(b.position.x) + Math.abs(b.position.z);
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }
      return a.position.x - b.position.x;
    })[0];
  }, [stones]);

  // Hook personalizado para processar ações de trabalho manual
  useEffect(() => {
    const handleManualWork = (event: CustomEvent) => {
      const { npcId } = event.detail;

      if (!npcId || !npcs[npcId]) return;

      const npc = npcs[npcId];

      // Handle manual tree cutting
      if (npc.profession === NPCProfession.LUMBERJACK) {
        // Verificar cooldown
        if (useNPCStore.getState().isNPCOnCooldown(npcId)) {
          console.log('NPC em cooldown, aguarde para próximo golpe');
          addTextEffect(npc.position, 'Aguarde!', '#FFB347', 600);
          return;
        }

        // Se já está cortando uma árvore, processar um golpe manual
        if (npc.currentTreeId && npc.state === NPCState.WORKING) {
          const targetTree = trees[npc.currentTreeId];
          if (targetTree && !targetTree.isFalling && targetTree.health > 0) {
            console.log('Continuando corte manual da árvore:', npc.currentTreeId);

            // Reduzir vida da árvore
            const newHealth = Math.max(0, targetTree.health - 1);
            updateTree(npc.currentTreeId, { health: newHealth });

            // Adicionar efeito visual
            addTextEffect(targetTree.position, 'TOC!', '#FFA500', 800);

            // Aplicar cooldown
            useNPCStore.getState().setNPCCooldown(npcId, CONTROLLED_CHOP_COOLDOWN);

            const progress = targetTree.maxHealth - newHealth;
            const completed = newHealth <= 0;

            console.log('TOC! Cortando árvore manualmente - progresso:', progress, 'completo:', completed);

            if (completed) {
              // Árvore cortada com sucesso - adicionar madeira ao inventário
              console.log('Árvore cortada com sucesso pelo NPC controlado!');
              const { addResourceToNPC, shouldReturnHome } = useNPCStore.getState();
              const woodAdded = addResourceToNPC(npc.id, 'wood', 2);

              if (woodAdded) {
                addTextEffect(targetTree.position, '+2 Madeira', '#8B4513', 1200);
                if (shouldReturnHome(npc.id)) {
                  console.log('Lenhador deve voltar para casa - capacidade quase cheia');
                  setNPCState(npc.id, NPCState.RETURNING_HOME);
                } else {
                  setNPCState(npc.id, NPCState.IDLE);
                }
              } else {
                addTextEffect(targetTree.position, 'Inventário cheio! Voltando para casa', '#FF0000', 1200);
                setNPCState(npc.id, NPCState.RETURNING_HOME);
              }
              removeTree(npc.currentTreeId);
            } else {
              useNPCStore.getState().updateNPCTask(npc.id, { ...npc.currentTask, progress: newHealth });
            }
            return;
          }
        }

        // Buscar árvore prioritária adjacente para começar novo corte
        const priorityTree = getPriorityTreeForNPC(npc);

        if (priorityTree) {
          console.log('Árvore encontrada para corte manual:', priorityTree.id);
          // Iniciar corte manual
          setNPCState(npc.id, NPCState.WORKING, { 
            type: 'cut_tree',
            targetId: priorityTree.id, 
            targetPosition: priorityTree.position,
            progress: 0,
            maxProgress: priorityTree.health
          });

          // Processar primeiro golpe
          const newHealth = Math.max(0, priorityTree.health - 1);
          updateTree(priorityTree.id, { health: newHealth });

          // Adicionar efeito visual
          addTextEffect(priorityTree.position, 'TOC!', '#FFA500', 800);

          // Aplicar cooldown
          useNPCStore.getState().setNPCCooldown(npcId, CONTROLLED_CHOP_COOLDOWN);

          console.log('TOC! Cortando árvore manualmente - progresso:', 1, 'completo:', newHealth <= 0);

          if (newHealth <= 0) {
            console.log('Árvore cortada com sucesso pelo NPC controlado!');
            // Adicionar madeira ao inventário
            const { addResourceToNPC, shouldReturnHome } = useNPCStore.getState();
            const woodAdded = addResourceToNPC(npc.id, 'wood', 2);
            if (woodAdded) {
              addTextEffect(priorityTree.position, '+2 Madeira', '#8B4513', 1200);
              if (shouldReturnHome(npc.id)) {
                console.log('Lenhador deve voltar para casa - capacidade quase cheia');
                setNPCState(npc.id, NPCState.RETURNING_HOME);
              } else {
                setNPCState(npc.id, NPCState.IDLE);
              }
            } else {
              addTextEffect(priorityTree.position, 'Inventário cheio! Voltando para casa', '#FF0000', 1200);
              setNPCState(npc.id, NPCState.RETURNING_HOME);
            }

            removeTree(priorityTree.id);
          }
        } else {
          console.log('Nenhuma árvore adjacente encontrada');
        }
      }
      // Handle manual stone mining
      else if (npc.profession === NPCProfession.MINER) {
        // Verificar cooldown
        if (useNPCStore.getState().isNPCOnCooldown(npcId)) {
          console.log('NPC em cooldown, aguarde para próxima mineração');
          addTextEffect(npc.position, 'Aguarde!', '#FFB347', 600);
          return;
        }

        // If already mining a stone, process a manual mine
        if (npc.currentStoneId && npc.state === NPCState.WORKING) {
          const targetStone = stones[npc.currentStoneId];
          if (targetStone && !targetStone.isBreaking && targetStone.health > 0) {
            console.log('Continuando mineração manual da pedra:', npc.currentStoneId);

            // Reduzir vida da pedra
            const newHealth = Math.max(0, targetStone.health - 1);
            updateStone(npc.currentStoneId, { health: newHealth });

            // Adicionar efeito visual
            addTextEffect(targetStone.position, 'CLANG!', '#A0522D', 800);

            // Aplicar cooldown
            useNPCStore.getState().setNPCCooldown(npcId, CONTROLLED_CHOP_COOLDOWN); // Reusing chop cooldown for now

            const progress = targetStone.maxHealth - newHealth;
            const completed = newHealth <= 0;

            console.log('CLANG! Minerando pedra manualmente - progresso:', progress, 'completo:', completed);

            if (completed) {
              // Pedra destruída com sucesso - adicionar recurso ao inventário
              console.log('Pedra destruída com sucesso pelo NPC controlado!');
              const { addResourceToNPC, shouldReturnHome } = useNPCStore.getState();
              const stoneAdded = addResourceToNPC(npc.id, 'stone', 2);
              if (stoneAdded) {
                addTextEffect(targetStone.position, '+2 Pedra', '#808080', 1200);
                if (shouldReturnHome(npc.id)) {
                  console.log('Minerador deve voltar para casa - capacidade quase cheia');
                  setNPCState(npc.id, NPCState.RETURNING_HOME);
                } else {
                  setNPCState(npc.id, NPCState.IDLE);
                }
              } else {
                addTextEffect(targetStone.position, 'Inventário cheio! Voltando para casa', '#FF0000', 1200);
                setNPCState(npc.id, NPCState.RETURNING_HOME);
              }

              removeStone(npc.currentStoneId);
            } else {
              useNPCStore.getState().updateNPCTask(npc.id, { ...npc.currentTask, progress: newHealth });
            }
            return;
          }
        }

        // Buscar pedra prioritária adjacente para começar nova mineração
        const priorityStone = getPriorityStoneForNPC(npc);

        if (priorityStone) {
          console.log('Pedra encontrada para mineração manual:', priorityStone.id);
          // Iniciar mineração manual
          setNPCState(npc.id, NPCState.WORKING, { 
            type: 'mine_stone',
            targetId: priorityStone.id, 
            targetPosition: priorityStone.position,
            progress: 0,
            maxProgress: priorityStone.health
          });

          // Processar primeiro golpe
          const newHealth = Math.max(0, priorityStone.health - 1);
          updateStone(priorityStone.id, { health: newHealth });

          // Adicionar efeito visual
          addTextEffect(priorityStone.position, 'CLANG!', '#A0522D', 800);

          // Aplicar cooldown
          useNPCStore.getState().setNPCCooldown(npcId, CONTROLLED_CHOP_COOLDOWN);

          console.log('CLANG! Minerando pedra manualmente - progresso:', 1, 'completo:', newHealth <= 0);

          if (newHealth <= 0) {
            console.log('Pedra destruída com sucesso pelo NPC controlado!');
            // Adicionar recurso ao inventário
            const { addResourceToNPC, shouldReturnHome } = useNPCStore.getState();
            const stoneAdded = addResourceToNPC(npc.id, 'stone', 2);
            if (stoneAdded) {
              addTextEffect(priorityStone.position, '+2 Pedra', '#808080', 1200);
              if (shouldReturnHome(npc.id)) {
                console.log('Minerador deve voltar para casa - capacidade quase cheia');
                setNPCState(npc.id, NPCState.RETURNING_HOME);
              } else {
                setNPCState(npc.id, NPCState.IDLE);
              }
            } else {
              addTextEffect(priorityStone.position, 'Inventário cheio! Voltando para casa', '#FF0000', 1200);
              setNPCState(npc.id, NPCState.RETURNING_HOME);
            }

            removeStone(priorityStone.id);
          }
        } else {
          console.log('Nenhuma pedra adjacente encontrada');
        }
      }
    };

    window.addEventListener('manualWork', handleManualWork as EventListener);
    return () => window.removeEventListener('manualWork', handleManualWork as EventListener);
  }, [npcs, trees, stones, updateTree, updateStone, setNPCState, addTextEffect, getPriorityTreeForNPC, getPriorityStoneForNPC]);

  // Carregar sprites das casas, texturas e ruas
  useEffect(() => {
    const loadSprites = async () => {
      const sprites: Record<string, HTMLImageElement> = {};

      const spriteMap = {
        [HouseType.FARMER]: '/sprites/houses/farmer_house.png',
        [HouseType.LUMBERJACK]: '/sprites/houses/lumberjack_house.png',
        [HouseType.MINER]: '/sprites/houses/medium_house.png', // Usar medium_house como placeholder para miner
        'road_horizontal': '/sprites/roads/road_horizontal.png',
        'road_vertical': '/sprites/roads/road_vertical.png',
        'road_cross': '/sprites/roads/road_cross.png',
        'npc_frame_W': '/attached_assets/frame_W_1754723339782.png',
        'npc_frame_A': '/attached_assets/frame_A_1754723339781.png',
        'npc_frame_S': '/attached_assets/frame_S_1754723339782.png',
        'npc_frame_D': '/attached_assets/frame_D_1754723339781.png'
      };

      const loadPromises = Object.entries(spriteMap).map(([type, path]) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            sprites[type] = img;
            console.log(`Sprite ${type} carregada com sucesso!`);
            resolve();
          };
          img.onerror = () => {
            console.error(`Erro ao carregar sprite: ${path}`);

            // Para sprites de rua, tentar carregar de attached_assets
            if (type.includes('road')) {
              const fallbackImg = new Image();
              fallbackImg.onload = () => {
                sprites[type] = fallbackImg;
                console.log(`Sprite ${type} carregada do fallback!`);
                resolve();
              };
              fallbackImg.onerror = () => {
                console.warn(`Fallback também falhou para ${type}`);
                resolve();
              };

              // Mapear para os arquivos que você enviou
              const fallbackPaths: Record<string, string> = {
                'road_horizontal': '/attached_assets/road(1)_1754722484766.png',
                'road_vertical': '/attached_assets/road(2)_1754722519931.png', 
                'road_cross': '/attached_assets/road(3)_1754722519932.png'
              };

              fallbackImg.src = fallbackPaths[type] || path;
            } else {
              resolve();
            }
          };
          img.src = path;
        });
      });

      // Carregar textura de grama
      const grassPromise = new Promise<void>((resolve) => {
        const grassImg = new Image();
        grassImg.onload = () => {
          // Armazenar a imagem diretamente para renderização individual por tile
          spritesRef.current['grass'] = grassImg;
          console.log('Sprite de grama carregada com sucesso!', grassImg.width, 'x', grassImg.height);
          resolve();
        };
        grassImg.onerror = () => {
          console.warn('Falha ao carregar textura de grama');
          resolve();
        };
        grassImg.src = '/textures/grass.png';
      });

      await Promise.all([...loadPromises, grassPromise]);
      spritesRef.current = sprites;
      spritesLoadedRef.current = true;
      console.log('Sprites carregadas:', Object.keys(sprites));
    };

    loadSprites();
  }, []);

  // Sistema de geração procedural por chunks baseado na posição da câmera
  const CHUNK_SIZE = 50; // Tamanho do chunk em tiles
  const RENDER_DISTANCE = 3; // Quantos chunks ao redor renderizar
  const generatedChunksRef = useRef<Set<string>>(new Set());

  // Função para calcular qual chunk uma posição pertence
  const getChunkKey = useCallback((x: number, z: number) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    return `${chunkX},${chunkZ}`;
  }, []);

  // Função para gerar recursos em um chunk se ainda não foi gerado
  const generateChunkIfNeeded = useCallback((chunkX: number, chunkZ: number) => {
    const chunkKey = `${chunkX},${chunkZ}`;

    if (!generatedChunksRef.current.has(chunkKey)) {
      // Gerar árvores e pedras neste chunk
      useTreeStore.getState().generateTreesInChunk(chunkX, chunkZ, CHUNK_SIZE);
      useStoneStore.getState().generateStonesInChunk(chunkX, chunkZ, CHUNK_SIZE);
      generatedChunksRef.current.add(chunkKey);
      console.log(`Chunk gerado: ${chunkKey}`);
    }
  }, []);

  // Gerar chunks baseado na posição da câmera
  useEffect(() => {
    // Calcular posição central da câmera no grid
    const cameraCenterX = Math.floor(-panRef.current.x / (CELL_SIZE * zoomRef.current));
    const cameraCenterZ = Math.floor(-panRef.current.y / (CELL_SIZE * zoomRef.current));

    // Determinar quais chunks devem estar carregados
    const centerChunkX = Math.floor(cameraCenterX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(cameraCenterZ / CHUNK_SIZE);

    // Gerar chunks em um raio ao redor da câmera
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        generateChunkIfNeeded(chunkX, chunkZ);
      }
    }
  }, [panRef.current.x, panRef.current.y, zoomRef.current, generateChunkIfNeeded]);

  // Gerar chunk inicial ao redor do spawn (0,0) e criar mapa procedural
  useEffect(() => {
    generateChunkIfNeeded(0, 0);
    generateChunkIfNeeded(-1, 0);
    generateChunkIfNeeded(1, 0);
    generateChunkIfNeeded(0, -1);
    generateChunkIfNeeded(0, 1);

    // Gerar mapa procedural com vilas pequenas
    setTimeout(() => {
      const { generateProceduralMap } = useVillageStore.getState();

      // Gerar área central com vilas pequenas
      generateProceduralMap({ x: 0, z: 0 }, 30);

    }, 100); // Pequeno delay para garantir que os chunks iniciais sejam gerados
  }, [generateChunkIfNeeded]);

  // Enhanced lumberjack behavior with tree access
  const updateLumberjackBehaviorWithTrees = useCallback((npc: any, availableTrees: Record<string, any>) => {
    if (npc.profession !== 'LUMBERJACK' || npc.controlMode !== NPCControlMode.AUTONOMOUS) {
      return;
    }

    const currentTime = Date.now();
    const { moveNPC, setNPCState, updateNPCTask, transferResourcesToHouse } = useNPCStore.getState(); // Import transferResourcesToHouse
    const { damageTree, removeTree } = useTreeStore.getState();
    const { addTextEffect } = useEffectsStore.getState();
    const MOVEMENT_SPEED = 300; // Define MOVEMENT_SPEED (ajuste conforme necessário)

    console.log('Lenhador', npc.id, 'estado:', npc.state, 'posição:', npc.position);

    switch (npc.state) {
      case NPCState.IDLE: {
        // Check if inventory is full
        const inventory = npc.inventory || {};
        const totalItems = Object.values(inventory).reduce((sum: number, count: number) => sum + count, 0);
        const maxInventorySize = 10; // Assuming a max inventory size

        if (totalItems >= maxInventorySize) {
          console.log('Inventário cheio, lenhador retornando para casa.');
          setNPCState(npc.id, NPCState.RETURNING_HOME);
          return;
        }

        // Find nearest tree within range
        const treesArray = Object.values(availableTrees).filter(tree => !tree.isFalling && tree.health > 0);
        let nearestTree = null;
        let nearestDistance = Infinity;

        for (const tree of treesArray) {
          const distance = Math.abs(tree.position.x - npc.position.x) + 
                         Math.abs(tree.position.z - npc.position.z);

          if (distance <= LUMBERJACK_WORK_RANGE && distance < nearestDistance) {
            nearestTree = tree;
            nearestDistance = distance;
          }
        }

        console.log('Árvores disponíveis:', treesArray.length, 'mais próxima:', nearestTree?.id, 'distância:', nearestDistance);

        if (nearestTree) {
          // Check if adjacent to tree (distance = 1)
          if (nearestDistance === 1) {
            // Adjacent to tree - start working
            console.log('Lenhador adjacente à árvore', nearestTree.id, 'começando trabalho');
            setNPCState(npc.id, NPCState.WORKING, {
              type: 'cut_tree',
              targetId: nearestTree.id,
              targetPosition: nearestTree.position,
              progress: 0,
              maxProgress: nearestTree.health
            });
          } else {
            // Move towards tree
            console.log('Movendo lenhador em direção à árvore', nearestTree.id);

            const dx = nearestTree.position.x - npc.position.x;
            const dz = nearestTree.position.z - npc.position.z;

            let direction = { x: 0, z: 0 };

            // Choose direction - prioritize getting closer
            if (Math.abs(dx) > Math.abs(dz)) {
              direction.x = dx > 0 ? 1 : -1;
            } else {
              direction.z = dz > 0 ? 1 : -1;
            }

            // Use the existing moveNPC function
            moveNPC(npc.id, direction);
          }
        }
        break;
      }

      case NPCState.WORKING: {
        if (!npc.currentTask || npc.currentTask.type !== 'cut_tree') {
          console.log('Tarefa inválida, voltando ao idle');
          setNPCState(npc.id, NPCState.IDLE);
          return;
        }

        // Check if tree still exists
        const tree = availableTrees[npc.currentTask.targetId];
        if (!tree || tree.isFalling || tree.health <= 0) {
          console.log('Árvore não existe, está caindo ou foi destruída, voltando ao idle');
          setNPCState(npc.id, NPCState.IDLE);
          return;
        }

        // Check if enough time has passed since last chop
        if (currentTime - (npc.lastActionTime || 0) >= LUMBERJACK_CHOP_INTERVAL) {
          console.log('TOC! Cortando árvore', tree.id);

          // Damage the tree
          const treeDestroyed = damageTree(tree.id, 1);

          // Update NPC animation and progress
          const newProgress = (npc.currentTask.progress || 0) + 1;

          if (treeDestroyed) {
            console.log('Árvore destruída! Lenhador coletou recursos');
            // Adicionar madeira ao inventário do NPC autônomo
            const { addResourceToNPC, shouldReturnHome } = useNPCStore.getState();
            const woodAdded = addResourceToNPC(npc.id, 'wood', 2);

            if (woodAdded) {
              addTextEffect(tree.position, '+2 Madeira', '#8B4513', 1200);
              // Verificar se deve voltar para casa
              if (shouldReturnHome(npc.id)) {
                console.log('Lenhador deve voltar para casa - capacidade quase cheia');
                setNPCState(npc.id, NPCState.RETURNING_HOME);
              } else {
                setNPCState(npc.id, NPCState.IDLE);
              }
            } else {
              addTextEffect(tree.position, 'Inventário cheio! Voltando para casa', '#FF0000', 1200);
              setNPCState(npc.id, NPCState.RETURNING_HOME);
            }
            removeTree(tree.id);
          } else {
            // Continue working
            updateNPCTask(npc.id, {
              ...npc.currentTask,
              progress: newProgress
            });
            setNPCState(npc.id, NPCState.WORKING, { ...npc.currentTask, progress: newProgress, lastActionTime: currentTime});
          }

          // Add chopping animation
          useNPCStore.getState().setNPCAnimation(npc.id, {
            type: 'chopping',
            startTime: currentTime,
            duration: CHOPPING_ANIMATION_DURATION
          });
        }
        break;
      }

      case NPCState.RETURNING_HOME: {
        if (!npc.houseId) {
          console.log('Lenhador sem casa atribuída - voltando ao estado IDLE');
          setNPCState(npc.id, NPCState.IDLE);
          return;
        }

        import('../../lib/stores/useHouseStore').then(({ useHouseStore }) => {
          const house = useHouseStore.getState().houses[npc.houseId!];
          if (!house) {
            console.log('Casa não encontrada para o lenhador:', npc.id, 'Voltando ao IDLE.');
            setNPCState(npc.id, NPCState.IDLE);
            return;
          }

          const distanceToHome = Math.abs(house.position.x - npc.position.x) + 
                               Math.abs(house.position.z - npc.position.z);

          if (distanceToHome === 0) {
            // At home - transfer resources
            console.log('Lenhador chegou em casa - transferindo recursos');
            transferResourcesToHouse(npc.id, npc.houseId!); // Usando a função importada
            setNPCState(npc.id, NPCState.IDLE); // Voltar para IDLE após descarregar
          } else {
            // Move towards home
            const direction = {
              x: house.position.x > npc.position.x ? 1 : house.position.x < npc.position.x ? -1 : 0,
              z: house.position.z > npc.position.z ? 1 : house.position.z < npc.position.z ? -1 : 0
            };

            // Ensure we don't try to move if already at home
            if (direction.x !== 0 || direction.z !== 0) {
              setNPCState(npc.id, NPCState.MOVING); // Indicate moving state
              moveNPC(npc.id, direction);
            } else {
              // This case should ideally not be reached if distanceToHome > 0, but as a safeguard:
              console.log('Lenhador está em casa, mas distanceToHome > 0. Forçando IDLE.');
              setNPCState(npc.id, NPCState.IDLE);
            }
          }
        }).catch(error => {
          console.error("Failed to import useHouseStore:", error);
          setNPCState(npc.id, NPCState.IDLE); // Fallback to IDLE on error
        });
        break;
      }
    }
  }, []); // Dependencies will be added as functions are defined or passed

  // Enhanced miner behavior with stone access
  const updateMinerBehaviorWithStones = useCallback((npc: any, availableStones: Record<string, any>) => {
    if (npc.profession !== 'MINER' || npc.controlMode !== NPCControlMode.AUTONOMOUS) {
      return;
    }

    const currentTime = Date.now();
    const MINER_WORK_RANGE = 5;
    const MINER_MINE_INTERVAL = 1200;
    const { moveNPC, setNPCState, updateNPCTask } = useNPCStore.getState();
    const { damageStone, removeStone } = useStoneStore.getState();
    const { addTextEffect } = useEffectsStore.getState();

    console.log('Minerador', npc.id, 'estado:', npc.state, 'posição:', npc.position);

    switch (npc.state) {
      case NPCState.IDLE: {
        // Find nearest stone within range
        const stonesArray = Object.values(availableStones).filter(stone => !stone.isBreaking && stone.health > 0);
        let nearestStone = null;
        let nearestDistance = Infinity;

        for (const stone of stonesArray) {
          const distance = Math.abs(stone.position.x - npc.position.x) + 
                         Math.abs(stone.position.z - npc.position.z);

          if (distance <= MINER_WORK_RANGE && distance < nearestDistance) {
            nearestStone = stone;
            nearestDistance = distance;
          }
        }

        console.log('Pedras disponíveis:', stonesArray.length, 'mais próxima:', nearestStone?.id, 'distância:', nearestDistance);

        if (nearestStone) {
          // Check if adjacent to stone (distance = 1)
          if (nearestDistance === 1) {
            // Adjacent to stone - start working
            console.log('Minerador adjacente à pedra', nearestStone.id, 'começando trabalho');
            setNPCState(npc.id, NPCState.WORKING, {
              type: 'mine_stone',
              targetId: nearestStone.id,
              targetPosition: nearestStone.position,
              progress: 0,
              maxProgress: nearestStone.health
            });
          } else {
            // Move towards stone
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

            // Use the existing moveNPC function
            moveNPC(npc.id, direction);
          }
        }
        break;
      }

      case NPCState.WORKING: {
        if (!npc.currentTask || npc.currentTask.type !== 'mine_stone') {
          console.log('Tarefa inválida, voltando ao idle');
          setNPCState(npc.id, NPCState.IDLE);
          return;
        }

        // Check if stone still exists
        const stone = availableStones[npc.currentTask.targetId];
        if (!stone || stone.isBreaking || stone.health <= 0) {
          console.log('Pedra não existe, está quebrando ou foi destruída, voltando ao idle');
          setNPCState(npc.id, NPCState.IDLE);
          return;
        }

        // Check if enough time has passed since last mine
        if (currentTime - (npc.lastActionTime || 0) >= MINER_MINE_INTERVAL) {
          console.log('CLANG! Minerando pedra', stone.id);

          // Damage the stone
          const stoneDestroyed = damageStone(stone.id, 1);

          // Update NPC animation and progress
          const newProgress = (npc.currentTask.progress || 0) + 1;

          if (stoneDestroyed) {
            console.log('Pedra destruída! Minerador coletou recursos');
            // Adicionar pedra ao inventário do NPC autônomo
            const { addResourceToNPC, shouldReturnHome } = useNPCStore.getState();
            const stoneAdded = addResourceToNPC(npc.id, 'stone', 2);
            if (stoneAdded) {
              addTextEffect(stone.position, '+2 Pedra', '#808080', 1200);
              if (shouldReturnHome(npc.id)) {
                console.log('Minerador deve voltar para casa - capacidade quase cheia');
                setNPCState(npc.id, NPCState.RETURNING_HOME);
              } else {
                setNPCState(npc.id, NPCState.IDLE);
              }
            } else {
              addTextEffect(stone.position, 'Inventário cheio! Voltando para casa', '#FF0000', 1200);
              setNPCState(npc.id, NPCState.RETURNING_HOME);
            }

            removeStone(stone.id);
          } else {
            // Continue working
            updateNPCTask(npc.id, {
              ...npc.currentTask,
              progress: newProgress
            });
          }

          // Add mining animation
          setNPCState(npc.id, NPCState.WORKING, { ...npc.currentTask, progress: newProgress, lastActionTime: currentTime});
          useNPCStore.getState().setNPCAnimation(npc.id, {
            type: 'mining',
            startTime: currentTime,
            duration: 900 // 900ms mining animation
          });
        }
        break;
      }
    }
  }, []); // Dependencies to be added

  // Game loop for NPC behavior and effects
  useEffect(() => {
    const gameLoop = setInterval(() => {
      // Update NPC movement
      updateNPCMovement();

      // Update cooldowns
      useNPCStore.getState().updateCooldowns();

      // Update lumberjack and miner behavior for each NPC
      Object.values(npcs).forEach((npc) => {
        if (npc.profession === 'LUMBERJACK' && npc.controlMode === NPCControlMode.AUTONOMOUS) {
          console.log('Atualizando comportamento do lenhador:', npc.id, 'estado:', npc.state);
          try {
            updateLumberjackBehaviorWithTrees(npc, trees);
          } catch (error) {
            console.error('Erro ao atualizar comportamento do lenhador:', error);
          }
        } else if (npc.profession === 'MINER' && npc.controlMode === NPCControlMode.AUTONOMOUS) {
          console.log('Atualizando comportamento do minerador:', npc.id, 'estado:', npc.state);
          try {
            updateMinerBehaviorWithStones(npc, stones);
          } catch (error) {
            console.error('Erro ao atualizar comportamento do minerador:', error);
          }
        }
      });

      // Update tree falling animations
      const { updateFallingTrees } = useTreeStore.getState();
      updateFallingTrees();

      // Update stone breaking animations
      const { updateBreakingStones } = useStoneStore.getState();
      updateBreakingStones();

      // Update text effects
      updateEffects();
    }, 100); // Run every 100ms for smooth updates

    return () => clearInterval(gameLoop);
  }, [npcs, trees, stones, updateNPCMovement, updateEffects, updateLumberjackBehaviorWithTrees, updateMinerBehaviorWithStones]);

  // Manual tree cutting for controlled NPCs
  const handleManualTreeCutting = useCallback((npcId: string) => {
    const npc = npcs[npcId];
    if (!npc || npc.controlMode !== NPCControlMode.CONTROLLED) {
      console.log('NPC não encontrado ou não está em modo controlado');
      return;
    }

    // Check if there's a tree at the NPC's exact position
    const treeAtPosition = getTreeAt(npc.position);

    if (treeAtPosition && !treeAtPosition.isFalling) {
      console.log('Cortando árvore manualmente:', treeAtPosition.id, 'na mesma posição do NPC');

      // Damage the tree
      const { damageTree } = useTreeStore.getState();
      const treeDestroyed = damageTree(treeAtPosition.id, 1);

      // Add chopping animation
      useNPCStore.getState().setNPCAnimation(npc.id, {
        type: 'chopping',
        startTime: Date.now(),
        duration: CHOPPING_ANIMATION_DURATION
      });

      // Add visual effect at tree position
      const { addTextEffect } = useEffectsStore.getState();
      addTextEffect(treeAtPosition.position, 'TOC!', '#FFA500', 800);

      // If tree was destroyed, remove it
      if (treeDestroyed) {
        const { removeTree } = useTreeStore.getState();
        removeTree(treeAtPosition.id);
      }

      console.log(treeDestroyed ? 'Árvore cortada e destruída!' : 'Árvore danificada!');
      return true;
    } else {
      console.log('NPC deve estar no mesmo tile da árvore para cortá-la');

      // Add visual feedback
      const { addTextEffect } = useEffectsStore.getState();
      addTextEffect(npc.position, 'Precisa estar na árvore!', '#FF0000', 1000);
      return false;
    }
  }, [npcs, getTreeAt]);



  // Converter coordenadas de grid para tela - corrigido para isométrico
  const gridToScreen = useCallback((gridX: number, gridZ: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const scale = CELL_SIZE * zoomRef.current;

    // Projeção isométrica correta - casas devem ficar no chão
    const screenX = centerX + panRef.current.x + (gridX - gridZ) * scale * 0.5;
    const screenY = centerY + panRef.current.y + (gridX + gridZ) * scale * 0.25;

    return { x: screenX, y: screenY };
  }, []);

  // Converter coordenadas de tela para grid - atualizado para corresponder à projeção isométrica
  const screenToGrid = useCallback((screenX: number, screenY: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const scale = CELL_SIZE * zoomRef.current;

    const relX = screenX - centerX - panRef.current.x;
    const relY = screenY - centerY - panRef.current.y;

    // Conversão corrigida para isométrico
    const gridX = Math.round((relX / (scale * 0.5) + relY / (scale * 0.25)) / 2);
    const gridZ = Math.round((relY / (scale * 0.25) - relX / (scale * 0.5)) / 2);

    return { x: gridX, z: gridZ };
  }, []);

  // Função para verificar se um objeto está visível na tela
  const isObjectVisible = useCallback((position: { x: number, z: number }, canvasWidth: number, canvasHeight: number, margin: number = 100) => {
    const screen = gridToScreen(position.x, position.z, canvasWidth, canvasHeight);
    return screen.x >= -margin && screen.x <= canvasWidth + margin && 
           screen.y >= -margin && screen.y <= canvasHeight + margin;
  }, [gridToScreen]);

  // Desenhar tiles com sprite de grama simples
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Calcular área visível baseada no zoom e pan
    const visibleRange = Math.ceil(50 / zoomRef.current);
    const centerX = Math.floor(-panRef.current.x / (CELL_SIZE * zoomRef.current));
    const centerZ = Math.floor(-panRef.current.y / (CELL_SIZE * zoomRef.current));

    const startX = Math.max(-GRID_SIZE/2, centerX - visibleRange);
    const endX = Math.min(GRID_SIZE/2, centerX + visibleRange);
    const startZ = Math.max(-GRID_SIZE/2, centerZ - visibleRange);
    const endZ = Math.min(GRID_SIZE/2, centerZ + visibleRange);

    const grassSprite = spritesRef.current['grass'];

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        const screen = gridToScreen(x, z, canvasWidth, canvasHeight);

        // Verificar se está na área visível
        if (screen.x >= -100 && screen.x <= canvasWidth + 100 && 
            screen.y >= -100 && screen.y <= canvasHeight + 100) {

          const tileSize = CELL_SIZE * zoomRef.current;

          if (grassSprite) {
            // Usar sprite de grama diretamente
            ctx.drawImage(
              grassSprite,
              screen.x - tileSize / 2,
              screen.y - tileSize / 2,
              tileSize,
              tileSize
            );
          } else {
            // Fallback: losango verde simples
            const halfTile = tileSize * 0.5;
            const quarterTile = tileSize * 0.25;

            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y - quarterTile);
            ctx.lineTo(screen.x + halfTile, screen.y);
            ctx.lineTo(screen.x, screen.y + quarterTile);
            ctx.lineTo(screen.x - halfTile, screen.y);
            ctx.closePath();
            ctx.fill();

            // Borda sutil
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }
  }, [gridToScreen]);

  // Desenhar casa (memoizado) - casas ocupam 100% do tile isométrico
  const drawHouse = useCallback((ctx: CanvasRenderingContext2D, house: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(house.position.x, house.position.z, canvasWidth, canvasHeight);
    const cellSize = CELL_SIZE * zoomRef.current;

    ctx.save();

    // Para isométrico, desenhar casa como losango que ocupa todo o tile
    const halfWidth = cellSize * 0.5;
    const quarterHeight = cellSize * 0.25;

    // Usar sprite se disponível
    const sprite = spritesRef.current[house.type];
    if (sprite && spritesLoadedRef.current) {
      // Desenhar sprite ocupando todo o tile isométrico
      ctx.translate(screen.x, screen.y);
      ctx.drawImage(sprite, -halfWidth, -quarterHeight, cellSize, cellSize/2);
    } else {
      // Renderização isométrica ocupando 100% do tile
      if (house.type === HouseType.FARMER) {
        // Base da casa - losango branco ocupando todo o tile
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight); // topo
        ctx.lineTo(screen.x + halfWidth, screen.y); // direita
        ctx.lineTo(screen.x, screen.y + quarterHeight); // baixo
        ctx.lineTo(screen.x - halfWidth, screen.y); // esquerda
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Teto isométrico vermelho - ajustado para altura correta
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + quarterHeight, screen.y - quarterHeight * 1.5);
        ctx.lineTo(screen.x, screen.y - quarterHeight * 2);
        ctx.lineTo(screen.x - quarterHeight, screen.y - quarterHeight * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Porta centralizada
        ctx.fillStyle = '#8B4513';
        const doorWidth = halfWidth / 4;
        const doorHeight = quarterHeight / 2;
        ctx.fillRect(screen.x - doorWidth/2, screen.y + quarterHeight/2, doorWidth, doorHeight);
        ctx.strokeRect(screen.x - doorWidth/2, screen.y + quarterHeight/2, doorWidth, doorHeight);

        // Janelas simétricas
        ctx.fillStyle = '#87CEEB';
        const windowSize = halfWidth / 8;
        ctx.fillRect(screen.x - halfWidth/2, screen.y - windowSize/2, windowSize, windowSize);
        ctx.fillRect(screen.x + halfWidth/2 - windowSize, screen.y - windowSize/2, windowSize, windowSize);
        ctx.strokeRect(screen.x - halfWidth/2, screen.y - windowSize/2, windowSize, windowSize);
        ctx.strokeRect(screen.x + halfWidth/2 - windowSize, screen.y - windowSize/2, windowSize, windowSize);
      } else if (house.type === HouseType.LUMBERJACK) {
        // Base da casa lenhador - losango bege
        ctx.fillStyle = '#F5F5DC';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + halfWidth, screen.y);
        ctx.lineTo(screen.x, screen.y + quarterHeight);
        ctx.lineTo(screen.x - halfWidth, screen.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Teto isométrico marrom - ajustado para altura correta
        ctx.fillStyle = '#D2691E';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + quarterHeight, screen.y - quarterHeight * 1.5);
        ctx.lineTo(screen.x, screen.y - quarterHeight * 2);
        ctx.lineTo(screen.x - quarterHeight, screen.y - quarterHeight * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Porta de madeira
        ctx.fillStyle = '#654321';
        const doorWidth = halfWidth / 4;
        const doorHeight = quarterHeight / 2;
        ctx.fillRect(screen.x - doorWidth/2, screen.y + quarterHeight/2, doorWidth, doorHeight);
        ctx.strokeRect(screen.x - doorWidth/2, screen.y + quarterHeight/2, doorWidth, doorHeight);

        // Janelas simétricas
        ctx.fillStyle = '#87CEEB';
        const windowSize = halfWidth / 8;
        ctx.fillRect(screen.x - halfWidth/2, screen.y - windowSize/2, windowSize, windowSize);
        ctx.fillRect(screen.x + halfWidth/2 - windowSize, screen.y - windowSize/2, windowSize, windowSize);
        ctx.strokeStyle = '#654321';
        ctx.strokeRect(screen.x - halfWidth/2, screen.y - windowSize/2, windowSize, windowSize);
        ctx.strokeRect(screen.x + halfWidth/2 - windowSize, screen.y - windowSize/2, windowSize, windowSize);
      } else if (house.type === HouseType.MINER) {
        // Base da casa minerador - losango pedra
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + halfWidth, screen.y);
        ctx.lineTo(screen.x, screen.y + quarterHeight);
        ctx.lineTo(screen.x - halfWidth, screen.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Teto isométrico de pedra escura
        ctx.fillStyle = '#2F4F4F';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + halfWidth/2, screen.y - quarterHeight * 2);
        ctx.lineTo(screen.x, screen.y - quarterHeight * 3);
        ctx.lineTo(screen.x - halfWidth/2, screen.y - quarterHeight * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Porta de ferro
        ctx.fillStyle = '#2F4F4F';
        const doorWidth = halfWidth / 4;
        const doorHeight = quarterHeight / 2;
        ctx.fillRect(screen.x - doorWidth/2, screen.y + quarterHeight/2, doorWidth, doorHeight);
        ctx.strokeRect(screen.x - doorWidth/2, screen.y + quarterHeight/2, doorWidth, doorHeight);

        // Janelas pequenas com grades
        ctx.fillStyle = '#87CEEB';
        const windowSize = halfWidth / 10;
        ctx.fillRect(screen.x - halfWidth/2, screen.y - windowSize/2, windowSize, windowSize);
        ctx.fillRect(screen.x + halfWidth/2 - windowSize, screen.y - windowSize/2, windowSize, windowSize);
        ctx.strokeRect(screen.x - halfWidth/2, screen.y - windowSize/2, windowSize, windowSize);
        ctx.strokeRect(screen.x + halfWidth/2 - windowSize, screen.y - windowSize/2, windowSize, windowSize);

        // Chaminé
        ctx.fillStyle = '#696969';
        ctx.fillRect(screen.x + halfWidth/3, screen.y - quarterHeight * 3, halfWidth/8, quarterHeight);
        ctx.strokeRect(screen.x + halfWidth/3, screen.y - quarterHeight * 3, halfWidth/8, quarterHeight);
      } else {
        // Casa padrão isométrica
        ctx.fillStyle = HOUSE_COLORS[house.type as HouseType] || '#808080';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + halfWidth, screen.y);
        ctx.lineTo(screen.x, screen.y + quarterHeight);
        ctx.lineTo(screen.x - halfWidth, screen.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Teto simples - ajustado para altura correta
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - quarterHeight);
        ctx.lineTo(screen.x + quarterHeight, screen.y - quarterHeight * 1.5);
        ctx.lineTo(screen.x, screen.y - quarterHeight * 2);
        ctx.lineTo(screen.x - quarterHeight, screen.y - quarterHeight * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [gridToScreen]);

  // Desenhar rua com sprites realistas
  const drawRoad = useCallback((ctx: CanvasRenderingContext2D, road: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(road.position.x, road.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current;

    ctx.save();

    // Obter sprite apropriada baseada no tipo de rua
    let roadSprite = null;
    switch (road.type) {
      case 'horizontal':
        roadSprite = spritesRef.current['road_horizontal'];
        break;
      case 'vertical':
        roadSprite = spritesRef.current['road_vertical'];
        break;
      case 'cross':
        roadSprite = spritesRef.current['road_cross'];
        break;
      default:
        roadSprite = spritesRef.current['road_horizontal'];
        break;
    }

    if (roadSprite && spritesLoadedRef.current) {
      // Usar sprite de rua realista com renderização isométrica
      const spriteSize = size * 1.4; // Aumentar para cobrir melhor o tile isométrico

      // Ajustar posição para isométrico
      const offsetY = size * 0.1; // Pequeno offset para alinhar com o grid isométrico

      ctx.drawImage(
        roadSprite,
        screen.x - spriteSize / 2,
        screen.y - spriteSize / 2 + offsetY,
        spriteSize,
        spriteSize / 2 // Altura reduzida para perspectiva isométrica
      );
    } else {
      // Fallback: desenhar rua com padrão isométrico melhorado
      const halfSize = size * 0.5;
      const quarterSize = size * 0.25;

      // Base da rua - cor de asfalto
      ctx.fillStyle = '#444444';
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y - quarterSize); // topo
      ctx.lineTo(screen.x + halfSize, screen.y); // direita
      ctx.lineTo(screen.x, screen.y + quarterSize); // baixo
      ctx.lineTo(screen.x - halfSize, screen.y); // esquerda
      ctx.closePath();
      ctx.fill();

      // Bordas da rua
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Linhas centrais baseadas no tipo de rua
      ctx.strokeStyle = '#FFFF00'; // Amarelo para linhas de trânsito
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);

      switch (road.type) {
        case 'horizontal':
          ctx.beginPath();
          ctx.moveTo(screen.x - halfSize * 0.7, screen.y);
          ctx.lineTo(screen.x + halfSize * 0.7, screen.y);
          ctx.stroke();
          break;
        case 'vertical':
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y - quarterSize * 0.7);
          ctx.lineTo(screen.x, screen.y + quarterSize * 0.7);
          ctx.stroke();
          break;
        case 'cross':
          ctx.beginPath();
          ctx.moveTo(screen.x - halfSize * 0.7, screen.y);
          ctx.lineTo(screen.x + halfSize * 0.7, screen.y);
          ctx.moveTo(screen.x, screen.y - quarterSize * 0.7);
          ctx.lineTo(screen.x, screen.y + quarterSize * 0.7);
          ctx.stroke();
          break;
      }

      // Adicionar textura de asfalto (pontos pequenos)
      ctx.setLineDash([]);
      const seed = (road.position.x * 1000 + road.position.z) * 0.001;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + seed;
        const distance = (Math.sin(seed + i) * 0.5 + 0.5) * quarterSize * 0.8;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance * 0.5;
        ctx.beginPath();
        ctx.arc(screen.x + offsetX, screen.y + offsetY, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sombra sutil para profundidade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y + quarterSize); // baixo
      ctx.lineTo(screen.x + halfSize, screen.y); // direita
      ctx.lineTo(screen.x + halfSize, screen.y + quarterSize * 0.1); // direita baixo
      ctx.lineTo(screen.x, screen.y + quarterSize * 1.1); // baixo sombra
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [gridToScreen]);

  // Desenhar NPC (memoizado)
  const drawNPC = useCallback((ctx: CanvasRenderingContext2D, npc: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(npc.position.x, npc.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current;
    const isSelected = selectedNPC === npc.id;

    // Ajustar posição Y para que o NPC pareça estar no chão
    const npcY = screen.y;

    ctx.save();

    // Determinar sprite baseada na direção ou estado
    let spriteKey = 'npc_frame_S'; // Default facing down
    
    // Se o NPC tem direção de movimento, usar sprite apropriada
    if (npc.lastMoveDirection) {
      if (npc.lastMoveDirection.x > 0) spriteKey = 'npc_frame_D'; // Moving right
      else if (npc.lastMoveDirection.x < 0) spriteKey = 'npc_frame_A'; // Moving left
      else if (npc.lastMoveDirection.z < 0) spriteKey = 'npc_frame_W'; // Moving up
      else if (npc.lastMoveDirection.z > 0) spriteKey = 'npc_frame_S'; // Moving down
    }

    const npcSprite = spritesRef.current[spriteKey];

    // Handle chopping animation - apenas aplicar escala suave
    if (npc.animation && npc.animation.type === 'chopping') {
      const elapsed = Date.now() - npc.animation.startTime;
      const progress = elapsed / npc.animation.duration;

      if (progress < 1) {
        // Simple scale animation for chopping
        const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.08;
        ctx.translate(screen.x, npcY);
        ctx.scale(scale, scale);
        ctx.translate(-screen.x, -npcY);
      }
    }

    // Handle mining animation - apenas aplicar movimento sutil
    if (npc.animation && npc.animation.type === 'mining') {
      const elapsed = Date.now() - npc.animation.startTime;
      const progress = elapsed / npc.animation.duration;

      if (progress < 1) {
        const offsetX = Math.sin(progress * Math.PI * 6) * 2;
        const offsetY = Math.sin(progress * Math.PI * 8) * 1;
        ctx.translate(offsetX, offsetY);
      }
    }

    if (npcSprite && spritesLoadedRef.current) {
      // Usar sprite do NPC
      const spriteSize = size * 0.8;
      
      // Destacar NPC selecionado com borda
      if (isSelected) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.strokeRect(
          screen.x - spriteSize / 2 - 2,
          npcY - spriteSize / 2 - 2,
          spriteSize + 4,
          spriteSize + 4
        );
      }
      
      ctx.drawImage(
        npcSprite,
        screen.x - spriteSize / 2,
        npcY - spriteSize / 2,
        spriteSize,
        spriteSize
      );
    } else {
      // Fallback: círculo colorido baseado na profissão
      let npcColor = '#FF6B6B'; // Default farmer color
      if (npc.profession === 'LUMBERJACK') {
        npcColor = '#8B4513'; // Brown for lumberjack
      } else if (npc.profession === 'MINER') {
        npcColor = '#696969'; // Dark gray for miner
      }

      const radius = size * 0.3;
      ctx.fillStyle = isSelected ? '#FF4444' : npcColor;
      ctx.beginPath();
      ctx.arc(screen.x, npcY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#FF0000' : '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore(); // Restaurar contexto após animações

    // Desenhar ferramenta em animação separadamente
    if (npc.animation && (npc.animation.type === 'chopping' || npc.animation.type === 'mining')) {
      const elapsed = Date.now() - npc.animation.startTime;
      const progress = elapsed / npc.animation.duration;

      if (progress < 1) {
        ctx.save();

        // Configurar fonte para ferramenta
        ctx.font = `${Math.max(18, radius * 1.4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let toolEmoji = '';
        let toolAnimation = { x: 0, y: 0, rotation: 0 };

        if (npc.animation.type === 'chopping') {
          toolEmoji = '🪓';
          // Animação de balanço para machado
          const swingProgress = Math.sin(progress * Math.PI * 3) * 0.8;
          toolAnimation = {
            x: screen.x + swingProgress * radius * 0.8,
            y: npcY - radius * 1.2 + Math.abs(swingProgress) * radius * 0.3,
            rotation: swingProgress * Math.PI / 8
          };
        } else if (npc.animation.type === 'mining') {
          toolEmoji = '⛏️';
          // Animação de picareta
          const swingProgress = Math.sin(progress * Math.PI * 4) * 0.6;
          toolAnimation = {
            x: screen.x + swingProgress * radius * 0.6,
            y: npcY - radius * 1.1 + Math.abs(swingProgress) * radius * 0.4,
            rotation: swingProgress * Math.PI / 10
          };
        }

        // Desenhar ferramenta animada
        if (toolEmoji) {
          ctx.translate(toolAnimation.x, toolAnimation.y);
          ctx.rotate(toolAnimation.rotation);

          // Sombra da ferramenta
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillText(toolEmoji, 2, 2);

          // Ferramenta
          ctx.fillStyle = '#000000';
          ctx.fillText(toolEmoji, 0, 0);
        }

        ctx.restore();
      }
    }

    // Tool emoji estático quando não está animando
    if (!npc.animation) {
      ctx.save();
      ctx.font = `${Math.max(16, radius * 1.2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let toolEmoji = '';
      if (npc.profession === 'LUMBERJACK') {
        toolEmoji = '🪓'; // Axe emoji
      } else if (npc.profession === 'MINER') {
        toolEmoji = '⛏️'; // Pickaxe emoji
      }

      if (toolEmoji) {
        // Position tool emoji to the left side of the NPC
        const toolX = screen.x - radius * 1.2;
        const toolY = npcY;

        // Add subtle shadow for better visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(toolEmoji, toolX + 1, toolY + 1);

        // Draw the actual emoji
        ctx.fillStyle = '#000000';
        ctx.fillText(toolEmoji, toolX, toolY);
      }
      ctx.restore();
    }

    // Working indicator
    if (npc.state === 'WORKING' && npc.currentTask && npc.currentTask.maxProgress > 0) {
      // Draw progress bar above NPC
      const barWidth = radius * 1.5;
      const barHeight = 3;
      const progress = Math.min(npc.currentTask.progress / npc.currentTask.maxProgress, 1);

      // Background
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(screen.x - barWidth/2, npcY - radius * 1.8, barWidth, barHeight);

      // Progress
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(screen.x - barWidth/2, npcY - radius * 1.8, barWidth * progress, barHeight);

      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(screen.x - barWidth/2, npcY - radius * 1.8, barWidth, barHeight);
    }

    // Cooldown indicator for controlled NPCs
    if (npc.controlMode === NPCControlMode.CONTROLLED && useNPCStore.getState().isNPCOnCooldown(npc.id)) {
      const cooldownEnd = useNPCStore.getState().npcCooldowns[npc.id];
      const remainingTime = cooldownEnd - Date.now();
      const cooldownProgress = Math.max(0, remainingTime / CONTROLLED_CHOP_COOLDOWN);

      // Draw cooldown arc
      const arcRadius = radius * 1.2;
      const startAngle = -Math.PI / 2; // Top
      const endAngle = startAngle + (2 * Math.PI * cooldownProgress);

      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(screen.x, npcY, arcRadius, startAngle, endAngle);
      ctx.stroke();

      // Draw cooldown background
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(screen.x, npcY, arcRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    

    ctx.restore();
  }, [gridToScreen, selectedNPC]);

  // Desenhar pedra (memoizado)
  const drawStone = useCallback((ctx: CanvasRenderingContext2D, stone: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(stone.position.x, stone.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current;

    ctx.save();

    // Handle hit animation
    if (stone.hitStartTime) {
      const elapsed = Date.now() - stone.hitStartTime;
      const hitDuration = 200; // 200ms hit animation

      if (elapsed < hitDuration) {
        const progress = elapsed / hitDuration;

        // Shake effect - tremor (apenas horizontal/vertical, sem rotação)
        const shakeIntensity = (1 - progress) * 3;
        const shakeX = Math.sin(progress * Math.PI * 8) * shakeIntensity;
        const shakeY = Math.sin(progress * Math.PI * 6) * shakeIntensity * 0.5; // Tremor menor na vertical

        // Scale pulse effect (suave)
        const scaleEffect = 1 + Math.sin(progress * Math.PI * 4) * 0.03 * (1 - progress);

        // Aplicar apenas shake e scale, sem rotação
        ctx.translate(screen.x + shakeX, screen.y + shakeY);
        ctx.scale(scaleEffect, scaleEffect);
        ctx.translate(-screen.x, -screen.y);

        // White flash effect
        const flashIntensity = Math.sin(progress * Math.PI * 4) * 0.4 * (1 - progress);
        if (flashIntensity > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Handle breaking animation (sem rotação estranha)
    if (stone.isBreaking && stone.breakStartTime) {
      const elapsed = Date.now() - stone.breakStartTime;
      const breakDuration = 600; // 0.6 seconds break
      const breakProgress = Math.min(elapsed / breakDuration, 1);

      // Cracking effect - linhas estáticas fixas
      const crackLines = 4;
      for (let i = 0; i < crackLines; i++) {
        const angle = (Math.PI * 2 * i) / crackLines + (Math.PI / 4); // Offset fixo
        const length = size * 0.25 * breakProgress;

        ctx.strokeStyle = `rgba(51, 51, 51, ${1 - breakProgress * 0.5})`;
        ctx.lineWidth = Math.max(1, 3 - breakProgress * 2);
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(
          screen.x + Math.cos(angle) * length,
          screen.y + Math.sin(angle) * length
        );
        ctx.stroke();
      }

      // Fade out gradual
      if (elapsed > breakDuration * 0.7) {
        const fadeStart = breakDuration * 0.7;
        const fadeProgress = (elapsed - fadeStart) / (breakDuration * 0.3);
        ctx.globalAlpha = Math.max(0.1, 1 - fadeProgress);
      }
    }

    // Color based on health and type
    let stoneColor = '#808080'; // Default gray

    if (stone.type === 'small') {
      stoneColor = '#A0A0A0'; // Light gray
    } else if (stone.type === 'large') {
      stoneColor = '#606060'; // Dark gray
    }

    if (stone.health < stone.maxHealth) {
      // Damaged stone - darker color
      const healthRatio = stone.health / stone.maxHealth;
      const r = Math.floor(parseInt(stoneColor.slice(1, 3), 16) * healthRatio);
      const g = Math.floor(parseInt(stoneColor.slice(3, 5), 16) * healthRatio);
      const b = Math.floor(parseInt(stoneColor.slice(5, 7), 16) * healthRatio);
      stoneColor = `rgb(${r}, ${g}, ${b})`;
    }

    // Draw stone based on type
    const stoneSize = stone.type === 'small' ? size * 0.3 : 
                    stone.type === 'large' ? size * 0.5 : 
                    size * 0.4; // medium

    ctx.fillStyle = stoneColor;

    if (stone.type === 'small') {
      // Small stone - simple circle
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, stoneSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (stone.type === 'large') {
      // Large stone - irregular shape (forma fixa baseada no ID)
      ctx.beginPath();
      const sides = 8;
      // Usar hash do ID para gerar forma consistente
      const seed = stone.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides;
        // Variação determinística baseada no seed + índice
        const variationSeed = Math.sin(seed * 0.001 + i * 0.7) * 0.5 + 0.5;
        const variation = 0.8 + variationSeed * 0.4;
        const radius = stoneSize * variation;
        const x = screen.x + Math.cos(angle) * radius;
        const y = screen.y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Medium stone - hexagon
      ctx.beginPath();
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides;
        const x = screen.x + Math.cos(angle) * stoneSize;
        const y = screen.y + Math.sin(angle) * stoneSize;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Health indicator (small bars above stone)
    if (!stone.isBreaking && stone.health < stone.maxHealth) {
      const barWidth = size * 0.4;
      const barHeight = 3;
      const healthRatio = stone.health / stone.maxHealth;

      // Background bar
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(screen.x - barWidth/2, screen.y - size * 0.8, barWidth, barHeight);

      // Health bar
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(screen.x - barWidth/2, screen.y - size * 0.8, barWidth * healthRatio, barHeight);

      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(screen.x - barWidth/2, screen.y - size * 0.8, barWidth, barHeight);
    }

    ctx.restore();
  }, [gridToScreen]);

  // Desenhar árvore (memoizado)
  const drawTree = useCallback((ctx: CanvasRenderingContext2D, tree: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(tree.position.x, tree.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current;

    // Verificar se há NPC controlado lenhador adjacente e se esta é a árvore prioritária
    const controlledLumberjack = Object.values(npcs).find(npc => 
      npc.controlMode === NPCControlMode.CONTROLLED && 
      npc.profession === NPCProfession.LUMBERJACK
    );

    let isHighlighted = false;
    if (controlledLumberjack && !tree.isFalling && tree.health > 0) {
      const priorityTree = getPriorityTreeForNPC(controlledLumberjack);
      isHighlighted = priorityTree?.id === tree.id || false;
    }

    // Árvores em tamanho proporcional ao NPC
    const treeScale = 1.2; // Aumentar para 120% do tamanho original

    ctx.save();

    // Desenhar highlight se aplicável (antes da árvore)
    if (isHighlighted) {
      const highlightRadius = size * 0.8 * treeScale;
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Amarelo translúcido
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, highlightRadius, 0, Math.PI * 2);
      ctx.fill();

      // Borda do highlight pulsante
      const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() / 300);
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulseIntensity})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Handle hit animation
    if (tree.hitStartTime) {
      const elapsed = Date.now() - tree.hitStartTime;
      const hitDuration = 300; // 300ms hit animation

      if (elapsed < hitDuration) {
        const progress = elapsed / hitDuration;

        // Shake effect - tremor horizontal
        const shakeIntensity = (1 - progress) * 8; // Diminui com o tempo
        const shakeX = Math.sin(progress * Math.PI * 12) * shakeIntensity;

        // Scale pulse effect - pulso de escala
        const scaleEffect = 1 + Math.sin(progress * Math.PI * 8) * 0.1 * (1 - progress);

        // Apply shake translation
        ctx.translate(shakeX, 0);

        // Apply scale effect
        ctx.translate(screen.x, screen.y);
        ctx.scale(scaleEffect, scaleEffect);
        ctx.translate(-screen.x, -screen.y);

        // Red flash effect - flash vermelho
        const flashIntensity = Math.sin(progress * Math.PI * 6) * 0.3 * (1 - progress);
        if (flashIntensity > 0) {
          ctx.fillStyle = `rgba(255, 0, 0, ${flashIntensity})`;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, size * 0.8 * treeScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Handle falling animation
    if (tree.isFalling && tree.fallStartTime) {
      const elapsed = Date.now() - tree.fallStartTime;
      const fallDuration = 1200; // 1.2 seconds fall
      const fallProgress = Math.min(elapsed / fallDuration, 1);

      // Easing function for more realistic fall
      const easeInQuad = (t: number) => t * t;
      const easedProgress = easeInQuad(fallProgress);

      // Random fall direction
      const fallDirection = tree.fallDirection || (Math.random() > 0.5 ? 1 : -1);
      if (!tree.fallDirection) {
        // Store fall direction for consistency
        useTreeStore.getState().updateTree(tree.id, { fallDirection });
      }

      // Rotate tree as it falls with easing
      const fallAngle = easedProgress * Math.PI / 2 * fallDirection;

      // Calculate fall pivot point (base of tree)
      const pivotY = screen.y + size * 0.3 * treeScale; // Base da árvore

      ctx.translate(screen.x, pivotY);
      ctx.rotate(fallAngle);
      ctx.translate(-screen.x, -pivotY);

      // Bounce effect when hitting ground
      if (fallProgress >= 0.8) {
        const bounceProgress = (fallProgress - 0.8) / 0.2;
        const bounceY = Math.sin(bounceProgress * Math.PI * 3) * 3 * (1 - bounceProgress);
        ctx.translate(0, bounceY);
      }

      // Fade out after falling
      if (elapsed > fallDuration) {
        const fadeProgress = (elapsed - fallDuration) / 2800; // 2.8s fade
        ctx.globalAlpha = Math.max(0, 1 - fadeProgress);

        // Slight shrink as it fades
        const shrinkFactor = 1 - fadeProgress * 0.2;
        ctx.translate(screen.x, screen.y);
        ctx.scale(shrinkFactor, shrinkFactor);
        ctx.translate(-screen.x, -screen.y);
      }
    }

    // Color based on health
    let foliageColor = tree.type === 'birch' ? '#90EE90' : 
                      tree.type === 'oak' ? '#228B22' : '#006400';

    if (tree.health < tree.maxHealth) {
      // Damaged tree - darker/brownish color
      const healthRatio = tree.health / tree.maxHealth;
      const r = Math.floor(34 + (255 - 34) * (1 - healthRatio));
      const g = Math.floor(139 + (165 - 139) * healthRatio);
      const b = Math.floor(34 + (42 - 34) * healthRatio);
      foliageColor = `rgb(${r}, ${g}, ${b})`;
    }

    // Tronco
    const trunkWidth = size * 0.25 * treeScale;
    const trunkHeight = size * 0.7 * treeScale;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screen.x - trunkWidth/2, screen.y - trunkHeight/2, trunkWidth, trunkHeight);

    // Copa da árvore baseada no tipo
    const foliageRadius = size * 0.6 * treeScale;
    ctx.fillStyle = foliageColor;

    if (tree.type === 'pine') {
      // Árvore triangular (pinheiro) - maior e mais alta
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y - size * 0.9 * treeScale);
      ctx.lineTo(screen.x - foliageRadius, screen.y + size * 0.15);
      ctx.lineTo(screen.x + foliageRadius, screen.y + size * 0.15);
      ctx.closePath();
      ctx.fill();
    } else {
      // Árvore circular (carvalho/bétula) - maior e mais alta
      ctx.beginPath();
      ctx.arc(screen.x, screen.y - size * 0.3 * treeScale, foliageRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Borda
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Health indicator (small bars above tree)
    if (!tree.isFalling && tree.health < tree.maxHealth) {
      const barWidth = size * 0.6;
      const barHeight = 4;
      const healthRatio = tree.health / tree.maxHealth;

      // Background bar
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(screen.x - barWidth/2, screen.y - size * 1.2, barWidth, barHeight);

      // Health bar
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(screen.x - barWidth/2, screen.y - size * 1.2, barWidth * healthRatio, barHeight);

      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(screen.x - barWidth/2, screen.y - size * 1.2, barWidth, barHeight);
    }

    ctx.restore();
  }, [gridToScreen, npcs, getPriorityTreeForNPC]);

  // Draw text effects
  const drawTextEffects = useCallback((ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    if (!textEffects) return;

    Object.values(textEffects).forEach(effect => {
      if (!effect || !effect.position) return;

      const screen = gridToScreen(effect.position.x, effect.position.z, canvasWidth, canvasHeight);
      const elapsed = Date.now() - effect.startTime;
      const progress = elapsed / effect.duration;

      if (progress < 1) {
        // Animate upward movement and fade out
        const offsetY = -progress * 30; // Move up 30 pixels
        const alpha = 1 - progress; // Fade out

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FF4444';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(effect.text || '', screen.x, screen.y + offsetY);
        ctx.restore();
      }
    });
  }, [gridToScreen, textEffects]);

  // Timer para atualização dos NPCs (separado do loop de animação)
  useEffect(() => {
    const npcUpdateInterval = setInterval(() => {
      updateNPCMovement();
      updateControlledNPCWork(); // Atualizar trabalho de NPCs controlados
    }, 100); // Atualizar NPCs a cada 100ms, não a cada frame

    return () => clearInterval(npcUpdateInterval);
  }, [updateNPCMovement, updateControlledNPCWork]);

  // Câmera que segue NPC controlado
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Encontrar NPC controlado
    const controlledNPC = Object.values(npcs).find(npc => npc.controlMode === NPCControlMode.CONTROLLED);

    if (controlledNPC) {
      // Calcular posição da tela para o NPC
      const targetScreen = gridToScreen(controlledNPC.position.x, controlledNPC.position.z, canvas.width, canvas.height);

      // Calcular offset necessário para centralizar o NPC
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const targetPan = {
        x: centerX - targetScreen.x + panRef.current.x,
        y: centerY - targetScreen.y + panRef.current.y
      };

      cameraTargetRef.current = targetPan;
    } else {
      cameraTargetRef.current = null;
    }
  }, [npcs, gridToScreen]);

  // Animação suave da câmera
  useEffect(() => {
    const smoothCamera = () => {
      if (cameraTargetRef.current) {
        const target = cameraTargetRef.current;
        const current = panRef.current;

        // Interpolação suave (lerp)
        const lerpFactor = 0.1;
        const newX = current.x + (target.x - current.x) * lerpFactor;
        const newY = current.y + (target.y - current.y) * lerpFactor;

        panRef.current = { x: newX, y: newY };
      }

      requestAnimationFrame(smoothCamera);
    };

    const animationId = requestAnimationFrame(smoothCamera);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Loop de animação otimizado
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo azul do mar
    ctx.fillStyle = '#1E88E5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar elementos
    drawGrid(ctx, canvas.width, canvas.height);

    // Desenhar ruas primeiro (sobre o grid mas sob outros elementos)
    Object.values(roads).forEach(road => {
      if (isObjectVisible(road.position, canvas.width, canvas.height)) {
        drawRoad(ctx, road, canvas.width, canvas.height);
      }
    });

    // Desenhar pedras primeiro (fundo) - apenas as visíveis
    Object.values(stones).forEach(stone => {
      if (isObjectVisible(stone.position, canvas.width, canvas.height)) {
        drawStone(ctx, stone, canvas.width, canvas.height);
      }
    });

    // Desenhar árvores - apenas as visíveis
    Object.values(trees).forEach(tree => {
      if (isObjectVisible(tree.position, canvas.width, canvas.height)) {
        drawTree(ctx, tree, canvas.width, canvas.height);
      }
    });

    // Desenhar casas - apenas as visíveis
    Object.values(houses).forEach(house => {
      if (isObjectVisible(house.position, canvas.width, canvas.height)) {
        drawHouse(ctx, house, canvas.width, canvas.height);
      }
    });

    // Desenhar NPCs - sempre renderizar (são poucos e móveis)
    Object.values(npcs).forEach(npc => {
      // Verificação para não spawnar fazendeiros
      if (npc.profession !== NPCProfession.FARMER) {
        drawNPC(ctx, npc, canvas.width, canvas.height);
      }
    });

    // Draw text effects on top
    drawTextEffects(ctx, canvas.width, canvas.height);

    animationRef.current = requestAnimationFrame(animate);
  }, [houses, npcs, trees, stones, roads, drawGrid, drawHouse, drawNPC, drawTree, drawStone, drawRoad, drawTextEffects]);

  // Manipular cliques no canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isPlacingHouse && selectedHouseType) {
      const gridPos = screenToGrid(x, y, canvas.width, canvas.height);
      if (isValidGridPosition(gridPos) && !getHouseAt(gridPos) && !getTreeAt(gridPos) && !getStoneAt(gridPos) && !getRoadAt(gridPos)) {
        addHouse(selectedHouseType, gridPos, currentRotation);
        stopPlacingHouse();
      }
      return;
    }

    // Selecionar casa
    const houseClicked = Object.values(houses).find(house => {
      const screen = gridToScreen(house.position.x, house.position.z, canvas.width, canvas.height);
      const size = CELL_SIZE * zoomRef.current;
      return x >= screen.x - size/2 && x <= screen.x + size/2 && 
             y >= screen.y - size/2 && y <= screen.y + size/2;
    });

    if (houseClicked) {
      useGameStore.getState().selectHouse(houseClicked.id);

      // Encontrar NPC que mora nesta casa e abrir painel de configuração
      const npcInHouse = Object.values(npcs).find(npc => npc.houseId === houseClicked.id);
      if (npcInHouse) {
        useGameStore.getState().selectNPC(npcInHouse.id);
        useGameStore.getState().setShowNPCModal(true);
        console.log('Abrindo painel de configuração do NPC da casa:', npcInHouse.id);
      }
      return;
    }

    // Selecionar NPC
    const npcClicked = Object.values(npcs).find(npc => {
      // Avoid selecting farmer NPCs
      if (npc.profession === NPCProfession.FARMER) return false;

      const screen = gridToScreen(npc.position.x, npc.position.z, canvas.width, canvas.height);
      const distance = Math.sqrt((x - screen.x) ** 2 + (y - screen.y) ** 2);
      return distance <= CELL_SIZE * 0.4 * zoomRef.current;
    });

    if (npcClicked) {
      useGameStore.getState().selectNPC(npcClicked.id);
      return;
    }

    // Mover NPC controlado
    if (selectedNPC && npcs[selectedNPC] && npcs[selectedNPC].controlMode === NPCControlMode.CONTROLLED) {
      const gridPos = screenToGrid(x, y, canvas.width, canvas.height);
      const currentNPC = npcs[selectedNPC];
      const direction = {
        x: gridPos.x - currentNPC.position.x,
        z: gridPos.z - currentNPC.position.z
      };

      // Limitar movimento a um tile
      if (Math.abs(direction.x) <= 1 && Math.abs(direction.z) <= 1 && 
          (direction.x !== 0 || direction.z !== 0)) {
        moveNPC(selectedNPC, direction);
      }
    }
  }, [isPlacingHouse, selectedHouseType, screenToGrid, getHouseAt, addHouse, stopPlacingHouse, npcs, selectedNPC, gridToScreen, moveNPC]);

  // Manipular roda do mouse para zoom
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current = Math.max(0.5, Math.min(3, zoomRef.current * zoomFactor));
  }, []);

  // Controle de arrastar câmera (apenas em modo livre)
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Só permitir arrastar se não houver NPC controlado
    const controlledNPC = Object.values(npcs).find(npc => npc.controlMode === NPCControlMode.CONTROLLED);
    if (!controlledNPC) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
      cameraTargetRef.current = null; // Parar seguimento da câmera
    }
  }, [npcs]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const deltaX = event.clientX - lastMousePosRef.current.x;
      const deltaY = event.clientY - lastMousePosRef.current.y;

      panRef.current = {
        x: panRef.current.x + deltaX,
        y: panRef.current.y + deltaY
      };

      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Manipular teclas para movimento e rotação
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Rotação durante colocação de casa
      if (isPlacingHouse && event.key === 'r') {
        event.preventDefault();
        rotateCurrentPlacement();
        return;
      }

      // Rotação de casa selecionada
      if (useGameStore.getState().selectedHouse && event.key === 'r') {
        event.preventDefault();
        rotateHouse(useGameStore.getState().selectedHouse!);
        return;
      }

      // Manual tree cutting for controlled NPC
      if (selectedNPC && npcs[selectedNPC] && npcs[selectedNPC].controlMode === NPCControlMode.CONTROLLED) {
        if (event.key === ' ' || event.key === 'Spacebar') { // Space bar for cutting
          event.preventDefault();
          handleManualTreeCutting(selectedNPC);
          return;
        }
      }

      if (!selectedNPC || !npcs[selectedNPC] || npcs[selectedNPC].controlMode !== NPCControlMode.CONTROLLED) {
        return;
      }

      if (npcs[selectedNPC].isMoving) return; // Não permitir movimento durante animação

      let direction = { x: 0, z: 0 };

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = { x: 0, z: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = { x: 0, z: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = { x: -1, z: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = { x: 1, z: 0 };
          break;
      }

      if (direction.x !== 0 || direction.z !== 0) {
        console.log('Tecla pressionada:', event.key, 'Direção:', direction, 'NPC:', selectedNPC);
        event.preventDefault();
        moveNPC(selectedNPC, direction);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedNPC, npcs, moveNPC, isPlacingHouse, rotateCurrentPlacement, rotateHouse]);

  // Redimensionar canvas
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }, []);

  // Inicializar canvas e iniciar animação
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);

    // Iniciar o loop de animação
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [animate, handleResize]);




  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: isPlacingHouse ? 'crosshair' : 
               isDraggingRef.current ? 'grabbing' :
               Object.values(npcs).some(npc => npc.controlMode === NPCControlMode.CONTROLLED && npc.profession !== NPCProfession.FARMER) ? 'default' : 'grab',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    />
  );
}