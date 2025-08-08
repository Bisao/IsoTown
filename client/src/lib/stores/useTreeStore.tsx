import { create } from 'zustand';
import { Tree, Position } from '../types';
import { nanoid } from 'nanoid';
import { isValidGridPosition } from '../utils/grid';
import { GRID_SIZE, TREE_DENSITY } from '../constants';

interface TreeStore {
  trees: Record<string, Tree>;

  // Actions
  addTree: (position: Position, type?: 'pine' | 'oak' | 'birch') => string;
  removeTree: (id: string) => void;
  updateTree: (id: string, updates: Partial<Tree>) => void;
  damageTree: (id: string, damage: number) => boolean; // Returns true if tree was destroyed
  getTreeAt: (position: Position) => Tree | undefined;
  getNearestTree: (position: Position, maxDistance: number) => Tree | undefined;
  generateRandomTrees: () => void;
  generateTreesInChunk: (chunkX: number, chunkZ: number, chunkSize?: number) => void;
  isPositionOccupiedByTree: (position: Position) => boolean;
  startTreeFalling: (id: string) => void;
  updateFallingTrees: () => void;
  addHitAnimation: (id: string) => void;
}

export const useTreeStore = create<TreeStore>()((set, get) => ({
  trees: {},

  addTree: (position, type = 'pine') => {
    const id = nanoid();
    const tree: Tree = {
      id,
      position,
      type,
      health: 3, // Using hardcoded value instead of constant to avoid import issues
      maxHealth: 3
    };

    set((state) => ({
      trees: { ...state.trees, [id]: tree }
    }));

    return id;
  },

  removeTree: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.trees;
    return { trees: rest };
  }),

  updateTree: (id, updates) => set((state) => {
    if (!state.trees[id]) return state;
    return {
      trees: {
        ...state.trees,
        [id]: { ...state.trees[id], ...updates }
      }
    };
  }),

  damageTree: (id, damage) => {
    const tree = get().trees[id];
    if (!tree) return false;

    // Add hit animation
    get().addHitAnimation(id);

    const newHealth = tree.health - damage;
    if (newHealth <= 0) {
      // Tree is destroyed - start falling animation
      get().startTreeFalling(id);
      return true;
    } else {
      // Tree is damaged but not destroyed
      set((state) => ({
        trees: {
          ...state.trees,
          [id]: { ...tree, health: newHealth }
        }
      }));
      return false;
    }
  },

  getNearestTree: (position, maxDistance) => {
    const trees = Object.values(get().trees);
    let nearestTree: Tree | undefined;
    let nearestDistance = Infinity;

    for (const tree of trees) {
      if (tree.isFalling) continue; // Skip falling trees

      const distance = Math.abs(tree.position.x - position.x) + Math.abs(tree.position.z - position.z);
      if (distance <= maxDistance && distance < nearestDistance) {
        nearestDistance = distance;
        nearestTree = tree;
      }
    }

    return nearestTree;
  },

  startTreeFalling: (id) => {
    set((state) => ({
      trees: {
        ...state.trees,
        [id]: {
          ...state.trees[id],
          isFalling: true,
          fallStartTime: Date.now()
        }
      }
    }));

    // Remove tree after fall animation + despawn delay
    setTimeout(() => {
      get().removeTree(id);
    }, 1000 + 3000); // 1s fall + 3s despawn
  },

  updateFallingTrees: () => {
    const now = Date.now();
    const trees = get().trees;

    Object.values(trees).forEach(tree => {
      if (tree.isFalling && tree.fallStartTime) {
        const elapsed = now - tree.fallStartTime;
        if (elapsed > 4000) { // 1s fall + 3s despawn
          get().removeTree(tree.id);
        }
      }
    });
  },

  addHitAnimation: (id) => {
    set((state) => ({
      trees: {
        ...state.trees,
        [id]: {
          ...state.trees[id],
          hitStartTime: Date.now()
        }
      }
    }));

    // Remove hit animation after duration
    setTimeout(() => {
      set((state) => {
        if (!state.trees[id]) return state;
        const { hitStartTime, ...treeWithoutHit } = state.trees[id];
        return {
          trees: {
            ...state.trees,
            [id]: treeWithoutHit
          }
        };
      });
    }, 300); // 300ms hit animation
  },

  getTreeAt: (position) => {
    const { trees } = get();
    return Object.values(trees).find(tree =>
      tree.position.x === position.x && tree.position.z === position.z
    );
  },

  isPositionOccupiedByTree: (position) => {
    return !!get().getTreeAt(position);
  },

  generateRandomTrees: () => {
    // Não mais usado - substituído pela geração procedural
    console.log('Sistema de geração procedural ativo');
  },

  generateTreesInChunk: (chunkX: number, chunkZ: number, chunkSize: number = 50) => {
    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;

    // Usar seed determinística baseada na posição do chunk para gerar sempre os mesmos recursos
    const chunkSeed = chunkX * 1000 + chunkZ;
    
    for (let x = startX; x < startX + chunkSize; x++) {
      for (let z = startZ; z < startZ + chunkSize; z++) {
        const position = { x, z };

        if (isValidGridPosition(position)) {
          // Criar seed única para esta posição
          const tileSeed = (x + 50000) * 100000 + (z + 50000); // Offset para evitar negativos
          
          // Usar função hash simples para pseudo-randomização determinística
          const hash = (tileSeed * 9301 + 49297) % 233280;
          const random = hash / 233280.0;

          if (random < TREE_DENSITY) {
            // Determinar tipo de árvore baseado na posição
            const typeRandom = ((tileSeed * 7919) % 100) / 100.0;
            let treeType: 'pine' | 'oak' | 'birch' = 'pine';
            
            if (typeRandom < 0.4) treeType = 'oak';
            else if (typeRandom < 0.7) treeType = 'birch';
            else treeType = 'pine';

            get().addTree(position, treeType);
          }
        }
      }
    }
  }
}));