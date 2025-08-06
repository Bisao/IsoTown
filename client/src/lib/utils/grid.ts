import { Position } from '../types';
import { GRID_SIZE, CELL_SIZE } from '../constants';

export function worldToGrid(worldPos: Position): Position {
  return {
    x: Math.round(worldPos.x / CELL_SIZE),
    z: Math.round(worldPos.z / CELL_SIZE)
  };
}

export function gridToWorld(gridPos: Position): Position {
  return {
    x: gridPos.x * CELL_SIZE,
    z: gridPos.z * CELL_SIZE
  };
}

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
    { x: 0, z: 1 },
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1, z: 0 }
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
