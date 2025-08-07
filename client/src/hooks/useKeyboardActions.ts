import { useEffect } from 'react';
import { useNPCStore } from '../lib/stores/useNPCStore';
import { useGameStore } from '../lib/stores/useGameStore';
import { NPCControlMode } from '../lib/types';

export const useKeyboardActions = () => {
  const { selectedNPC } = useGameStore();
  const { npcs, performWork, stopWork } = useNPCStore();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Verificar se há um NPC selecionado e controlado
      if (!selectedNPC || !npcs[selectedNPC]) return;
      
      const npc = npcs[selectedNPC];
      if (npc.controlMode !== NPCControlMode.CONTROLLED) return;

      // Evitar interferência com inputs de texto
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (npc.state === 'WORKING') {
            stopWork(selectedNPC);
          } else {
            // Disparar evento personalizado para processamento no GameWorld2D
            const customEvent = new CustomEvent('manualWork', { 
              detail: { npcId: selectedNPC } 
            });
            window.dispatchEvent(customEvent);
          }
          break;

        case 'KeyE':
          event.preventDefault();
          if (npc.state === 'WORKING') {
            stopWork(selectedNPC);
          } else {
            // Disparar evento personalizado para processamento no GameWorld2D
            const customEvent = new CustomEvent('manualWork', { 
              detail: { npcId: selectedNPC } 
            });
            window.dispatchEvent(customEvent);
          }
          break;

        case 'KeyQ':
          event.preventDefault();
          if (npc.state === 'WORKING') {
            const result = stopWork(selectedNPC);
            console.log('Parar trabalho:', result.message);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedNPC, npcs, performWork, stopWork]);
};