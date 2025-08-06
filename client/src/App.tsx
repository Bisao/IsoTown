import GameWorld2D from './components/game/GameWorld2D';
import GameUI from './components/ui/GameUI';
import HouseSelectionModal from './components/ui/HouseSelectionModal';
import NPCConfigModal from './components/ui/NPCConfigModal';
import { useGameStore } from './lib/stores/useGameStore';

export default function App() {
  const { showHouseModal, showNPCModal } = useGameStore();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameWorld2D />
      <GameUI />
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </div>
  );
}