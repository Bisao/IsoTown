export const GRID_SIZE = 20;
export const CELL_SIZE = 32;

export enum HouseType {
  FARMER = 'FARMER',
  LUMBERJACK = 'LUMBERJACK',
  MINER = 'MINER'
}

// NPCControlMode moved to types.ts to avoid circular imports

export const HOUSE_COLORS = {
  [HouseType.FARMER]: '#FFFFFF',
  [HouseType.LUMBERJACK]: '#F5F5DC',
  [HouseType.MINER]: '#8B4513'
};

export const HOUSE_NAMES = {
  [HouseType.FARMER]: 'Farmer House',
  [HouseType.LUMBERJACK]: 'Lumberjack House',
  [HouseType.MINER]: 'Miner House'
};

export const NPC_COLOR = '#FF6B6B';
export const MOVEMENT_SPEED = 200; // ms between tile movements

// Tree constants
export const TREE_COLOR = '#228B22';
export const TREE_DENSITY = 0.15; // 15% chance of tree per tile
export const TREE_MAX_HEALTH = 3; // Number of hits to cut down a tree

// Profession constants
export const CHOPPING_ANIMATION_DURATION = 800; // ms
export const TREE_FALL_DURATION = 1000; // ms
export const TREE_DESPAWN_DELAY = 3000; // ms after falling
export const TOC_TEXT_DURATION = 1000; // ms for TOC text effect

// Lumberjack behavior
export const LUMBERJACK_WORK_RANGE = 5; // How far lumberjack will search for trees
export const LUMBERJACK_CHOP_INTERVAL = 1000; // ms between chops
export const CONTROLLED_CHOP_COOLDOWN = 800; // 800ms cooldown for controlled NPCs

// Stone constants
export const STONE_COLOR = '#808080';
export const STONE_DENSITY = 0.05; // 5% chance of stone per tile
export const STONE_MAX_HEALTH = 5; // Number of hits to break a stone