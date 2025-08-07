
import { create } from 'zustand';
import { HouseType, NPCControlMode } from '../constants';

interface GameStore {
  // UI State
  showHouseModal: boolean;
  showNPCModal: boolean;
  showStartMenu: boolean;
  
  // Game State
  isPlacingHouse: boolean;
  selectedHouseType: HouseType | null;
  selectedNPC: string | null;
  selectedHouse: string | null;
  cameraMode: 'FREE' | 'FOLLOW_NPC';
  
  // Actions
  setShowHouseModal: (show: boolean) => void;
  setShowNPCModal: (show: boolean) => void;
  setShowStartMenu: (show: boolean) => void;
  startPlacingHouse: (type: HouseType) => void;
  stopPlacingHouse: () => void;
  selectNPC: (id: string | null) => void;
  selectHouse: (id: string | null) => void;
  setCameraMode: (mode: 'FREE' | 'FOLLOW_NPC') => void;
  clearSelection: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // UI State
  showHouseModal: false,
  showNPCModal: false,
  showStartMenu: false,
  
  // Game State
  isPlacingHouse: false,
  selectedHouseType: null,
  selectedNPC: null,
  selectedHouse: null,
  cameraMode: 'FREE',
  
  // Actions
  setShowHouseModal: (show) => set({ showHouseModal: show }),
  setShowNPCModal: (show) => set({ showNPCModal: show }),
  setShowStartMenu: (show) => set({ showStartMenu: show }),
  
  startPlacingHouse: (type) => set({ 
    isPlacingHouse: true, 
    selectedHouseType: type,
    showHouseModal: false
  }),
  
  stopPlacingHouse: () => set({ 
    isPlacingHouse: false, 
    selectedHouseType: null 
  }),
  
  selectNPC: (id) => set({ 
    selectedNPC: id,
    selectedHouse: null,
    showNPCModal: !!id
  }),
  
  selectHouse: (id) => set({ 
    selectedHouse: id,
    selectedNPC: null
  }),
  
  setCameraMode: (mode) => set({ cameraMode: mode }),
  
  clearSelection: () => set({ 
    selectedNPC: null, 
    selectedHouse: null, 
    showNPCModal: false 
  })
}));
