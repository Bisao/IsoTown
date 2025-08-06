import { HouseType, NPCControlMode } from './constants';

export interface Position {
  x: number;
  z: number;
}

export interface House {
  id: string;
  type: HouseType;
  position: Position;
  npcId?: string;
}

export interface NPC {
  id: string;
  position: Position;
  targetPosition?: Position;
  houseId?: string;
  controlMode: NPCControlMode;
  isMoving: boolean;
  path?: Position[];
  pathIndex?: number;
}

export interface GameState {
  isPlacingHouse: boolean;
  selectedHouseType?: HouseType;
  selectedNPC?: string;
  selectedHouse?: string;
  showHouseModal: boolean;
  showNPCModal: boolean;
}
