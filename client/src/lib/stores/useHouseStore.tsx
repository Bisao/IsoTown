import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { House, Position } from '../types';
import { HouseType } from '../constants';
import { nanoid } from 'nanoid';

interface HouseStore {
  houses: Record<string, House>;
  
  // Actions
  addHouse: (type: HouseType, position: Position) => string;
  removeHouse: (id: string) => void;
  getHouseAt: (position: Position) => House | undefined;
  assignNPCToHouse: (houseId: string, npcId: string) => void;
  unassignNPCFromHouse: (houseId: string) => void;
}

export const useHouseStore = create<HouseStore>()(
  subscribeWithSelector((set, get) => ({
    houses: {},

    addHouse: (type, position) => {
      const id = nanoid();
      const house: House = {
        id,
        type,
        position,
      };
      
      set((state) => ({
        houses: { ...state.houses, [id]: house }
      }));
      
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
  }))
);
