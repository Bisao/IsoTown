import { useGameStore } from '../../lib/stores/useGameStore';
import { HouseType, HOUSE_COLORS, HOUSE_NAMES } from '../../lib/constants';
import { useDraggable } from '../../hooks/use-draggable';

interface HouseSelectionModalProps {
  open: boolean;
}

export default function HouseSelectionModal({ open }: HouseSelectionModalProps) {
  const { setShowHouseModal, startPlacingHouse, focusWindow } = useGameStore();
  const { position, isDragging, elementRef, handleMouseDown } = useDraggable({
    x: window.innerWidth / 2 - 160,
    y: window.innerHeight / 2 - 150
  });

  const handleSelectHouse = (type: HouseType) => {
    startPlacingHouse(type);
  };

  const handleClose = () => {
    setShowHouseModal(false);
  };

  if (!open) return null;

  return (
    <div className="win98-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div
        ref={elementRef}
        className={`win98-window win98-draggable-window ${isDragging ? 'dragging' : ''}`}
        style={{
          width: window.innerWidth > 768 ? '320px' : '90vw',
          maxWidth: '400px',
          minHeight: '280px',
          maxHeight: '90vh',
          left: position.x,
          top: position.y,
          margin: 0
        }}
        onClick={() => focusWindow('house')}
      >
        <div 
          className={`win98-window-header ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <span>🏠 Construir Casas</span>
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