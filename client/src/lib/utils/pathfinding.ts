import { Position } from '../types';
import { getNeighbors, isValidGridPosition } from './grid';

interface PathNode {
  position: Position;
  gCost: number;
  hCost: number;
  parent?: PathNode;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function positionEquals(a: Position, b: Position): boolean {
  return a.x === b.x && a.z === b.z;
}

export function findPath(
  start: Position,
  end: Position,
  obstacles: Position[] = []
): Position[] {
  const openSet: PathNode[] = [];
  const closedSet: Set<string> = new Set();
  const obstacleSet = new Set(obstacles.map(pos => `${pos.x},${pos.z}`));

  const startNode: PathNode = {
    position: start,
    gCost: 0,
    hCost: heuristic(start, end)
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest fCost
    let currentNode = openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      const fCost = openSet[i].gCost + openSet[i].hCost;
      const currentFCost = currentNode.gCost + currentNode.hCost;
      
      if (fCost < currentFCost) {
        currentNode = openSet[i];
        currentIndex = i;
      }
    }

    // Remove current from open set and add to closed set
    openSet.splice(currentIndex, 1);
    closedSet.add(`${currentNode.position.x},${currentNode.position.z}`);

    // Check if we reached the end
    if (positionEquals(currentNode.position, end)) {
      const path: Position[] = [];
      let pathNode: PathNode | undefined = currentNode;

      while (pathNode) {
        path.unshift(pathNode.position);
        pathNode = pathNode.parent;
      }

      return path;
    }

    // Check neighbors
    const neighbors = getNeighbors(currentNode.position);
    
    for (const neighborPos of neighbors) {
      const neighborKey = `${neighborPos.x},${neighborPos.z}`;
      
      // Skip if in closed set or is obstacle
      if (closedSet.has(neighborKey) || obstacleSet.has(neighborKey)) {
        continue;
      }

      const tentativeGCost = currentNode.gCost + 1;
      
      // Check if this neighbor is already in open set
      let neighborNode = openSet.find(node => 
        positionEquals(node.position, neighborPos)
      );

      if (!neighborNode) {
        // Add new neighbor to open set
        neighborNode = {
          position: neighborPos,
          gCost: tentativeGCost,
          hCost: heuristic(neighborPos, end),
          parent: currentNode
        };
        openSet.push(neighborNode);
      } else if (tentativeGCost < neighborNode.gCost) {
        // Update existing neighbor if this path is better
        neighborNode.gCost = tentativeGCost;
        neighborNode.parent = currentNode;
      }
    }
  }

  // No path found
  return [];
}

export function getRandomWalkTarget(currentPos: Position, obstacles: Position[] = []): Position {
  const possibleMoves = getNeighbors(currentPos);
  const obstacleSet = new Set(obstacles.map(pos => `${pos.x},${pos.z}`));
  
  const validMoves = possibleMoves.filter(pos => 
    !obstacleSet.has(`${pos.x},${pos.z}`)
  );

  if (validMoves.length === 0) {
    return currentPos;
  }

  return validMoves[Math.floor(Math.random() * validMoves.length)];
}
