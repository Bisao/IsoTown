export const GRID_SIZE = 20;
export const CELL_SIZE = 32;

export enum HouseType {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

export enum NPCControlMode {
  AUTONOMOUS = 'AUTONOMOUS',
  CONTROLLED = 'CONTROLLED'
}

export const HOUSE_COLORS = {
  [HouseType.SMALL]: '#FF6B6B',
  [HouseType.MEDIUM]: '#4ECDC4', 
  [HouseType.LARGE]: '#45B7D1'
};

export const HOUSE_NAMES = {
  [HouseType.SMALL]: 'Small House',
  [HouseType.MEDIUM]: 'Medium House',
  [HouseType.LARGE]: 'Large House'
};

export const NPC_COLOR = '#FF6B6B';
export const MOVEMENT_SPEED = 200; // ms between tile movements