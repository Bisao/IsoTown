import { useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/use-is-mobile';
import HouseSelectionModal from './HouseSelectionModal';
import NPCConfigModal from './NPCConfigModal';
import VirtualJoystick from './VirtualJoystick';
import { useGameStore } from '../../lib/stores/useGameStore';

export default function GameUI() {
  const isMobile = useIsMobile();
  const { 
    showHouseModal, 
    showNPCModal, 
    showStartMenu,
    setShowHouseModal, 
    setShowNPCModal,
    setShowStartMenu 
  } = useGameStore();
  
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
        
        <div className="win98-taskbar-time">
          {formatTime(currentTime)}
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
          <div 
            className="win98-start-menu-item"
            onClick={() => handleMenuItemClick('npcs')}
          >
            <span>👥</span>
            <span>Configurar NPCs</span>
          </div>
          <div className="win98-start-menu-separator" />
          <div 
            className="win98-start-menu-item"
            onClick={() => handleMenuItemClick('about')}
          >
            <span>ℹ️</span>
            <span>Sobre</span>
          </div>
          <div className="win98-start-menu-separator" />
          <div className="win98-start-menu-item">
            <span>🎮</span>
            <span>Jogar SimCity 98</span>
          </div>
        </div>
      )}

      {/* Mobile Virtual Joystick */}
      {isMobile && <VirtualJoystick />}

      {/* Modals */}
      <HouseSelectionModal open={showHouseModal} />
      <NPCConfigModal open={showNPCModal} />
    </>
  );
}
