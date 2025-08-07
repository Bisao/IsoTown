import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NPC, Position, NPCControlMode, NPCProfession, NPCState } from '../types';
import { MOVEMENT_SPEED } from '../constants';
import { nanoid } from 'nanoid';
import { isValidGridPosition } from '../utils/grid';
import { npcManager } from '../systems/NPCManager';
import { useTreeStore } from './useTreeStore';

interface AdvancedNPCStore {
  npcs: Record<string, NPC>;
  
  // Actions básicas
  addNPC: (position: Position, profession?: NPCProfession) => string;
  removeNPC: (id: string) => void;
  moveNPC: (id: string, direction: Position) => void;
  setNPCTarget: (id: string, target: Position) => void;
  setNPCControlMode: (id: string, mode: NPCControlMode) => void;
  setNPCProfession: (id: string, profession: NPCProfession) => void;
  assignNPCToHouse: (npcId: string, houseId: string) => void;
  unassignNPCFromHouse: (npcId: string) => void;
  
  // Sistema avançado
  updateNPCBehaviors: () => void;
  getNPCStatistics: (id: string) => any;
  setNPCSchedule: (id: string, schedule: any) => void;
  levelUpNPC: (id: string, skill: string) => void;
  addExperience: (id: string, amount: number) => void;
  
  // Integração com sistema de árvores
  integrateWithTreeSystem: () => void;
}

export const useAdvancedNPCStore = create<AdvancedNPCStore>()(
  subscribeWithSelector((set, get) => ({
    npcs: {},

    addNPC: (position, profession = NPCProfession.NONE) => {
      const id = nanoid();
      const npc: NPC = {
        id,
        position,
        controlMode: NPCControlMode.AUTONOMOUS,
        profession,
        state: NPCState.IDLE,
        isMoving: false,
        lastMovement: Date.now(),
        // Campos avançados
        statistics: {
          workCompleted: 0,
          timeWorked: 0,
          distanceTraveled: 0,
          tasksAssigned: 0,
          efficiency: 100
        },
        skills: {
          lumberjacking: profession === NPCProfession.LUMBERJACK ? 10 : 1,
          farming: profession === NPCProfession.FARMER ? 10 : 1,
          mining: profession === NPCProfession.MINER ? 10 : 1,
        },
        inventory: {},
        health: 100,
        energy: 100,
        experience: 0,
        level: 1
      };
      
      // Inicializar no gerenciador
      npcManager.initializeNPC(npc);
      
      set((state) => ({
        npcs: { ...state.npcs, [id]: npc }
      }));
      
      console.log('Novo NPC avançado criado:', id, 'profissão:', profession);
      return id;
    },

    removeNPC: (id) => {
      npcManager.removeNPC(id);
      set((state) => {
        const { [id]: removed, ...rest } = state.npcs;
        return { npcs: rest };
      });
    },

    moveNPC: (id, direction) => {
      const npcs = get().npcs;
      const npc = npcs[id];
      if (!npc || npc.isMoving) return;

      const newPosition = {
        x: npc.position.x + direction.x,
        z: npc.position.z + direction.z
      };

      if (isValidGridPosition(newPosition)) {
        set((state) => ({
          npcs: {
            ...state.npcs,
            [id]: { 
              ...state.npcs[id], 
              position: newPosition,
              isMoving: true,
              lastMovement: Date.now(),
              statistics: {
                ...state.npcs[id].statistics!,
                distanceTraveled: state.npcs[id].statistics!.distanceTraveled + 1
              }
            }
          }
        }));

        // Parar movimento após delay
        setTimeout(() => {
          const currentState = get();
          if (currentState.npcs[id]) {
            set((state) => ({
              npcs: {
                ...state.npcs,
                [id]: { ...state.npcs[id], isMoving: false }
              }
            }));
          }
        }, MOVEMENT_SPEED);
      }
    },

    setNPCTarget: (id, target) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], targetPosition: target }
      }
    })),

    setNPCControlMode: (id, mode) => set((state) => ({
      npcs: {
        ...state.npcs,
        [id]: { ...state.npcs[id], controlMode: mode }
      }
    })),

    setNPCProfession: (id, profession) => {
      set((state) => {
        const npc = state.npcs[id];
        if (!npc) return state;

        // Resetar habilidades baseado na nova profissão
        const newSkills = { ...npc.skills };
        switch (profession) {
          case NPCProfession.LUMBERJACK:
            newSkills.lumberjacking = Math.max(newSkills.lumberjacking || 1, 10);
            break;
          case NPCProfession.FARMER:
            newSkills.farming = Math.max(newSkills.farming || 1, 10);
            break;
          case NPCProfession.MINER:
            newSkills.mining = Math.max(newSkills.mining || 1, 10);
            break;
        }

        return {
          npcs: {
            ...state.npcs,
            [id]: { 
              ...npc, 
              profession,
              skills: newSkills
            }
          }
        };
      });
    },

    assignNPCToHouse: (npcId, houseId) => set((state) => ({
      npcs: {
        ...state.npcs,
        [npcId]: { ...state.npcs[npcId], houseId }
      }
    })),

    unassignNPCFromHouse: (npcId) => set((state) => ({
      npcs: {
        ...state.npcs,
        [npcId]: { ...state.npcs[npcId], houseId: undefined }
      }
    })),

    updateNPCBehaviors: () => {
      const npcs = get().npcs;
      const updates: Record<string, Partial<NPC>> = {};

      Object.values(npcs).forEach((npc) => {
        if (npc.controlMode === NPCControlMode.AUTONOMOUS) {
          // Usar o novo sistema de gerenciamento
          const behaviorUpdate = npcManager.updateNPCBehavior(npc);
          if (behaviorUpdate) {
            updates[npc.id] = behaviorUpdate;
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        set((state) => {
          const newNpcs = { ...state.npcs };
          Object.entries(updates).forEach(([id, update]) => {
            if (newNpcs[id]) {
              newNpcs[id] = { ...newNpcs[id], ...update };
            }
          });
          return { npcs: newNpcs };
        });
      }
    },

    getNPCStatistics: (id) => {
      return npcManager.getNPCStatistics(id);
    },

    setNPCSchedule: (id, schedule) => {
      npcManager.setNPCSchedule(id, schedule);
    },

    levelUpNPC: (id, skill) => {
      set((state) => {
        const npc = state.npcs[id];
        if (!npc || !npc.skills) return state;

        const currentLevel = npc.skills[skill] || 1;
        if (currentLevel >= 100) return state; // Nível máximo

        return {
          npcs: {
            ...state.npcs,
            [id]: {
              ...npc,
              skills: {
                ...npc.skills,
                [skill]: currentLevel + 1
              }
            }
          }
        };
      });
    },

    addExperience: (id, amount) => {
      set((state) => {
        const npc = state.npcs[id];
        if (!npc) return state;

        const newExperience = (npc.experience || 0) + amount;
        const experienceForNextLevel = (npc.level || 1) * 100;
        
        let newLevel = npc.level || 1;
        let remainingExperience = newExperience;

        // Verificar se subiu de nível
        while (remainingExperience >= experienceForNextLevel) {
          remainingExperience -= experienceForNextLevel;
          newLevel++;
        }

        return {
          npcs: {
            ...state.npcs,
            [id]: {
              ...npc,
              experience: remainingExperience,
              level: newLevel,
              health: Math.min(100, (npc.health || 100) + (newLevel - (npc.level || 1)) * 5), // +5 HP por nível
              energy: Math.min(100, (npc.energy || 100) + (newLevel - (npc.level || 1)) * 3)  // +3 energia por nível
            }
          }
        };
      });
    },

    integrateWithTreeSystem: () => {
      // Conectar com o sistema de árvores para sincronização
      const treeStore = useTreeStore.getState();
      console.log('Sistema NPC integrado com', Object.keys(treeStore.trees).length, 'árvores');
    }
  }))
);

// Configurar atualização automática dos comportamentos
setInterval(() => {
  const store = useAdvancedNPCStore.getState();
  store.updateNPCBehaviors();
}, 1000); // Atualizar a cada segundo

// Integração com sistema de árvores
useAdvancedNPCStore.getState().integrateWithTreeSystem();