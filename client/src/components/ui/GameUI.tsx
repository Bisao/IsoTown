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
          style={{ 
            fontSize: isMobile ? '12px' : '11px',
            padding: isMobile ? '8px 12px' : '4px 8px',
            minWidth: isMobile ? '80px' : 'auto'
          }}
        >
          🏠 {isMobile ? '' : 'Build'}
        </button>
        <div className="win98-panel" style={{ 
          marginLeft: '8px', 
          flex: 1, 
          padding: isMobile ? '8px 4px' : '4px',
          overflow: 'hidden'
        }}>
          <span style={{ 
            fontSize: isMobile ? '10px' : '11px', 
            fontFamily: 'MS Sans Serif, sans-serif', 
            color: 'var(--win98-text)',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}>
            {isMobile ? 'SimCity 98' : 'SimCity 98 - Building Game'}
          </span>
        </div>
      </div>

      {/* Windows 98 Style Status Bar */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        height: isMobile ? '30px' : '20px',
        background: 'var(--win98-surface)',
        border: '2px inset var(--win98-surface)',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '8px',
        paddingRight: '8px',
        fontSize: isMobile ? '10px' : '11px',
        zIndex: 1000
      }}>
        <span>Ready</span>
        {!isMobile && (
          <div style={{ marginLeft: 'auto' }}>
            Use pinch-to-zoom on mobile
          </div>
        )}
        {isMobile && (
          <div style={{ marginLeft: 'auto', fontSize: '9px' }}>
            Touch to interact
          </div>
        )}
      </div>

      

      {/* Mobile Virtual Joystick */}
      {isMobile && <VirtualJoystick />}

      {/* Modals */}
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </>
  );
}
