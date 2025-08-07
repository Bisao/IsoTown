
import { useRef, useEffect, useCallback } from 'react';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { NPCControlMode } from '../../lib/types';

export default function VirtualJoystick() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMoveTimeRef = useRef(0);
  
  const { selectedNPC } = useGameStore();
  const { npcs, moveNPC } = useNPCStore();

  const handleMove = useCallback((direction: {x: number, z: number}) => {
    if (!selectedNPC || !npcs[selectedNPC] || 
        npcs[selectedNPC].controlMode !== NPCControlMode.CONTROLLED ||
        npcs[selectedNPC].isMoving) {
      return;
    }

    const now = Date.now();
    if (now - lastMoveTimeRef.current < 300) return; // Throttle movement
    
    lastMoveTimeRef.current = now;
    moveNPC(selectedNPC, direction);
  }, [selectedNPC, npcs, moveNPC]);

  const updateKnobPosition = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current || !knobRef.current) return;

    const joystick = joystickRef.current;
    const knob = knobRef.current;
    const rect = joystick.getBoundingClientRect();
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 15;
    
    let knobX = deltaX;
    let knobY = deltaY;
    
    if (distance > maxDistance) {
      knobX = (deltaX / distance) * maxDistance;
      knobY = (deltaY / distance) * maxDistance;
    }
    
    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    
    // Detectar direção do movimento
    const threshold = 20;
    if (Math.abs(knobX) > threshold || Math.abs(knobY) > threshold) {
      let direction = { x: 0, z: 0 };
      
      if (Math.abs(knobX) > Math.abs(knobY)) {
        direction.x = knobX > 0 ? 1 : -1;
      } else {
        direction.z = knobY > 0 ? 1 : -1;
      }
      
      handleMove(direction);
    }
  }, [handleMove]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    updateKnobPosition(clientX, clientY);
  }, [updateKnobPosition]);

  const handleMove2 = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    updateKnobPosition(clientX, clientY);
  }, [updateKnobPosition]);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
  }, []);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove2(e.clientX, e.clientY);
  }, [handleMove2]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      handleMove2(touch.clientX, touch.clientY);
    }
  }, [handleMove2]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();
    const handleGlobalTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const handleGlobalTouchEnd = (e: TouchEvent) => handleTouchEnd(e);

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Só mostrar se houver NPC controlado
  if (!selectedNPC || !npcs[selectedNPC] || npcs[selectedNPC].controlMode !== NPCControlMode.CONTROLLED) {
    return null;
  }

  return (
    <div
      ref={joystickRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'absolute',
        bottom: '80px',
        right: '20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '3px solid #C0C0C0',
        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        userSelect: 'none',
        zIndex: 1000
      }}
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '25px',
          height: '25px',
          borderRadius: '50%',
          background: '#C0C0C0',
          border: '2px solid #808080',
          transform: 'translate(-50%, -50%)',
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
