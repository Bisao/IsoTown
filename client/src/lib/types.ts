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
  controlMode: string;
  targetPosition?: Position;
  isMoving: boolean;
  houseId?: string;
  movementTimer?: number;
}