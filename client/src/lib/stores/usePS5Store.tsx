/**
 * PlayStation 5 Integration Store
 * Manages PS5-specific features, controller state, and optimizations
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface PS5Settings {
  hapticFeedbackEnabled: boolean;
  adaptiveTriggersEnabled: boolean;
  ps5OptimizationsEnabled: boolean;
  performanceMonitoring: boolean;
  controllerDeadzone: number;
  hapticIntensity: number;
  audioEnhancement: boolean;
}

export interface PS5ControllerMapping {
  moveUp: string[];
  moveDown: string[];
  moveLeft: string[];
  moveRight: string[];
  interact: string[];
  menu: string[];
  cancel: string[];
  confirm: string[];
  quickAction: string[];
  pause: string[];
}

export interface PS5State {
  // Detection and connection
  isPS5Environment: boolean;
  controllerConnected: boolean;
  controllerFeatures: any;
  
  // Settings
  settings: PS5Settings;
  controllerMapping: PS5ControllerMapping;
  
  // Performance metrics
  performance: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    lastUpdate: number;
  };
  
  // Game-specific enhancements
  currentGameMode: 'menu' | 'gameplay' | 'building' | 'interaction';
  activeHapticProfile: string;
  
  // Actions
  setPS5Environment: (isPS5: boolean) => void;
  setControllerConnected: (connected: boolean) => void;
  setControllerFeatures: (features: any) => void;
  updateSettings: (settings: Partial<PS5Settings>) => void;
  updateControllerMapping: (mapping: Partial<PS5ControllerMapping>) => void;
  updatePerformance: (metrics: Partial<PS5State['performance']>) => void;
  setGameMode: (mode: PS5State['currentGameMode']) => void;
  setActiveHapticProfile: (profile: string) => void;
  
  // PS5-specific game actions
  triggerWorkFeedback: (workType: 'chopping' | 'mining' | 'building') => void;
  triggerUIFeedback: (uiType: 'select' | 'confirm' | 'cancel' | 'error' | 'success') => void;
  setWorkModeTriggers: (workType: 'light' | 'medium' | 'heavy') => void;
  resetToDefault: () => void;
  
  // Helper methods
  applyPS5Optimizations: () => void;
  applyGameModeSettings: (mode: PS5State['currentGameMode']) => void;
  startPerformanceMonitoring: () => void;
}

const defaultSettings: PS5Settings = {
  hapticFeedbackEnabled: true,
  adaptiveTriggersEnabled: true,
  ps5OptimizationsEnabled: true,
  performanceMonitoring: true,
  controllerDeadzone: 0.1,
  hapticIntensity: 0.7,
  audioEnhancement: true
};

const defaultControllerMapping: PS5ControllerMapping = {
  moveUp: ['dpadUp', 'leftStickUp'],
  moveDown: ['dpadDown', 'leftStickDown'],
  moveLeft: ['dpadLeft', 'leftStickLeft'],
  moveRight: ['dpadRight', 'leftStickRight'],
  interact: ['cross', 'r2'],
  menu: ['options'],
  cancel: ['circle'],
  confirm: ['cross'],
  quickAction: ['square', 'r1'],
  pause: ['options', 'share']
};

export const usePS5Store = create<PS5State>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isPS5Environment: false,
    controllerConnected: false,
    controllerFeatures: null,
    
    settings: defaultSettings,
    controllerMapping: defaultControllerMapping,
    
    performance: {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      lastUpdate: Date.now()
    },
    
    currentGameMode: 'menu',
    activeHapticProfile: 'default',
    
    // Actions
    setPS5Environment: (isPS5) => {
      set({ isPS5Environment: isPS5 });
      
      if (isPS5) {
        console.log('PlayStation 5 environment activated');
        // Apply PS5-specific optimizations
        get().applyPS5Optimizations();
      }
    },
    
    setControllerConnected: (connected) => {
      set({ controllerConnected: connected });
      
      if (connected) {
        console.log('DualSense controller connected');
        // Trigger connection feedback
        get().triggerUIFeedback('success');
      } else {
        console.log('DualSense controller disconnected');
      }
    },
    
    setControllerFeatures: (features) => {
      set({ controllerFeatures: features });
    },
    
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    },
    
    updateControllerMapping: (newMapping) => {
      set((state) => ({
        controllerMapping: { ...state.controllerMapping, ...newMapping }
      }));
    },
    
    updatePerformance: (metrics) => {
      set((state) => ({
        performance: { ...state.performance, ...metrics, lastUpdate: Date.now() }
      }));
    },
    
    setGameMode: (mode) => {
      const currentMode = get().currentGameMode;
      if (currentMode !== mode) {
        set({ currentGameMode: mode });
        
        // Apply mode-specific settings
        get().applyGameModeSettings(mode);
        
        // Trigger mode change feedback
        get().triggerUIFeedback('select');
      }
    },
    
    setActiveHapticProfile: (profile) => {
      set({ activeHapticProfile: profile });
    },
    
    // PS5-specific game actions
    triggerWorkFeedback: (workType) => {
      const { settings, isPS5Environment, controllerConnected } = get();
      
      if (!isPS5Environment || !controllerConnected || !settings.hapticFeedbackEnabled) {
        return;
      }
      
      // This would interface with the haptic system
      console.log(`Triggering ${workType} haptic feedback`);
      
      // Dispatch custom event for haptic controller
      window.dispatchEvent(new CustomEvent('ps5-haptic', {
        detail: { type: 'work', workType, intensity: settings.hapticIntensity }
      }));
    },
    
    triggerUIFeedback: (uiType) => {
      const { settings, isPS5Environment, controllerConnected } = get();
      
      if (!isPS5Environment || !controllerConnected || !settings.hapticFeedbackEnabled) {
        return;
      }
      
      console.log(`Triggering ${uiType} UI feedback`);
      
      // Dispatch custom event for haptic controller
      window.dispatchEvent(new CustomEvent('ps5-haptic', {
        detail: { type: 'ui', uiType, intensity: settings.hapticIntensity }
      }));
    },
    
    setWorkModeTriggers: (workType) => {
      const { settings, isPS5Environment, controllerConnected } = get();
      
      if (!isPS5Environment || !controllerConnected || !settings.adaptiveTriggersEnabled) {
        return;
      }
      
      console.log(`Setting ${workType} adaptive triggers`);
      
      // Dispatch custom event for adaptive triggers
      window.dispatchEvent(new CustomEvent('ps5-triggers', {
        detail: { workType }
      }));
    },
    
    resetToDefault: () => {
      set({
        settings: defaultSettings,
        controllerMapping: defaultControllerMapping,
        currentGameMode: 'menu',
        activeHapticProfile: 'default'
      });
      
      // Reset triggers
      window.dispatchEvent(new CustomEvent('ps5-triggers', {
        detail: { workType: 'reset' }
      }));
    },
    
    // Helper methods
    applyPS5Optimizations: () => {
      const { isPS5Environment, settings } = get();
      
      if (!isPS5Environment || !settings.ps5OptimizationsEnabled) return;
      
      // Apply visual optimizations
      document.documentElement.style.setProperty('--ps5-optimized', 'true');
      
      // Start performance monitoring if enabled
      if (settings.performanceMonitoring) {
        get().startPerformanceMonitoring();
      }
    },
    
    applyGameModeSettings: (mode: PS5State['currentGameMode']) => {
      const { settings } = get();
      
      if (!settings.adaptiveTriggersEnabled) return;
      
      switch (mode) {
        case 'menu':
          get().setWorkModeTriggers('light');
          break;
        case 'gameplay':
          get().setWorkModeTriggers('medium');
          break;
        case 'building':
          get().setWorkModeTriggers('heavy');
          break;
        case 'interaction':
          get().setWorkModeTriggers('light');
          break;
      }
    },
    
    startPerformanceMonitoring: () => {
      let frameCount = 0;
      let lastTime = performance.now();
      
      function measurePerformance() {
        const currentTime = performance.now();
        frameCount++;
        
        if (currentTime - lastTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
          const frameTime = 1000 / fps;
          
          // Get memory usage if available
          const memory = (performance as any).memory;
          const memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
          
          get().updatePerformance({
            fps,
            frameTime,
            memoryUsage
          });
          
          frameCount = 0;
          lastTime = currentTime;
        }
        
        requestAnimationFrame(measurePerformance);
      }
      
      requestAnimationFrame(measurePerformance);
    }
  }))
);

// Subscribe to game mode changes for automatic optimizations
usePS5Store.subscribe(
  (state) => state.currentGameMode,
  (mode) => {
    console.log(`PS5 game mode changed to: ${mode}`);
  }
);

// Subscribe to controller connection changes
usePS5Store.subscribe(
  (state) => state.controllerConnected,
  (connected) => {
    if (connected) {
      // Auto-apply current game mode settings when controller connects
      const { currentGameMode, applyGameModeSettings } = usePS5Store.getState();
      applyGameModeSettings(currentGameMode);
    }
  }
);