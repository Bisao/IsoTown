import { NPC, NPCProfession, NPCState, Position } from '../types';
// Note: Este arquivo não pode usar hooks diretamente pois é uma classe utilitária
// Os stores serão acessados via getState() nos métodos
import { CHOPPING_ANIMATION_DURATION, LUMBERJACK_CHOP_INTERVAL } from '../constants';
import { getAdjacentPositions } from '../utils/distance';

// Sistema de ações manuais para NPCs controlados
export class NPCActionSystem {

  // Tentar cortar árvore na posição adjacente
  static async tryChopTree(npc: NPC): Promise<{ success: boolean; message: string; updates?: Partial<NPC> }> {
    if (npc.profession !== NPCProfession.LUMBERJACK) {
      return { 
        success: false, 
        message: 'Apenas lenhadores podem cortar árvores!' 
      };
    }

    if (npc.state === NPCState.WORKING) {
      return { 
        success: false, 
        message: 'NPC já está trabalhando!' 
      };
    }

    // Buscar árvores adjacentes usando TreeStore
    const treeStoreModule = await import('../stores/useTreeStore');
    const treeStore = treeStoreModule.useTreeStore.getState();
    const trees = Object.values(treeStore.trees);
    
    const adjacentTrees = trees.filter(tree => {
      if (tree.isChopping || tree.health <= 0) return false;
      const distance = Math.abs(tree.position.x - npc.position.x) + Math.abs(tree.position.z - npc.position.z);
      return distance === 1;
    });

    if (adjacentTrees.length === 0) {
      return { 
        success: false, 
        message: 'Nenhuma árvore adjacente encontrada!' 
      };
    }

    // Pegar a primeira árvore válida
    const targetTree = adjacentTrees[0];
    
    // Verificar se pode cortar
    if (targetTree.isFalling || targetTree.health <= 0) {
      return { 
        success: false, 
        message: 'Esta árvore não pode ser cortada!' 
      };
    }

    // Começar a cortar
    const updates: Partial<NPC> = {
      state: NPCState.WORKING,
      currentTask: {
        type: 'cut_tree',
        targetId: targetTree.id,
        targetPosition: targetTree.position,
        progress: 0,
        maxProgress: targetTree.health
      },
      animation: {
        type: 'chopping',
        startTime: Date.now(),
        duration: CHOPPING_ANIMATION_DURATION
      },
      lastMovement: Date.now()
    };

    return { 
      success: true, 
      message: `Começando a cortar árvore!`, 
      updates 
    };
  }

  // Continuar cortando árvore (chamado periodicamente)
  static continueChopTree(npc: NPC): { success: boolean; completed: boolean; updates?: Partial<NPC> } {
    if (!npc.currentTask || npc.currentTask.type !== 'cut_tree') {
      return { success: false, completed: true };
    }

    // Note: Esta função será chamada do GameWorld2D com acesso aos stores
    // Por agora, simular o comportamento
    const currentTime = Date.now();
    
    // Verificar se tempo suficiente passou desde o último corte
    if (currentTime - npc.lastMovement < LUMBERJACK_CHOP_INTERVAL) {
      return { success: true, completed: false };
    }

    // Simular dano à árvore
    const damage = 1;

    const newProgress = npc.currentTask.progress + damage;
    const treeDestroyed = newProgress >= npc.currentTask.maxProgress;
    
    const updates: Partial<NPC> = {
      animation: {
        type: 'chopping',
        startTime: currentTime,
        duration: CHOPPING_ANIMATION_DURATION
      },
      lastMovement: currentTime,
      currentTask: treeDestroyed ? undefined : {
        ...npc.currentTask,
        progress: newProgress
      },
      state: treeDestroyed ? NPCState.IDLE : NPCState.WORKING
    };

    console.log('TOC! Cortando árvore manualmente -', 'progresso:', newProgress, 'destruída:', treeDestroyed);

    return { 
      success: true, 
      completed: treeDestroyed, 
      updates 
    };
  }

  // Tentar plantar/colher (para fazendeiros)
  static async tryFarm(npc: NPC): Promise<{ success: boolean; message: string; updates?: Partial<NPC> }> {
    if (npc.profession !== NPCProfession.FARMER) {
      return { 
        success: false, 
        message: 'Apenas fazendeiros podem cultivar!' 
      };
    }

    // Verificar se pode trabalhar (cooldown)
    const now = Date.now();
    const lastWork = npc.lastWorkTime || 0;
    const FARMING_COOLDOWN = 8000; // 8 segundos
    
    if (now - lastWork < FARMING_COOLDOWN) {
      const remaining = Math.ceil((FARMING_COOLDOWN - (now - lastWork)) / 1000);
      return { 
        success: false, 
        message: `Aguarde ${remaining}s para cultivar novamente!` 
      };
    }

    // Tentar produzir comida
    const npcStoreModule = await import('../stores/useNPCStore');
    const npcStore = npcStoreModule.useNPCStore.getState();
    const success = npcStore.addItemToInventory(npc.id, 'BREAD', 2);
    
    if (success) {
      return { 
        success: true, 
        message: 'Cultivou 2 pães!',
        updates: { 
          lastWorkTime: now,
          animation: {
            type: 'farming',
            startTime: now,
            duration: 2000
          }
        }
      };
    } else {
      return { 
        success: false, 
        message: 'Inventário cheio! Vá para casa primeiro.' 
      };
    }
  }

  // Tentar minerar (para mineradores)
  static async tryMine(npc: NPC): Promise<{ success: boolean; message: string; updates?: Partial<NPC> }> {
    if (npc.profession !== NPCProfession.MINER) {
      return { 
        success: false, 
        message: 'Apenas mineradores podem minerar!' 
      };
    }

    // Verificar se pode trabalhar (cooldown)
    const now = Date.now();
    const lastWork = npc.lastWorkTime || 0;
    const MINING_COOLDOWN = 3800; // 3.8 segundos
    
    if (now - lastWork < MINING_COOLDOWN) {
      const remaining = Math.ceil((MINING_COOLDOWN - (now - lastWork)) / 1000);
      return { 
        success: false, 
        message: `Aguarde ${remaining}s para minerar novamente!` 
      };
    }

    // Procurar pedras adjacentes
    const stoneStoreModule = await import('../stores/useStoneStore');
    const stoneStore = stoneStoreModule.useStoneStore.getState();
    const stones = Object.values(stoneStore.stones);
    
    // Encontrar pedras adjacentes (distância 1)
    const adjacentStones = stones.filter(stone => {
      if (stone.isBreaking || stone.health <= 0) return false;
      const distance = Math.abs(stone.position.x - npc.position.x) + Math.abs(stone.position.z - npc.position.z);
      return distance === 1;
    });

    if (adjacentStones.length === 0) {
      return { 
        success: false, 
        message: 'Nenhuma pedra adjacente para minerar!' 
      };
    }

    // Minerar a primeira pedra encontrada
    const targetStone = adjacentStones[0];
    const damage = 1;
    const stoneDestroyed = stoneStore.damageStone(targetStone.id, damage);
    
    // Adicionar pedra ao inventário se foi destruída
    if (stoneDestroyed) {
      const npcStoreModule = await import('../stores/useNPCStore');
      const npcStore = npcStoreModule.useNPCStore.getState();
      npcStore.addItemToInventory(npc.id, 'STONE', 1);
    }

    return { 
      success: true, 
      message: stoneDestroyed ? 'Minerou 1 pedra!' : 'Danificou a pedra!',
      updates: { 
        lastWorkTime: now,
        animation: {
          type: 'mining',
          startTime: now,
          duration: 900
        }
      }
    };
  }

  // Parar trabalho atual
  static stopWork(npc: NPC): { success: boolean; message: string; updates?: Partial<NPC> } {
    if (npc.state !== NPCState.WORKING) {
      return { 
        success: false, 
        message: 'NPC não está trabalhando!' 
      };
    }

    const updates: Partial<NPC> = {
      state: NPCState.IDLE,
      currentTask: undefined,
      animation: undefined
    };

    return { 
      success: true, 
      message: 'Trabalho interrompido!', 
      updates 
    };
  }

  // Verificar se NPC pode executar ação específica da profissão
  static canPerformProfessionAction(npc: NPC): { canWork: boolean; actionName: string; message: string } {
    switch (npc.profession) {
      case NPCProfession.LUMBERJACK:
        // Por agora, sempre permitir a tentativa - será validado no momento da execução
        return {
          canWork: true,
          actionName: 'Cortar Árvore',
          message: 'Procurando árvores adjacentes...'
        };

      case NPCProfession.FARMER:
        return {
          canWork: false,
          actionName: 'Cultivar',
          message: 'Sistema de farming em desenvolvimento'
        };

      case NPCProfession.MINER:
        return {
          canWork: false,
          actionName: 'Minerar',
          message: 'Sistema de mineração em desenvolvimento'
        };

      default:
        return {
          canWork: false,
          actionName: 'Trabalhar',
          message: 'Sem profissão definida'
        };
    }
  }

  // Função auxiliar para encontrar árvores adjacentes usando utilitário compartilhado
  private static getAdjacentTrees(position: Position, trees: Record<string, any>): any[] {
    const adjacentPositions = getAdjacentPositions(position);

    return Object.values(trees).filter(tree => {
      if (tree.isFalling) return false;
      
      return adjacentPositions.some(pos => 
        pos.x === tree.position.x && pos.z === tree.position.z
      );
    });
  }

  // Obter informações sobre recursos próximos
  static getNearbyResourceInfo(npc: NPC): string {
    // Por agora, retornar informação básica
    return `Posição: (${npc.position.x}, ${npc.position.z})`;
  }
}