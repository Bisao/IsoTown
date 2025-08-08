import { useNPCStore } from '../../lib/stores/useNPCStore';

interface NPCInventoryModalProps {
  npcId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NPCInventoryModal({ npcId, isOpen, onClose }: NPCInventoryModalProps) {
  const npc = useNPCStore(state => state.npcs[npcId]);
  const getTotalWeight = useNPCStore(state => state.getTotalWeight);
  const getMaxCarryWeight = useNPCStore(state => state.getMaxCarryWeight);
  const getInventoryItems = useNPCStore(state => state.getInventoryItems);

  if (!isOpen || !npc) return null;

  const inventoryItems = getInventoryItems(npcId);
  const totalWeight = getTotalWeight(npcId);
  const maxWeight = getMaxCarryWeight(npcId);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="win98-window fixed z-50" style={{ 
        left: '50%', 
        top: '50%', 
        transform: 'translate(-50%, -50%)',
        minWidth: '400px',
        maxWidth: '600px',
        maxHeight: '80vh'
      }}>
        <div className="win98-title-bar">
          <span>📦 NPC Inventory</span>
          <button className="win98-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="win98-content" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <div className="win98-group">
            <div className="win98-group-title">NPC Information</div>
            <div style={{ padding: '8px' }}>
              <div>ID: {npc.id.slice(0, 8)}...</div>
              <div>Profession: {npc.profession}</div>
              <div>Position: ({npc.position.x}, {npc.position.z})</div>
            </div>
          </div>

          <div className="win98-group">
            <div className="win98-group-title">Inventory</div>
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                Weight: {totalWeight.toFixed(1)}kg / {maxWeight}kg
              </div>
              
              <div className="win98-progress">
                <div 
                  className="win98-progress-bar"
                  style={{ width: `${Math.min(100, (totalWeight / maxWeight) * 100)}%` }}
                />
              </div>

              <div style={{ marginTop: '12px' }}>
                {inventoryItems.length === 0 ? (
                  <div>Empty inventory</div>
                ) : (
                  inventoryItems.map((item) => (
                    <div key={item.id} className="win98-listbox-item">
                      {item.name || item.id}: {item.quantity}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="win98-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}