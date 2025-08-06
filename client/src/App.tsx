import "@fontsource/inter";
import GameWorld2D from "./components/game/GameWorld2D";
import GameUI from "./components/ui/GameUI";

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden',
      background: 'var(--win98-bg)'
    }}>
      {/* Windows 98 Style Game Area */}
      <div style={{
        position: 'absolute',
        top: '46px', // Account for toolbar
        left: '4px',
        right: '4px',
        bottom: '4px',
        border: '2px inset var(--win98-surface)',
        background: '#90EE90'
      }}>
        <GameWorld2D />
      </div>
      <GameUI />
    </div>
  );
}

export default App;