
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
  damageTree: (id: string, damage: number) => boolean; // Returns true if tree was destroyed
  getTreeAt: (position: Position) => Tree | undefined;
  getNearestTree: (position: Position, maxDistance: number) => Tree | undefined;
  generateRandomTrees: () => void;
  isPositionOccupiedByTree: (position: Position) => boolean;
  startTreeFalling: (id: string) => void;
  updateFallingTrees: () => void;
}

export const useTreeStore = create<TreeStore>((set, get) => ({
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

  damageTree: (id, damage) => {
    const tree = get().trees[id];
    if (!tree) return false;
    
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
    const { addTree } = get();
    const halfGrid = Math.floor(GRID_SIZE / 2);
    const treeTypes: Array<'pine' | 'oak' | 'birch'> = ['pine', 'oak', 'birch'];
    
    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        const position = { x, z };
        
        if (isValidGridPosition(position) && Math.random() < TREE_DENSITY) {
          const randomType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
          addTree(position, randomType);
        }
      }
    }
  }
}));