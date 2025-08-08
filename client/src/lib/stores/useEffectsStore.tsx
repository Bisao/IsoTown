import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { VisualEffect, Position } from '../types';

interface EffectsStore {
  effects: Record<string, VisualEffect>;
  
  addTextEffect: (position: Position, text: string, color?: string, duration?: number) => string;
  removeEffect: (id: string) => void;
  updateEffects: () => void; // Remove expired effects
}

export const useEffectsStore = create<EffectsStore>()(
  subscribeWithSelector((set, get) => ({
    effects: {},

    addTextEffect: (position, text, color = '#FFFFFF', duration = 1000) => {
      const id = nanoid();
      const effect: VisualEffect = {
        id,
        type: 'text',
        position,
        text,
        color,
        startTime: Date.now(),
        duration,
        offsetY: 0
      };
      
      set((state) => ({
        effects: { ...state.effects, [id]: effect }
      }));
      
      return id;
    },

    removeEffect: (id) => set((state) => {
      const { [id]: removed, ...rest } = state.effects;
      return { effects: rest };
    }),

    updateEffects: () => {
      const now = Date.now();
      const { effects } = get();
      
      const updatedEffects: Record<string, VisualEffect> = {};
      
      Object.values(effects).forEach(effect => {
        const elapsed = now - effect.startTime;
        
        if (elapsed < effect.duration) {
          // Update effect (for animations like rising text)
          if (effect.type === 'text') {
            const progress = elapsed / effect.duration;
            updatedEffects[effect.id] = {
              ...effect,
              offsetY: progress * -30 // Rise 30 pixels over duration
            };
          } else {
            updatedEffects[effect.id] = effect;
          }
        }
        // If elapsed >= duration, effect is removed (not added to updatedEffects)
      });
      
      set({ effects: updatedEffects });
    }
  }))
);