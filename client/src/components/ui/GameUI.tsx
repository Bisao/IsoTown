import { useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/use-is-mobile';
import HouseSelectionModal from './HouseSelectionModal';
import NPCConfigModal from './NPCConfigModal';
import VirtualJoystick from './VirtualJoystick';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useTreeStore } from '../../lib/stores/useTreeStore';
import { useEffectsStore } from '../../lib/stores/useEffectsStore';
import { useTimeStore } from '../../lib/stores/useTimeStore';
import { HouseType, HOUSE_NAMES, CHOPPING_ANIMATION_DURATION } from '../../lib/constants';
import { NPCControlMode, NPCProfession } from '../../lib/types';

export default function GameUI() {
  const isMobile = useIsMobile();
  const { 
    showHouseModal, 
    showNPCModal, 
    showStartMenu,
    openWindows,
    setShowHouseModal, 
    setShowNPCModal,
    setShowStartMenu,
    toggleWindow,
    focusWindow,
    selectedNPC,
    selectedHouse
  } = useGameStore();

  const { houses, addHouse, removeHouse } = useHouseStore();
  const { npcs, addNPC, setNPCControlMode, setNPCProfession } = useNPCStore();
  const { getTreeAt, damageTree } = useTreeStore();
  const { addTextEffect } = useEffectsStore();
  const { formatGameTime, getTimeOfDay, isDay, dayCount } = useTimeStore();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Close start menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showStartMenu && !target.closest('.win98-start-button') && !target.closest('.win98-start-menu')) {
        setShowStartMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showStartMenu, setShowStartMenu]);

  const toggleStartMenu = () => {
    setShowStartMenu(!showStartMenu);
  };

  const handleMenuItemClick = (action: string) => {
    setShowStartMenu(false);

    switch (action) {
      case 'build':
        setShowHouseModal(true);
        break;
      case 'npcs':
        setShowNPCModal(true);
        break;
      case 'about':
        alert('SimCity 98 - Building Game\nVersion 1.0\n\nCriado no estilo nostálgico do Windows 98!');
        break;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getWindowTitle = (windowId: string) => {
    switch (windowId) {
      case 'game': return '🎮 SimCity 98';
      case 'house': return '🏠 Construir';
      case 'npc': return '👥 NPCs';
      default: return windowId;
    }
  };

  const currentNPC = selectedNPC ? npcs[selectedNPC] : null;
  const currentHouse = selectedHouse ? houses[selectedHouse] : null;

  // Manual tree cutting for controlled NPCs
  const handleManualCutTree = () => {
    if (!selectedNPC || !currentNPC || currentNPC.controlMode !== NPCControlMode.CONTROLLED) {
      return;
    }

    const npc = currentNPC;

    // Check if there's a tree at the NPC's exact position
    const treeAtPosition = getTreeAt(npc.position);

    if (treeAtPosition && !treeAtPosition.isFalling) {
      console.log('TOC! Cortando árvore manualmente:', treeAtPosition.id, 'na posição:', treeAtPosition.position);

      // Damage the tree
      const treeDestroyed = damageTree(treeAtPosition.id, 1);

      // Add chopping animation to NPC
      useNPCStore.getState().setNPCAnimation(selectedNPC, {
        type: 'chopping',
        startTime: Date.now(),
        duration: CHOPPING_ANIMATION_DURATION
      });

      // Add visual effect at tree position (trunk of the tree) - not player position
      addTextEffect(treeAtPosition.position, 'TOC!', 1000);

      console.log(treeDestroyed ? 'Árvore cortada e destruída!' : 'Árvore danificada!');
    } else {
      console.log('Nenhuma árvore adjacente encontrada para cortar');

      // Add visual feedback at player position
      addTextEffect(npc.position, 'Sem árvores!', 1000);
    }
  };

  return (
    <>
      {/* Windows 98 Style Toolbar */}
      <div className="win98-game-ui">
        <div className="win98-panel" style={{ 
          flex: 1, 
          padding: isMobile ? '8px 4px' : '4px',
          overflow: 'hidden'
        }}>
          <span style={{ 
            fontSize: isMobile ? '10px' : '11px', 
            fontFamily: 'MS Sans Serif, sans-serif', 
            color: 'var(--win98-text)',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}>
            {isMobile ? 'SimCity 98' : 'SimCity 98 - Building Game'}
          </span>
        </div>
      </div>

      {/* Windows 98 Taskbar */}
      <div className="win98-taskbar">
        <button
          className={`win98-start-button ${showStartMenu ? 'active' : ''}`}
          onClick={toggleStartMenu}
        >
          <span style={{ fontSize: '16px' }}>🪟</span>
          Iniciar
        </button>

        {/* Window buttons in taskbar */}
        {openWindows.map((windowId) => (
          <button
            key={windowId}
            className={`win98-taskbar-window ${windowId === 'game' ? 'active' : ''}`}
            onClick={() => {
              if (windowId !== 'game') {
                focusWindow(windowId);
              }
              // For game window, just keep it focused (it's always open)
            }}
            style={{
              marginLeft: '4px',
              fontSize: isMobile ? '10px' : '11px',
              padding: isMobile ? '4px 6px' : '2px 8px'
            }}
          >
            {getWindowTitle(windowId)}
          </button>
        ))}

        <div className="win98-taskbar-time" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          fontSize: isMobile ? '9px' : '11px',
          padding: '2px 8px'
        }}>
          <div style={{ fontWeight: 'bold' }}>{formatGameTime()}</div>
          <div style={{ 
            fontSize: isMobile ? '8px' : '9px', 
            color: isDay ? '#0066cc' : '#4a4a4a',
            textTransform: 'capitalize'
          }}>
            Dia {dayCount} - {getTimeOfDay()}
          </div>
        </div>
      </div>

      {/* Windows 98 Start Menu */}
      {showStartMenu && (
        <div className="win98-start-menu">
          <div 
            className="win98-start-menu-item"
            onClick={() => handleMenuItemClick('build')}
          >
            <span>🏠</span>
            <span>Construir Casas</span>
          </div>
          <div className="win98-start-menu-separator" />
          <div 
            className="win98-start-menu-item"
            onClick={() => handleMenuItemClick('about')}
          >
            <span>ℹ️</span>
            <span>Sobre</span>
          </div>
        </div>
      )}

      {/* Mobile Virtual Joystick */}
      {isMobile && <VirtualJoystick />}





      {/* Modals */}
      {/* Modal de Configuração do NPC */}
      <NPCConfigModal open={showNPCModal} />

      {/* Modal de Seleção de Casa */}
      <HouseSelectionModal 
        open={showHouseModal}
      />
    </>
  );
}