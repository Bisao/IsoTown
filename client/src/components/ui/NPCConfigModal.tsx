import { useEffect, useState } from 'react';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { HOUSE_NAMES } from '../../lib/constants';
import { NPC, House, NPCControlMode } from '../../lib/types';
import { useDraggable } from '../../hooks/use-draggable';
import NPCInventoryModal from './NPCInventoryModal';

interface NPCConfigModalProps {
  open: boolean;
}

export default function NPCConfigModal({ open }: NPCConfigModalProps) {
  const { selectedNPC, selectedHouse, setShowNPCModal, clearSelection, focusWindow } = useGameStore();
  const { npcs, setNPCControlMode } = useNPCStore();
  const { houses } = useHouseStore();
  const { position, isDragging, elementRef, handleMouseDown } = useDraggable({
    x: window.innerWidth / 2 - 180,
    y: window.innerHeight / 2 - 200
  });

  const [currentNPC, setCurrentNPC] = useState<NPC | null>(null);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    if (selectedNPC && npcs[selectedNPC]) {
      setCurrentNPC(npcs[selectedNPC]);
      if (npcs[selectedNPC].houseId && houses[npcs[selectedNPC].houseId]) {
        setCurrentHouse(houses[npcs[selectedNPC].houseId]);
      } else {
        setCurrentHouse(null);
      }
    } else if (selectedHouse && houses[selectedHouse]) {
      setCurrentHouse(houses[selectedHouse]);
      // Find NPC assigned to this house
      const assignedNPC = Object.values(npcs).find(npc => npc.houseId === selectedHouse);
      if (assignedNPC) {
        setCurrentNPC(assignedNPC);
      } else {
        setCurrentNPC(null);
      }
    } else {
      setCurrentNPC(null);
      setCurrentHouse(null);
    }
  }, [selectedNPC, selectedHouse, npcs, houses]);

  const handleClose = () => {
    setShowNPCModal(false);
    // Only clear selection if NPC is not in controlled mode
    if (currentNPC && currentNPC.controlMode !== NPCControlMode.CONTROLLED) {
      clearSelection();
    }
  };

  const handleSetControlMode = (mode: NPCControlMode) => {
    if (currentNPC) {
      setNPCControlMode(currentNPC.id, mode);
    }
  };

  if (!open) return null;
  
  if (!currentNPC && !currentHouse) {
    console.warn('NPCConfigModal opened but no NPC or house selected');
    return null;
  }

  return (
    <div className="win98-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div
        ref={elementRef}
        className={`win98-window win98-draggable-window ${isDragging ? 'dragging' : ''}`}
        style={{ 
          minWidth: '320px', 
          maxWidth: '450px',
          left: position.x,
          top: position.y,
          margin: 0
        }}
        onClick={() => focusWindow('npc')}
      >
        <div 
          className={`win98-window-header ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <span>
            🔧 {currentNPC ? 'NPC Properties' : 'Building Properties'}
          </span>
          <div className="win98-close-button" onClick={handleClose}>×</div>
        </div>

        <div className="win98-window-body">
          {currentNPC && (
            <div className="win98-panel" style={{ marginBottom: '12px', padding: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                NPC: {currentNPC.id}
              </div>
              <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                Position: ({Math.round(currentNPC.position.x)}, {Math.round(currentNPC.position.z)})
              </div>
              <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                Mode: {currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? 'Autonomous' : 'Controlled'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => handleSetControlMode(NPCControlMode.AUTONOMOUS)}
                  className="win98-button"
                  style={{ 
                    padding: '4px 8px',
                    fontSize: '11px',
                    border: currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? '2px inset #c0c0c0' : '2px outset #c0c0c0'
                  }}
                >
                  Autonomous Movement
                </button>

                <button
                  onClick={() => handleSetControlMode(NPCControlMode.CONTROLLED)}
                  className="win98-button"
                  style={{ 
                    padding: '4px 8px',
                    fontSize: '11px',
                    border: currentNPC.controlMode === NPCControlMode.CONTROLLED ? '2px inset #c0c0c0' : '2px outset #c0c0c0'
                  }}
                >
                  Manual Control
                </button>
              </div>


            </div>
          )}

          {currentHouse && (
            <div className="win98-panel" style={{ marginBottom: '12px', padding: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                {currentHouse?.type ? HOUSE_NAMES[currentHouse.type as keyof typeof HOUSE_NAMES] : 'Unknown Building'}
              </div>
              <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                Position: ({currentHouse.position.x}, {currentHouse.position.z})
              </div>
              <div style={{ fontSize: '11px' }}>
                {Object.values(npcs).find(npc => npc.houseId === currentHouse.id) ? `Assigned NPC: ${Object.values(npcs).find(npc => npc.houseId === currentHouse.id)?.id}` : 'No NPC assigned'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            {currentNPC && (
              <button
                onClick={() => setShowInventory(true)}
                className="win98-button"
                style={{ minWidth: '75px' }}
              >
                Inventário
              </button>
            )}
            <button
              onClick={handleClose}
              className="win98-button"
              style={{ minWidth: '75px' }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal de Inventário */}
      {currentNPC && (
        <NPCInventoryModal
          npcId={currentNPC.id}
          isOpen={showInventory}
          onClose={() => setShowInventory(false)}
        />
      )}
    </div>
  );
}