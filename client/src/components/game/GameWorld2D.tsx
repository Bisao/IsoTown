
import { useRef, useEffect, useCallback } from 'react';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { GRID_SIZE, CELL_SIZE, HOUSE_COLORS, HouseType, NPCControlMode } from '../../lib/constants';
import { isValidGridPosition } from '../../lib/utils/grid';

export default function GameWorld2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const zoomRef = useRef(1.5);
  const panRef = useRef({ x: 0, y: 0 });

  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const { moveNPC, updateNPCMovement } = useNPCStore();
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse, selectedNPC, setCameraMode } = useGameStore();
  const { addHouse, getHouseAt } = useHouseStore();

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

  // Desenhar grid
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

  // Desenhar casa
  const drawHouse = useCallback((ctx: CanvasRenderingContext2D, house: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(house.position.x, house.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * zoomRef.current;
    
    // Base da casa
    ctx.fillStyle = HOUSE_COLORS[house.type as HouseType];
    ctx.fillRect(screen.x - size/2, screen.y - size/2, size, size);
    
    // Borda
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(screen.x - size/2, screen.y - size/2, size, size);
    
    // Teto
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(screen.x - size/2, screen.y - size/2);
    ctx.lineTo(screen.x + size/2, screen.y - size/2);
    ctx.lineTo(screen.x, screen.y - size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, [gridToScreen]);

  // Desenhar NPC
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

  // Loop de animação
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Atualizar movimento dos NPCs
    updateNPCMovement();

    // Seguir NPC selecionado com câmera
    if (selectedNPC && npcs[selectedNPC] && npcs[selectedNPC].controlMode === NPCControlMode.CONTROLLED) {
      const npc = npcs[selectedNPC];
      const targetScreen = gridToScreen(npc.position.x, npc.position.z, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const deltaX = centerX - targetScreen.x;
      const deltaY = centerY - targetScreen.y;
      
      panRef.current.x += deltaX * 0.1;
      panRef.current.y += deltaY * 0.1;
      
      zoomRef.current = Math.max(1.5, Math.min(3, zoomRef.current));
    }

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fundo
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar elementos
    drawGrid(ctx, canvas.width, canvas.height);
    
    Object.values(houses).forEach(house => {
      drawHouse(ctx, house, canvas.width, canvas.height);
    });
    
    Object.values(npcs).forEach(npc => {
      drawNPC(ctx, npc, canvas.width, canvas.height);
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [houses, npcs, updateNPCMovement, drawGrid, drawHouse, drawNPC, selectedNPC, gridToScreen]);

  // Manipular cliques no canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isPlacingHouse && selectedHouseType) {
      const gridPos = screenToGrid(x, y, canvas.width, canvas.height);
      if (isValidGridPosition(gridPos) && !getHouseAt(gridPos)) {
        addHouse(selectedHouseType, gridPos);
        stopPlacingHouse();
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

  // Manipular teclas para movimento
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
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
        event.preventDefault();
        moveNPC(selectedNPC, direction);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedNPC, npcs, moveNPC]);

  // Redimensionar canvas
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }, []);

  // Inicializar
  useEffect(() => {
    handleResize();
    animationRef.current = requestAnimationFrame(animate);
    
    window.addEventListener('resize', handleResize);
    
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
