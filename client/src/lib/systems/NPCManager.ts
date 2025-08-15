import { NPC, NPCState, NPCControlMode, Position } from '../types';
import { ProfessionSystemFactory, WorkTask } from './ProfessionSystem';
import { getRandomDirection } from '../utils/pathfinding';
import { isValidGridPosition } from '../utils/grid';
import { DEFAULT_WORK_START_HOUR, DEFAULT_WORK_END_HOUR, DEFAULT_REST_START_HOUR, DEFAULT_REST_END_HOUR, DEFAULT_BREAK_DURATION, DEFAULT_WORK_DURATION } from '../constants';

export interface NPCStatistics {
  workCompleted: number;
  timeWorked: number;
  distanceTraveled: number;
  tasksAssigned: number;
  efficiency: number; // 0-100%
}

export interface NPCSchedule {
  workHours: { start: number; end: number }; // 0-23 hours
  restHours: { start: number; end: number };
  breakDuration: number; // minutes
  workDuration: number; // minutes
}

// Gerenciador avançado de NPCs
export class NPCManager {
  private npcStatistics = new Map<string, NPCStatistics>();
  private npcSchedules = new Map<string, NPCSchedule>();
  private npcCurrentTasks = new Map<string, WorkTask>();
  private lastUpdateTime = Date.now();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // Configuração padrão de horário usando constantes
  private defaultSchedule: NPCSchedule = {
    workHours: { start: DEFAULT_WORK_START_HOUR, end: DEFAULT_WORK_END_HOUR },
    restHours: { start: DEFAULT_REST_START_HOUR, end: DEFAULT_REST_END_HOUR },
    breakDuration: DEFAULT_BREAK_DURATION,
    workDuration: DEFAULT_WORK_DURATION
  };

  constructor() {
    // Inicializar sistema
    this.startUpdateLoop();
  }

  // Inicializar NPC no sistema
  initializeNPC(npc: NPC): void {
    if (!this.npcStatistics.has(npc.id)) {
      this.npcStatistics.set(npc.id, {
        workCompleted: 0,
        timeWorked: 0,
        distanceTraveled: 0,
        tasksAssigned: 0,
        efficiency: 100
      });
    }

    if (!this.npcSchedules.has(npc.id)) {
      this.npcSchedules.set(npc.id, { ...this.defaultSchedule });
    }
  }

  // Atualizar comportamento do NPC
  updateNPCBehavior(npc: NPC): Partial<NPC> | null {
    if (npc.controlMode !== NPCControlMode.AUTONOMOUS) {
      return null;
    }

    this.initializeNPC(npc);

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const schedule = this.npcSchedules.get(npc.id)!;

    // Verificar se é hora de trabalhar
    if (!this.isWorkTime(currentHour, schedule)) {
      return this.handleRestTime(npc);
    }

    // Obter sistema de profissão
    const professionSystem = ProfessionSystemFactory.getSystem(npc.profession);
    if (!professionSystem) {
      return this.handleIdleBehavior(npc);
    }

    // Verificar se tem uma tarefa atual
    let currentTask = this.npcCurrentTasks.get(npc.id);
    
    // Se não tem tarefa ou a tarefa está completa, buscar nova
    if (!currentTask || professionSystem.isWorkDone(npc, currentTask)) {
      const newTask = professionSystem.findWork(npc);
      if (newTask) {
        currentTask = newTask;
        this.npcCurrentTasks.set(npc.id, currentTask);
        this.updateStatistics(npc.id, 'tasksAssigned', 1);
      } else {
        currentTask = undefined;
      }
    }

    if (!currentTask) {
      return this.handleIdleBehavior(npc);
    }

    // Executar trabalho
    const workResult = professionSystem.doWork(npc, currentTask);
    
    if (workResult.success) {
      // Atualizar progresso da tarefa
      currentTask.progress += workResult.progressMade;
      this.updateStatistics(npc.id, 'workCompleted', workResult.progressMade);
      
      if (workResult.completed) {
        this.npcCurrentTasks.delete(npc.id);
      } else {
        this.npcCurrentTasks.set(npc.id, currentTask);
      }

      // Preparar atualizações do NPC
      const updates: Partial<NPC> = {};
      
      if (workResult.newState) {
        updates.state = workResult.newState;
      }
      
      if (workResult.animation) {
        updates.animation = workResult.animation;
      }

      if (currentTask.type === 'cut_tree' && workResult.newState === NPCState.MOVING) {
        updates.targetPosition = currentTask.targetPosition;
      }

      updates.currentTask = {
        type: currentTask.type,
        targetId: currentTask.targetId,
        targetPosition: currentTask.targetPosition,
        progress: currentTask.progress,
        maxProgress: currentTask.maxProgress
      };

      return updates;
    }

    return null;
  }

  // Verificar se é hora de trabalhar
  private isWorkTime(currentHour: number, schedule: NPCSchedule): boolean {
    const { start, end } = schedule.workHours;
    
    if (start < end) {
      // Horário normal (ex: 8h-18h)
      return currentHour >= start && currentHour < end;
    } else {
      // Horário noturno (ex: 22h-6h)
      return currentHour >= start || currentHour < end;
    }
  }

  // Lidar com tempo de descanso
  private handleRestTime(npc: NPC): Partial<NPC> | null {
    // Se não está em casa, ir para casa
    const professionSystem = ProfessionSystemFactory.getSystem(npc.profession);
    if (professionSystem) {
      const homePosition = professionSystem.getHomePosition(npc);
      if (homePosition && !this.isAtPosition(npc.position, homePosition)) {
        return {
          state: NPCState.RETURNING_HOME,
          targetPosition: homePosition
        };
      }
    }

    return {
      state: NPCState.IDLE,
      targetPosition: undefined
    };
  }

  // Comportamento ocioso/aleatório
  private handleIdleBehavior(npc: NPC): Partial<NPC> | null {
    if (npc.isMoving) return null;

    const currentTime = Date.now();
    if (!npc.lastMovement || currentTime - npc.lastMovement > 3000) {
      if (Math.random() < 0.3) { // 30% chance de movimento aleatório
        const direction = getRandomDirection();
        const newPosition = {
          x: npc.position.x + direction.x,
          z: npc.position.z + direction.z
        };

        if (isValidGridPosition(newPosition)) {
          this.updateStatistics(npc.id, 'distanceTraveled', 1);
          return {
            position: newPosition,
            isMoving: true,
            lastMovement: currentTime,
            state: NPCState.MOVING
          };
        }
      }
      
      return {
        lastMovement: currentTime
      };
    }

    return null;
  }

  // Verificar se NPC está na posição especificada
  private isAtPosition(current: Position, target: Position): boolean {
    return current.x === target.x && current.z === target.z;
  }

  // Atualizar estatísticas do NPC
  private updateStatistics(npcId: string, metric: keyof NPCStatistics, value: number): void {
    const stats = this.npcStatistics.get(npcId);
    if (stats) {
      if (typeof stats[metric] === 'number') {
        (stats[metric] as number) += value;
        
        // Recalcular eficiência
        if (stats.tasksAssigned > 0) {
          stats.efficiency = Math.min(100, (stats.workCompleted / stats.tasksAssigned) * 100);
        }
        
        this.npcStatistics.set(npcId, stats);
      }
    }
  }

  // Obter estatísticas do NPC
  getNPCStatistics(npcId: string): NPCStatistics | null {
    return this.npcStatistics.get(npcId) || null;
  }

  // Obter horário do NPC
  getNPCSchedule(npcId: string): NPCSchedule | null {
    return this.npcSchedules.get(npcId) || null;
  }

  // Definir horário personalizado para NPC
  setNPCSchedule(npcId: string, schedule: Partial<NPCSchedule>): void {
    const currentSchedule = this.npcSchedules.get(npcId) || { ...this.defaultSchedule };
    this.npcSchedules.set(npcId, { ...currentSchedule, ...schedule });
  }

  // Obter tarefa atual do NPC
  getCurrentTask(npcId: string): WorkTask | null {
    return this.npcCurrentTasks.get(npcId) || null;
  }

  // Loop de atualização principal
  private startUpdateLoop(): void {
    this.updateInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - this.lastUpdateTime;
      
      // Atualizar tempo trabalhado para NPCs em estado de trabalho
      this.npcStatistics.forEach((stats, npcId) => {
        const task = this.npcCurrentTasks.get(npcId);
        if (task && (task.type === 'cut_tree' || task.type === 'harvest' || task.type === 'mine_stone')) {
          stats.timeWorked += deltaTime;
        }
      });
      
      this.lastUpdateTime = now;
    }, 1000); // Atualizar a cada segundo
  }

  // Método para limpar recursos e evitar vazamentos de memória
  public cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.npcStatistics.clear();
    this.npcSchedules.clear();
    this.npcCurrentTasks.clear();
  }

  // Limpar dados do NPC quando removido
  removeNPC(npcId: string): void {
    this.npcStatistics.delete(npcId);
    this.npcSchedules.delete(npcId);
    this.npcCurrentTasks.delete(npcId);
  }

  // Obter resumo de todos os NPCs
  getAllNPCStats(): Map<string, NPCStatistics> {
    return new Map(this.npcStatistics);
  }
}

// Instância global do gerenciador
export const npcManager = new NPCManager();