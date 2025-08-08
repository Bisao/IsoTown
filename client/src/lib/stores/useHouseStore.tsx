import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { House, Position, ResourceInventory } from '../types';
import { HouseType, HOUSE_STORAGE_CAPACITY } from '../constants';
import { nanoid } from 'nanoid';

interface HouseStore {
  houses: Record<string, House>;
  
  // Actions
  addHouse: (type: HouseType, position: Position, rotation?: number) => string;
  removeHouse: (id: string) => void;
  getHouseAt: (position: Position) => House | undefined;
  assignNPCToHouse: (houseId: string, npcId: string) => void;
  unassignNPCFromHouse: (houseId: string) => void;
  rotateHouse: (houseId: string) => void;
  
  // Inventory management
  addResourceToHouse: (houseId: string, resource: keyof ResourceInventory, amount: number) => boolean;
  removeResourceFromHouse: (houseId: string, resource: keyof ResourceInventory, amount: number) => boolean;
  getHouseInventory: (houseId: string) => ResourceInventory | undefined;
  getHouseStorageSpace: (houseId: string) => number; // Available space
}

export const useHouseStore = create<HouseStore>()(
  subscribeWithSelector((set, get) => ({
    houses: {},

    addHouse: (type, position, rotation = 0) => {
      const id = nanoid();
      const house: House = {
        id,
        type,
        position,
        rotation,
        inventory: {
          wood: 0,
          stone: 0,
          food: 0
        },
        maxStorageCapacity: HOUSE_STORAGE_CAPACITY
      };
      
      set((state) => ({
        houses: { ...state.houses, [id]: house }
      }));
      
      // Spawn NPC after 3 seconds
      setTimeout(() => {
        import('./useNPCStore').then(({ useNPCStore }) => {
          import('./useTreeStore').then(({ useTreeStore }) => {
            import('../types').then(({ NPCProfession }) => {
              // Verificar se a posição não tem árvore antes de spawnar NPC
              if (!useTreeStore.getState().getTreeAt(position)) {
                // Determinar profissão baseada no tipo de casa
                let profession = NPCProfession.NONE;
                if (type === 'LUMBERJACK') {
                  profession = NPCProfession.LUMBERJACK;
                } else if (type === 'FARMER') {
                  profession = NPCProfession.FARMER;
                } else if (type === 'MINER') {
                  profession = NPCProfession.MINER;
                }
                
                const npcId = useNPCStore.getState().addNPC(position, profession);
                useNPCStore.getState().assignNPCToHouse(npcId, id);
              
              // Update house with NPC assignment
              set((state) => ({
                houses: {
                  ...state.houses,
                  [id]: { ...state.houses[id], npcId }
                }
              }));
              }
            });
          });
        });
      }, 3000);
      
      return id;
    },

    removeHouse: (id) => set((state) => {
      const { [id]: removed, ...rest } = state.houses;
      return { houses: rest };
    }),

    getHouseAt: (position) => {
      const houses = get().houses;
      return Object.values(houses).find(
        (house) => house.position.x === position.x && house.position.z === position.z
      );
    },

    assignNPCToHouse: (houseId, npcId) => set((state) => ({
      houses: {
        ...state.houses,
        [houseId]: { ...state.houses[houseId], npcId }
      }
    })),

    unassignNPCFromHouse: (houseId) => set((state) => ({
      houses: {
        ...state.houses,
        [houseId]: { ...state.houses[houseId], npcId: undefined }
      }
    })),

    rotateHouse: (houseId) => set((state) => {
      const house = state.houses[houseId];
      if (!house) return state;
      
      const newRotation = (house.rotation + 90) % 360;
      return {
        houses: {
          ...state.houses,
          [houseId]: { ...house, rotation: newRotation }
        }
      };
    }),

    addResourceToHouse: (houseId, resource, amount) => {
      const state = get();
      const house = state.houses[houseId];
      if (!house) return false;

      const currentTotal = house.inventory.wood + house.inventory.stone + house.inventory.food;
      if (currentTotal + amount > house.maxStorageCapacity) return false;

      set((state) => ({
        houses: {
          ...state.houses,
          [houseId]: {
            ...state.houses[houseId],
            inventory: {
              ...state.houses[houseId].inventory,
              [resource]: state.houses[houseId].inventory[resource] + amount
            }
          }
        }
      }));
      return true;
    },

    removeResourceFromHouse: (houseId, resource, amount) => {
      const state = get();
      const house = state.houses[houseId];
      if (!house || house.inventory[resource] < amount) return false;

      set((state) => ({
        houses: {
          ...state.houses,
          [houseId]: {
            ...state.houses[houseId],
            inventory: {
              ...state.houses[houseId].inventory,
              [resource]: Math.max(0, state.houses[houseId].inventory[resource] - amount)
            }
          }
        }
      }));
      return true;
    },

    getHouseInventory: (houseId) => {
      const house = get().houses[houseId];
      return house?.inventory;
    },

    getHouseStorageSpace: (houseId) => {
      const house = get().houses[houseId];
      if (!house) return 0;
      
      const currentTotal = house.inventory.wood + house.inventory.stone + house.inventory.food;
      return house.maxStorageCapacity - currentTotal;
    },
  }))
);
