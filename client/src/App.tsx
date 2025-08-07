import GameWorld2D from './components/game/GameWorld2D';
import GameUI from './components/ui/GameUI';
import HouseSelectionModal from './components/ui/HouseSelectionModal';
import NPCConfigModal from './components/ui/NPCConfigModal';
import RPGControlModal from './components/ui/RPGControlModal';
import { PS5SimpleController, PS5SimpleStatus, PS5KeyboardIntegration } from './components/game/PS5Simple';

import { useGameStore } from './lib/stores/useGameStore';

export default function App() {
  const { showHouseModal, showNPCModal } = useGameStore();

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'relative',
      touchAction: 'none'
    }}>
      <GameWorld2D />
      
      <GameUI />
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
      <RPGControlModal />

      {/* PlayStation 5 Integration */}
      <PS5SimpleController />
      <PS5SimpleStatus />
      <PS5KeyboardIntegration />
    </div>
  );
}