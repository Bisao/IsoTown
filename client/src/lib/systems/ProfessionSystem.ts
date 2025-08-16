import { NPC, NPCProfession, NPCState, Position } from '../types';
import { useTreeStore } from '../stores/useTreeStore';
import { useStoneStore } from '../stores/useStoneStore';
import { useHouseStore } from '../stores/useHouseStore';
import { useAnimalStore } from '../stores/useAnimalStore';
import { useNPCStore } from '../stores/useNPCStore';
import { getDistanceToPosition } from '../utils/distance';
import { LUMBERJACK_WORK_RANGE, LUMBERJACK_CHOP_INTERVAL, CHOPPING_ANIMATION_DURATION } from '../constants';

import { MINER_WORK_RANGE, MINER_MINE_INTERVAL } from '../constants';
const MINING_ANIMATION_DURATION = 900; // ms
const HUNTER_WORK_RANGE = 8; // Alcance do caçador
const HUNTING_ANIMATION_DURATION = 1200; // ms

// Interface para definir comportamentos de profissão
export interface ProfessionBehavior {
  findWork: (npc: NPC) => WorkTask | null;
  doWork: (npc: NPC, task: WorkTask) => WorkResult;
  isWorkDone: (npc: NPC, task: WorkTask) => boolean;
  getHomePosition: (npc: NPC) => Position | null;
}

export interface WorkTask {
  type: 'cut_tree' | 'harvest' | 'mine_stone' | 'hunt_animal';
  targetId: string;
  targetPosition: Position;
  progress: number;
  maxProgress: number;
  priority: number; // 1-10, maior = mais importante
}

export interface WorkResult {
  success: boolean;
  completed: boolean;
  animation?: {
    type: 'chopping' | 'mining' | 'walking' | 'idle' | 'hunting';
    startTime: number;
    duration: number;
  };
  newState?: NPCState;
  progressMade: number;
}

// Sistema base para todas as profissões
export class BaseProfessionSystem {
  protected findNearestResource(
    npcPosition: Position, 
    resources: any[], 
    maxDistance: number,
    filterFn?: (resource: any) => boolean
  ): any | null {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const resource of resources) {
      if (filterFn && !filterFn(resource)) continue;
      
      const distance = Math.abs(resource.position.x - npcPosition.x) + 
                      Math.abs(resource.position.z - npcPosition.z);
      
      if (distance <= maxDistance && distance < nearestDistance) {
        nearest = resource;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  protected getDistanceToPosition(from: Position, to: Position): number {
    return getDistanceToPosition(from, to);
  }
}

// Sistema específico para Lenhadores
export class LumberjackSystem extends BaseProfessionSystem implements ProfessionBehavior {
  
  findWork(npc: NPC): WorkTask | null {
    const treeStore = useTreeStore.getState();
    const trees = Object.values(treeStore.trees);
    
    // Filtrar árvores disponíveis (não caindo)
    const availableTrees = trees.filter(tree => !tree.isFalling && tree.health > 0);
    
    // Encontrar árvore mais próxima
    const nearestTree = this.findNearestResource(
      npc.position,
      availableTrees,
      LUMBERJACK_WORK_RANGE
    );

    if (nearestTree) {
      const distance = this.getDistanceToPosition(npc.position, nearestTree.position);
      
      if (distance === 1) {
        // Adjacente à árvore - começar trabalho
        return {
          type: 'cut_tree',
          targetId: nearestTree.id,
          targetPosition: nearestTree.position,
          progress: 0,
          maxProgress: nearestTree.health,
          priority: 8
        };
      } else {
        // Precisa se mover para a árvore
        return {
          type: 'cut_tree',
          targetId: nearestTree.id,
          targetPosition: nearestTree.position,
          progress: 0,
          maxProgress: nearestTree.health, // Mesmo trabalho, só que distante
          priority: 6
        };
      }
    }

    // Se não há árvores próximas, não há trabalho
    // O NPC ficará em modo idle até encontrar trabalho

    return null;
  }

  doWork(npc: NPC, task: WorkTask): WorkResult {
    const treeStore = useTreeStore.getState();
    
    if (task.type === 'cut_tree' && task.targetId) {
      const tree = treeStore.trees[task.targetId];
      if (!tree || tree.isFalling) {
        return { success: false, completed: true, progressMade: 0 };
      }

      const distance = this.getDistanceToPosition(npc.position, tree.position);
      
      if (distance === 1) {
        // Adjacente - cortar
        const damage = 1;
        const treeDestroyed = treeStore.damageTree(tree.id, damage);
        
        return {
          success: true,
          completed: treeDestroyed,
          animation: {
            type: 'chopping',
            startTime: Date.now(),
            duration: CHOPPING_ANIMATION_DURATION
          },
          newState: NPCState.WORKING,
          progressMade: damage
        };
      } else {
        // Mover em direção à árvore
        return {
          success: true,
          completed: false,
          newState: NPCState.MOVING,
          progressMade: 0
        };
      }
    }

    return { success: false, completed: false, progressMade: 0 };
  }

  isWorkDone(npc: NPC, task: WorkTask): boolean {
    if (task.type === 'cut_tree' && task.targetId) {
      const treeStore = useTreeStore.getState();
      const tree = treeStore.trees[task.targetId];
      return !tree || tree.isFalling || tree.health <= 0;
    }
    return task.progress >= task.maxProgress;
  }

  getHomePosition(npc: NPC): Position | null {
    if (!npc.houseId) return null;
    
    const houseStore = useHouseStore.getState();
    const house = houseStore.houses[npc.houseId];
    return house ? house.position : null;
  }
}

// Sistema específico para Fazendeiros  
export class FarmerSystem extends BaseProfessionSystem implements ProfessionBehavior {
  
  findWork(npc: NPC): WorkTask | null {
    // Fazendeiros produzem comida automaticamente em intervalos
    // Verificar se já está trabalhando ou se precisa de tempo para produzir
    const now = Date.now();
    const lastWork = npc.lastWorkTime || 0;
    const FARMING_INTERVAL = 8000; // 8 segundos para produzir comida
    
    if (now - lastWork >= FARMING_INTERVAL) {
      return {
        type: 'harvest',
        targetId: 'farming_work',
        targetPosition: npc.position, // Trabalha na posição atual
        progress: 0,
        maxProgress: 1,
        priority: 5
      };
    }
    
    // Se ainda não é hora de trabalhar, ficar idle
    return null;
  }

  doWork(npc: NPC, task: WorkTask): WorkResult {
    if (task.type === 'harvest') {
      // Fazendeiro produz comida (bread)
      const npcStore = useNPCStore.getState();
      const success = npcStore.addItemToInventory(npc.id, 'BREAD', 2);
        
      if (success) {
        // Atualizar último tempo de trabalho
        npcStore.updateNPC(npc.id, { lastWorkTime: Date.now() });
        
        return {
          success: true,
          completed: true,
          newState: NPCState.IDLE,
          progressMade: 1,
          animation: {
            type: 'farming',
            startTime: Date.now(),
            duration: 2000
          }
        };
      } else {
        // Inventário cheio - ir para casa
        return {
          success: false,
          completed: true,
          newState: NPCState.RETURNING_HOME,
          progressMade: 0
        };
      }
    }
    
    return {
      success: false,
      completed: true,
      newState: NPCState.IDLE,
      progressMade: 0
    };
  }

  isWorkDone(npc: NPC, task: WorkTask): boolean {
    return task.progress >= task.maxProgress;
  }

  getHomePosition(npc: NPC): Position | null {
    if (!npc.houseId) return null;
    
    const houseStore = useHouseStore.getState();
    const house = houseStore.houses[npc.houseId];
    return house ? house.position : null;
  }
}

// Sistema específico para Mineradores
export class MinerSystem extends BaseProfessionSystem implements ProfessionBehavior {
  
  findWork(npc: NPC): WorkTask | null {
    const stoneStore = useStoneStore.getState();
    const stones = Object.values(stoneStore.stones);
    
    // Filtrar pedras disponíveis (não quebrando)
    const availableStones = stones.filter(stone => !stone.isBreaking && stone.health > 0);
    
    // Encontrar pedra mais próxima
    const nearestStone = this.findNearestResource(
      npc.position,
      availableStones,
      MINER_WORK_RANGE
    );

    if (nearestStone) {
      const distance = this.getDistanceToPosition(npc.position, nearestStone.position);
      
      if (distance === 1) {
        // Adjacente à pedra - começar trabalho
        return {
          type: 'mine_stone',
          targetId: nearestStone.id,
          targetPosition: nearestStone.position,
          progress: 0,
          maxProgress: nearestStone.health,
          priority: 8
        };
      } else {
        // Precisa se mover para a pedra
        return {
          type: 'mine_stone',
          targetId: nearestStone.id,
          targetPosition: nearestStone.position,
          progress: 0,
          maxProgress: nearestStone.health,
          priority: 6
        };
      }
    }

    // Se não há pedras próximas, não há trabalho
    return null;
  }

  doWork(npc: NPC, task: WorkTask): WorkResult {
    const stoneStore = useStoneStore.getState();
    
    if (task.type === 'mine_stone' && task.targetId) {
      const stone = stoneStore.stones[task.targetId];
      if (!stone || stone.isBreaking) {
        return { success: false, completed: true, progressMade: 0 };
      }

      const distance = this.getDistanceToPosition(npc.position, stone.position);
      
      if (distance === 1) {
        // Adjacente - minerar
        const damage = 1;
        const stoneDestroyed = stoneStore.damageStone(stone.id, damage);
        
        return {
          success: true,
          completed: stoneDestroyed,
          animation: {
            type: 'mining',
            startTime: Date.now(),
            duration: MINING_ANIMATION_DURATION
          },
          newState: NPCState.WORKING,
          progressMade: damage
        };
      } else {
        // Mover em direção à pedra
        return {
          success: true,
          completed: false,
          newState: NPCState.MOVING,
          progressMade: 0
        };
      }
    }

    return { success: false, completed: false, progressMade: 0 };
  }

  isWorkDone(npc: NPC, task: WorkTask): boolean {
    if (task.type === 'mine_stone' && task.targetId) {
      const stoneStore = useStoneStore.getState();
      const stone = stoneStore.stones[task.targetId];
      return !stone || stone.isBreaking || stone.health <= 0;
    }
    return task.progress >= task.maxProgress;
  }

  getHomePosition(npc: NPC): Position | null {
    if (!npc.houseId) return null;
    
    const houseStore = useHouseStore.getState();
    const house = houseStore.houses[npc.houseId];
    return house ? house.position : null;
  }
}

// Sistema específico para Caçadores
export class HunterSystem extends BaseProfessionSystem implements ProfessionBehavior {
  
  findWork(npc: NPC): WorkTask | null {
    const animalStore = useAnimalStore.getState();
    const animals = Object.values(animalStore.animals);
    
    // Filtrar animais disponíveis (não sendo caçados)
    const availableAnimals = animals.filter(animal => !animal.isBeingHunted && animal.health > 0);
    
    // Encontrar animal mais próximo
    const nearestAnimal = this.findNearestResource(
      npc.position,
      availableAnimals,
      HUNTER_WORK_RANGE
    );

    if (nearestAnimal) {
      const distance = this.getDistanceToPosition(npc.position, nearestAnimal.position);
      
      if (distance === 1) {
        // Adjacente ao animal - começar caça
        return {
          type: 'hunt_animal',
          targetId: nearestAnimal.id,
          targetPosition: nearestAnimal.position,
          progress: 0,
          maxProgress: nearestAnimal.health,
          priority: 7
        };
      } else {
        // Precisa se mover para o animal
        return {
          type: 'hunt_animal',
          targetId: nearestAnimal.id,
          targetPosition: nearestAnimal.position,
          progress: 0,
          maxProgress: nearestAnimal.health,
          priority: 5
        };
      }
    }

    // Se não há animais próximos, não há trabalho
    return null;
  }

  doWork(npc: NPC, task: WorkTask): WorkResult {
    const animalStore = useAnimalStore.getState();
    
    if (task.type === 'hunt_animal' && task.targetId) {
      const animal = animalStore.animals[task.targetId];
      if (!animal || animal.isBeingHunted) {
        return { success: false, completed: true, progressMade: 0 };
      }

      const distance = this.getDistanceToPosition(npc.position, animal.position);
      
      if (distance === 1) {
        // Adjacente - caçar
        const damage = 1;
        const animalKilled = animalStore.damageAnimal(animal.id, damage);
        
        return {
          success: true,
          completed: animalKilled,
          animation: {
            type: 'hunting',
            startTime: Date.now(),
            duration: HUNTING_ANIMATION_DURATION
          },
          newState: NPCState.WORKING,
          progressMade: damage
        };
      } else {
        // Mover em direção ao animal
        return {
          success: true,
          completed: false,
          newState: NPCState.MOVING,
          progressMade: 0
        };
      }
    }

    return { success: false, completed: false, progressMade: 0 };
  }

  isWorkDone(npc: NPC, task: WorkTask): boolean {
    if (task.type === 'hunt_animal' && task.targetId) {
      const animalStore = useAnimalStore.getState();
      const animal = animalStore.animals[task.targetId];
      return !animal || animal.health <= 0;
    }
    return task.progress >= task.maxProgress;
  }

  getHomePosition(npc: NPC): Position | null {
    if (!npc.houseId) return null;
    
    const houseStore = useHouseStore.getState();
    const house = houseStore.houses[npc.houseId];
    return house ? house.position : null;
  }
}

// Factory para criar sistemas de profissão
export class ProfessionSystemFactory {
  private static systems = new Map<NPCProfession, ProfessionBehavior>();

  static getSystem(profession: NPCProfession): ProfessionBehavior | null {
    if (!this.systems.has(profession)) {
      switch (profession) {
        case NPCProfession.LUMBERJACK:
          this.systems.set(profession, new LumberjackSystem());
          break;
        case NPCProfession.FARMER:
          this.systems.set(profession, new FarmerSystem());
          break;
        case NPCProfession.MINER:
          this.systems.set(profession, new MinerSystem());
          break;
        case NPCProfession.HUNTER:
          this.systems.set(profession, new HunterSystem());
          break;
        default:
          return null;
      }
    }
    return this.systems.get(profession) || null;
  }
}