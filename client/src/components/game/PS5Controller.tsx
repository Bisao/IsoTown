/**
 * PS5 Controller Integration Component
 * Handles DualSense controller events and provides haptic feedback for game actions
 */

import { useEffect, useState } from 'react';
import { usePS5Controller, usePS5Detection } from '../../hooks/usePS5Controller';
import { usePS5Store } from '../../lib/stores/usePS5Store';
import { useNPCStore } from '../../lib/stores/useNPCStore';
import { useGameStore } from '../../lib/stores/useGameStore';

export function PS5Controller() {
  const { isPS5 } = usePS5Detection();
  const {
    isConnected,
    features,
    buttons,
    sticks,
    gameActions,
    controller
  } = usePS5Controller({
    enableHaptics: true,
    enableAdaptiveTriggers: true,
    autoConnect: true
  });

  const ps5Store = usePS5Store();
  const npcStore = useNPCStore();
  const gameStore = useGameStore();

  // Update PS5 store when controller state changes
  useEffect(() => {
    ps5Store.setPS5Environment(isPS5);
  }, [isPS5, ps5Store]);

  useEffect(() => {
    ps5Store.setControllerConnected(isConnected);
    if (isConnected) {
      ps5Store.setControllerFeatures(features);
    }
  }, [isConnected, features, ps5Store]);

  // Handle controller input for game navigation
  useEffect(() => {
    if (!isConnected) return;

    // Movement controls
    const handleMovement = () => {
      const deadzone = 0.1;
      const { x: leftX, y: leftY } = sticks.leftStick;
      
      // Only process if stick is moved beyond deadzone
      if (Math.abs(leftX) > deadzone || Math.abs(leftY) > deadzone) {
        // Convert stick input to movement
        const moveX = Math.abs(leftX) > deadzone ? leftX : 0;
        const moveY = Math.abs(leftY) > deadzone ? leftY : 0;
        
        // Dispatch movement event
        window.dispatchEvent(new CustomEvent('ps5-movement', {
          detail: { x: moveX, y: moveY }
        }));
      }
    };

    // D-pad navigation
    if (buttons.dpadUp) {
      window.dispatchEvent(new CustomEvent('ps5-dpad', { detail: { direction: 'up' } }));
    }
    if (buttons.dpadDown) {
      window.dispatchEvent(new CustomEvent('ps5-dpad', { detail: { direction: 'down' } }));
    }
    if (buttons.dpadLeft) {
      window.dispatchEvent(new CustomEvent('ps5-dpad', { detail: { direction: 'left' } }));
    }
    if (buttons.dpadRight) {
      window.dispatchEvent(new CustomEvent('ps5-dpad', { detail: { direction: 'right' } }));
    }

    handleMovement();
  }, [isConnected, buttons, sticks]);

  // Handle game-specific button actions
  useEffect(() => {
    if (!isConnected) return;

    // Action buttons with haptic feedback
    if (buttons.cross) {
      gameActions.buttonPress();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'interact' } }));
    }

    if (buttons.square) {
      gameActions.menuSelect();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'quickAction' } }));
    }

    if (buttons.triangle) {
      gameActions.menuSelect();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'menu' } }));
    }

    if (buttons.circle) {
      gameActions.buttonPress();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'cancel' } }));
    }

    // Shoulder buttons for tools/actions
    if (buttons.l1) {
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'tool1' } }));
    }

    if (buttons.r1) {
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'tool2' } }));
    }

    // Trigger actions for work
    if (buttons.l2 > 0.5) {
      gameActions.chopWood();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'work', intensity: buttons.l2 } }));
    }

    if (buttons.r2 > 0.5) {
      gameActions.buildHouse();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'build', intensity: buttons.r2 } }));
    }

    // Menu buttons
    if (buttons.options) {
      gameActions.menuSelect();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'options' } }));
    }

    if (buttons.share) {
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'share' } }));
    }

    // Touchpad
    if (buttons.touchpad) {
      gameActions.notification();
      window.dispatchEvent(new CustomEvent('ps5-action', { detail: { action: 'touchpad' } }));
    }
  }, [isConnected, buttons, gameActions]);

  // Listen for custom haptic events from the game
  useEffect(() => {
    if (!isConnected) return;

    const handleHapticEvent = (event: CustomEvent) => {
      const { type, workType, uiType, intensity } = event.detail;
      
      if (type === 'work') {
        switch (workType) {
          case 'chopping':
            gameActions.chopWood();
            break;
          case 'mining':
            gameActions.breakStone();
            break;
          case 'building':
            gameActions.buildHouse();
            break;
        }
      } else if (type === 'ui') {
        switch (uiType) {
          case 'select':
            gameActions.menuSelect();
            break;
          case 'confirm':
            gameActions.success();
            break;
          case 'cancel':
            gameActions.buttonPress();
            break;
          case 'error':
            gameActions.error();
            break;
          case 'success':
            gameActions.success();
            break;
        }
      }
    };

    const handleTriggerEvent = (event: CustomEvent) => {
      const { workType } = event.detail;
      
      switch (workType) {
        case 'light':
          gameActions.resetTriggers();
          break;
        case 'medium':
          // Medium resistance
          break;
        case 'heavy':
          // Heavy resistance for construction/heavy work
          break;
        case 'reset':
          gameActions.resetTriggers();
          break;
      }
    };

    window.addEventListener('ps5-haptic', handleHapticEvent as EventListener);
    window.addEventListener('ps5-triggers', handleTriggerEvent as EventListener);

    return () => {
      window.removeEventListener('ps5-haptic', handleHapticEvent as EventListener);
      window.removeEventListener('ps5-triggers', handleTriggerEvent as EventListener);
    };
  }, [isConnected, gameActions]);

  // Set appropriate game mode based on current game state
  useEffect(() => {
    if (!isConnected) return;

    // Determine game mode based on game state
    if (gameStore.showHouseModal || gameStore.showNPCModal) {
      ps5Store.setGameMode('building');
    } else if (gameStore.selectedHouse || gameStore.selectedNPC) {
      ps5Store.setGameMode('interaction');
    } else {
      ps5Store.setGameMode('gameplay');
    }
  }, [
    isConnected,
    gameStore.showHouseModal,
    gameStore.showNPCModal,
    gameStore.selectedHouse,
    gameStore.selectedNPC,
    ps5Store
  ]);

  // This component doesn't render anything visible
  // It only handles controller integration in the background
  return null;
}

// PS5 Controller Status Indicator (optional UI component)
export function PS5ControllerStatus() {
  const [isPS5, setIsPS5] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [features, setFeatures] = useState<any>({});

  useEffect(() => {
    // Simulate PS5 detection without causing loops
    const checkPS5 = () => {
      const userAgent = navigator.userAgent;
      const ps5Pattern = /PlayStation 5|PS5|PlayStation.*5/i;
      setIsPS5(ps5Pattern.test(userAgent));
    };

    const checkController = () => {
      if ('getGamepads' in navigator) {
        const gamepads = navigator.getGamepads();
        const dualsense = Array.from(gamepads).find(gamepad => 
          gamepad && /dualsense|ps5|wireless controller/i.test(gamepad.id)
        );
        setIsConnected(!!dualsense);
        if (dualsense) {
          setFeatures({
            hapticFeedback: true,
            adaptiveTriggers: true
          });
        }
      }
    };

    checkPS5();
    checkController();

    const interval = setInterval(checkController, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isPS5) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white p-2 rounded-lg text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>DualSense {isConnected ? 'Conectado' : 'Desconectado'}</span>
      </div>
      
      {isConnected && (
        <div className="mt-1 text-xs opacity-70">
          <div>Haptics: {features.hapticFeedback ? '✓' : '✗'}</div>
          <div>Triggers: {features.adaptiveTriggers ? '✓' : '✗'}</div>
        </div>
      )}
    </div>
  );
}