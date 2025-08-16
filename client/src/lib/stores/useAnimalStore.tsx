import { create } from 'zustand';
import { Animal, Position } from '../types';
import { nanoid } from 'nanoid';

interface AnimalStore {
  animals: Record<string, Animal>;
  addAnimal: (animal: Omit<Animal, 'id'>) => void;
  removeAnimal: (id: string) => void;
  updateAnimal: (id: string, updates: Partial<Animal>) => void;
  getAnimalAt: (position: Position) => Animal | null;
  damageAnimal: (id: string, damage: number) => boolean;
  generateAnimalsInChunk: (chunkX: number, chunkZ: number, chunkSize: number) => void;
  moveAnimal: (id: string, newPosition: Position) => void;
  clearAnimals: () => void;
}

export const useAnimalStore = create<AnimalStore>((set, get) => ({
  animals: {},
  
  addAnimal: (animal) => {
    const id = nanoid();
    set((state) => ({
      animals: {
        ...state.animals,
        [id]: { ...animal, id }
      }
    }));
  },
  
  removeAnimal: (id) => {
    set((state) => {
      const newAnimals = { ...state.animals };
      delete newAnimals[id];
      return { animals: newAnimals };
    });
  },
  
  updateAnimal: (id, updates) => {
    set((state) => {
      if (!state.animals[id]) return state;
      return {
        animals: {
          ...state.animals,
          [id]: { ...state.animals[id], ...updates }
        }
      };
    });
  },
  
  getAnimalAt: (position) => {
    const animals = get().animals;
    return Object.values(animals).find(animal => 
      animal.position.x === position.x && animal.position.z === position.z
    ) || null;
  },
  
  damageAnimal: (id, damage) => {
    const state = get();
    const animal = state.animals[id];
    
    if (!animal) return false;
    
    const newHealth = Math.max(0, animal.health - damage);
    const wasKilled = newHealth <= 0;
    
    if (wasKilled) {
      // Remove animal quando morrer
      state.removeAnimal(id);
    } else {
      state.updateAnimal(id, { health: newHealth });
    }
    
    return wasKilled;
  },
  
  moveAnimal: (id, newPosition) => {
    const state = get();
    if (state.animals[id]) {
      state.updateAnimal(id, { position: newPosition, lastMoveTime: Date.now() });
    }
  },
  
  generateAnimalsInChunk: (chunkX, chunkZ, chunkSize) => {
    const state = get();
    
    // Determinar densidade de animais baseada na distância do centro
    const distanceFromCenter = Math.abs(chunkX) + Math.abs(chunkZ);
    let animalDensity = 0.02; // 2% de chance base
    
    if (distanceFromCenter <= 2) {
      animalDensity = 0.01; // Menos animais perto do spawn
    } else if (distanceFromCenter > 5) {
      animalDensity = 0.03; // Mais animais longe
    }
    
    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;
    
    for (let x = startX; x < startX + chunkSize; x++) {
      for (let z = startZ; z < startZ + chunkSize; z++) {
        // Verificar se já existe animal nesta posição
        const existingAnimal = state.getAnimalAt({ x, z });
        if (existingAnimal) continue;
        
        // Chance de gerar animal
        if (Math.random() < animalDensity) {
          const animalTypes: Array<{ type: 'rabbit' | 'deer' | 'boar', weight: number }> = [
            { type: 'rabbit', weight: 0.6 }, // 60% coelhos
            { type: 'deer', weight: 0.3 },   // 30% veados
            { type: 'boar', weight: 0.1 }    // 10% javalis
          ];
          
          // Selecionar tipo de animal baseado no peso
          const random = Math.random();
          let cumulativeWeight = 0;
          let selectedType: 'rabbit' | 'deer' | 'boar' = 'rabbit';
          
          for (const animalType of animalTypes) {
            cumulativeWeight += animalType.weight;
            if (random <= cumulativeWeight) {
              selectedType = animalType.type;
              break;
            }
          }
          
          // Configurar stats baseado no tipo
          let health = 2;
          let movementSpeed = 400;
          let meatValue = 1;
          
          switch (selectedType) {
            case 'rabbit':
              health = 1;
              movementSpeed = 200; // Mais rápido
              meatValue = 1;
              break;
            case 'deer':
              health = 2;
              movementSpeed = 300;
              meatValue = 2;
              break;
            case 'boar':
              health = 3;
              movementSpeed = 500; // Mais lento
              meatValue = 3;
              break;
          }
          
          state.addAnimal({
            position: { x, z },
            type: selectedType,
            health,
            maxHealth: health,
            movementSpeed,
            meatValue,
            lastMoveTime: Date.now()
          });
        }
      }
    }
  },
  
  clearAnimals: () => {
    set({ animals: {} });
  }
}));