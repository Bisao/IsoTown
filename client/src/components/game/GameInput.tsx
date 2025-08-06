import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../lib/stores/useGameStore';
import { useHouseStore } from '../../lib/stores/useHouseStore';
import { worldToGrid, isValidGridPosition } from '../../lib/utils/grid';

export default function GameInput() {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  
  const { isPlacingHouse, selectedHouseType, stopPlacingHouse } = useGameStore();
  const { addHouse, getHouseAt } = useHouseStore();

  const handleClick = (event: MouseEvent) => {
    if (!isPlacingHouse || !selectedHouseType) return;

    // Convert mouse coordinates to normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Cast ray from camera through mouse position
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // Check intersection with ground plane (y = 0)
    const groundPlane = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, 0, 0);
    const intersection = new THREE.Vector3();
    
    // Calculate intersection with ground plane
    const ray = raycaster.current.ray;
    const denominator = groundPlane.dot(ray.direction);
    
    if (Math.abs(denominator) > 0.0001) {
      const t = planePoint.clone().sub(ray.origin).dot(groundPlane) / denominator;
      if (t >= 0) {
        intersection.copy(ray.origin).add(ray.direction.multiplyScalar(t));
        
        // Convert world position to grid position
        const gridPos = worldToGrid({ x: intersection.x, z: intersection.z });
        
        // Check if position is valid and not occupied
        if (isValidGridPosition(gridPos) && !getHouseAt(gridPos)) {
          // Place the house
          addHouse(selectedHouseType, gridPos);
          stopPlacingHouse();
        }
      }
    }
  };

  useFrame(() => {
    // Listen for click events when placing house
    if (isPlacingHouse) {
      gl.domElement.style.cursor = 'crosshair';
      gl.domElement.addEventListener('click', handleClick);
    } else {
      gl.domElement.style.cursor = 'default';
      gl.domElement.removeEventListener('click', handleClick);
    }

    // Cleanup on unmount
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  });

  return null;
}