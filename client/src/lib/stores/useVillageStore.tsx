
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Position } from '../types';
import { HouseType } from '../constants';
import { nanoid } from 'nanoid';

export interface Road {
  id: string;
  position: Position;
  type: 'horizontal' | 'vertical' | 'cross' | 'corner_ne' | 'corner_nw' | 'corner_se' | 'corner_sw';
}

export interface Village {
  id: string;
  name: string;
  centerPosition: Position;
  size: number; // raio do vilarejo
  houses: string[]; // IDs das casas
  roads: Road[];
}

interface VillageStore {
  villages: Record<string, Village>;
  roads: Record<string, Road>;
  
  // Actions
  createVillage: (centerPosition: Position, size: number, name?: string) => string;
  addRoadToVillage: (villageId: string, road: Road) => void;
  getRoadAt: (position: Position) => Road | undefined;
  generateVillageLayout: (villageId: string) => void;
}

export const useVillageStore = create<VillageStore>()(
  subscribeWithSelector((set, get) => ({
    villages: {},
    roads: {},

    createVillage: (centerPosition, size, name = 'Vila') => {
      const id = nanoid();
      const village: Village = {
        id,
        name: `${name} ${id.slice(0, 4)}`,
        centerPosition,
        size,
        houses: [],
        roads: []
      };
      
      set((state) => ({
        villages: { ...state.villages, [id]: village }
      }));
      
      // Gerar layout do vilarejo após criação
      setTimeout(() => {
        get().generateVillageLayout(id);
      }, 100);
      
      return id;
    },

    addRoadToVillage: (villageId, road) => {
      set((state) => {
        const village = state.villages[villageId];
        if (!village) return state;

        return {
          roads: { ...state.roads, [road.id]: road },
          villages: {
            ...state.villages,
            [villageId]: {
              ...village,
              roads: [...village.roads, road]
            }
          }
        };
      });
    },

    getRoadAt: (position) => {
      const roads = get().roads;
      return Object.values(roads).find(
        (road) => road.position.x === position.x && road.position.z === position.z
      );
    },

    generateVillageLayout: (villageId) => {
      const { villages, addRoadToVillage } = get();
      const village = villages[villageId];
      if (!village) return;

      const { centerPosition, size } = village;
      
      // Gerar ruas principais (cruz no centro)
      // Rua horizontal
      for (let x = centerPosition.x - size; x <= centerPosition.x + size; x++) {
        const roadId = nanoid();
        const road: Road = {
          id: roadId,
          position: { x, z: centerPosition.z },
          type: 'horizontal'
        };
        addRoadToVillage(villageId, road);
      }
      
      // Rua vertical
      for (let z = centerPosition.z - size; z <= centerPosition.z + size; z++) {
        if (z === centerPosition.z) continue; // Evitar sobrepor com a horizontal
        const roadId = nanoid();
        const road: Road = {
          id: roadId,
          position: { x: centerPosition.x, z },
          type: 'vertical'
        };
        addRoadToVillage(villageId, road);
      }
      
      // Cruzamento no centro
      const centerRoadId = nanoid();
      const centerRoad: Road = {
        id: centerRoadId,
        position: centerPosition,
        type: 'cross'
      };
      addRoadToVillage(villageId, centerRoad);

      // Gerar ruas secundárias em grade
      for (let x = centerPosition.x - size + 2; x <= centerPosition.x + size - 2; x += 3) {
        for (let z = centerPosition.z - size + 2; z <= centerPosition.z + size - 2; z += 3) {
          if (x === centerPosition.x || z === centerPosition.z) continue; // Evitar ruas principais
          
          // Rua horizontal menor
          for (let dx = -1; dx <= 1; dx++) {
            const roadId = nanoid();
            const road: Road = {
              id: roadId,
              position: { x: x + dx, z },
              type: 'horizontal'
            };
            addRoadToVillage(villageId, road);
          }
          
          // Rua vertical menor
          for (let dz = -1; dz <= 1; dz++) {
            if (dz === 0) continue; // Evitar sobrepor
            const roadId = nanoid();
            const road: Road = {
              id: roadId,
              position: { x, z: z + dz },
              type: 'vertical'
            };
            addRoadToVillage(villageId, road);
          }
        }
      }

      // Gerar casas automaticamente ao redor das ruas
      setTimeout(() => {
        get().generateVillageHouses(villageId);
      }, 500);
    },

    generateVillageHouses: (villageId: string) => {
      const { villages } = get();
      const village = villages[villageId];
      if (!village) return;

      const { useHouseStore } = require('./useHouseStore');
      const { addHouse } = useHouseStore.getState();
      const houseTypes = [HouseType.FARMER, HouseType.LUMBERJACK, HouseType.MINER];
      
      // Gerar casas em posições estratégicas ao redor das ruas
      const housePositions = [];
      
      for (let x = village.centerPosition.x - village.size; x <= village.centerPosition.x + village.size; x++) {
        for (let z = village.centerPosition.z - village.size; z <= village.centerPosition.z + village.size; z++) {
          const position = { x, z };
          
          // Verificar se não é uma rua
          if (get().getRoadAt(position)) continue;
          
          // Verificar se está próximo de uma rua (adjacente)
          const adjacentToRoad = [
            { x: x + 1, z },
            { x: x - 1, z },
            { x, z: z + 1 },
            { x, z: z - 1 }
          ].some(pos => get().getRoadAt(pos));
          
          if (adjacentToRoad) {
            // Chance de 30% de gerar uma casa
            if (Math.random() < 0.3) {
              housePositions.push(position);
            }
          }
        }
      }
      
      // Adicionar casas
      housePositions.forEach(position => {
        const randomType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
        const rotation = Math.floor(Math.random() * 4) * 90;
        addHouse(randomType, position, rotation);
      });
      
      console.log(`Vilarejo ${village.name} criado com ${housePositions.length} casas`);
    }
  }))
);
