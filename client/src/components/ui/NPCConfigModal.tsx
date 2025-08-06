import { useEffect, useState } from 'react';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { NPCControlMode, HOUSE_NAMES } from '../../lib/constants';
import { NPC, House } from '../../lib/types';

interface NPCConfigModalProps {
  open: boolean;
}

export default function NPCConfigModal({ open }: NPCConfigModalProps) {
  const { selectedNPC, selectedHouse, setShowNPCModal, clearSelection } = useGameStore();
  const { npcs, setNPCControlMode } = useNPCStore();
  const { houses } = useHouseStore();
  
  const [currentNPC, setCurrentNPC] = useState<NPC | null>(null);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);

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
      if (houses[selectedHouse].npcId && npcs[houses[selectedHouse].npcId]) {
        setCurrentNPC(npcs[houses[selectedHouse].npcId]);
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
    // Don't clear selection to keep joystick visible for controlled NPCs
    // clearSelection();
  };

  const handleSetControlMode = (mode: NPCControlMode) => {
    if (currentNPC) {
      setNPCControlMode(currentNPC.id, mode);
    }
  };

  if (!open || (!currentNPC && !currentHouse)) return null;

  return (
    <div className="win98-modal-overlay">
      <div className="win98-window" style={{ minWidth: '320px', maxWidth: '450px' }}>
        <div className="win98-window-header">
          <span>
            {currentNPC ? 'NPC Properties' : 'Building Properties'}
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
                {currentHouse?.type ? HOUSE_NAMES[currentHouse.type] : 'Unknown Building'}
              </div>
              <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                Position: ({currentHouse.position.x}, {currentHouse.position.z})
              </div>
              <div style={{ fontSize: '11px' }}>
                {currentHouse.npcId ? `Assigned NPC: ${currentHouse.npcId}` : 'No NPC assigned'}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
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
    </div>
  );
}
