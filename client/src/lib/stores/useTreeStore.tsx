
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
  getTreeAt: (position: Position) => Tree | undefined;
  generateRandomTrees: () => void;
  isPositionOccupiedByTree: (position: Position) => boolean;
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  trees: {},

  addTree: (position, type = 'pine') => {
    const id = nanoid();
    const tree: Tree = {
      id,
      position,
      type
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
