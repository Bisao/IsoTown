import { useEffect } from 'react';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { NPCControlMode } from '../../lib/types';

export default function RPGControlModal() {
  const { showControlModal, setShowControlModal } = useGameStore();
  const { npcs, showNPCModal, setShowNPCModal } = useNPCStore(); // Assuming these states exist in useNPCStore

  // Check if any NPC is in controlled mode
  const hasControlledNPC = Object.values(npcs).some(npc => npc.controlMode === NPCControlMode.CONTROLLED);

  useEffect(() => {
    setShowControlModal(hasControlledNPC);
  }, [hasControlledNPC, setShowControlModal]);

  const handleMenuClick = () => {
    setShowNPCModal(!showNPCModal);
  };

  if (!showControlModal || !hasControlledNPC) return null;

  return (
    <div className="rpg-control-modal">
      <div className="rpg-control-content">
        {/* Left side buttons */}
        <div className="rpg-buttons-left">
          <button className="rpg-button">CHAR</button>
          <button className="rpg-button">QUESTS</button>
          <button className="rpg-button">MAP</button>

          {/* Health orb above QUESTS button */}
          <div className="rpg-orb-container health">
            <div className="rpg-orb health-orb">
              <div className="orb-shine"></div>
            </div>
          </div>
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
          <button
            className="rpg-button"
            onClick={handleMenuClick}
            style={{
              backgroundColor: showNPCModal ? '#8B4513' : '#4A4A4A',
              border: showNPCModal ? '2px inset #666' : '2px outset #666'
            }}
          >
            MENU
          </button>
          <button className="rpg-button">QUIT</button>

          {/* Mana orb above MENU button */}
          <div className="rpg-orb-container mana">
            <div className="rpg-orb mana-orb">
              <div className="orb-shine"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom right icon */}
      <div className="rpg-icon-container">
        <div className="rpg-icon">⚔️</div>
      </div>
    </div>
  );
}