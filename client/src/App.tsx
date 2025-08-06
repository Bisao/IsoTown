import GameWorld2D from './components/game/GameWorld2D';
import GameUI from './components/ui/GameUI';
import HouseSelectionModal from './components/ui/HouseSelectionModal';
import NPCConfigModal from './components/ui/NPCConfigModal';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameWorld2D />
      <GameUI />
      <HouseSelectionModal />
      <NPCConfigModal />
    </div>
  );
}