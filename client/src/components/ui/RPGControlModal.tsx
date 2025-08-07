import { useEffect } from 'react';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { NPCControlMode } from '../../lib/types';

export default function RPGControlModal() {
  const { showControlModal, setShowControlModal } = useGameStore();
  const { npcs } = useNPCStore();

  // Check if any NPC is in controlled mode
  const hasControlledNPC = Object.values(npcs).some(npc => npc.controlMode === NPCControlMode.CONTROLLED);

  useEffect(() => {
    setShowControlModal(hasControlledNPC);
  }, [hasControlledNPC, setShowControlModal]);

  if (!showControlModal || !hasControlledNPC) return null;

  return (
    <div className="rpg-control-modal">
      {/* Left side orb (Health) */}
      <div className="rpg-orb-container left">
        <div className="rpg-orb health-orb">
          <div className="orb-shine"></div>
        </div>
      </div>

      {/* Left side buttons */}
      <div className="rpg-buttons-left">
        <button className="rpg-button">CHAR</button>
        <button className="rpg-button">QUESTS</button>
        <button className="rpg-button">MAP</button>
        <button className="rpg-button">MENU</button>
      </div>

      {/* Center inventory bar */}
      <div className="rpg-inventory-bar">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rpg-inventory-slot">
            {i < 4 && <div className="item-placeholder red"></div>}
            {i >= 4 && i < 7 && <div className="item-placeholder blue"></div>}
          </div>
        ))}
      </div>

      {/* Right side buttons */}
      <div className="rpg-buttons-right">
        <button className="rpg-button">INV</button>
        <button className="rpg-button">SPELLS</button>
      </div>

      {/* Right side orb (Mana) */}
      <div className="rpg-orb-container right">
        <div className="rpg-orb mana-orb">
          <div className="orb-shine"></div>
        </div>
      </div>

      {/* Bottom right icon */}
      <div className="rpg-icon-container">
        <div className="rpg-icon">⚔️</div>
      </div>
    </div>
  );
}