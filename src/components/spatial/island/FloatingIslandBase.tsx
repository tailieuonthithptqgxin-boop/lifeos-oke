import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { IslandVibeConfig } from './CyberCozyVibes';

interface FloatingIslandBaseProps {
  vibe: IslandVibeConfig;
}

export const FloatingIslandBase: React.FC<FloatingIslandBaseProps> = ({ vibe }) => {
  const thrusterRingRef = useRef<THREE.Mesh>(null);
  const steamRef = useRef<THREE.Group>(null);
  const lanternLightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    // Rotate bottom anti-gravity ring
    if (thrusterRingRef.current) {
      thrusterRingRef.current.rotation.z += delta * 0.45;
    }

    // Cozy steaming coffee effect
    if (steamRef.current) {
      steamRef.current.children.forEach((puff, idx) => {
        puff.position.y += delta * (0.3 + idx * 0.05);
        if (puff.position.y > 0.8) {
          puff.position.y = 0.1;
        }
        puff.scale.setScalar(1 + (puff.position.y * 0.6));
      });
    }

    // Gentle lantern flicker
    if (lanternLightRef.current) {
      lanternLightRef.current.intensity = 1.2 + Math.sin(Date.now() * 0.008) * 0.25;
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* 1. TOP DIORAMA PLATFORM (OCTAGONAL BEVELED SLAB) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[5.8, 5.4, 0.6, 8]} />
        <meshStandardMaterial
          color={vibe.islandPlatformHex}
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>

      {/* 2. GLOWING NEON PERIMETER GROOVE */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[5.6, 5.6, 0.04, 8]} />
        <meshBasicMaterial
          color={vibe.neonAccentHex}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* 3. PLATFORM GRID PATTERN (INNER CIRCLE) */}
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 4.8, 48, 8]} />
        <meshBasicMaterial
          color={vibe.neonSecondaryHex}
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* 4. UNDER-ISLAND FLOATING ROCK STRATA (INVERTED PYRAMID / CRYSTAL) */}
      <mesh position={[0, -1.2, 0]}>
        <coneGeometry args={[5.2, 2.0, 8]} />
        <meshStandardMaterial
          color="#05070B"
          roughness={0.8}
          metalness={0.3}
          flatShading
        />
      </mesh>

      {/* 5. ANTI-GRAVITY LEVITATION THRUSTER RING */}
      <mesh ref={thrusterRingRef} position={[0, -2.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.12, 16, 48]} />
        <meshStandardMaterial
          color={vibe.neonAccentHex}
          emissive={vibe.neonAccentHex}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Anti-gravity downward thrust energy cylinder */}
      <mesh position={[0, -3.1, 0]}>
        <cylinderGeometry args={[1.8, 0.2, 1.8, 32, 1, true]} />
        <meshBasicMaterial
          color={vibe.neonAccentHex}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ===================================================================== */}
      {/* COZY DECORATIVE PROPS                                                 */}
      {/* ===================================================================== */}

      {/* Prop A: Cyber Bonsai Tree (Cozy Zen aesthetic) */}
      <group position={[-4.2, 0.32, -1.6]}>
        {/* Pot */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.35, 0.25, 0.3, 16]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} />
        </mesh>
        {/* Trunk */}
        <mesh position={[0.05, 0.5, 0]} rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.08, 0.12, 0.6, 8]} />
          <meshStandardMaterial color="#78350F" roughness={0.8} />
        </mesh>
        {/* Neon Foliage Clusters */}
        <mesh position={[-0.1, 0.8, 0.05]}>
          <dodecahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial
            color={vibe.neonAccentHex}
            emissive={vibe.neonAccentHex}
            emissiveIntensity={0.4}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0.2, 0.95, -0.05]}>
          <dodecahedronGeometry args={[0.22, 1]} />
          <meshStandardMaterial
            color={vibe.neonSecondaryHex}
            emissive={vibe.neonSecondaryHex}
            emissiveIntensity={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Prop B: Holographic Cyber Coffee Mug (Cozy Work Vibe) */}
      <group position={[-2.2, 0.32, 2.6]}>
        {/* Mug */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.24, 16]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Handle */}
        <mesh position={[0.14, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.06, 0.02, 8, 16]} />
          <meshStandardMaterial color="#F8FAFC" />
        </mesh>
        {/* Coffee Liquid */}
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 16]} />
          <meshStandardMaterial color="#451A03" roughness={0.1} />
        </mesh>
        {/* Rising Steam Puffs */}
        <group ref={steamRef} position={[0, 0.28, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.3} />
          </mesh>
          <mesh position={[0.02, 0.25, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.25} />
          </mesh>
          <mesh position={[-0.02, 0.42, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} />
          </mesh>
        </group>
      </group>

      {/* Prop C: Cozy Cyber-Lantern with Warm Point Light */}
      <group position={[4.0, 0.32, 1.8]}>
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
          {/* Lantern Pole & Base */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.4, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          {/* Glowing Crystal Bulb */}
          <mesh position={[0, 0.5, 0]}>
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color="#FBBF24"
              emissive="#F59E0B"
              emissiveIntensity={1.8}
              roughness={0.1}
            />
          </mesh>
          {/* Lantern Warm Light */}
          <pointLight
            ref={lanternLightRef}
            position={[0, 0.5, 0]}
            color="#FBBF24"
            intensity={1.5}
            distance={5}
            decay={2}
          />
        </Float>
      </group>
    </group>
  );
};

export default FloatingIslandBase;
