import { useMemo } from 'react';
import { GRID_SIZE, CELL_SIZE } from '../../lib/constants';

export default function Grid() {
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const halfGrid = Math.floor(GRID_SIZE / 2);
    const gridWorldSize = GRID_SIZE * CELL_SIZE;

    // Vertical lines
    for (let i = -halfGrid; i <= halfGrid; i++) {
      const x = i * CELL_SIZE;
      lines.push(
        <line key={`v-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                x, 0.01, -gridWorldSize / 2,
                x, 0.01, gridWorldSize / 2
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#CCCCCC" opacity={0.3} transparent />
        </line>
      );
    }

    // Horizontal lines
    for (let i = -halfGrid; i <= halfGrid; i++) {
      const z = i * CELL_SIZE;
      lines.push(
        <line key={`h-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                -gridWorldSize / 2, 0.01, z,
                gridWorldSize / 2, 0.01, z
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#CCCCCC" opacity={0.3} transparent />
        </line>
      );
    }

    return lines;
  }, []);

  return <>{gridLines}</>;
}
