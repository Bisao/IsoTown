
import { create } from 'zustand';
import { HouseType, NPCControlMode } from '../constants';

interface GameStore {
  // UI State
  showHouseModal: boolean;
  showNPCModal: boolean;
  showStartMenu: boolean;
  openWindows: string[];
  
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
  toggleWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
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
  openWindows: [],
  
  // Game State
  isPlacingHouse: false,
  selectedHouseType: null,
  selectedNPC: null,
  selectedHouse: null,
  cameraMode: 'FREE',
  
  // Actions
  setShowHouseModal: (show) => set((state) => ({ 
    showHouseModal: show,
    openWindows: show 
      ? [...state.openWindows.filter(id => id !== 'house'), 'house']
      : state.openWindows.filter(id => id !== 'house')
  })),
  setShowNPCModal: (show) => set((state) => ({ 
    showNPCModal: show,
    openWindows: show 
      ? [...state.openWindows.filter(id => id !== 'npc'), 'npc']
      : state.openWindows.filter(id => id !== 'npc')
  })),
  setShowStartMenu: (show) => set({ showStartMenu: show }),
  
  toggleWindow: (windowId) => set((state) => {
    const isOpen = state.openWindows.includes(windowId);
    if (windowId === 'house') {
      return { 
        showHouseModal: !isOpen,
        openWindows: !isOpen 
          ? [...state.openWindows.filter(id => id !== 'house'), 'house']
          : state.openWindows.filter(id => id !== 'house')
      };
    }
    if (windowId === 'npc') {
      return { 
        showNPCModal: !isOpen,
        openWindows: !isOpen 
          ? [...state.openWindows.filter(id => id !== 'npc'), 'npc']
          : state.openWindows.filter(id => id !== 'npc')
      };
    }
    return state;
  }),
  
  focusWindow: (windowId) => set((state) => ({
    openWindows: [...state.openWindows.filter(id => id !== windowId), windowId]
  })),
  
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
