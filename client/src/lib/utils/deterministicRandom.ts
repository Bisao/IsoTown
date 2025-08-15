/**
 * Sistema determinístico para substituir Math.random() em operações de renderização
 * Baseado em seed para garantir resultados consistentes
 */

export class DeterministicRandom {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  // Linear Congruential Generator (LCG) - algoritmo determinístico
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }
  
  // Número entre min e max
  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  // Inteiro entre min e max
  int(min: number, max: number): number {
    return Math.floor(this.between(min, max));
  }
  
  // Chance (0-1)
  chance(probability: number): boolean {
    return this.next() < probability;
  }
  
  // Escolher item aleatório de array
  pick<T>(items: T[]): T {
    const index = this.int(0, items.length);
    return items[index];
  }
  
  // Reset seed
  setSeed(seed: number): void {
    this.seed = seed;
  }
}

// Instância global para uso em rendering
export const renderRandom = new DeterministicRandom(42);

// Instância para lógica de jogo (pode ser mais aleatória)
export const gameRandom = new DeterministicRandom(Date.now());