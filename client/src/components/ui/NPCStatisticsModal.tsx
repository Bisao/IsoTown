import { useEffect, useState } from 'react';
import { useAdvancedNPCStore } from '../../lib/stores/useAdvancedNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';
import { NPC, NPCProfession } from '../../lib/types';
import { useDraggable } from '../../hooks/use-draggable';

interface NPCStatisticsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NPCStatisticsModal({ open, onClose }: NPCStatisticsModalProps) {
  const { selectedNPC } = useGameStore();
  const { npcs, getNPCStatistics, levelUpNPC, addExperience } = useAdvancedNPCStore();
  const { position, isDragging, elementRef, handleMouseDown } = useDraggable({
    x: window.innerWidth - 420,
    y: 50
  });

  const [currentNPC, setCurrentNPC] = useState<NPC | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    if (selectedNPC && npcs[selectedNPC]) {
      const npc = npcs[selectedNPC];
      setCurrentNPC(npc);
      setStatistics(getNPCStatistics(selectedNPC));
    } else {
      setCurrentNPC(null);
      setStatistics(null);
    }
  }, [selectedNPC, npcs, getNPCStatistics]);

  if (!open || !currentNPC) return null;

  const getProfessionName = (profession: NPCProfession): string => {
    switch (profession) {
      case NPCProfession.LUMBERJACK: return 'Lenhador';
      case NPCProfession.FARMER: return 'Fazendeiro';
      case NPCProfession.MINER: return 'Minerador';
      default: return 'Sem Profissão';
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getSkillLevel = (skillName: string): number => {
    return currentNPC.skills?.[skillName] || 1;
  };

  const handleLevelUp = (skill: string) => {
    levelUpNPC(currentNPC.id, skill);
  };

  const handleAddExperience = () => {
    addExperience(currentNPC.id, 50);
  };

  return (
    <div className="win98-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div
        ref={elementRef}
        className={`win98-window win98-draggable-window ${isDragging ? 'dragging' : ''}`}
        style={{ 
          minWidth: '400px', 
          maxWidth: '500px',
          left: position.x,
          top: position.y,
          zIndex: 1000
        }}
      >
        <div className="win98-title-bar" onMouseDown={handleMouseDown}>
          <div className="win98-title-bar-text">
            Estatísticas do NPC - {currentNPC.id.slice(0, 8)}
          </div>
          <div className="win98-title-bar-controls">
            <button className="win98-title-bar-control" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="win98-window-body" style={{ padding: '16px', maxHeight: '600px', overflowY: 'auto' }}>
          
          {/* Informações Básicas */}
          <div className="win98-field-row" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Informações Básicas
            </h3>
            <div style={{ background: '#f0f0f0', padding: '8px', border: '1px inset #c0c0c0' }}>
              <div><strong>ID:</strong> {currentNPC.id}</div>
              <div><strong>Profissão:</strong> {getProfessionName(currentNPC.profession)}</div>
              <div><strong>Posição:</strong> ({currentNPC.position.x}, {currentNPC.position.z})</div>
              <div><strong>Estado:</strong> {currentNPC.state}</div>
              <div><strong>Nível:</strong> {currentNPC.level || 1}</div>
              <div><strong>Experiência:</strong> {currentNPC.experience || 0}</div>
            </div>
          </div>

          {/* Status */}
          <div className="win98-field-row" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Status
            </h3>
            <div style={{ background: '#f0f0f0', padding: '8px', border: '1px inset #c0c0c0' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>Saúde:</strong> 
                <div style={{ 
                  width: '100px', 
                  height: '8px', 
                  background: '#ff0000', 
                  display: 'inline-block', 
                  marginLeft: '8px',
                  border: '1px inset #c0c0c0'
                }}>
                  <div style={{ 
                    width: `${currentNPC.health || 100}%`, 
                    height: '100%', 
                    background: '#00ff00' 
                  }}></div>
                </div>
                <span style={{ marginLeft: '8px' }}>{currentNPC.health || 100}/100</span>
              </div>
              
              <div>
                <strong>Energia:</strong> 
                <div style={{ 
                  width: '100px', 
                  height: '8px', 
                  background: '#ffff00', 
                  display: 'inline-block', 
                  marginLeft: '8px',
                  border: '1px inset #c0c0c0'
                }}>
                  <div style={{ 
                    width: `${currentNPC.energy || 100}%`, 
                    height: '100%', 
                    background: '#0080ff' 
                  }}></div>
                </div>
                <span style={{ marginLeft: '8px' }}>{currentNPC.energy || 100}/100</span>
              </div>
            </div>
          </div>

          {/* Habilidades */}
          <div className="win98-field-row" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Habilidades
            </h3>
            <div style={{ background: '#f0f0f0', padding: '8px', border: '1px inset #c0c0c0' }}>
              {currentNPC.skills && Object.entries(currentNPC.skills).map(([skill, level]) => (
                <div key={skill} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '100px', textTransform: 'capitalize' }}>{skill}:</strong>
                  <div style={{ 
                    width: '80px', 
                    height: '8px', 
                    background: '#c0c0c0', 
                    marginLeft: '8px',
                    border: '1px inset #c0c0c0'
                  }}>
                    <div style={{ 
                      width: `${level}%`, 
                      height: '100%', 
                      background: level > 50 ? '#00ff00' : level > 25 ? '#ffff00' : '#ff8000'
                    }}></div>
                  </div>
                  <span style={{ marginLeft: '8px', minWidth: '40px' }}>{level}/100</span>
                  <button 
                    className="win98-button" 
                    style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '12px' }}
                    onClick={() => handleLevelUp(skill)}
                    disabled={level >= 100}
                  >
                    +1
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas de Trabalho */}
          {statistics && (
            <div className="win98-field-row" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                Estatísticas de Trabalho
              </h3>
              <div style={{ background: '#f0f0f0', padding: '8px', border: '1px inset #c0c0c0' }}>
                <div><strong>Trabalho Completado:</strong> {statistics.workCompleted}</div>
                <div><strong>Tempo Trabalhado:</strong> {formatTime(statistics.timeWorked)}</div>
                <div><strong>Distância Percorrida:</strong> {statistics.distanceTraveled} tiles</div>
                <div><strong>Tarefas Atribuídas:</strong> {statistics.tasksAssigned}</div>
                <div><strong>Eficiência:</strong> {statistics.efficiency.toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* Inventário */}
          <div className="win98-field-row" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Inventário
            </h3>
            <div style={{ background: '#f0f0f0', padding: '8px', border: '1px inset #c0c0c0', minHeight: '60px' }}>
              {currentNPC.inventory && Object.keys(currentNPC.inventory).length > 0 ? (
                Object.entries(currentNPC.inventory).map(([item, quantity]) => (
                  <div key={item}>
                    <strong>{item}:</strong> {quantity}
                  </div>
                ))
              ) : (
                <div style={{ color: '#808080', fontStyle: 'italic' }}>Inventário vazio</div>
              )}
            </div>
          </div>

          {/* Ações de Desenvolvimento */}
          <div className="win98-field-row">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Ações de Desenvolvimento
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="win98-button" 
                onClick={handleAddExperience}
              >
                +50 Experiência
              </button>
              <button 
                className="win98-button" 
                onClick={() => {
                  const newHealth = Math.min(100, (currentNPC.health || 100) + 20);
                  // Aqui você implementaria a atualização da saúde
                }}
              >
                +20 Saúde
              </button>
              <button 
                className="win98-button" 
                onClick={() => {
                  const newEnergy = Math.min(100, (currentNPC.energy || 100) + 30);
                  // Aqui você implementaria a atualização da energia
                }}
              >
                +30 Energia
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}