export interface Position {
  x: number;
  z: number;
}

export interface House {
  id: string;
  type: string;
  position: Position;
  rotation: number; // 0, 90, 180, 270 degrees
  inventory: ResourceInventory;
  maxStorageCapacity: number;
  npcId?: string; // Optional NPC assigned to this house
}

export interface ResourceInventory {
  wood: number;
  stone: number;
  food: number;
}

export enum NPCControlMode {
  AUTONOMOUS = 'AUTONOMOUS',
  CONTROLLED = 'CONTROLLED'
}

export enum NPCProfession {
  NONE = 'NONE',
  LUMBERJACK = 'LUMBERJACK',
  FARMER = 'FARMER',
  MINER = 'MINER',
  HUNTER = 'HUNTER'
}

export enum NPCState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  WORKING = 'WORKING',
  RETURNING_HOME = 'RETURNING_HOME'
}

export interface NPCTask {
  type: 'cut_tree' | 'harvest' | 'mine_stone' | 'hunt_animal';
  targetId: string;
  targetPosition: Position;
  progress: number;
  maxProgress: number;
}

export interface NPCAnimation {
  type: 'chopping' | 'mining' | 'walking' | 'idle' | 'hunting';
  startTime: number;
  duration: number;
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
  currentTask?: NPCTask;
  animation?: NPCAnimation;
  currentTreeId?: string;
  currentStoneId?: string;
  currentAnimalId?: string;
  lastMoveDirection?: { x: number; z: number }; // Última direção de movimento para sprites
  moveStartTime?: number; // Timestamp do início do movimento
  lastActionTime?: number; // Timestamp da última ação de trabalho

  // Sistema avançado
  statistics?: {
    workCompleted: number;
    timeWorked: number;
    distanceTraveled: number;
    tasksAssigned: number;
    efficiency: number;
  };
  schedule?: {
    workHours: { start: number; end: number };
    restHours: { start: number; end: number };
    breakDuration: number;
    workDuration: number;
  };
  skills?: {
    [key: string]: number; // Nome da habilidade -> nível (1-100)
  };
  inventory: ResourceInventory;
  maxCarryCapacity: number;
  currentCarriedWeight: number;
  health?: number;
  energy?: number;
  experience?: number;
  level?: number;
}

export interface Tree {
  id: string;
  position: Position;
  type: 'pine' | 'oak' | 'birch';
  health: number;
  maxHealth: number;
  isFalling?: boolean;
  fallStartTime?: number;
  hitStartTime?: number;
  fallDirection?: number;
}

export interface Stone {
  id: string;
  position: Position;
  type: 'small' | 'medium' | 'large';
  health: number;
  maxHealth: number;
  isBreaking?: boolean;
  breakStartTime?: number;
  hitStartTime?: number;
}

export interface VisualEffect {
  id: string;
  type: 'text' | 'animation';
  position: Position;
  text?: string;
  color?: string;
  startTime: number;
  duration: number;
  offsetY?: number;
}

// Novos tipos para sistema robusto
export interface Resource {
  id: string;
  position: Position;
  type: string;
  quantity: number;
  maxQuantity: number;
  regenerationRate?: number; // Por segundo
  lastRegeneration?: number;
}

export interface Skill {
  name: string;
  level: number;
  experience: number;
  maxExperience: number;
  bonuses: string[]; // Descrições dos bônus por nível
}

export interface Profession {
  name: string;
  description: string;
  requiredSkills: { [skillName: string]: number };
  workTasks: string[];
  tools: string[];
  efficiency: number; // Multiplicador de eficiência (1.0 = 100%)
}

export interface Item {
  id: string;
  name: string;
  type: 'tool' | 'resource' | 'food' | 'equipment';
  value: number;
  stackable: boolean;
  maxStack: number;
  description: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: {
    type: 'collect' | 'craft' | 'visit' | 'talk';
    target: string;
    quantity: number;
    completed: number;
  }[];
  rewards: {
    experience: number;
    items: { [itemId: string]: number };
  };
  completed: boolean;
}

export interface Animal {
  id: string;
  position: Position;
  type: 'rabbit' | 'deer' | 'boar';
  health: number;
  maxHealth: number;
  isBeingHunted?: boolean;
  huntStartTime?: number;
  isRunning?: boolean;
  runDirection?: { x: number; z: number };
  lastMoveTime?: number;
  movementSpeed: number;
  meatValue: number; // Quantidade de carne que dará quando caçado
}