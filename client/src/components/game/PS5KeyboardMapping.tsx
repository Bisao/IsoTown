/**
 * PS5 Keyboard Integration for enhanced gamepad support
 * Maps DualSense controller inputs to keyboard events for seamless integration
 */

import { useEffect } from 'react';
import { usePS5Controller } from '../../hooks/usePS5Controller';

export function PS5KeyboardMapping() {
  const { isConnected, buttons, sticks } = usePS5Controller();

  // Map controller inputs to keyboard events
  useEffect(() => {
    if (!isConnected) return;

    const dispatchKeyEvent = (key: string, type: 'keydown' | 'keyup') => {
      const event = new KeyboardEvent(type, {
        key,
        code: key,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    };

    // D-pad to arrow keys
    if (buttons.dpadUp) {
      dispatchKeyEvent('ArrowUp', 'keydown');
    }
    if (buttons.dpadDown) {
      dispatchKeyEvent('ArrowDown', 'keydown');
    }
    if (buttons.dpadLeft) {
      dispatchKeyEvent('ArrowLeft', 'keydown');
    }
    if (buttons.dpadRight) {
      dispatchKeyEvent('ArrowRight', 'keydown');
    }

    // Left stick to WASD
    const deadzone = 0.3;
    if (sticks.leftStick.y < -deadzone) {
      dispatchKeyEvent('KeyW', 'keydown');
    }
    if (sticks.leftStick.y > deadzone) {
      dispatchKeyEvent('KeyS', 'keydown');
    }
    if (sticks.leftStick.x < -deadzone) {
      dispatchKeyEvent('KeyA', 'keydown');
    }
    if (sticks.leftStick.x > deadzone) {
      dispatchKeyEvent('KeyD', 'keydown');
    }

    // Action buttons
    if (buttons.cross) {
      dispatchKeyEvent('Space', 'keydown');
      dispatchKeyEvent('Enter', 'keydown');
    }
    if (buttons.square) {
      dispatchKeyEvent('KeyE', 'keydown');
    }
    if (buttons.triangle) {
      dispatchKeyEvent('Escape', 'keydown');
    }
    if (buttons.circle) {
      dispatchKeyEvent('Escape', 'keydown');
    }

    // Shoulder buttons
    if (buttons.l1) {
      dispatchKeyEvent('KeyQ', 'keydown');
    }
    if (buttons.r1) {
      dispatchKeyEvent('KeyR', 'keydown');
    }

    // Triggers
    if (buttons.l2 > 0.5) {
      dispatchKeyEvent('Shift', 'keydown');
    }
    if (buttons.r2 > 0.5) {
      dispatchKeyEvent('Control', 'keydown');
    }

  }, [isConnected, buttons, sticks]);

  return null;
}

// Virtual cursor for PS5 browser navigation
export function PS5VirtualCursor() {
  const { isConnected, sticks, buttons } = usePS5Controller();

  useEffect(() => {
    if (!isConnected) return;

    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;

    const updateCursor = () => {
      const sensitivity = 5;
      const { x, y } = sticks.rightStick;
      
      if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
        cursorX += x * sensitivity;
        cursorY += y * sensitivity;
        
        // Clamp to screen bounds
        cursorX = Math.max(0, Math.min(window.innerWidth, cursorX));
        cursorY = Math.max(0, Math.min(window.innerHeight, cursorY));
        
        // Update cursor position
        document.documentElement.style.setProperty('--ps5-cursor-x', `${cursorX}px`);
        document.documentElement.style.setProperty('--ps5-cursor-y', `${cursorY}px`);
        
        // Show cursor
        document.documentElement.classList.add('ps5-cursor-active');
      }
      
      // Handle cursor clicks
      if (buttons.cross) {
        const element = document.elementFromPoint(cursorX, cursorY);
        if (element && element instanceof HTMLElement) {
          element.click();
        }
      }
    };

    const interval = setInterval(updateCursor, 16); // 60fps

    // Add cursor styles
    const style = document.createElement('style');
    style.textContent = `
      .ps5-cursor-active::after {
        content: '';
        position: fixed;
        left: var(--ps5-cursor-x, 50%);
        top: var(--ps5-cursor-y, 50%);
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, #00aaff, #0066cc);
        border: 2px solid white;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999999;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 10px rgba(0, 170, 255, 0.6);
      }
    `;
    document.head.appendChild(style);

    return () => {
      clearInterval(interval);
      document.documentElement.classList.remove('ps5-cursor-active');
      document.head.removeChild(style);
    };
  }, [isConnected, sticks, buttons]);

  return null;
}