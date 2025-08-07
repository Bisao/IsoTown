
import { create } from 'zustand';
import { Stone, Position } from '../types';
import { nanoid } from 'nanoid';
import { isValidGridPosition } from '../utils/grid';
import { GRID_SIZE, STONE_DENSITY, STONE_MAX_HEALTH } from '../constants';

interface StoneStore {
  stones: Record<string, Stone>;

  // Actions
  addStone: (position: Position, type?: 'small' | 'medium' | 'large') => string;
  removeStone: (id: string) => void;
  updateStone: (id: string, updates: Partial<Stone>) => void;
  damageStone: (id: string, damage: number) => boolean; // Returns true if stone was destroyed
  getStoneAt: (position: Position) => Stone | undefined;
  getNearestStone: (position: Position, maxDistance: number) => Stone | undefined;
  generateRandomStones: () => void;
  isPositionOccupiedByStone: (position: Position) => boolean;
  startStoneBreaking: (id: string) => void;
  updateBreakingStones: () => void;
  addHitAnimation: (id: string) => void;
}

export const useStoneStore = create<StoneStore>()((set, get) => ({
  stones: {},

  addStone: (position, type = 'medium') => {
    const id = nanoid();
    const stone: Stone = {
      id,
      position,
      type,
      health: STONE_MAX_HEALTH,
      maxHealth: STONE_MAX_HEALTH
    };

    set((state) => ({
      stones: { ...state.stones, [id]: stone }
    }));

    return id;
  },

  removeStone: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.stones;
    return { stones: rest };
  }),

  updateStone: (id, updates) => set((state) => {
    if (!state.stones[id]) return state;
    return {
      stones: {
        ...state.stones,
        [id]: { ...state.stones[id], ...updates }
      }
    };
  }),

  damageStone: (id, damage) => {
    const stone = get().stones[id];
    if (!stone) return false;

    // Add hit animation
    get().addHitAnimation(id);

    const newHealth = stone.health - damage;
    if (newHealth <= 0) {
      // Stone is destroyed - start breaking animation
      get().startStoneBreaking(id);
      return true;
    } else {
      // Stone is damaged but not destroyed
      set((state) => ({
        stones: {
          ...state.stones,
          [id]: { ...stone, health: newHealth }
        }
      }));
      return false;
    }
  },

  getNearestStone: (position, maxDistance) => {
    const stones = Object.values(get().stones);
    let nearestStone: Stone | undefined;
    let nearestDistance = Infinity;

    for (const stone of stones) {
      if (stone.isBreaking) continue; // Skip breaking stones

      const distance = Math.abs(stone.position.x - position.x) + Math.abs(stone.position.z - position.z);
      if (distance <= maxDistance && distance < nearestDistance) {
        nearestDistance = distance;
        nearestStone = stone;
      }
    }

    return nearestStone;
  },

  startStoneBreaking: (id) => {
    set((state) => ({
      stones: {
        ...state.stones,
        [id]: {
          ...state.stones[id],
          isBreaking: true,
          breakStartTime: Date.now()
        }
      }
    }));

    // Remove stone after break animation + despawn delay
    setTimeout(() => {
      get().removeStone(id);
    }, 800 + 2000); // 0.8s break + 2s despawn
  },

  updateBreakingStones: () => {
    const now = Date.now();
    const stones = get().stones;

    Object.values(stones).forEach(stone => {
      if (stone.isBreaking && stone.breakStartTime) {
        const elapsed = now - stone.breakStartTime;
        if (elapsed > 2800) { // 0.8s break + 2s despawn
          get().removeStone(stone.id);
        }
      }
    });
  },

  addHitAnimation: (id) => {
    set((state) => ({
      stones: {
        ...state.stones,
        [id]: {
          ...state.stones[id],
          hitStartTime: Date.now()
        }
      }
    }));

    // Remove hit animation after duration
    setTimeout(() => {
      set((state) => {
        if (!state.stones[id]) return state;
        const { hitStartTime, ...stoneWithoutHit } = state.stones[id];
        return {
          stones: {
            ...state.stones,
            [id]: stoneWithoutHit
          }
        };
      });
    }, 200); // 200ms hit animation
  },

  getStoneAt: (position) => {
    const { stones } = get();
    return Object.values(stones).find(stone =>
      stone.position.x === position.x && stone.position.z === position.z
    );
  },

  isPositionOccupiedByStone: (position) => {
    return !!get().getStoneAt(position);
  },

  generateRandomStones: () => {
    const { addStone } = get();
    const halfGrid = Math.floor(GRID_SIZE / 2);
    const stoneTypes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const position = { x, z };

        if (isValidGridPosition(position) && Math.random() < STONE_DENSITY) {
          const randomType = stoneTypes[Math.floor(Math.random() * stoneTypes.length)];
          addStone(position, randomType);
        }
      }
    }
  }
}));
