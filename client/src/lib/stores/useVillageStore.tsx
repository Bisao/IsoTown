
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
  generateProceduralMap: (centerPosition: Position, mapSize: number) => string;
  generateHousesConnectedToRoads: (centerPosition: Position, mapSize: number) => void;
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

      // Importar dinamicamente o store
      import('./useHouseStore').then(({ useHouseStore }) => {
        const { addHouse, getHouseAt } = useHouseStore.getState();
        const houseTypes = [HouseType.FARMER, HouseType.LUMBERJACK, HouseType.MINER];
        
        // Gerar casas em posições estratégicas ao redor das ruas
        const housePositions = [];
        
        for (let x = village.centerPosition.x - village.size; x <= village.centerPosition.x + village.size; x++) {
          for (let z = village.centerPosition.z - village.size; z <= village.centerPosition.z + village.size; z++) {
            const position = { x, z };
            
            // Verificar se não é uma rua
            if (get().getRoadAt(position)) continue;
            
            // Verificar se já existe uma casa
            if (getHouseAt(position)) continue;
            
            // Verificar se está próximo de uma rua (adjacente)
            const adjacentToRoad = [
              { x: x + 1, z },
              { x: x - 1, z },
              { x, z: z + 1 },
              { x, z: z - 1 }
            ].some(pos => get().getRoadAt(pos));
            
            if (adjacentToRoad) {
              // Chance de 40% de gerar uma casa (aumentada para mais densidade)
              if (Math.random() < 0.4) {
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
      }).catch(error => {
        console.error('Erro ao importar useHouseStore:', error);
      });
    },

    // Nova função para gerar mapa procedural conectado
    generateProceduralMap: (centerPosition: Position, mapSize: number) => {
      const mapId = nanoid();
      
      // Criar rede de ruas principais em grade
      const roadSpacing = 8; // Espaçamento entre ruas principais
      const roads: Road[] = [];
      
      // Gerar ruas horizontais principais
      for (let z = centerPosition.z - mapSize; z <= centerPosition.z + mapSize; z += roadSpacing) {
        for (let x = centerPosition.x - mapSize; x <= centerPosition.x + mapSize; x++) {
          const roadId = nanoid();
          roads.push({
            id: roadId,
            position: { x, z },
            type: 'horizontal'
          });
        }
      }
      
      // Gerar ruas verticais principais
      for (let x = centerPosition.x - mapSize; x <= centerPosition.x + mapSize; x += roadSpacing) {
        for (let z = centerPosition.z - mapSize; z <= centerPosition.z + mapSize; z++) {
          if (roads.some(road => road.position.x === x && road.position.z === z)) {
            // Já existe rua horizontal - criar cruzamento
            const existingRoad = roads.find(road => road.position.x === x && road.position.z === z);
            if (existingRoad) {
              existingRoad.type = 'cross';
            }
          } else {
            const roadId = nanoid();
            roads.push({
              id: roadId,
              position: { x, z },
              type: 'vertical'
            });
          }
        }
      }
      
      // Gerar ruas secundárias para conectar quarteirões
      const secondarySpacing = 4;
      for (let z = centerPosition.z - mapSize; z <= centerPosition.z + mapSize; z += secondarySpacing) {
        for (let x = centerPosition.x - mapSize; x <= centerPosition.x + mapSize; x += secondarySpacing) {
          // Verificar se não conflita com ruas principais
          if (!roads.some(road => road.position.x === x && road.position.z === z)) {
            // Criar pequenas ruas conectoras
            for (let dx = -1; dx <= 1; dx++) {
              const roadId = nanoid();
              if (x + dx >= centerPosition.x - mapSize && x + dx <= centerPosition.x + mapSize) {
                roads.push({
                  id: roadId,
                  position: { x: x + dx, z },
                  type: 'horizontal'
                });
              }
            }
          }
        }
      }
      
      // Adicionar todas as ruas ao store
      set((state) => {
        const newRoads = roads.reduce((acc, road) => {
          acc[road.id] = road;
          return acc;
        }, {} as Record<string, Road>);
        
        return {
          roads: { ...state.roads, ...newRoads }
        };
      });
      
      // Gerar casas conectadas às ruas após um delay
      setTimeout(() => {
        get().generateHousesConnectedToRoads(centerPosition, mapSize);
      }, 500);
      
      console.log(`Mapa procedural gerado com ${roads.length} segmentos de rua`);
      return mapId;
    },

    generateHousesConnectedToRoads: (centerPosition: Position, mapSize: number) => {
      import('./useHouseStore').then(({ useHouseStore }) => {
        const { addHouse, getHouseAt } = useHouseStore.getState();
        const houseTypes = [HouseType.FARMER, HouseType.LUMBERJACK, HouseType.MINER];
        
        let housesGenerated = 0;
        
        // Gerar casas em lotes adjacentes às ruas
        for (let x = centerPosition.x - mapSize; x <= centerPosition.x + mapSize; x++) {
          for (let z = centerPosition.z - mapSize; z <= centerPosition.z + mapSize; z++) {
            const position = { x, z };
            
            // Pular se já existe rua ou casa
            if (get().getRoadAt(position) || getHouseAt(position)) continue;
            
            // Verificar conectividade com ruas (adjacente ou diagonal)
            const nearbyRoads = [
              { x: x + 1, z },     // direita
              { x: x - 1, z },     // esquerda  
              { x, z: z + 1 },     // baixo
              { x, z: z - 1 },     // cima
              { x: x + 1, z: z + 1 }, // diagonal inferior direita
              { x: x - 1, z: z + 1 }, // diagonal inferior esquerda
              { x: x + 1, z: z - 1 }, // diagonal superior direita
              { x: x - 1, z: z - 1 }  // diagonal superior esquerda
            ];
            
            const connectedToRoad = nearbyRoads.some(pos => get().getRoadAt(pos));
            
            if (connectedToRoad) {
              // Densidade baseada na distância do centro
              const distanceFromCenter = Math.abs(x - centerPosition.x) + Math.abs(z - centerPosition.z);
              const maxDistance = mapSize * 2;
              const density = Math.max(0.2, 0.8 - (distanceFromCenter / maxDistance) * 0.6);
              
              if (Math.random() < density) {
                const randomType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
                const rotation = Math.floor(Math.random() * 4) * 90;
                addHouse(randomType, position, rotation);
                housesGenerated++;
              }
            }
          }
        }
        
        console.log(`Geradas ${housesGenerated} casas conectadas às ruas`);
      }).catch(error => {
        console.error('Erro ao gerar casas:', error);
      });
    }
  }))
);
