import { useRef, useEffect, useCallback } from 'react';
import { useKeyboardActions } from '../../hooks/useKeyboardActions';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useTreeStore } from '../../lib/stores/useTreeStore';
import { useStoneStore } from '../../lib/stores/useStoneStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useEffectsStore } from '../../lib/stores/useEffectsStore';
import { GRID_SIZE, CELL_SIZE, HOUSE_COLORS, HouseType, TREE_COLOR, LUMBERJACK_WORK_RANGE, LUMBERJACK_CHOP_INTERVAL, CHOPPING_ANIMATION_DURATION, CONTROLLED_CHOP_COOLDOWN } from '../../lib/constants';
import { NPCControlMode, NPCProfession } from '../../lib/types';
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
  const { moveNPC, updateNPCMovement, updateControlledNPCWork, addNPC, startManualTreeCutting, startCuttingTree, setNPCState, addItemToInventory } = useNPCStore();
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse, selectedNPC, setCameraMode, currentRotation, rotateCurrentPlacement } = useGameStore();
  const { addHouse, getHouseAt, rotateHouse } = useHouseStore();
  const { generateRandomTrees, getTreeAt, updateTree, removeTree } = useTreeStore();
  const { generateRandomStones, getStoneAt } = useStoneStore();
  const { updateEffects, addTextEffect } = useEffectsStore();

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

  // Hook personalizado para processar ações de trabalho manual
  useEffect(() => {
    const handleManualWork = (event: CustomEvent) => {
      const { npcId } = event.detail;

      if (!npcId || !npcs[npcId]) return;

      const npc = npcs[npcId];
      if (npc.profession !== NPCProfession.LUMBERJACK) return;

      // Verificar cooldown
      if (useNPCStore.getState().isNPCOnCooldown(npcId)) {
        console.log('NPC em cooldown, aguarde para próximo golpe');
        addTextEffect(npc.position, 'Aguarde!', '#FFB347', 600);
        return;
      }

      // Se já está cortando uma árvore, processar um golpe manual
      if (npc.currentTreeId && npc.state === 'WORKING') {
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
            const woodResult = addItemToInventory(npcId, 'WOOD', 2); // Ganhar 2 madeiras por árvore
            if (woodResult.success) {
              addTextEffect(targetTree.position, '+2 Madeira', '#8B4513', 1200);
            } else {
              addTextEffect(targetTree.position, 'Inventário cheio!', '#FF0000', 1200);
            }
            
            const { removeTree } = useTreeStore.getState();
            removeTree(npc.currentTreeId);
            setNPCState(npcId, 'IDLE', null);
          }
          return;
        }
      }

      // Buscar árvore prioritária adjacente para começar novo corte
      const priorityTree = getPriorityTreeForNPC(npc);

      if (priorityTree) {
        console.log('Árvore encontrada para corte manual:', priorityTree.id);
        // Iniciar corte manual
        setNPCState(npcId, 'WORKING', { 
          currentTreeId: priorityTree.id, 
          workProgress: 1 
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
          const woodResult = addItemToInventory(npcId, 'WOOD', 2);
          if (woodResult.success) {
            addTextEffect(priorityTree.position, '+2 Madeira', '#8B4513', 1200);
          } else {
            addTextEffect(priorityTree.position, 'Inventário cheio!', '#FF0000', 1200);
          }
          
          const { removeTree } = useTreeStore.getState();
          removeTree(priorityTree.id);
          setNPCState(npcId, 'IDLE', null);
        }
      } else {
        console.log('Nenhuma árvore adjacente encontrada');
      }
    };

    window.addEventListener('manualWork', handleManualWork as EventListener);
    return () => window.removeEventListener('manualWork', handleManualWork as EventListener);
  }, [npcs, trees, updateTree, setNPCState, addTextEffect]);

  // Carregar sprites das casas
  useEffect(() => {
    const loadSprites = async () => {
      const sprites: Record<string, HTMLImageElement> = {};

      const spriteMap = {
        [HouseType.FARMER]: '/sprites/houses/farmer_house.png',
        [HouseType.LUMBERJACK]: '/sprites/houses/lumberjack_house.png',
        [HouseType.MINER]: '/sprites/houses/medium_house.png' // Usar medium_house como placeholder para miner
      };

      const loadPromises = Object.entries(spriteMap).map(([type, path]) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            sprites[type] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Falha ao carregar sprite: ${path}`);
            resolve(); // Continue mesmo se falhar
          };
          img.src = path;
        });
      });

      await Promise.all(loadPromises);
      spritesRef.current = sprites;
      spritesLoadedRef.current = true;
      console.log('Sprites carregadas:', Object.keys(sprites));
    };

    loadSprites();
  }, []);

  // Gerar árvores e pedras aleatórias na primeira renderização
  useEffect(() => {
    const treeCount = Object.keys(trees).length;
    const stoneCount = Object.keys(stones).length;
    if (treeCount === 0) {
      console.log('Gerando árvores aleatórias...');
      generateRandomTrees();
    }
    if (stoneCount === 0) {
      console.log('Gerando pedras aleatórias...');
      generateRandomStones();
    }
  }, [generateRandomTrees, generateRandomStones, trees, stones]);

  // Game loop for NPC behavior and effects
  useEffect(() => {
    const gameLoop = setInterval(() => {
      // Update NPC movement
      updateNPCMovement();

      // Update cooldowns
      useNPCStore.getState().updateCooldowns();

      // Update lumberjack behavior for each NPC with access to tree data
      Object.values(npcs).forEach((npc) => {
        if (npc.profession === 'LUMBERJACK' && npc.controlMode === NPCControlMode.AUTONOMOUS) {
          console.log('Atualizando comportamento do lenhador:', npc.id, 'estado:', npc.state);
          try {
            // Create enhanced lumberjack behavior with access to trees
            updateLumberjackBehaviorWithTrees(npc, trees);
          } catch (error) {
            console.error('Erro ao atualizar comportamento do lenhador:', error);
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
  }, [npcs, trees, updateNPCMovement, updateEffects]);

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
      useNPCStore.getState().setNPCAnimation(npcId, {
        type: 'chopping',
        startTime: Date.now(),
        duration: CHOPPING_ANIMATION_DURATION
      });

      // Add visual effect at tree position
      const { addTextEffect } = useEffectsStore.getState();
      addTextEffect(treeAtPosition.position, 'TOC!', 1000);

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
      addTextEffect(npc.position, 'Precisa estar na árvore!', 1000);
      return false;
    }
  }, [npcs, getTreeAt]);

  // Enhanced lumberjack behavior with tree access
  const updateLumberjackBehaviorWithTrees = useCallback((npc: any, availableTrees: Record<string, any>) => {
    if (npc.profession !== 'LUMBERJACK' || npc.controlMode !== NPCControlMode.AUTONOMOUS) {
      return;
    }

    const currentTime = Date.now();
    const { moveNPC, setNPCControlMode } = useNPCStore.getState();
    const { damageTree } = useTreeStore.getState();

    console.log('Lenhador', npc.id, 'estado:', npc.state, 'posição:', npc.position);

    switch (npc.state) {
      case 'IDLE': {
        // Find nearest tree within range
        const treesArray = Object.values(availableTrees).filter(tree => !tree.isFalling);
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
            useNPCStore.getState().setNPCState(npc.id, 'WORKING', {
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

      case 'WORKING': {
        if (!npc.currentTask || npc.currentTask.type !== 'cut_tree') {
          console.log('Tarefa inválida, voltando ao idle');
          useNPCStore.getState().setNPCState(npc.id, 'IDLE');
          return;
        }

        // Check if tree still exists
        const tree = availableTrees[npc.currentTask.targetId];
        if (!tree || tree.isFalling) {
          console.log('Árvore não existe ou está caindo, voltando ao idle');
          useNPCStore.getState().setNPCState(npc.id, 'IDLE');
          return;
        }

        // Check if enough time has passed since last chop
        if (currentTime - npc.lastMovement >= LUMBERJACK_CHOP_INTERVAL) {
          console.log('TOC! Cortando árvore', tree.id);

          // Damage the tree
          const treeDestroyed = damageTree(tree.id, 1);

          // Update NPC animation and progress
          const newProgress = npc.currentTask.progress + 1;

          if (treeDestroyed) {
            console.log('Árvore destruída! Lenhador volta ao idle');
            // Adicionar madeira ao inventário do NPC autônomo
            const woodResult = addItemToInventory(npc.id, 'WOOD', 2);
            if (woodResult.success) {
              addTextEffect(tree.position, '+2 Madeira', '#8B4513', 1200);
            } else {
              addTextEffect(tree.position, 'Inventário cheio!', '#FF0000', 1200);
            }
            
            const { removeTree } = useTreeStore.getState();
            removeTree(tree.id);
            useNPCStore.getState().setNPCState(npc.id, 'IDLE');
          } else {
            // Continue working
            useNPCStore.getState().updateNPCTask(npc.id, {
              ...npc.currentTask,
              progress: newProgress
            });
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
    }
  }, []);



  // Converter coordenadas de grid para tela
  const gridToScreen = useCallback((gridX: number, gridZ: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const scale = CELL_SIZE * zoomRef.current;

    const screenX = centerX + panRef.current.x + (gridX - gridZ) * scale;
    const screenY = centerY + panRef.current.y + (gridX + gridZ) * scale * 0.5;

    return { x: screenX, y: screenY };
  }, []);

  // Converter coordenadas de tela para grid
  const screenToGrid = useCallback((screenX: number, screenY: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const scale = CELL_SIZE * zoomRef.current;

    const relX = screenX - centerX - panRef.current.x;
    const relY = screenY - centerY - panRef.current.y;

    const gridX = Math.round((relX / scale + relY / (scale * 0.5)) / 2);
    const gridZ = Math.round((relY / (scale * 0.5) - relX / scale) / 2);

    return { x: gridX, z: gridZ };
  }, []);

  // Desenhar grid (memoizado)
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    const halfGrid = Math.floor(GRID_SIZE / 2);

    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const screen = gridToScreen(x, z, canvasWidth, canvasHeight);
        const screenRight = gridToScreen(x + 1, z, canvasWidth, canvasHeight);
        const screenDown = gridToScreen(x, z + 1, canvasWidth, canvasHeight);
        const screenDiag = gridToScreen(x + 1, z + 1, canvasWidth, canvasHeight);

        // Desenhar losango
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screenRight.x, screenRight.y);
        ctx.lineTo(screenDiag.x, screenDiag.y);
        ctx.lineTo(screenDown.x, screenDown.y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }, [gridToScreen]);

  // Desenhar casa (memoizado)
  const drawHouse = useCallback((ctx: CanvasRenderingContext2D, house: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(house.position.x, house.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current * 1.4; // Aumentar para ocupar mais do tile isométrico

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate((house.rotation || 0) * Math.PI / 180);

    // Usar sprite se disponível
    const sprite = spritesRef.current[house.type];
    if (sprite && spritesLoadedRef.current) {
      // Desenhar sprite
      ctx.drawImage(sprite, -size/2, -size/2, size, size);
    } else {
      // Fallback para desenho básico se sprite não estiver disponível
      if (house.type === HouseType.FARMER) {
        // Casa do fazendeiro - estilo especial baseado na imagem
        // Base branca
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-size/2, -size/2, size, size);

        // Borda preta
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/2, -size/2, size, size);

        // Teto vermelho triangular
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(0, -size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Porta frontal (sempre na frente considerando rotação)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-size/8, size/4, size/4, size/4);
        ctx.strokeRect(-size/8, size/4, size/4, size/4);

        // Janelas
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-size/3, -size/8, size/6, size/6);
        ctx.fillRect(size/6, -size/8, size/6, size/6);
        ctx.strokeRect(-size/3, -size/8, size/6, size/6);
        ctx.strokeRect(size/6, -size/8, size/6, size/6);
      } else if (house.type === HouseType.LUMBERJACK) {
        // Casa do lenhador - estilo baseado na imagem anexada
        // Base bege/creme
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(-size/2, -size/2, size, size);

        // Borda preta
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/2, -size/2, size, size);

        // Teto marrom/laranja triangular
        ctx.fillStyle = '#D2691E';
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(0, -size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Porta de madeira escura
        ctx.fillStyle = '#654321';
        ctx.fillRect(-size/8, size/4, size/4, size/4);
        ctx.strokeRect(-size/8, size/4, size/4, size/4);

        // Janelas com moldura de madeira
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-size/3, -size/8, size/6, size/6);
        ctx.fillRect(size/6, -size/8, size/6, size/6);
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.strokeRect(-size/3, -size/8, size/6, size/6);
        ctx.strokeRect(size/6, -size/8, size/6, size/6);

        // Detalhes de madeira na fachada
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Linhas verticais de madeira
        ctx.moveTo(-size/4, -size/2);
        ctx.lineTo(-size/4, size/2);
        ctx.moveTo(size/4, -size/2);
        ctx.lineTo(size/4, size/2);
        ctx.stroke();
      } else if (house.type === HouseType.MINER) {
        // Casa do minerador - estilo robusto de pedra
        // Base marrom escuro (madeira/pedra)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-size/2, -size/2, size, size);

        // Borda preta grossa
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(-size/2, -size/2, size, size);

        // Teto de pedra cinza
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(0, -size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Porta reforçada de ferro
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(-size/8, size/4, size/4, size/4);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/8, size/4, size/4, size/4);

        // Janelas pequenas com grades
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-size/3, -size/8, size/8, size/8);
        ctx.fillRect(size/5, -size/8, size/8, size/8);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-size/3, -size/8, size/8, size/8);
        ctx.strokeRect(size/5, -size/8, size/8, size/8);

        // Grades nas janelas
        ctx.strokeStyle = '#2F4F4F';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Grade vertical esquerda
        ctx.moveTo(-size/3 + size/16, -size/8);
        ctx.lineTo(-size/3 + size/16, -size/8 + size/8);
        // Grade horizontal esquerda
        ctx.moveTo(-size/3, -size/8 + size/16);
        ctx.lineTo(-size/3 + size/8, -size/8 + size/16);
        // Grade vertical direita
        ctx.moveTo(size/5 + size/16, -size/8);
        ctx.lineTo(size/5 + size/16, -size/8 + size/8);
        // Grade horizontal direita
        ctx.moveTo(size/5, -size/8 + size/16);
        ctx.lineTo(size/5 + size/8, -size/8 + size/16);
        ctx.stroke();

        // Chaminé de pedra
        ctx.fillStyle = '#696969';
        ctx.fillRect(size/3, -size, size/8, size/2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(size/3, -size, size/8, size/2);
      } else {
        // Casa padrão (fallback)
        ctx.fillStyle = HOUSE_COLORS[house.type as HouseType] || '#808080';
        ctx.fillRect(-size/2, -size/2, size, size);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/2, -size/2, size, size);

        // Teto marrom
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(0, -size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [gridToScreen]);

  // Desenhar NPC (memoizado)
  const drawNPC = useCallback((ctx: CanvasRenderingContext2D, npc: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(npc.position.x, npc.position.z, canvasWidth, canvasHeight);
    const radius = CELL_SIZE * 0.4 * zoomRef.current;
    const isSelected = selectedNPC === npc.id;

    // Ajustar posição Y para que o NPC pareça estar no chão
    const npcY = screen.y + radius * 0.3; // Move o NPC ligeiramente para baixo

    ctx.save();

    // Handle chopping animation
    if (npc.animation && npc.animation.type === 'chopping') {
      const elapsed = Date.now() - npc.animation.startTime;
      const progress = elapsed / npc.animation.duration;

      if (progress < 1) {
        // Simple scale animation for chopping
        const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.1; // Quick pulse
        ctx.translate(screen.x, npcY);
        ctx.scale(scale, scale);
        ctx.translate(-screen.x, -npcY);
      }
    }

    // Color based on profession
    let npcColor = '#FF6B6B'; // Default farmer color
    if (npc.profession === 'LUMBERJACK') {
      npcColor = '#8B4513'; // Brown for lumberjack
    }

    // Corpo do NPC
    ctx.fillStyle = isSelected ? '#FF4444' : npcColor;
    ctx.beginPath();
    ctx.arc(screen.x, npcY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Borda
    ctx.strokeStyle = isSelected ? '#FF0000' : '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Profession indicator (small icon)
    if (npc.profession === 'LUMBERJACK') {
      // Draw small axe icon
      ctx.fillStyle = '#654321';
      ctx.fillRect(screen.x + radius * 0.5, npcY - radius * 0.8, 4, 12);
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(screen.x + radius * 0.5 - 2, npcY - radius * 0.8, 8, 4);
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

    // Olhos
    if (radius > 8) {
      const eyeSize = radius / 4;
      const eyeOffset = radius / 3;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(screen.x - eyeOffset, npcY - eyeOffset, eyeSize, 0, Math.PI * 2);
      ctx.arc(screen.x + eyeOffset, npcY - eyeOffset, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(screen.x - eyeOffset, npcY - eyeOffset, eyeSize/2, 0, Math.PI * 2);
      ctx.arc(screen.x + eyeOffset, npcY - eyeOffset, eyeSize/2, 0, Math.PI * 2);
      ctx.fill();
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
      const darkness = 1 - (1 - healthRatio) * 0.3;
      const r = Math.floor(parseInt(stoneColor.slice(1, 3), 16) * darkness);
      const g = Math.floor(parseInt(stoneColor.slice(3, 5), 16) * darkness);
      const b = Math.floor(parseInt(stoneColor.slice(5, 7), 16) * darkness);
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
      const seed = stone.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
      isHighlighted = priorityTree && priorityTree.id === tree.id;
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

    // Fundo
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar elementos
    drawGrid(ctx, canvas.width, canvas.height);

    // Desenhar pedras primeiro (fundo)
    Object.values(stones).forEach(stone => {
      drawStone(ctx, stone, canvas.width, canvas.height);
    });

    // Desenhar árvores
    Object.values(trees).forEach(tree => {
      drawTree(ctx, tree, canvas.width, canvas.height);
    });

    Object.values(houses).forEach(house => {
      drawHouse(ctx, house, canvas.width, canvas.height);
    });

    Object.values(npcs).forEach(npc => {
      drawNPC(ctx, npc, canvas.width, canvas.height);
    });

    // Draw text effects on top
    drawTextEffects(ctx, canvas.width, canvas.height);

    animationRef.current = requestAnimationFrame(animate);
  }, [houses, npcs, trees, stones, drawGrid, drawHouse, drawNPC, drawTree, drawStone, drawTextEffects]);

  // Manipular cliques no canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isPlacingHouse && selectedHouseType) {
      const gridPos = screenToGrid(x, y, canvas.width, canvas.height);
      if (isValidGridPosition(gridPos) && !getHouseAt(gridPos) && !getTreeAt(gridPos) && !getStoneAt(gridPos)) {
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
        display: 'block',
        cursor: isPlacingHouse ? 'crosshair' : 
               isDraggingRef.current ? 'grabbing' :
               Object.values(npcs).some(npc => npc.controlMode === NPCControlMode.CONTROLLED) ? 'default' : 'grab',
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