import { NPC, NPCProfession, NPCState, Position } from '../types';
import { useTreeStore } from '../stores/useTreeStore';
import { useHouseStore } from '../stores/useHouseStore';
import { LUMBERJACK_WORK_RANGE, LUMBERJACK_CHOP_INTERVAL, CHOPPING_ANIMATION_DURATION } from '../constants';

// Interface para definir comportamentos de profissão
export interface ProfessionBehavior {
  findWork: (npc: NPC) => WorkTask | null;
  doWork: (npc: NPC, task: WorkTask) => WorkResult;
  isWorkDone: (npc: NPC, task: WorkTask) => boolean;
  getHomePosition: (npc: NPC) => Position | null;
}

export interface WorkTask {
  type: 'cut_tree' | 'harvest' | 'mine';
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
    type: 'chopping' | 'walking' | 'idle';
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
    return Math.abs(to.x - from.x) + Math.abs(to.z - from.z);
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
    // TODO: Implementar lógica de farming
    // Por enquanto, não há trabalho específico de fazendeiro
    return null;
  }

  doWork(npc: NPC, task: WorkTask): WorkResult {
    // TODO: Implementar lógica de trabalho do fazendeiro
    return {
      success: true,
      completed: true,
      newState: NPCState.IDLE,
      progressMade: 1
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
    // TODO: Implementar lógica de mineração
    // Por enquanto, não há trabalho específico de minerador
    return null;
  }

  doWork(npc: NPC, task: WorkTask): WorkResult {
    // TODO: Implementar lógica de trabalho do minerador
    return {
      success: true,
      completed: true,
      newState: NPCState.IDLE,
      progressMade: 1
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
        default:
          return null;
      }
    }
    return this.systems.get(profession) || null;
  }
}