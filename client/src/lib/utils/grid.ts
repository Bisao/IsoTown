
import { Position } from '../types';
import { GRID_SIZE } from '../constants';

export function isValidGridPosition(pos: Position): boolean {
  const halfGrid = Math.floor(GRID_SIZE / 2);
  return (
    pos.x >= -halfGrid &&
    pos.x <= halfGrid &&
    pos.z >= -halfGrid &&
    pos.z <= halfGrid
  );
}

export function getNeighbors(pos: Position): Position[] {
  const neighbors: Position[] = [];
  const directions = [
    { x: 0, z: 1 },   // Norte
    { x: 1, z: 0 },   // Leste  
    { x: 0, z: -1 },  // Sul
    { x: -1, z: 0 }   // Oeste
  ];

  directions.forEach(dir => {
    const neighbor = {
      x: pos.x + dir.x,
      z: pos.z + dir.z
    };
    if (isValidGridPosition(neighbor)) {
      neighbors.push(neighbor);
    }
  });

  return neighbors;
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.z === b.z;
}
