import { useIsMobile } from '../../hooks/use-is-mobile';
import HouseSelectionModal from './HouseSelectionModal';
import NPCConfigModal from './NPCConfigModal';
import VirtualJoystick from './VirtualJoystick';
import { useGameStore } from '../../lib/stores/useGameStore';

export default function GameUI() {
  const isMobile = useIsMobile();
  const { showHouseModal, showNPCModal, setShowHouseModal } = useGameStore();

  return (
    <>
      {/* Windows 98 Style Toolbar */}
      <div className="win98-game-ui">
        <button
          onClick={() => setShowHouseModal(true)}
          className="win98-button"
        >
          🏠 Build
        </button>
        <button
          onClick={() => {
            // Add NPC at center of map
            import('../../lib/stores/useNPCStore').then(({ useNPCStore }) => {
              useNPCStore.getState().addNPC({ x: 0, z: 0 });
            });
          }}
          className="win98-button"
        >
          👤 Add NPC
        </button>
        <div className="win98-panel" style={{ marginLeft: '8px', flex: 1 }}>
          <span style={{ fontSize: '11px' }}>SimCity 98 - Isometric Building Game</span>
        </div>
      </div>

      {/* Windows 98 Style Status Bar */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        height: '20px',
        background: 'var(--win98-surface)',
        border: '2px inset var(--win98-surface)',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '8px',
        fontSize: '11px',
        zIndex: 1000
      }}>
        <span>Ready</span>
        <div style={{ marginLeft: 'auto', marginRight: '8px' }}>
          Use pinch-to-zoom on mobile
        </div>
      </div>

      {/* Windows 98 Style Instructions Panel */}
      <div style={{
        position: 'absolute',
        top: '50px',
        right: '8px',
        width: '240px',
        zIndex: 10
      }}>
        <div className="win98-window">
          <div className="win98-window-header">
            <span>Instructions</span>
            <div className="win98-close-button">×</div>
          </div>
          <div className="win98-window-body">
            <div style={{ fontSize: '11px', lineHeight: '1.3' }}>
              <strong>How to Play:</strong><br/><br/>
              • Click "Place House" to build<br/>
              • Click on grid to place house<br/>
              • Use pinch-to-zoom on mobile<br/>
              • Right-click NPCs to configure<br/>
              • Switch control modes as needed
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Virtual Joystick */}
      {isMobile && <VirtualJoystick />}

      {/* Modals */}
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </>
  );
}
