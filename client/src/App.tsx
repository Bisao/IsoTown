import "@fontsource/inter";
import GameWorld2D from "./components/game/GameWorld2D";
import GameUI from "./components/ui/GameUI";

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <GameWorld2D />
      <GameUI />
    </div>
  );
}

export default App;