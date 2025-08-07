import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { House, Position } from '../types';
import { HouseType } from '../constants';
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
  }))
);
