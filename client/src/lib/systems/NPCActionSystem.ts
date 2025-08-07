import { NPC, NPCProfession, NPCState, Position } from '../types';
// Note: Este arquivo não pode usar hooks diretamente pois é uma classe utilitária
// Os stores serão acessados via getState() nos métodos
import { CHOPPING_ANIMATION_DURATION, LUMBERJACK_CHOP_INTERVAL } from '../constants';

// Sistema de ações manuais para NPCs controlados
export class NPCActionSystem {

  // Tentar cortar árvore na posição adjacente
  static tryChopTree(npc: NPC): { success: boolean; message: string; updates?: Partial<NPC> } {
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

    // Buscar árvores adjacentes
    // Note: Será implementado quando integrado com o GameWorld2D que tem acesso aos stores
    const adjacentTrees = this.getAdjacentTrees(npc.position, {});  // Placeholder

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
  static tryFarm(npc: NPC): { success: boolean; message: string; updates?: Partial<NPC> } {
    if (npc.profession !== NPCProfession.FARMER) {
      return { 
        success: false, 
        message: 'Apenas fazendeiros podem cultivar!' 
      };
    }

    // TODO: Implementar sistema de farming
    return { 
      success: false, 
      message: 'Sistema de farming ainda não implementado!' 
    };
  }

  // Tentar minerar (para mineradores)
  static tryMine(npc: NPC): { success: boolean; message: string; updates?: Partial<NPC> } {
    if (npc.profession !== NPCProfession.MINER) {
      return { 
        success: false, 
        message: 'Apenas mineradores podem minerar!' 
      };
    }

    // TODO: Implementar sistema de mineração
    return { 
      success: false, 
      message: 'Sistema de mineração ainda não implementado!' 
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

  // Função auxiliar para encontrar árvores adjacentes
  private static getAdjacentTrees(position: Position, trees: Record<string, any>): any[] {
    const adjacentPositions = [
      { x: position.x + 1, z: position.z },     // direita
      { x: position.x - 1, z: position.z },     // esquerda
      { x: position.x, z: position.z + 1 },     // baixo
      { x: position.x, z: position.z - 1 }      // cima
    ];

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