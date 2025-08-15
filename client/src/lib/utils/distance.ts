// Função utilitária para cálculos de distância
import { Position } from '../types';

/**
 * Calcula a distância Manhattan entre duas posições
 * @param from Posição de origem
 * @param to Posição de destino
 * @returns Distância em unidades de grid
 */
export function getDistanceToPosition(from: Position, to: Position): number {
  return Math.abs(to.x - from.x) + Math.abs(to.z - from.z);
}

/**
 * Verifica se duas posições são adjacentes (distância = 1)
 * @param pos1 Primeira posição
 * @param pos2 Segunda posição
 * @returns true se as posições são adjacentes
 */
export function arePositionsAdjacent(pos1: Position, pos2: Position): boolean {
  return getDistanceToPosition(pos1, pos2) === 1;
}

/**
 * Encontra posições adjacentes a uma posição central
 * @param position Posição central
 * @returns Array com as 4 posições adjacentes (norte, sul, leste, oeste)
 */
export function getAdjacentPositions(position: Position): Position[] {
  return [
    { x: position.x + 1, z: position.z },     // direita
    { x: position.x - 1, z: position.z },     // esquerda
    { x: position.x, z: position.z + 1 },     // baixo
    { x: position.x, z: position.z - 1 }      // cima
  ];
}