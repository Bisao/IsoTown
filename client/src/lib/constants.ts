// Control enums
export enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  select = 'select',
  cancel = 'cancel',
}

// House types
export enum HouseType {
  FARMER = 'farmer',
  LUMBERJACK = 'lumberjack',
  MINER = 'miner',
}

// NPC control modes
export enum NPCControlMode {
  AUTONOMOUS = 'autonomous',
  CONTROLLED = 'controlled',
}

// House colors
export const HOUSE_COLORS = {
  [HouseType.FARMER]: '#FFD700', // Yellow
  [HouseType.LUMBERJACK]: '#8B4513', // Brown
  [HouseType.MINER]: '#808080', // Gray
};

// House names
export const HOUSE_NAMES = {
  [HouseType.FARMER]: 'Farmer House',
  [HouseType.LUMBERJACK]: 'Lumberjack House',
  [HouseType.MINER]: 'Miner House',
};

// Grid settings
export const GRID_SIZE = 15;
export const CELL_SIZE = 2;

// NPC settings
export const NPC_SPEED = 0.05;
export const NPC_COLOR = '#FF6B6B';
