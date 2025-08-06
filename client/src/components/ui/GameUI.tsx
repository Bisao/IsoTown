import { useIsMobile } from '../../hooks/use-is-mobile';
import HouseSelectionModal from './HouseSelectionModal';
import NPCConfigModal from './NPCConfigModal';
import VirtualJoystick from './VirtualJoystick';
import { useGameStore } from '../../lib/stores/useGameStore';
import { Button } from './button';

export default function GameUI() {
  const isMobile = useIsMobile();
  const { showHouseModal, showNPCModal, setShowHouseModal } = useGameStore();

  return (
    <>
      {/* Main UI */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => setShowHouseModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Place House
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white p-4 rounded-lg max-w-xs">
        <h3 className="font-bold mb-2">How to Play:</h3>
        <ul className="text-sm space-y-1">
          <li>• Click "Place House" to select a house type</li>
          <li>• Click on 2D isometric grid to place the house</li>
          <li>• Right-click on NPCs (red circles) to configure</li>
          <li>• Switch between autonomous and controlled modes</li>
        </ul>
      </div>

      {/* Mobile Virtual Joystick */}
      {isMobile && <VirtualJoystick />}

      {/* Modals */}
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </>
  );
}
