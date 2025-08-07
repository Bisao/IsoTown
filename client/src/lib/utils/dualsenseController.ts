/**
 * DualSense Controller Integration for PlayStation 5
 * Supports haptic feedback, adaptive triggers, and motion controls
 */

export interface DualSenseFeatures {
  hapticFeedback: boolean;
  adaptiveTriggers: boolean;
  motionControls: boolean;
  touchpad: boolean;
  lightbar: boolean;
}

export interface HapticPattern {
  intensity: number; // 0-1
  duration: number; // milliseconds
  pattern: 'short' | 'medium' | 'long' | 'pulse' | 'burst';
}

export interface AdaptiveTriggerSettings {
  leftTrigger: {
    resistance: number; // 0-1
    position: number; // 0-1
  };
  rightTrigger: {
    resistance: number; // 0-1
    position: number; // 0-1
  };
}

export class DualSenseController {
  private gamepad: Gamepad | null = null;
  private features: DualSenseFeatures;
  private connected = false;
  private vibrationSupported = false;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.features = {
      hapticFeedback: false,
      adaptiveTriggers: false,
      motionControls: false,
      touchpad: false,
      lightbar: false
    };
    
    this.init();
  }

  private init(): void {
    // Check for Gamepad API support
    if (!('getGamepads' in navigator)) {
      console.warn('Gamepad API not supported');
      return;
    }

    // Check for vibration support
    this.vibrationSupported = 'vibrate' in navigator;

    // Listen for gamepad events
    window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));

    // Start polling for gamepad state
    this.pollGamepadState();
  }

  private onGamepadConnected(event: GamepadEvent): void {
    const gamepad = event.gamepad;
    
    // Check if it's a DualSense controller
    if (this.isDualSense(gamepad)) {
      this.gamepad = gamepad;
      this.connected = true;
      this.detectFeatures(gamepad);
      
      console.log('DualSense controller connected:', gamepad.id);
      this.emit('connected', gamepad);
    }
  }

  private onGamepadDisconnected(event: GamepadEvent): void {
    if (this.gamepad && this.gamepad.index === event.gamepad.index) {
      this.gamepad = null;
      this.connected = false;
      
      console.log('DualSense controller disconnected');
      this.emit('disconnected');
    }
  }

  private isDualSense(gamepad: Gamepad): boolean {
    const dualsensePatterns = [
      /dualsense/i,
      /ps5/i,
      /playstation.*5/i,
      /054c.*0ce6/i, // Sony vendor ID and DualSense product ID
      /wireless controller/i
    ];
    
    return dualsensePatterns.some(pattern => pattern.test(gamepad.id));
  }

  private detectFeatures(gamepad: Gamepad): void {
    // Detect available features based on gamepad capabilities
    this.features = {
      hapticFeedback: this.vibrationSupported && gamepad.vibrationActuator !== undefined,
      adaptiveTriggers: gamepad.buttons.length >= 16, // DualSense has specific button count
      motionControls: true, // Assume available for DualSense
      touchpad: gamepad.buttons.length > 12, // Touchpad button
      lightbar: true // Assume available for DualSense
    };
    
    console.log('DualSense features detected:', this.features);
  }

  private pollGamepadState(): void {
    if (this.connected && this.gamepad) {
      // Update gamepad state
      const gamepads = navigator.getGamepads();
      this.gamepad = gamepads[this.gamepad.index];
      
      if (this.gamepad) {
        this.emit('stateUpdate', this.gamepad);
      }
    }
    
    requestAnimationFrame(this.pollGamepadState.bind(this));
  }

  private emit(event: string, data?: any): void {
    const listeners = this.callbacks.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  public on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.callbacks.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Trigger haptic feedback
   */
  public async triggerHapticFeedback(pattern: HapticPattern): Promise<void> {
    if (!this.features.hapticFeedback || !this.vibrationSupported) {
      console.warn('Haptic feedback not supported');
      return;
    }

    try {
      let vibrationPattern: number[] = [];
      
      switch (pattern.pattern) {
        case 'short':
          vibrationPattern = [Math.floor(pattern.duration * 0.3)];
          break;
        case 'medium':
          vibrationPattern = [Math.floor(pattern.duration * 0.6)];
          break;
        case 'long':
          vibrationPattern = [pattern.duration];
          break;
        case 'pulse':
          vibrationPattern = [100, 50, 100, 50, 100];
          break;
        case 'burst':
          vibrationPattern = [50, 25, 50, 25, 50, 25, 50];
          break;
      }
      
      // Apply intensity scaling
      vibrationPattern = vibrationPattern.map(duration => 
        Math.floor(duration * pattern.intensity)
      );
      
      navigator.vibrate(vibrationPattern);
      
      // Also try gamepad vibration if available
      if (this.gamepad?.vibrationActuator) {
        await this.gamepad.vibrationActuator.playEffect('dual-rumble', {
          duration: pattern.duration,
          strongMagnitude: pattern.intensity,
          weakMagnitude: pattern.intensity * 0.7
        });
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Set adaptive trigger resistance (simulated)
   */
  public setAdaptiveTriggers(settings: AdaptiveTriggerSettings): void {
    if (!this.features.adaptiveTriggers) {
      console.warn('Adaptive triggers not supported');
      return;
    }

    // Note: True adaptive trigger control requires direct hardware access
    // This is a simulation for web-based games
    console.log('Adaptive trigger settings applied:', settings);
    this.emit('adaptiveTriggersChanged', settings);
  }

  /**
   * Get current controller state
   */
  public getState(): any {
    if (!this.gamepad) return null;
    
    return {
      connected: this.connected,
      buttons: Array.from(this.gamepad.buttons).map(button => ({
        pressed: button.pressed,
        value: button.value
      })),
      axes: Array.from(this.gamepad.axes),
      features: this.features,
      timestamp: this.gamepad.timestamp
    };
  }

  /**
   * Check if controller is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get available features
   */
  public getFeatures(): DualSenseFeatures {
    return { ...this.features };
  }

  /**
   * Predefined haptic patterns for common game actions
   */
  public static readonly HapticPatterns = {
    MENU_SELECT: { intensity: 0.3, duration: 50, pattern: 'short' as const },
    BUTTON_PRESS: { intensity: 0.5, duration: 100, pattern: 'short' as const },
    NOTIFICATION: { intensity: 0.4, duration: 200, pattern: 'pulse' as const },
    SUCCESS: { intensity: 0.6, duration: 300, pattern: 'burst' as const },
    ERROR: { intensity: 0.8, duration: 500, pattern: 'long' as const },
    WOOD_CHOP: { intensity: 0.7, duration: 150, pattern: 'medium' as const },
    STONE_BREAK: { intensity: 0.9, duration: 200, pattern: 'burst' as const },
    HOUSE_BUILD: { intensity: 0.5, duration: 250, pattern: 'pulse' as const }
  };

  /**
   * Predefined adaptive trigger settings
   */
  public static readonly TriggerPresets = {
    DEFAULT: {
      leftTrigger: { resistance: 0, position: 0 },
      rightTrigger: { resistance: 0, position: 0 }
    },
    HEAVY_TOOL: {
      leftTrigger: { resistance: 0.7, position: 0.3 },
      rightTrigger: { resistance: 0.7, position: 0.3 }
    },
    PRECISION_WORK: {
      leftTrigger: { resistance: 0.4, position: 0.2 },
      rightTrigger: { resistance: 0.4, position: 0.2 }
    },
    BUILDING: {
      leftTrigger: { resistance: 0.6, position: 0.4 },
      rightTrigger: { resistance: 0.6, position: 0.4 }
    }
  };
}