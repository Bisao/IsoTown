export interface Position {
  x: number;
  z: number;
}

export interface House {
  id: string;
  type: string;
  position: Position;
}

export interface NPC {
  id: string;
  position: Position;
  targetPosition?: Position;
  isMoving: boolean;
  controlMode: NPCControlMode;
  houseId?: string;
  movementPath?: Position[];
  lastMovement: number;
}

export interface Tree {
  id: string;
  position: Position;
  type: 'pine' | 'oak' | 'birch';
}