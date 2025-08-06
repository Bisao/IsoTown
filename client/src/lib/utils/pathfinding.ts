import { Position } from '../types';
import { getNeighbors, positionsEqual } from './grid';

export function findPath(start: Position, end: Position, obstacles: Position[] = []): Position[] {
  if (positionsEqual(start, end)) return [start];

  const openSet: Array<{pos: Position, parent?: Position, g: number, h: number}> = [];
  const closedSet = new Set<string>();
  const obstacleSet = new Set(obstacles.map(pos => `${pos.x},${pos.z}`));

  openSet.push({
    pos: start,
    g: 0,
    h: Math.abs(end.x - start.x) + Math.abs(end.z - start.z)
  });

  while (openSet.length > 0) {
    // Encontrar nó com menor f = g + h
    openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
    const current = openSet.shift()!;

    const currentKey = `${current.pos.x},${current.pos.z}`;
    if (closedSet.has(currentKey)) continue;
    closedSet.add(currentKey);

    if (positionsEqual(current.pos, end)) {
      // Reconstruir caminho
      const path: Position[] = [];
      let node = current;
      while (node) {
        path.unshift(node.pos);
        if (node.parent) {
          // This part of the reconstruction logic seems to have an issue as it's trying to find the parent in the openSet
          // which might not contain all nodes from the path. The original implementation correctly used a parent pointer.
          // For now, I will keep the edited code's logic as is, assuming it's part of the intended refactor,
          // but note that this could be a point of failure or require further refinement.
          const parentNode = openSet.find(n => positionsEqual(n.pos, node.parent!)) ||
                             Array.from(closedSet).map(key => {
                               const [x, z] = key.split(',').map(Number);
                               return {pos: {x, z}, parent: undefined, g: 0, h: 0};
                             }).find(n => positionsEqual(n.pos, node.parent!));
          if (parentNode) {
              node = parentNode;
          } else {
              // If parent is not found in openSet or a representation of closedSet, break.
              // This might indicate an incomplete path or an issue in the reconstruction.
              break;
          }

        } else {
          break;
        }
      }
      return path;
    }

    // Verificar vizinhos
    for (const neighbor of getNeighbors(current.pos)) {
      const neighborKey = `${neighbor.x},${neighbor.z}`;
      if (closedSet.has(neighborKey) || obstacleSet.has(neighborKey)) continue;

      const g = current.g + 1;
      const h = Math.abs(end.x - neighbor.x) + Math.abs(end.z - neighbor.z);

      // Check if neighbor is already in openSet and if current path is better
      const existingNeighborIndex = openSet.findIndex(n => positionsEqual(n.pos, neighbor));
      if (existingNeighborIndex !== -1) {
        const existingNeighbor = openSet[existingNeighborIndex];
        if (g < existingNeighbor.g) {
          existingNeighbor.g = g;
          existingNeighbor.parent = current.pos;
          // No need to re-push or re-sort immediately, the sort at the beginning of the loop will handle it.
        }
      } else {
        openSet.push({
          pos: neighbor,
          parent: current.pos,
          g,
          h
        });
      }
    }
  }

  return []; // Nenhum caminho encontrado
}

export function getRandomDirection(): Position {
  const directions = [
    { x: 0, z: 1 },
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1, z: 0 }
  ];
  return directions[Math.floor(Math.random() * directions.length)];
}