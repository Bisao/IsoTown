import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { renderRandom } from '../utils/deterministicRandom';
import { logger } from '../utils/logger';

export type WeatherType = 'sunny' | 'cloudy' | 'light_rain' | 'heavy_rain' | 'storm' | 'snow';

export interface WeatherState {
  type: WeatherType;
  intensity: number; // 0-1
  transitionProgress: number; // 0-1 for smooth transitions
  isTransitioning: boolean;
  duration: number; // How long this weather lasts (in game minutes)
  startTime: number; // When this weather started
}

export interface RainParticle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  length: number;
  alpha: number;
}

export interface RainSplash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface CloudParticle {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  speed: number;
}

interface WeatherStore {
  // Weather state
  currentWeather: WeatherState;
  nextWeather: WeatherType | null;
  
  // Particle systems
  rainParticles: RainParticle[];
  rainSplashes: RainSplash[];
  cloudParticles: CloudParticle[];
  
  // Settings
  weatherEnabled: boolean;
  autoWeatherChange: boolean;
  
  // Actions
  setWeatherType: (type: WeatherType) => void;
  updateWeather: (gameTime: number) => void;
  initializeParticles: (canvasWidth: number, canvasHeight: number) => void;
  updateParticles: (canvasWidth: number, canvasHeight: number, deltaTime: number) => void;
  toggleWeather: () => void;
  setWeatherEnabled: (enabled: boolean) => void;
  generateNextWeather: (currentTime: number) => WeatherType;
}

// Weather transition probabilities based on current weather
const WEATHER_TRANSITIONS: Record<WeatherType, Record<WeatherType, number>> = {
  sunny: { cloudy: 0.3, light_rain: 0.1, heavy_rain: 0.05, storm: 0.02, snow: 0.03, sunny: 0.5 },
  cloudy: { sunny: 0.2, light_rain: 0.3, heavy_rain: 0.15, storm: 0.05, snow: 0.05, cloudy: 0.25 },
  light_rain: { cloudy: 0.4, heavy_rain: 0.25, storm: 0.1, sunny: 0.15, snow: 0.05, light_rain: 0.05 },
  heavy_rain: { light_rain: 0.3, storm: 0.2, cloudy: 0.3, sunny: 0.1, snow: 0.05, heavy_rain: 0.05 },
  storm: { heavy_rain: 0.4, light_rain: 0.2, cloudy: 0.25, sunny: 0.1, snow: 0.03, storm: 0.02 },
  snow: { cloudy: 0.4, sunny: 0.2, light_rain: 0.1, heavy_rain: 0.05, storm: 0.02, snow: 0.23 }
};

// Weather durations in milliseconds (longer durations)
const WEATHER_DURATIONS: Record<WeatherType, [number, number]> = {
  sunny: [30000, 90000],    // 30-90 seconds
  cloudy: [20000, 60000],   // 20-60 seconds
  light_rain: [15000, 45000], // 15-45 seconds
  heavy_rain: [10000, 30000], // 10-30 seconds
  storm: [5000, 15000],      // 5-15 seconds
  snow: [20000, 50000]       // 20-50 seconds
};

export const useWeatherStore = create<WeatherStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentWeather: {
      type: 'sunny',
      intensity: 0.7,
      transitionProgress: 1,
      isTransitioning: false,
      duration: 60000, // 60 seconds in milliseconds
      startTime: Date.now()
    },
    nextWeather: null,
    
    rainParticles: [],
    rainSplashes: [],
    cloudParticles: [],
    
    weatherEnabled: true,
    autoWeatherChange: true,
    
    setWeatherType: (type: WeatherType) => set((state) => {
      logger.log(`Mudança climática para: ${type}`);
      return {
        currentWeather: {
          ...state.currentWeather,
          type,
          startTime: Date.now(),
          duration: renderRandom.between(...WEATHER_DURATIONS[type]),
          isTransitioning: false,
          transitionProgress: 1
        },
        nextWeather: null
      };
    }),
    
    updateWeather: (gameTime: number) => {
      const state = get();
      if (!state.weatherEnabled || !state.autoWeatherChange) return;
      
      const { currentWeather } = state;
      const elapsed = gameTime - currentWeather.startTime;
      
      // Check if current weather should change (with throttling)
      if (elapsed >= currentWeather.duration && elapsed > 1000) { // At least 1 second between changes
        const nextWeather = state.generateNextWeather(gameTime);
        if (nextWeather !== currentWeather.type) { // Only change if different
          state.setWeatherType(nextWeather);
        }
      }
    },
    
    generateNextWeather: (currentTime: number) => {
      const { currentWeather } = get();
      const transitions = WEATHER_TRANSITIONS[currentWeather.type];
      
      // Use time-based seed for deterministic but varied weather (less frequent changes)
      const timeSeed = Math.floor(currentTime / 10000); // Change seed every 10 seconds
      renderRandom.setSeed(timeSeed);
      
      const random = renderRandom.next();
      let cumulativeProbability = 0;
      
      for (const [weather, probability] of Object.entries(transitions)) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
          return weather as WeatherType;
        }
      }
      
      return 'sunny'; // Fallback
    },
    
    initializeParticles: (canvasWidth: number, canvasHeight: number) => {
      const { currentWeather } = get();
      
      if (currentWeather.type === 'light_rain' || currentWeather.type === 'heavy_rain' || currentWeather.type === 'storm') {
        const particleCount = currentWeather.type === 'light_rain' ? 100 : 
                             currentWeather.type === 'heavy_rain' ? 200 : 300;
        
        const particles: RainParticle[] = [];
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: renderRandom.between(-100, canvasWidth + 100),
            y: renderRandom.between(-100, canvasHeight),
            speedX: renderRandom.between(-2, -8),
            speedY: renderRandom.between(10, currentWeather.type === 'storm' ? 25 : 20),
            length: renderRandom.between(8, currentWeather.type === 'storm' ? 20 : 15),
            alpha: renderRandom.between(0.3, 0.8)
          });
        }
        
        set({ rainParticles: particles });
      }
      
      // Initialize clouds for cloudy weather
      if (currentWeather.type === 'cloudy' || currentWeather.type === 'storm') {
        const cloudCount = 8;
        const clouds: CloudParticle[] = [];
        
        for (let i = 0; i < cloudCount; i++) {
          clouds.push({
            x: renderRandom.between(-200, canvasWidth + 200),
            y: renderRandom.between(0, canvasHeight * 0.3),
            width: renderRandom.between(100, 300),
            height: renderRandom.between(40, 80),
            alpha: renderRandom.between(0.3, currentWeather.type === 'storm' ? 0.7 : 0.5),
            speed: renderRandom.between(0.2, 0.8)
          });
        }
        
        set({ cloudParticles: clouds });
      }
    },
    
    updateParticles: (canvasWidth: number, canvasHeight: number, deltaTime: number) => {
      const state = get();
      const { currentWeather } = state;
      
      // Update rain particles
      if (currentWeather.type === 'light_rain' || currentWeather.type === 'heavy_rain' || currentWeather.type === 'storm') {
        const updatedRain = state.rainParticles.map(particle => {
          let newX = particle.x + (particle.speedX * deltaTime * 0.01);
          let newY = particle.y + (particle.speedY * deltaTime * 0.01);
          
          // Reset particle if it goes off screen
          if (newX < -100 || newY > canvasHeight + 50) {
            newX = renderRandom.between(canvasWidth, canvasWidth + 100);
            newY = renderRandom.between(-100, -50);
          }
          
          return { ...particle, x: newX, y: newY };
        });
        
        // Update rain splashes
        let updatedSplashes = state.rainSplashes.map(splash => ({
          ...splash,
          life: splash.life + deltaTime
        })).filter(splash => splash.life < splash.maxLife);
        
        // Add new splashes occasionally
        if (renderRandom.chance(0.3 * deltaTime * 0.01)) {
          updatedSplashes.push({
            x: renderRandom.between(0, canvasWidth),
            y: renderRandom.between(canvasHeight * 0.7, canvasHeight),
            life: 0,
            maxLife: 500
          });
        }
        
        set({ 
          rainParticles: updatedRain,
          rainSplashes: updatedSplashes 
        });
      }
      
      // Update cloud particles
      if (currentWeather.type === 'cloudy' || currentWeather.type === 'storm') {
        const updatedClouds = state.cloudParticles.map(cloud => {
          let newX = cloud.x + (cloud.speed * deltaTime * 0.01);
          
          // Reset cloud if it goes off screen
          if (newX > canvasWidth + 200) {
            newX = -200;
          }
          
          return { ...cloud, x: newX };
        });
        
        set({ cloudParticles: updatedClouds });
      }
    },
    
    toggleWeather: () => set((state) => {
      const newEnabled = !state.weatherEnabled;
      logger.log(`Sistema climático: ${newEnabled ? 'Ativado' : 'Desativado'}`);
      return { weatherEnabled: newEnabled };
    }),
    
    setWeatherEnabled: (enabled: boolean) => set({ weatherEnabled: enabled })
  }))
);