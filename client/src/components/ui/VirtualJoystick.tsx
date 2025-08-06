import { useRef, useEffect, useState } from 'react';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { NPCControlMode } from '../../lib/constants';
import { worldToGrid, gridToWorld, isValidGridPosition } from '../../lib/utils/grid';

export default function VirtualJoystick() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { npcs, updateNPCPosition } = useNPCStore();
  const { selectedNPC } = useGameStore();

  const currentNPC = selectedNPC && npcs[selectedNPC] ? npcs[selectedNPC] : null;
  const showJoystick = currentNPC && currentNPC.controlMode === NPCControlMode.CONTROLLED;

  useEffect(() => {
    if (!showJoystick) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!joystickRef.current || !knobRef.current || !currentNPC) return;

      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = rect.width / 2 - 20; // Account for knob size

      let normalizedX = deltaX / maxDistance;
      let normalizedY = deltaY / maxDistance;

      if (distance > maxDistance) {
        normalizedX = (deltaX / distance) * (maxDistance / maxDistance);
        normalizedY = (deltaY / distance) * (maxDistance / maxDistance);
      }

      // Update knob position
      knobRef.current.style.transform = `translate(${normalizedX * maxDistance}px, ${normalizedY * maxDistance}px)`;

      // Move NPC based on joystick input
      if (Math.abs(normalizedX) > 0.2 || Math.abs(normalizedY) > 0.2) {
        const newX = currentNPC.position.x + normalizedX * 0.1;
        const newZ = currentNPC.position.z + normalizedY * 0.1;
        
        const newGridPos = worldToGrid({ x: newX, z: newZ });
        if (isValidGridPosition(newGridPos)) {
          updateNPCPosition(currentNPC.id, { x: newX, z: newZ });
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate(0px, 0px)';
      }
    };

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, showJoystick, currentNPC, updateNPCPosition]);

  if (!showJoystick) return null;

  return (
    <div className="absolute bottom-8 left-8 z-20">
      <div
        ref={joystickRef}
        className="w-24 h-24 bg-gray-800/50 border-2 border-gray-600 rounded-full relative cursor-pointer touch-none"
        onPointerDown={(e) => {
          setIsDragging(true);
          e.preventDefault();
        }}
      >
        <div
          ref={knobRef}
          className="w-8 h-8 bg-white border-2 border-gray-400 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform"
          style={{ pointerEvents: 'none' }}
        />
      </div>
      <div className="text-center text-white text-xs mt-2 font-medium">
        Virtual Joystick
      </div>
    </div>
  );
}
