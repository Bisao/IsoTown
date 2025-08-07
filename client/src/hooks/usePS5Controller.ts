/**
 * React Hook for PlayStation 5 DualSense Controller Integration
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { DualSenseController, HapticPattern, AdaptiveTriggerSettings, DualSenseFeatures } from '../lib/utils/dualsenseController';

export interface PS5ControllerState {
  connected: boolean;
  gamepad: Gamepad | null;
  features: DualSenseFeatures;
  buttons: Array<{ pressed: boolean; value: number }>;
  axes: number[];
}

export interface UsePS5ControllerOptions {
  enableHaptics?: boolean;
  enableAdaptiveTriggers?: boolean;
  autoConnect?: boolean;
}

export function usePS5Controller(options: UsePS5ControllerOptions = {}) {
  const {
    enableHaptics = true,
    enableAdaptiveTriggers = true,
    autoConnect = true
  } = options;

  const [state, setState] = useState<PS5ControllerState>({
    connected: false,
    gamepad: null,
    features: {
      hapticFeedback: false,
      adaptiveTriggers: false,
      motionControls: false,
      touchpad: false,
      lightbar: false
    },
    buttons: [],
    axes: []
  });

  const controllerRef = useRef<DualSenseController | null>(null);

  // Initialize controller
  useEffect(() => {
    if (!autoConnect) return;

    controllerRef.current = new DualSenseController();
    const controller = controllerRef.current;

    const handleConnected = (gamepad: Gamepad) => {
      setState(prevState => ({
        ...prevState,
        connected: true,
        gamepad,
        features: controller.getFeatures()
      }));
    };

    const handleDisconnected = () => {
      setState(prevState => ({
        ...prevState,
        connected: false,
        gamepad: null,
        buttons: [],
        axes: []
      }));
    };

    const handleStateUpdate = (gamepad: Gamepad) => {
      if (gamepad) {
        setState(prevState => ({
          ...prevState,
          gamepad,
          buttons: Array.from(gamepad.buttons).map(button => ({
            pressed: button.pressed,
            value: button.value
          })),
          axes: Array.from(gamepad.axes)
        }));
      }
    };

    controller.on('connected', handleConnected);
    controller.on('disconnected', handleDisconnected);
    controller.on('stateUpdate', handleStateUpdate);

    return () => {
      if (controller) {
        controller.off('connected', handleConnected);
        controller.off('disconnected', handleDisconnected);
        controller.off('stateUpdate', handleStateUpdate);
      }
    };
  }, [autoConnect]);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback(async (pattern: HapticPattern) => {
    if (!enableHaptics || !controllerRef.current) return;
    
    try {
      await controllerRef.current.triggerHapticFeedback(pattern);
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }, [enableHaptics]);

  // Adaptive triggers function
  const setAdaptiveTriggers = useCallback((settings: AdaptiveTriggerSettings) => {
    if (!enableAdaptiveTriggers || !controllerRef.current) return;
    
    controllerRef.current.setAdaptiveTriggers(settings);
  }, [enableAdaptiveTriggers]);

  // Predefined haptic patterns
  const hapticPatterns = DualSenseController.HapticPatterns;
  const triggerPresets = DualSenseController.TriggerPresets;

  // Utility functions for common game actions
  const gameActions = {
    // Menu interactions
    menuSelect: () => triggerHapticFeedback(hapticPatterns.MENU_SELECT),
    buttonPress: () => triggerHapticFeedback(hapticPatterns.BUTTON_PRESS),
    
    // Game notifications
    notification: () => triggerHapticFeedback(hapticPatterns.NOTIFICATION),
    success: () => triggerHapticFeedback(hapticPatterns.SUCCESS),
    error: () => triggerHapticFeedback(hapticPatterns.ERROR),
    
    // Work actions
    chopWood: () => {
      triggerHapticFeedback(hapticPatterns.WOOD_CHOP);
      setAdaptiveTriggers(triggerPresets.HEAVY_TOOL);
    },
    
    breakStone: () => {
      triggerHapticFeedback(hapticPatterns.STONE_BREAK);
      setAdaptiveTriggers(triggerPresets.HEAVY_TOOL);
    },
    
    buildHouse: () => {
      triggerHapticFeedback(hapticPatterns.HOUSE_BUILD);
      setAdaptiveTriggers(triggerPresets.BUILDING);
    },
    
    // Reset triggers to default
    resetTriggers: () => setAdaptiveTriggers(triggerPresets.DEFAULT)
  };

  // Button mapping for easy access
  const buttons = {
    square: state.buttons[0]?.pressed || false,
    cross: state.buttons[1]?.pressed || false,
    circle: state.buttons[2]?.pressed || false,
    triangle: state.buttons[3]?.pressed || false,
    l1: state.buttons[4]?.pressed || false,
    r1: state.buttons[5]?.pressed || false,
    l2: state.buttons[6]?.value || 0,
    r2: state.buttons[7]?.value || 0,
    share: state.buttons[8]?.pressed || false,
    options: state.buttons[9]?.pressed || false,
    l3: state.buttons[10]?.pressed || false,
    r3: state.buttons[11]?.pressed || false,
    dpadUp: state.buttons[12]?.pressed || false,
    dpadDown: state.buttons[13]?.pressed || false,
    dpadLeft: state.buttons[14]?.pressed || false,
    dpadRight: state.buttons[15]?.pressed || false,
    touchpad: state.buttons[16]?.pressed || false
  };

  // Stick mapping
  const sticks = {
    leftStick: {
      x: state.axes[0] || 0,
      y: state.axes[1] || 0
    },
    rightStick: {
      x: state.axes[2] || 0,
      y: state.axes[3] || 0
    }
  };

  return {
    // State
    isConnected: state.connected,
    features: state.features,
    
    // Controls
    buttons,
    sticks,
    
    // Raw state (for advanced usage)
    rawState: state,
    
    // Functions
    triggerHapticFeedback,
    setAdaptiveTriggers,
    
    // Predefined patterns and presets
    hapticPatterns,
    triggerPresets,
    
    // Game-specific actions
    gameActions,
    
    // Controller instance (for advanced usage)
    controller: controllerRef.current
  };
}

// Hook for detecting PS5 browser environment
export function usePS5Detection() {
  const [isPS5, setIsPS5] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<any>(null);

  useEffect(() => {
    const detectBrowser = async () => {
      const { detectPS5Browser, applyPS5Optimizations, monitorPS5Performance } = 
        await import('../lib/utils/ps5Detection');
      
      const info = detectPS5Browser();
      setIsPS5(info.isPS5);
      setBrowserInfo(info);
      
      if (info.isPS5) {
        applyPS5Optimizations();
        monitorPS5Performance();
        console.log('PlayStation 5 environment detected and optimized');
      }
    };

    detectBrowser();
  }, []);

  return {
    isPS5,
    browserInfo
  };
}