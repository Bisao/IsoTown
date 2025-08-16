
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Position } from '../types';
import { HouseType } from '../constants';
import { nanoid } from 'nanoid';
import { renderRandom } from '../utils/deterministicRandom';
import { logger } from '../utils/logger';

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
  generateVillageHouses: (villageId: string) => void;
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
      
      // Sistema de grade estruturada como na imagem de referência
      const roadSpacing = 3; // Espaçamento entre ruas principais (igual à imagem)
      const additionalRoads = [];
      
      // Criar ruas horizontais secundárias
      for (let z = centerPosition.z - size; z <= centerPosition.z + size; z += roadSpacing) {
        if (z === centerPosition.z) continue; // Já temos a rua principal
        for (let x = centerPosition.x - size; x <= centerPosition.x + size; x++) {
          const roadId = nanoid();
          const position = { x, z };
          const posKey = `${x},${z}`;
          
          if (!roadPositions.has(posKey)) {
            roadPositions.add(posKey);
            const road: Road = {
              id: roadId,
              position,
              type: 'horizontal'
            };
            additionalRoads.push(road);
          }
        }
      }
      
      // Criar ruas verticais secundárias
      for (let x = centerPosition.x - size; x <= centerPosition.x + size; x += roadSpacing) {
        if (x === centerPosition.x) continue; // Já temos a rua principal
        for (let z = centerPosition.z - size; z <= centerPosition.z + size; z++) {
          const roadId = nanoid();
          const position = { x, z };
          const posKey = `${x},${z}`;
          
          if (!roadPositions.has(posKey)) {
            roadPositions.add(posKey);
            // Verificar se cruzamos com uma rua horizontal
            const existingHorizontalRoad = additionalRoads.find(road => 
              road.position.x === x && road.position.z === z && road.type === 'horizontal'
            );
            
            const road: Road = {
              id: roadId,
              position,
              type: existingHorizontalRoad ? 'cross' : 'vertical'
            };
            
            if (!existingHorizontalRoad) {
              additionalRoads.push(road);
            } else {
              // Atualizar a rua existente para ser um cruzamento
              existingHorizontalRoad.type = 'cross';
            }
          }
        }
      }
      
      // Adicionar todas as ruas secundárias
      additionalRoads.forEach(road => {
        addRoadToVillage(villageId, road);
      });
      
      // console.log(`Grade de ruas criada para vila ${villageId}: sistema estruturado como na imagem de referência`);

      // Gerar casas automaticamente ao redor das ruas
      setTimeout(() => {
        get().generateHousesConnectedToRoads(village.centerPosition, village.size);
      }, 500);
    },

    generateVillageHouses: (villageId: string) => {
      const { villages } = get();
      const village = villages[villageId];
      if (!village) return;

      // Importar dinamicamente o store com logs de debug
      console.log(`Iniciando geração de casas para vila ${villageId}`);
      import('./useHouseStore').then(({ useHouseStore }) => {
        console.log('useHouseStore importado com sucesso');
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
        // Use deterministic generation based on village center position
        const positionSeed = village.centerPosition.x * 1000 + village.centerPosition.z;
        renderRandom.setSeed(positionSeed);
        const targetHouses = Math.floor(renderRandom.between(minHouses, maxHouses + 1));
        
        // Selecionar posições aleatórias até atingir o número desejado
        const selectedPositions = [];
        const shuffledPositions = [...candidatePositions].sort(() => renderRandom.next() - 0.5);
        
        for (let i = 0; i < Math.min(targetHouses, shuffledPositions.length); i++) {
          selectedPositions.push(shuffledPositions[i]);
        }
        
        // Adicionar casas
        selectedPositions.forEach(position => {
          const randomType = renderRandom.pick(houseTypes);
          const rotation = renderRandom.int(0, 4) * 90;
          addHouse(randomType, position, rotation);
        });
        
        // logger.log(`Vilarejo ${village.name} criado com ${selectedPositions.length} casas`);
      }).catch(error => {
        logger.error('Erro ao importar useHouseStore:', error);
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
      
      // console.log(`Mapa procedural gerado com ${villageCount} vilas espalhadas`);
      return mapId;
    },

    generateHousesConnectedToRoads: (centerPosition: Position, mapSize: number) => {
      // console.log(`Iniciando geração de casas conectadas às ruas em ${centerPosition.x}, ${centerPosition.z}`);
      import('./useHouseStore').then(({ useHouseStore }) => {
        // console.log('useHouseStore importado para geração de casas conectadas');
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
        
        // console.log(`Geradas ${housesGenerated} casas conectadas às ruas`);
      }).catch(error => {
        console.error('Erro ao gerar casas:', error);
      });
    }
  }))
);
