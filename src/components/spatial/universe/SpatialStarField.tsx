import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpatialStarFieldProps {
  count?: number;
  color?: string;
}

export const SpatialStarField: React.FC<SpatialStarFieldProps> = ({
  count = 1200,
  color = '#CCFF00'
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate random static positions and random speeds along depth
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 60;
      const z = -Math.random() * 90 + 15; // Spread from front to deep z
      const speed = Math.random() * 0.2 + 0.05;
      const scale = Math.random() * 0.08 + 0.02;
      temp.push({ x, y, z, originalZ: z, speed, scale });
    }
    return temp;
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      // Subtle cosmic drift forward
      p.z += p.speed * delta * 4;
      if (p.z > 20) {
        p.z = -75; // Reset to deep back
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};

export default SpatialStarField;
