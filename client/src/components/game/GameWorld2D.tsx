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
  const zoomRef = useRef(2.5);
  const panRef = useRef({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number, y: number } | null>(null);

  const houses = useHouseStore(state => state.houses);
  const npcs = useNPCStore(state => state.npcs);
  const { updateNPCMovement } = useNPCStore();

  const { isPlacingHouse, selectedHouseType, stopPlacingHouse, selectedNPC } = useGameStore();
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
    ctx.strokeStyle = '#AAAAAA';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;

    // Optimized grid size for better performance
    const gridSize = 25;
    const halfGrid = Math.floor(gridSize / 2);

    // Pre-calculate scale for better performance
    const scale = 3 * zoomRef.current;
    const cellScale = CELL_SIZE * scale;
    const gridOffsetX = Math.floor(-panRef.current.x / (cellScale * 2));
    const gridOffsetZ = Math.floor(-panRef.current.y / cellScale);

    // Batch drawing operations for better performance
    ctx.beginPath();
    
    for (let x = -halfGrid + gridOffsetX; x <= halfGrid + gridOffsetX; x++) {
      for (let z = -halfGrid + gridOffsetZ; z <= halfGrid + gridOffsetZ; z++) {
        // Quick visibility check
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const screenX = centerX + panRef.current.x + (x - z) * cellScale;
        const screenY = centerY + panRef.current.y + (x + z) * cellScale * 0.5;

        // Only draw if visible (optimized bounds)
        if (screenX > -100 && screenX < canvasWidth + 100 && 
            screenY > -100 && screenY < canvasHeight + 100) {

          // Calculate all four corners once
          const rightX = centerX + panRef.current.x + ((x + 1) - z) * cellScale;
          const rightY = centerY + panRef.current.y + ((x + 1) + z) * cellScale * 0.5;
          
          const downX = centerX + panRef.current.x + (x - (z + 1)) * cellScale;
          const downY = centerY + panRef.current.y + (x + (z + 1)) * cellScale * 0.5;
          
          const diagX = centerX + panRef.current.x + ((x + 1) - (z + 1)) * cellScale;
          const diagY = centerY + panRef.current.y + ((x + 1) + (z + 1)) * cellScale * 0.5;

          // Draw diamond shape
          ctx.moveTo(Math.round(screenX), Math.round(screenY));
          ctx.lineTo(Math.round(rightX), Math.round(rightY));
          ctx.lineTo(Math.round(diagX), Math.round(diagY));
          ctx.lineTo(Math.round(downX), Math.round(downY));
          ctx.closePath();
        }
      }
    }
    
    ctx.stroke();
  }, []);

  const drawHouse = useCallback((ctx: CanvasRenderingContext2D, house: any, canvasWidth: number, canvasHeight: number) => {
    // Pre-calculate values for better performance
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const scale = 3 * zoomRef.current;
    const cellScale = CELL_SIZE * scale;
    
    const screenX = centerX + panRef.current.x + (house.position.x - house.position.z) * cellScale;
    const screenY = centerY + panRef.current.y + (house.position.x + house.position.z) * cellScale * 0.5;
    const size = CELL_SIZE * 2.5 * zoomRef.current;

    // Optimized visibility check
    if (screenX < -size || screenX > canvasWidth + size || 
        screenY < -size || screenY > canvasHeight + size) {
      return;
    }

    const halfSize = size / 2;
    const x = Math.round(screenX - halfSize);
    const y = Math.round(screenY - halfSize);

    // Draw house base efficiently
    ctx.fillStyle = HOUSE_COLORS[house.type as HouseType];
    ctx.fillRect(x, y, size, size);

    // Draw house border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 2 * zoomRef.current);
    ctx.strokeRect(x, y, size, size);

    // Draw roof efficiently
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(Math.round(screenX), Math.round(screenY - size));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, []);

  const drawNPC = useCallback((ctx: CanvasRenderingContext2D, npc: any, canvasWidth: number, canvasHeight: number) => {
    // Pre-calculate for better performance
    const worldPos = gridToWorld(npc.position);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const scale = 3 * zoomRef.current;
    const cellScale = CELL_SIZE * scale;
    
    const gridX = worldPos.x / CELL_SIZE;
    const gridZ = worldPos.z / CELL_SIZE;
    const screenX = centerX + panRef.current.x + (gridX - gridZ) * cellScale;
    const screenY = centerY + panRef.current.y + (gridX + gridZ) * cellScale * 0.5;
    const radius = CELL_SIZE * 1.2 * zoomRef.current;

    // Optimized visibility check
    if (screenX < -radius || screenX > canvasWidth + radius || 
        screenY < -radius || screenY > canvasHeight + radius) {
      return;
    }

    const x = Math.round(screenX);
    const y = Math.round(screenY);
    const isSelected = selectedNPC === npc.id;

    // Draw NPC body efficiently
    ctx.fillStyle = isSelected ? '#FF4444' : '#FF6B6B';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isSelected ? '#FF0000' : '#000000';
    ctx.lineWidth = Math.max(1, 2 * zoomRef.current);
    ctx.stroke();

    // Draw eyes only if NPC is large enough
    if (radius > 8) {
      const eyeSize = Math.max(2, radius / 6);
      const pupilSize = Math.max(1, radius / 12);
      const eyeOffset = radius / 3;
      
      // White of eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x - eyeOffset, y - eyeOffset, eyeSize, 0, Math.PI * 2);
      ctx.arc(x + eyeOffset, y - eyeOffset, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x - eyeOffset, y - eyeOffset, pupilSize, 0, Math.PI * 2);
      ctx.arc(x + eyeOffset, y - eyeOffset, pupilSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [selectedNPC]);

  // Performance tracking
  const lastFrameTime = useRef(0);
  const frameCount = useRef(0);
  
  // Animation loop with performance optimization
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limit frame rate to 60fps for better performance
    if (currentTime - lastFrameTime.current < 16.67) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;

    // Update NPC movement only every 3rd frame for better performance
    frameCount.current++;
    if (frameCount.current % 3 === 0) {
      updateNPCMovement();
    }

    // Follow controlled NPC with camera (optimized)
    if (selectedNPC && npcs[selectedNPC] && npcs[selectedNPC].controlMode === 'CONTROLLED') {
      const npc = npcs[selectedNPC];
      const worldPos = gridToWorld(npc.position);
      const targetGridX = worldPos.x / CELL_SIZE;
      const targetGridZ = worldPos.z / CELL_SIZE;
      
      const targetScreen = gridToScreen(targetGridX, targetGridZ, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Smooth camera follow with better interpolation
      const deltaX = centerX - targetScreen.x;
      const deltaY = centerY - targetScreen.y;
      
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        panRef.current.x += deltaX * 0.08;
        panRef.current.y += deltaY * 0.08;
      }
      
      // Set closer zoom for controlled NPCs
      const targetZoom = 3.5;
      if (Math.abs(zoomRef.current - targetZoom) > 0.01) {
        zoomRef.current += (targetZoom - zoomRef.current) * 0.05;
      }
    } else {
      // Return to normal zoom when not controlling
      const targetZoom = 2.5;
      if (Math.abs(zoomRef.current - targetZoom) > 0.01) {
        zoomRef.current += (targetZoom - zoomRef.current) * 0.02;
      }
    }

    // Clear canvas efficiently
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid with optimized rendering
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw houses efficiently
    const houseValues = Object.values(houses);
    for (const house of houseValues) {
      drawHouse(ctx, house, canvas.width, canvas.height);
    }

    // Draw NPCs efficiently
    const npcValues = Object.values(npcs);
    for (const npc of npcValues) {
      drawNPC(ctx, npc, canvas.width, canvas.height);
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [houses, npcs, updateNPCMovement, drawGrid, drawHouse, drawNPC, selectedNPC, gridToScreen, gridToWorld]);

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
    if (!canvas || !canvas.parentElement) return;

    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }, []);

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas size
    handleResize();

    // Start animation loop with initial timestamp
    animationRef.current = requestAnimationFrame((time) => animate(time));

    // Add resize listener with throttling
    let resizeTimeout: NodeJS.Timeout;
    const throttledResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', throttledResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', throttledResize);
      clearTimeout(resizeTimeout);
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
        width: '100%',
        height: '100%',
        touchAction: 'none' // Prevent default touch behaviors
      }}
    />
  );
}