import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameState } from '../types';
import { HouseType } from '../constants';

interface GameStore extends GameState {
  // Actions
  startPlacingHouse: (type: HouseType) => void;
  stopPlacingHouse: () => void;
  selectNPC: (npcId: string) => void;
  selectHouse: (houseId: string) => void;
  clearSelection: () => void;
  setShowHouseModal: (show: boolean) => void;
  setShowNPCModal: (show: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    isPlacingHouse: false,
    selectedHouseType: undefined,
    selectedNPC: undefined,
    selectedHouse: undefined,
    showHouseModal: false,
    showNPCModal: false,

    // Actions
    startPlacingHouse: (type) => set({ 
      isPlacingHouse: true, 
      selectedHouseType: type, 
      showHouseModal: false 
    }),
    
    stopPlacingHouse: () => set({ 
      isPlacingHouse: false, 
      selectedHouseType: undefined 
    }),
    
    selectNPC: (npcId) => set({ 
      selectedNPC: npcId, 
      selectedHouse: undefined,
      showNPCModal: true 
    }),
    
    selectHouse: (houseId) => set({ 
      selectedHouse: houseId, 
      selectedNPC: undefined,
      showNPCModal: true 
    }),
    
    clearSelection: () => set((state) => {
      // Don't clear NPC selection if it's in controlled mode
      const { npcs } = useNPCStore.getState();
      const currentNPC = state.selectedNPC && npcs[state.selectedNPC];
      
      if (currentNPC && currentNPC.controlMode === 'CONTROLLED') {
        return { 
          selectedHouse: undefined,
          showNPCModal: false 
        };
      }
      
      return { 
        selectedNPC: undefined, 
        selectedHouse: undefined,
        showNPCModal: false 
      };
    }),
    
    setShowHouseModal: (show) => set({ showHouseModal: show }),
    setShowNPCModal: (show) => set({ showNPCModal: show }),
  }))
);
