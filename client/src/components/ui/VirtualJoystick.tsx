import { useRef, useEffect, useState } from 'react';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { NPCControlMode } from '../../lib/constants';
import { worldToGrid, isValidGridPosition } from '../../lib/utils/grid';

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
        
        // Check bounds in world coordinates
        if (Math.abs(newX) <= 15 && Math.abs(newZ) <= 15) {
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
    <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 20 }}>
      <div className="win98-joystick-container">
        <div
          ref={joystickRef}
          className="win98-joystick-base"
          onPointerDown={(e) => {
            setIsDragging(true);
            e.preventDefault();
          }}
        >
          <div
            ref={knobRef}
            className="win98-joystick-knob"
          />
        </div>
        <div className="win98-label">
          Joystick
        </div>
      </div>
    </div>
  );
}
