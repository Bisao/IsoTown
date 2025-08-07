export interface Position {
  x: number;
  z: number;
}

export interface House {
  id: string;
  type: string;
  position: Position;
  rotation: number; // 0, 90, 180, 270 degrees
}

export enum NPCControlMode {
  AUTONOMOUS = 'AUTONOMOUS',
  CONTROLLED = 'CONTROLLED'
}

export enum NPCProfession {
  NONE = 'NONE',
  LUMBERJACK = 'LUMBERJACK',
  FARMER = 'FARMER',
  MINER = 'MINER'
}

export enum NPCState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  WORKING = 'WORKING',
  RETURNING_HOME = 'RETURNING_HOME'
}

export interface NPC {
  id: string;
  position: Position;
  targetPosition?: Position;
  isMoving: boolean;
  controlMode: NPCControlMode;
  profession: NPCProfession;
  state: NPCState;
  houseId?: string;
  movementPath?: Position[];
  lastMovement: number;
  currentTask?: {
    type: 'cut_tree' | 'harvest' | 'mine';
    targetId: string;
    targetPosition: Position;
    progress: number;
    maxProgress: number;
  };
  animation?: {
    type: 'chopping' | 'walking' | 'idle';
    startTime: number;
    duration: number;
  };
}

export interface Tree {
  id: string;
  position: Position;
  type: 'pine' | 'oak' | 'birch';
  health: number;
  maxHealth: number;
  isFalling?: boolean;
  fallStartTime?: number;
}

export interface VisualEffect {
  id: string;
  type: 'text' | 'animation';
  position: Position;
  text?: string;
  startTime: number;
  duration: number;
  offsetY?: number;
}