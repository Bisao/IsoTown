import { useState } from 'react';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { GAME_ITEMS } from '../../lib/constants';

interface NPCInventoryModalProps {
  npcId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NPCInventoryModal({ npcId, isOpen, onClose }: NPCInventoryModalProps) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  
  const npc = useNPCStore(state => state.npcs[npcId]);
  const getTotalWeight = useNPCStore(state => state.getTotalWeight);
  const getMaxCarryWeight = useNPCStore(state => state.getMaxCarryWeight);
  const getInventoryItems = useNPCStore(state => state.getInventoryItems);
  const addItemToInventory = useNPCStore(state => state.addItemToInventory);
  const removeItemFromInventory = useNPCStore(state => state.removeItemFromInventory);
  const isOverweight = useNPCStore(state => state.isOverweight);

  if (!isOpen || !npc) return null;

  const inventoryItems = getInventoryItems(npcId);
  const totalWeight = getTotalWeight(npcId);
  const maxWeight = getMaxCarryWeight(npcId);
  const overweight = isOverweight(npcId);

  const handleAddItem = () => {
    if (!selectedItem || quantity <= 0) return;
    
    const result = addItemToInventory(npcId, selectedItem, quantity);
    if (!result.success) {
      alert(result.reason || 'Erro ao adicionar item');
    }
    setQuantity(1);
  };

  const handleRemoveItem = (itemId: string, itemQuantity: number) => {
    const removeQty = Math.min(quantity, itemQuantity);
    removeItemFromInventory(npcId, itemId, removeQty);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Inventário do NPC</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Info do NPC */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <h3 className="font-semibold">NPC: {npc.id}</h3>
          <p>Profissão: {npc.profession}</p>
          <p>Posição: ({npc.position.x}, {npc.position.z})</p>
        </div>

        {/* Status de Peso */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Capacidade de Carga</span>
            <span className={`font-bold ${overweight ? 'text-red-600' : 'text-green-600'}`}>
              {totalWeight.toFixed(1)}kg / {maxWeight}kg
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                overweight ? 'bg-red-500' : totalWeight/maxWeight > 0.8 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalWeight/maxWeight) * 100, 100)}%` }}
            />
          </div>
          {overweight && (
            <p className="text-red-600 text-sm mt-1">⚠️ Sobrecarregado! Movimento reduzido em 50%</p>
          )}
        </div>

        {/* Inventário Atual */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Itens no Inventário</h4>
          {inventoryItems.length === 0 ? (
            <p className="text-gray-500">Inventário vazio</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {inventoryItems.map((entry) => (
                <div key={entry.id} className="border rounded p-2 flex justify-between items-center">
                  <div>
                    <div 
                      className="w-4 h-4 inline-block mr-2 rounded"
                      style={{ backgroundColor: entry.item.color }}
                    />
                    <span className="font-medium">{entry.item.name}</span>
                    <div className="text-sm text-gray-600">
                      Qtd: {entry.quantity} | Peso: {(entry.item.weight * entry.quantity).toFixed(1)}kg
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(entry.id, entry.quantity)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adicionar Item */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Adicionar Item</h4>
          <div className="flex gap-2 mb-2">
            <select 
              value={selectedItem} 
              onChange={(e) => setSelectedItem(e.target.value)}
              className="flex-1 border rounded px-2 py-1"
            >
              <option value="">Selecionar item...</option>
              {Object.values(GAME_ITEMS).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.weight}kg cada)
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-16 border rounded px-2 py-1 text-center"
            />
            <button
              onClick={handleAddItem}
              disabled={!selectedItem}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Adicionar
            </button>
          </div>
          {selectedItem && (
            <p className="text-sm text-gray-600">
              {GAME_ITEMS[selectedItem as keyof typeof GAME_ITEMS]?.description}
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}