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
  generateStonesInChunk: (chunkX: number, chunkZ: number, chunkSize?: number) => void;
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
    console.log('Gerando pedras por chunks para otimização...');

    // Gerar pedras apenas em uma área inicial menor para performance
    const initialArea = 100; // Área inicial de 200x200 ao redor do centro
    const halfArea = Math.floor(initialArea / 2);
    const stoneTypes = ['small', 'medium', 'large'] as const; // Alterado para os tipos corretos

    for (let x = -halfArea; x <= halfArea; x++) {
      for (let z = -halfArea; z <= halfArea; z++) {
        const position = { x, z };

        if (isValidGridPosition(position) && Math.random() < STONE_DENSITY) {
          const randomType = stoneTypes[Math.floor(Math.random() * stoneTypes.length)];
          get().addStone(position, randomType);
        }
      }
    }
  },

  generateStonesInChunk: (chunkX: number, chunkZ: number, chunkSize: number = 50) => {
    const stoneTypes = ['small', 'medium', 'large'] as const; // Alterado para os tipos corretos
    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;

    for (let x = startX; x < startX + chunkSize; x++) {
      for (let z = startZ; z < startZ + chunkSize; z++) {
        const position = { x, z };

        if (isValidGridPosition(position) && Math.random() < STONE_DENSITY) {
          const randomType = stoneTypes[Math.floor(Math.random() * stoneTypes.length)];
          get().addStone(position, randomType);
        }
      }
    }
  }
}));