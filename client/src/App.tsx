import GameWorld2D from './components/game/GameWorld2D';
import GameUI from './components/ui/GameUI';
import HouseSelectionModal from './components/ui/HouseSelectionModal';
import NPCConfigModal from './components/ui/NPCConfigModal';
import { useGameStore } from './lib/stores/useGameStore';

export default function App() {
  const { showHouseModal, showNPCModal } = useGameStore();

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'relative',
      touchAction: 'none',
      background: 'var(--win98-bg)'
    }}>
      {/* Game Window Border */}
      <div className="win98-game-window">
        <div className="win98-game-window-header">
          <span>🎮 SimCity 98 - Building Simulation</span>
          <div className="win98-game-window-controls">
            <div className="win98-window-button">_</div>
            <div className="win98-window-button">□</div>
            <div className="win98-window-button">×</div>
          </div>
        </div>
        
        {/* Game Menu Bar */}
        <div className="win98-game-menubar">
          <span className="win98-menu-item">Arquivo</span>
          <span className="win98-menu-item">Editar</span>
          <span className="win98-menu-item">Visualizar</span>
          <span className="win98-menu-item">Ferramentas</span>
          <span className="win98-menu-item">Ajuda</span>
        </div>
        
        {/* Game Content Area */}
        <div className="win98-game-content">
          <GameWorld2D />
        </div>
      </div>
      
      <GameUI />
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </div>
  );
}