import { useEffect, useState } from 'react';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { HOUSE_NAMES } from '../../lib/constants';
import { NPC, House, NPCControlMode } from '../../lib/types';
import { useDraggable } from '../../hooks/use-draggable';
import NPCInventoryModal from './NPCInventoryModal';
import { logger } from '../../lib/utils/logger';

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
    logger.warn('NPCConfigModal opened but no NPC or house selected');
    return null;
  }

  return (
    <>
      {/* Windows 98 overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />
      
      {/* Windows 98 Modal Window */}
      <div
        ref={elementRef}
        className="win98-window fixed z-50"
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
            <div className="win98-group-box">
              <div className="win98-text-bold" style={{ marginBottom: '6px' }}>
                NPC Information
              </div>
              <div className="win98-field-row">
                <div className="win98-field-label">Name:</div>
                <div className="win98-text">{currentNPC.id.slice(0, 12)}...</div>
              </div>
              <div className="win98-field-row">
                <div className="win98-field-label">Position:</div>
                <div className="win98-text">({Math.round(currentNPC.position.x)}, {Math.round(currentNPC.position.z)})</div>
              </div>
              <div className="win98-field-row">
                <div className="win98-field-label">Control Mode:</div>
                <div className="win98-text">{currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? 'Autonomous' : 'Manual Control'}</div>
              </div>

              <div className="win98-field-row" style={{ marginTop: '12px' }}>
                <div className="win98-field-label">Change Control Mode:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleSetControlMode(NPCControlMode.AUTONOMOUS)}
                    className="win98-button"
                    style={{ 
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? '2px inset #c0c0c0' : '2px outset #c0c0c0',
                      backgroundColor: currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? '#a0a0a0' : '#c0c0c0'
                    }}
                  >
                    ○ Autonomous Movement
                  </button>

                  <button
                    onClick={() => handleSetControlMode(NPCControlMode.CONTROLLED)}
                    className="win98-button"
                    style={{ 
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: currentNPC.controlMode === NPCControlMode.CONTROLLED ? '2px inset #c0c0c0' : '2px outset #c0c0c0',
                      backgroundColor: currentNPC.controlMode === NPCControlMode.CONTROLLED ? '#a0a0a0' : '#c0c0c0'
                    }}
                  >
                    ● Manual Control
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentHouse && (
            <div className="win98-group-box">
              <div className="win98-text-bold" style={{ marginBottom: '6px' }}>
                Building Information
              </div>
              <div className="win98-field-row">
                <div className="win98-field-label">Type:</div>
                <div className="win98-text">{currentHouse?.type ? HOUSE_NAMES[currentHouse.type as keyof typeof HOUSE_NAMES] : 'Unknown Building'}</div>
              </div>
              <div className="win98-field-row">
                <div className="win98-field-label">Position:</div>
                <div className="win98-text">({currentHouse.position.x}, {currentHouse.position.z})</div>
              </div>
              <div className="win98-field-row">
                <div className="win98-field-label">Resident:</div>
                <div className="win98-text">
                  {Object.values(npcs).find(npc => npc.houseId === currentHouse.id) 
                    ? `${Object.values(npcs).find(npc => npc.houseId === currentHouse.id)?.id.slice(0, 12)}...` 
                    : 'No NPC assigned'}
                </div>
              </div>
            </div>
          )}

          <div className="win98-status-bar" style={{ marginTop: '8px', justifyContent: 'space-between', display: 'flex' }}>
            {currentNPC && (
              <button
                onClick={() => setShowInventory(true)}
                className="win98-button"
                style={{ minWidth: '80px', fontSize: '11px', padding: '4px 8px' }}
              >
                📦 Inventory
              </button>
            )}
            <button
              onClick={handleClose}
              className="win98-button"
              style={{ minWidth: '80px', fontSize: '11px', padding: '4px 8px' }}
            >
              ✓ OK
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
    </>
  );
}