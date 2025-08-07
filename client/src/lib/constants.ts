export const GRID_SIZE = 20;
export const CELL_SIZE = 32;

export enum HouseType {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  FARMER = 'FARMER'
}

export enum NPCControlMode {
  AUTONOMOUS = 'AUTONOMOUS',
  CONTROLLED = 'CONTROLLED'
}

export const HOUSE_COLORS = {
  [HouseType.SMALL]: '#FF6B6B',
  [HouseType.MEDIUM]: '#4ECDC4', 
  [HouseType.LARGE]: '#45B7D1',
  [HouseType.FARMER]: '#FFFFFF'
};

export const HOUSE_NAMES = {
  [HouseType.SMALL]: 'Small House',
  [HouseType.MEDIUM]: 'Medium House',
  [HouseType.LARGE]: 'Large House',
  [HouseType.FARMER]: 'Farmer House'
};

export const NPC_COLOR = '#FF6B6B';
export const MOVEMENT_SPEED = 200; // ms between tile movements

// Tree constants
export const TREE_COLOR = '#228B22';
export const TREE_DENSITY = 0.15; // 15% chance of tree per tile