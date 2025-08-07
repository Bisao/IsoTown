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

export interface NPCTask {
  type: 'cut_tree' | 'harvest' | 'mine';
  targetId: string;
  targetPosition: Position;
  progress: number;
  maxProgress: number;
}

export interface NPCAnimation {
  type: 'chopping' | 'walking' | 'idle';
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
  inventory?: {
    [key: string]: number; // Item -> quantidade
  };
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