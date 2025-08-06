import { useRef, useEffect, useCallback } from 'react';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { GRID_SIZE, CELL_SIZE, HOUSE_COLORS, HouseType, NPCControlMode } from '../../lib/constants';
import { gridToWorld, worldToGrid, isValidGridPosition } from '../../lib/utils/grid';

export default function GameWorld2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const { updateNPCMovement } = useNPCStore();
  
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse } = useGameStore();
  const { addHouse, getHouseAt } = useHouseStore();

  // Convert grid coordinates to screen coordinates (isometric view)
  const gridToScreen = useCallback((gridX: number, gridZ: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Isometric projection with larger scale for better visibility
    const scale = 3; // Increased scale to make everything bigger and closer
    const screenX = centerX + (gridX - gridZ) * CELL_SIZE * scale;
    const screenY = centerY + (gridX + gridZ) * CELL_SIZE * scale * 0.5;
    
    return { x: screenX, y: screenY };
  }, []);

  // Convert screen coordinates back to grid coordinates
  const screenToGrid = useCallback((screenX: number, screenY: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    const relX = screenX - centerX;
    const relY = screenY - centerY;
    
    // Inverse isometric transformation with scale adjustment
    const scale = 3;
    const gridX = Math.round((relX / (CELL_SIZE * scale) + relY / (CELL_SIZE * scale * 0.5)) / 2);
    const gridZ = Math.round((relY / (CELL_SIZE * scale * 0.5) - relX / (CELL_SIZE * scale)) / 2);
    
    return { x: gridX, z: gridZ };
  }, []);

  // Draw functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    
    // Smaller grid for better focus
    const gridSize = 8; // Reduced from GRID_SIZE
    const halfGrid = Math.floor(gridSize / 2);
    
    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const screen = gridToScreen(x, z, canvasWidth, canvasHeight);
        const screenRight = gridToScreen(x + 1, z, canvasWidth, canvasHeight);
        const screenDown = gridToScreen(x, z + 1, canvasWidth, canvasHeight);
        const screenDiag = gridToScreen(x + 1, z + 1, canvasWidth, canvasHeight);
        
        // Draw diamond shape for each grid cell
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

  const drawHouse = useCallback((ctx: CanvasRenderingContext2D, house: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(house.position.x, house.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * 2.5; // Increased size for better visibility
    
    // Draw house base (square)
    ctx.fillStyle = HOUSE_COLORS[house.type as HouseType];
    ctx.fillRect(screen.x - size/2, screen.y - size/2, size, size);
    
    // Draw house border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(screen.x - size/2, screen.y - size/2, size, size);
    
    // Draw simple roof (triangle)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(screen.x - size/2, screen.y - size/2);
    ctx.lineTo(screen.x + size/2, screen.y - size/2);
    ctx.lineTo(screen.x, screen.y - size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, [gridToScreen]);

  const drawNPC = useCallback((ctx: CanvasRenderingContext2D, npc: any, canvasWidth: number, canvasHeight: number) => {
    const worldPos = gridToWorld(npc.position);
    const screen = gridToScreen(worldPos.x / CELL_SIZE, worldPos.z / CELL_SIZE, canvasWidth, canvasHeight);
    const radius = CELL_SIZE * 1.2; // Increased radius for better visibility
    
    // Draw NPC as circle
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw NPC border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw simple eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(screen.x - radius/3, screen.y - radius/3, radius/6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x + radius/3, screen.y - radius/3, radius/6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(screen.x - radius/3, screen.y - radius/3, radius/12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x + radius/3, screen.y - radius/3, radius/12, 0, Math.PI * 2);
    ctx.fill();
  }, [gridToScreen]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Update NPC movement
    updateNPCMovement();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);
    
    // Draw houses
    Object.values(houses).forEach(house => {
      drawHouse(ctx, house, canvas.width, canvas.height);
    });
    
    // Draw NPCs
    Object.values(npcs).forEach(npc => {
      drawNPC(ctx, npc, canvas.width, canvas.height);
    });
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [houses, npcs, updateNPCMovement, drawGrid, drawHouse, drawNPC]);

  // Handle canvas click for house placement or NPC/house selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // If placing house, handle house placement
    if (isPlacingHouse && selectedHouseType) {
      const gridPos = screenToGrid(x, y, canvas.width, canvas.height);
      
      if (isValidGridPosition(gridPos) && !getHouseAt(gridPos)) {
        addHouse(selectedHouseType, gridPos);
        stopPlacingHouse();
      }
      return;
    }
    
    // Otherwise, check for NPC or house clicks
    // Check NPCs first
    const npcClicked = Object.values(npcs).find(npc => {
      const worldPos = gridToWorld(npc.position);
      const screen = gridToScreen(worldPos.x / CELL_SIZE, worldPos.z / CELL_SIZE, canvas.width, canvas.height);
      const distance = Math.sqrt((x - screen.x) ** 2 + (y - screen.y) ** 2);
      return distance <= CELL_SIZE * 1.2; // Updated NPC radius
    });
    
    if (npcClicked) {
      useGameStore.getState().selectNPC(npcClicked.id);
      return;
    }
    
    // Check houses
    const houseClicked = Object.values(houses).find(house => {
      const screen = gridToScreen(house.position.x, house.position.z, canvas.width, canvas.height);
      const size = CELL_SIZE * 2.5; // Updated house size
      return x >= screen.x - size/2 && x <= screen.x + size/2 && 
             y >= screen.y - size/2 && y <= screen.y + size/2;
    });
    
    if (houseClicked) {
      useGameStore.getState().selectHouse(houseClicked.id);
    }
  }, [isPlacingHouse, selectedHouseType, screenToGrid, getHouseAt, addHouse, stopPlacingHouse, npcs, houses, gridToScreen]);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set initial canvas size
    handleResize();
    
    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);
    
    // Add resize listener
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
      style={{
        display: 'block',
        cursor: isPlacingHouse ? 'crosshair' : 'default',
        background: '#90EE90'
      }}
    />
  );
}