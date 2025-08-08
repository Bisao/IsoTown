import { NPCProfession } from './types';

export const GRID_SIZE = 10000;
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
export const TREE_DENSITY = 0.02; // 2% chance of tree per tile (reduzido para mundo grande)
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
export const STONE_DENSITY = 0.01; // 1% chance of stone per tile (reduzido para mundo grande)
export const STONE_MAX_HEALTH = 5; // Number of hits to break a stone

// Miner behavior
export const MINER_WORK_RANGE = 5; // How far miner will search for stones
export const MINER_MINE_INTERVAL = 1200; // ms between mining hits
export const MINING_ANIMATION_DURATION = 800; // ms
export const STONE_BREAK_DURATION = 800; // ms
export const STONE_DESPAWN_DELAY = 2000; // ms after breaking

// Resource carrying system
export const DEFAULT_CARRY_CAPACITY = 20; // Default max items an NPC can carry
export const HOUSE_STORAGE_CAPACITY = 1000; // Default house storage capacity
export const RESOURCE_WEIGHTS = {
  wood: 1,
  stone: 2,
  food: 0.5
} as const;

// Inventory constants
export const INVENTORY_MAX_SLOTS = 20;
export const STACK_MAX_SIZE = 99;
export const MAX_CARRY_WEIGHT = 100; // Peso máximo que um NPC pode carregar
export const OVERWEIGHT_PENALTY = 0.5; // Redução de velocidade quando sobrecarregado

// Item types
export enum ItemType {
  RESOURCE = 'RESOURCE',
  TOOL = 'TOOL',
  FOOD = 'FOOD',
  EQUIPMENT = 'EQUIPMENT'
}

// Game items with weight system
export const GAME_ITEMS = {
  // Resources
  WOOD: {
    id: 'WOOD',
    name: 'Madeira',
    type: ItemType.RESOURCE,
    maxStack: 50,
    weight: 2.0, // kg por unidade
    description: 'Madeira coletada das árvores',
    color: '#8B4513'
  },
  STONE: {
    id: 'STONE',
    name: 'Pedra',
    type: ItemType.RESOURCE,
    maxStack: 30,
    weight: 3.0, // kg por unidade
    description: 'Pedra coletada das rochas',
    color: '#808080'
  },
  WHEAT: {
    id: 'WHEAT',
    name: 'Trigo',
    type: ItemType.RESOURCE,
    maxStack: 99,
    weight: 0.1, // kg por unidade
    description: 'Trigo cultivado pelos fazendeiros',
    color: '#DAA520'
  },
  IRON_ORE: {
    id: 'IRON_ORE',
    name: 'Minério de Ferro',
    type: ItemType.RESOURCE,
    maxStack: 20,
    weight: 5.0, // kg por unidade
    description: 'Minério bruto de ferro',
    color: '#CD853F'
  },
  COAL: {
    id: 'COAL',
    name: 'Carvão',
    type: ItemType.RESOURCE,
    maxStack: 40,
    weight: 1.5, // kg por unidade
    description: 'Combustível essencial',
    color: '#2F2F2F'
  },
  
  // Tools
  AXE: {
    id: 'AXE',
    name: 'Machado',
    type: ItemType.TOOL,
    maxStack: 1,
    weight: 3.5, // kg
    description: 'Ferramenta para cortar árvores',
    color: '#654321'
  },
  PICKAXE: {
    id: 'PICKAXE',
    name: 'Picareta',
    type: ItemType.TOOL,
    maxStack: 1,
    weight: 4.0, // kg
    description: 'Ferramenta para quebrar pedras',
    color: '#2F4F4F'
  },
  HOE: {
    id: 'HOE',
    name: 'Enxada',
    type: ItemType.TOOL,
    maxStack: 1,
    weight: 2.5, // kg
    description: 'Ferramenta para cultivar',
    color: '#8B4513'
  },
  SWORD: {
    id: 'SWORD',
    name: 'Espada',
    type: ItemType.EQUIPMENT,
    maxStack: 1,
    weight: 3.0, // kg
    description: 'Arma para defesa',
    color: '#C0C0C0'
  },
  
  // Food
  BREAD: {
    id: 'BREAD',
    name: 'Pão',
    type: ItemType.FOOD,
    maxStack: 16,
    weight: 0.5, // kg por unidade
    description: 'Alimento nutritivo que restaura energia',
    color: '#DEB887'
  },
  APPLE: {
    id: 'APPLE',
    name: 'Maçã',
    type: ItemType.FOOD,
    maxStack: 20,
    weight: 0.2, // kg por unidade
    description: 'Fruta fresca que restaura saúde',
    color: '#FF0000'
  },
  MEAT: {
    id: 'MEAT',
    name: 'Carne',
    type: ItemType.FOOD,
    maxStack: 10,
    weight: 1.0, // kg por unidade
    description: 'Alimento proteico',
    color: '#8B0000'
  },
  
  // Equipment
  BACKPACK: {
    id: 'BACKPACK',
    name: 'Mochila',
    type: ItemType.EQUIPMENT,
    maxStack: 1,
    weight: 2.0, // kg
    description: 'Aumenta capacidade de carga em 20kg',
    color: '#8B4513'
  }
} as const;

// Starting inventories by profession
export const STARTING_INVENTORIES = {
  [NPCProfession.FARMER]: {
    HOE: 1,
    WHEAT: 5,
    BREAD: 3
  },
  [NPCProfession.LUMBERJACK]: {
    AXE: 1,
    WOOD: 10
  },
  [NPCProfession.MINER]: {
    PICKAXE: 1,
    STONE: 5,
    IRON_ORE: 3
  },
  [NPCProfession.NONE]: {}
} as const;