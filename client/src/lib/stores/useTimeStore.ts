import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { DAY_DURATION_MS, HOURS_PER_DAY, MS_PER_GAME_HOUR } from '../constants';

interface TimeStore {
  gameStartTime: number; // When the game session started (real time)
  currentGameTime: number; // Current game time in hours (0-24)
  isDay: boolean; // True if it's day time (6-18), false if night (18-6)
  dayCount: number; // Number of complete days elapsed
  
  // Actions
  updateTime: () => void;
  getCurrentGameHour: () => number;
  getCurrentMinute: () => number;
  formatGameTime: () => string;
  getTimeOfDay: () => 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night' | 'midnight';
  getSkyColor: () => string;
  getAmbientLight: () => number; // 0-1 brightness multiplier
}

export const useTimeStore = create<TimeStore>()(
  subscribeWithSelector((set, get) => ({
    gameStartTime: Date.now(),
    currentGameTime: 6, // Start at 6 AM
    isDay: true,
    dayCount: 1,

    updateTime: () => {
      const now = Date.now();
      const elapsed = now - get().gameStartTime;
      
      // Calculate current game hour based on elapsed real time
      const totalGameHours = (elapsed / MS_PER_GAME_HOUR) + 6; // Started at 6 AM
      const currentGameTime = totalGameHours % HOURS_PER_DAY;
      const dayCount = Math.floor(totalGameHours / HOURS_PER_DAY) + 1;
      
      // Determine if it's day (6 AM to 6 PM) or night
      const isDay = currentGameTime >= 6 && currentGameTime < 18;
      
      set({
        currentGameTime,
        isDay,
        dayCount
      });
    },

    getCurrentGameHour: () => {
      return Math.floor(get().currentGameTime);
    },

    getCurrentMinute: () => {
      return Math.floor((get().currentGameTime % 1) * 60);
    },

    formatGameTime: () => {
      const hour = get().getCurrentGameHour();
      const minute = get().getCurrentMinute();
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
    },

    getTimeOfDay: () => {
      const hour = get().getCurrentGameHour();
      
      if (hour >= 5 && hour < 7) return 'dawn';
      if (hour >= 7 && hour < 11) return 'morning';
      if (hour >= 11 && hour < 14) return 'noon';
      if (hour >= 14 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 19) return 'dusk';
      if (hour >= 19 && hour < 23) return 'night';
      return 'midnight';
    },

    getSkyColor: () => {
      const hour = get().currentGameTime;
      
      // Sky color transitions throughout the day
      if (hour >= 6 && hour < 8) {
        // Dawn: Orange to light blue
        const progress = (hour - 6) / 2;
        return `hsl(${200 + (40 * (1 - progress))}, 70%, ${60 + (20 * progress)}%)`;
      } else if (hour >= 8 && hour < 17) {
        // Day: Light blue
        return 'hsl(200, 70%, 80%)';
      } else if (hour >= 17 && hour < 19) {
        // Dusk: Blue to orange
        const progress = (hour - 17) / 2;
        return `hsl(${200 + (40 * progress)}, 70%, ${80 - (20 * progress)}%)`;
      } else {
        // Night: Dark blue
        return 'hsl(220, 50%, 20%)';
      }
    },

    getAmbientLight: () => {
      const hour = get().currentGameTime;
      
      // Smooth light transition throughout the day
      if (hour >= 6 && hour < 8) {
        // Dawn: 0.3 to 1.0
        return 0.3 + (0.7 * ((hour - 6) / 2));
      } else if (hour >= 8 && hour < 17) {
        // Day: Full brightness
        return 1.0;
      } else if (hour >= 17 && hour < 19) {
        // Dusk: 1.0 to 0.3
        return 1.0 - (0.7 * ((hour - 17) / 2));
      } else {
        // Night: Dim
        return 0.3;
      }
    }
  }))
);

// Auto-update time every second
setInterval(() => {
  useTimeStore.getState().updateTime();
}, 1000);