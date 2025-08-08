
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
      
      // Criar um layout mais conectado de ruas
      const roadPositions = new Set<string>();
      
      // Rua principal horizontal
      for (let x = centerPosition.x - size; x <= centerPosition.x + size; x++) {
        const roadId = nanoid();
        const position = { x, z: centerPosition.z };
        const posKey = `${x},${centerPosition.z}`;
        
        if (!roadPositions.has(posKey)) {
          roadPositions.add(posKey);
          const road: Road = {
            id: roadId,
            position,
            type: x === centerPosition.x ? 'cross' : 'horizontal'
          };
          addRoadToVillage(villageId, road);
        }
      }
      
      // Rua principal vertical
      for (let z = centerPosition.z - size; z <= centerPosition.z + size; z++) {
        if (z === centerPosition.z) continue; // Evitar sobrepor com cruzamento central
        const roadId = nanoid();
        const position = { x: centerPosition.x, z };
        const posKey = `${centerPosition.x},${z}`;
        
        if (!roadPositions.has(posKey)) {
          roadPositions.add(posKey);
          const road: Road = {
            id: roadId,
            position,
            type: 'vertical'
          };
          addRoadToVillage(villageId, road);
        }
      }
      
      // Adicionar algumas ruas secundárias para melhor conectividade
      const secondaryRoads = [
        // Rua horizontal secundária
        { offset: { x: 0, z: 2 }, direction: 'horizontal', length: 3 },
        { offset: { x: 0, z: -2 }, direction: 'horizontal', length: 3 },
        // Ruas verticais secundárias
        { offset: { x: 2, z: 0 }, direction: 'vertical', length: 3 },
        { offset: { x: -2, z: 0 }, direction: 'vertical', length: 3 }
      ];
      
      secondaryRoads.forEach(roadConfig => {
        const startPos = {
          x: centerPosition.x + roadConfig.offset.x,
          z: centerPosition.z + roadConfig.offset.z
        };
        
        const length = Math.min(roadConfig.length, size);
        
        if (roadConfig.direction === 'horizontal') {
          for (let i = -length; i <= length; i++) {
            const position = { x: startPos.x + i, z: startPos.z };
            const posKey = `${position.x},${position.z}`;
            
            if (!roadPositions.has(posKey)) {
              roadPositions.add(posKey);
              const roadId = nanoid();
              const road: Road = {
                id: roadId,
                position,
                type: 'horizontal'
              };
              addRoadToVillage(villageId, road);
            }
          }
        } else if (roadConfig.direction === 'vertical') {
          for (let i = -length; i <= length; i++) {
            const position = { x: startPos.x, z: startPos.z + i };
            const posKey = `${position.x},${position.z}`;
            
            if (!roadPositions.has(posKey)) {
              roadPositions.add(posKey);
              const roadId = nanoid();
              const road: Road = {
                id: roadId,
                position,
                type: 'vertical'
              };
              addRoadToVillage(villageId, road);
            }
          }
        }
      });

      // Gerar casas automaticamente ao redor das ruas
      setTimeout(() => {
        get().generateVillageLayout(villageId);
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
        const candidatePositions = [];
        
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
              candidatePositions.push(position);
            }
          }
        }
        
        // Determinar número de casas para esta vila (3-7)
        const minHouses = 3;
        const maxHouses = 7;
        const targetHouses = Math.floor(Math.random() * (maxHouses - minHouses + 1)) + minHouses;
        
        // Selecionar posições aleatórias até atingir o número desejado
        const selectedPositions = [];
        const shuffledPositions = [...candidatePositions].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(targetHouses, shuffledPositions.length); i++) {
          selectedPositions.push(shuffledPositions[i]);
        }
        
        // Adicionar casas
        selectedPositions.forEach(position => {
          const randomType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
          const rotation = Math.floor(Math.random() * 4) * 90;
          addHouse(randomType, position, rotation);
        });
        
        console.log(`Vilarejo ${village.name} criado com ${selectedPositions.length} casas`);
      }).catch(error => {
        console.error('Erro ao importar useHouseStore:', error);
      });
    },

    // Nova função para gerar mapa procedural com vilas pequenas
    generateProceduralMap: (centerPosition: Position, mapSize: number) => {
      const mapId = nanoid();
      
      // Gerar vilas mais espalhadas pelo mapa com variação de tamanho
      const baseVillageSpacing = 45; // Aumentar espaçamento significativamente
      const minVillageSize = 2;
      const maxVillageSize = 5;
      
      // Gerar menos vilas, mas com mais qualidade e variação
      const villageCount = Math.floor(mapSize / 25); // Reduzir densidade de vilas
      
      for (let i = 0; i < villageCount; i++) {
        // Posicionamento mais aleatório e espalhado
        const angle = (i / villageCount) * 2 * Math.PI + Math.random() * 0.5;
        const distance = Math.random() * mapSize * 0.8; // Usar 80% do raio do mapa
        
        const x = centerPosition.x + Math.cos(angle) * distance;
        const z = centerPosition.z + Math.sin(angle) * distance;
        
        // Adicionar variação adicional na posição
        const offsetX = Math.floor((Math.random() - 0.5) * 20);
        const offsetZ = Math.floor((Math.random() - 0.5) * 20);
        
        const villageCenter = { 
          x: Math.floor(x + offsetX), 
          z: Math.floor(z + offsetZ) 
        };
        
        // Tamanho variável para cada vila
        const villageSize = Math.floor(Math.random() * (maxVillageSize - minVillageSize + 1)) + minVillageSize;
        
        // Criar vila com nome único
        get().createVillage(villageCenter, villageSize, 'Vila');
      }
      
      console.log(`Mapa procedural gerado com ${villageCount} vilas espalhadas`);
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
