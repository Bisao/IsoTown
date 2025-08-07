
import { useRef, useEffect, useCallback } from 'react';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useTreeStore } from '../../lib/stores/useTreeStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { GRID_SIZE, CELL_SIZE, HOUSE_COLORS, HouseType, NPCControlMode, TREE_COLOR } from '../../lib/constants';
import { isValidGridPosition } from '../../lib/utils/grid';

export default function GameWorld2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const zoomRef = useRef(1.5);
  const panRef = useRef({ x: 0, y: 0 });
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const spritesLoadedRef = useRef(false);

  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const trees = useTreeStore(state => state.trees);
  const { moveNPC, updateNPCMovement, addNPC } = useNPCStore();
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse, selectedNPC, setCameraMode, currentRotation, rotateCurrentPlacement } = useGameStore();
  const { addHouse, getHouseAt, rotateHouse } = useHouseStore();
  const { generateRandomTrees, getTreeAt } = useTreeStore();

  // Carregar sprites das casas
  useEffect(() => {
    const loadSprites = async () => {
      const sprites: Record<string, HTMLImageElement> = {};
      
      const spriteMap = {
        [HouseType.FARMER]: '/sprites/houses/farmer_house.png',
        [HouseType.LUMBERJACK]: '/sprites/houses/lumberjack_house.png',
        [HouseType.MEDIUM]: '/sprites/houses/medium_house.png',
        [HouseType.SMALL]: '/sprites/houses/medium_house.png', // Usar a mesma sprite por enquanto
        [HouseType.LARGE]: '/sprites/houses/medium_house.png'   // Usar a mesma sprite por enquanto
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

  // Gerar árvores aleatórias na primeira renderização
  useEffect(() => {
    const treeCount = Object.keys(trees).length;
    if (treeCount === 0) {
      console.log('Gerando árvores aleatórias...');
      generateRandomTrees();
    }
  }, [generateRandomTrees, trees]);
  
  

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
    const size = CELL_SIZE * zoomRef.current;
    
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
      } else {
        // Casa padrão
        ctx.fillStyle = HOUSE_COLORS[house.type as HouseType];
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
    
    // Corpo do NPC
    ctx.fillStyle = isSelected ? '#FF4444' : '#FF6B6B';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Borda
    ctx.strokeStyle = isSelected ? '#FF0000' : '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Olhos
    if (radius > 8) {
      const eyeSize = radius / 4;
      const eyeOffset = radius / 3;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(screen.x - eyeOffset, screen.y - eyeOffset, eyeSize, 0, Math.PI * 2);
      ctx.arc(screen.x + eyeOffset, screen.y - eyeOffset, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(screen.x - eyeOffset, screen.y - eyeOffset, eyeSize/2, 0, Math.PI * 2);
      ctx.arc(screen.x + eyeOffset, screen.y - eyeOffset, eyeSize/2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [gridToScreen, selectedNPC]);

  // Desenhar árvore (memoizado)
  const drawTree = useCallback((ctx: CanvasRenderingContext2D, tree: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(tree.position.x, tree.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current;
    
    // Tronco
    const trunkWidth = size * 0.2;
    const trunkHeight = size * 0.5;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screen.x - trunkWidth/2, screen.y - trunkHeight/2, trunkWidth, trunkHeight);
    
    // Copa da árvore baseada no tipo
    const foliageRadius = size * 0.4;
    ctx.fillStyle = tree.type === 'birch' ? '#90EE90' : 
                    tree.type === 'oak' ? '#228B22' : '#006400';
    
    if (tree.type === 'pine') {
      // Árvore triangular (pinheiro)
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y - size * 0.6);
      ctx.lineTo(screen.x - foliageRadius, screen.y + size * 0.1);
      ctx.lineTo(screen.x + foliageRadius, screen.y + size * 0.1);
      ctx.closePath();
      ctx.fill();
    } else {
      // Árvore circular (carvalho/bétula)
      ctx.beginPath();
      ctx.arc(screen.x, screen.y - size * 0.2, foliageRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Borda
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [gridToScreen]);

  // Timer para atualização dos NPCs (separado do loop de animação)
  useEffect(() => {
    const npcUpdateInterval = setInterval(() => {
      updateNPCMovement();
    }, 100); // Atualizar NPCs a cada 100ms, não a cada frame

    return () => clearInterval(npcUpdateInterval);
  }, [updateNPCMovement]);

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
    
    // Desenhar árvores primeiro (fundo)
    Object.values(trees).forEach(tree => {
      drawTree(ctx, tree, canvas.width, canvas.height);
    });
    
    Object.values(houses).forEach(house => {
      drawHouse(ctx, house, canvas.width, canvas.height);
    });
    
    Object.values(npcs).forEach(npc => {
      drawNPC(ctx, npc, canvas.width, canvas.height);
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [houses, npcs, trees, drawGrid, drawHouse, drawNPC, drawTree]);

  // Manipular cliques no canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isPlacingHouse && selectedHouseType) {
      const gridPos = screenToGrid(x, y, canvas.width, canvas.height);
      if (isValidGridPosition(gridPos) && !getHouseAt(gridPos) && !getTreeAt(gridPos)) {
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
      style={{
        display: 'block',
        cursor: isPlacingHouse ? 'crosshair' : 'default',
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
