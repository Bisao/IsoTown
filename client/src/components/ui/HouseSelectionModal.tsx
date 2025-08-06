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
      <div className="win98-window" style={{ minWidth: '300px', maxWidth: '400px' }}>
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
                    padding: '6px 12px'
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: HOUSE_COLORS[type],
                      border: '1px solid #000000'
                    }}
                  />
                  <span style={{ fontSize: '11px' }}>{HOUSE_NAMES[type]}</span>
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