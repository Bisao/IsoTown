/**
 * PlayStation 5 Browser Detection and Optimization Utilities
 */

export interface PS5BrowserInfo {
  isPS5: boolean;
  userAgent: string;
  screenResolution: {
    width: number;
    height: number;
  };
  capabilities: {
    webGL: boolean;
    webGL2: boolean;
    gamepadAPI: boolean;
    vibrationAPI: boolean;
  };
}

/**
 * Detects if the browser is running on PlayStation 5
 */
export function detectPS5Browser(): PS5BrowserInfo {
  const userAgent = navigator.userAgent;
  
  // PS5 browser user agent patterns
  const ps5Patterns = [
    /PlayStation 5/i,
    /PS5/i,
    /PlayStation.*5/i,
    /PLAYSTATION.*5/i
  ];
  
  const isPS5 = ps5Patterns.some(pattern => pattern.test(userAgent));
  
  // Check for WebGL capabilities
  const canvas = document.createElement('canvas');
  const webGL = !!canvas.getContext('webgl');
  const webGL2 = !!canvas.getContext('webgl2');
  
  // Check for Gamepad API
  const gamepadAPI = 'getGamepads' in navigator;
  
  // Check for Vibration API
  const vibrationAPI = 'vibrate' in navigator;
  
  return {
    isPS5,
    userAgent,
    screenResolution: {
      width: window.screen.width,
      height: window.screen.height
    },
    capabilities: {
      webGL,
      webGL2,
      gamepadAPI,
      vibrationAPI
    }
  };
}

/**
 * Applies PS5-specific optimizations
 */
export function applyPS5Optimizations(): void {
  const browserInfo = detectPS5Browser();
  
  if (!browserInfo.isPS5) return;
  
  // Apply PS5-specific CSS optimizations
  const style = document.createElement('style');
  style.textContent = `
    /* PS5 Browser Optimizations */
    body {
      /* Optimize for PS5 screen dimensions */
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    
    /* Disable text selection for better controller navigation */
    * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    /* Optimize canvas rendering for PS5 */
    canvas {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      image-rendering: pixelated;
    }
    
    /* Better focus indicators for controller navigation */
    button:focus,
    input:focus,
    select:focus {
      outline: 3px solid #00aaff;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
  
  // Set viewport for PS5 optimization
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  
  console.log('PlayStation 5 optimizations applied');
}

/**
 * Get PS5-optimized render settings
 */
export function getPS5RenderSettings() {
  const browserInfo = detectPS5Browser();
  
  if (!browserInfo.isPS5) {
    return {
      pixelRatio: window.devicePixelRatio || 1,
      antialias: true,
      precision: 'highp' as const,
      powerPreference: 'default' as const
    };
  }
  
  // PS5-optimized settings
  return {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // Limit for performance
    antialias: true,
    precision: 'highp' as const,
    powerPreference: 'high-performance' as const,
    alpha: false, // Better performance
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
    depth: true
  };
}

/**
 * Monitor PS5 browser performance
 */
export function monitorPS5Performance() {
  const browserInfo = detectPS5Browser();
  
  if (!browserInfo.isPS5) return;
  
  let frameCount = 0;
  let lastTime = performance.now();
  
  function measureFPS() {
    const currentTime = performance.now();
    frameCount++;
    
    if (currentTime - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      console.log(`PS5 Browser FPS: ${fps}`);
      
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(measureFPS);
  }
  
  requestAnimationFrame(measureFPS);
}