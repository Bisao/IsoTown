import { useState, useEffect } from 'react';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { NPCControlMode, NPCProfession } from '../../lib/types';
// import { NPCActionSystem } from '../../lib/systems/NPCActionSystem';

export default function NPCActionButtons() {
  const { selectedNPC } = useGameStore();
  const { npcs, performWork, stopWork } = useNPCStore();
  const [message, setMessage] = useState<string>('');
  const [messageTimeout, setMessageTimeout] = useState<number | null>(null);

  // Limpar mensagem após timeout
  useEffect(() => {
    if (messageTimeout) {
      const timeout = setTimeout(() => {
        setMessage('');
        setMessageTimeout(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [messageTimeout]);

  // Mostrar mensagem temporária
  const showMessage = (text: string) => {
    setMessage(text);
    setMessageTimeout(Date.now());
  };

  if (!selectedNPC || !npcs[selectedNPC]) {
    return null;
  }

  const npc = npcs[selectedNPC];

  // Só mostrar para NPCs controlados
  if (npc.controlMode !== NPCControlMode.CONTROLLED) {
    return null;
  }

  // Obter informações sobre ações disponíveis
  const actionInfo = {
    canWork: npc.profession === NPCProfession.LUMBERJACK,
    actionName: npc.profession === NPCProfession.LUMBERJACK ? 'Cortar Árvore' : 'Trabalhar',
    message: npc.profession === NPCProfession.LUMBERJACK ? 'Procure árvores adjacentes' : 'Em desenvolvimento'
  };
  const nearbyInfo = `Posição: (${npc.position.x}, ${npc.position.z})`;

  const handleWork = () => {
    // Disparar evento personalizado para processamento no GameWorld2D
    const customEvent = new CustomEvent('manualWork', { 
      detail: { npcId: selectedNPC } 
    });
    window.dispatchEvent(customEvent);
    showMessage('Procurando árvores adjacentes...');
  };

  const handleStopWork = () => {
    const result = stopWork(selectedNPC);
    showMessage(result.message);
  };

  const getProfessionName = (profession: NPCProfession): string => {
    switch (profession) {
      case NPCProfession.LUMBERJACK: return 'Lenhador';
      case NPCProfession.FARMER: return 'Fazendeiro';
      case NPCProfession.MINER: return 'Minerador';
      default: return 'Sem profissão';
    }
  };

  const getWorkButtonText = (): string => {
    if (npc.state === 'WORKING') {
      return 'Trabalhando...';
    }
    return actionInfo.actionName || 'Trabalhar';
  };

  return (
    <div 
      className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg"
      style={{ 
        minWidth: '280px',
        maxWidth: '350px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000
      }}
    >
      <div className="mb-3">
        <div className="font-bold text-yellow-400">NPC Controlado</div>
        <div>Profissão: {getProfessionName(npc.profession)}</div>
        <div>Estado: {npc.state === 'IDLE' ? 'Ocioso' : 
                     npc.state === 'WORKING' ? 'Trabalhando' : 
                     npc.state === 'MOVING' ? 'Movendo' : npc.state}</div>
      </div>

      <div className="mb-3 text-xs text-gray-300">
        <div>{nearbyInfo}</div>
        <div>{actionInfo.message}</div>
      </div>

      {/* Barra de progresso se estiver trabalhando */}
      {npc.state === 'WORKING' && npc.currentTask && (
        <div className="mb-3">
          <div className="text-xs text-gray-300 mb-1">
            Progresso: {npc.currentTask.progress}/{npc.currentTask.maxProgress}
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(npc.currentTask.progress / npc.currentTask.maxProgress) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {npc.state !== 'WORKING' && (
          <button
            onClick={handleWork}
            disabled={!actionInfo.canWork}
            className={`px-3 py-2 rounded text-xs font-bold transition-colors ${
              actionInfo.canWork 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {getWorkButtonText()}
          </button>
        )}

        {npc.state === 'WORKING' && (
          <button
            onClick={handleStopWork}
            className="px-3 py-2 rounded text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Parar Trabalho
          </button>
        )}

        <div className="text-xs text-gray-400 mt-2">
          <div>WASD: Mover</div>
          <div>Espaço: {getWorkButtonText()}</div>
        </div>
      </div>

      {message && (
        <div className={`mt-2 p-2 rounded text-xs ${
          message.includes('!') && !message.includes('sucesso') 
            ? 'bg-red-600 text-white' 
            : 'bg-green-600 text-white'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}