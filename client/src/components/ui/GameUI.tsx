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
        <div className="win98-panel" style={{ marginLeft: '8px', flex: 1, padding: '4px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'MS Sans Serif, sans-serif', color: 'var(--win98-text)' }}>
            SimCity 98 - Building Game
          </span>
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

      

      {/* Mobile Virtual Joystick */}
      {isMobile && <VirtualJoystick />}

      {/* Modals */}
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </>
  );
}
