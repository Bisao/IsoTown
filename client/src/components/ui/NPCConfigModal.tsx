import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Card, CardContent } from './card';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { NPCControlMode, HOUSE_NAMES } from '../../lib/constants';
import { NPC, House } from '../../lib/types';

interface NPCConfigModalProps {
  open: boolean;
}

export default function NPCConfigModal({ open }: NPCConfigModalProps) {
  const { selectedNPC, selectedHouse, setShowNPCModal, clearSelection } = useGameStore();
  const { npcs, setNPCControlMode } = useNPCStore();
  const { houses } = useHouseStore();
  
  const [currentNPC, setCurrentNPC] = useState<NPC | null>(null);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);

  useEffect(() => {
    if (selectedNPC && npcs[selectedNPC]) {
      setCurrentNPC(npcs[selectedNPC]);
      if (npcs[selectedNPC].houseId && houses[npcs[selectedNPC].houseId]) {
        setCurrentHouse(houses[npcs[selectedNPC].houseId]);
      } else {
        setCurrentHouse(null);
      }
    } else if (selectedHouse && houses[selectedHouse]) {
      setCurrentHouse(houses[selectedHouse]);
      if (houses[selectedHouse].npcId && npcs[houses[selectedHouse].npcId]) {
        setCurrentNPC(npcs[houses[selectedHouse].npcId]);
      } else {
        setCurrentNPC(null);
      }
    } else {
      setCurrentNPC(null);
      setCurrentHouse(null);
    }
  }, [selectedNPC, selectedHouse, npcs, houses]);

  const handleClose = () => {
    setShowNPCModal(false);
    clearSelection();
  };

  const handleSetControlMode = (mode: NPCControlMode) => {
    if (currentNPC) {
      setNPCControlMode(currentNPC.id, mode);
    }
  };

  if (!currentNPC && !currentHouse) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentNPC ? `NPC Configuration` : `House Configuration`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentNPC && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">NPC: {currentNPC.id}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Position: ({Math.round(currentNPC.position.x)}, {Math.round(currentNPC.position.z)})
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Current Mode: {currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? 'Autonomous' : 'Controlled'}
                </p>
                
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={() => handleSetControlMode(NPCControlMode.AUTONOMOUS)}
                    variant={currentNPC.controlMode === NPCControlMode.AUTONOMOUS ? "default" : "outline"}
                  >
                    🚶 Autonomous
                    <span className="text-xs block">NPC walks alone on the map</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleSetControlMode(NPCControlMode.CONTROLLED)}
                    variant={currentNPC.controlMode === NPCControlMode.CONTROLLED ? "default" : "outline"}
                  >
                    🎮 Controlled
                    <span className="text-xs block">Control with virtual joystick</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentHouse && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">
                  {currentHouse?.type ? HOUSE_NAMES[currentHouse.type] : 'Unknown House'}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Position: ({currentHouse.position.x}, {currentHouse.position.z})
                </p>
                <p className="text-sm text-gray-600">
                  {currentHouse.npcId ? `Assigned NPC: ${currentHouse.npcId}` : 'No NPC assigned'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
