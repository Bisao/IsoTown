/**
 * Simplified PS5 Integration - Working Version
 * Provides basic DualSense controller support without causing React loops
 */

import { useEffect, useState, useCallback } from 'react';

interface PS5ControllerState {
  connected: boolean;
  gamepad: Gamepad | null;
  lastUpdate: number;
}

export function PS5SimpleController() {
  const [controllerState, setControllerState] = useState<PS5ControllerState>({
    connected: false,
    gamepad: null,
    lastUpdate: 0
  });

  // Check for PS5 browser
  const isPS5Browser = useCallback(() => {
    const userAgent = navigator.userAgent;
    return /PlayStation 5|PS5|PlayStation.*5/i.test(userAgent);
  }, []);

  // Initialize controller detection
  useEffect(() => {
    if (!isPS5Browser()) return;

    // console.log('PlayStation 5 browser detected');

    let animationFrame: number;
    
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads?.() || [];
      const dualsense = Array.from(gamepads).find(gamepad => 
        gamepad && /dualsense|ps5|wireless controller/i.test(gamepad.id)
      );

      const now = performance.now();
      
      setControllerState(prev => {
        const newState = {
          connected: !!dualsense,
          gamepad: dualsense || null,
          lastUpdate: now
        };
        
        // Only update if something changed
        if (prev.connected !== newState.connected || 
            (dualsense && prev.lastUpdate < now - 100)) {
          return newState;
        }
        return prev;
      });

      animationFrame = requestAnimationFrame(pollGamepad);
    };

    // Start polling
    animationFrame = requestAnimationFrame(pollGamepad);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPS5Browser]);

  // Handle controller input
  useEffect(() => {
    if (!controllerState.connected || !controllerState.gamepad) return;

    const gamepad = controllerState.gamepad;
    
    // Basic button mapping
    const buttons = {
      cross: gamepad.buttons[0]?.pressed,
      circle: gamepad.buttons[1]?.pressed,
      square: gamepad.buttons[2]?.pressed,
      triangle: gamepad.buttons[3]?.pressed,
      l1: gamepad.buttons[4]?.pressed,
      r1: gamepad.buttons[5]?.pressed,
      l2: gamepad.buttons[6]?.value || 0,
      r2: gamepad.buttons[7]?.value || 0,
      options: gamepad.buttons[9]?.pressed,
      dpadUp: gamepad.buttons[12]?.pressed,
      dpadDown: gamepad.buttons[13]?.pressed,
      dpadLeft: gamepad.buttons[14]?.pressed,
      dpadRight: gamepad.buttons[15]?.pressed
    };

    const sticks = {
      leftX: gamepad.axes[0] || 0,
      leftY: gamepad.axes[1] || 0,
      rightX: gamepad.axes[2] || 0,
      rightY: gamepad.axes[3] || 0
    };

    // Dispatch controller events for game integration
    if (buttons.cross) {
      window.dispatchEvent(new CustomEvent('ps5-button', { 
        detail: { button: 'cross', action: 'interact' }
      }));
    }

    if (buttons.square) {
      window.dispatchEvent(new CustomEvent('ps5-button', { 
        detail: { button: 'square', action: 'action' }
      }));
    }

    // Movement with deadzone
    const deadzone = 0.2;
    if (Math.abs(sticks.leftX) > deadzone || Math.abs(sticks.leftY) > deadzone) {
      window.dispatchEvent(new CustomEvent('ps5-movement', {
        detail: { 
          x: Math.abs(sticks.leftX) > deadzone ? sticks.leftX : 0,
          y: Math.abs(sticks.leftY) > deadzone ? sticks.leftY : 0
        }
      }));
    }

    // Triggers - R2 para cortar madeira
    if (buttons.r2 > 0.5) {
      window.dispatchEvent(new CustomEvent('ps5-button', { 
        detail: { button: 'r2', action: 'chopWood', intensity: buttons.r2 }
      }));
      
      // Trigger manual work action
      window.dispatchEvent(new CustomEvent('manual-work-action', {
        detail: { action: 'chop', source: 'ps5-r2' }
      }));
      
      // console.log('PS5 R2: Cortar madeira ativado');
    }

    // Haptic feedback simulation
    if (buttons.cross || buttons.square || buttons.r2 > 0.5) {
      // Simple vibration if available
      if ('vibrate' in navigator) {
        const intensity = buttons.r2 > 0.5 ? Math.floor(buttons.r2 * 100) : 50;
        navigator.vibrate(intensity);
      }
    }

  }, [controllerState.connected, controllerState.gamepad, controllerState.lastUpdate]);

  return null; // This component doesn't render anything
}

export function PS5SimpleStatus() {
  const [isPS5, setIsPS5] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);

  useEffect(() => {
    // Check PS5 browser once
    const userAgent = navigator.userAgent;
    setIsPS5(/PlayStation 5|PS5|PlayStation.*5/i.test(userAgent));

    // Check controller periodically
    const checkController = () => {
      if ('getGamepads' in navigator) {
        const gamepads = navigator.getGamepads() || [];
        const dualsense = Array.from(gamepads).find(gamepad => 
          gamepad && /dualsense|ps5|wireless controller/i.test(gamepad.id)
        );
        setControllerConnected(!!dualsense);
      }
    };

    // Check immediately and then every 2 seconds
    checkController();
    const interval = setInterval(checkController, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isPS5) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-900/90 text-white p-3 rounded-lg text-sm border border-blue-500">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
        <span className="font-semibold">PlayStation 5</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${controllerConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-xs">
          DualSense {controllerConnected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      
      {controllerConnected && (
        <div className="mt-2 text-xs text-blue-200">
          <div>✓ Haptic Feedback</div>
          <div>✓ Controles Adaptados</div>
          <div>✓ Navegação Otimizada</div>
        </div>
      )}
    </div>
  );
}

export function PS5KeyboardIntegration() {
  useEffect(() => {
    // Listen for PS5 controller events and convert to keyboard
    const handlePS5Button = (event: CustomEvent) => {
      const { button, action } = event.detail;
      
      // Dispatch keyboard events based on controller input
      const keyEvent = new KeyboardEvent('keydown', {
        key: button === 'cross' ? 'Space' : button === 'square' ? 'KeyE' : 'Escape',
        bubbles: true
      });
      
      document.dispatchEvent(keyEvent);
    };

    const handlePS5Movement = (event: CustomEvent) => {
      const { x, y } = event.detail;
      
      // Convert stick movement to arrow keys
      if (Math.abs(x) > 0.3) {
        const key = x > 0 ? 'ArrowRight' : 'ArrowLeft';
        const keyEvent = new KeyboardEvent('keydown', { key, bubbles: true });
        document.dispatchEvent(keyEvent);
      }
      
      if (Math.abs(y) > 0.3) {
        const key = y > 0 ? 'ArrowDown' : 'ArrowUp';
        const keyEvent = new KeyboardEvent('keydown', { key, bubbles: true });
        document.dispatchEvent(keyEvent);
      }
    };

    window.addEventListener('ps5-button', handlePS5Button as EventListener);
    window.addEventListener('ps5-movement', handlePS5Movement as EventListener);

    return () => {
      window.removeEventListener('ps5-button', handlePS5Button as EventListener);
      window.removeEventListener('ps5-movement', handlePS5Movement as EventListener);
    };
  }, []);

  return null;
}