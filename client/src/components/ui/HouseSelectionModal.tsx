import { useGameStore } from '../../lib/stores/useGameStore';
import { HouseType, HOUSE_COLORS, HOUSE_NAMES } from '../../lib/constants';

interface HouseSelectionModalProps {
  open: boolean;
}

export default function HouseSelectionModal({ open }: HouseSelectionModalProps) {
  const { setShowHouseModal, startPlacingHouse } = useGameStore();

  const handleSelectHouse = (type: HouseType) => {
    startPlacingHouse(type);
  };

  const handleClose = () => {
    setShowHouseModal(false);
  };

  if (!open) return null;

  return (
    <div className="win98-modal-overlay">
      <div
        className="win98-window"
        style={{
          width: window.innerWidth > 768 ? '320px' : '90vw',
          maxWidth: '400px',
          minHeight: '280px',
          maxHeight: '90vh',
          position: 'relative',
          margin: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="win98-window-header">
          <span>Select Building Type</span>
          <div className="win98-close-button" onClick={handleClose}>×</div>
        </div>

        <div className="win98-window-body">
          <div style={{ marginBottom: '12px', fontSize: '11px' }}>
            Choose a building type to place on the grid:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.values(HouseType).map((type) => (
              <div key={type} className="win98-panel" style={{ padding: '6px' }}>
                <button
                  onClick={() => handleSelectHouse(type)}
                  className="win98-button"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'flex-start',
                    padding: window.innerWidth > 768 ? '6px 12px' : '10px 12px',
                    fontSize: window.innerWidth > 768 ? '11px' : '12px'
                  }}
                >
                  <div
                    style={{
                      width: window.innerWidth > 768 ? '16px' : '20px',
                      height: window.innerWidth > 768 ? '16px' : '20px',
                      backgroundColor: HOUSE_COLORS[type],
                      border: '1px solid #000000'
                    }}
                  />
                  <span style={{
                    fontSize: window.innerWidth > 768 ? '11px' : '12px',
                    fontFamily: 'MS Sans Serif, sans-serif'
                  }}>
                    {HOUSE_NAMES[type]}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClose}
              className="win98-button"
              style={{ minWidth: '75px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}