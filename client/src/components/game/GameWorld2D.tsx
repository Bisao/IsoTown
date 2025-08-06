import { useRef, useEffect, useCallback } from 'react';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { GRID_SIZE, CELL_SIZE, HOUSE_COLORS, HouseType, NPCControlMode } from '../../lib/constants';
import { gridToWorld, worldToGrid, isValidGridPosition } from '../../lib/utils/grid';

export default function GameWorld2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Zoom and pan state
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number, y: number } | null>(null);
  
  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const { updateNPCMovement } = useNPCStore();
  
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse } = useGameStore();
  const { addHouse, getHouseAt } = useHouseStore();

  // Convert grid coordinates to screen coordinates (isometric view)
  const gridToScreen = useCallback((gridX: number, gridZ: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Isometric projection with zoom and pan
    const scale = 3 * zoomRef.current;
    const screenX = centerX + panRef.current.x + (gridX - gridZ) * CELL_SIZE * scale;
    const screenY = centerY + panRef.current.y + (gridX + gridZ) * CELL_SIZE * scale * 0.5;
    
    return { x: screenX, y: screenY };
  }, []);

  // Convert screen coordinates back to grid coordinates
  const screenToGrid = useCallback((screenX: number, screenY: number, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    const relX = screenX - centerX - panRef.current.x;
    const relY = screenY - centerY - panRef.current.y;
    
    // Inverse isometric transformation with scale adjustment
    const scale = 3 * zoomRef.current;
    const gridX = Math.round((relX / (CELL_SIZE * scale) + relY / (CELL_SIZE * scale * 0.5)) / 2);
    const gridZ = Math.round((relY / (CELL_SIZE * scale * 0.5) - relX / (CELL_SIZE * scale)) / 2);
    
    return { x: gridX, z: gridZ };
  }, []);

  // Draw functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Save context state
    ctx.save();
    
    ctx.strokeStyle = '#AAAAAA';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    
    // Fixed grid size for stability
    const gridSize = 10;
    const halfGrid = Math.floor(gridSize / 2);
    
    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const screen = gridToScreen(x, z, canvasWidth, canvasHeight);
        const screenRight = gridToScreen(x + 1, z, canvasWidth, canvasHeight);
        const screenDown = gridToScreen(x, z + 1, canvasWidth, canvasHeight);
        const screenDiag = gridToScreen(x + 1, z + 1, canvasWidth, canvasHeight);
        
        // Only draw if cell is visible on screen
        if (screen.x > -100 && screen.x < canvasWidth + 100 && 
            screen.y > -100 && screen.y < canvasHeight + 100) {
          
          // Draw diamond shape for each grid cell
          ctx.beginPath();
          ctx.moveTo(Math.round(screen.x), Math.round(screen.y));
          ctx.lineTo(Math.round(screenRight.x), Math.round(screenRight.y));
          ctx.lineTo(Math.round(screenDiag.x), Math.round(screenDiag.y));
          ctx.lineTo(Math.round(screenDown.x), Math.round(screenDown.y));
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    
    // Restore context state
    ctx.restore();
  }, [gridToScreen]);

  const drawHouse = useCallback((ctx: CanvasRenderingContext2D, house: any, canvasWidth: number, canvasHeight: number) => {
    const screen = gridToScreen(house.position.x, house.position.z, canvasWidth, canvasHeight);
    const size = CELL_SIZE * 2.5;
    
    // Only draw if house is visible on screen
    if (screen.x < -size || screen.x > canvasWidth + size || 
        screen.y < -size || screen.y > canvasHeight + size) {
      return;
    }
    
    ctx.save();
    
    // Draw house base (square)
    ctx.fillStyle = HOUSE_COLORS[house.type as HouseType];
    ctx.fillRect(Math.round(screen.x - size/2), Math.round(screen.y - size/2), size, size);
    
    // Draw house border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(screen.x - size/2), Math.round(screen.y - size/2), size, size);
    
    // Draw simple roof (triangle)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(Math.round(screen.x - size/2), Math.round(screen.y - size/2));
    ctx.lineTo(Math.round(screen.x + size/2), Math.round(screen.y - size/2));
    ctx.lineTo(Math.round(screen.x), Math.round(screen.y - size));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }, [gridToScreen]);

  const drawNPC = useCallback((ctx: CanvasRenderingContext2D, npc: any, canvasWidth: number, canvasHeight: number) => {
    const worldPos = gridToWorld(npc.position);
    const screen = gridToScreen(worldPos.x / CELL_SIZE, worldPos.z / CELL_SIZE, canvasWidth, canvasHeight);
    const radius = CELL_SIZE * 1.2;
    
    // Only draw if NPC is visible on screen
    if (screen.x < -radius || screen.x > canvasWidth + radius || 
        screen.y < -radius || screen.y > canvasHeight + radius) {
      return;
    }
    
    ctx.save();
    
    // Draw NPC as circle
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(Math.round(screen.x), Math.round(screen.y), radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw NPC border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw simple eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(Math.round(screen.x - radius/3), Math.round(screen.y - radius/3), radius/6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.round(screen.x + radius/3), Math.round(screen.y - radius/3), radius/6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(Math.round(screen.x - radius/3), Math.round(screen.y - radius/3), radius/12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.round(screen.x + radius/3), Math.round(screen.y - radius/3), radius/12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, [gridToScreen]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Update NPC movement
    updateNPCMovement();
    
    // Save and clear canvas with proper compositing
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid (more stable)
    drawGrid(ctx, canvas.width, canvas.height);
    
    // Draw houses
    const houseValues = Object.values(houses);
    if (houseValues.length > 0) {
      houseValues.forEach(house => {
        drawHouse(ctx, house, canvas.width, canvas.height);
      });
    }
    
    // Draw NPCs (only if they exist)
    const npcValues = Object.values(npcs);
    if (npcValues.length > 0) {
      npcValues.forEach(npc => {
        drawNPC(ctx, npc, canvas.width, canvas.height);
      });
    }
    
    ctx.restore();
    
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
      return distance <= CELL_SIZE * 1.2 * zoomRef.current; // Scale with zoom
    });
    
    if (npcClicked) {
      useGameStore.getState().selectNPC(npcClicked.id);
      return;
    }
    
    // Check houses
    const houseClicked = Object.values(houses).find(house => {
      const screen = gridToScreen(house.position.x, house.position.z, canvas.width, canvas.height);
      const size = CELL_SIZE * 2.5 * zoomRef.current; // Scale with zoom
      return x >= screen.x - size/2 && x <= screen.x + size/2 && 
             y >= screen.y - size/2 && y <= screen.y + size/2;
    });
    
    if (houseClicked) {
      useGameStore.getState().selectHouse(houseClicked.id);
    }
  }, [isPlacingHouse, selectedHouseType, screenToGrid, getHouseAt, addHouse, stopPlacingHouse, npcs, houses, gridToScreen]);

  // Touch event handlers for pinch-to-zoom
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(
        (touch2.clientX - touch1.clientX) ** 2 + (touch2.clientY - touch1.clientY) ** 2
      );
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      lastTouchDistanceRef.current = distance;
      lastTouchCenterRef.current = { x: centerX, y: centerY };
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault(); // Prevent scrolling
    
    if (event.touches.length === 2 && lastTouchDistanceRef.current && lastTouchCenterRef.current) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(
        (touch2.clientX - touch1.clientX) ** 2 + (touch2.clientY - touch1.clientY) ** 2
      );
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // Calculate zoom change
      const zoomDelta = distance / lastTouchDistanceRef.current;
      const newZoom = Math.max(0.3, Math.min(3, zoomRef.current * zoomDelta));
      zoomRef.current = newZoom;
      
      // Calculate pan based on center movement
      const panDeltaX = centerX - lastTouchCenterRef.current.x;
      const panDeltaY = centerY - lastTouchCenterRef.current.y;
      
      panRef.current.x += panDeltaX;
      panRef.current.y += panDeltaY;
      
      lastTouchDistanceRef.current = distance;
      lastTouchCenterRef.current = { x: centerX, y: centerY };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistanceRef.current = null;
    lastTouchCenterRef.current = null;
  }, []);

  // Wheel event for desktop zoom
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current * zoomFactor));
    zoomRef.current = newZoom;
  }, []);

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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={{
        display: 'block',
        cursor: isPlacingHouse ? 'crosshair' : 'default',
        background: '#90EE90',
        touchAction: 'none' // Prevent default touch behaviors
      }}
    />
  );
}