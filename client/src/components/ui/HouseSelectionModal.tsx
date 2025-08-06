import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Card, CardContent } from './card';
import { useGameStore } from '../../lib/stores/useGameStore';
import { HouseType, HOUSE_COLORS, HOUSE_NAMES } from '../../lib/constants';

interface HouseSelectionModalProps {
  open: boolean;
}

export default function HouseSelectionModal({ open }: HouseSelectionModalProps) {
  const { setShowHouseModal, startPlacingHouse } = useGameStore();

  const handleSelectHouse = (type: HouseType) => {
    startPlacingHouse(type);
  };

  const handleClose = () => {
    setShowHouseModal(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select House Type</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4">
          {Object.values(HouseType).map((type) => (
            <Card key={type} className="cursor-pointer hover:bg-gray-50">
              <CardContent className="p-4">
                <Button
                  onClick={() => handleSelectHouse(type)}
                  className="w-full h-auto p-4 flex items-center gap-4"
                  variant="outline"
                >
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: HOUSE_COLORS[type] }}
                  />
                  <span className="font-medium">{HOUSE_NAMES[type]}</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
